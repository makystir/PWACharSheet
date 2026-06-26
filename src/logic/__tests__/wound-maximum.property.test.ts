import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeWoundMaximum } from '../calculators';

// Feature: ux-polish-and-functionality, Property 1: Wound Maximum Formula Correctness

// ─── Generators ─────────────────────────────────────────────────────────────

/** Characteristic value in range 0-99 (valid WFRP 4e characteristic total) */
const arbCharacteristic = fc.integer({ min: 0, max: 99 });

/** Hardy talent level in range 0-5 */
const arbHardyLevel = fc.integer({ min: 0, max: 5 });

/** Whether species uses SB in wound formula */
const arbWoundsUseSB = fc.boolean();

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-polish-and-functionality', () => {
  describe('Property 1: Wound Maximum Formula Correctness', () => {
    /**
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.6**
     */

    it('computed value matches formula: (woundsUseSB ? floor(S/10) : 0) + 2×floor(T/10) + floor(WP/10) + Hardy×floor(T/10)', () => {
      fc.assert(
        fc.property(
          arbCharacteristic,
          arbCharacteristic,
          arbCharacteristic,
          arbHardyLevel,
          arbWoundsUseSB,
          (strength, toughness, willpower, hardyLevel, woundsUseSB) => {
            const result = computeWoundMaximum(strength, toughness, willpower, hardyLevel, woundsUseSB);

            // Independently compute expected value from the formula
            const expectedSB = woundsUseSB ? Math.floor(strength / 10) : 0;
            const expectedTB = 2 * Math.floor(toughness / 10);
            const expectedWPB = Math.floor(willpower / 10);
            const expectedHardy = hardyLevel * Math.floor(toughness / 10);
            const expectedTotal = expectedSB + expectedTB + expectedWPB + expectedHardy;

            expect(result.total).toBe(expectedTotal);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('formula breakdown components sum to total', () => {
      fc.assert(
        fc.property(
          arbCharacteristic,
          arbCharacteristic,
          arbCharacteristic,
          arbHardyLevel,
          arbWoundsUseSB,
          (strength, toughness, willpower, hardyLevel, woundsUseSB) => {
            const result = computeWoundMaximum(strength, toughness, willpower, hardyLevel, woundsUseSB);

            expect(result.sb + result.tb + result.wpb + result.hardy).toBe(result.total);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('SB component is 0 when woundsUseSB is false regardless of strength value', () => {
      fc.assert(
        fc.property(
          arbCharacteristic,
          arbCharacteristic,
          arbCharacteristic,
          arbHardyLevel,
          (strength, toughness, willpower, hardyLevel) => {
            const result = computeWoundMaximum(strength, toughness, willpower, hardyLevel, false);

            expect(result.sb).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('SB component equals floor(S/10) when woundsUseSB is true', () => {
      fc.assert(
        fc.property(
          arbCharacteristic,
          arbCharacteristic,
          arbCharacteristic,
          arbHardyLevel,
          (strength, toughness, willpower, hardyLevel) => {
            const result = computeWoundMaximum(strength, toughness, willpower, hardyLevel, true);

            expect(result.sb).toBe(Math.floor(strength / 10));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Hardy component equals Hardy × floor(T/10)', () => {
      fc.assert(
        fc.property(
          arbCharacteristic,
          arbCharacteristic,
          arbCharacteristic,
          arbHardyLevel,
          arbWoundsUseSB,
          (strength, toughness, willpower, hardyLevel, woundsUseSB) => {
            const result = computeWoundMaximum(strength, toughness, willpower, hardyLevel, woundsUseSB);

            expect(result.hardy).toBe(hardyLevel * Math.floor(toughness / 10));
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
