import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeOffHandTarget } from '../combat';

// Feature: ux-polish-and-functionality, Property 15: Off-Hand Penalty Computation

// ─── Generators ─────────────────────────────────────────────────────────────

// Base target numbers in a realistic range for WFRP (1-200 covers extreme cases)
const arbBaseTarget = fc.integer({ min: 1, max: 200 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-polish-and-functionality', () => {
  describe('Property 15: Off-Hand Penalty Computation', () => {
    /**
     * **Validates: Requirements 20.1**
     */

    it('without Dual Wielder: modified target = T - 20', () => {
      fc.assert(
        fc.property(
          arbBaseTarget,
          (baseTarget) => {
            const result = computeOffHandTarget(baseTarget, true, false);
            expect(result).toBe(baseTarget - 20);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('with Dual Wielder: modified target = T (no penalty)', () => {
      fc.assert(
        fc.property(
          arbBaseTarget,
          (baseTarget) => {
            const result = computeOffHandTarget(baseTarget, true, true);
            expect(result).toBe(baseTarget);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('when off-hand is not active, target is unchanged regardless of Dual Wielder', () => {
      fc.assert(
        fc.property(
          arbBaseTarget,
          fc.boolean(),
          (baseTarget, hasDualWielder) => {
            const result = computeOffHandTarget(baseTarget, false, hasDualWielder);
            expect(result).toBe(baseTarget);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
