import { describe, it, expect } from 'vitest';
import {
  computeCastingTarget,
  computeCastingTargetBreakdown,
  isPettySpell,
  computeOvercastBudgetBreakdown,
  resolveCastingResult,
} from '../spell-casting';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, SpellItem } from '../../types/character';
import type { RollResult } from '../dice-roller';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a test character from BLANK_CHARACTER with Int + Language (Magick). */
function makeCaster(intTotal: number, langMagickAdvances: number): Character {
  const c = structuredClone(BLANK_CHARACTER);
  // Put the whole Int total in the initial value for simplicity.
  c.chars.Int.i = intTotal;
  c.chars.Int.a = 0;
  c.chars.Int.b = 0;
  if (langMagickAdvances > 0) {
    c.aSkills = [
      ...c.aSkills,
      { n: 'Language (Magick)', c: 'Int', a: langMagickAdvances },
    ];
  }
  return c;
}

function makeSpell(overrides: Partial<SpellItem> = {}): SpellItem {
  return {
    name: 'Test Spell',
    cn: '5',
    range: 'You',
    target: 'You',
    duration: 'Instant',
    effect: 'A test effect.',
    ...overrides,
  };
}

function makeRoll(overrides: Partial<RollResult> = {}): RollResult {
  return {
    roll: 50,
    targetNumber: 60,
    baseTarget: 60,
    difficulty: 'Challenging',
    passed: true,
    sl: 1,
    isCritical: false,
    isFumble: false,
    isAutoSuccess: false,
    isAutoFailure: false,
    outcome: 'Marginal Success',
    skillOrCharName: 'Language (Magick)',
    timestamp: Date.now(),
    ...overrides,
  };
}

// ─── computeCastingTargetBreakdown ──────────────────────────────────────────────

describe('computeCastingTargetBreakdown', () => {
  it('breakdown lines sum to computeCastingTarget', () => {
    const cases: Array<[number, number]> = [
      [30, 0],
      [35, 5],
      [42, 13],
      [0, 0],
    ];
    for (const [intTotal, advances] of cases) {
      const c = makeCaster(intTotal, advances);
      const b = computeCastingTargetBreakdown(c);
      expect(b.intTotal).toBe(intTotal);
      expect(b.advances).toBe(advances);
      expect(b.intTotal + b.advances).toBe(b.total);
      expect(b.total).toBe(computeCastingTarget(c));
    }
  });
});

// ─── isPettySpell ───────────────────────────────────────────────────────────────

describe('isPettySpell', () => {
  it("is true for CN '0' and '-'", () => {
    expect(isPettySpell(makeSpell({ cn: '0' }))).toBe(true);
    expect(isPettySpell(makeSpell({ cn: '-' }))).toBe(true);
  });

  it('is false for any other CN', () => {
    expect(isPettySpell(makeSpell({ cn: '1' }))).toBe(false);
    expect(isPettySpell(makeSpell({ cn: '5' }))).toBe(false);
    expect(isPettySpell(makeSpell({ cn: '' }))).toBe(false);
  });
});

// ─── computeOvercastBudgetBreakdown ─────────────────────────────────────────────

describe('computeOvercastBudgetBreakdown', () => {
  it('gives totalPowerTens 0 in the normal case and sums correctly', () => {
    const c = makeCaster(40, 0);
    const spell = makeSpell({ cn: '3' });
    // sl 5, no critical → surplus 2, overcastSlots 2, no Total Power.
    const result = resolveCastingResult(makeRoll({ roll: 55, sl: 5 }), spell, c);
    const b = computeOvercastBudgetBreakdown(result);
    expect(b.totalPowerTens).toBe(0);
    expect(b.slAchieved).toBe(5);
    expect(b.cn).toBe(3);
    expect(b.overcastSlots).toBe(2);
    // slAchieved + totalPowerTens - cn === overcastSlots
    expect(b.slAchieved + b.totalPowerTens - b.cn).toBe(b.overcastSlots);
  });

  it('gives a positive totalPowerTens under a Total-Power re-resolve', () => {
    const c = makeCaster(40, 0);
    const spell = makeSpell({ cn: '3' });
    // roll 66 → tens digit 6 added to SL for overcasting under Total Power.
    const result = resolveCastingResult(makeRoll({ roll: 66, sl: 4 }), spell, c, {
      totalPower: true,
    });
    const b = computeOvercastBudgetBreakdown(result);
    expect(b.totalPowerTens).toBeGreaterThan(0);
    // slAchieved + totalPowerTens - cn === overcastSlots (holds in both cases)
    expect(b.slAchieved + b.totalPowerTens - b.cn).toBe(b.overcastSlots);
  });
});
