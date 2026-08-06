import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getEncumbranceLevel } from '../encumbrance';

// Feature: quality-of-life-improvements, Property 9: Encumbrance Level Classification
// **Validates: Requirements 7.2, 7.3, 7.4, 7.5**

describe('Property 9: Encumbrance Level Classification', () => {
  it('returns "neutral" when ratio < 0.5', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }).chain((max) =>
          fc.record({
            current: fc.integer({ min: 0, max: Math.ceil(max * 0.5) - 1 }),
            max: fc.constant(max),
          })
        ),
        ({ current, max }) => {
          const ratio = current / max;
          // Only test when ratio is truly < 0.5
          if (ratio < 0.5) {
            expect(getEncumbranceLevel(current, max)).toBe('neutral');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns "warning" when 0.5 <= ratio < 0.75', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }).chain((max) => {
          const minCurrent = Math.ceil(max * 0.5);
          const maxCurrent = Math.ceil(max * 0.75) - 1;
          return fc.record({
            current: fc.integer({ min: minCurrent, max: Math.max(minCurrent, maxCurrent) }),
            max: fc.constant(max),
          });
        }),
        ({ current, max }) => {
          const ratio = current / max;
          if (ratio >= 0.5 && ratio < 0.75) {
            expect(getEncumbranceLevel(current, max)).toBe('warning');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns "danger" when 0.75 <= ratio < 1.0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }).chain((max) => {
          const minCurrent = Math.ceil(max * 0.75);
          const maxCurrent = max - 1;
          return fc.record({
            current: fc.integer({ min: minCurrent, max: Math.max(minCurrent, maxCurrent) }),
            max: fc.constant(max),
          });
        }),
        ({ current, max }) => {
          const ratio = current / max;
          if (ratio >= 0.75 && ratio < 1.0) {
            expect(getEncumbranceLevel(current, max)).toBe('danger');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns "critical" when ratio >= 1.0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }).chain((max) =>
          fc.record({
            current: fc.integer({ min: max, max: max + 1000 }),
            max: fc.constant(max),
          })
        ),
        ({ current, max }) => {
          expect(getEncumbranceLevel(current, max)).toBe('critical');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('correctly classifies any non-negative current and positive max per threshold rules', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        (current, max) => {
          const ratio = current / max;
          const level = getEncumbranceLevel(current, max);

          if (ratio < 0.5) {
            expect(level).toBe('neutral');
          } else if (ratio < 0.75) {
            expect(level).toBe('warning');
          } else if (ratio < 1.0) {
            expect(level).toBe('danger');
          } else {
            expect(level).toBe('critical');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handles exact boundary at 50% (inclusive for warning)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        (half) => {
          // current = half, max = half * 2 → ratio is exactly 0.5
          const current = half;
          const max = half * 2;
          expect(getEncumbranceLevel(current, max)).toBe('warning');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handles exact boundary at 75% (inclusive for danger)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 333 }),
        (quarter) => {
          // current = quarter * 3, max = quarter * 4 → ratio is exactly 0.75
          const current = quarter * 3;
          const max = quarter * 4;
          expect(getEncumbranceLevel(current, max)).toBe('danger');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handles exact boundary at 100% (inclusive for critical)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (value) => {
          // current === max → ratio is exactly 1.0
          expect(getEncumbranceLevel(value, value)).toBe('critical');
        }
      ),
      { numRuns: 100 }
    );
  });
});
