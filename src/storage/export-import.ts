import type { Character } from '../types/character';
import { BLANK_CHARACTER } from '../types/character';
import { getPortraitStore } from './portrait-store';
import { blobToBase64, base64ToBlob, isValidPortraitDataUrl } from './portrait-codec';
import { createCharacter, saveCharacter } from './character-manager';

const CURRENT_VERSION = 7;

const REQUIRED_TOP_LEVEL_KEYS: (keyof Character)[] = [
  '_v', 'name', 'species', 'chars',
];

/**
 * Export a character to a JSON string.
 */
export function exportToJSON(character: Character): string {
  return JSON.stringify(character, null, 2);
}

/**
 * Export a character to the clipboard as JSON.
 */
export async function exportToClipboard(character: Character): Promise<void> {
  const json = JSON.stringify(character, null, 2);
  await navigator.clipboard.writeText(json);
}

/**
 * Export a character as a downloadable JSON file.
 */
export function exportToFile(character: Character): void {
  const json = JSON.stringify(character, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (character.name || 'character').replace(/[^a-zA-Z0-9_-]/g, '_');
  const date = new Date();
  const timestamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
  a.download = `${safeName}_${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import a character from a JSON string.
 * Validates required fields, rejects newer versions, and merges with BLANK_CHARACTER defaults.
 */
export function importFromJSON(json: string): { success: boolean; character?: Character; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { success: false, error: 'Invalid JSON: failed to parse.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { success: false, error: 'Invalid data: expected a JSON object.' };
  }

  const data = parsed as Record<string, unknown>;

  // Check required top-level keys
  for (const key of REQUIRED_TOP_LEVEL_KEYS) {
    if (!(key in data)) {
      return { success: false, error: `Missing required field: "${key}".` };
    }
  }

  // Reject version newer than current
  if (typeof data._v === 'number' && data._v > CURRENT_VERSION) {
    return {
      success: false,
      error: `Unsupported version: ${data._v}. Maximum supported version is ${CURRENT_VERSION}.`,
    };
  }

  // Deep merge with BLANK_CHARACTER to fill missing fields
  const character = deepMergeImport<Character>(
    structuredClone(BLANK_CHARACTER),
    data,
  );
  character._v = 7;

  return { success: true, character };
}

function deepMergeImport<T extends object>(target: T, source: Record<string, unknown>): T {
  const result = { ...target } as Record<string, unknown>;
  for (const key of Object.keys(source)) {
    const tVal = result[key];
    const sVal = source[key];
    if (
      tVal !== null && sVal !== null &&
      typeof tVal === 'object' && typeof sVal === 'object' &&
      !Array.isArray(tVal) && !Array.isArray(sVal)
    ) {
      result[key] = deepMergeImport(tVal as Record<string, unknown>, sVal as Record<string, unknown>);
    } else {
      result[key] = sVal;
    }
  }
  return result as T;
}


/**
 * Export a character to JSON with portrait data included from IndexedDB.
 *
 * Retrieves the portrait Blob from the Portrait Store, converts to base64,
 * and includes it in the exported JSON. If retrieval fails, portrait is set
 * to an empty string.
 */
export async function exportToJSONWithPortrait(character: Character, characterId: string): Promise<string> {
  const store = getPortraitStore();
  let portraitBase64 = '';

  try {
    const result = await store.getPortraitBlob(characterId);
    if (result.ok && result.value) {
      portraitBase64 = await blobToBase64(result.value);
    }
  } catch {
    // If portrait retrieval fails, continue export with empty portrait
    portraitBase64 = '';
  }

  const exportData = { ...character, portrait: portraitBase64 };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Import a character from JSON, routing portrait data to IndexedDB.
 *
 * Parses and validates the JSON using the existing importFromJSON logic,
 * then handles the portrait separately:
 * - If valid portrait and IndexedDB available: stores in PortraitStore, removes from character JSON
 * - If IndexedDB unavailable: retains portrait in character JSON (localStorage fallback)
 * - If invalid base64: discards portrait, continues import without it
 */
export async function importFromJSONWithPortrait(json: string): Promise<{ success: boolean; character?: Character; error?: string }> {
  // Use existing validation and merge logic
  const parseResult = importFromJSON(json);
  if (!parseResult.success || !parseResult.character) {
    return parseResult;
  }

  const character = parseResult.character;
  const portraitValue = character.portrait || '';

  const store = getPortraitStore();

  // Create character entry in localStorage (generates ID and index entry)
  const characterId = createCharacter(character.name);

  // Determine portrait routing
  if (portraitValue && isValidPortraitDataUrl(portraitValue)) {
    // Valid portrait data-URL
    if (!store.isDegraded()) {
      // IndexedDB available: store portrait in PortraitStore, save character without portrait
      const blob = base64ToBlob(portraitValue);
      if (blob) {
        await store.savePortrait(characterId, blob);
      }
      // Remove portrait from character before saving to localStorage
      const charWithoutPortrait = { ...character, portrait: '' };
      saveCharacter(characterId, charWithoutPortrait);
      return { success: true, character: charWithoutPortrait };
    } else {
      // IndexedDB unavailable: retain portrait in character JSON (localStorage fallback)
      saveCharacter(characterId, character);
      return { success: true, character };
    }
  } else if (portraitValue && !isValidPortraitDataUrl(portraitValue)) {
    // Invalid base64: discard portrait, continue import without it
    const charWithoutPortrait = { ...character, portrait: '' };
    saveCharacter(characterId, charWithoutPortrait);
    return { success: true, character: charWithoutPortrait };
  } else {
    // No portrait or empty portrait
    saveCharacter(characterId, character);
    return { success: true, character };
  }
}
