# Implementation Plan: Characteristic Current Tooltip

## Overview

Add a breakdown tooltip to the "Current" column in the Characteristics panel. Implementation involves creating a helper function for talent lookup, a new `CharCurrentCell` component for interaction handling, a `CharBreakdownContent` component for the tooltip body, and wiring them into the existing `CharacterPage` with the shared `Tooltip` component. Property-based tests validate correctness of the pure logic; unit/integration tests cover UI interaction.

## Tasks

- [x] 1. Create `getContributingTalent` helper function
  - [x] 1.1 Implement `getContributingTalent` in `src/logic/talents.ts`
    - Add a pure function that takes `talents: Talent[]` and `charKey: CharacteristicKey`
    - Reverse-lookup `TALENT_BONUS_MAP` to find a talent name that maps to `charKey` and exists in the talents array
    - Return the talent name or `null` if no match
    - Export the function for use in CharacterPage
    - _Requirements: 1.6_

  - [x] 1.2 Write property test for `getContributingTalent`
    - **Property 3: Contributing talent resolution**
    - Generate random talent arrays with known `TALENT_BONUS_MAP` entries, verify correct name resolution or `null` when no match
    - Place test in `src/logic/__tests__/getContributingTalent.property.test.ts`
    - **Validates: Requirements 1.6**

- [x] 2. Create `CharBreakdownContent` component
  - [x] 2.1 Implement `CharBreakdownContent` in `src/components/pages/CharBreakdownContent.tsx`
    - Create a presentational component accepting `charKey`, `initial`, `advances`, `talentBonus`, `current`, and `contributingTalentName` props
    - Render rows: "Initial: {i}", "Advances: {a}", conditionally "Talent Bonus: +{b} ({talentName})" when `b > 0`, separator, "Total: {current}"
    - Omit the "Talent Bonus" row entirely when `b === 0`
    - _Requirements: 1.4, 1.5, 1.6_

  - [x] 2.2 Write property test for breakdown total invariant
    - **Property 1: Breakdown total invariant**
    - Generate random `{i, a, b}` tuples (i: 0–99, a: 0–99, b: 0–50), render component, verify displayed Total equals `i + a + b`
    - Place test in `src/components/pages/__tests__/CharBreakdownContent.property.test.tsx`
    - **Validates: Requirements 1.4**

  - [x] 2.3 Write property test for conditional talent row display
    - **Property 2: Conditional talent row display**
    - Generate random `b` values, render component, verify "Talent Bonus" row presence matches `b > 0`
    - Place test in `src/components/pages/__tests__/CharBreakdownContent.property.test.tsx`
    - **Validates: Requirements 1.5, 1.6**

- [x] 3. Create `CharCurrentCell` component with interaction logic
  - [x] 3.1 Implement `CharCurrentCell` in `src/components/pages/CharCurrentCell.tsx`
    - Create a component wrapping the current value in a `<div>` with `tabIndex={0}`, `role="button"`, and `aria-describedby` (when tooltip is open)
    - Handle `onClick` to open tooltip (also serves as tap on touch devices)
    - Handle `onKeyDown` for Enter/Space to open tooltip
    - Handle `onMouseEnter` with 300ms delay timer to open tooltip on hover
    - Handle `onMouseLeave` with 200ms delay timer to close tooltip
    - Cancel hover timeout on click to prevent double-open on hybrid devices
    - Clear all timeouts on unmount
    - Create CSS module `CharCurrentCell.module.css` with appropriate styling (interactive cursor, focus ring)
    - _Requirements: 1.1, 1.2, 2.4, 3.4, 3.5, 4.1_

  - [x] 3.2 Write unit tests for `CharCurrentCell` interaction behaviour
    - Test click opens tooltip, 300ms hover opens tooltip, <300ms hover does not open
    - Test mouse leave from cell closes after 200ms, Enter/Space opens tooltip
    - Test `aria-describedby` is present when tooltip is open and absent when closed
    - Place test in `src/components/pages/__tests__/CharCurrentCell.test.tsx`
    - _Requirements: 1.1, 1.2, 2.4, 3.2, 3.4, 3.5_

- [x] 4. Checkpoint - Verify components in isolation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Wire tooltip into CharacterPage
  - [x] 5.1 Integrate `CharCurrentCell` and tooltip state into `CharacterPage.tsx`
    - Add `charTooltip` state: `{ key: CharacteristicKey; anchorEl: HTMLElement } | null`
    - Replace the static `<div className={styles.charGridCurrent}>{current}</div>` with `<CharCurrentCell>` for each characteristic row
    - Pass `onOpen` callback that sets `charTooltip` state, `onClose` that clears it
    - When switching cells (Requirement 2.3), close existing tooltip and open new one
    - Import `getContributingTalent` for talent name resolution
    - _Requirements: 1.1, 1.2, 2.3_

  - [x] 5.2 Render tooltip with `CharBreakdownContent` in CharacterPage
    - When `charTooltip` is set, render `<Tooltip>` with `id="tooltip-char-{key}"`, title from `CHAR_FULL_NAMES[key]`, anchored to `charTooltip.anchorEl`
    - Pass `<CharBreakdownContent>` as children with the characteristic's `i`, `a`, `b`, computed `current`, and resolved talent name
    - Wire `onClose` to clear `charTooltip` state
    - _Requirements: 1.3, 1.4, 2.1, 2.2, 3.1, 3.3, 4.3_

  - [x] 5.3 Write property test for tooltip metadata correctness
    - **Property 4: Tooltip metadata correctness**
    - Generate random characteristic keys, render CharacterPage with tooltip open, verify `id` matches `"tooltip-char-{key}"` and title matches `CHAR_FULL_NAMES[key]`
    - Place test in `src/components/pages/__tests__/CharCurrentTooltip.property.test.tsx`
    - **Validates: Requirements 1.3, 3.1**

  - [x] 5.4 Write property test for aria-describedby linkage
    - **Property 5: Aria-describedby linkage**
    - Generate random characteristic keys, render with tooltip open, verify `aria-describedby` equals `"tooltip-char-{key}"` on the cell; render with tooltip closed, verify attribute absent
    - Place test in `src/components/pages/__tests__/CharCurrentTooltip.property.test.tsx`
    - **Validates: Requirements 3.2**

- [x] 6. Checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integration tests for end-to-end tooltip flows
  - [x] 7.1 Write integration tests for complete tooltip interactions
    - Test: click Current cell → tooltip shows correct breakdown → press Escape → tooltip closes
    - Test: characteristic with talent bonus (e.g., Warrior Born +5 WS) shows talent name in tooltip
    - Test: characteristic without talent bonus omits the "Talent Bonus" row
    - Test: clicking a different cell switches tooltip target
    - Test: tap on touch device opens tooltip, tap outside closes it
    - Place test in `src/components/pages/__tests__/CharCurrentTooltip.integration.test.tsx`
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 4.1, 4.2_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The shared `Tooltip` component already handles portal rendering, positioning, focus management, Escape/outside-click dismissal, and ARIA attributes — no new tooltip mechanism needed
- `fast-check` and `vitest` are already in devDependencies

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "2.3", "3.1"] },
    { "id": 2, "tasks": ["3.2", "5.1"] },
    { "id": 3, "tasks": ["5.2"] },
    { "id": 4, "tasks": ["5.3", "5.4"] },
    { "id": 5, "tasks": ["7.1"] }
  ]
}
```
