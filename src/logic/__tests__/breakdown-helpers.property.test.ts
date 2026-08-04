import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  getSkillBreakdown,
  getCBBreakdown,
  getEncumbranceBreakdown,
  getCoinWeightBreakdown,
  getAPBreakdown,
} from '../breakdown-helpers';
import type { CharacteristicKey, CharacteristicValue, ArmourItem } from '../../types/character';
import type { LocationKey } from '../armourLayering';

// Feature: calculated-total-tooltips

// ─── Generators ─────────────────────────────────────────────────────────────

const CHARACTERISTIC_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

const ALL_LOCATIONS: LocationKey[] = ['head', 'lArm', 'rArm', 'body', 'lLeg', 'rLeg'];

/** Map LocationKey to valid location token strings that coversLocation recognizes */
const LOCATION_TO_TOKEN: Record<LocationKey, string> = {
  head: 'Head',
  lArm: 'Left Arm',
  rArm: 'Right Arm',
  body: 'Body',
  lLeg: 'Left Leg',
  rLeg: 'Right Leg',
};

const arbCharKey: fc.Arbitrary<CharacteristicKey> = fc.constantFrom(...CHARACTERISTIC_KEYS);

const arbLocationKey: fc.Arbitrary<LocationKey> = fc.constantFrom(...ALL_LOCATIONS);

/**
 * Build a characteristic record where one specific key has the given current value
 * (split across initial/advance/bonus), and all others are zeroed.
 */
function buildCharsWithValue(
  key: CharacteristicKey,
  value: number,
): Record<CharacteristicKey, CharacteristicValue> {
  const chars = {} as Record<CharacteristicKey, CharacteristicValue>;
  for (const k of CHARACTERISTIC_KEYS) {
    chars[k] = { i: 0, a: 0, b: 0 };
  }
  // Put the entire value into `i` (initial) for simplicity
  chars[key] = { i: value, a: 0, b: 0 };
  return chars;
}

/**
 * Build a characteristic record with specific S and T values for encumbrance tests.
 */
function buildCharsForEncumbrance(
  sValue: number,
  tValue: number,
): Record<CharacteristicKey, CharacteristicValue> {
  const chars = {} as Record<CharacteristicKey, CharacteristicValue>;
  for (const k of CHARACTERISTIC_KEYS) {
    chars[k] = { i: 0, a: 0, b: 0 };
  }
  chars.S = { i: sValue, a: 0, b: 0 };
  chars.T = { i: tValue, a: 0, b: 0 };
  return chars;
}

/**
 * Generate an armour item that explicitly covers or does not cover a target location.
 */
function arbArmourItemForLocation(
  targetLocation: LocationKey,
  coversTarget: boolean,
): fc.Arbitrary<ArmourItem> {
  const locationString = coversTarget
    ? fc.constant(LOCATION_TO_TOKEN[targetLocation])
    : fc.constantFrom(
        ...ALL_LOCATIONS.filter((l) => l !== targetLocation).map((l) => LOCATION_TO_TOKEN[l]),
      );

  return fc.record({
    name: fc.string({ minLength: 1, maxLength: 20 }),
    locations: locationString,
    enc: fc.constantFrom('0', '1', '2', '3'),
    ap: fc.integer({ min: 1, max: 5 }),
    qualities: fc.constant(''),
    worn: fc.boolean(),
  });
}

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: calculated-total-tooltips', () => {
  describe('Property 1: Skill breakdown total equals characteristic current plus advances', () => {
    /**
     * **Validates: Requirements 1.2**
     */
    it('total equals charValue + advances for any characteristic and advance values', () => {
      fc.assert(
        fc.property(
          arbCharKey,
          fc.integer({ min: 0, max: 99 }),
          fc.integer({ min: 0, max: 99 }),
          (charKey, charValue, advances) => {
            const chars = buildCharsWithValue(charKey, charValue);
            const result = getSkillBreakdown(charKey, chars, advances);

            expect(result.charValue).toBe(charValue);
            expect(result.total).toBe(charValue + advances);
            expect(result.advances).toBe(advances);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 2: Characteristic bonus breakdown produces correct floor division', () => {
    /**
     * **Validates: Requirements 2.2**
     */
    it('bonus equals floor(currentValue / 10) for any current value', () => {
      fc.assert(
        fc.property(
          arbCharKey,
          fc.integer({ min: 0, max: 199 }),
          (charKey, currentValue) => {
            const chars = buildCharsWithValue(charKey, currentValue);
            const result = getCBBreakdown(charKey, chars);

            expect(result.currentValue).toBe(currentValue);
            expect(result.bonus).toBe(Math.floor(currentValue / 10));
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 3: Encumbrance breakdown total equals SB + TB + Strong Back level', () => {
    /**
     * **Validates: Requirements 3.2, 3.3**
     */
    it('sb, tb, and total are correctly computed from S, T, and strongBackLevel', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 99 }),
          fc.integer({ min: 0, max: 99 }),
          fc.integer({ min: 0, max: 5 }),
          fc.integer({ min: 0, max: 3 }),
          (sValue, tValue, strongBackLevel, sturdyLevel) => {
            const chars = buildCharsForEncumbrance(sValue, tValue);
            const result = getEncumbranceBreakdown(chars, strongBackLevel, sturdyLevel);

            const expectedSB = Math.floor(sValue / 10);
            const expectedTB = Math.floor(tValue / 10);

            expect(result.sb).toBe(expectedSB);
            expect(result.tb).toBe(expectedTB);
            expect(result.total).toBe(expectedSB + expectedTB + strongBackLevel);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 4: Coin weight breakdown produces correct floor division', () => {
    /**
     * **Validates: Requirements 4.2, 4.3**
     */
    it('total equals floor((gc + ss + d) / 200) and isEmpty is correct', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 9999 }),
          fc.integer({ min: 0, max: 9999 }),
          fc.integer({ min: 0, max: 9999 }),
          (gc, ss, d) => {
            const result = getCoinWeightBreakdown(gc, ss, d);

            expect(result.total).toBe(Math.floor((gc + ss + d) / 200));
            expect(result.isEmpty).toBe(gc + ss + d === 0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 5: AP breakdown lists all covering items and total equals their AP sum', () => {
    /**
     * **Validates: Requirements 5.2, 5.3**
     */
    it('items array contains exactly worn items covering location, total equals sum of APs', () => {
      fc.assert(
        fc.property(
          arbLocationKey,
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 20 }),
              locations: fc.constantFrom('Head', 'Body', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg', 'Arms', 'Legs'),
              enc: fc.constantFrom('0', '1', '2', '3'),
              ap: fc.integer({ min: 1, max: 5 }),
              qualities: fc.constant(''),
              worn: fc.boolean(),
            }),
            { minLength: 0, maxLength: 6 },
          ),
          (location, armourItems) => {
            const result = getAPBreakdown(armourItems as ArmourItem[], location, 'Test Location');

            // Determine expected covering worn items using the same logic
            const expectedItems = armourItems.filter((item) => {
              if (item.worn !== true) return false;
              const tokens = item.locations.split(',').map((s) => s.trim().toLowerCase());
              const LOCATION_TOKEN_MAP: Record<string, LocationKey[]> = {
                head: ['head'],
                arms: ['lArm', 'rArm'],
                body: ['body'],
                legs: ['lLeg', 'rLeg'],
                'left arm': ['lArm'],
                'right arm': ['rArm'],
                'left leg': ['lLeg'],
                'right leg': ['rLeg'],
              };
              for (const token of tokens) {
                const mapped = LOCATION_TOKEN_MAP[token];
                if (mapped && mapped.includes(location)) return true;
              }
              return false;
            });

            // Verify item count matches
            expect(result.items.length).toBe(expectedItems.length);

            // Verify total equals sum of covering items' AP
            const expectedTotal = expectedItems.reduce((sum, item) => sum + item.ap, 0);
            expect(result.total).toBe(expectedTotal);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
