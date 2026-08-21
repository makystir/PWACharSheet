# Implementation Plan: Armour Worn Toggle

## Overview

Add a worn/unworn toggle checkbox to each armour piece in the ArmourMap component, extract a `calculateArmourEncumbrance()` utility function, fix the `filterByWorn` logic from `worn === true` to `worn !== false`, and add property-based tests for all six correctness properties. The implementation uses the existing `onUpdateArmour` callback and requires no data model schema changes.

## Tasks

- [x] 1. Fix filterByWorn logic and extract encumbrance utility
  - [x] 1.1 Fix `filterByWorn` logic in `src/logic/calculators.ts`
    - Change `armourItems.filter(item => item.worn === true)` to `armourItems.filter(item => item.worn !== false)`
    - This ensures items with `worn: undefined` (legacy data) are treated as worn per Requirement 3.1
    - _Requirements: 3.1, 5.3_

  - [x] 1.2 Add `calculateArmourEncumbrance()` utility function to `src/logic/encumbrance.ts`
    - Implement: `export function calculateArmourEncumbrance(enc: string, worn: boolean | undefined): number`
    - Parse enc string to float (fallback 0 for NaN), apply `worn !== false ? Math.max(0, baseEnc - 1) : baseEnc`
    - Add JSDoc comment citing WFRP4e Core p.293
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 1.3 Replace inline enc calculations with `calculateArmourEncumbrance()` in `src/components/pages/CharacterPage.tsx` and `src/components/layout/PrintLayout.tsx`
    - Replace the repeated `const wornEnc = a.worn !== false ? Math.max(0, baseEnc - 1) : baseEnc` pattern
    - Import and call `calculateArmourEncumbrance(a.enc, a.worn)` instead
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 1.4 Write property test for encumbrance calculation (Property 3)
    - **Property 3: Encumbrance calculation respects worn state**
    - Create `src/logic/__tests__/encumbrance.wornToggle.property.test.ts`
    - Use fast-check to generate random enc values (0–10) × worn states (true, false, undefined) × armour types
    - Assert: worn items return `max(0, enc - 1)`, unworn items return full enc value
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [x] 1.5 Write property test for AP calculation worn filtering (Property 4)
    - **Property 4: AP calculation uses only worn items**
    - Create `src/logic/__tests__/calculators.wornToggle.property.test.ts`
    - Use fast-check to generate random armour lists (1–8 items) with mixed worn states
    - Assert: AP per location equals AP computed from only the subset where `worn !== false`
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 2. Checkpoint - Verify logic layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Add worn toggle UI to ArmourMap component
  - [x] 3.1 Add worn toggle checkbox to armour list rows in `src/components/combat/ArmourMap.tsx`
    - Render `<input type="checkbox">` before the armour name in each `armourRow`
    - Set `checked={item.worn !== false}` for correct default handling
    - Wire `onChange` to `onUpdateArmour(index, 'worn', !(item.worn !== false))`
    - Add `aria-label={`${item.name} — ${item.worn !== false ? 'worn' : 'unworn'}`}`
    - Only render toggle when `onUpdateArmour` prop is provided (read-only support)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 3.2 Add CSS styles for worn toggle in `src/components/combat/ArmourMap.module.css`
    - Add `.wornToggle` class for the checkbox control
    - Add `.armourRowUnworn` class with dimmed opacity for unworn items
    - Ensure toggle is touch-friendly (min 44×44px tap target) and has visible focus ring
    - _Requirements: 1.3, 1.5_

  - [x] 3.3 Filter contributing armour section by worn status in `src/components/combat/ArmourMap.tsx`
    - Update `contributingItems` filter to include only items where `worn !== false` AND covers the selected location
    - _Requirements: 4.1_

  - [x] 3.4 Update stealth penalty badge to check worn status in `src/components/combat/ArmourMap.tsx`
    - Verify the existing badge logic uses `item.worn !== false` (already present from codebase inspection)
    - Ensure badge only appears when at least one worn Chainmail or Plate item exists
    - _Requirements: 4.2_

  - [x] 3.5 Write property tests for UI toggle behavior (Properties 1, 2, 5, 6)
    - **Property 1: Toggle inverts worn state**
    - **Property 2: Aria-label contains item name and worn state**
    - **Property 5: Contributing armour section filters by worn status**
    - **Property 6: Stealth penalty badge reflects worn heavy armour**
    - Create `src/components/combat/__tests__/ArmourMap.wornToggle.property.test.tsx`
    - Use fast-check to generate random armour items with varied names, worn states, armour types, and locations
    - **Validates: Requirements 1.2, 1.5, 4.1, 4.2**

- [x] 4. Checkpoint - Verify UI integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Wire body map AP display to use worn-filtered values
  - [x] 5.1 Verify body map AP values reflect worn-only calculation
    - Confirm that the `armourPoints` prop passed to ArmourMap is computed from `calculateArmourPointsUnified` with `filterByWorn: true` (or equivalent `computeAPByLocation`)
    - If not, update the call site in `src/components/pages/CombatPage.tsx` to pass worn-filtered AP
    - _Requirements: 3.4, 4.3_

  - [x] 5.2 Write integration test for all-unworn zero AP scenario
    - Render ArmourMap with all items set to `worn: false`
    - Assert all body map locations display 0 AP
    - Create test in `src/components/combat/__tests__/ArmourMap.wornToggle.property.test.tsx`
    - _Requirements: 4.3_

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit/integration tests validate specific examples and edge cases
- The `worn` field already exists on `ArmourItem` — no data migration needed
- The stealth badge logic (Requirement 4.2) already uses `worn !== false` in the existing code; task 3.4 confirms correctness

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4"] },
    { "id": 4, "tasks": ["3.5", "5.1"] },
    { "id": 5, "tasks": ["5.2"] }
  ]
}
```
