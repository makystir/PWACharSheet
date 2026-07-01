# Implementation Plan

## Overview

Fix the bug where new characters appear as "Down" (wCur: 0) immediately upon creation. The fix auto-initializes `wCur` to the computed wound maximum when characteristics are first assigned, using the heuristic that `wCur === 0 AND woundMax > 0` indicates an uninitialized character.

## Task Dependency Graph

```json
{
  "waves": [
    {"tasks": ["1", "2"]},
    {"tasks": ["3.1"]},
    {"tasks": ["3.2", "3.3"]},
    {"tasks": ["4"]}
  ]
}
```

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - New Character wCur Stays Zero When Wound Max Is Positive
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to characters created via `createCharacter()` or `backfillCharacter()` with characteristics assigned (S, T, WP > 0) resulting in a positive wound maximum while `wCur` remains at its initial value of 0
  - Test that for any character where `isBugCondition(character)` is true (wCur === 0 AND calculateTotalWounds(chars, woundsUseSB, hardyLevel) > 0 AND character has never taken damage), the system sets `wCur` equal to `calculateTotalWounds()`
  - Generate random characteristic values (S in [10,99], T in [10,99], WP in [10,99]) ensuring wound max > 0, create a fresh character with those stats and `wCur: 0`, run through `backfillCharacter()`, and assert `wCur === calculateTotalWounds(chars, woundsUseSB, hardyLevel)`
  - Include cases with `woundsUseSB: true` (Humans/Dwarves) and `woundsUseSB: false` (Elves/Halflings)
  - Include cases with Hardy talent (hardyLevel 1-3) to verify Hardy bonus is included in wound initialization
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists because `backfillCharacter` and the wound sync lifecycle do not auto-initialize `wCur`)
  - Document counterexamples found (e.g., "character with S:30, T:35, WP:25 has wCur=0 but woundMax=11")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 2.1, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Damaged Characters Retain Their wCur Value
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: A character with wCur=5 and woundMax=12 retains wCur=5 after `backfillCharacter()` on unfixed code
  - Observe: A character with wCur=0 that was explicitly damaged (woundMax=0 or wCur was set to 0 via damage) retains wCur=0 after `backfillCharacter()` on unfixed code
  - Observe: A character loaded from storage with wCur=8 and woundMax=14 retains wCur=8 after `backfillCharacter()` on unfixed code
  - Write property-based test: for all characters where `wCur > 0` (already in play / damaged / partially healed), running `backfillCharacter()` and `syncWoundFields()` must NOT modify `wCur` — assert `result.wCur === original.wCur`
  - Write property-based test: for all characters where `wCur > 0` and characteristics change (simulating advancement), verify `wCur` is NOT auto-synced to new wound maximum
  - Generate random characters with `wCur` in [1, woundMax] and random characteristic values, verify `backfillCharacter()` preserves `wCur` unchanged
  - Generate random characteristic advancement changes on characters with `wCur > 0`, verify `syncWoundFields()` preserves `wCur` unchanged
  - Verify tests PASS on UNFIXED code (confirms baseline preservation behavior already works)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for new character wCur auto-initialization

  - [x] 3.1 Implement the fix in `backfillCharacter` and wound sync lifecycle
    - In `src/hooks/useCharacter.ts`, modify `backfillCharacter()`: after `syncWoundFields` is called, compute `totalWounds` via `calculateTotalWounds(patched.chars, patched.woundsUseSB, hardyLevel)`. If `patched.wCur === 0` and `totalWounds > 0`, set `patched.wCur = totalWounds`
    - In the `useEffect` that syncs wound fields (triggered by `character.chars`, `character.woundsUseSB`, or `hardyLevel` changes): after `syncWoundFields`, check if `prev.wCur === 0` and new `calculateTotalWounds() > 0`. If so, also set `wCur` to the computed wound maximum. This handles the case where characteristics transition from 0 to positive values after creation
    - The heuristic `wCur === 0 AND woundMax > 0` is safe because in normal gameplay wCur === 0 means "Down" (only through explicit damage), while for a new character it means "never initialized"
    - _Bug_Condition: isBugCondition(character) where character.wCur === 0 AND calculateTotalWounds(chars, woundsUseSB, hardyLevel) > 0 AND character has never taken damage_
    - _Expected_Behavior: character.wCur === calculateTotalWounds(chars, woundsUseSB, hardyLevel) for all inputs satisfying the bug condition_
    - _Preservation: Characters with wCur > 0 must retain their current wCur value; syncWoundFields must continue to leave wCur unchanged for in-play characters_
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.1, 3.3, 3.4, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - New Character wCur Equals Wound Maximum
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (wCur === calculateTotalWounds)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — wCur is now auto-initialized to wound maximum)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Damaged Characters Retain Their wCur Value
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — characters with wCur > 0 are unaffected)
    - Confirm all preservation tests still pass after fix (no regressions to damaged character state, loaded characters, or advancement scenarios)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite to verify no unintended side effects
  - Verify that the Combat Dashboard does not display "⚠ Down!" banner for freshly created characters with assigned characteristics
  - Verify that characters which have genuinely taken damage to wCur=0 still show the "⚠ Down!" banner correctly
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- The heuristic `wCur === 0 AND woundMax > 0` is safe because in normal gameplay, a character at wCur=0 has been explicitly damaged ("Down"), while for a new character it means "never initialized"
- The fix targets two code paths: `backfillCharacter()` (handles characters loaded from storage) and the wound sync `useEffect` (handles real-time characteristic assignment)
- No schema migration is needed — the fix uses existing fields with a behavioral heuristic rather than adding new tracking fields
