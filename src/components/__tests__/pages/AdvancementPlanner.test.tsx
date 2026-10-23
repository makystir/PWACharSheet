import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdvancementPlanner } from '../../pages/AdvancementPlanner';
import { planNextCareerLevel } from '../../../logic/advancement-planner';
import type { NextLevelPlan } from '../../../logic/advancement-planner';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, CharacteristicKey, CharacteristicValue } from '../../../types/character';

const ALL_CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

// Suppress the reused career-advancement HelpPopover auto-open.
beforeEach(() => {
  localStorage.setItem('wfrp-hint-dismissed-career-advancement', '3');
});
afterEach(() => {
  localStorage.clear();
});

function makeCharacter(overrides: Partial<Character> = {}): Character {
  const chars = Object.fromEntries(
    ALL_CHAR_KEYS.map(key => [key, { i: 30, a: 0, b: 0 }]),
  ) as Record<CharacteristicKey, CharacteristicValue>;
  return {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Test',
    class: 'Warriors',
    career: 'Soldier',
    careerLevel: 'Recruit',
    status: 'Silver 1',
    chars,
    xpCur: 100,
    xpSpent: 0,
    xpTotal: 100,
    bSkills: [],
    aSkills: [],
    talents: [],
    ...overrides,
  };
}

function renderPlanner(plan: NextLevelPlan, char = makeCharacter()) {
  return render(
    <AdvancementPlanner plan={plan} career={char.career} careerLevel={char.careerLevel} />,
  );
}

describe('AdvancementPlanner', () => {
  it('renders requirement subtotals and grand total, each with a breakdown tooltip trigger', () => {
    const char = makeCharacter();
    const plan = planNextCareerLevel(char);
    renderPlanner(plan, char);

    // Three requirement tooltip triggers + the grand total, each a role=button
    // whose aria-label describes the additive breakdown.
    const charsTrigger = screen.getByRole('button', { name: /Characteristics cost to complete/i });
    const skillsTrigger = screen.getByRole('button', { name: /Skills cost to complete/i });
    const talentTrigger = screen.getByRole('button', { name: /Talent cost to complete/i });
    const grandTrigger = screen.getByRole('button', { name: /Grand total/i });

    expect(charsTrigger).toBeInTheDocument();
    expect(skillsTrigger).toBeInTheDocument();
    expect(talentTrigger).toBeInTheDocument();
    expect(grandTrigger).toBeInTheDocument();

    // Opening the grand total shows the additive A + B + C + D = Total text.
    fireEvent.click(grandTrigger);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent(
      `Characteristics ${plan.characteristics.subtotal} + Skills ${plan.skills.subtotal} + Talent ${plan.talent.subtotal} + Advance-level ${plan.advanceLevelCost} = ${plan.grandTotal} XP`,
    );
  });

  it('opening a requirement tooltip shows its per-step breakdown', () => {
    const char = makeCharacter();
    const plan = planNextCareerLevel(char);
    renderPlanner(plan, char);

    fireEvent.click(screen.getByRole('button', { name: /Characteristics cost to complete/i }));
    const tooltip = screen.getByRole('tooltip');
    // Additive formula ending in the subtotal.
    expect(tooltip).toHaveTextContent(`= ${plan.characteristics.subtotal} XP`);
  });

  it('affordability summary flips between can-afford and need-more', () => {
    // Not affordable (xpCur 100 << grandTotal).
    const poorChar = makeCharacter({ xpCur: 100 });
    const poorPlan = planNextCareerLevel(poorChar);
    const { unmount } = renderPlanner(poorPlan, poorChar);
    expect(screen.getByText(/Need \d+ more XP/i)).toBeInTheDocument();
    unmount();

    // Affordable (huge xpCur).
    const richChar = makeCharacter({ xpCur: 100000 });
    const richPlan = planNextCareerLevel(richChar);
    renderPlanner(richPlan, richChar);
    expect(screen.getByText(/You can afford it/i)).toBeInTheDocument();
  });

  it('renders a neutral state with no cost figures when applicable is false', () => {
    const maxChar = makeCharacter({ careerLevel: 'Officer' }); // max level
    const plan = planNextCareerLevel(maxChar);
    expect(plan.applicable).toBe(false);
    renderPlanner(plan, maxChar);

    expect(screen.getByRole('status')).toBeInTheDocument();
    // No requirement/grand-total tooltip triggers.
    expect(screen.queryByRole('button', { name: /cost to complete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Grand total/i })).not.toBeInTheDocument();
  });

  it('shows the budget projection when a number is entered and hides it when cleared', () => {
    const char = makeCharacter();
    const plan = planNextCareerLevel(char);
    renderPlanner(plan, char);

    const input = screen.getByLabelText(/XP budget to project/i);

    // Enough to cover the first step.
    fireEvent.change(input, { target: { value: '10' } });
    expect(screen.getByText(/Covers \d+ of \d+ advances/i)).toBeInTheDocument();
    // The running "spent" total has a breakdown tooltip trigger.
    expect(screen.getByRole('button', { name: /Spent \d+ XP of a \d+ budget/i })).toBeInTheDocument();

    // Clearing hides the projection.
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.queryByText(/Covers \d+ of \d+ advances/i)).not.toBeInTheDocument();
  });

  it('per-step path costs are plain text (no tooltip trigger), only running totals get tooltips', () => {
    const char = makeCharacter();
    const plan = planNextCareerLevel(char);
    renderPlanner(plan, char);

    // The path list exists.
    expect(screen.getByText(/Cheapest path/i)).toBeInTheDocument();
    // The only role=button tooltip triggers are the 3 requirements + grand total
    // (the budget "spent" appears only when a budget is entered).
    const triggers = screen.getAllByRole('button').filter(b => {
      const label = b.getAttribute('aria-label') ?? '';
      return /cost to complete|Grand total|Spent/i.test(label);
    });
    expect(triggers.length).toBe(4);
  });
});
