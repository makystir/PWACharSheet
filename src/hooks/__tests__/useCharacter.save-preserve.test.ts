import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCharacter } from '../useCharacter';
import { BLANK_CHARACTER } from '../../types/character';

/**
 * Preservation Tests — Normal Debounced Save Behavior Unchanged
 *
 * Validates: Requirements 3.1, 3.2, 3.3
 *
 * These tests verify that the existing debounce auto-save behavior is preserved.
 * They are written BEFORE the fix and run on UNFIXED code first to establish
 * baseline behavior, then re-run after the fix to confirm no regressions.
 */

vi.mock('../../storage/character-manager', () => ({
  saveCharacter: vi.fn(),
}));

// Must import after mock setup
import { saveCharacter } from '../../storage/character-manager';

const mockedSaveCharacter = vi.mocked(saveCharacter);

const TEST_ID = 'test-char-id';

function makeTestCharacter() {
  return structuredClone(BLANK_CHARACTER);
}

describe('Preservation — Normal Debounced Save Behavior Unchanged', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedSaveCharacter.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Test Case 1 — Normal Debounce Save: saves after 500ms', () => {
    const initial = makeTestCharacter();
    const { result } = renderHook(() => useCharacter(TEST_ID, initial));

    // Edit character name — starts a 500ms debounce timer
    act(() => {
      result.current.update('name', 'Saved');
    });

    // Advance timer by 500ms — debounce should fire
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // saveCharacter should have been called exactly once with the updated character
    expect(mockedSaveCharacter).toHaveBeenCalledTimes(1);
    expect(mockedSaveCharacter).toHaveBeenCalledWith(
      TEST_ID,
      expect.objectContaining({ name: 'Saved' })
    );
  });

  it('Test Case 2 — No Unnecessary Save on Unload (clean state): no save when no edits made', () => {
    const initial = makeTestCharacter();
    renderHook(() => useCharacter(TEST_ID, initial));

    // Fire beforeunload without making any edits
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    // saveCharacter should NOT have been called — no pending changes
    expect(mockedSaveCharacter).not.toHaveBeenCalled();
  });

  it('Test Case 3 — Multiple Rapid Edits Coalesce: only final state is saved', () => {
    const initial = makeTestCharacter();
    const { result } = renderHook(() => useCharacter(TEST_ID, initial));

    // Make rapid successive edits
    act(() => {
      result.current.update('name', 'A');
    });
    act(() => {
      result.current.update('name', 'B');
    });
    act(() => {
      result.current.update('name', 'C');
    });

    // Advance timer by 500ms after last edit — debounce should fire once
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // saveCharacter should have been called with the final state containing name 'C'
    // Note: on unfixed code, each update triggers a new effect which clears the
    // previous timer and starts a new one, so only the last debounce fires.
    const callsWithC = mockedSaveCharacter.mock.calls.filter(
      (call) => (call[1] as { name: string }).name === 'C'
    );
    expect(callsWithC.length).toBe(1);
  });

  it('Test Case 4 — No Double Save After Flush + Timer: beforeunload then timer does not double-save', () => {
    const initial = makeTestCharacter();
    const { result } = renderHook(() => useCharacter(TEST_ID, initial));

    // Edit character name — starts a 500ms debounce timer
    act(() => {
      result.current.update('name', 'Flushed');
    });

    // Fire beforeunload (flush attempt)
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    // Advance timer by 500ms — debounce timer would fire
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // On UNFIXED code: beforeunload does nothing (no listener), so the debounce
    // timer fires once at 500ms. saveCharacter should be called exactly once.
    // On FIXED code: beforeunload flushes the save, and the debounce timer should
    // be cancelled or the flush should prevent a duplicate. Still exactly once.
    expect(mockedSaveCharacter).toHaveBeenCalledTimes(1);
    expect(mockedSaveCharacter).toHaveBeenCalledWith(
      TEST_ID,
      expect.objectContaining({ name: 'Flushed' })
    );
  });
});
