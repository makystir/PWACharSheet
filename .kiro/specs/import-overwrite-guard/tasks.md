# Implementation Plan

## Overview

Fix the bug where "Import from File" on the Settings page silently overwrites the active character's data the instant a valid JSON file is selected, without displaying a confirmation dialog. The fix adds a `pendingImport` state that holds the parsed character between file selection and user confirmation, rendering a `ConfirmDialog` that gates the destructive overwrite — consistent with the existing "Clear Sheet" and "Delete Character" patterns.

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
  - **Property 1: Bug Condition** - Valid Import Overwrites Character Without Confirmation Dialog
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — a valid character JSON file is selected via "Import from File" and the system should display a confirmation dialog before overwriting the active character
  - Test that for any valid character JSON file selected via the file input, the system displays a ConfirmDialog and does NOT call `updateCharacter` until the user explicitly confirms
  - Generate random valid Character objects (varying name, characteristics, skills), serialize to JSON, simulate file input change event with the JSON content, and assert: (1) a ConfirmDialog is rendered, (2) the active character data is NOT modified before confirmation
  - Include cases with various character names (empty string, special characters, long names) to verify dialog always appears regardless of imported character content
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists because `handleFileImport` calls `updateCharacter` immediately without showing a dialog)
  - Document counterexamples found (e.g., "selecting valid JSON with character 'Brunhilde' immediately overwrites active character, no ConfirmDialog rendered")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 2.1_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Invalid File and Export Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: selecting a malformed JSON file shows an error message and does not alter the active character on unfixed code
  - Observe: selecting a JSON file with missing required fields shows an error message on unfixed code
  - Observe: clicking "Copy to Clipboard" exports the character without any confirmation dialog on unfixed code
  - Observe: clicking "Download File" exports the character without any confirmation dialog on unfixed code
  - Observe: clicking "Clear Sheet" shows a ConfirmDialog before resetting character data on unfixed code
  - Write property-based test: for all invalid JSON strings (malformed syntax, missing required Character fields, unsupported versions), selecting the file via "Import from File" produces an error message, does NOT render a ConfirmDialog, and does NOT modify the active character
  - Write property-based test: for all export actions (clipboard, file), the action executes immediately without any confirmation dialog and does not modify the active character
  - Write unit test: "Clear Sheet" button continues to show its own ConfirmDialog and resets data on confirm
  - Generate random invalid JSON strings (truncated, missing closing braces, null values for required fields, empty strings) and verify error messages appear without any dialog or character modification
  - Verify all tests PASS on UNFIXED code (confirms baseline behavior to preserve)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for import overwrite without confirmation dialog

  - [x] 3.1 Implement the fix in `SettingsPage.tsx`
    - Add `pendingImport` state variable: `const [pendingImport, setPendingImport] = useState<Character | null>(null);`
    - Modify `handleFileImport`: on successful parse (`result.success && result.character`), call `setPendingImport(result.character)` instead of `updateCharacter(() => result.character!)` and remove the `setImportSuccess` call from this branch
    - Add `handleImportConfirm` handler: if `pendingImport` is not null, call `updateCharacter(() => pendingImport)`, call `setImportSuccess(\`Imported "${pendingImport.name}" successfully.\`)`, then call `setPendingImport(null)`
    - Add `handleImportCancel` handler: call `setPendingImport(null)` to discard the pending import without modifying the active character
    - Render a `ConfirmDialog` when `pendingImport !== null` with message `Import "${pendingImport.name}"? This will overwrite your current character data.`, `onConfirm={handleImportConfirm}`, `onCancel={handleImportCancel}`, `confirmLabel="Import"`
    - _Bug_Condition: isBugCondition(input) where input.file is valid JSON AND importFromJSON(text).success === true AND confirmDialogWasNotShown()_
    - _Expected_Behavior: ConfirmDialog is displayed before updateCharacter is called; character is only overwritten after explicit user confirmation_
    - _Preservation: Invalid file imports continue to show error messages without dialog; Clear Sheet dialog unchanged; Export actions unchanged; Success message still displayed after confirmed import_
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Import Shows Confirmation Dialog Before Overwrite
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (ConfirmDialog appears, character not modified until confirm)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — valid import now shows confirmation dialog before overwriting)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Invalid File and Export Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — invalid files still show errors, exports still work without dialogs, Clear Sheet dialog unchanged)
    - Confirm all preservation tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite to verify no unintended side effects
  - Verify that selecting a valid JSON file shows a confirmation dialog with the imported character's name
  - Verify that clicking "Import" on the dialog overwrites the active character and displays the success message
  - Verify that clicking "Cancel" on the dialog discards the import and leaves the active character unchanged
  - Verify that invalid file imports still show error messages without any dialog
  - Verify that "Clear Sheet" and export actions are completely unaffected
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- The fix follows the exact same pattern used by "Clear Sheet" (`showClearConfirm` state gating a `ConfirmDialog`) — adding `pendingImport` state of type `Character | null` to hold parsed data between file selection and user confirmation
- The `ConfirmDialog` component already exists at `src/components/shared/ConfirmDialog.tsx` and is used throughout the app
- The `importFromJSON` function in `src/storage/export-import.ts` handles all validation — the fix only changes what happens AFTER a successful parse result
- The file input's `e.target.value = ''` reset remains in `handleFileImport` so users can re-select the same file if they cancel
