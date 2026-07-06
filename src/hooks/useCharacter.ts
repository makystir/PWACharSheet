import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Character, ArmourPoints, WeaponData } from '../types/character';
import { BLANK_CHARACTER } from '../types/character';
import { saveCharacter } from '../storage/character-manager';
import {
  calculateTotalWounds,
  calculateArmourPoints,
  calculateMaxEncumbrance,
  calculateCoinWeight,
  syncWoundFields,
} from '../logic/calculators';
import { syncTalentBonuses } from '../logic/talents';
import { SPECIES_DATA } from '../data/species';

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
function setNestedValue<T extends object>(obj: T, path: string, value: unknown): T {
  const clone = structuredClone(obj);
  const keys = path.split('.');
  let current = clone as Record<string, unknown>;

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
 * If weaponsRef is provided, also fixes weapon damage formulas.
 */
export function backfillCharacter(char: Character, weaponsRef?: WeaponData[]): Character {
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
  if (!patched.diseases) {
    patched.diseases = [];
  }
  // Always sync talent bonuses on load to ensure .b values are correct
  patched = syncTalentBonuses(patched);

  // Fix woundsUseSB from species data (corrects old exports that had wrong values)
  if (patched.species) {
    const speciesData = SPECIES_DATA[patched.species];
    if (speciesData) {
      patched.woundsUseSB = speciesData.woundsUseSB;
    }
  }

  if (!patched.houseRules) {
    patched.houseRules = structuredClone(BLANK_CHARACTER.houseRules);
  }

  // Fix weapon damage formulas from old exports that had incorrect values
  // (e.g. bows stored as "1/2SB+N" instead of RAW "+SB+N", slings as "1/2SB+N" instead of "+N")
  if (weaponsRef && patched.weapons && patched.weapons.length > 0) {
    patched.weapons = patched.weapons.map(w => {
      const canonical = weaponsRef.find(ref => ref.name === w.name && ref.group === w.group);
      if (canonical && canonical.damage && w.damage !== canonical.damage) {
        return { ...w, damage: canonical.damage };
      }
      return w;
    });
  }

  // Sync wound component fields on load to fix stale values from localStorage
  const hardy = patched.talents.find(t => t.n === 'Hardy');
  const hardyLevel = hardy ? hardy.lvl : 0;
  patched = syncWoundFields(patched, hardyLevel);

  // Auto-initialize wCur for new characters (wCur=0 means "never initialized" when wound max > 0)
  const totalWounds = calculateTotalWounds(patched.chars, patched.woundsUseSB, hardyLevel);
  if (patched.wCur === 0 && totalWounds > 0) {
    patched.wCur = totalWounds;
  }

  return patched;
}

export function useCharacter(characterId: string, initialCharacter: Character): UseCharacterResult {
  const [character, setCharacter] = useState<Character>(() => backfillCharacter(initialCharacter));
  const characterIdRef = useRef(characterId);

  // Lazy-load weapons data for damage formula backfill
  const weaponsLoadedRef = useRef(false);
  useEffect(() => {
    if (weaponsLoadedRef.current) return;
    import('../data/weapons').then(({ WEAPONS }) => {
      weaponsLoadedRef.current = true;
      setCharacter(prev => {
        if (!prev.weapons || prev.weapons.length === 0) return prev;
        const fixed = prev.weapons.map(w => {
          const canonical = WEAPONS.find(ref => ref.name === w.name && ref.group === w.group);
          if (canonical && canonical.damage && w.damage !== canonical.damage) {
            return { ...w, damage: canonical.damage };
          }
          return w;
        });
        const changed = fixed.some((w, i) => w !== prev.weapons[i]);
        return changed ? { ...prev, weapons: fixed } : prev;
      });
    }).catch(() => { /* WEAPONS backfill is non-critical; character still usable */ });
  }, []);

  // Track whether a reset is in progress to avoid spurious auto-saves
  const isResettingRef = useRef(false);

  // Reset state when characterId or initialCharacter changes
  useEffect(() => {
    characterIdRef.current = characterId;
    isResettingRef.current = true;
    setCharacter(backfillCharacter(initialCharacter));
  }, [characterId, initialCharacter]);

  // Ref that always holds the most recent character state (for synchronous access in event handlers)
  const latestCharRef = useRef(character);
  useEffect(() => {
    latestCharRef.current = character;
  }, [character]);

  // Tracks whether a debounced save is pending
  const pendingRef = useRef(false);

  // Flush any pending debounced save immediately (reused by beforeunload, visibilitychange, cleanup)
  const flushSave = useCallback(() => {
    if (pendingRef.current) {
      saveCharacter(characterIdRef.current, latestCharRef.current);
      pendingRef.current = false;
    }
  }, []);

  // Auto-save debounced 500ms
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Skip auto-save when character was reset from props (not a user edit)
    if (isResettingRef.current) {
      isResettingRef.current = false;
      return;
    }

    pendingRef.current = true;
    const timer = setTimeout(() => {
      if (pendingRef.current) {
        saveCharacter(characterIdRef.current, character);
        pendingRef.current = false;
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      flushSave();
    };
  }, [character]);

  // Flush pending save when the browser tab is closed, page is reloaded, or app is backgrounded
  useEffect(() => {
    const handleBeforeUnload = () => flushSave();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushSave();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushSave]);

  const update = useCallback((field: string, value: unknown) => {
    setCharacter((prev) => {
      return setNestedValue(prev, field, value);
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

  // Sync wound component fields whenever chars, woundsUseSB, or hardyLevel change
  const hardyLevel = useMemo(() => {
    const hardy = character.talents.find(t => t.n === 'Hardy');
    return hardy ? hardy.lvl : 0;
  }, [character.talents]);

  useEffect(() => {
    setCharacter(prev => {
      let synced = syncWoundFields(prev, hardyLevel);

      // Auto-initialize wCur when characteristics first become non-zero
      const totalWounds = calculateTotalWounds(synced.chars, synced.woundsUseSB, hardyLevel);
      if (synced.wCur === 0 && totalWounds > 0) {
        synced = synced === prev ? { ...prev, wCur: totalWounds } : { ...synced, wCur: totalWounds };
      }

      return synced === prev ? prev : synced;
    });
  }, [character.chars, character.woundsUseSB, hardyLevel]);

  // Derive Strong Back and Sturdy levels from talents
  const strongBackLevel = useMemo(() => {
    const sb = character.talents.find(t => t.n === 'Strong Back');
    return sb ? sb.lvl : 0;
  }, [character.talents]);

  const sturdyLevel = useMemo(() => {
    const st = character.talents.find(t => t.n === 'Sturdy');
    return st ? st.lvl : 0;
  }, [character.talents]);

  // Auto-sync character.ap whenever armour list changes
  useEffect(() => {
    setCharacter(prev => {
      const computed = calculateArmourPoints(prev.armour);
      const ap = prev.ap;
      if (
        ap.head === computed.head &&
        ap.lArm === computed.lArm &&
        ap.rArm === computed.rArm &&
        ap.body === computed.body &&
        ap.lLeg === computed.lLeg &&
        ap.rLeg === computed.rLeg
      ) {
        return prev;
      }
      return {
        ...prev,
        ap: {
          ...prev.ap,
          head: computed.head,
          lArm: computed.lArm,
          rArm: computed.rArm,
          body: computed.body,
          lLeg: computed.lLeg,
          rLeg: computed.rLeg,
        },
      };
    });
  }, [character.armour]);

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
