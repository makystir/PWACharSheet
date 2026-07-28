import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EndOfTurnReportModal } from '../EndOfTurnReportModal';
import type { EndOfTurnReportModalProps } from '../EndOfTurnReportModal';
import type { EndOfTurnEffect, EndOfTurnResult } from '../../../logic/end-of-turn';

function makeProps(overrides: Partial<EndOfTurnReportModalProps> = {}): EndOfTurnReportModalProps {
  const effects: EndOfTurnEffect[] = [
    { type: 'damage', condition: 'Bleeding', amount: 2, description: 'Bleeding 2: lost 2 wounds' },
    { type: 'damage', condition: 'Ablaze', amount: 3, d10Roll: 7, description: 'Ablaze 1: rolled 7 + 0 - 3 TB - 2 AP = 3 wounds' },
    { type: 'reminder', condition: 'Stunned', description: 'Endurance Test (Challenging +0) required to remove' },
    { type: 'remove_condition', condition: 'Surprised', description: 'Surprised removed automatically' },
  ];

  const result: EndOfTurnResult = {
    newWounds: 5,
    removedConditions: ['Surprised'],
    effects,
    roundAdvanced: 4,
  };

  return {
    effects,
    result,
    onApply: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe('EndOfTurnReportModal', () => {
  it('renders the modal with correct round number in title', () => {
    render(<EndOfTurnReportModal {...makeProps()} />);
    expect(screen.getByText('End of Turn — Round 4')).toBeInTheDocument();
  });

  it('displays damage effects section with breakdowns', () => {
    render(<EndOfTurnReportModal {...makeProps()} />);
    expect(screen.getByText('Damage Effects')).toBeInTheDocument();
    expect(screen.getByText('Bleeding 2: lost 2 wounds')).toBeInTheDocument();
    expect(screen.getByText('Ablaze 1: rolled 7 + 0 - 3 TB - 2 AP = 3 wounds')).toBeInTheDocument();
  });

  it('displays reminders section', () => {
    render(<EndOfTurnReportModal {...makeProps()} />);
    expect(screen.getByText('Reminders')).toBeInTheDocument();
    expect(screen.getByText('Stunned: Endurance Test (Challenging +0) required to remove')).toBeInTheDocument();
  });

  it('displays auto-removed section', () => {
    render(<EndOfTurnReportModal {...makeProps()} />);
    expect(screen.getByText('Auto-Removed')).toBeInTheDocument();
    expect(screen.getByText('Surprised')).toBeInTheDocument();
  });

  it('calls onApply when Apply button is clicked', () => {
    const onApply = vi.fn();
    render(<EndOfTurnReportModal {...makeProps({ onApply })} />);
    fireEvent.click(screen.getByTestId('end-of-turn-apply-btn'));
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<EndOfTurnReportModal {...makeProps({ onCancel })} />);
    fireEvent.click(screen.getByLabelText('Cancel end of turn'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when overlay is clicked', () => {
    const onCancel = vi.fn();
    render(<EndOfTurnReportModal {...makeProps({ onCancel })} />);
    fireEvent.click(screen.getByTestId('end-of-turn-modal-overlay'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel on Escape key press', () => {
    const onCancel = vi.fn();
    render(<EndOfTurnReportModal {...makeProps({ onCancel })} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows empty message when effects array is empty', () => {
    const result: EndOfTurnResult = {
      newWounds: 10,
      removedConditions: [],
      effects: [],
      roundAdvanced: 3,
    };
    render(<EndOfTurnReportModal {...makeProps({ effects: [], result })} />);
    expect(screen.getByText('No end-of-turn effects')).toBeInTheDocument();
    // Apply button still present to advance the round
    expect(screen.getByTestId('end-of-turn-apply-btn')).toBeInTheDocument();
  });

  it('does not show damage section when there are no damage effects', () => {
    const effects: EndOfTurnEffect[] = [
      { type: 'reminder', condition: 'Stunned', description: 'Endurance Test (Challenging +0) required to remove' },
    ];
    const result: EndOfTurnResult = {
      newWounds: 10,
      removedConditions: [],
      effects,
      roundAdvanced: 2,
    };
    render(<EndOfTurnReportModal {...makeProps({ effects, result })} />);
    expect(screen.queryByText('Damage Effects')).not.toBeInTheDocument();
    expect(screen.getByText('Reminders')).toBeInTheDocument();
  });

  it('has proper ARIA attributes for accessibility', () => {
    render(<EndOfTurnReportModal {...makeProps()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'End of Turn — Round 4');
  });
});
