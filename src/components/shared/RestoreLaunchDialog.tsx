import { useEffect, useId, useRef } from 'react';
import styles from './RestoreConfirmDialog.module.css';

/**
 * Restore-on-launch prompt (auto-backup design §4). Shown ONLY when the pure
 * discrepancy predicate flags a genuine discrepancy. It never auto-acts: the
 * user explicitly chooses Restore or Not now (declinable; FR-B3).
 *
 * It borrows the visual markup + CSS of `RestoreConfirmDialog`, but the
 * keyboard/focus accessibility here is NET-NEW (RestoreConfirmDialog has none):
 *   (a) role="dialog" + aria-modal + aria-labelledby on the heading,
 *   (b) focus moves to the Restore button on mount, previous focus restored on
 *       unmount,
 *   (c) Tab/Shift+Tab are trapped across the two actions,
 *   (d) Esc declines.
 * All wiring is in empty-dep effects (no set-state-in-effect, so no disable).
 */
interface RestoreLaunchDialogProps {
  /** Formatted timestamp of the snapshot ("<time>"). */
  exportedAtLabel: string;
  onRestore: () => void;
  onDecline: () => void;
}

export function RestoreLaunchDialog({
  exportedAtLabel,
  onRestore,
  onDecline,
}: RestoreLaunchDialogProps) {
  const headingId = useId();
  const restoreRef = useRef<HTMLButtonElement>(null);
  const declineRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // (b) Capture previous focus, move focus to Restore on mount, restore on unmount.
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    restoreRef.current?.focus();
    return () => {
      previousFocusRef.current?.focus?.();
    };
  }, []);

  // (c) Tab/Shift+Tab focus trap across the two actions, (d) Esc declines.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDecline();
        return;
      }
      if (e.key !== 'Tab') return;
      const restore = restoreRef.current;
      const decline = declineRef.current;
      if (!restore || !decline) return;
      const active = document.activeElement;
      if (e.shiftKey) {
        // Backwards: from the first control wrap to the last.
        if (active === decline) {
          e.preventDefault();
          restore.focus();
        } else {
          e.preventDefault();
          decline.focus();
        }
      } else {
        // Forwards: from the last control wrap to the first.
        if (active === restore) {
          e.preventDefault();
          decline.focus();
        } else {
          e.preventDefault();
          restore.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onDecline]);

  return (
    <div className={styles.overlay} onClick={onDecline}>
      <div
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <h3 id={headingId} className={styles.heading}>
          A more recent backup from {exportedAtLabel} was found — restore it?
        </h3>
        <div className={styles.actions}>
          <button
            type="button"
            ref={declineRef}
            onClick={onDecline}
            className={styles.cancelBtn}
          >
            Not now
          </button>
          <button
            type="button"
            ref={restoreRef}
            onClick={onRestore}
            className={styles.confirmBtn}
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}
