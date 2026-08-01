// Feature: unified-psychology-panel, Property 1: Validation correctness by type category
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validatePsychologyTrait } from '../psychology';
import type { PsychologyType } from '../../types/character';

/**
 * **Validates: Requirements 2.2, 2.3, 2.4, 8.1, 8.2, 8.3**
 *
 * For any PsychologyType and arbitrary target string and rating number,
 * validatePsychologyTrait(type, target, rating) SHALL return true if and only if:
 * - The type is non-empty, AND
 * - If the type is in {Animosity, Hatred, Prejudice, Phobia, Trauma}, then target.trim().length > 0
 * - If the type is in {Fear, Terror}, then rating !== undefined && rating > 0
 * - If the type is Frenzy, no additional constraint
 */

// ─── Generators ─────────────────────────────────────────────────────────────

const allPsychologyTypes: PsychologyType[] = [
  'Animosity', 'Hatred', 'Fear', 'Terror', 'Frenzy', 'Prejudice', 'Phobia', 'Trauma'
];

const arbPsychologyType: fc.Arbitrary<PsychologyType> = fc.constantFrom(...allPsychologyTypes);

const arbTargetType: fc.Arbitrary<PsychologyType> = fc.constantFrom(
  'Animosity', 'Hatred', 'Prejudice', 'Phobia', 'Trauma'
);

const arbRatingType: fc.Arbitrary<PsychologyType> = fc.constantFrom('Fear', 'Terror');

const arbNonEmptyTarget = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

const arbEmptyTarget = fc.constantFrom('', '   ', '\t', '  \t  ');

const arbPositiveRating = fc.integer({ min: 1, max: 100 });

const arbNonPositiveRating = fc.oneof(
  fc.constant(0),
  fc.integer({ min: -100, max: -1 })
);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: unified-psychology-panel', () => {
  describe('Property 1: Validation correctness by type category', () => {

    it('returns false when type is empty, regardless of target and rating', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 50 }),
          fc.option(fc.integer({ min: -10, max: 100 }), { nil: undefined }),
          (target, rating) => {
            expect(validatePsychologyTrait('', target, rating)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns true for target-requiring types (Animosity, Hatred, Prejudice, Phobia, Trauma) when target is non-empty', () => {
      fc.assert(
        fc.property(
          arbTargetType,
          arbNonEmptyTarget,
          fc.option(fc.integer({ min: -10, max: 100 }), { nil: undefined }),
          (type, target, rating) => {
            expect(validatePsychologyTrait(type, target, rating)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns false for target-requiring types when target is empty or whitespace-only', () => {
      fc.assert(
        fc.property(
          arbTargetType,
          arbEmptyTarget,
          fc.option(fc.integer({ min: -10, max: 100 }), { nil: undefined }),
          (type, target, rating) => {
            expect(validatePsychologyTrait(type, target, rating)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns true for rating-requiring types (Fear, Terror) when rating is positive', () => {
      fc.assert(
        fc.property(
          arbRatingType,
          fc.string({ minLength: 0, maxLength: 50 }),
          arbPositiveRating,
          (type, target, rating) => {
            expect(validatePsychologyTrait(type, target, rating)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns false for rating-requiring types when rating is zero or negative', () => {
      fc.assert(
        fc.property(
          arbRatingType,
          fc.string({ minLength: 0, maxLength: 50 }),
          arbNonPositiveRating,
          (type, target, rating) => {
            expect(validatePsychologyTrait(type, target, rating)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns false for rating-requiring types when rating is undefined', () => {
      fc.assert(
        fc.property(
          arbRatingType,
          fc.string({ minLength: 0, maxLength: 50 }),
          (type, target) => {
            expect(validatePsychologyTrait(type, target, undefined)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns true for Frenzy regardless of target and rating values', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 50 }),
          fc.option(fc.integer({ min: -10, max: 100 }), { nil: undefined }),
          (target, rating) => {
            expect(validatePsychologyTrait('Frenzy', target, rating)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('biconditional: validatePsychologyTrait returns true iff type-specific requirements are met', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant('' as PsychologyType | ''), arbPsychologyType),
          fc.string({ minLength: 0, maxLength: 50 }),
          fc.option(fc.integer({ min: -10, max: 100 }), { nil: undefined }),
          (type, target, rating) => {
            const result = validatePsychologyTrait(type, target, rating);

            // Compute expected validity per the property statement
            let expected: boolean;
            if (!type) {
              expected = false;
            } else if (type === 'Fear' || type === 'Terror') {
              expected = rating !== undefined && rating > 0;
            } else if (
              type === 'Animosity' || type === 'Hatred' || type === 'Prejudice' ||
              type === 'Phobia' || type === 'Trauma'
            ) {
              expected = target.trim().length > 0;
            } else {
              // Frenzy
              expected = true;
            }

            expect(result).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
