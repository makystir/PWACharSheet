import type { Condition, WeaponItem } from '../types/character';
import { CONDITIONS } from '../data/conditions';

/**
 * Calculate damage dealt.
 * Formula: weaponDamage + SL - (effectiveAP + TB), minimum 1 wound per RAW.
 * weaponDamage is pre-computed (includes SB per weapon formula via calcWeaponDamage).
 *
 * When the weapon has the Undamaging quality (Core Rulebook p.299):
 * - All APs are doubled before subtraction
 * - The minimum 1 wound guarantee is removed (damage can be 0)
 *
 * @param robustLevel - Robust talent level: reduces all incoming damage by 1 per level
 *                      (minimum 1 wound from any source still applies, Core Rulebook p.143)
 */
export function calculateDamage(
  weaponDamage: number,
  sl: number,
  targetAP: number,
  targetTB: number,
  options?: { undamaging?: boolean; robustLevel?: number }
): number {
  const undamaging = options?.undamaging ?? false;
  const robustLevel = options?.robustLevel ?? 0;
  const effectiveAP = undamaging ? targetAP * 2 : targetAP;
  const raw = weaponDamage + sl - (effectiveAP + targetTB + robustLevel);

  if (undamaging) {
    // Undamaging weapons remove the minimum 1 wound guarantee
    return Math.max(0, raw);
  }
  return Math.max(1, raw);
}

/**
 * Apply a condition: add new or increment stackable.
 * Returns a new conditions array.
 */
export function applyCondition(
  conditions: Condition[],
  conditionName: string
): Condition[] {
  const condData = CONDITIONS.find(c => c.name === conditionName);
  if (!condData) return [...conditions];

  const existing = conditions.find(c => c.name === conditionName);

  if (existing) {
    if (condData.stackable && existing.level < condData.maxLevel) {
      return conditions.map(c =>
        c.name === conditionName ? { ...c, level: c.level + 1 } : { ...c }
      );
    }
    // Non-stackable or at max: return unchanged copy
    return conditions.map(c => ({ ...c }));
  }

  return [...conditions.map(c => ({ ...c })), { name: conditionName, level: 1 }];
}

/**
 * Remove a condition: decrement stackable or remove entirely.
 * Returns a new conditions array.
 */
export function removeCondition(
  conditions: Condition[],
  conditionName: string
): Condition[] {
  const existing = conditions.find(c => c.name === conditionName);
  if (!existing) return conditions.map(c => ({ ...c }));

  const condData = CONDITIONS.find(c => c.name === conditionName);

  if (condData?.stackable && existing.level > 1) {
    return conditions.map(c =>
      c.name === conditionName ? { ...c, level: c.level - 1 } : { ...c }
    );
  }

  return conditions.filter(c => c.name !== conditionName).map(c => ({ ...c }));
}

/**
 * Process end-of-round condition effects.
 * Removes Surprised (auto-removed at end of round per Core Rulebook p.169).
 * Note: Stunned is NOT auto-removed — it requires a Challenging (+0) Endurance
 * Test at end of round per Core Rulebook p.169. The UI should prompt for this test.
 */
export function processEndOfRoundConditions(conditions: Condition[]): Condition[] {
  return conditions
    .filter(c => {
      // Surprised is removed at end of round
      if (c.name === 'Surprised') return false;
      return true;
    })
    .map(c => ({ ...c }));
}

/**
 * Compute the modified target number for an off-hand attack.
 * Per Core Rulebook p.132 (Ambidextrous) and p.134 (Dual Wielder):
 * - Base off-hand penalty: -20
 * - Ambidextrous level 1: reduces penalty to -10
 * - Ambidextrous level 2: removes penalty entirely
 * - Dual Wielder allows attacking with both weapons but does NOT reduce the penalty.
 * When offHand is false, returns baseTarget unchanged.
 */
export function computeOffHandTarget(baseTarget: number, offHand: boolean, ambidextrousLevel: number): number {
  if (!offHand) return baseTarget;
  if (ambidextrousLevel >= 2) return baseTarget;
  if (ambidextrousLevel === 1) return baseTarget - 10;
  return baseTarget - 20;
}

/**
 * Increment advantage by 1.
 * If cap is undefined or 0, advantage is uncapped.
 * If cap is a positive number, advantage is capped at that value.
 */
export function incrementAdvantage(current: number, cap?: number): number {
  if (cap === undefined || cap === 0) return current + 1;
  return Math.min(cap, current + 1);
}

/**
 * Decrement advantage by 1, floored at 0.
 */
export function decrementAdvantage(current: number): number {
  return Math.max(0, current - 1);
}

/**
 * Calculate effective SL for a Damaging weapon.
 * Returns max(unitsDigit, sl) per Core Rulebook p.297.
 *
 * The units digit is the ones place of the d100 roll (roll % 10).
 * The effective SL is whichever is higher: the units digit or the standard SL.
 */
export function calculateDamagingSL(roll: number, sl: number): {
  effectiveSL: number;
  unitsDigit: number;
  originalSL: number;
  used: 'units' | 'sl';
} {
  const unitsDigit = roll % 10;
  const effectiveSL = Math.max(unitsDigit, sl);
  const used: 'units' | 'sl' = unitsDigit > sl ? 'units' : 'sl';

  return {
    effectiveSL,
    unitsDigit,
    originalSL: sl,
    used,
  };
}


/**
 * Parse Shield Rating from a shield weapon's qualities string.
 * Looks for "Shield Rating X" or "Rating X" pattern.
 * Returns the numeric rating, or 0 if not found.
 */
export function parseShieldRating(weapon: WeaponItem): number {
  const qualities = weapon.qualities ?? '';
  // Try "Shield Rating X" first, then fallback to "Rating X"
  const shieldRatingMatch = qualities.match(/Shield\s+Rating\s+(\d+)/i);
  if (shieldRatingMatch) {
    return parseInt(shieldRatingMatch[1], 10);
  }
  const ratingMatch = qualities.match(/Rating\s+(\d+)/i);
  if (ratingMatch) {
    return parseInt(ratingMatch[1], 10);
  }
  return 0;
}

/**
 * Find the equipped shield weapon from the character's weapon list.
 * A shield is a weapon with "Shield" in its group field.
 * Multiple shields equipped → returns the first one found.
 */
export function findEquippedShield(weapons: WeaponItem[]): WeaponItem | null {
  return weapons.find(w => w.group.toLowerCase().includes('shield')) ?? null;
}


export interface CriticalWoundModifier {
  excessDamage: number;
  toughnessBonus: number;
  modifier: -20 | 0;
  description: string;
}

/**
 * Calculate the Critical Wound table roll modifier based on excess damage vs TB.
 * Per Core Rulebook p.172:
 * - If excess damage < TB: -20 modifier to the Critical table roll
 * - If excess damage >= TB: no modifier applies
 *
 * A Critical Wound is triggered when netWounds exceeds the character's currentWounds,
 * reducing them to 0 or below. The excess damage is netWounds - currentWounds.
 *
 * Edge cases:
 * - netWounds exactly equals currentWounds → character at exactly 0 wounds →
 *   critical IS triggered, excess = 0, modifier = -20 (since 0 < TB for any TB > 0)
 * - TB is 0 and excess is 0 → excess (0) >= TB (0), so modifier = 0
 */
export function calculateCriticalModifier(
  netWounds: number,
  currentWounds: number,
  toughnessBonus: number,
): CriticalWoundModifier | null {
  // No critical wound if net wounds does not reach or exceed current wounds
  if (netWounds < currentWounds) {
    return null;
  }

  const excessDamage = netWounds - currentWounds;
  const modifier: -20 | 0 = excessDamage < toughnessBonus ? -20 : 0;

  const description =
    modifier === -20
      ? `Excess damage (${excessDamage}) is less than TB (${toughnessBonus}): -20 modifier to Critical table roll`
      : `Excess damage (${excessDamage}) meets or exceeds TB (${toughnessBonus}): no modifier to Critical table roll`;

  return {
    excessDamage,
    toughnessBonus,
    modifier,
    description,
  };
}
