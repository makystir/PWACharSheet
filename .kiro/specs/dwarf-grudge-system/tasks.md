# Implementation Plan: Dwarf Grudge Book System

## Overview

This plan implements the Dwarf Grudge Book system — a panel on the Character page that tracks personal and party grudges for Dwarf characters. Implementation follows the same architectural pattern as the Yenlui Balance panel: data model extension, pure logic module, house rule toggle on Settings, species-gated UI component, and property-based tests for all correctness properties.

## Tasks

- [x] 1. Extend data model and character interfaces
  - [x] 1.1 Add GrudgeEntry type and update Character/HouseRules interfaces in `src/types/character.ts`
    - Add `GrudgeType = 'standard' | 'blood'` and `GrudgeStatus = 'outstanding' | 'satisfied'` type aliases
    - Add `GrudgeEntry` interface with fields: id, offence, perpetrator, restitution, type, status, isPartyGrudge, dateRecorded, dateSatisfied
    - Add optional `grudges?: GrudgeEntry[]` field to the `Character` interface
    - Add `useGrudgeBook: boolean` field to the `HouseRules` interface
    - Ensure `BLANK_CHARACTER.houseRules.useGrudgeBook` defaults to `false`
    - _Requirements: 1.1, 1.2, 1.3, 2.1_

- [x] 2. Implement grudge logic module
  - [x] 2.1 Create `src/logic/grudges.ts` with pure business logic functions
    - Implement `isDwarf(species: string): boolean` — case-insensitive substring check for "dwarf"
    - Implement `isGrudgePanelVisible(character: Character): boolean` — returns `useGrudgeBook && isDwarf(species)`
    - Implement `canAddPartyGrudge(grudges: GrudgeEntry[]): boolean` — checks outstanding party grudges < 3
    - Implement `validateGrudgeForm(form: GrudgeFormData): ValidationResult` — trims and validates required fields
    - Implement `createGrudgeEntry(character: Character, form: GrudgeFormData): Character` — appends new outstanding grudge with generated ID and today's date
    - Implement `satisfyGrudge(character: Character, grudgeId: string): Character` — sets status to satisfied, sets dateSatisfied, no-op if already satisfied
    - Implement `deleteGrudge(character: Character, grudgeId: string): Character` — removes entry by ID
    - Implement `sortGrudges(grudges: GrudgeEntry[]): GrudgeEntry[]` — outstanding first, then satisfied
    - Implement `getGrudgeXP(type: GrudgeType): number` — returns 25 for standard, 50 for blood
    - _Requirements: 1.5, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.5, 4.3, 4.4, 4.5, 5.6, 6.2, 6.5, 6.6, 7.3, 9.1_

  - [x] 2.2 Write unit tests for grudge logic in `src/logic/__tests__/grudges.test.ts`
    - Test `isDwarf` with "Dwarf", "Dwarf (Karaz-a-Karak)", "Dwarf (Barak Varr)", "Human", "High Elf", "", "DWARF"
    - Test `isGrudgePanelVisible` for combinations of species + toggle
    - Test `getGrudgeXP` returns 25 for standard, 50 for blood
    - Test `validateGrudgeForm` with valid form, one empty field, all empty, whitespace-only fields
    - Test `createGrudgeEntry` verifies status, ID, dateRecorded defaults
    - Test `satisfyGrudge` sets status and date, is no-op on already satisfied
    - Test `deleteGrudge` removes entry, is no-op on missing ID
    - Test `canAddPartyGrudge` boundary cases: 0, 1, 2, 3 outstanding party grudges
    - Test `sortGrudges` with mixed outstanding/satisfied entries
    - _Requirements: 1.5, 2.4, 2.5, 3.1, 3.2, 3.5, 4.3, 4.4, 4.5, 5.6, 6.2, 6.5, 7.3, 9.1_

  - [x] 2.3 Write property test for grudge serialization round-trip
    - **Property 1: Grudge serialization round-trip**
    - Generate arbitrary valid GrudgeEntry arrays, serialize character to JSON and deserialize, verify identical grudge arrays
    - Test in `src/logic/__tests__/grudges.property.test.ts`
    - **Validates: Requirements 1.4, 1.5**

  - [x] 2.4 Write property test for panel visibility predicate
    - **Property 2: Panel visibility predicate**
    - Generate random characters with varied species and toggle values; verify `isGrudgePanelVisible` returns true iff useGrudgeBook AND species contains "dwarf" (case-insensitive)
    - Test in `src/logic/__tests__/grudges.property.test.ts`
    - **Validates: Requirements 2.4, 2.5, 3.1, 3.2**

  - [x] 2.5 Write property test for data preservation on visibility change
    - **Property 3: Data preservation on visibility change**
    - Generate characters with non-empty grudge arrays; toggle useGrudgeBook off or change species to non-Dwarf; verify grudges array unchanged
    - Test in `src/logic/__tests__/grudges.property.test.ts`
    - **Validates: Requirements 2.6, 3.3**

  - [x] 2.6 Write property test for Dwarf species detection
    - **Property 4: Dwarf species detection**
    - Generate arbitrary strings; verify `isDwarf` returns true iff string contains "dwarf" (case-insensitive)
    - Test in `src/logic/__tests__/grudges.property.test.ts`
    - **Validates: Requirements 3.5**

  - [x] 2.7 Write property test for grudge creation produces valid entry
    - **Property 5: Grudge creation produces valid entry**
    - Generate valid form data; verify `createGrudgeEntry` appends entry with status 'outstanding', non-empty unique ID, and today's date
    - Test in `src/logic/__tests__/grudges.property.test.ts`
    - **Validates: Requirements 4.3**

  - [x] 2.8 Write property test for validation rejects incomplete forms
    - **Property 6: Validation rejects incomplete forms**
    - Generate form data with at least one empty/whitespace-only required field; verify `validateGrudgeForm` returns valid: false with correct error fields
    - Test in `src/logic/__tests__/grudges.property.test.ts`
    - **Validates: Requirements 4.4**

  - [x] 2.9 Write property test for party grudge limit enforcement
    - **Property 7: Party grudge limit enforcement**
    - Generate grudge arrays with varying counts of outstanding party grudges; verify `canAddPartyGrudge` returns true iff count < 3
    - Test in `src/logic/__tests__/grudges.property.test.ts`
    - **Validates: Requirements 4.5, 9.1, 9.2, 9.4**

  - [x] 2.10 Write property test for sort order
    - **Property 8: Sort order — outstanding before satisfied**
    - Generate mixed grudge arrays; verify `sortGrudges` places all outstanding entries before all satisfied entries
    - Test in `src/logic/__tests__/grudges.property.test.ts`
    - **Validates: Requirements 5.6**

  - [x] 2.11 Write property test for satisfy sets status and date
    - **Property 9: Satisfy sets status and date**
    - Generate characters with outstanding grudges; call `satisfyGrudge`; verify status changes to satisfied, dateSatisfied set to today, all other fields unchanged
    - Test in `src/logic/__tests__/grudges.property.test.ts`
    - **Validates: Requirements 6.2**

  - [x] 2.12 Write property test for satisfy does not modify XP
    - **Property 10: Satisfy does not modify XP**
    - Generate characters with XP fields; call `satisfyGrudge`; verify xpCur, xpSpent, xpTotal unchanged
    - Test in `src/logic/__tests__/grudges.property.test.ts`
    - **Validates: Requirements 6.6**

  - [x] 2.13 Write property test for satisfy is irreversible
    - **Property 11: Satisfy is irreversible**
    - Generate characters with already-satisfied grudges; call `satisfyGrudge`; verify entry unchanged (no-op)
    - Test in `src/logic/__tests__/grudges.property.test.ts`
    - **Validates: Requirements 6.5**

  - [x] 2.14 Write property test for delete removes exactly one entry
    - **Property 12: Delete removes exactly one entry**
    - Generate grudge arrays containing a target entry; call `deleteGrudge`; verify array length reduced by 1, target absent, other entries unchanged
    - Test in `src/logic/__tests__/grudges.property.test.ts`
    - **Validates: Requirements 7.3**

- [x] 3. Checkpoint - Verify logic layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add house rule toggle on Settings page
  - [x] 4.1 Add "Grudge Book (Dwarf)" toggle to `src/components/pages/SettingsPage.tsx`
    - Add a new toggle entry in the House Rules section using existing ON/OFF button pattern
    - Label: "Grudge Book (Dwarf)"
    - Description: "Track Dwarf grudges for XP (Dwarf Player's Guide)"
    - Binds to `houseRules.useGrudgeBook`
    - _Requirements: 2.2, 2.3_

- [x] 5. Implement GrudgePanel UI component
  - [x] 5.1 Create `src/components/shared/GrudgePanel.module.css` with panel styles
    - Style the panel container using the Card component pattern
    - Style grudge list items with distinct outstanding vs satisfied appearance (satisfied: dimmed/struck-through)
    - Style Blood grudge indicator (icon + label, not colour alone)
    - Style Party grudge "Party" badge
    - Style XP reference header area
    - Style add-grudge form inputs and buttons
    - Ensure 44×44 CSS pixel minimum touch targets for mobile
    - Add responsive rules: full width at ≥768px, vertical stack with no horizontal overflow at <768px
    - _Requirements: 5.2, 5.3, 5.4, 10.2, 10.3, 10.4, 10.5_

  - [x] 5.2 Create `src/components/shared/GrudgePanel.tsx` main panel component
    - Accept `GrudgePanelProps` (character, updateCharacter)
    - Return null when `isGrudgePanelVisible(character)` is false
    - Render XP reference header showing "Standard: 25 XP · Blood: 50 XP"
    - Render empty state message when no grudges exist
    - Render sorted grudge list (outstanding before satisfied) with type indicator, party badge, and satisfy/delete controls
    - Implement "Add Grudge" form with fields: offence, perpetrator, restitution, type selector (default: Standard), isPartyGrudge checkbox
    - Validate form on submit using `validateGrudgeForm`, show field errors
    - Enforce party grudge limit using `canAddPartyGrudge`, show limit message
    - Implement satisfy action: update character, show XP earned confirmation (25 or 50)
    - Implement delete action: show confirmation dialog, then remove on confirm
    - Wrap in Card component matching existing Character page styling
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 9.4, 10.2_

- [x] 6. Integrate GrudgePanel into the Character page
  - [x] 6.1 Import and render GrudgePanel in `src/components/pages/CharacterPage.tsx`
    - Import GrudgePanel component
    - Render in the identity sub-tab section, after the DeitySelector and before the Characteristics card
    - Pass character and updateCharacter props
    - _Requirements: 10.1_

- [x] 7. Checkpoint - Verify UI integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1–12)
- Unit tests validate specific examples and edge cases
- The logic module is implemented as pure functions following the same pattern as `src/logic/yenlui.ts`
- fast-check is already in devDependencies so no additional dependency installation is needed
- The panel visibility logic lives in the logic layer (not the component) for testability

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9", "2.10", "2.11", "2.12", "2.13", "2.14"] },
    { "id": 3, "tasks": ["4.1", "5.1"] },
    { "id": 4, "tasks": ["5.2"] },
    { "id": 5, "tasks": ["6.1"] }
  ]
}
```
