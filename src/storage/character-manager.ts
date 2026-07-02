import type { Character, CharacterIndex, CharacterSummary } from '../types/character';
import { BLANK_CHARACTER } from '../types/character';
import { getItem, setItem, removeItem } from './local-storage';
import type { StorageWriteResult } from './local-storage';
import { migrateCorruptionData } from '../logic/corruption';
import { ensureCareerSkillsExist } from '../logic/advancement';
import { CAREER_SCHEMES } from '../data/careers';
import type { CareerLevel, CareerScheme } from '../types/character';
import { getPortraitStore } from './portrait-store';

const INDEX_KEY = 'wfrp4e-characters';
const CHAR_KEY_PREFIX = 'wfrp4e-char-';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function charKey(id: string): string {
  return `${CHAR_KEY_PREFIX}${id}`;
}

export function getCharacterIndex(): CharacterIndex {
  const raw = getItem(INDEX_KEY);
  if (!raw) {
    return { activeId: '', characters: [] };
  }
  try {
    return JSON.parse(raw) as CharacterIndex;
  } catch {
    return { activeId: '', characters: [] };
  }
}

export function saveCharacterIndex(index: CharacterIndex): StorageWriteResult {
  return setItem(INDEX_KEY, JSON.stringify(index));
}

export function createCharacter(name: string): string {
  const id = generateUUID();
  const now = Date.now();

  const character: Character = {
    ...structuredClone(BLANK_CHARACTER),
    name,
  };

  const charResult = setItem(charKey(id), JSON.stringify(character));
  if (!charResult.ok) return id;

  const index = getCharacterIndex();
  const summary: CharacterSummary = {
    id,
    name,
    species: '',
    career: '',
    careerLevel: '',
    lastModified: now,
  };
  index.characters.push(summary);
  if (!index.activeId) {
    index.activeId = id;
  }
  saveCharacterIndex(index);

  return id;
}

export function loadCharacter(id: string): Character | null {
  const raw = getItem(charKey(id));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Character>;
    // Merge with BLANK_CHARACTER to fill in any fields added after the character was saved
    const merged = { ...structuredClone(BLANK_CHARACTER), ...parsed };
    const migrated = migrateCorruptionData(merged);

    // Retroactively ensure career skills exist for the current career level
    if (migrated.career && migrated.careerLevel) {
      const scheme = CAREER_SCHEMES[migrated.career];
      if (scheme) {
        const level = ([scheme.level1, scheme.level2, scheme.level3, scheme.level4] as CareerLevel[])
          .find(l => l.title === migrated.careerLevel);
        if (level) {
          return ensureCareerSkillsExist(migrated, level.skills);
        }
      }
    }
    return migrated;
  } catch {
    return null;
  }
}

export function saveCharacter(id: string, character: Character): StorageWriteResult {
  const result = setItem(charKey(id), JSON.stringify(character));
  if (!result.ok) return result;

  const index = getCharacterIndex();
  const entry = index.characters.find((c) => c.id === id);
  if (entry) {
    entry.lastModified = Date.now();
    entry.name = character.name;
    entry.species = character.species;
    entry.career = character.career;
    entry.careerLevel = character.careerLevel;
    return saveCharacterIndex(index);
  }
  return result;
}

export function renameCharacter(id: string, newName: string): StorageWriteResult {
  // Update stored character
  const character = loadCharacter(id);
  if (character) {
    character.name = newName;
    const result = setItem(charKey(id), JSON.stringify(character));
    if (!result.ok) return result;
  }

  // Update index
  const index = getCharacterIndex();
  const entry = index.characters.find((c) => c.id === id);
  if (entry) {
    entry.name = newName;
    return saveCharacterIndex(index);
  }
  return { ok: true };
}

export function duplicateCharacter(id: string): string {
  const original = loadCharacter(id);
  if (!original) {
    throw new Error(`Character ${id} not found`);
  }

  const newId = generateUUID();
  const now = Date.now();
  const copy: Character = structuredClone(original);
  copy.name = `${original.name} (Copy)`;

  const charResult = setItem(charKey(newId), JSON.stringify(copy));
  if (!charResult.ok) return newId;

  const index = getCharacterIndex();
  const summary: CharacterSummary = {
    id: newId,
    name: copy.name,
    species: copy.species,
    career: copy.career,
    careerLevel: copy.careerLevel,
    lastModified: now,
  };
  index.characters.push(summary);
  saveCharacterIndex(index);

  return newId;
}

export function deleteCharacter(id: string): boolean {
  const index = getCharacterIndex();
  index.characters = index.characters.filter((c) => c.id !== id);
  removeItem(charKey(id));

  if (index.characters.length === 0) {
    index.activeId = '';
  } else if (index.activeId === id) {
    index.activeId = index.characters[0].id;
  }
  saveCharacterIndex(index);
  return true;
}

export function listCharacters(): CharacterSummary[] {
  return getCharacterIndex().characters;
}

export function getActiveCharacterId(): string {
  return getCharacterIndex().activeId;
}

export function setActiveCharacter(id: string): StorageWriteResult {
  const index = getCharacterIndex();
  index.activeId = id;
  return saveCharacterIndex(index);
}

/**
 * Load a character with portrait merged from IndexedDB.
 *
 * Retrieves the character JSON from localStorage via the existing `loadCharacter`,
 * then fetches the portrait URL from the Portrait Store. If the store is unavailable
 * or the retrieval fails, the portrait field is set to an empty string.
 */
export async function loadCharacterWithPortrait(id: string): Promise<Character | null> {
  const character = loadCharacter(id);
  if (!character) return null;

  const store = getPortraitStore();
  const result = await store.getPortraitURL(id);
  if (result.ok && result.value) {
    character.portrait = result.value;
  } else {
    character.portrait = '';
  }

  return character;
}

/**
 * Save a character, routing the portrait to IndexedDB if provided.
 *
 * Strips the portrait field from the character before persisting to localStorage.
 * If a portraitBlob is provided, it is saved to the Portrait Store separately.
 */
export async function saveCharacterWithPortrait(
  id: string,
  character: Character,
  portraitBlob?: Blob
): Promise<StorageWriteResult> {
  // Create a copy without the portrait field for localStorage
  const { portrait, ...rest } = character;
  const charWithoutPortrait = { ...rest, portrait: '' } as Character;

  const result = saveCharacter(id, charWithoutPortrait);
  if (!result.ok) return result;

  if (portraitBlob) {
    const store = getPortraitStore();
    await store.savePortrait(id, portraitBlob);
  }

  return result;
}

/**
 * Delete a character and its portrait from both localStorage and IndexedDB.
 */
export async function deleteCharacterFull(id: string): Promise<boolean> {
  deleteCharacter(id);

  const store = getPortraitStore();
  await store.deletePortrait(id);

  return true;
}
