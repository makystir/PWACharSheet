# Implementation Plan: Portrait IndexedDB Migration

## Overview

Migrate character portrait images from localStorage to IndexedDB by introducing a `PortraitStore` module, a one-time `PortraitMigrationRunner`, and a `portrait-codec` helper. The existing `character-manager.ts` and `export-import.ts` are updated to coordinate portrait reads/writes through the new store. All modules gracefully degrade when IndexedDB is unavailable.

## Tasks

- [x] 1. Set up dependencies and create the portrait codec helper
  - [x] 1.1 Install `fake-indexeddb` as a dev dependency and create `src/storage/portrait-codec.ts`
    - Run `npm install --save-dev fake-indexeddb`
    - Create `src/storage/portrait-codec.ts` with three exported functions:
      - `base64ToBlob(dataUrl: string): Blob | null` — parses a data-URL, decodes the base64 payload, and returns a Blob with the correct MIME type; returns null for invalid input
      - `blobToBase64(blob: Blob): Promise<string>` — reads a Blob via FileReader and returns a base64 data-URL string
      - `isValidPortraitDataUrl(value: string): boolean` — validates the string matches the pattern `data:image/(jpeg|png|webp);base64,...`
    - _Requirements: 1.1, 5.1, 6.1, 6.5_

  - [x] 1.2 Write unit tests for portrait-codec
    - Create `src/storage/__tests__/portrait-codec.test.ts`
    - Test `base64ToBlob` with valid JPEG, PNG, WebP data-URLs and invalid inputs (empty string, malformed, non-image MIME)
    - Test `blobToBase64` round-trip with small Blob payloads
    - Test `isValidPortraitDataUrl` accepts valid formats and rejects invalid ones
    - _Requirements: 6.5_

- [x] 2. Implement the PortraitStore module
  - [x] 2.1 Create `src/storage/portrait-store.ts` with IndexedDB lifecycle and CRUD operations
    - Export `PortraitResult<T>` type and `IPortraitStore` interface
    - Implement concrete `PortraitStore` class:
      - `init()`: opens IndexedDB database `wfrp4e-portraits` (version 1) with object store `portraits`; on failure, sets internal `degraded` flag and logs a single console warning
      - `isDegraded()`: returns the degraded flag
      - `savePortrait(characterId, blob)`: puts blob into object store keyed by character ID; returns `PortraitResult<void>`
      - `getPortraitURL(characterId)`: gets blob from store, creates and returns object URL; returns null if no entry; returns error on failure
      - `getPortraitBlob(characterId)`: gets raw blob from store
      - `deletePortrait(characterId)`: deletes entry from store; treats missing entry as no-op
      - `revokeURL(url)`: calls `URL.revokeObjectURL(url)`
    - Export a singleton instance initialized lazily
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 4.1, 4.2, 4.5, 7.1, 7.2, 7.5_

  - [x] 2.2 Write property tests for PortraitStore (Properties 1, 2, 9)
    - Create `src/storage/__tests__/portrait-store.property.test.ts`
    - Use `fake-indexeddb` to provide IndexedDB in test environment
    - **Property 1: Portrait storage round-trip** — for any valid Blob (generated with arbitrary content and random MIME from jpeg/png/webp, ≤2 MB), savePortrait then getPortraitBlob returns a Blob with identical size and type
    - **Property 2: Portrait save overwrites previous** — for any character ID and sequence of N blobs, getPortraitBlob returns only the last-saved blob
    - **Property 9: Degraded mode stores portrait in localStorage** — when PortraitStore is in degraded mode, saving a portrait persists base64 data in the Character_JSON in localStorage
    - **Validates: Requirements 1.1, 1.2, 1.3, 4.2, 7.1**

  - [x] 2.3 Write unit tests for PortraitStore
    - Create `src/storage/__tests__/portrait-store.test.ts`
    - Test: retrieval returns null for non-existent character (Req 1.4)
    - Test: IndexedDB failure returns error indication without throwing (Req 1.6)
    - Test: database uses single object store named `portraits` (Req 1.7)
    - Test: IndexedDB availability detection on init (Req 4.1)
    - Test: degraded mode logs single warning per session (Req 4.5)
    - Test: portrait write failure shows error, leaves previous unchanged (Req 7.4)
    - Test: removal of non-existent portrait is successful no-op (Req 7.5)
    - _Requirements: 1.4, 1.6, 1.7, 4.1, 4.5, 7.4, 7.5_

- [x] 3. Implement the PortraitMigrationRunner
  - [x] 3.1 Create `src/storage/portrait-migration.ts`
    - Export `MigrationResult` interface and `runPortraitMigration(portraitStore: IPortraitStore): Promise<MigrationResult>`
    - Implementation:
      - Read character index from localStorage to get all character IDs
      - For each character: read Character_JSON from localStorage, check for non-empty `portrait` field
      - If portrait exists: convert base64 to Blob via `base64ToBlob`, call `portraitStore.savePortrait`, on success remove `portrait` field from JSON and re-save to localStorage
      - If portrait is missing or empty: skip character
      - If portraitStore is degraded: skip entire migration
      - On individual character write failure: leave localStorage unchanged, record ID in `failed` array, continue with next character
      - Return `MigrationResult` with counts
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.2 Write property tests for PortraitMigrationRunner (Properties 3, 4, 5)
    - Create `src/storage/__tests__/portrait-migration.property.test.ts`
    - Use `fake-indexeddb` for IndexedDB
    - **Property 3: Migration moves portrait from localStorage to IndexedDB** — for any character with non-empty base64 portrait in localStorage, after migration the portrait is retrievable from PortraitStore and the localStorage JSON no longer contains the portrait field
    - **Property 4: Migration is idempotent and selective** — for any set of characters (some with portraits, some without), running migration multiple times produces the same state as running once; characters without portraits are never modified
    - **Property 5: Migration fault isolation** — for N characters with portraits where one write fails, N-1 succeed and the failed character's localStorage remains unchanged
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6, 2.7**

  - [x] 3.3 Write unit tests for PortraitMigrationRunner
    - Create `src/storage/__tests__/portrait-migration.test.ts`
    - Test: IndexedDB entirely unavailable skips migration (Req 2.5)
    - Test: character with empty-string portrait is skipped (Req 2.6)
    - Test: subsequent runs on already-migrated characters produce no writes (Req 2.7)
    - _Requirements: 2.5, 2.6, 2.7_

- [x] 4. Checkpoint — Verify storage layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update Character Manager for portrait coordination
  - [x] 5.1 Add portrait-aware functions to `src/storage/character-manager.ts`
    - Import `PortraitStore` and `portrait-codec` modules
    - Add `loadCharacterWithPortrait(id: string): Promise<Character | null>`:
      - Load Character_JSON from localStorage
      - Retrieve portrait URL from PortraitStore; if store unavailable or fails, set portrait to empty string
      - Merge portrait URL into character object and return
    - Add `saveCharacterWithPortrait(id: string, character: Character, portraitBlob?: Blob): Promise<StorageWriteResult>`:
      - Strip portrait field from character object before saving to localStorage
      - If portraitBlob provided, save to PortraitStore
    - Add `deleteCharacterFull(id: string): Promise<boolean>`:
      - Delete character from localStorage (existing logic)
      - Delete portrait from PortraitStore
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 1.5_

  - [x] 5.2 Write property tests for Character Manager portrait integration (Properties 6, 7, 8, 12)
    - Create `src/storage/__tests__/character-manager.portrait.test.ts`
    - **Property 6: Character save excludes portrait from localStorage** — for any character with a non-empty portrait field, after save the localStorage JSON does not contain base64 image data
    - **Property 7: Character load merges portrait from IndexedDB** — for any character with a portrait in PortraitStore, loadCharacterWithPortrait returns an object whose portrait field is a non-empty blob: URL
    - **Property 8: Character deletion removes both stores** — for any character with both localStorage and IndexedDB entries, deleteCharacterFull removes both
    - **Property 12: Portrait update/removal does not write to localStorage** — for any portrait save or delete, localStorage.setItem is never called
    - **Validates: Requirements 3.1, 3.2, 3.4, 3.6, 7.3**

  - [x] 5.3 Write unit tests for Character Manager portrait integration
    - Test: PortraitStore failure during load returns character with empty portrait (Req 3.5)
    - Test: prior-migrated character with unavailable IndexedDB loads with empty portrait (Req 4.4)
    - _Requirements: 3.5, 4.4_

- [x] 6. Update Export/Import for portrait routing
  - [x] 6.1 Update `src/storage/export-import.ts` with portrait-aware export and import
    - Add `exportToJSONWithPortrait(character: Character, characterId: string): Promise<string>`:
      - Retrieve portrait Blob from PortraitStore via `getPortraitBlob`
      - Convert Blob to base64 via `blobToBase64`
      - Include as `portrait` field in exported JSON
      - If portrait retrieval fails, set portrait to empty string and continue export
    - Add `importFromJSONWithPortrait(json: string): Promise<{ success: boolean; character?: Character; error?: string }>`:
      - Parse JSON; validate portrait field with `isValidPortraitDataUrl`
      - If valid portrait: convert to Blob via `base64ToBlob`, store in PortraitStore, remove portrait from Character_JSON before saving to localStorage
      - If IndexedDB unavailable: retain portrait in Character_JSON and save full object to localStorage
      - If invalid base64: discard portrait, continue import without it
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 6.2 Write property tests for Export/Import (Properties 10, 11)
    - Create `src/storage/__tests__/export-import.portrait.test.ts`
    - **Property 10: Export round-trip preserves portrait data** — for any character with a portrait in IndexedDB, export then import yields the same portrait (matching Blob size and type)
    - **Property 11: Import routes portrait to IndexedDB and excludes from localStorage** — for any valid JSON with non-empty base64 portrait, after import the portrait is in PortraitStore and localStorage does not contain portrait data
    - **Validates: Requirements 5.1, 6.1**

  - [x] 6.3 Write unit tests for Export/Import portrait handling
    - Create or extend `src/storage/__tests__/export-import.test.ts`
    - Test: export with no portrait sets field to empty string (Req 5.2)
    - Test: export format backward compatibility with prior versions (Req 5.4)
    - Test: export failure falls back to empty portrait (Req 5.5)
    - Test: import with empty/null/undefined portrait creates no entry (Req 6.2)
    - Test: import when IndexedDB unavailable retains portrait in localStorage (Req 6.3)
    - Test: import without portrait field (Req 6.4)
    - Test: import with invalid base64 discards portrait (Req 6.5)
    - _Requirements: 5.2, 5.4, 5.5, 6.2, 6.3, 6.4, 6.5_

- [x] 7. Checkpoint — Verify full storage integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Wire migration into app startup and integrate UI
  - [x] 8.1 Integrate PortraitMigrationRunner into app startup flow
    - Update the app initialization sequence (likely in `App.tsx` or an initialization module) to:
      - Call `portraitStore.init()` early in startup
      - Call `runPortraitMigration(portraitStore)` before rendering character data
      - Ensure migration completes before character list/detail views render
    - Wire existing character load paths to use `loadCharacterWithPortrait` instead of direct localStorage reads for portrait data
    - Wire existing character delete paths to use `deleteCharacterFull`
    - Wire export button to use `exportToJSONWithPortrait`
    - Wire import flow to use `importFromJSONWithPortrait`
    - _Requirements: 2.1, 2.3, 3.4, 5.1, 6.1_

  - [x] 8.2 Update portrait update/removal UI handlers
    - Wire the portrait selection handler to convert the selected file to a Blob and call `portraitStore.savePortrait`
    - Wire the portrait removal handler to call `portraitStore.deletePortrait`
    - Add object URL cleanup via `portraitStore.revokeURL` in React effect cleanup (on unmount or portrait change)
    - Add error toast for failed portrait save/delete operations
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 9. Final checkpoint — Full verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- `fake-indexeddb` is used in all test files to provide a real IndexedDB API in the jsdom test environment
- The existing `fast-check` (v4.8.0) and `vitest` (v4.1.2) are already installed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "8.1"] },
    { "id": 6, "tasks": ["8.2"] }
  ]
}
```
