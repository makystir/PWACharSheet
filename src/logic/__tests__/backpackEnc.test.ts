import { describe, it, expect } from 'vitest';
import { calculateCarriedTrappingEnc, calculateHorseTrappingEnc } from '../encumbrance';
import { getTrappingEncBreakdown } from '../breakdown-helpers';
import type { Trapping } from '../../types/character';

// House rule (ignoreBackpackEnc): items marked inBackpack contribute 0 to the
// carried encumbrance total when the rule is enabled; carrying capacity is
// unaffected (computed elsewhere). Default (rule off) behaviour is unchanged.

function t(overrides: Partial<Trapping>): Trapping {
  return { name: 'Item', enc: '2', quantity: 1, ...overrides };
}

describe('calculateCarriedTrappingEnc — backpack house rule', () => {
  const items: Trapping[] = [
    t({ name: 'Tent', enc: '2', inBackpack: true }),
    t({ name: 'Rope', enc: '1', inBackpack: false }),
    t({ name: 'Bedroll', enc: '1' }), // inBackpack undefined
  ];

  it('rule OFF (default): backpack flag has no effect — full total', () => {
    // 2 + 1 + 1 = 4, regardless of inBackpack
    expect(calculateCarriedTrappingEnc(items)).toBe(4);
    expect(calculateCarriedTrappingEnc(items, false)).toBe(4);
  });

  it('rule ON: inBackpack items contribute 0', () => {
    // Tent (2) ignored → 1 + 1 = 2
    expect(calculateCarriedTrappingEnc(items, true)).toBe(2);
  });

  it('rule ON with quantity: the whole stack is ignored, not per-item', () => {
    const stacked: Trapping[] = [t({ name: 'Torches', enc: '1', quantity: 5, inBackpack: true })];
    expect(calculateCarriedTrappingEnc(stacked, false)).toBe(5);
    expect(calculateCarriedTrappingEnc(stacked, true)).toBe(0);
  });

  it('rule ON: stored-on-horse still excluded independently of backpack', () => {
    const mixed: Trapping[] = [
      t({ name: 'Anvil', enc: '3', storedOnHorse: true }),
      t({ name: 'Pot', enc: '2', inBackpack: true }),
      t({ name: 'Knife', enc: '0' }),
    ];
    // Horse item excluded from carried; backpack pot ignored; knife 0 → 0
    expect(calculateCarriedTrappingEnc(mixed, true)).toBe(0);
    // Horse total is unaffected by the backpack rule.
    expect(calculateHorseTrappingEnc(mixed)).toBe(3);
  });
});

describe('getTrappingEncBreakdown — backpack house rule', () => {
  const items: Trapping[] = [
    t({ name: 'Tent', enc: '2', inBackpack: true }),
    t({ name: 'Rope', enc: '1' }),
  ];

  it('rule OFF: no line is flagged, total is full', () => {
    const b = getTrappingEncBreakdown(items);
    expect(b.total).toBe(3);
    expect(b.lines.every((l) => !l.inBackpackIgnored)).toBe(true);
    expect(b.lines.find((l) => l.name === 'Tent')!.effective).toBe(2);
  });

  it('rule ON: backpack line shows effective 0 + flagged, total matches carried calc', () => {
    const b = getTrappingEncBreakdown(items, true);
    const tent = b.lines.find((l) => l.name === 'Tent')!;
    expect(tent.effective).toBe(0);
    expect(tent.inBackpackIgnored).toBe(true);
    expect(b.total).toBe(1);
    // Breakdown total must equal the shared carried calculation (calculated-totals rule).
    expect(b.total).toBe(calculateCarriedTrappingEnc(items, true));
  });
});
