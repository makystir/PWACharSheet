// Feature: worn-trappings-encumbrance — worn save/load round-trip property test
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Trapping } from '../../types/character';

// ─── Generators ──────────────────────────────────────────────────────────────

/** A trapping name (kept simple; classification is not under test here). */
const arbName: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom('Cloak', 'Boots', 'Backpack', 'Rope', 'Tent', 'Waterskin'),
  fc.string({ minLength: 0, maxLength: 12 }),
);

/** Encumbrance strings: "0", numeric strings, and junk strings. */
const arbEnc: fc.Arbitrary<string> = fc.oneof(
  fc.constant('0'),
  fc.integer({ min: 0, max: 20 }).map((n) => String(n)),
  fc.constantFrom('', 'abc', 'N/A'),
);

/** Quantity >= 1. */
const arbQuantity: fc.Arbitrary<number> = fc.integer({ min: 1, max: 50 });

/** Worn flag in {true, false, undefined}. */
const arbWorn: fc.Arbitrary<boolean | undefined> = fc.constantFrom(true, false, undefined);

/** storedOnHorse flag in {true, false, undefined} for realism. */
const arbStoredOnHorse: fc.Arbitrary<boolean | undefined> = fc.constantFrom(true, false, undefined);

/** A full trapping with arbitrary worn / storedOnHorse states. */
const arbTrapping: fc.Arbitrary<Trapping> = fc.record({
  name: arbName,
  enc: arbEnc,
  quantity: arbQuantity,
  worn: arbWorn,
  storedOnHorse: arbStoredOnHorse,
});

const arbTrappingList: fc.Arbitrary<Trapping[]> = fc.array(arbTrapping, { maxLength: 30 });

// ─── Property 7 (Task 8.1) ─────────────────────────────────────────────────────

describe('trapping worn — save/load round-trip persistence', () => {
  // Feature: worn-trappings-encumbrance, Property 7: Worn value survives save/load
  // round-trip — serializing then deserializing a trapping list produces trappings
  // whose worn values equal the values before serialization (true stays true, false
  // stays false, undefined stays absent/undefined). JSON.stringify drops undefined
  // properties, so an item with worn: undefined round-trips to worn === undefined.
  it('preserves each trapping worn value through JSON serialize/deserialize', () => {
    fc.assert(
      fc.property(arbTrappingList, (list) => {
        const roundtripped: Trapping[] = JSON.parse(JSON.stringify(list));

        // Same number of trappings after the round-trip (Req 1.3).
        expect(roundtripped).toHaveLength(list.length);

        // Each worn value is preserved (Req 1.2, 1.3, 1.5). undefined on either
        // side is treated as absent/undefined, so strict equality holds.
        for (let i = 0; i < list.length; i++) {
          expect(roundtripped[i].worn).toBe(list[i].worn);
        }
      }),
      { numRuns: 100 },
    );
  });
});
