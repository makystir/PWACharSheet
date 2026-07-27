import { describe, it, expect } from 'vitest';
import { learnRitual, hasRitualMagicTalent, getCharacterLore } from '../advancement';
import type { Character, CharacteristicKey, CharacteristicValue } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';
import { RITUAL_LIST } from '../../data/rituals';

const ALL_CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

function makeTestCharacter(overrides: Partial<Character> = {}): Character {
  const chars = Object.fromEntries(
    ALL_CHAR_KEYS.map(key => [key, { i: 20, a: 0, b: 0 }])
  ) as Record<CharacteristicKey, CharacteristicValue>;
  return {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Test Wizard',
    species: 'Human / Reiklander',
    class: 'Academics',
    career: 'Wizard',
    careerLevel: 'Wizard',
    careerPath: '',
    status: 'Gold 1',
    chars,
    xpCur: 1000,
    xpSpent: 0,
    xpTotal: 1000,
    talents: [{ n: 'Arcane Magic (Fire)', lvl: 1, desc: '' }, { n: 'Petty Magic', lvl: 1, desc: '' }],
    ...overrides,
  };
}

describe('hasRitualMagicTalent', () => {
  it('returns true when character has Arcane Magic talent', () => {
    const char = makeTestCharacter();
    expect(hasRitualMagicTalent(char)).toBe(true);
  });

  it('returns true when character has Chaos Magic talent', () => {
    const char = makeTestCharacter({ talents: [{ n: 'Chaos Magic (Nurgle)', lvl: 1, desc: '' }] });
    expect(hasRitualMagicTalent(char)).toBe(true);
  });

  it('returns false when character has no qualifying talents', () => {
    const char = makeTestCharacter({ talents: [{ n: 'Petty Magic', lvl: 1, desc: '' }] });
    expect(hasRitualMagicTalent(char)).toBe(false);
  });
});

describe('getCharacterLore', () => {
  it('extracts lore from Arcane Magic talent', () => {
    const char = makeTestCharacter();
    expect(getCharacterLore(char)).toBe('Fire');
  });

  it('extracts lore from Chaos Magic talent', () => {
    const char = makeTestCharacter({ talents: [{ n: 'Chaos Magic (Tzeentch)', lvl: 1, desc: '' }] });
    expect(getCharacterLore(char)).toBe('Tzeentch');
  });

  it('returns null when no lore-granting talent exists', () => {
    const char = makeTestCharacter({ talents: [{ n: 'Petty Magic', lvl: 1, desc: '' }] });
    expect(getCharacterLore(char)).toBeNull();
  });
});

describe('learnRitual', () => {
  const testRitual = RITUAL_LIST.find(r => r.name === 'Imbue Staff')!;

  it('deducts learningXP from character XP and adds ritual to rituals array', () => {
    const char = makeTestCharacter({ xpCur: 500 });
    const result = learnRitual(char, testRitual);

    expect(result.xpCur).toBe(500 - testRitual.learningXP);
    expect(result.xpSpent).toBe(testRitual.learningXP);
    expect(result.rituals).toHaveLength(1);
    expect(result.rituals![0].name).toBe('Imbue Staff');
    expect(result.rituals![0].cn).toBe(35);
  });

  it('creates an advancement log entry with type "ritual"', () => {
    const char = makeTestCharacter({ xpCur: 500 });
    const result = learnRitual(char, testRitual);

    const logEntry = result.advancementLog[result.advancementLog.length - 1];
    expect(logEntry.type).toBe('ritual');
    expect(logEntry.name).toBe('Imbue Staff');
    expect(logEntry.xpCost).toBe(testRitual.learningXP);
    expect(logEntry.from).toBe(0);
    expect(logEntry.to).toBe(1);
  });

  it('returns character unchanged when XP is insufficient', () => {
    const char = makeTestCharacter({ xpCur: 50 });
    const result = learnRitual(char, testRitual);

    expect(result.xpCur).toBe(50);
    expect(result.rituals ?? []).toHaveLength(0);
    expect(result.advancementLog).toHaveLength(0);
  });

  it('appends to existing rituals array', () => {
    const existingRitual = {
      name: 'Create Familiar',
      cn: 45,
      type: 'Any Lore',
      learningXP: 250,
      ingredients: 'A suitable vessel',
      conditions: 'No conditions necessary.',
      description: 'Create a familiar.',
    };
    const char = makeTestCharacter({ xpCur: 500, rituals: [existingRitual] });
    const result = learnRitual(char, testRitual);

    expect(result.rituals).toHaveLength(2);
    expect(result.rituals![0].name).toBe('Create Familiar');
    expect(result.rituals![1].name).toBe('Imbue Staff');
  });

  it('handles character with undefined rituals array', () => {
    const char = makeTestCharacter({ xpCur: 500 });
    delete (char as any).rituals; // Simulate old character without rituals field
    const result = learnRitual(char, testRitual);

    expect(result.rituals).toHaveLength(1);
    expect(result.rituals![0].name).toBe('Imbue Staff');
  });
});
