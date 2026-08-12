import { useState, useEffect, useRef, useCallback } from 'react';
import { HelpCircle } from 'lucide-react';
import styles from './HelpPopover.module.css';

export interface HelpPopoverProps {
  concept: string;   // concept ID for localStorage key
  children: string;  // help text content (max 280 chars)
}

const STORAGE_PREFIX = 'wfrp-hint-dismissed-';
const AUTO_SUPPRESS_THRESHOLD = 3;

function getDismissCount(concept: string): number {
  try {
    const val = localStorage.getItem(`${STORAGE_PREFIX}${concept}`);
    if (val === 'true') return AUTO_SUPPRESS_THRESHOLD; // migrate old boolean format
    const count = parseInt(val ?? '0', 10);
    return Number.isFinite(count) ? count : 0;
  } catch {
    return 0;
  }
}

function incrementDismissCount(concept: string): void {
  try {
    const current = getDismissCount(concept);
    localStorage.setItem(`${STORAGE_PREFIX}${concept}`, String(current + 1));
  } catch {
    // Graceful fallback — localStorage unavailable or quota exceeded
  }
}

/** Returns true if the tooltip has been dismissed >= AUTO_SUPPRESS_THRESHOLD times */
export function isSuppressed(concept: string): boolean {
  return getDismissCount(concept) >= AUTO_SUPPRESS_THRESHOLD;
}

export function HelpPopover({ concept, children }: HelpPopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const autoShowedRef = useRef(false);

  // Auto-show on first render if not yet suppressed (dismissed < 3 times)
  useEffect(() => {
    if (!autoShowedRef.current && !isSuppressed(concept)) {
      autoShowedRef.current = true;
      setOpen(true);
    }
  }, [concept]);

  const dismiss = useCallback(() => {
    setOpen(false);
    incrementDismissCount(concept);
  }, [concept]);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      if (prev) {
        incrementDismissCount(concept);
        return false;
      }
      return true;
    });
  }, [concept]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismiss();
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, dismiss]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        dismiss();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open, dismiss]);

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-label={`Help: ${concept}`}
        aria-expanded={open}
        onClick={toggle}
      >
        <HelpCircle size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.popover} role="tooltip">
          <p className={styles.content}>{children}</p>
        </div>
      )}
    </div>
  );
}
