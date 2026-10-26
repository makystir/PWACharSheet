import { useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { Suggestion, SuggestionAction, SuggestionCategory } from '../../logic/assistant/types';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useAssistantContext } from './assistantContextValue';
import { SuggestionItem } from './SuggestionItem';
import styles from './AssistantPanel.module.css';

export interface AssistantPanelProps {
  /** Visible (dismiss/snooze-filtered) suggestions to display. */
  suggestions: Suggestion[];
  /** Invoke the real handler for a suggestion's action descriptor. */
  onAction: (action: SuggestionAction) => void;
  /** Dismiss a suggestion until its condition clears and re-triggers. */
  onDismiss: (id: string) => void;
  /** Snooze a suggestion for a fixed window (24h). */
  onSnooze: (id: string) => void;
}

/**
 * Human-readable heading for each category group. The groups are rendered in
 * the order the engine already sorted them into (ordering.ts), so this map only
 * supplies display labels — it does not reorder.
 */
const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  combat: 'Combat',
  advancement: 'Advancement',
  endeavour: 'Endeavours',
  encumbrance: 'Encumbrance',
  corruption: 'Corruption',
};

/** Group the already-ordered suggestions by category, preserving their order. */
function groupByCategory(
  suggestions: Suggestion[],
): { category: SuggestionCategory; items: Suggestion[] }[] {
  const groups: { category: SuggestionCategory; items: Suggestion[] }[] = [];
  for (const s of suggestions) {
    const last = groups[groups.length - 1];
    if (last && last.category === s.category) {
      last.items.push(s);
    } else {
      groups.push({ category: s.category, items: [s] });
    }
  }
  return groups;
}

/**
 * The Character Assistant panel: one component, two presentations switched on
 * the `max-width: 767px` breakpoint via `data-variant` — a right-side slide-over
 * drawer on desktop, a bottom sheet on mobile. Rendered via portal; returns
 * `null` when closed (no layout footprint, covers no primary content).
 *
 * Mirrors the command-palette overlay model (NFR-4): role="dialog" +
 * aria-modal, focus trap while open, Escape + backdrop close, and focus restored
 * to the trigger on close via the previousFocusRef + requestAnimationFrame
 * pattern. The panel only DESCRIBES actions through SuggestionItem — it never
 * mutates the character.
 */
export function AssistantPanel({ suggestions, onAction, onDismiss, onSnooze }: AssistantPanelProps) {
  const { isOpen, close } = useAssistantContext();
  const isMobile = useMediaQuery('(max-width: 767px)');

  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const groups = useMemo(() => groupByCategory(suggestions), [suggestions]);

  // Remember the element that had focus before opening so it can be restored.
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
    }
  }, [isOpen]);

  // Move focus into the panel on open.
  useEffect(() => {
    if (isOpen) {
      const timer = requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [isOpen]);

  // Close + restore focus to the trigger (previousFocusRef) on close.
  const handleClose = useCallback(() => {
    close();
    requestAnimationFrame(() => {
      if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      } else {
        document.body.focus();
      }
    });
  }, [close]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose],
  );

  // Escape closes; Tab/Shift+Tab are trapped within the panel.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [handleClose],
  );

  if (!isOpen) return null;

  const panelContent = (
    <div
      className={styles.backdrop}
      data-variant={isMobile ? 'sheet' : 'drawer'}
      onClick={handleBackdropClick}
      data-testid="assistant-panel-backdrop"
    >
      <div
        ref={panelRef}
        className={styles.panel}
        data-variant={isMobile ? 'sheet' : 'drawer'}
        role="dialog"
        aria-modal="true"
        aria-label="Character Assistant"
        onKeyDown={handleKeyDown}
      >
        <div className={styles.header}>
          <h2 className={styles.heading}>Character Assistant</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Close assistant"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          {suggestions.length === 0 ? (
            <div className={styles.emptyState}>No suggestions right now.</div>
          ) : (
            groups.map((group) => (
              <section key={group.category} className={styles.group}>
                <h3 className={styles.groupHeading}>{CATEGORY_LABELS[group.category]}</h3>
                <ul className={styles.list}>
                  {group.items.map((s) => (
                    <SuggestionItem
                      key={s.id}
                      suggestion={s}
                      onAction={onAction}
                      onDismiss={onDismiss}
                      onSnooze={onSnooze}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(panelContent, document.body);
}
