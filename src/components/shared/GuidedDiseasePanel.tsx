import { useEffect, useRef, useCallback, type Dispatch } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Dices, MapPin } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { Character } from '../../types/character';
import type { ReminderTest } from '../../logic/reminders';
import type { DifficultyLevel } from '../../logic/dice-roller';
import {
  findDisease,
  getDiseaseSymptoms,
  getDiseaseProgress,
  getSymptomTest,
  symptomRollsHitLocation,
  getLingeringDifficulty,
  getToughnessBonus,
  type ActiveDisease,
} from '../../logic/diseases';
import { resolveSeededTarget } from '../../logic/reminders-target';
import { BreakdownTotal } from './guidedCastSteps/BreakdownTotal';
import type { DiseaseStep, DiseaseFlowEvent, DiseaseFlowState } from '../../logic/guided-disease/types';
import { STEP_SEQUENCE } from '../../logic/guided-disease/reducer';
import { defaultDiseaseAdvisor } from '../../logic/guided-disease/steps';
import styles from './GuidedDiseasePanel.module.css';

/** A seeded roll request the host turns into the shared RollDialog. */
export interface SeedRollRequest {
  name: string;
  def: ReminderTest;
  difficulty: DifficultyLevel;
}

export interface GuidedDiseasePanelProps {
  state: DiseaseFlowState;
  dispatch: Dispatch<DiseaseFlowEvent>;
  character: Character;
  /** The bound active disease (resolved by the host from state.diseaseId). */
  disease: ActiveDisease;
  /** Open the shared seeded RollDialog for a symptom/Lingering Test. */
  onSeedRoll: (req: SeedRollRequest) => void;
  onClose: () => void;
}

const STEP_LABELS: Record<DiseaseStep, string> = {
  overview: 'Overview',
  symptoms: 'Symptoms',
  duration: 'Duration',
};

/**
 * The "Guide me through this disease" portal overlay/stepper (FEAT-001),
 * copied from GuidedCastPanel: createPortal to document.body, role="dialog" +
 * aria-modal, focus trap, Esc + backdrop close, focus moved to the step heading
 * on open and each step change, focus restored to the trigger on close.
 *
 * The panel performs NO disease / symptom-test / timing math and mutates
 * nothing. Every number comes from the EXISTING src/logic/diseases.ts +
 * resolveSeededTarget calculators, and every seeded roll goes through the host's
 * shared RollDialog via onSeedRoll. Mutation d100s and the Gangrene Hit-Location
 * d100 are NEVER seeded here — Gangrene hands off to the existing DiseasePanel
 * control (close-and-return). Step copy comes from the deterministic,
 * synchronous defaultDiseaseAdvisor (future-proof seam for a later LLM advisor).
 */
export function GuidedDiseasePanel({
  state,
  dispatch,
  character,
  disease,
  onSeedRoll,
  onClose,
}: GuidedDiseasePanelProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const diseaseName = disease.diseaseName;
  const entry = findDisease(diseaseName);
  const symptoms = getDiseaseSymptoms(diseaseName) ?? [];
  const progress = getDiseaseProgress(disease);
  const tb = getToughnessBonus(character);

  // Whether any symptom carries a self-contained Test (drives the advisor copy).
  const hasSeedableSymptom = symptoms.some((s) => {
    if (symptomRollsHitLocation(s.name)) return false; // Gangrene hands off, not seeded
    return getSymptomTest(s.name, s.severity) !== null && s.name !== 'Lingering';
  });

  // Synchronous default advisor — describeDiseaseStep is sync-by-default, so the
  // returned value is never a Promise in v1.
  const info = defaultDiseaseAdvisor.describe(state.step, {
    hasSeedableSymptom,
    durationReached: progress.durationReached,
  });
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

  const content = (
    <div
      className={styles.backdrop}
      data-variant={isMobile ? 'sheet' : 'drawer'}
      onClick={handleBackdropClick}
      data-testid="guided-disease-backdrop"
    >
      <div
        ref={panelRef}
        className={styles.panel}
        data-variant={isMobile ? 'sheet' : 'drawer'}
        role="dialog"
        aria-modal="true"
        aria-label="Guide me through this disease"
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
        <ol className={styles.stepper} aria-label="Disease steps">
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

          {/* ── Step 1: Overview — read-only timing summary, NO second TimingRoll
              control (Finding 5); points at the existing disease-row control. */}
          {state.step === 'overview' && entry && (
            <div className={styles.fieldList} data-testid="guided-disease-overview">
              <dl className={styles.fieldList}>
                <dt>Contraction</dt>
                <dd>{entry.contraction}</dd>
                <dt>Incubation</dt>
                <dd>{entry.incubation}</dd>
                <dt>Duration</dt>
                <dd>{entry.duration}</dd>
                {entry.permanent && (
                  <>
                    <dt>Permanent</dt>
                    <dd>{entry.permanent}</dd>
                  </>
                )}
              </dl>
              {/* Rolled totals reuse RolledTiming.breakdown verbatim (no new math). */}
              {disease.rolledIncubation && (
                <BreakdownTotal
                  tooltipId="guided-disease-rolled-incubation"
                  label="Rolled Incubation"
                  value={`${disease.rolledIncubation.total} ${disease.rolledIncubation.unit}`}
                  lines={[disease.rolledIncubation.breakdown]}
                />
              )}
              {disease.rolledDuration && (
                <BreakdownTotal
                  tooltipId="guided-disease-rolled-duration"
                  label="Rolled Duration"
                  value={`${disease.rolledDuration.total} ${disease.rolledDuration.unit}`}
                  lines={[disease.rolledDuration.breakdown]}
                />
              )}
              <p className={styles.note}>
                Roll any dice timings on the Incubation/Duration control on the disease row;
                this guide only reflects the result.
              </p>
            </div>
          )}

          {/* ── Step 2: Symptoms — per-symptom resolution. ─────────────────── */}
          {state.step === 'symptoms' && (
            <div data-testid="guided-disease-symptoms">
              {symptoms.length === 0 && <p className={styles.note}>This disease has no listed symptoms.</p>}
              {symptoms.map((symptom) => {
                const test = getSymptomTest(symptom.name, symptom.severity);
                const rollsLocation = symptomRollsHitLocation(symptom.name);
                return (
                  <div key={symptom.displayName} className={styles.symptomCard}>
                    <span className={styles.symptomName}>{symptom.displayName}</span>
                    <p className={styles.symptomDesc}>{symptom.description}</p>
                    <p className={styles.symptomEffect}>{symptom.effects}</p>

                    {/* Gangrene: show the TB threshold + a close-and-return
                        Hit-Location hand-off. Seed NOTHING for the location roll
                        (Finding 6) — it stays on the existing DiseasePanel control. */}
                    {rollsLocation ? (
                      <>
                        {/* Core p.188 (Gangrene): fail the daily Average (+20)
                            Endurance Test more than Toughness Bonus times to lose
                            the location. TB shown with its breakdown tooltip. */}
                        <BreakdownTotal
                          tooltipId={`guided-disease-gangrene-tb-${disease.id}`}
                          label="Gangrene threshold (TB)"
                          value={tb}
                          lines={[`Toughness Bonus ${tb} (tens digit of your Toughness total)`]}
                        />
                        <p className={styles.symptomCadence}>
                          Daily (fail &gt; TB times = lose location)
                        </p>
                        {/* Seed the daily Endurance Test (that IS a normal symptom
                            Test); the Hit-Location roll is a hand-off, not seeded. */}
                        {test && (
                          <div className={styles.actionRow}>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() =>
                                onSeedRoll({
                                  name: `${test.skill} (${diseaseName})`,
                                  def: {
                                    kind: 'skill',
                                    skillName: test.skill,
                                    fallbackChar: test.skill === 'Endurance' ? 'T' : 'WP',
                                  },
                                  difficulty: test.difficulty,
                                })
                              }
                              aria-label={`Roll ${test.difficulty} ${test.skill} Test for ${symptom.displayName}`}
                            >
                              <Dices size={14} aria-hidden="true" /> {test.difficulty} {test.skill} Test
                            </button>
                          </div>
                        )}
                        <div className={styles.actionRow}>
                          <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={handleClose}
                            aria-label="Roll Hit Location on the disease row"
                            data-testid="guided-disease-gangrene-handoff"
                          >
                            <MapPin size={14} aria-hidden="true" /> Roll Hit Location on the disease row
                          </button>
                        </div>
                      </>
                    ) : test && symptom.name !== 'Lingering' ? (
                      <>
                        <p className={styles.symptomCadence}>{test.cadence}</p>
                        <div className={styles.actionRow}>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() =>
                              onSeedRoll({
                                name: `${test.skill} (${diseaseName})`,
                                def: {
                                  kind: 'skill',
                                  skillName: test.skill,
                                  fallbackChar: test.skill === 'Endurance' ? 'T' : 'WP',
                                },
                                difficulty: test.difficulty,
                              })
                            }
                            aria-label={`Roll ${test.difficulty} ${test.skill} Test for ${symptom.displayName}`}
                            data-testid="guided-disease-seed-symptom"
                          >
                            <Dices size={14} aria-hidden="true" /> {test.difficulty} {test.skill} Test
                          </button>
                          <SymptomBaseTarget
                            character={character}
                            tooltipId={`guided-disease-symptom-target-${disease.id}-${symptom.name}`}
                            skill={test.skill}
                          />
                        </div>
                      </>
                    ) : (
                      // Lingering is resolved on Step 3; everything else with no
                      // self-contained Test is guidance only.
                      <p className={styles.note}>
                        {symptom.name === 'Lingering'
                          ? 'Resolved at the end of the Duration — see the final step.'
                          : 'No self-contained roll — apply as described above.'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Step 3: Duration / outcome. ───────────────────────────────── */}
          {state.step === 'duration' && (
            <div data-testid="guided-disease-duration">
              {(() => {
                const lingering = symptoms.find((s) => s.name === 'Lingering');
                if (!lingering) {
                  return (
                    <p className={styles.note}>
                      This disease has no Lingering symptom: when the Duration is reached it simply ends.
                    </p>
                  );
                }
                // Core p.188 (Lingering): Endurance Test at the marked Difficulty.
                const difficulty = getLingeringDifficulty(lingering.severity);
                return (
                  <>
                    <span className={styles.sectionLabel}>Lingering ({difficulty})</span>
                    <div className={styles.actionRow}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() =>
                          onSeedRoll({
                            name: `Endurance (${diseaseName} Lingering)`,
                            def: { kind: 'skill', skillName: 'Endurance', fallbackChar: 'T' },
                            difficulty,
                          })
                        }
                        aria-label={`Roll ${difficulty} Endurance Test for Lingering`}
                        data-testid="guided-disease-seed-lingering"
                      >
                        <Dices size={14} aria-hidden="true" /> {difficulty} Endurance Test
                      </button>
                      <SymptomBaseTarget
                        character={character}
                        tooltipId={`guided-disease-lingering-target-${disease.id}`}
                        skill="Endurance"
                      />
                    </div>
                    {/* Consequences are guidance only — the player resolves any
                        1d10 extension / Festering Wound / Blood Rot on the disease
                        rows (Core p.188). */}
                    <span className={styles.sectionLabel}>Possible consequences</span>
                    <ul className={styles.effectList}>
                      <li>Marginal Failure (0): the disease lingers for an extra 1d10 days.</li>
                      <li>Failure (&minus;2): you develop a Festering Wound.</li>
                      <li>Astounding Failure (&minus;6): you develop Blood Rot.</li>
                    </ul>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => dispatch({ kind: 'back' })}
            disabled={isFirst}
            data-testid="guided-disease-back"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Back
          </button>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => dispatch({ kind: 'next' })}
            disabled={isLast}
            data-testid="guided-disease-next"
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

/**
 * The base target for a symptom/Lingering Test, rendered through BreakdownTotal.
 * Both the total and its additive lines come from resolveSeededTarget — the one
 * source of truth for seeded base targets (calculated-totals steering, FR-6).
 */
function SymptomBaseTarget({
  character,
  tooltipId,
  skill,
}: {
  character: Character;
  tooltipId: string;
  skill: 'Endurance' | 'Cool';
}) {
  const def: ReminderTest = {
    kind: 'skill',
    skillName: skill,
    fallbackChar: skill === 'Endurance' ? 'T' : 'WP',
  };
  const { total, lines } = resolveSeededTarget(character, def);
  return (
    <BreakdownTotal tooltipId={tooltipId} label="Base target" value={total} lines={lines} />
  );
}
