# Implementation Plan: Disease System

## Overview

Implement WFRP 4e disease tracking for the character sheet PWA. The system adds static data modules for 9 diseases and 12 symptoms, a logic module for lookups and active disease management, a Character type extension with migration support, and a Disease Panel UI component on the Character page. Follows the existing data → logic → UI architecture.

## Tasks

- [x] 1. Create static data modules
  - [x] 1.1 Create the Symptom Catalogue data file (`src/data/symptoms.ts`)
    - Define `SymptomEntry` interface with `name`, `description`, and `effects` fields (all strings)
    - Export `SYMPTOM_CATALOGUE` as a `readonly SymptomEntry[]` containing all 12 symptoms: Blight, Convulsions, Coughs and Sneezes, Delirium, Fever, Flux, Gangrene, Lingering, Malaise, Nausea, Pox, and Wounded
    - All fields must be non-empty strings
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 1.2 Create the Disease Registry data file (`src/data/diseases.ts`)
    - Define `DiseaseEntry` interface with `name`, `contraction`, `incubation`, `duration` (all strings), and `symptoms` (string array)
    - Export `DISEASE_REGISTRY` as a `readonly DiseaseEntry[]` containing exactly 9 diseases: Blood Rot, The Bloody Flux, Galloping Trots, Itching Pox, Neiglish Rot, Packer's Pox, Ratte Fever, The Shakes, and Black Plague
    - Each disease must reference symptom names exactly as defined in `SYMPTOM_CATALOGUE`
    - Each disease must have at least 1 symptom reference
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.3 Write property tests for static data integrity (`src/data/__tests__/diseases.property.test.ts`)
    - **Property 1: Data completeness invariant** — All disease fields are non-empty strings, symptoms array length ≥ 1; all symptom fields are non-empty strings
    - **Property 2: Symptom reference round-trip resolution** — Every disease symptom reference resolves to a valid symptom entry
    - **Property 5: No duplicate names in registries** — No duplicate names in Disease Registry or Symptom Catalogue
    - **Validates: Requirements 1.3, 1.4, 1.5, 2.4, 9.1, 9.2, 9.3**

  - [x] 1.4 Write unit tests for static data counts (`src/data/__tests__/diseases.test.ts`)
    - Verify Disease Registry has exactly 9 entries
    - Verify Symptom Catalogue has exactly 12 entries
    - Verify specific disease lookups return correct data
    - _Requirements: 1.2, 2.2, 2.3_

- [x] 2. Implement Disease Tracker logic module
  - [x] 2.1 Create lookup functions in `src/logic/diseases.ts`
    - Import `DISEASE_REGISTRY` and `SYMPTOM_CATALOGUE`
    - Implement `findDisease(name: string): DiseaseEntry | undefined` — case-sensitive exact match
    - Implement `findSymptom(name: string): SymptomEntry | undefined` — case-sensitive exact match
    - Implement `getDiseaseSymptoms(diseaseName: string): SymptomEntry[] | undefined` — returns resolved symptom entries in order, or undefined for invalid disease
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 2.2 Create active disease management functions in `src/logic/diseases.ts`
    - Define `ActiveDisease` interface with `id` (number), `diseaseName` (string), `contracted` (number), `notes` (string)
    - Implement `addDisease(diseases: ActiveDisease[], diseaseName: string): ActiveDisease[]` — appends new record with auto-incrementing ID, Date.now() timestamp, empty notes; returns new array
    - Implement `removeDisease(diseases: ActiveDisease[], id: number): ActiveDisease[]` — removes by ID, no-op if not found; returns new array
    - Implement `updateDiseaseNotes(diseases: ActiveDisease[], id: number, notes: string): ActiveDisease[]` — updates notes for matching ID; returns new array
    - All functions must be immutable (never mutate input array)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.1_

  - [x] 2.3 Write property tests for lookup functions (`src/logic/__tests__/diseases.property.test.ts`)
    - **Property 3: Lookup returns correct entry for valid names** — `findDisease` and `findSymptom` return exact entries for all registry names
    - **Property 4: Lookup returns undefined for invalid names** — All three lookup functions return undefined for names not in registries
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6**

  - [x] 2.4 Write property tests for active disease management (`src/logic/__tests__/diseases.property.test.ts`)
    - **Property 6: Add disease produces correctly structured record** — Validates ID generation, fields, and append behavior
    - **Property 7: Remove disease correctness** — Validates removal by existing ID and no-op for missing ID
    - **Property 8: Immutability of add and remove operations** — Original array unchanged after operations
    - **Property 9: Notes update persistence** — Correct notes field updated, other entries unchanged
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 8.1**

  - [x] 2.5 Write unit tests for Disease Tracker edge cases (`src/logic/__tests__/diseases.test.ts`)
    - Test adding to empty array produces ID 1
    - Test removing from empty array returns empty array
    - Test updating notes for non-existent ID returns unchanged array
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 3. Checkpoint - Ensure data and logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Extend Character type and migration
  - [x] 4.1 Add `diseases` field to Character type (`src/types/character.ts`)
    - Import `ActiveDisease` from `src/logic/diseases.ts`
    - Add optional `diseases?: ActiveDisease[]` field to the `Character` interface
    - Add `diseases: []` to the `BLANK_CHARACTER` constant
    - _Requirements: 5.1, 5.2_

  - [x] 4.2 Update character loading/migration to backfill `diseases` field
    - Ensure the `deepMerge` / `backfillCharacter` logic in the existing migration code defaults missing `diseases` field to `[]`
    - Verify existing character data is preserved unchanged when `diseases` is absent
    - _Requirements: 5.3_

  - [x] 4.3 Write property test for migration backfill (`src/logic/__tests__/diseases.property.test.ts`)
    - **Property 10: Migration backfill preserves existing data** — Characters without `diseases` field get `[]` and all other fields remain unchanged
    - **Validates: Requirements 5.3**

- [x] 5. Checkpoint - Ensure type extension and migration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Disease Panel UI
  - [x] 6.1 Create DiseasePanel component (`src/components/shared/DiseasePanel.tsx` and `src/components/shared/DiseasePanel.module.css`)
    - Accept `character` and `updateCharacter` props (same pattern as `CorruptionCard`)
    - Display list of active diseases showing each disease's name
    - Show empty state message when character has zero active diseases
    - Include "Add Disease" button using existing `AddButton` component
    - Use `Card` and `SectionHeader` shared components for layout
    - _Requirements: 6.1, 6.3, 6.6_

  - [x] 6.2 Implement disease expand/collapse and detail display
    - Tapping a disease entry expands it to show: contraction method, incubation period, duration, symptoms list, and notes
    - Display each symptom's name, description, and mechanical effects in the expanded view
    - Symptoms displayed in order from disease's symptom list
    - Tapping again collapses the entry
    - _Requirements: 6.2, 7.1, 7.2_

  - [x] 6.3 Implement add disease picker flow
    - Tapping "Add Disease" opens a picker listing all 9 diseases from `DISEASE_REGISTRY`
    - Use the existing `Picker` component pattern
    - Selecting a disease calls `addDisease` and updates character state via `updateCharacter`
    - _Requirements: 6.3, 6.4_

  - [x] 6.4 Implement remove disease and notes editing
    - Add remove button on each active disease entry
    - Tapping remove calls `removeDisease` and updates character state
    - Display editable text area for notes when disease is expanded
    - Editing notes calls `updateDiseaseNotes` and persists via `updateCharacter`
    - _Requirements: 6.5, 8.1, 8.2_

  - [x] 6.5 Integrate DiseasePanel into CharacterPage (`src/components/pages/CharacterPage.tsx`)
    - Import and render `DiseasePanel` component on the Character page
    - Pass `character` and `updateCharacter` props
    - _Requirements: 6.1_

  - [x] 6.6 Write unit tests for DiseasePanel UI interactions (`src/components/shared/__tests__/DiseasePanel.test.tsx`)
    - Test empty state renders when no diseases
    - Test add button opens picker with 9 diseases
    - Test selecting from picker adds disease to character
    - Test tapping disease entry expands detail view
    - Test remove button removes disease
    - Test notes textarea is editable and persists changes
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 8.2_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific counts, edge cases, and UI interactions
- The implementation follows existing patterns from `critical-wounds.ts` (logic), `critical-wound-tables.ts` (data), and `CorruptionCard.tsx` (UI)
- fast-check v4.8.0 is already available in devDependencies
- All disease management functions are immutable, returning new arrays

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "1.4", "2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3"] },
    { "id": 4, "tasks": ["2.4", "2.5"] },
    { "id": 5, "tasks": ["4.1"] },
    { "id": 6, "tasks": ["4.2"] },
    { "id": 7, "tasks": ["4.3"] },
    { "id": 8, "tasks": ["6.1"] },
    { "id": 9, "tasks": ["6.2", "6.3"] },
    { "id": 10, "tasks": ["6.4"] },
    { "id": 11, "tasks": ["6.5"] },
    { "id": 12, "tasks": ["6.6"] }
  ]
}
```
