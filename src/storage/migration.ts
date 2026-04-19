import type { Character, CharacterIndex, CharacterSummary } from '../types/character';
import { BLANK_CHARACTER } from '../types/character';
import { getItem, setItem, removeItem } from './local-storage';

const INDEX_KEY = 'wfrp4e-characters';
const LEGACY_V6_KEY = 'wfrp4e-char';
const LEGACY_KEYS = ['wfrp4e-v5', 'wfrp4e-v4', 'wfrp4e-v3'];

/**
 * Deep merge source into target. For each key in source:
 * - If both values are plain objects, recurse.
 * - If both values are arrays, use source array.
 * - Otherwise use source value.
 * Returns a new object (does not mutate target).
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
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
 * 2. Legacy v6 single-character (`wfrp4e-char` with `_v: 6`) → migrate to multi-char, remove legacy key
 * 3. Pre-v6 data (`wfrp4e-v5`, `wfrp4e-v4`, `wfrp4e-v3`) → deep merge with BLANK_CHARACTER to v6, then migrate to multi-char
 * 4. Fresh install → create empty CharacterIndex
 */
export function runMigration(): void {
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
      if (legacyData && legacyData._v === 6) {
        const character = deepMerge(
          structuredClone(BLANK_CHARACTER) as unknown as Record<string, unknown>,
          legacyData as Record<string, unknown>,
        ) as unknown as Character;
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
          // Deep merge with BLANK_CHARACTER to upgrade to v6
          const upgraded = deepMerge(
            structuredClone(BLANK_CHARACTER) as unknown as Record<string, unknown>,
            oldData as Record<string, unknown>,
          ) as unknown as Character;
          // Force v6
          upgraded._v = 6;
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

export { deepMerge };
