// Feature: worn-trappings-encumbrance — worn / stored-on-horse exclusivity property test
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { isEffectivelyWorn } from '../encumbrance';
import type { Trapping } from '../../types/character';

// ─── Local pure reducers ──────────────────────────────────────────────────────
//
// CharacterPage.tsx defines setWorn / setStoredOnHorse inline (not exported) as a
// per-trapping map transformation enforcing mutual exclusivity (Req 6.1, 6.2):
//
//   setWorn(i, value):          idx === i ? { ...t, worn: value, storedOnHorse: value ? false : t.storedOnHorse } : t
//   setStoredOnHorse(i, value): idx === i ? { ...t, storedOnHorse: value, worn: value ? false : t.worn } : t
//
// These pure helpers replicate the exact per-trapping transformation so the
// reducer-level invariant can be property-tested without importing the component.

/** Mirror of CharacterPage setWorn's per-trapping transform. */
function applySetWorn(t: Trapping, value: boolean): Trapping {
  return { ...t, worn: value, storedOnHorse: value ? false : t.storedOnHorse };
}

/** Mirror of CharacterPage setStoredOnHorse's per-trapping transform. */
function applySetStoredOnHorse(t: Trapping, value: boolean): Trapping {
  return { ...t, storedOnHorse: value, worn: value ? false : t.worn };
}

const bothTrue = (t: Trapping): boolean => t.worn === true && t.storedOnHorse === true;

// ─── Generators ────────────────────────────────────────────────────────────────

const arbBoolish: fc.Arbitrary<boolean | undefined> = fc.constantFrom(true, false, undefined);

const arbTrapping: fc.Arbitrary<Trapping> = fc.record({
  name: fc.oneof(fc.constantFrom('Cloak', 'Boots', 'Backpack', 'Rope'), fc.string({ maxLength: 12 })),
  enc: fc.oneof(fc.constant('0'), fc.integer({ min: 0, max: 20 }).map(String), fc.constantFrom('', 'abc')),
  quantity: fc.integer({ min: 1, max: 50 }),
  worn: arbBoolish,
  storedOnHorse: arbBoolish,
});

const arbValue: fc.Arbitrary<boolean> = fc.boolean();

// ─── Property 5 (Task 5.2) ──────────────────────────────────────────────────────

describe('worn / stored-on-horse mutual exclusivity', () => {
  // Feature: worn-trappings-encumbrance, Property 5: Worn and stored-on-horse are
  // mutually exclusive — setting worn true clears storedOnHorse, setting
  // storedOnHorse true clears worn (the two flags are never both true after either
  // setter); and for any loaded trapping with both flags true, isEffectivelyWorn is
  // false (treated as stored on horse, not worn).
  it('setWorn/setStoredOnHorse reducers never leave both flags true', () => {
    fc.assert(
      fc.property(arbTrapping, arbValue, (t, value) => {
        const afterWorn = applySetWorn(t, value);
        const afterHorse = applySetStoredOnHorse(t, value);

        // After setWorn(true): storedOnHorse is cleared (not true) (Req 6.1).
        if (value === true) {
          expect(afterWorn.worn).toBe(true);
          expect(afterWorn.storedOnHorse).not.toBe(true);
        }

        // After setStoredOnHorse(true): worn is cleared (not true) (Req 6.2).
        if (value === true) {
          expect(afterHorse.storedOnHorse).toBe(true);
          expect(afterHorse.worn).not.toBe(true);
        }

        // Neither reducer ever leaves both flags true, for any value (Req 6.1, 6.2).
        expect(bothTrue(afterWorn)).toBe(false);
        expect(bothTrue(afterHorse)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('isEffectivelyWorn is false when both flags are true (Req 6.3)', () => {
    fc.assert(
      fc.property(arbTrapping, (t) => {
        // For any loaded trapping with both worn and storedOnHorse true, the
        // read-time calculation treats it as stored on horse and not worn.
        const bothOn: Trapping = { ...t, worn: true, storedOnHorse: true };
        expect(isEffectivelyWorn(bothOn)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
