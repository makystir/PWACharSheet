import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCharacterIndex,
  createCharacter,
  loadCharacter,
  saveCharacter,
  renameCharacter,
  duplicateCharacter,
  deleteCharacter,
  listCharacters,
  getActiveCharacterId,
  setActiveCharacter,
} from '../character-manager';
import { BLANK_CHARACTER } from '../../types/character';

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
  // Provide deterministic UUIDs
  let uuidCounter = 0;
  vi.stubGlobal('crypto', {
    randomUUID: () => `uuid-${++uuidCounter}`,
  });
});

// Feature: pwa-character-sheet, Property 17: Character save/load round-trip
describe('Property 17: Character save/load round-trip', () => {
  it('saves and loads a character with deep equality', () => {
    const id = createCharacter('Brunhilde');
    const char = loadCharacter(id)!;
    // Modify some fields
    char.species = 'Dwarf';
    char.career = 'Ironbreaker';
    char.xpCur = 150;
    char.chars.WS.a = 10;
    char.talents.push({ n: 'Hardy', lvl: 1, desc: 'Extra tough' });
    saveCharacter(id, char);

    const loaded = loadCharacter(id)!;
    expect(loaded).toEqual(char);
  });

  it('round-trips a character with complex nested data', () => {
    const id = createCharacter('Sigmar');
    const char = loadCharacter(id)!;
    char.estate.name = 'Castle Greystone';
    char.estate.treasury = { d: 100, ss: 50, gc: 10 };
    char.estate.ledger.push({ timestamp: 1000, type: 'income', description: 'Tax', amount: { d: 0, ss: 0, gc: 5 } });
    char.weapons.push({ name: 'Warhammer', group: 'Two-Handed', enc: '2', damage: '+SB+1', qualities: 'Pummel' });
    char.conditions.push({ name: 'Fatigued', level: 2 });
    saveCharacter(id, char);

    const loaded = loadCharacter(id)!;
    expect(loaded).toEqual(char);
  });

  it('returns null for a non-existent character ID', () => {
    expect(loadCharacter('non-existent-id')).toBeNull();
  });
});

// Feature: pwa-character-sheet, Property 21: Character creation produces valid defaults
describe('Property 21: Character creation produces valid defaults', () => {
  it('creates a character with the given name and BLANK_CHARACTER defaults', () => {
    const id = createCharacter('Gregor');
    expect(id).toBeTruthy();

    const char = loadCharacter(id)!;
    expect(char.name).toBe('Gregor');
    expect(char._v).toBe(6);
    expect(char.species).toBe('');
    expect(char.career).toBe('');
    expect(char.xpCur).toBe(0);
    expect(char.conditions).toEqual([]);
    expect(char.talents).toEqual([]);
    expect(char.weapons).toEqual([]);
    expect(char.estate).toEqual(BLANK_CHARACTER.estate);
  });

  it('adds the character to the index with correct summary', () => {
    const id = createCharacter('Elara');
    const index = getCharacterIndex();
    expect(index.characters).toHaveLength(1);
    expect(index.characters[0].id).toBe(id);
    expect(index.characters[0].name).toBe('Elara');
    expect(index.characters[0].species).toBe('');
    expect(index.characters[0].career).toBe('');
    expect(index.characters[0].lastModified).toBeGreaterThan(0);
  });

  it('sets the first created character as active', () => {
    const id = createCharacter('First');
    expect(getActiveCharacterId()).toBe(id);
  });

  it('creates characters with unique IDs', () => {
    const id1 = createCharacter('Char A');
    const id2 = createCharacter('Char B');
    expect(id1).not.toBe(id2);
    expect(listCharacters()).toHaveLength(2);
  });
});

// Feature: pwa-character-sheet, Property 22: Character rename updates consistently
describe('Property 22: Character rename updates consistently', () => {
  it('updates name in both index and stored character', () => {
    const id = createCharacter('OldName');
    renameCharacter(id, 'NewName');

    const char = loadCharacter(id)!;
    expect(char.name).toBe('NewName');

    const index = getCharacterIndex();
    const entry = index.characters.find((c) => c.id === id)!;
    expect(entry.name).toBe('NewName');
  });

  it('preserves the character ID after rename', () => {
    const id = createCharacter('Original');
    renameCharacter(id, 'Renamed');
    const index = getCharacterIndex();
    expect(index.characters[0].id).toBe(id);
  });

  it('does not affect other characters when renaming', () => {
    const id1 = createCharacter('Alice');
    const id2 = createCharacter('Bob');
    renameCharacter(id1, 'Alice Renamed');

    const char2 = loadCharacter(id2)!;
    expect(char2.name).toBe('Bob');
  });
});

// Feature: pwa-character-sheet, Property 23: Character deletion and last-character guard
describe('Property 23: Character deletion and last-character guard', () => {
  it('deletes a character from a multi-character index', () => {
    const id1 = createCharacter('Char A');
    const id2 = createCharacter('Char B');

    const result = deleteCharacter(id1);
    expect(result).toBe(true);
    expect(listCharacters()).toHaveLength(1);
    expect(listCharacters()[0].id).toBe(id2);
    expect(loadCharacter(id1)).toBeNull();
  });

  it('prevents deletion when only one character exists', () => {
    const id = createCharacter('Only One');
    const result = deleteCharacter(id);
    expect(result).toBe(false);
    expect(listCharacters()).toHaveLength(1);
    expect(loadCharacter(id)).not.toBeNull();
  });

  it('switches active character when the active one is deleted', () => {
    const id1 = createCharacter('Active');
    const id2 = createCharacter('Other');
    setActiveCharacter(id1);

    deleteCharacter(id1);
    expect(getActiveCharacterId()).toBe(id2);
  });

  it('reduces character count by exactly 1 on deletion', () => {
    createCharacter('A');
    createCharacter('B');
    const id3 = createCharacter('C');
    expect(listCharacters()).toHaveLength(3);

    deleteCharacter(id3);
    expect(listCharacters()).toHaveLength(2);
  });
});

// Feature: pwa-character-sheet, Property 24: Character isolation in storage
describe('Property 24: Character isolation in storage', () => {
  it('modifying one character does not affect another', () => {
    const id1 = createCharacter('Warrior');
    const id2 = createCharacter('Mage');

    const char1 = loadCharacter(id1)!;
    char1.species = 'Dwarf';
    char1.xpCur = 500;
    char1.talents.push({ n: 'Strike Mighty Blow', lvl: 1, desc: 'Hit harder' });
    saveCharacter(id1, char1);

    const char2 = loadCharacter(id2)!;
    expect(char2.species).toBe('');
    expect(char2.xpCur).toBe(0);
    expect(char2.talents).toEqual([]);
  });

  it('duplicated characters are independent after duplication', () => {
    const id1 = createCharacter('Original');
    const char1 = loadCharacter(id1)!;
    char1.species = 'Human';
    char1.career = 'Soldier';
    saveCharacter(id1, char1);

    const id2 = duplicateCharacter(id1);

    // Modify the duplicate
    const dup = loadCharacter(id2)!;
    dup.species = 'Elf';
    dup.career = 'Wizard';
    saveCharacter(id2, dup);

    // Original should be unchanged
    const original = loadCharacter(id1)!;
    expect(original.species).toBe('Human');
    expect(original.career).toBe('Soldier');
  });

  it('duplicate has " (Copy)" suffix and a different ID', () => {
    const id1 = createCharacter('Hero');
    const id2 = duplicateCharacter(id1);

    expect(id2).not.toBe(id1);
    const dup = loadCharacter(id2)!;
    expect(dup.name).toBe('Hero (Copy)');
  });
});
