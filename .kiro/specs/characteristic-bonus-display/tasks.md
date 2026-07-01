# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Characteristic Bonus Column Missing
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Generate random CharacteristicValue objects (`i: 0-99`, `a: 0-99`, `b: 0-9`) and assert that the rendered Characteristics table contains a "CB" column displaying `Math.floor((i + a + b) / 10)` for each characteristic
  - Test that the Characteristics table header includes a "CB" column (from Bug Condition: `characteristicBonusColumnNotDisplayed()`)
  - Test that for any characteristic, the CB cell value equals `Math.floor(current / 10)` where `current = c.i + c.a + c.b` (from Expected Behavior: requirement 2.2)
  - Test that the talent bonus column header reads "T. Bonus" or "Talent Bonus", NOT bare "Bonus" (from Bug Condition: `columnHeaderReads('Bonus') INSTEAD OF 'Talent Bonus'`)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists: no CB column rendered, header still reads "Bonus")
  - Document counterexamples found: no element with text "CB" in table header, no cell displaying tens-digit value, column header reads "Bonus" rather than "T. Bonus"
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Talent Bonus Display and Derived Calculations Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: On unfixed code, the talent bonus column displays `c.b` value (or "—" when `c.b === 0`) for each characteristic
  - Observe: `getBonus(35)` returns `3`, `getBonus(42)` returns `4`, `getBonus(10)` returns `1`
  - Observe: `computeWoundMaximum` and `calculateMaxEncumbrance` return consistent results for given inputs
  - Write property-based test: For all CharacteristicValue objects (`i: 0-99`, `a: 0-99`, `b: 0-9`), verify the talent bonus cell displays `c.b` (or "—" when zero) - unchanged from pre-fix
  - Write property-based test: For all valid inputs, verify `getBonus(value)` equals `Math.floor(value / 10)` (function behavior preserved)
  - Write property-based test: For random S, T, WP values and Hardy levels, verify `computeWoundMaximum` returns identical results
  - Write property-based test: For random S, T values and Strong Back levels, verify `calculateMaxEncumbrance` returns identical results
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Fix for missing Characteristic Bonus column and misleading Bonus label

  - [x] 3.1 Add `getBonus` import to CharacterPage.tsx
    - Import `getBonus` from `../../logic/calculators` in `CharacterPage.tsx`
    - _Bug_Condition: isBugCondition(input) where characteristicBonusColumnNotDisplayed() is true_
    - _Expected_Behavior: getBonus(current) is available for rendering CB values_
    - _Requirements: 2.2_

  - [x] 3.2 Rename "Bonus" column header to "T. Bonus"
    - In CharacterPage.tsx, change the `<th>` from `title="Talent Bonus">Bonus</th>` to `title="Talent Bonus">T. Bonus</th>`
    - This eliminates the ambiguity where players confuse talent bonus with Characteristic Bonus
    - _Bug_Condition: columnHeaderReads('Bonus') INSTEAD OF 'Talent Bonus'_
    - _Expected_Behavior: Column header clearly reads "T. Bonus" with tooltip "Talent Bonus"_
    - _Preservation: Talent bonus values (c.b) continue to display unchanged in this column_
    - _Requirements: 2.1, 3.1_

  - [x] 3.3 Add CB column header to Characteristics table
    - Insert `<th className={styles.thCenter} title="Characteristic Bonus">CB</th>` after the Current column and before the Talent Bonus column
    - _Bug_Condition: characteristicBonusColumnNotDisplayed()_
    - _Expected_Behavior: A dedicated "CB" column header is rendered in the table_
    - _Requirements: 2.2_

  - [x] 3.4 Add CB cell in each characteristic row
    - Inside the `CHAR_KEYS.map()` render, after the Current `<td>`, add a `<td className={styles.charCB}>{getBonus(current)}</td>` displaying `Math.floor(current / 10)`
    - _Bug_Condition: isBugCondition(input) where cb >= 0 AND characteristicBonusColumnNotDisplayed()_
    - _Expected_Behavior: expectedBehavior(result) where renderedCB == FLOOR(current / 10) for each characteristic_
    - _Preservation: Talent bonus display and all derived getBonus() calculations remain unchanged_
    - _Requirements: 2.2, 3.2_

  - [x] 3.5 Add `.charCB` CSS class to CharacterPage.module.css
    - Add `.charCB` class styled with appropriate font weight (bold) and accent color to highlight the derived value
    - Follow the same pattern as `.charCurrent` but with styling that draws attention to this important game mechanic value
    - _Requirements: 2.2_

  - [x] 3.6 Update responsive CSS rules for CB column
    - Ensure the CB column displays correctly on mobile viewports
    - Consider hiding behavior below 360px alongside the talent bonus column if space is insufficient
    - _Preservation: Existing mobile responsive behavior for other columns must remain unchanged_
    - _Requirements: 2.2_

  - [x] 3.7 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Characteristic Bonus Column Displays Correct Value
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (CB column exists with correct values, header reads "T. Bonus")
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [x] 3.8 Verify preservation tests still pass
    - **Property 2: Preservation** - Talent Bonus Display and Derived Calculations Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm talent bonus values still display correctly, getBonus() returns same results, computeWoundMaximum and calculateMaxEncumbrance produce identical outputs
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite to confirm no regressions
  - Verify all property-based tests pass (bug condition and preservation)
  - Verify unit tests pass for CB column rendering
  - Ensure responsive layout works at various breakpoints
  - Ask the user if questions arise

