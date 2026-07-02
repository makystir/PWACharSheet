/**
 * Feature: portrait-indexeddb-migration
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6, 2.7
 *
 * Property-based tests for PortraitMigrationRunner verifying that migration
 * correctly moves portraits from localStorage to IndexedDB, is idempotent
 * and selective, and isolates faults per character.
 */

// Patch structuredClone before importing fake-indexeddb so that Blob
// objects survive the structured clone algorithm in jsdom (jsdom's native
// structuredClone does not handle Blob correctly — it reduces them to {}).
const _origStructuredClone = globalThis.structuredClone;
globalThis.structuredClone = (<T>(value: T): T => {
  if (value instanceof Blob) return value as T;
  return _origStructuredClone(value);
}) as typeof structuredClone;

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { PortraitStore } from '../portrait-store';
import { runPortraitMigration } from '../portrait-migration';

const INDEX_KEY = 'wfrp4e-characters';
const CHAR_KEY_PREFIX = 'wfrp4e-char-';

/** A valid base64 portrait data-URL for testing */
const VALID_PORTRAIT_PREFIX = 'data:image/png;base64,';

/**
 * Arbitrary that generates a valid base64 portrait data-URL.
 * Produces random byte content encoded as base64 with valid PNG MIME type.
 */
const arbPortraitDataUrl = fc
  .uint8Array({ minLength: 1, maxLength: 128 })
  .map((bytes) => {
    const binary = Array.from(bytes)
      .map((b) => String.fromCharCode(b))
      .join('');
    const base64 = btoa(binary);
    return `${VALID_PORTRAIT_PREFIX}${base64}`;
  });

/** Arbitrary that generates a valid character ID */
const arbCharacterId = fc.stringMatching(/^[a-z0-9]{4,12}$/);

/** Arbitrary that generates a character object with a portrait */
const arbCharacterWithPortrait = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  species: fc.constantFrom('Human', 'Dwarf', 'Elf', 'Halfling'),
  portrait: arbPortraitDataUrl,
});

/** Arbitrary that generates a character object without a portrait */
const arbCharacterWithoutPortrait = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  species: fc.constantFrom('Human', 'Dwarf', 'Elf', 'Halfling'),
});

/**
 * Helper: Set up localStorage with a character index and character data.
 * Returns the list of IDs used.
 */
function setupLocalStorage(
  characters: { id: string; data: Record<string, unknown> }[]
): void {
  const index = {
    activeId: characters.length > 0 ? characters[0].id : '',
    characters: characters.map((c) => ({ id: c.id })),
  };
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  for (const char of characters) {
    localStorage.setItem(
      `${CHAR_KEY_PREFIX}${char.id}`,
      JSON.stringify(char.data)
    );
  }
}

describe('Feature: portrait-indexeddb-migration, Property 3: Migration moves portrait from localStorage to IndexedDB', () => {
  let store: PortraitStore;

  beforeEach(async () => {
    localStorage.clear();
    store = new PortraitStore();
    await store.init();
  });

  /**
   * Validates: Requirements 2.1, 2.2
   *
   * For any character with a non-empty base64 portrait in localStorage,
   * after migration the portrait is retrievable from PortraitStore and
   * the localStorage JSON no longer contains the portrait field.
   */
  it('moves portrait from localStorage to IndexedDB and removes from localStorage JSON', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbCharacterId,
        arbCharacterWithPortrait,
        async (charId, charData) => {
          // Setup
          localStorage.clear();
          store = new PortraitStore();
          await store.init();

          setupLocalStorage([{ id: charId, data: charData }]);

          // Run migration
          const result = await runPortraitMigration(store);

          // Verify: migration reports success
          expect(result.migrated).toBe(1);
          expect(result.failed).toHaveLength(0);

          // Verify: portrait is retrievable from IndexedDB
          const blobResult = await store.getPortraitBlob(charId);
          expect(blobResult.ok).toBe(true);
          if (blobResult.ok) {
            expect(blobResult.value).not.toBeNull();
            expect(blobResult.value!.size).toBeGreaterThan(0);
            expect(blobResult.value!.type).toBe('image/png');
          }

          // Verify: localStorage JSON no longer contains portrait field
          const storedJson = localStorage.getItem(`${CHAR_KEY_PREFIX}${charId}`);
          expect(storedJson).not.toBeNull();
          const parsed = JSON.parse(storedJson!);
          expect(parsed).not.toHaveProperty('portrait');
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: portrait-indexeddb-migration, Property 4: Migration is idempotent and selective', () => {
  let store: PortraitStore;

  beforeEach(async () => {
    localStorage.clear();
    store = new PortraitStore();
    await store.init();
  });

  /**
   * Validates: Requirements 2.3, 2.6, 2.7
   *
   * For any set of characters (some with portraits, some without), running
   * migration multiple times produces the same state as running once;
   * characters without portraits are never modified.
   */
  it('running migration multiple times produces the same state as running once; characters without portraits are never modified', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.tuple(arbCharacterId, arbCharacterWithPortrait),
          { minLength: 1, maxLength: 5 }
        ),
        fc.array(
          fc.tuple(arbCharacterId, arbCharacterWithoutPortrait),
          { minLength: 1, maxLength: 5 }
        ),
        async (withPortraits, withoutPortraits) => {
          // Ensure unique IDs by prefixing
          const charsWithPortrait = withPortraits.map(([id, data], i) => ({
            id: `p${i}${id}`,
            data: data as Record<string, unknown>,
          }));
          const charsWithoutPortrait = withoutPortraits.map(([id, data], i) => ({
            id: `n${i}${id}`,
            data: data as Record<string, unknown>,
          }));

          const allChars = [...charsWithPortrait, ...charsWithoutPortrait];

          // Setup
          localStorage.clear();
          store = new PortraitStore();
          await store.init();
          setupLocalStorage(allChars);

          // Snapshot localStorage for characters without portraits before migration
          const noPortraitSnapshots: Record<string, string> = {};
          for (const char of charsWithoutPortrait) {
            noPortraitSnapshots[char.id] = localStorage.getItem(
              `${CHAR_KEY_PREFIX}${char.id}`
            )!;
          }

          // First migration
          const result1 = await runPortraitMigration(store);
          expect(result1.migrated).toBe(charsWithPortrait.length);
          expect(result1.skipped).toBe(charsWithoutPortrait.length);
          expect(result1.failed).toHaveLength(0);

          // Capture state after first migration
          const stateAfterFirst: Record<string, string | null> = {};
          for (const char of allChars) {
            stateAfterFirst[char.id] = localStorage.getItem(
              `${CHAR_KEY_PREFIX}${char.id}`
            );
          }

          // Second migration (should be no-op for all)
          const result2 = await runPortraitMigration(store);
          expect(result2.migrated).toBe(0);
          expect(result2.skipped).toBe(allChars.length);
          expect(result2.failed).toHaveLength(0);

          // Verify: state after second migration is identical to after first
          for (const char of allChars) {
            const current = localStorage.getItem(`${CHAR_KEY_PREFIX}${char.id}`);
            expect(current).toBe(stateAfterFirst[char.id]);
          }

          // Verify: characters without portraits were never modified
          for (const char of charsWithoutPortrait) {
            const current = localStorage.getItem(`${CHAR_KEY_PREFIX}${char.id}`);
            expect(current).toBe(noPortraitSnapshots[char.id]);
          }

          // Third migration — still no-op
          const result3 = await runPortraitMigration(store);
          expect(result3.migrated).toBe(0);
          expect(result3.skipped).toBe(allChars.length);
          expect(result3.failed).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: portrait-indexeddb-migration, Property 5: Migration fault isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  /**
   * Validates: Requirements 2.4
   *
   * For N characters with portraits where one write fails, N-1 succeed
   * and the failed character's localStorage remains unchanged.
   */
  it('when one character write fails, N-1 still succeed and the failed character localStorage remains unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.tuple(arbCharacterId, arbCharacterWithPortrait),
          { minLength: 2, maxLength: 6 }
        ),
        fc.nat(),
        async (charEntries, failIndexSeed) => {
          // Ensure unique IDs
          const chars = charEntries.map(([id, data], i) => ({
            id: `f${i}${id}`,
            data: data as Record<string, unknown>,
          }));

          // Pick which character will fail
          const failIndex = failIndexSeed % chars.length;
          const failId = chars[failIndex].id;

          // Setup localStorage
          localStorage.clear();
          setupLocalStorage(chars);

          // Snapshot the failed character's localStorage before migration
          const failedCharSnapshot = localStorage.getItem(
            `${CHAR_KEY_PREFIX}${failId}`
          )!;

          // Create a real PortraitStore and spy on savePortrait to fail for one character
          const store = new PortraitStore();
          await store.init();

          const originalSavePortrait = store.savePortrait.bind(store);
          vi.spyOn(store, 'savePortrait').mockImplementation(
            async (characterId: string, blob: Blob) => {
              if (characterId === failId) {
                return { ok: false, error: 'Simulated write failure' };
              }
              return originalSavePortrait(characterId, blob);
            }
          );

          // Run migration
          const result = await runPortraitMigration(store);

          // Verify: N-1 characters migrated successfully
          expect(result.migrated).toBe(chars.length - 1);
          expect(result.failed).toContain(failId);
          expect(result.failed).toHaveLength(1);

          // Verify: failed character's localStorage remains unchanged
          const failedCharAfter = localStorage.getItem(
            `${CHAR_KEY_PREFIX}${failId}`
          );
          expect(failedCharAfter).toBe(failedCharSnapshot);

          // Verify: failed character still has portrait in its localStorage JSON
          const failedParsed = JSON.parse(failedCharAfter!);
          expect(failedParsed).toHaveProperty('portrait');
          expect(failedParsed.portrait.length).toBeGreaterThan(0);

          // Verify: successful characters have portraits in IndexedDB
          for (let i = 0; i < chars.length; i++) {
            if (i === failIndex) continue;
            const blobResult = await store.getPortraitBlob(chars[i].id);
            expect(blobResult.ok).toBe(true);
            if (blobResult.ok) {
              expect(blobResult.value).not.toBeNull();
            }
          }

          // Verify: successful characters no longer have portrait in localStorage
          for (let i = 0; i < chars.length; i++) {
            if (i === failIndex) continue;
            const storedJson = localStorage.getItem(
              `${CHAR_KEY_PREFIX}${chars[i].id}`
            );
            const parsed = JSON.parse(storedJson!);
            expect(parsed).not.toHaveProperty('portrait');
          }

          vi.restoreAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});
