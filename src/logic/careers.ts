import type { Character, CareerScheme, CareerLevel } from '../types/character';
import { BLANK_CHARACTER } from '../types/character';
import { CAREER_SCHEMES } from '../data/careers';
import { ADV_SKILL_DB } from '../data/advanced-skills';
import { TALENT_DB } from '../data/talents';
import { SPECIES_DATA } from '../data/species';
import { parseRequirement, buildGroupedName, getSkillGroup } from './grouped-names';

/**
 * Get all career names belonging to a given class.
 */
export function getCareersByClass(className: string): string[] {
  return Object.entries(CAREER_SCHEMES)
    .filter(([, scheme]) => scheme.class === className)
    .map(([name]) => name);
}

/**
 * Lookup a career scheme by career name.
 */
export function getCareerScheme(careerName: string): CareerScheme | undefined {
  return CAREER_SCHEMES[careerName];
}

/**
 * Return all 4 career levels for a given career.
 */
export function getCareerLevelOptions(careerName: string): CareerLevel[] {
  const scheme = CAREER_SCHEMES[careerName];
  if (!scheme) return [];
  const levels: CareerLevel[] = [];
  for (let i = 1; i <= 5; i++) {
    const level = scheme[`level${i}` as keyof CareerScheme] as CareerLevel | undefined;
    if (level) levels.push(level);
  }
  return levels;
}

/**
 * Return the status string for a specific career level (1-4).
 */
export function getStatusForCareerLevel(careerName: string, level: number): string {
  const scheme = CAREER_SCHEMES[careerName];
  if (!scheme) return '';
  const key = `level${level}` as keyof CareerScheme;
  const careerLevel = scheme[key] as CareerLevel | undefined;
  return careerLevel?.status ?? '';
}

/**
 * Apply career skills to a character. Adds any career skills not already
 * present in the character's basic or advanced skills.
 */
export function applyCareerSkills(character: Character, careerName: string, level: string): Character {
  const scheme = CAREER_SCHEMES[careerName];
  if (!scheme) return { ...character };

  const levelNum = parseInt(level, 10);
  if (isNaN(levelNum) || levelNum < 1 || levelNum > 5) return { ...character };

  const careerLevel = scheme[`level${levelNum}` as keyof CareerScheme] as CareerLevel;

  return {
    ...character,
    career: careerName,
    careerLevel: careerLevel.title,
    class: scheme.class,
    status: careerLevel.status,
  };
}

/**
 * Get the skill list for the character's current career level.
 * Returns an empty array if career/careerLevel is invalid or not found.
 */
export function getCareerSkills(career: string, careerLevel: string): string[] {
  if (!career || !careerLevel) return [];
  const scheme = CAREER_SCHEMES[career];
  if (!scheme) return [];

  for (let i = 1; i <= 5; i++) {
    const level = scheme[`level${i}` as keyof CareerScheme] as CareerLevel | undefined;
    if (level && level.title === careerLevel) {
      return level.skills;
    }
  }
  return [];
}

/** Suggestions for filling in a placeholder such as "Language (Any)". */
export interface SpecialisationOptions {
  /** Full names to offer, e.g. "Language (Battle)". */
  names: string[];
  /** Whether the player may also type a specialisation of their own. */
  allowCustom: boolean;
}

// group (lower-cased) -> specialisation (lower-cased) -> full name as first seen
type SpecialisationIndex = Map<string, Map<string, string>>;

let knownSpecialisations: Record<'skill' | 'talent', SpecialisationIndex> | null = null;

function addKnownSpecialisation(index: SpecialisationIndex, name: string): void {
  const req = parseRequirement(name);
  if (req.kind !== 'exact') return;
  const group = req.base.toLowerCase();
  const specs = index.get(group) ?? new Map<string, string>();
  const spec = req.options[0].toLowerCase();
  if (!specs.has(spec)) specs.set(spec, buildGroupedName(req.base, req.options[0]));
  index.set(group, specs);
}

/**
 * Collect every specialisation the game data already names, per group. Nothing
 * is listed by hand: a specialisation appears here as soon as a skill list,
 * career or species uses it.
 */
function buildKnownSpecialisations(): Record<'skill' | 'talent', SpecialisationIndex> {
  const skill: SpecialisationIndex = new Map();
  const talent: SpecialisationIndex = new Map();

  for (const s of ADV_SKILL_DB) addKnownSpecialisation(skill, s.n);
  for (const s of BLANK_CHARACTER.bSkills) addKnownSpecialisation(skill, s.n);

  // TALENT_DB names a group either once as a template ("Etiquette (Group)") or
  // once per real specialisation ("Acute Sense (Sight)", "Acute Sense (Smell)").
  // Only the latter are specialisations worth suggesting.
  const rowsPerGroup = new Map<string, number>();
  for (const t of TALENT_DB) {
    const group = parseRequirement(t.name).base.toLowerCase();
    rowsPerGroup.set(group, (rowsPerGroup.get(group) ?? 0) + 1);
  }
  for (const t of TALENT_DB) {
    if ((rowsPerGroup.get(parseRequirement(t.name).base.toLowerCase()) ?? 0) > 1) addKnownSpecialisation(talent, t.name);
  }

  for (const careerName of Object.keys(CAREER_SCHEMES)) {
    for (const level of getCareerLevelOptions(careerName)) {
      for (const s of level.skills) addKnownSpecialisation(skill, s);
      for (const t of level.talents) addKnownSpecialisation(talent, t);
    }
  }

  for (const species of Object.values(SPECIES_DATA)) {
    for (const s of species.skills) addKnownSpecialisation(skill, s);
    // A species talent may be a choice between two talents ("Savvy or Suave").
    for (const t of species.talents) {
      for (const option of t.split(' or ')) addKnownSpecialisation(talent, option);
    }
  }

  return { skill, talent };
}

/**
 * Suggest specialisations for a placeholder skill or talent name.
 *
 * These are dropdown suggestions only. Matching and career counting never read
 * them, so a specialisation that is not listed (homebrew) works just the same.
 *
 * - "Art (Calligraphy or Engraving)": exactly the options the entry lists; the
 *   entry itself is the constraint, so no custom choice.
 * - "Language (Any)": every specialisation of the group found in the game data,
 *   plus "no specialisation" for groups that allow it; custom always allowed.
 */
export function getSpecialisationOptions(placeholderName: string, type: 'skill' | 'talent'): SpecialisationOptions {
  knownSpecialisations ??= buildKnownSpecialisations();
  const req = parseRequirement(placeholderName);
  const known = knownSpecialisations[type].get(req.base.toLowerCase());

  if (req.kind === 'oneOf') {
    return {
      names: req.options.map(o => known?.get(o.toLowerCase()) ?? buildGroupedName(req.base, o)),
      allowCustom: false,
    };
  }

  const names = known ? [...known.values()].sort((a, b) => a.localeCompare(b)) : [];
  if (type === 'skill' && getSkillGroup(req.base)?.unspecialised) names.unshift(req.base);
  return { names, allowCustom: true };
}

/**
 * Resolve a career name or level title to the career name and level number.
 * Accepts either a career name (returns level null) or a level title (returns career + level).
 */
export function resolveCareerName(input: string): { careerName: string; levelNumber: number | null } | null {
  // Direct career name match
  if (CAREER_SCHEMES[input]) {
    return { careerName: input, levelNumber: null };
  }

  // Search by level title
  for (const [careerName, scheme] of Object.entries(CAREER_SCHEMES)) {
    for (let lvl = 1; lvl <= 5; lvl++) {
      const level = scheme[`level${lvl}` as keyof CareerScheme] as CareerLevel | undefined;
      if (level && level.title === input) {
        return { careerName, levelNumber: lvl };
      }
    }
  }

  return null;
}
