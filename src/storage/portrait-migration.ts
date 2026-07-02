/**
 * Portrait Migration Runner — one-time migration of base64 portraits
 * from localStorage character JSON to the IndexedDB Portrait Store.
 *
 * Safe to call multiple times (idempotent): characters whose portrait
 * field has already been removed are simply skipped.
 */

import { base64ToBlob } from './portrait-codec';
import type { IPortraitStore } from './portrait-store';
import { getItem, setItem } from './local-storage';

const INDEX_KEY = 'wfrp4e-characters';
const CHAR_KEY_PREFIX = 'wfrp4e-char-';

export interface MigrationResult {
  /** Number of characters successfully migrated */
  migrated: number;
  /** Number of characters skipped (no portrait or already migrated) */
  skipped: number;
  /** Character IDs that failed to migrate */
  failed: string[];
}

/**
 * Run portrait migration from localStorage to IndexedDB.
 *
 * Reads all characters from the character index, checks each for a non-empty
 * `portrait` field, converts it to a Blob, and stores it in the Portrait Store.
 * On success the portrait field is removed from the localStorage JSON.
 *
 * If the Portrait Store is in degraded mode, migration is skipped entirely.
 * Individual character failures are recorded but do not block other characters.
 */
export async function runPortraitMigration(
  portraitStore: IPortraitStore
): Promise<MigrationResult> {
  const result: MigrationResult = { migrated: 0, skipped: 0, failed: [] };

  // If IndexedDB is unavailable, skip migration entirely (Req 2.5)
  if (portraitStore.isDegraded()) {
    return result;
  }

  // Read character index to get all character IDs
  const indexRaw = getItem(INDEX_KEY);
  if (!indexRaw) {
    return result;
  }

  let index: { activeId: string; characters: { id: string }[] };
  try {
    index = JSON.parse(indexRaw);
  } catch {
    return result;
  }

  if (!index.characters || !Array.isArray(index.characters)) {
    return result;
  }

  for (const entry of index.characters) {
    const charKey = `${CHAR_KEY_PREFIX}${entry.id}`;
    const charRaw = getItem(charKey);

    if (!charRaw) {
      result.skipped++;
      continue;
    }

    let charJson: Record<string, unknown>;
    try {
      charJson = JSON.parse(charRaw);
    } catch {
      result.skipped++;
      continue;
    }

    // Check for non-empty portrait field (Req 2.6)
    const portrait = charJson.portrait;
    if (!portrait || typeof portrait !== 'string' || portrait.length === 0) {
      result.skipped++;
      continue;
    }

    // Convert base64 to Blob
    const blob = base64ToBlob(portrait);
    if (!blob) {
      // Invalid base64 — treat as failed migration for this character
      result.failed.push(entry.id);
      continue;
    }

    // Attempt to save to IndexedDB (Req 2.1)
    const saveResult = await portraitStore.savePortrait(entry.id, blob);

    if (!saveResult.ok) {
      // Write failure — leave localStorage unchanged (Req 2.4)
      result.failed.push(entry.id);
      continue;
    }

    // Success — remove portrait field from localStorage JSON and re-save (Req 2.2)
    delete charJson.portrait;
    const writeResult = setItem(charKey, JSON.stringify(charJson));

    if (!writeResult.ok) {
      // localStorage write failed — record as failed, portrait is already in IndexedDB
      // but we can't confirm the localStorage side is clean
      result.failed.push(entry.id);
      continue;
    }

    result.migrated++;
  }

  return result;
}
