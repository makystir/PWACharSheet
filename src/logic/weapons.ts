import type { WeaponItem, Talent, RangedDamageSBMode } from '../types/character';
import { getRuneDamageBonus } from './runes';

export const RANGED_GROUPS = ['Bow', 'Blackpowder', 'Crossbow', 'Sling', 'Throwing', 'Entangling', 'Explosives'];

/**
 * Match a weapon to the best skill the character has.
 * Ranged weapons → Ranged(<group>).
 * Melee weapons → exact Melee(<group>), then fallback to Melee (Basic).
 */
export function findSkillForWeapon(
  weapon: { group: string },
  bSkills: { n: string; c: string; a: number }[],
  aSkills: { n: string; c: string; a: number }[],
) {
  const isRanged = RANGED_GROUPS.includes(weapon.group);
  const allSkills = [...bSkills, ...aSkills];

  if (isRanged) {
    const skillName = `Ranged (${weapon.group})`;
    return allSkills.find(s => s.n === skillName) || null;
  } else {
    // Melee: try exact group match first, fall back to Melee (Basic)
    const skillName = `Melee (${weapon.group})`;
    const exact = allSkills.find(s => s.n === skillName);
    if (exact) return exact;
    return allSkills.find(s => s.n === 'Melee (Basic)') || null;
  }
}

/**
 * Helper: find the level of a talent by name prefix (case-insensitive).
 */
function getTalentLevel(talents: Talent[], name: string): number {
  const t = talents.find(t => t.n && t.n.toLowerCase().startsWith(name.toLowerCase()));
  return t ? t.lvl : 0;
}

/**
 * Calculate effective weapon damage including SB/halfSB, talent bonuses
 * (Strike Mighty Blow, Accurate Shot, Sure Shot, Dirty Fighting),
 * and rune damage bonus.
 *
 * For ranged weapons, the rangedDamageSBMode house rule overrides the SB
 * component of the damage formula:
 *   - 'none' (RAW default): use the weapon's formula as-is
 *   - 'halfSB': all ranged weapons use ½SB (replaces full SB, adds ½SB to flat)
 *   - 'fullSB': all ranged weapons use full SB (keeps SB, adds SB to flat)
 * Melee weapons are never affected by this setting.
 */
export function calcWeaponDamage(
  weapon: WeaponItem,
  SB: number,
  talents: Talent[],
  runes: string[],
  rangedDamageSBMode: RangedDamageSBMode = 'none',
): { num: number | null; breakdown: string } {
  if (!weapon.damage || weapon.damage === '—') return { num: null, breakdown: '' };

  const halfSB = Math.floor(SB / 2);
  const ranged = RANGED_GROUPS.includes(weapon.group);
  let num = 0;
  const parts: string[] = [];

  // Extract the flat bonus from the formula (the +N part)
  const flatMatch = weapon.damage.match(/\+(\d+)$/);
  const flatBonus = flatMatch ? parseInt(flatMatch[1]) : 0;

  // Determine what SB contribution the formula specifies
  const formulaHasFullSB = weapon.damage.includes('SB') && !weapon.damage.includes('1/2SB');
  const formulaHasHalfSB = weapon.damage.includes('1/2SB');

  // For ranged weapons with a house rule override, replace the formula's SB
  if (ranged && rangedDamageSBMode !== 'none') {
    // House rule overrides the SB component for all ranged weapons
    if (rangedDamageSBMode === 'halfSB') {
      num = halfSB;
      parts.push(`½SB(${halfSB})`);
    } else if (rangedDamageSBMode === 'fullSB') {
      num = SB;
      parts.push(`SB(${SB})`);
    }
    if (flatBonus > 0) { num += flatBonus; parts.push(`+${flatBonus}`); }
  } else {
    // RAW: use the formula as written
    if (formulaHasHalfSB) {
      num = halfSB;
      parts.push(`½SB(${halfSB})`);
      const m = weapon.damage.match(/1\/2SB\+(\d+)/);
      if (m) { num += parseInt(m[1]); parts.push(`+${m[1]}`); }
    } else if (formulaHasFullSB) {
      num = SB;
      parts.push(`SB(${SB})`);
      const m = weapon.damage.match(/SB\+(\d+)/);
      if (m) { num += parseInt(m[1]); parts.push(`+${m[1]}`); }
    } else {
      const m = weapon.damage.match(/\+?(\d+)/);
      if (m) { num = parseInt(m[1]); parts.push(`+${m[1]}`); }
    }
  }

  const accurateShot = getTalentLevel(talents, 'Accurate Shot');
  const sureShot = getTalentLevel(talents, 'Sure Shot');
  const strikeMighty = getTalentLevel(talents, 'Strike Mighty Blow');
  const dirtyFighting = getTalentLevel(talents, 'Dirty Fighting');

  if (ranged && accurateShot > 0) { num += accurateShot; parts.push(`AS+${accurateShot}`); }
  if (ranged && sureShot > 0) { num += sureShot; parts.push(`SS+${sureShot}`); }
  if (!ranged && strikeMighty > 0) { num += strikeMighty; parts.push(`SM+${strikeMighty}`); }
  if (weapon.group === 'Brawling' && dirtyFighting > 0) { num += dirtyFighting; parts.push(`DF+${dirtyFighting}`); }

  const runeBonus = getRuneDamageBonus(runes);
  if (runeBonus > 0) { num += runeBonus; parts.push(`Rune+${runeBonus}`); }

  return { num, breakdown: parts.join(' ') };
}
