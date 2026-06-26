import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeAPByLocation } from '../calculators';
import type { ArmourItem } from '../../types/character';
import type { APByLocation } from '../calculators';

// Feature: ux-polish-and-functionality, Property 8: AP Computation Invariant

// ─── Generators ─────────────────────────────────────────────────────────────

/** Valid singular location keywords that parseLocations recognizes. */
const LOCATION_KEYWORDS = ['Head', 'Body', 'Arms', 'Legs'] as const;

/** Map from keyword to the body locations it covers in APByLocation keys. */
const KEYWORD_TO_AP_LOCATIONS: Record<string, (keyof APByLocation)[]> = {
  Head: ['head'],
  Body: ['body'],
  Arms: ['leftArm', 'rightArm'],
  Legs: ['leftLeg', 'rightLeg'],
};

/**
 * Generate a locations string from 1-4 distinct keywords, comma-separated.
 */
const arbLocationsString: fc.Arbitrary<string> = fc
  .subarray([...LOCATION_KEYWORDS], { minLength: 1, maxLength: 4 })
  .map(keywords => keywords.join(', '));

/**
 * Generate a single armour item (always worn, no runes for simplicity).
 */
const arbArmourItem: fc.Arbitrary<ArmourItem> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  locations: arbLocationsString,
  enc: fc.constantFrom('0', '1', '2', '3'),
  ap: fc.integer({ min: 0, max: 10 }),
  qualities: fc.constantFrom('', 'Flexible'),
  worn: fc.constant(true as const),
  runes: fc.constant([] as string[]),
});

/**
 * Generate a list of armour items (0-8 items).
 */
const arbArmourList: fc.Arbitrary<ArmourItem[]> = fc.array(arbArmourItem, { minLength: 0, maxLength: 8 });

/**
 * Generate a mixed list including some non-worn items.
 */
const arbMixedArmourItem: fc.Arbitrary<ArmourItem> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  locations: arbLocationsString,
  enc: fc.constantFrom('0', '1', '2', '3'),
  ap: fc.integer({ min: 0, max: 10 }),
  qualities: fc.constantFrom('', 'Flexible'),
  worn: fc.boolean(),
  runes: fc.constant([] as string[]),
});

const arbMixedArmourList: fc.Arbitrary<ArmourItem[]> = fc.array(arbMixedArmourItem, { minLength: 0, maxLength: 8 });

// ─── Helpers ────────────────────────────────────────────────────────────────

/** All AP location keys. */
const ALL_LOCATIONS: (keyof APByLocation)[] = ['head', 'leftArm', 'rightArm', 'body', 'leftLeg', 'rightLeg'];

/**
 * Determine which APByLocation keys an armour item covers, replicating the
 * parsing logic used by computeAPByLocation.
 */
function getAPLocations(item: ArmourItem): (keyof APByLocation)[] {
  const result: (keyof APByLocation)[] = [];
  const parts = item.locations.split(',').map(s => s.trim().toLowerCase());
  for (const part of parts) {
    if (part === 'head') result.push('head');
    else if (part === 'body') result.push('body');
    else if (part === 'arms') result.push('leftArm', 'rightArm');
    else if (part === 'legs') result.push('leftLeg', 'rightLeg');
  }
  return result;
}

/**
 * Compute expected AP for a single location using the stacking rule:
 * highest non-flexible AP + highest flexible AP.
 */
function expectedAPForLocation(wornItems: ArmourItem[], location: keyof APByLocation): number {
  let highestNonFlexible = 0;
  let highestFlexible = 0;

  for (const item of wornItems) {
    const coveredLocations = getAPLocations(item);
    if (coveredLocations.includes(location)) {
      const effectiveAP = item.ap; // no runes in our test items
      if (item.qualities.toLowerCase().includes('flexible')) {
        highestFlexible = Math.max(highestFlexible, effectiveAP);
      } else {
        highestNonFlexible = Math.max(highestNonFlexible, effectiveAP);
      }
    }
  }

  return Math.max(0, highestNonFlexible + highestFlexible);
}

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-polish-and-functionality', () => {
  describe('Property 8: AP Computation Invariant', () => {
    /**
     * **Validates: Requirements 9.1, 9.2, 9.6**
     */

    it('computed AP for each location equals sum of individual AP values using the stacking rule', () => {
      fc.assert(
        fc.property(
          arbArmourList,
          (armourItems) => {
            const result = computeAPByLocation(armourItems);

            for (const loc of ALL_LOCATIONS) {
              const expected = expectedAPForLocation(armourItems, loc);
              expect(result[loc]).toBe(expected);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('only worn items contribute to AP — non-worn items are excluded', () => {
      fc.assert(
        fc.property(
          arbMixedArmourList,
          (armourItems) => {
            const result = computeAPByLocation(armourItems);
            const wornOnly = armourItems.filter(item => item.worn === true);

            for (const loc of ALL_LOCATIONS) {
              const expected = expectedAPForLocation(wornOnly, loc);
              expect(result[loc]).toBe(expected);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('AP values are always non-negative for every location', () => {
      fc.assert(
        fc.property(
          arbArmourList,
          (armourItems) => {
            const result = computeAPByLocation(armourItems);

            for (const loc of ALL_LOCATIONS) {
              expect(result[loc]).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty armour list produces zero AP for all locations', () => {
      const result = computeAPByLocation([]);

      for (const loc of ALL_LOCATIONS) {
        expect(result[loc]).toBe(0);
      }
    });
  });
});
