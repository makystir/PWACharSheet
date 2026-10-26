import { describe, it, expect } from 'vitest';
import {
  planProgression,
  projectProgressionBudget,
  describeCareerOptions,
  type FeeStep,
  type ProgressionPhase,
} from '../progression-advisor';
import { planNextCareerLevel, planLevelRequirements } from '../advancement-planner';
import {
  getCareerSwitchCost,
  isReadyToAdvance,
  CAREER_COMPLETION_THRESHOLDS,
  ADVANCE_LEVEL_FEE,
} from '../advancement';
import { getCareerScheme } from '../careers';
import { getEligibleCareers } from '../career-eligibility';
import type { Character, CharacteristicKey, CharacteristicValue, Skill } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';

const ALL_CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

const SAME_CLASS_TARGET = 'Guard';   // Warriors — same class as Soldier, Human-eligible
const DIFF_CLASS_TARGET = 'Scholar'; // Academics — different class, Human-eligible, has Lore (Any)
const INELIGIBLE_TARGET = 'Sea Guard'; // High-Elf-only career

/** Soldier (Recruit, level 1) fixture — mirrors advancement-planner.test.ts. */
function makeTestCharacter(overrides: Partial<Character> = {}): Character {
  const chars = Object.fromEntries(
    ALL_CHAR_KEYS.map(key => [key, { i: 30, a: 0, b: 0 }]),
  ) as Record<CharacteristicKey, CharacteristicValue>;
  return {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Test',
    species: 'Human / Reiklander',
    class: 'Warriors',
    career: 'Soldier',
    careerLevel: 'Recruit',
    careerPath: '',
    status: 'Silver 1',
    chars,
    xpCur: 100000,
    xpSpent: 0,
    xpTotal: 100000,
    bSkills: [],
    aSkills: [],
    talents: [],
    ...overrides,
  };
}

const isFeeStep = (item: unknown): item is FeeStep =>
  typeof item === 'object' && item !== null && 'components' in item;

const findPhase = (phases: ProgressionPhase[], id: ProgressionPhase['id']) =>
  phases.find(p => p.id === id);

describe('planProgression — T1 nextLevel reuse', () => {
  it('per-step costs and grandTotal equal planNextCareerLevel; path adds one fee', () => {
    const char = makeTestCharacter();
    const plan = planNextCareerLevel(char);
    const result = planProgression(char, { kind: 'nextLevel' });

    expect(result.reachable).toBe(true);
    expect(result.goalFullyPlanned).toBe(true);
    expect(result.grandTotal).toBe(plan.grandTotal);

    // orderedPath = planner per-advance path + exactly one trailing advanceLevelFee.
    const fees = result.orderedPath.filter(isFeeStep);
    expect(fees.length).toBe(1);
    expect(fees[0].kind).toBe('advanceLevelFee');
    expect(fees[0].cost).toBe(plan.advanceLevelCost);

    const steps = result.orderedPath.filter(s => !isFeeStep(s));
    expect(steps.map(s => s.cost)).toEqual(plan.orderedPath.map(s => s.cost));
    expect(result.orderedPath.reduce((s, i) => s + i.cost, 0)).toBe(result.grandTotal);
  });
});

describe('planProgression — T2 switch path shape', () => {
  it('phases ordered complete-current → switch → build-target; no advance-level cost in complete', () => {
    const char = makeTestCharacter();
    const result = planProgression(char, { kind: 'career', career: SAME_CLASS_TARGET });

    expect(result.reachable).toBe(true);
    expect(result.phases.map(p => p.id)).toEqual(['complete-current', 'switch', 'build-target']);

    // complete-current carries no fee (OQ-4).
    const complete = findPhase(result.phases, 'complete-current')!;
    expect(complete.fee).toBeUndefined();

    // switch phase has a switchFee FeeStep.
    const sw = findPhase(result.phases, 'switch')!;
    expect(sw.fee?.kind).toBe('switchFee');

    // build-target steps are in-career for the target (by definition).
    const build = findPhase(result.phases, 'build-target')!;
    expect(build.steps.every(s => s.inCareer)).toBe(true);
    expect(build.subtotal).toBe(build.steps.reduce((s, st) => s + st.cost, 0));
  });
});

describe('planProgression — T3 switch-fee parity', () => {
  it('switch FeeStep cost equals getCareerSwitchCost across ready × class', () => {
    for (const ready of [true, false]) {
      for (const target of [SAME_CLASS_TARGET, DIFF_CLASS_TARGET]) {
        // Make the character ready/not-ready by completing or not the level.
        const char = ready ? completeRecruit() : makeTestCharacter();
        expect(isReadyToAdvance(char)).toBe(ready);
        const targetScheme = getCareerScheme(target)!;
        const result = planProgression(char, { kind: 'career', career: target });
        const fee = findPhase(result.phases, 'switch')!.fee!;
        expect(fee.cost).toBe(getCareerSwitchCost(ready, char.class, targetScheme.class));
      }
    }
  });
});

describe('planProgression — T4 carryover', () => {
  it('a target requirement already met contributes 0; partial priced from current', () => {
    // Give a Guard level-1 characteristic (WS) already to threshold so it costs 0,
    // and a partial T so it is priced from current advances.
    const chars = Object.fromEntries(
      ALL_CHAR_KEYS.map(key => [key, { i: 30, a: 0, b: 0 }]),
    ) as Record<CharacteristicKey, CharacteristicValue>;
    // Guard L1 chars: WS, T, Ag (threshold 5).
    chars.WS = { i: 30, a: 5, b: 0 };
    chars.T = { i: 30, a: 2, b: 0 };
    const char = makeTestCharacter({ chars });
    const result = planProgression(char, { kind: 'career', career: SAME_CLASS_TARGET });
    const build = findPhase(result.phases, 'build-target')!;
    // No WS step (met at 5). T steps from 2→5 only.
    expect(build.steps.some(s => s.name === 'WS')).toBe(false);
    const tSteps = build.steps.filter(s => s.name === 'T');
    expect(tSteps.map(s => s.fromAdvances)).toEqual([2, 3, 4]);
  });
});

describe('planProgression — T5 wildcard advisory', () => {
  it('target level with a (Any) skill emits an advisory, no invented cost', () => {
    const char = makeTestCharacter();
    // Scholar L1 lists "Lore (Any)" — a wildcard with no concrete row.
    const result = planProgression(char, { kind: 'career', career: DIFF_CLASS_TARGET });
    const build = findPhase(result.phases, 'build-target')!;
    expect(build.advisories.some(a => a.includes('Lore (Any)'))).toBe(true);
    expect(build.steps.every(s => !s.name.includes('(Any)'))).toBe(true);
    // grandTotal = Σ subtotals.
    expect(result.grandTotal).toBe(result.phases.reduce((s, p) => s + p.subtotal, 0));
  });
});

describe('planProgression — T6 ineligible target', () => {
  it('a High-Elf-only career for a Human → unreachable, no path', () => {
    const char = makeTestCharacter();
    const result = planProgression(char, { kind: 'career', career: INELIGIBLE_TARGET });
    expect(result.reachable).toBe(false);
    expect(result.goalFullyPlanned).toBe(false);
    expect(result.reason).toContain('Sea Guard');
    expect(result.phases).toEqual([]);
    expect(result.grandTotal).toBe(0);
    expect(result.orderedPath).toEqual([]);
  });
});

describe('planProgression — T7 timeline', () => {
  it('sessionsToGoal = ceil(shortfall/rate) for rate>0 && shortfall>0, else null', () => {
    const base = makeTestCharacter({ xpCur: 0 });
    const grand = planProgression(base, { kind: 'nextLevel' }).grandTotal;

    const r1 = planProgression(makeTestCharacter({ xpCur: 0 }), { kind: 'nextLevel' }, { xpPerSession: 10 });
    expect(r1.sessionsToGoal).toBe(Math.ceil(grand / 10));

    // rate <= 0 → null.
    const r2 = planProgression(makeTestCharacter({ xpCur: 0 }), { kind: 'nextLevel' }, { xpPerSession: 0 });
    expect(r2.sessionsToGoal).toBeNull();
    expect(r2.xpPerSession).toBe(0);

    // shortfall 0 → null even with a rate.
    const r3 = planProgression(makeTestCharacter({ xpCur: grand }), { kind: 'nextLevel' }, { xpPerSession: 10 });
    expect(r3.shortfall).toBe(0);
    expect(r3.sessionsToGoal).toBeNull();
  });
});

describe('planProgression — T8 affordability', () => {
  it('canAfford / shortfall track xpCur vs grandTotal', () => {
    const grand = planProgression(makeTestCharacter({ xpCur: 0 }), { kind: 'nextLevel' }).grandTotal;

    const exact = planProgression(makeTestCharacter({ xpCur: grand }), { kind: 'nextLevel' });
    expect(exact.canAfford).toBe(true);
    expect(exact.shortfall).toBe(0);

    const under = planProgression(makeTestCharacter({ xpCur: grand - 1 }), { kind: 'nextLevel' });
    expect(under.canAfford).toBe(false);
    expect(under.shortfall).toBe(1);
  });
});

describe('projectProgressionBudget — T9', () => {
  it('matches walking the ordered path; floors budget; hides on non-positive', () => {
    const result = planProgression(makeTestCharacter({ xpCur: 0 }), { kind: 'nextLevel' });
    const path = result.orderedPath;

    // null for non-positive / non-finite.
    expect(projectProgressionBudget(path, 0)).toBeNull();
    expect(projectProgressionBudget(path, undefined)).toBeNull();
    expect(projectProgressionBudget(path, NaN)).toBeNull();

    // Covers a prefix for a mid budget.
    const twoCost = path[0].cost + path[1].cost;
    const proj = projectProgressionBudget(path, twoCost)!;
    expect(proj.spent).toBe(twoCost);
    expect(proj.affordableCount).toBe(2);
    expect(proj.firstUnaffordableLabel).not.toBeNull();

    // Floors a decimal.
    expect(projectProgressionBudget(path, 3.9)!.budget).toBe(3);

    // Whole path for a big budget.
    const full = projectProgressionBudget(path, result.grandTotal + 10000)!;
    expect(full.affordableCount).toBe(path.length);
    expect(full.spent).toBe(result.grandTotal);
    expect(full.firstUnaffordableLabel).toBeNull();
  });
});

describe('planProgression — T10 none goal', () => {
  it('empty path, advisory prompt, grandTotal 0', () => {
    const result = planProgression(makeTestCharacter(), { kind: 'none' });
    expect(result.reachable).toBe(true);
    expect(result.goalFullyPlanned).toBe(true);
    expect(result.phases).toEqual([]);
    expect(result.grandTotal).toBe(0);
    expect(result.advisories.length).toBeGreaterThan(0);
  });
});

describe('planProgression — T11 multi-level climb decomposition', () => {
  it('chains build→fee→build→fee and decomposes against the projected character', () => {
    // Soldier Recruit (L1) → target Soldier level 3 (climb through L2).
    const char = makeTestCharacter();
    const result = planProgression(char, { kind: 'careerLevel', career: 'Soldier', level: 3 });
    expect(result.reachable).toBe(true);
    expect(result.goalFullyPlanned).toBe(true);

    // First transition requirement subtotals equal planNextCareerLevel.
    const firstPlan = planNextCareerLevel(char);
    const firstReq = result.phases[0];
    expect(firstReq.id).toBe('complete-current');
    expect(firstReq.subtotal).toBe(
      firstPlan.characteristics.subtotal + firstPlan.skills.subtotal + firstPlan.talent.subtotal,
    );

    // Phase order: complete-current, advance-level, build-target(L2), advance-level.
    expect(result.phases.map(p => p.id)).toEqual([
      'complete-current', 'advance-level', 'build-target', 'advance-level',
    ]);

    // Build the expected projected character and verify the L2 build subtotal.
    const projected = buildProjected(char, firstPlan, CAREER_COMPLETION_THRESHOLDS[1]);
    const l2 = planLevelRequirements(projected, 'Soldier', 2);
    const l2Subtotal = l2.characteristics.subtotal + l2.skills.subtotal + l2.talent.subtotal;
    expect(result.phases[2].subtotal).toBe(l2Subtotal);

    // Both advance-level fees are the ready rate (just-completed prior level).
    expect(result.phases[1].fee!.cost).toBe(firstPlan.advanceLevelCost);
    expect(result.phases[3].fee!.cost).toBe(ADVANCE_LEVEL_FEE.ready);

    // grandTotal decomposition.
    const expected = firstReq.subtotal + result.phases[1].fee!.cost + l2Subtotal + ADVANCE_LEVEL_FEE.ready;
    expect(result.grandTotal).toBe(expected);
  });
});

describe('planProgression — T12 describeCareerOptions', () => {
  it('returns eligible targets minus current with correct sameClass/surcharge', () => {
    const char = makeTestCharacter();
    const options = describeCareerOptions(char);
    const names = options.map(o => o.career);

    // Membership = eligible minus current.
    const expected = getEligibleCareers(char.species).filter(c => c !== char.career);
    expect(new Set(names)).toEqual(new Set(expected));
    expect(names).not.toContain('Soldier');

    const guard = options.find(o => o.career === SAME_CLASS_TARGET)!;
    expect(guard.sameClass).toBe(true);
    expect(guard.switchFeeIfReady).toBe(getCareerSwitchCost(true, char.class, 'Warriors'));

    const scholar = options.find(o => o.career === DIFF_CLASS_TARGET)!;
    expect(scholar.sameClass).toBe(false);
    expect(scholar.switchFeeIfReady).toBe(getCareerSwitchCost(true, char.class, 'Academics'));

    // Never declares a "best".
    expect(options.every(o => !/best/i.test(o.rationale))).toBe(true);
  });
});

describe('planProgression — T13 foreign-career level>1 partial', () => {
  it('reachable:true, goalFullyPlanned:false, switch-only path + advisory', () => {
    const char = makeTestCharacter();
    const result = planProgression(char, { kind: 'careerLevel', career: SAME_CLASS_TARGET, level: 2 });
    expect(result.reachable).toBe(true);
    expect(result.goalFullyPlanned).toBe(false);
    expect(result.advisories.some(a => a.includes('level 1 only'))).toBe(true);

    // Path contains only the switch-to-L1 phases.
    expect(result.phases.map(p => p.id)).toEqual(['complete-current', 'switch', 'build-target']);

    // grandTotal equals the single-switch (career) plan for the same target.
    const single = planProgression(char, { kind: 'career', career: SAME_CLASS_TARGET });
    expect(result.grandTotal).toBe(single.grandTotal);
  });
});

// ─── helpers ─────────────────────────────────────────────────────────────────

/** A Soldier Recruit that satisfies all level-1 completion requirements. */
function completeRecruit(): Character {
  const chars = Object.fromEntries(
    ALL_CHAR_KEYS.map(key => [key, { i: 30, a: 0, b: 0 }]),
  ) as Record<CharacteristicKey, CharacteristicValue>;
  chars.WS = { i: 30, a: 5, b: 0 };
  chars.T = { i: 30, a: 5, b: 0 };
  chars.WP = { i: 30, a: 5, b: 0 };
  const bSkills: Skill[] = [
    { n: 'Athletics', c: 'Ag', a: 5 },
    { n: 'Climb', c: 'S', a: 5 },
    { n: 'Cool', c: 'WP', a: 5 },
    { n: 'Dodge', c: 'Ag', a: 5 },
    { n: 'Endurance', c: 'T', a: 5 },
    { n: 'Language (Battle)', c: 'Int', a: 5 },
    { n: 'Melee (Basic)', c: 'WS', a: 5 },
    { n: 'Play (Drum)', c: 'Dex', a: 5 },
  ];
  return makeTestCharacter({ chars, bSkills, talents: [{ n: 'Marksman', lvl: 1, desc: '' }] });
}

/** Replicate the engine's projected-character construction for T11. */
function buildProjected(
  character: Character,
  plan: ReturnType<typeof planNextCareerLevel>,
  threshold: number,
): Character {
  const next = structuredClone(character);
  for (const step of plan.characteristics.steps) {
    const key = step.name as CharacteristicKey;
    next.chars[key] = { ...next.chars[key], a: Math.max(next.chars[key].a, step.toAdvances) };
  }
  for (const step of plan.skills.steps) {
    if (step.skillIndex === null || step.skillIndex === undefined) {
      const exists = [...next.bSkills, ...next.aSkills].some(s => s.n === step.name);
      if (!exists) next.aSkills = [...next.aSkills, { n: step.name, c: 'Int', a: threshold }];
    } else if (step.isBasic) {
      const rows = [...next.bSkills];
      rows[step.skillIndex] = { ...rows[step.skillIndex], a: Math.max(rows[step.skillIndex].a, step.toAdvances) };
      next.bSkills = rows;
    } else {
      const rows = [...next.aSkills];
      rows[step.skillIndex] = { ...rows[step.skillIndex], a: Math.max(rows[step.skillIndex].a, step.toAdvances) };
      next.aSkills = rows;
    }
  }
  for (const step of plan.talent.steps) {
    if (!next.talents.some(t => t.n === step.name)) {
      next.talents = [...next.talents, { n: step.name, lvl: 1, desc: '' }];
    }
  }
  return next;
}

/** Parity test R1 — switch-fee extraction (design §Parity test). */
describe('getCareerSwitchCost — R1 parity', () => {
  it('equals the original inline expression across ready × class', () => {
    for (const ready of [true, false]) {
      for (const [current, target] of [['Warriors', 'Warriors'], ['Warriors', 'Academics']]) {
        const sameClass = target === current;
        const expected = (ready ? 100 : 200) + (sameClass ? 0 : 100);
        expect(getCareerSwitchCost(ready, current, target)).toBe(expected);
      }
    }
  });
});
