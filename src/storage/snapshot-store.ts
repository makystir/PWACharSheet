/**
 * Snapshot Store — isolated IndexedDB storage for rolling auto-backups.
 *
 * Holds a small rolling ring of full all-characters backup snapshots (the exact
 * `BackupFile` shape produced by `backup-service.ts`), each timestamped. It is a
 * SEPARATE IndexedDB database from the portrait store (`wfrp4e-portraits`) so it
 * is fully isolated from live data and cannot wedge, or be wedged by, portrait
 * access (auto-backup design §1). It mirrors `portrait-store.ts`'s access
 * pattern (class + singleton, degrade-gracefully openDatabase/performTransaction).
 *
 * TWO-LEVEL VERSIONING:
 *   - `DB_VERSION` — the IndexedDB schema version of THIS database. Bumped only
 *     when the object-store schema changes. Because snapshots are ephemeral,
 *     derived data (regenerated from live characters on the next throttled
 *     write), a future `onupgradeneeded` that cannot cleanly migrate MAY simply
 *     drop and recreate the `snapshots` store rather than transform records.
 *     This is safe: snapshots are a convenience copy, never the source of truth,
 *     and live `localStorage` data is untouched.
 *   - `payload.version` — the `BackupFile` format version (currently 1),
 *     validated on READ by `validateBackupFile` so a snapshot written by an
 *     older app version is rejected gracefully rather than mis-read.
 *
 * This is a reliability/persistence feature with no WFRP game mechanics, so per
 * the rules-compliance steering rule no rulebook citation applies.
 */

import type { BackupFile } from './backup-types';
import { seqsToEvict } from './snapshot-logic';

const DB_NAME = 'wfrp4e-snapshots';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const CREATED_AT_INDEX = 'createdAt';

/**
 * Number of rolling snapshots to retain (design §1). Three generations protect
 * against one bad/empty save clobbering the newest good state while keeping the
 * IndexedDB footprint of full base64-portrait backups bounded. One-line tunable.
 */
export const SNAPSHOT_RING_SIZE = 3;

/** A stored snapshot record. */
export interface SnapshotRecord {
  /** IDB auto-increment key; absent on put, assigned by IDB. */
  seq?: number;
  /** `Date.now()` at write time — the ring-ordering key (NOT the discrepancy key). */
  createdAt: number;
  /** EXACT backup-service shape; validated on read as untrusted input. */
  payload: BackupFile;
}

/** Lightweight metadata for the Settings list (no full payload / no portraits). */
export interface SnapshotMeta {
  seq: number;
  createdAt: number;
  exportedAt: string;
  characterCount: number;
}

/** Result of a snapshot operation (mirrors `PortraitResult`). */
export type SnapshotResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export interface ISnapshotStore {
  init(): Promise<void>;
  isDegraded(): boolean;
  putSnapshot(payload: BackupFile): Promise<SnapshotResult<void>>;
  listSnapshots(): Promise<SnapshotResult<SnapshotMeta[]>>;
  getSnapshot(seq: number): Promise<SnapshotResult<SnapshotRecord | null>>;
  getLatestSnapshot(): Promise<SnapshotResult<SnapshotRecord | null>>;
  clearSnapshots(): Promise<SnapshotResult<void>>;
}

export class SnapshotStore implements ISnapshotStore {
  private db: IDBDatabase | null = null;
  private degraded = false;

  async init(): Promise<void> {
    try {
      this.db = await this.openDatabase();
    } catch {
      this.degraded = true;
      console.warn(
        '[SnapshotStore] IndexedDB unavailable — auto-backup disabled for this session (degraded mode).'
      );
    }
  }

  isDegraded(): boolean {
    return this.degraded;
  }

  /**
   * Write a snapshot, then prune the ring (write-then-prune, design §1).
   * The newest record is committed FIRST and is never in the evict set, so the
   * previous good snapshots are only removed after the new one durably exists.
   * A prune failure is swallowed (an over-full ring is harmless; a lost newest
   * record is not).
   */
  async putSnapshot(payload: BackupFile): Promise<SnapshotResult<void>> {
    if (this.degraded || !this.db) {
      return { ok: false, error: 'Snapshot store is unavailable (degraded mode)' };
    }

    const record: SnapshotRecord = { createdAt: Date.now(), payload };

    try {
      await this.performTransaction('readwrite', (store) => {
        store.put(record);
      });
    } catch (err) {
      return { ok: false, error: `Failed to write snapshot: ${errorMessage(err)}` };
    }

    // Second transaction: prune the ring. Best-effort — failure is non-fatal.
    try {
      const keys = await this.getAllKeysAscending();
      const evict = seqsToEvict(keys, SNAPSHOT_RING_SIZE);
      if (evict.length > 0) {
        await this.performTransaction('readwrite', (store) => {
          for (const seq of evict) {
            store.delete(seq);
          }
        });
      }
    } catch (err) {
      console.warn(`[SnapshotStore] Ring prune failed (non-fatal): ${errorMessage(err)}`);
    }

    return { ok: true, value: undefined };
  }

  async listSnapshots(): Promise<SnapshotResult<SnapshotMeta[]>> {
    if (this.degraded || !this.db) {
      return { ok: false, error: 'Snapshot store is unavailable (degraded mode)' };
    }
    try {
      const records = await this.getAllRecords();
      const metas: SnapshotMeta[] = records.map((r) => ({
        seq: r.seq ?? 0,
        createdAt: r.createdAt,
        exportedAt: r.payload?.exportedAt ?? '',
        characterCount: r.payload?.characterCount ?? 0,
      }));
      // Newest-first.
      metas.sort((a, b) => b.createdAt - a.createdAt || b.seq - a.seq);
      return { ok: true, value: metas };
    } catch (err) {
      return { ok: false, error: `Failed to list snapshots: ${errorMessage(err)}` };
    }
  }

  async getSnapshot(seq: number): Promise<SnapshotResult<SnapshotRecord | null>> {
    if (this.degraded || !this.db) {
      return { ok: false, error: 'Snapshot store is unavailable (degraded mode)' };
    }
    try {
      const record = await this.getRecord(seq);
      return { ok: true, value: record };
    } catch (err) {
      return { ok: false, error: `Failed to read snapshot: ${errorMessage(err)}` };
    }
  }

  async getLatestSnapshot(): Promise<SnapshotResult<SnapshotRecord | null>> {
    if (this.degraded || !this.db) {
      return { ok: false, error: 'Snapshot store is unavailable (degraded mode)' };
    }
    try {
      const records = await this.getAllRecords();
      if (records.length === 0) return { ok: true, value: null };
      // Latest by createdAt, then by seq (both monotonic within a session).
      let latest = records[0];
      for (const r of records) {
        if (
          r.createdAt > latest.createdAt ||
          (r.createdAt === latest.createdAt && (r.seq ?? 0) > (latest.seq ?? 0))
        ) {
          latest = r;
        }
      }
      return { ok: true, value: latest };
    } catch (err) {
      return { ok: false, error: `Failed to read latest snapshot: ${errorMessage(err)}` };
    }
  }

  async clearSnapshots(): Promise<SnapshotResult<void>> {
    if (this.degraded || !this.db) {
      return { ok: false, error: 'Snapshot store is unavailable (degraded mode)' };
    }
    try {
      await this.performTransaction('readwrite', (store) => {
        store.clear();
      });
      return { ok: true, value: undefined };
    } catch (err) {
      return { ok: false, error: `Failed to clear snapshots: ${errorMessage(err)}` };
    }
  }

  // --- Private helpers (mirror portrait-store.ts) ---

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('indexedDB is not available'));
        return;
      }

      let request: IDBOpenDBRequest;
      try {
        request = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (err) {
        reject(err);
        return;
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'seq',
            autoIncrement: true,
          });
          store.createIndex(CREATED_AT_INDEX, 'createdAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = () => {
        reject(request.error ?? new Error('Failed to open IndexedDB'));
      };
    });
  }

  private performTransaction(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => void
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      operation(store);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Transaction failed'));
      tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
    });
  }

  private getAllKeysAscending(): Promise<number[]> {
    return new Promise<number[]>((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAllKeys();
      request.onsuccess = () => {
        // getAllKeys on an autoIncrement store returns ascending numeric keys.
        resolve((request.result as IDBValidKey[]).map((k) => Number(k)));
      };
      request.onerror = () => reject(request.error ?? new Error('getAllKeys failed'));
      tx.onerror = () => reject(tx.error ?? new Error('Transaction failed'));
    });
  }

  private getAllRecords(): Promise<SnapshotRecord[]> {
    return new Promise<SnapshotRecord[]>((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        resolve((request.result as SnapshotRecord[]) ?? []);
      };
      request.onerror = () => reject(request.error ?? new Error('getAll failed'));
      tx.onerror = () => reject(tx.error ?? new Error('Transaction failed'));
    });
  }

  private getRecord(seq: number): Promise<SnapshotRecord | null> {
    return new Promise<SnapshotRecord | null>((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(seq);
      request.onsuccess = () => {
        const result = request.result as SnapshotRecord | undefined;
        resolve(result ?? null);
      };
      request.onerror = () => reject(request.error ?? new Error('Get request failed'));
      tx.onerror = () => reject(tx.error ?? new Error('Transaction failed'));
    });
  }
}

/** Extract a human-readable message from an unknown error value. */
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

// --- Singleton ---

let instance: SnapshotStore | null = null;

/**
 * Get the singleton SnapshotStore instance.
 * The store must be initialized via `init()` before use.
 */
export function getSnapshotStore(): SnapshotStore {
  if (!instance) {
    instance = new SnapshotStore();
  }
  return instance;
}
