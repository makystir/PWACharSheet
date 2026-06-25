import { describe, it, expect } from 'vitest';
import {
  normalizeYenluiState,
  isYenluiVisible,
  getYenluiDifficulty,
  getYenluiTalentNotes,
} from '../yenlui';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character } from '../../types/character';

function makeCharacter(overrides: Partial<Character>): Character {
  return { ...BLANK_CHARACTER, ...overrides };
}

describe('normalizeYenluiState', () => {
  it('returns undefined for null', () => {
    expect(normalizeYenluiState(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(normalizeYenluiState(undefined)).toBeUndefined();
  });

  it('returns undefined for a number', () => {
    expect(normalizeYenluiState(42)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(normalizeYenluiState('')).toBeUndefined();
  });

  it('returns undefined for invalid string', () => {
    expect(normalizeYenluiState('invalid')).toBeUndefined();
  });

  it('returns "light" for valid "light" input', () => {
    expect(normalizeYenluiState('light')).toBe('light');
  });
});

describe('isYenluiVisible', () => {
  it('returns false for Human with useYenlui enabled', () => {
    const char = makeCharacter({
      species: 'Human / Reiklander',
      houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
    });
    expect(isYenluiVisible(char)).toBe(false);
  });

  it('returns false for Dwarf with useYenlui enabled', () => {
    const char = makeCharacter({
      species: 'Dwarf',
      houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
    });
    expect(isYenluiVisible(char)).toBe(false);
  });

  it('returns false for High Elf with useYenlui disabled', () => {
    const char = makeCharacter({
      species: 'High Elf',
      houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: false },
    });
    expect(isYenluiVisible(char)).toBe(false);
  });
});

describe('getYenluiDifficulty', () => {
  it('returns Challenging (+0) when yenluiState is undefined', () => {
    const char = makeCharacter({ yenluiState: undefined });
    expect(getYenluiDifficulty(char)).toEqual({ label: 'Challenging', modifier: '(+0)' });
  });

  it('returns Very Hard (-30) when dark with Sanctuary of the Mind at level 2', () => {
    const char = makeCharacter({
      yenluiState: 'dark',
      talents: [{ n: 'Sanctuary of the Mind', lvl: 2, desc: '' }],
    });
    expect(getYenluiDifficulty(char)).toEqual({ label: 'Very Hard', modifier: '(-30)' });
  });
});

describe('getYenluiTalentNotes', () => {
  it('returns empty array when character has no talents', () => {
    const char = makeCharacter({ talents: [] });
    expect(getYenluiTalentNotes(char)).toEqual([]);
  });

  it('returns empty array for Sanctuary of the Mind at level 1', () => {
    const char = makeCharacter({
      talents: [{ n: 'Sanctuary of the Mind', lvl: 1, desc: '' }],
    });
    expect(getYenluiTalentNotes(char)).toEqual([]);
  });

  it('returns empty array for Sanctuary of the Mind at level 2', () => {
    const char = makeCharacter({
      talents: [{ n: 'Sanctuary of the Mind', lvl: 2, desc: '' }],
    });
    expect(getYenluiTalentNotes(char)).toEqual([]);
  });
});
