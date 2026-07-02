/**
 * Feature: portrait-indexeddb-migration
 * Validates: Requirements 1.1, 1.2, 1.3, 4.2, 7.1
 *
 * Property-based tests for PortraitStore verifying round-trip storage,
 * overwrite semantics, and degraded mode behavior.
 */

// Patch structuredClone before importing fake-indexeddb so that Blob
// objects survive the structured clone algorithm in jsdom (jsdom's native
// structuredClone does not handle Blob correctly — it reduces them to {}).
const _origStructuredClone = globalThis.structuredClone;
globalThis.structuredClone = (<T>(value: T): T => {
  if (value instanceof Blob) {
    return value as T; // Blob is immutable, safe to reuse
  }
  return _origStructuredClone(value);
}) as typeof structuredClone;

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { PortraitStore } from '../portrait-store';

/** Arbitrary that generates a valid portrait MIME type */
const arbMimeType = fc.constantFrom('image/jpeg', 'image/png', 'image/webp');

/** Arbitrary that generates a valid portrait Blob (random content, random MIME, ≤2 MB) */
const arbPortraitBlob = fc.tuple(
  fc.uint8Array({ minLength: 1, maxLength: 2 * 1024 * 1024 }),
  arbMimeType
).map(([bytes, mime]) => new Blob([bytes], { type: mime }));

/** Arbitrary that generates a valid character ID (non-empty alphanumeric string) */
const arbCharacterId = fc.stringMatching(/^[a-z0-9\-]{1,36}$/);

describe('Feature: portrait-indexeddb-migration, Property 1: Portrait storage round-trip', () => {
  let store: PortraitStore;

  beforeEach(async () => {
    store = new PortraitStore();
    await store.init();
  });

  afterEach(() => {
    // fake-indexeddb state resets between test files
  });

  /**
   * Validates: Requirements 1.1, 1.2, 1.3
   *
   * For any valid Blob (generated with arbitrary content and random MIME from
   * jpeg/png/webp, ≤2 MB), savePortrait then getPortraitBlob returns a Blob
   * with identical size and type.
   */
  it('savePortrait then getPortraitBlob returns a Blob with identical size and type', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbCharacterId,
        arbPortraitBlob,
        async (characterId, blob) => {
          const saveResult = await store.savePortrait(characterId, blob);
          expect(saveResult.ok).toBe(true);

          const getResult = await store.getPortraitBlob(characterId);
          expect(getResult.ok).toBe(true);

          if (getResult.ok) {
            expect(getResult.value).not.toBeNull();
            expect(getResult.value!.size).toBe(blob.size);
            expect(getResult.value!.type).toBe(blob.type);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: portrait-indexeddb-migration, Property 2: Portrait save overwrites previous', () => {
  let store: PortraitStore;

  beforeEach(async () => {
    store = new PortraitStore();
    await store.init();
  });

  /**
   * Validates: Requirements 1.2, 7.1
   *
   * For any character ID and sequence of N blobs (N >= 2), getPortraitBlob
   * returns only the last-saved blob (matching its size and type).
   */
  it('getPortraitBlob returns only the last-saved blob after sequential saves', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbCharacterId,
        fc.array(arbPortraitBlob, { minLength: 2, maxLength: 5 }),
        async (characterId, blobs) => {
          // Save each blob in sequence
          for (const blob of blobs) {
            const saveResult = await store.savePortrait(characterId, blob);
            expect(saveResult.ok).toBe(true);
          }

          // Retrieve — should match the last blob only
          const lastBlob = blobs[blobs.length - 1];
          const getResult = await store.getPortraitBlob(characterId);
          expect(getResult.ok).toBe(true);

          if (getResult.ok) {
            expect(getResult.value).not.toBeNull();
            expect(getResult.value!.size).toBe(lastBlob.size);
            expect(getResult.value!.type).toBe(lastBlob.type);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: portrait-indexeddb-migration, Property 9: Degraded mode returns errors', () => {
  /**
   * Validates: Requirements 4.2
   *
   * When the PortraitStore is in degraded mode (IndexedDB unavailable),
   * all save/get operations return error results (ok: false), signaling the
   * caller to use the localStorage fallback path.
   */
  it('all operations return error results when in degraded mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbCharacterId,
        arbPortraitBlob,
        async (characterId, blob) => {
          // Create a store that will enter degraded mode by making indexedDB unavailable
          const originalIndexedDB = globalThis.indexedDB;
          // @ts-expect-error — intentionally removing indexedDB to simulate unavailability
          globalThis.indexedDB = undefined;

          const degradedStore = new PortraitStore();
          await degradedStore.init();

          // Restore indexedDB for other tests
          globalThis.indexedDB = originalIndexedDB;

          // Verify the store is in degraded mode
          expect(degradedStore.isDegraded()).toBe(true);

          // savePortrait should return an error
          const saveResult = await degradedStore.savePortrait(characterId, blob);
          expect(saveResult.ok).toBe(false);
          if (!saveResult.ok) {
            expect(saveResult.error).toContain('degraded');
          }

          // getPortraitBlob should return an error
          const getResult = await degradedStore.getPortraitBlob(characterId);
          expect(getResult.ok).toBe(false);
          if (!getResult.ok) {
            expect(getResult.error).toContain('degraded');
          }

          // getPortraitURL should return an error
          const urlResult = await degradedStore.getPortraitURL(characterId);
          expect(urlResult.ok).toBe(false);
          if (!urlResult.ok) {
            expect(urlResult.error).toContain('degraded');
          }

          // deletePortrait should return an error
          const deleteResult = await degradedStore.deletePortrait(characterId);
          expect(deleteResult.ok).toBe(false);
          if (!deleteResult.ok) {
            expect(deleteResult.error).toContain('degraded');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
