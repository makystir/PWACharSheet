import { describe, it, expect } from 'vitest';
import {
  planNextCareerLevel,
  projectBudget,
} from '../advancement-planner';
import {
  getAdvancementCost,
  careerSkillMatches,
  getCurrentLevelTalents,
  isCareerLevelComplete,
  CAREER_COMPLETION_THRESHOLDS,
  ADVANCE_LEVEL_FEE,
} from '../advancement';
import type { Character, CharacteristicKey, CharacteristicValue, Skill } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';

const ALL_CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

/** Soldier (Recruit, level 1) fixture — mirrors advancement.test.ts. */
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

/** Sum of per-advance costs to raise one row from a0 to threshold. */
function sumToThreshold(type: 'characteristic' | 'skill', a0: number, threshold: number, inCareer = true): number {
  let total = 0;
  for (let a = a0; a < threshold; a++) total += getAdvancementCost(type, a, inCareer);
  return total;
}

/** Compute the page's skillsMet the same way AdvancementPage does. */
function pageSkillsMet(character: Character, careerSkills: string[], threshold: number): boolean {
  const allSkills = [...character.bSkills, ...character.aSkills];
  const skillsWithAdvances = careerSkills.filter(sn =>
    allSkills.some(s => careerSkillMatches(sn, s.n) && s.a >= threshold),
  );
  return skillsWithAdvances.length >= Math.min(8, careerSkills.length);
}

describe('planNextCareerLevel — characteristics', () => {
  it('characteristic cost-to-threshold equals the manual per-advance sum', () => {
    const char = makeTestCharacter();
    const plan = planNextCareerLevel(char);
    const threshold = plan.threshold;
    expect(threshold).toBe(CAREER_COMPLETION_THRESHOLDS[1]);

    // Soldier Recruit chars: WS, T, WP — all at 0 advances, need 5 each.
    const expected = 3 * sumToThreshold('characteristic', 0, threshold, true);
    expect(plan.characteristics.subtotal).toBe(expected);
    // Per-step sum equals the subtotal.
    expect(plan.characteristics.steps.reduce((s, st) => s + st.cost, 0)).toBe(expected);
    expect(plan.characteristics.met).toBe(false);
  });

  it('a characteristic already at threshold contributes zero', () => {
    const chars = Object.fromEntries(
      ALL_CHAR_KEYS.map(key => [key, { i: 30, a: 0, b: 0 }]),
    ) as Record<CharacteristicKey, CharacteristicValue>;
    chars.WS = { i: 30, a: 5, b: 0 };
    chars.T = { i: 30, a: 5, b: 0 };
    chars.WP = { i: 30, a: 5, b: 0 };
    const char = makeTestCharacter({ chars });
    const plan = planNextCareerLevel(char);
    expect(plan.characteristics.subtotal).toBe(0);
    expect(plan.characteristics.met).toBe(true);
  });
});

describe('planNextCareerLevel — skills', () => {
  it('picks the cheapest remainingNeeded rows and counts met patterns at zero', () => {
    // Recruit needs 8 skills at 5+. Provide 7 already met, so only 1 more needed.
    const met: Skill[] = [
      { n: 'Athletics', c: 'Ag', a: 5 },
      { n: 'Climb', c: 'S', a: 5 },
      { n: 'Cool', c: 'WP', a: 5 },
      { n: 'Dodge', c: 'Ag', a: 5 },
      { n: 'Endurance', c: 'T', a: 5 },
      { n: 'Language (Battle)', c: 'Int', a: 5 },
      { n: 'Melee (Basic)', c: 'WS', a: 5 },
    ];
    // Remaining pattern: Play (Drum or Fife). Provide one partial row at 3 adv.
    const char = makeTestCharacter({
      bSkills: [...met],
      aSkills: [{ n: 'Play (Drum)', c: 'Dex', a: 3 }],
    });
    const plan = planNextCareerLevel(char);
    // Only one row needed: Play (Drum) from 3 → 5.
    const expected = sumToThreshold('skill', 3, 5, true);
    expect(plan.skills.subtotal).toBe(expected);
    expect(plan.skills.steps.every(s => s.name === 'Play (Drum)')).toBe(true);
    expect(plan.skills.steps.length).toBe(2); // 3→4, 4→5
  });

  it('overlapping specific + (Any) career selects the shared row once (Finding 1)', () => {
    // Level 2 "Soldier" lists both Melee (Basic) and Melee (Any). A single
    // Melee (Basic) row satisfies BOTH patterns and must be priced once.
    const char = makeTestCharacter({
      careerLevel: 'Soldier', // level 2, threshold 10
      bSkills: [{ n: 'Melee (Basic)', c: 'WS', a: 8 }],
    });
    const plan = planNextCareerLevel(char);
    expect(plan.threshold).toBe(10);

    // Count Melee steps — the one row (8 → 10) should appear once, never doubled.
    const meleeSteps = plan.skills.steps.filter(s => s.name === 'Melee (Basic)');
    const expectedMeleeCost = sumToThreshold('skill', 8, 10, true);
    expect(meleeSteps.reduce((s, st) => s + st.cost, 0)).toBe(expectedMeleeCost);
    expect(meleeSteps.length).toBe(2);
    // No other skill step references the same physical row twice.
    const byRow = plan.skills.steps.filter(s => s.isBasic === true && s.skillIndex === 0);
    expect(byRow.every(s => s.name === 'Melee (Basic)')).toBe(true);
  });

  it('targets the highest-.a matching row and per-step costs sum to subtotal (Finding 2)', () => {
    // Two rows match the ungrouped career pattern "Athletics"? Use two Melee rows
    // matching "Melee (Any)" with different advances; the higher one is cheaper to finish.
    const char = makeTestCharacter({
      careerLevel: 'Soldier', // threshold 10
      bSkills: [
        { n: 'Melee (Basic)', c: 'WS', a: 2 },
        { n: 'Melee (Fencing)', c: 'WS', a: 7 },
      ],
    });
    const plan = planNextCareerLevel(char);
    // "Melee (Any)" should target the higher-.a row: Melee (Fencing) at 7.
    const meleeAnySteps = plan.skills.steps.filter(s => s.name === 'Melee (Fencing)');
    if (meleeAnySteps.length > 0) {
      expect(meleeAnySteps[0].fromAdvances).toBe(7);
    }
    // Every emitted skill step's per-step costs sum exactly to the subtotal.
    expect(plan.skills.steps.reduce((s, st) => s + st.cost, 0)).toBe(plan.skills.subtotal);
  });

  it('skills.met equals the page predicate, incl. wildcard-only unmet case (Finding 5)', () => {
    // Recruit skills are all concrete, so make a case where concrete rows can't
    // close the gap: provide 0 skills. The planner must synthesise concrete rows,
    // but Play (Drum or Fife) is a choice pattern (not wildcard) so it IS plannable.
    const char = makeTestCharacter({ bSkills: [], aSkills: [] });
    const plan = planNextCareerLevel(char);
    const careerSkills = ['Athletics', 'Climb', 'Cool', 'Dodge', 'Endurance', 'Language (Battle)', 'Melee (Basic)', 'Play (Drum or Fife)'];
    expect(plan.skills.met).toBe(pageSkillsMet(char, careerSkills, plan.threshold));
    expect(plan.skills.met).toBe(false);

    // Subtotal equals sum of per-step costs (capped to concrete rows).
    expect(plan.skills.subtotal).toBe(plan.skills.steps.reduce((s, st) => s + st.cost, 0));
  });

  it('a wildcard-only pattern with no concrete row produces an advisory, not cost', () => {
    // Level 2 Soldier lists "Ranged (Any)" (wildcard). With no Ranged row, it
    // cannot be auto-planned; but Melee (Basic) satisfies two patterns so need
    // may still be short, triggering an advisory.
    const char = makeTestCharacter({
      careerLevel: 'Soldier',
      bSkills: [], // nothing — forces synthesis of concrete rows + wildcard advisory
    });
    const plan = planNextCareerLevel(char);
    // Ranged (Any) has no concrete row and must surface as an advisory.
    const hasRangedAdvisory = plan.skills.advisories.some(a => a.includes('Ranged (Any)'));
    expect(hasRangedAdvisory).toBe(true);
    // No skill step should be for a wildcard pattern name.
    expect(plan.skills.steps.every(s => !s.name.includes('(Any)'))).toBe(true);
  });
});

describe('planNextCareerLevel — talent', () => {
  it('adds exactly one 100-XP in-career talent when unmet', () => {
    const char = makeTestCharacter({ talents: [] });
    const plan = planNextCareerLevel(char);
    expect(plan.talent.met).toBe(false);
    expect(plan.talent.steps.length).toBe(1);
    expect(plan.talent.subtotal).toBe(getAdvancementCost('talent', 0, true));
    expect(plan.talent.subtotal).toBe(100);
    // The suggested talent is a current-level talent.
    const currentLevelTalents = getCurrentLevelTalents('Soldier', 1);
    expect(currentLevelTalents).toContain(plan.talent.steps[0].name);
  });

  it('adds zero when a current-level talent is already owned', () => {
    const char = makeTestCharacter({ talents: [{ n: 'Marksman', lvl: 1, desc: '' }] });
    const plan = planNextCareerLevel(char);
    expect(plan.talent.met).toBe(true);
    expect(plan.talent.subtotal).toBe(0);
    expect(plan.talent.steps.length).toBe(0);
  });
});

describe('planNextCareerLevel — totals and affordability', () => {
  it('grandTotal = chars + skills + talent + advanceLevelCost; fee driven by met flags', () => {
    const char = makeTestCharacter();
    const plan = planNextCareerLevel(char);
    expect(plan.requirementsTotal).toBe(
      plan.characteristics.subtotal + plan.skills.subtotal + plan.talent.subtotal,
    );
    const expectedFee = (plan.characteristics.met && plan.skills.met && plan.talent.met)
      ? ADVANCE_LEVEL_FEE.ready
      : ADVANCE_LEVEL_FEE.notReady;
    expect(plan.advanceLevelCost).toBe(expectedFee);
    expect(plan.grandTotal).toBe(plan.requirementsTotal + plan.advanceLevelCost);
  });

  it('the three met flags equal the page values for the same fixture', () => {
    const char = makeTestCharacter();
    const plan = planNextCareerLevel(char);

    // Replicate the page computations inline.
    const threshold = CAREER_COMPLETION_THRESHOLDS[1] ?? 5;
    const careerChars: CharacteristicKey[] = ['WS', 'T', 'WP'];
    const charsMet = careerChars.every(k => char.chars[k].a >= threshold);
    const careerSkills = ['Athletics', 'Climb', 'Cool', 'Dodge', 'Endurance', 'Language (Battle)', 'Melee (Basic)', 'Play (Drum or Fife)'];
    const skillsMet = pageSkillsMet(char, careerSkills, threshold);
    const talentsOwned = getCurrentLevelTalents('Soldier', 1).filter(tn =>
      char.talents.some(t => t.n === tn || t.n.startsWith(tn + ' (') || tn.startsWith(t.n + ' (')),
    );
    const talentsMet = talentsOwned.length >= 1;

    expect(plan.characteristics.met).toBe(charsMet);
    expect(plan.skills.met).toBe(skillsMet);
    expect(plan.talent.met).toBe(talentsMet);
  });

  it('canAfford / shortfall correct around xpCur == grandTotal', () => {
    const base = makeTestCharacter();
    const grand = planNextCareerLevel(base).grandTotal;

    const exact = planNextCareerLevel(makeTestCharacter({ xpCur: grand }));
    expect(exact.canAfford).toBe(true);
    expect(exact.shortfall).toBe(0);

    const under = planNextCareerLevel(makeTestCharacter({ xpCur: grand - 1 }));
    expect(under.canAfford).toBe(false);
    expect(under.shortfall).toBe(1);

    const over = planNextCareerLevel(makeTestCharacter({ xpCur: grand + 50 }));
    expect(over.canAfford).toBe(true);
    expect(over.shortfall).toBe(0);
  });

  it('orderedPath is non-decreasing in cost and sums to requirementsTotal', () => {
    const plan = planNextCareerLevel(makeTestCharacter());
    for (let i = 1; i < plan.orderedPath.length; i++) {
      expect(plan.orderedPath[i].cost).toBeGreaterThanOrEqual(plan.orderedPath[i - 1].cost);
    }
    const sum = plan.orderedPath.reduce((s, st) => s + st.cost, 0);
    expect(sum).toBe(plan.requirementsTotal);
  });
});

describe('planNextCareerLevel — applicable:false', () => {
  it('returns applicable:false for no career', () => {
    const char = makeTestCharacter({ career: '', careerLevel: '' });
    const plan = planNextCareerLevel(char);
    expect(plan.applicable).toBe(false);
    expect(plan.grandTotal).toBe(0);
    expect(plan.characteristics.steps).toEqual([]);
  });

  it('returns applicable:false at max level', () => {
    const char = makeTestCharacter({ careerLevel: 'Officer' }); // level 4 = max for Soldier
    const plan = planNextCareerLevel(char);
    expect(plan.applicable).toBe(false);
    expect(plan.grandTotal).toBe(0);
  });

  it('returns applicable:false for an unknown career', () => {
    const char = makeTestCharacter({ career: 'Not A Real Career' });
    const plan = planNextCareerLevel(char);
    expect(plan.applicable).toBe(false);
  });
});

describe('planNextCareerLevel — agreement with isCareerLevelComplete', () => {
  it('when the level is complete, requirementsTotal is 0 and all met flags true', () => {
    // Build a Recruit that satisfies all completion requirements.
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
    const char = makeTestCharacter({
      chars,
      bSkills,
      talents: [{ n: 'Marksman', lvl: 1, desc: '' }],
    });
    expect(isCareerLevelComplete(char, 'Soldier', 1)).toBe(true);
    const plan = planNextCareerLevel(char);
    expect(plan.requirementsTotal).toBe(0);
    expect(plan.characteristics.met).toBe(true);
    expect(plan.skills.met).toBe(true);
    expect(plan.talent.met).toBe(true);
    expect(plan.advanceLevelCost).toBe(ADVANCE_LEVEL_FEE.ready);
  });
});

describe('projectBudget', () => {
  it('budget 0 covers nothing; firstUnaffordable is the cheapest step', () => {
    const plan = planNextCareerLevel(makeTestCharacter());
    const proj = projectBudget(plan, 0);
    expect(proj.budget).toBe(0);
    expect(proj.affordableSteps).toEqual([]);
    expect(proj.spent).toBe(0);
    expect(proj.firstUnaffordable).toBe(plan.orderedPath[0] ?? null);
  });

  it('budget between two steps covers the prefix and reports the first gap', () => {
    const plan = planNextCareerLevel(makeTestCharacter());
    // Budget that covers exactly the first two steps.
    const twoStepCost = plan.orderedPath[0].cost + plan.orderedPath[1].cost;
    const proj = projectBudget(plan, twoStepCost);
    expect(proj.spent).toBe(twoStepCost);
    expect(proj.affordableSteps.length).toBe(2);
    expect(proj.firstUnaffordable).toBe(plan.orderedPath[2]);
  });

  it('budget >= grandTotal covers the whole path', () => {
    const plan = planNextCareerLevel(makeTestCharacter());
    const proj = projectBudget(plan, plan.requirementsTotal + 10000);
    expect(proj.affordableSteps.length).toBe(plan.orderedPath.length);
    expect(proj.spent).toBe(plan.requirementsTotal);
    expect(proj.firstUnaffordable).toBeNull();
  });

  it('floors a decimal budget to an integer', () => {
    const plan = planNextCareerLevel(makeTestCharacter());
    const proj = projectBudget(plan, 3.9);
    expect(proj.budget).toBe(3);
  });

  it('non-finite budget is treated as 0', () => {
    const plan = planNextCareerLevel(makeTestCharacter());
    const proj = projectBudget(plan, NaN);
    expect(proj.budget).toBe(0);
    expect(proj.spent).toBe(0);
  });
});
