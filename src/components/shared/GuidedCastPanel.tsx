import { useEffect, useRef, useCallback, type Dispatch } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { Character, MagicSaturation, SpellItem } from '../../types/character';
import type { MiscastResult } from '../../logic/spell-casting';
import { isPettySpell } from '../../logic/spell-casting';
import type { CastStep, GuidedCastEvent, GuidedCastState } from '../../logic/guided-cast/types';
import { applicableSteps } from '../../logic/guided-cast/reducer';
import { defaultCastAdvisor } from '../../logic/guided-cast/steps';
import type { CriticalChoice } from './castControls/CriticalChoiceButtons';
import { SelectStep } from './guidedCastSteps/SelectStep';
import { RouteStep } from './guidedCastSteps/RouteStep';
import { ResolveStep } from './guidedCastSteps/ResolveStep';
import { OvercastStep } from './guidedCastSteps/OvercastStep';
import { MiscastStep } from './guidedCastSteps/MiscastStep';
import { OutcomeStep } from './guidedCastSteps/OutcomeStep';
import styles from './GuidedCastPanel.module.css';

export interface GuidedCastPanelProps {
  state: GuidedCastState;
  dispatch: Dispatch<GuidedCastEvent>;
  character: Character;
  spell: SpellItem;
  /** getArmourCastingPenalty(character) — passed in so the step shows it as context. */
  armourPenalty: number;
  /** Resolved magic saturation (?? 'normal'). */
  saturation: MagicSaturation;
  /** The panel's current miscastResult (null until the player rolls). */
  miscastResult: MiscastResult | null;
  /** Step 2 Cast: host dispatches chooseRoute('cast'), advances to 'resolve', opens the cast RollDialog. */
  onOpenCast: () => void;
  /** Step 2 Channel: host dispatches chooseRoute('channel') and opens the channel RollDialog. */
  onOpenChannel: () => void;
  /** Step 3 Critical choice → panel handle chooseCritical. */
  onChooseCritical: (choice: CriticalChoice) => void;
  /** Step 5 miscast roll → panel handle rollMiscast (+ host dispatches miscastCompleted). */
  onRollMiscast: (table: 'minor' | 'major') => void;
  /** Step 4 allocator confirm → panel onOvercastResolved (+ host dispatches overcastResolved). */
  onOvercastResolved: (allocations: Record<string, number>) => void;
  /** Stores an acquired arcane mark on the character. */
  onArcaneMarkAcquired: (mark: string) => void;
  onClose: () => void;
}

const STEP_LABELS: Record<CastStep, string> = {
  select: 'Select',
  route: 'Route',
  resolve: 'Resolve',
  overcast: 'Overcast',
  miscast: 'Miscast',
  outcome: 'Outcome',
};

/**
 * The "Guide my spell" portal overlay/stepper (guided-spellcasting design
 * §"Components"), mirroring GuidedTurnPanel: createPortal to document.body,
 * role="dialog" + aria-modal, focus trap, Esc + backdrop close (backdrop
 * dispatches reset), focus moved to the step heading on open and each step
 * change, focus restored to the trigger on close.
 *
 * The panel performs NO casting/channelling/overcast/miscast math. Every number
 * comes from the EXISTING spell-casting calculators via the step children, and
 * every roll/mutation goes through the panel's existing handlers (passed in as
 * callbacks). Nothing auto-advances; every transition is an explicit player
 * event. Step copy comes from the deterministic, synchronous defaultCastAdvisor
 * (future-proof seam for a later LLM advisor — no async/network code ships).
 *
 * Navigation operates over applicableSteps(state), NOT STEP_SEQUENCE, because
 * the overcast/miscast steps may be filtered out (design §Applicability).
 */
export function GuidedCastPanel({
  state,
  dispatch,
  character,
  spell,
  armourPenalty,
  saturation,
  miscastResult,
  onOpenCast,
  onOpenChannel,
  onChooseCritical,
  onRollMiscast,
  onOvercastResolved,
  onArcaneMarkAcquired,
  onClose,
}: GuidedCastPanelProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Synchronous default advisor — describeCastStep is sync-by-default, so the
  // returned value is never a Promise in v1.
  const info = defaultCastAdvisor.describe(state.step, {
    isPetty: isPettySpell(spell),
    route: state.route,
  });
  const stepInfo = info instanceof Promise ? null : info;

  // Boundary flags derive from the APPLICABLE subset, not STEP_SEQUENCE.
  const steps = applicableSteps(state);
  const idx = Math.max(0, steps.indexOf(state.step));
  const isFirst = idx === 0;
  const isLast = idx === steps.length - 1;

  // Remember the element focused before opening so it can be restored on close.
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
  }, []);

  // Move focus to the step heading on open and whenever the step changes.
  useEffect(() => {
    const timer = requestAnimationFrame(() => headingRef.current?.focus());
    return () => cancelAnimationFrame(timer);
  }, [state.step]);

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
        dispatch({ kind: 'next' });
        return;
      }
      if (e.key === 'ArrowLeft' && !isFirst) {
        e.preventDefault();
        dispatch({ kind: 'back' });
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
    [handleClose, dispatch, isFirst, isLast],
  );

  const result = state.result;

  const content = (
    <div
      className={styles.backdrop}
      data-variant={isMobile ? 'sheet' : 'drawer'}
      onClick={handleBackdropClick}
      data-testid="guided-cast-backdrop"
    >
      <div
        ref={panelRef}
        className={styles.panel}
        data-variant={isMobile ? 'sheet' : 'drawer'}
        role="dialog"
        aria-modal="true"
        aria-label="Guide my spell"
        onKeyDown={handleKeyDown}
      >
        <div className={styles.header}>
          <h2 ref={headingRef} className={styles.heading} tabIndex={-1} aria-current="step">
            {stepInfo ? `Step ${idx + 1} of ${steps.length}: ${stepInfo.title}` : ''}
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

        {/* Stepper — only the applicable steps; aria-current marks the active step. */}
        <ol className={styles.stepper} aria-label="Cast steps">
          {steps.map((s, i) => (
            <li
              key={s}
              className={s === state.step ? styles.stepActive : styles.stepItem}
              aria-current={s === state.step ? 'step' : undefined}
            >
              <button
                type="button"
                className={styles.stepDot}
                onClick={() => dispatch({ kind: 'goto', step: s })}
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
          {stepInfo ? `Step ${idx + 1} of ${steps.length}: ${stepInfo.title}` : ''}
        </p>

        <div className={styles.body}>
          {stepInfo && (
            <>
              <p className={styles.stepGuidance}>{stepInfo.body}</p>
              <p className={styles.stepCitation}>{stepInfo.citation}</p>
            </>
          )}

          {state.step === 'select' && (
            <SelectStep
              character={character}
              spell={spell}
              armourPenalty={armourPenalty}
              saturation={saturation}
            />
          )}
          {state.step === 'route' && (
            <RouteStep spell={spell} onCast={onOpenCast} onChannel={onOpenChannel} />
          )}
          {state.step === 'resolve' && (
            <ResolveStep
              result={result}
              onOpenCast={onOpenCast}
              onChooseCritical={onChooseCritical}
            />
          )}
          {state.step === 'overcast' && result && (
            <OvercastStep
              character={character}
              result={result}
              onOvercastResolved={onOvercastResolved}
            />
          )}
          {state.step === 'miscast' && result && (
            <MiscastStep
              character={character}
              result={result}
              miscastResult={miscastResult}
              onRollMiscast={onRollMiscast}
              onArcaneMarkAcquired={onArcaneMarkAcquired}
            />
          )}
          {state.step === 'outcome' && result && (
            <OutcomeStep
              character={character}
              result={result}
              overcastAllocations={state.overcastAllocations}
            />
          )}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => dispatch({ kind: 'back' })}
            disabled={isFirst}
            data-testid="guided-cast-back"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Back
          </button>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => dispatch({ kind: 'next' })}
            disabled={isLast}
            data-testid="guided-cast-next"
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
