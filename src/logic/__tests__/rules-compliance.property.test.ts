import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { resolveOpposedTest, calculateOpposedResult } from '../dice-roller';

// ─── Generators ─────────────────────────────────────────────────────────────

/** Target numbers range 1-200 per WFRP4e (base + modifiers can exceed 100) */
const arbTargetNumber = fc.integer({ min: 1, max: 200 });

/** SL values range -6 to +10 (typical WFRP4e range) */
const arbSL = fc.integer({ min: -6, max: 10 });

/** Roll values are d100: 1-100 */
const arbRollValue = fc.integer({ min: 1, max: 100 });

// ─── Property Tests: Opposed Test Tie-Breaking ──────────────────────────────

describe('Rules Compliance: Opposed Test Tie-Breaking', () => {
  /**
   * **Validates: Requirements 4.2, 4.3, 4.5**
   *
   * Property: When netSL = 0 and playerTarget > opponentTarget, player wins.
   * Uses calculateOpposedResult with equal SL values to guarantee netSL = 0.
   */
  it('when netSL = 0 and playerTarget > opponentTarget, winner is player', () => {
    fc.assert(
      fc.property(
        arbSL,
        arbTargetNumber,
        arbTargetNumber,
        (sl, target1, target2) => {
          // Ensure playerTarget > opponentTarget
          const playerTarget = Math.max(target1, target2);
          const opponentTarget = Math.min(target1, target2);
          fc.pre(playerTarget > opponentTarget);

          const result = calculateOpposedResult(sl, sl, playerTarget, opponentTarget);

          expect(result.netSL).toBe(0);
          expect(result.winner).toBe('player');
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 4.2, 4.3, 4.5**
   *
   * Property: When netSL = 0 and opponentTarget > playerTarget, opponent wins.
   */
  it('when netSL = 0 and opponentTarget > playerTarget, winner is opponent', () => {
    fc.assert(
      fc.property(
        arbSL,
        arbTargetNumber,
        arbTargetNumber,
        (sl, target1, target2) => {
          // Ensure opponentTarget > playerTarget
          const opponentTarget = Math.max(target1, target2);
          const playerTarget = Math.min(target1, target2);
          fc.pre(opponentTarget > playerTarget);

          const result = calculateOpposedResult(sl, sl, playerTarget, opponentTarget);

          expect(result.netSL).toBe(0);
          expect(result.winner).toBe('opponent');
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 4.2, 4.3, 4.5**
   *
   * Property: When netSL = 0 and playerTarget === opponentTarget, result is tie.
   */
  it('when netSL = 0 and targets are equal, winner is tie', () => {
    fc.assert(
      fc.property(
        arbSL,
        arbTargetNumber,
        (sl, target) => {
          const result = calculateOpposedResult(sl, sl, target, target);

          expect(result.netSL).toBe(0);
          expect(result.winner).toBe('tie');
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 4.2, 4.3, 4.5**
   *
   * Property: Roll values do NOT affect the outcome when netSL = 0.
   * For any two different roll values that produce the same SL for both sides,
   * the winner is determined solely by target numbers.
   *
   * We test this by using resolveOpposedTest with the same target numbers
   * but varying roll values, and checking that when netSL happens to be 0,
   * the winner is always determined by target comparison, never roll comparison.
   */
  it('roll values do not influence tie-breaking (resolveOpposedTest)', () => {
    fc.assert(
      fc.property(
        arbTargetNumber,
        arbRollValue,
        arbRollValue,
        arbTargetNumber,
        arbRollValue,
        arbRollValue,
        (playerTarget, playerRoll1, playerRoll2, opponentTarget, opponentRoll1, opponentRoll2) => {
          const result1 = resolveOpposedTest(playerTarget, playerRoll1, opponentTarget, opponentRoll1);
          const result2 = resolveOpposedTest(playerTarget, playerRoll2, opponentTarget, opponentRoll2);

          // When both produce netSL = 0, they must produce the same winner
          // (since winner depends only on targets, not rolls)
          if (result1.netSL === 0 && result2.netSL === 0) {
            expect(result1.winner).toBe(result2.winner);
          }
        }
      ),
      { numRuns: 300 }
    );
  });
});

import { processEndOfTurn } from '../end-of-turn';
import { CONDITIONS } from '../../data/conditions';
import { applyCondition } from '../combat';

// Feature: rules-compliance-fixes, Property 5: Poisoned end-of-turn damage
// **Validates: Requirements 9.1, 9.6**

describe('Property 5: Poisoned end-of-turn damage', () => {
  const woundsArb = fc.integer({ min: 1, max: 30 });
  const poisonedLevelArb = fc.integer({ min: 1, max: 10 });

  it('wounds decrease by poisonedLevel (floored at 0) when currentWounds > 0', () => {
    fc.assert(
      fc.property(woundsArb, poisonedLevelArb, (currentWounds, poisonedLevel) => {
        const result = processEndOfTurn({
          currentWounds,
          conditions: [{ name: 'Poisoned', level: poisonedLevel }],
          currentRound: 1,
          tb: 0,
          lowestAP: 0,
        });
        const expected = Math.max(0, currentWounds - poisonedLevel);
        expect(result.newWounds).toBe(expected);
      }),
      { numRuns: 1000 }
    );
  });

  it('when wounds = 0, no further decrease occurs', () => {
    fc.assert(
      fc.property(poisonedLevelArb, (poisonedLevel) => {
        const result = processEndOfTurn({
          currentWounds: 0,
          conditions: [{ name: 'Poisoned', level: poisonedLevel }],
          currentRound: 1,
          tb: 0,
          lowestAP: 0,
        });
        expect(result.newWounds).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('Poisoned damage is flat (ignores TB and AP)', () => {
    fc.assert(
      fc.property(
        woundsArb,
        poisonedLevelArb,
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        (currentWounds, poisonedLevel, tb, lowestAP) => {
          const result = processEndOfTurn({
            currentWounds,
            conditions: [{ name: 'Poisoned', level: poisonedLevel }],
            currentRound: 1,
            tb,
            lowestAP,
          });
          const expected = Math.max(0, currentWounds - poisonedLevel);
          expect(result.newWounds).toBe(expected);
        }
      ),
      { numRuns: 1000 }
    );
  });
});

// Feature: rules-compliance-fixes, Property 6: Condition stackability
// **Validates: Requirements 2.1, 8.1, 8.2, 8.3**

describe('Property 6: Condition stackability', () => {
  const stackableConditions = ['Stunned', 'Blinded', 'Deafened', 'Poisoned'] as const;
  const conditionArb = fc.constantFrom(...stackableConditions);
  const timesArb = fc.integer({ min: 1, max: 15 });

  it('CONDITIONS data marks Stunned/Blinded/Deafened/Poisoned as stackable with maxLevel 10', () => {
    for (const name of stackableConditions) {
      const cond = CONDITIONS.find(c => c.name === name);
      expect(cond).toBeDefined();
      expect(cond!.stackable).toBe(true);
      expect(cond!.maxLevel).toBe(10);
    }
  });

  it('applying a condition N times increments level to min(N, maxLevel)', () => {
    fc.assert(
      fc.property(conditionArb, timesArb, (conditionName, times) => {
        let conditions: { name: string; level: number }[] = [];
        for (let i = 0; i < times; i++) {
          conditions = applyCondition(conditions, conditionName);
        }
        const cond = conditions.find(c => c.name === conditionName);
        expect(cond).toBeDefined();
        const maxLevel = CONDITIONS.find(c => c.name === conditionName)!.maxLevel;
        expect(cond!.level).toBe(Math.min(times, maxLevel));
      }),
      { numRuns: 500 }
    );
  });

  it('level never exceeds maxLevel (10)', () => {
    fc.assert(
      fc.property(conditionArb, timesArb, (conditionName, times) => {
        let conditions: { name: string; level: number }[] = [];
        for (let i = 0; i < times; i++) {
          conditions = applyCondition(conditions, conditionName);
        }
        const cond = conditions.find(c => c.name === conditionName);
        expect(cond).toBeDefined();
        expect(cond!.level).toBeLessThanOrEqual(10);
      }),
      { numRuns: 500 }
    );
  });

  it('each application increments level by exactly 1 until cap', () => {
    fc.assert(
      fc.property(conditionArb, (conditionName) => {
        let conditions: { name: string; level: number }[] = [];
        const maxLevel = CONDITIONS.find(c => c.name === conditionName)!.maxLevel;

        for (let i = 1; i <= maxLevel + 2; i++) {
          conditions = applyCondition(conditions, conditionName);
          const cond = conditions.find(c => c.name === conditionName)!;
          expect(cond.level).toBe(Math.min(i, maxLevel));
        }
      }),
      { numRuns: 100 }
    );
  });
});
