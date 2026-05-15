import { describe, it, expect } from 'vitest';
import {
  getTechniqueById,
  getTechniqueXpCost,
  hasSwordDancingTalent,
  getLearnedTechniques,
  canLearnTechnique,
  learnTechnique,
} from '../swordDancing';
import { SWORD_DANCING_TECHNIQUES } from '../../data/swordDancingTechniques';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character } from '../../types/character';

function makeCharacter(overrides: Partial<Character>): Character {
  return { ...BLANK_CHARACTER, ...overrides };
}

// ─── Static Data Integrity ──────────────────────────────────────
// Validates: Requirements 8.1

describe('SWORD_DANCING_TECHNIQUES — all 10 techniques exist with correct data', () => {
  it('contains exactly 10 techniques', () => {
    expect(SWORD_DANCING_TECHNIQUES).toHaveLength(10);
  });

  const expectedTechniques = [
    { id: 'ritual-of-cleansing', name: 'Ritual of Cleansing', sl: 1, order: 1 },
    { id: 'flight-of-the-phoenix', name: 'Flight of the Phoenix', sl: 1, order: 2 },
    { id: 'path-of-the-sun', name: 'Path of the Sun', sl: 1, order: 3 },
    { id: 'path-of-frost', name: 'Path of Frost', sl: 1, order: 4 },
    { id: 'path-of-the-storm', name: 'Path of the Storm', sl: 1, order: 5 },
    { id: 'path-of-the-rain', name: 'Path of the Rain', sl: 2, order: 6 },
    { id: 'shadows-of-loec', name: 'Shadows of Loec', sl: 2, order: 7 },
    { id: 'path-of-the-hawk', name: 'Path of the Hawk', sl: 3, order: 8 },
    { id: 'path-of-falling-water', name: 'Path of Falling Water', sl: 3, order: 9 },
    { id: 'final-stroke-of-the-master', name: 'Final Stroke of the Master', sl: 4, order: 10 },
  ];

  for (const expected of expectedTechniques) {
    it(`includes "${expected.name}" with correct id, sl, and order`, () => {
      const technique = SWORD_DANCING_TECHNIQUES.find(t => t.id === expected.id);
      expect(technique).toBeDefined();
      expect(technique!.name).toBe(expected.name);
      expect(technique!.sl).toBe(expected.sl);
      expect(technique!.order).toBe(expected.order);
    });
  }
});

// ─── XP Cost Calculation ────────────────────────────────────────
// Validates: Requirements 8.2

describe('getTechniqueXpCost — escalating costs', () => {
  it('returns 0 for knownCount 0 (first technique is free)', () => {
    expect(getTechniqueXpCost(0)).toBe(0);
  });

  it.each([
    [1, 100],
    [2, 200],
    [3, 300],
    [4, 400],
    [5, 500],
    [6, 600],
    [7, 700],
    [8, 800],
    [9, 900],
  ])('returns %i XP for knownCount %i', (knownCount, expectedCost) => {
    expect(getTechniqueXpCost(knownCount)).toBe(expectedCost);
  });
});

// ─── learnTechnique ─────────────────────────────────────────────
// Validates: Requirements 8.3

describe('learnTechnique — deducts XP, updates learnedTechniques, creates log entry', () => {
  it('deducts XP from xpCur and adds to xpSpent', () => {
    const char = makeCharacter({
      xpCur: 500,
      xpSpent: 100,
      careerLevel: 'Swordmaster',
      talents: [{ n: 'Sword-dancing', lvl: 1, desc: '' }],
      learnedTechniques: ['ritual-of-cleansing'],
      advancementLog: [],
    });

    const result = learnTechnique(char, 'flight-of-the-phoenix');
    // knownCount = 1, cost = 100
    expect(result.xpCur).toBe(400);
    expect(result.xpSpent).toBe(200);
  });

  it('appends the technique id to learnedTechniques', () => {
    const char = makeCharacter({
      xpCur: 500,
      xpSpent: 0,
      careerLevel: 'Swordmaster',
      talents: [{ n: 'Sword-dancing', lvl: 1, desc: '' }],
      learnedTechniques: ['ritual-of-cleansing'],
      advancementLog: [],
    });

    const result = learnTechnique(char, 'path-of-the-sun');
    expect(result.learnedTechniques).toContain('path-of-the-sun');
    expect(result.learnedTechniques).toContain('ritual-of-cleansing');
  });

  it('creates an advancement log entry with type "technique"', () => {
    const char = makeCharacter({
      xpCur: 500,
      xpSpent: 0,
      careerLevel: 'Swordmaster',
      talents: [{ n: 'Sword-dancing', lvl: 1, desc: '' }],
      learnedTechniques: ['ritual-of-cleansing', 'flight-of-the-phoenix'],
      advancementLog: [],
    });

    const result = learnTechnique(char, 'path-of-frost');
    const entry = result.advancementLog[result.advancementLog.length - 1];
    expect(entry.type).toBe('technique');
    expect(entry.name).toBe('Path of Frost');
    expect(entry.xpCost).toBe(200); // knownCount = 2, cost = 200
  });

  it('returns character unchanged for unknown technique id', () => {
    const char = makeCharacter({
      xpCur: 500,
      xpSpent: 0,
      careerLevel: 'Swordmaster',
      talents: [{ n: 'Sword-dancing', lvl: 1, desc: '' }],
      learnedTechniques: [],
      advancementLog: [],
    });

    const result = learnTechnique(char, 'nonexistent-technique');
    expect(result).toEqual(char);
  });
});

// ─── canLearnTechnique — guard conditions ───────────────────────
// Validates: Requirements 8.4, 8.5, 8.6

describe('canLearnTechnique — returns false when character lacks talent', () => {
  it('returns canLearn: false with appropriate error', () => {
    const char = makeCharacter({
      xpCur: 500,
      talents: [],
      learnedTechniques: [],
    });

    const result = canLearnTechnique('ritual-of-cleansing', char);
    expect(result.canLearn).toBe(false);
    expect(result.error).toBe('Requires Sword-dancing talent.');
  });
});

describe('canLearnTechnique — returns false when character has insufficient XP', () => {
  it('returns canLearn: false with appropriate error', () => {
    const char = makeCharacter({
      xpCur: 50, // Not enough — need 100 (knownCount = 1)
      talents: [{ n: 'Sword-dancing', lvl: 1, desc: '' }],
      learnedTechniques: ['ritual-of-cleansing'],
    });

    const result = canLearnTechnique('flight-of-the-phoenix', char);
    expect(result.canLearn).toBe(false);
    expect(result.error).toContain('Insufficient XP');
  });
});

describe('canLearnTechnique — returns false when technique already learned', () => {
  it('returns canLearn: false with appropriate error', () => {
    const char = makeCharacter({
      xpCur: 500,
      talents: [{ n: 'Sword-dancing', lvl: 1, desc: '' }],
      learnedTechniques: ['ritual-of-cleansing'],
    });

    const result = canLearnTechnique('ritual-of-cleansing', char);
    expect(result.canLearn).toBe(false);
    expect(result.error).toBe('This technique is already known.');
  });
});

describe('canLearnTechnique — returns false for unknown technique id', () => {
  it('returns canLearn: false with appropriate error', () => {
    const char = makeCharacter({
      xpCur: 500,
      talents: [{ n: 'Sword-dancing', lvl: 1, desc: '' }],
      learnedTechniques: [],
    });

    const result = canLearnTechnique('nonexistent-technique', char);
    expect(result.canLearn).toBe(false);
    expect(result.error).toBe('Unknown technique.');
  });
});

describe('canLearnTechnique — returns true when all conditions are met', () => {
  it('returns canLearn: true', () => {
    const char = makeCharacter({
      xpCur: 500,
      talents: [{ n: 'Sword-dancing', lvl: 1, desc: '' }],
      learnedTechniques: ['ritual-of-cleansing'],
    });

    const result = canLearnTechnique('flight-of-the-phoenix', char);
    expect(result.canLearn).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

// ─── Backward Compatibility ─────────────────────────────────────
// Validates: Requirements 8.1 (backward compat)

describe('getLearnedTechniques — backward compatibility', () => {
  it('returns [] when learnedTechniques is undefined', () => {
    const char = makeCharacter({});
    // Override to simulate a legacy character without the field
    const legacyChar = { ...char, learnedTechniques: undefined } as unknown as Character;
    expect(getLearnedTechniques(legacyChar)).toEqual([]);
  });

  it('returns the array when learnedTechniques is defined', () => {
    const char = makeCharacter({
      learnedTechniques: ['ritual-of-cleansing', 'path-of-frost'],
    });
    expect(getLearnedTechniques(char)).toEqual(['ritual-of-cleansing', 'path-of-frost']);
  });
});
