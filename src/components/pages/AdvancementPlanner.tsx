import { useState, useMemo } from 'react';
import type { CharacteristicKey } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { Tooltip } from '../shared/Tooltip';
import { TooltipTriggerCell } from '../shared/TooltipTriggerCell';
import { HelpPopover } from '../shared/HelpPopover';
import { getHelpContent } from '../../logic/help-content';
import { Target } from 'lucide-react';
import { CHAR_FULL_NAMES } from './characterConstants';
import type { NextLevelPlan, PlannerStep, RequirementPlan } from '../../logic/advancement-planner';
import { projectBudget } from '../../logic/advancement-planner';
import styles from './AdvancementPlanner.module.css';

/**
 * READ-ONLY advancement planner panel (design §7.2).
 *
 * Pure presentation: all cost/plan state is computed by `planNextCareerLevel`
 * (in the pure module) and passed in as the `plan` prop. The only local state is
 * the optional XP-budget input, which never touches the character. This panel
 * NEVER mutates the character, spends XP, or advances anything (FR-6).
 *
 * Every calculated TOTAL (requirement subtotals, grand total, the budget's
 * running `spent`) carries a `Tooltip` breakdown via `TooltipTriggerCell`
 * (calculated-total-tooltips steering). Individual per-step costs are a single
 * `getAdvancementCost` lookup — not a sum — so they are exempt (design §7.2,
 * Finding 6).
 */

export interface AdvancementPlannerProps {
  plan: NextLevelPlan;
  career: string;
  careerLevel: string;
  /**
   * Optional localStorage key to persist the collapsed state. When provided,
   * the section header shows a collapse toggle so this (tall) panel can be
   * hidden to reduce page clutter. Omitting it keeps the panel always open.
   */
  storageKey?: string;
}

/** Read persisted collapsed state (true = collapsed). Graceful on error. */
function readPlannerCollapsed(storageKey: string | undefined): boolean {
  if (!storageKey) return false;
  try {
    return localStorage.getItem(storageKey) === 'true';
  } catch {
    return false;
  }
}

type OpenTooltip =
  | { kind: 'chars' | 'skills' | 'talent' | 'grand' | 'spent'; anchorEl: HTMLElement }
  | null;

/** Describe a single advance for a breakdown line / aria-label. */
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

/** Build the additive "a + b + … = total" text for a set of steps. */
function additiveFormula(steps: PlannerStep[], total: number): string {
  if (steps.length === 0) return `= ${total}`;
  return `${steps.map(s => s.cost).join(' + ')} = ${total}`;
}

export function AdvancementPlanner({ plan, career, careerLevel, storageKey }: AdvancementPlannerProps) {
  const [openTooltip, setOpenTooltip] = useState<OpenTooltip>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [collapsed, setCollapsed] = useState<boolean>(() => readPlannerCollapsed(storageKey));

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
  const open = (kind: NonNullable<OpenTooltip>['kind']) => (anchorEl: HTMLElement) =>
    setOpenTooltip({ kind, anchorEl });

  // Parse the budget: finite and > 0 shows the projection; anything else hides
  // it (design §9, Finding 8). projectBudget itself floors to a non-negative int.
  const parsedBudget = Number(budgetInput);
  const budgetActive = budgetInput.trim() !== '' && Number.isFinite(parsedBudget) && parsedBudget > 0;
  const projection = useMemo(
    () => projectBudget(plan, parsedBudget),
    [plan, parsedBudget],
  );

  if (!plan.applicable) {
    return (
      <Card>
        <SectionHeader icon={Target} title="Plan: Next Career Level" />
        <div className={styles.neutral} role="status">
          {career
            ? `${career} — ${careerLevel} has no further level to plan toward.`
            : 'Select a career to plan your next level.'}
        </div>
      </Card>
    );
  }

  const { characteristics, skills, talent, grandTotal, advanceLevelCost, canAfford, shortfall, xpCur } = plan;

  const feeBasis = advanceLevelCost === 100 ? 'ready' : 'not ready';

  const requirementRow = (
    label: string,
    req: RequirementPlan,
    kind: 'chars' | 'skills' | 'talent',
    tooltipId: string,
  ) => (
    <li className={req.met ? styles.itemMet : styles.itemUnmet}>
      <span className={styles.status} aria-hidden="true">{req.met ? '✓' : '✗'}</span>
      <span className={styles.label}>{label}</span>
      <TooltipTriggerCell
        tooltipId={tooltipId}
        className={styles.total}
        ariaLabel={`${label} cost to complete: ${req.subtotal} XP. ${additiveFormula(req.steps, req.subtotal)}. Show breakdown.`}
        displayValue={`${req.subtotal} XP`}
        isTooltipOpen={openTooltip?.kind === kind}
        onOpen={open(kind)}
        onClose={close}
      />
      {req.advisories.length > 0 && (
        <span className={styles.advisory}>{req.advisories.join(' ')}</span>
      )}
    </li>
  );

  const requirementTooltipBody = (req: RequirementPlan) => (
    <div className={styles.tooltipBody}>
      {req.steps.length === 0 ? (
        <div className={styles.tooltipNote}>Already met — no XP required.</div>
      ) : (
        <>
          <ul className={styles.tooltipList}>
            {req.steps.map((s, i) => (
              <li key={`${s.kind}-${s.name}-${s.fromAdvances}-${i}`}>{describeStep(s)}</li>
            ))}
          </ul>
          <div className={styles.tooltipFormula}>{additiveFormula(req.steps, req.subtotal)} XP</div>
        </>
      )}
      {req.advisories.length > 0 && (
        <div className={styles.tooltipNote}>{req.advisories.join(' ')}</div>
      )}
    </div>
  );

  return (
    <Card>
      <div className={styles.headerRow}>
        <SectionHeader
          icon={Target}
          title="Plan: Next Career Level"
          collapsible={!!storageKey}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
        {/* Reuse the existing career-advancement help concept (design §7.2 —
            prefer reuse over adding help content). */}
        <HelpPopover concept="career-advancement">{getHelpContent('career-advancement')}</HelpPopover>
      </div>

      {!collapsed && (<>
      <ul className={styles.list}>
        {requirementRow('Characteristics', characteristics, 'chars', 'advancement-planner-chars')}
        {requirementRow('Skills', skills, 'skills', 'advancement-planner-skills')}
        {requirementRow('Talent', talent, 'talent', 'advancement-planner-talent')}
      </ul>

      {/* Grand total — a calculated total, so it carries a breakdown tooltip. */}
      <div className={styles.grandRow}>
        <span className={styles.label}>Total to reach next level</span>
        <TooltipTriggerCell
          tooltipId="advancement-planner-grand"
          className={styles.grandTotal}
          ariaLabel={`Grand total ${grandTotal} XP. Characteristics ${characteristics.subtotal} + Skills ${skills.subtotal} + Talent ${talent.subtotal} + Advance-level ${advanceLevelCost} = ${grandTotal}. Show breakdown.`}
          displayValue={`${grandTotal} XP`}
          isTooltipOpen={openTooltip?.kind === 'grand'}
          onOpen={open('grand')}
          onClose={close}
        />
      </div>

      {/* Affordability summary (FR-2). */}
      <div className={canAfford ? styles.affordYes : styles.affordNo} role="status">
        {canAfford
          ? `You can afford it (have ${xpCur} XP, need ${grandTotal} XP).`
          : `Need ${shortfall} more XP (have ${xpCur}, need ${grandTotal}).`}
      </div>

      {/* Cheapest ordered path (FR-3). Per-step costs are raw lookups — no tooltip. */}
      {plan.orderedPath.length > 0 && (
        <div className={styles.pathSection}>
          <div className={styles.pathHeading}>Cheapest path (buy in this order)</div>
          <ol className={styles.pathList}>
            {plan.orderedPath.map((s, i) => (
              <li key={`${s.kind}-${s.name}-${s.fromAdvances}-${i}`} className={s.inCareer ? styles.pathStepInCareer : styles.pathStepOutCareer}>
                <span className={styles.pathStepLabel}>{describeStep(s)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Optional XP-budget projection (FR-4). */}
      <div className={styles.budgetSection}>
        <label className={styles.budgetLabel} htmlFor="advancement-planner-budget">
          If I save up this much XP…
        </label>
        <input
          id="advancement-planner-budget"
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="XP budget"
          aria-label="XP budget to project"
          value={budgetInput}
          onChange={(e) => setBudgetInput(e.target.value)}
          className={styles.budgetInput}
        />

        {budgetActive && (
          <div className={styles.budgetResult} role="status">
            <div className={styles.budgetLine}>
              <span>Covers {projection.affordableSteps.length} of {plan.orderedPath.length} advances, spending</span>
              {/* `spent` is a calculated running total — it carries a breakdown tooltip. */}
              <TooltipTriggerCell
                tooltipId="advancement-planner-spent"
                className={styles.total}
                ariaLabel={`Spent ${projection.spent} XP of a ${projection.budget} budget. ${additiveFormula(projection.affordableSteps, projection.spent)}. Show breakdown.`}
                displayValue={`${projection.spent} XP`}
                isTooltipOpen={openTooltip?.kind === 'spent'}
                onOpen={open('spent')}
                onClose={close}
              />
            </div>
            {projection.firstUnaffordable ? (
              <div className={styles.budgetNext}>
                Next out of reach: {describeStep(projection.firstUnaffordable)}
              </div>
            ) : (
              <div className={styles.budgetNext}>Budget covers the whole path.</div>
            )}
          </div>
        )}
      </div>

      {openTooltip?.kind === 'chars' && (
        <Tooltip id="advancement-planner-chars" anchorEl={openTooltip.anchorEl} title="Characteristics cost" onClose={close}>
          {requirementTooltipBody(characteristics)}
        </Tooltip>
      )}
      {openTooltip?.kind === 'skills' && (
        <Tooltip id="advancement-planner-skills" anchorEl={openTooltip.anchorEl} title="Skills cost" onClose={close}>
          {requirementTooltipBody(skills)}
        </Tooltip>
      )}
      {openTooltip?.kind === 'talent' && (
        <Tooltip id="advancement-planner-talent" anchorEl={openTooltip.anchorEl} title="Talent cost" onClose={close}>
          {requirementTooltipBody(talent)}
        </Tooltip>
      )}
      {openTooltip?.kind === 'grand' && (
        <Tooltip id="advancement-planner-grand" anchorEl={openTooltip.anchorEl} title="Total to reach next level" onClose={close}>
          <div className={styles.tooltipBody}>
            <div className={styles.tooltipFormula}>
              Characteristics {characteristics.subtotal} + Skills {skills.subtotal} + Talent {talent.subtotal} + Advance-level {advanceLevelCost} = {grandTotal} XP
            </div>
            <div className={styles.tooltipNote}>
              Advance-level fee is {advanceLevelCost} XP ({feeBasis}): 100 XP when the level is complete, 200 XP if not (Core p.48).
            </div>
          </div>
        </Tooltip>
      )}
      {openTooltip?.kind === 'spent' && (
        <Tooltip id="advancement-planner-spent" anchorEl={openTooltip.anchorEl} title="Budget spent" onClose={close}>
          <div className={styles.tooltipBody}>
            {projection.affordableSteps.length === 0 ? (
              <div className={styles.tooltipNote}>The budget covers no advances yet.</div>
            ) : (
              <>
                <ul className={styles.tooltipList}>
                  {projection.affordableSteps.map((s, i) => (
                    <li key={`${s.kind}-${s.name}-${s.fromAdvances}-${i}`}>{describeStep(s)}</li>
                  ))}
                </ul>
                <div className={styles.tooltipFormula}>{additiveFormula(projection.affordableSteps, projection.spent)} XP</div>
              </>
            )}
          </div>
        </Tooltip>
      )}
      </>)}
    </Card>
  );
}
