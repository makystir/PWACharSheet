import { useState, useCallback } from 'react';
import type { Character, CharacterSummary } from '../types/character';
import {
  listCharacters,
  getActiveCharacterId,
  createCharacter as cmCreate,
  loadCharacter,
  saveCharacter,
  setActiveCharacter,
  renameCharacter as cmRename,
  duplicateCharacter as cmDuplicate,
  deleteCharacter as cmDelete,
} from '../storage/character-manager';

export interface UseCharacterManagerResult {
  characters: CharacterSummary[];
  activeId: string;
  activeCharacter: Character | null;
  createCharacter: (name: string) => string;
  switchCharacter: (id: string, currentCharacter?: Character) => void;
  renameCharacter: (id: string, name: string) => void;
  duplicateCharacter: (id: string) => string;
  deleteCharacter: (id: string) => boolean;
  refresh: () => void;
}

export function useCharacterManager(): UseCharacterManagerResult {
  const [characters, setCharacters] = useState<CharacterSummary[]>(() => listCharacters());
  const [activeId, setActiveId] = useState<string>(() => getActiveCharacterId());
  const [activeCharacter, setActiveCharacter_] = useState<Character | null>(() => {
    const id = getActiveCharacterId();
    return id ? loadCharacter(id) : null;
  });

  const refresh = useCallback(() => {
    setCharacters(listCharacters());
    const id = getActiveCharacterId();
    setActiveId(id);
    setActiveCharacter_(id ? loadCharacter(id) : null);
  }, []);

  const createCharacter = useCallback((name: string): string => {
    const id = cmCreate(name);
    setCharacters(listCharacters());
    setActiveId(getActiveCharacterId());
    setActiveCharacter_(loadCharacter(id));
    return id;
  }, []);

  const switchCharacter = useCallback((id: string, currentCharacter?: Character) => {
    // Save current character before switching
    if (currentCharacter && activeId) {
      saveCharacter(activeId, currentCharacter);
    }
    // Load new character
    const loaded = loadCharacter(id);
    if (loaded) {
      setActiveCharacter(id);
      setActiveId(id);
      setActiveCharacter_(loaded);
      setCharacters(listCharacters());
    }
  }, [activeId]);

  const renameCharacter = useCallback((id: string, name: string) => {
    cmRename(id, name);
    setCharacters(listCharacters());
    // If renamed the active character, reload it
    if (id === activeId) {
      const reloaded = loadCharacter(id);
      if (reloaded) setActiveCharacter_(reloaded);
    }
  }, [activeId]);

  const duplicateCharacter = useCallback((id: string): string => {
    const newId = cmDuplicate(id);
    setCharacters(listCharacters());
    return newId;
  }, []);

  const deleteCharacter = useCallback((id: string): boolean => {
    const result = cmDelete(id);
    if (result) {
      setCharacters(listCharacters());
      const newActiveId = getActiveCharacterId();
      setActiveId(newActiveId);
      if (id === activeId || !newActiveId) {
        const loaded = newActiveId ? loadCharacter(newActiveId) : null;
        setActiveCharacter_(loaded);
      }
    }
    return result;
  }, [activeId]);

  return {
    characters,
    activeId,
    activeCharacter,
    createCharacter,
    switchCharacter,
    renameCharacter,
    duplicateCharacter,
    deleteCharacter,
    refresh,
  };
}
