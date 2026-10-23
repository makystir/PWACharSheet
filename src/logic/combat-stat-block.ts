import type { Character } from '../types/character';
import { CHARACTERISTIC_KEYS } from '../types/character';
import { deriveSheetTotals } from './sheet-totals';
import { calcWeaponDamage } from './weapons';

/**
 * Build a plain-text combat stat block for a character, suitable for pasting
 * into a GM's notes or VTT. All derived numbers come from the single shared
 * derivation (deriveSheetTotals) so they match the sheet exactly (AC2).
 *
 * Combat characteristics shown are the seven used in combat (WS BS S T I Ag
 * Dex), each as total (i+a+b). Movement follows Core p.164 (Walk = 2×M,
 * Run = 4×M; the stored move.{m,w,r} already hold those). Armour is worn-only
 * per Core p.293. Weapon damage uses calcWeaponDamage; when it cannot resolve a
 * numeric value (num === null) the raw damage string is printed verbatim.
 * Ammunition is intentionally omitted.
 */
export function buildCombatStatBlock(character: Character): string {
  const t = deriveSheetTotals(character);
  const lines: string[] = [];

  lines.push(character.name || 'Unnamed Character');
  if (character.species) lines.push(`Species: ${character.species}`);
  if (character.careerLevel) lines.push(`Career: ${character.careerLevel}`);

  // Combat characteristics line (total = i + a + b).
  const combatKeys = CHARACTERISTIC_KEYS.filter(k => k !== 'Int' && k !== 'WP' && k !== 'Fel');
  const charParts = combatKeys.map(k => {
    const cv = character.chars[k];
    return `${k} ${cv.i + cv.a + cv.b}`;
  });
  lines.push(charParts.join('  '));

  lines.push(`Wounds: ${t.wounds.total}`);

  // Movement — Core p.164 (Walk = 2×M, Run = 4×M; stored on move.{m,w,r}).
  lines.push(`Move: ${character.move.m}  Walk: ${character.move.w}  Run: ${character.move.r}`);

  // Armour by location — worn-only (Core p.293).
  const ap = t.armourPoints;
  lines.push(
    `Armour: Head ${ap.head}, R Arm ${ap.rArm}, L Arm ${ap.lArm}, Body ${ap.body}, ` +
    `R Leg ${ap.rLeg}, L Leg ${ap.lLeg}, Shield ${ap.shield}`
  );

  // Weapons.
  if (character.weapons.length > 0) {
    lines.push('Weapons:');
    for (const w of character.weapons) {
      const reachRange = w.rangeReach || w.maxR || '';
      const dmg = calcWeaponDamage(w, t.SB, character.talents, w.runes ?? [], t.rangedDamageSBMode);
      // When damage cannot be resolved numerically, show the raw formula, never 'null'.
      const dmgText = dmg.num === null ? (w.damage || '—') : String(dmg.num);
      const bits = [w.name];
      if (reachRange) bits.push(`(${reachRange})`);
      bits.push(`Dmg ${dmgText}`);
      if (w.qualities) bits.push(w.qualities);
      lines.push(`  ${bits.join(' ')}`);
    }
  }

  // Active conditions (level > 0).
  const active = character.conditions.filter(c => c.level > 0);
  if (active.length > 0) {
    lines.push('Conditions:');
    for (const cond of active) {
      lines.push(`  ${cond.name} ${cond.level}`);
    }
  }

  return lines.join('\n');
}
