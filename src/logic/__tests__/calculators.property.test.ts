import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeWoundMaximum } from '../calculators';
import { SPECIES_DATA } from '../../data/species';

// Feature: archives-vol2-integration, Property 1: Wound formula with multiplier produces correct result
// Feature: archives-vol2-integration, Property 2: Default wound multiplier preserves standard formula

// ─── Generators ─────────────────────────────────────────────────────────────

/** Characteristic value in range 0-99 (valid WFRP 4e characteristic total) */
const arbCharacteristic = fc.integer({ min: 0, max: 99 });

/** Hardy talent level in range 0-5 */
const arbHardyLevel = fc.integer({ min: 0, max: 5 });

/** Wound multiplier: 1 (standard) or 2 (Ogre) */
const arbMultiplier = fc.integer({ min: 1, max: 2 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: archives-vol2-integration', () => {
  describe('Property 1: Wound formula with multiplier produces correct result', () => {
    /**
     * **Validates: Requirements 2.1, 2.2**
     *
     * For any valid strength (0–99), toughness (0–99), willpower (0–99),
     * Hardy level (0–5), and wound multiplier (1 or 2), the wound calculator
     * SHALL produce a total equal to:
     *   (SB + 2×TB + WPB) × multiplier + Hardy × TB
     * where SB = floor(S/10), TB = floor(T/10), WPB = floor(WP/10).
     */
    it('computed total matches (SB + 2×TB + WPB) × multiplier + Hardy × TB', () => {
      fc.assert(
        fc.property(
          arbCharacteristic,
          arbCharacteristic,
          arbCharacteristic,
          arbHardyLevel,
          arbMultiplier,
          (strength, toughness, willpower, hardyLevel, multiplier) => {
            const result = computeWoundMaximum(
              strength, toughness, willpower, hardyLevel, true, multiplier
            );

            const SB = Math.floor(strength / 10);
            const TB = Math.floor(toughness / 10);
            const WPB = Math.floor(willpower / 10);
            const expectedTotal = (SB + 2 * TB + WPB) * multiplier + hardyLevel * TB;

            expect(result.total).toBe(expectedTotal);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Default wound multiplier preserves standard formula', () => {
    /**
     * **Validates: Requirements 2.4**
     *
     * For any species in SPECIES_DATA that does not define a woundMultiplier field,
     * the wound calculation SHALL produce the same result as the standard formula
     * with multiplier = 1.
     */
    it('species without woundMultiplier produce same result as multiplier=1', () => {
      // Collect species entries that do NOT define woundMultiplier
      const speciesWithoutMultiplier = Object.entries(SPECIES_DATA)
        .filter(([, data]) => data.woundMultiplier === undefined);

      // Ensure we actually have species to test against
      expect(speciesWithoutMultiplier.length).toBeGreaterThan(0);

      fc.assert(
        fc.property(
          arbCharacteristic,
          arbCharacteristic,
          arbCharacteristic,
          arbHardyLevel,
          fc.integer({ min: 0, max: speciesWithoutMultiplier.length - 1 }),
          (strength, toughness, willpower, hardyLevel, speciesIndex) => {
            const [, speciesData] = speciesWithoutMultiplier[speciesIndex];

            // Calculate with the species' implicit multiplier (undefined → defaults to 1)
            const resultDefault = computeWoundMaximum(
              strength, toughness, willpower, hardyLevel,
              speciesData.woundsUseSB,
              speciesData.woundMultiplier  // undefined
            );

            // Calculate explicitly with multiplier = 1
            const resultExplicit = computeWoundMaximum(
              strength, toughness, willpower, hardyLevel,
              speciesData.woundsUseSB,
              1
            );

            expect(resultDefault.total).toBe(resultExplicit.total);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
