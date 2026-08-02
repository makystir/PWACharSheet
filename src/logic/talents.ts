import type { Character, CharacteristicKey, Talent } from '../types/character';
import { TALENT_BONUS_MAP } from '../data/talents';

const ALL_CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

/**
 * Compute characteristic bonuses from talents using TALENT_BONUS_MAP.
 * Returns a record of characteristic keys to bonus values.
 */
export function computeTalentBonuses(
  talents: Talent[]
): Record<CharacteristicKey, number> {
  const bonuses: Record<CharacteristicKey, number> = Object.fromEntries(
    ALL_CHAR_KEYS.map(key => [key, 0])
  ) as Record<CharacteristicKey, number>;

  for (const talent of talents) {
    const entry = TALENT_BONUS_MAP[talent.n];
    if (entry) {
      const charKey = entry.char as CharacteristicKey;
      bonuses[charKey] += entry.bonus * talent.lvl;
    }
  }

  return bonuses;
}

/**
 * Reverse-lookup TALENT_BONUS_MAP to find which talent (if any) contributes
 * a bonus to the given characteristic key and exists in the character's talents.
 * Returns the talent name or null if no match.
 */
export function getContributingTalent(
  talents: Talent[],
  charKey: CharacteristicKey
): string | null {
  for (const [talentName, entry] of Object.entries(TALENT_BONUS_MAP)) {
    if (entry.char === charKey && talents.some(t => t.n === talentName)) {
      return talentName;
    }
  }
  return null;
}

/**
 * Apply computed talent bonuses to character.chars[key].b fields.
 * Returns a new character with updated bonus values.
 */
export function syncTalentBonuses(character: Character): Character {
  const bonuses = computeTalentBonuses(character.talents);
  const newChars = { ...character.chars };

  for (const key of ALL_CHAR_KEYS) {
    newChars[key] = { ...newChars[key], b: bonuses[key] };
  }

  return { ...character, chars: newChars };
}
