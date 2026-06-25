import { useState, useEffect, useRef, useCallback } from 'react';
import { Info } from 'lucide-react';
import styles from './HelpPopover.module.css';

export interface HelpPopoverProps {
  concept: string;   // concept ID for localStorage key
  children: string;  // help text content (max 280 chars)
}

const STORAGE_PREFIX = 'wfrp-hint-dismissed-';

function isDismissed(concept: string): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${concept}`) === 'true';
  } catch {
    return false;
  }
}

function persistDismissal(concept: string): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${concept}`, 'true');
  } catch {
    // Graceful fallback — localStorage unavailable or quota exceeded
  }
}

export function HelpPopover({ concept, children }: HelpPopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (!next) {
        persistDismissal(concept);
      }
      return next;
    });
  }, [concept]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        persistDismissal(concept);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, concept]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        persistDismissal(concept);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open, concept]);

  // Don't auto-show if previously dismissed — but can still be manually opened
  const _wasDismissed = isDismissed(concept);
  void _wasDismissed; // Acknowledged but popover is always manually triggered

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
        <Info size={18} aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.popover} role="tooltip">
          <p className={styles.content}>{children}</p>
        </div>
      )}
    </div>
  );
}
