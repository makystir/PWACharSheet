import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProgressionAdvisor } from '../ProgressionAdvisor';
import { AdvancementPage } from '../AdvancementPage';
import type { Character, CharacteristicKey, CharacteristicValue } from '../../../types/character';
import { BLANK_CHARACTER } from '../../../types/character';
import { getEligibleCareers } from '../../../logic/career-eligibility';

const ALL_CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

function makeCharacter(overrides: Partial<Character> = {}): Character {
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

beforeEach(() => {
  try { localStorage.clear(); } catch { /* ignore */ }
});

describe('ProgressionAdvisor — C4 neutral / unreachable states', () => {
  it('renders a neutral prompt when no goal is chosen', () => {
    render(<ProgressionAdvisor character={makeCharacter()} />);
    expect(screen.getByText('Progression Advisor')).toBeInTheDocument();
    expect(screen.getByText(/Pick a goal to see a recommended path/)).toBeInTheDocument();
  });
});

describe('ProgressionAdvisor — C3 goal selection + career-options trigger', () => {
  it('shows the eligible-careers options list only in the none state, minus current', () => {
    render(<ProgressionAdvisor character={makeCharacter()} />);
    expect(screen.getByText(/Eligible careers:/)).toBeInTheDocument();

    // Membership excludes the current career.
    expect(screen.queryByRole('button', { name: /^Soldier$/ })).not.toBeInTheDocument();

    // An eligible target (Guard) is listed.
    const guardBtn = screen.getByText('Guard');
    expect(guardBtn).toBeInTheDocument();
  });

  it('selecting an option sets a career goal and replaces the options list', () => {
    render(<ProgressionAdvisor character={makeCharacter()} />);
    fireEvent.click(screen.getByText('Guard'));

    // Options list disappears once a goal is committed.
    expect(screen.queryByText(/Eligible careers:/)).not.toBeInTheDocument();

    // A costed path (grand total) is now shown.
    expect(screen.getByText('Total to reach goal')).toBeInTheDocument();
  });

  it('eligible options match getEligibleCareers minus current', () => {
    const char = makeCharacter();
    render(<ProgressionAdvisor character={char} />);
    const expected = getEligibleCareers(char.species).filter(c => c !== char.career);
    // Spot-check a handful are present.
    for (const name of expected.slice(0, 3)) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  });
});

describe('ProgressionAdvisor — C1 renders recommendations + tooltips', () => {
  it('renders phase subtotals, grand total, switch fee, each with a tooltip trigger', () => {
    render(<ProgressionAdvisor character={makeCharacter()} />);
    fireEvent.click(screen.getByText('Guard'));

    // Grand total trigger exists and opens a breakdown.
    const grand = screen.getByRole('button', { name: /Progression total to reach goal/ });
    expect(grand).toBeInTheDocument();
    fireEvent.click(grand);
    // The grand-total breakdown tooltip opens (its own id distinguishes it from
    // the help popover, which also has role="tooltip").
    expect(document.getElementById('progression-advisor-grand')).toBeInTheDocument();
    expect(screen.getByText(/Sum of each phase subtotal/)).toBeInTheDocument();
  });

  it('switch fee cell opens a cited breakdown', () => {
    // Different-class target shows the surcharge component.
    render(<ProgressionAdvisor character={makeCharacter()} />);
    fireEvent.click(screen.getByText('Scholar'));

    const feeCell = screen.getByRole('button', { name: /Change career \(different class\)/ });
    fireEvent.click(feeCell);
    // The switch-fee breakdown tooltip (id progression-advisor-fee-1) opens.
    const tooltip = document.getElementById('progression-advisor-fee-1')!;
    expect(tooltip).toBeInTheDocument();
    expect(within(tooltip).getByText(/Different-class surcharge/)).toBeInTheDocument();
    expect(within(tooltip).getAllByText(/Core p\.48/).length).toBeGreaterThan(0);
  });
});

describe('ProgressionAdvisor — C2 read-only / no mutation', () => {
  it('exposes no advance/XP/career-switch mutating control', () => {
    render(<ProgressionAdvisor character={makeCharacter()} />);
    fireEvent.click(screen.getByText('Guard'));

    // No "Advance" or "Switch Career" action buttons inside the panel.
    expect(screen.queryByRole('button', { name: /^Advance/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Switch Career/ })).not.toBeInTheDocument();
    // The read-only "do it" note routes the player to the real controls.
    expect(screen.getByText(/This is a plan only/)).toBeInTheDocument();
  });

  it('entering an XP budget updates the displayed projection', () => {
    render(<ProgressionAdvisor character={makeCharacter()} />);
    fireEvent.click(screen.getByText('Guard'));

    const budget = screen.getByLabelText('Saved XP to project toward goal');
    fireEvent.change(budget, { target: { value: '150' } });
    expect(screen.getByText(/Covers \d+ of \d+ steps, spending/)).toBeInTheDocument();
  });

  it('changing the XP/session rate updates the timeline estimate', () => {
    // Character short on XP so a timeline shows.
    render(<ProgressionAdvisor character={makeCharacter({ xpCur: 0 })} />);
    fireEvent.click(screen.getByText('Guard'));

    const rate = screen.getByLabelText('XP earned per session (estimate)');
    fireEvent.change(rate, { target: { value: '50' } });
    expect(screen.getByText(/session.*at 50 XP\/session \(estimate\)/)).toBeInTheDocument();
  });
});

describe('ProgressionAdvisor — C3 target level picker', () => {
  it('selecting a target career and level updates the rendered path', () => {
    render(<ProgressionAdvisor character={makeCharacter()} storageKey="wfrp-collapse-progression-advisor-test" />);
    fireEvent.click(screen.getByText('Guard'));

    // Open the target-level picker and choose level 2.
    fireEvent.click(screen.getByRole('button', { name: 'Choose target level' }));
    const levelDialog = screen.getByRole('dialog', { name: /Choose a target level/ });
    fireEvent.click(within(levelDialog).getByText(/^2\./));

    // A costed path is still shown (foreign-career level>1 partial).
    expect(screen.getByText('Total to reach goal')).toBeInTheDocument();
  });
});

describe('ProgressionAdvisor — C5 AdvancementPage integration', () => {
  it('renders alongside the planner, XP, and Career Progress with no "What\'s Left This Level"', () => {
    render(
      <AdvancementPage
        character={makeCharacter()}
        update={vi.fn()}
        updateCharacter={vi.fn()}
        totalWounds={12}
        armourPoints={{ head: 0, body: 0, lArm: 0, rArm: 0, lLeg: 0, rLeg: 0, shield: 0 }}
        maxEncumbrance={10}
        coinWeight={0}
      />,
    );

    // Advisor present as a sibling card.
    expect(screen.getByText('Progression Advisor')).toBeInTheDocument();
    // Planner present.
    expect(screen.getByText('Plan: Next Career Level')).toBeInTheDocument();
    // Experience Points + Career Progress sections intact.
    expect(screen.getByText('Experience Points')).toBeInTheDocument();
    expect(screen.getByText('Career Progress')).toBeInTheDocument();
    // The removed duplicated section is not reintroduced.
    expect(screen.queryByText(/What's Left This Level/i)).not.toBeInTheDocument();
  });
});
