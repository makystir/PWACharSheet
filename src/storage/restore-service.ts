/**
 * Restore service for bulk character backup import.
 * Handles validation, duplicate detection, and sequential character restoration.
 */

import type {
  ValidationResult,
  BackupMetadata,
  BackupCharacterEntry,
  ProgressCallback,
  RestoreSummary,
} from './backup-types';
import { createCharacter, saveCharacter, listCharacters } from './character-manager';
import { getPortraitStore } from './portrait-store';
import { base64ToBlob, isValidPortraitDataUrl } from './portrait-codec';
import type { Character } from '../types/character';

/**
 * Parse and validate a backup file string.
 * Checks JSON validity, version compatibility, structure, and metadata consistency.
 */
export function validateBackupFile(json: string): ValidationResult {
  // 1. Try JSON.parse
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Invalid JSON: failed to parse backup file.' };
  }

  // 2. Must be a non-null, non-array object
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Invalid backup file: expected a JSON object.' };
  }

  const obj = parsed as Record<string, unknown>;

  // 3. Must have a numeric version field
  if (typeof obj.version !== 'number') {
    return { ok: false, error: 'Invalid backup file: missing version field.' };
  }

  // 4. Version must be <= 1
  if (obj.version > 1) {
    return {
      ok: false,
      error: `Unsupported backup version: ${obj.version}. Maximum supported version is 1.`,
    };
  }

  // 5. Must have a characters array
  if (!Array.isArray(obj.characters)) {
    return { ok: false, error: 'Invalid backup file: missing characters array.' };
  }

  // 6. Characters array must not be empty
  if (obj.characters.length === 0) {
    return { ok: false, error: 'Invalid backup file: no characters found.' };
  }

  // 7. If characterCount exists, it must match characters.length
  if (
    'characterCount' in obj &&
    typeof obj.characterCount === 'number' &&
    obj.characterCount !== obj.characters.length
  ) {
    return {
      ok: false,
      error: `Invalid backup file: character count mismatch (metadata says ${obj.characterCount}, file contains ${obj.characters.length}).`,
    };
  }

  // 8. Success
  const metadata: BackupMetadata = {
    version: obj.version,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '',
    characterCount: obj.characters.length,
  };

  return {
    ok: true,
    metadata,
    characters: obj.characters as BackupCharacterEntry[],
  };
}

/**
 * Check which character names in the backup already exist locally.
 * Compares each backup character's name against existing characters from CharacterManager.
 * Returns an array of names that already exist locally.
 */
export function detectDuplicates(backupCharacters: BackupCharacterEntry[]): string[] {
  const existing = listCharacters();
  const existingNames = new Set(existing.map((c) => c.name));

  const duplicates: string[] = [];
  for (const entry of backupCharacters) {
    const name = entry.character.name as string;
    if (name && existingNames.has(name)) {
      duplicates.push(name);
    }
  }

  return duplicates;
}

/**
 * Validate that an individual character entry has the required fields for import.
 * A valid character must have: name (string), species (string), chars (object).
 */
function isValidCharacterEntry(character: Record<string, unknown>): boolean {
  if (!character || typeof character !== 'object') return false;
  if (typeof character.name !== 'string' || character.name.length === 0) return false;
  if (typeof character.species !== 'string' || character.species.length === 0) return false;
  if (!character.chars || typeof character.chars !== 'object' || Array.isArray(character.chars)) return false;
  return true;
}

/**
 * Import all characters from a validated backup, sequentially.
 * Yields to the event loop between characters to avoid blocking the UI.
 * Stops on quota errors, retaining already-saved characters.
 *
 * @param characters - Array of backup character entries (from a validated BackupFile)
 * @param onProgress - Optional callback invoked after each character is processed
 * @returns RestoreSummary with counts and details of the operation
 */
export async function restoreCharacters(
  characters: BackupCharacterEntry[],
  onProgress?: ProgressCallback
): Promise<RestoreSummary> {
  // Get existing character names before starting (for duplicate tracking)
  const existing = listCharacters();
  const existingNames = new Set(existing.map((c) => c.name));

  let imported = 0;
  const skippedDetails: Array<{ nameOrIndex: string; reason: string }> = [];
  const duplicateNames: string[] = [];
  let stoppedByQuota = false;

  const total = characters.length;

  for (let i = 0; i < total; i++) {
    // Yield to event loop for UI responsiveness
    await new Promise((r) => setTimeout(r, 0));

    const entry = characters[i];
    const charData = entry.character;

    // Validate individual character
    if (!charData || !isValidCharacterEntry(charData)) {
      const nameOrIndex = (charData && typeof charData.name === 'string' && charData.name.length > 0)
        ? charData.name
        : `Character at index ${i}`;
      skippedDetails.push({ nameOrIndex, reason: 'Missing required fields (name, species, or chars)' });
      onProgress?.(i + 1, total);
      continue;
    }

    const name = charData.name as string;

    // Track duplicates (character name already exists locally)
    if (existingNames.has(name)) {
      duplicateNames.push(name);
    }

    try {
      // Create character entry with new unique ID
      const newId = createCharacter(name);

      // Prepare character data for saving - strip portrait field (portraits go to IndexedDB)
      const { portrait: _portraitField, ...charWithoutPortrait } = charData;
      const saveData = { ...charWithoutPortrait, portrait: '' } as unknown as Character;

      // Save character data to localStorage
      const result = saveCharacter(newId, saveData);
      if (!result.ok) {
        // Storage write failure - likely quota exceeded
        stoppedByQuota = true;
        // The createCharacter call already wrote to localStorage, but we count it as not imported
        // since saveCharacter (full data) failed
        break;
      }

      // Save portrait to PortraitStore if non-empty and valid data-URL
      const portraitValue = entry.portrait || '';
      if (portraitValue && isValidPortraitDataUrl(portraitValue)) {
        const store = getPortraitStore();
        const blob = base64ToBlob(portraitValue);
        if (blob) {
          await store.savePortrait(newId, blob);
        }
      }

      imported++;
    } catch (err: unknown) {
      // Check for quota-related errors
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('QuotaExceededError') || errorMsg.includes('quota')) {
        stoppedByQuota = true;
        break;
      }
      // Non-quota error: skip this character
      skippedDetails.push({ nameOrIndex: name, reason: errorMsg || 'Unknown error during import' });
    }

    onProgress?.(i + 1, total);
  }

  return {
    imported,
    skipped: skippedDetails.length,
    skippedDetails,
    duplicateNames,
    stoppedByQuota,
  };
}
