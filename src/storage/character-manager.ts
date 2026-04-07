import type { Character, CharacterIndex, CharacterSummary } from '../types/character';
import { BLANK_CHARACTER } from '../types/character';
import { getItem, setItem, removeItem } from './local-storage';

const INDEX_KEY = 'wfrp4e-characters';
const CHAR_KEY_PREFIX = 'wfrp4e-char-';

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

export function saveCharacterIndex(index: CharacterIndex): void {
  setItem(INDEX_KEY, JSON.stringify(index));
}

export function createCharacter(name: string): string {
  const id = crypto.randomUUID();
  const now = Date.now();

  const character: Character = {
    ...structuredClone(BLANK_CHARACTER),
    name,
  };

  setItem(charKey(id), JSON.stringify(character));

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
    return JSON.parse(raw) as Character;
  } catch {
    return null;
  }
}

export function saveCharacter(id: string, character: Character): void {
  setItem(charKey(id), JSON.stringify(character));

  const index = getCharacterIndex();
  const entry = index.characters.find((c) => c.id === id);
  if (entry) {
    entry.lastModified = Date.now();
    entry.name = character.name;
    entry.species = character.species;
    entry.career = character.career;
    entry.careerLevel = character.careerLevel;
    saveCharacterIndex(index);
  }
}

export function renameCharacter(id: string, newName: string): void {
  // Update stored character
  const character = loadCharacter(id);
  if (character) {
    character.name = newName;
    setItem(charKey(id), JSON.stringify(character));
  }

  // Update index
  const index = getCharacterIndex();
  const entry = index.characters.find((c) => c.id === id);
  if (entry) {
    entry.name = newName;
    saveCharacterIndex(index);
  }
}

export function duplicateCharacter(id: string): string {
  const original = loadCharacter(id);
  if (!original) {
    throw new Error(`Character ${id} not found`);
  }

  const newId = crypto.randomUUID();
  const now = Date.now();
  const copy: Character = structuredClone(original);
  copy.name = `${original.name} (Copy)`;

  setItem(charKey(newId), JSON.stringify(copy));

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
  if (index.characters.length <= 1) {
    return false;
  }

  index.characters = index.characters.filter((c) => c.id !== id);
  removeItem(charKey(id));

  // If we deleted the active character, switch to the first remaining
  if (index.activeId === id) {
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

export function setActiveCharacter(id: string): void {
  const index = getCharacterIndex();
  index.activeId = id;
  saveCharacterIndex(index);
}
