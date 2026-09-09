import type { RollHistoryEntry } from '../../hooks/useRollHistory';
import type { LogEvent, RollEventPayload } from '../../types/character';
import { filterByCategory } from '../../logic/event-log';

/**
 * Adapter: unified event log → RollHistoryPanel display shape.
 *
 * Part of the unified-event-log feature (task 6.2). Roll history now lives in
 * `character.eventLog` as `category: 'roll'` events; this module maps those
 * events back into the `RollHistoryEntry` display shape that `RollHistoryPanel`
 * consumes, so the panel's public props and existing tests stay stable.
 *
 * The event log is stored oldest-first; the panel expects newest-first, so
 * `rollEventsToHistory` reverses the filtered list.
 */

/** Category set used to source roll history from the unified event log. */
const ROLL_CATEGORY = new Set<LogEvent['category']>(['roll']);

/**
 * Adapt a single roll-category `LogEvent` into the `RollHistoryEntry` display
 * shape. Only the fields the panel reads (`skillOrCharName`, `roll`,
 * `targetNumber`, `sl`, `passed`) are meaningful; the remainder are filled with
 * reasonable defaults derived from the stored payload.
 *
 * @param event roll-category LogEvent
 * @param index stable index used as the entry `id`
 */
export function rollEventToHistoryEntry(event: LogEvent, index: number): RollHistoryEntry {
  const p = event.payload as Partial<RollEventPayload>;
  const roll = typeof p.roll === 'number' ? p.roll : 0;
  const target = typeof p.target === 'number' ? p.target : 0;
  const sl = typeof p.sl === 'number' ? p.sl : 0;
  const passed = Boolean(p.passed);
  const isCritical = Boolean(p.isCritical);
  const isFumble = Boolean(p.isFumble);
  return {
    id: index,
    result: {
      roll,
      targetNumber: target,
      baseTarget: target,
      difficulty: 'Average',
      passed,
      sl,
      isCritical,
      isFumble,
      isAutoSuccess: false,
      isAutoFailure: false,
      outcome: passed ? 'Success' : 'Failure',
      skillOrCharName: typeof p.name === 'string' ? p.name : '',
      timestamp: event.timestamp,
    },
  };
}

/**
 * Map an event log (oldest-first) to the roll-history display list
 * (newest-first) consumed by `RollHistoryPanel`.
 *
 * Filters to `category: 'roll'` events, adapts each to a `RollHistoryEntry`,
 * and reverses so the most recent roll appears first.
 */
export function rollEventsToHistory(events: LogEvent[]): RollHistoryEntry[] {
  return filterByCategory(events, ROLL_CATEGORY)
    .map(rollEventToHistoryEntry)
    .reverse();
}
