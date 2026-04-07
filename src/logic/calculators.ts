import type { CharacteristicKey, CharacteristicValue, ArmourItem, ArmourPoints } from '../types/character';

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
        if (isFlexible(armour)) {
          highestFlexible = Math.max(highestFlexible, armour.ap);
        } else {
          highestNonFlexible = Math.max(highestNonFlexible, armour.ap);
        }
      }
    }

    ap[loc] = Math.max(0, highestNonFlexible + highestFlexible);
  }

  return ap;
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
