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
  const bonuses: Record<CharacteristicKey, number> = {} as any;
  for (const key of ALL_CHAR_KEYS) {
    bonuses[key] = 0;
  }

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
