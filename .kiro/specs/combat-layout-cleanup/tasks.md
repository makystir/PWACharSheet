# Implementation Plan: Combat Layout Cleanup

## Overview

This implementation eliminates the two-column sidebar layout on the Combat Page (desktop) and replaces it with a single-column vertical flow: Segmented Control (sticky) → Combat Dashboard (full-width banner) → Tab Content Area (full-width). The work involves removing grid wrappers and duplicate CombatDashboard renders from `CombatPage.tsx`, updating `CombatPage.module.css` to remove column styles and add sticky segmented control behaviour, updating `CombatDashboard.module.css` for desktop horizontal banner mode, and writing integration tests to prevent regression.

## Tasks

- [x] 1. Remove two-column grid layout from CombatPage
  - [x] 1.1 Refactor CombatPage.tsx to eliminate two-column desktop rendering
    - Remove the `combatTwoColumn` wrapper div and its conditional `className` logic
    - Remove the `combatLeftColumn` wrapper div and its entire contents (the desktop-only `CombatDashboard` render)
    - Remove the `combatRightColumn` wrapper div (keep its children, unwrapped)
    - Remove the `isDesktop && inCombat && combatMode !== 'status'` conditional branch that renders a duplicate `CombatDashboard` in the left column
    - Render a single `CombatDashboard` instance for all desktop modes (Attack/Defend/Status) between the Segmented Control and the Tab Content Area
    - Preserve the existing mobile/tablet compact sticky `CombatDashboard` render (the `!isDesktop && inCombat && combatMode !== 'status'` block) unchanged
    - Ensure render order is: Segmented Control → CombatDashboard (desktop full or mobile compact) → Tab Content panels
    - _Requirements: 1.1, 1.2, 2.1, 5.1, 5.2, 5.3_

  - [x] 1.2 Update CombatPage.module.css to remove column styles and add sticky segmented control
    - Remove `.combatTwoColumn` class and its `@media (min-width: 1025px)` grid rule (`grid-template-columns: 320px 1fr`)
    - Remove `.combatLeftColumn` class (including `position: sticky; top: 0`)
    - Remove `.combatRightColumn` class
    - Add a `.segmentedControlSticky` class with `position: sticky; top: 0; z-index: 20; background: var(--bg-primary)` scoped to `@media (min-width: 1025px)`
    - Apply `.segmentedControlSticky` to the segmented control wrapper in `CombatPage.tsx`
    - Ensure the compact sticky dashboard (`.compactDashboardSticky`) for mobile/tablet remains unchanged
    - _Requirements: 1.1, 7.1, 7.2, 7.3_

- [x] 2. Update CombatDashboard CSS for desktop banner mode
  - [x] 2.1 Add desktop horizontal banner styles to CombatDashboard.module.css
    - Add a `@media (min-width: 1025px)` block that styles `.dashboardGroups` as a horizontal flex-wrap layout distributing subsections across the full width
    - Ensure `.conditionRow` and `.conditionRowSpaced` use `flex-wrap: wrap` and are not constrained to a fixed width at any viewport
    - Apply compact spacing (reduced padding/gaps) on desktop to keep the dashboard height under ~250px (excluding conditions)
    - Add a visible bottom border or spacing separator to `.dashboard` on desktop (e.g., `border-bottom: 1px solid var(--card-border); margin-bottom: 16px`)
    - Confirm the dashboard is NOT sticky on desktop (remove any `position: sticky` from `.dashboard` on desktop, keeping it only for mobile ≤767px)
    - Do not modify any existing mobile styles (max-width: 767px or max-width: 1024px)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 6.1, 6.2, 6.3, 8.1_

  - [x] 2.2 Ensure visual separation between sections
    - Add consistent vertical spacing (gap) between panels in the Tab Content Area (verify `.sectionGap` or add explicit gap)
    - Verify the Segmented Control has clear visual separation from the Combat Dashboard below it (spacing or border)
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 3. Checkpoint - Verify build passes and no visual regressions
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Write integration tests for new layout
  - [x] 4.1 Write integration tests verifying single-column layout structure
    - Test that when `inCombat=true` on desktop viewport, the DOM does not contain a `.combatTwoColumn` class element
    - Test that `CombatDashboard` renders exactly once in the component tree (no duplicate left-column instance)
    - Test render order: Segmented Control appears before CombatDashboard, which appears before tab content panels
    - Test that on mobile/tablet viewport the compact sticky dashboard still renders for Attack/Defend modes
    - _Requirements: 1.1, 1.2, 3.1, 5.1, 5.2, 5.3_

  - [x] 4.2 Write integration tests for desktop sticky segmented control and dashboard behaviour
    - Test that the segmented control element has the `.segmentedControlSticky` class on desktop viewports
    - Test that the dashboard element does NOT have sticky positioning on desktop
    - Test that all three tabs (Attack, Defend, Status) render their respective panels at full width
    - _Requirements: 3.2, 3.3, 3.4, 7.1, 7.2, 7.3_

- [x] 5. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The design has no Correctness Properties section — property-based tests are not applicable for this CSS/layout refactoring
- Existing tests (`CombatPage.integration.test.tsx`, `CombatDashboard.mobile.test.tsx`) should continue passing to confirm no mobile regression
- No data model or logic changes are needed — this is purely presentational (CSS + JSX structure)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["4.2"] }
  ]
}
```
