import type { Character } from '../types/character';
import { BLANK_CHARACTER } from '../types/character';

const CURRENT_VERSION = 6;

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
  const character = deepMergeImport(
    structuredClone(BLANK_CHARACTER) as unknown as Record<string, unknown>,
    data,
  ) as unknown as Character;
  character._v = 6;

  return { success: true, character };
}

function deepMergeImport(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
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
  return result;
}
