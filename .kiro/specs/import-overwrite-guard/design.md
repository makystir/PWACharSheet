# Import Overwrite Guard Bugfix Design

## Overview

The "Import from File" action on the Settings page silently overwrites the active character's data the moment a valid JSON file is selected, with no confirmation step. This is inconsistent with the existing UX pattern used by "Clear Sheet" and "Delete Character," both of which present a `ConfirmDialog` before performing destructive data mutations. The fix adds a confirmation dialog between successful file parsing and the actual character overwrite, giving the user an explicit opportunity to cancel.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — a valid character JSON file is selected via the "Import from File" input, causing immediate overwrite without confirmation
- **Property (P)**: The desired behavior — display a confirmation dialog after parsing the file and before overwriting the active character
- **Preservation**: Existing behaviors that must remain unchanged — error handling for invalid files, the Clear Sheet confirmation, the Delete Character confirmation, export actions, and the success message after confirmed import
- **handleFileImport**: The function in `src/components/pages/SettingsPage.tsx` that handles the file input's `onChange` event, reads the file, parses JSON, and overwrites the character
- **ConfirmDialog**: The shared component in `src/components/shared/ConfirmDialog.tsx` used throughout the app for destructive action confirmations
- **importFromJSON**: The function in `src/storage/export-import.ts` that validates and parses a JSON string into a Character object

## Bug Details

### Bug Condition

The bug manifests when a user selects a file via "Import from File" and the file contains valid character JSON. The `handleFileImport` function calls `updateCharacter()` immediately after `importFromJSON` returns success, without displaying a confirmation dialog or giving the user any opportunity to cancel.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { file: File, parseResult: ImportResult }
  OUTPUT: boolean
  
  RETURN input.file IS NOT null
         AND input.parseResult.success == true
         AND input.parseResult.character IS NOT null
         AND confirmDialogWasNotShown()
END FUNCTION
```

### Examples

- User selects a valid JSON file containing "Brunhilde" character data → active character is immediately replaced with Brunhilde's data, no dialog appears (BUG)
- User selects a valid JSON file while editing "Geralt" → Geralt's unsaved state is silently overwritten, no opportunity to cancel (BUG)
- User selects an invalid/malformed JSON file → error message shown, no overwrite occurs (CORRECT, not affected)
- User clicks "Clear Sheet" → confirmation dialog appears before reset (CORRECT, existing pattern)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Invalid or malformed file imports must continue to show an error message without altering the active character
- "Clear Sheet" must continue to show a confirmation dialog before resetting character data
- "Delete Character" in the Character Management Sheet must continue to show a confirmation dialog before deletion
- Export actions ("Copy to Clipboard", "Download File") must continue to execute without any confirmation dialog
- After a confirmed import, the success message with the imported character's name must still appear

**Scope:**
All inputs that do NOT involve selecting a valid character JSON file via "Import from File" should be completely unaffected by this fix. This includes:
- Mouse clicks on export buttons
- Invalid file selections (malformed JSON, missing fields, unsupported version)
- Clear Sheet button interactions
- Delete Character interactions
- All other Settings page interactions (theme, house rules, quick actions)

## Hypothesized Root Cause

Based on the bug description, the root cause is straightforward:

1. **Missing Confirmation Step**: The `handleFileImport` function in `SettingsPage.tsx` calls `updateCharacter(() => result.character!)` immediately inside the `reader.onload` callback when `result.success` is true. There is no intermediate state to hold the parsed character while awaiting user confirmation.

2. **No Pending Import State**: Unlike "Clear Sheet" which uses `showClearConfirm` state to gate the destructive action behind a dialog, the import flow has no equivalent state variable to hold a pending character between parse and commit.

3. **Pattern Inconsistency**: The developer likely overlooked that import is a destructive operation (it replaces all character data) and should follow the same confirmation pattern as Clear Sheet and Delete Character.

## Correctness Properties

Property 1: Bug Condition - Import Confirmation Dialog Displayed

_For any_ valid character JSON file selected via "Import from File," the system SHALL display a confirmation dialog before overwriting the active character's data, and SHALL NOT modify the active character until the user explicitly confirms.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-Import Behavior Unchanged

_For any_ interaction that is NOT a valid file import confirmation (invalid files, exports, Clear Sheet, Delete Character, other Settings actions), the system SHALL produce exactly the same behavior as the original code, preserving all existing confirmation dialogs, error handling, and export functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/components/pages/SettingsPage.tsx`

**Function**: `handleFileImport`

**Specific Changes**:

1. **Add pending import state**: Add a new state variable `pendingImport` of type `Character | null` to hold the parsed character between file selection and user confirmation.
   ```tsx
   const [pendingImport, setPendingImport] = useState<Character | null>(null);
   ```

2. **Defer the overwrite**: Modify `handleFileImport` so that on successful parse, instead of calling `updateCharacter` directly, it stores the parsed character in `pendingImport` state. This triggers the confirmation dialog.
   ```tsx
   if (result.success && result.character) {
     setPendingImport(result.character);
   }
   ```

3. **Add confirmation handler**: Create a `handleImportConfirm` function that commits the pending character and shows the success message.
   ```tsx
   const handleImportConfirm = () => {
     if (pendingImport) {
       updateCharacter(() => pendingImport);
       setImportSuccess(`Imported "${pendingImport.name}" successfully.`);
       setPendingImport(null);
     }
   };
   ```

4. **Add cancel handler**: Create a `handleImportCancel` function that discards the pending character without modifying the active character.
   ```tsx
   const handleImportCancel = () => {
     setPendingImport(null);
   };
   ```

5. **Render ConfirmDialog for import**: Add a conditional `ConfirmDialog` render when `pendingImport` is not null, with a message indicating the import will overwrite the current character.
   ```tsx
   {pendingImport && (
     <ConfirmDialog
       message={`Import "${pendingImport.name}"? This will overwrite your current character data.`}
       onConfirm={handleImportConfirm}
       onCancel={handleImportCancel}
       confirmLabel="Import"
     />
   )}
   ```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate file input change events with valid character JSON and assert that a confirmation dialog appears before the character is updated. Run these tests on the UNFIXED code to observe failures and confirm the bug exists.

**Test Cases**:
1. **No Dialog on Valid Import**: Simulate selecting a valid JSON file and assert that a confirmation dialog is NOT shown (will fail after fix, confirming current bug)
2. **Immediate Overwrite**: Simulate selecting a valid JSON file and assert that `updateCharacter` is called immediately without user interaction (will fail after fix)
3. **No Cancel Opportunity**: Simulate selecting a valid JSON file and assert there is no cancel button available (will fail after fix)

**Expected Counterexamples**:
- Character data is overwritten immediately upon file selection without any dialog
- No intermediate state exists between parse and commit
- Possible cause: `handleFileImport` calls `updateCharacter` directly in the `reader.onload` callback

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := handleFileImport_fixed(input)
  ASSERT confirmDialogIsDisplayed(result)
  ASSERT characterNotModifiedUntilConfirm(result)
  
  // On confirm:
  simulateConfirm()
  ASSERT characterUpdatedWithImportedData()
  ASSERT successMessageDisplayed()
  
  // On cancel:
  simulateCancel()
  ASSERT characterUnchanged()
  ASSERT noSuccessMessage()
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT handleFileImport_original(input) = handleFileImport_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for invalid file imports, export actions, and other Settings interactions, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Invalid File Preservation**: Verify that malformed JSON, missing fields, and unsupported versions continue to show error messages without any confirmation dialog
2. **Clear Sheet Preservation**: Verify that "Clear Sheet" button continues to show its own confirmation dialog and resets data on confirm
3. **Export Preservation**: Verify that export actions (clipboard, file) continue to work without any confirmation dialog
4. **Success Message Preservation**: Verify that after confirming an import, the success message with the character name is still displayed

### Unit Tests

- Test that selecting a valid file shows a confirmation dialog (not immediate overwrite)
- Test that clicking "Import" on the dialog commits the character data
- Test that clicking "Cancel" on the dialog discards the import and leaves character unchanged
- Test that the dialog message includes the imported character's name
- Test that selecting an invalid file still shows an error without a dialog
- Test that clearing the import error/success states works correctly

### Property-Based Tests

- Generate random valid character JSON objects and verify the confirmation dialog always appears before overwrite
- Generate random invalid JSON strings and verify they always produce error messages without triggering a dialog
- Generate sequences of import-confirm and import-cancel actions and verify character state is consistent

### Integration Tests

- Test full import flow: select file → dialog appears → confirm → character updated → success message shown
- Test full cancel flow: select file → dialog appears → cancel → character unchanged → no success message
- Test that importing does not interfere with the Clear Sheet confirmation dialog
- Test that multiple rapid file selections correctly handle pending state
