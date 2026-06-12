# Implementation Plan: Print Layout Redesign

## Overview

Refactor the existing `PrintLayout` component to produce a complete WFRP 4e printable character record with conditional section rendering, correct skill/wound calculations, companion and ammo sections, improved page-break handling, and enhanced thematic decorations. The implementation extends the current component with internal render helpers while keeping props and interfaces unchanged.

## Tasks

- [x] 1. Refactor page structure and CSS page-break strategy
  - [x] 1.1 Update PrintLayout.module.css with improved page-break rules and conditional page class
    - Add `break-inside: avoid` and `page-break-inside: avoid` to `.sectionBox` and `.tbl tr`
    - Add `.conditionalPage` class with `page-break-before: auto`
    - Add `@page` rule with `size: A4` and `margin: 1cm`
    - Ensure `.page` uses `width: 190mm` for proper A4 content width
    - Verify base font size is 9px (between 8-10px range)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 1.2 Restructure PrintLayout.tsx page containers for logical page boundaries
    - Ensure page 1 div uses `.pageBreak` class (forced break after)
    - Ensure page 2 div uses `.pageSheet` class (no forced break)
    - Add a third container div with `.conditionalPage` class for overflow sections (spells, companions, ammo, mutations)
    - Move spells, companions, ammo, and mutations rendering into the conditional page container
    - _Requirements: 2.1, 2.2, 3.2, 3.5_

- [x] 2. Fix skill total calculation and add conditions display
  - [x] 2.1 Correct skill total calculation to use full characteristic value
    - Change skill total from `getBonus(cv.i + cv.a + cv.b) + s.a` to `(cv.i + cv.a + cv.b) + s.a`
    - This matches WFRP 4e rules: skill total = full characteristic + skill advances
    - Update both basic skills and advanced skills rendering
    - When advances are zero, still display the base characteristic value as total
    - _Requirements: 5.1, 5.3, 5.4_

  - [x] 2.2 Write property test for skill total calculation correctness
    - **Property 3: Skill total calculation correctness**
    - **Validates: Requirements 5.3, 5.4**

  - [x] 2.3 Implement conditions rendering section
    - Add `renderConditions()` helper function inside PrintLayout.tsx
    - Only render when `character.conditions.some(c => c.level > 0)`
    - Display each condition with name and current stack level
    - Place conditions section within page 2 combat area
    - _Requirements: 6.6, 1.1_

- [x] 3. Implement conditional section render helpers
  - [x] 3.1 Implement renderCompanions() helper function
    - Render companion stat blocks with name, species, all characteristics (M, WS, BS, S, T, I, Ag, Dex, Int, WP, Fel), wounds, traits, and trained skills
    - Only render when `character.companions.length > 0`
    - Return `null` when no companions exist
    - _Requirements: 1.5, 8.2_

  - [x] 3.2 Write property test for companion stat block completeness
    - **Property 7: Companion stat block completeness**
    - **Validates: Requirements 1.5**

  - [x] 3.3 Implement renderAmmo() helper function
    - Display each ammo item with name, quantity, and qualities
    - Only render when `character.ammo.length > 0`
    - Return `null` when no ammo items exist
    - _Requirements: 8.4_

  - [x] 3.4 Implement renderMutations() helper function
    - Display each mutation with type (physical/mental), name, and effect
    - Only render when `character.mutations.length > 0`
    - Return `null` when no mutations exist
    - _Requirements: 1.4_

  - [x] 3.5 Write property test for conditional section omission
    - **Property 1: Conditional sections are omitted when data is empty**
    - **Validates: Requirements 1.3, 1.4, 8.2**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement wound breakdown display and non-essential content exclusion
  - [x] 5.1 Enhance wound breakdown display
    - Ensure wound section shows SB, TB×2, WPB, and Hardy components with labels
    - Verify the calculation uses `getBonus()` (tens digit) correctly for each component
    - Display total wounds prominently with bold/larger styling
    - _Requirements: 6.4, 6.5_

  - [x] 5.2 Write property test for wound breakdown calculation correctness
    - **Property 4: Wound breakdown calculation correctness**
    - **Validates: Requirements 6.4, 6.5**

  - [x] 5.3 Verify non-essential content exclusion
    - Ensure PrintLayout does NOT render: advancement log, session history, house rules, XP totals, combat state metadata, estate ledger entries, endeavour records, or character portrait
    - Remove any existing rendering of these items if present
    - Confirm estate section only shows name, location, treasury, and income (no ledger)
    - _Requirements: 1.2_

  - [x] 5.4 Write property test for non-essential content exclusion
    - **Property 2: Non-essential content is excluded from print output**
    - **Validates: Requirements 1.2**

- [x] 6. Ensure weapon and spell fields completeness
  - [x] 6.1 Verify weapon row renders all required fields
    - Each weapon row must display: name, group, encumbrance, range/reach, damage, and qualities
    - Verify fallback logic: `w.rangeReach || w.maxR || ''`
    - _Requirements: 6.1_

  - [x] 6.2 Write property test for weapon fields completeness
    - **Property 5: Weapon fields completeness**
    - **Validates: Requirements 6.1**

  - [x] 6.3 Verify spell section renders all required fields when present
    - Each spell must display: name, casting number, range, target, duration, and effect
    - Section only appears when `character.spells.length > 0`
    - _Requirements: 8.1_

  - [x] 6.4 Write property test for spell fields completeness when present
    - **Property 6: Spell fields completeness when present**
    - **Validates: Requirements 8.1**

- [x] 7. Ensure no interactive elements and add Character generator for tests
  - [x] 7.1 Audit and remove any interactive elements from PrintLayout
    - Ensure no `<button>`, `<input>`, `<select>`, `<textarea>`, or `contenteditable` attributes exist in the rendered output
    - All data must be static text representations
    - _Requirements: 9.3, 9.4_

  - [x] 7.2 Write property test for no interactive elements
    - **Property 8: No interactive elements in print output**
    - **Validates: Requirements 9.3**

  - [x] 7.3 Create fast-check Character arbitrary generator for property tests
    - Create `src/components/layout/__tests__/printLayoutGenerators.ts`
    - Build `arbitraryCharacter()` that produces valid Character objects with randomized characteristics (i, a, b each 0-99), skills, weapons, armour, spells, ammo, companions, conditions, and mutations
    - Generator should produce arrays of random length (0-5 items) for collection fields
    - Ensure generated characters conform to the Character interface (version `_v: 6`)
    - _Requirements: All (testing infrastructure)_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `PrintLayout` component already renders most content — this redesign extends and corrects it
- No new props or interfaces are needed; all data comes from the existing `Character` type
- The fast-check Character generator (task 7.3) should be created early if property tests are being run, but is placed here to avoid blocking core implementation

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "7.3"] },
    { "id": 1, "tasks": ["1.2", "2.1", "2.3"] },
    { "id": 2, "tasks": ["2.2", "3.1", "3.3", "3.4"] },
    { "id": 3, "tasks": ["3.2", "3.5", "5.1", "5.3"] },
    { "id": 4, "tasks": ["5.2", "5.4", "6.1", "6.3"] },
    { "id": 5, "tasks": ["6.2", "6.4", "7.1"] },
    { "id": 6, "tasks": ["7.2"] }
  ]
}
```
