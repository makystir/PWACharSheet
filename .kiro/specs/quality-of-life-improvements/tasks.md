# Implementation Plan: Quality-of-Life Improvements

## Overview

Implement eight independent quality-of-life enhancements across the Advancement, Character, Combat, and Endeavours pages. Each feature adds pure logic functions in `src/logic/`, optional shared UI components, and page-level integration. Property-based tests validate correctness properties using fast-check + vitest.

## Tasks

- [x] 1. Implement XP Budget Feedback logic and UI
  - [x] 1.1 Add `formatXpFeedback` and `calculateTierBoundaryCost` functions in `src/logic/advancement.ts`
    - Implement `formatXpFeedback(cost, available)` returning a message string like "Need 25 XP, have 10"
    - Implement `calculateTierBoundaryCost(type, currentAdvances, inCareer)` returning `{ targetAdvances, totalCost }`
    - Tier boundaries are at 5, 10, 15, 20, 25
    - _Requirements: 1.1, 5.2_

  - [x] 1.2 Integrate XP insufficient feedback into the Advancement Page
    - When advancement attempt fails due to insufficient XP, display Toast with `formatXpFeedback` message
    - Apply CSS shake animation to the XP display element on insufficient XP
    - Toast auto-dismisses after 3 seconds
    - No feedback shown when XP is sufficient
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.3 Write property test for XP Feedback Decision Correctness
    - **Property 1: XP Feedback Decision Correctness**
    - Create `src/logic/__tests__/advancement.xp-feedback.property.test.ts`
    - For any cost and available XP: if available < cost, message contains both values; if available >= cost, no message produced
    - **Validates: Requirements 1.1, 1.3**

- [x] 2. Implement Skill Search on Advancement Page
  - [x] 2.1 Add skill filter logic (if not already present) supporting text + career-only AND composition
    - Ensure filter function accepts skill array, search text, and career-only flag
    - Return skills whose names contain search text (case-insensitive) AND match career filter
    - Empty search text returns all skills (respecting career toggle)
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 2.2 Add search input UI to the Advancement Page
    - Render text input with placeholder "Search skills…" and aria-label for accessibility
    - Wire input to filter logic, combining with existing Career Only toggle
    - Ensure clearing the input restores full list
    - _Requirements: 2.1, 2.3, 2.5_

  - [x] 2.3 Write property test for Skill Filter AND Composition
    - **Property 2: Skill Filter AND Composition**
    - Create `src/logic/__tests__/skill-filter.property.test.ts`
    - For any skill array, search text, and career-only flag: result contains exactly matching skills, no omissions, no extras
    - **Validates: Requirements 2.2, 2.4**

- [x] 3. Checkpoint - XP feedback and skill search
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Verify Persistent Roll History implementation
  - [x] 4.1 Verify existing `useRollHistory` hook persistence and cap behavior
    - Confirm the hook persists to localStorage and restores on load
    - Confirm maximum 50 entries with oldest discarded
    - Confirm clear removes all persisted entries
    - Confirm graceful fallback when localStorage unavailable
    - If any behavior is missing, implement it
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 4.2 Write property test for Roll History Persistence Round-Trip
    - **Property 3: Roll History Persistence Round-Trip**
    - Create `src/hooks/__tests__/useRollHistory.property.test.ts`
    - For any sequence of entries (up to 50), persist then load returns equivalent ordered list
    - **Validates: Requirements 3.1, 3.3**

  - [x] 4.3 Write property test for Roll History Maximum Length Invariant
    - **Property 4: Roll History Maximum Length Invariant**
    - Add to `src/hooks/__tests__/useRollHistory.property.test.ts`
    - For any sequence of additions, length never exceeds 50, oldest entries discarded first
    - **Validates: Requirements 3.2**

- [x] 5. Implement Drag-to-Reorder for Equipment
  - [x] 5.1 Create `reorderArray` utility in `src/logic/reorder.ts`
    - Implement generic `reorderArray<T>(arr, fromIndex, toIndex)` returning a new array
    - Invalid indices (out of bounds) return original array unchanged
    - _Requirements: 4.3, 4.4_

  - [x] 5.2 Create `DragHandle` shared component in `src/components/shared/DragHandle.tsx`
    - Render grip icon with move-up/move-down buttons for keyboard accessibility
    - Props: `onMoveUp`, `onMoveDown`, `isFirst`, `isLast`, `itemLabel` (for aria-label)
    - Disable up button when first, down button when last
    - _Requirements: 4.1, 4.2, 4.6_

  - [x] 5.3 Integrate drag-reorder into Character Page equipment lists
    - Add DragHandle to each weapon row and each trapping row
    - Wire drag/keyboard reorder to `reorderArray` and persist changes to character state
    - Show visual indicator for drop target during drag
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 5.4 Write property test for Array Reorder Preserves Elements
    - **Property 5: Array Reorder Preserves Elements**
    - Create `src/logic/__tests__/reorder.property.test.ts`
    - For any array and valid indices: result is a permutation with same elements, moved item at target, relative order preserved
    - **Validates: Requirements 4.3, 4.4**

- [x] 6. Implement Bulk Skill Advancement
  - [x] 6.1 Add `applyBulkAdvancement` function in `src/logic/advancement.ts`
    - Accept character, skillIndex, isBasic, inCareer
    - Calculate cumulative cost from current advances to next tier boundary
    - If XP sufficient: return updated character with all advances applied and individual log entries
    - If XP insufficient: return error with cost and available values
    - _Requirements: 5.2, 5.3, 5.5, 5.6_

  - [x] 6.2 Add "Advance to next tier" button UI on Advancement Page
    - Render button per skill row
    - On click, call `applyBulkAdvancement`; on success update state, on error show Toast (reusing Requirement 1 feedback)
    - _Requirements: 5.1, 5.4_

  - [x] 6.3 Write property test for Bulk Advancement Cumulative Cost
    - **Property 6: Bulk Advancement Cumulative Cost Equals Sum of Individual Costs**
    - Add to `src/logic/__tests__/advancement.xp-feedback.property.test.ts`
    - For any skill type, current advances (0–24), and career status: cumulative cost equals sum of individual `getAdvancementCost()` calls
    - **Validates: Requirements 5.2**

  - [x] 6.4 Write property test for Bulk Advancement Atomicity
    - **Property 7: Bulk Advancement Atomicity**
    - Add to `src/logic/__tests__/advancement.xp-feedback.property.test.ts`
    - For any bulk where XP >= cost: skill advances reach boundary, XP reduced by exact cost, correct number of log entries
    - **Validates: Requirements 5.3, 5.5**

- [x] 7. Checkpoint - Equipment reorder and bulk advancement
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Condition Duration Auto-Decrement
  - [x] 8.1 Create `decrementConditionDurations` function in `src/logic/condition-duration.ts`
    - Accept conditions array, return `{ conditions, expiredNames }`
    - Decrement parsed integer duration by 1 for conditions with positive integer duration
    - Leave conditions with no duration, non-numeric duration, or zero/negative duration unchanged
    - Report names of conditions whose duration reached 0
    - _Requirements: 6.1, 6.5, 6.6_

  - [x] 8.2 Integrate condition decrement into Combat Page round advancement
    - Call `decrementConditionDurations` when round counter advances
    - Display prompt for each expired condition asking to remove or keep
    - On confirm: remove condition; on decline: keep with duration 0
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 8.3 Write property test for Condition Duration Decrement Correctness
    - **Property 8: Condition Duration Decrement Correctness**
    - Create `src/logic/__tests__/condition-duration.property.test.ts`
    - For any conditions array: positive integer durations decremented by 1, others unchanged, expired names reported correctly
    - **Validates: Requirements 6.1, 6.5, 6.6**

- [x] 9. Implement Encumbrance Warning Indicator
  - [x] 9.1 Create `getEncumbranceLevel` and `formatEncumbrance` functions in `src/logic/encumbrance.ts`
    - `getEncumbranceLevel(current, max)`: return "neutral" (<50%), "warning" (50–75%), "danger" (75–100%), "critical" (≥100%)
    - `formatEncumbrance(current, max)`: return string like "12 / 18" containing both values
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.7_

  - [x] 9.2 Create `ProgressBar` shared component in `src/components/shared/ProgressBar.tsx`
    - Props: current, max, level (EncumbranceLevel), label, ariaLabel
    - Render colored progress bar based on level
    - Display numeric label and "Over-encumbered" text at critical level
    - _Requirements: 7.1, 7.5, 7.7_

  - [x] 9.3 Integrate encumbrance indicator into Character Page Gear tab
    - Add ProgressBar showing current/max encumbrance with real-time updates
    - Wire to `getEncumbranceLevel` for color classification
    - Update on equipment add/remove/modify
    - _Requirements: 7.1, 7.6_

  - [x] 9.4 Write property test for Encumbrance Level Classification
    - **Property 9: Encumbrance Level Classification**
    - Create `src/logic/__tests__/encumbrance.property.test.ts`
    - For any non-negative current and positive max: correct level returned per threshold rules
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5**

  - [x] 9.5 Write property test for Encumbrance Display Contains Numeric Values
    - **Property 10: Encumbrance Display Contains Numeric Values**
    - Add to `src/logic/__tests__/encumbrance.property.test.ts`
    - For any non-negative current and positive max: formatted string contains both values as substrings
    - **Validates: Requirements 7.7**

- [x] 10. Implement Endeavour Templates
  - [x] 10.1 Create `ENDEAVOUR_TEMPLATES` data and `applyEndeavourTemplate` function in `src/logic/endeavour-templates.ts`
    - Define static template data for Training, Income, Research, Crafting, Healing, Socialising
    - Implement `applyEndeavourTemplate(templateType, statusTier)` returning populated fields
    - When no status tier provided, leave cost empty and include warning
    - _Requirements: 8.1, 8.3, 8.4, 8.6_

  - [x] 10.2 Integrate template picker into Endeavours Page
    - Add template selector listing all 6 types when creating a new endeavour entry
    - On selection, call `applyEndeavourTemplate` and populate type, notes, and cost fields
    - Ensure all pre-filled fields remain editable after population
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 10.3 Write property test for Endeavour Template Notes Non-Empty
    - **Property 11: Endeavour Template Notes Non-Empty**
    - Create `src/logic/__tests__/endeavour-templates.property.test.ts`
    - For any valid template type: applying produces non-empty notes string
    - **Validates: Requirements 8.3**

  - [x] 10.4 Write property test for Endeavour Template Cost Lookup
    - **Property 12: Endeavour Template Cost Lookup**
    - Add to `src/logic/__tests__/endeavour-templates.property.test.ts`
    - For any template with cost and valid status tier: cost field non-empty; without tier: cost field empty
    - **Validates: Requirements 8.4, 8.6**

- [x] 11. Final checkpoint - All features complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use the existing `fast-check` v4.8.0 + `vitest` v4.1.2 setup
- All new logic functions are pure for testability, matching existing project patterns
- The existing `useRollHistory` hook already implements persistence (task 4.1 verifies and patches if needed)
- Checkpoints ensure incremental validation after related feature groups
- The 8 features are architecturally independent but grouped by page area for efficient implementation
- Shared components (ProgressBar, DragHandle) are created before page integration tasks that consume them

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "4.1", "5.1", "6.1", "8.1", "9.1", "10.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.2", "2.3", "4.2", "4.3", "5.2", "5.4", "6.3", "6.4", "8.3", "9.2", "9.4", "9.5", "10.3", "10.4"] },
    { "id": 2, "tasks": ["5.3", "6.2", "8.2", "9.3", "10.2"] }
  ]
}
```
