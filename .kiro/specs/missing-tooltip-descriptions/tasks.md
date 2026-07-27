# Implementation Plan: Missing Tooltip Descriptions Bugfix

## Overview

Fix missing tooltip descriptions for skills and talents in the WFRP 4e character sheet. The bug affects three categories: (1) advanced skills present in `ADV_SKILL_DB` but missing from `SKILL_DESCRIPTIONS` (Augury, Psychometry, Runesmithing), (2) talents referenced in career data but absent from `TALENT_DB` (Pharmacist, Numerate, Numismatics, Cat-tongued, Supportive, Flagellant, Sharp-eyed, Stealthy), and (3) name variant mismatches where career data uses spellings that don't match canonical `TALENT_DB` entries. The fix adds missing data entries and introduces a name-variant alias resolution layer in the tooltip lookup.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Missing Skills and Talents Return Null Tooltips
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing cases: the 3 missing skills (Augury, Psychometry, Runesmithing), the 8 missing talents (Pharmacist, Numerate, Numismatics, Cat-tongued, Supportive, Flagellant, Sharp-eyed, Stealthy), and the 9 name variants (Trick Rider, Public Speaker, Strongminded, Stouthearted, Wellprepared, Warleader, Cat Fall, Detect Artifact, Public-Speaking)
  - Test that `resolveSkillTooltip(name, characteristic)` returns non-null with non-empty description for each missing skill
  - Test that `resolveTalentTooltip(name, '')` returns non-null with non-empty description for each missing talent and name variant
  - Bug condition from design: `isBugCondition(input)` where name is in KNOWN_MISSING or KNOWN_VARIANT sets AND no matching DB entry exists
  - Expected behavior: all buggy inputs should resolve to a `TooltipContent` object with non-empty `sections[0].text`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., `resolveSkillTooltip('Augury', 'Int')` returns `null`, `resolveTalentTooltip('Warleader', '')` returns `null`)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Tooltip Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - **IMPORTANT**: Write and run these tests BEFORE implementing the fix
  - Observe: For every key in current `SKILL_DESCRIPTIONS`, call `resolveSkillTooltip()` on unfixed code and record the result
  - Observe: For every entry in current `TALENT_DB`, call `resolveTalentTooltip(entry.name, '')` on unfixed code and record the result
  - Observe: Grouped skills like "Melee (Cavalry)", "Language (Khazalid)" resolve via prefix matching on unfixed code
  - Observe: Custom talents with character-level descriptions fall back correctly (e.g., `resolveTalentTooltip('CustomTalent', 'My description')` returns character description)
  - Write property-based test: for all existing `SKILL_DESCRIPTIONS` keys, `resolveSkillTooltip()` returns a non-null result with the same description text
  - Write property-based test: for all existing `TALENT_DB` entries, `resolveTalentTooltip(name, '')` returns a non-null result with the same desc and max values
  - Write property-based test: for grouped skills with parenthetical specializations, prefix-match fallback produces the correct group description
  - Write property-based test: for talent names not in `TALENT_DB` with a non-empty character description, the character description is returned as fallback
  - Verify all preservation tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for missing tooltip descriptions

  - [x] 3.1 Add missing skill description entries to `src/data/skill-descriptions.ts`
    - Add `'Augury'` entry with description and Int characteristic reference
    - Add `'Psychometry'` entry with description and Int characteristic reference
    - Add `'Runesmithing'` entry with description and Dex characteristic reference
    - _Bug_Condition: isBugCondition(input) where input.kind == 'skill' AND input.name IN ['Augury', 'Psychometry', 'Runesmithing'] AND SKILL_DESCRIPTIONS[input.name] == undefined_
    - _Expected_Behavior: resolveSkillTooltip(name, characteristic) returns non-null TooltipContent with non-empty description_
    - _Preservation: Existing SKILL_DESCRIPTIONS entries must continue to resolve identically_
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 3.2 Add missing talent entries to `src/data/talents.ts`
    - Add entry for Pharmacist with appropriate name, max, and desc
    - Add entry for Numerate with appropriate name, max, and desc
    - Add entry for Numismatics with appropriate name, max, and desc
    - Add entry for Cat-tongued with appropriate name, max, and desc
    - Add entry for Supportive with appropriate name, max, and desc
    - Add entry for Flagellant with appropriate name, max, and desc
    - Add entry for Sharp-eyed with appropriate name, max, and desc
    - Add entry for Stealthy with appropriate name, max, and desc
    - _Bug_Condition: isBugCondition(input) where input.kind == 'talent' AND input.name IN KNOWN_MISSING_TALENTS AND TALENT_DB.find(t => t.name == input.name) == undefined_
    - _Expected_Behavior: resolveTalentTooltip(name, '') returns non-null TooltipContent with non-empty desc and max_
    - _Preservation: Existing TALENT_DB entries must continue to resolve identically_
    - _Requirements: 1.2, 2.2, 3.2_

  - [x] 3.3 Create talent alias map and integrate into tooltip resolution
    - Create `TALENT_ALIASES` constant (in `src/data/talent-aliases.ts` or `src/data/talents.ts`) mapping variant names to canonical names: Warleader→War Leader, Public Speaker→Public Speaking, Public-Speaking→Public Speaking, Cat Fall→Catfall, Detect Artifact→Detect Artefact, Stouthearted→Stout-hearted, Strongminded→Strong-minded, Trick Rider→Trick Riding, Trick-Riding→Trick Riding, Wellprepared→Well-prepared
    - Update `resolveTalentTooltip()` in `src/logic/tooltip-content.ts` to resolve through alias map before `TALENT_DB.find()`: `const canonicalName = TALENT_ALIASES[talentName] ?? talentName;`
    - Ensure alias resolution does NOT interfere when the exact name already exists in `TALENT_DB`
    - _Bug_Condition: isBugCondition(input) where input.kind == 'talent' AND input.name IN KNOWN_VARIANT_NAMES AND TALENT_DB.find(t => t.name == input.name) == undefined_
    - _Expected_Behavior: resolveTalentTooltip(variantName, '') resolves to canonical entry and returns non-null TooltipContent_
    - _Preservation: Existing talents looked up by exact canonical name must continue to resolve identically; alias map must not shadow existing entries_
    - _Requirements: 1.3, 2.3, 3.2_

  - [x] 3.4 Remove workarounds from `src/data/__tests__/static-data.test.ts`
    - Remove entries from `knownMissing` set that are now resolved by data additions
    - Remove entries from `knownAliases` map that are now handled by production alias resolution
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Missing Skills and Talents Return Null Tooltips
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Tooltip Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite to confirm no regressions
  - Verify exploration test (Property 1) passes with fix applied
  - Verify preservation tests (Property 2) still pass
  - Verify existing `static-data.test.ts` passes without workarounds
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- The project uses Vitest + fast-check for property-based testing (already configured)
- Task 1 (exploration test) intentionally fails on unfixed code — this confirms the bug exists and documents the root cause
- Task 2 (preservation tests) must pass on unfixed code — this captures baseline behavior before any changes
- The alias map approach is preferred over normalizing all names because it's explicit, auditable, and doesn't risk false matches
- WFRP 4e source book descriptions should be paraphrased for the talent/skill entries to avoid copyright issues
- The `knownMissing` and `knownAliases` workarounds in `static-data.test.ts` were temporary test suppressions; removing them after the fix ensures the test suite catches future data gaps

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 2, "tasks": ["3.4"] },
    { "id": 3, "tasks": ["3.5", "3.6"] },
    { "id": 4, "tasks": ["4"] }
  ]
}
```
