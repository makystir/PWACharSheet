import type { Character, ArmourPoints, RangedDamageSBMode } from '../types/character';
import {
  getBonus,
  computeWoundMaximum,
  calculateArmourPointsUnified,
  calculateMaxEncumbrance,
  calculateCoinWeight,
} from './calculators';
import { SPECIES_DATA } from '../data/species';

/**
 * The derived totals shown on a character sheet, computed purely from a
 * Character. Lifted VERBATIM from the inline derivations in
 * src/hooks/useCharacter.ts so that the hook, the GM viewer, and the combat
 * stat block all share one derivation (AC2 "reuse, don't fork"). No React,
 * DOM, or storage dependency.
 */
export interface SheetTotals {
  /** Number of Hardy talent levels (0+). */
  hardyLevel: number;
  /** Number of Strong Back talent levels (0+). */
  strongBackLevel: number;
  /** Number of Sturdy talent levels (0+). */
  sturdyLevel: number;
  /** Wound multiplier from species data (Ogres use 2, default 1). */
  woundMultiplier: number;
  /** Whether the character's wound formula includes SB (species-corrected). */
  effectiveWoundsUseSB: boolean;
  /** Strength Bonus (tens digit of total Strength). */
  SB: number;
  /** Ranged-damage house-rule SB mode. */
  rangedDamageSBMode: RangedDamageSBMode;
  /**
   * Wound maximum breakdown (Core p.36–37: Wounds = SB + 2×TB + WPB, plus
   * Hardy×TB; see calculators.computeWoundMaximum).
   */
  wounds: ReturnType<typeof computeWoundMaximum>;
  /** Worn-only armour points per location (Core p.293). */
  armourPoints: ArmourPoints;
  /** Maximum encumbrance (Core p.293 base SB+TB; p.146 Strong Back / Sturdy). */
  maxEncumbrance: number;
  /** Encumbrance weight contributed by carried coins. */
  coinWeight: number;
}

/**
 * Derive all sheet totals for a character.
 *
 * The talent-level lookups, species wound multiplier / woundsUseSB correction,
 * SB, rangedDamageSBMode, and the four totals (wounds, armour points,
 * max encumbrance, coin weight) are lifted verbatim from useCharacter so
 * consumers compute identical values (AC2). Pure — never reads/writes storage.
 */
export function deriveSheetTotals(character: Character): SheetTotals {
  // Talent levels (verbatim from useCharacter's memos).
  const hardyLevel = character.talents.find(t => t.n === 'Hardy')?.lvl ?? 0;
  const strongBackLevel = character.talents.find(t => t.n === 'Strong Back')?.lvl ?? 0;
  const sturdyLevel = character.talents.find(t => t.n === 'Sturdy')?.lvl ?? 0;

  // Species-derived wound multiplier (Ogres ×2); default 1 when species unknown.
  const speciesData = character.species ? SPECIES_DATA[character.species] : undefined;
  const woundMultiplier = speciesData?.woundMultiplier ?? 1;

  // Use the species' woundsUseSB when the species is known, otherwise the
  // stored value (matches backfillCharacter's species correction).
  const effectiveWoundsUseSB = speciesData ? speciesData.woundsUseSB : character.woundsUseSB;

  const { chars } = character;
  const strength = chars.S.i + chars.S.a + chars.S.b;
  const toughness = chars.T.i + chars.T.a + chars.T.b;
  const willpower = chars.WP.i + chars.WP.a + chars.WP.b;

  const SB = getBonus(strength);
  const rangedDamageSBMode = character.houseRules.rangedDamageSBMode;

  // Wounds — Core p.36–37 (SB + 2×TB + WPB, ×multiplier, + Hardy×TB).
  const wounds = computeWoundMaximum(
    strength,
    toughness,
    willpower,
    hardyLevel,
    effectiveWoundsUseSB,
    woundMultiplier
  );

  // Worn-only AP per WFRP4e Core p.293; re-key APResult -> sheet ArmourPoints
  // identically to useCharacter's armourPoints memo.
  const unified = calculateArmourPointsUnified(character.armour, { filterByWorn: true });
  const armourPoints: ArmourPoints = {
    head: unified.head,
    lArm: unified.leftArm,
    rArm: unified.rightArm,
    body: unified.body,
    lLeg: unified.leftLeg,
    rLeg: unified.rightLeg,
    shield: unified.shield,
  };

  // Max encumbrance — Core p.293 (SB+TB); p.146 (Strong Back +1/lvl, Sturdy +2/lvl).
  const maxEncumbrance = calculateMaxEncumbrance(character.chars, strongBackLevel, sturdyLevel);

  const coinWeight = calculateCoinWeight(character.wGC, character.wSS, character.wD);

  return {
    hardyLevel,
    strongBackLevel,
    sturdyLevel,
    woundMultiplier,
    effectiveWoundsUseSB,
    SB,
    rangedDamageSBMode,
    wounds,
    armourPoints,
    maxEncumbrance,
    coinWeight,
  };
}
