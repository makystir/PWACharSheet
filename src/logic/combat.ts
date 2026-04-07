import type { Condition } from '../types/character';
import { CONDITIONS } from '../data/conditions';

/**
 * Calculate damage dealt.
 * Melee: weaponBonus + SB - (AP + TB), floored at 0
 * Ranged: floor(SB/2) + weaponBonus - (AP + TB), floored at 0
 */
export function calculateDamage(
  weaponBonus: number,
  SB: number,
  targetAP: number,
  targetTB: number,
  isRanged: boolean
): number {
  const effectiveSB = isRanged ? Math.floor(SB / 2) : SB;
  return Math.max(0, effectiveSB + weaponBonus - (targetAP + targetTB));
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
 * Currently returns a copy of conditions (specific end-of-round logic
 * like auto-removing Surprised/Stunned can be added here).
 */
export function processEndOfRoundConditions(conditions: Condition[]): Condition[] {
  return conditions
    .filter(c => {
      // Surprised is removed at end of round
      if (c.name === 'Surprised') return false;
      // Stunned is removed at end of round
      if (c.name === 'Stunned') return false;
      return true;
    })
    .map(c => ({ ...c }));
}

/**
 * Increment advantage by 1, capped at 10.
 */
export function incrementAdvantage(current: number): number {
  return Math.min(10, current + 1);
}

/**
 * Decrement advantage by 1, floored at 0.
 */
export function decrementAdvantage(current: number): number {
  return Math.max(0, current - 1);
}
