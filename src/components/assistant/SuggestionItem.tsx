import { useState, useCallback } from 'react';
import type { Suggestion, SuggestionAction } from '../../logic/assistant/types';
import { Tooltip } from '../shared/Tooltip';
import { TooltipTriggerCell } from '../shared/TooltipTriggerCell';
import styles from './SuggestionItem.module.css';

export interface SuggestionItemProps {
  suggestion: Suggestion;
  /** Invoke the real handler for an action descriptor (navigate or roll). */
  onAction: (action: SuggestionAction) => void;
  /** Dismiss this suggestion until its condition clears and re-triggers. */
  onDismiss: (id: string) => void;
  /** Snooze this suggestion for the fixed window (24h). */
  onSnooze: (id: string) => void;
}

/** Human label for the primary/secondary action button. */
function actionLabel(action: SuggestionAction, isPrimary: boolean): string {
  if (action.kind === 'roll') return action.test.rollName;
  // Navigate. The corruption secondary navigates to the Corruption panel.
  if (!isPrimary && action.page === 'character' && action.subTab === 'notes') {
    return 'View Corruption';
  }
  return 'Go';
}

/**
 * One suggestion row: title, rationale, primary action, optional secondary
 * action, the rulebook citation, any calculated-total breakdown tooltips, and
 * dismiss + snooze controls. All controls are real keyboard-operable buttons.
 *
 * The item NEVER mutates the character — it only invokes the injected
 * onAction/onDismiss/onSnooze callbacks, which route through existing,
 * player-confirmed flows (FR-6). Every calculated total displayed carries a
 * breakdown Tooltip whose lines come straight from the engine
 * (`SuggestionTotal.lines`), never recomputed here (FR-11 / calculated-totals).
 */
export function SuggestionItem({ suggestion, onAction, onDismiss, onSnooze }: SuggestionItemProps) {
  // Index of the totals entry whose breakdown tooltip is open (single-at-a-time).
  const [openTotalIndex, setOpenTotalIndex] = useState<number | null>(null);
  // The anchor element for the currently open tooltip.
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleTotalOpen = useCallback((index: number, el: HTMLElement) => {
    setOpenTotalIndex(index);
    setAnchorEl(el);
  }, []);

  const handleTotalClose = useCallback(() => {
    setOpenTotalIndex(null);
    setAnchorEl(null);
  }, []);

  const totals = suggestion.totals ?? [];

  return (
    <li className={styles.item} data-urgency={suggestion.urgency} data-testid={`suggestion-${suggestion.id}`}>
      <div className={styles.title}>{suggestion.title}</div>
      <div className={styles.rationale}>{suggestion.rationale}</div>

      {totals.length > 0 && (
        <div className={styles.totals}>
          {totals.map((total, index) => {
            const tooltipId = `assistant-total-${suggestion.id}-${index}`;
            const isOpen = openTotalIndex === index;
            return (
              <div key={tooltipId} className={styles.totalRow}>
                <span className={styles.totalLabel}>{total.label}</span>
                <TooltipTriggerCell
                  tooltipId={tooltipId}
                  displayValue={total.display}
                  isTooltipOpen={isOpen}
                  onOpen={(el) => handleTotalOpen(index, el)}
                  onClose={handleTotalClose}
                  className={styles.totalValue}
                  ariaLabel={`${total.label} breakdown`}
                />
                {isOpen && anchorEl && (
                  <Tooltip
                    anchorEl={anchorEl}
                    title={total.label}
                    onClose={handleTotalClose}
                    id={tooltipId}
                  >
                    <ul className={styles.breakdownList}>
                      {total.lines.map((line, lineIndex) => (
                        <li key={lineIndex}>{line}</li>
                      ))}
                    </ul>
                  </Tooltip>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryAction}
          onClick={() => onAction(suggestion.action)}
        >
          {actionLabel(suggestion.action, true)}
        </button>
        {suggestion.secondaryAction && (
          <button
            type="button"
            className={styles.secondaryAction}
            onClick={() => onAction(suggestion.secondaryAction!)}
          >
            {actionLabel(suggestion.secondaryAction, false)}
          </button>
        )}
      </div>

      {suggestion.citation && (
        <div className={styles.citation}>{suggestion.citation}</div>
      )}

      <div className={styles.dismissControls}>
        <button
          type="button"
          className={styles.dismissButton}
          onClick={() => onDismiss(suggestion.id)}
        >
          Dismiss
        </button>
        <button
          type="button"
          className={styles.snoozeButton}
          onClick={() => onSnooze(suggestion.id)}
        >
          Snooze
        </button>
      </div>
    </li>
  );
}
