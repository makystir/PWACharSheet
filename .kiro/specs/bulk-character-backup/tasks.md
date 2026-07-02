# Implementation Plan: Bulk Character Backup

## Overview

Implement bulk backup and restore services that allow exporting all characters (with portraits) as a single JSON file and importing them back in one operation. The implementation adds new TypeScript modules (`backup-service.ts`, `restore-service.ts`, `backup-types.ts`) to the existing `src/storage/` directory, extends the SettingsPage UI with backup/restore controls, and includes property-based tests validating round-trip integrity and fault tolerance.

## Tasks

- [x] 1. Define backup types and interfaces
  - [x] 1.1 Create `src/storage/backup-types.ts` with BackupFile, BackupCharacterEntry, BackupMetadata, ProgressCallback, SkippedCharacter, BackupResult, ValidationResult, and RestoreSummary interfaces
    - Define all types as specified in the design document
    - Export `BackupFile`, `BackupCharacterEntry`, `BackupMetadata` for the file format
    - Export `ProgressCallback`, `SkippedCharacter`, `BackupResult` for backup operations
    - Export `ValidationResult`, `RestoreSummary` for restore operations
    - _Requirements: 1.3, 1.4, 3.1, 3.2_

- [x] 2. Implement BackupService
  - [x] 2.1 Create `src/storage/backup-service.ts` with `assembleBackup` function
    - Collect all characters from CharacterManager via `listCharacters()` and `loadCharacter(id)`
    - Retrieve each portrait from PortraitStore, converting blob to base64 data-URL via PortraitCodec
    - Yield to the event loop between each character (use `await new Promise(r => setTimeout(r, 0))`) to keep main thread responsive
    - If no characters exist, return `{ ok: false, error: "..." }`
    - If a portrait fails to load, set portrait to `""` and continue
    - If a character fails to serialize, skip it and add to skipped report
    - Report progress via callback after each character: `onProgress(i, total)`
    - Assemble final `BackupFile` with `version: 1`, `exportedAt` as ISO-8601, `characterCount` matching array length
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 6.1, 6.3, 6.6_

  - [x] 2.2 Implement `downloadBackup` function in `src/storage/backup-service.ts`
    - Serialize BackupFile to JSON string
    - Create a Blob and trigger download via anchor element
    - Format filename as `wfrp4e-backup_YYYYMMDD-HHmm.json` using user's local date/time
    - Catch Blob/URL creation errors and return descriptive error for "too large" scenarios
    - _Requirements: 1.5, 6.5_

  - [x] 2.3 Write property tests for BackupService (`src/storage/__tests__/backup-service.property.test.ts`)
    - **Property 1: Backup structural integrity** — For any non-empty set of characters, the assembled BackupFile has correct version, valid ISO-8601 exportedAt, characterCount matching array length, and each entry has id, character, and valid portrait field.
    - **Validates: Requirements 1.2, 1.3, 1.4, 3.1, 3.2**

  - [x] 2.4 Write property test for portrait fault tolerance (`src/storage/__tests__/backup-service.property.test.ts`)
    - **Property 6: Backup fault tolerance on portrait failure** — When some portraits fail to load, those characters still appear in output with `portrait === ""`, while successful portraits are correctly encoded.
    - **Validates: Requirements 1.6, 6.6**

  - [x] 2.5 Write property test for progress reporting (`src/storage/__tests__/backup-service.property.test.ts`)
    - **Property 7: Progress reporting completeness** — For N characters, progress callback is invoked exactly N times with arguments (1,N), (2,N), ..., (N,N) in strictly increasing order.
    - **Validates: Requirements 6.3, 6.4**

- [x] 3. Implement RestoreService
  - [x] 3.1 Create `src/storage/restore-service.ts` with `validateBackupFile` function
    - Parse input as JSON; reject with error message if not valid JSON
    - Reject if parsed value is not an object or is missing `version` or `characters` array
    - Reject if `version > 1` with message stating max supported version
    - Reject if `characterCount` does not match `characters.length`
    - Validate `characters` is a non-empty array
    - Return `{ ok: true, metadata, characters }` on success
    - _Requirements: 2.1, 2.2, 2.3, 3.5_

  - [x] 3.2 Implement `detectDuplicates` function in `src/storage/restore-service.ts`
    - Compare each backup character's name against existing characters from CharacterManager
    - Return array of names that already exist locally
    - _Requirements: 4.2_

  - [x] 3.3 Implement `restoreCharacters` function in `src/storage/restore-service.ts`
    - Process characters sequentially in array order
    - Validate each character individually (require name, species, chars fields)
    - Skip invalid characters and add to failure report with name or array index
    - Create each valid character via CharacterManager with new unique ID
    - Save portrait to PortraitStore if non-empty data-URL
    - Yield to event loop between characters for UI responsiveness
    - Report progress via callback after each character
    - Stop on quota error, retain already-saved characters, report count saved
    - Return RestoreSummary with imported count, skipped count/details, and duplicate names
    - _Requirements: 2.5, 2.6, 2.7, 2.8, 4.1, 4.3, 4.4, 6.2, 6.4_

  - [x] 3.4 Write property tests for RestoreService validation (`src/storage/__tests__/restore-service.property.test.ts`)
    - **Property 2: Validation rejects invalid backup files** — For any string that is not valid JSON, not an object, missing version/characters, has version > 1, or has characterCount mismatch, validateBackupFile returns `{ ok: false }` with descriptive error.
    - **Validates: Requirements 2.1, 2.2, 2.3, 3.5**

  - [x] 3.5 Write property test for import partial failures (`src/storage/__tests__/restore-service.property.test.ts`)
    - **Property 4: Import correctness with partial failures** — For any BackupFile with a mix of valid and invalid characters, imported + skipped equals total characters in file.
    - **Validates: Requirements 2.5, 2.6, 2.7**

  - [x] 3.6 Write property test for import non-destruction (`src/storage/__tests__/restore-service.property.test.ts`)
    - **Property 5: Import non-destruction of existing data** — After restore, all pre-existing characters are unchanged field-by-field, and every imported character has a unique new ID distinct from all existing IDs.
    - **Validates: Requirements 4.1, 4.3, 4.4**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement round-trip property test
  - [x] 5.1 Write property test for export-import round-trip (`src/storage/__tests__/backup-service.property.test.ts`)
    - **Property 3: Export-Import round-trip preservation** — For any set of valid characters with portraits, export then import into empty app produces characters field-by-field equal to originals for user-authored fields, excluding system-generated IDs.
    - **Validates: Requirements 3.3**

  - [x] 5.2 Write unit tests for backup-service edge cases (`src/storage/__tests__/backup-service.test.ts`)
    - Test filename format matches `wfrp4e-backup_YYYYMMDD-HHmm.json`
    - Test empty character list returns error without producing file
    - Test Blob creation failure returns "too large" error message
    - _Requirements: 1.5, 1.7, 6.5_

  - [x] 5.3 Write unit tests for restore-service edge cases (`src/storage/__tests__/restore-service.test.ts`)
    - Test duplicate detection returns correct names
    - Test quota error mid-import stops and reports correctly
    - Test confirmation data extraction (character count, names capped at 50)
    - _Requirements: 2.4, 2.8, 4.2_

- [x] 6. Implement UI components
  - [x] 6.1 Add "Back Up All Characters" button and progress indicator to SettingsPage
    - Add button in the Export/Import section
    - Wire button click to `assembleBackup()` then `downloadBackup()`
    - Show spinner/progress text while backup is in progress
    - Disable button during operation
    - Display success message on completion, error message on failure
    - Re-enable button and remove spinner on completion or error
    - _Requirements: 5.1, 5.3, 5.5, 5.6_

  - [x] 6.2 Add "Restore from Backup" file input and RestoreConfirmDialog to SettingsPage
    - Add file input accepting `.json` files in the Export/Import section
    - On file select: read file, call `validateBackupFile()`, call `detectDuplicates()`
    - Show confirmation dialog with character count, names (capped at 50), and duplicate warnings
    - On confirm: call `restoreCharacters()` with progress callback
    - Show spinner/progress while restoring, disable input during operation
    - Display RestoreSummary (imported count, skipped count with details) on completion
    - Display error message on failure; re-enable input and remove spinner
    - _Requirements: 5.2, 5.4, 5.6, 5.7, 2.4, 4.2_

  - [x] 6.3 Create RestoreConfirmDialog component
    - Display total character count from backup metadata
    - List character names (up to 50 displayed)
    - Highlight names that already exist locally (from `detectDuplicates()`)
    - Provide Confirm and Cancel buttons
    - _Requirements: 2.4, 4.2_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout, matching the existing project stack (React + Vite + vitest + fast-check)
- All new modules follow the existing pattern in `src/storage/` with thin stateless service functions
- Tests use `fake-indexeddb` for PortraitStore mocking, following existing test patterns

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "3.3"] },
    { "id": 3, "tasks": ["2.3", "2.4", "2.5", "3.4", "3.5", "3.6"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3"] }
  ]
}
```
