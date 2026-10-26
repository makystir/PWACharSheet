import type { Character, CareerLevel } from '../types/character';
import { getCareerScheme } from './careers';
import {
  getAdvancementCost,
  careerSkillMatches,
  getCurrentLevelTalents,
  CAREER_COMPLETION_THRESHOLDS,
  ADVANCE_LEVEL_FEE,
} from './advancement';

/**
 * READ-ONLY advancement planner (WFRP4e Core pp.44-48).
 *
 * This module is a PURE projection: it reads a `Character` and returns new plain
 * objects describing the cheapest set of advances that would complete the
 * character's current career level and reach the next one. It NEVER mutates the
 * character, spends XP, or advances anything — real spending stays exclusively
 * on the existing advance buttons/flows (design §9, FR-6).
 *
 * All cost numbers come from `getAdvancementCost` (Core pp.44-45 tables, with
 * out-of-career doubling), all completion thresholds from
 * `CAREER_COMPLETION_THRESHOLDS` (Core p.48), and the level-change fee from
 * `ADVANCE_LEVEL_FEE` (Core p.48). The planner invents no mechanics
 * (rules-compliance steering).
 */

export interface PlannerStep {
  kind: 'characteristic' | 'skill' | 'talent';
  /** char key, skill name, or talent name */
  name: string;
  /** talents: times-taken before this step */
  fromAdvances: number;
  toAdvances: number;
  inCareer: boolean;
  /** single-advance cost from getAdvancementCost — never a sum */
  cost: number;
  // Skill steps identify the concrete character row the real advanceSkill(skillIndex,…)
  // flow would commit, so the plan maps 1:1 onto a single physical row (design §6,
  // Findings 1 & 2). A synthesised cost-from-0 row (concrete career skill with no
  // matching row) has skillIndex === null until ensureCareerSkillsExist would create
  // it on commit.
  isBasic?: boolean;
  skillIndex?: number | null;
}

export interface RequirementPlan {
  kind: 'characteristics' | 'skills' | 'talent';
  /** the chosen cheapest steps for this requirement */
  steps: PlannerStep[];
  /** Σ steps[].cost */
  subtotal: number;
  /** requirement already satisfied (per the checklist predicate) */
  met: boolean;
  /** e.g. wildcard skills needing a manual specialisation choice */
  advisories: string[];
}

export interface NextLevelPlan {
  /** false when max-level / no career */
  applicable: boolean;
  threshold: number;
  characteristics: RequirementPlan;
  skills: RequirementPlan;
  talent: RequirementPlan;
  /** chars + skills + talent subtotals */
  requirementsTotal: number;
  /** ADVANCE_LEVEL_FEE.ready (100) when all three met, else notReady (200) */
  advanceLevelCost: number;
  /** requirementsTotal + advanceLevelCost */
  grandTotal: number;
  xpCur: number;
  /** xpCur >= grandTotal */
  canAfford: boolean;
  /** max(0, grandTotal - xpCur) */
  shortfall: number;
  /** FR-3 cheapest-first ordered path */
  orderedPath: PlannerStep[];
}

export interface BudgetProjection {
  budget: number;
  /** prefix of orderedPath the budget covers */
  affordableSteps: PlannerStep[];
  spent: number;
  firstUnaffordable: PlannerStep | null;
}

/** An empty requirement plan (already met, no steps). */
function emptyRequirement(kind: RequirementPlan['kind']): RequirementPlan {
  return { kind, steps: [], subtotal: 0, met: true, advisories: [] };
}

/** The `applicable: false` plan for no-career / unknown-career / max-level. */
function inapplicablePlan(xpCur: number): NextLevelPlan {
  return {
    applicable: false,
    threshold: 0,
    characteristics: emptyRequirement('characteristics'),
    skills: emptyRequirement('skills'),
    talent: emptyRequirement('talent'),
    requirementsTotal: 0,
    advanceLevelCost: 0,
    grandTotal: 0,
    xpCur,
    canAfford: true,
    shortfall: 0,
    orderedPath: [],
  };
}

/** A candidate physical skill row the planner may raise to threshold. */
interface SkillCandidate {
  name: string;
  isBasic: boolean;
  /** null for a synthesised (not-yet-created) concrete career skill */
  skillIndex: number | null;
  /** current advances (.a) */
  fromAdvances: number;
  /** currently-unmet career-skill patterns this row would satisfy at threshold */
  satisfiesPatterns: string[];
  /** cost to raise this row from fromAdvances to threshold */
  rowCost: number;
  /** one PlannerStep per advance in [fromAdvances … threshold-1] */
  steps: PlannerStep[];
}

/**
 * Price raising `character` to satisfy career `careerName`'s level `levelNum`
 * requirements (in-career for that level), returning the three per-requirement
 * `RequirementPlan`s (Core pp.44-48). Pure — returns new plain objects, mutates
 * nothing.
 *
 * Resolves the `CareerLevel` via `getCareerScheme` and the completion threshold
 * via `CAREER_COMPLETION_THRESHOLDS` INTERNALLY: the caller passes only the
 * career name and level number, so the level and its threshold can never drift
 * apart (design §Code-reuse boundary, Finding 3). Fails closed — returns
 * empty/met `RequirementPlan`s — when the scheme or level is missing, mirroring
 * `planNextCareerLevel`'s inapplicable path.
 *
 * Used for the CURRENT career level (by `planNextCareerLevel`) and for a TARGET
 * career level (by the progression advisor). Invents no cost.
 */
export function planLevelRequirements(
  character: Character,
  careerName: string,
  levelNum: number,
): { characteristics: RequirementPlan; skills: RequirementPlan; talent: RequirementPlan } {
  const scheme = getCareerScheme(careerName);
  const emptyAll = () => ({
    characteristics: emptyRequirement('characteristics'),
    skills: emptyRequirement('skills'),
    talent: emptyRequirement('talent'),
  });
  if (!scheme) return emptyAll();

  const allLevels = [
    scheme.level1, scheme.level2, scheme.level3, scheme.level4, scheme.level5,
  ].filter(Boolean) as CareerLevel[];
  const careerLevel = allLevels[levelNum - 1];
  if (!careerLevel || levelNum < 1) return emptyAll();

  // Core p.48 completion threshold for this level; `?? 5` fallback mirrors the
  // page for an unexpected level number (design §7.1, OQ-5).
  const threshold = CAREER_COMPLETION_THRESHOLDS[levelNum] ?? 5;

  const careerChars = careerLevel.characteristics;
  const careerSkills = careerLevel.skills;

  // ── Characteristics (deterministic, no choice) ───────────────────────────
  // Core p.48: each career characteristic must reach `threshold` advances.
  // Core pp.44-45: price each successive advance via getAdvancementCost. Tiered
  // pricing is monotonic non-decreasing, so stepping to threshold is the only
  // (and cheapest) way there.
  const charSteps: PlannerStep[] = [];
  for (const k of careerChars) {
    const inCareer = careerChars.includes(k); // always true here; by-definition in-career
    const a0 = character.chars[k].a;
    for (let a = a0; a < threshold; a++) {
      charSteps.push({
        kind: 'characteristic',
        name: k,
        fromAdvances: a,
        toAdvances: a + 1,
        inCareer,
        cost: getAdvancementCost('characteristic', a, inCareer),
      });
    }
  }
  const charsSubtotal = charSteps.reduce((s, st) => s + st.cost, 0);
  const characteristics: RequirementPlan = {
    kind: 'characteristics',
    steps: charSteps,
    subtotal: charsSubtotal,
    met: charsSubtotal === 0,
    advisories: [],
  };

  // ── Skills (row-based minimisation, Core p.48 "eight of your skills") ─────
  const allSkills = [
    ...character.bSkills.map((s, i) => ({ skill: s, isBasic: true, index: i })),
    ...character.aSkills.map((s, i) => ({ skill: s, isBasic: false, index: i })),
  ];
  const need = Math.min(8, careerSkills.length);

  // Checklist parity (design §6/§9, Finding 5): skills.met is EXACTLY the page
  // predicate on the current character, independent of auto-selectability.
  const metPatterns = careerSkills.filter(sn =>
    allSkills.some(({ skill }) => careerSkillMatches(sn, skill.n) && skill.a >= threshold),
  );
  const skillsMet = metPatterns.length >= need;

  const skillAdvisories: string[] = [];
  const unmetPatterns = careerSkills.filter(sn => !metPatterns.includes(sn));

  // Build DISTINCT candidate rows keyed by physical identity. A single row may
  // satisfy several patterns; it appears at most once and records every unmet
  // pattern it covers (design §6 step 2, Finding 1).
  const candidatesByKey = new Map<string, SkillCandidate>();
  const isWildcard = (sn: string) => sn.includes('(Any)') || sn.includes('(Any ');

  for (const sn of unmetPatterns) {
    const matches = allSkills.filter(({ skill }) => careerSkillMatches(sn, skill.n));

    if (matches.length > 0) {
      // Target the single highest-.a row (closest to threshold, cheapest to
      // finish); tie-break by lowest array position (bSkills before aSkills,
      // then lower index) for determinism (design §6 step 2, Finding 2).
      let best = matches[0];
      for (const m of matches) {
        if (m.skill.a > best.skill.a) best = m;
      }
      const key = `${best.isBasic ? 'b' : 'a'}:${best.index}`;
      const existing = candidatesByKey.get(key);
      if (existing) {
        existing.satisfiesPatterns.push(sn);
      } else {
        candidatesByKey.set(key, makeCandidate(best.skill.n, best.isBasic, best.index, best.skill.a, [sn], threshold));
      }
    } else if (!isWildcard(sn)) {
      // Concrete career skill with no matching row → synthesise a cost-from-0
      // candidate (committing runs ensureCareerSkillsExist then advanceSkill).
      const key = `new:${sn}`;
      const existing = candidatesByKey.get(key);
      if (existing) {
        existing.satisfiesPatterns.push(sn);
      } else {
        candidatesByKey.set(key, makeCandidate(sn, false, null, 0, [sn], threshold));
      }
    } else {
      // Wildcard-only pattern with no concrete row: cannot be auto-planned
      // without a specialisation choice (mirrors ensureCareerSkillsExist
      // skipping wildcards). Surface an advisory, do not invent cost (OQ-2).
      skillAdvisories.push(`${sn} needs a chosen specialisation before it can be planned/advanced.`);
    }
  }

  // Greedy selection ascending by rowCost, tie-break lowest skillIndex then name;
  // select a candidate only while it covers ≥1 not-yet-covered pattern, and mark
  // all its patterns covered on selection so no physical row is priced twice
  // (design §6 step 4, Finding 1).
  const candidates = [...candidatesByKey.values()].sort((a, b) => {
    if (a.rowCost !== b.rowCost) return a.rowCost - b.rowCost;
    const ai = a.skillIndex ?? Number.MAX_SAFE_INTEGER;
    const bi = b.skillIndex ?? Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });

  const covered = new Set<string>();
  let remainingNeeded = Math.max(0, need - metPatterns.length);
  const selectedRows: SkillCandidate[] = [];
  for (const cand of candidates) {
    if (remainingNeeded <= 0) break;
    const newlyCovered = cand.satisfiesPatterns.filter(p => !covered.has(p));
    if (newlyCovered.length === 0) continue;
    selectedRows.push(cand);
    for (const p of newlyCovered) covered.add(p);
    remainingNeeded -= newlyCovered.length;
  }

  if (remainingNeeded > 0) {
    // Concrete rows cannot close the gap (only a wildcard specialisation choice
    // can). Subtotal stays capped to the concrete rows selected; skills.met
    // follows the checklist predicate. (design §6 step 5, Finding 5.)
    skillAdvisories.push('Additional specialisation choice required to complete the skill requirement.');
  }

  const skillSteps = selectedRows.flatMap(r => r.steps);
  const skillsSubtotal = selectedRows.reduce((s, r) => s + r.rowCost, 0);
  const skills: RequirementPlan = {
    kind: 'skills',
    steps: skillSteps,
    subtotal: skillsSubtotal,
    met: skillsMet,
    advisories: skillAdvisories,
  };

  // ── Talent (Core p.47: talents only available at the level that lists them) ─
  const currentLevelTalents = getCurrentLevelTalents(careerName, levelNum);
  const talentsOwned = currentLevelTalents.filter(tn =>
    character.talents.some(t => t.n === tn || t.n.startsWith(tn + ' (') || tn.startsWith(t.n + ' (')),
  );
  const talentsMet = talentsOwned.length >= 1;
  const talentSteps: PlannerStep[] = [];
  if (!talentsMet) {
    const unowned = currentLevelTalents.filter(tn => !talentsOwned.includes(tn));
    if (unowned.length > 0) {
      // All brand-new current-level talents cost 100 (Core p.45: 100 × (0 + 1),
      // in-career); any will do — tie-break by name for determinism (OQ-3).
      const chosen = [...unowned].sort((a, b) => a.localeCompare(b))[0];
      talentSteps.push({
        kind: 'talent',
        name: chosen,
        fromAdvances: 0,
        toAdvances: 1,
        inCareer: true,
        cost: getAdvancementCost('talent', 0, true),
      });
    }
  }
  const talentSubtotal = talentSteps.reduce((s, st) => s + st.cost, 0);
  const talent: RequirementPlan = {
    kind: 'talent',
    steps: talentSteps,
    subtotal: talentSubtotal,
    met: talentsMet,
    advisories: [],
  };

  return { characteristics, skills, talent };
}

/**
 * Plan the cheapest path to complete the character's current career level and
 * reach the next one. Pure — returns new plain objects, mutates nothing.
 *
 * Resolves the character's current career level, then delegates the
 * per-requirement cost/row-selection logic to `planLevelRequirements` so there
 * is a single implementation of it (design §Code-reuse boundary). Assembles the
 * advance-level fee (Core p.48), grand total, affordability, and ordered path.
 */
export function planNextCareerLevel(character: Character): NextLevelPlan {
  const xpCur = character.xpCur;

  const scheme = getCareerScheme(character.career);
  if (!scheme) return inapplicablePlan(xpCur);

  // Resolve the current level exactly as AdvancementPage does: level1..level5
  // filtered for presence, then locate by title.
  const allLevels = [
    scheme.level1, scheme.level2, scheme.level3, scheme.level4, scheme.level5,
  ].filter(Boolean) as CareerLevel[];
  const careerLevel = allLevels.find(l => l.title === character.careerLevel);
  const careerLevelNum = allLevels.findIndex(l => l.title === character.careerLevel) + 1;

  // No matching level, or at/above max level → nothing to plan (FR-7, §9).
  if (!careerLevel || careerLevelNum <= 0 || careerLevelNum >= allLevels.length) {
    return inapplicablePlan(xpCur);
  }

  // Core p.48 completion threshold for this level; `?? 5` fallback mirrors the
  // page for an unexpected level number (design §7.1, OQ-5).
  const threshold = CAREER_COMPLETION_THRESHOLDS[careerLevelNum] ?? 5;

  const { characteristics, skills, talent } = planLevelRequirements(
    character,
    character.career,
    careerLevelNum,
  );

  const charSteps = characteristics.steps;
  const skillSteps = skills.steps;
  const talentSteps = talent.steps;
  const requirementsTotal = characteristics.subtotal + skills.subtotal + talent.subtotal;

  // Advance-level fee driven by the three met flags, NOT requirementsTotal === 0
  // (design §6, Finding 4). Core p.48: 100 when ready, 200 when not.
  const advanceLevelCost = (characteristics.met && skills.met && talent.met)
    ? ADVANCE_LEVEL_FEE.ready
    : ADVANCE_LEVEL_FEE.notReady;
  const grandTotal = requirementsTotal + advanceLevelCost;
  const canAfford = xpCur >= grandTotal;
  const shortfall = Math.max(0, grandTotal - xpCur);

  // Ordered path (FR-3): all per-step items cheapest-first. Stable tie-break by
  // (kind, name, fromAdvances) keeps each row's steps internally low→high, since
  // a higher step's price depends on buying the lower one first (design §6).
  const orderedPath = [...charSteps, ...skillSteps, ...talentSteps].sort((a, b) => {
    if (a.cost !== b.cost) return a.cost - b.cost;
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    return a.fromAdvances - b.fromAdvances;
  });

  return {
    applicable: true,
    threshold,
    characteristics,
    skills,
    talent,
    requirementsTotal,
    advanceLevelCost,
    grandTotal,
    xpCur,
    canAfford,
    shortfall,
    orderedPath,
  };
}

/** Build a skill candidate row with its per-step cost breakdown to threshold. */
function makeCandidate(
  name: string,
  isBasic: boolean,
  skillIndex: number | null,
  fromAdvances: number,
  satisfiesPatterns: string[],
  threshold: number,
): SkillCandidate {
  const steps: PlannerStep[] = [];
  // All career skills price in-career (Core p.45: in-career = not doubled).
  for (let a = fromAdvances; a < threshold; a++) {
    steps.push({
      kind: 'skill',
      name,
      fromAdvances: a,
      toAdvances: a + 1,
      inCareer: true,
      cost: getAdvancementCost('skill', a, true),
      isBasic,
      skillIndex,
    });
  }
  const rowCost = steps.reduce((s, st) => s + st.cost, 0);
  return { name, isBasic, skillIndex, fromAdvances, satisfiesPatterns, rowCost, steps };
}

/**
 * Project how far a flat XP `budget` reaches along the plan's cheapest-first
 * ordered path. Pure; returns a new object.
 *
 * Budget is normalised to a non-negative integer (XP is always integral in this
 * app; design §9, Finding 8). A non-finite / ≤0 budget still returns a valid
 * projection (the caller hides it from the UI).
 */
export function projectBudget(plan: NextLevelPlan, budget: number): BudgetProjection {
  const b = Math.floor(Math.max(0, Number.isFinite(budget) ? budget : 0));

  const affordableSteps: PlannerStep[] = [];
  let spent = 0;
  let firstUnaffordable: PlannerStep | null = null;

  for (const step of plan.orderedPath) {
    if (firstUnaffordable === null && spent + step.cost <= b) {
      affordableSteps.push(step);
      spent += step.cost;
    } else if (firstUnaffordable === null) {
      firstUnaffordable = step;
    }
  }

  return { budget: b, affordableSteps, spent, firstUnaffordable };
}
