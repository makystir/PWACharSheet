# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Missing Random Talent Slots and Rolling Mechanism
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate Human/Halfling random talents are missing
  - **Scoped PBT Approach**: Scope the property to concrete failing cases — Human (Reiklander) with 3 random talent slots, Halfling with 2 random talent slots
  - Test that `SPECIES_DATA["Human / Reiklander"].randomTalentSlots` exists and equals 3
  - Test that `SPECIES_DATA["Halfling"].randomTalentSlots` exists and equals 2
  - Test that `RANDOM_TALENT_TABLE` exists with 36 entries covering roll ranges 1–100 with no gaps or overlaps
  - Test that for any d100 roll value (1–100), `rollRandomTalent(roll)` returns a non-empty valid talent string
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists: `randomTalentSlots` is undefined and `RANDOM_TALENT_TABLE` does not exist)
  - Document counterexamples found: `SPECIES_DATA["Human / Reiklander"].randomTalentSlots` is `undefined`, no `RANDOM_TALENT_TABLE` export exists
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Random-Talent Species Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - **Step 1 - Observe**: Run UNFIXED code for all species WITHOUT random talent slots (Dwarfs, High Elves, Wood Elves) and record their fixed talent lists from `SPECIES_DATA`
  - **Step 2 - Observe**: For Human/Halfling, record the existing fixed talents ("Doomed", "Savvy or Suave" for Human; "Acute Sense (Taste)", "Night Vision", "Resistance (Chaos)", "Small" for Halfling)
  - **Step 3 - Write property-based tests**:
    - For all species where `(randomTalentSlots ?? 0) === 0`: assert talents array matches observed baseline exactly
    - For Human: assert fixed talents still include "Doomed" and "Savvy or Suave" regardless of random talent additions
    - For Halfling: assert fixed talents still include all 4 fixed talents regardless of random talent additions
    - For "Savvy or Suave" choice: assert `parseTalentOptions` still splits "Savvy or Suave" into choices correctly
  - Verify tests PASS on UNFIXED code (confirms baseline behavior to preserve)
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Implement the random talents fix

  - [x] 3.1 Add `randomTalentSlots` field to `SpeciesData` interface
    - In `src/types/character.ts`, add `randomTalentSlots?: number` to the `SpeciesData` interface
    - _Bug_Condition: isBugCondition(input) where species IN ["Human / Reiklander", "Halfling"] AND speciesData.randomTalentSlots IS undefined_
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 Add `randomTalentSlots` values to species data entries
    - In `src/data/species.ts`, add `randomTalentSlots: 3` to "Human / Reiklander" entry
    - In `src/data/species.ts`, add `randomTalentSlots: 2` to "Halfling" entry
    - All other species entries remain unchanged (no `randomTalentSlots` field)
    - _Bug_Condition: isBugCondition(input) where species needs random talent count defined_
    - _Expected_Behavior: Human gets 3 slots, Halfling gets 2 slots, others get none_
    - _Preservation: All Dwarf/Elf species must have no randomTalentSlots field_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3_

  - [x] 3.3 Create `src/data/randomTalents.ts` with the d100 Random Talent table
    - Export `RandomTalentEntry` interface: `{ min: number, max: number, talent: string }`
    - Export `RANDOM_TALENT_TABLE` array with 36 entries covering full 1–100 range
    - Export `rollRandomTalent(roll: number): string` function that maps a d100 result to a talent name
    - Validate no gaps or overlaps in roll ranges
    - _Bug_Condition: isBugCondition(input) where no RANDOM_TALENT_TABLE exists for lookup_
    - _Expected_Behavior: rollRandomTalent(n) returns valid talent name for any n in 1–100_
    - _Requirements: 1.4, 2.4_

  - [x] 3.4 Extend `CharacterWizard.tsx` with random talent state and roll logic
    - Add state: `const [randomTalents, setRandomTalents] = useState<(string | null)[]>([])`
    - Reset `randomTalents` to `Array(speciesData.randomTalentSlots ?? 0).fill(null)` when species changes
    - Add `handleRollRandomTalent(slotIndex: number)` handler using existing `rollD100()` and new `rollRandomTalent()`
    - Add duplicate detection: compare rolled talent against resolved fixed talents and other random talent slots
    - Add conditional "Random Talents" UI section in `renderStep4()` when `speciesData.randomTalentSlots > 0`
    - Each slot shows: roll button (or reroll if duplicate), rolled talent name, duplicate warning
    - _Bug_Condition: isBugCondition(input) where wizard has no random talent state/UI_
    - _Expected_Behavior: wizard displays roll buttons, shows results, detects duplicates, offers reroll_
    - _Preservation: No random talent UI appears for species without randomTalentSlots_
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 3.1, 3.2, 3.3_

  - [x] 3.5 Integrate random talents into character finalization
    - In the wizard's character build/finalization step, append `randomTalents.filter(Boolean)` to resolved talents
    - Ensure final `char.talents` contains fixed species talents + chosen talents + all rolled random talents
    - _Bug_Condition: isBugCondition(input) where getResolvedTalents() omits random talents_
    - _Expected_Behavior: character.talents includes all rolled random talents alongside fixed talents_
    - _Preservation: Species without randomTalentSlots have identical finalization behavior_
    - _Requirements: 2.6, 3.4, 3.5_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Random Talents Are Rolled and Saved
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior: `randomTalentSlots` exists, `RANDOM_TALENT_TABLE` has 36 entries, `rollRandomTalent()` returns valid talents
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Random-Talent Species Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite and confirm all property-based tests and unit tests pass
  - Verify Human character creation produces 2 fixed + 3 random talents
  - Verify Halfling character creation produces 4 fixed + 2 random talents
  - Verify Dwarf/Elf character creation is completely unchanged
  - Ensure all tests pass, ask the user if questions arise.


