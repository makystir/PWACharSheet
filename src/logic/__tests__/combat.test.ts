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
    const conditions: Condition[] = [{ name: 'Blinded', level: 1 }];
    const result = applyCondition(conditions, 'Blinded');
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
    const conditions: Condition[] = [{ name: 'Blinded', level: 1 }];
    const result = removeCondition(conditions, 'Blinded');
    expect(result).toHaveLength(0);
  });

  it('returns unchanged copy when condition not present', () => {
    const conditions: Condition[] = [{ name: 'Ablaze', level: 1 }];
    const result = removeCondition(conditions, 'Blinded');
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

describe('calculateDamage — Property 9', () => {
  it('melee: weaponBonus + SB - (AP + TB)', () => {
    // weapon +4, SB 3, AP 1, TB 2 → 4 + 3 - (1 + 2) = 4
    expect(calculateDamage(4, 3, 1, 2, false)).toBe(4);
  });

  it('ranged: floor(SB/2) + weaponBonus - (AP + TB)', () => {
    // weapon +4, SB 5, AP 1, TB 2 → floor(5/2) + 4 - (1 + 2) = 2 + 4 - 3 = 3
    expect(calculateDamage(4, 5, 1, 2, true)).toBe(3);
  });

  it('ranged with odd SB floors correctly', () => {
    // SB 3 → floor(3/2) = 1, weapon +2, AP 0, TB 1 → 1 + 2 - 1 = 2
    expect(calculateDamage(2, 3, 0, 1, true)).toBe(2);
  });

  it('damage floors at 0 when AP + TB exceeds attack', () => {
    // weapon +2, SB 2, AP 5, TB 3 → 2 + 2 - 8 = -4 → 0
    expect(calculateDamage(2, 2, 5, 3, false)).toBe(0);
  });

  it('zero AP and TB: full damage', () => {
    // weapon +3, SB 4, AP 0, TB 0 → 3 + 4 = 7
    expect(calculateDamage(3, 4, 0, 0, false)).toBe(7);
  });

  it('high AP absorbs all damage', () => {
    // weapon +5, SB 3, AP 10, TB 3 → 5 + 3 - 13 = -5 → 0
    expect(calculateDamage(5, 3, 10, 3, false)).toBe(0);
  });

  it('melee with zero SB', () => {
    // weapon +3, SB 0, AP 1, TB 1 → 0 + 3 - 2 = 1
    expect(calculateDamage(3, 0, 1, 1, false)).toBe(1);
  });

  it('ranged with zero SB', () => {
    // weapon +3, SB 0, AP 0, TB 0 → 0 + 3 - 0 = 3
    expect(calculateDamage(3, 0, 0, 0, true)).toBe(3);
  });

  it('all zeros returns 0', () => {
    expect(calculateDamage(0, 0, 0, 0, false)).toBe(0);
    expect(calculateDamage(0, 0, 0, 0, true)).toBe(0);
  });
});
