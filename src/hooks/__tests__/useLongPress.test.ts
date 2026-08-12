import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLongPress } from '../useLongPress';

// Helper to simulate touch-capable environment
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

beforeEach(() => {
  vi.useFakeTimers();
  enableTouchSupport();
});

afterEach(() => {
  vi.useRealTimers();
  disableTouchSupport();
});

describe('useLongPress — touch detection', () => {
  it('returns undefined handlers when touch is not supported', () => {
    disableTouchSupport();
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    expect(result.current.onTouchStart).toBeUndefined();
    expect(result.current.onTouchEnd).toBeUndefined();
    expect(result.current.onTouchMove).toBeUndefined();
  });

  it('returns defined handlers when touch is supported', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    expect(result.current.onTouchStart).toBeDefined();
    expect(result.current.onTouchEnd).toBeDefined();
    expect(result.current.onTouchMove).toBeDefined();
  });
});

describe('useLongPress — timer behavior', () => {
  it('fires onLongPress after default 500ms threshold', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => {
      result.current.onTouchStart!(makeTouchEvent(100, 200));
    });

    // Not yet fired
    expect(onLongPress).not.toHaveBeenCalled();

    // Advance past threshold
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('fires onLongPress with the original TouchEvent', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    const touchEvent = makeTouchEvent(50, 75);

    act(() => {
      result.current.onTouchStart!(touchEvent);
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onLongPress).toHaveBeenCalledWith(touchEvent.nativeEvent);
  });

  it('uses custom threshold when provided', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ threshold: 800, onLongPress }));

    act(() => {
      result.current.onTouchStart!(makeTouchEvent(100, 200));
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onLongPress).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });
});

describe('useLongPress — cancellation on touchend', () => {
  it('does not fire onLongPress if touchend occurs before threshold', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => {
      result.current.onTouchStart!(makeTouchEvent(100, 200));
    });

    // Release before 500ms
    act(() => {
      vi.advanceTimersByTime(300);
    });

    act(() => {
      result.current.onTouchEnd!(makeTouchEvent(100, 200));
    });

    // Advance past what would have been the threshold
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });
});

describe('useLongPress — cancellation on touchmove', () => {
  it('does not fire onLongPress if touch moves more than 10px', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => {
      result.current.onTouchStart!(makeTouchEvent(100, 200));
    });

    // Move more than 10px
    act(() => {
      result.current.onTouchMove!(makeTouchEvent(115, 200)); // 15px horizontal move
    });

    // Advance past threshold
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('still fires onLongPress if touch moves less than 10px', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => {
      result.current.onTouchStart!(makeTouchEvent(100, 200));
    });

    // Move less than 10px (e.g., 5px diagonal ~ 7px)
    act(() => {
      result.current.onTouchMove!(makeTouchEvent(105, 205));
    });

    // Advance past threshold
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('cancels on diagonal movement exceeding 10px', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => {
      result.current.onTouchStart!(makeTouchEvent(100, 100));
    });

    // Move ~14px diagonally (10, 10 → sqrt(200) ≈ 14.1)
    act(() => {
      result.current.onTouchMove!(makeTouchEvent(110, 110));
    });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });
});
