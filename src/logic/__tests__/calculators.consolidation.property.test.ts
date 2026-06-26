import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calculateArmourPointsUnified, computeAPByLocation, calculateArmourPoints, syncWoundFields, computeWoundMaximum } from '../calculators';
import type { APByLocation } from '../calculators';
import type { ArmourItem, ArmourPoints, Character } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';

// Feature: app-cleanup-and-optimization, Property 1: Unified AP function equivalence (worn filter)

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
 * Generate a single armour item with arbitrary worn status.
 * Uses empty runes to keep the test focused on the worn-filter equivalence.
 */
const arbArmourItem: fc.Arbitrary<ArmourItem> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  locations: arbLocationsString,
  enc: fc.constantFrom('0', '1', '2', '3'),
  ap: fc.integer({ min: 0, max: 10 }),
  qualities: fc.constantFrom('', 'Flexible'),
  worn: fc.boolean(),
  runes: fc.constant([] as string[]),
});

/**
 * Generate a list of armour items (0-8 items) with mixed worn status.
 */
const arbArmourList: fc.Arbitrary<ArmourItem[]> = fc.array(arbArmourItem, {
  minLength: 0,
  maxLength: 8,
});

// ─── Property Tests ─────────────────────────────────────────────────────────

/** All six body location keys in APByLocation. */
const ALL_LOCATIONS: (keyof APByLocation)[] = [
  'head',
  'leftArm',
  'rightArm',
  'body',
  'leftLeg',
  'rightLeg',
];

describe('Feature: app-cleanup-and-optimization', () => {
  describe('Property 1: Unified AP function equivalence (worn filter)', () => {
    /**
     * **Validates: Requirements 3.1, 3.3**
     *
     * For any list of armour items, calling calculateArmourPointsUnified with
     * filterByWorn: true SHALL produce AP values per location equivalent to
     * the legacy computeAPByLocation output for all six body locations.
     */
    it('calculateArmourPointsUnified with filterByWorn matches computeAPByLocation for all locations', () => {
      fc.assert(
        fc.property(arbArmourList, (armourItems) => {
          const unified = calculateArmourPointsUnified(armourItems, { filterByWorn: true });
          const legacy = computeAPByLocation(armourItems);

          for (const loc of ALL_LOCATIONS) {
            expect(unified[loc]).toBe(legacy[loc]);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  // Feature: app-cleanup-and-optimization, Property 2: Unified AP function equivalence (all items)

  describe('Property 2: Unified AP function equivalence (all items)', () => {
    /**
     * **Validates: Requirements 3.1, 3.4**
     *
     * For any list of armour items, calling calculateArmourPointsUnified with
     * filterByWorn: false SHALL produce AP values per location equivalent to
     * the legacy calculateArmourPoints output for all six body locations.
     */
    it('calculateArmourPointsUnified with filterByWorn: false matches calculateArmourPoints for all locations', () => {
      fc.assert(
        fc.property(arbArmourList, (armourItems) => {
          const unified = calculateArmourPointsUnified(armourItems, { filterByWorn: false });
          const legacy = calculateArmourPoints(armourItems);

          // Map between unified (human-readable) keys and legacy (short) keys
          expect(unified.head).toBe(legacy.head);
          expect(unified.leftArm).toBe(legacy.lArm);
          expect(unified.rightArm).toBe(legacy.rArm);
          expect(unified.body).toBe(legacy.body);
          expect(unified.leftLeg).toBe(legacy.lLeg);
          expect(unified.rightLeg).toBe(legacy.rLeg);
        }),
        { numRuns: 100 }
      );
    });
  });

  // Feature: app-cleanup-and-optimization, Property 3: Wound calculation consistency

  describe('Property 3: Wound calculation consistency', () => {
    /**
     * **Validates: Requirements 3.2, 3.3**
     *
     * For any set of characteristic values (S, T, WP each in [0, 99]),
     * hardy level in [0, 5], and woundsUseSB flag, syncWoundFields applied
     * to a character with those characteristics SHALL produce wound component
     * fields (wSB, wTB2, wWPB, wHardy) whose sum equals computeWoundMaximum
     * called with the same raw values (with woundsUseSB=true).
     *
     * Note: syncWoundFields always stores the raw SB (as if woundsUseSB=true),
     * so the sum of wound fields equals computeWoundMaximum(..., true).total.
     */
    it('syncWoundFields wound components sum equals computeWoundMaximum total', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 99 }), // S
          fc.integer({ min: 0, max: 99 }), // T
          fc.integer({ min: 0, max: 99 }), // WP
          fc.integer({ min: 0, max: 5 }),  // hardyLevel
          fc.boolean(),                     // woundsUseSB
          (S, T, WP, hardyLevel, woundsUseSB) => {
            // Build a character with the generated characteristic values
            const character: Character = {
              ...structuredClone(BLANK_CHARACTER),
              woundsUseSB,
              chars: {
                ...BLANK_CHARACTER.chars,
                S: { i: S, a: 0, b: 0 },
                T: { i: T, a: 0, b: 0 },
                WP: { i: WP, a: 0, b: 0 },
              },
            };

            // Apply syncWoundFields
            const result = syncWoundFields(character, hardyLevel);

            // Sum of wound component fields
            const fieldSum = result.wSB + result.wTB2 + result.wWPB + result.wHardy;

            // computeWoundMaximum with woundsUseSB=true (syncWoundFields always stores raw SB)
            const expected = computeWoundMaximum(S, T, WP, hardyLevel, true);

            expect(fieldSum).toBe(expected.total);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
