/**
 * Log_Service — the single pure module owning the unified event log.
 *
 * The event log (`character.eventLog`) is a per-character, append-only stream of
 * structured `LogEvent` records. It is display/audit only and is NEVER read to
 * reconstruct mechanics (XP totals, advancement undo/redo, treasury balances).
 *
 * Storage convention: events are stored oldest-first (append order); the timeline
 * reverses for display. `appendEvent` is therefore a cheap push + tail-trim.
 *
 * See spec: .kiro/specs/unified-event-log (design.md §2 "Log_Service").
 */
import type { Character, LogCategory, LogEvent } from '../types/character';

/**
 * Maximum number of active LogEvents retained before rotation. (Req 3.1)
 *
 * Chosen above the old roll-history cap (50) and the advancement-archive
 * threshold (100) so the combined stream keeps enough history to be useful,
 * while bounding localStorage growth. Single tunable constant.
 */
export const EVENT_LOG_CAP = 200;

/** Input to {@link appendEvent}; `payload` is optional and defaults to `{}`. */
export interface AppendEventInput {
  category: LogCategory;
  type: string;
  summary: string;
  payload?: Record<string, unknown>;
}

/**
 * Generate a unique string id.
 *
 * Reuses the `crypto.randomUUID()` + fallback pattern already used in
 * `character-manager.ts` so ids are consistent across producers (rolls, mirrors,
 * native events) without a shared counter. (Req 2.2)
 */
function generateEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Enforce the cap, keeping the most-recent events. Pure. (Req 3.2, 3.3, 3.4)
 *
 * Events are stored oldest-first, so the most-recent are at the tail; rotation
 * drops from the front. Returns a new array (never mutates the input).
 */
export function rotate(events: LogEvent[], cap: number = EVENT_LOG_CAP): LogEvent[] {
  if (events.length <= cap) {
    return events.slice();
  }
  return events.slice(events.length - cap);
}

/**
 * Append an event to a character's event log. Returns a NEW character; never
 * mutates the input. (Req 2.1, 2.4)
 *
 * Assigns a unique `id` (Req 2.2), sets `timestamp` to now (Req 2.3), appends
 * preserving order (Req 2.5), then applies {@link rotate} to enforce the cap
 * (Req 3.1–3.4).
 */
export function appendEvent(character: Character, input: AppendEventInput): Character {
  const event: LogEvent = {
    id: generateEventId(),
    timestamp: Date.now(),
    category: input.category,
    type: input.type,
    summary: input.summary,
    payload: input.payload ?? {},
  };
  const nextLog = rotate([...(character.eventLog ?? []), event]);
  return { ...character, eventLog: nextLog };
}

/**
 * Return the log rotated to the cap, defaulting non-array/undefined input to
 * an empty array. Pure — never mutates its input. (Req 10.1, 11.3)
 *
 * Used on character load/import: absent or malformed persisted logs become `[]`
 * (mirrors the defensive parsing in the old `useRollHistory.loadFromStorage`),
 * and oversized imported logs are trimmed to the cap via {@link rotate}.
 */
export function normaliseEventLog(
  events: LogEvent[] | undefined,
  cap: number = EVENT_LOG_CAP,
): LogEvent[] {
  if (!Array.isArray(events)) {
    return [];
  }
  return rotate(events, cap);
}

/**
 * Filter events to those whose category is in the given set. Pure. (Req 8.3, 8.4)
 *
 * An empty or undefined set means "no filter" and returns all events (a new
 * array copy). Otherwise returns the subset whose `category` is selected,
 * preserving order.
 */
export function filterByCategory(
  events: LogEvent[],
  categories?: Set<LogCategory>,
): LogEvent[] {
  if (!categories || categories.size === 0) {
    return events.slice();
  }
  return events.filter((event) => categories.has(event.category));
}

/**
 * Return a NEW character with an emptied event log. (Req 9.3)
 *
 * Only `eventLog` is cleared; all other fields — including the authoritative
 * source-of-truth structures `advancementLog`, `advancementLogArchive`, and
 * `estate.ledger` — are left untouched (they are separate fields, so the spread
 * carries them over by reference). Never mutates the input. (Req 9.4)
 */
export function clearEventLog(character: Character): Character {
  return { ...character, eventLog: [] };
}
