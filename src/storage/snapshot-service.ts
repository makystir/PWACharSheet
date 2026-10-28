/**
 * Snapshot Service — orchestration for the rolling auto-backup feature
 * (auto-backup design §2, §3, §4).
 *
 * Reuses existing primitives and never duplicates them:
 *   - serialization: `assembleBackup` (backup-service)
 *   - validation + non-destructive import: `validateBackupFile`,
 *     `detectDuplicates`, `restoreCharacters` (restore-service)
 *   - the pure ring/discrepancy logic: `snapshot-logic`
 *   - the live change signal: `onCharacterDataChange` (character-manager)
 *
 * Nothing here changes, wraps, delays, or gates the live save-on-change path,
 * and every write/eval path is wrapped so a failure (quota, private mode,
 * IndexedDB unavailable) degrades gracefully and NEVER throws into the app
 * (FR-A7 / NFR-4).
 *
 * NOTE (future only): a Chromium File System Access persisted-handle
 * auto-export ("option C") is intentionally NOT implemented in v1. No
 * backend / network / telemetry is added anywhere.
 *
 * Reliability feature, no WFRP game mechanics — no rulebook citation applies.
 */

import { assembleBackup } from './backup-service';
import type { ISnapshotStore } from './snapshot-store';
import { onCharacterDataChange } from './character-manager';
import { getCharacterIndex } from './character-manager';
import {
  detectDiscrepancy,
  type LiveState,
  type SnapshotSummary,
} from './snapshot-logic';
import { validateBackupFile, detectDuplicates, restoreCharacters } from './restore-service';
import type { BackupCharacterEntry, RestoreSummary } from './backup-types';

/**
 * Trailing throttle window for snapshot writes (design §2). Rapid successive
 * changes within the window coalesce into one write at the interval boundary.
 * One-line tunable.
 */
export const SNAPSHOT_THROTTLE_MS = 60_000;

/**
 * Take a single snapshot: assemble a full all-characters backup and write it to
 * the snapshot store. An empty roster (`assembleBackup` -> ok:false) writes
 * nothing. Never throws.
 */
export async function takeSnapshot(store: ISnapshotStore): Promise<void> {
  try {
    const result = await assembleBackup();
    if (!result.ok) return; // e.g. no characters — nothing to snapshot
    await store.putSnapshot(result.payload);
  } catch (err) {
    console.warn('[snapshot-service] takeSnapshot failed (non-fatal):', err);
  }
}

/** Handle returned by `startSnapshotController` to tear it down. */
export interface SnapshotController {
  /** Stop the controller: clear timer, unsubscribe, remove lifecycle listeners. */
  stop(): void;
}

/**
 * Start the throttle/flush controller (design §2). Subscribes to the live
 * change signal and snapshots on a trailing throttle; also flushes
 * best-effort on `visibilitychange -> hidden` and `pagehide` when dirty. Never
 * registers a `beforeunload`/`unload` download path (FR-A6).
 */
export function startSnapshotController(store: ISnapshotStore): SnapshotController {
  let dirty = false;
  let writing = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flushNow = async (): Promise<void> => {
    if (!dirty || writing) return;
    writing = true;
    dirty = false;
    try {
      await takeSnapshot(store);
    } finally {
      writing = false;
      // A change that arrived mid-write re-armed `dirty`; it will be caught by
      // the next timer tick or lifecycle flush.
    }
  };

  const onChange = (): void => {
    dirty = true;
    if (timer !== null) return; // already armed — coalesce (trailing throttle)
    timer = setTimeout(() => {
      timer = null;
      void flushNow();
    }, SNAPSHOT_THROTTLE_MS);
    // In Node (tests) a pending timer keeps the event loop alive; unref it so an
    // otherwise-idle process can exit. No-op in browsers (setTimeout returns a
    // number). The timer still fires while the app is running.
    if (typeof (timer as unknown as { unref?: () => void })?.unref === 'function') {
      (timer as unknown as { unref: () => void }).unref();
    }
  };

  const onHidden = (): void => {
    // Best-effort immediate flush only when there is a pending change.
    void flushNow();
  };

  const onVisibilityChange = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      onHidden();
    }
  };

  const unsubscribe = onCharacterDataChange(onChange);

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', onHidden);
  }

  return {
    stop(): void {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      unsubscribe();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', onHidden);
      }
    },
  };
}

// --- Restore (design §4) ---

/** Validated snapshot ready to confirm + restore. */
export interface SnapshotRestorePlan {
  seq: number;
  characterCount: number;
  characterNames: string[];
  duplicateNames: string[];
  characters: BackupCharacterEntry[];
}

export type RestoreOutcome =
  | { ok: true; plan: SnapshotRestorePlan }
  | { ok: false; error: string };

/**
 * Validate a snapshot record (treated as UNTRUSTED input) and build the restore
 * plan for the confirmation dialog. Re-serializes the stored payload and runs
 * it through the same `validateBackupFile` guard an imported file passes
 * through — no embedded content is ever executed. On any failure returns a
 * graceful error with NO live-data change.
 */
export async function restoreFromSnapshot(
  store: ISnapshotStore,
  seq: number,
): Promise<RestoreOutcome> {
  try {
    const got = await store.getSnapshot(seq);
    if (!got.ok) return { ok: false, error: got.error };
    if (got.value === null) {
      return { ok: false, error: 'Snapshot not found.' };
    }

    // Treat the IDB record as untrusted: re-serialize, then validate.
    const json = JSON.stringify(got.value.payload);
    const validation = validateBackupFile(json);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }

    const characters = validation.characters;
    const duplicateNames = detectDuplicates(characters);
    const characterNames = characters
      .map((c) => (typeof c.character.name === 'string' ? c.character.name : ''))
      .filter((n) => n.length > 0);

    return {
      ok: true,
      plan: {
        seq,
        characterCount: validation.metadata.characterCount,
        characterNames,
        duplicateNames,
        characters,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to read snapshot.',
    };
  }
}

/**
 * Perform the actual restore for a validated plan: run the non-destructive
 * `restoreCharacters`, then take a fresh snapshot so the newest snapshot's id
 * set realigns with the new live ids and the launch prompt does not recur
 * (design §3/§4, Finding 9). Never throws.
 */
export async function commitSnapshotRestore(
  store: ISnapshotStore,
  plan: SnapshotRestorePlan,
  onProgress?: (current: number, total: number) => void,
): Promise<RestoreSummary> {
  const summary = await restoreCharacters(plan.characters, onProgress);
  // Realign the newest snapshot with the new live id set (no re-prompt loop).
  await takeSnapshot(store);
  return summary;
}

// --- Launch discrepancy (design §4) ---

/** Prompt descriptor returned when the launch check flags a discrepancy. */
export interface LaunchPrompt {
  seq: number;
  exportedAt: string;
}

/**
 * Read the live index + latest snapshot, project into the pure predicate's
 * inputs, and return a prompt descriptor when a genuine discrepancy exists, or
 * `null` otherwise. Any failure degrades to `null` (no prompt), logging at most
 * a warning. Pure decision lives in `detectDiscrepancy`; this is the only impure
 * (I/O) part.
 */
export async function evaluateLaunchDiscrepancy(
  store: ISnapshotStore,
): Promise<LaunchPrompt | null> {
  try {
    const latest = await store.getLatestSnapshot();
    if (!latest.ok || latest.value === null) return null;

    const index = getCharacterIndex();
    const live: LiveState = { characterIds: index.characters.map((c) => c.id) };
    const snapshot: SnapshotSummary = {
      characterIds: latest.value.payload.characters.map((c) => c.id),
      exportedAt: latest.value.payload.exportedAt,
    };

    const result = detectDiscrepancy(live, snapshot);
    if (!result.discrepancy) return null;

    return {
      seq: latest.value.seq ?? 0,
      exportedAt: result.snapshotExportedAt,
    };
  } catch (err) {
    console.warn('[snapshot-service] launch discrepancy check failed (non-fatal):', err);
    return null;
  }
}
