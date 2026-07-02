/**
 * Feature: portrait-indexeddb-migration
 * Validates: Requirements 3.1, 3.2, 3.4, 3.6, 7.3
 *
 * Property-based tests for Character Manager portrait integration verifying
 * that portrait data is excluded from localStorage, merged from IndexedDB on load,
 * deletion removes both stores, and portrait operations don't write to localStorage.
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
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character } from '../../types/character';
import { PortraitStore } from '../portrait-store';
import {
  saveCharacterWithPortrait,
  loadCharacterWithPortrait,
  deleteCharacterFull,
} from '../character-manager';

/** Arbitrary that generates a valid portrait MIME type */
const arbMimeType = fc.constantFrom('image/jpeg', 'image/png', 'image/webp');

/** Arbitrary that generates a valid portrait Blob (random content, random MIME, 1-100KB) */
const arbPortraitBlob = fc.tuple(
  fc.uint8Array({ minLength: 1, maxLength: 100 * 1024 }),
  arbMimeType
).map(([bytes, mime]) => new Blob([bytes], { type: mime }));

/** Arbitrary that generates a valid character ID (non-empty alphanumeric string) */
const arbCharacterId = fc.stringMatching(/^[a-z0-9]{4,12}$/);

/** Arbitrary that generates a character name (non-empty) */
const arbCharacterName = fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0);

/** Helper to create a character with a given name and portrait */
function makeCharacter(name: string, portrait: string): Character {
  return {
    ...structuredClone(BLANK_CHARACTER),
    name,
    portrait,
  };
}

/**
 * We need to initialize the PortraitStore singleton before tests.
 * The character-manager uses getPortraitStore() which returns the module-level singleton.
 * We reinitialize it before each test by calling init on a fresh store.
 */

// We override the singleton returned by getPortraitStore for testing
// by mocking the module to return our controlled store instance.
let testStore: PortraitStore;

vi.mock('../portrait-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../portrait-store')>();
  return {
    ...actual,
    getPortraitStore: () => testStore,
  };
});

const INDEX_KEY = 'wfrp4e-characters';
const CHAR_KEY_PREFIX = 'wfrp4e-char-';

describe('Feature: portrait-indexeddb-migration, Property 6: Character save excludes portrait from localStorage', () => {
  beforeEach(async () => {
    localStorage.clear();
    testStore = new PortraitStore();
    await testStore.init();
  });

  /**
   * Validates: Requirements 3.1, 3.2
   *
   * For any character with a non-empty portrait field, after saveCharacterWithPortrait
   * the localStorage JSON does not contain base64 image data in the portrait field.
   */
  it('localStorage JSON does not contain base64 image data after save', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbCharacterId,
        arbCharacterName,
        arbPortraitBlob,
        async (id, name, blob) => {
          // Set up index so save can update it
          const index = { activeId: id, characters: [{ id, name, species: '', career: '', careerLevel: '', lastModified: Date.now() }] };
          localStorage.setItem(INDEX_KEY, JSON.stringify(index));

          // Create a character with a non-empty portrait field (simulating in-memory state)
          const character = makeCharacter(name, 'data:image/png;base64,iVBORw0KGgoAAAANS');

          // Save with portrait blob
          const result = await saveCharacterWithPortrait(id, character, blob);
          expect(result.ok).toBe(true);

          // Verify localStorage JSON does NOT contain base64 portrait data
          const storedRaw = localStorage.getItem(`${CHAR_KEY_PREFIX}${id}`);
          expect(storedRaw).not.toBeNull();

          const stored = JSON.parse(storedRaw!);
          // The portrait field should be empty string (stripped)
          expect(stored.portrait).toBe('');
          // Additionally, the raw JSON should not contain the original base64 data
          expect(storedRaw).not.toContain('iVBORw0KGgoAAAANS');
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: portrait-indexeddb-migration, Property 7: Character load merges portrait from IndexedDB', () => {
  beforeEach(async () => {
    localStorage.clear();
    testStore = new PortraitStore();
    await testStore.init();
  });

  /**
   * Validates: Requirements 3.4
   *
   * For any character with a portrait in PortraitStore, loadCharacterWithPortrait
   * returns an object whose portrait field is a non-empty blob: URL.
   */
  it('loadCharacterWithPortrait returns object with non-empty blob URL portrait', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbCharacterId,
        arbCharacterName,
        arbPortraitBlob,
        async (id, name, blob) => {
          // Save a portrait to PortraitStore
          const savePortraitResult = await testStore.savePortrait(id, blob);
          expect(savePortraitResult.ok).toBe(true);

          // Set up the character in localStorage (without portrait data)
          const character = makeCharacter(name, '');
          localStorage.setItem(`${CHAR_KEY_PREFIX}${id}`, JSON.stringify(character));

          // Load the character with portrait
          const loaded = await loadCharacterWithPortrait(id);
          expect(loaded).not.toBeNull();
          expect(loaded!.portrait).toBeDefined();
          expect(loaded!.portrait!.length).toBeGreaterThan(0);
          expect(loaded!.portrait!.startsWith('blob:')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: portrait-indexeddb-migration, Property 8: Character deletion removes both stores', () => {
  beforeEach(async () => {
    localStorage.clear();
    testStore = new PortraitStore();
    await testStore.init();
  });

  /**
   * Validates: Requirements 1.5, 3.6
   *
   * For any character with both a localStorage entry and a portrait in IndexedDB,
   * deleteCharacterFull removes both the localStorage key and the portrait from IndexedDB.
   */
  it('deleteCharacterFull removes both localStorage entry and IndexedDB portrait', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbCharacterId,
        arbCharacterName,
        arbPortraitBlob,
        async (id, name, blob) => {
          // Set up character in localStorage
          const character = makeCharacter(name, '');
          localStorage.setItem(`${CHAR_KEY_PREFIX}${id}`, JSON.stringify(character));

          // Set up character index
          const index = { activeId: id, characters: [{ id, name, species: '', career: '', careerLevel: '', lastModified: Date.now() }] };
          localStorage.setItem(INDEX_KEY, JSON.stringify(index));

          // Save portrait to PortraitStore
          const saveResult = await testStore.savePortrait(id, blob);
          expect(saveResult.ok).toBe(true);

          // Delete character fully
          const deleted = await deleteCharacterFull(id);
          expect(deleted).toBe(true);

          // Verify localStorage entry is gone
          const storedRaw = localStorage.getItem(`${CHAR_KEY_PREFIX}${id}`);
          expect(storedRaw).toBeNull();

          // Verify portrait is gone from IndexedDB
          const portraitResult = await testStore.getPortraitBlob(id);
          expect(portraitResult.ok).toBe(true);
          if (portraitResult.ok) {
            expect(portraitResult.value).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: portrait-indexeddb-migration, Property 12: Portrait update/removal does not write to localStorage', () => {
  beforeEach(async () => {
    localStorage.clear();
    testStore = new PortraitStore();
    await testStore.init();
  });

  /**
   * Validates: Requirements 7.3
   *
   * For any portrait save or delete operation via PortraitStore,
   * localStorage.setItem is never called.
   */
  it('portrait save via PortraitStore does not call localStorage.setItem', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbCharacterId,
        arbPortraitBlob,
        async (id, blob) => {
          // Spy on localStorage.setItem
          const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
          setItemSpy.mockClear();

          // Save portrait directly via PortraitStore
          await testStore.savePortrait(id, blob);

          // Verify localStorage.setItem was NOT called
          expect(setItemSpy).not.toHaveBeenCalled();

          setItemSpy.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('portrait delete via PortraitStore does not call localStorage.setItem', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbCharacterId,
        arbPortraitBlob,
        async (id, blob) => {
          // First save a portrait (without spy to avoid noise)
          await testStore.savePortrait(id, blob);

          // Spy on localStorage.setItem
          const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
          setItemSpy.mockClear();

          // Delete portrait via PortraitStore
          await testStore.deletePortrait(id);

          // Verify localStorage.setItem was NOT called
          expect(setItemSpy).not.toHaveBeenCalled();

          setItemSpy.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });
});
