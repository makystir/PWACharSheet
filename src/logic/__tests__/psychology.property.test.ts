import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validatePsychologyTrait, removePsychologyTrait, isPhobiaAlertActive } from '../psychology';
import type { PsychologyType, PsychologyTrait } from '../../types/character';

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


// ─── Feature: archives-vol2-integration ─────────────────────────────────────

describe('Feature: archives-vol2-integration, Property 5: Removing a psychology entry decreases list length', () => {
  /**
   * **Validates: Requirements 12.5**
   *
   * For any non-empty list of PsychologyTrait entries and any valid index within
   * that list, removing the entry at that index SHALL result in a list that is
   * shorter by exactly 1 and does not contain the removed entry's id.
   */

  const arbPsychType: fc.Arbitrary<PsychologyType> = fc.constantFrom(
    'Animosity', 'Hatred', 'Fear', 'Terror', 'Frenzy', 'Prejudice'
  );

  const arbTrait: fc.Arbitrary<PsychologyTrait> = fc.record({
    id: fc.uuid(),
    type: arbPsychType,
    target: fc.string({ minLength: 0, maxLength: 30 }),
    rating: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
  });

  const arbNonEmptyTraitList: fc.Arbitrary<PsychologyTrait[]> = fc.array(arbTrait, { minLength: 1, maxLength: 20 });

  it('removing an entry by id decreases list length by exactly 1 and removes that id', () => {
    fc.assert(
      fc.property(
        arbNonEmptyTraitList,
        (traits) => {
          // Pick a valid index
          const index = Math.floor(Math.random() * traits.length);
          const targetId = traits[index].id;
          const result = removePsychologyTrait(traits, targetId);

          // Count how many entries had this id in the original list
          const countWithId = traits.filter(t => t.id === targetId).length;

          // Result should be shorter by the number of entries with that id
          expect(result.length).toBe(traits.length - countWithId);
          // Result should not contain the removed id
          expect(result.some(t => t.id === targetId)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('removing an entry preserves all other entries in order', () => {
    fc.assert(
      fc.property(
        arbNonEmptyTraitList,
        (traits) => {
          const index = Math.floor(Math.random() * traits.length);
          const targetId = traits[index].id;
          const result = removePsychologyTrait(traits, targetId);

          // All entries in result should be from original list (excluding removed id)
          const expected = traits.filter(t => t.id !== targetId);
          expect(result).toEqual(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: archives-vol2-integration, Property 6: Broken tally threshold alert triggers correctly', () => {
  /**
   * **Validates: Requirements 12.7**
   *
   * For any WP characteristic value (1–99) and any brokenTally value (0–99),
   * the phobia acquisition alert SHALL be active if and only if brokenTally >= WP.
   */

  it('alert is active if and only if brokenTally >= WP', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 99 }),
        fc.integer({ min: 0, max: 99 }),
        (wp, brokenTally) => {
          const alertActive = isPhobiaAlertActive(brokenTally, wp);
          const expected = brokenTally >= wp;
          expect(alertActive).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('alert is never active when brokenTally is 0 and WP is at least 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 99 }),
        (wp) => {
          expect(isPhobiaAlertActive(0, wp)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('alert is always active when brokenTally equals WP', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 99 }),
        (wp) => {
          expect(isPhobiaAlertActive(wp, wp)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: unified-psychology-panel, Property 3: Phobia alert biconditional
describe('Feature: unified-psychology-panel, Property 3: Phobia alert biconditional', () => {
  /**
   * **Validates: Requirements 3.3, 3.4**
   *
   * For any non-negative brokenTally and positive wpValue,
   * isPhobiaAlertActive(brokenTally, wpValue) SHALL return true
   * if and only if brokenTally >= wpValue.
   */

  it('returns true iff brokenTally >= wpValue for arbitrary non-negative tally and positive WP', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 1, max: 10000 }),
        (brokenTally, wpValue) => {
          const result = isPhobiaAlertActive(brokenTally, wpValue);
          const expected = brokenTally >= wpValue;
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('alert is inactive when brokenTally is strictly less than wpValue', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        (wpValue) => {
          // brokenTally is always less than wpValue
          const brokenTally = fc.sample(fc.integer({ min: 0, max: wpValue - 1 }), 1)[0];
          expect(isPhobiaAlertActive(brokenTally, wpValue)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('alert is active when brokenTally equals wpValue (boundary)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        (wpValue) => {
          expect(isPhobiaAlertActive(wpValue, wpValue)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('alert is active when brokenTally exceeds wpValue', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 10000 }),
        (wpValue, excess) => {
          const brokenTally = wpValue + excess;
          expect(isPhobiaAlertActive(brokenTally, wpValue)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
