import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Represents a pending undo operation — stores the deleted item
 * and the information needed to restore it.
 */
export interface UndoPending<T = unknown> {
  message: string;
  item: T;
  index: number;
  restore: (item: T, index: number) => void;
}

const UNDO_TIMEOUT_MS = 5000;

/**
 * Hook for managing undo state for single-item deletions.
 *
 * Behaviour:
 * - `show(message, item, index, restore)`: stores the pending deletion, starts 5-second timer
 * - `undo()`: calls `pending.restore(pending.item, pending.index)`, clears pending
 * - `dismiss()`: clears pending without restoring
 * - If a new deletion occurs while one is pending: discard the old pending item permanently,
 *   start fresh timer for the new deletion
 * - Cleanup timer on unmount using useEffect return
 */
export function useUndoToast(): {
  show: (message: string, item: unknown, index: number, restore: (item: unknown, index: number) => void) => void;
  dismiss: () => void;
  undo: () => void;
  pending: UndoPending | null;
} {
  const [pending, setPending] = useState<UndoPending | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setPending(null);
  }, [clearTimer]);

  const show = useCallback(
    (
      message: string,
      item: unknown,
      index: number,
      restore: (item: unknown, index: number) => void,
    ) => {
      // If there's already a pending deletion, discard it permanently (no restore)
      // and clear its timer
      clearTimer();

      const newPending: UndoPending = { message, item, index, restore };
      setPending(newPending);

      // Start a 5-second timer — when it fires, permanently discard by clearing pending
      timerRef.current = setTimeout(() => {
        setPending(null);
        timerRef.current = null;
      }, UNDO_TIMEOUT_MS);
    },
    [clearTimer],
  );

  const undo = useCallback(() => {
    if (pending) {
      pending.restore(pending.item, pending.index);
    }
    clearTimer();
    setPending(null);
  }, [pending, clearTimer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return { show, dismiss, undo, pending };
}
