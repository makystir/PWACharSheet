import { describe, it, expect } from 'vitest';
import { computeMonthlyDues, DUES_TIER_UNKNOWN_GUIDANCE } from '../dues';

/**
 * Dues-calc tests (Deft Steps p.63 "Paying Your Dues", docs/deftsteps.md L2343).
 * dues = Organisation Level coins in the denomination set by the status tier:
 * Brass → d, Silver → /- (ss), Gold → GC.
 */

describe('computeMonthlyDues — the book worked example', () => {
  it('Brass 3 / Level 3 → 3 pennies (3d)', () => {
    const dues = computeMonthlyDues('Brass 3', 3);
    expect(dues).toEqual({
      count: 3,
      denomination: 'd',
      display: '3d',
      tierUnknown: false,
      breakdown: [
        { label: 'Status tier', value: 'Brass (pennies)' },
        { label: 'Organisation Level', value: '3' },
        { label: 'Dues', value: '3d per month' },
      ],
    });
  });
});

describe('computeMonthlyDues — every tier × level', () => {
  const cases: {
    status: string;
    tier: 'Brass' | 'Silver' | 'Gold';
    denom: 'd' | 'ss' | 'gc';
    fmt: (n: number) => string;
  }[] = [
    { status: 'Brass 2', tier: 'Brass', denom: 'd', fmt: (n) => `${n}d` },
    { status: 'Silver 4', tier: 'Silver', denom: 'ss', fmt: (n) => `${n}/-` },
    { status: 'Gold 1', tier: 'Gold', denom: 'gc', fmt: (n) => `${n} GC` },
  ];

  for (const c of cases) {
    for (let level = 1; level <= 4; level++) {
      it(`${c.tier} / Level ${level} → ${c.fmt(level)}`, () => {
        const dues = computeMonthlyDues(c.status, level);
        expect(dues.count).toBe(level);
        expect(dues.denomination).toBe(c.denom);
        expect(dues.display).toBe(c.fmt(level));
        expect(dues.tierUnknown).toBe(false);
        // Breakdown ends with the dues total line.
        expect(dues.breakdown[dues.breakdown.length - 1]).toEqual({
          label: 'Dues',
          value: `${c.fmt(level)} per month`,
        });
      });
    }
  }
});

describe('computeMonthlyDues — specific denominations the brief calls out', () => {
  it('Silver / Level 2 → 2/-', () => {
    expect(computeMonthlyDues('Silver 2', 2).display).toBe('2/-');
  });
  it('Gold / Level 4 → 4 GC', () => {
    expect(computeMonthlyDues('Gold 1', 4).display).toBe('4 GC');
  });
});

describe('computeMonthlyDues — unknown/unparseable tier (guidance, no crash)', () => {
  for (const bad of ['', 'Bronze 1', 'unknown', '   ', 'status']) {
    it(`"${bad}" → tierUnknown guidance, no denomination`, () => {
      const dues = computeMonthlyDues(bad, 2);
      expect(dues.tierUnknown).toBe(true);
      expect(dues.denomination).toBeNull();
      expect(dues.display).toBe(DUES_TIER_UNKNOWN_GUIDANCE);
      // Count still reflects the organisation level.
      expect(dues.count).toBe(2);
    });
  }

  it('is case-insensitive (reuses parseStatusTier)', () => {
    expect(computeMonthlyDues('a silver sort', 1).denomination).toBe('ss');
    expect(computeMonthlyDues('GOLD', 1).denomination).toBe('gc');
  });
});

describe('computeMonthlyDues — level clamping (defensive, imported data)', () => {
  it('clamps below 1 to 1', () => {
    expect(computeMonthlyDues('Brass 1', 0).count).toBe(1);
    expect(computeMonthlyDues('Brass 1', -5).count).toBe(1);
  });
  it('clamps above 4 to 4', () => {
    expect(computeMonthlyDues('Brass 1', 9).count).toBe(4);
  });
  it('truncates non-integers', () => {
    expect(computeMonthlyDues('Brass 1', 2.9).count).toBe(2);
  });
  it('falls back to 1 for non-finite levels', () => {
    expect(computeMonthlyDues('Brass 1', Number.NaN).count).toBe(1);
  });
});
