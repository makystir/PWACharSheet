import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdvancementChecklist } from '../AdvancementChecklist';
import type { AdvancementChecklistProps } from '../AdvancementChecklist';

/**
 * Render tests for AdvancementChecklist (Req 7.1–7.5).
 *
 * The checklist is a presentation layer over AdvancementPage's completion
 * computations. These tests mirror the prop shapes AdvancementPage produces
 * (Core p.44–47: completion thresholds L1 5 … L5 25; charsMet = all chars at
 * threshold; skillsMet = count >= min(8, careerSkills); talentsMet = >=1 owned)
 * and assert the checklist renders those met/outstanding states faithfully.
 */

const CHAR_PROGRESS_ALL_MET = [
  { name: 'WS', advances: 5, met: true },
  { name: 'S', advances: 6, met: true },
];

const CHAR_PROGRESS_PARTIAL = [
  { name: 'WS', advances: 5, met: true },
  { name: 'S', advances: 2, met: false },
  { name: 'Ag', advances: 0, met: false },
];

/** Build props that mirror what AdvancementPage computes for a given level. */
function baseProps(overrides: Partial<AdvancementChecklistProps> = {}): AdvancementChecklistProps {
  return {
    career: 'Soldier',
    careerLevel: 'Recruit',
    charsProgress: CHAR_PROGRESS_ALL_MET,
    charsMet: true,
    skillsWithAdvances: ['Melee (Basic)', 'Athletics'],
    skillsRequired: 2,
    skillsMet: true,
    talentsOwned: ['Combat Reflexes'],
    talentsMet: true,
    completionThreshold: 5,
    isMaxLevel: false,
    ...overrides,
  };
}

function renderChecklist(overrides: Partial<AdvancementChecklistProps> = {}) {
  const props = baseProps(overrides);
  return { ...render(<AdvancementChecklist {...props} />), props };
}

describe('AdvancementChecklist', () => {
  describe('heading and structure (Req 7.1)', () => {
    it('renders the "What\'s Left This Level" heading', () => {
      renderChecklist();
      expect(screen.getByText("What's Left This Level")).toBeInTheDocument();
    });

    it('renders the three requirement rows', () => {
      renderChecklist();
      expect(screen.getByText('Characteristics')).toBeInTheDocument();
      expect(screen.getByText('Skills')).toBeInTheDocument();
      expect(screen.getByText('Talent')).toBeInTheDocument();
    });
  });

  describe('met state reflects completion logic (Req 7.2)', () => {
    it('shows all requirements met for a fully-complete character', () => {
      renderChecklist();
      // No outstanding hints when everything is met.
      expect(screen.queryByText(/^need /)).not.toBeInTheDocument();
      expect(screen.queryByText(/more at/)).not.toBeInTheDocument();
      expect(screen.queryByText(/acquire 1 career talent/)).not.toBeInTheDocument();
      // Met counters shown (disambiguate chars via its aria-label).
      expect(
        screen.getByLabelText(/Characteristics requirement: 2 of 2 at 5\+ advances/),
      ).toBeInTheDocument();
    });

    it('shows the correct met / total counters consistent with the props', () => {
      renderChecklist({
        charsProgress: CHAR_PROGRESS_PARTIAL, // 1 of 3 met
        charsMet: false,
        skillsWithAdvances: ['Melee (Basic)'], // 1 met
        skillsRequired: 8,
        skillsMet: false,
        talentsOwned: [],
        talentsMet: false,
      });
      expect(screen.getByText('1 / 3')).toBeInTheDocument(); // characteristics
      expect(screen.getByText('1 / 8')).toBeInTheDocument(); // skills
      expect(screen.getByText('0 / 1')).toBeInTheDocument(); // talent
    });
  });

  describe('outstanding state names what remains (Req 7.3, 7.4)', () => {
    it('lists the outstanding characteristics by name', () => {
      renderChecklist({
        charsProgress: CHAR_PROGRESS_PARTIAL,
        charsMet: false,
      });
      // Outstanding chars are S and Ag.
      expect(screen.getByText(/need .*S.*Ag/)).toBeInTheDocument();
    });

    it('reports how many more skills are needed at the threshold', () => {
      renderChecklist({
        skillsWithAdvances: ['Melee (Basic)', 'Athletics'], // 2 met
        skillsRequired: 8,
        skillsMet: false,
        completionThreshold: 10,
      });
      // 8 required - 2 met = 6 more at 10+
      expect(screen.getByText(/6 more at 10\+/)).toBeInTheDocument();
    });

    it('prompts to acquire a career talent when none owned', () => {
      renderChecklist({ talentsOwned: [], talentsMet: false });
      expect(screen.getByText(/acquire 1 career talent/)).toBeInTheDocument();
    });

    it('does not clamp skills-remaining below zero when over-met', () => {
      renderChecklist({
        skillsWithAdvances: ['A', 'B', 'C'], // 3 met
        skillsRequired: 2,
        skillsMet: true, // met -> no remaining hint rendered
      });
      expect(screen.queryByText(/more at/)).not.toBeInTheDocument();
    });
  });

  describe('max-level state (Req 7.5)', () => {
    it('shows the max-level message with career context instead of the list', () => {
      renderChecklist({ isMaxLevel: true, career: 'Soldier', careerLevel: 'Sergeant' });
      const status = screen.getByRole('status');
      expect(status).toHaveTextContent('Soldier — Sergeant is at its maximum level.');
      // The checklist rows are not rendered at max level.
      expect(screen.queryByText('Characteristics')).not.toBeInTheDocument();
      expect(screen.queryByText('Skills')).not.toBeInTheDocument();
    });

    it('falls back to a generic max-level message when career is empty', () => {
      renderChecklist({ isMaxLevel: true, career: '', careerLevel: '' });
      expect(screen.getByRole('status')).toHaveTextContent('This career is at its maximum level.');
    });
  });

  describe('updates when advances change (Req 7.2, 7.3)', () => {
    it('re-renders from outstanding to met when props reflect new advances', () => {
      const { rerender } = render(
        <AdvancementChecklist
          {...baseProps({
            charsProgress: CHAR_PROGRESS_PARTIAL,
            charsMet: false,
          })}
        />,
      );
      // Initially outstanding: S and Ag named.
      expect(screen.getByText(/need .*S.*Ag/)).toBeInTheDocument();
      expect(screen.getByText('1 / 3')).toBeInTheDocument();

      // Character gains advances so all three characteristics are now met.
      rerender(
        <AdvancementChecklist
          {...baseProps({
            charsProgress: [
              { name: 'WS', advances: 5, met: true },
              { name: 'S', advances: 5, met: true },
              { name: 'Ag', advances: 5, met: true },
            ],
            charsMet: true,
          })}
        />,
      );
      expect(screen.queryByText(/^need /)).not.toBeInTheDocument();
      expect(screen.getByText('3 / 3')).toBeInTheDocument();
    });

    it('re-renders skills counter and remaining when a skill crosses the threshold', () => {
      const props = baseProps({
        skillsWithAdvances: ['Melee (Basic)'], // 1 met
        skillsRequired: 3,
        skillsMet: false,
        completionThreshold: 5,
      });
      const { rerender } = render(<AdvancementChecklist {...props} />);
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
      expect(screen.getByText(/2 more at 5\+/)).toBeInTheDocument();

      rerender(
        <AdvancementChecklist
          {...baseProps({
            skillsWithAdvances: ['Melee (Basic)', 'Athletics', 'Endurance'], // 3 met
            skillsRequired: 3,
            skillsMet: true,
            completionThreshold: 5,
          })}
        />,
      );
      expect(screen.getByText('3 / 3')).toBeInTheDocument();
      expect(screen.queryByText(/more at/)).not.toBeInTheDocument();
    });
  });

  describe('status markers per row (Req 7.2)', () => {
    it('marks met rows with ✓ and unmet rows with ✗', () => {
      renderChecklist({
        charsMet: true,
        skillsMet: false,
        skillsWithAdvances: [],
        skillsRequired: 8,
        talentsMet: false,
        talentsOwned: [],
      });
      const listItems = screen.getAllByRole('listitem');
      const charsRow = listItems.find(li => within(li).queryByText('Characteristics'));
      const skillsRow = listItems.find(li => within(li).queryByText('Skills'));
      expect(charsRow).toBeDefined();
      expect(skillsRow).toBeDefined();
      expect(within(charsRow as HTMLElement).getByText('✓')).toBeInTheDocument();
      expect(within(skillsRow as HTMLElement).getByText('✗')).toBeInTheDocument();
    });
  });
});
