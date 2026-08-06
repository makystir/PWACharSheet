export interface SkillFilterOptions {
  searchText: string;
  trainedOnly: boolean;
}

/**
 * Filter skills by name (case-insensitive substring match) and optionally
 * by trained status (advances > 0).
 * Returns a subset of the input skills matching all active criteria.
 */
export function filterSkills(
  skills: { n: string; a: number }[],
  options: SkillFilterOptions
): { n: string; a: number }[] {
  const { searchText, trainedOnly } = options;
  const lowerSearch = searchText.toLowerCase();

  return skills.filter((skill) => {
    if (lowerSearch && !skill.n.toLowerCase().includes(lowerSearch)) {
      return false;
    }
    if (trainedOnly && skill.a <= 0) {
      return false;
    }
    return true;
  });
}

export interface CareerSkillFilterOptions {
  searchText: string;
  careerOnly: boolean;
}

/**
 * Filter sorted skill entries by name (case-insensitive substring match) and optionally
 * by career status (inCareer === true).
 * Combines both filters with AND logic: a skill must match BOTH the text search
 * and the career filter to be included.
 * Empty search text matches all skills (respecting career toggle).
 * Returns a subset of the input entries matching all active criteria.
 */
export function filterSkillEntries<T extends { skill: { n: string }; inCareer: boolean }>(
  skills: T[],
  options: CareerSkillFilterOptions
): T[] {
  const { searchText, careerOnly } = options;
  const lowerSearch = searchText.toLowerCase();

  return skills.filter((entry) => {
    if (lowerSearch && !entry.skill.n.toLowerCase().includes(lowerSearch)) {
      return false;
    }
    if (careerOnly && !entry.inCareer) {
      return false;
    }
    return true;
  });
}
