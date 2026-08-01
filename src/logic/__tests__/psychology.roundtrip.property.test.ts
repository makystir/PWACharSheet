import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validatePsychologyTrait } from '../psychology';
import type { PsychologyType, PsychologyTrait } from '../../types/character';

// Feature: unified-psychology-panel, Property 5: Trait creation round-trip validation

// ─── Generators ─────────────────────────────────────────────────────────────

const allPsychologyTypes: PsychologyType[] = [
  'Animosity', 'Hatred', 'Fear', 'Terror', 'Frenzy', 'Prejudice', 'Phobia', 'Trauma'
];

const targetRequiringTypes: PsychologyType[] = ['Animosity', 'Hatred', 'Prejudice', 'Phobia', 'Trauma'];
const ratingRequiringTypes: PsychologyType[] = ['Fear', 'Terror'];
const noExtraRequirementTypes: PsychologyType[] = ['Frenzy'];

const arbTargetType: fc.Arbitrary<PsychologyType> = fc.constantFrom(...targetRequiringTypes);
const arbRatingType: fc.Arbitrary<PsychologyType> = fc.constantFrom(...ratingRequiringTypes);
const arbFrenzyType: fc.Arbitrary<PsychologyType> = fc.constant('Frenzy');

const arbNonEmptyTarget = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const arbPositiveRating = fc.integer({ min: 1, max: 100 });

/**
 * Generates a valid trait input that passes validatePsychologyTrait:
 * - Target-requiring types get a non-empty target
 * - Rating-requiring types get a positive rating
 * - Frenzy gets arbitrary target/rating (no constraint)
 */
const arbValidTraitInput: fc.Arbitrary<{ type: PsychologyType; target: string; rating?: number }> =
  fc.oneof(
    // Target-requiring types: Animosity, Hatred, Prejudice, Phobia, Trauma
    fc.record({
      type: arbTargetType,
      target: arbNonEmptyTarget,
      rating: fc.option(fc.integer({ min: -10, max: 100 }), { nil: undefined }),
    }),
    // Rating-requiring types: Fear, Terror
    fc.record({
      type: arbRatingType,
      target: fc.string({ minLength: 0, maxLength: 50 }),
      rating: arbPositiveRating,
    }).map(({ type, target, rating }) => ({ type, target, rating: rating as number | undefined })),
    // Frenzy: no additional requirements
    fc.record({
      type: arbFrenzyType,
      target: fc.string({ minLength: 0, maxLength: 50 }),
      rating: fc.option(fc.integer({ min: -10, max: 100 }), { nil: undefined }),
    })
  );

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: unified-psychology-panel', () => {
  describe('Property 5: Trait creation round-trip validation', () => {
    /**
     * **Validates: Requirements 2.1, 7.1, 8.4**
     *
     * For any valid trait creation input (type, target, rating) that passes
     * validatePsychologyTrait, constructing a PsychologyTrait with those fields
     * and then re-validating with validatePsychologyTrait(trait.type, trait.target, trait.rating)
     * SHALL return true.
     */

    it('a valid input that passes validation still passes after constructing a PsychologyTrait', () => {
      fc.assert(
        fc.property(
          arbValidTraitInput,
          fc.uuid(),
          ({ type, target, rating }, id) => {
            // Precondition: the input must pass validation
            const initialValid = validatePsychologyTrait(type, target, rating);
            expect(initialValid).toBe(true);

            // Construct the PsychologyTrait object
            const trait: PsychologyTrait = { id, type, target, rating };

            // Round-trip: re-validate using the trait's own fields
            const roundTripValid = validatePsychologyTrait(trait.type, trait.target, trait.rating);
            expect(roundTripValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('round-trip holds for all target-requiring types with non-empty targets', () => {
      fc.assert(
        fc.property(
          arbTargetType,
          arbNonEmptyTarget,
          fc.uuid(),
          (type, target, id) => {
            const trait: PsychologyTrait = { id, type, target };
            expect(validatePsychologyTrait(trait.type, trait.target, trait.rating)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('round-trip holds for rating-requiring types with positive ratings', () => {
      fc.assert(
        fc.property(
          arbRatingType,
          fc.string({ minLength: 0, maxLength: 50 }),
          arbPositiveRating,
          fc.uuid(),
          (type, target, rating, id) => {
            const trait: PsychologyTrait = { id, type, target, rating };
            expect(validatePsychologyTrait(trait.type, trait.target, trait.rating)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('round-trip holds for Frenzy with any target and rating values', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 50 }),
          fc.option(fc.integer({ min: -10, max: 100 }), { nil: undefined }),
          fc.uuid(),
          (target, rating, id) => {
            const trait: PsychologyTrait = { id, type: 'Frenzy', target, rating };
            expect(validatePsychologyTrait(trait.type, trait.target, trait.rating)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
