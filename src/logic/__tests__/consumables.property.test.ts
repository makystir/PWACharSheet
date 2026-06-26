import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { decrementDose, incrementDose } from '../consumables';
import type { Consumable } from '../../types/character';

// Feature: ux-polish-and-functionality, Property 9: Consumable Dose Clamping

// ─── Generators ─────────────────────────────────────────────────────────────

const arbConsumable: fc.Arbitrary<Consumable> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 10 }),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  maxDoses: fc.integer({ min: 1, max: 100 }),
  effect: fc.string({ minLength: 0, maxLength: 50 }),
}).chain(({ id, name, maxDoses, effect }) =>
  fc.integer({ min: 0, max: maxDoses }).map(currentDoses => ({
    id,
    name,
    currentDoses,
    maxDoses,
    effect,
  }))
);

type Operation = 'increment' | 'decrement';

const arbOperation: fc.Arbitrary<Operation> = fc.constantFrom('increment', 'decrement');

const arbOperationSequence: fc.Arbitrary<Operation[]> = fc.array(arbOperation, { minLength: 1, maxLength: 50 });

// ─── Helpers ────────────────────────────────────────────────────────────────

function applyOperation(consumable: Consumable, op: Operation): Consumable {
  return op === 'increment' ? incrementDose(consumable) : decrementDose(consumable);
}

function applyOperations(consumable: Consumable, ops: Operation[]): Consumable {
  return ops.reduce((c, op) => applyOperation(c, op), consumable);
}

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-polish-and-functionality', () => {
  describe('Property 9: Consumable Dose Clamping', () => {
    /**
     * **Validates: Requirements 10.6, 10.7**
     */

    it('after any sequence of increment/decrement operations, currentDoses is always in [0, maxDoses]', () => {
      fc.assert(
        fc.property(
          arbConsumable,
          arbOperationSequence,
          (consumable, ops) => {
            const result = applyOperations(consumable, ops);

            expect(result.currentDoses).toBeGreaterThanOrEqual(0);
            expect(result.currentDoses).toBeLessThanOrEqual(result.maxDoses);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('decrementing always floors at 0 — never produces a negative value', () => {
      fc.assert(
        fc.property(
          arbConsumable,
          (consumable) => {
            // Apply more decrements than maxDoses to ensure floor behavior
            let c = consumable;
            for (let i = 0; i < consumable.maxDoses + 5; i++) {
              c = decrementDose(c);
            }

            expect(c.currentDoses).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('incrementing always caps at maxDoses — never exceeds the maximum', () => {
      fc.assert(
        fc.property(
          arbConsumable,
          (consumable) => {
            // Apply more increments than maxDoses to ensure cap behavior
            let c = consumable;
            for (let i = 0; i < consumable.maxDoses + 5; i++) {
              c = incrementDose(c);
            }

            expect(c.currentDoses).toBe(consumable.maxDoses);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('at every intermediate step of a sequence, currentDoses remains in [0, maxDoses]', () => {
      fc.assert(
        fc.property(
          arbConsumable,
          arbOperationSequence,
          (consumable, ops) => {
            let c = consumable;
            for (const op of ops) {
              c = applyOperation(c, op);
              expect(c.currentDoses).toBeGreaterThanOrEqual(0);
              expect(c.currentDoses).toBeLessThanOrEqual(c.maxDoses);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
