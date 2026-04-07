import { describe, it, expect } from 'vitest';
import { getSpeciesData, applySpeciesData, clearSpeciesData } from '../species';
import { SPECIES_DATA } from '../../data/species';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, CharacteristicKey } from '../../types/character';

const ALL_CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

function makeBlankCharacter(): Character {
  return structuredClone(BLANK_CHARACTER);
}

// ─── Property 3: Species application sets correct racial bonuses ─────────────
// Validates: Requirements 3.3

describe('getSpeciesData', () => {
  it('returns data for all 5 species', () => {
    for (const species of Object.keys(SPECIES_DATA)) {
      expect(getSpeciesData(species)).toBeDefined();
    }
  });

  it('returns undefined for unknown species', () => {
    expect(getSpeciesData('Ogre')).toBeUndefined();
  });
});

describe('applySpeciesData — Property 3', () => {
  it('Human / Reiklander: sets correct racial bonuses', () => {
    const char = makeBlankCharacter();
    const result = applySpeciesData(char, 'Human / Reiklander');
    const data = SPECIES_DATA['Human / Reiklander'];

    for (const key of ALL_CHAR_KEYS) {
      expect(result.chars[key].i).toBe(data.chars[key]);
    }
    expect(result.move).toEqual({ m: 4, w: 8, r: 16 });
    expect(result.fate).toBe(2);
    expect(result.resilience).toBe(1);
    expect(result.speciesExtraPoints).toBe(3);
    expect(result.woundsUseSB).toBe(false);
    expect(result.speciesSkills).toEqual(data.skills);
    expect(result.speciesTalents).toEqual(data.talents);
  });

  it('Dwarf: sets correct racial bonuses', () => {
    const char = makeBlankCharacter();
    const result = applySpeciesData(char, 'Dwarf');
    const data = SPECIES_DATA['Dwarf'];

    expect(result.chars.WS.i).toBe(30);
    expect(result.chars.Ag.i).toBe(10);
    expect(result.chars.WP.i).toBe(40);
    expect(result.move).toEqual({ m: 3, w: 6, r: 12 });
    expect(result.fate).toBe(0);
    expect(result.resilience).toBe(2);
    expect(result.speciesExtraPoints).toBe(2);
    expect(result.woundsUseSB).toBe(true);
    expect(result.speciesSkills).toEqual(data.skills);
    expect(result.speciesTalents).toEqual(data.talents);
  });

  it('Halfling: sets correct racial bonuses', () => {
    const char = makeBlankCharacter();
    const result = applySpeciesData(char, 'Halfling');
    const data = SPECIES_DATA['Halfling'];

    expect(result.chars.WS.i).toBe(10);
    expect(result.chars.BS.i).toBe(30);
    expect(result.chars.Fel.i).toBe(30);
    expect(result.move).toEqual({ m: 3, w: 6, r: 12 });
    expect(result.fate).toBe(0);
    expect(result.resilience).toBe(2);
    expect(result.speciesExtraPoints).toBe(3);
    expect(result.woundsUseSB).toBe(false);
    expect(result.speciesSkills).toEqual(data.skills);
    expect(result.speciesTalents).toEqual(data.talents);
  });

  it('High Elf: sets correct racial bonuses', () => {
    const char = makeBlankCharacter();
    const result = applySpeciesData(char, 'High Elf');
    const data = SPECIES_DATA['High Elf'];

    expect(result.chars.I.i).toBe(40);
    expect(result.chars.Ag.i).toBe(30);
    expect(result.move).toEqual({ m: 5, w: 10, r: 20 });
    expect(result.fate).toBe(0);
    expect(result.resilience).toBe(0);
    expect(result.speciesExtraPoints).toBe(2);
    expect(result.woundsUseSB).toBe(false);
    expect(result.speciesSkills).toEqual(data.skills);
    expect(result.speciesTalents).toEqual(data.talents);
  });

  it('Wood Elf: sets correct racial bonuses', () => {
    const char = makeBlankCharacter();
    const result = applySpeciesData(char, 'Wood Elf');
    const data = SPECIES_DATA['Wood Elf'];

    expect(result.chars.WS.i).toBe(30);
    expect(result.chars.BS.i).toBe(30);
    expect(result.chars.I.i).toBe(40);
    expect(result.move).toEqual({ m: 5, w: 10, r: 20 });
    expect(result.fate).toBe(0);
    expect(result.resilience).toBe(0);
    expect(result.speciesExtraPoints).toBe(2);
    expect(result.woundsUseSB).toBe(false);
    expect(result.speciesSkills).toEqual(data.skills);
    expect(result.speciesTalents).toEqual(data.talents);
  });

  it('preserves existing advances when applying species', () => {
    const char = makeBlankCharacter();
    char.chars.WS = { i: 0, a: 10, b: 5 };
    const result = applySpeciesData(char, 'Dwarf');
    expect(result.chars.WS.i).toBe(30);
    expect(result.chars.WS.a).toBe(10);
    expect(result.chars.WS.b).toBe(5);
  });

  it('returns unchanged character for unknown species', () => {
    const char = makeBlankCharacter();
    const result = applySpeciesData(char, 'Ogre');
    expect(result.species).toBe('');
    expect(result.fate).toBe(0);
  });

  it('does not mutate the original character', () => {
    const char = makeBlankCharacter();
    const original = JSON.parse(JSON.stringify(char));
    applySpeciesData(char, 'Dwarf');
    expect(char).toEqual(original);
  });
});

describe('clearSpeciesData', () => {
  it('resets all species-related fields to defaults', () => {
    const char = makeBlankCharacter();
    const applied = applySpeciesData(char, 'Dwarf');
    const cleared = clearSpeciesData(applied);

    for (const key of ALL_CHAR_KEYS) {
      expect(cleared.chars[key].i).toBe(0);
    }
    expect(cleared.species).toBe('');
    expect(cleared.move).toEqual({ m: 0, w: 0, r: 0 });
    expect(cleared.fate).toBe(0);
    expect(cleared.resilience).toBe(0);
    expect(cleared.speciesExtraPoints).toBe(0);
    expect(cleared.woundsUseSB).toBe(false);
    expect(cleared.speciesSkills).toEqual([]);
    expect(cleared.speciesTalents).toEqual([]);
  });

  it('does not mutate the original character', () => {
    const char = makeBlankCharacter();
    const applied = applySpeciesData(char, 'Human / Reiklander');
    const original = JSON.parse(JSON.stringify(applied));
    clearSpeciesData(applied);
    expect(applied).toEqual(original);
  });
});
