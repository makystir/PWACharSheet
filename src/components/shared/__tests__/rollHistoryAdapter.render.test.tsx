import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RollHistoryPanel } from '../RollHistoryPanel';
import { rollEventsToHistory } from '../rollHistoryAdapter';
import type { LogEvent, RollEventPayload } from '../../../types/character';

/**
 * Regression test for task 8.4 (unified-event-log): roll display is now sourced
 * from the unified event log via `rollEventsToHistory`, then rendered by the
 * unchanged `RollHistoryPanel`. This exercises the ADAPTER path end-to-end and
 * asserts no regression in roll display: newest-first ordering, the skill/char
 * name + roll value showing, and clear behaviour staying intact.
 *
 * _Requirements: 4.4_
 */

/** Build a roll-category LogEvent with an inline RollEventPayload. */
function rollEvent(
  id: string,
  timestamp: number,
  payload: RollEventPayload,
): LogEvent {
  return {
    id,
    timestamp,
    category: 'roll',
    type: 'roll.skill',
    summary: `${payload.name} ${payload.roll}/${payload.target}`,
    payload: payload as unknown as Record<string, unknown>,
  };
}

describe('rollHistoryAdapter → RollHistoryPanel (event-log-sourced roll display)', () => {
  // Stored oldest-first, as the event log stores them (distinct timestamps).
  const events: LogEvent[] = [
    rollEvent('e1', 1000, { name: 'Dodge', roll: 10, target: 50, sl: 4, passed: true }),
    rollEvent('e2', 2000, { name: 'Athletics', roll: 55, target: 60, sl: 1, passed: true }),
    rollEvent('e3', 3000, { name: 'Cool', roll: 88, target: 40, sl: -5, passed: false }),
  ];

  it('renders roll entries newest-first (adapter reverses oldest-first → newest-first)', () => {
    const adapted = rollEventsToHistory(events);
    render(<RollHistoryPanel history={adapted} onClear={vi.fn()} defaultExpanded />);

    // Newest event (Cool, ts 3000) should appear before Athletics before Dodge.
    const skillNames = screen.getAllByText(/Cool|Athletics|Dodge/);
    expect(skillNames[0]).toHaveTextContent('Cool');
    expect(skillNames[1]).toHaveTextContent('Athletics');
    expect(skillNames[2]).toHaveTextContent('Dodge');
  });

  it('shows each roll\'s skill/char name and roll value', () => {
    const adapted = rollEventsToHistory(events);
    render(<RollHistoryPanel history={adapted} onClear={vi.fn()} defaultExpanded />);

    // Names.
    expect(screen.getByText('Cool')).toBeInTheDocument();
    expect(screen.getByText('Athletics')).toBeInTheDocument();
    expect(screen.getByText('Dodge')).toBeInTheDocument();

    // Roll values (rendered by the panel from result.roll).
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('55')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('clicking "Clear History" calls the onClear callback', () => {
    const onClear = vi.fn();
    const adapted = rollEventsToHistory(events);
    render(<RollHistoryPanel history={adapted} onClear={onClear} defaultExpanded />);

    fireEvent.click(screen.getByRole('button', { name: /clear history/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('ignores non-roll events when sourcing history', () => {
    const mixed: LogEvent[] = [
      ...events,
      {
        id: 'adv1',
        timestamp: 4000,
        category: 'advancement',
        type: 'advancement.skill',
        summary: 'XP: Advance Dodge 4→5',
        payload: {},
      },
    ];
    const adapted = rollEventsToHistory(mixed);
    // Only the 3 roll events survive the category filter.
    expect(adapted).toHaveLength(3);

    render(<RollHistoryPanel history={adapted} onClear={vi.fn()} defaultExpanded />);
    expect(screen.getByText(/Roll History \(3\)/)).toBeInTheDocument();
  });
});
