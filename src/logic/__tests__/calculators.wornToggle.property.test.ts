import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calculateArmourPointsUnified } from '../calculators';
import type { APResult } from '../calculators';
import { computeArchives3LocationAP, type LocationKey } from '../armourLayering';
import type { ArmourItem } from '../../types/character';

// Feature: armour-worn-toggle, Property 4: AP calculation uses only worn items

// ─── Generators ─────────────────────────────────────────────────────────────

/** Valid singular location keywords that parseLocations recognizes. */
const LOCATION_KEYWORDS = ['Head', 'Body', 'Arms', 'Legs'] as const;

/**
 * Generate a locations string from 1-4 distinct keywords, comma-separated.
 */
const arbLocationsString: fc.Arbitrary<string> = fc
  .subarray([...LOCATION_KEYWORDS], { minLength: 1, maxLength: 4 })
  .map(keywords => keywords.join(', '));

/**
 * Generate a worn state: true, false, or undefined (to test legacy items).
 */
const arbWornState: fc.Arbitrary<boolean | undefined> = fc.oneof(
  fc.constant(true),
  fc.constant(false),
  fc.constant(undefined)
);

/**
 * Generate a single armour item with a random worn state.
 * No runes to keep the test focused on worn filtering logic.
 */
const arbArmourItem: fc.Arbitrary<ArmourItem> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  locations: arbLocationsString,
  enc: fc.constantFrom('0', '1', '2', '3'),
  ap: fc.integer({ min: 0, max: 10 }),
  qualities: fc.constantFrom('', 'Flexible'),
  worn: arbWornState,
  runes: fc.constant([] as string[]),
});

/**
 * Generate a list of 1-8 armour items with mixed worn states.
 */
const arbArmourList: fc.Arbitrary<ArmourItem[]> = fc.array(arbArmourItem, { minLength: 1, maxLength: 8 });

// ─── Helpers ────────────────────────────────────────────────────────────────

/** All AP location keys from APResult (excluding shield). */
const ALL_LOCATIONS: (keyof Omit<APResult, 'shield'>)[] = [
  'head', 'leftArm', 'rightArm', 'body', 'leftLeg', 'rightLeg',
];

/** Map an APResult key to the armourLayering LocationKey. */
const AP_KEY_TO_LOCATION: Record<keyof Omit<APResult, 'shield'>, LocationKey> = {
  head: 'head',
  leftArm: 'lArm',
  rightArm: 'rArm',
  body: 'body',
  leftLeg: 'lLeg',
  rightLeg: 'rLeg',
};

/**
 * Compute expected AP for a single location using the Archives III combining
 * rules — the same logic the function under test uses. This property verifies
 * worn-filtering behaviour, not the stacking model itself.
 */
function expectedAPForLocation(items: ArmourItem[], location: keyof Omit<APResult, 'shield'>): number {
  return computeArchives3LocationAP(items, AP_KEY_TO_LOCATION[location], (i) => i.ap).total;
}

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: armour-worn-toggle, Property 4: AP calculation uses only worn items', () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.3**
   *
   * For any list of armour items with mixed worn states, the AP computed per
   * body location SHALL equal the AP computed from only the subset of items
   * where worn !== false, using the standard stacking rules.
   */
  it('AP per location with filterByWorn equals AP of only the worn subset', () => {
    fc.assert(
      fc.property(
        arbArmourList,
        (armourItems) => {
          // Compute AP using the function under test with filterByWorn enabled
          const actual = calculateArmourPointsUnified(armourItems, { filterByWorn: true });

          // Compute expected AP from only the worn subset (worn !== false)
          const wornOnly = armourItems.filter(item => item.worn !== false);

          for (const loc of ALL_LOCATIONS) {
            const expected = expectedAPForLocation(wornOnly, loc);
            expect(actual[loc]).toBe(expected);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('unworn items never contribute AP — removing them does not change the result', () => {
    fc.assert(
      fc.property(
        arbArmourList,
        (armourItems) => {
          // Compute with filterByWorn on full list
          const withAll = calculateArmourPointsUnified(armourItems, { filterByWorn: true });

          // Compute without filterByWorn on only the worn subset
          const wornOnly = armourItems.filter(item => item.worn !== false);
          const withWornSubset = calculateArmourPointsUnified(wornOnly, { filterByWorn: false });

          for (const loc of ALL_LOCATIONS) {
            expect(withAll[loc]).toBe(withWornSubset[loc]);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('toggling an item to unworn never increases AP at any location', () => {
    fc.assert(
      fc.property(
        arbArmourList,
        fc.integer({ min: 0, max: 7 }),
        (armourItems, toggleIdx) => {
          // Pick a valid index
          const idx = toggleIdx % armourItems.length;
          const item = armourItems[idx];

          // Skip if already unworn (toggling to worn could increase AP, which is correct)
          if (item.worn === false) return;

          // Compute AP with item worn
          const before = calculateArmourPointsUnified(armourItems, { filterByWorn: true });

          // Toggle item to unworn
          const modified = [...armourItems];
          modified[idx] = { ...item, worn: false };
          const after = calculateArmourPointsUnified(modified, { filterByWorn: true });

          for (const loc of ALL_LOCATIONS) {
            expect(after[loc]).toBeLessThanOrEqual(before[loc]);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
