import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PsychologyTracker } from '../PsychologyTracker';
import type { PsychologyTrackerProps } from '../PsychologyTracker';
import type { PsychologyTrait } from '../../../types/character';

/**
 * Unit tests for PsychologyTracker component.
 * Validates: Requirements 11.2, 11.3, 11.4, 12.1–12.7
 */

function renderTracker(overrides: Partial<PsychologyTrackerProps> = {}) {
  const defaultProps: PsychologyTrackerProps = {
    psychologyTraits: [],
    brokenTally: 0,
    wpValue: 40,
    onAddTrait: vi.fn(),
    onRemoveTrait: vi.fn(),
    onIncrementBrokenTally: vi.fn(),
    ...overrides,
  };
  return { ...render(<PsychologyTracker {...defaultProps} />), props: defaultProps };
}

const sampleTraits: PsychologyTrait[] = [
  { id: 'trait-1', type: 'Phobia', target: 'Spiders', rating: 2 },
  { id: 'trait-2', type: 'Animosity', target: 'Greenskins' },
  { id: 'trait-3', type: 'Hatred', target: 'Undead', rating: 3 },
  { id: 'trait-4', type: 'Trauma', target: 'Siege of Middenheim' },
];

describe('PsychologyTracker', () => {
  // ─── Requirement 11.2: Display entries with type, target, rating ───

  describe('rendering trait list (Req 11.2)', () => {
    it('renders empty state when no traits', () => {
      renderTracker({ psychologyTraits: [] });
      expect(screen.getByText('No psychology entries recorded.')).toBeInTheDocument();
    });

    it('renders each trait with its type', () => {
      renderTracker({ psychologyTraits: sampleTraits });
      expect(screen.getByText('Phobia')).toBeInTheDocument();
      expect(screen.getByText('Animosity')).toBeInTheDocument();
      expect(screen.getByText('Hatred')).toBeInTheDocument();
      expect(screen.getByText('Trauma')).toBeInTheDocument();
    });

    it('renders each trait with its target', () => {
      renderTracker({ psychologyTraits: sampleTraits });
      expect(screen.getByText('(Spiders)')).toBeInTheDocument();
      expect(screen.getByText('(Greenskins)')).toBeInTheDocument();
      expect(screen.getByText('(Undead)')).toBeInTheDocument();
      expect(screen.getByText('(Siege of Middenheim)')).toBeInTheDocument();
    });

    it('renders numeric rating when present and > 0', () => {
      renderTracker({ psychologyTraits: sampleTraits });
      expect(screen.getByText('Rating 2')).toBeInTheDocument();
      expect(screen.getByText('Rating 3')).toBeInTheDocument();
    });
  });

  // ─── Requirement 11.3: Display broken tally count ───

  describe('broken tally display (Req 11.3)', () => {
    it('shows the broken tally count', () => {
      renderTracker({ brokenTally: 5 });
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Broken Tally')).toBeInTheDocument();
    });
  });

  // ─── Requirement 11.4: Display phobia threshold ───

  describe('phobia threshold display (Req 11.4)', () => {
    it('shows the WP value as phobia threshold', () => {
      renderTracker({ wpValue: 35 });
      expect(screen.getByText('35')).toBeInTheDocument();
      expect(screen.getByText('Phobia Threshold (WP)')).toBeInTheDocument();
    });
  });

  // ─── Requirement 12.1–12.4: Adding entries prompts for correct input ───

  describe('adding psychology entries (Req 12.1–12.4)', () => {
    it('shows add form when "+ Add Psychology Entry" button is clicked', () => {
      renderTracker();
      fireEvent.click(screen.getByRole('button', { name: /add new psychology entry/i }));
      expect(screen.getByLabelText('Type')).toBeInTheDocument();
    });

    it('selecting Phobia shows target input with phobia placeholder', () => {
      renderTracker();
      fireEvent.click(screen.getByRole('button', { name: /add new psychology entry/i }));
      fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'Phobia' } });
      const input = screen.getByLabelText(/target/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'e.g. Spiders, Heights, Fire');
    });

    it('selecting Animosity shows target input with animosity placeholder', () => {
      renderTracker();
      fireEvent.click(screen.getByRole('button', { name: /add new psychology entry/i }));
      fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'Animosity' } });
      const input = screen.getByLabelText(/target/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'e.g. Greenskins, Elves');
    });

    it('selecting Hatred shows target input with hatred placeholder', () => {
      renderTracker();
      fireEvent.click(screen.getByRole('button', { name: /add new psychology entry/i }));
      fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'Hatred' } });
      const input = screen.getByLabelText(/target/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'e.g. Undead, Skaven');
    });

    it('selecting Trauma shows description input with trauma placeholder', () => {
      renderTracker();
      fireEvent.click(screen.getByRole('button', { name: /add new psychology entry/i }));
      fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'Trauma' } });
      const input = screen.getByLabelText(/description/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Describe the traumatic experience');
    });

    it('calls onAddTrait with correct args when form submitted (without rating)', () => {
      const { props } = renderTracker();
      fireEvent.click(screen.getByRole('button', { name: /add new psychology entry/i }));
      fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'Phobia' } });
      fireEvent.change(screen.getByLabelText(/target/i), { target: { value: 'Fire' } });
      fireEvent.click(screen.getByRole('button', { name: /add psychology entry/i }));
      expect(props.onAddTrait).toHaveBeenCalledWith('Phobia', 'Fire', undefined);
    });

    it('calls onAddTrait with correct args when form submitted (with rating)', () => {
      const { props } = renderTracker();
      fireEvent.click(screen.getByRole('button', { name: /add new psychology entry/i }));
      fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'Hatred' } });
      fireEvent.change(screen.getByLabelText(/target/i), { target: { value: 'Skaven' } });
      fireEvent.change(screen.getByLabelText(/rating/i), { target: { value: '3' } });
      fireEvent.click(screen.getByRole('button', { name: /add psychology entry/i }));
      expect(props.onAddTrait).toHaveBeenCalledWith('Hatred', 'Skaven', 3);
    });
  });

  // ─── Requirement 12.5: Removing an entry ───

  describe('removing entries (Req 12.5)', () => {
    it('calls onRemoveTrait when remove button clicked', () => {
      const { props } = renderTracker({ psychologyTraits: sampleTraits });
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      fireEvent.click(removeButtons[0]);
      expect(props.onRemoveTrait).toHaveBeenCalledWith('trait-1');
    });
  });

  // ─── Requirement 12.6: Increment broken tally ───

  describe('broken tally increment (Req 12.6)', () => {
    it('calls onIncrementBrokenTally when +1 button clicked', () => {
      const { props } = renderTracker({ brokenTally: 2 });
      fireEvent.click(screen.getByRole('button', { name: /increment broken tally/i }));
      expect(props.onIncrementBrokenTally).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Requirement 12.7: Alert when threshold exceeded ───

  describe('phobia acquisition alert (Req 12.7)', () => {
    it('shows alert when brokenTally >= wpValue', () => {
      renderTracker({ brokenTally: 40, wpValue: 40 });
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Phobia has been acquired/i)).toBeInTheDocument();
    });

    it('shows alert when brokenTally exceeds wpValue', () => {
      renderTracker({ brokenTally: 50, wpValue: 40 });
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('does NOT show alert when brokenTally < wpValue', () => {
      renderTracker({ brokenTally: 39, wpValue: 40 });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
