# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Species Data Matches Source Documents
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists in SPECIES_DATA
  - **Scoped PBT Approach**: Scope the property to the three concrete failing cases: Halfling skills, High Elf skills, Sea Elf talents
  - Test that `SPECIES_DATA["Halfling"].skills` contains "Trade (Cook)" and does NOT contain "Gossip"
  - Test that `SPECIES_DATA["High Elf"].skills` contains "Swim" and does NOT contain "Research"
  - Test that `SPECIES_DATA["High Elves (Sea Elf)"].talents` contains "Uncouth Uranai" and has exactly 6 entries
  - Write property-based test in `src/data/__tests__/species.bugCondition.property.test.ts`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: Halfling has "Gossip" instead of "Trade (Cook)", High Elf has "Research" instead of "Swim", Sea Elf talents missing "Uncouth Uranai" (only 5 entries)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Unchanged Species Data Integrity
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Snapshot all SPECIES_DATA entries for non-affected species on UNFIXED code
  - Observe: Human/Reiklander skills and talents remain as currently defined
  - Observe: All Dwarf subrace entries remain as currently defined
  - Observe: Wood Elf skills and talents remain as currently defined
  - Observe: Ogre skills, talents, and characteristics remain as currently defined
  - Observe: All 10 High Elf subrace entries (Caledor, Ellyrion, Avelorn, Saphery, Eataine, Tiranoc, Nagarythe, Chrace, Cothique, Yvresse) remain as currently defined
  - Observe: Halfling characteristics, move, fate, resilience, extraPoints, woundsUseSB, randomTalentSlots, and talents remain unchanged
  - Observe: Sea Elf characteristics, move, fate, resilience, extraPoints, woundsUseSB, and skills remain unchanged
  - Write property-based test: for all species keys in SPECIES_DATA where isBugCondition is false, all fields match the observed snapshot
  - Write property-based test: for Halfling and Sea Elf non-corrected fields, values match observed snapshot
  - Write tests in `src/data/__tests__/species.preservation.property.test.ts`
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for species data inaccuracies and source file relocation

  - [x] 3.1 Correct Halfling species skill in `src/data/species.ts`
    - Replace "Gossip" with "Trade (Cook)" in the Halfling skills array
    - Ensure alphabetical ordering is maintained in the skills list
    - _Bug_Condition: isBugCondition(input) where input.speciesKey == "Halfling" AND "Gossip" IN skills_
    - _Expected_Behavior: Halfling skills contain "Trade (Cook)" instead of "Gossip" per core rulebook p.33_
    - _Preservation: Halfling characteristics, move, fate, resilience, extraPoints, woundsUseSB, randomTalentSlots, and talents remain unchanged_
    - _Requirements: 2.1, 3.6_

  - [x] 3.2 Correct base High Elf species skill in `src/data/species.ts`
    - Replace "Research" with "Swim" in the High Elf skills array
    - Ensure alphabetical ordering is maintained in the skills list
    - _Bug_Condition: isBugCondition(input) where input.speciesKey == "High Elf" AND "Research" IN skills_
    - _Expected_Behavior: High Elf skills contain "Swim" instead of "Research" per core rulebook p.33_
    - _Preservation: High Elf characteristics, move, fate, resilience, extraPoints, woundsUseSB, and talents remain unchanged_
    - _Requirements: 2.2, 3.5_

  - [x] 3.3 Add missing Sea Elf talent in `src/data/species.ts`
    - Add "Uncouth Uranai" to the Sea Elf talents array
    - Ensure the talents array now has exactly 6 entries
    - _Bug_Condition: isBugCondition(input) where input.speciesKey == "High Elves (Sea Elf)" AND "Uncouth Uranai" NOT IN talents_
    - _Expected_Behavior: Sea Elf talents include "Uncouth Uranai" per High Elf Player's Guide p.57_
    - _Preservation: Sea Elf characteristics, move, fate, resilience, extraPoints, woundsUseSB, and skills remain unchanged_
    - _Requirements: 2.3, 3.5_

  - [x] 3.4 Move source documents from project root to `docs/` directory
    - Move `Up_In_Arms.md` → `docs/Up_In_Arms.md`
    - Move `WarhammerFantasyRoleplay4e.md` → `docs/WarhammerFantasyRoleplay4e.md`
    - Move `windsofmagic.md` → `docs/windsofmagic.md`
    - Move `archivesoftheempire.md` → `docs/archivesoftheempire.md`
    - Move `archivesoftheempire2.md` → `docs/archivesoftheempire2.md`
    - Move `archivesoftheempire3.md` → `docs/archivesoftheempire3.md`
    - Verify no imports, scripts, or configuration files reference the old root-level paths
    - _Expected_Behavior: All source documents reside in docs/ directory_
    - _Requirements: 2.4_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Species Data Matches Source Documents
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Unchanged Species Data Integrity
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite to verify no regressions
  - Verify bug condition exploration test passes (species data corrected)
  - Verify preservation property tests pass (no unintended changes)
  - Verify source documents exist in `docs/` and not in project root
  - Ensure all tests pass, ask the user if questions arise.


