# Implementation Plan: Hirelings

## Overview

This plan implements the hireling NPC tracking system for the WFRP 4e PWA. Tasks are ordered so that data model foundations come first, followed by logic, then UI components, and finally integrations and migration. Each task builds on previous work, ending with full wiring and a final checkpoint.

## Tasks

- [x] 1. Data model and type definitions
  - [x] 1.1 Add Hireling interface and update Character type
    - Add `Hireling` interface to `src/types/character.ts` with all fields: id, name, role, status, characteristics (M, WS, BS, S, T, I, Ag, Dex, Int, WP, Fel, W, wCur), skills, talents, traits, trappings, template, physicalQuirk, workEthic, personalityQuirk, upkeep ({gc, ss, d}), conditions array, notes
    - Update `Character` interface: bump `_v` from `6` to `7`, add `hirelings: Hireling[]`
    - Update `BLANK_CHARACTER`: set `_v: 7`, add `hirelings: []`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 9.2, 9.3_

- [x] 2. Static data file
  - [x] 2.1 Create `src/data/hirelings.ts` with profiles, templates, and quirk tables
    - Define and export `HirelingProfile` interface and `HIRELING_PROFILES` array with 6 profiles (Seasoned Mercenary, Local Scout, Lawyer, Porter, Doktor, Scribe) including full characteristics, skills, talents, traits, trappings, status
    - Define and export `HirelingTemplate` interface and `HIRELING_TEMPLATES` array with 7 entries (None + 6 templates) including name, description, modifiers text, additionalSkills, additionalTalents, additionalTrappings
    - Export `PHYSICAL_QUIRKS: string[]` (100 entries), `WORK_ETHICS: string[]` (100 entries), `PERSONALITY_QUIRKS: string[]` (100 entries) d100 tables
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 2.2 Write unit tests for static data validation
    - Verify `HIRELING_PROFILES` has 6 entries with correct names and all required fields
    - Verify `HIRELING_TEMPLATES` has 7 entries including "None"
    - Verify each quirk table has exactly 100 entries
    - Test file in `src/data/__tests__/hirelings.test.ts`
    - _Requirements: 10.3, 10.5, 10.6_

- [x] 3. Logic functions
  - [x] 3.1 Create `src/logic/hirelings.ts` with pure utility functions
    - Implement `computeHirelingUpkeep(hirelings: Hireling[]): { gc: number; ss: number; d: number }` — sums upkeep fields across all hirelings, treats missing/zero as excluded
    - Implement `generateHirelingId(): number` — timestamp + random offset for unique IDs
    - Implement `rollRandomQuirk(table: string[]): string` — returns random entry from a d100 table array
    - Implement `isIncapacitated(hireling: Hireling): boolean` — returns true iff `wCur <= 0`
    - Implement `clampWounds(wCur: number, maxW: number): number` — clamps to `[0, maxW]`
    - Implement `createHirelingFromProfile(profile: HirelingProfile): Hireling` — maps profile data to a new Hireling with generated ID and default empty fields for quirks/template/notes/conditions
    - Implement `createBlankHireling(): Hireling` — all zeros/empty strings with generated ID
    - _Requirements: 1.3, 2.3, 2.4, 4.2, 5.2, 5.4, 5.5, 6.3, 6.6_

  - [x] 3.2 Write property tests for hireling logic (`src/logic/__tests__/hirelings.property.test.ts`)
    - **Property 7: Total upkeep is correct sum** — For any array of hirelings, `computeHirelingUpkeep` returns gc/ss/d equal to the sum of corresponding fields across all hirelings' upkeep objects
    - **Validates: Requirements 5.2, 5.4**

  - [x] 3.3 Write property test: quirk output validity
    - **Property 6: Random quirk output is a valid table entry** — For any invocation of `rollRandomQuirk`, the returned string is a member of the given table array
    - **Validates: Requirements 4.2**

  - [x] 3.4 Write property test: wound clamping
    - **Property 9: Wound increment/decrement respects bounds** — For any wCur and W, `clampWounds(wCur + 1, W) <= W` and `clampWounds(wCur - 1, W) >= 0`
    - **Validates: Requirements 6.3**

  - [x] 3.5 Write property test: incapacitated iff wounds zero
    - **Property 10: Incapacitated state iff wounds are zero** — `isIncapacitated(h)` returns true iff `h.wCur <= 0`
    - **Validates: Requirements 6.6**

  - [x] 3.6 Write property test: profile creation populates characteristics
    - **Property 4: Profile creation populates correct characteristics** — For any HirelingProfile, `createHirelingFromProfile(profile)` produces a hireling whose M, WS, BS, S, T, I, Ag, Dex, Int, WP, Fel, W match the profile
    - **Validates: Requirements 2.3**

  - [x] 3.7 Write property test: template does not modify characteristics
    - **Property 5: Template selection does not modify characteristics** — Setting the template field on any hireling does not change stored characteristic values
    - **Validates: Requirements 3.4**

  - [x] 3.8 Write property test: unique IDs
    - **Property 2: Hireling IDs are unique** — For any sequence of hireling additions, all IDs in the resulting array are pairwise distinct
    - **Validates: Requirements 1.3**

  - [x] 3.9 Write property test: serialization round-trip
    - **Property 1: Hireling serialization round-trip** — For any valid Hireling, `JSON.parse(JSON.stringify(h))` produces an object with identical field values
    - **Validates: Requirements 1.2, 1.4**

  - [x] 3.10 Write property test: max hireling count
    - **Property 3: Maximum hireling count invariant** — The hirelings array never exceeds 10 entries after any sequence of add operations
    - **Validates: Requirements 1.5**

- [x] 4. Checkpoint - Core data and logic
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Navigation and Retinue page shell
  - [x] 5.1 Update Navigation to include Retinue page
    - Add `'retinue'` to the `PageSection` union type in `src/components/layout/Navigation.tsx`
    - Add nav item `{ id: 'retinue', label: 'Retinue', icon: Users, shortcut: '3' }` to `NAV_ITEMS` array, shift existing shortcuts (estate→4, endeavours→5, advancement→6, settings→7)
    - Update `App.tsx` to import and render `RetinuePage` for the `'retinue'` case in `renderPage()`
    - _Requirements: 7.1_

  - [x] 5.2 Create RetinuePage component shell
    - Create `src/components/pages/RetinuePage.tsx` and `RetinuePage.module.css`
    - Implement sub-tab bar with "Hirelings" and "Animal Companions" tabs (hirelings active by default)
    - Pass `character`, `update`, `updateCharacter` props following existing page patterns
    - Display empty state message when no hirelings: "No hirelings yet. Hire followers from the Up in Arms profiles or create custom NPCs."
    - Display "Add Hireling" button (disabled when at 10 max)
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.7, 1.5_

- [x] 6. Hireling card component
  - [x] 6.1 Create HirelingCard component
    - Create `src/components/retinue/HirelingCard.tsx` and `HirelingCard.module.css`
    - Collapsed state: name, role, status badge, current/max wounds
    - Expanded state: full characteristic grid (M, WS, BS, S, T, I, Ag, Dex, Int, WP, Fel, W), skills, talents, traits, trappings, template display, quirks section, upkeep fields (GC/SS/D), conditions list, notes textarea
    - All fields editable in-place using `EditableField` pattern
    - Wound tracker with +/- buttons using `clampWounds`
    - Delete button with `ConfirmDialog` before removal
    - Template name displayed on card
    - Quirks displayed in visually distinct section
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 3.5, 4.1, 4.4, 7.6_

- [x] 7. Hireling creation flow
  - [x] 7.1 Create HirelingCreationFlow component
    - Create `src/components/retinue/HirelingCreationFlow.tsx` and `HirelingCreationFlow.module.css`
    - Step 1: Choose between pre-defined profile (Picker with 6 profiles) or "Custom (Blank)"
    - Step 2: Template selection (Picker with 7 options including None)
    - Step 3: "Roll Random Quirks" button that calls `rollRandomQuirk` for each of the 3 tables; display results with option to re-roll or edit
    - On confirm: call `createHirelingFromProfile` or `createBlankHireling`, apply template name, apply quirks, add to `character.hirelings` via `updateCharacter`
    - Enforce max 10 hirelings — reject addition if at limit
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 4.2, 4.3, 1.5_

- [x] 8. Companion section relocation
  - [x] 8.1 Move companion UI from Character page to Retinue page
    - Add "Animal Companions" sub-tab content in `RetinuePage.tsx` rendering existing companion cards from `character.companions`
    - Replicate companion add/edit/delete functionality (name, species, characteristics, wounds, traits, trained skills, pack animal toggle, notes)
    - Remove the "Animal Companions" section from `CharacterPage.tsx` (or the notes tab where it currently lives)
    - _Requirements: 7.4, 7.8_

- [x] 9. Checkpoint - UI components complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Estate integration
  - [x] 10.1 Integrate hireling upkeep into estate financial summary
    - Update `computeFinancialSummary` in `EstatePage.tsx` to accept `hirelings` parameter (or the full `Character`) and add `computeHirelingUpkeep(character.hirelings)` to `totalExpenses`
    - Display "Hireling Upkeep" as a line item in the monthly financial summary card
    - Update `collectMonth` to subtract hireling upkeep from treasury alongside existing expenses
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

  - [x] 10.2 Write property test: treasury deduction includes hireling upkeep
    - **Property 8: Treasury deduction includes hireling upkeep** — For any estate + hirelings, collect month reduces treasury by sum of all monthly expenses + property expenses + hireling upkeep
    - **Validates: Requirements 5.3**

- [x] 11. Combat integration
  - [x] 11.1 Create HirelingCombatPanel component
    - Create `src/components/retinue/HirelingCombatPanel.tsx` and `HirelingCombatPanel.module.css`
    - Collapsible "Hirelings" section showing each hireling: name, current/max wounds, active conditions
    - +/- wound controls persisting to character data
    - Add/remove condition controls (reuse existing condition list/picker)
    - Visual incapacitated indicator when `wCur <= 0` (greyed-out styling)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 11.2 Wire HirelingCombatPanel into CombatPage
    - Import and render `HirelingCombatPanel` in `CombatPage.tsx`
    - Pass hirelings array and update callbacks from character state
    - Only render section when `character.hirelings.length > 0`
    - _Requirements: 6.1, 6.2_

- [x] 12. Migration update
  - [x] 12.1 Update migration for v6→v7 compatibility
    - Update `migration.ts` to handle loading v6 characters: the existing `deepMerge` with updated `BLANK_CHARACTER` (now v7 with `hirelings: []`) automatically fills missing field
    - Update legacy migration paths to set `_v: 7` instead of `_v: 6`
    - Add defensive `character.hirelings || []` in any code that reads hirelings from potentially-old data
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 12.2 Write property test: migration defaults
    - **Property 11: Migration defaults missing hirelings to empty array** — For any character object without a `hirelings` field, deep-merging with BLANK_CHARACTER yields `hirelings` as `[]`
    - **Validates: Requirements 9.1, 9.4**

- [x] 13. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout; all implementations use TypeScript with CSS Modules for styling
- Static data in `src/data/hirelings.ts` follows existing patterns (`animals.ts`, `careers.ts`)
- Logic in `src/logic/hirelings.ts` exports pure functions for testability

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "3.10"] },
    { "id": 3, "tasks": ["5.1", "5.2"] },
    { "id": 4, "tasks": ["6.1", "7.1", "8.1"] },
    { "id": 5, "tasks": ["10.1", "11.1"] },
    { "id": 6, "tasks": ["10.2", "11.2", "12.1"] },
    { "id": 7, "tasks": ["12.2"] }
  ]
}
```
