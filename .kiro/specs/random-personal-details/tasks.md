# Implementation Plan: Random Personal Details

## Overview

Implement species-specific random generation and manual selection of character personal details (age, height, eye colour, hair colour, distinguishing features) for the WFRP4e character sheet. The implementation follows a data → logic → UI layering: static lookup tables in `src/data/personal-details.ts`, pure generation functions in `src/logic/personal-details.ts`, and composable UI components on the Identity tab. All randomisation accepts injected dice values for deterministic testing.

## Tasks

- [x] 1. Create data module with lookup tables
  - [x] 1.1 Implement `src/data/personal-details.ts` with all type definitions and table data
    - Define `SpeciesGroup`, `ColourTableEntry`, `ColourTable`, `DwarfAlternateRow`, `HighElfAgeTier`, `AgeFormula`, `HeightFormula` types
    - Populate `EYE_COLOUR_TABLE` with all 6 species columns (2d10 ranges 2–20)
    - Populate `HAIR_COLOUR_TABLE` with all 6 species columns (2d10 ranges 2–20)
    - Populate `DWARF_ALTERNATE_TABLE` with 20 rows (5-point bands, d100 range 1–100)
    - Populate `DWARF_DISTINGUISHING_FEATURES` array with 20 unique features
    - Export `HIGH_ELF_AGE_TIERS`, `AGE_FORMULAS`, and `HEIGHT_FORMULAS` constants
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 6.1, 8.1, 10.2, 11.2_

- [x] 2. Implement core logic module
  - [x] 2.1 Implement `getSpeciesGroup` in `src/logic/personal-details.ts`
    - Import and reuse `isHumanSpecies`, `isDwarfSpecies`, `isHalflingSpecies`, `isHighElfSpecies`, `isWoodElfSpecies`, `isOgreSpecies` from `career-eligibility.ts`
    - Return the matching `SpeciesGroup` or `undefined` for unknown species
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [x] 2.2 Write property test for species group mapping
    - **Property 1: Species Group Mapping Correctness**
    - Generate arbitrary species strings with case/prefix variations and verify correct mapping
    - Test all known species keys from SPECIES_DATA plus unknown strings returning undefined
    - Place test in `src/logic/__tests__/personal-details.property.test.ts`
    - **Validates: Requirements 1.2, 1.4, 1.7, 1.8**

  - [x] 2.3 Implement `generateAge` in `src/logic/personal-details.ts`
    - Accept `group: SpeciesGroup`, `dice: number[]`, and optional `tier: HighElfAgeTier`
    - Compute `base + sum(dice)` using the appropriate formula
    - For High_Elf, use tier's base/diceCount if provided, defaulting to Time of Ending
    - Validate dice array length matches formula's `diceCount`; clamp each die to [1, 10]
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 2.4 Write property test for age formula range invariant
    - **Property 2: Age Formula Range Invariant**
    - Generate species groups + d10 arrays and verify age = base + sum(dice) within expected range
    - Include High Elf age tiers
    - Place test in `src/logic/__tests__/personal-details.property.test.ts`
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.3, 3.4, 3.5, 3.6, 3.7**

  - [x] 2.5 Implement `formatHeight`, `humanHeightNeedsBonus`, and `generateHeight` in `src/logic/personal-details.ts`
    - `formatHeight(totalInches)`: convert total inches to `X'Y"` format with Y always 0–11
    - `humanHeightNeedsBonus(dice)`: return true if either die equals 10
    - `generateHeight(group, dice, bonusDie?)`: compute base inches + sum(dice) + optional bonus, call formatHeight
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.1, 5.2, 5.3, 5.4_

  - [x] 2.6 Write property test for height formatting invariant
    - **Property 3: Height Formatting Invariant**
    - Generate arbitrary positive integers, verify format is `X'Y"` with Y in [0, 11] and total = X*12 + Y
    - Place test in `src/logic/__tests__/personal-details.property.test.ts`
    - **Validates: Requirements 4.8, 4.9**

  - [x] 2.7 Write property test for human height bonus rule
    - **Property 4: Human Height Bonus Rule**
    - Generate d10 pairs and verify bonus detection iff at least one die equals 10
    - Verify non-Human species never incorporate bonus die
    - Place test in `src/logic/__tests__/personal-details.property.test.ts`
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 3. Checkpoint - Verify data and core logic
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement colour lookup and formatting functions
  - [x] 4.1 Implement `lookupEyeColour` and `lookupHairColour` in `src/logic/personal-details.ts`
    - Accept `group: SpeciesGroup` and `roll: number` (2d10 sum, clamped to [2, 20])
    - Iterate colour table entries for the group to find matching range
    - Return the colour string value
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 4.2 Implement `formatVariegatedEyes` in `src/logic/personal-details.ts`
    - Return `"{first} flecked with {second}"` when first !== second, or just the colour when equal
    - _Requirements: 7.2, 7.3, 7.5_

  - [x] 4.3 Implement `getEyeColourOptions` and `getHairColourOptions` in `src/logic/personal-details.ts`
    - Extract unique colour values from the table for a given species group
    - Return deduplicated arrays preserving table order
    - _Requirements: 9.1, 9.2_

  - [x] 4.4 Write property test for colour table lookup completeness
    - **Property 5: Colour Table Lookup Completeness**
    - Generate species groups + integers in [2, 20], verify lookup returns a non-empty string that is a member of the table
    - Place test in `src/logic/__tests__/personal-details.property.test.ts`
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7**

  - [x] 4.5 Write property test for variegated eye colour formatting
    - **Property 6: Variegated Eye Colour Formatting**
    - Generate pairs of non-empty strings, verify format rule
    - Place test in `src/logic/__tests__/personal-details.property.test.ts`
    - **Validates: Requirements 7.2, 7.3, 7.5**

  - [x] 4.6 Write property test for dropdown options deduplication
    - **Property 7: Dropdown Options Deduplication**
    - For each species group, verify options arrays have no duplicates and contain all table values
    - Place test in `src/logic/__tests__/personal-details.property.test.ts`
    - **Validates: Requirements 9.1, 9.2**

- [x] 5. Implement Dwarf alternate table logic
  - [x] 5.1 Implement `getDwarfRegionalModifier` and `lookupDwarfAlternateTable` in `src/logic/personal-details.ts`
    - `getDwarfRegionalModifier(variant)`: return -5 for Norse, +5 for southern holds (Karak Hirn/Black Mountains, Karak Izor/The Vaults), 0 otherwise
    - `lookupDwarfAlternateTable(roll, variant)`: apply modifier to hair/eye lookup only (clamped 1–100), use unmodified roll for feature lookup
    - _Requirements: 10.2, 10.3, 10.4, 11.2_

  - [x] 5.2 Write property test for Dwarf alternate table regional modifier
    - **Property 8: Dwarf Alternate Table Regional Modifier**
    - Generate d100 values + Dwarf variants, verify modifier application to hair/eye only and unmodified for features
    - Place test in `src/logic/__tests__/personal-details.property.test.ts`
    - **Validates: Requirements 10.2, 10.3, 10.4, 11.2**

- [x] 6. Checkpoint - Verify all logic functions
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Create `PersonalDetailField` wrapper component
  - [x] 7.1 Implement `PersonalDetailField` component in `src/components/shared/PersonalDetailField.tsx`
    - Create a compound component rendering: `EditableField` for free-text, a dice roll button (🎲), and optional dropdown
    - Accept props: `label`, `value`, `onSave`, `onRoll`, `dropdownOptions?`, `onDropdownSelect?`, `disabled?`
    - When `disabled` is true, set `aria-disabled="true"`, reduce opacity to ≤50%, cursor: not-allowed on roll button and dropdown
    - Create CSS module `PersonalDetailField.module.css` for styling
    - _Requirements: 12.1, 12.2, 12.5, 13.1, 13.2, 13.3, 13.4, 14.1, 14.2, 14.5, 14.6_

  - [x] 7.2 Write unit tests for `PersonalDetailField`
    - Test roll button disabled state when `disabled` prop is true
    - Test dropdown disabled state when `disabled` prop is true
    - Test roll button click calls `onRoll` when enabled
    - Test dropdown selection calls `onDropdownSelect`
    - Test free-text editing still works after roll/dropdown selection
    - Place test in `src/components/__tests__/PersonalDetailField.test.tsx`
    - _Requirements: 12.1, 12.2, 12.5, 13.3, 14.5, 14.6_

- [x] 8. Create `AgeTierSelector` component for High Elf characters
  - [x] 8.1 Implement `AgeTierSelector` in `src/components/shared/AgeTierSelector.tsx`
    - Render a select element listing all 5 High Elf age tiers from `HIGH_ELF_AGE_TIERS`
    - Default to "Time of Ending" when no selection is made
    - Expose `selectedTier` via callback prop for parent to use during age rolls
    - Only render when species group is High_Elf (parent controls visibility)
    - _Requirements: 3.1, 3.2, 3.8, 14.3_

  - [x] 8.2 Write unit tests for `AgeTierSelector`
    - Test default selection is "Time of Ending"
    - Test all 5 tier options are rendered
    - Test selection change fires callback with correct tier
    - Place test in `src/components/__tests__/AgeTierSelector.test.tsx`
    - _Requirements: 3.1, 3.2, 3.8_

- [x] 9. Create `DwarfAlternateRoll` component
  - [x] 9.1 Implement `DwarfAlternateRoll` in `src/components/shared/DwarfAlternateRoll.tsx`
    - Render a button to trigger the d100 alternate table roll
    - On roll: generate d100, call `lookupDwarfAlternateTable`, update hair and eyes
    - Display the resulting distinguishing feature with confirm/dismiss option
    - Only store feature if player confirms
    - Accept `disabled` prop to handle empty species state
    - _Requirements: 10.1, 10.2, 10.5, 10.6, 11.1, 11.4, 11.5_

  - [x] 9.2 Implement distinguishing feature dropdown and roll button in `DwarfAlternateRoll`
    - Add a separate Roll_Button for distinguishing features (1d100, no modifier)
    - Add a dropdown with all 20 features for manual selection
    - Limit to one feature at a time; new selection replaces previous
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 9.3 Write unit tests for `DwarfAlternateRoll`
    - Test alternate roll updates hair and eyes fields
    - Test distinguishing feature confirmation flow
    - Test disabled state when species not set
    - Test feature replacement when new one is selected/rolled
    - Place test in `src/components/__tests__/DwarfAlternateRoll.test.tsx`
    - _Requirements: 10.1, 10.5, 10.6, 11.4, 11.5_

- [x] 10. Checkpoint - Verify UI components in isolation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Integrate personal detail controls into CharacterPage
  - [x] 11.1 Wire `PersonalDetailField` components into `CharacterPage.tsx` for age, height, eyes, and hair
    - Replace existing `EditableField` instances for age, height, hair, and eyes with `PersonalDetailField`
    - Implement `onRoll` handlers that call the logic functions with randomly generated dice values
    - For eye and hair fields, populate `dropdownOptions` from `getEyeColourOptions` / `getHairColourOptions`
    - Disable controls when `character.species` is empty (pass `disabled` prop)
    - Enable controls within 500ms when species changes to non-empty
    - _Requirements: 2.8, 2.9, 4.9, 6.8, 6.9, 6.10, 8.8, 9.3, 9.4, 9.5, 9.6, 9.7, 12.1, 12.2, 12.3, 12.4, 14.1, 14.2_

  - [x] 11.2 Wire `AgeTierSelector` for High Elf characters
    - Conditionally render `AgeTierSelector` when species group is High_Elf
    - Track selected tier in local state, pass to `generateAge` in the age roll handler
    - Position between age text input and roll button per design
    - _Requirements: 3.1, 3.2, 14.3_

  - [x] 11.3 Wire `DwarfAlternateRoll` for Dwarf characters
    - Conditionally render when species group is Dwarf
    - Pass character species variant for regional modifier detection
    - Connect to character update for hair, eyes, and optional distinguishing feature storage
    - _Requirements: 10.1, 10.5, 10.6, 14.4_

  - [x] 11.4 Implement variegated eye colour flow for Elf characters
    - After first eye colour roll for High_Elf or Wood_Elf, show "Roll Second Colour" button
    - On second roll, call `formatVariegatedEyes` and store combined result
    - If both colours are the same, store single colour without "flecked with" format
    - If player declines second roll, store first colour only
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 11.5 Implement Human height bonus rule in the height roll handler
    - After rolling 2d10 for Human height, check `humanHeightNeedsBonus`
    - If true, roll one additional d10 and pass as `bonusDie` to `generateHeight`
    - Ensure bonus is non-recursive (no further bonus if bonus die is also 10)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 11.6 Handle species change: reset dropdown selections, retain field values
    - When `character.species` changes, reset all dropdown selection indicators
    - Retain existing free-text values in age, height, hair, eyes fields
    - Update dropdown options to reflect new species group
    - _Requirements: 9.6, 9.7, 12.4_

- [x] 12. Checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Write integration tests for end-to-end flows
  - [x] 13.1 Write integration tests for roll and selection workflows
    - Test: click age roll button → age field updated with valid numeric string
    - Test: click height roll button for Human → height formatted as X'Y" with bonus rule applied when die is 10
    - Test: click eye colour roll button → value from species colour table stored
    - Test: Elf variegated eye flow: roll first → offer second → combined format stored
    - Test: Dwarf alternate table roll → hair and eyes updated, feature offered for confirmation
    - Test: dropdown selection updates field and can be overridden by free-text typing
    - Test: all controls disabled when species is empty, enabled when species is set
    - Test: species change resets dropdown selections but retains field values
    - Place test in `src/components/__tests__/PersonalDetails.integration.test.tsx`
    - _Requirements: 2.1, 2.8, 4.9, 5.1, 6.9, 7.1, 7.2, 8.8, 9.3, 9.5, 9.6, 10.5, 12.1, 12.3, 12.4, 13.2, 13.3_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All randomisation logic accepts injected dice values for deterministic testing (following the existing `dice-roller.ts` pattern)
- The `Character` interface is reused without modification — no schema migration needed
- `fast-check` v4.8.0 and `vitest` v4.1.2 are already in devDependencies

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.3", "2.5"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.6", "2.7", "4.1", "4.2", "4.3"] },
    { "id": 3, "tasks": ["4.4", "4.5", "4.6", "5.1"] },
    { "id": 4, "tasks": ["5.2", "7.1", "8.1"] },
    { "id": 5, "tasks": ["7.2", "8.2", "9.1"] },
    { "id": 6, "tasks": ["9.2", "9.3"] },
    { "id": 7, "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5"] },
    { "id": 8, "tasks": ["11.6"] },
    { "id": 9, "tasks": ["13.1"] }
  ]
}
```
