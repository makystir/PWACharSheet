# Implementation Plan: Reorderable Sub-Tabs

## Overview

This implementation extends the existing `SubTabBar` component to support user-driven tab reordering via an edit mode with arrow buttons. The work is organized into: (1) a pure utility module for persistence and reconciliation, (2) a React hook for state management, (3) extending the SubTabBar component with edit mode UI, (4) integrating into page components, and (5) wiring up accessibility and URL hash routing behavior.

## Tasks

- [x] 1. Create tab order store utility module
  - [x] 1.1 Implement `src/logic/tab-order-store.ts` with `validateStoredValue`, `loadTabOrder`, `saveTabOrder`, `removeTabOrder`, and `reconcileTabOrder` functions
    - Use localStorage key format `tabOrder:<pageKey>`
    - `validateStoredValue`: returns parsed string array or null if value is not valid JSON, not an array, or contains non-string/empty elements
    - `loadTabOrder`: reads from localStorage, validates, returns array or null
    - `saveTabOrder`: serializes array as JSON, writes to localStorage, returns false if write fails (try/catch around setItem)
    - `removeTabOrder`: removes key from localStorage, silently catches errors
    - `reconcileTabOrder`: deduplicates stored (keep first), filters to IDs in defaults, appends new IDs from defaults in their relative order, returns reconciled array
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 1.2 Write property tests for tab order store (`src/logic/__tests__/tab-order-store.property.test.ts`)
    - **Property 1: Serialization Round-Trip** — For any valid tab order array and page key, save then load returns identical array
    - **Property 2: Invalid Storage Values Fall Back** — For any invalid stored value, loadTabOrder returns null
    - **Property 3: Page Independence** — Saving to one page key does not affect another page key's load
    - **Property 5: Move Swaps Adjacent Tabs** — moveLeft/moveRight swap exactly the two adjacent elements
    - **Property 10: Reconciliation Correctness** — Result contains exactly default IDs, preserves stored relative order, appends new IDs in default order, no duplicates
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 3.2, 3.3, 5.1, 5.2, 5.5**

  - [x] 1.3 Write unit tests for tab order store (`src/logic/__tests__/tab-order-store.test.ts`)
    - Test specific known input/output pairs for `validateStoredValue` (null, undefined, number, object, array with numbers, valid array)
    - Test `reconcileTabOrder` with known scenarios: all IDs obsolete, some new IDs, duplicates in stored
    - Test `saveTabOrder` failure when localStorage throws
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.3, 5.5_

- [x] 2. Create useTabOrder hook
  - [x] 2.1 Implement `src/hooks/useTabOrder.ts` with the `useTabOrder` hook
    - Accept `pageKey` and `defaultTabs` options
    - On mount: load stored order, reconcile with defaults, persist if reconciliation changed anything
    - Expose `orderedTabs`, `isEditMode`, `toggleEditMode`, `moveLeft`, `moveRight`, `resetOrder`, `isDefaultOrder`, `saveError`
    - `toggleEditMode`: when exiting edit mode, persist current order via `saveTabOrder`
    - `moveLeft(index)`: swap tab at index with tab at index-1 (no-op if index is 0)
    - `moveRight(index)`: swap tab at index with tab at index+1 (no-op if last)
    - `resetOrder`: call `removeTabOrder`, revert to defaults
    - Cleanup effect: if unmounting while in edit mode, persist current order
    - Set `saveError` to true if `saveTabOrder` returns false; reset on next successful save
    - _Requirements: 1.1, 1.2, 1.5, 2.2, 2.3, 2.4, 2.6, 3.2, 3.3, 4.2, 4.3_

  - [x] 2.2 Write property tests for useTabOrder hook (`src/hooks/__tests__/useTabOrder.property.test.tsx`)
    - **Property 4: Navigation Suppressed in Edit Mode** — onTabChange callback is not invoked while edit mode is active
    - **Property 8: Reset Restores Default Order** — After reset, orderedTabs matches defaultTabs
    - **Property 9: Reset Button Disabled When at Default** — isDefaultOrder is true iff current order equals defaults
    - **Property 12: Edit Mode Does Not Update URL Hash** — Reorder operations during edit mode don't change URL hash
    - **Validates: Requirements 2.3, 4.2, 4.5, 6.6**

  - [x] 2.3 Write unit tests for useTabOrder hook (`src/hooks/__tests__/useTabOrder.test.tsx`)
    - Test save failure scenario (mock localStorage.setItem to throw)
    - Test unmount persistence (mount in edit mode, unmount, verify save called)
    - Test reconciliation on mount with stale stored data
    - _Requirements: 1.5, 2.6, 5.4_

- [x] 3. Checkpoint - Ensure core logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Extend SubTabBar component with edit mode UI
  - [x] 4.1 Extend `SubTabBarProps` interface in `src/components/shared/SubTabBar.tsx` to accept optional `editMode` prop
    - Add the `editMode` prop shape: `{ isActive, onToggle, onMoveLeft, onMoveRight, onReset, isDefaultOrder, saveError }`
    - When `editMode` is undefined, component renders exactly as before (backward compatible)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 4.2 Implement edit mode toggle button and reset button in `SubTabBar`
    - Render toggle button outside the tablist container using Pencil icon (inactive) / Check icon (active) from lucide-react
    - Render reset button using RotateCcw icon, disabled when `isDefaultOrder` is true
    - Toggle button aria-label: "Edit tab order" / "Done editing tab order" based on state
    - Both buttons meet 44×44px minimum touch target on viewports ≤768px
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 4.1, 4.4, 4.5, 7.3_

  - [x] 4.3 Implement arrow buttons on tabs in edit mode
    - Render ChevronLeft and ChevronRight buttons on each tab when edit mode is active
    - Disable left-arrow on first tab (aria-disabled="true"), disable right-arrow on last tab
    - Arrow buttons meet 44×44px minimum touch target on viewports ≤768px
    - Click handlers call `onMoveLeft(index)` / `onMoveRight(index)`
    - Suppress tab navigation clicks while edit mode is active (don't call onTabChange)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 2.3_

  - [x] 4.4 Implement tab move animation and focus management
    - Add CSS transition (`transform 150ms ease`) for tab position changes during reorder
    - After a move, programmatically set focus to the same arrow button on the moved tab in its new position
    - _Requirements: 3.7, 3.8, 7.5_

  - [x] 4.5 Implement accessibility features for reorder controls
    - Set aria-label on each arrow button: "Move {tab.label} tab left" / "Move {tab.label} tab right"
    - Add an aria-live="polite" region that announces "{tab.label} tab, position {n} of {total}" after each move
    - Announce order reset via the aria-live region: "Tab order reset to default"
    - Ensure DOM focus order of tab elements matches current visual display order
    - _Requirements: 7.1, 7.2, 7.4, 7.6, 7.7, 4.6_

  - [x] 4.6 Update `SubTabBar.module.css` with edit mode styles
    - Add styles for edit mode container, arrow buttons, toggle button, reset button
    - Add animation/transition styles for tab movement
    - Add 44px touch target media queries for ≤768px viewports
    - Add disabled state styling for boundary arrow buttons
    - _Requirements: 2.1, 2.5, 3.4, 3.5, 3.6, 3.7, 4.1, 4.4_

  - [x] 4.7 Write property tests for SubTabBar reorder rendering (`src/components/shared/__tests__/SubTabBar.reorder.property.test.tsx`)
    - **Property 6: Boundary Arrows Disabled** — First tab's left-arrow and last tab's right-arrow have aria-disabled="true"
    - **Property 7: Focus Follows Moved Tab** — After move, activeElement is the same arrow button type on the moved tab
    - **Property 13: Arrow Button Aria-Labels Contain Direction and Tab Label** — Each arrow's aria-label includes direction word and tab label
    - **Property 14: Move Announcements via Aria-Live** — aria-live region contains tab label and new numeric position after move
    - **Property 15: DOM Focus Order Matches Visual Display Order** — Focusable elements are in visual order
    - **Validates: Requirements 3.4, 3.5, 3.8, 7.1, 7.2, 7.5, 7.6, 7.7**

  - [x] 4.8 Write unit tests for SubTabBar edit mode (`src/components/shared/__tests__/SubTabBar.reorder.test.tsx`)
    - Test toggle button rendering and icon switch
    - Test reset button disabled state and announcement
    - Test animation class presence on moved tabs
    - Test 44px touch targets at mobile viewport via computed styles
    - _Requirements: 2.1, 2.2, 3.7, 4.1, 4.6_

- [x] 5. Checkpoint - Ensure SubTabBar tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Integrate into page components and URL hash routing
  - [x] 6.1 Integrate `useTabOrder` hook into CharacterPage, RetinuePage, and EstatePage
    - Import `useTabOrder` in each page component
    - Pass `pageKey` and `defaultTabs` to the hook
    - Pass `orderedTabs` and `editMode` props to SubTabBar
    - Wire `onTabChange` to existing hash navigation (using `useHashRoute`)
    - Show transient toast via existing `Toast` component when `saveError` is true
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.1, 2.2, 2.4_

  - [x] 6.2 Ensure URL hash routing uses tab IDs independent of display order
    - Verify existing `useHashRoute` uses tab IDs (not positions) in `#<pageKey>/<tabId>` format
    - Confirm hash navigation activates the correct tab regardless of current display position
    - Ensure hashchange events (back/forward) activate the correct tab in reordered lists
    - Ensure SubTabBar does not update URL hash during edit mode reorder actions
    - Fall back to default sub-tab if hash references a non-existent tab ID
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 6.3 Write integration tests for page-level reorder behavior (`src/components/shared/__tests__/SubTabBar.integration.test.tsx`)
    - Test full page render with reordered tabs displays correct order
    - Test hash navigation with custom order activates correct panel
    - Test cross-page independence (reorder on one page doesn't affect another)
    - Test edit mode exit on navigation persists order
    - **Property 11: Hash Routes Use Tab IDs Regardless of Display Order**
    - **Validates: Requirements 6.1, 6.2, 6.5, 1.4, 2.6**

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing SubTabBar component remains backward compatible — pages that don't pass `editMode` prop see no change
- The `useHashRoute` hook already exists in `src/hooks/useHashRoute.ts` and should be leveraged rather than reimplemented

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.6"] },
    { "id": 5, "tasks": ["4.4", "4.5"] },
    { "id": 6, "tasks": ["4.7", "4.8"] },
    { "id": 7, "tasks": ["6.1", "6.2"] },
    { "id": 8, "tasks": ["6.3"] }
  ]
}
```
