import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Character, ArmourPoints } from '../types/character';
import { BLANK_CHARACTER } from '../types/character';
import { saveCharacter } from '../storage/character-manager';
import {
  calculateTotalWounds,
  calculateArmourPoints,
  calculateMaxEncumbrance,
  calculateCoinWeight,
} from '../logic/calculators';
import { syncTalentBonuses } from '../logic/talents';

export interface UseCharacterResult {
  character: Character;
  update: (field: string, value: unknown) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  totalWounds: number;
  armourPoints: ArmourPoints;
  maxEncumbrance: number;
  coinWeight: number;
}

/**
 * Sets a value on an object using dot-notation path.
 * e.g. setNestedValue(obj, "chars.WS.a", 10)
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const clone = structuredClone(obj) as Record<string, unknown>;
  const keys = path.split('.');
  let current: Record<string, unknown> = clone;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined || current[key] === null || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return clone;
}

/**
 * Backfill missing fields on characters loaded from storage.
 * Fixes characters saved before bSkills/aSkills defaults were added.
 */
function backfillCharacter(char: Character): Character {
  let patched = { ...char };
  if (!patched.bSkills || patched.bSkills.length === 0) {
    patched.bSkills = structuredClone(BLANK_CHARACTER.bSkills);
  }
  if (!patched.aSkills) {
    patched.aSkills = [];
  } else {
    // Remove legacy empty placeholder slots (from old BLANK_CHARACTER)
    patched.aSkills = patched.aSkills.filter(s => s.n !== '');
  }
  if (!patched.endeavours) {
    patched.endeavours = [];
  }
  // Always sync talent bonuses on load to ensure .b values are correct
  patched = syncTalentBonuses(patched);
  return patched;
}

export function useCharacter(characterId: string, initialCharacter: Character): UseCharacterResult {
  const [character, setCharacter] = useState<Character>(() => backfillCharacter(initialCharacter));
  const characterIdRef = useRef(characterId);

  // Reset state when characterId or initialCharacter changes
  useEffect(() => {
    characterIdRef.current = characterId;
    setCharacter(backfillCharacter(initialCharacter));
  }, [characterId, initialCharacter]);

  // Auto-save debounced 500ms
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      saveCharacter(characterIdRef.current, character);
    }, 500);

    return () => clearTimeout(timer);
  }, [character]);

  const update = useCallback((field: string, value: unknown) => {
    setCharacter((prev) => {
      const updated = setNestedValue(
        prev as unknown as Record<string, unknown>,
        field,
        value
      ) as unknown as Character;
      return updated;
    });
  }, []);

  const updateCharacter = useCallback((mutator: (char: Character) => Character) => {
    setCharacter((prev) => mutator(structuredClone(prev)));
  }, []);

  // Sync talent bonuses to chars[key].b whenever talents change
  const talentsJson = JSON.stringify(character.talents);
  useEffect(() => {
    setCharacter((prev) => {
      const synced = syncTalentBonuses(prev);
      // Only update if bonuses actually changed
      const changed = Object.keys(synced.chars).some(
        (k) => synced.chars[k as keyof typeof synced.chars].b !== prev.chars[k as keyof typeof prev.chars].b
      );
      return changed ? synced : prev;
    });
  }, [talentsJson]);

  // Derive Hardy level and Strong Back level from talents
  const hardyLevel = useMemo(() => {
    const hardy = character.talents.find(t => t.n === 'Hardy');
    return hardy ? hardy.lvl : 0;
  }, [character.talents]);

  const strongBackLevel = useMemo(() => {
    const sb = character.talents.find(t => t.n === 'Strong Back');
    return sb ? sb.lvl : 0;
  }, [character.talents]);

  const sturdyLevel = useMemo(() => {
    const st = character.talents.find(t => t.n === 'Sturdy');
    return st ? st.lvl : 0;
  }, [character.talents]);

  const totalWounds = useMemo(
    () => calculateTotalWounds(character.chars, character.woundsUseSB, hardyLevel),
    [character.chars, character.woundsUseSB, hardyLevel]
  );

  const armourPoints = useMemo(
    () => calculateArmourPoints(character.armour),
    [character.armour]
  );

  const maxEncumbrance = useMemo(
    () => calculateMaxEncumbrance(character.chars, strongBackLevel) + (sturdyLevel * 2),
    [character.chars, strongBackLevel, sturdyLevel]
  );

  const coinWeight = useMemo(
    () => calculateCoinWeight(character.wGC, character.wSS, character.wD),
    [character.wGC, character.wSS, character.wD]
  );

  return {
    character,
    update,
    updateCharacter,
    totalWounds,
    armourPoints,
    maxEncumbrance,
    coinWeight,
  };
}
