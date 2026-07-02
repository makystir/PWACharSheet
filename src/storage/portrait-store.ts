/**
 * Portrait Store — IndexedDB storage for character portrait Blobs.
 *
 * Provides CRUD operations for portrait images stored as Blobs in IndexedDB,
 * keyed by character ID. Gracefully degrades to a no-op/error state when
 * IndexedDB is unavailable.
 */

const DB_NAME = 'wfrp4e-portraits';
const DB_VERSION = 1;
const STORE_NAME = 'portraits';

/** Result of a portrait operation */
export type PortraitResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export interface IPortraitStore {
  /** Initialize the store — opens IndexedDB, determines availability */
  init(): Promise<void>;

  /** Whether the store is operating in degraded (localStorage fallback) mode */
  isDegraded(): boolean;

  /** Save a portrait Blob for a character */
  savePortrait(characterId: string, blob: Blob): Promise<PortraitResult<void>>;

  /** Retrieve a portrait as an object URL, or null if none exists */
  getPortraitURL(characterId: string): Promise<PortraitResult<string | null>>;

  /** Retrieve the raw portrait Blob (used by export) */
  getPortraitBlob(characterId: string): Promise<PortraitResult<Blob | null>>;

  /** Delete a portrait for a character */
  deletePortrait(characterId: string): Promise<PortraitResult<void>>;

  /** Revoke a previously created object URL (cleanup) */
  revokeURL(url: string): void;
}

export class PortraitStore implements IPortraitStore {
  private db: IDBDatabase | null = null;
  private degraded = false;

  async init(): Promise<void> {
    try {
      this.db = await this.openDatabase();
    } catch {
      this.degraded = true;
      console.warn(
        '[PortraitStore] IndexedDB unavailable — operating in degraded mode. Portraits will use localStorage fallback.'
      );
    }
  }

  isDegraded(): boolean {
    return this.degraded;
  }

  async savePortrait(characterId: string, blob: Blob): Promise<PortraitResult<void>> {
    if (this.degraded || !this.db) {
      return { ok: false, error: 'Portrait store is unavailable (degraded mode)' };
    }

    try {
      await this.performTransaction('readwrite', (store) => {
        store.put(blob, characterId);
      });
      return { ok: true, value: undefined };
    } catch (err) {
      return { ok: false, error: `Failed to save portrait: ${errorMessage(err)}` };
    }
  }

  async getPortraitURL(characterId: string): Promise<PortraitResult<string | null>> {
    if (this.degraded || !this.db) {
      return { ok: false, error: 'Portrait store is unavailable (degraded mode)' };
    }

    try {
      const blob = await this.getBlob(characterId);
      if (!blob) {
        return { ok: true, value: null };
      }
      const url = URL.createObjectURL(blob);
      return { ok: true, value: url };
    } catch (err) {
      return { ok: false, error: `Failed to retrieve portrait URL: ${errorMessage(err)}` };
    }
  }

  async getPortraitBlob(characterId: string): Promise<PortraitResult<Blob | null>> {
    if (this.degraded || !this.db) {
      return { ok: false, error: 'Portrait store is unavailable (degraded mode)' };
    }

    try {
      const blob = await this.getBlob(characterId);
      return { ok: true, value: blob };
    } catch (err) {
      return { ok: false, error: `Failed to retrieve portrait blob: ${errorMessage(err)}` };
    }
  }

  async deletePortrait(characterId: string): Promise<PortraitResult<void>> {
    if (this.degraded || !this.db) {
      return { ok: false, error: 'Portrait store is unavailable (degraded mode)' };
    }

    try {
      await this.performTransaction('readwrite', (store) => {
        store.delete(characterId);
      });
      return { ok: true, value: undefined };
    } catch (err) {
      return { ok: false, error: `Failed to delete portrait: ${errorMessage(err)}` };
    }
  }

  revokeURL(url: string): void {
    URL.revokeObjectURL(url);
  }

  // --- Private helpers ---

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
          db.createObjectStore(STORE_NAME);
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

  private getBlob(characterId: string): Promise<Blob | null> {
    return new Promise<Blob | null>((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(characterId);

      request.onsuccess = () => {
        const result = request.result;
        if (result instanceof Blob) {
          resolve(result);
        } else if (result === undefined) {
          resolve(null);
        } else {
          // Unexpected value type — treat as missing
          resolve(null);
        }
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

let instance: PortraitStore | null = null;

/**
 * Get the singleton PortraitStore instance.
 * The store must be initialized via `init()` before use.
 */
export function getPortraitStore(): PortraitStore {
  if (!instance) {
    instance = new PortraitStore();
  }
  return instance;
}
