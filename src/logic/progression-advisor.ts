import type { Character, CareerLevel, Skill } from '../types/character';
import { getCareerScheme, getCareerLevelOptions } from './careers';
import { getEligibleCareers, isCareerEligible } from './career-eligibility';
import {
  getCareerSwitchCost,
  CAREER_CHANGE_DIFFERENT_CLASS_SURCHARGE,
  ADVANCE_LEVEL_FEE,
  CAREER_COMPLETION_THRESHOLDS,
  isReadyToAdvance,
} from './advancement';
import {
  planNextCareerLevel,
  planLevelRequirements,
  type PlannerStep,
} from './advancement-planner';

/**
 * READ-ONLY progression advisor (WFRP4e Core pp.44-48).
 *
 * This pure, React-free, deterministic module answers "I want to reach THIS
 * goal — what is the ordered, costed path to get there, can I afford it, and
 * roughly how many sessions will it take?" It composes the EXISTING cost
 * functions (`planNextCareerLevel` / `planLevelRequirements`, `getAdvancementCost`
 * via those, `ADVANCE_LEVEL_FEE`, `CAREER_COMPLETION_THRESHOLDS`,
 * `getCareerSwitchCost`) and returns new plain, JSON-serializable objects. It
 * NEVER mutates the character, spends XP, advances, or switches a career — all
 * real spending stays on the existing advance/switch controls (design §Overview,
 * FR-5/FR-6). It invents no mechanics and hardcodes no costs (rules-compliance
 * steering): the only numeric cost literals it references are the shared
 * constants (`ADVANCE_LEVEL_FEE`, `CAREER_CHANGE_DIFFERENT_CLASS_SURCHARGE`,
 * `CAREER_COMPLETION_THRESHOLDS`).
 *
 * The function boundary (`ProgressionAdvisorSource`) mirrors the
 * character-assistant's `SuggestionSource` future-proofing so a later async /
 * LLM-backed advisor is a non-breaking addition; the deterministic engine
 * remains the permanent offline default.
 */

// ─── Goal model (design §The goal model, OQ-8) ───────────────────────────────

export type ProgressionGoal =
  | { kind: 'none' }                                          // no goal chosen → neutral prompt
  | { kind: 'nextLevel' }                                     // next level of current career
  | { kind: 'careerLevel'; career: string; level: number }   // a specific level of a chosen/current career
  | { kind: 'career'; career: string };                      // first level of a different eligible career

/** Optional projection inputs, both serializable (design §The goal model). */
export interface ProgressionOptions {
  /** free-form saved-XP projection (FR-1.3); reuses projectBudget semantics. */
  budget?: number;
  /** timeline rate (OQ-6); default applied in the UI, passed explicitly here. */
  xpPerSession?: number;
}

// ─── Output types (design §The pure engine) ──────────────────────────────────

/** A named, cited fee step (switch fee / advance-level fee). Distinct from the
 *  per-advance PlannerStep so the UI can render its cited breakdown (FR-9.2). */
export interface FeeStep {
  kind: 'switchFee' | 'advanceLevelFee';
  label: string;
  cost: number;
  /** cited additive components for the tooltip breakdown. */
  components: { label: string; value: number; cite: string }[];
}

/** One ordered phase of the recommended path. */
export interface ProgressionPhase {
  id: 'complete-current' | 'switch' | 'build-target' | 'advance-level';
  title: string;
  steps: PlannerStep[];
  fee?: FeeStep;
  /** Σ steps[].cost + (fee?.cost ?? 0) */
  subtotal: number;
  advisories: string[];
}

export interface ProgressionBudget {
  budget: number;
  affordableCount: number;       // prefix of orderedPath covered
  spent: number;                 // Σ covered costs (calculated total → tooltip)
  firstUnaffordableLabel: string | null;
}

export interface ProgressionPlan {
  goal: ProgressionGoal;
  /** eligible / a path was produced (species eligibility; OQ-2). */
  reachable: boolean;
  /** the returned path actually REACHES the stated goal. False for an
   *  unreachable goal AND for the in-scope-but-partial foreign-career level>1
   *  case (switch planned to L1 only; Finding 2 / OQ-1). True otherwise. */
  goalFullyPlanned: boolean;
  /** present when !reachable, or as an informational note (e.g. multi-hop limit). */
  reason?: string;
  phases: ProgressionPhase[];
  /** Σ phase subtotals; the single grand total to reach the goal. */
  grandTotal: number;
  /** the full phase-ordered per-step + fee list for display. */
  orderedPath: (PlannerStep | FeeStep)[];
  xpCur: number;
  canAfford: boolean;            // xpCur >= grandTotal
  shortfall: number;             // max(0, grandTotal - xpCur)
  /** timeline (OQ-6); null when rate <= 0 or shortfall === 0. */
  sessionsToGoal: number | null;
  xpPerSession: number;          // echoed input (0 when unset)
  /** budget projection over orderedPath costs, when budget > 0. */
  budget: ProgressionBudget | null;
  /** top-level advisories (eligibility notes, multi-hop limit, etc.). */
  advisories: string[];
}

/** An eligible target career presented as an option-with-rationale (FR-3.2). */
export interface CareerOption {
  career: string;
  sameClass: boolean;
  switchFeeIfReady: number;    // getCareerSwitchCost(true, ...)
  rationale: string;           // cited, factual
}

// ─── Internal helpers ────────────────────────────────────────────────────────

const isFeeStep = (item: PlannerStep | FeeStep): item is FeeStep =>
  (item as FeeStep).components !== undefined;

const stepCost = (item: PlannerStep | FeeStep): number => item.cost;

/** Resolve the present levels of a career (level1..level5 filtered). */
function presentLevels(careerName: string): CareerLevel[] {
  const scheme = getCareerScheme(careerName);
  if (!scheme) return [];
  return [scheme.level1, scheme.level2, scheme.level3, scheme.level4, scheme.level5]
    .filter(Boolean) as CareerLevel[];
}

/** The character's current 1-based level number for their current career. */
function currentLevelNum(character: Character): number {
  const levels = presentLevels(character.career);
  return levels.findIndex(l => l.title === character.careerLevel) + 1;
}

/** Build the advance-level `FeeStep` (Core p.48). `ready` → 100 XP, else 200. */
function advanceLevelFeeStep(ready: boolean): FeeStep {
  const cost = ready ? ADVANCE_LEVEL_FEE.ready : ADVANCE_LEVEL_FEE.notReady;
  return {
    kind: 'advanceLevelFee',
    label: `Advance career level (${ready ? 'ready' : 'not ready'})`,
    cost,
    components: [
      { label: `Advance-level fee (${ready ? 'ready' : 'not ready'})`, value: cost, cite: 'Core p.48' },
    ],
  };
}

/** Build the switch `FeeStep` from the shared helper (Core p.48). Cost is always
 *  equal to `getCareerSwitchCost(ready, currentClass, targetClass)` (AC5). */
function switchFeeStep(ready: boolean, currentClass: string, targetClass: string): FeeStep {
  const base = ready ? ADVANCE_LEVEL_FEE.ready : ADVANCE_LEVEL_FEE.notReady;
  const sameClass = targetClass === currentClass;
  const cost = getCareerSwitchCost(ready, currentClass, targetClass);
  const components = [
    { label: `Advance-level fee (${ready ? 'ready' : 'not ready'})`, value: base, cite: 'Core p.48' },
  ];
  if (!sameClass) {
    components.push({
      label: 'Different-class surcharge',
      value: CAREER_CHANGE_DIFFERENT_CLASS_SURCHARGE,
      cite: 'Core p.48',
    });
  }
  return {
    kind: 'switchFee',
    label: sameClass ? 'Change career (same class)' : 'Change career (different class)',
    cost,
    components,
  };
}

/** Requirement steps of a level in planner cheapest-first order (design §How
 *  opinionated). Reuses the planner's stable tie-break so the order matches the
 *  real planner panel. */
function orderRequirementSteps(steps: PlannerStep[]): PlannerStep[] {
  return [...steps].sort((a, b) => {
    if (a.cost !== b.cost) return a.cost - b.cost;
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    return a.fromAdvances - b.fromAdvances;
  });
}

/** A `complete-current` / `build-target` requirement phase from three plans. */
function requirementPhase(
  id: 'complete-current' | 'build-target',
  title: string,
  reqs: { characteristics: { steps: PlannerStep[]; advisories: string[] }; skills: { steps: PlannerStep[]; advisories: string[] }; talent: { steps: PlannerStep[]; advisories: string[] } },
): ProgressionPhase {
  const steps = orderRequirementSteps([
    ...reqs.characteristics.steps,
    ...reqs.skills.steps,
    ...reqs.talent.steps,
  ]);
  const advisories = [
    ...reqs.characteristics.advisories,
    ...reqs.skills.advisories,
    ...reqs.talent.advisories,
  ];
  const subtotal = steps.reduce((s, st) => s + st.cost, 0);
  return { id, title, steps, subtotal, advisories };
}

/** A fee-only phase (switch / advance-level). */
function feePhase(
  id: 'switch' | 'advance-level',
  title: string,
  fee: FeeStep,
): ProgressionPhase {
  return { id, title, steps: [], fee, subtotal: fee.cost, advisories: [] };
}

/**
 * Apply the selected advances of a level's requirement plans to an in-memory
 * clone of `character`, returning a NEW projected character (design §Algorithm,
 * Finding 1). Pure — the input is never mutated and the clone is never
 * persisted (reinforcing read-only). Used only to price a subsequent level of
 * the same career in a multi-level climb.
 */
function projectCharacter(
  character: Character,
  reqs: { characteristics: { steps: PlannerStep[] }; skills: { steps: PlannerStep[] }; talent: { steps: PlannerStep[] } },
  threshold: number,
): Character {
  const next = structuredClone(character);

  // Characteristic steps: carry each characteristic's .a to the step's toAdvances
  // (the final step for each carries it to `threshold`).
  for (const step of reqs.characteristics.steps) {
    const key = step.name as keyof typeof next.chars;
    if (next.chars[key]) {
      next.chars[key] = { ...next.chars[key], a: Math.max(next.chars[key].a, step.toAdvances) };
    }
  }

  // Skill steps: named rows → set .a to toAdvances; synthesised rows
  // (skillIndex === null) → add a new advanced-skill row at `threshold`, exactly
  // as ensureCareerSkillsExist + advanceSkill would commit.
  for (const step of reqs.skills.steps) {
    if (step.skillIndex === null || step.skillIndex === undefined) {
      const exists = [...next.bSkills, ...next.aSkills].some(s => s.n === step.name);
      if (!exists) {
        const newRow: Skill = { n: step.name, c: 'Int', a: threshold };
        next.aSkills = [...next.aSkills, newRow];
      }
    } else if (step.isBasic) {
      const rows = [...next.bSkills];
      if (rows[step.skillIndex]) {
        rows[step.skillIndex] = { ...rows[step.skillIndex], a: Math.max(rows[step.skillIndex].a, step.toAdvances) };
        next.bSkills = rows;
      }
    } else {
      const rows = [...next.aSkills];
      if (rows[step.skillIndex]) {
        rows[step.skillIndex] = { ...rows[step.skillIndex], a: Math.max(rows[step.skillIndex].a, step.toAdvances) };
        next.aSkills = rows;
      }
    }
  }

  // Talent steps: add the chosen talent as owned so the next level's talent
  // predicate sees it.
  for (const step of reqs.talent.steps) {
    const owned = next.talents.some(t => t.n === step.name);
    if (!owned) {
      next.talents = [...next.talents, { n: step.name, lvl: 1, desc: '' }];
    }
  }

  return next;
}

/** Assemble a full `ProgressionPlan` from ordered phases + context. */
function assemblePlan(
  goal: ProgressionGoal,
  character: Character,
  phases: ProgressionPhase[],
  options: ProgressionOptions | undefined,
  extra: { reachable: boolean; goalFullyPlanned: boolean; reason?: string; advisories: string[] },
): ProgressionPlan {
  const xpCur = character.xpCur;
  const grandTotal = phases.reduce((s, p) => s + p.subtotal, 0);

  // Ordered path concatenates phases in their emitted order; per-advance steps
  // within a phase keep the planner's cheapest-first order, then the phase fee.
  const orderedPath: (PlannerStep | FeeStep)[] = [];
  for (const phase of phases) {
    orderedPath.push(...phase.steps);
    if (phase.fee) orderedPath.push(phase.fee);
  }

  const canAfford = xpCur >= grandTotal;
  const shortfall = Math.max(0, grandTotal - xpCur);

  // Timeline (OQ-6): pure function of (shortfall, rate). null when rate<=0 or
  // nothing is owed. Not a rulebook value — a UI-supplied rate.
  const rawRate = options?.xpPerSession;
  const xpPerSession = Number.isFinite(rawRate) && (rawRate as number) > 0 ? (rawRate as number) : 0;
  const sessionsToGoal = xpPerSession > 0 && shortfall > 0 ? Math.ceil(shortfall / xpPerSession) : null;

  const budget = projectProgressionBudget(orderedPath, options?.budget);

  return {
    goal,
    reachable: extra.reachable,
    goalFullyPlanned: extra.goalFullyPlanned,
    reason: extra.reason,
    phases,
    grandTotal,
    orderedPath,
    xpCur,
    canAfford,
    shortfall,
    sessionsToGoal,
    xpPerSession,
    budget,
    advisories: extra.advisories,
  };
}

/** An unreachable plan (ineligible/unknown target): no cost path (AC8). */
function unreachablePlan(
  goal: ProgressionGoal,
  character: Character,
  reason: string,
  options: ProgressionOptions | undefined,
): ProgressionPlan {
  return assemblePlan(goal, character, [], options, {
    reachable: false,
    goalFullyPlanned: false,
    reason,
    advisories: [],
  });
}

/** The neutral `none` plan: no goal chosen (AC1). */
function nonePlan(character: Character, options: ProgressionOptions | undefined): ProgressionPlan {
  return assemblePlan({ kind: 'none' }, character, [], options, {
    reachable: true,
    goalFullyPlanned: true,
    advisories: ['Pick a goal to see a recommended path.'],
  });
}

// ─── Per-goal planners ───────────────────────────────────────────────────────

/** Map `planNextCareerLevel` into the advisor's phase shape (design §Algorithm:
 *  nextLevel). Reuses the planner unchanged so costs match exactly (AC3). */
function planNextLevelGoal(
  goal: ProgressionGoal,
  character: Character,
  options: ProgressionOptions | undefined,
): ProgressionPlan {
  const plan = planNextCareerLevel(character);
  if (!plan.applicable) {
    const career = character.career;
    const reason = career
      ? `${career} — ${character.careerLevel} has no further level to plan toward.`
      : 'Select a career to plan your next level.';
    return unreachablePlan(goal, character, reason, options);
  }

  const complete = requirementPhase('complete-current', 'Complete your current level', {
    characteristics: plan.characteristics,
    skills: plan.skills,
    talent: plan.talent,
  });
  const ready = plan.characteristics.met && plan.skills.met && plan.talent.met;
  const advance = feePhase('advance-level', 'Advance to the next level', advanceLevelFeeStep(ready));

  return assemblePlan(goal, character, [complete, advance], options, {
    reachable: true,
    goalFullyPlanned: true,
    advisories: [],
  });
}

/** Plan a single switch to the first level of a different eligible career
 *  (design §Algorithm: career). Three phases: complete-current (requirement
 *  steps only, no advance-level fee — OQ-4), switch (FeeStep), build-target. */
function planSwitchGoal(
  goal: ProgressionGoal,
  character: Character,
  targetCareer: string,
  options: ProgressionOptions | undefined,
): ProgressionPlan {
  const targetScheme = getCareerScheme(targetCareer);
  if (!targetScheme) {
    return unreachablePlan(goal, character, `${targetCareer} is not a known career.`, options);
  }
  if (!isCareerEligible(targetCareer, character.species)) {
    return unreachablePlan(
      goal,
      character,
      `${targetCareer} is not available to ${character.species || 'this species'}.`,
      options,
    );
  }

  const phases: ProgressionPhase[] = [];

  // 1. Complete current — requirement steps only (OQ-4). If the current career
  //    level is inapplicable (max level / unknown), there is simply nothing to
  //    complete first, so this phase is omitted.
  const curPlan = planNextCareerLevel(character);
  if (curPlan.applicable) {
    const complete = requirementPhase('complete-current', 'Complete your current level', {
      characteristics: curPlan.characteristics,
      skills: curPlan.skills,
      talent: curPlan.talent,
    });
    phases.push(complete);
  }

  // 2. Switch fee (Core p.48) via the shared helper.
  const ready = isReadyToAdvance(character);
  phases.push(feePhase('switch', `Change career to ${targetCareer}`, switchFeeStep(ready, character.class, targetScheme.class)));

  // 3. Build the target career's level 1 requirements (in-career for the target
  //    by definition; OQ-5). Priced from the character's CURRENT advances
  //    (carryover) via planLevelRequirements.
  const l1 = planLevelRequirements(character, targetCareer, 1);
  const build = requirementPhase('build-target', `Build ${targetCareer} (level 1)`, {
    characteristics: l1.characteristics,
    skills: l1.skills,
    talent: l1.talent,
  });
  phases.push(build);

  return assemblePlan(goal, character, phases, options, {
    reachable: true,
    goalFullyPlanned: true,
    advisories: [],
  });
}

/** Plan a same-career multi-level climb from current+1 up to `targetLevel`
 *  (design §Algorithm: careerLevel). Chains build→fee per intervening level,
 *  pricing each subsequent level against an explicitly-projected clone. */
function planSameCareerClimb(
  goal: ProgressionGoal,
  character: Character,
  targetLevel: number,
  options: ProgressionOptions | undefined,
): ProgressionPlan {
  const levels = presentLevels(character.career);
  const maxLevel = levels.length;
  const curLevel = currentLevelNum(character);

  if (curLevel <= 0 || maxLevel === 0) {
    return unreachablePlan(
      goal,
      character,
      character.career
        ? `${character.career} — ${character.careerLevel} cannot be resolved.`
        : 'Select a career to plan your next level.',
      options,
    );
  }

  // Clamp the target to [curLevel+1, maxLevel]. A target at/below the current
  // level has nothing to plan (already there).
  const clampedTarget = Math.min(Math.max(targetLevel, 1), maxLevel);
  if (clampedTarget <= curLevel) {
    return assemblePlan(goal, character, [], options, {
      reachable: true,
      goalFullyPlanned: true,
      advisories: [`You are already at ${character.career} level ${curLevel}.`],
    });
  }

  // First transition (curLevel → curLevel+1) is exactly planNextCareerLevel.
  const firstPlan = planNextCareerLevel(character);
  const phases: ProgressionPhase[] = [];

  const firstReqThreshold = CAREER_COMPLETION_THRESHOLDS[curLevel] ?? 5;
  phases.push(requirementPhase('complete-current', `Complete level ${curLevel}`, {
    characteristics: firstPlan.characteristics,
    skills: firstPlan.skills,
    talent: firstPlan.talent,
  }));
  const firstReady = firstPlan.characteristics.met && firstPlan.skills.met && firstPlan.talent.met;
  phases.push(feePhase('advance-level', `Advance to level ${curLevel + 1}`, advanceLevelFeeStep(firstReady)));

  // Subsequent transitions: price each level against a projected clone that
  // carries the prior level's selected advances (Finding 1).
  let projected = projectCharacter(
    character,
    { characteristics: firstPlan.characteristics, skills: firstPlan.skills, talent: firstPlan.talent },
    firstReqThreshold,
  );

  for (let level = curLevel + 1; level < clampedTarget; level++) {
    const reqs = planLevelRequirements(projected, character.career, level);
    const reqThreshold = CAREER_COMPLETION_THRESHOLDS[level] ?? 5;
    phases.push(requirementPhase('build-target', `Build level ${level}`, {
      characteristics: reqs.characteristics,
      skills: reqs.skills,
      talent: reqs.talent,
    }));
    // The just-projected prior level is complete, so the fee is the ready rate.
    phases.push(feePhase('advance-level', `Advance to level ${level + 1}`, advanceLevelFeeStep(true)));
    projected = projectCharacter(projected, reqs, reqThreshold);
  }

  return assemblePlan(goal, character, phases, options, {
    reachable: true,
    goalFullyPlanned: true,
    advisories: [],
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Pure, deterministic, side-effect-free. Returns new plain objects; mutates
 * nothing. Never throws — returns a well-formed `ProgressionPlan` for every
 * input (design §Error handling).
 */
export function planProgression(
  character: Character,
  goal: ProgressionGoal,
  options?: ProgressionOptions,
): ProgressionPlan {
  switch (goal.kind) {
    case 'none':
      return nonePlan(character, options);

    case 'nextLevel':
      return planNextLevelGoal(goal, character, options);

    case 'career':
      return planSwitchGoal(goal, character, goal.career, options);

    case 'careerLevel': {
      const isCurrentCareer = goal.career === character.career;

      if (isCurrentCareer) {
        // Same career: next level is equivalent to planNextCareerLevel; a higher
        // level is a multi-level climb.
        const curLevel = currentLevelNum(character);
        if (goal.level <= curLevel + 1) {
          // Next level (or already-there handled inside the climb planner).
          if (goal.level <= curLevel) {
            return planSameCareerClimb(goal, character, goal.level, options);
          }
          return planNextLevelGoal(goal, character, options);
        }
        return planSameCareerClimb(goal, character, goal.level, options);
      }

      // Foreign career. Resolve eligibility first (OQ-2 / AC8).
      const targetScheme = getCareerScheme(goal.career);
      if (!targetScheme) {
        return unreachablePlan(goal, character, `${goal.career} is not a known career.`, options);
      }
      if (!isCareerEligible(goal.career, character.species)) {
        return unreachablePlan(
          goal,
          character,
          `${goal.career} is not available to ${character.species || 'this species'}.`,
          options,
        );
      }

      // Level 1 of a foreign career is a single switch (fully planned).
      if (goal.level <= 1) {
        return planSwitchGoal(goal, character, goal.career, options);
      }

      // Foreign career at level > 1: switch + climb inside a not-yet-entered
      // career is MULTI-HOP (beyond v1 scope; OQ-1 / Finding 2). Plan only the
      // switch-to-L1 portion, report reachable:true + goalFullyPlanned:false
      // with an advisory. grandTotal equals the single-switch plan for the same
      // target.
      const partial = planSwitchGoal({ kind: 'career', career: goal.career }, character, goal.career, options);
      return {
        ...partial,
        goal,
        goalFullyPlanned: false,
        advisories: [
          `v1 plans the switch to ${goal.career} level 1 only; climbing further inside a not-yet-entered career isn't supported yet.`,
        ],
      };
    }

    default:
      return nonePlan(character, options);
  }
}

/**
 * Project how far a flat XP `budget` reaches along the plan's ordered
 * `(PlannerStep | FeeStep)` list (design §Algorithm). Pure; returns a new object
 * or null. Budget is floored to a non-negative integer exactly like
 * `projectBudget`. Returns null for a non-finite / ≤0 budget (the UI hides it).
 */
export function projectProgressionBudget(
  orderedPath: (PlannerStep | FeeStep)[],
  budget: number | undefined,
): ProgressionBudget | null {
  if (budget === undefined || !Number.isFinite(budget) || budget <= 0) return null;
  const b = Math.floor(Math.max(0, budget));

  let spent = 0;
  let affordableCount = 0;
  let firstUnaffordableLabel: string | null = null;

  for (const item of orderedPath) {
    const cost = stepCost(item);
    if (firstUnaffordableLabel === null && spent + cost <= b) {
      spent += cost;
      affordableCount++;
    } else if (firstUnaffordableLabel === null) {
      firstUnaffordableLabel = isFeeStep(item) ? item.label : item.name;
    }
  }

  return { budget: b, affordableCount, spent, firstUnaffordableLabel };
}

/**
 * Future-proofing boundary (mirrors character-assistant's SuggestionSource).
 * The return type is sync-or-async so an LLM-backed source is a non-breaking
 * add; the deterministic default is ALWAYS synchronous and the permanent
 * offline fallback.
 */
export interface ProgressionAdvisorSource {
  plan(
    character: Character,
    goal: ProgressionGoal,
    options?: ProgressionOptions,
  ): ProgressionPlan | Promise<ProgressionPlan>;
}

export const deterministicProgressionSource: ProgressionAdvisorSource = {
  plan: (c, g, o) => planProgression(c, g, o),
};

/**
 * Eligible target careers as options-with-rationale (FR-3.2). Pure. NEVER ranks
 * a "best" and never auto-selects — the UI renders this only when the player has
 * not committed to a goal (design §How opinionated, Finding 4). Membership is
 * `getEligibleCareers(species)` minus the current career.
 */
export function describeCareerOptions(character: Character): CareerOption[] {
  return getEligibleCareers(character.species)
    .filter(c => c !== character.career)
    .map(career => {
      const scheme = getCareerScheme(career);
      const sameClass = scheme?.class === character.class;
      // Show the ready-rate switch fee (getCareerSwitchCost with ready=true) so
      // the UI can present a concrete number; the actual fee at switch time
      // depends on whether the current level is complete (Core p.48).
      const switchFeeIfReady = getCareerSwitchCost(true, character.class, scheme?.class ?? '');
      const rationale = sameClass
        ? 'Shares your class → no different-class surcharge (Core p.48).'
        : `Different class → +${CAREER_CHANGE_DIFFERENT_CLASS_SURCHARGE} XP surcharge (Core p.48).`;
      return { career, sameClass, switchFeeIfReady, rationale };
    });
}

/** Re-export so the UI can list target levels without reimporting careers.ts. */
export { getCareerLevelOptions };
