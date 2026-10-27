import { useEffect, useRef, useCallback, type Dispatch } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Dices, Skull } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { Character } from '../../types/character';
import type { ReminderTest } from '../../logic/reminders';
import type { DifficultyLevel } from '../../logic/dice-roller';
import { getBonus } from '../../logic/calculators';
import {
  getCorruptionThreshold,
  getCorruptionStatus,
  getPureSoulLevel,
  getMutationTypeDistribution,
  getPhysicalMutationLimit,
  getMentalMutationLimit,
  getCorruptionLossOnMutation,
} from '../../logic/corruption';
import { BreakdownTotal } from './guidedCastSteps/BreakdownTotal';
import type {
  CorruptionStep,
  CorruptionFlowEvent,
  CorruptionFlowState,
} from '../../logic/guided-corruption/types';
import { STEP_SEQUENCE } from '../../logic/guided-corruption/reducer';
import { defaultCorruptionAdvisor } from '../../logic/guided-corruption/steps';
import styles from './GuidedCorruptionPanel.module.css';

/** A seeded roll request the host turns into the shared RollDialog. */
export interface SeedRollRequest {
  name: string;
  def: ReminderTest;
  difficulty: DifficultyLevel;
}

export interface GuidedCorruptionPanelProps {
  state: CorruptionFlowState;
  dispatch: Dispatch<CorruptionFlowEvent>;
  character: Character;
  /** Open the shared seeded RollDialog for the resistance Endurance Test. */
  onSeedRoll: (req: SeedRollRequest) => void;
  onClose: () => void;
}

const STEP_LABELS: Record<CorruptionStep, string> = {
  threshold: 'Threshold',
  resistance: 'Resistance',
  mutation: 'Mutation',
};

/**
 * The "Guide me through corruption" portal overlay/stepper (FEAT-002), copied
 * from GuidedDiseasePanel: createPortal to document.body, role="dialog" +
 * aria-modal, focus trap, Esc + backdrop close, focus moved to the step heading
 * on open and each step change, focus restored to the trigger on close.
 *
 * The panel performs NO corruption / threshold / mutation math and mutates
 * nothing. Every number comes from the EXISTING src/logic/corruption.ts
 * calculators, and the single seeded roll (the Challenging (+0) Endurance Test)
 * goes through the host's shared RollDialog via onSeedRoll. The mutation d100s
 * are NEVER seeded here — Step 3 hands off (close-and-return) to the existing
 * CorruptionCard roller + Add to Character. Step copy comes from the
 * deterministic, synchronous defaultCorruptionAdvisor (future-proof seam for a
 * later LLM advisor).
 */
export function GuidedCorruptionPanel({
  state,
  dispatch,
  character,
  onSeedRoll,
  onClose,
}: GuidedCorruptionPanelProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Every displayed number comes from the existing pure logic — the panel
  // re-derives nothing.
  const pureSoulLevel = getPureSoulLevel(character.talents);
  const threshold = getCorruptionThreshold(character.chars, pureSoulLevel);
  const status = getCorruptionStatus(character.corr, threshold);
  const atOrOverThreshold = status === 'danger';
  const dist = getMutationTypeDistribution(character.species);
  const physicalLimit = getPhysicalMutationLimit(character.chars);
  const mentalLimit = getMentalMutationLimit(character.chars);
  const corrLoss = getCorruptionLossOnMutation(character.chars);

  // Synchronous default advisor — describeCorruptionStep is sync-by-default, so
  // the returned value is never a Promise in v1.
  const info = defaultCorruptionAdvisor.describe(state.step, { atOrOverThreshold });
  const stepInfo = info instanceof Promise ? null : info;

  const steps = STEP_SEQUENCE;
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

  // Core p.183: lose Corruption points equal to WPB on mutating. TB/WPB bonus
  // component lines are built from the SAME getBonus the calculators use.
  const tb = getBonus(character.chars.T.i + character.chars.T.a + character.chars.T.b);
  const wpb = getBonus(character.chars.WP.i + character.chars.WP.a + character.chars.WP.b);

  const content = (
    <div
      className={styles.backdrop}
      data-variant={isMobile ? 'sheet' : 'drawer'}
      onClick={handleBackdropClick}
      data-testid="guided-corruption-backdrop"
    >
      <div
        ref={panelRef}
        className={styles.panel}
        data-variant={isMobile ? 'sheet' : 'drawer'}
        role="dialog"
        aria-modal="true"
        aria-label="Guide me through corruption"
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

        {/* Stepper — fixed three steps; aria-current marks the active step. */}
        <ol className={styles.stepper} aria-label="Corruption steps">
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

          {/* ── Step 1: Threshold — corr / getCorruptionThreshold with the
              'more than vs >=' note (Core p.183 + Pure Soul p.142). ────────── */}
          {state.step === 'threshold' && (
            <div data-testid="guided-corruption-threshold">
              {/* Finding 8: the threshold total is getCorruptionThreshold; the
                  TB / WPB / Pure Soul lines are an identically-sourced LOCAL
                  literal (not imported from the assistant rule). No hand math. */}
              <BreakdownTotal
                tooltipId="guided-corruption-threshold-total"
                label="Corruption"
                value={`${character.corr} / ${threshold}`}
                lines={[`TB ${tb}`, `WPB ${wpb}`, `Pure Soul ${pureSoulLevel}`]}
              />
              <p className={styles.note}>
                Core p.183 triggers a Test when you gain MORE THAN TB + WPB (+ Pure Soul); this app
                flags danger at or above that total (&gt;=).
              </p>
            </div>
          )}

          {/* ── Step 2: Resistance — one-tap Challenging (+0) Endurance Test. ─ */}
          {state.step === 'resistance' && (
            <div data-testid="guided-corruption-resistance">
              {/* Core p.183: Challenging (+0) Endurance Test to resist corrupting. */}
              <span className={styles.sectionLabel}>Resist (Challenging)</span>
              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() =>
                    onSeedRoll({
                      name: 'Endurance (resist Corruption)',
                      def: { kind: 'skill', skillName: 'Endurance', fallbackChar: 'T' },
                      difficulty: 'Challenging',
                    })
                  }
                  aria-label="Roll Challenging Endurance Test to resist Corruption"
                  data-testid="guided-corruption-seed-resistance"
                >
                  <Dices size={14} aria-hidden="true" /> Challenging Endurance Test
                </button>
              </div>
              <p className={styles.note}>
                Pass: you hold off corruption for now (Test again next time you gain Corruption).
                Fail: your body or mind mutates &mdash; continue to the mutation step.
              </p>
            </div>
          )}

          {/* ── Step 3: Mutation — hand-off to the existing roller (no d100
              seeded here). Shows type split, limits, and the WPB loss. ────── */}
          {state.step === 'mutation' && (
            <div data-testid="guided-corruption-mutation">
              {/* Core p.183: on a failed Test, lose Corruption = WPB, then roll
                  percentile dice for the body/mind split. A-6: unknown species
                  fall back to the Human 50/50 distribution. */}
              <p className={styles.note}>
                {character.species || 'Human'}: Physical 1&ndash;{dist.physicalMax || '\u2014'} /
                Mental {dist.mentalMin}&ndash;100 (unknown species use the Human split).
              </p>
              <BreakdownTotal
                tooltipId="guided-corruption-corr-loss"
                label="Corruption lost on mutating"
                value={corrLoss}
                lines={[`WPB ${wpb} (tens digit of your Willpower total)`]}
              />
              <BreakdownTotal
                tooltipId="guided-corruption-physical-limit"
                label="Physical mutation limit"
                value={physicalLimit}
                lines={[`TB ${tb} (tens digit of your Toughness total)`]}
              />
              <BreakdownTotal
                tooltipId="guided-corruption-mental-limit"
                label="Mental mutation limit"
                value={mentalLimit}
                lines={[`WPB ${wpb} (tens digit of your Willpower total)`]}
              />
              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={handleClose}
                  aria-label="Roll the mutation on the Mutation Roller"
                  data-testid="guided-corruption-mutation-handoff"
                >
                  <Skull size={14} aria-hidden="true" /> Roll on the Mutation Roller
                </button>
              </div>
              <p className={styles.note}>
                The Mutation Roller rolls the d100 and, on Add to Character, applies the Corruption
                loss and records the mutation. The guide rolls and applies nothing.
              </p>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => dispatch({ kind: 'back' })}
            disabled={isFirst}
            data-testid="guided-corruption-back"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Back
          </button>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => dispatch({ kind: 'next' })}
            disabled={isLast}
            data-testid="guided-corruption-next"
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
