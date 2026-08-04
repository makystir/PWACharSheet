import type { Condition } from '../types/character';
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
