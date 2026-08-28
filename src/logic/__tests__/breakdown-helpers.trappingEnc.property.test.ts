// Feature: worn-trappings-encumbrance — trappings breakdown helper property tests
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getTrappingEncBreakdown } from '../breakdown-helpers';
import {
  calculateCarriedTrappingEnc,
  calculateTrappingEncumbrance,
  isEffectivelyWorn,
} from '../encumbrance';
import type { Trapping } from '../../types/character';

// ─── Generators ──────────────────────────────────────────────────────────────

/** Encumbrance strings: "0", numeric strings, and junk (non-numeric) strings. */
const arbEnc: fc.Arbitrary<string> = fc.oneof(
  fc.constant('0'),
  fc.integer({ min: 0, max: 20 }).map((n) => String(n)),
  fc.float({ min: 0, max: 20, noNaN: true }).map((n) => String(n)),
  fc.constantFrom('', 'abc', 'N/A', '-', 'x1', '  '), // junk → parseFloat || 0 = 0
);

/** Quantity >= 1. */
const arbQuantity: fc.Arbitrary<number> = fc.integer({ min: 1, max: 50 });

/** A trapping name (kept simple; classification is not under test here). */
const arbName: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom('Cloak', 'Boots', 'Backpack', 'Rope', 'Tent', 'Waterskin'),
  fc.string({ minLength: 0, maxLength: 12 }),
);

/** A full trapping with mixed worn / storedOnHorse states. */
const arbTrapping: fc.Arbitrary<Trapping> = fc.record({
  name: arbName,
  enc: arbEnc,
  quantity: arbQuantity,
  worn: fc.constantFrom(true, false, undefined),
  storedOnHorse: fc.constantFrom(true, false, undefined),
});

const arbTrappingList: fc.Arbitrary<Trapping[]> = fc.array(arbTrapping, { maxLength: 30 });

// ─── Property 4 (Task 4.2) ─────────────────────────────────────────────────────

describe('getTrappingEncBreakdown — breakdown uses effective values and totals match', () => {
  // Feature: worn-trappings-encumbrance, Property 4: Breakdown tooltip uses effective values and totals match —
  // the breakdown's total equals calculateCarriedTrappingEnc, and each line's effective
  // contribution equals calculateTrappingEncumbrance using the line's effective worn state
  // (worn-reduced, quantity-multiplied) rather than base × quantity.
  it('total equals calculateCarriedTrappingEnc and each line uses effective (worn-reduced) values', () => {
    fc.assert(
      fc.property(arbTrappingList, (trappings) => {
        const breakdown = getTrappingEncBreakdown(trappings);

        // The breakdown total matches the shared carried-total calculation (Req 5.2).
        expect(breakdown.total).toBe(calculateCarriedTrappingEnc(trappings));

        // The breakdown covers exactly the carried (non-horse) trappings.
        const carried = trappings.filter((t) => t.storedOnHorse !== true);
        expect(breakdown.lines).toHaveLength(carried.length);

        // Each line's effective value uses the line's effective worn state, matching
        // calculateTrappingEncumbrance — not base × qty (Req 5.3).
        carried.forEach((t, idx) => {
          const line = breakdown.lines[idx];
          const worn = isEffectivelyWorn(t);
          const base = parseFloat(t.enc) || 0;
          const qty = t.quantity || 1;

          expect(line.effective).toBe(calculateTrappingEncumbrance(t.enc, t.quantity, worn));
          expect(line.worn).toBe(worn);
          expect(line.baseEnc).toBe(base);
          expect(line.quantity).toBe(qty);

          // For a worn line whose base > 0, the effective value is reduced below base × qty.
          if (worn && base > 0) {
            expect(line.effective).toBeLessThan(base * qty);
          }
        });

        // The sum of the line effective values equals the reported total.
        const lineSum = breakdown.lines.reduce((sum, l) => sum + l.effective, 0);
        expect(lineSum).toBe(breakdown.total);
      }),
      { numRuns: 100 },
    );
  });
});
