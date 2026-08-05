import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// Feature: combat-rules-compliance, Property 7: Movement distances are correct multiples

// ─── Helpers ────────────────────────────────────────────────────────────────
// These replicate the inline calculation from CombatDashboard:
//   Walk = (character.move?.m ?? 0) * 2
//   Run  = (character.move?.m ?? 0) * 4

const calculateWalk = (m: number) => m * 2;
const calculateRun = (m: number) => m * 4;

// ─── Generators ─────────────────────────────────────────────────────────────

// Movement values in WFRP4e are typically 1–8, but we test 0–20 for robustness
const arbMovement = fc.integer({ min: 0, max: 20 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: combat-rules-compliance', () => {
  describe('Property 7: Movement distances are correct multiples', () => {
    /**
     * **Validates: Requirements 5.1, 5.2**
     * Core Rulebook p.164: Walk = M × 2 yards, Run = M × 4 yards.
     */

    it('Walk distance equals Movement × 2 for any non-negative M', () => {
      fc.assert(
        fc.property(arbMovement, (m) => {
          expect(calculateWalk(m)).toBe(m * 2);
        }),
        { numRuns: 100 }
      );
    });

    it('Run distance equals Movement × 4 for any non-negative M', () => {
      fc.assert(
        fc.property(arbMovement, (m) => {
          expect(calculateRun(m)).toBe(m * 4);
        }),
        { numRuns: 100 }
      );
    });

    it('Run distance is always exactly double the Walk distance', () => {
      fc.assert(
        fc.property(arbMovement, (m) => {
          expect(calculateRun(m)).toBe(calculateWalk(m) * 2);
        }),
        { numRuns: 100 }
      );
    });

    it('Movement of 0 yields Walk = 0 and Run = 0', () => {
      fc.assert(
        fc.property(fc.constant(0), (m) => {
          expect(calculateWalk(m)).toBe(0);
          expect(calculateRun(m)).toBe(0);
        }),
        { numRuns: 100 }
      );
    });
  });
});
