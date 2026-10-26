import { useEffect, useRef, useCallback, type Dispatch } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { CombatReminder } from '../../logic/reminders';
import type { TurnEvent, TurnOption, TurnState } from '../../logic/combat-turn/types';
import { STEP_SEQUENCE } from '../../logic/combat-turn/reducer';
import { defaultTurnAdvisor } from '../../logic/combat-turn/steps';
import { StartStep } from './guidedTurnSteps/StartStep';
import { ChooseStep } from './guidedTurnSteps/ChooseStep';
import { ResolveStep } from './guidedTurnSteps/ResolveStep';
import { EndStep } from './guidedTurnSteps/EndStep';
import styles from './GuidedTurnPanel.module.css';

export interface GuidedTurnPanelProps {
  turn: TurnState;
  dispatchTurn: Dispatch<TurnEvent>;
  /** Reminders derived by the host via deriveAllReminders (same items/order). */
  reminders: CombatReminder[];
  /** Opens the shared RollDialog seeded with a reminder's test (host-owned). */
  onGuideRollReminder: (reminder: CombatReminder) => void;
  /** Step-2 hand-offs — switch mode + reveal the existing control (host). */
  onGuideChooseAttack: () => void;
  onGuideChooseCast: () => void;
  onGuideChooseDefend: () => void;
  onGuideChooseSkill: () => void;
  /** True when the host's SpellCastingPanel would render. */
  hasSpellcasting: boolean;
  /** Reveals + focuses the EXISTING dashboard End Turn button (host). */
  onGuideRevealEndTurn: () => void;
  onClose: () => void;
}

const STEP_LABELS: Record<TurnState['step'], string> = {
  start: 'Start',
  choose: 'Choose',
  resolve: 'Resolve',
  end: 'End',
};

/**
 * The Guided Combat Turn overlay (guided-combat-turn design §"Components").
 * Mirrors AssistantPanel: createPortal to document.body, returns null when
 * closed (rendered only when open by the host), role="dialog" + aria-modal,
 * focus trap, Esc + backdrop close, focus moved into the panel on open and
 * restored to the trigger on close.
 *
 * The panel performs NO mutation and derives NO reminders of its own. Every
 * transition is an explicit player event dispatched to the pure reducer; there
 * is no timer and nothing auto-advances (AC-12). Step copy comes from the
 * deterministic, synchronous defaultTurnAdvisor object (future-proof seam for a
 * later LLM advisor — no async/network code ships here).
 */
export function GuidedTurnPanel({
  turn,
  dispatchTurn,
  reminders,
  onGuideRollReminder,
  onGuideChooseAttack,
  onGuideChooseCast,
  onGuideChooseDefend,
  onGuideChooseSkill,
  hasSpellcasting,
  onGuideRevealEndTurn,
  onClose,
}: GuidedTurnPanelProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Synchronous default advisor (AC-18). describeStep is sync-by-default, so the
  // returned value is never a Promise in v1.
  const info = defaultTurnAdvisor.describe(turn.step, { inCombat: true });
  const stepInfo = info instanceof Promise ? null : info;

  const stepIndex = STEP_SEQUENCE.indexOf(turn.step);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEP_SEQUENCE.length - 1;

  // Remember the element focused before opening so it can be restored on close.
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
  }, []);

  // Move focus to the step heading on open and whenever the step changes
  // (focus management per design §Accessibility).
  useEffect(() => {
    const timer = requestAnimationFrame(() => headingRef.current?.focus());
    return () => cancelAnimationFrame(timer);
  }, [turn.step]);

  const handleClose = useCallback(() => {
    onClose();
    requestAnimationFrame(() => {
      const prev = previousFocusRef.current;
      if (prev && document.body.contains(prev)) prev.focus();
    });
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) handleClose();
    },
    [handleClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key === 'ArrowRight' && !isLast) {
        e.preventDefault();
        dispatchTurn({ kind: 'next' });
        return;
      }
      if (e.key === 'ArrowLeft' && !isFirst) {
        e.preventDefault();
        dispatchTurn({ kind: 'back' });
        return;
      }
      if (e.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [handleClose, dispatchTurn, isFirst, isLast],
  );

  const chooseHandlers: Record<Exclude<TurnOption, null>, () => void> = {
    attack: onGuideChooseAttack,
    cast: onGuideChooseCast,
    defend: onGuideChooseDefend,
    skill: onGuideChooseSkill,
  };

  const handleChoose = useCallback(
    (option: Exclude<TurnOption, null>) => {
      // Explicit player event: record the choice (advances to 'resolve') AND
      // route to the existing control. The guide never infers actionUsed.
      dispatchTurn({ kind: 'chooseOption', option });
      chooseHandlers[option]();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatchTurn, onGuideChooseAttack, onGuideChooseCast, onGuideChooseDefend, onGuideChooseSkill],
  );

  const content = (
    <div
      className={styles.backdrop}
      data-variant={isMobile ? 'sheet' : 'drawer'}
      onClick={handleBackdropClick}
      data-testid="guided-turn-backdrop"
    >
      <div
        ref={panelRef}
        className={styles.panel}
        data-variant={isMobile ? 'sheet' : 'drawer'}
        role="dialog"
        aria-modal="true"
        aria-label="Guide my turn"
        onKeyDown={handleKeyDown}
      >
        <div className={styles.header}>
          <h2
            ref={headingRef}
            className={styles.heading}
            tabIndex={-1}
            aria-current="step"
          >
            {stepInfo ? `Step ${stepIndex + 1} of ${STEP_SEQUENCE.length}: ${stepInfo.title}` : ''}
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Close guide"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stepper — aria-current marks the active step. */}
        <ol className={styles.stepper} aria-label="Turn steps">
          {STEP_SEQUENCE.map((s, i) => (
            <li
              key={s}
              className={s === turn.step ? styles.stepActive : styles.stepItem}
              aria-current={s === turn.step ? 'step' : undefined}
            >
              <button
                type="button"
                className={styles.stepDot}
                onClick={() => dispatchTurn({ kind: 'goto', step: s })}
                aria-label={`Go to step ${i + 1}: ${STEP_LABELS[s]}`}
              >
                <span aria-hidden="true">{i + 1}</span>
                <span className={styles.stepDotLabel}>{STEP_LABELS[s]}</span>
              </button>
            </li>
          ))}
        </ol>

        {/* Polite live region announces the current step title on change. */}
        <p className={styles.srOnly} aria-live="polite">
          {stepInfo ? `Step ${stepIndex + 1} of ${STEP_SEQUENCE.length}: ${stepInfo.title}` : ''}
        </p>

        <div className={styles.body}>
          {stepInfo && (
            <>
              <p className={styles.stepGuidance}>{stepInfo.body}</p>
              <p className={styles.stepCitation}>{stepInfo.citation}</p>
            </>
          )}

          {turn.step === 'start' && (
            <StartStep reminders={reminders} onGuideRollReminder={onGuideRollReminder} />
          )}
          {turn.step === 'choose' && (
            <ChooseStep
              onChoose={handleChoose}
              hasSpellcasting={hasSpellcasting}
              moveUsed={turn.moveUsed}
              actionUsed={turn.actionUsed}
              onMarkMove={(used) => dispatchTurn({ kind: 'markMove', used })}
            />
          )}
          {turn.step === 'resolve' && (
            <ResolveStep
              chosenOption={turn.chosenOption}
              actionUsed={turn.actionUsed}
              onMarkAction={(used) => dispatchTurn({ kind: 'markAction', used })}
            />
          )}
          {turn.step === 'end' && <EndStep onGuideRevealEndTurn={onGuideRevealEndTurn} />}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => dispatchTurn({ kind: 'back' })}
            disabled={isFirst}
            data-testid="guide-back"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Back
          </button>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => dispatchTurn({ kind: 'next' })}
            disabled={isLast}
            data-testid="guide-next"
          >
            Next
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
