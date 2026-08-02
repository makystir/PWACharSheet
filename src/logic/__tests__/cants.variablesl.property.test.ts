import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getVariableSLRange } from '../cants';
import { CANT_CATALOGUE } from '../../data/cants';
import type { CantEntry } from '../../data/cants';

// Feature: alternative-channelling-cants, Property 9: Variable SL expenditure bounds
// **Validates: Requirements 4.6**

/** Only variable-SL Cants from the catalogue */
const VARIABLE_SL_CANTS = CANT_CATALOGUE.filter(c => c.variableSL === true);

describe('Property 9: Variable SL expenditure bounds', () => {
  it('permitted range min equals slCost and max equals min(availableSL, wpBonus)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VARIABLE_SL_CANTS),
        fc.integer({ min: 1, max: 30 }), // availableSL (≥1, gated by activation)
        fc.integer({ min: 1, max: 10 }), // wpBonus (realistic WFRP4e range)
        (cant: CantEntry, availableSL: number, wpBonus: number) => {
          const result = getVariableSLRange(cant, availableSL, wpBonus);

          expect(result.min).toBe(cant.slCost);
          expect(result.max).toBe(Math.min(availableSL, wpBonus));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('min <= max when availableSL >= slCost and wpBonus >= slCost', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VARIABLE_SL_CANTS),
        fc.integer({ min: 1, max: 10 }), // wpBonus
        (cant: CantEntry, wpBonus: number) => {
          // Ensure both availableSL and wpBonus are >= slCost (activation properly gated)
          const availableSL = cant.slCost + Math.floor(Math.random() * 20);
          const safeWpBonus = Math.max(wpBonus, cant.slCost);

          const result = getVariableSLRange(cant, availableSL, safeWpBonus);

          expect(result.min).toBeLessThanOrEqual(result.max);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('works with arbitrary slCost values (1-3) and random inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),  // slCost
        fc.integer({ min: 1, max: 30 }), // availableSL
        fc.integer({ min: 1, max: 10 }), // wpBonus
        (slCost: number, availableSL: number, wpBonus: number) => {
          // Create a synthetic variable-SL Cant entry
          const cant: CantEntry = {
            id: `test-cant-${slCost}`,
            lore: 'Lore of Beasts',
            name: 'Test Cant',
            slCost,
            effect: 'Test effect',
            variableSL: true,
          };

          const result = getVariableSLRange(cant, availableSL, wpBonus);

          expect(result.min).toBe(slCost);
          expect(result.max).toBe(Math.min(availableSL, wpBonus));
        }
      ),
      { numRuns: 100 }
    );
  });
});
