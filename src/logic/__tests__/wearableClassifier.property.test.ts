// Feature: worn-trappings-encumbrance, Property 6: Wearable classifier equals case-insensitive membership
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { isWearableTrapping, WEARABLE_TRAPPING_NAMES } from '../encumbrance';

/**
 * Property 6: Wearable classifier equals case-insensitive membership
 *
 * **Validates: Requirements 2.1, 2.2, 2.3**
 *
 * For any trapping name and for any re-casing of that name, `isWearableTrapping`
 * SHALL return true if and only if the trimmed, lower-cased name is a member of
 * `WEARABLE_TRAPPING_NAMES`, and the result SHALL be unchanged by case.
 */

// ─── Generators ──────────────────────────────────────────────────────────────

/** The wearable set, lower-cased, used as the membership oracle. */
const WEARABLE_SET_LOWER = new Set(WEARABLE_TRAPPING_NAMES.map((n) => n.toLowerCase()));

/** Re-case a string character-by-character (upper/lower/unchanged at random). */
function reCase(s: string, choices: number[]): string {
  return s
    .split('')
    .map((ch, idx) => {
      switch (choices[idx % choices.length]) {
        case 0:
          return ch.toUpperCase();
        case 1:
          return ch.toLowerCase();
        default:
          return ch;
      }
    })
    .join('');
}

/** A name drawn from the wearable set (exact canonical casing). */
const arbWearableName = fc.constantFrom(...WEARABLE_TRAPPING_NAMES);

/** Arbitrary "junk" names — free-form strings that may or may not be wearable. */
const arbJunkName = fc.string({ maxLength: 30 });

/** Mix of wearable names and junk names. */
const arbAnyName = fc.oneof(arbWearableName, arbJunkName);

/** Per-character re-casing choices: 0 = upper, 1 = lower, 2 = unchanged. */
const arbCaseChoices = fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 1, maxLength: 40 });

// ─── Property Test ───────────────────────────────────────────────────────────

describe('Feature: worn-trappings-encumbrance', () => {
  describe('Property 6: Wearable classifier equals case-insensitive membership', () => {
    it('isWearableTrapping equals case-insensitive membership and is case-invariant', () => {
      fc.assert(
        fc.property(arbAnyName, arbCaseChoices, (name, caseChoices) => {
          const recased = reCase(name, caseChoices);

          // Oracle: membership of the trimmed, lower-cased name in the wearable set.
          const expected = WEARABLE_SET_LOWER.has(name.trim().toLowerCase());

          // The classifier result matches the membership oracle.
          expect(isWearableTrapping(name)).toBe(expected);

          // Re-casing the same name yields the same result (case-invariance).
          expect(isWearableTrapping(recased)).toBe(isWearableTrapping(name));
        }),
        { numRuns: 100 },
      );
    });
  });
});
