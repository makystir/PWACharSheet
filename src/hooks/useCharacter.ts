import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Character, ArmourPoints, WeaponData, FieldPath, FieldValue } from '../types/character';
import { BLANK_CHARACTER } from '../types/character';
import { saveCharacter } from '../storage/character-manager';
import {
  getBonus,
  calculateTotalWounds,
  calculateArmourPointsUnified,
  calculateMaxEncumbrance,
  calculateCoinWeight,
  syncWoundFields,
} from '../logic/calculators';
import { evaluateFatiguedThreshold } from '../logic/conditions';
import { syncTalentBonuses } from '../logic/talents';
import { SPECIES_DATA } from '../data/species';
import { migrateCharacterArmour } from '../logic/armourMigration';

export interface UseCharacterResult {
  character: Character;
  /**
   * Update a single character field by its dot-notation path. The path is
   * compile-time-checked against `Character` (`FieldPath<Character>`) and the
   * value type is inferred from the addressed leaf (`FieldValue<Character, P>`),
   * so invalid paths or mismatched value types now fail `tsc` instead of
   * becoming silent runtime bugs (spec: state-safety-core, Req 1.1/1.2/1.3).
   * Runtime behavior is unchanged — it still routes through `setNestedValue`.
   * For multi-field / computed mutations use `updateCharacter` instead.
   */
  update: <P extends FieldPath<Character>>(path: P, value: FieldValue<Character, P>) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  /**
   * Synchronously persist the character to storage right now, cancelling any
   * pending debounced auto-save. Pass an explicit character to persist the exact
   * post-mutation state when calling immediately after a setCharacter in the
   * same tick (latestCharRef lags by one effect). Used for discrete money-moves
   * (deposit / withdraw / collect income) so the write cannot be dropped by the
   * debounce race.
   */
  saveNow: (explicit?: Character) => void;
  totalWounds: number;
  armourPoints: ArmourPoints;
  maxEncumbrance: number;
  coinWeight: number;
}

/**
 * Sets a value on an object using dot-notation path.
 * e.g. setNestedValue(obj, "chars.WS.a", 10)
 *
 * Exported for the typed-update equivalence property test (spec:
 * state-safety-core, Req 2.1/2.4): the test asserts the typed `update` produces
 * the same Character this legacy helper produced for the same `(path, value)`.
 */
export function setNestedValue<T extends object>(obj: T, path: string, value: unknown): T {
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
  if (!patched.xpLog) {
    patched.xpLog = [];
  }
  // Optional flavour text (dwarfguide.md p.40 "Physical Attributes"). Backfill to
  // '' for pre-feature saves so it round-trips and is defined on load; no
  // mechanical effect and no persisted-shape break (spec: state-safety-core, Req 2.2).
  if (patched.distinguishingFeature == null) {
    patched.distinguishingFeature = '';
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
  } else {
    // Merge defaults for any newly-added houseRules fields (backward compatibility)
    patched.houseRules = { ...structuredClone(BLANK_CHARACTER.houseRules), ...patched.houseRules };
  }

  // Migrate armour items to expanded format (defaults currentAp, visorOpen, armourType; renames old entries)
  if (patched.armour && patched.armour.length > 0) {
    patched.armour = migrateCharacterArmour(patched.armour);
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
  const speciesDataForWounds = patched.species ? SPECIES_DATA[patched.species] : undefined;
  const woundMultiplier = speciesDataForWounds?.woundMultiplier ?? 1;
  patched = syncWoundFields(patched, hardyLevel, woundMultiplier);

  // Auto-initialize wCur for new characters (wCur=0 means "never initialized" when wound max > 0)
  const totalWounds = calculateTotalWounds(patched.chars, patched.woundsUseSB, hardyLevel, woundMultiplier);
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

  // Reset state when characterId or initialCharacter changes.
  // Intentional setState-in-effect: resyncs the store to a new external
  // character prop (character switch / import).
  useEffect(() => {
    characterIdRef.current = characterId;
    isResettingRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCharacter(backfillCharacter(initialCharacter));
  }, [characterId, initialCharacter]);

  // Ref that always holds the most recent character state (for synchronous access
  // in event handlers). Kept current synchronously via `commit()` below rather
  // than a separate `[character]` effect, so it never lags by one effect
  // (spec: state-safety-core, Req 5.1/5.2).
  const latestCharRef = useRef(character);

  // Tracks whether a debounced save is pending
  const pendingRef = useRef(false);

  /**
   * Central commit path: set `latestCharRef.current` SYNCHRONOUSLY, then queue the
   * React state update. Both `update` and `updateCharacter` route through this so
   * any synchronous persist (flushSave / beforeunload / visibilitychange) in the
   * same tick always reads the just-committed state, eliminating the one-effect
   * lag (spec: state-safety-core, Req 5.1/5.2; design Decision 2).
   */
  const commit = useCallback((next: Character) => {
    latestCharRef.current = next; // synchronous — no one-effect lag
    setCharacter(next);
  }, []);

  // Flush any pending debounced save immediately (reused by beforeunload, visibilitychange, cleanup)
  const flushSave = useCallback(() => {
    if (pendingRef.current) {
      saveCharacter(characterIdRef.current, latestCharRef.current);
      pendingRef.current = false;
    }
  }, []);

  /**
   * Synchronously persist the character now and clear any pending debounce.
   *
   * `latestCharRef` is updated in an effect that runs AFTER render, so right
   * after a `setCharacter` in the same tick it can be stale. Callers that just
   * mutated state (money-moves) pass the exact post-mutation character via
   * `explicit` so the correct value is persisted synchronously and cannot be
   * lost by the debounced auto-save race.
   */
  const saveNow = useCallback((explicit?: Character) => {
    const toSave = explicit ?? latestCharRef.current;
    // Keep the ref coherent so the trailing debounce/flush doesn't re-save stale state.
    if (explicit) {
      latestCharRef.current = explicit;
    }
    saveCharacter(characterIdRef.current, toSave);
    pendingRef.current = false;
  }, []);

  // Auto-save debounced 500ms
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Skip auto-save when character was reset from props (not a user edit).
    // Only this exact prop-driven reset commit is skipped; the flag is cleared
    // immediately so any subsequent user edit re-arms the debounce normally.
    if (isResettingRef.current) {
      isResettingRef.current = false;
      // Keep latestCharRef in sync with the reset state so a later flush that
      // sees no pending edit never re-persists a mismatched character.
      latestCharRef.current = character;
      return;
    }

    // For user edits the ref was already set synchronously by commit(), as are
    // the derived Sync_Pass writes (talent bonuses, wound fields, Fatigued
    // threshold, armour AP) which now route through commit() too. This keeps the
    // ref coherent for any remaining direct setCharacter commits (e.g. the
    // weapons-backfill effect and the prop-driven reset) so flushSave() always
    // sees the current committed state (spec: state-safety-core, Req 4.4).
    latestCharRef.current = character;
    pendingRef.current = true;
    const timer = setTimeout(() => {
      if (pendingRef.current) {
        saveCharacter(characterIdRef.current, character);
        pendingRef.current = false;
      }
    }, 500);

    // Cleanup clears only the pending debounce timer. It intentionally does NOT
    // flush here: this cleanup also runs between rapid successive edits (the
    // effect re-runs on every `character` change), and now that `commit()` keeps
    // `latestCharRef` current in the same tick, a flush-on-cleanup would persist
    // the freshest state on every keystroke and defeat debounce coalescing
    // (spec: state-safety-core, Req 4.2). Unmount and lifecycle flushes are
    // handled by the dedicated effects below, so no pending edit is dropped.
    return () => {
      clearTimeout(timer);
    };
  }, [character, flushSave]);

  // Flush any pending debounced save when the hook unmounts. This cleanup runs
  // ONLY on unmount (flushSave is stable), so it does not fire between rapid
  // edits and cannot cause a redundant write (spec: state-safety-core, Req 4.1).
  useEffect(() => {
    return () => {
      flushSave();
    };
  }, [flushSave]);

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

  // Typed public surface: the path is checked against `Character` and the value
  // type is inferred from the leaf. Runtime is unchanged — `setNestedValue`
  // still takes a `string` path + `unknown` value, so the generic args are
  // widened at this internal boundary only (spec: state-safety-core, Req 1.1/2.1).
  const update = useCallback(
    <P extends FieldPath<Character>>(path: P, value: FieldValue<Character, P>) => {
      // Compute the next state from the always-current ref (kept coherent by
      // commit), then commit it so the ref reflects this edit in the same tick.
      const next = setNestedValue(latestCharRef.current, path, value);
      commit(next);
    },
    [commit]
  );

  const updateCharacter = useCallback((mutator: (char: Character) => Character) => {
    // Mutate a clone of the always-current committed state, then commit the result.
    const next = mutator(structuredClone(latestCharRef.current));
    commit(next);
  }, [commit]);

  // Sync talent bonuses to chars[key].b whenever talents change.
  // Intentional setState-in-effect: keeps derived characteristic bonuses in the
  // single character store consistent when talents change.
  const talentsJson = JSON.stringify(character.talents);
  useEffect(() => {
    // Route the derived write through commit() so the ref reflects the synced
    // talent bonuses and the derived write persists. This runs after the
    // triggering edit already committed, so that edit is never dropped
    // (spec: state-safety-core, Req 4.4). Compute from the always-current ref
    // and short-circuit when nothing changed to avoid a re-render loop.
    const base = latestCharRef.current;
    const synced = syncTalentBonuses(base);
    // Only commit if bonuses actually changed
    const changed = Object.keys(synced.chars).some(
      (k) => synced.chars[k as keyof typeof synced.chars].b !== base.chars[k as keyof typeof base.chars].b
    );
    if (changed) {
      commit(synced);
    }
  }, [talentsJson, commit]);

  // Sync wound component fields whenever chars, woundsUseSB, or hardyLevel change
  const hardyLevel = useMemo(() => {
    const hardy = character.talents.find(t => t.n === 'Hardy');
    return hardy ? hardy.lvl : 0;
  }, [character.talents]);

  // Derive wound multiplier from species data
  const woundMultiplier = useMemo(() => {
    if (!character.species) return 1;
    const speciesData = SPECIES_DATA[character.species];
    return speciesData?.woundMultiplier ?? 1;
  }, [character.species]);

  // Intentional setState-in-effect: keeps derived wound fields in the single
  // character store consistent when chars / woundsUseSB / hardy / multiplier change.
  useEffect(() => {
    // Route the derived wound-field write through commit() so the ref reflects
    // the synced wounds and the derived write persists without dropping the
    // triggering edit (spec: state-safety-core, Req 4.4). Compute from the
    // always-current ref and short-circuit when nothing changed to avoid a
    // re-render loop.
    const base = latestCharRef.current;
    let synced = syncWoundFields(base, hardyLevel, woundMultiplier);

    // Auto-initialize wCur when characteristics first become non-zero
    // (WFRP4e Core p.36–37: Wounds max = SB + 2×TB + WPB, new characters start
    // at maximum Wounds).
    const totalWounds = calculateTotalWounds(synced.chars, synced.woundsUseSB, hardyLevel, woundMultiplier);
    if (synced.wCur === 0 && totalWounds > 0) {
      synced = synced === base ? { ...base, wCur: totalWounds } : { ...synced, wCur: totalWounds };
    }

    if (synced !== base) {
      commit(synced);
    }
  }, [character.chars, character.woundsUseSB, hardyLevel, woundMultiplier, commit]);

  // Evaluate Fatigued→Unconscious threshold after any condition update
  const conditionsJson = JSON.stringify(character.conditions);
  useEffect(() => {
    const base = latestCharRef.current;
    const tChar = base.chars.T;
    const toughnessBonus = getBonus(tChar.i + tChar.a + tChar.b);
    // WFRP4e Core p.170: a character gains a level of Fatigued when they would
    // exceed the Fatigued threshold (Toughness Bonus), converting the excess to
    // Unconscious.
    const result = evaluateFatiguedThreshold(base.conditions, toughnessBonus);
    if (result.applied.length > 0) {
      // Route the derived Fatigued→Unconscious transition through commit() so
      // the ref reflects it and it persists without dropping the triggering
      // edit (spec: state-safety-core, Req 4.4).
      commit({ ...base, conditions: result.conditions });
    }
    // conditionsJson is the intentional deep-compare stand-in for
    // character.conditions (a new array reference every render); depending on
    // the raw array would re-run this on every render, so it is deliberately
    // used in its place. The effect reads the live conditions from
    // latestCharRef.current (a ref, not a dep) so no exhaustive-deps override is
    // needed here.
  }, [conditionsJson, character.chars, commit]);

  // Derive Strong Back and Sturdy levels from talents
  const strongBackLevel = useMemo(() => {
    const sb = character.talents.find(t => t.n === 'Strong Back');
    return sb ? sb.lvl : 0;
  }, [character.talents]);

  const sturdyLevel = useMemo(() => {
    const st = character.talents.find(t => t.n === 'Sturdy');
    return st ? st.lvl : 0;
  }, [character.talents]);

  // Auto-sync character.ap whenever armour list changes (worn-only AP per WFRP4e Core p.293).
  // Intentional setState-in-effect: keeps derived armour points in the single
  // character store consistent when the armour list changes.
  useEffect(() => {
    // Route the derived armour-points write through commit() so the ref reflects
    // the worn-only AP and the derived write persists without dropping the
    // triggering edit (spec: state-safety-core, Req 4.4). Compute from the
    // always-current ref and short-circuit when AP is unchanged to avoid a
    // re-render loop.
    const base = latestCharRef.current;
    // Worn-only AP per WFRP4e Core p.293 (armour only protects while worn).
    const unified = calculateArmourPointsUnified(base.armour, { filterByWorn: true });
    const computed = {
      head: unified.head,
      lArm: unified.leftArm,
      rArm: unified.rightArm,
      body: unified.body,
      lLeg: unified.leftLeg,
      rLeg: unified.rightLeg,
    };
    const ap = base.ap;
    if (
      ap.head === computed.head &&
      ap.lArm === computed.lArm &&
      ap.rArm === computed.rArm &&
      ap.body === computed.body &&
      ap.lLeg === computed.lLeg &&
      ap.rLeg === computed.rLeg
    ) {
      return;
    }
    commit({
      ...base,
      ap: {
        ...base.ap,
        head: computed.head,
        lArm: computed.lArm,
        rArm: computed.rArm,
        body: computed.body,
        lLeg: computed.lLeg,
        rLeg: computed.rLeg,
      },
    });
  }, [character.armour, commit]);

  const totalWounds = useMemo(
    () => calculateTotalWounds(character.chars, character.woundsUseSB, hardyLevel, woundMultiplier),
    [character.chars, character.woundsUseSB, hardyLevel, woundMultiplier]
  );

  const armourPoints = useMemo(
    () => {
      const unified = calculateArmourPointsUnified(character.armour, { filterByWorn: true });
      return {
        head: unified.head,
        lArm: unified.leftArm,
        rArm: unified.rightArm,
        body: unified.body,
        lLeg: unified.leftLeg,
        rLeg: unified.rightLeg,
        shield: unified.shield,
      };
    },
    [character.armour]
  );

  const maxEncumbrance = useMemo(
    () => calculateMaxEncumbrance(character.chars, strongBackLevel, sturdyLevel),
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
    saveNow,
    totalWounds,
    armourPoints,
    maxEncumbrance,
    coinWeight,
  };
}
