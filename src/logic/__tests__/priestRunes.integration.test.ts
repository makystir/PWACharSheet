import { describe, it, expect } from 'vitest';
import { DEITY_REGISTRY } from '../../data/deityRunes';
import { canLearnRune, validateRunePlacement, learnRune } from '../runes';
import { getRestrictedRunes, getDeityChangeWarnings } from '../priestRunes';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character } from '../../types/character';

/**
 * Integration tests for full deity-rune flows.
 * Validates: Requirements 3.1, 3.3, 5.4, 5.5
 */

function makeForgePriest(overrides: Partial<Character> = {}): Character {
  return {
    ...BLANK_CHARACTER,
    species: 'Dwarf',
    career: 'Forge Priest',
    careerLevel: 'Forge Priest',
    patronDeity: 'Smednir',
    xpCur: 200,
    talents: [{ n: 'Rune Magic', a: 1 }],
    knownRunes: [],
    ...overrides,
  };
}

function makeDoomPriest(overrides: Partial<Character> = {}): Character {
  return {
    ...BLANK_CHARACTER,
    species: 'Dwarf',
    career: 'Doom Priest',
    careerLevel: 'Doom Priest',
    patronDeity: 'Grungni',
    xpCur: 200,
    talents: [{ n: 'Rune Magic', a: 1 }],
    knownRunes: [],
    ...overrides,
  };
}

describe('Integration: Full deity-rune flows', () => {
  describe('Assign deity → learn permitted rune → inscribe on item → verify success', () => {
    it('a Forge Priest of Smednir can learn and inscribe a permitted rune', () => {
      const character = makeForgePriest();

      // 'rune-of-forging' is in Smednir's list
      const learnResult = canLearnRune('rune-of-forging', character);
      expect(learnResult.canLearn).toBe(true);
      expect(learnResult.error).toBeUndefined();

      // Learn the rune
      const updatedCharacter = learnRune(character, 'rune-of-forging');
      expect(updatedCharacter.knownRunes).toContain('rune-of-forging');

      // Inscribe on a valid item (rune-of-forging is a talisman, works on both weapon and armour)
      const placementResult = validateRunePlacement('rune-of-forging', [], 'weapon');
      expect(placementResult.valid).toBe(true);
      expect(placementResult.error).toBeUndefined();
    });

    it('a Forge Priest of Smednir can learn multiple permitted runes sequentially', () => {
      let character = makeForgePriest();

      // Learn rune-of-forging
      expect(canLearnRune('rune-of-forging', character).canLearn).toBe(true);
      character = learnRune(character, 'rune-of-forging');

      // Learn rune-of-warding (also in Smednir's list)
      expect(canLearnRune('rune-of-warding', character).canLearn).toBe(true);
      character = learnRune(character, 'rune-of-warding');

      expect(character.knownRunes).toContain('rune-of-forging');
      expect(character.knownRunes).toContain('rune-of-warding');
    });
  });

  describe('Assign deity → attempt non-permitted rune → verify rejection with correct error', () => {
    it('a Doom Priest of Grungni cannot learn a rune not in Grungni list', () => {
      const character = makeDoomPriest({ patronDeity: 'Grungni' });

      // 'rune-of-fire' is in Smednir's list but NOT in Grungni's
      const grungniEntry = DEITY_REGISTRY.find(e => e.god === 'Grungni')!;
      expect(grungniEntry.runeIds).not.toContain('rune-of-fire');

      const result = canLearnRune('rune-of-fire', character);
      expect(result.canLearn).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Rune of Fire');
      expect(result.error).toContain('Grungni');
    });

    it('a Forge Priest of Smednir cannot learn a rune not in Smednir list', () => {
      const character = makeForgePriest({ patronDeity: 'Smednir' });

      // 'rune-of-courage' is in Grungni's list but NOT in Smednir's
      const smednirEntry = DEITY_REGISTRY.find(e => e.god === 'Smednir')!;
      expect(smednirEntry.runeIds).not.toContain('rune-of-courage');

      const result = canLearnRune('rune-of-courage', character);
      expect(result.canLearn).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Rune of Courage');
      expect(result.error).toContain('Smednir');
    });
  });

  describe('Assign deity → learn runes → change deity → verify warnings and restricted flags', () => {
    it('changing from Grungni to Smednir warns about runes not in Smednir list', () => {
      // Character starts with Grungni and knows runes from Grungni's list
      const character = makeDoomPriest({
        patronDeity: 'Grungni',
        knownRunes: ['rune-of-alarm', 'rune-of-courage'],
      });

      // Get warnings for switching to Smednir
      const warnings = getDeityChangeWarnings(character.knownRunes!, 'Smednir');

      // 'rune-of-alarm' is NOT in Smednir's list → should be warned
      const smednirEntry = DEITY_REGISTRY.find(e => e.god === 'Smednir')!;
      expect(smednirEntry.runeIds).not.toContain('rune-of-alarm');

      // 'rune-of-courage' is NOT in Smednir's list → should be warned
      expect(smednirEntry.runeIds).not.toContain('rune-of-courage');

      expect(warnings).toContain('Rune of Alarm');
      expect(warnings).toContain('Rune of Courage');
    });

    it('after changing deity, getRestrictedRunes identifies the correct restricted runes', () => {
      // Simulate: character was Grungni priest, learned these runes, now changes to Smednir
      const knownRunes = ['rune-of-alarm', 'rune-of-courage', 'rune-of-forging'];

      // After deity change to Smednir
      const restricted = getRestrictedRunes(knownRunes, 'Smednir');

      // rune-of-alarm is NOT in Smednir's list → restricted
      expect(restricted).toContain('rune-of-alarm');

      // rune-of-courage is NOT in Smednir's list → restricted
      expect(restricted).toContain('rune-of-courage');

      // rune-of-forging IS in Smednir's list → not restricted
      expect(restricted).not.toContain('rune-of-forging');
    });

    it('runes shared between old and new deity are not flagged as restricted', () => {
      // 'rune-of-forging' and 'rune-of-warding' are in both Grungni and Smednir lists
      const knownRunes = ['rune-of-forging', 'rune-of-warding'];

      const warnings = getDeityChangeWarnings(knownRunes, 'Smednir');
      expect(warnings).toHaveLength(0);

      const restricted = getRestrictedRunes(knownRunes, 'Smednir');
      expect(restricted).toHaveLength(0);
    });
  });
});
