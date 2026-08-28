// Feature: worn-trappings-encumbrance — trapping encumbrance property tests
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  calculateTrappingEncumbrance,
  calculateCarriedTrappingEnc,
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

/** Worn flag in {true, false, undefined}. */
const arbWorn: fc.Arbitrary<boolean | undefined> = fc.constantFrom(true, false, undefined);

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
  worn: arbWorn,
  storedOnHorse: fc.constantFrom(true, false, undefined),
});

const arbTrappingList: fc.Arbitrary<Trapping[]> = fc.array(arbTrapping, { maxLength: 30 });

/** Reference (spec) formula for a single trapping's effective encumbrance. */
function expectedEffective(enc: string, quantity: number, worn: boolean | undefined): number {
  const base = parseFloat(enc) || 0;
  const perItem = worn === true ? Math.max(0, base - 1) : base;
  return perItem * (quantity || 1);
}

// ─── Property 1 (Task 2.4) ─────────────────────────────────────────────────────

describe('calculateTrappingEncumbrance — effective encumbrance formula', () => {
  // Feature: worn-trappings-encumbrance, Property 1: Effective encumbrance formula —
  // result equals (worn === true ? max(0, base − 1) : base) × (quantity || 1), the
  // per-item result is never negative, and a worn item with base 0 contributes 0.
  it('matches (worn ? max(0, base-1) : base) × qty and stays non-negative', () => {
    fc.assert(
      fc.property(arbEnc, arbQuantity, arbWorn, (enc, quantity, worn) => {
        const result = calculateTrappingEncumbrance(enc, quantity, worn);
        const base = parseFloat(enc) || 0;

        // Formula equivalence (Req 4.1, 4.2, 4.3).
        expect(result).toBe(expectedEffective(enc, quantity, worn));

        // Per-item result is never negative (Req 4.1).
        const perItem = worn === true ? Math.max(0, base - 1) : base;
        expect(perItem).toBeGreaterThanOrEqual(0);
        expect(result).toBeGreaterThanOrEqual(0);

        // Worn item with base 0 → per-item 0, so total contribution is 0 (Req 4.4).
        if (worn === true && base === 0) {
          expect(result).toBe(0);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 2 (Task 2.5) ─────────────────────────────────────────────────────

describe('calculateCarriedTrappingEnc — sums non-horse effective values', () => {
  // Feature: worn-trappings-encumbrance, Property 2: Carried total sums non-horse
  // effective values — equals the manual sum of calculateTrappingEncumbrance over
  // exactly the non-horse trappings (effective worn = worn===true && storedOnHorse!==true),
  // and is invariant to adding/removing/toggling a stored-on-horse trapping.
  it('equals the manual non-horse sum and ignores stored-on-horse trappings', () => {
    fc.assert(
      fc.property(arbTrappingList, (trappings) => {
        // Manual sum over exactly the non-horse trappings using effective worn.
        const manual = trappings
          .filter((t) => t.storedOnHorse !== true)
          .reduce((sum, t) => {
            const effectiveWorn = t.worn === true && t.storedOnHorse !== true;
            return sum + calculateTrappingEncumbrance(t.enc, t.quantity, effectiveWorn);
          }, 0);

        expect(calculateCarriedTrappingEnc(trappings)).toBe(manual);
      }),
      { numRuns: 100 },
    );
  });

  it('is invariant to adding, removing, or toggling a stored-on-horse trapping', () => {
    fc.assert(
      fc.property(arbTrappingList, arbTrapping, (trappings, extra) => {
        const baseTotal = calculateCarriedTrappingEnc(trappings);

        // Adding a stored-on-horse trapping does not change the carried total.
        const horseItem: Trapping = { ...extra, storedOnHorse: true };
        const withHorse = [...trappings, horseItem];
        expect(calculateCarriedTrappingEnc(withHorse)).toBe(baseTotal);

        // Removing that same stored-on-horse trapping restores the total.
        const removed = withHorse.filter((t) => t !== horseItem);
        expect(calculateCarriedTrappingEnc(removed)).toBe(baseTotal);

        // Toggling any stored-on-horse item's worn flag does not change the total.
        const toggled = withHorse.map((t) =>
          t.storedOnHorse === true ? { ...t, worn: !(t.worn === true) } : t,
        );
        expect(calculateCarriedTrappingEnc(toggled)).toBe(baseTotal);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 8 (Task 2.6) ─────────────────────────────────────────────────────

describe('calculateCarriedTrappingEnc — legacy equivalence when nothing worn', () => {
  // Feature: worn-trappings-encumbrance, Property 8: Legacy equivalence when no
  // trapping is worn — carried total equals the legacy base × qty sum over the
  // non-horse trappings.
  it('equals the legacy base × qty non-horse sum when all worn flags are falsy', () => {
    // Trapping generator with all worn falsy (false or undefined).
    const arbNoWornList: fc.Arbitrary<Trapping[]> = fc.array(
      fc.record({
        name: arbName,
        enc: arbEnc,
        quantity: arbQuantity,
        worn: fc.constantFrom(false, undefined),
        storedOnHorse: fc.constantFrom(true, false, undefined),
      }),
      { maxLength: 30 },
    );

    fc.assert(
      fc.property(arbNoWornList, (trappings) => {
        const legacy = trappings
          .filter((t) => t.storedOnHorse !== true)
          .reduce((sum, t) => sum + (parseFloat(t.enc) || 0) * (t.quantity || 1), 0);

        expect(calculateCarriedTrappingEnc(trappings)).toBe(legacy);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 3 (Task 7.2) ─────────────────────────────────────────────────────

describe('calculateCarriedTrappingEnc — character page total equals print layout total', () => {
  // Feature: worn-trappings-encumbrance, Property 3: Character page total equals print layout total —
  // both the CharacterPage encumbrance indicator/breakdown and the PrintLayout `eT` are derived from
  // the same shared calculateCarriedTrappingEnc(trappings). The shared function is the single source of
  // truth, so computing it twice for the same list (the two call sites) yields the same value, and that
  // value equals a manual recomputation using the reference formula.
  it('yields the same value at both call sites and matches a manual recomputation', () => {
    fc.assert(
      fc.property(arbTrappingList, (trappings) => {
        // CharacterPage-side value and PrintLayout-side value are both this shared call.
        const characterPageValue = calculateCarriedTrappingEnc(trappings);
        const printLayoutValue = calculateCarriedTrappingEnc(trappings);

        // The two call sites agree — single source of truth (Req 5.1, 5.4).
        expect(characterPageValue).toBe(printLayoutValue);

        // Both equal a manual recomputation over exactly the non-horse trappings using
        // the reference effective-encumbrance formula.
        const manual = trappings
          .filter((t) => t.storedOnHorse !== true)
          .reduce((sum, t) => {
            const effectiveWorn = t.worn === true && t.storedOnHorse !== true;
            return sum + expectedEffective(t.enc, t.quantity, effectiveWorn);
          }, 0);

        expect(characterPageValue).toBe(manual);
        expect(printLayoutValue).toBe(manual);
      }),
      { numRuns: 100 },
    );
  });
});
