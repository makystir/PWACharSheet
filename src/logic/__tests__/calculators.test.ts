import { describe, it, expect } from 'vitest';
import {
  getBonus,
  calculateTotalWounds,
  calculateArmourPoints,
  calculateMaxEncumbrance,
  calculateCoinWeight,
  computeWoundMaximum,
  computeAPByLocation,
} from '../calculators';
import type { CharacteristicKey, CharacteristicValue, ArmourItem } from '../../types/character';

// Helper: build a chars record from a simple map of totals (i values, a=0, b=0)
function makeChars(
  overrides: Partial<Record<CharacteristicKey, { i: number; a: number }>> = {}
): Record<CharacteristicKey, CharacteristicValue> {
  const defaults: Record<CharacteristicKey, CharacteristicValue> = {
    WS: { i: 20, a: 0, b: 0 },
    BS: { i: 20, a: 0, b: 0 },
    S:  { i: 20, a: 0, b: 0 },
    T:  { i: 20, a: 0, b: 0 },
    I:  { i: 20, a: 0, b: 0 },
    Ag: { i: 20, a: 0, b: 0 },
    Dex:{ i: 20, a: 0, b: 0 },
    Int:{ i: 20, a: 0, b: 0 },
    WP: { i: 20, a: 0, b: 0 },
    Fel:{ i: 20, a: 0, b: 0 },
  };
  for (const [key, val] of Object.entries(overrides)) {
    defaults[key as CharacteristicKey] = { i: val.i, a: val.a, b: 0 };
  }
  return defaults;
}

// ─── getBonus ────────────────────────────────────────────────────────────────

describe('getBonus', () => {
  it('returns 0 for values 0-9', () => {
    expect(getBonus(0)).toBe(0);
    expect(getBonus(9)).toBe(0);
  });

  it('returns 1 for values 10-19', () => {
    expect(getBonus(10)).toBe(1);
    expect(getBonus(19)).toBe(1);
  });

  it('returns correct bonus for typical characteristic values', () => {
    expect(getBonus(20)).toBe(2);
    expect(getBonus(35)).toBe(3);
    expect(getBonus(40)).toBe(4);
    expect(getBonus(55)).toBe(5);
    expect(getBonus(99)).toBe(9);
  });
});

// ─── Property 5: Total wounds calculation ────────────────────────────────────
// Validates: Requirements 3.8
// Formula: (woundsUseSB ? SB : 0) + 2×TB + WPB + Hardy×TB

describe('calculateTotalWounds', () => {
  it('woundsUseSB=false (Halfling/Small): 0 + 2×TB + WPB', () => {
    // All 20 → SB=2, TB=2, WPB=2. SB excluded.
    // Expected: 0 + 2×2 + 2 = 6
    const chars = makeChars();
    expect(calculateTotalWounds(chars, false, 0)).toBe(6);
  });

  it('woundsUseSB=true (Human/Dwarf/Elf): SB + 2×TB + WPB', () => {
    // All 20 → SB=2, TB=2, WPB=2. SB included.
    // Expected: 2 + 2×2 + 2 = 8
    const chars = makeChars();
    expect(calculateTotalWounds(chars, true, 0)).toBe(8);
  });

  it('Dwarf stats (woundsUseSB=true, no Hardy): SB + 2×TB + WPB', () => {
    // S=20, T=30, WP=40 → SB=2, TB=3, WPB=4
    // Expected: 2 + 2×3 + 4 = 12
    const chars = makeChars({ S: { i: 20, a: 0 }, T: { i: 30, a: 0 }, WP: { i: 40, a: 0 } });
    expect(calculateTotalWounds(chars, true, 0)).toBe(12);
  });

  it('Halfling stats (woundsUseSB=false, no Hardy): 0 + 2×TB + WPB', () => {
    // S=10, T=20, WP=30 → SB=1, TB=2, WPB=3. SB excluded.
    // Expected: 0 + 2×2 + 3 = 7
    const chars = makeChars({ S: { i: 10, a: 0 }, T: { i: 20, a: 0 }, WP: { i: 30, a: 0 } });
    expect(calculateTotalWounds(chars, false, 0)).toBe(7);
  });

  it('High Elf stats (woundsUseSB=true, no Hardy): SB + 2×TB + WPB', () => {
    // S=20, T=20, WP=30 → SB=2, TB=2, WPB=3
    // Expected: 2 + 2×2 + 3 = 9
    const chars = makeChars({ S: { i: 20, a: 0 }, T: { i: 20, a: 0 }, WP: { i: 30, a: 0 } });
    expect(calculateTotalWounds(chars, true, 0)).toBe(9);
  });

  it('with Hardy level 1 adds 1×TB (woundsUseSB=false)', () => {
    // All 20 → TB=2, WPB=2. SB excluded.
    // Expected: 0 + 2×2 + 2 + 1×2 = 8
    const chars = makeChars();
    expect(calculateTotalWounds(chars, false, 1)).toBe(8);
  });

  it('with Hardy level 2 adds 2×TB (woundsUseSB=false)', () => {
    // All 20 → TB=2, WPB=2. SB excluded.
    // Expected: 0 + 2×2 + 2 + 2×2 = 10
    const chars = makeChars();
    expect(calculateTotalWounds(chars, false, 2)).toBe(10);
  });

  it('Dwarf with Hardy level 1 (woundsUseSB=true)', () => {
    // Dwarf: S=20, T=30, WP=40 → SB=2, TB=3, WPB=4
    // Expected: 2 + 2×3 + 4 + 1×3 (Hardy) = 15
    const chars = makeChars({ S: { i: 20, a: 0 }, T: { i: 30, a: 0 }, WP: { i: 40, a: 0 } });
    expect(calculateTotalWounds(chars, true, 1)).toBe(15);
  });

  it('with advances applied to characteristics (woundsUseSB=false)', () => {
    // S: i=20, a=15 → total 35, SB=3
    // T: i=20, a=10 → total 30, TB=3
    // WP: i=20, a=5 → total 25, WPB=2
    // woundsUseSB=false: 0 + 2×3 + 2 = 8
    const chars = makeChars({ S: { i: 20, a: 15 }, T: { i: 20, a: 10 }, WP: { i: 20, a: 5 } });
    expect(calculateTotalWounds(chars, false, 0)).toBe(8);
  });

  it('with advances applied to characteristics (woundsUseSB=true)', () => {
    // Same stats, woundsUseSB=true: 3 + 2×3 + 2 = 11
    const chars = makeChars({ S: { i: 20, a: 15 }, T: { i: 20, a: 10 }, WP: { i: 20, a: 5 } });
    expect(calculateTotalWounds(chars, true, 0)).toBe(11);
  });

  it('zero initial values produce non-negative result', () => {
    const chars = makeChars({ S: { i: 0, a: 0 }, T: { i: 0, a: 0 }, WP: { i: 0, a: 0 } });
    expect(calculateTotalWounds(chars, false, 0)).toBe(0);
    expect(calculateTotalWounds(chars, true, 0)).toBe(0);
  });

  it('boundary: single-digit characteristics', () => {
    // S=5, T=9, WP=1 → SB=0, TB=0, WPB=0
    // Expected: 0 + 0 + 0 = 0
    const chars = makeChars({ S: { i: 5, a: 0 }, T: { i: 9, a: 0 }, WP: { i: 1, a: 0 } });
    expect(calculateTotalWounds(chars, false, 0)).toBe(0);
  });
});

// ─── Property 6: Armour points per location ──────────────────────────────────
// Validates: Requirements 4.3

describe('calculateArmourPoints', () => {
  it('returns all zeros for empty armour list', () => {
    const result = calculateArmourPoints([]);
    expect(result).toEqual({ head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 });
  });

  it('single armour covering body only', () => {
    const armour: ArmourItem[] = [
      { name: 'Leather Jerkin', locations: 'Body', enc: '1', ap: 1, qualities: '—' },
    ];
    const result = calculateArmourPoints(armour);
    expect(result.body).toBe(1);
    expect(result.head).toBe(0);
    expect(result.lArm).toBe(0);
    expect(result.rArm).toBe(0);
    expect(result.lLeg).toBe(0);
    expect(result.rLeg).toBe(0);
  });

  it('single armour covering Arms expands to lArm and rArm', () => {
    const armour: ArmourItem[] = [
      { name: 'Plate Bracers', locations: 'Arms', enc: '3', ap: 2, qualities: 'Impenetrable, Weakpoints' },
    ];
    const result = calculateArmourPoints(armour);
    expect(result.lArm).toBe(2);
    expect(result.rArm).toBe(2);
    expect(result.body).toBe(0);
  });

  it('single armour covering Legs expands to lLeg and rLeg', () => {
    const armour: ArmourItem[] = [
      { name: 'Leather Leggings', locations: 'Legs', enc: '1', ap: 1, qualities: '—' },
    ];
    const result = calculateArmourPoints(armour);
    expect(result.lLeg).toBe(1);
    expect(result.rLeg).toBe(1);
    expect(result.head).toBe(0);
  });

  it('armour covering "Arms, Body" covers lArm, rArm, and body', () => {
    const armour: ArmourItem[] = [
      { name: 'Leather Jack', locations: 'Arms, Body', enc: '1', ap: 1, qualities: '—' },
    ];
    const result = calculateArmourPoints(armour);
    expect(result.lArm).toBe(1);
    expect(result.rArm).toBe(1);
    expect(result.body).toBe(1);
    expect(result.head).toBe(0);
    expect(result.lLeg).toBe(0);
  });

  it('overlapping non-flexible armour: takes highest AP', () => {
    const armour: ArmourItem[] = [
      { name: 'Leather Jerkin', locations: 'Body', enc: '1', ap: 1, qualities: '—' },
      { name: 'Plate Breastplate', locations: 'Body', enc: '3', ap: 2, qualities: 'Impenetrable, Weakpoints' },
    ];
    const result = calculateArmourPoints(armour);
    // Both non-flexible, highest is 2
    expect(result.body).toBe(2);
  });

  it('flexible + non-flexible armour stacks: highest of each', () => {
    const armour: ArmourItem[] = [
      { name: 'Leather Jerkin', locations: 'Body', enc: '1', ap: 1, qualities: '—' },
      { name: 'Mail Shirt', locations: 'Body', enc: '2', ap: 2, qualities: 'Flexible' },
    ];
    const result = calculateArmourPoints(armour);
    // Non-flexible highest: 1, Flexible highest: 2 → total: 3
    expect(result.body).toBe(3);
  });

  it('multiple flexible armour on same location: takes highest flexible', () => {
    const armour: ArmourItem[] = [
      { name: 'Mail Shirt', locations: 'Body', enc: '2', ap: 2, qualities: 'Flexible' },
      { name: 'Light Mail', locations: 'Body', enc: '1', ap: 1, qualities: 'Flexible' },
    ];
    const result = calculateArmourPoints(armour);
    // No non-flexible, highest flexible: 2
    expect(result.body).toBe(2);
  });

  it('complex overlapping: mail coat (Arms, Body) + plate breastplate (Body)', () => {
    const armour: ArmourItem[] = [
      { name: 'Mail Coat', locations: 'Arms, Body', enc: '3', ap: 2, qualities: 'Flexible' },
      { name: 'Plate Breastplate', locations: 'Body', enc: '3', ap: 2, qualities: 'Impenetrable, Weakpoints' },
    ];
    const result = calculateArmourPoints(armour);
    // Body: non-flex 2 + flex 2 = 4
    expect(result.body).toBe(4);
    // Arms: only flexible 2
    expect(result.lArm).toBe(2);
    expect(result.rArm).toBe(2);
    expect(result.head).toBe(0);
  });

  it('full armour set across all locations', () => {
    const armour: ArmourItem[] = [
      { name: 'Helm', locations: 'Head', enc: '2', ap: 2, qualities: 'Impenetrable, Weakpoints' },
      { name: 'Leather Jack', locations: 'Arms, Body', enc: '1', ap: 1, qualities: '—' },
      { name: 'Mail Chausses', locations: 'Legs', enc: '3', ap: 2, qualities: 'Flexible' },
    ];
    const result = calculateArmourPoints(armour);
    expect(result.head).toBe(2);
    expect(result.lArm).toBe(1);
    expect(result.rArm).toBe(1);
    expect(result.body).toBe(1);
    expect(result.lLeg).toBe(2);
    expect(result.rLeg).toBe(2);
  });

  it('all AP values are non-negative integers', () => {
    const armour: ArmourItem[] = [
      { name: 'Mail Coat', locations: 'Arms, Body', enc: '3', ap: 2, qualities: 'Flexible' },
      { name: 'Helm', locations: 'Head', enc: '2', ap: 2, qualities: 'Impenetrable, Weakpoints' },
    ];
    const result = calculateArmourPoints(armour);
    for (const key of ['head', 'lArm', 'rArm', 'body', 'lLeg', 'rLeg', 'shield'] as const) {
      expect(result[key]).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(result[key])).toBe(true);
    }
  });
});

// ─── Property 5: Rune AP bonus with stacking rules ──────────────────────────
// Validates: Requirements 5.1, 5.2

describe('calculateArmourPoints — rune AP integration', () => {
  it('single armour with Rune of Stone (+1 AP) adds rune bonus to base AP', () => {
    const armour: ArmourItem[] = [
      { name: 'Leather Jerkin', locations: 'Body', enc: '1', ap: 1, qualities: '—', runes: ['rune-of-stone'] },
    ];
    const result = calculateArmourPoints(armour);
    // base 1 + rune 1 = 2
    expect(result.body).toBe(2);
    expect(result.head).toBe(0);
  });

  it('armour with Master Rune of Steel (+3 AP) on multiple locations', () => {
    const armour: ArmourItem[] = [
      { name: 'Runed Mail Coat', locations: 'Arms, Body', enc: '3', ap: 2, qualities: 'Flexible', runes: ['master-rune-of-steel'] },
    ];
    const result = calculateArmourPoints(armour);
    // base 2 + rune 3 = 5 per covered location
    expect(result.body).toBe(5);
    expect(result.lArm).toBe(5);
    expect(result.rArm).toBe(5);
    expect(result.head).toBe(0);
  });

  it('two armour pieces on same location with rune bonuses — stacking rules apply to augmented values', () => {
    const armour: ArmourItem[] = [
      // Non-flexible: base 1 + Rune of Stone (+1) = effective 2
      { name: 'Leather Jerkin', locations: 'Body', enc: '1', ap: 1, qualities: '—', runes: ['rune-of-stone'] },
      // Flexible: base 2 + Rune of Iron (+1) = effective 3
      { name: 'Mail Shirt', locations: 'Body', enc: '2', ap: 2, qualities: 'Flexible', runes: ['rune-of-iron'] },
    ];
    const result = calculateArmourPoints(armour);
    // Stacking: highest non-flexible (2) + highest flexible (3) = 5
    expect(result.body).toBe(5);
  });

  it('two non-flexible armour on same location — highest augmented value wins', () => {
    const armour: ArmourItem[] = [
      // base 1 + Master Rune of Gromril (+2) = effective 3
      { name: 'Leather Jerkin', locations: 'Body', enc: '1', ap: 1, qualities: '—', runes: ['master-rune-of-gromril'] },
      // base 2, no runes = effective 2
      { name: 'Plate Breastplate', locations: 'Body', enc: '3', ap: 2, qualities: 'Impenetrable, Weakpoints' },
    ];
    const result = calculateArmourPoints(armour);
    // Both non-flexible, highest augmented is 3
    expect(result.body).toBe(3);
  });

  it('backward compatibility: armour without runes field works as before', () => {
    const armour: ArmourItem[] = [
      { name: 'Leather Jerkin', locations: 'Body', enc: '1', ap: 1, qualities: '—' },
      { name: 'Mail Shirt', locations: 'Body', enc: '2', ap: 2, qualities: 'Flexible' },
    ];
    const result = calculateArmourPoints(armour);
    // Non-flexible 1 + Flexible 2 = 3 (same as before rune feature)
    expect(result.body).toBe(3);
  });

  it('backward compatibility: armour with empty runes array works as before', () => {
    const armour: ArmourItem[] = [
      { name: 'Helm', locations: 'Head', enc: '2', ap: 2, qualities: 'Impenetrable, Weakpoints', runes: [] },
    ];
    const result = calculateArmourPoints(armour);
    expect(result.head).toBe(2);
  });

  it('multiple runes on single armour piece stack their AP bonuses', () => {
    const armour: ArmourItem[] = [
      // base 1 + Rune of Stone (+1) + Rune of Iron (+1) = effective 3
      { name: 'Runed Jerkin', locations: 'Body', enc: '1', ap: 1, qualities: '—', runes: ['rune-of-stone', 'rune-of-iron'] },
    ];
    const result = calculateArmourPoints(armour);
    expect(result.body).toBe(3);
  });
});

// ─── Property 10: Encumbrance calculation ────────────────────────────────────
// Validates: Requirements 5.2

describe('calculateMaxEncumbrance', () => {
  it('basic calculation: SB + TB with no Strong Back', () => {
    // S=20, T=20 → SB=2, TB=2 → 4
    const chars = makeChars();
    expect(calculateMaxEncumbrance(chars, 0)).toBe(4);
  });

  it('with Strong Back level 1', () => {
    // SB=2 + TB=2 + 1 = 5
    const chars = makeChars();
    expect(calculateMaxEncumbrance(chars, 1)).toBe(5);
  });

  it('with Strong Back level 3', () => {
    // SB=2 + TB=2 + 3 = 7
    const chars = makeChars();
    expect(calculateMaxEncumbrance(chars, 3)).toBe(7);
  });

  it('high S and T with advances', () => {
    // S: i=30, a=20 → 50, SB=5
    // T: i=40, a=15 → 55, TB=5
    // Expected: 5 + 5 + 0 = 10
    const chars = makeChars({ S: { i: 30, a: 20 }, T: { i: 40, a: 15 } });
    expect(calculateMaxEncumbrance(chars, 0)).toBe(10);
  });

  it('high S and T with Strong Back level 2', () => {
    // SB=5 + TB=5 + 2 = 12
    const chars = makeChars({ S: { i: 30, a: 20 }, T: { i: 40, a: 15 } });
    expect(calculateMaxEncumbrance(chars, 2)).toBe(12);
  });

  it('zero characteristics produce non-negative result', () => {
    const chars = makeChars({ S: { i: 0, a: 0 }, T: { i: 0, a: 0 } });
    expect(calculateMaxEncumbrance(chars, 0)).toBe(0);
  });

  it('low characteristics (single digit) with Strong Back', () => {
    // S=5, T=8 → SB=0, TB=0 → 0 + 0 + 2 = 2
    const chars = makeChars({ S: { i: 5, a: 0 }, T: { i: 8, a: 0 } });
    expect(calculateMaxEncumbrance(chars, 2)).toBe(2);
  });

  // Core p.146: Sturdy increases carrying capacity by level × 2.
  it('Sturdy adds 2 Enc per level', () => {
    // S=20, T=20 → SB=2, TB=2 = 4; Sturdy 1 → +2 → 6
    const chars = makeChars();
    expect(calculateMaxEncumbrance(chars, 0, 1)).toBe(6);
    // Sturdy 3 → +6 → 10
    expect(calculateMaxEncumbrance(chars, 0, 3)).toBe(10);
  });

  it('Strong Back and Sturdy stack (SB+TB + strongBack×1 + sturdy×2)', () => {
    // SB=2, TB=2 = 4; +Strong Back 1 (=1); +Sturdy 2 (=4) → 9
    const chars = makeChars();
    expect(calculateMaxEncumbrance(chars, 1, 2)).toBe(9);
  });

  it('defaults sturdyLevel to 0 when omitted (backward compatible)', () => {
    const chars = makeChars();
    expect(calculateMaxEncumbrance(chars, 0)).toBe(4);
  });
});

// ─── calculateCoinWeight ─────────────────────────────────────────────────────

describe('calculateCoinWeight', () => {
  it('returns 0 for fewer than 200 total coins', () => {
    expect(calculateCoinWeight(50, 50, 99)).toBe(0);
  });

  it('returns 1 for exactly 200 coins', () => {
    expect(calculateCoinWeight(100, 50, 50)).toBe(1);
  });

  it('returns 1 for 399 coins', () => {
    expect(calculateCoinWeight(200, 100, 99)).toBe(1);
  });

  it('returns 2 for 400 coins', () => {
    expect(calculateCoinWeight(200, 100, 100)).toBe(2);
  });

  it('returns 0 for zero coins', () => {
    expect(calculateCoinWeight(0, 0, 0)).toBe(0);
  });
});


// ─── computeWoundMaximum ─────────────────────────────────────────────────────
// Validates: Requirements 3.1, 3.2, 3.3, 3.4

describe('computeWoundMaximum', () => {
  it('basic Human (woundsUseSB=true, no Hardy): SB + 2×TB + WPB', () => {
    // S=40, T=30, WP=20 → SB=4, TB=3, WPB=2
    // Expected: 4 + 2×3 + 2 + 0 = 12
    const result = computeWoundMaximum(40, 30, 20, 0, true);
    expect(result.sb).toBe(4);
    expect(result.tb).toBe(6);
    expect(result.wpb).toBe(2);
    expect(result.hardy).toBe(0);
    expect(result.total).toBe(12);
  });

  it('Halfling (woundsUseSB=false, no Hardy): 0 + 2×TB + WPB', () => {
    // S=20, T=30, WP=40 → SB excluded, TB=3, WPB=4
    // Expected: 0 + 6 + 4 + 0 = 10
    const result = computeWoundMaximum(20, 30, 40, 0, false);
    expect(result.sb).toBe(0);
    expect(result.tb).toBe(6);
    expect(result.wpb).toBe(4);
    expect(result.hardy).toBe(0);
    expect(result.total).toBe(10);
  });

  it('with Hardy level 1 (woundsUseSB=true): adds 1×TB', () => {
    // S=30, T=40, WP=30 → SB=3, TB=4, WPB=3
    // Expected: 3 + 8 + 3 + 1×4 = 18
    const result = computeWoundMaximum(30, 40, 30, 1, true);
    expect(result.sb).toBe(3);
    expect(result.tb).toBe(8);
    expect(result.wpb).toBe(3);
    expect(result.hardy).toBe(4);
    expect(result.total).toBe(18);
  });

  it('with Hardy level 3 (woundsUseSB=true): adds 3×TB', () => {
    // S=30, T=40, WP=30 → SB=3, TB=4, WPB=3
    // Expected: 3 + 8 + 3 + 3×4 = 26
    const result = computeWoundMaximum(30, 40, 30, 3, true);
    expect(result.sb).toBe(3);
    expect(result.tb).toBe(8);
    expect(result.wpb).toBe(3);
    expect(result.hardy).toBe(12);
    expect(result.total).toBe(26);
  });

  it('components always sum to total', () => {
    const result = computeWoundMaximum(55, 45, 35, 2, true);
    expect(result.sb + result.tb + result.wpb + result.hardy).toBe(result.total);
  });

  it('zero characteristics produce zero total', () => {
    const result = computeWoundMaximum(0, 0, 0, 0, true);
    expect(result.total).toBe(0);
    expect(result.sb).toBe(0);
    expect(result.tb).toBe(0);
    expect(result.wpb).toBe(0);
    expect(result.hardy).toBe(0);
  });

  it('single-digit characteristics produce zero bonuses', () => {
    const result = computeWoundMaximum(9, 5, 7, 0, true);
    expect(result.total).toBe(0);
  });

  it('boundary: exactly 10 produces bonus of 1', () => {
    // S=10, T=10, WP=10 → SB=1, TB=1, WPB=1
    // Expected: 1 + 2 + 1 + 0 = 4
    const result = computeWoundMaximum(10, 10, 10, 0, true);
    expect(result.sb).toBe(1);
    expect(result.tb).toBe(2);
    expect(result.wpb).toBe(1);
    expect(result.total).toBe(4);
  });
});

// ─── computeAPByLocation ─────────────────────────────────────────────────────
// Validates: Requirements 9.1, 9.2

describe('computeAPByLocation', () => {
  it('returns all zeros for empty armour list', () => {
    const result = computeAPByLocation([]);
    expect(result).toEqual({ head: 0, leftArm: 0, rightArm: 0, body: 0, leftLeg: 0, rightLeg: 0 });
  });

  it('returns all zeros when no armour is worn', () => {
    const armour: ArmourItem[] = [
      { name: 'Leather Jerkin', locations: 'Body', enc: '1', ap: 1, qualities: '—', worn: false },
      { name: 'Helm', locations: 'Head', enc: '2', ap: 2, qualities: '—', worn: false },
    ];
    const result = computeAPByLocation(armour);
    expect(result).toEqual({ head: 0, leftArm: 0, rightArm: 0, body: 0, leftLeg: 0, rightLeg: 0 });
  });

  it('only counts worn armour items', () => {
    const armour: ArmourItem[] = [
      { name: 'Leather Jerkin', locations: 'Body', enc: '1', ap: 1, qualities: '—', worn: true },
      { name: 'Plate Breastplate', locations: 'Body', enc: '3', ap: 3, qualities: '—', worn: false },
    ];
    const result = computeAPByLocation(armour);
    expect(result.body).toBe(1);
  });

  it('sums AP for worn armour covering Arms (expands to leftArm, rightArm)', () => {
    const armour: ArmourItem[] = [
      { name: 'Plate Bracers', locations: 'Arms', enc: '3', ap: 2, qualities: 'Impenetrable', worn: true },
    ];
    const result = computeAPByLocation(armour);
    expect(result.leftArm).toBe(2);
    expect(result.rightArm).toBe(2);
    expect(result.body).toBe(0);
  });

  it('sums AP for worn armour covering Legs (expands to leftLeg, rightLeg)', () => {
    const armour: ArmourItem[] = [
      { name: 'Leather Leggings', locations: 'Legs', enc: '1', ap: 1, qualities: '—', worn: true },
    ];
    const result = computeAPByLocation(armour);
    expect(result.leftLeg).toBe(1);
    expect(result.rightLeg).toBe(1);
  });

  it('applies flexible + non-flexible stacking rule for worn items', () => {
    const armour: ArmourItem[] = [
      { name: 'Leather Jerkin', locations: 'Body', enc: '1', ap: 1, qualities: '—', worn: true },
      { name: 'Mail Shirt', locations: 'Body', enc: '2', ap: 2, qualities: 'Flexible', worn: true },
    ];
    const result = computeAPByLocation(armour);
    // Non-flexible highest = 1, Flexible highest = 2 → 3
    expect(result.body).toBe(3);
  });

  it('overlapping non-flexible worn armour: takes highest AP', () => {
    const armour: ArmourItem[] = [
      { name: 'Leather Jerkin', locations: 'Body', enc: '1', ap: 1, qualities: '—', worn: true },
      { name: 'Plate Breastplate', locations: 'Body', enc: '3', ap: 3, qualities: '—', worn: true },
    ];
    const result = computeAPByLocation(armour);
    expect(result.body).toBe(3);
  });

  it('full worn armour set across all locations', () => {
    const armour: ArmourItem[] = [
      { name: 'Helm', locations: 'Head', enc: '2', ap: 2, qualities: '—', worn: true },
      { name: 'Mail Coat', locations: 'Arms, Body', enc: '3', ap: 2, qualities: 'Flexible', worn: true },
      { name: 'Leather Leggings', locations: 'Legs', enc: '1', ap: 1, qualities: '—', worn: true },
    ];
    const result = computeAPByLocation(armour);
    expect(result.head).toBe(2);
    expect(result.leftArm).toBe(2);
    expect(result.rightArm).toBe(2);
    expect(result.body).toBe(2);
    expect(result.leftLeg).toBe(1);
    expect(result.rightLeg).toBe(1);
  });

  it('includes rune AP bonuses for worn armour', () => {
    const armour: ArmourItem[] = [
      { name: 'Runed Helm', locations: 'Head', enc: '2', ap: 2, qualities: '—', worn: true, runes: ['rune-of-stone'] },
    ];
    const result = computeAPByLocation(armour);
    // base 2 + Rune of Stone (+1) = 3
    expect(result.head).toBe(3);
  });
});
