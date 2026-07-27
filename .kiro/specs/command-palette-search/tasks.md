# Implementation Plan: Command Palette Search

## Overview

Implement a global command palette providing instant fuzzy search across all WFRP 4e game entities (spells, talents, skills, careers, runes, rituals, conditions). The palette is triggered via Ctrl/Cmd+K or a header button, renders as a modal overlay with grouped/ranked results, and supports detail views, keyboard navigation, and full accessibility — all client-side with no network requests.

## Tasks

- [x] 1. Set up command palette infrastructure
  - [x] 1.1 Create search index types and builder
    - Create `src/components/command-palette/searchIndex.ts` with `SearchableEntity`, `EntityType`, `EntityDisplayData` and all type-specific display data interfaces
    - Implement `buildSearchIndex()` function that maps all data sources (spells.ts, talents.ts, advanced-skills.ts, skill-descriptions.ts, careers.ts, runes.ts, rituals.ts, conditions.ts) into `SearchableEntity[]`
    - Each entity gets a pre-computed lowercase `searchText` field (name + description concatenated)
    - Handle missing/undefined fields gracefully (treat as empty strings)
    - _Requirements: 5.1, 10.1, 10.2, 12.1, 12.4_

  - [x] 1.2 Implement fuzzy match algorithm
    - Create `src/components/command-palette/fuzzyMatch.ts`
    - Implement subsequence matching: query characters must appear in order within target
    - Score based on consecutive matches, word-boundary bonuses, and prefix bonuses
    - Name field gets 2x score multiplier over description field
    - Return `null` for no match, or `{ score, ranges }` for matches
    - Truncate queries longer than 200 characters
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 12.3_

  - [x] 1.3 Implement search execution function
    - Create `searchEntities()` in `src/components/command-palette/searchIndex.ts`
    - Score all index entries against the query, filter nulls, sort by score descending
    - Cap at 50 total results
    - Group results by entity type with a fixed group order (spells, talents, skills, careers, runes, rituals, conditions)
    - Return `GroupedResults` with groups and totalCount
    - _Requirements: 6.1, 6.2, 6.3, 4.3_

  - [x] 1.4 Write property tests for search index completeness (Property 1)
    - **Property 1: Search index completeness**
    - Verify every entity in static data sources appears in the built index with matching name and correct type
    - **Validates: Requirements 5.1, 10.1**

  - [x] 1.5 Write property tests for fuzzy match (Properties 2, 3, 4)
    - **Property 2: Name prefix match guarantee** — any prefix of an entity name returns that entity
    - **Property 3: Description search returns entity** — a 4+ char word from description returns the entity
    - **Property 4: Fuzzy tolerance for character omission** — name minus one char still returns the entity
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**

  - [x] 1.6 Write property tests for result grouping and ranking (Properties 5, 6, 7)
    - **Property 5: Results grouped by correct entity type** — every result in a group matches the group type
    - **Property 6: Results ranked in descending score order** — scores are monotonically non-increasing within each group
    - **Property 7: Result count cap** — total results never exceed 50
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement command palette context and activation
  - [x] 3.1 Create CommandPaletteProvider context
    - Create `src/components/command-palette/CommandPaletteContext.tsx`
    - Implement `CommandPaletteContextValue` with `isOpen`, `open`, `close`, `toggle`
    - Export `CommandPaletteProvider` component and `useCommandPaletteContext` hook
    - Mount the provider in `App.tsx` wrapping the app content
    - _Requirements: 1.1, 1.2, 2.2, 3.1, 3.2_

  - [x] 3.2 Implement useCommandPalette keyboard shortcut hook
    - Create `src/components/command-palette/useCommandPalette.ts`
    - Register global keydown listener for Ctrl+K (Windows/Linux) and Cmd+K (macOS)
    - Call `toggle()` from context on shortcut press
    - Prevent default browser behavior for the key combination
    - Override even when focus is in input/textarea/select elements
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.3 Add search button to Navigation header
    - Add a lucide-react `Search` icon button to the Navigation component header area
    - Button calls `open()` from CommandPaletteContext on click
    - Include `aria-label="Search game reference"`
    - Visible on both mobile and desktop layouts
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Build command palette modal UI
  - [x] 4.1 Create CommandPalette modal component
    - Create `src/components/command-palette/CommandPalette.tsx` rendered via React portal to `document.body`
    - Implement internal state machine with `useReducer`: closed → results list → detail view
    - Track `query`, `selectedIndex`, `selectedEntity`, `scrollPosition`
    - Use `role="dialog"` with `aria-modal="true"` and `aria-label`
    - Implement backdrop overlay that closes palette on click
    - Implement focus trap within the modal
    - Auto-focus search input on open, restore focus on close
    - Clear search input and results on close
    - Create `src/components/command-palette/CommandPalette.module.css` with CSS Modules styling
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.4, 8.1, 8.2, 11.1, 11.2_

  - [x] 4.2 Implement SearchInput component
    - Create `src/components/command-palette/SearchInput.tsx`
    - Accept `value`, `onChange`, `inputRef` props
    - Display placeholder: "Search spells, talents, skills, careers..."
    - Wire `aria-controls` referencing the results listbox
    - Wire `aria-activedescendant` referencing highlighted option
    - Minimum touch target height of 44px
    - _Requirements: 4.1, 4.2, 8.3, 11.5_

  - [x] 4.3 Implement ResultsList and ResultCard components
    - Create `src/components/command-palette/ResultsList.tsx` and `ResultCard.tsx`
    - `ResultsList` uses `role="listbox"` with grouped results rendered under type headings
    - Each `ResultCard` uses `role="option"` with `aria-selected` for highlighted item
    - Display entity name and type badge on every card
    - Show type-specific summary: CN+lore (spells), max (talents), characteristic (skills), class (careers), category (runes), stackable (conditions)
    - Minimum 44px touch target height per result card
    - _Requirements: 6.1, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 8.4, 11.3, 11.4_

  - [x] 4.4 Implement keyboard navigation
    - ArrowDown/ArrowUp to move `selectedIndex` through results, scrolling into view
    - Enter on focused ResultCard opens DetailView
    - Escape in results view closes palette
    - Escape/Backspace in detail view returns to results
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 4.5 Write property test for ResultCard display (Property 8)
    - **Property 8: ResultCard displays name, type badge, and type-specific summary**
    - Generate arbitrary SearchResultEntry, render ResultCard, assert name, type badge, and summary field present
    - **Validates: Requirements 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement detail views and mobile responsiveness
  - [x] 6.1 Create DetailView with entity-type-specific panels
    - Create `src/components/command-palette/DetailView.tsx`
    - Render full entity information based on type: SpellDetail, TalentDetail, SkillDetail, CareerDetail, RuneDetail, RitualDetail, ConditionDetail
    - Spell: name, CN, range, target, duration, effect, lore
    - Talent: name, max level, full description
    - Skill: name, linked characteristic
    - Career: name, class, four level titles with status/characteristics/skills/talents
    - Rune: name, category, master status, max per item, XP cost, effects, description
    - Ritual: name, CN, type, learning XP, ingredients, conditions, description
    - Condition: name, stackable status, description, effects, duration, removal method
    - Include back button; preserve search query and scroll position on return
    - Display "—" for missing/undefined fields
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

  - [x] 6.2 Apply mobile-responsive styling
    - At ≤767px viewport: full width, ≥90% viewport height
    - At >767px viewport: centered overlay, max-width 640px
    - Ensure results list remains scrollable when virtual keyboard is open
    - All touch targets minimum 44px
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 6.3 Write property test for DetailView fields (Property 9)
    - **Property 9: DetailView renders all required fields per entity type**
    - Generate arbitrary entities of each type, render DetailView, assert all required fields present
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8**

- [x] 7. Integration and wiring
  - [x] 7.1 Wire all components together and finalize
    - Ensure CommandPaletteProvider is mounted in App.tsx
    - Ensure useCommandPalette hook is active at app level
    - Verify search index is built at app initialization and passed to palette
    - Confirm the palette does not require a character to be loaded (works from WelcomeScreen too)
    - Verify close button is visible and functional
    - _Requirements: 10.3, 12.1, 12.2, 3.3_

  - [x] 7.2 Write unit tests for keyboard shortcut and dismissal
    - Test Ctrl+K / Cmd+K opens and closes palette
    - Test Escape closes palette and restores focus
    - Test backdrop click closes palette
    - Test focus auto-moves to input on open
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 4.1_

  - [x] 7.3 Write accessibility unit tests
    - Test role="dialog", aria-modal="true", aria-label on modal
    - Test role="listbox" on results, role="option" on cards
    - Test aria-selected on highlighted card
    - Test aria-controls and aria-activedescendant on search input
    - Test focus trapping within modal
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The search index uses static data imports only — no network requests, no character dependency
- All styling uses CSS Modules consistent with the existing project

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "3.1"] },
    { "id": 2, "tasks": ["1.3", "3.2", "3.3"] },
    { "id": 3, "tasks": ["1.4", "1.5"] },
    { "id": 4, "tasks": ["1.6", "4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3"] },
    { "id": 6, "tasks": ["4.4", "4.5"] },
    { "id": 7, "tasks": ["6.1", "6.2"] },
    { "id": 8, "tasks": ["6.3", "7.1"] },
    { "id": 9, "tasks": ["7.2", "7.3"] }
  ]
}
```
