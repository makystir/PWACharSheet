import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { decrementConditionDurations } from '../condition-duration';
import type { Condition } from '../../types/character';

// Feature: quality-of-life-improvements, Property 8: Condition Duration Decrement Correctness
// **Validates: Requirements 6.1, 6.5, 6.6**

/**
 * Generator for condition duration values with varying types:
 * - undefined (no duration)
 * - empty string
 * - non-numeric strings (e.g., "permanent", "abc")
 * - "0" (zero)
 * - negative integer strings (e.g., "-1", "-5")
 * - positive integer strings (e.g., "1", "2", "10")
 */
const arbDuration: fc.Arbitrary<string | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.constant(''),
  fc.constantFrom('permanent', 'abc', 'until rest', '1.5', '2e3', ' '),
  fc.constant('0'),
  fc.integer({ min: -10, max: -1 }).map(String),
  fc.integer({ min: 1, max: 10 }).map(String)
);

/** Generator for a single Condition */
const arbCondition: fc.Arbitrary<Condition> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  level: fc.integer({ min: 1, max: 5 }),
  duration: arbDuration,
  source: fc.option(fc.string({ minLength: 1, maxLength: 15 }), { nil: undefined }),
});

/** Generator for an array of conditions */
const arbConditions: fc.Arbitrary<Condition[]> = fc.array(arbCondition, { minLength: 0, maxLength: 15 });

describe('Property 8: Condition Duration Decrement Correctness', () => {
  it('conditions with positive integer durations are decremented by 1', () => {
    fc.assert(
      fc.property(arbConditions, (conditions) => {
        const result = decrementConditionDurations(conditions);

        for (let i = 0; i < conditions.length; i++) {
          const original = conditions[i];
          const updated = result.conditions[i];

          if (
            original.duration !== undefined &&
            original.duration !== '' &&
            !isNaN(parseInt(original.duration, 10)) &&
            String(parseInt(original.duration, 10)) === original.duration.trim() &&
            parseInt(original.duration, 10) > 0
          ) {
            const expectedDuration = parseInt(original.duration, 10) - 1;
            expect(updated.duration).toBe(String(expectedDuration));
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('conditions with no duration, non-numeric duration, or non-positive duration are unchanged', () => {
    fc.assert(
      fc.property(arbConditions, (conditions) => {
        const result = decrementConditionDurations(conditions);

        for (let i = 0; i < conditions.length; i++) {
          const original = conditions[i];
          const updated = result.conditions[i];

          const parsed = original.duration !== undefined && original.duration !== ''
            ? parseInt(original.duration, 10)
            : NaN;

          const isPositiveInt =
            !isNaN(parsed) &&
            original.duration !== undefined &&
            String(parsed) === original.duration.trim() &&
            parsed > 0;

          if (!isPositiveInt) {
            // Should be completely unchanged
            expect(updated.name).toBe(original.name);
            expect(updated.level).toBe(original.level);
            expect(updated.duration).toBe(original.duration);
            expect(updated.source).toBe(original.source);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('expiredNames contains exactly the names of conditions whose duration went from 1 to 0', () => {
    fc.assert(
      fc.property(arbConditions, (conditions) => {
        const result = decrementConditionDurations(conditions);

        // Compute expected expired names: conditions with duration "1"
        const expectedExpired = conditions
          .filter((c) => c.duration === '1')
          .map((c) => c.name);

        expect(result.expiredNames).toEqual(expectedExpired);
      }),
      { numRuns: 100 }
    );
  });

  it('output conditions array has the same length as input', () => {
    fc.assert(
      fc.property(arbConditions, (conditions) => {
        const result = decrementConditionDurations(conditions);
        expect(result.conditions).toHaveLength(conditions.length);
      }),
      { numRuns: 100 }
    );
  });
});
