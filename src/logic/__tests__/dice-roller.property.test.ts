import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { resolveOpposedTest, resolveRoll } from '../dice-roller';

// ─── Generators ─────────────────────────────────────────────────────────────

/** Target numbers range 1-200 per WFRP4e (base + modifiers can exceed 100) */
const arbTargetNumber = fc.integer({ min: 1, max: 200 });

/** Roll values are d100: 1-100 */
const arbRollValue = fc.integer({ min: 1, max: 100 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-polish-and-functionality, Opposed Test Resolution', () => {
  /**
   * **Validates: Requirements 7.5, 7.6**
   *
   * Property 5: Opposed Test Net SL — net SL always equals player SL
   * minus opponent SL.
   */
  it('Property 5: Opposed Test Net SL', () => {
    fc.assert(
      fc.property(
        arbTargetNumber,
        arbRollValue,
        arbTargetNumber,
        arbRollValue,
        (playerTarget, playerRoll, opponentTarget, opponentRoll) => {
          const result = resolveOpposedTest(playerTarget, playerRoll, opponentTarget, opponentRoll);

          // Independently compute SLs using resolveRoll
          const playerResolution = resolveRoll(playerRoll, playerTarget);
          const opponentResolution = resolveRoll(opponentRoll, opponentTarget);

          // Net SL must equal player SL minus opponent SL
          expect(result.netSL).toBe(playerResolution.sl - opponentResolution.sl);

          // The individual SLs reported must match resolveRoll results
          expect(result.playerSL).toBe(playerResolution.sl);
          expect(result.opponentSL).toBe(opponentResolution.sl);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 7.5, 7.6**
   *
   * Property 6: Opposed Test Tie Resolution — when net SL = 0, higher
   * roll value wins. If both rolls are equal and net SL is 0, the result
   * is a tie.
   */
  it('Property 6: Opposed Test Tie Resolution', () => {
    fc.assert(
      fc.property(
        arbTargetNumber,
        arbRollValue,
        arbTargetNumber,
        arbRollValue,
        (playerTarget, playerRoll, opponentTarget, opponentRoll) => {
          const result = resolveOpposedTest(playerTarget, playerRoll, opponentTarget, opponentRoll);

          if (result.netSL === 0) {
            // Tie-breaker: higher roll wins
            if (playerRoll > opponentRoll) {
              expect(result.winner).toBe('player');
            } else if (opponentRoll > playerRoll) {
              expect(result.winner).toBe('opponent');
            } else {
              // Equal rolls and equal SL = tie
              expect(result.winner).toBe('tie');
            }
          } else if (result.netSL > 0) {
            expect(result.winner).toBe('player');
          } else {
            expect(result.winner).toBe('opponent');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
