import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { removeAtIndex, restoreAtIndex } from '../undo';

// Feature: ux-improvements, Property 4: Undo restores item at original index
// **Validates: Requirements 4.2**

describe('Property 4: Undo restores item at original index', () => {
  it('for any non-empty array and valid index, remove then restore produces the original array', () => {
    // Generate a non-empty array of arbitrary values and a valid index within bounds
    const arbitraryListAndIndex = fc
      .array(fc.anything(), { minLength: 1, maxLength: 50 })
      .chain((list) =>
        fc.tuple(
          fc.constant(list),
          fc.integer({ min: 0, max: list.length - 1 })
        )
      );

    fc.assert(
      fc.property(arbitraryListAndIndex, ([list, index]) => {
        const item = list[index];
        const afterRemoval = removeAtIndex(list, index);
        const afterRestore = restoreAtIndex(afterRemoval, item, index);

        // The restored list must be deeply equal to the original
        expect(afterRestore).toEqual(list);
      }),
      { numRuns: 100 }
    );
  });

  it('for any non-empty array and valid index, removal reduces length by 1 and restore increases it back', () => {
    const arbitraryListAndIndex = fc
      .array(fc.integer(), { minLength: 1, maxLength: 50 })
      .chain((list) =>
        fc.tuple(
          fc.constant(list),
          fc.integer({ min: 0, max: list.length - 1 })
        )
      );

    fc.assert(
      fc.property(arbitraryListAndIndex, ([list, index]) => {
        const item = list[index];
        const afterRemoval = removeAtIndex(list, index);

        expect(afterRemoval).toHaveLength(list.length - 1);

        const afterRestore = restoreAtIndex(afterRemoval, item, index);

        expect(afterRestore).toHaveLength(list.length);
      }),
      { numRuns: 100 }
    );
  });
});
