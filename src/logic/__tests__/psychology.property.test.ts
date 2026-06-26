import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validatePsychologyTrait } from '../psychology';
import type { PsychologyType } from '../../types/character';

// Feature: ux-polish-and-functionality, Property 10: Psychology Trait Validation

// ─── Generators ─────────────────────────────────────────────────────────────

const allPsychologyTypes: PsychologyType[] = ['Animosity', 'Hatred', 'Fear', 'Terror', 'Frenzy', 'Prejudice'];

const arbPsychologyType: fc.Arbitrary<PsychologyType> = fc.constantFrom(...allPsychologyTypes);

const arbRatingType: fc.Arbitrary<PsychologyType> = fc.constantFrom('Fear', 'Terror');

const arbTargetType: fc.Arbitrary<PsychologyType> = fc.constantFrom('Animosity', 'Hatred', 'Prejudice');

const arbPositiveRating = fc.integer({ min: 1, max: 100 });

const arbNonPositiveRating = fc.oneof(
  fc.constant(0),
  fc.integer({ min: -100, max: -1 })
);

const arbNonEmptyTarget = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

const arbEmptyTarget = fc.constantFrom('', '   ', '\t', '  \t  ');

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-polish-and-functionality', () => {
  describe('Property 10: Psychology Trait Validation', () => {
    /**
     * **Validates: Requirements 11.3**
     */

    it('returns false when type is empty', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 50 }),
          fc.option(fc.integer({ min: -10, max: 100 }), { nil: undefined }),
          (target, rating) => {
            const result = validatePsychologyTrait('', target, rating);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns true for Fear/Terror when rating is a positive number', () => {
      fc.assert(
        fc.property(
          arbRatingType,
          fc.string({ minLength: 0, maxLength: 50 }),
          arbPositiveRating,
          (type, target, rating) => {
            const result = validatePsychologyTrait(type, target, rating);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns false for Fear/Terror when rating is zero, negative, or undefined', () => {
      fc.assert(
        fc.property(
          arbRatingType,
          fc.string({ minLength: 0, maxLength: 50 }),
          arbNonPositiveRating,
          (type, target, rating) => {
            const result = validatePsychologyTrait(type, target, rating);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns false for Fear/Terror when rating is undefined', () => {
      fc.assert(
        fc.property(
          arbRatingType,
          fc.string({ minLength: 0, maxLength: 50 }),
          (type, target) => {
            const result = validatePsychologyTrait(type, target, undefined);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns true for Animosity/Hatred/Prejudice when target is a non-empty string', () => {
      fc.assert(
        fc.property(
          arbTargetType,
          arbNonEmptyTarget,
          fc.option(fc.integer({ min: -10, max: 100 }), { nil: undefined }),
          (type, target, rating) => {
            const result = validatePsychologyTrait(type, target, rating);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns false for Animosity/Hatred/Prejudice when target is empty or whitespace-only', () => {
      fc.assert(
        fc.property(
          arbTargetType,
          arbEmptyTarget,
          fc.option(fc.integer({ min: -10, max: 100 }), { nil: undefined }),
          (type, target, rating) => {
            const result = validatePsychologyTrait(type, target, rating);
            expect(result).toBe(false);
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
            const result = validatePsychologyTrait('Frenzy', target, rating);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('validation returns true only when type is non-empty AND type-specific requirements are met', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant('' as PsychologyType | ''), arbPsychologyType),
          fc.string({ minLength: 0, maxLength: 50 }),
          fc.option(fc.integer({ min: -10, max: 100 }), { nil: undefined }),
          (type, target, rating) => {
            const result = validatePsychologyTrait(type, target, rating);

            // Compute expected validity
            let expected: boolean;
            if (!type) {
              expected = false;
            } else if (type === 'Fear' || type === 'Terror') {
              expected = rating !== undefined && rating > 0;
            } else if (type === 'Animosity' || type === 'Hatred' || type === 'Prejudice') {
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
