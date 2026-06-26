import type { Character, CharacteristicKey, CharacteristicValue, ArmourItem, ArmourPoints } from '../types/character';
import { getRuneAPBonus } from './runes';

/**
 * Returns the bonus (tens digit) for a characteristic value.
 */
export function getBonus(value: number): number {
  return Math.floor(value / 10);
}

/**
 * Calculates total wounds using the WFRP 4e formula:
 * (SB if woundsUseSB) + 2×TB + WPB + Hardy×TB
 * - Humans/Dwarves (woundsUseSB=true): SB + 2×TB + WPB + Hardy×TB
 * - Halflings/Elves (woundsUseSB=false): 2×TB + WPB + Hardy×TB
 * Result is always a non-negative integer.
 */
export function calculateTotalWounds(
  chars: Record<CharacteristicKey, CharacteristicValue>,
  woundsUseSB: boolean,
  hardyLevel: number
): number {
  const SB = getBonus(chars.S.i + chars.S.a + chars.S.b);
  const TB = getBonus(chars.T.i + chars.T.a + chars.T.b);
  const WPB = getBonus(chars.WP.i + chars.WP.a + chars.WP.b);

  const sbComponent = woundsUseSB ? SB : 0;
  const total = sbComponent + 2 * TB + WPB + hardyLevel * TB;

  return Math.max(0, total);
}

/**
 * Recomputes the wound component fields (wSB, wTB2, wWPB, wHardy) from the
 * character's current characteristics and Hardy talent level.
 * Returns the same reference if no field changed, avoiding unnecessary re-renders.
 * Never modifies wCur — it is a user-entered value.
 */
export function syncWoundFields(character: Character, hardyLevel: number): Character {
  const { chars } = character;

  const wSB = getBonus(chars.S.i + chars.S.a + chars.S.b);
  const TB = getBonus(chars.T.i + chars.T.a + chars.T.b);
  const wTB2 = 2 * TB;
  const wWPB = getBonus(chars.WP.i + chars.WP.a + chars.WP.b);
  const wHardy = hardyLevel * TB;

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
 * Formula: (woundsUseSB ? floor(S/10) : 0) + 2×floor(T/10) + floor(WP/10) + Hardy×floor(T/10)
 *
 * @param strength - Total strength characteristic value
 * @param toughness - Total toughness characteristic value
 * @param willpower - Total willpower characteristic value
 * @param hardyLevel - Number of Hardy talent levels (0+)
 * @param woundsUseSB - Whether species uses SB in wound formula
 * @returns WoundMaxResult with total and individual component values
 */
export function computeWoundMaximum(
  strength: number,
  toughness: number,
  willpower: number,
  hardyLevel: number,
  woundsUseSB: boolean
): WoundMaxResult {
  const sbRaw = Math.floor(strength / 10);
  const tbRaw = Math.floor(toughness / 10);
  const wpbRaw = Math.floor(willpower / 10);

  const sb = woundsUseSB ? sbRaw : 0;
  const tb = 2 * tbRaw;
  const wpb = wpbRaw;
  const hardy = hardyLevel * tbRaw;
  const total = sb + tb + wpb + hardy;

  return { total, sb, tb, wpb, hardy };
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
 * Calculates armour points per body location.
 * For each location: AP = highest non-flexible AP + highest flexible AP
 * among all armour covering that location.
 * All AP values are non-negative integers.
 */
export function calculateArmourPoints(armourList: ArmourItem[]): ArmourPoints {
  const ap: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

  for (const loc of BODY_LOCATIONS) {
    let highestNonFlexible = 0;
    let highestFlexible = 0;

    for (const armour of armourList) {
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

    ap[loc] = Math.max(0, highestNonFlexible + highestFlexible);
  }

  return ap;
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
 * Includes rune AP bonuses. Only armour items with worn === true (or worn not explicitly false)
 * that are marked as worn are included.
 */
export function computeAPByLocation(
  armourItems: ArmourItem[]
): APByLocation {
  const wornItems = armourItems.filter(item => item.worn === true);

  const result: APByLocation = { head: 0, leftArm: 0, rightArm: 0, body: 0, leftLeg: 0, rightLeg: 0 };

  const locationMap: Record<BodyLocation, keyof APByLocation> = {
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

    for (const armour of wornItems) {
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

  return result;
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
