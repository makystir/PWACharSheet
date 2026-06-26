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
