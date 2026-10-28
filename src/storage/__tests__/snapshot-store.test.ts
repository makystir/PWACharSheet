import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SnapshotStore, SNAPSHOT_RING_SIZE } from '../snapshot-store';
import type { BackupFile } from '../backup-types';

/**
 * Unit tests for SnapshotStore (auto-backup design §9, tests 5–7). Mirrors the
 * portrait-store test approach: fake-indexeddb under jsdom, fresh store per test,
 * degraded mode forced via a throwing indexedDB.open spy.
 */

function makeBackup(ids: string[]): BackupFile {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    characterCount: ids.length,
    characters: ids.map((id) => ({
      id,
      character: { name: `Char ${id}`, species: 'Human', chars: {} },
      portrait: '',
    })),
  };
}

describe('SnapshotStore', () => {
  let store: SnapshotStore;

  beforeEach(() => {
    store = new SnapshotStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Test 5: isolated database with a single object store', () => {
    it('opens wfrp4e-snapshots with exactly one store "snapshots", independent of portraits', async () => {
      await store.init();
      expect(store.isDegraded()).toBe(false);

      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('wfrp4e-snapshots', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      expect(db.objectStoreNames.length).toBe(1);
      expect(db.objectStoreNames.contains('snapshots')).toBe(true);
      db.close();
    });
  });

  describe('Test 6: write-then-prune ring', () => {
    it('retains at most N snapshots, drops the oldest, keeps the newest', async () => {
      await store.init();

      const writes = SNAPSHOT_RING_SIZE + 2;
      for (let i = 0; i < writes; i++) {
        const r = await store.putSnapshot(makeBackup([`c${i}`]));
        expect(r.ok).toBe(true);
      }

      const list = await store.listSnapshots();
      expect(list.ok).toBe(true);
      if (list.ok) {
        expect(list.value.length).toBeLessThanOrEqual(SNAPSHOT_RING_SIZE);
        // Newest-first: the first entry holds the most recent character id.
        const latest = await store.getLatestSnapshot();
        expect(latest.ok).toBe(true);
        if (latest.ok && latest.value) {
          expect(latest.value.payload.characters[0].id).toBe(`c${writes - 1}`);
        }
      }
    });

    it('getAllKeys is strictly ascending, and the delete runs after the put commits', async () => {
      await store.init();

      // Seed the ring to exactly N.
      for (let i = 0; i < SNAPSHOT_RING_SIZE; i++) {
        await store.putSnapshot(makeBackup([`seed${i}`]));
      }

      const keysBefore = await readAllKeys('wfrp4e-snapshots', 'snapshots');
      const ascending = [...keysBefore].sort((a, b) => a - b);
      expect(keysBefore).toEqual(ascending);

      // One more write triggers an eviction. After it, N remain and the newest
      // key is strictly greater than all evicted keys (delete-after-commit).
      await store.putSnapshot(makeBackup(['newest']));

      const keysAfter = await readAllKeys('wfrp4e-snapshots', 'snapshots');
      const ascendingAfter = [...keysAfter].sort((a, b) => a - b);
      expect(keysAfter).toEqual(ascendingAfter);
      expect(keysAfter.length).toBe(SNAPSHOT_RING_SIZE);

      const latest = await store.getLatestSnapshot();
      expect(latest.ok).toBe(true);
      if (latest.ok && latest.value) {
        expect(latest.value.payload.characters[0].id).toBe('newest');
        // The newest key is the maximum remaining key — it survived the prune.
        expect(Math.max(...keysAfter)).toBe(latest.value.seq);
      }
    });
  });

  describe('Test 7: degraded mode', () => {
    it('putSnapshot/listSnapshots return {ok:false} and never throw; one console.warn', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('IndexedDB not available');
      });

      const degraded = new SnapshotStore();
      await degraded.init();
      expect(degraded.isDegraded()).toBe(true);

      const put = await degraded.putSnapshot(makeBackup(['x']));
      expect(put.ok).toBe(false);

      const list = await degraded.listSnapshots();
      expect(list.ok).toBe(false);

      const latest = await degraded.getLatestSnapshot();
      expect(latest.ok).toBe(false);

      // Exactly one warning from init entering degraded mode.
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('degraded mode'));
    });
  });
});

function readAllKeys(dbName: string, storeName: string): Promise<number[]> {
  return new Promise<number[]>((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(storeName, 'readonly');
      const keysReq = tx.objectStore(storeName).getAllKeys();
      keysReq.onsuccess = () => {
        resolve((keysReq.result as IDBValidKey[]).map((k) => Number(k)));
        db.close();
      };
      keysReq.onerror = () => reject(keysReq.error);
    };
    request.onerror = () => reject(request.error);
  });
}
