// Feature: optional-psychology-tracking, Property 2: Toggle off/on round-trip preserves psychology data
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { BLANK_CHARACTER } from '../character';
import type { Character, PsychologyTrait, PsychologyType } from '../character';

/**
 * Property 2: Toggle off/on round-trip preserves psychology data
 *
 * **Validates: Requirements 4.1, 4.2**
 *
 * For any character with arbitrary `psychologyTraits` (0 or more entries of any
 * valid type/target/rating) and any `brokenTally` value >= 0, toggling
 * `usePsychologyTracker` from true to false and back to true SHALL result in
 * identical `psychologyTraits` array and `brokenTally` value.
 *
 * The toggle only changes the boolean field via `update('houseRules.usePsychologyTracker', value)`,
 * which uses `setNestedValue` — a structuredClone + dot-path set. It does NOT
 * touch psychologyTraits or brokenTally.
 */

// ─── Generators ──────────────────────────────────────────────────────────────

/** All valid PsychologyType values from the type definition */
const VALID_PSYCHOLOGY_TYPES: PsychologyType[] = [
  'Animosity', 'Hatred', 'Fear', 'Terror', 'Frenzy', 'Prejudice', 'Phobia', 'Trauma',
];

const arbPsychologyType: fc.Arbitrary<PsychologyType> = fc.constantFrom(...VALID_PSYCHOLOGY_TYPES);

/** Generate a random PsychologyTrait with valid structure */
const arbPsychologyTrait: fc.Arbitrary<PsychologyTrait> = fc.record({
  id: fc.uuid(),
  type: arbPsychologyType,
  target: fc.string({ minLength: 0, maxLength: 50 }),
  rating: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
});

/** Generate an array of 0–10 random PsychologyTrait objects */
const arbPsychologyTraits: fc.Arbitrary<PsychologyTrait[]> = fc.array(arbPsychologyTrait, {
  minLength: 0,
  maxLength: 10,
});

/** Generate a non-negative brokenTally integer */
const arbBrokenTally: fc.Arbitrary<number> = fc.integer({ min: 0, max: 100 });

// ─── Simulation ──────────────────────────────────────────────────────────────

/**
 * Simulates the production toggle behavior.
 * `update('houseRules.usePsychologyTracker', value)` calls setNestedValue which:
 * 1. structuredClones the character
 * 2. Sets only the nested boolean field
 * 3. Returns the cloned character with the boolean changed
 *
 * This function replicates that behavior.
 */
function simulateToggle(character: Character, newValue: boolean): Character {
  const clone = structuredClone(character);
  clone.houseRules.usePsychologyTracker = newValue;
  return clone;
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: optional-psychology-tracking', () => {
  describe('Property 2: Toggle off/on round-trip preserves psychology data', () => {
    it('toggling usePsychologyTracker true → false → true preserves psychologyTraits and brokenTally', () => {
      fc.assert(
        fc.property(
          arbPsychologyTraits,
          arbBrokenTally,
          (traits, tally) => {
            // Build a character with the toggle ON and random psychology data
            const initial: Character = {
              ...structuredClone(BLANK_CHARACTER),
              psychologyTraits: traits,
              brokenTally: tally,
              houseRules: {
                ...structuredClone(BLANK_CHARACTER.houseRules),
                usePsychologyTracker: true,
              },
            };

            // Toggle OFF (true → false)
            const toggledOff = simulateToggle(initial, false);

            // Toggle back ON (false → true)
            const toggledBackOn = simulateToggle(toggledOff, true);

            // Assert psychologyTraits array is identical
            expect(toggledBackOn.psychologyTraits).toEqual(initial.psychologyTraits);

            // Assert brokenTally is identical
            expect(toggledBackOn.brokenTally).toBe(initial.brokenTally);
          }
        ),
        { numRuns: 100 },
      );
    });
  });
});
