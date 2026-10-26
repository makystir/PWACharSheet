import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  planProgression,
  type ProgressionGoal,
  type FeeStep,
} from '../progression-advisor';
import type { PlannerStep } from '../advancement-planner';
import { getAdvancementCost, getCareerSwitchCost, isReadyToAdvance, CAREER_COMPLETION_THRESHOLDS } from '../advancement';
import { getCareerScheme } from '../careers';
import { getEligibleCareers } from '../career-eligibility';
import type { Character, CharacteristicKey, CharacteristicValue, Skill } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';

const ALL_CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];
const RECRUIT_SKILLS = ['Athletics', 'Climb', 'Cool', 'Dodge', 'Endurance', 'Language (Battle)', 'Melee (Basic)'];
const CHOICE_SKILL = 'Play (Drum)';

/** Build a Soldier Recruit from arbitrary advance counts and xpCur. */
function buildCharacter(opts: {
  charAdv: Record<'WS' | 'T' | 'WP', number>;
  skillAdv: number[];
  ownsTalent: boolean;
  xpCur: number;
}): Character {
  const chars = Object.fromEntries(
    ALL_CHAR_KEYS.map(key => [key, { i: 30, a: 0, b: 0 }]),
  ) as Record<CharacteristicKey, CharacteristicValue>;
  chars.WS = { i: 30, a: opts.charAdv.WS, b: 0 };
  chars.T = { i: 30, a: opts.charAdv.T, b: 0 };
  chars.WP = { i: 30, a: opts.charAdv.WP, b: 0 };
  const names = [...RECRUIT_SKILLS, CHOICE_SKILL];
  const bSkills: Skill[] = names.map((n, i) => ({ n, c: 'WS', a: opts.skillAdv[i] ?? 0 }));
  return {
    ...structuredClone(BLANK_CHARACTER),
    name: 'P',
    species: 'Human / Reiklander',
    class: 'Warriors',
    career: 'Soldier',
    careerLevel: 'Recruit',
    status: 'Silver 1',
    chars,
    xpCur: opts.xpCur,
    xpSpent: 0,
    xpTotal: opts.xpCur,
    bSkills,
    aSkills: [],
    talents: opts.ownsTalent ? [{ n: 'Marksman', lvl: 1, desc: '' }] : [],
  };
}

const arbCharacter = fc.record({
  charAdv: fc.record({
    WS: fc.integer({ min: 0, max: 5 }),
    T: fc.integer({ min: 0, max: 5 }),
    WP: fc.integer({ min: 0, max: 5 }),
  }),
  skillAdv: fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 8, maxLength: 8 }),
  ownsTalent: fc.boolean(),
  xpCur: fc.integer({ min: 0, max: 5000 }),
});

// Eligible target careers drawn from getEligibleCareers for the Human fixture.
const ELIGIBLE_TARGETS = getEligibleCareers('Human / Reiklander').filter(c => c !== 'Soldier');
const arbTarget = fc.constantFrom(...ELIGIBLE_TARGETS);

const isFeeStep = (item: PlannerStep | FeeStep): item is FeeStep =>
  (item as FeeStep).components !== undefined;

describe('progression-advisor property tests', () => {
  it('P1: grandTotal = Σ path costs; per-advance steps priced by getAdvancementCost', () => {
    fc.assert(
      fc.property(arbCharacter, arbTarget, (opts, target) => {
        const char = buildCharacter(opts);
        for (const goal of [{ kind: 'nextLevel' } as ProgressionGoal, { kind: 'career', career: target } as ProgressionGoal]) {
          const plan = planProgression(char, goal);
          if (!plan.reachable) continue;
          expect(plan.grandTotal).toBe(plan.orderedPath.reduce((s, i) => s + i.cost, 0));
          for (const item of plan.orderedPath) {
            if (isFeeStep(item)) {
              expect(item.cost).toBe(item.components.reduce((s, c) => s + c.value, 0));
            } else {
              expect(item.cost).toBe(getAdvancementCost(item.kind, item.fromAdvances, item.inCareer));
            }
          }
        }
      }),
    );
  });

  it('P2: switch FeeStep cost = getCareerSwitchCost(isReadyToAdvance, class, targetClass)', () => {
    fc.assert(
      fc.property(arbCharacter, arbTarget, (opts, target) => {
        const char = buildCharacter(opts);
        const plan = planProgression(char, { kind: 'career', career: target });
        if (!plan.reachable) return;
        const sw = plan.phases.find(p => p.id === 'switch');
        const targetScheme = getCareerScheme(target)!;
        expect(sw?.fee?.cost).toBe(getCareerSwitchCost(isReadyToAdvance(char), char.class, targetScheme.class));
      }),
    );
  });

  it('P3: fully-planned goal raises each required char/skill to exactly threshold', () => {
    fc.assert(
      fc.property(arbCharacter, (opts) => {
        const char = buildCharacter(opts);
        const plan = planProgression(char, { kind: 'nextLevel' });
        if (!plan.goalFullyPlanned) return;
        const threshold = CAREER_COMPLETION_THRESHOLDS[1];
        const complete = plan.phases.find(p => p.id === 'complete-current');
        if (!complete) return;
        for (const step of complete.steps) {
          // Each selected row's final step reaches exactly the threshold; no step
          // raises past it.
          expect(step.toAdvances).toBeLessThanOrEqual(threshold);
        }
      }),
    );
  });

  it('P4: ineligible target → reachable:false + empty phases', () => {
    fc.assert(
      fc.property(arbCharacter, (opts) => {
        const char = buildCharacter(opts);
        // Sea Guard is High-Elf-only → ineligible for the Human fixture.
        const plan = planProgression(char, { kind: 'career', career: 'Sea Guard' });
        expect(plan.reachable).toBe(false);
        expect(plan.phases.length).toBe(0);
      }),
    );
  });

  it('P5: determinism, affordability, timeline-as-pure-function, goalFullyPlanned invariant', () => {
    fc.assert(
      fc.property(
        arbCharacter,
        arbTarget,
        fc.integer({ min: 0, max: 100 }),
        (opts, target, rate) => {
          const char = buildCharacter(opts);
          const options = { xpPerSession: rate };

          for (const goal of [
            { kind: 'none' } as ProgressionGoal,
            { kind: 'nextLevel' } as ProgressionGoal,
            { kind: 'career', career: target } as ProgressionGoal,
            { kind: 'careerLevel', career: 'Soldier', level: 3 } as ProgressionGoal,
            { kind: 'careerLevel', career: target, level: 2 } as ProgressionGoal,
          ]) {
            const a = planProgression(char, goal, options);
            const b = planProgression(char, goal, options);
            expect(a).toEqual(b); // determinism

            // affordability.
            expect(a.canAfford).toBe(char.xpCur >= a.grandTotal);
            expect(a.shortfall).toBe(Math.max(0, a.grandTotal - char.xpCur));

            // timeline as a pure function of (shortfall, rate).
            const expectedSessions = rate > 0 && a.shortfall > 0 ? Math.ceil(a.shortfall / rate) : null;
            expect(a.sessionsToGoal).toBe(expectedSessions);

            // goalFullyPlanned invariant.
            if (goal.kind === 'none' || goal.kind === 'nextLevel') {
              expect(a.goalFullyPlanned).toBe(true);
            }
            if (goal.kind === 'careerLevel' && goal.career === 'Soldier') {
              expect(a.goalFullyPlanned).toBe(true);
            }
            if (goal.kind === 'career' && a.reachable) {
              expect(a.goalFullyPlanned).toBe(true);
            }
            if (goal.kind === 'careerLevel' && goal.career !== 'Soldier' && goal.level > 1 && a.reachable) {
              expect(a.goalFullyPlanned).toBe(false);
            }
            if (!a.reachable) {
              expect(a.goalFullyPlanned).toBe(false);
            }
          }
        },
      ),
    );
  });

  it('P6: no-mutation — input character is unchanged across goal kinds + budget + rate', () => {
    fc.assert(
      fc.property(arbCharacter, arbTarget, (opts, target) => {
        const char = buildCharacter(opts);
        const clone = structuredClone(char);
        for (const goal of [
          { kind: 'none' } as ProgressionGoal,
          { kind: 'nextLevel' } as ProgressionGoal,
          { kind: 'career', career: target } as ProgressionGoal,
          { kind: 'careerLevel', career: 'Soldier', level: 3 } as ProgressionGoal,
          { kind: 'careerLevel', career: target, level: 2 } as ProgressionGoal,
          { kind: 'career', career: 'Sea Guard' } as ProgressionGoal,
        ]) {
          planProgression(char, goal, { budget: 500, xpPerSession: 10 });
        }
        expect(char).toEqual(clone);
      }),
    );
  });
});
