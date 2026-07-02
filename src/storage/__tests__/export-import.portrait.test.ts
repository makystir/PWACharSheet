/**
 * Unit tests for Export/Import portrait handling.
 * Validates: Requirements 5.2, 5.4, 5.5, 6.2, 6.3, 6.4, 6.5
 *
 * Tests the exportToJSONWithPortrait and importFromJSONWithPortrait functions
 * from export-import.ts.
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
import type { Character } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';

const INDEX_KEY = 'wfrp4e-characters';
const CHAR_KEY_PREFIX = 'wfrp4e-char-';

// In-memory localStorage mock
let localStore: Map<string, string>;

beforeEach(() => {
  localStore = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => localStore.get(key) ?? null,
    setItem: (key: string, value: string) => { localStore.set(key, value); },
    removeItem: (key: string) => { localStore.delete(key); },
    clear: () => { localStore.clear(); },
  });

  // Set up an empty character index so createCharacter can push to it
  localStore.set(INDEX_KEY, JSON.stringify({ activeId: '', characters: [] }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

function makeTestCharacter(overrides: Partial<Character> = {}): Character {
  return {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Test Hero',
    species: 'Human',
    ...overrides,
  };
}

/** Minimal valid character JSON for import (includes all required fields). */
function makeImportJSON(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    _v: 7,
    name: 'Test',
    species: 'Human',
    chars: {},
    ...overrides,
  });
}

describe('Export/Import Portrait Handling', () => {
  describe('Req 5.2: Export with no portrait sets field to empty string', () => {
    it('exported JSON has portrait: "" when character has no portrait in PortraitStore', async () => {
      // Mock portrait store to return null blob (no portrait stored)
      vi.doMock('../portrait-store', () => ({
        getPortraitStore: () => ({
          getPortraitBlob: vi.fn().mockResolvedValue({ ok: true, value: null }),
          isDegraded: () => false,
          savePortrait: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
        }),
      }));

      const { exportToJSONWithPortrait } = await import('../export-import');

      const character = makeTestCharacter();
      const json = await exportToJSONWithPortrait(character, 'char-no-portrait');
      const parsed = JSON.parse(json);

      expect(parsed.portrait).toBe('');
    });
  });

  describe('Req 5.4: Export format backward compatibility', () => {
    it('exported JSON structure is parseable by the legacy importFromJSON', async () => {
      // Mock portrait store to return null blob
      vi.doMock('../portrait-store', () => ({
        getPortraitStore: () => ({
          getPortraitBlob: vi.fn().mockResolvedValue({ ok: true, value: null }),
          isDegraded: () => false,
          savePortrait: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
        }),
      }));

      const { exportToJSONWithPortrait, importFromJSON } = await import('../export-import');

      const character = makeTestCharacter();
      const json = await exportToJSONWithPortrait(character, 'char-compat');
      const parsed = JSON.parse(json);

      // Verify the structure has the same keys as exportToJSON output
      expect(parsed).toHaveProperty('_v');
      expect(parsed).toHaveProperty('name');
      expect(parsed).toHaveProperty('species');
      expect(parsed).toHaveProperty('chars');
      expect(parsed).toHaveProperty('portrait');

      // Verify old importFromJSON can parse this JSON
      const importResult = importFromJSON(json);
      expect(importResult.success).toBe(true);
      expect(importResult.character).toBeDefined();
      expect(importResult.character!.name).toBe('Test Hero');
    });
  });

  describe('Req 5.5: Export failure falls back to empty portrait', () => {
    it('export completes with portrait: "" when getPortraitBlob returns an error', async () => {
      // Mock portrait store to return error on getPortraitBlob
      vi.doMock('../portrait-store', () => ({
        getPortraitStore: () => ({
          getPortraitBlob: vi.fn().mockResolvedValue({
            ok: false,
            error: 'Failed to retrieve portrait blob: Transaction failed',
          }),
          isDegraded: () => false,
          savePortrait: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
        }),
      }));

      const { exportToJSONWithPortrait } = await import('../export-import');

      const character = makeTestCharacter();
      const json = await exportToJSONWithPortrait(character, 'char-fail-export');
      const parsed = JSON.parse(json);

      expect(parsed.portrait).toBe('');
      // Verify the rest of character data is still present
      expect(parsed.name).toBe('Test Hero');
      expect(parsed.species).toBe('Human');
    });

    it('export completes with portrait: "" when getPortraitBlob throws', async () => {
      // Mock portrait store to throw an exception on getPortraitBlob
      vi.doMock('../portrait-store', () => ({
        getPortraitStore: () => ({
          getPortraitBlob: vi.fn().mockRejectedValue(new Error('IndexedDB crash')),
          isDegraded: () => false,
          savePortrait: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
        }),
      }));

      const { exportToJSONWithPortrait } = await import('../export-import');

      const character = makeTestCharacter();
      const json = await exportToJSONWithPortrait(character, 'char-throw-export');
      const parsed = JSON.parse(json);

      expect(parsed.portrait).toBe('');
      expect(parsed.name).toBe('Test Hero');
    });
  });

  describe('Req 6.2: Import with empty/null/undefined portrait creates no entry', () => {
    it('does not call savePortrait when portrait is empty string', async () => {
      const mockSavePortrait = vi.fn().mockResolvedValue({ ok: true, value: undefined });

      vi.doMock('../portrait-store', () => ({
        getPortraitStore: () => ({
          getPortraitBlob: vi.fn().mockResolvedValue({ ok: true, value: null }),
          isDegraded: () => false,
          savePortrait: mockSavePortrait,
        }),
      }));

      const { importFromJSONWithPortrait } = await import('../export-import');

      const json = makeImportJSON({ portrait: '' });
      const result = await importFromJSONWithPortrait(json);

      expect(result.success).toBe(true);
      expect(mockSavePortrait).not.toHaveBeenCalled();
    });

    it('does not call savePortrait when portrait field is missing from import JSON', async () => {
      const mockSavePortrait = vi.fn().mockResolvedValue({ ok: true, value: undefined });

      vi.doMock('../portrait-store', () => ({
        getPortraitStore: () => ({
          getPortraitBlob: vi.fn().mockResolvedValue({ ok: true, value: null }),
          isDegraded: () => false,
          savePortrait: mockSavePortrait,
        }),
      }));

      const { importFromJSONWithPortrait } = await import('../export-import');

      // No portrait field in JSON
      const json = JSON.stringify({ _v: 7, name: 'Test', species: 'Human', chars: {} });
      const result = await importFromJSONWithPortrait(json);

      expect(result.success).toBe(true);
      expect(mockSavePortrait).not.toHaveBeenCalled();
    });
  });

  describe('Req 6.3: Import when IndexedDB unavailable retains portrait in localStorage', () => {
    it('retains portrait in character JSON saved to localStorage when store is degraded', async () => {
      const validDataUrl = 'data:image/png;base64,iVBORw0KGgo=';
      const mockSavePortrait = vi.fn().mockResolvedValue({ ok: true, value: undefined });

      vi.doMock('../portrait-store', () => ({
        getPortraitStore: () => ({
          getPortraitBlob: vi.fn().mockResolvedValue({ ok: true, value: null }),
          isDegraded: () => true,  // Degraded mode — IndexedDB unavailable
          savePortrait: mockSavePortrait,
        }),
      }));

      const { importFromJSONWithPortrait } = await import('../export-import');

      const json = makeImportJSON({ portrait: validDataUrl });
      const result = await importFromJSONWithPortrait(json);

      expect(result.success).toBe(true);
      // savePortrait should NOT have been called (store is degraded)
      expect(mockSavePortrait).not.toHaveBeenCalled();

      // The returned character should still have the portrait data
      expect(result.character!.portrait).toBe(validDataUrl);

      // Verify the character stored in localStorage retains the portrait
      const storedEntries = Array.from(localStore.entries()).filter(([key]) =>
        key.startsWith(CHAR_KEY_PREFIX)
      );
      expect(storedEntries.length).toBeGreaterThan(0);

      const [, storedJson] = storedEntries[0];
      const storedChar = JSON.parse(storedJson);
      expect(storedChar.portrait).toBe(validDataUrl);
    });
  });

  describe('Req 6.4: Import without portrait field', () => {
    it('imports successfully without a portrait field and does not call savePortrait', async () => {
      const mockSavePortrait = vi.fn().mockResolvedValue({ ok: true, value: undefined });

      vi.doMock('../portrait-store', () => ({
        getPortraitStore: () => ({
          getPortraitBlob: vi.fn().mockResolvedValue({ ok: true, value: null }),
          isDegraded: () => false,
          savePortrait: mockSavePortrait,
        }),
      }));

      const { importFromJSONWithPortrait } = await import('../export-import');

      // JSON has no portrait field at all
      const json = JSON.stringify({ _v: 7, name: 'No Portrait', species: 'Elf', chars: {} });
      const result = await importFromJSONWithPortrait(json);

      expect(result.success).toBe(true);
      expect(result.character).toBeDefined();
      expect(result.character!.name).toBe('No Portrait');
      expect(mockSavePortrait).not.toHaveBeenCalled();
    });
  });

  describe('Req 6.5: Import with invalid base64 discards portrait', () => {
    it('discards portrait and sets it to "" when portrait is not a valid base64 data-URL', async () => {
      const mockSavePortrait = vi.fn().mockResolvedValue({ ok: true, value: undefined });

      vi.doMock('../portrait-store', () => ({
        getPortraitStore: () => ({
          getPortraitBlob: vi.fn().mockResolvedValue({ ok: true, value: null }),
          isDegraded: () => false,
          savePortrait: mockSavePortrait,
        }),
      }));

      const { importFromJSONWithPortrait } = await import('../export-import');

      const json = makeImportJSON({ portrait: 'not-valid-base64' });
      const result = await importFromJSONWithPortrait(json);

      expect(result.success).toBe(true);
      // Portrait should be discarded (set to empty)
      expect(result.character!.portrait).toBe('');
      // savePortrait should NOT be called since portrait is invalid
      expect(mockSavePortrait).not.toHaveBeenCalled();
    });

    it('discards portrait that is a plain string without data URL prefix', async () => {
      const mockSavePortrait = vi.fn().mockResolvedValue({ ok: true, value: undefined });

      vi.doMock('../portrait-store', () => ({
        getPortraitStore: () => ({
          getPortraitBlob: vi.fn().mockResolvedValue({ ok: true, value: null }),
          isDegraded: () => false,
          savePortrait: mockSavePortrait,
        }),
      }));

      const { importFromJSONWithPortrait } = await import('../export-import');

      const json = makeImportJSON({ portrait: 'SGVsbG8gV29ybGQ=' });
      const result = await importFromJSONWithPortrait(json);

      expect(result.success).toBe(true);
      expect(result.character!.portrait).toBe('');
      expect(mockSavePortrait).not.toHaveBeenCalled();
    });
  });
});
