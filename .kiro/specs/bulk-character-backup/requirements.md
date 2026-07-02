# Requirements Document

## Introduction

The PWA Character Sheet application currently supports exporting and importing characters one at a time. Since all data is stored locally (localStorage + IndexedDB for portraits), users risk total data loss if their browser profile is cleared or they switch devices. This feature adds a one-click "back up all characters" capability that produces a single file containing every character (with portraits), and a corresponding restore flow that can import the entire backup in one operation.

## Glossary

- **Backup_Service**: The module responsible for collecting all character data and portrait blobs, assembling them into a single exportable backup payload.
- **Restore_Service**: The module responsible for parsing a backup file, validating its contents, and importing all characters and portraits into local storage.
- **Backup_File**: A single JSON file containing metadata, an array of character objects with embedded portrait data, and a format version identifier.
- **Character_Manager**: The existing storage module that manages character CRUD operations in localStorage.
- **Portrait_Store**: The existing IndexedDB-backed module that stores character portrait blobs separately from character JSON.
- **Settings_Page**: The existing UI page where export/import controls live.

## Requirements

### Requirement 1: Export All Characters

**User Story:** As a player with multiple characters, I want to export all my characters in a single file, so that I can back up my entire roster without exporting each one individually.

#### Acceptance Criteria

1. WHEN the user activates the "Back Up All Characters" control, THE Backup_Service SHALL collect all characters from the Character_Manager and their portraits from the Portrait_Store.
2. WHEN all character data has been collected, THE Backup_Service SHALL produce a single Backup_File containing every character with portrait data embedded as base64 data-URL strings.
3. THE Backup_File SHALL include a top-level `metadata` object containing: a `version` integer field set to 1, an `exportedAt` ISO-8601 timestamp string, and a `characterCount` integer field equal to the number of characters in the `characters` array.
4. Each entry in the `characters` array SHALL contain the character's unique ID, the full character JSON object (matching the single-character export format), and a `portrait` field containing the base64 data-URL string or empty string.
5. WHEN the Backup_File is assembled, THE Backup_Service SHALL trigger a file download with a filename formatted as `wfrp4e-backup_YYYYMMDD-HHmm.json` using the user's local date and time.
6. IF a portrait cannot be retrieved from the Portrait_Store for a given character, THEN THE Backup_Service SHALL include that character in the backup with an empty portrait field and continue processing remaining characters.
7. IF no characters exist in the Character_Manager, THEN THE Backup_Service SHALL display a message indicating there are no characters to back up and not produce a file.

### Requirement 2: Import All Characters from Backup

**User Story:** As a player restoring from a backup, I want to import all characters from a backup file in one operation, so that I can recover my full roster on a new device or after data loss.

#### Acceptance Criteria

1. WHEN the user selects a Backup_File for import, THE Restore_Service SHALL parse the file as JSON and validate that it contains a top-level `version` field and a `characters` array with at least one entry.
2. IF the Backup_File has a format version greater than the maximum supported version (currently 1), THEN THE Restore_Service SHALL reject the file and display an error message indicating the version is unsupported and stating the maximum supported version number.
3. IF the Backup_File contains invalid JSON or is not a JSON object, THEN THE Restore_Service SHALL reject the file and display an error message indicating the file could not be parsed.
4. WHEN the Backup_File passes structural validation, THE Restore_Service SHALL display a confirmation prompt showing the total number of characters found in the file and the name of each character (up to 50 names displayed).
5. WHEN the user confirms the import, THE Restore_Service SHALL create each character via the Character_Manager (assigning a new unique ID) and route each portrait to the Portrait_Store, processing characters sequentially in the order they appear in the file.
6. IF a character in the backup fails individual validation (missing any of the required fields: name, species, chars), THEN THE Restore_Service SHALL skip that character, continue importing the remaining characters, and include the skipped character's name (or its array index if name is absent) in the post-import failure report.
7. WHEN all characters have been processed, THE Restore_Service SHALL display a summary indicating the count of characters imported successfully and the count of characters skipped, along with the names or indices of any skipped characters.
8. IF a storage quota error occurs during import, THEN THE Restore_Service SHALL stop importing further characters, retain all characters already successfully saved, and display an error message indicating how many characters were saved before the quota was reached.

### Requirement 3: Backup File Format and Round-Trip Integrity

**User Story:** As a developer, I want the backup format to be well-defined and round-trip safe, so that exported backups can be reliably re-imported without data loss.

#### Acceptance Criteria

1. THE Backup_File SHALL use a JSON structure containing: a `version` integer field, an `exportedAt` ISO-8601 timestamp string, a `characterCount` integer field whose value equals the length of the `characters` array, and a `characters` array.
2. Each entry in the `characters` array SHALL contain the full character JSON object (matching the single-character export format) with the portrait field populated as a base64 data-URL string or empty string.
3. FOR ALL valid backup payloads, exporting all characters then importing the resulting Backup_File into an empty application SHALL produce character data where each imported character is field-by-field equal to the original for all user-authored fields (excluding system-generated identifiers and import metadata).
4. THE Backup_File format version SHALL start at 1 and be independent of the single-character format version.
5. IF the `characterCount` value in a Backup_File does not match the actual length of the `characters` array, THEN THE Restore_Service SHALL reject the file and display an error message indicating a metadata mismatch.

### Requirement 4: Duplicate Handling on Import

**User Story:** As a player importing a backup, I want the system to handle duplicate characters gracefully, so that I do not accidentally overwrite existing characters or create unwanted duplicates without being informed.

#### Acceptance Criteria

1. WHEN the Restore_Service detects that a character in the backup has the same name as an existing character in the Character_Manager, THE Restore_Service SHALL import it as a new separate character entry with a new unique ID (no overwrite of existing data).
2. WHEN the confirmation prompt is displayed (prior to import), THE Restore_Service SHALL indicate which character names already exist locally so the user can make an informed decision before confirming.
3. WHEN duplicate-named characters are imported, THE Restore_Service SHALL include in the post-import summary the count and names of characters that were imported alongside existing characters with the same name.
4. THE Restore_Service SHALL NOT modify or delete any existing characters during a bulk import operation regardless of name collisions.

### Requirement 5: UI Integration

**User Story:** As a user, I want the bulk backup controls to be accessible from the Settings page alongside existing export/import options, so that I can find them easily.

#### Acceptance Criteria

1. THE Settings_Page SHALL display a "Back Up All Characters" button in the Export/Import section.
2. THE Settings_Page SHALL display a "Restore from Backup" file input in the Export/Import section that accepts only `.json` files.
3. WHILE the Backup_Service is assembling the backup file, THE Settings_Page SHALL disable the "Back Up All Characters" button and display a visible spinner or animation adjacent to the button indicating the operation is in progress.
4. WHILE the Restore_Service is processing an import, THE Settings_Page SHALL disable the "Restore from Backup" input and display a visible spinner or animation adjacent to the input indicating the operation is in progress.
5. WHEN the Backup_Service completes successfully, THE Settings_Page SHALL re-enable the backup button, remove the spinner, and display a success message indicating the backup file was downloaded.
6. IF the Backup_Service or Restore_Service encounters an error during processing, THEN THE Settings_Page SHALL re-enable the corresponding control, remove the spinner, and display an error message indicating the operation failed.
7. WHEN the Restore_Service completes successfully, THE Settings_Page SHALL re-enable the restore input, remove the spinner, and display a success message indicating how many characters were restored.

### Requirement 6: Large Backup Handling

**User Story:** As a player with many characters (some with large portraits), I want the backup process to handle large data volumes without crashing or freezing the UI.

#### Acceptance Criteria

1. THE Backup_Service SHALL process characters asynchronously such that no single synchronous task on the main UI thread exceeds 50 milliseconds during backup assembly.
2. THE Restore_Service SHALL process characters asynchronously such that no single synchronous task on the main UI thread exceeds 50 milliseconds during import.
3. WHILE the Backup_Service is assembling the Backup_File, THE Backup_Service SHALL report progress showing the number of characters processed out of the total number of characters.
4. WHILE the Restore_Service is importing characters from a Backup_File, THE Restore_Service SHALL report progress showing the number of characters imported out of the total number of characters in the file.
5. IF the assembled Backup_File exceeds the browser's ability to create a download blob (detected by a caught exception during Blob construction or URL creation), THEN THE Backup_Service SHALL display an error message indicating the backup is too large and suggest exporting characters in smaller groups.
6. IF a single character fails to serialize or its portrait fails to load during backup assembly, THEN THE Backup_Service SHALL skip that character, continue processing remaining characters, and upon completion display a summary indicating which characters were excluded and why.
