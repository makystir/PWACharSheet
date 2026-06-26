import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useRollHistory } from '../useRollHistory';
import type { RollResult } from '../../logic/dice-roller';
import type { DifficultyLevel, OutcomeDescription } from '../../logic/dice-roller';

// Feature: ux-polish-and-functionality, Property 12: Roll History Persistence Invariant

// ─── Generators ─────────────────────────────────────────────────────────────

const arbDifficulty: fc.Arbitrary<DifficultyLevel> = fc.constantFrom(
  'Very Easy', 'Easy', 'Average', 'Challenging', 'Difficult', 'Hard', 'Very Hard'
);

const arbOutcome: fc.Arbitrary<OutcomeDescription> = fc.constantFrom(
  'Astounding Success', 'Impressive Success', 'Success', 'Marginal Success',
  'Marginal Failure', 'Failure', 'Impressive Failure', 'Astounding Failure'
);

const arbRollResult: fc.Arbitrary<RollResult> = fc.record({
  roll: fc.integer({ min: 1, max: 100 }),
  targetNumber: fc.integer({ min: 1, max: 200 }),
  baseTarget: fc.integer({ min: 1, max: 200 }),
  difficulty: arbDifficulty,
  passed: fc.boolean(),
  sl: fc.integer({ min: -10, max: 10 }),
  isCritical: fc.boolean(),
  isFumble: fc.boolean(),
  isAutoSuccess: fc.boolean(),
  isAutoFailure: fc.boolean(),
  outcome: arbOutcome,
  skillOrCharName: fc.string({ minLength: 1, maxLength: 30 }),
  timestamp: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
});

const arbRollSequence: fc.Arbitrary<RollResult[]> = fc.array(arbRollResult, {
  minLength: 0,
  maxLength: 80,
});

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-polish-and-functionality', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Property 12: Roll History Persistence Invariant', () => {
    /**
     * **Validates: Requirements 18.1, 18.3, 18.5**
     */

    it('for any sequence of N additions, persisted history contains min(N, 50) entries representing most recent rolls in chronological order', () => {
      fc.assert(
        fc.property(
          arbRollSequence,
          (rolls) => {
            localStorage.clear();

            const { result } = renderHook(() => useRollHistory());

            // Add all rolls
            for (const roll of rolls) {
              act(() => result.current.addRoll(roll));
            }

            const history = result.current.history;
            const N = rolls.length;
            const expectedLength = Math.min(N, 50);

            // History contains exactly min(N, 50) entries
            expect(history).toHaveLength(expectedLength);

            // Verify the entries represent the most recent rolls (newest first)
            if (N > 0) {
              const mostRecentRolls = rolls.slice(-expectedLength).reverse();
              for (let i = 0; i < expectedLength; i++) {
                expect(history[i].result.roll).toBe(mostRecentRolls[i].roll);
                expect(history[i].result.skillOrCharName).toBe(mostRecentRolls[i].skillOrCharName);
                expect(history[i].result.targetNumber).toBe(mostRecentRolls[i].targetNumber);
              }
            }

            // Verify persistence: check localStorage matches in-memory state
            const stored = JSON.parse(localStorage.getItem('wfrp-roll-history') || '[]');
            expect(stored).toHaveLength(expectedLength);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('history survives simulated page reload and restores most recent entries in order', () => {
      fc.assert(
        fc.property(
          arbRollSequence,
          (rolls) => {
            localStorage.clear();

            // First mount: add rolls
            const { result, unmount } = renderHook(() => useRollHistory());

            for (const roll of rolls) {
              act(() => result.current.addRoll(roll));
            }

            unmount();

            // Second mount: simulate page reload
            const { result: reloadedResult } = renderHook(() => useRollHistory());

            const history = reloadedResult.current.history;
            const N = rolls.length;
            const expectedLength = Math.min(N, 50);

            // Restored history has correct length
            expect(history).toHaveLength(expectedLength);

            // Restored history preserves chronological order (newest first)
            if (expectedLength > 0) {
              const mostRecentRolls = rolls.slice(-expectedLength).reverse();
              for (let i = 0; i < expectedLength; i++) {
                expect(history[i].result.roll).toBe(mostRecentRolls[i].roll);
                expect(history[i].result.skillOrCharName).toBe(mostRecentRolls[i].skillOrCharName);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('adding beyond 50 entries always trims oldest — persisted count never exceeds 50', () => {
      fc.assert(
        fc.property(
          fc.array(arbRollResult, { minLength: 51, maxLength: 80 }),
          (rolls) => {
            localStorage.clear();

            const { result } = renderHook(() => useRollHistory());

            for (const roll of rolls) {
              act(() => result.current.addRoll(roll));
            }

            // In-memory never exceeds 50
            expect(result.current.history).toHaveLength(50);

            // localStorage never exceeds 50
            const stored = JSON.parse(localStorage.getItem('wfrp-roll-history') || '[]');
            expect(stored).toHaveLength(50);

            // Most recent roll is at index 0
            const lastRoll = rolls[rolls.length - 1];
            expect(result.current.history[0].result.roll).toBe(lastRoll.roll);
            expect(result.current.history[0].result.skillOrCharName).toBe(lastRoll.skillOrCharName);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
