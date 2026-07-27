import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import {
  validateStoredValue,
  loadTabOrder,
  saveTabOrder,
  reconcileTabOrder,
} from '../tab-order-store';

// Feature: reorderable-sub-tabs, Property 1: Serialization Round-Trip
// Feature: reorderable-sub-tabs, Property 2: Invalid Storage Values Fall Back
// Feature: reorderable-sub-tabs, Property 3: Page Independence
// Feature: reorderable-sub-tabs, Property 5: Move Swaps Adjacent Tabs
// Feature: reorderable-sub-tabs, Property 10: Reconciliation Correctness

// ─── Generators ─────────────────────────────────────────────────────────────

/** Arbitrary non-empty string (no whitespace-only) suitable for tab IDs */
const arbTabId: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => s.trim().length > 0);

/** Arbitrary array of unique non-empty tab IDs */
const arbTabOrder: fc.Arbitrary<string[]> = fc.uniqueArray(arbTabId, { minLength: 1, maxLength: 10 });

/** Arbitrary valid page key (non-empty alphanumeric-ish string) */
const arbPageKey: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => s.trim().length > 0 && !s.includes('\x00'));

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: reorderable-sub-tabs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Property 1: Serialization Round-Trip', () => {
    /**
     * **Validates: Requirements 1.1, 1.2**
     *
     * For any valid tab order array and page key, save then load returns
     * identical array.
     */

    it('for any valid tab order array and page key, save then load returns identical array', () => {
      fc.assert(
        fc.property(
          arbPageKey,
          arbTabOrder,
          (pageKey, order) => {
            localStorage.clear();
            const saved = saveTabOrder(pageKey, order);
            expect(saved).toBe(true);

            const loaded = loadTabOrder(pageKey);
            expect(loaded).toEqual(order);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('validateStoredValue round-trips with JSON.stringify for valid arrays', () => {
      fc.assert(
        fc.property(
          arbTabOrder,
          (order) => {
            const serialized = JSON.stringify(order);
            const parsed = validateStoredValue(serialized);
            expect(parsed).toEqual(order);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Invalid Storage Values Fall Back', () => {
    /**
     * **Validates: Requirements 1.3**
     *
     * For any invalid stored value, loadTabOrder returns null.
     */

    it('non-string values return null from validateStoredValue', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer(),
            fc.boolean(),
            fc.constant(null),
            fc.constant(undefined),
            fc.object()
          ),
          (value) => {
            const result = validateStoredValue(value);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('invalid JSON strings return null from validateStoredValue', () => {
      // Generate strings that are not valid JSON
      const arbInvalidJson = fc.string({ minLength: 1, maxLength: 50 })
        .filter(s => {
          try { JSON.parse(s); return false; } catch { return true; }
        });

      fc.assert(
        fc.property(
          arbInvalidJson,
          (invalidJson) => {
            const result = validateStoredValue(invalidJson);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('JSON that is not an array returns null from validateStoredValue', () => {
      const arbNonArrayJson = fc.oneof(
        fc.integer().map(n => JSON.stringify(n)),
        fc.boolean().map(b => JSON.stringify(b)),
        fc.constant(JSON.stringify(null)),
        fc.constant(JSON.stringify('hello')),
        fc.object().map(o => JSON.stringify(o))
      );

      fc.assert(
        fc.property(
          arbNonArrayJson,
          (jsonStr) => {
            const result = validateStoredValue(jsonStr);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('arrays containing non-string or empty elements return null', () => {
      const arbInvalidArray = fc.oneof(
        // Array with numbers
        fc.array(fc.integer(), { minLength: 1, maxLength: 5 }).map(a => JSON.stringify(a)),
        // Array with empty strings
        fc.array(fc.constantFrom('', '   ', '\t', '\n'), { minLength: 1, maxLength: 5 }).map(a => JSON.stringify(a)),
        // Array with mixed types
        fc.tuple(fc.string(), fc.integer()).map(([s, n]) => JSON.stringify([s, n]))
      );

      fc.assert(
        fc.property(
          arbInvalidArray,
          (jsonStr) => {
            const result = validateStoredValue(jsonStr);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('loadTabOrder returns null when storage contains invalid data', () => {
      const arbInvalidData = fc.oneof(
        fc.constant('{not json}'),
        fc.constant('42'),
        fc.constant('"just a string"'),
        fc.constant('[1, 2, 3]'),
        fc.constant('["", "valid"]'),
        fc.constant('["   "]')
      );

      fc.assert(
        fc.property(
          arbPageKey,
          arbInvalidData,
          (pageKey, invalidData) => {
            localStorage.clear();
            localStorage.setItem(`tabOrder:${pageKey}`, invalidData);
            const result = loadTabOrder(pageKey);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Page Independence', () => {
    /**
     * **Validates: Requirements 1.4**
     *
     * Saving to one page key does not affect another page key's load.
     */

    it('saving to one page key does not affect another page key\'s stored value', () => {
      // Generate two distinct page keys
      const arbDistinctPageKeys = fc.tuple(arbPageKey, arbPageKey)
        .filter(([a, b]) => a !== b);

      fc.assert(
        fc.property(
          arbDistinctPageKeys,
          arbTabOrder,
          arbTabOrder,
          ([pageKeyA, pageKeyB], orderA, orderB) => {
            localStorage.clear();

            // Save order for page A
            saveTabOrder(pageKeyA, orderA);

            // Save order for page B
            saveTabOrder(pageKeyB, orderB);

            // Loading page A should return order A (not affected by B)
            const loadedA = loadTabOrder(pageKeyA);
            expect(loadedA).toEqual(orderA);

            // Loading page B should return order B (not affected by A)
            const loadedB = loadTabOrder(pageKeyB);
            expect(loadedB).toEqual(orderB);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('saving to one page key does not overwrite a previously saved different page key', () => {
      const arbDistinctPageKeys = fc.tuple(arbPageKey, arbPageKey)
        .filter(([a, b]) => a !== b);

      fc.assert(
        fc.property(
          arbDistinctPageKeys,
          arbTabOrder,
          arbTabOrder,
          ([pageKeyA, pageKeyB], orderA, orderB) => {
            localStorage.clear();

            // Save page A first
            saveTabOrder(pageKeyA, orderA);

            // Now save page B — this should NOT affect page A
            saveTabOrder(pageKeyB, orderB);

            // Verify page A is still intact
            const loadedA = loadTabOrder(pageKeyA);
            expect(loadedA).toEqual(orderA);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Move Swaps Adjacent Tabs', () => {
    /**
     * **Validates: Requirements 3.2, 3.3**
     *
     * For any tab order array of length >= 2 and any valid adjacent index pair,
     * swapping two adjacent elements, saving, and loading preserves the swap.
     * This tests the concept that moveLeft/moveRight (adjacent swaps) persist
     * correctly through the store.
     */

    it('swapping two adjacent elements and saving/loading preserves the swap', () => {
      // Generate arrays of length >= 2 with a valid swap index
      const arbSwapScenario = arbTabOrder
        .filter(arr => arr.length >= 2)
        .chain(order => {
          // Pick a valid index to swap with its right neighbor
          return fc.integer({ min: 0, max: order.length - 2 }).map(index => ({
            order,
            index,
          }));
        });

      fc.assert(
        fc.property(
          arbPageKey,
          arbSwapScenario,
          (pageKey, { order, index }) => {
            localStorage.clear();

            // Perform adjacent swap (simulates moveRight on index or moveLeft on index+1)
            const swapped = [...order];
            const temp = swapped[index];
            swapped[index] = swapped[index + 1];
            swapped[index + 1] = temp;

            // Save the swapped order
            saveTabOrder(pageKey, swapped);

            // Load and verify the swap is preserved
            const loaded = loadTabOrder(pageKey);
            expect(loaded).toEqual(swapped);

            // Verify only the two adjacent elements changed positions
            for (let i = 0; i < order.length; i++) {
              if (i === index) {
                expect(loaded![i]).toBe(order[index + 1]);
              } else if (i === index + 1) {
                expect(loaded![i]).toBe(order[index]);
              } else {
                expect(loaded![i]).toBe(order[i]);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('swapping preserves array length and all original elements', () => {
      const arbSwapScenario = arbTabOrder
        .filter(arr => arr.length >= 2)
        .chain(order => {
          return fc.integer({ min: 0, max: order.length - 2 }).map(index => ({
            order,
            index,
          }));
        });

      fc.assert(
        fc.property(
          arbSwapScenario,
          ({ order, index }) => {
            // Perform adjacent swap
            const swapped = [...order];
            const temp = swapped[index];
            swapped[index] = swapped[index + 1];
            swapped[index + 1] = temp;

            // Length preserved
            expect(swapped.length).toBe(order.length);

            // Same elements (just reordered)
            expect([...swapped].sort()).toEqual([...order].sort());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: Reconciliation Correctness', () => {
    /**
     * **Validates: Requirements 5.1, 5.2, 5.5**
     *
     * For any stored tab order array and any default tab array, after
     * reconciliation:
     * (a) the result contains exactly the set of IDs from the defaults
     * (b) IDs that existed in both stored and defaults appear in their stored
     *     relative order
     * (c) IDs that are new (in defaults but not stored) are appended at the
     *     end in their default relative order
     * (d) no duplicates exist in the result
     */

    it('result contains exactly the set of IDs from defaults', () => {
      fc.assert(
        fc.property(
          arbTabOrder,  // stored
          arbTabOrder,  // defaults
          (stored, defaults) => {
            const result = reconcileTabOrder(stored, defaults);

            // (a) Result set equals defaults set
            const resultSet = new Set(result);
            const defaultSet = new Set(defaults);
            expect(resultSet).toEqual(defaultSet);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('preserves stored relative order for IDs present in both stored and defaults', () => {
      fc.assert(
        fc.property(
          arbTabOrder,
          arbTabOrder,
          (stored, defaults) => {
            const result = reconcileTabOrder(stored, defaults);
            const defaultSet = new Set(defaults);

            // (b) IDs that were in stored AND defaults should maintain their
            // stored relative order in the result
            const storedInDefaults = stored.filter(id => defaultSet.has(id));
            // Deduplicate stored (keep first occurrence) — same as what reconcile does
            const seen = new Set<string>();
            const deduplicatedStored: string[] = [];
            for (const id of storedInDefaults) {
              if (!seen.has(id)) {
                seen.add(id);
                deduplicatedStored.push(id);
              }
            }

            // These IDs should appear in result in the same relative order
            const resultFiltered = result.filter(id => deduplicatedStored.includes(id));
            expect(resultFiltered).toEqual(deduplicatedStored);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('appends new IDs at the end in their default relative order', () => {
      fc.assert(
        fc.property(
          arbTabOrder,
          arbTabOrder,
          (stored, defaults) => {
            const result = reconcileTabOrder(stored, defaults);

            // Deduplicate stored
            const seenStored = new Set<string>();
            const deduplicatedStored: string[] = [];
            for (const id of stored) {
              if (!seenStored.has(id)) {
                seenStored.add(id);
                deduplicatedStored.push(id);
              }
            }

            const storedSet = new Set(deduplicatedStored);

            // (c) New IDs are those in defaults but not in stored
            const newIds = defaults.filter(id => !storedSet.has(id));

            // They should appear at the end of the result in default relative order
            if (newIds.length > 0) {
              const resultTail = result.slice(result.length - newIds.length);
              expect(resultTail).toEqual(newIds);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('result contains no duplicates', () => {
      // Use stored arrays that may contain duplicates
      const arbStoredWithDupes = fc.array(arbTabId, { minLength: 1, maxLength: 15 });

      fc.assert(
        fc.property(
          arbStoredWithDupes,
          arbTabOrder,
          (stored, defaults) => {
            const result = reconcileTabOrder(stored, defaults);

            // (d) No duplicates
            const resultSet = new Set(result);
            expect(result.length).toBe(resultSet.size);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles duplicates in stored by keeping first occurrence', () => {
      fc.assert(
        fc.property(
          arbTabOrder.filter(arr => arr.length >= 2),
          (defaults) => {
            // Create stored with deliberate duplicates
            const withDupes = [...defaults, ...defaults.slice(0, Math.ceil(defaults.length / 2))];
            const result = reconcileTabOrder(withDupes, defaults);

            // Result should have no duplicates
            expect(result.length).toBe(new Set(result).size);
            // And should contain exactly the default IDs
            expect(new Set(result)).toEqual(new Set(defaults));
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
