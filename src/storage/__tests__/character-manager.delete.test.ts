import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createCharacter,
  deleteCharacter,
  getCharacterIndex,
  listCharacters,
  loadCharacter,
  setActiveCharacter,
} from '../character-manager';

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
  let uuidCounter = 0;
  vi.stubGlobal('crypto', {
    randomUUID: () => `del-uuid-${++uuidCounter}`,
  });
});

/**
 * Validates: Requirements 2.2, 3.2, 4.1, 4.2
 */
describe('deleteCharacter — non-active character', () => {
  it('removes the character from the index', () => {
    const idA = createCharacter('Brunhilde');
    const idB = createCharacter('Sigmar');
    setActiveCharacter(idA);

    const result = deleteCharacter(idB);

    expect(result).toBe(true);
    const index = getCharacterIndex();
    expect(index.characters).toHaveLength(1);
    expect(index.characters[0].id).toBe(idA);
  });

  it('removes the character data from localStorage', () => {
    const idA = createCharacter('Brunhilde');
    const idB = createCharacter('Sigmar');
    setActiveCharacter(idA);

    deleteCharacter(idB);

    expect(store.has(`wfrp4e-char-${idB}`)).toBe(false);
    // loadCharacter should return null for the deleted id
    expect(loadCharacter(idB)).toBeNull();
  });

  it('does not change the activeId', () => {
    const idA = createCharacter('Brunhilde');
    const idB = createCharacter('Sigmar');
    setActiveCharacter(idA);

    deleteCharacter(idB);

    expect(getCharacterIndex().activeId).toBe(idA);
  });

  it('preserves the remaining character data in localStorage', () => {
    const idA = createCharacter('Brunhilde');
    const idB = createCharacter('Sigmar');
    setActiveCharacter(idA);

    deleteCharacter(idB);

    expect(store.has(`wfrp4e-char-${idA}`)).toBe(true);
    expect(loadCharacter(idA)).not.toBeNull();
  });
});

describe('deleteCharacter — active character', () => {
  it('switches activeId to the first remaining character', () => {
    const idA = createCharacter('Active');
    const idB = createCharacter('Other');
    setActiveCharacter(idA);

    deleteCharacter(idA);

    expect(getCharacterIndex().activeId).toBe(idB);
  });

  it('switches activeId correctly when deleting from a three-character list', () => {
    const idA = createCharacter('Alpha');
    const idB = createCharacter('Beta');
    createCharacter('Gamma');
    setActiveCharacter(idB);

    deleteCharacter(idB);

    // Should switch to the first remaining, which is Alpha
    expect(getCharacterIndex().activeId).toBe(idA);
  });

  it('removes the active character data from localStorage', () => {
    const idA = createCharacter('Active');
    createCharacter('Other');
    setActiveCharacter(idA);

    deleteCharacter(idA);

    expect(store.has(`wfrp4e-char-${idA}`)).toBe(false);
    expect(loadCharacter(idA)).toBeNull();
  });
});

/**
 * Validates: Requirements 4.1, 5.3
 */
describe('deleteCharacter — last remaining character', () => {
  it('returns true and deletes the character', () => {
    const id = createCharacter('Only One');

    const result = deleteCharacter(id);

    expect(result).toBe(true);
  });

  it('sets activeId to empty string and empties the characters array', () => {
    const id = createCharacter('Only One');

    deleteCharacter(id);

    const index = getCharacterIndex();
    expect(index.characters).toHaveLength(0);
    expect(index.activeId).toBe('');
  });

  it('removes the character data from localStorage', () => {
    const id = createCharacter('Only One');

    deleteCharacter(id);

    expect(store.has(`wfrp4e-char-${id}`)).toBe(false);
    expect(loadCharacter(id)).toBeNull();
  });

  it('listCharacters returns an empty array after last-character deletion', () => {
    const id = createCharacter('Only One');

    deleteCharacter(id);

    expect(listCharacters()).toEqual([]);
  });
});

describe('listCharacters — after deletion', () => {
  it('excludes the deleted character', () => {
    const idA = createCharacter('Kept');
    const idB = createCharacter('Deleted');

    deleteCharacter(idB);

    const list = listCharacters();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(idA);
    expect(list.find((c) => c.id === idB)).toBeUndefined();
  });

  it('returns all remaining characters after multiple deletions', () => {
    const idA = createCharacter('Alpha');
    const idB = createCharacter('Beta');
    const idC = createCharacter('Gamma');

    deleteCharacter(idB);
    deleteCharacter(idC);

    const list = listCharacters();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(idA);
  });
});
