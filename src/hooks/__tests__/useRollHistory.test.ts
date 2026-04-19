import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRollHistory } from '../../hooks/useRollHistory';
import type { RollResult } from '../../logic/dice-roller';

/** Build a mock RollResult with sensible defaults, overridable via partial. */
function mockRollResult(overrides: Partial<RollResult> = {}): RollResult {
  return {
    roll: 42,
    targetNumber: 50,
    baseTarget: 50,
    difficulty: 'Challenging',
    passed: true,
    sl: 1,
    isCritical: false,
    isFumble: false,
    isAutoSuccess: false,
    isAutoFailure: false,
    outcome: 'Marginal Success',
    skillOrCharName: 'Melee (Basic)',
    timestamp: Date.now(),
    ...overrides,
  };
}

// Feature: dice-roller, Property 11: Roll history maintains reverse chronological order
describe('useRollHistory — addRoll prepends entries (newest first) and history length grows', () => {
  it('starts with an empty history', () => {
    const { result } = renderHook(() => useRollHistory());
    expect(result.current.history).toEqual([]);
  });

  it('adds a single roll and history length becomes 1', () => {
    const { result } = renderHook(() => useRollHistory());
    const roll = mockRollResult({ skillOrCharName: 'Cool' });

    act(() => result.current.addRoll(roll));

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].result.skillOrCharName).toBe('Cool');
  });

  it('prepends newer rolls so the most recent is at index 0', () => {
    const { result } = renderHook(() => useRollHistory());
    const first = mockRollResult({ skillOrCharName: 'Dodge', roll: 10 });
    const second = mockRollResult({ skillOrCharName: 'Athletics', roll: 55 });
    const third = mockRollResult({ skillOrCharName: 'Cool', roll: 88 });

    act(() => result.current.addRoll(first));
    act(() => result.current.addRoll(second));
    act(() => result.current.addRoll(third));

    expect(result.current.history).toHaveLength(3);
    // Newest first
    expect(result.current.history[0].result.skillOrCharName).toBe('Cool');
    expect(result.current.history[1].result.skillOrCharName).toBe('Athletics');
    expect(result.current.history[2].result.skillOrCharName).toBe('Dodge');
  });

  it('history length equals the number of rolls added', () => {
    const { result } = renderHook(() => useRollHistory());

    for (let i = 0; i < 5; i++) {
      act(() => result.current.addRoll(mockRollResult({ roll: i + 1 })));
    }

    expect(result.current.history).toHaveLength(5);
  });
});

describe('useRollHistory — clearHistory empties the history array', () => {
  it('clears all entries from a populated history', () => {
    const { result } = renderHook(() => useRollHistory());

    act(() => result.current.addRoll(mockRollResult({ skillOrCharName: 'Dodge' })));
    act(() => result.current.addRoll(mockRollResult({ skillOrCharName: 'Cool' })));
    expect(result.current.history).toHaveLength(2);

    act(() => result.current.clearHistory());

    expect(result.current.history).toEqual([]);
    expect(result.current.history).toHaveLength(0);
  });

  it('clearing an already-empty history is a no-op', () => {
    const { result } = renderHook(() => useRollHistory());

    act(() => result.current.clearHistory());

    expect(result.current.history).toEqual([]);
  });

  it('allows adding rolls again after clearing', () => {
    const { result } = renderHook(() => useRollHistory());

    act(() => result.current.addRoll(mockRollResult({ skillOrCharName: 'Perception' })));
    act(() => result.current.clearHistory());
    act(() => result.current.addRoll(mockRollResult({ skillOrCharName: 'Stealth' })));

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].result.skillOrCharName).toBe('Stealth');
  });
});

describe('useRollHistory — each entry gets a unique auto-incrementing id', () => {
  it('assigns incrementing ids starting from 1', () => {
    const { result } = renderHook(() => useRollHistory());

    act(() => result.current.addRoll(mockRollResult()));
    act(() => result.current.addRoll(mockRollResult()));
    act(() => result.current.addRoll(mockRollResult()));

    // History is newest-first, so ids are 3, 2, 1
    const ids = result.current.history.map((e) => e.id);
    expect(ids).toEqual([3, 2, 1]);
  });

  it('all ids are unique across multiple additions', () => {
    const { result } = renderHook(() => useRollHistory());

    for (let i = 0; i < 10; i++) {
      act(() => result.current.addRoll(mockRollResult()));
    }

    const ids = result.current.history.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('ids continue incrementing after clearHistory (no reset)', () => {
    const { result } = renderHook(() => useRollHistory());

    act(() => result.current.addRoll(mockRollResult()));
    act(() => result.current.addRoll(mockRollResult()));
    // ids so far: 1, 2
    act(() => result.current.clearHistory());

    act(() => result.current.addRoll(mockRollResult()));
    // nextId should be 3, not 1
    expect(result.current.history[0].id).toBe(3);
  });
});
