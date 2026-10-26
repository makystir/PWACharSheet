import { useState, useMemo } from 'react';
import type { Character, CharacteristicKey } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { Tooltip } from '../shared/Tooltip';
import { TooltipTriggerCell } from '../shared/TooltipTriggerCell';
import { HelpPopover } from '../shared/HelpPopover';
import { Picker } from '../shared/Picker';
import { getHelpContent } from '../../logic/help-content';
import { Compass } from 'lucide-react';
import { CHAR_FULL_NAMES } from './characterConstants';
import {
  deterministicProgressionSource,
  describeCareerOptions,
  getCareerLevelOptions,
  type ProgressionGoal,
  type ProgressionPhase,
  type ProgressionPlan,
} from '../../logic/progression-advisor';
import type { PlannerStep } from '../../logic/advancement-planner';
import { getEligibleCareers } from '../../logic/career-eligibility';
import { getCareerScheme } from '../../logic/careers';
import styles from './ProgressionAdvisor.module.css';

/**
 * READ-ONLY progression advisor panel (design §The UI panel).
 *
 * Goal-driven sibling of `AdvancementPlanner`: the player picks a goal (a target
 * career, a target level, an optional XP budget, and an XP/session rate) and the
 * panel shows the ordered, costed path to reach it. All cost numbers come from
 * the pure engine (`deterministicProgressionSource.plan`), which reuses the real
 * cost functions. This panel NEVER mutates the character, spends XP, advances,
 * or switches a career (FR-5/FR-6) — real spending stays on the Career Progress
 * and Switch Career controls below.
 *
 * Every calculated TOTAL (phase subtotal, grand total, switch/advance fee, budget
 * spent) carries a `Tooltip` breakdown via `TooltipTriggerCell`
 * (calculated-total-tooltips steering). Per-step costs are single
 * `getAdvancementCost`/fee lookups and are exempt (design §The UI panel, FR-9.3).
 */

export interface ProgressionAdvisorProps {
  character: Character;
  /** Optional localStorage key to persist the collapsed state (as the planner). */
  storageKey?: string;
}

/** Read persisted collapsed state (true = collapsed). Graceful on error. */
function readCollapsed(storageKey: string | undefined): boolean {
  if (!storageKey) return false;
  try {
    return localStorage.getItem(storageKey) === 'true';
  } catch {
    return false;
  }
}

type OpenTooltip =
  | { kind: string; anchorEl: HTMLElement }
  | null;

/** Describe a single per-advance step for a path line / aria-label. */
function describeStep(step: PlannerStep): string {
  const label =
    step.kind === 'characteristic'
      ? (CHAR_FULL_NAMES[step.name as CharacteristicKey] ?? step.name)
      : step.name;
  if (step.kind === 'talent') {
    return `${label} (talent): ${step.cost} XP`;
  }
  const career = step.inCareer ? 'in-career' : 'out-of-career';
  return `${label} ${step.fromAdvances}→${step.toAdvances} (${career}): ${step.cost} XP`;
}

/** Build "a + b + … = total" text for a phase's steps + fee. */
function phaseFormula(phase: ProgressionPhase): string {
  const parts = phase.steps.map(s => String(s.cost));
  if (phase.fee) parts.push(String(phase.fee.cost));
  if (parts.length === 0) return `= ${phase.subtotal}`;
  return `${parts.join(' + ')} = ${phase.subtotal}`;
}

export function ProgressionAdvisor({ character, storageKey }: ProgressionAdvisorProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => readCollapsed(storageKey));
  const [goal, setGoal] = useState<ProgressionGoal>({ kind: 'none' });
  const [budgetInput, setBudgetInput] = useState('');
  // XP/session timeline rate. UI default only — not a rulebook value; XP awards
  // are GM-discretionary (Core p.36).
  const [rateInput, setRateInput] = useState('10');
  const [openTooltip, setOpenTooltip] = useState<OpenTooltip>(null);
  const [showCareerPicker, setShowCareerPicker] = useState(false);
  const [showLevelPicker, setShowLevelPicker] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (storageKey) {
        try { localStorage.setItem(storageKey, String(next)); } catch { /* ignore */ }
      }
      return next;
    });
  };

  const close = () => setOpenTooltip(null);
  const open = (kind: string) => (anchorEl: HTMLElement) => setOpenTooltip({ kind, anchorEl });

  // Parse the optional projection inputs (design §The UI panel). Invalid input
  // simply hides the derived section, exactly like the planner's budget input.
  const parsedBudget = Number(budgetInput);
  const budgetActive = budgetInput.trim() !== '' && Number.isFinite(parsedBudget) && parsedBudget > 0;
  const parsedRate = Number(rateInput);
  const rate = Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : 0;

  // The selected target career (for the picker label); 'none' goal shows current.
  const targetCareer =
    goal.kind === 'career' ? goal.career
    : goal.kind === 'careerLevel' ? goal.career
    : character.career;

  const targetLevel = goal.kind === 'careerLevel' ? goal.level : 1;

  // Compute the plan from the pure engine (design §The UI panel). The
  // deterministic source is ALWAYS synchronous (the async return type exists
  // only to future-proof a possible LLM-backed source), so the result is a
  // plain ProgressionPlan here.
  const plan = useMemo<ProgressionPlan>(
    () => deterministicProgressionSource.plan(character, goal, {
      budget: budgetActive ? parsedBudget : undefined,
      xpPerSession: rate,
    }) as ProgressionPlan,
    [character, goal, budgetActive, parsedBudget, rate],
  );

  // Eligible target careers minus current, grouped by class — identical
  // membership to the Switch Career picker (AC2).
  const eligibleCareers = useMemo(
    () => getEligibleCareers(character.species).filter(c => c !== character.career),
    [character.species, character.career],
  );
  const careerOptions = useMemo(() => describeCareerOptions(character), [character]);
  const levelOptions = useMemo(() => getCareerLevelOptions(targetCareer), [targetCareer]);

  const handleSelectCareer = (careerName: string) => {
    if (careerName === character.career) {
      setGoal({ kind: 'nextLevel' });
    } else {
      // Default a foreign career's target level to 1 (FR-1.2).
      setGoal({ kind: 'career', career: careerName });
    }
    setShowCareerPicker(false);
  };

  const handleSelectLevel = (level: number) => {
    setGoal({ kind: 'careerLevel', career: targetCareer, level });
    setShowLevelPicker(false);
  };

  // Current-career + an explicit "Current career" entry for the picker.
  const careerPickerItems = ['__current__', ...eligibleCareers];

  return (
    <Card>
      <div className={styles.headerRow}>
        <SectionHeader
          icon={Compass}
          title="Progression Advisor"
          collapsible={!!storageKey}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
        <HelpPopover concept="career-advancement">{getHelpContent('career-advancement')}</HelpPopover>
      </div>

      {!collapsed && (<>
        {/* Goal selectors */}
        <div className={styles.goalControls}>
          <div className={styles.goalField}>
            <span className={styles.fieldLabel}>Target career</span>
            <button type="button" className={styles.goalBtn} aria-label="Choose target career" onClick={() => setShowCareerPicker(true)}>
              {goal.kind === 'none' ? 'Pick a goal…' : targetCareer}
            </button>
          </div>
          <div className={styles.goalField}>
            <span className={styles.fieldLabel}>Target level</span>
            <button
              type="button"
              className={styles.goalBtn}
              aria-label="Choose target level"
              onClick={() => setShowLevelPicker(true)}
              disabled={goal.kind === 'none'}
            >
              {levelOptions[targetLevel - 1]?.title ?? `Level ${targetLevel}`}
            </button>
          </div>
          <div className={styles.goalField}>
            <label className={styles.fieldLabel} htmlFor="progression-advisor-budget">XP budget (optional)</label>
            <input
              id="progression-advisor-budget"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="XP budget"
              aria-label="Saved XP to project toward goal"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className={styles.goalInput}
            />
          </div>
          <div className={styles.goalField}>
            <label className={styles.fieldLabel} htmlFor="progression-advisor-rate">XP / session</label>
            <input
              id="progression-advisor-rate"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="XP/session"
              aria-label="XP earned per session (estimate)"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              className={styles.goalInput}
            />
          </div>
        </div>

        {/* State: none → prompt + career options list (shown ONLY in none state) */}
        {goal.kind === 'none' && (
          <>
            <div className={styles.neutral} role="status">
              Pick a goal to see a recommended path.
            </div>
            {careerOptions.length > 0 && (
              <div className={styles.optionsSection}>
                <div className={styles.optionsHeading}>Not sure where to go? Eligible careers:</div>
                <ul className={styles.optionsList}>
                  {careerOptions.map((opt) => (
                    <li key={opt.career}>
                      <button
                        type="button"
                        className={styles.optionBtn}
                        onClick={() => setGoal({ kind: 'career', career: opt.career })}
                      >
                        <span className={styles.optionName}>{opt.career}</span>
                        <span className={styles.optionRationale}>{opt.rationale}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* State: unreachable → reason */}
        {goal.kind !== 'none' && !plan.reachable && (
          <div className={styles.neutral} role="status">
            {plan.reason ?? 'This goal is not reachable.'}
          </div>
        )}

        {/* State: reachable → ordered phases */}
        {goal.kind !== 'none' && plan.reachable && (
          <>
            {plan.phases.map((phase, pi) => (
              <div key={phase.id + pi} className={styles.phase}>
                <div className={styles.phaseHeading}>{phase.title}</div>
                {phase.steps.length > 0 && (
                  <ol className={styles.pathList}>
                    {phase.steps.map((s, i) => (
                      <li key={`${s.kind}-${s.name}-${s.fromAdvances}-${i}`} className={s.inCareer ? styles.pathStepInCareer : styles.pathStepOutCareer}>
                        <span className={styles.pathStepLabel}>{describeStep(s)}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {phase.fee && (
                  <div className={styles.feeRow}>
                    <span className={styles.label}>{phase.fee.label}</span>
                    {/* Switch/advance fee is a calculated total → breakdown tooltip. */}
                    <TooltipTriggerCell
                      tooltipId={`progression-advisor-fee-${pi}`}
                      className={styles.total}
                      ariaLabel={`${phase.fee.label}: ${phase.fee.cost} XP. ${phase.fee.components.map(c => `${c.label} ${c.value} (${c.cite})`).join(' + ')} = ${phase.fee.cost}. Show breakdown.`}
                      displayValue={`${phase.fee.cost} XP`}
                      isTooltipOpen={openTooltip?.kind === `fee-${pi}`}
                      onOpen={open(`fee-${pi}`)}
                      onClose={close}
                    />
                  </div>
                )}
                {phase.advisories.length > 0 && (
                  <div className={styles.advisory}>{phase.advisories.join(' ')}</div>
                )}
                {/* Phase subtotal — calculated total → breakdown tooltip. */}
                <div className={styles.subtotalRow}>
                  <span className={styles.label}>Phase subtotal</span>
                  <TooltipTriggerCell
                    tooltipId={`progression-advisor-subtotal-${pi}`}
                    className={styles.total}
                    ariaLabel={`${phase.title} subtotal: ${phase.subtotal} XP. ${phaseFormula(phase)}. Show breakdown.`}
                    displayValue={`${phase.subtotal} XP`}
                    isTooltipOpen={openTooltip?.kind === `subtotal-${pi}`}
                    onOpen={open(`subtotal-${pi}`)}
                    onClose={close}
                  />
                </div>
              </div>
            ))}

            {/* Grand total — calculated total → breakdown tooltip. */}
            <div className={styles.grandRow}>
              <span className={styles.label}>Total to reach goal</span>
              <TooltipTriggerCell
                tooltipId="progression-advisor-grand"
                className={styles.grandTotal}
                ariaLabel={`Progression total to reach goal ${plan.grandTotal} XP. ${plan.phases.map(p => p.subtotal).join(' + ')} = ${plan.grandTotal}. Show breakdown.`}
                displayValue={`${plan.grandTotal} XP`}
                isTooltipOpen={openTooltip?.kind === 'grand'}
                onOpen={open('grand')}
                onClose={close}
              />
            </div>

            {/* Affordability */}
            <div className={plan.canAfford ? styles.affordYes : styles.affordNo} role="status">
              {plan.canAfford
                ? `You can afford it (have ${plan.xpCur} XP, need ${plan.grandTotal} XP).`
                : `Need ${plan.shortfall} more XP (have ${plan.xpCur}, need ${plan.grandTotal}).`}
            </div>

            {/* Timeline (estimate) */}
            {plan.sessionsToGoal !== null && (
              <div className={styles.timeline} role="status">
                ≈ {plan.sessionsToGoal} session{plan.sessionsToGoal === 1 ? '' : 's'} at {plan.xpPerSession} XP/session (estimate).
              </div>
            )}

            {/* Budget projection */}
            {plan.budget && (
              <div className={styles.budgetResult} role="status">
                <div className={styles.budgetLine}>
                  <span>Covers {plan.budget.affordableCount} of {plan.orderedPath.length} steps, spending</span>
                  <TooltipTriggerCell
                    tooltipId="progression-advisor-spent"
                    className={styles.total}
                    ariaLabel={`Spent ${plan.budget.spent} XP of a ${plan.budget.budget} budget across ${plan.budget.affordableCount} steps. Show breakdown.`}
                    displayValue={`${plan.budget.spent} XP`}
                    isTooltipOpen={openTooltip?.kind === 'spent'}
                    onOpen={open('spent')}
                    onClose={close}
                  />
                </div>
                {plan.budget.firstUnaffordableLabel ? (
                  <div className={styles.budgetNext}>Next out of reach: {plan.budget.firstUnaffordableLabel}</div>
                ) : (
                  <div className={styles.budgetNext}>Budget covers the whole path.</div>
                )}
              </div>
            )}

            {/* Top-level advisories */}
            {plan.advisories.length > 0 && (
              <div className={styles.advisory}>{plan.advisories.join(' ')}</div>
            )}

            {/* Read-only "do it" note — routes to the real controls, no mutation. */}
            <div className={styles.doItNote}>
              This is a plan only. Spend XP using the Career Progress advance button and the Switch Career control below.
            </div>
          </>
        )}

        {/* Tooltips (one open slot) */}
        {openTooltip?.kind === 'grand' && (
          <Tooltip id="progression-advisor-grand" anchorEl={openTooltip.anchorEl} title="Total to reach goal" onClose={close}>
            <div className={styles.tooltipBody}>
              <div className={styles.tooltipFormula}>
                {plan.phases.map(p => p.subtotal).join(' + ')} = {plan.grandTotal} XP
              </div>
              <div className={styles.tooltipNote}>Sum of each phase subtotal.</div>
            </div>
          </Tooltip>
        )}
        {openTooltip?.kind.startsWith('subtotal-') && (() => {
          const pi = Number(openTooltip.kind.slice('subtotal-'.length));
          const phase = plan.phases[pi];
          if (!phase) return null;
          return (
            <Tooltip id={`progression-advisor-subtotal-${pi}`} anchorEl={openTooltip.anchorEl} title={`${phase.title} subtotal`} onClose={close}>
              <div className={styles.tooltipBody}>
                {phase.steps.length === 0 && !phase.fee ? (
                  <div className={styles.tooltipNote}>No XP required.</div>
                ) : (
                  <>
                    <ul className={styles.tooltipList}>
                      {phase.steps.map((s, i) => (
                        <li key={`${s.kind}-${s.name}-${s.fromAdvances}-${i}`}>{describeStep(s)}</li>
                      ))}
                      {phase.fee && <li>{phase.fee.label}: {phase.fee.cost} XP</li>}
                    </ul>
                    <div className={styles.tooltipFormula}>{phaseFormula(phase)} XP</div>
                  </>
                )}
              </div>
            </Tooltip>
          );
        })()}
        {openTooltip?.kind.startsWith('fee-') && (() => {
          const pi = Number(openTooltip.kind.slice('fee-'.length));
          const fee = plan.phases[pi]?.fee;
          if (!fee) return null;
          return (
            <Tooltip id={`progression-advisor-fee-${pi}`} anchorEl={openTooltip.anchorEl} title={fee.label} onClose={close}>
              <div className={styles.tooltipBody}>
                <ul className={styles.tooltipList}>
                  {fee.components.map((c, i) => (
                    <li key={i}>{c.label}: {c.value} XP ({c.cite})</li>
                  ))}
                </ul>
                <div className={styles.tooltipFormula}>
                  {fee.components.map(c => c.value).join(' + ')} = {fee.cost} XP
                </div>
              </div>
            </Tooltip>
          );
        })()}
        {openTooltip?.kind === 'spent' && plan.budget && (
          <Tooltip id="progression-advisor-spent" anchorEl={openTooltip.anchorEl} title="Budget spent" onClose={close}>
            <div className={styles.tooltipBody}>
              <div className={styles.tooltipFormula}>
                Covers {plan.budget.affordableCount} of {plan.orderedPath.length} steps = {plan.budget.spent} XP
              </div>
              <div className={styles.tooltipNote}>
                Of a {plan.budget.budget} XP budget, spent along the ordered path.
              </div>
            </div>
          </Tooltip>
        )}
      </>)}

      {showCareerPicker && (
        <Picker
          items={careerPickerItems}
          getLabel={(c) => (c === '__current__' ? `Current career (${character.career})` : c)}
          getGroup={(c) => (c === '__current__' ? 'Current' : getCareerScheme(c)?.class ?? 'Other')}
          onSelect={(c) => handleSelectCareer(c === '__current__' ? character.career : c)}
          onClose={() => setShowCareerPicker(false)}
          title="Choose a target career"
        />
      )}
      {showLevelPicker && goal.kind !== 'none' && (
        <Picker
          items={levelOptions.map((l, i) => ({ title: l.title, level: i + 1 }))}
          getLabel={(l) => `${l.level}. ${l.title}`}
          onSelect={(l) => handleSelectLevel(l.level)}
          onClose={() => setShowLevelPicker(false)}
          title="Choose a target level"
        />
      )}
    </Card>
  );
}
