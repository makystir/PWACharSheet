# Implementation Plan: Dwarf Priestly Runic Magic

## Overview

This plan implements deity-based rune filtering for Dwarf priest characters. It layers a priest-specific rune restriction system on top of the existing Runesmith rune mechanics by introducing a deity registry, priest career detection, and deity-filtered rune availability. The implementation proceeds bottom-up: data layer → logic layer → integration → UI → tests.

## Tasks

- [x] 1. Set up data layer and type extensions
  - [x] 1.1 Add `patronDeity` field to the Character interface
    - In `src/types/character.ts`, add `patronDeity?: AncestorGod` to the `Character` interface
    - Import `AncestorGod` type from the new `src/data/deityRunes.ts` module
    - _Requirements: 1.1, 1.3_

  - [x] 1.2 Create `src/data/deityRunes.ts` with the deity registry
    - Export `AncestorGod` union type with all 7 deity names
    - Export `ANCESTOR_GODS` array constant
    - Export `DeityRuneEntry` interface with `god`, `runeIds`, and optional `highPriestBonus`
    - Export `DEITY_REGISTRY` array with exact rune lists per deity as specified in requirements 2.1–2.8
    - Add new priestly rune entries to `src/data/runes.ts` RUNE_CATALOGUE for any rune IDs referenced in the registry that don't yet exist
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

- [x] 2. Implement priest rune logic module
  - [x] 2.1 Create `src/logic/priestRunes.ts` with core filtering functions
    - Implement `isValidDeity(value: string): value is AncestorGod`
    - Implement `isPriestCareer(career: string): boolean` matching Doom Priest, Forge Priest, Hearth Priest career lines
    - Implement `isHighPriestLevel(career: string, careerLevel: string): boolean` using career scheme level 3/4 detection
    - Implement `shouldApplyDeityFilter(character: Character): boolean`
    - Implement `getPriestAvailableRunes(deity, isHighPriest): string[]` returning filtered rune IDs from DEITY_REGISTRY
    - Implement `getRestrictedRunes(knownRunes, deity): string[]` identifying known runes outside deity access
    - Implement `getDeityChangeWarnings(knownRunes, newDeity): string[]` listing rune names that become restricted
    - _Requirements: 1.2, 1.5, 3.1, 3.2, 3.4, 3.5, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4_

  - [x] 2.2 Write property test: Deity Assignment Validity (Property 1)
    - **Property 1: Deity Assignment Validity**
    - **Validates: Requirements 1.2, 1.4, 1.5**
    - Use `fc.string()` to generate arbitrary strings; verify `isValidDeity` returns true only for the 7 valid names

  - [x] 2.3 Write property test: Registry Integrity (Property 2)
    - **Property 2: Registry Integrity**
    - **Validates: Requirements 2.9**
    - Iterate all deities and all their rune IDs (including high priest bonus); verify each ID exists in RUNE_CATALOGUE

  - [x] 2.4 Write property test: Deity-Based Rune Filtering (Property 3)
    - **Property 3: Deity-Based Rune Filtering**
    - **Validates: Requirements 3.1**
    - Use `fc.constantFrom(...ANCESTOR_GODS)` to generate deities; verify `getPriestAvailableRunes` output matches registry exactly

  - [x] 2.5 Write property test: No-Deity Fallback (Property 4)
    - **Property 4: No-Deity Fallback**
    - **Validates: Requirements 3.2**
    - Generate priest characters with `patronDeity: undefined`; verify no filtering is applied

  - [x] 2.6 Write property test: Rejection of Non-Permitted Runes (Property 5)
    - **Property 5: Rejection of Non-Permitted Runes**
    - **Validates: Requirements 3.3**
    - Generate `(deity, runeId)` pairs where runeId is NOT in the deity's access list; verify `canLearnRune` returns `canLearn: false` with error mentioning rune name and deity name

  - [x] 2.7 Write property test: High Priest Bonus Inclusion and Exclusion (Property 6)
    - **Property 6: High Priest Bonus Inclusion and Exclusion**
    - **Validates: Requirements 3.4, 3.5, 6.1, 6.2, 6.4**
    - Generate `(deity, careerLevel)` combinations; verify bonus rune is included if and only if level >= 3 and deity has a bonus defined

  - [x] 2.8 Write property test: Runesmith Unaffected by Deity Filter (Property 7)
    - **Property 7: Runesmith Unaffected by Deity Filter**
    - **Validates: Requirements 4.3**
    - Generate Runesmith characters with random `patronDeity` values; verify deity filter is never applied

- [x] 3. Integrate priest filter into existing rune system
  - [x] 3.1 Extend `canLearnRune` in `src/logic/runes.ts` with deity restriction check
    - Import `shouldApplyDeityFilter`, `getPriestAvailableRunes`, `isHighPriestLevel` from priestRunes
    - After existing prerequisite checks, add deity filtering for priest characters
    - Return `canLearn: false` with descriptive error when rune is not in deity's access list
    - Handle dual Runesmith/Priest case (union of both availability sets)
    - _Requirements: 3.3, 4.1, 4.2, 4.3, 4.5, 4.6_

  - [x] 3.2 Write property test: Priest Rune Validation Matches Runesmith Rules (Property 8)
    - **Property 8: Priest Rune Validation Matches Runesmith Rules**
    - **Validates: Requirements 4.4, 4.5**
    - Generate priest rune placement attempts; verify max 3 runes/item, max 1 master/item, category restrictions, and talent prerequisites all still apply identically

- [x] 4. Checkpoint - Core logic verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Deity Selector UI component
  - [x] 5.1 Create `src/components/shared/DeitySelector.tsx`
    - Render a dropdown/select listing all 7 Ancestor Gods
    - Show placeholder "Select Ancestor God..." when no deity assigned
    - Only render when `character.species === 'Dwarf' && isPriestCareer(character.career)`
    - Persist selection immediately to character state on change
    - Show warning dialog when changing deity and restricted runes exist (using `getDeityChangeWarnings`)
    - Hide component (but retain stored value) when career changes to non-priest
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

  - [x] 5.2 Write property test: Deity Selector Visibility (Property 9)
    - **Property 9: Deity Selector Visibility**
    - **Validates: Requirements 5.1**
    - Generate characters with random species/career combinations; verify selector visible iff species is Dwarf AND career is priest

- [x] 6. Modify Rune Panel for restricted rune display
  - [x] 6.1 Update Rune Panel to show restricted runes with visual differentiation
    - Call `getRestrictedRunes()` to identify restricted known runes
    - Display restricted runes with a distinct badge/icon (not colour alone) for accessibility
    - Restricted runes remain in `knownRunes` but are visually flagged
    - Ensure High Priest bonus rune shows as restricted when career level drops below 3
    - _Requirements: 5.5, 6.3_

  - [x] 6.2 Write property test: Restricted Rune Identification (Property 10)
    - **Property 10: Restricted Rune Identification**
    - **Validates: Requirements 5.4, 5.5, 6.3**
    - Generate priest characters with random `knownRunes` and deities; verify restricted set is exactly the known runes not in deity's access list (accounting for high priest bonus)

- [x] 7. Integration wiring and end-to-end validation
  - [x] 7.1 Wire DeitySelector into CharacterPage or AdvancementPage
    - Place DeitySelector in the appropriate page section for Dwarf priest characters
    - Connect component to character state (read/write `patronDeity`)
    - Ensure rune panel updates reactively when deity changes
    - _Requirements: 5.1, 5.3_

  - [x] 7.2 Write integration tests for full deity-rune flows
    - Test: assign deity → learn permitted rune → inscribe on item → verify success
    - Test: assign deity → attempt non-permitted rune → verify rejection with correct error
    - Test: assign deity → learn runes → change deity → verify warnings and restricted flags
    - _Requirements: 3.1, 3.3, 5.4, 5.5_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 10 correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- The design specifies that new priestly rune IDs must be added to RUNE_CATALOGUE as part of task 1.2
- The `patronDeity` field is nullable/optional — existing characters are unaffected

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.8", "3.1"] },
    { "id": 3, "tasks": ["2.6", "2.7", "3.2"] },
    { "id": 4, "tasks": ["5.1", "6.1"] },
    { "id": 5, "tasks": ["5.2", "6.2", "7.1"] },
    { "id": 6, "tasks": ["7.2"] }
  ]
}
```
