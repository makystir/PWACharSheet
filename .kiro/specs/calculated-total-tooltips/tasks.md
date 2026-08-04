# Implementation Plan: Calculated Total Tooltips

## Overview

Add breakdown tooltips to five types of calculated totals: Skill Totals, Characteristic Bonuses, Max Encumbrance, Coin Weight, and Armour Points Per Location. Implementation involves extracting a generic `TooltipTriggerCell` from the existing `CharCurrentCell` pattern, creating five pure breakdown helper functions in `src/logic/breakdown-helpers.ts`, five presentational breakdown content components, and integrating them into `CharacterPage.tsx` and `ArmourMap.tsx`. Property-based tests validate the correctness of all helper functions using fast-check.

## Tasks

- [x] 1. Create generic `TooltipTriggerCell` component
  - [x] 1.1 Implement `TooltipTriggerCell` in `src/components/shared/TooltipTriggerCell.tsx`
    - Extract the click/hover/keyboard interaction logic from `CharCurrentCell` into a generic reusable component
    - Accept props: `tooltipId`, `displayValue`, `isTooltipOpen`, `onOpen`, `onClose`, `className`, `ariaLabel`
    - Handle `onClick` → immediate open (cancel pending hover timeout)
    - Handle `onKeyDown` (Enter/Space) → open
    - Handle `onMouseEnter` → 300ms delayed open
    - Handle `onMouseLeave` → 200ms delayed close
    - Set `aria-describedby={tooltipId}` when `isTooltipOpen` is true
    - Set `role="button"`, `tabIndex={0}`
    - Create CSS module `TooltipTriggerCell.module.css` with interactive cursor and focus ring
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

  - [x] 1.2 Refactor `CharCurrentCell` to use `TooltipTriggerCell` internally
    - Replace duplicated hover/click/keyboard logic in `CharCurrentCell` with a delegation to `TooltipTriggerCell`
    - Maintain the existing `CharCurrentCellProps` interface so no consumer changes are needed
    - Verify existing characteristic current tooltip tests still pass
    - _Requirements: 6.1, 6.2_

  - [x] 1.3 Write unit tests for `TooltipTriggerCell`
    - Test click opens tooltip, 300ms hover opens, <300ms hover does not open
    - Test mouse leave closes after 200ms, Enter/Space opens
    - Test `aria-describedby` present when open, absent when closed
    - Place test in `src/components/shared/__tests__/TooltipTriggerCell.test.tsx`
    - _Requirements: 6.2, 6.4, 6.5_

- [x] 2. Create pure breakdown helper functions
  - [x] 2.1 Implement `getSkillBreakdown` in `src/logic/breakdown-helpers.ts`
    - Create the file with the `SkillBreakdown` interface and `getSkillBreakdown` function
    - Accept `charKey`, characteristic record, and advances; return `{ charName, charValue, advances, total }`
    - Compute `charValue` as `initial + advances + talentBonus` from the characteristic, `total = charValue + advances`
    - Clamp negative characteristic values to 0
    - _Requirements: 1.2_

  - [x] 2.2 Implement `getCBBreakdown` in `src/logic/breakdown-helpers.ts`
    - Add `CBBreakdown` interface and `getCBBreakdown` function
    - Accept `charKey` and characteristic record; return `{ charName, currentValue, bonus }`
    - Compute `bonus = Math.floor(currentValue / 10)`, clamping negatives to 0
    - _Requirements: 2.2_

  - [x] 2.3 Implement `getEncumbranceBreakdown` in `src/logic/breakdown-helpers.ts`
    - Add `EncumbranceBreakdown` interface and `getEncumbranceBreakdown` function
    - Accept characteristic record, `strongBackLevel`, `sturdyLevel`; return `{ sb, tb, strongBackLevel, sturdyLevel, total }`
    - Compute `sb = floor(S/10)`, `tb = floor(T/10)`, `total = sb + tb + strongBackLevel`
    - _Requirements: 3.2, 3.3_

  - [x] 2.4 Implement `getCoinWeightBreakdown` in `src/logic/breakdown-helpers.ts`
    - Add `CoinWeightBreakdown` interface and `getCoinWeightBreakdown` function
    - Accept `gc`, `ss`, `d`; return `{ gc, ss, d, total, isEmpty }`
    - Compute `total = Math.floor((gc + ss + d) / 200)`, `isEmpty = (gc + ss + d) === 0`
    - _Requirements: 4.2, 4.3_

  - [x] 2.5 Implement `getAPBreakdown` in `src/logic/breakdown-helpers.ts`
    - Add `APBreakdown` interface and `getAPBreakdown` function
    - Accept armour items array, location key, location label; return `{ locationLabel, items, total }`
    - Filter to worn items covering the specified location, map to `{ name, ap }` (using `currentAp` if set, else `ap`)
    - Total = sum of item APs; use "Unnamed" for items with undefined name
    - _Requirements: 5.2, 5.3_

  - [x] 2.6 Write property test for `getSkillBreakdown`
    - **Property 1: Skill breakdown total equals characteristic current plus advances**
    - Generate `charValue` ∈ [0, 99], `advances` ∈ [0, 99], random `CharacteristicKey`
    - Verify returned `total === charValue + advances`
    - Place test in `src/logic/__tests__/breakdown-helpers.property.test.ts`
    - **Validates: Requirements 1.2**

  - [x] 2.7 Write property test for `getCBBreakdown`
    - **Property 2: Characteristic bonus breakdown produces correct floor division**
    - Generate `currentValue` ∈ [0, 199]
    - Verify returned `bonus === Math.floor(currentValue / 10)`
    - Place test in `src/logic/__tests__/breakdown-helpers.property.test.ts`
    - **Validates: Requirements 2.2**

  - [x] 2.8 Write property test for `getEncumbranceBreakdown`
    - **Property 3: Encumbrance breakdown total equals SB + TB + Strong Back level**
    - Generate S ∈ [0, 99], T ∈ [0, 99], strongBackLevel ∈ [0, 5], sturdyLevel ∈ [0, 3]
    - Verify `sb === floor(S/10)`, `tb === floor(T/10)`, `total === sb + tb + strongBackLevel`
    - Place test in `src/logic/__tests__/breakdown-helpers.property.test.ts`
    - **Validates: Requirements 3.2, 3.3**

  - [x] 2.9 Write property test for `getCoinWeightBreakdown`
    - **Property 4: Coin weight breakdown produces correct floor division**
    - Generate gc ∈ [0, 9999], ss ∈ [0, 9999], d ∈ [0, 9999]
    - Verify `total === Math.floor((gc + ss + d) / 200)` and `isEmpty === (gc + ss + d === 0)`
    - Place test in `src/logic/__tests__/breakdown-helpers.property.test.ts`
    - **Validates: Requirements 4.2, 4.3**

  - [x] 2.10 Write property test for `getAPBreakdown`
    - **Property 5: AP breakdown lists all covering items and total equals their AP sum**
    - Generate 0–6 armour items with random AP (1–5), random location coverage, random worn state
    - Verify items array contains exactly worn items covering location, total equals sum of APs
    - Place test in `src/logic/__tests__/breakdown-helpers.property.test.ts`
    - **Validates: Requirements 5.2, 5.3**

- [x] 3. Checkpoint - Verify helper functions and generic trigger
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create breakdown content components
  - [x] 4.1 Implement `SkillBreakdownContent` in `src/components/pages/SkillBreakdownContent.tsx`
    - Presentational component accepting `SkillBreakdownContentProps`
    - Render rows: characteristic name + value, advances, separator, total
    - Create CSS module `SkillBreakdownContent.module.css` matching `CharBreakdownContent` styling
    - _Requirements: 1.2_

  - [x] 4.2 Implement `CBBreakdownContent` in `src/components/pages/CBBreakdownContent.tsx`
    - Presentational component accepting `CBBreakdownContentProps`
    - Render rows: current value, separator, CB bonus
    - Create CSS module `CBBreakdownContent.module.css`
    - _Requirements: 2.2_

  - [x] 4.3 Implement `EncumbranceBreakdownContent` in `src/components/pages/EncumbranceBreakdownContent.tsx`
    - Presentational component accepting `EncumbranceBreakdownContentProps`
    - Render SB, TB rows; conditionally render Strong Back row when `strongBackLevel > 0`
    - Show informational "Sturdy: halves overburdened penalties" note when `sturdyLevel > 0`
    - Render separator and total
    - Create CSS module `EncumbranceBreakdownContent.module.css`
    - _Requirements: 3.2, 3.3_

  - [x] 4.4 Implement `CoinWeightBreakdownContent` in `src/components/pages/CoinWeightBreakdownContent.tsx`
    - Presentational component accepting `CoinWeightBreakdownContentProps`
    - When `isEmpty`, render "No coins carried"
    - Otherwise render GC, SS, D rows, sum, ÷ 200, separator, weight total
    - Create CSS module `CoinWeightBreakdownContent.module.css`
    - _Requirements: 4.2, 4.3_

  - [x] 4.5 Implement `APBreakdownContent` in `src/components/pages/APBreakdownContent.tsx`
    - Presentational component accepting `APBreakdownContentProps`
    - When items is empty, render "No armour covers this location" with total 0
    - Otherwise list each item name + AP, separator, total
    - Create CSS module `APBreakdownContent.module.css`
    - _Requirements: 5.2, 5.3_

  - [x] 4.6 Write unit tests for breakdown content components
    - Test `SkillBreakdownContent` renders char name, value, advances, total
    - Test `CBBreakdownContent` renders current value and bonus
    - Test `EncumbranceBreakdownContent` with and without talents
    - Test `CoinWeightBreakdownContent` with coins and empty state
    - Test `APBreakdownContent` with items and empty state
    - Place tests in `src/components/pages/__tests__/BreakdownContent.test.tsx`
    - _Requirements: 1.2, 2.2, 3.2, 3.3, 4.2, 4.3, 5.2, 5.3_

- [x] 5. Checkpoint - Verify all components in isolation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Integrate tooltips into CharacterPage
  - [x] 6.1 Add tooltip state management to `CharacterPage.tsx`
    - Add discriminated union state: `TooltipState` (skill | cb | encumbrance | coinWeight | null)
    - Implement `openTooltip` handler that replaces any existing tooltip (single-tooltip-at-a-time)
    - Implement `closeTooltip` handler that clears state
    - _Requirements: 6.3_

  - [x] 6.2 Wire Skill Total tooltips into CharacterPage
    - Wrap each skill total value with `TooltipTriggerCell`
    - On open, set tooltip state to `{ type: 'skill', index, anchorEl }`
    - When tooltip state is skill type, render `<Tooltip>` with `<SkillBreakdownContent>` using `getSkillBreakdown`
    - Works for both basic and advanced skills
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 6.3 Wire Characteristic Bonus tooltips into CharacterPage
    - Wrap each CB cell value with `TooltipTriggerCell`
    - On open, set tooltip state to `{ type: 'cb', key, anchorEl }`
    - When tooltip state is cb type, render `<Tooltip>` with `<CBBreakdownContent>` using `getCBBreakdown`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 6.4 Wire Encumbrance tooltip into CharacterPage
    - Wrap max encumbrance value with `TooltipTriggerCell`
    - On open, set tooltip state to `{ type: 'encumbrance', anchorEl }`
    - When tooltip state is encumbrance type, render `<Tooltip>` with `<EncumbranceBreakdownContent>` using `getEncumbranceBreakdown`
    - Look up Strong Back and Sturdy talent levels from character talents
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 6.5 Wire Coin Weight tooltip into CharacterPage
    - Wrap coin weight value with `TooltipTriggerCell`
    - On open, set tooltip state to `{ type: 'coinWeight', anchorEl }`
    - When tooltip state is coinWeight type, render `<Tooltip>` with `<CoinWeightBreakdownContent>` using `getCoinWeightBreakdown`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7. Integrate AP tooltip into ArmourMap
  - [x] 7.1 Add AP tooltip state to `ArmourMap.tsx`
    - Add tooltip state: `{ location: LocationKey; anchorEl: HTMLElement } | null`
    - Wrap each AP location cell with `TooltipTriggerCell`
    - On open, set state with location and anchor element
    - Ensure opening a new location dismisses any previously open tooltip
    - _Requirements: 5.1, 6.3_

  - [x] 7.2 Render AP breakdown tooltip in ArmourMap
    - When tooltip state is set, render `<Tooltip>` with `<APBreakdownContent>` using `getAPBreakdown`
    - Pass the character's armour items, current location, and location label
    - Wire `onClose` to clear tooltip state
    - _Requirements: 5.2, 5.3, 5.4_

- [x] 8. Checkpoint - Verify full integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Integration tests for tooltip interactions
  - [x] 9.1 Write integration tests for CharacterPage tooltips
    - Test: click skill total → tooltip shows breakdown → press Escape → closes
    - Test: click CB cell → tooltip shows current value and bonus
    - Test: click encumbrance → shows SB + TB + talent contributions
    - Test: click coin weight → shows coin formula or "No coins carried"
    - Test: opening skill tooltip then clicking CB cell dismisses skill tooltip (single-tooltip)
    - Test: keyboard navigation with Enter/Space activates tooltips
    - Place test in `src/components/pages/__tests__/CalculatedTooltips.integration.test.tsx`
    - _Requirements: 1.1, 1.3, 2.1, 2.3, 3.1, 3.4, 4.1, 4.4, 6.3, 6.4_

  - [x] 9.2 Write integration tests for ArmourMap AP tooltips
    - Test: click AP location cell → tooltip lists armour items and total
    - Test: click AP location with no armour → shows "No armour covers this location"
    - Test: switching between locations updates tooltip content
    - Place test in `src/components/combat/__tests__/ArmourMap.tooltip.integration.test.tsx`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.3_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the five universal correctness properties defined in the design document
- The shared `Tooltip` component already handles portal rendering, positioning, focus management, Escape/outside-click dismissal, and ARIA attributes
- `fast-check` and `vitest` are already in devDependencies
- The `TooltipTriggerCell` extraction deduplicates interaction logic across 5+ tooltip types while maintaining backward compatibility with the existing `CharCurrentCell`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.2", "2.3", "2.4", "2.5"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.6", "2.7", "2.8", "2.9", "2.10", "4.1", "4.2", "4.3", "4.4", "4.5"] },
    { "id": 2, "tasks": ["4.6", "6.1"] },
    { "id": 3, "tasks": ["6.2", "6.3", "6.4", "6.5", "7.1"] },
    { "id": 4, "tasks": ["7.2"] },
    { "id": 5, "tasks": ["9.1", "9.2"] }
  ]
}
```
