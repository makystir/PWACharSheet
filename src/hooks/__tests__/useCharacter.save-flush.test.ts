import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCharacter } from '../useCharacter';
import { BLANK_CHARACTER } from '../../types/character';

/**
 * Bug Condition Exploration Tests — Lifecycle Events Drop Pending Saves
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 *
 * These tests encode the EXPECTED (correct) behavior: saveCharacter should be
 * called when lifecycle events fire while a debounced save is pending.
 *
 * On UNFIXED code, all 4 tests are expected to FAIL — confirming the bug exists.
 * After the fix is applied, all 4 tests should PASS.
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

describe('Bug Condition — Lifecycle Events Drop Pending Saves', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedSaveCharacter.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Test Case 1 — Tab Close: flushes pending save on beforeunload', () => {
    const initial = makeTestCharacter();
    const { result } = renderHook(() => useCharacter(TEST_ID, initial));

    // Edit character name — starts a 500ms debounce timer
    act(() => {
      result.current.update('name', 'NewName');
    });

    // Advance only 200ms — debounce has NOT fired yet
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Fire beforeunload (tab close) before debounce completes
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    // saveCharacter should have been called with the updated state
    expect(mockedSaveCharacter).toHaveBeenCalled();
    const savedChar = mockedSaveCharacter.mock.calls.find(
      (call) => (call[1] as { name: string }).name === 'NewName'
    );
    expect(savedChar).toBeDefined();
  });

  it('Test Case 2 — Page Reload: flushes pending save on beforeunload', () => {
    const initial = makeTestCharacter();
    const { result } = renderHook(() => useCharacter(TEST_ID, initial));

    // Edit species — starts a 500ms debounce timer
    act(() => {
      result.current.update('species', 'Dwarf');
    });

    // Advance only 100ms — debounce has NOT fired yet
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Fire beforeunload (page reload) before debounce completes
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    // saveCharacter should have been called with the updated state
    expect(mockedSaveCharacter).toHaveBeenCalled();
    const savedChar = mockedSaveCharacter.mock.calls.find(
      (call) => (call[1] as { species: string }).species === 'Dwarf'
    );
    expect(savedChar).toBeDefined();
  });

  it('Test Case 3 — Mobile Background: flushes pending save on visibilitychange hidden', () => {
    const initial = makeTestCharacter();
    const { result } = renderHook(() => useCharacter(TEST_ID, initial));

    // Edit career — starts a 500ms debounce timer
    act(() => {
      result.current.update('career', 'Soldier');
    });

    // Advance only 300ms — debounce has NOT fired yet
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Simulate mobile app backgrounding
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // saveCharacter should have been called with the updated state
    expect(mockedSaveCharacter).toHaveBeenCalled();
    const savedChar = mockedSaveCharacter.mock.calls.find(
      (call) => (call[1] as { career: string }).career === 'Soldier'
    );
    expect(savedChar).toBeDefined();

    // Restore visibilityState
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
  });

  it('Test Case 4 — Hook Unmount: flushes pending save on unmount', () => {
    const initial = makeTestCharacter();
    const { result, unmount } = renderHook(() => useCharacter(TEST_ID, initial));

    // Edit name — starts a 500ms debounce timer
    act(() => {
      result.current.update('name', 'Unmounted');
    });

    // Unmount before debounce fires (no time advance)
    unmount();

    // saveCharacter should have been called with the updated state
    expect(mockedSaveCharacter).toHaveBeenCalled();
    const savedChar = mockedSaveCharacter.mock.calls.find(
      (call) => (call[1] as { name: string }).name === 'Unmounted'
    );
    expect(savedChar).toBeDefined();
  });
});
