/**
 * Feature: ux-polish-improvements, Property 5: Long-press threshold discrimination
 *
 * Property: For any touch interaction on a card element, the contextual menu
 * SHALL appear if and only if the touch duration is >= 500ms AND the touch
 * point has not moved more than 10px from its start position. Touches shorter
 * than 500ms or with movement > 10px SHALL NOT trigger the menu.
 *
 * **Validates: Requirements 8.1, 8.4**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useLongPress } from '../useLongPress';

// ─── Helpers ────────────────────────────────────────────────────────────────

function enableTouchSupport() {
  Object.defineProperty(window, 'ontouchstart', {
    value: null,
    writable: true,
    configurable: true,
  });
}

function disableTouchSupport() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).ontouchstart;
}

function makeTouchEvent(clientX: number, clientY: number): React.TouchEvent {
  return {
    touches: [{ clientX, clientY }] as unknown as React.TouchList,
    nativeEvent: { clientX, clientY, type: 'touchstart' } as unknown as TouchEvent,
  } as unknown as React.TouchEvent;
}

// ─── Generators ─────────────────────────────────────────────────────────────

/** Arbitrary touch duration in milliseconds (0–1000) */
const arbDuration: fc.Arbitrary<number> = fc.integer({ min: 0, max: 1000 });

/** Arbitrary movement distance in pixels (0–50) */
const arbDistance: fc.Arbitrary<number> = fc.float({ min: 0, max: 50, noNaN: true });

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  enableTouchSupport();
});

afterEach(() => {
  vi.useRealTimers();
  disableTouchSupport();
});

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-polish-improvements, Property 5: Long-press threshold discrimination', () => {
  /**
   * **Validates: Requirements 8.1, 8.4**
   *
   * For any touch duration >= 500ms AND movement distance <= 10px,
   * the onLongPress callback SHALL be invoked.
   */
  it('fires onLongPress when duration >= 500ms AND movement <= 10px', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 500, max: 1000 }),
        fc.float({ min: 0, max: 10, noNaN: true }),
        (duration, distance) => {
          const onLongPress = vi.fn();
          const { result } = renderHook(() => useLongPress({ onLongPress }));

          const startX = 100;
          const startY = 100;

          // Compute move position at the given distance (along x-axis for simplicity)
          const moveX = startX + distance;
          const moveY = startY;

          act(() => {
            result.current.onTouchStart!(makeTouchEvent(startX, startY));
          });

          // Simulate movement if distance > 0
          if (distance > 0) {
            act(() => {
              result.current.onTouchMove!(makeTouchEvent(moveX, moveY));
            });
          }

          // Advance timer by the duration
          act(() => {
            vi.advanceTimersByTime(duration);
          });

          // End the touch
          act(() => {
            result.current.onTouchEnd!(makeTouchEvent(moveX, moveY));
          });

          expect(onLongPress).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 8.1, 8.4**
   *
   * For any touch duration < 500ms (regardless of movement),
   * the onLongPress callback SHALL NOT be invoked.
   */
  it('does NOT fire onLongPress when duration < 500ms', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 499 }),
        arbDistance,
        (duration, distance) => {
          const onLongPress = vi.fn();
          const { result } = renderHook(() => useLongPress({ onLongPress }));

          const startX = 100;
          const startY = 100;
          const moveX = startX + distance;
          const moveY = startY;

          act(() => {
            result.current.onTouchStart!(makeTouchEvent(startX, startY));
          });

          if (distance > 0) {
            act(() => {
              result.current.onTouchMove!(makeTouchEvent(moveX, moveY));
            });
          }

          // Advance timer by the duration (less than threshold)
          act(() => {
            vi.advanceTimersByTime(duration);
          });

          // End the touch before threshold fires
          act(() => {
            result.current.onTouchEnd!(makeTouchEvent(moveX, moveY));
          });

          // Even after more time passes, nothing should fire
          act(() => {
            vi.advanceTimersByTime(1000);
          });

          expect(onLongPress).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 8.1, 8.4**
   *
   * For any touch with movement > 10px (regardless of duration),
   * the onLongPress callback SHALL NOT be invoked.
   */
  it('does NOT fire onLongPress when movement > 10px', () => {
    fc.assert(
      fc.property(
        arbDuration,
        fc.float({ min: Math.fround(10.01), max: 50, noNaN: true }),
        (duration, distance) => {
          const onLongPress = vi.fn();
          const { result } = renderHook(() => useLongPress({ onLongPress }));

          const startX = 100;
          const startY = 100;
          const moveX = startX + distance;
          const moveY = startY;

          act(() => {
            result.current.onTouchStart!(makeTouchEvent(startX, startY));
          });

          // Move beyond the 10px tolerance
          act(() => {
            result.current.onTouchMove!(makeTouchEvent(moveX, moveY));
          });

          // Advance timer well past any threshold
          act(() => {
            vi.advanceTimersByTime(duration);
          });

          act(() => {
            result.current.onTouchEnd!(makeTouchEvent(moveX, moveY));
          });

          // Even after extra time
          act(() => {
            vi.advanceTimersByTime(1000);
          });

          expect(onLongPress).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 8.1, 8.4**
   *
   * Combined discrimination: For any arbitrary (duration, distance) pair,
   * onLongPress is called if and only if duration >= 500 AND distance <= 10.
   */
  it('onLongPress fires iff duration >= 500ms AND distance <= 10px', () => {
    fc.assert(
      fc.property(
        arbDuration,
        arbDistance,
        (duration, distance) => {
          const onLongPress = vi.fn();
          const { result } = renderHook(() => useLongPress({ onLongPress }));

          const startX = 100;
          const startY = 100;
          const moveX = startX + distance;
          const moveY = startY;

          act(() => {
            result.current.onTouchStart!(makeTouchEvent(startX, startY));
          });

          if (distance > 0) {
            act(() => {
              result.current.onTouchMove!(makeTouchEvent(moveX, moveY));
            });
          }

          // Advance timer by the duration
          act(() => {
            vi.advanceTimersByTime(duration);
          });

          // End the touch
          act(() => {
            result.current.onTouchEnd!(makeTouchEvent(moveX, moveY));
          });

          // Wait additional time to ensure no delayed triggers
          act(() => {
            vi.advanceTimersByTime(1000);
          });

          const shouldFire = duration >= 500 && distance <= 10;

          if (shouldFire) {
            expect(onLongPress).toHaveBeenCalledTimes(1);
          } else {
            expect(onLongPress).not.toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
