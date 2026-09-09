import type { Character, CharacterIndex, CharacterSummary, LogEvent } from '../types/character';
import { BLANK_CHARACTER } from '../types/character';
import type { RollResult } from '../logic/dice-roller';
import { normaliseEventLog } from '../logic/event-log';
import { getItem, setItem, removeItem } from './local-storage';

const INDEX_KEY = 'wfrp4e-characters';
const LEGACY_V6_KEY = 'wfrp4e-char';
const LEGACY_KEYS = ['wfrp4e-v5', 'wfrp4e-v4', 'wfrp4e-v3'];

/** Global (non-per-character) key the old roll history was stored under. */
const LEGACY_ROLL_HISTORY_KEY = 'wfrp-roll-history';
/** Marker set once the one-time legacy roll migration has run. */
const ROLL_HISTORY_MIGRATED_KEY = 'wfrp-roll-history-migrated';

/** Legacy roll-history entry shape (global store): `{ id, result }`. */
interface LegacyRollEntry {
  id: number;
  result: RollResult;
}

/**
 * Deep merge source into target. For each key in source:
 * - If both values are plain objects, recurse.
 * - If both values are arrays, use source array.
 * - Otherwise use source value.
 * Returns a new object (does not mutate target).
 */
function deepMerge<T extends object>(target: T, source: Record<string, unknown>): T {
  const result = { ...target } as Record<string, unknown>;
  for (const key of Object.keys(source)) {
    const tVal = result[key];
    const sVal = source[key];
    if (
      tVal !== null && sVal !== null &&
      typeof tVal === 'object' && typeof sVal === 'object' &&
      !Array.isArray(tVal) && !Array.isArray(sVal)
    ) {
      result[key] = deepMerge(tVal as Record<string, unknown>, sVal as Record<string, unknown>);
    } else {
      result[key] = sVal;
    }
  }
  return result as T;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function migrateToMultiChar(character: Character): void {
  const id = generateUUID();
  const now = Date.now();

  const charKey = `wfrp4e-char-${id}`;
  setItem(charKey, JSON.stringify(character));

  const summary: CharacterSummary = {
    id,
    name: character.name || 'Unnamed Character',
    species: character.species || '',
    career: character.career || '',
    careerLevel: character.careerLevel || '',
    lastModified: now,
  };

  const index: CharacterIndex = {
    activeId: id,
    characters: [summary],
  };
  setItem(INDEX_KEY, JSON.stringify(index));
}

/**
 * Run migration on app load. Idempotent — skips if multi-char index already exists.
 *
 * Scenarios:
 * 1. Multi-char index exists → skip (already migrated)
 * 2. Legacy single-character (`wfrp4e-char` with `_v: 6`, `_v: 7`, or `_v: 8`) → migrate to multi-char, remove legacy key
 * 3. Pre-v6 data (`wfrp4e-v5`, `wfrp4e-v4`, `wfrp4e-v3`) → deep merge with BLANK_CHARACTER to v8, then migrate to multi-char
 * 4. Fresh install → create empty CharacterIndex
 */
export function runMigration(): void {
  runMultiCharMigration();
  // One-time legacy roll-history import runs AFTER the multi-char migration so
  // the active character (the import target) is guaranteed to exist. (Req 4.5, 4.6)
  migrateLegacyRollHistory();
}

/**
 * Multi-character index migration (formerly the body of `runMigration`).
 *
 * Scenarios:
 * 1. Multi-char index exists → skip (already migrated)
 * 2. Legacy single-character (`wfrp4e-char` with `_v: 6`, `_v: 7`, or `_v: 8`) → migrate to multi-char, remove legacy key
 * 3. Pre-v6 data (`wfrp4e-v5`, `wfrp4e-v4`, `wfrp4e-v3`) → deep merge with BLANK_CHARACTER to v8, then migrate to multi-char
 * 4. Fresh install → create empty CharacterIndex
 */
function runMultiCharMigration(): void {
  // 1. Already migrated?
  const existingIndex = getItem(INDEX_KEY);
  if (existingIndex) {
    try {
      const parsed = JSON.parse(existingIndex);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.characters)) {
        return; // Already in multi-char format
      }
    } catch {
      // Corrupted index — fall through to re-create
    }
  }

  // 2. Legacy v6 single-character
  const legacyV6Raw = getItem(LEGACY_V6_KEY);
  if (legacyV6Raw) {
    try {
      const legacyData = JSON.parse(legacyV6Raw);
      if (legacyData && (legacyData._v === 6 || legacyData._v === 7 || legacyData._v === 8)) {
        const character = deepMerge(structuredClone(BLANK_CHARACTER), legacyData as Record<string, unknown>);
        migrateToMultiChar(character);
        removeItem(LEGACY_V6_KEY);
        return;
      }
    } catch {
      // Corrupted legacy data — fall through
    }
  }

  // 3. Pre-v6 data
  for (const key of LEGACY_KEYS) {
    const raw = getItem(key);
    if (raw) {
      try {
        const oldData = JSON.parse(raw);
        if (oldData && typeof oldData === 'object') {
          // Deep merge with BLANK_CHARACTER to upgrade to the current schema version
          const upgraded = deepMerge(structuredClone(BLANK_CHARACTER), oldData as Record<string, unknown>);
          // Force current schema version
          upgraded._v = 8;
          migrateToMultiChar(upgraded);
          removeItem(key);
          return;
        }
      } catch {
        // Corrupted — try next key
      }
    }
  }

  // 4. Fresh install — create empty index
  const emptyIndex: CharacterIndex = {
    activeId: '',
    characters: [],
  };
  setItem(INDEX_KEY, JSON.stringify(emptyIndex));
}

/**
 * Build a summary string for a migrated roll, mirroring the details the old
 * roll history surfaced (name, roll/target, SL, pass/fail).
 */
function buildRollSummary(r: RollResult): string {
  const name = r.skillOrCharName || 'Roll';
  return `${name}: ${r.roll}/${r.targetNumber} (SL ${r.sl}, ${r.passed ? 'pass' : 'fail'})`;
}

/**
 * One-time migration of the legacy GLOBAL roll history into the ACTIVE
 * character's event log. (Req 4.5, 4.6)
 *
 * The legacy store (`wfrp-roll-history`) was a single global array of
 * `{ id, result }` entries with no character association, stored newest-first.
 * Design decision (design.md §4): attribute all legacy rolls to the currently
 * active character, once. This is a known imperfect attribution because the
 * legacy data had no character to recover from.
 *
 * Behaviour:
 * - If the marker is already set, skip entirely (no duplicate import on re-run).
 * - If no legacy key exists, do nothing (and do not remove a non-existent key).
 * - Otherwise convert entries → `roll` LogEvents, append them to the active
 *   character (oldest-first: legacy is newest-first, so we reverse), save, then
 *   set the marker and remove the legacy key — ONLY after a successful save.
 * - Everything is wrapped in try/catch; on any error the legacy key is left
 *   intact and the function returns without throwing, so app init is never
 *   blocked (consistent with `runMigration`'s best-effort posture).
 *
 * We construct LogEvents directly rather than via `appendEvent` so the original
 * `result.timestamp` is preserved (appendEvent would stamp Date.now()); this
 * keeps the timeline's chronology faithful to when the rolls actually happened.
 */
function migrateLegacyRollHistory(): void {
  try {
    // Marker check → no duplicate import on a second run.
    if (getItem(ROLL_HISTORY_MIGRATED_KEY)) {
      return;
    }

    const legacyRaw = getItem(LEGACY_ROLL_HISTORY_KEY);
    if (!legacyRaw) {
      // Nothing to migrate. Do not remove a non-existent key; leave the marker
      // unset so a future legacy store (unlikely) could still be imported.
      return;
    }

    const parsed = JSON.parse(legacyRaw);
    if (!Array.isArray(parsed)) {
      // Malformed store — leave it intact for manual inspection, don't block init.
      return;
    }

    // Locate the active character via the multi-char index.
    const indexRaw = getItem(INDEX_KEY);
    if (!indexRaw) {
      return;
    }
    const index = JSON.parse(indexRaw) as CharacterIndex;
    const activeId = index?.activeId;
    if (!activeId) {
      // No active character to attribute rolls to (e.g. fresh install). Leave
      // the legacy key intact; a later run (once a character exists) can import.
      return;
    }

    const charKey = `wfrp4e-char-${activeId}`;
    const charRaw = getItem(charKey);
    if (!charRaw) {
      return;
    }
    const character = JSON.parse(charRaw) as Character;

    // Legacy entries are newest-first; the event log is oldest-first, so reverse
    // before appending to keep chronological order sensible.
    const legacyEntries = (parsed as LegacyRollEntry[]).slice().reverse();
    const newEvents: LogEvent[] = [];
    for (const entry of legacyEntries) {
      const r = entry?.result;
      if (!r || typeof r !== 'object') {
        continue;
      }
      newEvents.push({
        id: generateUUID(),
        // Preserve the original roll time when available; fall back to now.
        timestamp: typeof r.timestamp === 'number' ? r.timestamp : Date.now(),
        category: 'roll',
        type: 'roll.generic',
        summary: buildRollSummary(r),
        payload: {
          name: r.skillOrCharName ?? '',
          roll: r.roll,
          target: r.targetNumber,
          sl: r.sl,
          passed: r.passed,
          isCritical: r.isCritical,
          isFumble: r.isFumble,
        },
      });
    }

    const existing = Array.isArray(character.eventLog) ? character.eventLog : [];
    const nextCharacter: Character = {
      ...character,
      // normaliseEventLog applies the cap (rotation) so an oversized combined log
      // is trimmed to the most-recent events. (Req 3.x)
      eventLog: normaliseEventLog([...existing, ...newEvents]),
    };

    const writeResult = setItem(charKey, JSON.stringify(nextCharacter));
    if (!writeResult.ok) {
      // Save failed (quota/unavailable). Leave the legacy key + marker unset so
      // a future run can retry.
      return;
    }

    // Only after a successful save: set the marker and drop the legacy key so
    // new rolls never write there again. (Req 4.6)
    setItem(ROLL_HISTORY_MIGRATED_KEY, '1');
    removeItem(LEGACY_ROLL_HISTORY_KEY);
  } catch {
    // Any failure leaves the legacy key intact and does not block app init.
  }
}

export { deepMerge };
