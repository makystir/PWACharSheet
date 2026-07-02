/**
 * Backup Service — assembles a bulk backup of all characters with portraits.
 *
 * Collects all characters from the CharacterManager and their portraits from
 * the PortraitStore, assembling them into a single BackupFile payload suitable
 * for download. Processes characters asynchronously with event-loop yielding
 * to keep the UI responsive.
 */

import type {
  BackupFile,
  BackupCharacterEntry,
  BackupResult,
  ProgressCallback,
  SkippedCharacter,
} from './backup-types';
import { listCharacters, loadCharacter } from './character-manager';
import { getPortraitStore } from './portrait-store';
import { blobToBase64 } from './portrait-codec';

/**
 * Collect all characters and portraits, assembling a BackupFile payload.
 * Yields to the event loop between characters to avoid blocking the UI.
 *
 * - If no characters exist, returns an error result.
 * - If a portrait fails to load, the character is included with an empty portrait.
 * - If a character fails to serialize/load, it is skipped and added to the skipped report.
 * - Reports progress via the optional callback after each character is processed.
 */
export async function assembleBackup(
  onProgress?: ProgressCallback
): Promise<BackupResult> {
  const summaries = listCharacters();

  if (summaries.length === 0) {
    return { ok: false, error: 'No characters to back up.' };
  }

  const total = summaries.length;
  const entries: BackupCharacterEntry[] = [];
  const skipped: SkippedCharacter[] = [];

  for (let i = 0; i < total; i++) {
    const summary = summaries[i];

    // Yield to the event loop between each character
    await new Promise<void>((r) => setTimeout(r, 0));

    // Attempt to load the character
    let character;
    try {
      character = loadCharacter(summary.id);
    } catch (err) {
      skipped.push({
        name: summary.name || `Character ${i + 1}`,
        reason: `Failed to load: ${err instanceof Error ? err.message : String(err)}`,
      });
      onProgress?.(i + 1, total);
      continue;
    }

    if (!character) {
      skipped.push({
        name: summary.name || `Character ${i + 1}`,
        reason: 'Character data could not be found or parsed.',
      });
      onProgress?.(i + 1, total);
      continue;
    }

    // Attempt to retrieve portrait
    let portrait = '';
    try {
      const store = getPortraitStore();
      const blobResult = await store.getPortraitBlob(summary.id);
      if (blobResult.ok && blobResult.value) {
        portrait = await blobToBase64(blobResult.value);
      }
    } catch {
      // Portrait failed to load — continue with empty portrait
      portrait = '';
    }

    // Assemble the entry
    try {
      const entry: BackupCharacterEntry = {
        id: summary.id,
        character: JSON.parse(JSON.stringify(character)) as Record<string, unknown>,
        portrait,
      };
      entries.push(entry);
    } catch (err) {
      skipped.push({
        name: summary.name || character.name || `Character ${i + 1}`,
        reason: `Failed to serialize: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    onProgress?.(i + 1, total);
  }

  if (entries.length === 0) {
    return {
      ok: false,
      error: 'All characters failed to process.',
      skipped,
    };
  }

  const payload: BackupFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    characterCount: entries.length,
    characters: entries,
  };

  if (skipped.length > 0) {
    return { ok: true, payload };
  }

  return { ok: true, payload };
}

/**
 * Trigger a file download of the assembled backup payload.
 *
 * Serializes the BackupFile to JSON, creates a Blob, and triggers a download
 * via a temporary anchor element. The filename uses the user's local date/time
 * in the format `wfrp4e-backup_YYYYMMDD-HHmm.json`.
 *
 * Returns `{ ok: true }` on success, or `{ ok: false, error }` if the Blob/URL
 * creation fails (e.g., payload is too large for the browser to handle).
 */
export function downloadBackup(payload: BackupFile): { ok: true } | { ok: false; error: string } {
  try {
    const json = JSON.stringify(payload);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Format filename using local date/time: wfrp4e-backup_YYYYMMDD-HHmm.json
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const filename = `wfrp4e-backup_${year}${month}${day}-${hours}${minutes}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'Backup file is too large to download. Try exporting characters in smaller groups.',
    };
  }
}
