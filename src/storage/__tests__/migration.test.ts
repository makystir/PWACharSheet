import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runMigration } from '../migration';
import { BLANK_CHARACTER } from '../../types/character';
import type { CharacterIndex } from '../../types/character';

let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  });
  let uuidCounter = 0;
  vi.stubGlobal('crypto', {
    randomUUID: () => `mig-uuid-${++uuidCounter}`,
  });
});

function getIndex(): CharacterIndex {
  const raw = store.get('wfrp4e-characters');
  return raw ? JSON.parse(raw) as CharacterIndex : { activeId: '', characters: [] };
}

describe('Migration: fresh install', () => {
  it('creates an empty CharacterIndex when no data exists', () => {
    runMigration();
    const index = getIndex();
    expect(index).toBeTruthy();
    expect(index.activeId).toBe('');
    expect(index.characters).toEqual([]);
  });
});

describe('Migration: legacy v6 single-character', () => {
  it('migrates wfrp4e-char v6 data to multi-char format', () => {
    const legacyChar = {
      ...structuredClone(BLANK_CHARACTER),
      name: 'Brunhilde',
      species: 'Dwarf',
      career: 'Ironbreaker',
    };
    store.set('wfrp4e-char', JSON.stringify(legacyChar));

    runMigration();

    const index = getIndex();
    expect(index.characters).toHaveLength(1);
    expect(index.characters[0].name).toBe('Brunhilde');
    expect(index.activeId).toBe(index.characters[0].id);

    // Legacy key should be removed
    expect(store.has('wfrp4e-char')).toBe(false);

    // Character should be stored at new key
    const charKey = `wfrp4e-char-${index.characters[0].id}`;
    const stored = JSON.parse(store.get(charKey)!);
    expect(stored.name).toBe('Brunhilde');
    expect(stored.species).toBe('Dwarf');
    expect(stored._v).toBe(6);
  });
});

describe('Migration: pre-v6 data', () => {
  it('migrates wfrp4e-v5 data to v6 multi-char format', () => {
    const oldData = {
      _v: 5,
      name: 'OldChar',
      species: 'Human',
      career: 'Soldier',
      chars: {
        WS: { i: 30, a: 5 },
        BS: { i: 25, a: 0 },
      },
    };
    store.set('wfrp4e-v5', JSON.stringify(oldData));

    runMigration();

    const index = getIndex();
    expect(index.characters).toHaveLength(1);
    expect(index.characters[0].name).toBe('OldChar');

    const charKey = `wfrp4e-char-${index.characters[0].id}`;
    const stored = JSON.parse(store.get(charKey)!);
    expect(stored._v).toBe(6);
    expect(stored.name).toBe('OldChar');
    // Deep merge should fill in missing fields from BLANK_CHARACTER
    expect(stored.conditions).toEqual([]);
    expect(stored.estate).toBeTruthy();
    expect(stored.estate.treasury).toEqual({ d: 0, ss: 0, gc: 0 });

    // Legacy key removed
    expect(store.has('wfrp4e-v5')).toBe(false);
  });

  it('migrates wfrp4e-v4 data when v5 is not present', () => {
    const oldData = {
      _v: 4,
      name: 'V4Char',
      species: 'Halfling',
    };
    store.set('wfrp4e-v4', JSON.stringify(oldData));

    runMigration();

    const index = getIndex();
    expect(index.characters).toHaveLength(1);
    expect(index.characters[0].name).toBe('V4Char');

    const charKey = `wfrp4e-char-${index.characters[0].id}`;
    const stored = JSON.parse(store.get(charKey)!);
    expect(stored._v).toBe(6);
    expect(store.has('wfrp4e-v4')).toBe(false);
  });

  it('prefers v5 over v4 when both exist', () => {
    store.set('wfrp4e-v5', JSON.stringify({ _v: 5, name: 'V5Char' }));
    store.set('wfrp4e-v4', JSON.stringify({ _v: 4, name: 'V4Char' }));

    runMigration();

    const index = getIndex();
    expect(index.characters).toHaveLength(1);
    expect(index.characters[0].name).toBe('V5Char');
    // v5 key removed, v4 still present (only first match is migrated)
    expect(store.has('wfrp4e-v5')).toBe(false);
  });
});

describe('Migration: idempotency', () => {
  it('does not create duplicate entries when run twice', () => {
    const legacyChar = {
      ...structuredClone(BLANK_CHARACTER),
      name: 'Sigmar',
    };
    store.set('wfrp4e-char', JSON.stringify(legacyChar));

    runMigration();
    const indexAfterFirst = getIndex();
    expect(indexAfterFirst.characters).toHaveLength(1);

    runMigration();
    const indexAfterSecond = getIndex();
    expect(indexAfterSecond.characters).toHaveLength(1);
    expect(indexAfterSecond.characters[0].name).toBe('Sigmar');
  });

  it('skips migration when multi-char index already exists', () => {
    const existingIndex: CharacterIndex = {
      activeId: 'existing-id',
      characters: [{ id: 'existing-id', name: 'Existing', species: '', career: '', careerLevel: '', lastModified: 1000 }],
    };
    store.set('wfrp4e-characters', JSON.stringify(existingIndex));
    // Also seed a legacy key that should NOT be migrated
    store.set('wfrp4e-char', JSON.stringify({ ...structuredClone(BLANK_CHARACTER), name: 'Legacy' }));

    runMigration();

    const index = getIndex();
    expect(index.characters).toHaveLength(1);
    expect(index.characters[0].name).toBe('Existing');
    // Legacy key should still be there (not touched)
    expect(store.has('wfrp4e-char')).toBe(true);
  });

  it('fresh install migration is idempotent', () => {
    runMigration();
    runMigration();
    const index = getIndex();
    expect(index.characters).toEqual([]);
  });
});
