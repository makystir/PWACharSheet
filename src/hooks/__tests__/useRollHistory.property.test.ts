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

// Feature: quality-of-life-improvements, Property 3: Roll History Persistence Round-Trip
describe('Feature: quality-of-life-improvements', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Property 3: Roll History Persistence Round-Trip', () => {
    /**
     * **Validates: Requirements 3.1, 3.3**
     *
     * For any sequence of roll history entries (up to 50), persisting to
     * localStorage and then loading SHALL return an equivalent ordered list.
     */

    it('for any sequence of entries (up to 50), persist then load returns equivalent ordered list', () => {
      fc.assert(
        fc.property(
          fc.array(arbRollResult, { minLength: 0, maxLength: 50 }),
          (rolls) => {
            localStorage.clear();

            // Mount hook and add all rolls
            const { result, unmount } = renderHook(() => useRollHistory());

            for (const roll of rolls) {
              act(() => result.current.addRoll(roll));
            }

            // Capture in-memory history before unmount
            const historyBeforeReload = result.current.history.map((e) => ({
              roll: e.result.roll,
              targetNumber: e.result.targetNumber,
              skillOrCharName: e.result.skillOrCharName,
              sl: e.result.sl,
              passed: e.result.passed,
              timestamp: e.result.timestamp,
            }));

            // Unmount to simulate page close
            unmount();

            // Remount to simulate page reload — loads from localStorage
            const { result: reloadedResult } = renderHook(() => useRollHistory());

            const historyAfterReload = reloadedResult.current.history.map((e) => ({
              roll: e.result.roll,
              targetNumber: e.result.targetNumber,
              skillOrCharName: e.result.skillOrCharName,
              sl: e.result.sl,
              passed: e.result.passed,
              timestamp: e.result.timestamp,
            }));

            // Round-trip: loaded data matches what was persisted
            expect(historyAfterReload).toHaveLength(historyBeforeReload.length);
            expect(historyAfterReload).toEqual(historyBeforeReload);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('persisting entries preserves their chronological order (newest first)', () => {
      fc.assert(
        fc.property(
          fc.array(arbRollResult, { minLength: 2, maxLength: 50 }),
          (rolls) => {
            localStorage.clear();

            const { result, unmount } = renderHook(() => useRollHistory());

            for (const roll of rolls) {
              act(() => result.current.addRoll(roll));
            }

            unmount();

            // Reload from localStorage
            const { result: reloadedResult } = renderHook(() => useRollHistory());
            const history = reloadedResult.current.history;

            // The last added roll should be first in history (newest first)
            const lastAdded = rolls[rolls.length - 1];
            expect(history[0].result.roll).toBe(lastAdded.roll);
            expect(history[0].result.skillOrCharName).toBe(lastAdded.skillOrCharName);
            expect(history[0].result.targetNumber).toBe(lastAdded.targetNumber);

            // The first added roll should be last (if within 50 cap)
            const firstAdded = rolls[0];
            expect(history[history.length - 1].result.roll).toBe(firstAdded.roll);
            expect(history[history.length - 1].result.skillOrCharName).toBe(firstAdded.skillOrCharName);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// Feature: quality-of-life-improvements, Property 4: Roll History Maximum Length Invariant
describe('Feature: quality-of-life-improvements - Property 4', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Property 4: Roll History Maximum Length Invariant', () => {
    /**
     * **Validates: Requirements 3.2**
     *
     * For any sequence of roll additions, the roll history length SHALL never
     * exceed 50 entries, and when the limit is reached, the oldest entries
     * SHALL be the ones discarded.
     */

    it('for any sequence of additions (0-80), history length never exceeds 50', () => {
      fc.assert(
        fc.property(
          fc.array(arbRollResult, { minLength: 0, maxLength: 80 }),
          (rolls) => {
            localStorage.clear();

            const { result } = renderHook(() => useRollHistory());

            for (const roll of rolls) {
              act(() => result.current.addRoll(roll));
              // Invariant: length never exceeds 50 at any point
              expect(result.current.history.length).toBeLessThanOrEqual(50);
            }

            // Final state: length is min(N, 50)
            expect(result.current.history.length).toBe(Math.min(rolls.length, 50));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('when more than 50 rolls are added, the history contains only the 50 most recent ones', () => {
      fc.assert(
        fc.property(
          fc.array(arbRollResult, { minLength: 51, maxLength: 80 }),
          (rolls) => {
            localStorage.clear();

            const { result } = renderHook(() => useRollHistory());

            for (const roll of rolls) {
              act(() => result.current.addRoll(roll));
            }

            const history = result.current.history;

            // Length is exactly 50
            expect(history).toHaveLength(50);

            // History contains the 50 most recent rolls (newest first)
            const mostRecent50 = rolls.slice(-50).reverse();
            for (let i = 0; i < 50; i++) {
              expect(history[i].result.roll).toBe(mostRecent50[i].roll);
              expect(history[i].result.targetNumber).toBe(mostRecent50[i].targetNumber);
              expect(history[i].result.skillOrCharName).toBe(mostRecent50[i].skillOrCharName);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('oldest entries (first added) are the ones discarded when limit is reached', () => {
      fc.assert(
        fc.property(
          fc.array(arbRollResult, { minLength: 51, maxLength: 80 }),
          (rolls) => {
            localStorage.clear();

            const { result } = renderHook(() => useRollHistory());

            for (const roll of rolls) {
              act(() => result.current.addRoll(roll));
            }

            const history = result.current.history;
            const N = rolls.length;

            // The oldest entries (indices 0 to N-51) should NOT be in the history
            const discardedRolls = rolls.slice(0, N - 50);
            const retainedRolls = rolls.slice(N - 50);

            // Verify retained: all 50 most recent are present (newest first)
            const historyRolls = history.map((e) => e.result.roll);
            for (const retained of retainedRolls) {
              expect(historyRolls).toContain(retained.roll);
            }

            // Verify the newest roll is at index 0
            expect(history[0].result.roll).toBe(rolls[N - 1].roll);
            expect(history[0].result.skillOrCharName).toBe(rolls[N - 1].skillOrCharName);

            // Verify order: history is newest-first (reverse of addition order for retained)
            const expectedOrder = retainedRolls.reverse();
            for (let i = 0; i < 50; i++) {
              expect(history[i].result.roll).toBe(expectedOrder[i].roll);
              expect(history[i].result.skillOrCharName).toBe(expectedOrder[i].skillOrCharName);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

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
