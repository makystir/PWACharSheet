# Implementation Plan: Mobile UI Optimization

## Overview

This plan implements mobile-first CSS overrides and minimal TypeScript behavioral changes to optimize the PWA Character Sheet for mobile viewports (320px–428px). All changes use `@media (max-width: 767px)` queries within existing CSS Modules, with secondary breakpoints at 399px and 359px for narrow devices. No new components or dependencies are introduced.

## Tasks

- [x] 1. Define global mobile CSS custom properties
  - [x] 1.1 Add mobile CSS custom properties to the global stylesheet
    - Add `--mobile-touch-min: 44px`, `--mobile-touch-lg: 48px`, `--mobile-font-min: 13px` inside a `@media (max-width: 767px)` override on `:root`
    - Add `clamp()` definitions for large display numbers (wound counts, advantage) scaling from 320px to 428px
    - Enforce minimum body font size of 14px and label/metadata minimum of 11px on mobile
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [x] 2. Optimize Navigation and PageContainer for mobile
  - [x] 2.1 Update Navigation.module.css for mobile touch targets and layout
    - Increase `--nav-height-mobile` to 64px
    - Set nav items min-height to 48px, icon size 22px minimum, label font 11px minimum
    - Add active state with top border accent and color differentiation
    - Add `padding-bottom: env(safe-area-inset-bottom)` for gesture indicator devices
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.3_

  - [x] 2.2 Update PageContainer.module.css for mobile spacing
    - Add `padding-bottom: calc(64px + 8px + env(safe-area-inset-bottom))` on mobile
    - Position scroll-to-top button above nav bar with 8px clearance
    - Ensure PageContainer is the only vertical scroll container
    - _Requirements: 2.2, 16.1, 16.3_

- [x] 3. Optimize CharacterPage for mobile viewports
  - [x] 3.1 Update CharacterPage.module.css for sub-tab bar and typography
    - Make sub-tab bar sticky at top of scroll area with min-height 44px and font 12px+
    - Add horizontal scroll for sub-tabs below 360px width
    - Set characteristic abbreviations to 13px bold, current value to 15px
    - Hide Bonus column below 360px
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3_

  - [x] 3.2 Update CharacterPage.module.css for table scroll and input sizing
    - Enable horizontal scroll on wide tables with `-webkit-overflow-scrolling: touch` and `overscroll-behavior: contain`
    - Set table cell font-size to 13px minimum
    - Set number inputs to min-width 44px, min-height 36px
    - Set dice buttons to 40×40px touch target
    - Add visible scroll indicator when horizontal scrolling is enabled
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 16.2_

  - [x] 3.3 Update CharacterPage.module.css for grid collapse on narrow viewports
    - Collapse `gridAutoFill` to `grid-template-columns: 1fr` below 400px
    - Collapse `movementFortuneGrid` to single column below 400px
    - Collapse `ambitionsGrid` to single column below 400px
    - Collapse `wealthEncGrid` to single column below 400px
    - _Requirements: 21.1, 21.2, 21.3, 21.4_

- [x] 4. Checkpoint - Verify navigation, layout, and character page changes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Optimize Card and shared components for mobile
  - [x] 5.1 Update Card.module.css for mobile padding
    - Set 10px padding, 8px gap between cards, 6px border-radius on mobile
    - Set section headers to minimum 14px font size
    - _Requirements: 4.1, 4.2, 4.3, 15.3_

  - [x] 5.2 Update EditableField.module.css and EditableField.tsx for mobile interaction
    - CSS: display state min-height 44px, read-only font 14px
    - CSS: edit state min-height 40px, font 16px (prevents iOS zoom)
    - CSS: visible tap affordance (border) on display state, hidden in edit mode
    - TSX: add `inputMode="numeric"` for number type fields
    - TSX: verify select-all on focus is working (already implemented)
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 18.1, 18.2, 18.3_

  - [x] 5.3 Update Picker.module.css for mobile modal sizing
    - Set modal to 95% width, 85% height on mobile
    - Set list items to min-height 44px with visible separator
    - Set search input to min-height 44px, font 16px
    - Set close button to 44×44px top-right position
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 5.4 Update ConfirmDialog.module.css for mobile button layout
    - Stack buttons vertically at full width, min-height 44px
    - Add 10px gap between buttons
    - Set message font to 15px
    - _Requirements: 22.1, 22.2, 22.3_

- [x] 6. Optimize Combat Dashboard for mobile
  - [x] 6.1 Update CombatDashboard.module.css for mobile layout
    - Ensure wounds/advantage/round display in single row without wrapping
    - Set ± buttons to 44×44px with 8px gap
    - Set condition badges to min-height 40px with wrapping flow layout
    - Set wound count to 28px font size on mobile
    - Set condition remove button to 44×44px with spacing from adjacent badges
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 20.2_

  - [x] 6.2 Add sticky positioning for CombatDashboard on mobile
    - Ensure Combat_Dashboard remains sticky at top of scroll area when combat is active
    - _Requirements: 17.2_

- [x] 7. Optimize Attack Flow and combat panels for mobile
  - [x] 7.1 Update AttackFlow.module.css for mobile weapon buttons and roll
    - Set weapon buttons to vertical stack (full-width) when >2 weapons on mobile
    - Set roll button to min-height 48px, full width
    - Set result header font to 14px
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 7.2 Update QuickRollBar.module.css for mobile touch targets
    - Set skill buttons to min-height 44px, padding 14px horizontal
    - Add scroll affordance (gradient fade on edges)
    - Set font-size to 13px
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 7.3 Update TakeDamagePanel.module.css for mobile input sizing
    - Set damage input to 48×48px, font 18px
    - Set location select to full-width, min-height 44px
    - Set apply button to full-width, min-height 48px
    - Ensure net wounds font at 28px
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 7.4 Update WeaponCards.module.css for mobile grid
    - Set grid-template-columns to 1fr on mobile (single column)
    - Set roll button to 48×48px
    - Set weapon name to 14px, stat values to 15px
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 7.5 Update ArmourMap.module.css for mobile cell sizing
    - Set location cells to 56×56px minimum
    - Set AP value font to 20px
    - Center grid horizontally, max-width 320px
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 8. Checkpoint - Verify combat component mobile optimizations
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement behavioral changes (TypeScript)
  - [x] 9.1 Update CombatPage.tsx to collapse non-essential panels by default on mobile
    - Add mobile detection (reuse existing `window.innerWidth < 768` pattern)
    - Default-collapse AmmoTracker, CriticalWoundsPanel, and RollHistoryPanel on mobile
    - _Requirements: 17.3_

  - [x] 9.2 Update FortuneResolvePanel.module.css for mobile button sizing
    - Set buttons to min-height 40px, min-width 80px
    - Collapse to single-column below 360px
    - Set values font to 20px
    - _Requirements: 19.1, 19.2, 19.3_

  - [x] 9.3 Update ConditionPicker.module.css for mobile modal
    - Set grid with min 2 columns, buttons min-height 48px
    - Set modal to 95% width, 80% height
    - _Requirements: 20.1, 20.3_

  - [x] 9.4 Update CombatPage for Start/End button and Combat Dashboard sticky mobile styles
    - Ensure Start/End Combat button renders full-width at min-height 48px on mobile
    - _Requirements: 17.1_

- [x] 10. Write mobile integration tests
  - [x] 10.1 Write test for Navigation mobile touch targets and height
    - Render at 375px, assert nav height 64px, touch targets 48px, icon/label sizing
    - _Requirements: 1.1, 1.2, 1.3, 2.1_

  - [x] 10.2 Write test for CharacterPage mobile sub-tab and grid collapse
    - Render at 375px, assert sticky sub-tab, grid collapse at 400px and below
    - _Requirements: 3.1, 3.3, 21.1_

  - [x] 10.3 Write test for CombatDashboard mobile layout
    - Render at 375px, assert button sizes 44px, condition badges, wound font 28px
    - _Requirements: 7.2, 7.3, 7.4_

  - [x] 10.4 Write test for AttackFlow mobile weapon layout and collapse
    - Mock `window.innerWidth` < 768, assert vertical weapon buttons and collapse behavior
    - _Requirements: 8.1, 8.4_

  - [x] 10.5 Write test for EditableField mobile inputMode and tap target
    - Render number-type field, assert `inputMode="numeric"` attribute and min-height 44px
    - _Requirements: 14.2, 18.1_

  - [x] 10.6 Write test for ConfirmDialog mobile button stacking
    - Render at 375px, assert buttons are full-width and vertically stacked
    - _Requirements: 22.1, 22.2_

  - [x] 10.7 Write test for Picker modal mobile sizing
    - Render at 375px, assert modal 95% width, list items min-height 44px
    - _Requirements: 13.1, 13.2_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- All CSS changes use `@media (max-width: 767px)` as the primary mobile breakpoint
- Secondary breakpoint `@media (max-width: 399px)` used for grid collapse (Requirement 21)
- Tertiary breakpoint `@media (max-width: 359px)` used for sub-tab scroll and Bonus column hiding
- No new components or dependencies are introduced
- Tests use vitest + @testing-library/react with mocked `window.matchMedia`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "5.1"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "5.2", "5.3", "5.4"] },
    { "id": 3, "tasks": ["6.1", "6.2", "7.1", "7.2", "7.3", "7.4", "7.5", "9.2", "9.3"] },
    { "id": 4, "tasks": ["9.1", "9.4"] },
    { "id": 5, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5", "10.6", "10.7"] }
  ]
}
```
