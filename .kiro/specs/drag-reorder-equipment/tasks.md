# Implementation Plan: Drag-Reorder Equipment

## Overview

Implement pointer-event-driven drag-and-drop reordering for weapon cards and trapping cards using a custom `useDragReorder` hook. The hook encapsulates a state machine (idle → tracking → dragging → idle), PointerEvent API integration, CSS transform-based movement, auto-scroll, and accessibility announcements. Integration targets are `WeaponCards.tsx` and the trapping section of `CharacterPage.tsx`, augmenting the existing `DragHandle` component with pointer event handlers while preserving the keyboard-accessible chevron buttons as fallback.

## Tasks

- [x] 1. Create the `useDragReorder` hook and supporting types
  - [x] 1.1 Implement `useDragReorder` hook in `src/hooks/useDragReorder.ts`
    - Define `UseDragReorderOptions<T>`, `DragState`, and `UseDragReorderResult` interfaces per the design
    - Implement the state machine: idle → tracking (on pointerdown) → dragging (after 5px threshold) → idle (on drop/cancel)
    - On pointerdown: record start position, pointerId; call `setPointerCapture` on grip element
    - On pointermove: compute distance from origin; transition to dragging if > 5px; update `offsetY` via CSS transform
    - On pointerup: compute final drop index; call `onReorder(dragIndex, dropIndex)` if indices differ; release pointer capture
    - On Escape keydown or pointercancel: cancel drag, reset all state without calling `onReorder`
    - Cache item bounding rects at drag start for drop index computation (find gap closest to pointer Y center)
    - Implement auto-scroll when pointer approaches container top/bottom edges using `requestAnimationFrame`
    - Throttle drop index updates: only update `dropIndex` when computed index changes
    - Suppress `contextmenu` events while drag is active (touch long-press menu)
    - Return `getGripProps(index)`, `getItemProps(index)`, `dragState`, `dropIndicatorIndex`, and `announcementText`
    - Generate `announcementText` on successful reorder: `"${itemLabel} moved to position ${toIndex + 1} of ${totalItems}"`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 5.1, 5.2, 5.4, 10.1, 10.2, 10.3_

  - [x] 1.2 Write property test: Drag Initiation Discrimination
    - **Property 1: Drag Initiation Discrimination**
    - Generate random element identifiers (grip vs non-grip targets)
    - Verify tracking starts if and only if target is the grip element or a descendant of it
    - Place test in `src/hooks/__tests__/useDragReorder.property.test.ts`
    - **Validates: Requirements 1.1, 1.5**

  - [x] 1.3 Write property test: Movement Threshold Activation
    - **Property 2: Movement Threshold Activation**
    - Generate random (dx, dy) pairs with `Math.sqrt(dx² + dy²)` above and below 5px
    - Verify state transitions to dragging if and only if distance > 5
    - Place test in `src/hooks/__tests__/useDragReorder.property.test.ts`
    - **Validates: Requirements 1.2**

  - [x] 1.4 Write property test: Insertion Index Correctness
    - **Property 3: Insertion Index Correctness**
    - Generate random list item heights (10–100px each) and pointer Y positions within the container
    - Compute expected index as count of item midpoints above pointer position, clamped to [0, N]
    - Verify hook's computed insertion index matches expected
    - Place test in `src/hooks/__tests__/useDragReorder.property.test.ts`
    - **Validates: Requirements 2.1, 2.2, 2.4**

  - [x] 1.5 Write property test: Cancellation Resets State
    - **Property 4: Cancellation Resets State**
    - Generate random drag states (various dragIndex, dropIndex, offsetY values)
    - Apply Escape keydown or pointercancel event
    - Verify state returns to idle with `dragIndex = null`, `dropIndex = null`, `offsetY = 0` and `onReorder` is NOT called
    - Place test in `src/hooks/__tests__/useDragReorder.property.test.ts`
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [x] 1.6 Write property test: Aria-Live Announcement Correctness
    - **Property 5: Aria-Live Announcement Correctness**
    - Generate random (fromIndex, toIndex, listLength) triples where `fromIndex !== toIndex` and both in [0, listLength)
    - Verify announcement text contains `"position ${toIndex + 1} of ${listLength}"`
    - Place test in `src/hooks/__tests__/useDragReorder.property.test.ts`
    - **Validates: Requirements 6.5**

  - [x] 1.7 Write property test: Throttled Index Updates
    - **Property 6: Throttled Index Updates**
    - Generate sequences of pointer Y positions that all resolve to the same insertion index
    - Verify the drop indicator index is set exactly once (not re-set for same-index movements)
    - Place test in `src/hooks/__tests__/useDragReorder.property.test.ts`
    - **Validates: Requirements 10.3**

- [x] 2. Create presentational components for drag UI
  - [x] 2.1 Implement `DropIndicator` component in `src/components/shared/DropIndicator.tsx`
    - Create a small presentational component that renders a horizontal accent-colored line (2px height, full width)
    - Accept prop `visible: boolean`; render nothing when not visible
    - Create CSS module `DropIndicator.module.css` with accent color styling and transition
    - _Requirements: 2.1, 2.3_

  - [x] 2.2 Implement `AriaLiveAnnouncer` component in `src/components/shared/AriaLiveAnnouncer.tsx`
    - Create a visually-hidden component with `aria-live="assertive"` and `role="status"`
    - Accept prop `message: string`; render the message text inside the hidden region
    - Use existing visually-hidden pattern (clip-rect, 1px sizing)
    - _Requirements: 6.5_

  - [x] 2.3 Write unit tests for `DropIndicator` and `AriaLiveAnnouncer`
    - Test `DropIndicator` renders the accent line when `visible={true}`, renders nothing when `visible={false}`
    - Test `AriaLiveAnnouncer` renders message in an `aria-live` region
    - Place tests in `src/components/shared/__tests__/DragComponents.test.tsx`
    - _Requirements: 2.3, 6.5_

- [x] 3. Update `DragHandle` to accept grip pointer event props
  - [x] 3.1 Extend `DragHandle` component with `gripProps` parameter
    - Add optional `gripProps` to `DragHandleProps` interface (matching design: `onPointerDown`, `aria-roledescription`, `style`)
    - Spread `gripProps` onto the grip `<span>` element
    - Add `touch-action: none` to the grip when `gripProps` is provided (prevents browser scroll on touch)
    - Ensure ChevronUp and ChevronDown buttons remain independently focusable and operable
    - Update `DragHandle.module.css`: add touch target sizing (44×44px minimum) under `@media (hover: none)` for the grip
    - _Requirements: 1.1, 5.3, 6.1, 6.2, 6.3, 6.4_

  - [x] 3.2 Write unit tests for updated `DragHandle`
    - Test grip has `aria-roledescription="sortable"` when gripProps provided
    - Test `onPointerDown` is called on grip pointer down
    - Test ChevronUp/ChevronDown still fire `onMoveUp`/`onMoveDown` on Enter/Space
    - Place test in `src/components/shared/__tests__/DragHandle.test.tsx`
    - _Requirements: 6.1, 6.2, 6.4_

- [x] 4. Checkpoint - Verify hook and components in isolation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Integrate drag-reorder into `WeaponCards.tsx`
  - [x] 5.1 Wire `useDragReorder` into `WeaponCards` component
    - Add a container ref on the `.cardGrid` div
    - Call `useDragReorder` with `items: weapons`, `onReorder: onReorderWeapon`, and the container ref
    - Pass `getGripProps(i)` as `gripProps` to each `DragHandle` instance
    - Apply `getItemProps(i)` to each weapon card div (className and style for elevated/dragging appearance)
    - Render `<DropIndicator visible={...}>` between weapon cards at `dropIndicatorIndex`
    - Render `<AriaLiveAnnouncer message={announcementText} />` inside the Card container
    - Suppress card expand/collapse `onClick` while `dragState.status === 'dragging'`
    - Add CSS class for elevated dragging state (box-shadow, slight scale, z-index) in `WeaponCards.module.css`
    - _Requirements: 1.3, 7.1, 7.2, 7.3, 10.1, 10.2_

  - [x] 5.2 Write integration tests for weapon card drag-reorder
    - Test full drag lifecycle: pointerdown on grip → pointermove > 5px → pointerup → verify `onReorderWeapon` called with correct (fromIndex, toIndex)
    - Test cancel via Escape mid-drag: verify no state mutation
    - Test that card expand/collapse is suppressed during drag
    - Place test in `src/components/combat/__tests__/WeaponCards.dragReorder.test.tsx`
    - _Requirements: 7.1, 7.2, 7.3, 4.1_

- [x] 6. Integrate drag-reorder into `CharacterPage.tsx` trappings section
  - [x] 6.1 Wire `useDragReorder` into trappings grid in `CharacterPage.tsx`
    - Add a container ref on the `.trappingsGrid` div
    - Call `useDragReorder` with `items: character.trappings`, `onReorder` calling `updateCharacter` with `reorderArray`, and the container ref
    - Pass `getGripProps(i)` as `gripProps` to each trapping's `DragHandle`
    - Apply `getItemProps(i)` to each trapping card div
    - Render `<DropIndicator>` between trapping cards at `dropIndicatorIndex`
    - Render `<AriaLiveAnnouncer>` inside the trappings section
    - Suppress edit button and checkbox interactions while `dragState.status === 'dragging'`
    - Add CSS class for elevated dragging state in `CharacterPage.module.css`
    - _Requirements: 1.3, 8.1, 8.2, 8.3, 10.1, 10.2_

  - [x] 6.2 Write integration tests for trapping card drag-reorder
    - Test full drag lifecycle: pointerdown → pointermove → pointerup → verify `updateCharacter` called with reordered trappings
    - Test cancel via Escape: verify character state unchanged
    - Test that edit and checkbox are suppressed during active drag
    - Place test in `src/components/pages/__tests__/CharacterPage.dragTrappings.test.tsx`
    - _Requirements: 8.1, 8.2, 8.3, 4.1_

- [x] 7. Checkpoint - Verify integrations work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement trapping card checkbox discoverability (Requirement 9)
  - [x] 8.1 Add horse icon indicator to trapping card in `CharacterPage.tsx`
    - Add a small horse icon (from lucide-react or inline SVG) adjacent to the "stored on horse" checkbox
    - Icon occupies no more than 24px horizontal width
    - Add tooltip on hover: "Stored on horse — does not count toward personal encumbrance"
    - Add `aria-label` matching the tooltip text on the icon/checkbox group
    - When checkbox is checked, apply gold border and background tint via CSS class (`.trappingCardHorse` style update)
    - Ensure trapping text content (name, enc, qty) is NOT truncated by the indicator
    - Update `CharacterPage.module.css` with indicator styles and gold treatment
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 8.2 Write unit tests for trapping card horse indicator
    - Test horse icon renders adjacent to checkbox
    - Test tooltip text is correct
    - Test gold border class applied when `storedOnHorse` is true
    - Test trapping name is not truncated (text-overflow not active)
    - Place test in `src/components/pages/__tests__/TrappingCard.horse.test.tsx`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the six universal correctness properties defined in the design document
- Unit tests validate specific examples and edge cases
- `fast-check` and `vitest` are already in devDependencies
- The existing `reorderArray` utility in `src/logic/reorder.ts` is reused (no need to re-implement)
- The existing `DragHandle` component is extended (not replaced) to maintain backward compatibility
- CSS transforms are used for drag movement to avoid layout reflow (performance requirement 10.2)
- The hook uses `setPointerCapture` for cross-boundary tracking and `requestAnimationFrame` for smooth animation

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.2"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "2.3", "3.1"] },
    { "id": 2, "tasks": ["3.2", "5.1", "6.1"] },
    { "id": 3, "tasks": ["5.2", "6.2", "8.1"] },
    { "id": 4, "tasks": ["8.2"] }
  ]
}
```
