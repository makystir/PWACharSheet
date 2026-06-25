import type { Character, MagicalBurnout } from '../types/character';
import { getBonus } from './calculators';

/**
 * Magical Burnout — High Elf Player's Guide p.84
 *
 * When overcasting a High Magic spell, if total overcast SL exceeds the
 * caster's WP Bonus, there is a (excess SL)% chance of Magical Burnout.
 *
 * If burnout occurs, roll d100:
 * - Normal: no casting for that many days
 * - Doubles (11, 22, 33...): burnout is permanent
 *
 * Fortune negates temporary burnout; Fate negates permanent burnout.
 */

/** Check if the character has the High Magic talent. */
export function hasHighMagic(character: Character): boolean {
  return character.talents.some(t => t.n === 'High Magic');
}

/** Determine if burnout is currently active (not expired). */
export function isBurnoutActive(burnout: MagicalBurnout | undefined): boolean {
  if (!burnout) return false;
  if (burnout.type === 'permanent') return true;
  // Temporary: check if days have elapsed
  const elapsed = Math.floor((Date.now() - burnout.startedAt) / (1000 * 60 * 60 * 24));
  return elapsed < burnout.daysRemaining;
}

/** Get remaining days for temporary burnout, or -1 for permanent. */
export function getBurnoutDaysRemaining(burnout: MagicalBurnout | undefined): number {
  if (!burnout) return 0;
  if (burnout.type === 'permanent') return -1;
  const elapsed = Math.floor((Date.now() - burnout.startedAt) / (1000 * 60 * 60 * 24));
  return Math.max(0, burnout.daysRemaining - elapsed);
}

/**
 * Calculate burnout risk percentage for a given overcast SL total.
 * Returns 0 if no risk, otherwise the % chance (excess SL over WPB).
 */
export function getBurnoutRisk(character: Character, overcastSL: number): number {
  const wpBonus = getBonus(character.chars.WP);
  if (overcastSL <= wpBonus) return 0;
  return overcastSL - wpBonus;
}

/** Check if a d100 roll is doubles (11, 22, 33, 44, 55, 66, 77, 88, 99, 00). */
export function isDoubles(roll: number): boolean {
  if (roll === 100) return true; // 00 counts as doubles
  const tens = Math.floor(roll / 10);
  const units = roll % 10;
  return tens === units;
}

/**
 * Apply magical burnout to a character.
 * @param daysOrPermanent - number of days (from d100 roll), or 'permanent'
 */
export function applyBurnout(character: Character, daysOrPermanent: number | 'permanent'): Character {
  const burnout: MagicalBurnout = daysOrPermanent === 'permanent'
    ? { type: 'permanent', daysRemaining: 0, startedAt: Date.now() }
    : { type: 'temporary', daysRemaining: daysOrPermanent, startedAt: Date.now() };
  return { ...character, magicalBurnout: burnout };
}

/** Clear burnout (e.g., after spending Fortune/Fate or time elapsed). */
export function clearBurnout(character: Character): Character {
  return { ...character, magicalBurnout: undefined };
}
