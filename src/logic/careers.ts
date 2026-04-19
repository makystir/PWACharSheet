import type { Character, CareerScheme, CareerLevel } from '../types/character';
import { CAREER_SCHEMES } from '../data/careers';

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
  return [scheme.level1, scheme.level2, scheme.level3, scheme.level4];
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
  if (isNaN(levelNum) || levelNum < 1 || levelNum > 4) return { ...character };

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
    for (let lvl = 1; lvl <= 4; lvl++) {
      const level = scheme[`level${lvl}` as keyof CareerScheme] as CareerLevel;
      if (level.title === input) {
        return { careerName, levelNumber: lvl };
      }
    }
  }

  return null;
}
