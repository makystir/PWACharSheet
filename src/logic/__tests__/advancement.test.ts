import { describe, it, expect } from 'vitest';
import {
  getAdvancementCost,
  calculateBulkAdvancement,
  advanceCharacteristic,
  advanceSkill,
  isCareerLevelComplete,
} from '../advancement';
import type { Character, CharacteristicKey, CharacteristicValue } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';

const ALL_CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

function makeTestCharacter(overrides: Partial<Character> = {}): Character {
  const chars: Record<CharacteristicKey, CharacteristicValue> = {} as any;
  for (const key of ALL_CHAR_KEYS) {
    chars[key] = { i: 20, a: 0, b: 0 };
  }
  return {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Test',
    species: 'Human / Reiklander',
    class: 'Warriors',
    career: 'Soldier',
    careerLevel: 'Recruit',
    careerPath: '',
    status: 'Silver 1',
    chars,
    xpCur: 1000,
    xpSpent: 0,
    xpTotal: 1000,
    bSkills: [
      { n: 'Athletics', c: 'Ag', a: 0 },
      { n: 'Cool', c: 'WP', a: 5 },
      { n: 'Dodge', c: 'Ag', a: 10 },
    ],
    aSkills: [
      { n: 'Language (Battle)', c: 'Int', a: 0 },
    ],
    ...overrides,
  };
}

// ─── Property 13: XP cost doubles for out-of-career ──────────────────────────
// Validates: Requirements 6.3

describe('getAdvancementCost — Property 13', () => {
  it('characteristic advances 0-5: in-career costs 25, out-of-career costs 50', () => {
    expect(getAdvancementCost('characteristic', 0, true)).toBe(25);
    expect(getAdvancementCost('characteristic', 0, false)).toBe(50);
    expect(getAdvancementCost('characteristic', 5, true)).toBe(25);
    expect(getAdvancementCost('characteristic', 5, false)).toBe(50);
  });

  it('skill advances 0-5: in-career costs 10, out-of-career costs 20', () => {
    expect(getAdvancementCost('skill', 0, true)).toBe(10);
    expect(getAdvancementCost('skill', 0, false)).toBe(20);
    expect(getAdvancementCost('skill', 5, true)).toBe(10);
    expect(getAdvancementCost('skill', 5, false)).toBe(20);
  });

  it('skill advances 6-10: in-career costs 15, out-of-career costs 30', () => {
    expect(getAdvancementCost('skill', 6, true)).toBe(15);
    expect(getAdvancementCost('skill', 6, false)).toBe(30);
    expect(getAdvancementCost('skill', 10, true)).toBe(15);
    expect(getAdvancementCost('skill', 10, false)).toBe(30);
  });

  it('characteristic advances 10: in-career costs 30 (still in 6-10 tier)', () => {
    expect(getAdvancementCost('characteristic', 10, true)).toBe(30);
    expect(getAdvancementCost('characteristic', 10, false)).toBe(60);
  });

  it('characteristic advances 11-15: in-career costs 40', () => {
    expect(getAdvancementCost('characteristic', 11, true)).toBe(40);
    expect(getAdvancementCost('characteristic', 15, true)).toBe(40);
    expect(getAdvancementCost('characteristic', 15, false)).toBe(80);
  });

  it('characteristic advances 16-20: in-career costs 50', () => {
    expect(getAdvancementCost('characteristic', 16, true)).toBe(50);
    expect(getAdvancementCost('characteristic', 20, true)).toBe(50);
    expect(getAdvancementCost('characteristic', 20, false)).toBe(100);
  });

  it('characteristic advances 21-25: in-career costs 70', () => {
    expect(getAdvancementCost('characteristic', 21, true)).toBe(70);
    expect(getAdvancementCost('characteristic', 25, true)).toBe(70);
    expect(getAdvancementCost('characteristic', 25, false)).toBe(140);
  });

  it('characteristic advances 26-30: in-career costs 90', () => {
    expect(getAdvancementCost('characteristic', 26, true)).toBe(90);
    expect(getAdvancementCost('characteristic', 30, true)).toBe(90);
    expect(getAdvancementCost('characteristic', 30, false)).toBe(180);
  });

  it('characteristic advances 31-35: in-career costs 120', () => {
    expect(getAdvancementCost('characteristic', 31, true)).toBe(120);
    expect(getAdvancementCost('characteristic', 35, true)).toBe(120);
    expect(getAdvancementCost('characteristic', 35, false)).toBe(240);
  });

  it('characteristic advances 36-40: in-career costs 150', () => {
    expect(getAdvancementCost('characteristic', 36, true)).toBe(150);
    expect(getAdvancementCost('characteristic', 40, true)).toBe(150);
    expect(getAdvancementCost('characteristic', 40, false)).toBe(300);
  });

  it('characteristic advances 41-45: in-career costs 190', () => {
    expect(getAdvancementCost('characteristic', 41, true)).toBe(190);
    expect(getAdvancementCost('characteristic', 45, true)).toBe(190);
    expect(getAdvancementCost('characteristic', 45, false)).toBe(380);
  });

  it('characteristic advances 46-50: in-career costs 230', () => {
    expect(getAdvancementCost('characteristic', 46, true)).toBe(230);
    expect(getAdvancementCost('characteristic', 50, true)).toBe(230);
    expect(getAdvancementCost('characteristic', 50, false)).toBe(460);
  });

  it('characteristic advances 51-55: in-career costs 280', () => {
    expect(getAdvancementCost('characteristic', 51, true)).toBe(280);
    expect(getAdvancementCost('characteristic', 55, true)).toBe(280);
  });

  it('characteristic advances 70+: in-career costs 520', () => {
    expect(getAdvancementCost('characteristic', 71, true)).toBe(520);
    expect(getAdvancementCost('characteristic', 100, true)).toBe(520);
  });

  it('skill advances 70+: in-career costs 440', () => {
    expect(getAdvancementCost('skill', 71, true)).toBe(440);
    expect(getAdvancementCost('skill', 100, true)).toBe(440);
  });

  it('talent cost: 100 × (level + 1) in-career, doubled out', () => {
    expect(getAdvancementCost('talent', 0, true)).toBe(100);
    expect(getAdvancementCost('talent', 0, false)).toBe(200);
    expect(getAdvancementCost('talent', 1, true)).toBe(200);
    expect(getAdvancementCost('talent', 1, false)).toBe(400);
    expect(getAdvancementCost('talent', 2, true)).toBe(300);
    expect(getAdvancementCost('talent', 2, false)).toBe(600);
  });

  it('out-of-career is always exactly 2x in-career for any advance count', () => {
    for (const advances of [0, 3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60]) {
      const inCareer = getAdvancementCost('characteristic', advances, true);
      const outCareer = getAdvancementCost('characteristic', advances, false);
      expect(outCareer).toBe(inCareer * 2);
    }
  });
});

// ─── Property 14: Bulk advancement respects XP budget ────────────────────────
// Validates: Requirements 6.6

describe('calculateBulkAdvancement — Property 14', () => {
  it('buys as many advances as budget allows', () => {
    // Starting at 0 advances, characteristic costs 25 XP each for first 5, budget 100 → 4 advances
    const result = calculateBulkAdvancement('characteristic', 0, 100, true, 10);
    expect(result.count).toBe(4);
    expect(result.totalCost).toBe(100);
  });

  it('totalCost never exceeds availableXP', () => {
    const result = calculateBulkAdvancement('characteristic', 0, 60, true, 10);
    expect(result.totalCost).toBeLessThanOrEqual(60);
    expect(result.count).toBe(2); // 25 + 25 = 50, next would be 25 → 75 > 60
  });

  it('respects maxBulk limit', () => {
    const result = calculateBulkAdvancement('characteristic', 0, 10000, true, 3);
    expect(result.count).toBe(3);
  });

  it('handles crossing cost tiers', () => {
    // Start at 4 advances: cost 25 for advance 5, then 30 for advances 5-9
    const result = calculateBulkAdvancement('characteristic', 4, 55, true, 10);
    // advance 4→5: 25, advance 5→6: 25 (still in <=5 tier) = 50
    expect(result.count).toBe(2);
    expect(result.totalCost).toBe(50);
  });

  it('returns 0 count when budget is insufficient', () => {
    const result = calculateBulkAdvancement('characteristic', 0, 10, true, 10);
    expect(result.count).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  it('out-of-career doubles costs in bulk', () => {
    // Out-of-career at 0 advances: 50 each, budget 100 → 2 advances
    const result = calculateBulkAdvancement('characteristic', 0, 100, false, 10);
    expect(result.count).toBe(2);
    expect(result.totalCost).toBe(100);
  });
});

// ─── Property 15: Advancement log grows on advancement ───────────────────────
// Validates: Requirements 6.7

describe('advanceCharacteristic — Property 15', () => {
  it('appends exactly one log entry on characteristic advance', () => {
    const char = makeTestCharacter();
    const result = advanceCharacteristic(char, 'WS', true);
    expect(result.advancementLog).toHaveLength(1);
    expect(result.advancementLog[0].type).toBe('characteristic');
    expect(result.advancementLog[0].name).toBe('WS');
    expect(result.advancementLog[0].from).toBe(0);
    expect(result.advancementLog[0].to).toBe(1);
    expect(result.advancementLog[0].xpCost).toBe(25);
    expect(result.advancementLog[0].inCareer).toBe(true);
  });

  it('deducts XP correctly', () => {
    const char = makeTestCharacter({ xpCur: 100 });
    const result = advanceCharacteristic(char, 'WS', true);
    expect(result.xpCur).toBe(75);
    expect(result.xpSpent).toBe(25);
  });

  it('increments characteristic advance by 1', () => {
    const char = makeTestCharacter();
    const result = advanceCharacteristic(char, 'WS', true);
    expect(result.chars.WS.a).toBe(1);
  });

  it('does not advance if insufficient XP', () => {
    const char = makeTestCharacter({ xpCur: 10 });
    const result = advanceCharacteristic(char, 'WS', true);
    expect(result.chars.WS.a).toBe(0);
    expect(result.xpCur).toBe(10);
    expect(result.advancementLog).toHaveLength(0);
  });

  it('does not mutate original character', () => {
    const char = makeTestCharacter();
    const original = JSON.parse(JSON.stringify(char));
    advanceCharacteristic(char, 'WS', true);
    expect(char).toEqual(original);
  });

  it('log entry records out-of-career flag', () => {
    const char = makeTestCharacter();
    const result = advanceCharacteristic(char, 'WS', false);
    expect(result.advancementLog[0].inCareer).toBe(false);
    expect(result.advancementLog[0].xpCost).toBe(50);
  });
});

describe('advanceSkill — Property 15', () => {
  it('appends exactly one log entry on basic skill advance', () => {
    const char = makeTestCharacter();
    const result = advanceSkill(char, 0, true, true); // Athletics, basic
    expect(result.advancementLog).toHaveLength(1);
    expect(result.advancementLog[0].type).toBe('skill');
    expect(result.advancementLog[0].name).toBe('Athletics');
    expect(result.advancementLog[0].from).toBe(0);
    expect(result.advancementLog[0].to).toBe(1);
  });

  it('appends log entry on advanced skill advance', () => {
    const char = makeTestCharacter();
    const result = advanceSkill(char, 0, false, true); // Language (Battle), advanced
    expect(result.advancementLog).toHaveLength(1);
    expect(result.advancementLog[0].name).toBe('Language (Battle)');
  });

  it('does not advance for invalid skill index', () => {
    const char = makeTestCharacter();
    const result = advanceSkill(char, 99, true, true);
    expect(result.advancementLog).toHaveLength(0);
  });

  it('deducts correct XP for skill with existing advances', () => {
    const char = makeTestCharacter();
    // Cool has 5 advances → next advance costs 10 (skill tier: <=5 = 10 XP)
    const result = advanceSkill(char, 1, true, true);
    expect(result.advancementLog[0].xpCost).toBe(10);
    expect(result.xpCur).toBe(990);
  });
});

// ─── Property 16: Career completion status check ─────────────────────────────
// Validates: Requirements 6.8

describe('isCareerLevelComplete — Property 16', () => {
  it('returns false when no advances have been made', () => {
    const char = makeTestCharacter();
    expect(isCareerLevelComplete(char, 'Soldier', 1)).toBe(false);
  });

  it('returns true when all characteristics and skills meet threshold', () => {
    const char = makeTestCharacter();
    // Soldier level 1: characteristics WS, T, WP; skills: Athletics, Climb, Cool, Dodge, Endurance, Language (Battle), Melee (Basic), Play (Drum or Fife)
    char.chars.WS.a = 1;
    char.chars.T.a = 1;
    char.chars.WP.a = 1;
    char.bSkills = [
      { n: 'Athletics', c: 'Ag', a: 1 },
      { n: 'Climb', c: 'S', a: 1 },
      { n: 'Cool', c: 'WP', a: 1 },
      { n: 'Dodge', c: 'Ag', a: 1 },
      { n: 'Endurance', c: 'T', a: 1 },
      { n: 'Melee (Basic)', c: 'WS', a: 1 },
    ];
    char.aSkills = [
      { n: 'Language (Battle)', c: 'Int', a: 1 },
      { n: 'Play (Drum or Fife)', c: 'Dex', a: 1 },
    ];
    expect(isCareerLevelComplete(char, 'Soldier', 1)).toBe(true);
  });

  it('returns false when characteristics are met but skills are not', () => {
    const char = makeTestCharacter();
    char.chars.WS.a = 5;
    char.chars.T.a = 5;
    char.chars.WP.a = 5;
    // No skills advanced
    expect(isCareerLevelComplete(char, 'Soldier', 1)).toBe(false);
  });

  it('returns false for unknown career', () => {
    const char = makeTestCharacter();
    expect(isCareerLevelComplete(char, 'Unknown', 1)).toBe(false);
  });

  it('returns false for invalid level', () => {
    const char = makeTestCharacter();
    expect(isCareerLevelComplete(char, 'Soldier', 5)).toBe(false);
  });

  it('supports custom threshold for required skill count', () => {
    const char = makeTestCharacter();
    char.chars.WS.a = 1;
    char.chars.T.a = 1;
    char.chars.WP.a = 1;
    char.bSkills = [
      { n: 'Athletics', c: 'Ag', a: 1 },
      { n: 'Cool', c: 'WP', a: 1 },
    ];
    // Only 2 skills meet threshold, but require only 2
    expect(isCareerLevelComplete(char, 'Soldier', 1, 1, 1, 2)).toBe(true);
  });
});
