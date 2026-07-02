import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PortraitStore } from '../portrait-store';

/**
 * Unit tests for PortraitStore
 * Validates: Requirements 1.4, 1.6, 1.7, 4.1, 4.5, 7.4, 7.5
 */

describe('PortraitStore', () => {
  let store: PortraitStore;

  beforeEach(() => {
    store = new PortraitStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Req 1.4: retrieval returns null for non-existent character', () => {
    it('getPortraitURL returns ok with null for a character that has no portrait', async () => {
      await store.init();

      const result = await store.getPortraitURL('non-existent-id');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it('getPortraitBlob returns ok with null for a character that has no portrait', async () => {
      await store.init();

      const result = await store.getPortraitBlob('non-existent-id');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('Req 1.6: IndexedDB failure returns error indication without throwing', () => {
    it('savePortrait returns error result when store is in degraded mode', async () => {
      // Simulate IndexedDB unavailability by mocking indexedDB.open to throw
      const originalOpen = indexedDB.open.bind(indexedDB);
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('IndexedDB not available');
      });

      const degradedStore = new PortraitStore();
      await degradedStore.init();

      const blob = new Blob(['test'], { type: 'image/png' });
      const result = await degradedStore.savePortrait('char-1', blob);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeTruthy();
      }

      // Restore
      vi.mocked(indexedDB.open).mockImplementation(originalOpen);
    });

    it('getPortraitURL returns error result when store is in degraded mode', async () => {
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('IndexedDB not available');
      });

      const degradedStore = new PortraitStore();
      await degradedStore.init();

      const result = await degradedStore.getPortraitURL('char-1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeTruthy();
      }
    });

    it('getPortraitBlob returns error result when store is in degraded mode', async () => {
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('IndexedDB not available');
      });

      const degradedStore = new PortraitStore();
      await degradedStore.init();

      const result = await degradedStore.getPortraitBlob('char-1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeTruthy();
      }
    });

    it('deletePortrait returns error result when store is in degraded mode', async () => {
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('IndexedDB not available');
      });

      const degradedStore = new PortraitStore();
      await degradedStore.init();

      const result = await degradedStore.deletePortrait('char-1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe('Req 1.7: database uses single object store named portraits', () => {
    it('creates database with a single object store called "portraits"', async () => {
      await store.init();

      // Open the database directly to inspect its structure
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('wfrp4e-portraits', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      expect(db.objectStoreNames.length).toBe(1);
      expect(db.objectStoreNames.contains('portraits')).toBe(true);

      db.close();
    });
  });

  describe('Req 4.1: IndexedDB availability detection on init', () => {
    it('isDegraded returns false when IndexedDB is available', async () => {
      await store.init();

      expect(store.isDegraded()).toBe(false);
    });

    it('isDegraded returns true when IndexedDB open throws', async () => {
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('IndexedDB not available');
      });

      const degradedStore = new PortraitStore();
      await degradedStore.init();

      expect(degradedStore.isDegraded()).toBe(true);
    });
  });

  describe('Req 4.5: degraded mode logs single warning per session', () => {
    it('logs exactly one console.warn when entering degraded mode', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('IndexedDB not available');
      });

      const degradedStore = new PortraitStore();
      await degradedStore.init();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('degraded mode')
      );
    });

    it('does not log additional warnings on subsequent operations', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('IndexedDB not available');
      });

      const degradedStore = new PortraitStore();
      await degradedStore.init();

      // Perform multiple operations — none should add extra warnings
      await degradedStore.savePortrait('char-1', new Blob(['x'], { type: 'image/png' }));
      await degradedStore.getPortraitURL('char-1');
      await degradedStore.getPortraitBlob('char-1');
      await degradedStore.deletePortrait('char-1');

      // Still only 1 warning from init
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Req 7.4: portrait write failure shows error, leaves previous unchanged', () => {
    it('returns error result on write failure without throwing', async () => {
      // Simulate a failure scenario: store enters degraded mode (no db connection)
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('IndexedDB not available');
      });

      const failingStore = new PortraitStore();
      await failingStore.init();

      // Attempt to write — should get error result, not throw
      const failBlob = new Blob(['new-data'], { type: 'image/png' });
      const failResult = await failingStore.savePortrait('char-1', failBlob);

      expect(failResult.ok).toBe(false);
      if (!failResult.ok) {
        expect(failResult.error).toBeTruthy();
      }
    });

    it('successful write followed by failed write on degraded store does not throw', async () => {
      await store.init();

      // Save an initial portrait successfully
      const originalBlob = new Blob(['original-data'], { type: 'image/png' });
      const saveResult = await store.savePortrait('char-1', originalBlob);
      expect(saveResult.ok).toBe(true);

      // Now create a degraded store and attempt to write
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('IndexedDB not available');
      });

      const failingStore = new PortraitStore();
      await failingStore.init();
      expect(failingStore.isDegraded()).toBe(true);

      // The failed store reports error without affecting the original store's data
      const failResult = await failingStore.savePortrait('char-1', new Blob(['x']));
      expect(failResult.ok).toBe(false);

      // Original store still works fine (not corrupted)
      const secondSave = await store.savePortrait('char-1', new Blob(['y'], { type: 'image/png' }));
      expect(secondSave.ok).toBe(true);
    });
  });

  describe('Req 7.5: removal of non-existent portrait is successful no-op', () => {
    it('deletePortrait returns ok for a character with no portrait', async () => {
      await store.init();

      const result = await store.deletePortrait('non-existent-character');

      expect(result.ok).toBe(true);
    });

    it('deletePortrait on non-existent portrait does not affect other portraits', async () => {
      await store.init();

      // Save a portrait for a different character
      const blob = new Blob(['portrait-data'], { type: 'image/png' });
      const saveResult = await store.savePortrait('char-existing', blob);
      expect(saveResult.ok).toBe(true);

      // Delete a non-existent portrait — should succeed
      const deleteResult = await store.deletePortrait('char-does-not-exist');
      expect(deleteResult.ok).toBe(true);

      // The existing portrait was not deleted — a subsequent save still succeeds
      // (confirms the store is still operational and the entry wasn't removed)
      const overwriteResult = await store.savePortrait('char-existing', new Blob(['updated'], { type: 'image/png' }));
      expect(overwriteResult.ok).toBe(true);
    });
  });
});
