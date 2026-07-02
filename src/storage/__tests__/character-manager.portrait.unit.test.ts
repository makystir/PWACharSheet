/**
 * Unit tests for Character Manager portrait integration.
 * Validates: Requirements 3.5, 4.4
 *
 * Tests that loadCharacterWithPortrait gracefully handles PortraitStore failures
 * by returning the character with an empty portrait field.
 */

// Patch structuredClone before importing fake-indexeddb so that Blob
// objects survive the structured clone algorithm in jsdom (jsdom's native
// structuredClone does not handle Blob correctly — it reduces them to {}).
const _origStructuredClone = globalThis.structuredClone;
globalThis.structuredClone = (<T>(value: T): T => {
  if (value instanceof Blob) {
    return value as T;
  }
  return _origStructuredClone(value);
}) as typeof structuredClone;

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BLANK_CHARACTER } from '../../types/character';

const INDEX_KEY = 'wfrp4e-characters';
const CHAR_KEY_PREFIX = 'wfrp4e-char-';

// In-memory localStorage mock
let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

/**
 * Helper: set up a character in localStorage (index + char entry).
 * Returns the character ID used.
 */
function setupCharacterInLocalStorage(id: string, overrides: Record<string, unknown> = {}): void {
  // Set up the character index
  const index = {
    activeId: id,
    characters: [
      { id, name: 'Test Hero', species: 'Human', career: 'Soldier', careerLevel: '', lastModified: Date.now() },
    ],
  };
  store.set(INDEX_KEY, JSON.stringify(index));

  // Set up the character data
  const character = {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Test Hero',
    species: 'Human',
    career: 'Soldier',
    ...overrides,
  };
  store.set(`${CHAR_KEY_PREFIX}${id}`, JSON.stringify(character));
}

describe('Character Manager Portrait Integration - Unit Tests', () => {
  describe('Req 3.5: PortraitStore failure during load returns character with empty portrait', () => {
    it('returns character with empty portrait when getPortraitURL returns an error', async () => {
      const charId = 'char-fail-portrait';
      setupCharacterInLocalStorage(charId);

      // Mock getPortraitStore to return a store whose getPortraitURL fails
      vi.doMock('../portrait-store', () => ({
        getPortraitStore: () => ({
          getPortraitURL: vi.fn().mockResolvedValue({
            ok: false,
            error: 'Portrait store is unavailable (degraded mode)',
          }),
          isDegraded: () => true,
        }),
      }));

      // Dynamically import the module so the mock takes effect
      const { loadCharacterWithPortrait } = await import('../character-manager');

      const result = await loadCharacterWithPortrait(charId);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Test Hero');
      expect(result!.portrait).toBe('');
    });

    it('does not throw or block the character load when PortraitStore fails', async () => {
      const charId = 'char-fail-no-throw';
      setupCharacterInLocalStorage(charId);

      // Mock getPortraitStore to return a store that rejects with an error
      vi.doMock('../portrait-store', () => ({
        getPortraitStore: () => ({
          getPortraitURL: vi.fn().mockResolvedValue({
            ok: false,
            error: 'Failed to retrieve portrait URL: Transaction failed',
          }),
          isDegraded: () => false,
        }),
      }));

      const { loadCharacterWithPortrait } = await import('../character-manager');

      // Should not throw
      const result = await loadCharacterWithPortrait(charId);

      expect(result).not.toBeNull();
      expect(result!.portrait).toBe('');
      expect(result!.species).toBe('Human');
    });
  });

  describe('Req 4.4: Prior-migrated character with unavailable IndexedDB loads with empty portrait', () => {
    it('returns character with empty portrait when already migrated and IndexedDB unavailable', async () => {
      const charId = 'char-migrated-no-idb';

      // Set up a character that was already migrated (no portrait field in localStorage data,
      // or portrait field is empty string — simulating post-migration state)
      setupCharacterInLocalStorage(charId, { portrait: '' });

      // Mock getPortraitStore to simulate degraded/unavailable IndexedDB
      vi.doMock('../portrait-store', () => ({
        getPortraitStore: () => ({
          getPortraitURL: vi.fn().mockResolvedValue({
            ok: false,
            error: 'Portrait store is unavailable (degraded mode)',
          }),
          isDegraded: () => true,
        }),
      }));

      const { loadCharacterWithPortrait } = await import('../character-manager');

      const result = await loadCharacterWithPortrait(charId);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Test Hero');
      expect(result!.portrait).toBe('');
    });

    it('loads all character fields correctly even with degraded PortraitStore', async () => {
      const charId = 'char-migrated-degraded';

      // Simulating a character that had its portrait migrated (portrait field absent/empty)
      // with additional character data
      setupCharacterInLocalStorage(charId, {
        portrait: '',
        species: 'Dwarf',
        career: 'Ironbreaker',
        xpCur: 200,
      });

      // Mock getPortraitStore as degraded
      vi.doMock('../portrait-store', () => ({
        getPortraitStore: () => ({
          getPortraitURL: vi.fn().mockResolvedValue({
            ok: false,
            error: 'Portrait store is unavailable (degraded mode)',
          }),
          isDegraded: () => true,
        }),
      }));

      const { loadCharacterWithPortrait } = await import('../character-manager');

      const result = await loadCharacterWithPortrait(charId);

      expect(result).not.toBeNull();
      expect(result!.portrait).toBe('');
      expect(result!.species).toBe('Dwarf');
      expect(result!.career).toBe('Ironbreaker');
      expect(result!.xpCur).toBe(200);
    });

    it('returns null when character does not exist in localStorage (regardless of IndexedDB state)', async () => {
      // Don't set up any character in localStorage

      vi.doMock('../portrait-store', () => ({
        getPortraitStore: () => ({
          getPortraitURL: vi.fn().mockResolvedValue({
            ok: false,
            error: 'Portrait store is unavailable (degraded mode)',
          }),
          isDegraded: () => true,
        }),
      }));

      const { loadCharacterWithPortrait } = await import('../character-manager');

      const result = await loadCharacterWithPortrait('non-existent-id');

      expect(result).toBeNull();
    });
  });
});
