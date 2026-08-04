import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeOffHandTarget } from '../combat';

// Feature: ux-polish-and-functionality, Property 15: Off-Hand Penalty Computation
// Updated to use Ambidextrous level per Core Rulebook p.132

// ─── Generators ─────────────────────────────────────────────────────────────

// Base target numbers in a realistic range for WFRP (1-200 covers extreme cases)
const arbBaseTarget = fc.integer({ min: 1, max: 200 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-polish-and-functionality', () => {
  describe('Property 15: Off-Hand Penalty Computation (Ambidextrous-based)', () => {
    /**
     * **Validates: Requirements 20.1**
     * Core Rulebook p.132: Ambidextrous level 1 = -10, level 2 = no penalty.
     * Dual Wielder does NOT reduce the off-hand penalty.
     */

    it('without Ambidextrous (level 0): modified target = T - 20', () => {
      fc.assert(
        fc.property(
          arbBaseTarget,
          (baseTarget) => {
            const result = computeOffHandTarget(baseTarget, true, 0);
            expect(result).toBe(baseTarget - 20);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('with Ambidextrous level 1: modified target = T - 10', () => {
      fc.assert(
        fc.property(
          arbBaseTarget,
          (baseTarget) => {
            const result = computeOffHandTarget(baseTarget, true, 1);
            expect(result).toBe(baseTarget - 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('with Ambidextrous level 2: modified target = T (no penalty)', () => {
      fc.assert(
        fc.property(
          arbBaseTarget,
          (baseTarget) => {
            const result = computeOffHandTarget(baseTarget, true, 2);
            expect(result).toBe(baseTarget);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('when off-hand is not active, target is unchanged regardless of Ambidextrous level', () => {
      fc.assert(
        fc.property(
          arbBaseTarget,
          fc.integer({ min: 0, max: 3 }),
          (baseTarget, ambidextrousLevel) => {
            const result = computeOffHandTarget(baseTarget, false, ambidextrousLevel);
            expect(result).toBe(baseTarget);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
