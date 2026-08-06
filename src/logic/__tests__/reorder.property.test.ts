import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { reorderArray } from '../reorder';

// Feature: quality-of-life-improvements, Property 5: Array Reorder Preserves Elements
// **Validates: Requirements 4.3, 4.4**

describe('Property 5: Array Reorder Preserves Elements', () => {
  /** Generate an array of unique integers (length 1–20) with valid fromIndex and toIndex */
  const arrayWithValidIndices = fc
    .array(fc.integer(), { minLength: 2, maxLength: 20 })
    .chain((arr) =>
      fc.record({
        arr: fc.constant(arr),
        fromIndex: fc.integer({ min: 0, max: arr.length - 1 }),
        toIndex: fc.integer({ min: 0, max: arr.length - 1 }),
      })
    );

  it('result is a permutation containing exactly the same elements (same multiset)', () => {
    fc.assert(
      fc.property(arrayWithValidIndices, ({ arr, fromIndex, toIndex }) => {
        const result = reorderArray(arr, fromIndex, toIndex);

        // Same length
        expect(result).toHaveLength(arr.length);

        // Same elements (as multiset) — sort copies and compare
        const sortedOriginal = [...arr].sort((a, b) => a - b);
        const sortedResult = [...result].sort((a, b) => a - b);
        expect(sortedResult).toEqual(sortedOriginal);
      }),
      { numRuns: 100 }
    );
  });

  it('the moved element is at the target index', () => {
    fc.assert(
      fc.property(
        arrayWithValidIndices.filter(({ fromIndex, toIndex }) => fromIndex !== toIndex),
        ({ arr, fromIndex, toIndex }) => {
          const result = reorderArray(arr, fromIndex, toIndex);
          expect(result[toIndex]).toBe(arr[fromIndex]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all other elements maintain their relative order', () => {
    fc.assert(
      fc.property(
        arrayWithValidIndices.filter(({ fromIndex, toIndex }) => fromIndex !== toIndex),
        ({ arr, fromIndex, toIndex }) => {
          const result = reorderArray(arr, fromIndex, toIndex);

          // Elements that were NOT at fromIndex, in their original order
          const originalWithout = arr.filter((_, i) => i !== fromIndex);
          // Elements in result that are NOT the moved item at toIndex
          const resultWithout = result.filter((_, i) => i !== toIndex);

          expect(resultWithout).toEqual(originalWithout);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns original array unchanged for invalid indices (negative)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 1, maxLength: 20 }),
        fc.integer({ max: -1 }),
        fc.integer({ min: 0, max: 19 }),
        (arr, negIndex, validIndex) => {
          // Negative fromIndex
          expect(reorderArray(arr, negIndex, validIndex)).toBe(arr);
          // Negative toIndex
          expect(reorderArray(arr, validIndex, negIndex)).toBe(arr);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns original array unchanged for invalid indices (>= arr.length)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 1, maxLength: 20 }),
        (arr) => {
          const outOfBounds = arr.length;
          // fromIndex out of bounds
          expect(reorderArray(arr, outOfBounds, 0)).toBe(arr);
          // toIndex out of bounds
          expect(reorderArray(arr, 0, outOfBounds)).toBe(arr);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns original array unchanged when fromIndex === toIndex', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 1, maxLength: 20 }).chain((arr) =>
          fc.record({
            arr: fc.constant(arr),
            index: fc.integer({ min: 0, max: arr.length - 1 }),
          })
        ),
        ({ arr, index }) => {
          expect(reorderArray(arr, index, index)).toBe(arr);
        }
      ),
      { numRuns: 100 }
    );
  });
});
