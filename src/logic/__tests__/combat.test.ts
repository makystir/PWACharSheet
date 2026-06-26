import { describe, it, expect } from 'vitest';
import {
  calculateDamage,
  applyCondition,
  removeCondition,
  processEndOfRoundConditions,
  incrementAdvantage,
  decrementAdvantage,
} from '../combat';
import type { Condition } from '../../types/character';

// ─── Property 7: Condition application and stacking ──────────────────────────
// Validates: Requirements 4.4

describe('applyCondition — Property 7', () => {
  it('adds a new condition when not present', () => {
    const result = applyCondition([], 'Ablaze');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Ablaze');
    expect(result[0].level).toBe(1);
  });

  it('increments stackable condition level', () => {
    const conditions: Condition[] = [{ name: 'Ablaze', level: 1 }];
    const result = applyCondition(conditions, 'Ablaze');
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe(2);
  });

  it('does not exceed maxLevel for stackable condition', () => {
    const conditions: Condition[] = [{ name: 'Ablaze', level: 10 }];
    const result = applyCondition(conditions, 'Ablaze');
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe(10);
  });

  it('non-stackable condition stays at level 1', () => {
    const conditions: Condition[] = [{ name: 'Prone', level: 1 }];
    const result = applyCondition(conditions, 'Prone');
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe(1);
  });

  it('adding different conditions creates separate entries', () => {
    let conditions: Condition[] = [];
    conditions = applyCondition(conditions, 'Ablaze');
    conditions = applyCondition(conditions, 'Bleeding');
    conditions = applyCondition(conditions, 'Blinded');
    expect(conditions).toHaveLength(3);
    expect(conditions.map(c => c.name)).toEqual(['Ablaze', 'Bleeding', 'Blinded']);
  });

  it('all 12 WFRP conditions can be applied', () => {
    const allConditions = [
      'Ablaze', 'Bleeding', 'Blinded', 'Broken', 'Deafened', 'Entangled',
      'Fatigued', 'Poisoned', 'Prone', 'Stunned', 'Surprised', 'Unconscious',
    ];
    let conditions: Condition[] = [];
    for (const name of allConditions) {
      conditions = applyCondition(conditions, name);
    }
    expect(conditions).toHaveLength(12);
    for (const name of allConditions) {
      expect(conditions.find(c => c.name === name)).toBeDefined();
    }
  });

  it('returns unchanged copy for unknown condition', () => {
    const conditions: Condition[] = [{ name: 'Ablaze', level: 1 }];
    const result = applyCondition(conditions, 'Nonexistent');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Ablaze');
  });

  it('does not mutate original array', () => {
    const conditions: Condition[] = [{ name: 'Ablaze', level: 1 }];
    const original = JSON.parse(JSON.stringify(conditions));
    applyCondition(conditions, 'Ablaze');
    expect(conditions).toEqual(original);
  });
});

describe('removeCondition', () => {
  it('decrements stackable condition', () => {
    const conditions: Condition[] = [{ name: 'Ablaze', level: 3 }];
    const result = removeCondition(conditions, 'Ablaze');
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe(2);
  });

  it('removes stackable condition at level 1', () => {
    const conditions: Condition[] = [{ name: 'Ablaze', level: 1 }];
    const result = removeCondition(conditions, 'Ablaze');
    expect(result).toHaveLength(0);
  });

  it('removes non-stackable condition entirely', () => {
    const conditions: Condition[] = [{ name: 'Prone', level: 1 }];
    const result = removeCondition(conditions, 'Prone');
    expect(result).toHaveLength(0);
  });

  it('returns unchanged copy when condition not present', () => {
    const conditions: Condition[] = [{ name: 'Ablaze', level: 1 }];
    const result = removeCondition(conditions, 'Prone');
    expect(result).toHaveLength(1);
  });
});

describe('processEndOfRoundConditions', () => {
  it('removes Surprised condition', () => {
    const conditions: Condition[] = [
      { name: 'Surprised', level: 1 },
      { name: 'Ablaze', level: 2 },
    ];
    const result = processEndOfRoundConditions(conditions);
    expect(result.find(c => c.name === 'Surprised')).toBeUndefined();
    expect(result.find(c => c.name === 'Ablaze')).toBeDefined();
  });

  it('removes Stunned condition', () => {
    const conditions: Condition[] = [
      { name: 'Stunned', level: 1 },
      { name: 'Bleeding', level: 3 },
    ];
    const result = processEndOfRoundConditions(conditions);
    expect(result.find(c => c.name === 'Stunned')).toBeUndefined();
    expect(result.find(c => c.name === 'Bleeding')).toBeDefined();
  });

  it('preserves other conditions', () => {
    const conditions: Condition[] = [
      { name: 'Ablaze', level: 2 },
      { name: 'Bleeding', level: 1 },
      { name: 'Fatigued', level: 3 },
    ];
    const result = processEndOfRoundConditions(conditions);
    expect(result).toHaveLength(3);
  });
});

// ─── Property 8: Advantage bounded increment/decrement ───────────────────────
// Validates: Requirements 4.6

describe('incrementAdvantage / decrementAdvantage — Property 8', () => {
  it('increment from 0 gives 1', () => {
    expect(incrementAdvantage(0)).toBe(1);
  });

  it('increment from 5 gives 6', () => {
    expect(incrementAdvantage(5)).toBe(6);
  });

  it('increment from 9 gives 10', () => {
    expect(incrementAdvantage(9)).toBe(10);
  });

  it('increment from 10 without cap returns 11 (uncapped)', () => {
    expect(incrementAdvantage(10)).toBe(11);
  });

  it('increment from 10 with cap=10 stays at 10', () => {
    expect(incrementAdvantage(10, 10)).toBe(10);
  });

  it('decrement from 10 gives 9', () => {
    expect(decrementAdvantage(10)).toBe(9);
  });

  it('decrement from 5 gives 4', () => {
    expect(decrementAdvantage(5)).toBe(4);
  });

  it('decrement from 1 gives 0', () => {
    expect(decrementAdvantage(1)).toBe(0);
  });

  it('decrement from 0 stays at 0 (floor)', () => {
    expect(decrementAdvantage(0)).toBe(0);
  });

  it('advantage stays in [0, 10] range when cap=10', () => {
    for (let i = 0; i <= 10; i++) {
      const inc = incrementAdvantage(i, 10);
      const dec = decrementAdvantage(i);
      expect(inc).toBeGreaterThanOrEqual(0);
      expect(inc).toBeLessThanOrEqual(10);
      expect(dec).toBeGreaterThanOrEqual(0);
      expect(dec).toBeLessThanOrEqual(10);
    }
  });
});

// ─── incrementAdvantage cap parameter ────────────────────────────────────────
// Validates: Requirements 5.1, 5.2, 5.3

describe('incrementAdvantage with cap parameter', () => {
  it('current=5, cap=10 → 6 (below cap)', () => {
    expect(incrementAdvantage(5, 10)).toBe(6);
  });

  it('current=9, cap=10 → 10 (reaches cap)', () => {
    expect(incrementAdvantage(9, 10)).toBe(10);
  });

  it('current=10, cap=10 → 10 (at cap, stays)', () => {
    expect(incrementAdvantage(10, 10)).toBe(10);
  });

  it('current=10, cap=0 → 11 (uncapped)', () => {
    expect(incrementAdvantage(10, 0)).toBe(11);
  });

  it('current=5, cap=undefined → 6 (backward compatible, uncapped)', () => {
    expect(incrementAdvantage(5)).toBe(6);
  });

  it('current=0, cap=3 → 1', () => {
    expect(incrementAdvantage(0, 3)).toBe(1);
  });

  it('current=2, cap=3 → 3 (reaches cap)', () => {
    expect(incrementAdvantage(2, 3)).toBe(3);
  });

  it('current=3, cap=3 → 3 (at cap, stays)', () => {
    expect(incrementAdvantage(3, 3)).toBe(3);
  });

  it('decrementAdvantage(0) → 0 (floor unchanged)', () => {
    expect(decrementAdvantage(0)).toBe(0);
  });
});

// ─── Property 9: Damage calculation ──────────────────────────────────────────
// Validates: Requirements 4.7

describe('calculateDamage — Property 9 (updated: weaponDamage + SL - AP - TB, min 1)', () => {
  it('basic damage: weaponDamage + SL - (AP + TB)', () => {
    // weaponDmg 7, SL 3, AP 1, TB 2 → 7 + 3 - (1 + 2) = 7
    expect(calculateDamage(7, 3, 1, 2)).toBe(7);
  });

  it('SL contributes to damage', () => {
    // weaponDmg 5, SL 4, AP 2, TB 3 → 5 + 4 - (2 + 3) = 4
    expect(calculateDamage(5, 4, 2, 3)).toBe(4);
  });

  it('negative SL reduces damage', () => {
    // weaponDmg 5, SL -2, AP 0, TB 0 → 5 + (-2) - 0 = 3
    expect(calculateDamage(5, -2, 0, 0)).toBe(3);
  });

  it('minimum damage is 1 when AP + TB exceeds attack', () => {
    // weaponDmg 2, SL 2, AP 5, TB 3 → 2 + 2 - 8 = -4 → min 1
    expect(calculateDamage(2, 2, 5, 3)).toBe(1);
  });

  it('zero AP and TB: full damage', () => {
    // weaponDmg 7, SL 4, AP 0, TB 0 → 7 + 4 = 11
    expect(calculateDamage(7, 4, 0, 0)).toBe(11);
  });

  it('high AP still results in minimum 1', () => {
    // weaponDmg 5, SL 3, AP 10, TB 3 → 5 + 3 - 13 = -5 → min 1
    expect(calculateDamage(5, 3, 10, 3)).toBe(1);
  });

  it('zero SL: only weaponDamage vs defenses', () => {
    // weaponDmg 3, SL 0, AP 1, TB 1 → 3 + 0 - 2 = 1
    expect(calculateDamage(3, 0, 1, 1)).toBe(1);
  });

  it('all zeros still returns minimum 1', () => {
    // weaponDmg 0, SL 0, AP 0, TB 0 → 0 → min 1
    expect(calculateDamage(0, 0, 0, 0)).toBe(1);
  });
});
