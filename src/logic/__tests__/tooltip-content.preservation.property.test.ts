import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { resolveSkillTooltip, resolveTalentTooltip } from '../tooltip-content';
import { SKILL_DESCRIPTIONS } from '../../data/skill-descriptions';
import { TALENT_DB } from '../../data/talents';

/**
 * Property 2: Preservation - Existing Tooltip Behavior Unchanged
 *
 * These tests capture the baseline behavior of the tooltip resolution system
 * BEFORE implementing the fix. They must pass on unfixed code and continue
 * to pass after the fix is applied, ensuring no regressions.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 */

// ─── Generators ─────────────────────────────────────────────────────────────

/** Generator: picks a random key from SKILL_DESCRIPTIONS */
const arbExistingSkillKey = fc.constantFrom(...Object.keys(SKILL_DESCRIPTIONS));

/** Generator: picks a random entry from TALENT_DB */
const arbExistingTalentEntry = fc.constantFrom(...TALENT_DB);

/**
 * Generator: grouped skills that use prefix matching.
 * These are skills where the base name (before parenthetical) exists as a key
 * in SKILL_DESCRIPTIONS, so prefix matching works.
 */
const groupedSkillsWithBaseKey = Object.keys(SKILL_DESCRIPTIONS).filter(
  (k) => !k.includes('('),
);

/** Sample specializations to combine with base skill names */
const arbSpecialization = fc.constantFrom(
  'Khazalid',
  'History',
  'Apothecary',
  'Barge',
  'Acrobatics',
  'Thief',
  'Dog',
  'Aqshy',
  'Bow',
  'Classical',
  'Guild',
);

/** Generator: a grouped skill name with a specialization that resolves via prefix */
const arbGroupedSkillWithPrefix = fc
  .tuple(
    fc.constantFrom(...groupedSkillsWithBaseKey),
    arbSpecialization,
  )
  .map(([base, spec]) => `${base} (${spec})`);

/** Generator: arbitrary non-empty string for custom talent names not in TALENT_DB */
const existingTalentNames = new Set(TALENT_DB.map((t) => t.name));
const arbCustomTalentName = fc
  .string({ minLength: 3, maxLength: 30 })
  .filter((s) => s.trim().length > 0 && !existingTalentNames.has(s));

/** Generator: arbitrary non-empty character description */
const arbNonEmptyCharDesc = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

/** Generator: characteristic abbreviation */
const arbCharacteristic = fc.constantFrom(
  'WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel',
);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Property 2: Preservation - Existing Tooltip Behavior Unchanged', () => {
  describe('3.1 Existing skill descriptions resolve correctly', () => {
    /**
     * **Validates: Requirements 3.1**
     *
     * For all existing SKILL_DESCRIPTIONS keys, resolveSkillTooltip()
     * returns a non-null result with the same description text.
     */
    it('every key in SKILL_DESCRIPTIONS resolves to a non-null tooltip with correct description', () => {
      fc.assert(
        fc.property(
          arbExistingSkillKey,
          arbCharacteristic,
          (skillName, characteristic) => {
            const result = resolveSkillTooltip(skillName, characteristic);

            // Must return non-null
            expect(result).not.toBeNull();
            // Title must match skill name
            expect(result!.title).toBe(skillName);
            // Description section must match SKILL_DESCRIPTIONS entry exactly
            expect(result!.sections[0].label).toBe('Description');
            expect(result!.sections[0].text).toBe(SKILL_DESCRIPTIONS[skillName]);
            // Characteristic section must be present
            expect(result!.sections[1].label).toBe('Linked Characteristic');
            expect(result!.sections[1].text).toBe(characteristic);
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  describe('3.2 Existing talent entries resolve correctly', () => {
    /**
     * **Validates: Requirements 3.2**
     *
     * For all existing TALENT_DB entries, resolveTalentTooltip(name, '')
     * returns a non-null result with the same desc and max values.
     */
    it('every TALENT_DB entry resolves to a tooltip with matching desc and max', () => {
      fc.assert(
        fc.property(arbExistingTalentEntry, (talentEntry) => {
          const result = resolveTalentTooltip(talentEntry.name, '');

          // Must return non-null
          expect(result).not.toBeNull();
          // Title must match talent name
          expect(result!.title).toBe(talentEntry.name);
          // Description must match DB entry
          expect(result!.sections[0].label).toBe('Description');
          expect(result!.sections[0].text).toBe(talentEntry.desc);
          // Max must match DB entry
          expect(result!.sections[1].label).toBe('Max');
          expect(result!.sections[1].text).toBe(talentEntry.max);
        }),
        { numRuns: 200 },
      );
    });
  });

  describe('3.3 Grouped skill prefix-match fallback preserves behavior', () => {
    /**
     * **Validates: Requirements 3.4**
     *
     * For grouped skills with parenthetical specializations where the
     * base name exists in SKILL_DESCRIPTIONS, prefix-match fallback
     * produces the correct group description.
     */
    it('grouped skills with known base keys resolve to the base description', () => {
      fc.assert(
        fc.property(
          arbGroupedSkillWithPrefix,
          arbCharacteristic,
          (groupedSkillName, characteristic) => {
            const baseName = groupedSkillName.split(' (')[0];
            const result = resolveSkillTooltip(groupedSkillName, characteristic);

            // If the exact grouped name exists in SKILL_DESCRIPTIONS, use that
            if (SKILL_DESCRIPTIONS[groupedSkillName]) {
              expect(result).not.toBeNull();
              expect(result!.sections[0].text).toBe(
                SKILL_DESCRIPTIONS[groupedSkillName],
              );
            } else {
              // Otherwise it should resolve via prefix to the base description
              expect(result).not.toBeNull();
              expect(result!.title).toBe(groupedSkillName);
              expect(result!.sections[0].text).toBe(SKILL_DESCRIPTIONS[baseName]);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('3.4 Custom talent fallback to character description', () => {
    /**
     * **Validates: Requirements 3.3**
     *
     * For talent names not in TALENT_DB with a non-empty character description,
     * the character description is returned as fallback.
     */
    it('unknown talent with non-empty character desc returns that desc as fallback', () => {
      fc.assert(
        fc.property(
          arbCustomTalentName,
          arbNonEmptyCharDesc,
          (talentName, charDesc) => {
            const result = resolveTalentTooltip(talentName, charDesc);

            // Must return non-null (character description fallback)
            expect(result).not.toBeNull();
            // Title should be the talent name passed in
            expect(result!.title).toBe(talentName);
            // Should have a single Description section with the character desc
            expect(result!.sections).toHaveLength(1);
            expect(result!.sections[0].label).toBe('Description');
            expect(result!.sections[0].text).toBe(charDesc);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('unknown talent with empty character desc returns null', () => {
      fc.assert(
        fc.property(arbCustomTalentName, (talentName) => {
          const result = resolveTalentTooltip(talentName, '');

          // No DB entry and no character description => null
          expect(result).toBeNull();
        }),
        { numRuns: 100 },
      );
    });
  });
});
