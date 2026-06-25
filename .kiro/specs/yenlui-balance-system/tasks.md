# Implementation Plan: Yenlui Balance System

## Overview

Implement the Yenlui spiritual balance tracking system for Elven characters. The system extends the Character data model with a `yenluiState` field and `useYenlui` house rule toggle, adds a pure logic module for visibility/difficulty/normalization/talent notes, and provides a YenluiPanel UI component on the Character page. Follows the existing data → logic → UI architecture with property-based tests for correctness properties.

## Tasks

- [x] 1. Extend data model and types
  - [x] 1.1 Add `YenluiState` type and extend `Character` and `HouseRules` interfaces (`src/types/character.ts`)
    - Define `YenluiState` type as `'light' | 'balanced' | 'dark'`
    - Add `useYenlui: boolean` to the `HouseRules` interface, defaulting to `false`
    - Add optional `yenluiState?: YenluiState` field to the `Character` interface
    - Update `BLANK_CHARACTER` to include `useYenlui: false` in `houseRules`
    - _Requirements: 1.1, 2.1, 5.1, 5.2_

- [x] 2. Implement Yenlui logic module
  - [x] 2.1 Create `src/logic/yenlui.ts` with visibility and normalization functions
    - Implement `normalizeYenluiState(value: unknown): YenluiState | undefined` — returns valid state or `undefined` for invalid values
    - Implement `isYenluiVisible(character: Character): boolean` — returns `true` only when `useYenlui` is `true` AND species is Elf
    - Reuse existing `isElf()` utility from `src/logic/endeavours.ts`
    - Export `YENLUI_STATE_META` record with label and description (≤120 chars) for each state
    - _Requirements: 1.5, 2.4, 2.5, 3.1, 3.2, 3.5, 4.1, 4.4_

  - [x] 2.2 Add sword-dancing difficulty function to `src/logic/yenlui.ts`
    - Implement `getYenluiDifficulty(character: Character): DifficultyInfo` — returns `{ label, modifier }` based on `yenluiState` and talents
    - Return `{ label: 'Very Hard', modifier: '(-30)' }` only when state is `'dark'` AND character lacks "Sanctuary of the Mind" at level ≥ 3
    - Return `{ label: 'Challenging', modifier: '(+0)' }` in all other cases
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.3 Add talent notes function to `src/logic/yenlui.ts`
    - Implement `getYenluiTalentNotes(character: Character): TalentNote[]` — returns notes for qualifying talents
    - Include note for "Blood of Aenarion" (weekly Cool Test), "Cadai Meditation" (daily Pray Test), and "Sanctuary of the Mind" at level ≥ 3 (negates penalty)
    - Return empty array when no qualifying talents are present
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 2.4 Write property tests for Yenlui logic (`src/logic/__tests__/yenlui.property.test.ts`)
    - **Property 2: Invalid Value Normalization** — For any string not in `['light', 'balanced', 'dark']`, `normalizeYenluiState()` returns `undefined`
    - **Validates: Requirements 1.5**

  - [x] 2.5 Write property tests for visibility predicate (`src/logic/__tests__/yenlui.property.test.ts`)
    - **Property 3: Panel Visibility Predicate** — Panel visible iff `useYenlui === true` AND species is `'High Elf'` or `'Wood Elf'`
    - **Validates: Requirements 2.4, 2.5, 3.1, 3.2, 3.5**

  - [x] 2.6 Write property tests for state preservation (`src/logic/__tests__/yenlui.property.test.ts`)
    - **Property 4: State Preservation Invariant** — Toggling `useYenlui` off or changing species does not alter stored `yenluiState`
    - **Validates: Requirements 2.6, 3.3**

  - [x] 2.7 Write property tests for sword-dancing difficulty (`src/logic/__tests__/yenlui.property.test.ts`)
    - **Property 8: Sword-Dancing Difficulty Computation** — Returns "Very Hard (-30)" iff state is `'dark'` AND no "Sanctuary of the Mind" at level ≥ 3; "Challenging (+0)" otherwise
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 2.8 Write property tests for talent notes (`src/logic/__tests__/yenlui.property.test.ts`)
    - **Property 10: Talent Note Count Matches Qualifying Talents** — Note count equals count of qualifying talents present on character
    - **Validates: Requirements 8.6**

  - [x] 2.9 Write property tests for display constraints (`src/logic/__tests__/yenlui.property.test.ts`)
    - **Property 5: Correct State Label Display** — For any valid state, exactly one label from {"Light", "Balanced", "Dark", "Unset"} is displayed
    - **Property 11: Description Length Constraint** — All active state descriptions are ≤ 120 characters
    - **Validates: Requirements 4.1, 4.4**

  - [x] 2.10 Write unit tests for Yenlui logic edge cases (`src/logic/__tests__/yenlui.test.ts`)
    - Test `normalizeYenluiState` with `null`, `undefined`, numbers, empty string
    - Test `isYenluiVisible` with non-Elf species, missing houseRules field
    - Test `getYenluiDifficulty` with undefined state, "Sanctuary of the Mind" at level 2
    - Test `getYenluiTalentNotes` with no talents, with "Sanctuary of the Mind" at level 1 and 2 (no note)
    - _Requirements: 1.5, 3.2, 6.3, 8.4_

- [x] 3. Checkpoint - Ensure logic module and property tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement YenluiPanel UI component
  - [x] 4.1 Create `src/components/shared/YenluiPanel.tsx` and `src/components/shared/YenluiPanel.module.css`
    - Accept `character` and `updateCharacter` props (same pattern as `DeitySelector`)
    - Call `isYenluiVisible()` internally — render `null` if not visible
    - Use existing `Card` component for container with consistent padding and borders
    - Display current state with label and visual indicator (icon + text, not colour alone)
    - Show roleplaying description (≤120 chars) for active states; omit for Unset
    - Show -30 warning indicator when state is "Dark"
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.2_

  - [x] 4.2 Add state toggle controls to YenluiPanel
    - Provide 4 toggle buttons: Unset, Light, Balanced, Dark
    - Selecting a new state updates `yenluiState` via `updateCharacter` immediately (no confirmation dialog)
    - Selecting the already-active state is a no-op (no store update)
    - Set `yenluiState` to `undefined` when Unset is selected
    - Ensure buttons have `aria-label` for each state and ≥ 44×44 CSS px touch targets on mobile
    - Ensure keyboard operability (tab/enter/space)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 9.5_

  - [x] 4.3 Add collapsible reference section to YenluiPanel
    - Add "Influencing Factors" section with two independently collapsible sub-lists: "Dark Influences" and "Light Influences"
    - Default both sub-lists to collapsed state on first render
    - Toggling one sub-list does not affect the other's collapse state
    - Dark Influences: acts of cruelty, extreme indulgence, gaining a Corruption point
    - Light Influences: exceptional kindness, abstaining from pleasure, meditation at Cadai shrine or with Wayshard
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 4.4 Add talent integration notes section to YenluiPanel
    - Call `getYenluiTalentNotes(character)` to get qualifying talent notes
    - Render talent notes list when at least one qualifying talent is present
    - Omit section entirely when no qualifying talents exist
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 5. Integrate YenluiPanel into CharacterPage and SettingsPage
  - [x] 5.1 Add useYenlui toggle to SettingsPage (`src/components/pages/SettingsPage.tsx`)
    - Add toggle row in House Rules section following existing `toggleRow` pattern
    - Label: "Yenlui Balance (High Elf)"
    - Description: "Track Elven spiritual balance (High Elf Player's Guide)"
    - Toggle calls `update('houseRules.useYenlui', !character.houseRules.useYenlui)`
    - _Requirements: 2.2, 2.3_

  - [x] 5.2 Place YenluiPanel on CharacterPage (`src/components/pages/CharacterPage.tsx`)
    - Import and render `YenluiPanel` in the identity tab section
    - Position after DeitySelector and before Characteristics card
    - Pass `character` and `updateCharacter` props
    - _Requirements: 9.1, 9.4_

  - [x] 5.3 Integrate sword-dancing difficulty into technique list display
    - Call `getYenluiDifficulty(character)` and display effective difficulty label and modifier adjacent to each learned technique entry
    - Only display difficulty indicator when character has learned techniques
    - _Requirements: 6.4, 6.5_

- [x] 6. Checkpoint - Ensure UI renders correctly and integration works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Write UI and integration tests
  - [x] 7.1 Write property test for serialization round-trip (`src/logic/__tests__/yenlui.property.test.ts`)
    - **Property 1: Serialization Round-Trip** — Serializing a character with any valid `yenluiState` to JSON and deserializing produces the same value
    - **Validates: Requirements 1.3, 1.4**

  - [x] 7.2 Write property tests for state transition and idempotence (`src/logic/__tests__/yenlui.property.test.ts`)
    - **Property 6: State Transition Correctness** — Selecting a different target state updates the stored value
    - **Property 7: Same-State Idempotence** — Selecting the already-active state does not trigger a store update
    - **Validates: Requirements 5.2, 5.3**

  - [x] 7.3 Write property test for independent collapse toggle (`src/components/shared/__tests__/YenluiPanel.property.test.tsx`)
    - **Property 9: Independent Collapse Toggle** — Toggling one reference sub-list does not affect the other
    - **Validates: Requirements 7.4**

  - [x] 7.4 Write unit tests for YenluiPanel rendering (`src/components/shared/__tests__/YenluiPanel.test.tsx`)
    - Test panel renders null when `useYenlui` is false
    - Test panel renders null for non-Elf species
    - Test panel shows correct label for each state value
    - Test Dark state shows -30 warning indicator
    - Test Unset state omits description area
    - Test reference section defaults to collapsed
    - Test talent notes show correct text for qualifying talents
    - Test "Sanctuary of the Mind" below level 3 shows no note
    - Test all state buttons have accessible labels
    - Test touch targets ≥ 44×44 px at mobile viewport
    - _Requirements: 2.4, 2.5, 3.2, 4.1, 4.2, 4.3, 4.5, 5.6, 7.2, 8.4, 9.5_

  - [x] 7.5 Write integration tests for character lifecycle (`src/components/shared/__tests__/YenluiPanel.integration.test.tsx`)
    - Test full save/load cycle preserves `yenluiState`
    - Test toggling house rule on/off verifies panel visibility without clearing state
    - Test switching species hides/shows panel without clearing state
    - _Requirements: 1.3, 1.4, 2.6, 3.3, 3.4_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific edge cases and UI interactions
- The implementation follows existing patterns from `DeitySelector` (panel), `CorruptionCard` (shared component), and `endeavours.ts` (species logic)
- fast-check v4.8.0 is already available in devDependencies
- All logic functions are pure and side-effect-free for easy testability
- CSS modules follow existing naming convention (`ComponentName.module.css`)
- No data migration needed — optional fields with `undefined` default gracefully

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "2.5", "2.6", "2.7", "2.8", "2.9", "2.10"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "4.4"] },
    { "id": 6, "tasks": ["5.1", "5.2"] },
    { "id": 7, "tasks": ["5.3"] },
    { "id": 8, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5"] }
  ]
}
```
