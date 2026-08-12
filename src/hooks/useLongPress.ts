import { useRef, useCallback } from 'react';

export interface UseLongPressOptions {
  threshold?: number;   // default 500ms
  onLongPress: (e: TouchEvent) => void;
}

const DEFAULT_THRESHOLD = 500;
const MOVE_TOLERANCE = 10; // pixels

/**
 * Hook that detects long-press (touch-and-hold) gestures.
 * Returns touch event handlers to spread onto a target element.
 * Only registers handlers on touch-capable devices.
 */
export function useLongPress(options: UseLongPressOptions): {
  onTouchStart: ((e: React.TouchEvent) => void) | undefined;
  onTouchEnd: ((e: React.TouchEvent) => void) | undefined;
  onTouchMove: ((e: React.TouchEvent) => void) | undefined;
} {
  const { threshold = DEFAULT_THRESHOLD, onLongPress } = options;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchEventRef = useRef<TouchEvent | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startPosRef.current = { x: touch.clientX, y: touch.clientY };
    touchEventRef.current = e.nativeEvent;

    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (touchEventRef.current) {
        onLongPress(touchEventRef.current);
      }
    }, threshold);
  }, [threshold, onLongPress, clearTimer]);

  const handleTouchEnd = useCallback((_e: React.TouchEvent) => {
    clearTimer();
    startPosRef.current = null;
    touchEventRef.current = null;
  }, [clearTimer]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startPosRef.current) return;

    const touch = e.touches[0];
    const dx = touch.clientX - startPosRef.current.x;
    const dy = touch.clientY - startPosRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > MOVE_TOLERANCE) {
      clearTimer();
      startPosRef.current = null;
      touchEventRef.current = null;
    }
  }, [clearTimer]);

  // Only register handlers on touch-capable devices
  if (typeof window === 'undefined' || !('ontouchstart' in window)) {
    return {
      onTouchStart: undefined,
      onTouchEnd: undefined,
      onTouchMove: undefined,
    };
  }

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
  };
}
