import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calculateEffectiveAP, coversLocation, validateLayering, isWeakpointsSuppressed } from '../armourLayering';
import type { LocationKey } from '../armourLayering';
import type { ArmourItem } from '../../types/character';

// ─── Shared Generators ──────────────────────────────────────────────────────

const ALL_LOCATIONS: LocationKey[] = ['head', 'lArm', 'rArm', 'body', 'lLeg', 'rLeg'];

/** Location strings that map to specific LocationKey values */
const LOCATION_STRINGS = ['Head', 'Arms', 'Body', 'Legs', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg'] as const;

/** Generate a locations string from 1-3 distinct location tokens, comma-separated */
const arbLocationsString: fc.Arbitrary<string> = fc
  .subarray([...LOCATION_STRINGS], { minLength: 1, maxLength: 3 })
  .map(tokens => tokens.join(', '));

/** Generate a single armour item with random AP, currentAp, and worn state */
const arbArmourItem: fc.Arbitrary<ArmourItem> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  locations: arbLocationsString,
  enc: fc.constantFrom('0', '1', '2', '3'),
  ap: fc.integer({ min: 1, max: 5 }),
  qualities: fc.constantFrom('', 'Impenetrable', 'Overcoat', 'Partial'),
  worn: fc.boolean(),
  armourType: fc.constantFrom('SoftKit' as const, 'BoiledLeather' as const, 'Chainmail' as const, 'Brigandine' as const, 'Plate' as const),
  currentAp: fc.oneof(fc.integer({ min: 0, max: 5 }), fc.constant(undefined as unknown as number)),
});

/** Generate an array of 1-4 armour items */
const arbArmourList: fc.Arbitrary<ArmourItem[]> = fc.array(arbArmourItem, { minLength: 1, maxLength: 4 });

/** Generate a random location */
const arbLocation: fc.Arbitrary<LocationKey> = fc.constantFrom(...ALL_LOCATIONS);

// ─── Shared Helpers ─────────────────────────────────────────────────────────

function makeItem(overrides: Partial<ArmourItem> & { name: string }): ArmourItem {
  return {
    locations: 'Body',
    enc: '1',
    ap: 2,
    qualities: '—',
    worn: true,
    ...overrides,
  };
}

/** Map a LocationKey to the location string an armour item would use */
function locationKeyToString(loc: LocationKey): string {
  switch (loc) {
    case 'head': return 'Head';
    case 'lArm': return 'Arms';
    case 'rArm': return 'Arms';
    case 'body': return 'Body';
    case 'lLeg': return 'Legs';
    case 'rLeg': return 'Legs';
  }
}

/** Get all LocationKeys that an item covers, given its locations string */
function getLocationKeys(locationsStr: string): LocationKey[] {
  const tokens = locationsStr.split(',').map(s => s.trim().toLowerCase());
  const keys: LocationKey[] = [];
  for (const token of tokens) {
    switch (token) {
      case 'head': keys.push('head'); break;
      case 'arms': keys.push('lArm', 'rArm'); break;
      case 'body': keys.push('body'); break;
      case 'legs': keys.push('lLeg', 'rLeg'); break;
    }
  }
  return keys;
}

/** Find shared LocationKeys between two items */
function sharedLocations(locA: string, locB: string): LocationKey[] {
  const keysA = getLocationKeys(locA);
  const keysB = getLocationKeys(locB);
  return keysA.filter(k => keysB.includes(k));
}

/**
 * Generate a pair of items from two lists that share at least one location,
 * along with a shared LocationKey to test against.
 */
function pairAtSameLocation<A extends { locations: string }, B extends { locations: string }>(
  listA: A[],
  listB: B[],
): fc.Arbitrary<{ itemA: A; itemB: B; location: LocationKey }> {
  const validPairs: { itemA: A; itemB: B; locations: LocationKey[] }[] = [];
  for (const a of listA) {
    for (const b of listB) {
      const shared = sharedLocations(a.locations, b.locations);
      if (shared.length > 0) {
        validPairs.push({ itemA: a, itemB: b, locations: shared });
      }
    }
  }

  if (validPairs.length === 0) {
    throw new Error('No valid pairs found with shared locations');
  }

  return fc.nat({ max: validPairs.length - 1 }).chain(pairIdx => {
    const pair = validPairs[pairIdx];
    return fc.nat({ max: pair.locations.length - 1 }).map(locIdx => ({
      itemA: pair.itemA,
      itemB: pair.itemB,
      location: pair.locations[locIdx],
    }));
  });
}

// ─── Property 10: AP Summation for Layered Armour ────────────────────────────
// Feature: expanded-armour-system, Property 10: AP Summation

describe('Feature: expanded-armour-system', () => {
  describe('Property 10: AP Summation for Layered Armour', () => {
    /**
     * **Validates: Requirements 8.8**
     */

    it('calculateEffectiveAP equals sum of currentAp (or ap) for all worn items covering the location', () => {
      fc.assert(
        fc.property(
          arbArmourList,
          arbLocation,
          (items, location) => {
            const result = calculateEffectiveAP(items, location);

            const expected = items
              .filter(item => coversLocation(item, location) && item.worn !== false)
              .reduce((sum, item) => sum + (item.currentAp ?? item.ap), 0);

            expect(result).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('items with worn: false are excluded from the AP sum', () => {
      fc.assert(
        fc.property(
          arbArmourList,
          arbLocation,
          (items, location) => {
            const unwornItems = items.map(item => ({ ...item, worn: false }));
            const result = calculateEffectiveAP(unwornItems, location);

            expect(result).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('items not covering the location are excluded from the AP sum', () => {
      fc.assert(
        fc.property(
          arbArmourList,
          arbLocation,
          (items, location) => {
            const result = calculateEffectiveAP(items, location);

            const coveringItems = items.filter(
              item => coversLocation(item, location) && item.worn !== false,
            );
            const expectedSum = coveringItems.reduce(
              (sum, item) => sum + (item.currentAp ?? item.ap),
              0,
            );

            expect(result).toBe(expectedSum);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('if currentAp is undefined it defaults to ap for summation', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 20 }),
              locations: arbLocationsString,
              enc: fc.constantFrom('0', '1', '2', '3'),
              ap: fc.integer({ min: 1, max: 5 }),
              qualities: fc.constant(''),
              worn: fc.constant(true as const),
              armourType: fc.constantFrom('SoftKit' as const, 'BoiledLeather' as const, 'Chainmail' as const, 'Brigandine' as const, 'Plate' as const),
            }),
            { minLength: 1, maxLength: 4 },
          ),
          arbLocation,
          (items, location) => {
            const result = calculateEffectiveAP(items, location);

            const expected = items
              .filter(item => coversLocation(item, location))
              .reduce((sum, item) => sum + item.ap, 0);

            expect(result).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ─── Property 8: Layering Invalidity - Invalid Combinations Rejected ─────
  // Feature: expanded-armour-system, Property 8: Layering Invalidity

  describe('Property 8: Layering Invalidity - Invalid Combinations Rejected', () => {
    /**
     * **Validates: Requirements 8.4, 8.5**
     *
     * For any Boiled Leather piece combined with any Chainmail piece in the same
     * location, the layering validation SHALL reject the combination.
     */
    it('rejects Boiled Leather + Chainmail at the same location', () => {
      const boiledLeatherItems = [
        { name: 'Leather Jack', locations: 'Arms, Body', ap: 1 },
        { name: 'Leather Jerkin', locations: 'Body', ap: 1 },
        { name: 'Leather Leggings', locations: 'Legs', ap: 1 },
        { name: 'Leather Skullcap', locations: 'Head', ap: 1 },
      ];

      const chainmailItems = [
        { name: 'Chainmail Chausses', locations: 'Legs', ap: 2 },
        { name: 'Chainmail Coat', locations: 'Arms, Body', ap: 2 },
        { name: 'Chainmail Coif', locations: 'Head', ap: 2 },
        { name: 'Chainmail Shirt', locations: 'Body', ap: 2 },
      ];

      fc.assert(
        fc.property(
          pairAtSameLocation(boiledLeatherItems, chainmailItems),
          ({ itemA, itemB, location }) => {
            const leatherItem = makeItem({
              name: itemA.name,
              locations: locationKeyToString(location),
              ap: itemA.ap,
              armourType: 'BoiledLeather',
              worn: true,
            });
            const chainmailItem = makeItem({
              name: itemB.name,
              locations: locationKeyToString(location),
              ap: itemB.ap,
              armourType: 'Chainmail',
              worn: true,
            });

            const result = validateLayering([leatherItem, chainmailItem], location);
            expect(result.valid).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 8.4, 8.5**
     *
     * For any Boiled Leather piece combined with any Plate item WITHOUT Overcoat
     * quality at the same location, the layering validation SHALL reject the combination.
     */
    it('rejects Boiled Leather + non-Overcoat Plate at the same location', () => {
      const boiledLeatherItems = [
        { name: 'Leather Jack', locations: 'Arms, Body', ap: 1 },
        { name: 'Leather Jerkin', locations: 'Body', ap: 1 },
        { name: 'Leather Leggings', locations: 'Legs', ap: 1 },
        { name: 'Leather Skullcap', locations: 'Head', ap: 1 },
      ];

      const nonOvercoatPlateItems = [
        { name: 'Bracers', locations: 'Arms', ap: 3, qualities: 'Impenetrable, Requires Kit, Weakpoints' },
        { name: 'Plate Leggings', locations: 'Legs', ap: 3, qualities: 'Impenetrable, Requires Kit, Weakpoints' },
        { name: 'Great Helm', locations: 'Head', ap: 3, qualities: 'Impenetrable, Weakpoints' },
        { name: 'Bascinet', locations: 'Head', ap: 3, qualities: 'Impenetrable, Visor, Weakpoints' },
        { name: 'Armet', locations: 'Head', ap: 3, qualities: 'Impenetrable, Visor, Weakpoints' },
        { name: 'Sallet', locations: 'Head', ap: 3, qualities: 'Impenetrable, Visor, Weakpoints' },
      ];

      fc.assert(
        fc.property(
          pairAtSameLocation(boiledLeatherItems, nonOvercoatPlateItems),
          ({ itemA, itemB, location }) => {
            const leatherItem = makeItem({
              name: itemA.name,
              locations: locationKeyToString(location),
              ap: itemA.ap,
              armourType: 'BoiledLeather',
              worn: true,
            });
            const plateItem = makeItem({
              name: itemB.name,
              locations: locationKeyToString(location),
              ap: itemB.ap,
              qualities: itemB.qualities,
              armourType: 'Plate',
              worn: true,
            });

            const result = validateLayering([leatherItem, plateItem], location);
            expect(result.valid).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 8.4, 8.5**
     *
     * For any Chainmail piece combined with any Plate item WITHOUT Overcoat quality
     * at the same location, the layering validation SHALL reject the combination.
     */
    it('rejects Chainmail + non-Overcoat Plate at the same location', () => {
      const chainmailItems = [
        { name: 'Chainmail Chausses', locations: 'Legs', ap: 2 },
        { name: 'Chainmail Coat', locations: 'Arms, Body', ap: 2 },
        { name: 'Chainmail Coif', locations: 'Head', ap: 2 },
        { name: 'Chainmail Shirt', locations: 'Body', ap: 2 },
      ];

      const nonOvercoatPlateItems = [
        { name: 'Bracers', locations: 'Arms', ap: 3, qualities: 'Impenetrable, Requires Kit, Weakpoints' },
        { name: 'Plate Leggings', locations: 'Legs', ap: 3, qualities: 'Impenetrable, Requires Kit, Weakpoints' },
        { name: 'Great Helm', locations: 'Head', ap: 3, qualities: 'Impenetrable, Weakpoints' },
        { name: 'Bascinet', locations: 'Head', ap: 3, qualities: 'Impenetrable, Visor, Weakpoints' },
        { name: 'Armet', locations: 'Head', ap: 3, qualities: 'Impenetrable, Visor, Weakpoints' },
        { name: 'Sallet', locations: 'Head', ap: 3, qualities: 'Impenetrable, Visor, Weakpoints' },
      ];

      fc.assert(
        fc.property(
          pairAtSameLocation(chainmailItems, nonOvercoatPlateItems),
          ({ itemA, itemB, location }) => {
            const chainmailItem = makeItem({
              name: itemA.name,
              locations: locationKeyToString(location),
              ap: itemA.ap,
              armourType: 'Chainmail',
              worn: true,
            });
            const plateItem = makeItem({
              name: itemB.name,
              locations: locationKeyToString(location),
              ap: itemB.ap,
              qualities: itemB.qualities,
              armourType: 'Plate',
              worn: true,
            });

            const result = validateLayering([chainmailItem, plateItem], location);
            expect(result.valid).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 9: Reinforced Soft Kit Suppresses Weakpoints ─────────────────
  // Feature: expanded-armour-system, Property 9: Reinforced Soft Kit Suppresses Weakpoints

  describe('Property 9: Reinforced Soft Kit Suppresses Weakpoints', () => {
    /** Plate items with Weakpoints and their associated location keys. */
    const PLATE_WITH_WEAKPOINTS: { name: string; locations: string; locationKeys: LocationKey[] }[] = [
      { name: 'Bracers', locations: 'Arms', locationKeys: ['lArm', 'rArm'] },
      { name: 'Breastplate', locations: 'Body', locationKeys: ['body'] },
      { name: 'Plate Leggings', locations: 'Legs', locationKeys: ['lLeg', 'rLeg'] },
      { name: 'Great Helm', locations: 'Head', locationKeys: ['head'] },
      { name: 'Bascinet', locations: 'Head', locationKeys: ['head'] },
      { name: 'Armet', locations: 'Head', locationKeys: ['head'] },
      { name: 'Sallet', locations: 'Head', locationKeys: ['head'] },
    ];

    /** Reinforced Soft Kit items and the location keys they cover. */
    const REINFORCED_SOFT_KITS: { name: string; locations: string; locationKeys: LocationKey[] }[] = [
      { name: 'Reinforced Soft Kit', locations: 'Arms, Body, Legs', locationKeys: ['lArm', 'rArm', 'body', 'lLeg', 'rLeg'] },
      { name: 'Aventail', locations: 'Head', locationKeys: ['head'] },
    ];

    /** Find all valid (plate, reinforcedKit, location) triples where both items overlap. */
    function getOverlappingCombinations() {
      const combos: { plate: typeof PLATE_WITH_WEAKPOINTS[number]; kit: typeof REINFORCED_SOFT_KITS[number]; location: LocationKey }[] = [];
      for (const plate of PLATE_WITH_WEAKPOINTS) {
        for (const kit of REINFORCED_SOFT_KITS) {
          for (const loc of plate.locationKeys) {
            if (kit.locationKeys.includes(loc)) {
              combos.push({ plate, kit, location: loc });
            }
          }
        }
      }
      return combos;
    }

    const OVERLAPPING_COMBOS = getOverlappingCombinations();

    /** Generate a plate item with Weakpoints. */
    function arbPlateWithWeakpoints(plate: typeof PLATE_WITH_WEAKPOINTS[number]): fc.Arbitrary<ArmourItem> {
      const qualities = plate.name === 'Breastplate'
        ? 'Impenetrable, Overcoat, Weakpoints'
        : 'Impenetrable, Requires Kit, Weakpoints';

      return fc.record({
        name: fc.constant(plate.name),
        locations: fc.constant(plate.locations),
        enc: fc.constantFrom('1', '2', '3', '4'),
        ap: fc.integer({ min: 1, max: 10 }),
        qualities: fc.constant(qualities),
        worn: fc.constant(true as const),
        armourType: fc.constant('Plate' as const),
        currentAp: fc.integer({ min: 1, max: 10 }),
      });
    }

    /** Generate a Reinforced Soft Kit item. */
    function arbReinforcedKit(kit: typeof REINFORCED_SOFT_KITS[number]): fc.Arbitrary<ArmourItem> {
      return fc.record({
        name: fc.constant(kit.name),
        locations: fc.constant(kit.locations),
        enc: fc.constantFrom('0', '1', '2'),
        ap: fc.integer({ min: 0, max: 5 }),
        qualities: fc.constant('Partial, Reinforced'),
        worn: fc.constant(true as const),
        armourType: fc.constant('SoftKit' as const),
        currentAp: fc.integer({ min: 0, max: 5 }),
      });
    }

    /** Generate a regular Soft Kit (no Reinforced quality). */
    function arbRegularKit(kit: typeof REINFORCED_SOFT_KITS[number]): fc.Arbitrary<ArmourItem> {
      const name = kit.name === 'Aventail' ? 'Padding' : 'Soft Kit';
      const locations = kit.name === 'Aventail' ? 'Head' : 'Arms, Body, Legs';
      return fc.record({
        name: fc.constant(name),
        locations: fc.constant(locations),
        enc: fc.constantFrom('0', '1'),
        ap: fc.integer({ min: 0, max: 3 }),
        qualities: fc.constant('—'),
        worn: fc.constant(true as const),
        armourType: fc.constant('SoftKit' as const),
        currentAp: fc.integer({ min: 0, max: 3 }),
      });
    }

    /**
     * **Validates: Requirements 8.7, 13.3**
     */
    it('Plate with Weakpoints + Reinforced Soft Kit at same location → Weakpoints is suppressed', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: OVERLAPPING_COMBOS.length - 1 }).chain(idx => {
            const combo = OVERLAPPING_COMBOS[idx];
            return fc.tuple(
              arbPlateWithWeakpoints(combo.plate),
              arbReinforcedKit(combo.kit),
              fc.constant(combo.location),
            );
          }),
          ([plateItem, kitItem, location]) => {
            const result = isWeakpointsSuppressed([plateItem, kitItem], location);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Plate with Weakpoints + regular Soft Kit (no Reinforced) at same location → Weakpoints NOT suppressed', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: OVERLAPPING_COMBOS.length - 1 }).chain(idx => {
            const combo = OVERLAPPING_COMBOS[idx];
            return fc.tuple(
              arbPlateWithWeakpoints(combo.plate),
              arbRegularKit(combo.kit),
              fc.constant(combo.location),
            );
          }),
          ([plateItem, regularKit, location]) => {
            const result = isWeakpointsSuppressed([plateItem, regularKit], location);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
