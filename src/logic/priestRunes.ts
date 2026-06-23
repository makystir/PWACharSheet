import { ANCESTOR_GODS, DEITY_REGISTRY } from '../data/deityRunes';
import type { AncestorGod } from '../data/deityRunes';
import { RUNE_CATALOGUE } from '../data/runes';
import { getRuneById } from './runes';
import { CAREER_SCHEMES } from '../data/careers';
import type { Character, CareerLevel } from '../types/character';

/**
 * The known Dwarf priest career names.
 * Each corresponds to a key in CAREER_SCHEMES.
 */
const PRIEST_CAREER_NAMES = ['Doom Priest', 'Forge Priest', 'Hearth Priest'] as const;

/**
 * All priest career level titles collected from CAREER_SCHEMES.
 * Used for matching the character's `career` or `careerLevel` field.
 */
function getAllPriestTitles(): string[] {
  const titles: string[] = [];
  for (const careerName of PRIEST_CAREER_NAMES) {
    const scheme = CAREER_SCHEMES[careerName];
    if (!scheme) continue;
    for (let lvl = 1; lvl <= 5; lvl++) {
      const level = scheme[`level${lvl}` as keyof typeof scheme] as CareerLevel | undefined;
      if (level) {
        titles.push(level.title);
      }
    }
  }
  return titles;
}

const PRIEST_TITLES = getAllPriestTitles();

/**
 * Map of priest career level titles to their level number (1-4).
 */
function buildTitleToLevelMap(): Map<string, number> {
  const map = new Map<string, number>();
  for (const careerName of PRIEST_CAREER_NAMES) {
    const scheme = CAREER_SCHEMES[careerName];
    if (!scheme) continue;
    for (let lvl = 1; lvl <= 5; lvl++) {
      const level = scheme[`level${lvl}` as keyof typeof scheme] as CareerLevel | undefined;
      if (level) {
        map.set(level.title, lvl);
      }
    }
  }
  return map;
}

const TITLE_TO_LEVEL = buildTitleToLevelMap();

// --- Public API ---

/**
 * Type guard: checks if a string is a valid AncestorGod name.
 */
export function isValidDeity(value: string): value is AncestorGod {
  return (ANCESTOR_GODS as readonly string[]).includes(value);
}

/**
 * Returns true if the given career string matches a priest career.
 * Matches against both the career name (e.g. "Doom Priest") and
 * individual career level titles (e.g. "Initiate of Gazul", "High Doom Priest").
 */
export function isPriestCareer(career: string): boolean {
  if ((PRIEST_CAREER_NAMES as readonly string[]).includes(career)) return true;
  return PRIEST_TITLES.includes(career);
}

/**
 * Returns true if the given career level title corresponds to level 3 or 4
 * in a priest career scheme. This indicates High Priest rank.
 */
export function isHighPriestLevel(career: string, careerLevel: string): boolean {
  // careerLevel is the title string (e.g. "High Doom Priest", "Arch Forge Priest")
  const level = TITLE_TO_LEVEL.get(careerLevel);
  if (level !== undefined) {
    return level >= 3;
  }
  // Fallback: also check using career name to resolve the scheme
  // In case careerLevel matches a title in any priest career
  return false;
}

/**
 * Determines whether deity-based rune filtering should be applied to this character.
 * Returns true only if the character's species is 'Dwarf' AND their career is a priest career.
 */
export function shouldApplyDeityFilter(character: Character): boolean {
  if (character.species !== 'Dwarf') return false;
  // Check both character.career and character.careerLevel for priest career match
  return isPriestCareer(character.career) || isPriestCareer(character.careerLevel);
}

/**
 * Returns the list of rune IDs available to a priest of the given deity.
 * - If deity is null/undefined, returns ALL rune IDs from RUNE_CATALOGUE (no filtering).
 * - If deity is valid, returns only that deity's runeIds + highPriestBonus (if isHighPriest and bonus defined).
 */
export function getPriestAvailableRunes(
  deity: AncestorGod | null | undefined,
  isHighPriest: boolean
): string[] {
  if (deity == null) {
    return RUNE_CATALOGUE.map(r => r.id);
  }

  const entry = DEITY_REGISTRY.find(e => e.god === deity);
  if (!entry) {
    // Unknown deity — fallback to all runes
    return RUNE_CATALOGUE.map(r => r.id);
  }

  const runes = [...entry.runeIds];
  if (isHighPriest && entry.highPriestBonus) {
    runes.push(entry.highPriestBonus);
  }

  return runes;
}

/**
 * Identifies which of the character's known runes are NOT in the deity's access list.
 * These are "restricted" runes that the character still knows but shouldn't be able to use.
 *
 * @param knownRunes - The character's known rune IDs
 * @param deity - The character's patron deity (null/undefined = no restrictions)
 * @param isHighPriest - Whether the character is currently at High Priest level (3+).
 *   When false, the High Priest bonus rune is excluded from the access list and will
 *   appear as restricted if the character knows it. Defaults to true for backwards
 *   compatibility (bonus included in access set).
 */
export function getRestrictedRunes(
  knownRunes: string[],
  deity: AncestorGod | null | undefined,
  isHighPriest: boolean = true
): string[] {
  if (deity == null) {
    // No deity = no restrictions
    return [];
  }

  const entry = DEITY_REGISTRY.find(e => e.god === deity);
  if (!entry) {
    return [];
  }

  const accessList = new Set(entry.runeIds);
  // Only include the high priest bonus in the accessible set if the character
  // is currently at High Priest level. When career drops below level 3, the
  // bonus rune should show as restricted (Requirement 6.3).
  if (isHighPriest && entry.highPriestBonus) {
    accessList.add(entry.highPriestBonus);
  }

  return knownRunes.filter(runeId => !accessList.has(runeId));
}

/**
 * Returns the NAMES of runes that would become restricted if the character changes
 * to the given new deity. This is used for warning the user before a deity change.
 */
export function getDeityChangeWarnings(
  knownRunes: string[],
  newDeity: AncestorGod
): string[] {
  const entry = DEITY_REGISTRY.find(e => e.god === newDeity);
  if (!entry) {
    return [];
  }

  const accessList = new Set(entry.runeIds);
  if (entry.highPriestBonus) {
    accessList.add(entry.highPriestBonus);
  }

  const warnings: string[] = [];
  for (const runeId of knownRunes) {
    if (!accessList.has(runeId)) {
      const rune = getRuneById(runeId);
      if (rune) {
        warnings.push(rune.name);
      }
    }
  }

  return warnings;
}
