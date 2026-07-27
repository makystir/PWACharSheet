# Implementation Plan: Spell Picker Improvements

## Overview

Replace the generic flat-list `Picker` usage for spell selection with a dedicated `SpellPicker` component featuring lore-based grouping, filter tabs, text search, inline detail preview, character lore relevance pre-selection, and already-known spell indication. Implementation follows a data-first approach: add the lore field to the type and data, build pure logic utilities, then implement the UI component and integrate it into existing pages.

## Tasks

- [x] 1. Add lore classification to spell data layer
  - [x] 1.1 Add `lore` field to `SpellData` interface in `src/types/character.ts`
    - Add `lore: string` to the existing `SpellData` interface
    - _Requirements: 1.1_

  - [x] 1.2 Define canonical lore categories constant in `src/data/spells.ts`
    - Export a `LORE_CATEGORIES` array with all 26 valid lore category strings
    - Export a `LORE_DISPLAY_ORDER` array with the canonical display ordering
    - _Requirements: 1.3_

  - [x] 1.3 Add `lore` field to every spell entry in `SPELL_LIST`
    - Tag each spell in `src/data/spells.ts` with its correct lore string based on the existing comment groupings in the file
    - Ensure all entries use exact strings from `LORE_CATEGORIES`
    - _Requirements: 1.2, 1.3_

- [x] 2. Implement pure logic utilities
  - [x] 2.1 Create `src/logic/spell-picker-utils.ts` with core filter and grouping functions
    - Implement `deriveCharacterLore(talents)` — extract lore from talent patterns
    - Implement `filterByLore(spells, lore)` — filter spells by lore category (null = all)
    - Implement `searchSpells(spells, query)` — case-insensitive name substring match
    - Implement `filterSpells(spells, lore, query)` — compose lore filter + text search
    - Implement `groupByLore(spells)` — group spells by lore preserving `LORE_DISPLAY_ORDER`
    - Implement `getAvailableLores(spells)` — return unique lore values present in given spells
    - _Requirements: 2.1, 2.3, 2.4, 3.2, 3.3, 3.4, 4.2, 4.3, 5.1, 5.5_

  - [x] 2.2 Write property test: Every spell has a valid lore category
    - **Property 1: Every spell has a valid lore category**
    - Test that every entry in SPELL_LIST has a non-empty lore field that is a member of LORE_CATEGORIES
    - Create test file at `src/logic/__tests__/spell-picker-utils.property.test.ts`
    - **Validates: Requirements 1.2, 1.3**

  - [x] 2.3 Write property test: Group assignment correctness
    - **Property 2: Group assignment correctness**
    - For any list of spells, groupByLore produces groups where every spell's lore matches the group label, and total count equals input length
    - **Validates: Requirements 2.1, 2.3**

  - [x] 2.4 Write property test: Group ordering preserves canonical order
    - **Property 3: Group ordering preserves canonical order**
    - For any subset of spells, groupByLore produces group labels in the same relative order as LORE_DISPLAY_ORDER
    - **Validates: Requirements 2.4**

  - [x] 2.5 Write property test: Lore filter returns only matching spells
    - **Property 4: Lore filter returns only matching spells**
    - filterByLore(spells, lore) returns only spells whose lore matches; null returns all spells unchanged
    - **Validates: Requirements 3.2, 3.3**

  - [x] 2.6 Write property test: Available lores matches unique lores in data
    - **Property 5: Available lores matches unique lores in data**
    - getAvailableLores returns exactly the set of unique lore values in the input
    - **Validates: Requirements 3.4**

  - [x] 2.7 Write property test: Text search filters by case-insensitive name match
    - **Property 6: Text search filters by case-insensitive name match**
    - searchSpells returns exactly those spells whose name.toLowerCase() contains query.toLowerCase(); empty query returns all
    - **Validates: Requirements 4.2, 4.4**

  - [x] 2.8 Write property test: Filter composition is equivalent to sequential application
    - **Property 7: Filter composition is equivalent to sequential application**
    - filterSpells(spells, lore, query) produces same result as searchSpells(filterByLore(spells, lore), query)
    - **Validates: Requirements 4.3**

  - [x] 2.9 Write property test: Lore derivation from talents
    - **Property 8: Lore derivation from talents**
    - deriveCharacterLore returns non-null if and only if a talent matches known lore-granting patterns; otherwise returns null
    - **Validates: Requirements 5.1, 5.4, 5.5**

  - [x] 2.10 Write property test: Known spells are never excluded from filtered results
    - **Property 9: Known spells are never excluded from filtered results**
    - filterSpells output is independent of which spells are in the known set
    - **Validates: Requirements 8.1, 8.3**

  - [x] 2.11 Write unit tests for spell-picker-utils
    - Create `src/logic/__tests__/spell-picker-utils.test.ts`
    - Test specific examples for deriveCharacterLore: "Arcane Magic (Fire)" → "Lore of Fire", "Petty Magic" → "Petty", "Invoke (Morr)" → "Miracles of Morr"
    - Test edge case: talent "Arcane Magic" without parenthetical → null
    - Test filterByLore with specific lore values and null
    - Test searchSpells with empty string, partial matches, and no matches
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 3.2, 4.2_

- [x] 3. Checkpoint - Ensure data layer and logic are correct
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Build the SpellPicker UI component
  - [x] 4.1 Create `src/components/shared/SpellPicker.module.css`
    - Full-viewport modal on mobile (< 768px)
    - Horizontally-scrollable lore filter tabs with momentum scrolling (-webkit-overflow-scrolling: touch)
    - Sticky group headers
    - Expandable spell detail rows with transition
    - Already-known spell styling (muted opacity + checkmark icon)
    - Minimum 44px tap targets for list items and tabs
    - Sticky search input at top of modal
    - Body scroll lock when modal is open
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 4.2 Create `src/components/shared/SpellPicker.tsx`
    - Implement SpellPickerProps interface (spells, characterTalents, knownSpellNames, onSelect, onClose, title)
    - On mount, call deriveCharacterLore to pre-select relevant lore tab
    - Render lore filter tabs from getAvailableLores, with "All" tab first
    - Render search input field with controlled state
    - Use filterSpells to compute displayed spells from activeLore + searchText
    - Render spells grouped by lore with sticky group headers (when on "All" tab)
    - Implement expandable spell detail (tap to expand, tap again or "Select" button to confirm)
    - Mark already-known spells with visual indicator and prevent onSelect for them
    - Show "No spells found" empty state when filter results are empty
    - Prevent background scrolling when modal is open
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3_

  - [x] 4.3 Write unit tests for SpellPicker component
    - Create `src/components/shared/__tests__/SpellPicker.test.tsx`
    - Test: picker opens with lore tabs visible
    - Test: clicking a tab shows only matching spells
    - Test: expanding a spell shows detail fields (range, target, duration, effect)
    - Test: already-known spells display with disabled styling
    - Test: tapping known spell does not fire onSelect
    - Test: search input filters displayed spells
    - Test: empty results show "No spells found" message
    - Test: pre-selects correct lore tab based on character talents
    - _Requirements: 3.1, 3.2, 4.2, 5.1, 7.2, 8.1, 8.2_

- [x] 5. Checkpoint - Ensure SpellPicker component renders correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Integrate SpellPicker into existing pages
  - [x] 6.1 Replace generic Picker with SpellPicker in `src/components/pages/CharacterPage.tsx`
    - Import SpellPicker instead of using generic Picker for spell selection
    - Pass SPELL_LIST, character talents, and set of already-known spell names as props
    - Wire onSelect to existing addSpellFromPicker handler
    - Wire onClose to existing setShowSpellPicker(false) handler
    - _Requirements: 5.1, 5.2, 8.1, 8.2_

  - [x] 6.2 Replace generic Picker with SpellPicker in `src/components/pages/AdvancementPage.tsx`
    - Import SpellPicker instead of using generic Picker for spell learning
    - Pass SPELL_LIST, character talents, and set of already-known spell names as props
    - Wire onSelect to existing handleLearnSpell handler
    - Wire onClose to existing close handler
    - Remove the inline SPELL_LIST.filter logic (already-known handling is now in SpellPicker)
    - _Requirements: 5.1, 5.2, 8.1, 8.2_

  - [x] 6.3 Write integration tests for SpellPicker in page context
    - Test: mobile viewport renders full-height modal with 44px tap targets
    - Test: character with "Arcane Magic (Fire)" opens picker to "Lore of Fire" tab
    - Test: body overflow is hidden when picker is open
    - _Requirements: 5.2, 6.1, 6.2, 6.5_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses Vitest + fast-check for testing (already configured)
- CSS Modules are used throughout for styling consistency
- The generic `Picker` component remains unchanged for other use cases (talents, trappings, careers)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9", "2.10", "2.11"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["4.2"] },
    { "id": 6, "tasks": ["4.3", "6.1", "6.2"] },
    { "id": 7, "tasks": ["6.3"] }
  ]
}
```
