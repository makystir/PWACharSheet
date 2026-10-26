import type { DismissState } from '../../logic/assistant/visible';

/**
 * Local-only dismiss/snooze persistence for Assistant suggestions (FR-4 / OQ-5).
 *
 * The on-disk record shares the exact shape the pure `visibleSuggestions`
 * filter reads (`DismissState` in src/logic/assistant/visible.ts) so the store
 * and the filter can never disagree. Persisted to a single `localStorage` key;
 * reads/writes are wrapped in try/catch and degrade to an in-memory default on
 * failure (private browsing / quota), mirroring `Navigation`'s storage handling.
 * NO network, ever (NFR-1).
 */
export type DismissRecord = DismissState;

/** Single `localStorage` key for the dismiss/snooze record (OQ-5). */
export const DISMISS_STORAGE_KEY = 'assistant-dismissals';

/** Snooze duration: a fixed 24 hours (OQ-5). Product/UX choice, no rulebook bearing. */
export const SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000;

function emptyRecord(): DismissRecord {
  return { dismissed: [], snoozedUntil: {} };
}

/**
 * In-memory fallback. Seeded from `localStorage` on module load; kept in sync on
 * every successful write so the store keeps working even after storage starts
 * throwing (quota reached mid-session), exactly like `Navigation`'s collapsed
 * flag degrades gracefully.
 */
let memory: DismissRecord = readFromStorage();

function readFromStorage(): DismissRecord {
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (raw === null) return emptyRecord();
    const parsed = JSON.parse(raw) as Partial<DismissRecord> | null;
    if (parsed === null || typeof parsed !== 'object') return emptyRecord();
    return {
      dismissed: Array.isArray(parsed.dismissed) ? parsed.dismissed : [],
      snoozedUntil:
        parsed.snoozedUntil && typeof parsed.snoozedUntil === 'object'
          ? { ...parsed.snoozedUntil }
          : {},
    };
  } catch {
    // Private browsing / quota / malformed JSON — degrade to empty in-memory.
    return emptyRecord();
  }
}

function persist(record: DismissRecord): void {
  memory = record;
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Private browsing or storage full — keep the in-memory copy and ignore.
  }
}

/** Read accessor returning the current record (fresh from storage when available). */
function read(): DismissRecord {
  memory = readFromStorage();
  return memory;
}

/** Suppress a suggestion id until its underlying condition clears and re-triggers. */
function dismiss(id: string): DismissRecord {
  const current = read();
  if (current.dismissed.includes(id)) return current;
  const next: DismissRecord = {
    dismissed: [...current.dismissed, id],
    snoozedUntil: { ...current.snoozedUntil },
  };
  persist(next);
  return next;
}

/** Snooze a suggestion id for a fixed 24h window from `now` (epoch ms). */
function snooze(id: string, now: number): DismissRecord {
  const current = read();
  const next: DismissRecord = {
    dismissed: [...current.dismissed],
    snoozedUntil: { ...current.snoozedUntil, [id]: now + SNOOZE_DURATION_MS },
  };
  persist(next);
  return next;
}

/**
 * Drop dismissed ids that are no longer emitted by the engine, so a suggestion
 * reappears when its condition re-triggers (FR-4). Snoozed entries whose id is
 * no longer active are pruned too, keeping the record from growing unbounded.
 * Returns the resulting record; a no-op write is skipped.
 */
function pruneDismissed(activeIds: Set<string>): DismissRecord {
  const current = read();
  const dismissed = current.dismissed.filter((id) => activeIds.has(id));
  const snoozedUntil: Record<string, number> = {};
  for (const [id, until] of Object.entries(current.snoozedUntil)) {
    if (activeIds.has(id)) snoozedUntil[id] = until;
  }
  if (
    dismissed.length === current.dismissed.length &&
    Object.keys(snoozedUntil).length === Object.keys(current.snoozedUntil).length
  ) {
    return current; // nothing pruned — avoid a redundant write
  }
  const next: DismissRecord = { dismissed, snoozedUntil };
  persist(next);
  return next;
}

export const dismissStore = {
  read,
  dismiss,
  snooze,
  pruneDismissed,
};
