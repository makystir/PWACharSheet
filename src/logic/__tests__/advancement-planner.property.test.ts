import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { planNextCareerLevel, projectBudget } from '../advancement-planner';
import { getAdvancementCost } from '../advancement';
import type { Character, CharacteristicKey, CharacteristicValue, Skill } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';

const ALL_CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

// Soldier Recruit (level 1, threshold 5). Career chars WS/T/WP, 8 concrete skills,
// talents Diceman/Marksman/Strong Back/Warrior Born.
const RECRUIT_SKILLS = ['Athletics', 'Climb', 'Cool', 'Dodge', 'Endurance', 'Language (Battle)', 'Melee (Basic)'];
const CHOICE_SKILL = 'Play (Drum)'; // satisfies the "Play (Drum or Fife)" choice pattern

/** Build a Soldier Recruit from arbitrary advance counts and xpCur. */
function buildCharacter(opts: {
  charAdv: Record<'WS' | 'T' | 'WP', number>;
  skillAdv: number[]; // one entry per RECRUIT_SKILLS + CHOICE_SKILL (8 total)
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

describe('advancement-planner property tests', () => {
  it('P1: all subtotals and grandTotal are finite and >= 0', () => {
    fc.assert(
      fc.property(arbCharacter, (opts) => {
        const plan = planNextCareerLevel(buildCharacter(opts));
        for (const v of [
          plan.characteristics.subtotal,
          plan.skills.subtotal,
          plan.talent.subtotal,
          plan.requirementsTotal,
          plan.advanceLevelCost,
          plan.grandTotal,
          plan.shortfall,
        ]) {
          expect(Number.isFinite(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
        }
      }),
    );
  });

  it('P2: projectBudget(plan,b).spent is non-decreasing in b and <= min(b, grandTotal reqs)', () => {
    fc.assert(
      fc.property(arbCharacter, fc.integer({ min: 0, max: 3000 }), fc.integer({ min: 0, max: 3000 }), (opts, b1, b2) => {
        const plan = planNextCareerLevel(buildCharacter(opts));
        const lo = Math.min(b1, b2);
        const hi = Math.max(b1, b2);
        const spentLo = projectBudget(plan, lo).spent;
        const spentHi = projectBudget(plan, hi).spent;
        expect(spentHi).toBeGreaterThanOrEqual(spentLo);
        // spent never exceeds the budget nor the total path cost.
        const pathTotal = plan.orderedPath.reduce((s, st) => s + st.cost, 0);
        expect(spentHi).toBeLessThanOrEqual(Math.min(hi, pathTotal));
      }),
    );
  });

  it('P3: orderedPath non-decreasing, sums to requirementsTotal, rows are contiguous and unique', () => {
    fc.assert(
      fc.property(arbCharacter, (opts) => {
        const plan = planNextCareerLevel(buildCharacter(opts));

        // Non-decreasing cost ordering.
        for (let i = 1; i < plan.orderedPath.length; i++) {
          expect(plan.orderedPath[i].cost).toBeGreaterThanOrEqual(plan.orderedPath[i - 1].cost);
        }
        // Summed path cost equals requirementsTotal.
        expect(plan.orderedPath.reduce((s, st) => s + st.cost, 0)).toBe(plan.requirementsTotal);

        // Each selected skill row contributes a contiguous fromAdvances..threshold-1
        // run sharing one (isBasic, skillIndex)/name, and no physical row appears twice.
        const skillSteps = plan.skills.steps;
        const byRow = new Map<string, typeof skillSteps>();
        for (const s of skillSteps) {
          const key = s.skillIndex === null || s.skillIndex === undefined ? `new:${s.name}` : `${s.isBasic ? 'b' : 'a'}:${s.skillIndex}`;
          const list = byRow.get(key) ?? [];
          list.push(s);
          byRow.set(key, list);
        }
        for (const [, steps] of byRow) {
          // All steps for a row share the same name.
          expect(new Set(steps.map(s => s.name)).size).toBe(1);
          // fromAdvances is a contiguous ascending run ending at threshold-1.
          const sorted = [...steps].sort((a, b) => a.fromAdvances - b.fromAdvances);
          for (let i = 0; i < sorted.length; i++) {
            expect(sorted[i].fromAdvances).toBe(sorted[0].fromAdvances + i);
          }
          expect(sorted[sorted.length - 1].toAdvances).toBe(plan.threshold);
        }
      }),
    );
  });

  it('P4: every emitted step cost equals getAdvancementCost(type, from, inCareer)', () => {
    fc.assert(
      fc.property(arbCharacter, (opts) => {
        const plan = planNextCareerLevel(buildCharacter(opts));
        const all = [
          ...plan.characteristics.steps,
          ...plan.skills.steps,
          ...plan.talent.steps,
        ];
        for (const step of all) {
          expect(step.cost).toBe(getAdvancementCost(step.kind, step.fromAdvances, step.inCareer));
        }
      }),
    );
  });

  it('P5: selected skill rows total <= any other covering set (brute force)', () => {
    fc.assert(
      fc.property(arbCharacter, (opts) => {
        const char = buildCharacter(opts);
        const plan = planNextCareerLevel(char);

        // Only check cases the planner fully solved (no advisory shortfall), so a
        // valid covering set exists.
        const shortfall = plan.skills.advisories.some(a => a.includes('Additional specialisation'));
        if (shortfall) return;

        // Enumerate candidate rows: the 8 concrete Recruit skills. For each, the
        // cost-to-threshold from its current advances (capped at threshold).
        const threshold = plan.threshold;
        const names = [...RECRUIT_SKILLS, CHOICE_SKILL];
        const rows = names.map((_, i) => {
          const a0 = Math.min(opts.skillAdv[i], threshold);
          let cost = 0;
          for (let a = a0; a < threshold; a++) cost += getAdvancementCost('skill', a, true);
          return { metAlready: a0 >= threshold, cost };
        });

        const need = 8;
        const alreadyMet = rows.filter(r => r.metAlready).length;
        const remaining = Math.max(0, need - alreadyMet);
        const upgradable = rows.filter(r => !r.metAlready).map(r => r.cost).sort((a, b) => a - b);

        // Brute-force optimum: pick the `remaining` cheapest upgradable rows (each
        // concrete row satisfies exactly one distinct pattern here).
        const optimal = upgradable.slice(0, remaining).reduce((s, c) => s + c, 0);

        // The planner's skill subtotal must equal the optimal (every pattern is
        // distinct here, so greedy-cheapest is provably optimal).
        expect(plan.skills.subtotal).toBe(optimal);
      }),
    );
  });
});
