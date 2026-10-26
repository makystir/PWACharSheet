import type { Character, CharacteristicKey } from '../types/character';
import type { ReminderTest } from './reminders';
import { computeSkillTarget, computeCharacteristicTarget } from './dice-roller';

/**
 * Resolve the base target for a reminder's one-tap roll from the character sheet,
 * reusing the SAME math as QuickRollBar.buildQuickSkills / CombatPage.openWeaponRoll
 * (no new formula). For a skill test, prefer the named skill's advances when it is
 * on the sheet, else fall back to the bare characteristic (an untrained Skill still
 * tests off its characteristic). Resolving the characteristic from the reminder
 * table's fallbackChar (a known CharacteristicKey) avoids reading the free-form
 * Skill.c field.
 *
 * Moved verbatim from the private helper in CombatDashboard.tsx so the combat UI,
 * the Assistant engine, and any other consumer share one resolver and cannot drift.
 */
export function resolveReminderBaseTarget(character: Character, def: ReminderTest): number {
  if (def.kind === 'characteristic') {
    const c = character.chars[def.char];
    return computeCharacteristicTarget(c.i, c.a, c.b);
  }
  const skill = [...character.bSkills, ...character.aSkills].find((s) => s.n === def.skillName);
  const fallback: CharacteristicKey = def.fallbackChar;
  if (skill) {
    const charKey = skill.c as CharacteristicKey;
    const charVal = character.chars[charKey] ?? character.chars[fallback];
    return computeSkillTarget(charVal.i, charVal.a, charVal.b, skill.a);
  }
  const c = character.chars[fallback];
  return computeCharacteristicTarget(c.i, c.a, c.b);
}
