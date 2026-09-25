import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCharacter } from '../useCharacter';
import { BLANK_CHARACTER } from '../../types/character';

/**
 * Lifecycle-parity tests (spec: state-safety-core, Task 11).
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 * Design: "Property 5: Reset is not a save" and
 * "Req 6.5 (lifecycle parity): prop-driven reset does NOT trigger a save;
 *  unload and visibility-hidden do; no-pending flush is a no-op."
 *
 * These assert that the reworked persistence model (commit()/always-current ref)
 * keeps the SAME lifecycle-save behavior as before:
 *   - Req 6.1: a prop-driven reset (Character_Switch / import) is NOT persisted
 *     as if it were a user edit.
 *   - Req 6.2: `beforeunload` flushes a pending edit.
 *   - Req 6.3: `visibilitychange` -> hidden flushes a pending edit.
 *   - Req 6.4: with no pending edit, a flush is a no-op (no mismatched overwrite).
 *   - Req 6.5: the above match pre-existing behavior.
 */

vi.mock('../../storage/character-manager', () => ({
  saveCharacter: vi.fn(),
}));

// Must import after mock setup
import { saveCharacter } from '../../storage/character-manager';

const mockedSaveCharacter = vi.mocked(saveCharacter);

const TEST_ID = 'test-char-id';
const SWITCHED_ID = 'switched-char-id';

function makeTestCharacter() {
  return structuredClone(BLANK_CHARACTER);
}

/** Helper: set document.visibilityState the way jsdom permits (existing convention). */
function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    writable: true,
    configurable: true,
  });
}

describe('Lifecycle parity — Character_Switch / import / unload / visibility (Req 6.1–6.5)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedSaveCharacter.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    setVisibility('visible');
  });

  it('Req 6.1/6.5 — prop-driven reset via characterId change (Character_Switch) does NOT save', () => {
    const initial = makeTestCharacter();
    const { rerender } = renderHook(
      ({ id, char }) => useCharacter(id, char),
      { initialProps: { id: TEST_ID, char: initial } }
    );

    // Let any first-render bookkeeping settle. No edit made, so nothing pending.
    act(() => {
      vi.advanceTimersByTime(500);
    });
    mockedSaveCharacter.mockClear();

    // Simulate a character switch: new id + new external character.
    const switched = { ...makeTestCharacter(), name: 'SwitchedInHero' };
    act(() => {
      rerender({ id: SWITCHED_ID, char: switched });
    });

    // Advance well past the debounce window — the reset commit must NOT persist.
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockedSaveCharacter).not.toHaveBeenCalled();
  });

  it('Req 6.1/6.5 — prop-driven reset via initialCharacter change (import) does NOT save', () => {
    const initial = makeTestCharacter();
    const { rerender } = renderHook(
      ({ id, char }) => useCharacter(id, char),
      { initialProps: { id: TEST_ID, char: initial } }
    );

    // Make and persist a real user edit first, then clear the mock so we only
    // observe whether the subsequent reset (import) triggers a save.
    act(() => {
      vi.advanceTimersByTime(500);
    });
    mockedSaveCharacter.mockClear();

    // Import: same id, but a brand-new initialCharacter reference/value.
    const imported = { ...makeTestCharacter(), name: 'ImportedHero' };
    act(() => {
      rerender({ id: TEST_ID, char: imported });
    });

    // Advance past the debounce — the import reset must NOT be persisted as an edit.
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockedSaveCharacter).not.toHaveBeenCalled();
  });

  it('Req 6.1 — a user edit AFTER a reset still persists normally (reset flag cleared)', () => {
    const initial = makeTestCharacter();
    const { result, rerender } = renderHook(
      ({ id, char }) => useCharacter(id, char),
      { initialProps: { id: TEST_ID, char: initial } }
    );

    // Trigger a prop-driven reset.
    const switched = { ...makeTestCharacter(), name: 'SwitchedInHero' };
    act(() => {
      rerender({ id: SWITCHED_ID, char: switched });
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    mockedSaveCharacter.mockClear();

    // A genuine user edit after the reset should re-arm the debounce and save.
    act(() => {
      result.current.update('name', 'EditedAfterSwitch');
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockedSaveCharacter).toHaveBeenCalledWith(
      SWITCHED_ID,
      expect.objectContaining({ name: 'EditedAfterSwitch' })
    );
  });

  it('Req 6.2/6.5 — beforeunload flushes a pending edit', () => {
    const initial = makeTestCharacter();
    const { result } = renderHook(() => useCharacter(TEST_ID, initial));

    // Make an edit but do NOT advance past the 500ms debounce — it stays pending.
    act(() => {
      result.current.update('name', 'PendingUnload');
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    expect(mockedSaveCharacter).toHaveBeenCalled();
    expect(mockedSaveCharacter).toHaveBeenLastCalledWith(
      TEST_ID,
      expect.objectContaining({ name: 'PendingUnload' })
    );
  });

  it('Req 6.3/6.5 — visibilitychange to hidden flushes a pending edit', () => {
    const initial = makeTestCharacter();
    const { result } = renderHook(() => useCharacter(TEST_ID, initial));

    // Pending edit (not yet debounced).
    act(() => {
      result.current.update('name', 'PendingHidden');
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    act(() => {
      setVisibility('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockedSaveCharacter).toHaveBeenCalled();
    expect(mockedSaveCharacter).toHaveBeenLastCalledWith(
      TEST_ID,
      expect.objectContaining({ name: 'PendingHidden' })
    );
  });

  it('Req 6.3 — visibilitychange to visible does NOT flush', () => {
    const initial = makeTestCharacter();
    const { result } = renderHook(() => useCharacter(TEST_ID, initial));

    act(() => {
      result.current.update('name', 'StillPending');
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    mockedSaveCharacter.mockClear();

    // A visibilitychange that is NOT hidden must not trigger a flush.
    act(() => {
      setVisibility('visible');
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockedSaveCharacter).not.toHaveBeenCalled();
  });

  it('Req 6.4/6.5 — no pending edit: beforeunload is a no-op (no mismatched overwrite)', () => {
    const initial = makeTestCharacter();
    renderHook(() => useCharacter(TEST_ID, initial));

    // Fresh mount, no edits -> nothing pending.
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    expect(mockedSaveCharacter).not.toHaveBeenCalled();
  });

  it('Req 6.4/6.5 — no pending edit: visibility-hidden is a no-op (no mismatched overwrite)', () => {
    const initial = makeTestCharacter();
    renderHook(() => useCharacter(TEST_ID, initial));

    act(() => {
      setVisibility('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockedSaveCharacter).not.toHaveBeenCalled();
  });

  it('Req 6.4/6.5 — after a pending edit is flushed, a second flush is a no-op', () => {
    const initial = makeTestCharacter();
    const { result } = renderHook(() => useCharacter(TEST_ID, initial));

    // Pending edit, then flush via beforeunload.
    act(() => {
      result.current.update('name', 'FlushOnce');
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    const callsAfterFirstFlush = mockedSaveCharacter.mock.calls.length;
    expect(callsAfterFirstFlush).toBeGreaterThan(0);

    // Second lifecycle event with nothing pending must NOT save again.
    act(() => {
      setVisibility('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockedSaveCharacter.mock.calls.length).toBe(callsAfterFirstFlush);
  });
});
