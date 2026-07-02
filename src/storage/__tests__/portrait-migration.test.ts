import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { IPortraitStore, PortraitResult } from '../portrait-store';
import { runPortraitMigration } from '../portrait-migration';

/**
 * Unit tests for PortraitMigrationRunner
 * Validates: Requirements 2.5, 2.6, 2.7
 */

// Patch structuredClone for Blob handling in fake-indexeddb (jsdom issue)
const _origStructuredClone = globalThis.structuredClone;
globalThis.structuredClone = (<T>(value: T): T => {
  if (value instanceof Blob) return value as T;
  return _origStructuredClone(value);
}) as typeof structuredClone;

const INDEX_KEY = 'wfrp4e-characters';
const CHAR_KEY_PREFIX = 'wfrp4e-char-';

/** A minimal valid base64 data-URL (6 bytes decoded) */
const VALID_PORTRAIT = 'data:image/png;base64,AQIDBAUG';

function createMockPortraitStore(options: { degraded?: boolean; failOnSave?: boolean } = {}): IPortraitStore {
  const stored = new Map<string, Blob>();

  return {
    init: vi.fn().mockResolvedValue(undefined),
    isDegraded: vi.fn().mockReturnValue(options.degraded ?? false),
    savePortrait: vi.fn(async (characterId: string, blob: Blob): Promise<PortraitResult<void>> => {
      if (options.failOnSave) {
        return { ok: false, error: 'Simulated write failure' };
      }
      stored.set(characterId, blob);
      return { ok: true, value: undefined };
    }),
    getPortraitURL: vi.fn(async (characterId: string): Promise<PortraitResult<string | null>> => {
      const blob = stored.get(characterId);
      if (!blob) return { ok: true, value: null };
      return { ok: true, value: `blob:mock-url-${characterId}` };
    }),
    getPortraitBlob: vi.fn(async (characterId: string): Promise<PortraitResult<Blob | null>> => {
      const blob = stored.get(characterId) ?? null;
      return { ok: true, value: blob };
    }),
    deletePortrait: vi.fn(async (): Promise<PortraitResult<void>> => {
      return { ok: true, value: undefined };
    }),
    revokeURL: vi.fn(),
  };
}

function setUpCharacterIndex(characters: { id: string }[]): void {
  const index = { activeId: characters[0]?.id ?? '', characters };
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

function setUpCharacter(id: string, data: Record<string, unknown>): void {
  localStorage.setItem(`${CHAR_KEY_PREFIX}${id}`, JSON.stringify(data));
}

describe('PortraitMigrationRunner', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Req 2.5: IndexedDB entirely unavailable skips migration', () => {
    it('returns immediately with 0 migrated when portraitStore is degraded', async () => {
      const store = createMockPortraitStore({ degraded: true });

      // Set up a character with a portrait that would normally be migrated
      setUpCharacterIndex([{ id: 'char-1' }]);
      setUpCharacter('char-1', { name: 'Test Character', portrait: VALID_PORTRAIT });

      const result = await runPortraitMigration(store);

      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.failed).toHaveLength(0);
      // savePortrait should never be called
      expect(store.savePortrait).not.toHaveBeenCalled();
    });

    it('leaves localStorage data unchanged when degraded', async () => {
      const store = createMockPortraitStore({ degraded: true });

      setUpCharacterIndex([{ id: 'char-1' }]);
      const charData = { name: 'Test', portrait: VALID_PORTRAIT };
      setUpCharacter('char-1', charData);

      await runPortraitMigration(store);

      // Character data in localStorage should be untouched
      const storedRaw = localStorage.getItem(`${CHAR_KEY_PREFIX}char-1`);
      const stored = JSON.parse(storedRaw!);
      expect(stored.portrait).toBe(VALID_PORTRAIT);
    });
  });

  describe('Req 2.6: character with empty-string portrait is skipped', () => {
    it('skips character whose portrait field is an empty string', async () => {
      const store = createMockPortraitStore();

      setUpCharacterIndex([{ id: 'char-1' }]);
      setUpCharacter('char-1', { name: 'No Portrait', portrait: '' });

      const result = await runPortraitMigration(store);

      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(1);
      expect(store.savePortrait).not.toHaveBeenCalled();
    });

    it('skips character whose portrait field is missing', async () => {
      const store = createMockPortraitStore();

      setUpCharacterIndex([{ id: 'char-1' }]);
      setUpCharacter('char-1', { name: 'No Portrait Field' });

      const result = await runPortraitMigration(store);

      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(1);
      expect(store.savePortrait).not.toHaveBeenCalled();
    });

    it('does not modify localStorage for skipped characters', async () => {
      const store = createMockPortraitStore();

      setUpCharacterIndex([{ id: 'char-1' }]);
      const original = { name: 'No Portrait', portrait: '' };
      setUpCharacter('char-1', original);

      await runPortraitMigration(store);

      const storedRaw = localStorage.getItem(`${CHAR_KEY_PREFIX}char-1`);
      expect(JSON.parse(storedRaw!)).toEqual(original);
    });
  });

  describe('Req 2.7: subsequent runs on already-migrated characters produce no writes', () => {
    it('second migration run produces 0 migrated and no saves', async () => {
      const store = createMockPortraitStore();

      setUpCharacterIndex([{ id: 'char-1' }]);
      setUpCharacter('char-1', { name: 'Hero', portrait: VALID_PORTRAIT });

      // First run — should migrate
      const firstResult = await runPortraitMigration(store);
      expect(firstResult.migrated).toBe(1);

      // After migration, portrait field is removed from localStorage
      const afterFirst = JSON.parse(localStorage.getItem(`${CHAR_KEY_PREFIX}char-1`)!);
      expect(afterFirst.portrait).toBeUndefined();

      // Reset mock call counts
      vi.mocked(store.savePortrait).mockClear();

      // Second run — should skip (portrait field no longer in localStorage)
      const secondResult = await runPortraitMigration(store);

      expect(secondResult.migrated).toBe(0);
      expect(secondResult.skipped).toBe(1);
      expect(store.savePortrait).not.toHaveBeenCalled();
    });

    it('does not write to localStorage on subsequent runs', async () => {
      const store = createMockPortraitStore();

      setUpCharacterIndex([{ id: 'char-1' }]);
      setUpCharacter('char-1', { name: 'Hero', portrait: VALID_PORTRAIT });

      // First run
      await runPortraitMigration(store);

      // Spy on localStorage.setItem after migration
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      // Second run — should produce no writes
      await runPortraitMigration(store);

      expect(setItemSpy).not.toHaveBeenCalled();
    });
  });
});
