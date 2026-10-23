import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CombatReminders } from '../combat/CombatReminders';
import type { CombatReminder } from '../../logic/reminders';

const rollBacked: CombatReminder = {
  id: 'condition:Stunned',
  source: 'condition',
  label: 'Stunned',
  description: 'Endurance Test (Challenging +0) required to remove',
  test: {
    def: { kind: 'skill', skillName: 'Endurance', fallbackChar: 'T' },
    difficulty: 'Challenging',
    rollName: 'Endurance (remove Stunned)',
  },
  citation: 'Core p.169 (Master Condition List): test to remove Stunned.',
};

const informational: CombatReminder = {
  id: 'condition:Blinded',
  source: 'condition',
  label: 'Blinded',
  description: '1 level removed every other round',
  citation: 'Core p.169: Blinded auto-removes.',
};

describe('CombatReminders', () => {
  it('renders nothing for an empty list (zero DOM)', () => {
    const { container } = render(<CombatReminders reminders={[]} onRollReminder={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a Roll button only for reminders with a test', () => {
    render(<CombatReminders reminders={[rollBacked, informational]} onRollReminder={vi.fn()} />);
    expect(screen.getByLabelText('Roll Endurance (remove Stunned)')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Roll /)).toBe(screen.getByLabelText('Roll Endurance (remove Stunned)'));
    // Informational row has no Roll button.
    const blindedRow = screen.getByTestId('reminder-condition:Blinded');
    expect(blindedRow.querySelector('[aria-label^="Roll "]')).toBeNull();
  });

  it('calls onRollReminder with the tapped reminder', () => {
    const onRollReminder = vi.fn();
    render(<CombatReminders reminders={[rollBacked]} onRollReminder={onRollReminder} />);
    fireEvent.click(screen.getByLabelText('Roll Endurance (remove Stunned)'));
    expect(onRollReminder).toHaveBeenCalledTimes(1);
    expect(onRollReminder).toHaveBeenCalledWith(rollBacked);
  });

  it('opens a Tooltip showing the citation when the info button is tapped', () => {
    render(<CombatReminders reminders={[rollBacked]} onRollReminder={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Rule for Stunned'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Core p.169');
  });

  it('shows the label and description for each reminder', () => {
    render(<CombatReminders reminders={[rollBacked]} onRollReminder={vi.fn()} />);
    expect(screen.getByText('Stunned')).toBeInTheDocument();
    expect(screen.getByText('Endurance Test (Challenging +0) required to remove')).toBeInTheDocument();
  });
});
