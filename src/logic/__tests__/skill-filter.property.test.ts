import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { filterSkills, filterSkillEntries } from '../skill-filter';

// Feature: ux-polish-and-functionality, Property 19: Skill Filter Subset Invariant
// Feature: ux-polish-and-functionality, Property 20: Combined Skill Filter Intersection

// ─── Generators ─────────────────────────────────────────────────────────────

/** Arbitrary skill with a non-empty name and advances ≥ 0. */
const arbSkill = fc.record({
  n: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
  a: fc.integer({ min: 0, max: 99 }),
});

/** Arbitrary skill list (0–30 skills). */
const arbSkillList = fc.array(arbSkill, { minLength: 0, maxLength: 30 });

/** Arbitrary search text (may be empty). */
const arbSearchText = fc.string({ minLength: 0, maxLength: 15 });

/** Arbitrary non-empty search text for subset checks. */
const arbNonEmptySearchText = fc.string({ minLength: 1, maxLength: 15 });

/** Arbitrary trained-only boolean. */
const arbTrainedOnly = fc.boolean();

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-polish-and-functionality', () => {
  describe('Property 19: Skill Filter Subset Invariant', () => {
    /**
     * **Validates: Requirements 22.2, 22.4, 22.6**
     */

    it('result is always a subset of the input skill list', () => {
      fc.assert(
        fc.property(
          arbSkillList,
          arbSearchText,
          arbTrainedOnly,
          (skills, searchText, trainedOnly) => {
            const result = filterSkills(skills, { searchText, trainedOnly });

            // Every result element must be in the input
            for (const r of result) {
              expect(skills).toContainEqual(r);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('every result skill contains the filter text (case-insensitive)', () => {
      fc.assert(
        fc.property(
          arbSkillList,
          arbNonEmptySearchText,
          arbTrainedOnly,
          (skills, searchText, trainedOnly) => {
            const result = filterSkills(skills, { searchText, trainedOnly });
            const lowerSearch = searchText.toLowerCase();

            for (const r of result) {
              expect(r.n.toLowerCase()).toContain(lowerSearch);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('every matching skill from input is in the result (no false negatives for text filter)', () => {
      fc.assert(
        fc.property(
          arbSkillList,
          arbSearchText,
          (skills, searchText) => {
            // With trainedOnly = false, only text filter applies
            const result = filterSkills(skills, { searchText, trainedOnly: false });
            const lowerSearch = searchText.toLowerCase();

            for (const skill of skills) {
              if (!lowerSearch || skill.n.toLowerCase().includes(lowerSearch)) {
                expect(result).toContainEqual(skill);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 20: Combined Skill Filter Intersection', () => {
    /**
     * **Validates: Requirements 22.2, 22.4, 22.6**
     */

    it('result equals intersection of text-match set and trained set', () => {
      fc.assert(
        fc.property(
          arbSkillList,
          arbSearchText,
          arbTrainedOnly,
          (skills, searchText, trainedOnly) => {
            const result = filterSkills(skills, { searchText, trainedOnly });
            const lowerSearch = searchText.toLowerCase();

            // Compute expected intersection manually
            const expected = skills.filter((skill) => {
              const matchesText = !lowerSearch || skill.n.toLowerCase().includes(lowerSearch);
              const matchesTrained = !trainedOnly || skill.a > 0;
              return matchesText && matchesTrained;
            });

            expect(result).toEqual(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('when trainedOnly is true, result contains only skills with advances > 0', () => {
      fc.assert(
        fc.property(
          arbSkillList,
          arbSearchText,
          (skills, searchText) => {
            const result = filterSkills(skills, { searchText, trainedOnly: true });

            for (const r of result) {
              expect(r.a).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('when trainedOnly is false, trained filter has no effect — only text filter applies', () => {
      fc.assert(
        fc.property(
          arbSkillList,
          arbSearchText,
          (skills, searchText) => {
            const resultAll = filterSkills(skills, { searchText, trainedOnly: false });
            const lowerSearch = searchText.toLowerCase();

            // Every skill matching text should be present
            const expectedByText = skills.filter(
              (s) => !lowerSearch || s.n.toLowerCase().includes(lowerSearch)
            );

            expect(resultAll).toEqual(expectedByText);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


// Feature: quality-of-life-improvements, Property 2: Skill Filter AND Composition

// ─── Generators for filterSkillEntries ──────────────────────────────────────

/** Arbitrary skill entry with a skill name and inCareer flag. */
const arbSkillEntry = fc.record({
  skill: fc.record({
    n: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
  }),
  inCareer: fc.boolean(),
});

/** Arbitrary skill entry list (0–30 entries). */
const arbSkillEntryList = fc.array(arbSkillEntry, { minLength: 0, maxLength: 30 });

/** Arbitrary careerOnly boolean. */
const arbCareerOnly = fc.boolean();

// ─── Property 2 Tests ───────────────────────────────────────────────────────

describe('Feature: quality-of-life-improvements', () => {
  describe('Property 2: Skill Filter AND Composition', () => {
    /**
     * **Validates: Requirements 2.2, 2.4**
     */

    it('result contains exactly skills matching BOTH search text and career filter — no omissions, no extras', () => {
      fc.assert(
        fc.property(
          arbSkillEntryList,
          arbSearchText,
          arbCareerOnly,
          (skills, searchText, careerOnly) => {
            const result = filterSkillEntries(skills, { searchText, careerOnly });
            const lowerSearch = searchText.toLowerCase();

            // Compute expected result manually using AND logic
            const expected = skills.filter((entry) => {
              const matchesText = !lowerSearch || entry.skill.n.toLowerCase().includes(lowerSearch);
              const matchesCareer = !careerOnly || entry.inCareer;
              return matchesText && matchesCareer;
            });

            // Result must equal expected exactly — same elements, same order
            expect(result).toEqual(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('no matching skill is omitted from the result', () => {
      fc.assert(
        fc.property(
          arbSkillEntryList,
          arbSearchText,
          arbCareerOnly,
          (skills, searchText, careerOnly) => {
            const result = filterSkillEntries(skills, { searchText, careerOnly });
            const lowerSearch = searchText.toLowerCase();

            // Every skill that matches both criteria must appear in result
            for (const entry of skills) {
              const matchesText = !lowerSearch || entry.skill.n.toLowerCase().includes(lowerSearch);
              const matchesCareer = !careerOnly || entry.inCareer;
              if (matchesText && matchesCareer) {
                expect(result).toContainEqual(entry);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('no non-matching skill is included in the result', () => {
      fc.assert(
        fc.property(
          arbSkillEntryList,
          arbSearchText,
          arbCareerOnly,
          (skills, searchText, careerOnly) => {
            const result = filterSkillEntries(skills, { searchText, careerOnly });
            const lowerSearch = searchText.toLowerCase();

            // Every result entry must satisfy both criteria
            for (const entry of result) {
              const matchesText = !lowerSearch || entry.skill.n.toLowerCase().includes(lowerSearch);
              const matchesCareer = !careerOnly || entry.inCareer;
              expect(matchesText && matchesCareer).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
