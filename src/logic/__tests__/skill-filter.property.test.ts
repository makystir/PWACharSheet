import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { filterSkills } from '../skill-filter';

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
