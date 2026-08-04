import type { Character, CharacteristicKey, CharacteristicValue, ArmourItem, ArmourPoints } from '../types/character';
import { getRuneAPBonus } from './runes';

/**
 * Returns the bonus (tens digit) for a characteristic value.
 */
export function getBonus(value: number): number {
  return Math.floor(value / 10);
}

/**
 * Core wound calculation — single source of truth.
 * Both syncWoundFields and computeWoundMaximum delegate here.
 *
 * Formula: ((woundsUseSB ? floor(S/10) : 0) + 2×floor(T/10) + floor(WP/10)) × multiplier + Hardy×floor(T/10)
 *
 * The multiplier is applied to the base formula BEFORE Hardy is added.
 * For Ogres (multiplier=2), Hardy is still added after doubling.
 *
 * @param strength - Total strength characteristic value
 * @param toughness - Total toughness characteristic value
 * @param willpower - Total willpower characteristic value
 * @param hardyLevel - Number of Hardy talent levels (0+)
 * @param woundsUseSB - Whether species uses SB in wound formula
 * @param multiplier - Wound multiplier (default 1, Ogres use 2)
 * @returns Object with total and individual component values
 */
function calculateWoundsCore(
  strength: number,
  toughness: number,
  willpower: number,
  hardyLevel: number,
  woundsUseSB: boolean,
  multiplier: number = 1
): { total: number; sb: number; tb: number; wpb: number; hardy: number } {
  const sbRaw = Math.floor(strength / 10);
  const tbRaw = Math.floor(toughness / 10);
  const wpbRaw = Math.floor(willpower / 10);

  const sb = woundsUseSB ? sbRaw : 0;
  const tb = 2 * tbRaw;
  const wpb = wpbRaw;
  const base = (sb + tb + wpb) * multiplier;
  const hardy = hardyLevel * tbRaw;
  const total = base + hardy;

  return { total, sb, tb, wpb, hardy };
}

/**
 * Calculates total wounds using the WFRP 4e formula:
 * ((SB if woundsUseSB) + 2×TB + WPB) × multiplier + Hardy×TB
 * - Humans/Dwarves/Elves (woundsUseSB=true, multiplier=1): SB + 2×TB + WPB + Hardy×TB
 * - Halflings (woundsUseSB=false, multiplier=1): 2×TB + WPB + Hardy×TB
 * - Ogres (woundsUseSB=true, multiplier=2): (SB + 2×TB + WPB) × 2 + Hardy×TB
 * Result is always a non-negative integer.
 */
export function calculateTotalWounds(
  chars: Record<CharacteristicKey, CharacteristicValue>,
  woundsUseSB: boolean,
  hardyLevel: number,
  multiplier: number = 1
): number {
  const strength = chars.S.i + chars.S.a + chars.S.b;
  const toughness = chars.T.i + chars.T.a + chars.T.b;
  const willpower = chars.WP.i + chars.WP.a + chars.WP.b;

  const { total } = calculateWoundsCore(strength, toughness, willpower, hardyLevel, woundsUseSB, multiplier);
  return Math.max(0, total);
}

/**
 * Recomputes the wound component fields (wSB, wTB2, wWPB, wHardy) from the
 * character's current characteristics and Hardy talent level.
 * Returns the same reference if no field changed, avoiding unnecessary re-renders.
 * Never modifies wCur — it is a user-entered value.
 *
 * Note: wSB always stores the raw strength bonus regardless of the character's
 * woundsUseSB setting. The conditional inclusion happens at total computation time.
 * Delegates to calculateWoundsCore with woundsUseSB=true to obtain raw SB.
 */
export function syncWoundFields(character: Character, hardyLevel: number, multiplier: number = 1): Character {
  const { chars } = character;

  const strength = chars.S.i + chars.S.a + chars.S.b;
  const toughness = chars.T.i + chars.T.a + chars.T.b;
  const willpower = chars.WP.i + chars.WP.a + chars.WP.b;

  // Always pass woundsUseSB=true so sb returns the raw strength bonus
  const core = calculateWoundsCore(strength, toughness, willpower, hardyLevel, true, multiplier);

  const wSB = core.sb;
  const wTB2 = core.tb;
  const wWPB = core.wpb;
  const wHardy = core.hardy;

  if (
    character.wSB === wSB &&
    character.wTB2 === wTB2 &&
    character.wWPB === wWPB &&
    character.wHardy === wHardy
  ) {
    return character;
  }

  return { ...character, wSB, wTB2, wWPB, wHardy };
}

/**
 * Result of wound maximum computation with formula breakdown.
 */
export interface WoundMaxResult {
  total: number;
  sb: number;   // floor(S/10) or 0 if !woundsUseSB
  tb: number;   // 2 × floor(T/10)
  wpb: number;  // floor(WP/10)
  hardy: number; // Hardy × floor(T/10)
}

/**
 * Computes wound maximum with a full formula breakdown.
 * Delegates to calculateWoundsCore and returns the WoundMaxResult shape.
 *
 * Formula: ((woundsUseSB ? floor(S/10) : 0) + 2×floor(T/10) + floor(WP/10)) × multiplier + Hardy×floor(T/10)
 *
 * @param strength - Total strength characteristic value
 * @param toughness - Total toughness characteristic value
 * @param willpower - Total willpower characteristic value
 * @param hardyLevel - Number of Hardy talent levels (0+)
 * @param woundsUseSB - Whether species uses SB in wound formula
 * @param multiplier - Wound multiplier (default 1, Ogres use 2)
 * @returns WoundMaxResult with total and individual component values
 */
export function computeWoundMaximum(
  strength: number,
  toughness: number,
  willpower: number,
  hardyLevel: number,
  woundsUseSB: boolean,
  multiplier: number = 1
): WoundMaxResult {
  return calculateWoundsCore(strength, toughness, willpower, hardyLevel, woundsUseSB, multiplier);
}

/** Body location keys used for armour point calculation. */
type BodyLocation = 'head' | 'lArm' | 'rArm' | 'body' | 'lLeg' | 'rLeg';

const BODY_LOCATIONS: BodyLocation[] = ['head', 'lArm', 'rArm', 'body', 'lLeg', 'rLeg'];

/**
 * Parses an armour's locations string into the set of body locations it covers.
 * Handles compound entries like "Arms, Body" and singular keywords.
 */
function parseLocations(locations: string): BodyLocation[] {
  const result: BodyLocation[] = [];
  const parts = locations.split(',').map(s => s.trim().toLowerCase());

  for (const part of parts) {
    if (part === 'head') {
      result.push('head');
    } else if (part === 'body') {
      result.push('body');
    } else if (part === 'arms') {
      result.push('lArm', 'rArm');
    } else if (part === 'legs') {
      result.push('lLeg', 'rLeg');
    }
  }

  return result;
}

/**
 * Determines if an armour item has the "Flexible" quality.
 */
function isFlexible(armour: ArmourItem): boolean {
  return armour.qualities.toLowerCase().includes('flexible');
}

/**
 * Options for the unified armour-point calculation.
 */
export interface ArmourPointOptions {
  /** If true, only include items where worn === true. Default: false (all items). */
  filterByWorn?: boolean;
  /** If true, include shield AP in the result. Default: false. */
  includeShield?: boolean;
}

/**
 * Unified armour-point result with human-readable location names.
 */
export interface APResult {
  head: number;
  leftArm: number;
  rightArm: number;
  body: number;
  leftLeg: number;
  rightLeg: number;
  shield: number;
}

/**
 * Unified armour-point calculation.
 * Replaces both calculateArmourPoints and computeAPByLocation.
 *
 * Uses the WFRP 4e stacking rule: highest non-flexible AP + highest flexible AP per location.
 * Includes rune AP bonuses. All AP values are non-negative integers.
 *
 * @param armourItems - The list of armour items to calculate AP from
 * @param options - Optional configuration for filtering and shield inclusion
 * @returns APResult with AP values per body location and shield
 */
export function calculateArmourPointsUnified(
  armourItems: ArmourItem[],
  options?: ArmourPointOptions
): APResult {
  const filterByWorn = options?.filterByWorn ?? false;
  const includeShield = options?.includeShield ?? false;

  const items = filterByWorn
    ? armourItems.filter(item => item.worn === true)
    : armourItems;

  const result: APResult = {
    head: 0,
    leftArm: 0,
    rightArm: 0,
    body: 0,
    leftLeg: 0,
    rightLeg: 0,
    shield: 0,
  };

  const locationMap: Record<BodyLocation, keyof APResult> = {
    head: 'head',
    lArm: 'leftArm',
    rArm: 'rightArm',
    body: 'body',
    lLeg: 'leftLeg',
    rLeg: 'rightLeg',
  };

  for (const loc of BODY_LOCATIONS) {
    let highestNonFlexible = 0;
    let highestFlexible = 0;

    for (const armour of items) {
      const coveredLocations = parseLocations(armour.locations);
      if (coveredLocations.includes(loc)) {
        const effectiveAP = armour.ap + getRuneAPBonus(armour.runes ?? []);
        if (isFlexible(armour)) {
          highestFlexible = Math.max(highestFlexible, effectiveAP);
        } else {
          highestNonFlexible = Math.max(highestNonFlexible, effectiveAP);
        }
      }
    }

    result[locationMap[loc]] = Math.max(0, highestNonFlexible + highestFlexible);
  }

  // Shield AP placeholder — include only when explicitly requested
  if (!includeShield) {
    result.shield = 0;
  }

  return result;
}

/**
 * Calculates armour points per body location.
 * For each location: AP = highest non-flexible AP + highest flexible AP
 * among all armour covering that location.
 * All AP values are non-negative integers.
 *
 * Legacy wrapper — delegates to calculateArmourPointsUnified.
 */
export function calculateArmourPoints(armourList: ArmourItem[]): ArmourPoints {
  const unified = calculateArmourPointsUnified(armourList, { filterByWorn: false });

  return {
    head: unified.head,
    lArm: unified.leftArm,
    rArm: unified.rightArm,
    body: unified.body,
    lLeg: unified.leftLeg,
    rLeg: unified.rightLeg,
    shield: unified.shield,
  };
}

/**
 * AP per body location using human-readable property names.
 */
export interface APByLocation {
  head: number;
  leftArm: number;
  rightArm: number;
  body: number;
  leftLeg: number;
  rightLeg: number;
}

/**
 * Computes AP per body location from worn armour items only.
 * Uses the WFRP 4e stacking rule: highest non-flexible AP + highest flexible AP per location.
 * Includes rune AP bonuses. Only armour items with worn === true are included.
 *
 * Legacy wrapper — delegates to calculateArmourPointsUnified.
 */
export function computeAPByLocation(
  armourItems: ArmourItem[]
): APByLocation {
  const unified = calculateArmourPointsUnified(armourItems, { filterByWorn: true });

  return {
    head: unified.head,
    leftArm: unified.leftArm,
    rightArm: unified.rightArm,
    body: unified.body,
    leftLeg: unified.leftLeg,
    rightLeg: unified.rightLeg,
  };
}

/**
 * Calculates maximum encumbrance: SB + TB + strongBackLevel.
 * Result is always a non-negative integer.
 */
export function calculateMaxEncumbrance(
  chars: Record<CharacteristicKey, CharacteristicValue>,
  strongBackLevel: number
): number {
  const SB = getBonus(chars.S.i + chars.S.a + chars.S.b);
  const TB = getBonus(chars.T.i + chars.T.a + chars.T.b);
  return Math.max(0, SB + TB + strongBackLevel);
}

/**
 * Calculates the encumbrance weight of coins.
 * Formula: Math.floor((gc + ss + d) / 200)
 */
export function calculateCoinWeight(gc: number, ss: number, d: number): number {
  return Math.floor((gc + ss + d) / 200);
}
