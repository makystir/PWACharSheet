import type { Character, CharacteristicKey } from '../types/character';
import type { ReminderTest } from './reminders';
import { computeSkillTarget, computeCharacteristicTarget } from './dice-roller';

/**
 * Resolve the base target for a reminder's one-tap roll AND its human-readable
 * breakdown from the character sheet, reusing the SAME math as
 * QuickRollBar.buildQuickSkills / CombatPage.openWeaponRoll (no new formula).
 *
 * For a skill test, prefer the named skill's advances when it is on the sheet,
 * else fall back to the bare characteristic (an untrained Skill still tests off
 * its characteristic).
 *
 * Core p.117 (skill→characteristic mapping): a Skill tests off its governing
 * characteristic. The label characteristic is derived the SAME safe way as the
 * value — never by reading the free-form `skill.c` directly for display, because
 * the repo has rows like `Melee ()` / `Stealth ()` whose `c` is a real key but
 * other malformed rows could carry a value that is not a `CharacteristicKey`.
 * The `charKey in character.chars` guard keeps both the computed value and the
 * breakdown line aligned to a real characteristic, falling back to the known
 * `fallbackChar` when `skill.c` is not a real characteristic key.
 *
 * `total` and `lines` are produced by the SAME branch so they can never drift
 * (one source of truth for the calculated-total-tooltips steering rule).
 */
export function resolveSeededTarget(
  character: Character,
  def: ReminderTest,
): { total: number; lines: string[] } {
  if (def.kind === 'characteristic') {
    const c = character.chars[def.char];
    const total = computeCharacteristicTarget(c.i, c.a, c.b);
    return {
      total,
      lines: [`${def.char} ${total} (Initial ${c.i} + Advances ${c.a} + Bonus ${c.b})`],
    };
  }

  const skill = [...character.bSkills, ...character.aSkills].find((s) => s.n === def.skillName);
  if (skill) {
    const charKey: CharacteristicKey =
      (skill.c as CharacteristicKey) in character.chars
        ? (skill.c as CharacteristicKey)
        : def.fallbackChar;
    const cv = character.chars[charKey];
    const charSubtotal = computeCharacteristicTarget(cv.i, cv.a, cv.b);
    const total = computeSkillTarget(cv.i, cv.a, cv.b, skill.a);
    return {
      total,
      lines: [
        `${charKey} ${charSubtotal} (Initial ${cv.i} + Advances ${cv.a} + Bonus ${cv.b})`,
        `${def.skillName} Advances +${skill.a}`,
        `= ${total}`,
      ],
    };
  }

  const c = character.chars[def.fallbackChar];
  const total = computeCharacteristicTarget(c.i, c.a, c.b);
  return {
    total,
    lines: [
      `${def.fallbackChar} ${total} (Initial ${c.i} + Advances ${c.a} + Bonus ${c.b})`,
      `${def.skillName} untrained — characteristic only`,
    ],
  };
}

/**
 * Resolve the base target number only. Delegates to {@link resolveSeededTarget}
 * so the number and its breakdown share one branch and cannot drift. The
 * signature and return value are byte-identical to the former implementation,
 * so every existing caller (`useAssistantActions`, `CombatDashboard`) is
 * unchanged.
 *
 * Moved verbatim from the private helper in CombatDashboard.tsx so the combat UI,
 * the Assistant engine, and any other consumer share one resolver and cannot drift.
 */
export function resolveReminderBaseTarget(character: Character, def: ReminderTest): number {
  return resolveSeededTarget(character, def).total;
}
