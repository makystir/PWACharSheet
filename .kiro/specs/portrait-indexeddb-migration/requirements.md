# Requirements Document

## Introduction

This feature migrates character portrait images from localStorage to IndexedDB. Currently, portrait images are stored as base64-encoded strings within each character's JSON object in localStorage. A single portrait can consume up to ~2.7 MB, quickly exhausting the ~5–10 MB localStorage quota. By moving portrait data to IndexedDB (which offers hundreds of MB to GB of storage), the app eliminates the primary cause of storage quota exhaustion while keeping all other character data in localStorage unchanged.

## Glossary

- **Portrait_Store**: The IndexedDB database and object store responsible for persisting character portrait image data as Blobs
- **Character_Manager**: The existing module (`src/storage/character-manager.ts`) that handles loading, saving, and managing character data in localStorage
- **Migration_Runner**: The module responsible for detecting un-migrated portrait data in localStorage character JSON and moving it to the Portrait_Store on first load after update
- **Portrait_Blob**: A binary Blob object representing a portrait image, converted from the legacy base64-encoded string
- **Character_JSON**: The JSON object stored in localStorage under key `wfrp4e-char-{id}`, containing all character fields except the portrait (post-migration)
- **Export_Bundle**: The JSON structure produced during character export, which includes all character data and the portrait image (re-encoded as base64 for portability)
- **Import_Parser**: The module responsible for parsing an imported character JSON file and routing portrait data to the Portrait_Store while placing remaining data in localStorage

## Requirements

### Requirement 1: IndexedDB Portrait Storage

**User Story:** As a player, I want my character portrait images stored in IndexedDB, so that they do not consume limited localStorage quota.

#### Acceptance Criteria

1. THE Portrait_Store SHALL store portrait image data as Blob objects (JPEG, PNG, or WebP; maximum 2 MB each) keyed by character ID
2. WHEN a portrait is saved for a character, THE Portrait_Store SHALL persist the Portrait_Blob in IndexedDB associated with that character's unique ID, overwriting any previously stored portrait for that character
3. WHEN a portrait is requested for a character that has a stored portrait, THE Portrait_Store SHALL retrieve the Portrait_Blob from IndexedDB and return it as an object URL usable as an image source
4. WHEN a portrait is requested for a character that has no stored portrait, THE Portrait_Store SHALL return null
5. WHEN a character is deleted, THE Portrait_Store SHALL remove the corresponding portrait entry from IndexedDB
6. IF a portrait save or retrieval fails due to IndexedDB being unavailable or a transaction error, THEN THE Portrait_Store SHALL return an error indication without throwing an unhandled exception
7. THE Portrait_Store SHALL use a single IndexedDB database with a dedicated object store for portraits

### Requirement 2: Automatic Migration of Existing Portraits

**User Story:** As an existing user, I want my current portrait images automatically migrated to IndexedDB on first load after the update, so that I do not lose my portraits or need to take manual action.

#### Acceptance Criteria

1. WHEN the app loads and a character's localStorage JSON contains a `portrait` field with a string of length greater than 0, THE Migration_Runner SHALL extract the base64 portrait data, store it as a Blob in the Portrait_Store keyed by the character's ID, and complete before the app renders character data
2. WHEN the Migration_Runner successfully stores a portrait in the Portrait_Store, THE Migration_Runner SHALL remove the `portrait` field from the character's localStorage JSON and re-save the reduced Character_JSON to localStorage, thereby freeing the space previously occupied by the portrait data
3. THE Migration_Runner SHALL process all characters listed in the character index during a single migration pass, completing within 10 seconds for up to 50 characters
4. IF the Migration_Runner fails to write a portrait to IndexedDB for a specific character (including quota exceeded or write errors), THEN THE Migration_Runner SHALL leave that character's localStorage JSON unchanged with the portrait field intact and continue migrating the remaining characters
5. IF IndexedDB is entirely unavailable (e.g., private browsing mode or browser restriction), THEN THE Migration_Runner SHALL skip portrait migration entirely, leaving all character localStorage JSON unchanged, and the app SHALL continue to load normally using the portrait data from localStorage
6. WHEN the Migration_Runner encounters a character whose localStorage JSON has no `portrait` field or has a `portrait` field that is an empty string, THE Migration_Runner SHALL skip that character without modifying its data and without writing to the Portrait_Store
7. WHEN the Migration_Runner is invoked on subsequent app loads after a character's portrait has already been migrated, THE Migration_Runner SHALL detect the absence of the `portrait` field in localStorage and skip that character, producing no writes to either localStorage or IndexedDB

### Requirement 3: Separation of Portrait and Character Data

**User Story:** As a developer, I want portrait data stored separately from character JSON in localStorage, so that character saves remain small and fast.

#### Acceptance Criteria

1. WHEN a character is saved via the Character_Manager, THE Character_Manager SHALL persist all character fields except the portrait image data to localStorage under the character's storage key
2. WHEN a portrait is added or updated for a character, THE Character_Manager SHALL store the portrait data exclusively in the Portrait_Store keyed by the character's identifier, and SHALL NOT write portrait data to the character's localStorage entry
3. IF migration has completed for a character, THEN THE Character_JSON stored in localStorage for that character SHALL NOT contain base64 portrait image data
4. WHEN a character is loaded, THE Character_Manager SHALL retrieve the portrait data from the Portrait_Store using the character's identifier and merge it with the Character_JSON from localStorage, presenting the resulting object (including the portrait field) to the UI within 500 milliseconds of the load request
5. IF the Portrait_Store is unavailable or the portrait retrieval fails during character load, THEN THE Character_Manager SHALL still return the character object with the portrait field set to an empty string, and SHALL NOT block or fail the character load operation
6. WHEN a character is deleted via the Character_Manager, THE Character_Manager SHALL remove both the Character_JSON from localStorage and the associated portrait data from the Portrait_Store

### Requirement 4: IndexedDB Unavailability Fallback

**User Story:** As a player using a restricted browser environment, I want the app to continue functioning if IndexedDB is unavailable, so that I can still use the character sheet even without portrait persistence.

#### Acceptance Criteria

1. WHEN the Portrait_Store initializes, THE Portrait_Store SHALL test IndexedDB availability by attempting to open the database, and IF the open request fails or `window.indexedDB` is undefined, THEN THE Portrait_Store SHALL enter degraded storage mode for the remainder of the session
2. IF the Portrait_Store is in degraded storage mode, THEN THE Portrait_Store SHALL fall back to keeping portrait data as base64 strings in the Character_JSON in localStorage (legacy behavior)
3. IF IndexedDB is unavailable, THEN THE Migration_Runner SHALL skip portrait migration and leave localStorage data unchanged
4. IF IndexedDB becomes unavailable after a portrait was previously migrated (portrait field already removed from localStorage), THEN THE Character_Manager SHALL return the character with the `portrait` field set to an empty string rather than failing to load entirely
5. WHEN the Portrait_Store enters degraded storage mode, THE Portrait_Store SHALL log a single warning to the console indicating degraded storage mode (once per session, not per operation)

### Requirement 5: Export with Portraits

**User Story:** As a player, I want exported character files to include my portrait image, so that I can transfer my complete character to another device or share it with others.

#### Acceptance Criteria

1. WHEN a character with a portrait is exported, THE Export_Bundle SHALL include the portrait as a base64-encoded data URL string in the `portrait` field of the character JSON structure
2. WHEN a character has no portrait, THE Export_Bundle SHALL set the `portrait` field to an empty string
3. WHEN a character is exported, THE Export_Bundle SHALL produce a single JSON file that contains all character data including the portrait, with the total file size limited to the portrait maximum of 2 MB for the image data plus the remaining character data
4. THE Export_Bundle format SHALL remain backward-compatible with the existing import format such that a JSON file exported from any prior version that contains a base64 `portrait` string is accepted by the current importer without data loss
5. IF the portrait data cannot be read during export, THEN THE Export_Bundle SHALL still complete the export with the `portrait` field set to an empty string and shall indicate to the user that the portrait was excluded

### Requirement 6: Import with Portraits

**User Story:** As a player, I want imported character files to have their portrait images stored in IndexedDB automatically, so that imports work seamlessly with the new storage architecture.

#### Acceptance Criteria

1. WHEN a character JSON file is imported containing a `portrait` field with a non-empty string value, THE Import_Parser SHALL store the portrait string as a Portrait_Blob in the Portrait_Store keyed by the character's unique ID, and remove the `portrait` field value from the Character_JSON before persisting it to localStorage
2. WHEN a character JSON file is imported containing a `portrait` field with an empty string, null, or undefined value, THE Import_Parser SHALL not create any entry in the Portrait_Store for that character
3. IF IndexedDB is unavailable (the database cannot be opened or the store transaction fails) during character import, THEN THE Import_Parser SHALL retain the portrait data in the Character_JSON and persist the full object including the portrait to localStorage
4. WHEN a character JSON file is imported without a `portrait` field, THE Import_Parser SHALL not create any entry in the Portrait_Store for that character
5. IF a character JSON file is imported containing a `portrait` field whose value is not a valid base64 data-URL string, THEN THE Import_Parser SHALL discard the portrait value, not create any entry in the Portrait_Store, and continue the import without the portrait

### Requirement 7: Portrait Update and Removal

**User Story:** As a player, I want to change or remove my character's portrait at any time, so that my character sheet reflects my current preferences.

#### Acceptance Criteria

1. WHEN a new portrait image is selected for a character, THE Portrait_Store SHALL overwrite any existing portrait for that character with the new Portrait_Blob and the UI SHALL display the new portrait image within 1 second of the operation completing
2. WHEN a portrait is removed (cleared) for a character, THE Portrait_Store SHALL delete the portrait entry from IndexedDB for that character and the UI SHALL display the empty-portrait placeholder within 1 second of the operation completing
3. WHEN a portrait is updated or removed, THE Character_Manager SHALL NOT write to localStorage (the `lastModified` timestamp and Character_JSON in localStorage SHALL remain unchanged)
4. IF the Portrait_Store fails to write or delete a portrait in IndexedDB during an update or removal, THEN THE Portrait_Store SHALL display an error message indicating the portrait could not be saved and SHALL leave the previously stored portrait unchanged
5. IF a portrait removal is requested for a character that has no existing portrait in the Portrait_Store, THEN THE Portrait_Store SHALL treat the operation as a successful no-op without displaying an error

