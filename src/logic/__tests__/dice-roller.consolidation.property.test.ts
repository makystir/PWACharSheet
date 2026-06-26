import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  resolveOpposedTest,
  resolveRoll,
  calculateOpposedResult,
} from '../dice-roller';

// Feature: app-cleanup-and-optimization, Property 4: Opposed test delegation consistency

// ─── Generators ─────────────────────────────────────────────────────────────

/** Target numbers range 1-200 per WFRP4e (base + modifiers can exceed 100) */
const arbTargetNumber = fc.integer({ min: 1, max: 200 });

/** Roll values are d100: 1-100 */
const arbRollValue = fc.integer({ min: 1, max: 100 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: app-cleanup-and-optimization, Opposed test delegation consistency', () => {
  /**
   * **Validates: Requirements 4.1, 4.3**
   *
   * Property 4: Opposed test delegation consistency — for any playerTarget,
   * playerRoll, opponentTarget, and opponentRoll, the winner and netSL fields
   * returned by resolveOpposedTest SHALL equal those returned by calling
   * calculateOpposedResult(resolveRoll(...).sl, resolveRoll(...).sl, ...) directly.
   */
  it('Property 4: resolveOpposedTest winner/netSL equals calculateOpposedResult called with resolveRoll SLs', () => {
    fc.assert(
      fc.property(
        arbTargetNumber,
        arbRollValue,
        arbTargetNumber,
        arbRollValue,
        (playerTarget, playerRoll, opponentTarget, opponentRoll) => {
          // Call resolveOpposedTest (the integrated function)
          const integrated = resolveOpposedTest(
            playerTarget,
            playerRoll,
            opponentTarget,
            opponentRoll
          );

          // Manually compute the same result via decomposed calls
          const playerResolution = resolveRoll(playerRoll, playerTarget);
          const opponentResolution = resolveRoll(opponentRoll, opponentTarget);
          const decomposed = calculateOpposedResult(
            playerResolution.sl,
            opponentResolution.sl,
            playerTarget,
            opponentTarget
          );

          // The winner and netSL must be identical
          expect(integrated.winner).toBe(decomposed.winner);
          expect(integrated.netSL).toBe(decomposed.netSL);
        }
      ),
      { numRuns: 100 }
    );
  });
});
