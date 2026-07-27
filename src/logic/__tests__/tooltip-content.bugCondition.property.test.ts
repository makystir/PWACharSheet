import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { resolveSkillTooltip, resolveTalentTooltip } from '../tooltip-content';

/**
 * Bug Condition Exploration Property Test
 *
 * Property 1: Bug Condition — Missing Skills and Talents Return Null Tooltips
 *
 * This test encodes the EXPECTED (correct) behavior: resolveSkillTooltip() and
 * resolveTalentTooltip() should return non-null TooltipContent with non-empty
 * description for all known missing skills, missing talents, and name variants.
 *
 * On UNFIXED code, this test is EXPECTED TO FAIL because:
 * - Missing skills (Augury, Psychometry, Runesmithing) have no SKILL_DESCRIPTIONS entry
 * - Missing talents (Pharmacist, Numerate, etc.) have no TALENT_DB entry
 * - Name variants (Warleader, Cat Fall, etc.) don't match any TALENT_DB entry exactly
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 */

// ─── Known Buggy Inputs ─────────────────────────────────────────────────────

/** Skills present in ADV_SKILL_DB but missing from SKILL_DESCRIPTIONS */
const KNOWN_MISSING_SKILLS: Array<{ name: string; characteristic: string }> = [
  { name: 'Augury', characteristic: 'Int' },
  { name: 'Psychometry', characteristic: 'Int' },
  { name: 'Runesmithing', characteristic: 'Dex' },
];

/** Talents referenced in career data but absent from TALENT_DB */
const KNOWN_MISSING_TALENTS: string[] = [
  'Pharmacist',
  'Numerate',
  'Numismatics',
  'Cat-tongued',
  'Supportive',
  'Flagellant',
  'Sharp-eyed',
  'Stealthy',
];

/** Name variants used in career data that don't match canonical TALENT_DB entries */
const KNOWN_VARIANT_NAMES: string[] = [
  'Trick Rider',
  'Public Speaker',
  'Strongminded',
  'Stouthearted',
  'Wellprepared',
  'Warleader',
  'Cat Fall',
  'Detect Artifact',
  'Public-Speaking',
];

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Bugfix: missing-tooltip-descriptions', () => {
  describe('Property 1: Bug Condition — Missing Skills and Talents Return Null Tooltips', () => {
    it('resolveSkillTooltip() returns non-null with non-empty description for each missing skill', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...KNOWN_MISSING_SKILLS),
          (skill) => {
            const result = resolveSkillTooltip(skill.name, skill.characteristic);

            // Expected behavior: should return a valid TooltipContent
            expect(result).not.toBeNull();
            expect(result!.sections[0].text).toBeTruthy();
            expect(result!.sections[0].text.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('resolveTalentTooltip() returns non-null with non-empty description for each missing talent', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...KNOWN_MISSING_TALENTS),
          (talentName) => {
            const result = resolveTalentTooltip(talentName, '');

            // Expected behavior: should return a valid TooltipContent
            expect(result).not.toBeNull();
            expect(result!.sections[0].text).toBeTruthy();
            expect(result!.sections[0].text.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('resolveTalentTooltip() returns non-null with non-empty description for each name variant', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...KNOWN_VARIANT_NAMES),
          (variantName) => {
            const result = resolveTalentTooltip(variantName, '');

            // Expected behavior: should resolve variant to canonical entry
            expect(result).not.toBeNull();
            expect(result!.sections[0].text).toBeTruthy();
            expect(result!.sections[0].text.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
