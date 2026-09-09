// Render tests for TimelineView — the unified event log UI.
// Covers reverse-chronological display, category filtering, empty state, and
// confirm-guarded clear. Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimelineView } from '../TimelineView';
import type { LogEvent } from '../../../types/character';

/**
 * Events are stored oldest-first (append order); TimelineView reverses for
 * display. Timestamps here ascend with array order so the last element is the
 * newest and should appear first in the DOM.
 */
const OLDEST_FIRST: LogEvent[] = [
  {
    id: 'e1',
    timestamp: 1_000,
    category: 'session',
    type: 'session.start',
    summary: 'Session started',
    payload: {},
  },
  {
    id: 'e2',
    timestamp: 2_000,
    category: 'roll',
    type: 'roll.skill',
    summary: 'Rolled Melee (Basic): 34 vs 55 (+2 SL)',
    payload: {},
  },
  {
    id: 'e3',
    timestamp: 3_000,
    category: 'wealth',
    type: 'wealth.ledger',
    summary: 'Spent 5 GC on supplies',
    payload: {},
  },
  {
    id: 'e4',
    timestamp: 4_000,
    category: 'roll',
    type: 'roll.characteristic',
    summary: 'Rolled Weapon Skill: 12 vs 40 (+2 SL)',
    payload: {},
  },
  {
    id: 'e5',
    timestamp: 5_000,
    category: 'combat',
    type: 'combat.attack',
    summary: 'Attacked with hand weapon for 6 damage',
    payload: {},
  },
];

describe('TimelineView', () => {
  it('renders each event summary with a timestamp, newest-first', () => {
    render(<TimelineView events={OLDEST_FIRST} onClear={vi.fn()} />);

    // Every summary is rendered.
    for (const event of OLDEST_FIRST) {
      expect(screen.getByText(event.summary)).toBeInTheDocument();
    }

    // A timestamp representation accompanies each row (local string of the ms value).
    expect(screen.getByText(new Date(5_000).toLocaleString())).toBeInTheDocument();

    // Newest-first ordering: the largest-timestamp event (e5, last in the
    // oldest-first array) must appear before the oldest (e1) in the DOM. Read
    // each row's summary span in DOM order.
    const items = screen.getAllByRole('listitem');
    const summaries = items.map(
      (li) => within(li).getByText(/Rolled|Session|Spent|Attacked/).textContent,
    );
    expect(summaries[0]).toBe('Attacked with hand weapon for 6 damage'); // e5, newest
    expect(summaries[summaries.length - 1]).toBe('Session started'); // e1, oldest
  });

  it('shows all events when no category is selected, and narrows when a chip is toggled', () => {
    render(<TimelineView events={OLDEST_FIRST} onClear={vi.fn()} />);

    // No selection → all five events shown.
    expect(screen.getAllByRole('listitem')).toHaveLength(5);

    const rollChip = screen.getByRole('button', { name: 'Roll' });
    expect(rollChip).toHaveAttribute('aria-pressed', 'false');

    // Select "Roll" → only the two roll events remain.
    fireEvent.click(rollChip);
    expect(rollChip).toHaveAttribute('aria-pressed', 'true');

    expect(screen.getByText('Rolled Melee (Basic): 34 vs 55 (+2 SL)')).toBeInTheDocument();
    expect(screen.getByText('Rolled Weapon Skill: 12 vs 40 (+2 SL)')).toBeInTheDocument();
    // Non-roll summaries are gone.
    expect(screen.queryByText('Session started')).not.toBeInTheDocument();
    expect(screen.queryByText('Spent 5 GC on supplies')).not.toBeInTheDocument();
    expect(screen.queryByText('Attacked with hand weapon for 6 damage')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    // Toggling the same chip off clears the filter → all shown again.
    fireEvent.click(rollChip);
    expect(rollChip).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('Session started')).toBeInTheDocument();
  });

  it('shows the empty state for an empty log and renders no event rows', () => {
    render(<TimelineView events={[]} onClear={vi.fn()} />);

    expect(screen.getByText('No events yet')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    // No clear control when there is nothing to clear.
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
  });

  it('clears via a confirmation dialog: confirm calls onClear, cancel does not', () => {
    const onClear = vi.fn();
    render(<TimelineView events={OLDEST_FIRST} onClear={onClear} />);

    // Cancel path: opening the dialog then cancelling does not call onClear.
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    const dialog = screen.getByRole('dialog', { name: 'Confirmation' });
    expect(
      within(dialog).getByText('Clear the event log? This cannot be undone.'),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onClear).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Confirmation' })).not.toBeInTheDocument();

    // Confirm path: reopen and confirm → onClear fires once.
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    const reopened = screen.getByRole('dialog', { name: 'Confirmation' });
    fireEvent.click(within(reopened).getByRole('button', { name: 'Clear' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
