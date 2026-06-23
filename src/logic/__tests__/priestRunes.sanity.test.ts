import { describe, it, expect } from 'vitest';
import {
  isValidDeity,
  isPriestCareer,
  isHighPriestLevel,
  shouldApplyDeityFilter,
  getPriestAvailableRunes,
  getRestrictedRunes,
  getDeityChangeWarnings,
} from '../priestRunes';
import { RUNE_CATALOGUE } from '../../data/runes';
import { BLANK_CHARACTER } from '../../types/character';

describe('priestRunes - sanity checks', () => {
  describe('isValidDeity', () => {
    it('returns true for valid deity names', () => {
      expect(isValidDeity('Grungni')).toBe(true);
      expect(isValidDeity('Valaya')).toBe(true);
      expect(isValidDeity('Morgrim')).toBe(true);
    });

    it('returns false for invalid strings', () => {
      expect(isValidDeity('Zeus')).toBe(false);
      expect(isValidDeity('')).toBe(false);
      expect(isValidDeity('grungni')).toBe(false);
    });
  });

  describe('isPriestCareer', () => {
    it('matches priest career names', () => {
      expect(isPriestCareer('Doom Priest')).toBe(true);
      expect(isPriestCareer('Forge Priest')).toBe(true);
      expect(isPriestCareer('Hearth Priest')).toBe(true);
    });

    it('matches priest career level titles', () => {
      expect(isPriestCareer('Initiate of Gazul')).toBe(true);
      expect(isPriestCareer('High Doom Priest')).toBe(true);
      expect(isPriestCareer('Arch Forge Priest')).toBe(true);
      expect(isPriestCareer('Initiate of Valaya')).toBe(true);
    });

    it('returns false for non-priest careers', () => {
      expect(isPriestCareer('Soldier')).toBe(false);
      expect(isPriestCareer('Warrior Priest')).toBe(false);
      expect(isPriestCareer('Engineer')).toBe(false);
    });
  });

  describe('isHighPriestLevel', () => {
    it('returns true for level 3 titles', () => {
      expect(isHighPriestLevel('Doom Priest', 'High Doom Priest')).toBe(true);
      expect(isHighPriestLevel('Forge Priest', 'High Forge Priest')).toBe(true);
      expect(isHighPriestLevel('Hearth Priest', 'High Hearth Priest')).toBe(true);
    });

    it('returns true for level 4 titles', () => {
      expect(isHighPriestLevel('Doom Priest', 'Arch Doom Priest')).toBe(true);
      expect(isHighPriestLevel('Forge Priest', 'Arch Forge Priest')).toBe(true);
      expect(isHighPriestLevel('Hearth Priest', 'Arch Hearth Priest')).toBe(true);
    });

    it('returns false for level 1 and 2 titles', () => {
      expect(isHighPriestLevel('Doom Priest', 'Initiate of Gazul')).toBe(false);
      expect(isHighPriestLevel('Doom Priest', 'Doom Priest')).toBe(false);
      expect(isHighPriestLevel('Forge Priest', 'Initiate of Morgrim')).toBe(false);
      expect(isHighPriestLevel('Forge Priest', 'Forge Priest')).toBe(false);
    });
  });

  describe('shouldApplyDeityFilter', () => {
    it('returns true for Dwarf priest character', () => {
      const char = {
        ...BLANK_CHARACTER,
        species: 'Dwarf',
        career: 'Doom Priest',
        careerLevel: 'Doom Priest',
      };
      expect(shouldApplyDeityFilter(char)).toBe(true);
    });

    it('returns false for non-Dwarf priest', () => {
      const char = {
        ...BLANK_CHARACTER,
        species: 'Human',
        career: 'Doom Priest',
        careerLevel: 'Doom Priest',
      };
      expect(shouldApplyDeityFilter(char)).toBe(false);
    });

    it('returns false for Dwarf non-priest', () => {
      const char = {
        ...BLANK_CHARACTER,
        species: 'Dwarf',
        career: 'Soldier',
        careerLevel: 'Soldier',
      };
      expect(shouldApplyDeityFilter(char)).toBe(false);
    });
  });

  describe('getPriestAvailableRunes', () => {
    it('returns all rune IDs when deity is null', () => {
      const result = getPriestAvailableRunes(null, false);
      expect(result).toHaveLength(RUNE_CATALOGUE.length);
    });

    it('returns all rune IDs when deity is undefined', () => {
      const result = getPriestAvailableRunes(undefined, false);
      expect(result).toHaveLength(RUNE_CATALOGUE.length);
    });

    it('returns Smednir base runes without bonus when not high priest', () => {
      const result = getPriestAvailableRunes('Smednir', false);
      expect(result).toHaveLength(8);
      expect(result).not.toContain('master-rune-of-industry');
    });

    it('returns Smednir runes with bonus when high priest', () => {
      const result = getPriestAvailableRunes('Smednir', true);
      expect(result).toHaveLength(9);
      expect(result).toContain('master-rune-of-industry');
    });

    it('returns Grungni runes without bonus regardless of high priest', () => {
      const noHP = getPriestAvailableRunes('Grungni', false);
      const withHP = getPriestAvailableRunes('Grungni', true);
      expect(noHP).toHaveLength(11);
      expect(withHP).toHaveLength(11);
    });
  });

  describe('getRestrictedRunes', () => {
    it('returns empty when deity is null', () => {
      expect(getRestrictedRunes(['rune-of-alarm'], null)).toEqual([]);
    });

    it('identifies runes not in deity access list', () => {
      const restricted = getRestrictedRunes(
        ['rune-of-alarm', 'rune-of-fire', 'rune-of-might'],
        'Grungni'
      );
      // rune-of-alarm is in Grungni's list, fire and might are not
      expect(restricted).toContain('rune-of-fire');
      expect(restricted).toContain('rune-of-might');
      expect(restricted).not.toContain('rune-of-alarm');
    });
  });

  describe('getDeityChangeWarnings', () => {
    it('returns names of runes that become restricted', () => {
      const warnings = getDeityChangeWarnings(
        ['rune-of-alarm', 'rune-of-might'],
        'Smednir'
      );
      // rune-of-alarm is NOT in Smednir's list, rune-of-might is NOT either
      expect(warnings).toContain('Rune of Alarm');
      expect(warnings).toContain('Rune of Might');
    });

    it('returns empty when all known runes are in new deity access list', () => {
      const warnings = getDeityChangeWarnings(
        ['rune-of-forging', 'rune-of-furnace'],
        'Grungni'
      );
      expect(warnings).toEqual([]);
    });
  });
});
