# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - (Any X) and (X or Y) Patterns Return False for Valid Specializations
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists in `careerSkillMatches`
  - **Scoped PBT Approach**: Scope the property to concrete failing cases from the Mage, Soldier, and Artisan careers
  - Test file: `src/logic/__tests__/advancement.test.ts` (add new describe block)
  - Test that `careerSkillMatches("Channelling (Any Colour)", "Channelling (Aqshy)")` returns `true` (from Bug Condition: `(Any X)` pattern)
  - Test that `careerSkillMatches("Arcane Magic (Any Arcane Lore)", "Arcane Magic (Fire)")` returns `true` (from Bug Condition: `(Any X)` pattern)
  - Test that `careerSkillMatches("Art (Calligraphy or Engraving)", "Art (Calligraphy)")` returns `true` (from Bug Condition: `(X or Y)` pattern)
  - Test that `careerSkillMatches("Art (Calligraphy or Engraving)", "Art (Engraving)")` returns `true` (from Bug Condition: `(X or Y)` second option)
  - Test that `careerSkillMatches("Play (Drum or Fife)", "Play (Fife)")` returns `true` (from Bug Condition: `(X or Y)` pattern)
  - Test that `careerSkillMatches("Stealth (Rural or Urban)", "Stealth (Urban)")` returns `true` (from Bug Condition: `(X or Y)` pattern)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: all cases return `false` instead of `true` because no code path handles `(Any X)` or `(X or Y)` patterns
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Match Behavior Unchanged for Non-Bug-Condition Inputs
  - **IMPORTANT**: Follow observation-first methodology
  - Test file: `src/logic/__tests__/advancement.test.ts` (add new describe block)
  - Observe on UNFIXED code: `careerSkillMatches("Melee (Basic)", "Melee (Basic)")` returns `true` (exact match)
  - Observe on UNFIXED code: `careerSkillMatches("Melee (Any)", "Melee (Basic)")` returns `true` (Any wildcard)
  - Observe on UNFIXED code: `careerSkillMatches("Melee (Any)", "Melee (Two-Handed)")` returns `true` (Any wildcard)
  - Observe on UNFIXED code: `careerSkillMatches("Stealth", "Stealth (Urban)")` returns `true` (ungrouped match)
  - Observe on UNFIXED code: `careerSkillMatches("Melee (Basic)", "Melee (Two-Handed)")` returns `false` (specific mismatch)
  - Observe on UNFIXED code: `careerSkillMatches("Melee (Any)", "Ranged (Bow)")` returns `false` (different base)
  - Observe on UNFIXED code: `careerSkillMatches("Athletics", "Climb")` returns `false` (unrelated)
  - Write property-based tests using fast-check: for all generated non-bug-condition inputs, verify `careerSkillMatches` returns the expected result
  - Property: for any exact skill name pair, `careerSkillMatches(name, name)` returns `true`
  - Property: for any `(Any)` pattern with matching base, returns `true`; with different base, returns `false`
  - Property: for any ungrouped career skill, character skill with same base + specialization returns `true`
  - Property: for any specific specialization mismatch, returns `false`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for (Any X) and (X or Y) pattern matching in careerSkillMatches

  - [x] 3.1 Implement the fix in `careerSkillMatches`
    - Add `(Any X)` pattern branch after existing `(Any)` check: detect career skill containing `(Any ` (with trailing space), extract base name before ` (Any`, match if character skill starts with `base + " ("`
    - Add `(X or Y)` pattern branch after `(Any X)` check: detect parenthesized content containing ` or `, extract base name before ` (`, split options on ` or `, match if character skill equals `base + " (" + option.trim() + ")"` for any option
    - Ensure ordering: exact match → `(Any)` → `(Any X)` → `(X or Y)` → ungrouped → `false`
    - File: `src/logic/advancement.ts`, function `careerSkillMatches` (line 292)
    - _Bug_Condition: isBugCondition(input) where careerSkill contains "(Any X)" or "(X or Y)" pattern and characterSkill is a valid specialization_
    - _Expected_Behavior: careerSkillMatches returns true for valid specializations matching (Any X) or (X or Y) patterns_
    - _Preservation: Exact match, (Any) wildcard, ungrouped matching, and non-match behavior unchanged_
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - (Any X) and (X or Y) Patterns Match Valid Specializations
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Match Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite: `npx vitest --run`
  - Ensure all existing tests in `src/logic/__tests__/advancement.test.ts` still pass
  - Ensure all component tests that depend on career skill matching still pass
  - Ask the user if questions arise
