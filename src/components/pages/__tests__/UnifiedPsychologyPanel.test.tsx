import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UnifiedPsychologyPanel } from '../UnifiedPsychologyPanel';
import type { UnifiedPsychologyPanelProps } from '../UnifiedPsychologyPanel';
import type { PsychologyTrait } from '../../../types/character';
import { ALL_PSYCHOLOGY_TYPES, PSYCHOLOGY_REMINDERS } from '../../../logic/psychology';

/**
 * Unit tests for UnifiedPsychologyPanel component.
 * Validates: Requirements 1.2, 2.4, 3.1, 3.2, 3.3, 4.2, 8.1
 */

function renderPanel(overrides: Partial<UnifiedPsychologyPanelProps> = {}) {
  const defaultProps: UnifiedPsychologyPanelProps = {
    psychologyTraits: [],
    brokenTally: 0,
    wpValue: 40,
    onAddTrait: vi.fn(),
    onRemoveTrait: vi.fn(),
    onIncrementBrokenTally: vi.fn(),
    ...overrides,
  };
  return { ...render(<UnifiedPsychologyPanel {...defaultProps} />), props: defaultProps };
}

const sampleTraits: PsychologyTrait[] = [
  { id: 'trait-1', type: 'Phobia', target: 'Spiders' },
  { id: 'trait-2', type: 'Animosity', target: 'Greenskins' },
  { id: 'trait-3', type: 'Fear', target: '', rating: 2 },
];

describe('UnifiedPsychologyPanel', () => {
  // ─── Requirement 1.2: Form shows all 8 types in dropdown ───

  describe('type dropdown (Req 1.2)', () => {
    it('shows all 8 psychology types as selectable options', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: /add new psychology trait/i }));
      const select = screen.getByLabelText('Type') as HTMLSelectElement;
      const options = Array.from(select.querySelectorAll('option'))
        .map((o) => o.value)
        .filter((v) => v !== '');
      expect(options).toHaveLength(8);
      for (const type of ALL_PSYCHOLOGY_TYPES) {
        expect(options).toContain(type);
      }
    });
  });

  // ─── Requirement 2.4: Frenzy submits without target/rating ───

  describe('Frenzy submission (Req 2.4)', () => {
    it('submits Frenzy without needing target or rating', () => {
      const { props } = renderPanel();
      fireEvent.click(screen.getByRole('button', { name: /add new psychology trait/i }));
      fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'Frenzy' } });
      const submitBtn = screen.getByRole('button', { name: /add psychology trait/i });
      expect(submitBtn).not.toBeDisabled();
      fireEvent.click(submitBtn);
      expect(props.onAddTrait).toHaveBeenCalledWith('Frenzy', '', undefined);
    });
  });

  // ─── Requirement 3.1, 3.2: Broken Tally display and increment ───

  describe('Broken Tally (Req 3.1, 3.2)', () => {
    it('displays the current broken tally value', () => {
      renderPanel({ brokenTally: 7 });
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('Broken Tally')).toBeInTheDocument();
    });

    it('displays WP threshold value', () => {
      renderPanel({ wpValue: 35 });
      expect(screen.getByText('35')).toBeInTheDocument();
      expect(screen.getByText('Phobia Threshold (WP)')).toBeInTheDocument();
    });

    it('calls onIncrementBrokenTally when increment button clicked', () => {
      const { props } = renderPanel({ brokenTally: 3 });
      fireEvent.click(screen.getByRole('button', { name: /increment broken tally/i }));
      expect(props.onIncrementBrokenTally).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Requirement 3.3: Alert banner when brokenTally >= wpValue ───

  describe('Phobia acquisition alert (Req 3.3)', () => {
    it('shows alert banner when brokenTally equals wpValue', () => {
      renderPanel({ brokenTally: 40, wpValue: 40 });
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Phobia has been acquired/i)).toBeInTheDocument();
    });

    it('shows alert banner when brokenTally exceeds wpValue', () => {
      renderPanel({ brokenTally: 50, wpValue: 40 });
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('does NOT show alert when brokenTally < wpValue', () => {
      renderPanel({ brokenTally: 39, wpValue: 40 });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  // ─── Requirement 4.2: Rule reminder preview on type selection ───

  describe('rule reminder preview (Req 4.2)', () => {
    it('shows rule reminder when a type is selected in the form', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: /add new psychology trait/i }));
      fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'Frenzy' } });
      expect(screen.getByLabelText('Rule reminder preview')).toBeInTheDocument();
      expect(screen.getByText(PSYCHOLOGY_REMINDERS['Frenzy'])).toBeInTheDocument();
    });

    it('does not show reminder when no type is selected', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: /add new psychology trait/i }));
      expect(screen.queryByLabelText('Rule reminder preview')).not.toBeInTheDocument();
    });
  });

  // ─── Remove button calls onRemoveTrait with correct id ───

  describe('removing traits', () => {
    it('calls onRemoveTrait with the correct trait id', () => {
      const { props } = renderPanel({ psychologyTraits: sampleTraits });
      const removeBtn = screen.getByRole('button', { name: /Remove Phobia trait: Spiders/i });
      fireEvent.click(removeBtn);
      expect(props.onRemoveTrait).toHaveBeenCalledWith('trait-1');
    });

    it('calls onRemoveTrait with second trait id', () => {
      const { props } = renderPanel({ psychologyTraits: sampleTraits });
      const removeBtn = screen.getByRole('button', { name: /Remove Animosity trait: Greenskins/i });
      fireEvent.click(removeBtn);
      expect(props.onRemoveTrait).toHaveBeenCalledWith('trait-2');
    });
  });

  // ─── Requirement 8.1: Submit disabled when form is incomplete ───

  describe('submit validation (Req 8.1)', () => {
    it('submit disabled when no type is selected', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: /add new psychology trait/i }));
      const submitBtn = screen.getByRole('button', { name: /add psychology trait/i });
      expect(submitBtn).toBeDisabled();
    });

    it('submit disabled when target-requiring type has empty target', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: /add new psychology trait/i }));
      fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'Phobia' } });
      const submitBtn = screen.getByRole('button', { name: /add psychology trait/i });
      expect(submitBtn).toBeDisabled();
    });

    it('submit disabled when rating-requiring type has no rating', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: /add new psychology trait/i }));
      fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'Fear' } });
      const submitBtn = screen.getByRole('button', { name: /add psychology trait/i });
      expect(submitBtn).toBeDisabled();
    });

    it('submit enabled when target-requiring type has a target filled', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: /add new psychology trait/i }));
      fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'Phobia' } });
      fireEvent.change(screen.getByLabelText(/target/i), { target: { value: 'Fire' } });
      const submitBtn = screen.getByRole('button', { name: /add psychology trait/i });
      expect(submitBtn).not.toBeDisabled();
    });

    it('submit enabled when rating-requiring type has a valid rating', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: /add new psychology trait/i }));
      fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'Terror' } });
      fireEvent.change(screen.getByLabelText(/rating/i), { target: { value: '3' } });
      const submitBtn = screen.getByRole('button', { name: /add psychology trait/i });
      expect(submitBtn).not.toBeDisabled();
    });
  });
});
