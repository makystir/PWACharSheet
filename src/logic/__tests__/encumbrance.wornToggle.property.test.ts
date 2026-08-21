import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calculateArmourEncumbrance } from '../encumbrance';
import type { ArmourType } from '../../types/character';

// Feature: armour-worn-toggle, Property 3: Encumbrance calculation respects worn state
// **Validates: Requirements 2.1, 2.2, 2.3**

const ALL_ARMOUR_TYPES: ArmourType[] = ['SoftKit', 'BoiledLeather', 'Chainmail', 'Brigandine', 'Plate'];

const arbEncValue = fc.integer({ min: 0, max: 10 }).map(String);
const arbWornState = fc.constantFrom<(boolean | undefined)[]>(true, false, undefined);
const arbArmourType = fc.constantFrom(...ALL_ARMOUR_TYPES);

describe('Property 3: Encumbrance calculation respects worn state', () => {
  it('worn items (worn !== false) return max(0, enc - 1)', () => {
    fc.assert(
      fc.property(
        arbEncValue,
        fc.constantFrom<(boolean | undefined)[]>(true, undefined),
        arbArmourType,
        (enc, worn, _armourType) => {
          const result = calculateArmourEncumbrance(enc, worn);
          const baseEnc = parseFloat(enc) || 0;
          const expected = Math.max(0, baseEnc - 1);
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('unworn items (worn === false) return full enc value', () => {
    fc.assert(
      fc.property(
        arbEncValue,
        arbArmourType,
        (enc, _armourType) => {
          const result = calculateArmourEncumbrance(enc, false);
          const baseEnc = parseFloat(enc) || 0;
          expect(result).toBe(baseEnc);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('worn reduction applies consistently regardless of armour type', () => {
    fc.assert(
      fc.property(
        arbEncValue,
        arbWornState,
        arbArmourType,
        (enc, worn, _armourType) => {
          const result = calculateArmourEncumbrance(enc, worn);
          const baseEnc = parseFloat(enc) || 0;

          if (worn === false) {
            expect(result).toBe(baseEnc);
          } else {
            expect(result).toBe(Math.max(0, baseEnc - 1));
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('enc never goes below 0 for worn items', () => {
    fc.assert(
      fc.property(
        arbEncValue,
        fc.constantFrom<(boolean | undefined)[]>(true, undefined),
        (enc, worn) => {
          const result = calculateArmourEncumbrance(enc, worn);
          expect(result).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
