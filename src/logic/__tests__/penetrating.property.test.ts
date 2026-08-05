// Feature: combat-rules-compliance, Property 1: Penetrating zeroes non-metallic and reduces metallic AP
// Feature: combat-rules-compliance, Property 2: Penetrating disabled preserves standard AP
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { resolvePenetratingEffect, isMetallicArmour } from '../armourCombat';
import type { ArmourItem, ArmourType } from '../../types/character';

/**
 * Property 1: Penetrating zeroes non-metallic and reduces metallic AP
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 *
 * For any set of armour items at a hit location with varying armourTypes and AP values,
 * when Penetrating is enabled, the effective AP contribution of items with armourType
 * "SoftKit" or "BoiledLeather" SHALL be 0, and the effective AP contribution of items
 * with armourType "Chainmail", "Brigandine", or "Plate" SHALL be reduced by 1 per item
 * (minimum 0 per item).
 */

/**
 * Property 2: Penetrating disabled preserves standard AP
 *
 * **Validates: Requirements 1.5**
 *
 * For any set of armour items at a hit location, when Penetrating is disabled, the
 * effective AP SHALL equal the sum of each item's `currentAp ?? ap` values (the
 * standard calculation without modification).
 */

// ─── Generators ──────────────────────────────────────────────────────────────

const ALL_ARMOUR_TYPES: ArmourType[] = ['SoftKit', 'BoiledLeather', 'Chainmail', 'Brigandine', 'Plate'];
const NON_METALLIC_TYPES: ArmourType[] = ['SoftKit', 'BoiledLeather'];
const METALLIC_TYPES: ArmourType[] = ['Chainmail', 'Brigandine', 'Plate'];

const arbArmourType: fc.Arbitrary<ArmourType> = fc.constantFrom(...ALL_ARMOUR_TYPES);
const arbNonMetallicType: fc.Arbitrary<ArmourType> = fc.constantFrom(...NON_METALLIC_TYPES);
const arbMetallicType: fc.Arbitrary<ArmourType> = fc.constantFrom(...METALLIC_TYPES);

/** Generate a single armour item with arbitrary type and AP values */
function arbArmourItem(armourType: fc.Arbitrary<ArmourType>): fc.Arbitrary<ArmourItem> {
  return fc.record({
    ap: fc.integer({ min: 0, max: 10 }),
    armourType: armourType,
    currentAp: fc.oneof(fc.constant(undefined), fc.integer({ min: 0, max: 10 })),
    name: fc.constantFrom('Leather Cap', 'Mail Coif', 'Breastplate', 'Boiled Leather Cuirass', 'Soft Kit'),
  }).map(({ ap, armourType: type, currentAp, name }) => ({
    name,
    locations: 'Body',
    enc: '1',
    ap,
    qualities: '',
    worn: true,
    armourType: type,
    currentAp,
  }));
}

/** Generate a non-empty array of armour items with mixed types */
const arbArmourItems: fc.Arbitrary<ArmourItem[]> = fc.array(
  arbArmourItem(arbArmourType),
  { minLength: 1, maxLength: 5 },
);

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: combat-rules-compliance, Property 1: Penetrating zeroes non-metallic and reduces metallic AP', () => {
  it('non-metallic armour items contribute 0 AP when Penetrating is enabled', () => {
    fc.assert(
      fc.property(
        fc.array(arbArmourItem(arbNonMetallicType), { minLength: 1, maxLength: 5 }),
        (items) => {
          const baseAP = items.reduce((sum, item) => sum + (item.currentAp ?? item.ap), 0);
          const result = resolvePenetratingEffect(items, baseAP, true);

          // All non-metallic items should contribute 0 AP
          expect(result.effectiveAP).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('metallic armour items each have AP reduced by 1 (min 0) when Penetrating is enabled', () => {
    fc.assert(
      fc.property(
        fc.array(arbArmourItem(arbMetallicType), { minLength: 1, maxLength: 5 }),
        (items) => {
          const baseAP = items.reduce((sum, item) => sum + (item.currentAp ?? item.ap), 0);
          const result = resolvePenetratingEffect(items, baseAP, true);

          // Each metallic item contributes max(0, itemAP - 1)
          const expectedAP = items.reduce((sum, item) => {
            const itemAP = item.currentAp ?? item.ap;
            return sum + Math.max(0, itemAP - 1);
          }, 0);

          expect(result.effectiveAP).toBe(expectedAP);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('mixed armour items: non-metallic zeroed, metallic reduced by 1 when Penetrating is enabled', () => {
    fc.assert(
      fc.property(
        arbArmourItems,
        (items) => {
          const baseAP = items.reduce((sum, item) => sum + (item.currentAp ?? item.ap), 0);
          const result = resolvePenetratingEffect(items, baseAP, true);

          // Expected: non-metallic contributes 0, metallic contributes max(0, AP-1)
          const expectedAP = items.reduce((sum, item) => {
            const itemAP = item.currentAp ?? item.ap;
            const metallic = isMetallicArmour(item.armourType);
            if (!metallic) return sum; // contributes 0
            return sum + Math.max(0, itemAP - 1);
          }, 0);

          expect(result.effectiveAP).toBe(expectedAP);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('isMetallicArmour correctly classifies all armour types', () => {
    fc.assert(
      fc.property(
        arbArmourType,
        (armourType) => {
          const metallic = isMetallicArmour(armourType);
          if (armourType === 'SoftKit' || armourType === 'BoiledLeather') {
            expect(metallic).toBe(false);
          } else {
            // Chainmail, Brigandine, Plate
            expect(metallic).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Feature: combat-rules-compliance, Property 2: Penetrating disabled preserves standard AP', () => {
  it('effective AP equals baseEffectiveAP when Penetrating is disabled', () => {
    fc.assert(
      fc.property(
        arbArmourItems,
        (items) => {
          const baseAP = items.reduce((sum, item) => sum + (item.currentAp ?? item.ap), 0);
          const result = resolvePenetratingEffect(items, baseAP, false);

          expect(result.effectiveAP).toBe(baseAP);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('no notes are produced when Penetrating is disabled', () => {
    fc.assert(
      fc.property(
        arbArmourItems,
        (items) => {
          const baseAP = items.reduce((sum, item) => sum + (item.currentAp ?? item.ap), 0);
          const result = resolvePenetratingEffect(items, baseAP, false);

          expect(result.notes).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });
});
