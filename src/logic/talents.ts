import type { Character, CharacteristicKey, Talent, TalentData } from '../types/character';
import { CHARACTERISTIC_KEYS } from '../types/character';
import { TALENT_BONUS_MAP, TALENT_DB } from '../data/talents';
import { TALENT_ALIASES } from '../data/talent-aliases';
import { inGroup } from './grouped-names';

const ALL_CHAR_KEYS: CharacteristicKey[] = CHARACTERISTIC_KEYS;

/**
 * The TALENT_DB spelling of a talent name ("Warleader" -> "War Leader").
 * Only the alias map's own entries count, so a name such as "constructor" is
 * never mistaken for an inherited object property.
 */
export function canonicalTalentName(talentName: string): string {
  return Object.hasOwn(TALENT_ALIASES, talentName) ? TALENT_ALIASES[talentName] : talentName;
}

/**
 * Find the TALENT_DB row describing a talent name.
 * Tries the exact name first (after spelling aliases), then the row of the same
 * talent group, so "Etiquette (Nobles)" resolves to "Etiquette (Group)" and a
 * homebrew specialisation still gets its group's description and max.
 */
export function findTalentData(talentName: string): TalentData | undefined {
  const canonicalName = canonicalTalentName(talentName);
  return TALENT_DB.find(t => t.name === canonicalName)
    ?? TALENT_DB.find(t => inGroup(t.name, canonicalName));
}

/**
 * Compute characteristic bonuses from talents using TALENT_BONUS_MAP.
 * Returns a record of characteristic keys to bonus values.
 */
function computeTalentBonuses(
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
