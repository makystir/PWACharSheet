# Implementation Plan: Tier 1 Content Gaps

## Overview

This plan implements three isolated content gaps in order of complexity: (1) expand Warrior endeavours in the existing data record, (2) add the Group Advantage house rule toggle with combat display changes, and (3) add all Dwarf deity miracles to the spell database. Each slice extends existing patterns with no new components or pages needed. TypeScript with Vitest and fast-check are used for testing.

## Tasks

- [x] 1. Add Warrior Endeavours from Up in Arms
  - [x] 1.1 Expand the Warriors entry in `CLASS_ENDEAVOURS` in `src/logic/endeavours.ts`
    - Add "Drill", "Challenge", "Seek Patronage", "Establish Contacts", and "Tournament" to the existing Warriors array
    - Retain the existing "Combat Training" entry
    - Final array should contain all six entries: "Combat Training", "Drill", "Challenge", "Seek Patronage", "Establish Contacts", "Tournament"
    - _Requirements: 1.1, 1.2, 1.4_

  - [x] 1.2 Write unit tests for Warrior endeavours
    - Add tests in `src/logic/__tests__/endeavours.test.ts` (or a new describe block)
    - Verify CLASS_ENDEAVOURS['Warriors'] contains exactly 6 entries
    - Verify each expected endeavour name is present
    - Verify "Combat Training" was retained
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 2. Add Group Advantage house rule toggle
  - [x] 2.1 Add `useGroupAdvantage` field to `HouseRules` interface and `BLANK_CHARACTER`
    - Add `useGroupAdvantage: boolean` to the `HouseRules` interface in `src/types/character.ts`
    - Add `useGroupAdvantage: false` to the `houseRules` object in `BLANK_CHARACTER`
    - _Requirements: 2.1, 2.2, 2.6, 12.1, 12.4_

  - [x] 2.2 Add Group Advantage toggle to `src/components/pages/SettingsPage.tsx`
    - Add a new toggle item within the House Rules card after the Advantage Cap rule item
    - Use the existing `toggleRow` / `toggleBtnOn` / `toggleBtnOff` pattern
    - Label: "Group Advantage", description: "Party shares a single advantage pool (Up in Arms)"
    - Wire onClick to `update('houseRules.useGroupAdvantage', !character.houseRules.useGroupAdvantage)`
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 2.3 Update `CombatDashboard` to display "Group Advantage" label conditionally
    - Add `useGroupAdvantage?: boolean` to `CombatDashboardProps` in `src/components/combat/CombatDashboard.tsx`
    - Change the Advantage section label from hardcoded "Advantage" to `{useGroupAdvantage ? 'Group Advantage' : 'Advantage'}`
    - _Requirements: 3.1, 3.2_

  - [x] 2.4 Pass `useGroupAdvantage` prop from `CombatPage` to `CombatDashboard`
    - In `src/components/pages/CombatPage.tsx`, add `useGroupAdvantage={character.houseRules?.useGroupAdvantage ?? false}` to the CombatDashboard JSX
    - Use nullish coalescing for backward compatibility with saved data missing the field
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 12.1, 12.2_

  - [x] 2.5 Write property test for advantage cap enforcement (Property 1)
    - Create `src/logic/__tests__/combat.property.test.ts`
    - **Property 1: Advantage cap is universally enforced**
    - For any non-negative advantage value and any positive cap, `incrementAdvantage(value, cap)` must produce a result ≤ cap
    - Use `fc.integer({ min: 0, max: 1000 })` for value and `fc.integer({ min: 1, max: 99 })` for cap
    - Run at least 100 iterations
    - **Validates: Requirements 3.3**

  - [x] 2.6 Write property test for backward compatibility (Property 2)
    - Add to `src/logic/__tests__/combat.property.test.ts`
    - **Property 2: Missing useGroupAdvantage defaults to false**
    - For any partial HouseRules object missing `useGroupAdvantage`, resolving via `obj?.useGroupAdvantage ?? false` must return `false`
    - Use `fc.record` to generate arbitrary partial objects
    - Run at least 100 iterations
    - **Validates: Requirements 2.2, 12.1**

  - [x] 2.7 Write unit tests for Group Advantage display and toggle
    - Add tests to `src/components/combat/__tests__/` or `src/logic/__tests__/combat.test.ts`
    - Test CombatDashboard shows "Advantage" when useGroupAdvantage is false/undefined
    - Test CombatDashboard shows "Group Advantage" when useGroupAdvantage is true
    - Test that BLANK_CHARACTER.houseRules.useGroupAdvantage is false
    - _Requirements: 2.1, 3.1, 3.2_

- [x] 3. Checkpoint - Verify Warrior endeavours and Group Advantage
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add Dwarf Deity Miracles to spell database
  - [x] 4.1 Add Miracles of Grungni to `src/data/spells.ts`
    - Add a `// MIRACLES OF GRUNGNI` comment section header after the Myrmidia miracles
    - Extract all Miracles of Grungni from `dwarfguide.md` Chapter VI
    - Each entry must follow the SpellData format: name, cn (>"0"), range, target, duration, effect
    - Use concise effect descriptions consistent with existing spell entries
    - Normalize names to consistent title case with no artifacts
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 11.3, 11.4, 11.5_

  - [x] 4.2 Add Miracles of Valaya to `src/data/spells.ts`
    - Add a `// MIRACLES OF VALAYA` comment section header
    - Extract all Miracles of Valaya from `dwarfguide.md` Chapter VI
    - Each entry must follow the SpellData format with cn > "0"
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 11.3, 11.4, 11.5_

  - [x] 4.3 Add Miracles of Grimnir to `src/data/spells.ts`
    - Add a `// MIRACLES OF GRIMNIR` comment section header
    - Extract all Miracles of Grimnir from `dwarfguide.md` Chapter VI
    - Each entry must follow the SpellData format with cn > "0"
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 11.3, 11.4, 11.5_

  - [x] 4.4 Add Miracles of Gazul to `src/data/spells.ts`
    - Add a `// MIRACLES OF GAZUL` comment section header
    - Extract all Miracles of Gazul from `dwarfguide.md` Chapter VI
    - Each entry must follow the SpellData format with cn > "0"
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 11.3, 11.4, 11.5_

  - [x] 4.5 Add Miracles of Smednir to `src/data/spells.ts`
    - Add a `// MIRACLES OF SMEDNIR` comment section header
    - Extract all Miracles of Smednir from `dwarfguide.md` Chapter VI
    - Each entry must follow the SpellData format with cn > "0"
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 11.3, 11.4, 11.5_

  - [x] 4.6 Add Miracles of Thungni to `src/data/spells.ts`
    - Add a `// MIRACLES OF THUNGNI` comment section header
    - Extract all Miracles of Thungni from `dwarfguide.md` Chapter VI
    - Each entry must follow the SpellData format with cn > "0"
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 11.3, 11.4, 11.5_

  - [x] 4.7 Add Miracles of Morgrim to `src/data/spells.ts`
    - Add a `// MIRACLES OF MORGRIM` comment section header
    - Extract all Miracles of Morgrim from `dwarfguide.md` Chapter VI
    - Each entry must follow the SpellData format with cn > "0"
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 11.3, 11.4, 11.5_

  - [x] 4.8 Write property test for Dwarf miracle data integrity (Property 3)
    - Create `src/data/__tests__/dwarf-miracles.property.test.ts`
    - **Property 3: Dwarf miracle data integrity**
    - For every spell entry in SPELL_LIST belonging to a Dwarf deity section (Grungni, Valaya, Grimnir, Gazul, Smednir, Thungni, Morgrim), all six SpellData fields must be non-empty strings, and cn must parse to an integer > 0
    - Filter SPELL_LIST by section position (entries between Dwarf deity comment markers)
    - Run at least 100 iterations (enumerate all entries)
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4, 11.3**

  - [x] 4.9 Write property test for miracle name normalization (Property 4)
    - Add to `src/data/__tests__/dwarf-miracles.property.test.ts`
    - **Property 4: Miracle name normalization**
    - For every Dwarf miracle entry, the name must have no leading/trailing whitespace, no consecutive spaces, and no OCR artifacts
    - **Validates: Requirements 11.5**

  - [x] 4.10 Write unit tests for Dwarf miracle presence
    - Add to `src/data/__tests__/static-data.test.ts` (following the existing Myrmidia miracle test pattern)
    - Test that SPELL_LIST contains at least one miracle for each of the seven Dwarf deities by name
    - Test that all entries have cn > "0"
    - _Requirements: 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1, 11.2, 11.3_

- [x] 5. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — no language selection needed
- All miracle data is extracted from `dwarfguide.md` in the project root
- The Group Advantage feature reuses the existing `advantage` field — no new storage

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "2.3", "4.1"] },
    { "id": 2, "tasks": ["2.4", "2.5", "2.6", "2.7", "4.2", "4.3"] },
    { "id": 3, "tasks": ["4.4", "4.5", "4.6"] },
    { "id": 4, "tasks": ["4.7", "4.8", "4.9", "4.10"] }
  ]
}
```
