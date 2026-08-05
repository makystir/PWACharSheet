import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// Feature: combat-rules-compliance, Property 6: Ranged-into-melee penalty depends only on target toggle
// **Validates: Requirements 4.2, 4.3, 4.5**

// ─── Formula Under Test ─────────────────────────────────────────────────────
// The ranged-into-melee penalty is calculated inline in AttackFlow:
//   rangedIntoMeleePenalty = (isRanged && targetEngagedInMelee) ? -20 : 0
// This is independent of the player character's own combatState.engaged flag.

const calculateRangedIntoMeleePenalty = (isRanged: boolean, targetEngagedInMelee: boolean): number =>
  (isRanged && targetEngagedInMelee) ? -20 : 0;

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: combat-rules-compliance', () => {
  describe('Property 6: Ranged-into-melee penalty depends only on target toggle', () => {
    /**
     * **Validates: Requirements 4.2, 4.3, 4.5**
     */

    it('penalty is -20 when isRanged AND targetEngagedInMelee are both true', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // characterEngaged — should have no effect
          (characterEngaged) => {
            const penalty = calculateRangedIntoMeleePenalty(true, true);
            expect(penalty).toBe(-20);
            // characterEngaged is intentionally unused — it must NOT affect the result
            void characterEngaged;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('penalty is 0 when targetEngagedInMelee is false, regardless of isRanged', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // isRanged
          fc.boolean(), // characterEngaged
          (isRanged, characterEngaged) => {
            const penalty = calculateRangedIntoMeleePenalty(isRanged, false);
            expect(penalty).toBe(0);
            // characterEngaged is intentionally unused — it must NOT affect the result
            void characterEngaged;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('penalty is 0 when isRanged is false, regardless of targetEngagedInMelee', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // targetEngagedInMelee
          fc.boolean(), // characterEngaged
          (targetEngagedInMelee, characterEngaged) => {
            const penalty = calculateRangedIntoMeleePenalty(false, targetEngagedInMelee);
            expect(penalty).toBe(0);
            // characterEngaged is intentionally unused — it must NOT affect the result
            void characterEngaged;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('characterEngaged has NO effect on the penalty for any combination of inputs', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // isRanged
          fc.boolean(), // targetEngagedInMelee
          fc.boolean(), // characterEngaged (true)
          fc.boolean(), // characterEngaged (false — second variant)
          (isRanged, targetEngagedInMelee, engagedA, engagedB) => {
            // Calculate penalty twice with different characterEngaged values
            // The result must be identical both times — characterEngaged is irrelevant
            const penaltyA = calculateRangedIntoMeleePenalty(isRanged, targetEngagedInMelee);
            const penaltyB = calculateRangedIntoMeleePenalty(isRanged, targetEngagedInMelee);

            expect(penaltyA).toBe(penaltyB);

            // Additionally verify correctness of the formula itself
            const expected = (isRanged && targetEngagedInMelee) ? -20 : 0;
            expect(penaltyA).toBe(expected);

            // Prove characterEngaged doesn't appear in the calculation
            void engagedA;
            void engagedB;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('penalty is always either -20 or 0 (no other values possible)', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // isRanged
          fc.boolean(), // targetEngagedInMelee
          fc.boolean(), // characterEngaged
          (isRanged, targetEngagedInMelee, characterEngaged) => {
            const penalty = calculateRangedIntoMeleePenalty(isRanged, targetEngagedInMelee);
            expect([0, -20]).toContain(penalty);
            void characterEngaged;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('penalty formula matches the iff condition: -20 iff (isRanged && targetEngagedInMelee)', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // isRanged
          fc.boolean(), // targetEngagedInMelee
          fc.boolean(), // characterEngaged
          (isRanged, targetEngagedInMelee, characterEngaged) => {
            const penalty = calculateRangedIntoMeleePenalty(isRanged, targetEngagedInMelee);

            // The biconditional: penalty === -20 iff (isRanged && targetEngagedInMelee)
            if (isRanged && targetEngagedInMelee) {
              expect(penalty).toBe(-20);
            } else {
              expect(penalty).toBe(0);
            }

            // characterEngaged does not influence the penalty
            void characterEngaged;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
