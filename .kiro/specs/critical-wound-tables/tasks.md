# Implementation Plan: Critical Wound Tables

## Overview

Implement structured critical wound reference tables for the WFRP 4e character sheet PWA. The implementation follows data → logic → UI layering: first the table data file, then the lookup function, then the Roll Critical UI flow, and finally integration with existing panels.

## Tasks

- [x] 1. Create critical wound table data and interface
  - [x] 1.1 Create `src/data/critical-wound-tables.ts` with `CriticalWoundTableEntry` interface and four exported table arrays
    - Define the `CriticalWoundTableEntry` interface with fields: `min`, `max`, `name`, `effect`, `severity`
    - Export `HEAD_CRITICAL_TABLE`, `ARM_CRITICAL_TABLE`, `BODY_CRITICAL_TABLE`, `LEG_CRITICAL_TABLE` arrays
    - Each table must have ≥10 entries covering the full d100 range (1–100) with no gaps or overlaps
    - Severity values must be integers 1–5, non-decreasing within each table
    - Entries with death/amputation/permanent loss get severity 4–5; temporary penalties get severity 1; lasting injuries short of amputation get severity 2–3
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 1.2 Create `src/data/__tests__/critical-wound-tables.test.ts` with structural validation tests
    - Test each table has ≥10 entries
    - Test first entry has min=1, last entry has max=100
    - Test no gaps between consecutive entries (`table[i].max + 1 === table[i+1].min`)
    - Test severity values are integers 1–5 and non-decreasing within each table
    - Test all fields are non-empty strings for name and effect
    - _Requirements: 1.2, 1.3, 5.1, 5.4_

- [x] 2. Implement lookup function and tests
  - [x] 2.1 Add `lookupCriticalWound` function to `src/logic/critical-wounds.ts`
    - Import `HitLocation` from `hitLocationTable` and `CriticalWoundTableEntry` + table arrays from data file
    - Map `'Head'` → HEAD table, `'Left Arm'`/`'Right Arm'` → ARM table, `'Body'` → BODY table, `'Left Leg'`/`'Right Leg'` → LEG table
    - Linear scan: find entry where `entry.min <= roll && roll <= entry.max`
    - Return `undefined` for roll < 1 or roll > 100 or non-integer roll values
    - Function must be pure with no side effects
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 2.2 Create `src/logic/__tests__/critical-wounds.test.ts` with unit tests for lookup
    - Test `lookupCriticalWound("Head", 1)` returns first Head table entry
    - Test `lookupCriticalWound("Head", 100)` returns last Head table entry
    - Test `lookupCriticalWound("Left Arm", 50)` equals `lookupCriticalWound("Right Arm", 50)`
    - Test `lookupCriticalWound("Left Leg", 25)` equals `lookupCriticalWound("Right Leg", 25)`
    - Test `lookupCriticalWound("Body", 0)` returns undefined
    - Test `lookupCriticalWound("Body", 101)` returns undefined
    - Test `lookupCriticalWound("Head", 5.5)` returns undefined
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 2.3 Write property test: Entry structural validity
    - **Property 1: Entry structural validity**
    - **Validates: Requirements 1.2, 5.1**
    - Generate random (table, index) pairs using fast-check
    - Assert: min and max are positive integers with min <= max, name is non-empty, effect is non-empty, severity is integer 1–5

  - [x] 2.4 Write property test: Lookup returns correct entry for all valid inputs
    - **Property 2: Lookup returns correct entry for all valid inputs**
    - **Validates: Requirements 1.3, 2.5**
    - Generate random HitLocation and random integer roll 1–100 using fast-check
    - Assert: result is defined and `entry.min <= roll && roll <= entry.max`

  - [x] 2.5 Write property test: Symmetric location mapping
    - **Property 3: Symmetric location mapping**
    - **Validates: Requirements 2.1, 2.2**
    - Generate random d100 roll 1–100 using fast-check
    - Assert: `lookupCriticalWound("Left Arm", roll)` deeply equals `lookupCriticalWound("Right Arm", roll)`
    - Assert: `lookupCriticalWound("Left Leg", roll)` deeply equals `lookupCriticalWound("Right Leg", roll)`

  - [x] 2.6 Write property test: Out-of-range rolls return undefined
    - **Property 4: Out-of-range rolls return undefined**
    - **Validates: Requirements 2.6**
    - Generate random HitLocation and random roll outside [1, 100] (negatives, 0, >100, floats) using fast-check
    - Assert: `lookupCriticalWound(location, roll)` returns undefined

  - [x] 2.7 Write property test: Non-decreasing severity ordering
    - **Property 5: Non-decreasing severity ordering**
    - **Validates: Requirements 5.4**
    - For each of the four tables, iterate all consecutive entry pairs
    - Assert: `table[i].severity <= table[i+1].severity`

- [x] 3. Checkpoint - Ensure data and logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Roll Critical UI flow component
  - [x] 4.1 Create `src/components/combat/RollCriticalFlow.tsx` component
    - Accept props: `preselectedLocation?: HitLocation`, `onConfirm`, `onCancel`
    - Render location `<select>` with all 6 HitLocation values, pre-selected from prop if provided
    - Render numeric input for d100 roll (type="number", min=1, max=100)
    - Render "Roll" button that generates `Math.floor(Math.random() * 100) + 1` and auto-triggers lookup
    - Render "Look Up" button that calls `lookupCriticalWound` and transitions to preview state
    - Validate input: disable lookup for empty/non-integer/out-of-range values, show inline error
    - Preview state: display wound name, effect, severity with Confirm and Cancel buttons
    - On confirm: call `onConfirm` with `{ location, description: entry.name, effects: entry.effect, severity: entry.severity, duration: "", healed: false }`
    - On cancel: call `onCancel`
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 4.2 Create `src/components/combat/RollCriticalFlow.module.css` with styling
    - Style the flow container, form inputs, preview card, action buttons
    - Follow existing CSS module patterns in the combat components
    - Ensure touch-friendly button sizing (min 44px tap targets)
    - _Requirements: 3.1, 3.6_

  - [x] 4.3 Create `src/components/combat/__tests__/RollCriticalFlow.test.tsx` with component tests
    - Test renders location selector with 6 options
    - Test pre-selects location from prop
    - Test disables lookup for empty/invalid input
    - Test shows inline error for out-of-range values
    - Test displays preview card on successful lookup
    - Test calls onConfirm with correct CriticalWound shape
    - Test calls onCancel without creating wound
    - Test random roll generates value 1–100 and auto-lookups
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ] 5. Integrate Roll Critical flow into existing panels
  - [x] 5.1 Modify `src/components/combat/TakeDamagePanel.tsx` to add `onDown` callback
    - Add optional prop `onDown?: (location: HitLocation) => void`
    - Call `onDown(selectedLocation)` when the "Character is Down" alert is triggered
    - No visual changes to TakeDamagePanel
    - _Requirements: 3.2_

  - [~] 5.2 Modify `src/components/combat/CriticalWoundsPanel.tsx` to add Roll Critical button and flow
    - Add `preselectedLocation?: HitLocation` to props interface
    - Add internal state `showRollFlow: boolean`
    - Render "Roll Critical" button next to existing "Add" button in the header
    - When `showRollFlow` is true, render `RollCriticalFlow` inline below the header
    - On confirm: create wound via `recordCriticalWound` helper, call existing add/update mechanism
    - On cancel: set `showRollFlow` to false
    - Existing "Add" button, edit, and heal functionality must remain unchanged
    - _Requirements: 3.1, 3.2, 3.7, 3.8, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [~] 5.3 Wire `onDown` from TakeDamagePanel to CriticalWoundsPanel in the parent component
    - In `CombatDashboard.tsx` or `CombatPage.tsx`, add state to store the down location
    - Pass `onDown` handler to `TakeDamagePanel` that stores the selected location
    - Pass stored location as `preselectedLocation` to `CriticalWoundsPanel`
    - Clear the stored location when Roll Critical flow completes or is cancelled
    - _Requirements: 3.2_

- [~] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify both "Add" and "Roll Critical" buttons are visible simultaneously
  - Verify wounds created via Roll Critical are fully editable and healable
  - Verify pre-selection of location from TakeDamagePanel "Character is Down" alert works end-to-end

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the five correctness properties defined in the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout, consistent with the existing codebase
- Property-based tests use `fast-check` with the existing `vitest` test runner

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "2.7"] },
    { "id": 3, "tasks": ["4.1", "4.2"] },
    { "id": 4, "tasks": ["4.3", "5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3"] }
  ]
}
```
