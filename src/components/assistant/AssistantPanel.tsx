import { createPortal } from 'react-dom';
import type { Suggestion, SuggestionAction } from '../../logic/assistant/types';
import { useAssistantContext } from './assistantContextValue';

export interface AssistantPanelProps {
  /** Visible (dismiss/snooze-filtered) suggestions to display. */
  suggestions: Suggestion[];
  /** Invoke the real handler for a suggestion's action descriptor. */
  onAction: (action: SuggestionAction) => void;
  /** Dismiss a suggestion until its condition clears and re-triggers. */
  onDismiss: (id: string) => void;
  /** Snooze a suggestion for a fixed window. */
  onSnooze: (id: string) => void;
}

/**
 * TEMPORARY SHELL STUB — to be REPLACED by FEAT-003.
 *
 * FEAT-002 wires the data and handlers (`suggestions`, `onAction`, `onDismiss`,
 * `onSnooze`) into the shell so it type-checks and the prune/roll/navigate
 * plumbing is exercised end-to-end. The real drawer/bottom-sheet overlay, focus
 * trap, SuggestionItem rows, and breakdown tooltips arrive in FEAT-003, which
 * owns this file's full implementation and its component tests.
 *
 * Until then this stub renders the same minimal portal overlay the real panel
 * will (closed by default via the shared `useAssistantContext`, so it occupies
 * no layout space and covers no primary content), listing suggestion titles and
 * exposing the action/dismiss/snooze handlers so the integration is live.
 */
export function AssistantPanel({ suggestions, onAction, onDismiss, onSnooze }: AssistantPanelProps) {
  const { isOpen, close } = useAssistantContext();
  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Character Assistant"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={close}
    >
      <div
        style={{ background: 'var(--bg-elevated, #fff)', minWidth: 280, padding: 16, overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={close} aria-label="Close assistant">
          ✕
        </button>
        {suggestions.length === 0 ? (
          <p>No suggestions right now.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {suggestions.map((s) => (
              <li key={s.id} style={{ marginBottom: 12 }}>
                <div>{s.title}</div>
                <div style={{ fontSize: '0.85em', opacity: 0.8 }}>{s.rationale}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button type="button" onClick={() => onAction(s.action)}>
                    {s.action.kind === 'roll' ? 'Roll' : 'Go'}
                  </button>
                  {s.secondaryAction && (
                    <button type="button" onClick={() => onAction(s.secondaryAction!)}>
                      More
                    </button>
                  )}
                  <button type="button" onClick={() => onDismiss(s.id)}>
                    Dismiss
                  </button>
                  <button type="button" onClick={() => onSnooze(s.id)}>
                    Snooze
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}
