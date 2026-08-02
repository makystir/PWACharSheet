import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { canActivateCant } from '../cants';
import { CANT_CATALOGUE } from '../../data/cants';
import type { CantEntry } from '../../data/cants';

// Feature: alternative-channelling-cants, Property 7: Cant activation gating
// **Validates: Requirements 4.2, 4.4, 5.5**

describe('Property 7: Cant activation gating', () => {
  it('canActivateCant returns true iff aggregatedSL >= slCost AND !alreadyActivated', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CANT_CATALOGUE),
        fc.nat({ max: 30 }),
        fc.boolean(),
        (cant: CantEntry, aggregatedSL: number, alreadyActivated: boolean) => {
          const result = canActivateCant(cant, aggregatedSL, alreadyActivated);
          const expected = aggregatedSL >= cant.slCost && !alreadyActivated;
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('always returns false when alreadyActivated is true regardless of SL', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CANT_CATALOGUE),
        fc.nat({ max: 100 }),
        (cant: CantEntry, aggregatedSL: number) => {
          const result = canActivateCant(cant, aggregatedSL, true);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('always returns false when aggregatedSL < slCost regardless of activation state', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CANT_CATALOGUE),
        fc.boolean(),
        (cant: CantEntry, alreadyActivated: boolean) => {
          // Generate SL strictly less than slCost (0 to slCost-1)
          const insufficientSL = cant.slCost > 0 ? cant.slCost - 1 : 0;
          const result = canActivateCant(cant, insufficientSL, alreadyActivated);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns true when SL >= cost and not already activated', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CANT_CATALOGUE),
        fc.nat({ max: 30 }),
        (cant: CantEntry, extraSL: number) => {
          const sufficientSL = cant.slCost + extraSL;
          const result = canActivateCant(cant, sufficientSL, false);
          expect(result).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
