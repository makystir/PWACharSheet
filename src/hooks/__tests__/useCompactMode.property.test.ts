/**
 * Feature: ux-polish-improvements, Property 9: Display mode persistence round-trip
 *
 * Property: For any display mode value ("compact" or "expanded"), writing it to
 * localStorage and reading it back SHALL produce the same value. On app reload,
 * the Character page SHALL render in the persisted mode.
 *
 * **Validates: Requirements 9.4**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useCompactMode, type DisplayMode } from '../useCompactMode';

// ─── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'wfrp-display-mode';

// ─── Generators ─────────────────────────────────────────────────────────────

/** Arbitrary display mode value */
const arbDisplayMode: fc.Arbitrary<DisplayMode> = fc.constantFrom('compact', 'expanded');

/** Arbitrary sequence of mode values to simulate multiple toggles */
const arbModeSequence: fc.Arbitrary<DisplayMode[]> = fc.array(arbDisplayMode, {
  minLength: 1,
  maxLength: 20,
});

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-polish-improvements, Property 9: Display mode persistence round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  /**
   * **Validates: Requirements 9.4**
   *
   * For any display mode value, writing it directly to localStorage under
   * the expected key and reading it back produces the same value.
   */
  it('writing a mode to localStorage and reading it back produces the same value', () => {
    fc.assert(
      fc.property(arbDisplayMode, (mode) => {
        // Write to localStorage
        localStorage.setItem(STORAGE_KEY, mode);

        // Read back
        const stored = localStorage.getItem(STORAGE_KEY);

        expect(stored).toBe(mode);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 9.4**
   *
   * For any display mode value persisted in localStorage, mounting the
   * useCompactMode hook reads back and returns that same value as the
   * initial mode (simulating an app reload).
   */
  it('hook initializes with the mode persisted in localStorage (simulates reload)', () => {
    fc.assert(
      fc.property(arbDisplayMode, (mode) => {
        // Simulate a previous session writing the mode
        localStorage.setItem(STORAGE_KEY, mode);

        // Mount the hook (simulates app reload)
        const { result } = renderHook(() => useCompactMode());

        expect(result.current.mode).toBe(mode);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 9.4**
   *
   * For any sequence of toggle operations, the mode persisted in
   * localStorage after each toggle matches the hook's current mode,
   * and re-mounting the hook (simulating reload) restores that mode.
   */
  it('after any number of toggles, remounting the hook restores the persisted mode', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (toggleCount) => {
          localStorage.clear();

          const { result } = renderHook(() => useCompactMode());

          // Perform the specified number of toggles
          for (let i = 0; i < toggleCount; i++) {
            act(() => {
              result.current.toggle();
            });
          }

          const currentMode = result.current.mode;

          // After toggling, localStorage should reflect current mode
          const stored = localStorage.getItem(STORAGE_KEY);
          expect(stored).toBe(currentMode);

          // Re-mount the hook (simulates app reload) — should restore persisted mode
          const { result: reloaded } = renderHook(() => useCompactMode());
          expect(reloaded.current.mode).toBe(currentMode);
        }
      ),
      { numRuns: 100 }
    );
  });
});
