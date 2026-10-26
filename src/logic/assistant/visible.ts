import type { Suggestion } from './types';

/**
 * The dismiss/snooze state the pure filter reads (FR-4). The persistence and
 * writes live in the UI's `dismissStore`; this module only READS this shape to
 * compute the visible list. Shared type so the store and the filter agree.
 */
export interface DismissState {
  /** Suggestion ids the player dismissed (suppressed until re-trigger). */
  dismissed: string[];
  /** Suggestion id -> epoch ms until which it is snoozed. */
  snoozedUntil: Record<string, number>;
}

/**
 * Pure dismiss/snooze filter (FR-4). Given the raw engine output, the current
 * dismiss state, and `now` (epoch ms), returns the suggestions that should be
 * visible: drops dismissed ids and snoozed ids whose snooze has not yet expired
 * (`now < snoozedUntil[id]`). Performs NO writes — the store owns persistence.
 *
 * Filtering before the count is taken guarantees the badge count and the panel
 * always agree (FR-4.3).
 */
export function visibleSuggestions(
  raw: Suggestion[],
  dismissState: DismissState,
  now: number,
): Suggestion[] {
  const dismissed = new Set(dismissState.dismissed);
  return raw.filter((s) => {
    if (dismissed.has(s.id)) return false;
    const snoozedUntil = dismissState.snoozedUntil[s.id];
    if (snoozedUntil !== undefined && now < snoozedUntil) return false;
    return true;
  });
}
