import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Combatant } from '../../types/character';
import { sortByInitiative, nextTurn } from '../initiative';

// ─── Generators ─────────────────────────────────────────────────────────────

const arbCombatant: fc.Arbitrary<Combatant> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  initiative: fc.integer({ min: -100, max: 200 }),
});

const arbCombatantList: fc.Arbitrary<Combatant[]> = fc.array(arbCombatant, { minLength: 0, maxLength: 20 });

const arbNonEmptyCombatantList: fc.Arbitrary<Combatant[]> = fc.array(arbCombatant, { minLength: 1, maxLength: 20 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-polish-and-functionality, Initiative Logic', () => {
  /**
   * **Validates: Requirements 19.3, 19.8**
   *
   * Property 13: Initiative Sort Invariant — sorted list has each
   * initiative ≤ previous (descending order).
   */
  it('Property 13: Initiative Sort Invariant', () => {
    fc.assert(
      fc.property(
        arbCombatantList,
        (combatants) => {
          const sorted = sortByInitiative(combatants);

          // Length preserved
          expect(sorted.length).toBe(combatants.length);

          // Descending order: each initiative ≤ previous
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].initiative).toBeLessThanOrEqual(sorted[i - 1].initiative);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 19.5**
   *
   * Property 14: Initiative Turn Cycling — calling nextTurn N times
   * from any starting index returns to the original index (complete cycle).
   */
  it('Property 14: Initiative Turn Cycling', () => {
    fc.assert(
      fc.property(
        arbNonEmptyCombatantList,
        (combatants) => {
          const N = combatants.length;
          // Pick an arbitrary starting index within bounds
          const startIndex = 0;

          let currentIndex = startIndex;
          for (let i = 0; i < N; i++) {
            currentIndex = nextTurn(currentIndex, N);
          }

          // After N steps, we should be back at the start
          expect(currentIndex).toBe(startIndex);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional cycling test with arbitrary starting index.
   * **Validates: Requirements 19.5**
   */
  it('Property 14b: Initiative Turn Cycling from arbitrary start', () => {
    fc.assert(
      fc.property(
        arbNonEmptyCombatantList,
        fc.nat(),
        (combatants, startSeed) => {
          const N = combatants.length;
          const startIndex = startSeed % N;

          let currentIndex = startIndex;
          for (let i = 0; i < N; i++) {
            currentIndex = nextTurn(currentIndex, N);
          }

          // After N steps from any start, we should be back at that start
          expect(currentIndex).toBe(startIndex);
        }
      ),
      { numRuns: 100 }
    );
  });
});
