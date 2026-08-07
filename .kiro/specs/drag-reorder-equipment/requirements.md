# Requirements Document

## Introduction

This feature adds pointer-based drag-and-drop reordering to weapon cards and trapping cards. Players will be able to grab items via a drag handle and drag them to new positions in the list. The existing keyboard-accessible up/down chevron buttons remain as an accessibility fallback. The implementation must work on both desktop (mouse) and mobile/touch devices without relying on external drag-and-drop libraries.

## Glossary

- **Drag_System**: The pointer-event-based logic that tracks drag start, drag movement, and drop release to reorder list items
- **Drag_Handle**: The existing `DragHandle` component (`src/components/shared/DragHandle.tsx`) which contains the grip icon and up/down chevron buttons
- **Drop_Indicator**: A visual element (line, highlight, or gap) that shows the user where a dragged item will be placed upon release
- **Weapon_Card**: A card element rendered in `WeaponCards.tsx` displaying a single weapon's stats and actions
- **Trapping_Card**: A card element rendered in `CharacterPage.tsx` displaying a single trapping's name, encumbrance, and quantity
- **Card_List**: The CSS grid container holding either Weapon_Cards or Trapping_Cards
- **Pointer_Event**: A unified browser event model (PointerEvent API) covering mouse, touch, and pen input
- **Drag_Preview**: The visual representation of the item being dragged, following the pointer during a drag operation

## Requirements

### Requirement 1: Initiate Drag via Pointer on Drag Handle

**User Story:** As a player, I want to grab a weapon or trapping card by its drag handle grip icon so that I can begin repositioning it in the list.

#### Acceptance Criteria

1. WHEN a pointerdown event occurs on the Drag_Handle grip icon, THE Drag_System SHALL begin tracking pointer movement for that item
2. WHEN the pointer moves more than 5 pixels from the pointerdown origin, THE Drag_System SHALL transition the item into an active dragging state
3. WHILE the Drag_System is in an active dragging state, THE Drag_System SHALL apply a visual style to the dragged item indicating it has been lifted (elevated appearance via shadow or opacity change)
4. WHILE the Drag_System is in an active dragging state, THE Drag_System SHALL call setPointerCapture on the grip element to ensure continued tracking across element boundaries
5. IF a pointerdown event occurs outside the Drag_Handle grip icon, THEN THE Drag_System SHALL NOT initiate a drag operation

### Requirement 2: Visual Drop Indicator During Drag

**User Story:** As a player, I want to see where my item will land while dragging so that I can place it at the correct position.

#### Acceptance Criteria

1. WHILE the Drag_System is in an active dragging state, THE Drop_Indicator SHALL display at the insertion point closest to the current pointer position within the Card_List
2. WHEN the pointer moves between items in the Card_List, THE Drop_Indicator SHALL update its position to reflect the new potential drop target
3. THE Drop_Indicator SHALL be visually distinct from surrounding content (using the accent color or a contrasting line)
4. WHILE the pointer is outside the Card_List bounds, THE Drop_Indicator SHALL remain at the last valid insertion point

### Requirement 3: Complete Reorder on Pointer Release

**User Story:** As a player, I want the item to move to the indicated position when I release the drag so that the reorder is committed.

#### Acceptance Criteria

1. WHEN a pointerup event occurs while the Drag_System is in an active dragging state, THE Drag_System SHALL move the dragged item to the index indicated by the Drop_Indicator
2. WHEN the reorder completes, THE Drag_System SHALL persist the new order to character state via the updateCharacter mutator
3. WHEN the reorder completes, THE Drag_System SHALL remove all dragging visual styles and the Drop_Indicator
4. IF the pointer is released at the item's original position (no change in index), THEN THE Drag_System SHALL cancel the operation without modifying state
5. WHEN the drag operation completes, THE Drag_System SHALL release pointer capture

### Requirement 4: Cancel Drag Operation

**User Story:** As a player, I want to be able to cancel a drag so that accidental drags do not change my item order.

#### Acceptance Criteria

1. WHEN the Escape key is pressed while the Drag_System is in an active dragging state, THE Drag_System SHALL cancel the drag and return the item to its original position
2. WHEN a pointercancel event fires while the Drag_System is in an active dragging state, THE Drag_System SHALL cancel the drag and return the item to its original position
3. WHEN a drag is cancelled, THE Drag_System SHALL remove all dragging visual styles and the Drop_Indicator without modifying character state

### Requirement 5: Touch Device Support

**User Story:** As a mobile player, I want to drag-reorder items with touch gestures so that I can rearrange equipment on my phone or tablet.

#### Acceptance Criteria

1. WHILE a touch-initiated drag is active, THE Drag_System SHALL prevent the browser's default scroll behavior on the Card_List container
2. WHILE a touch-initiated drag is active, THE Drag_System SHALL suppress the browser's context menu (long-press menu)
3. THE Drag_Handle grip icon SHALL meet the 44×44 pixel minimum touch target size on touch devices (via CSS media query `hover: none`)
4. WHEN a touch drag crosses the Card_List boundary vertically, THE Drag_System SHALL auto-scroll the container in the direction of the pointer

### Requirement 6: Accessibility Fallback Preservation

**User Story:** As a player using assistive technology, I want to continue reordering items via up/down buttons so that drag-and-drop is not a mandatory interaction.

#### Acceptance Criteria

1. THE Drag_Handle SHALL continue to render the existing ChevronUp and ChevronDown buttons with their current keyboard-accessible behavior
2. THE ChevronUp and ChevronDown buttons SHALL remain focusable and operable via keyboard (Enter and Space keys)
3. WHEN the up or down button is activated, THE Drag_System SHALL NOT interfere with the button's existing reorder behavior
4. THE Drag_Handle SHALL include `aria-roledescription="sortable"` on the grip element to communicate drag capability to screen readers
5. WHEN a reorder completes (via drag or button), THE Drag_System SHALL announce the new position via an aria-live region (e.g., "Item moved to position 3 of 5")

### Requirement 7: Weapon Card List Integration

**User Story:** As a player, I want to drag-reorder my weapon cards so that I can arrange them in my preferred combat priority.

#### Acceptance Criteria

1. THE Drag_System SHALL support reordering within the Weapon_Card grid rendered in `WeaponCards.tsx`
2. WHEN a weapon is reordered, THE Drag_System SHALL invoke the existing `onReorderWeapon(fromIndex, toIndex)` callback
3. WHILE a Weapon_Card is in an active dragging state, THE Weapon_Card SHALL NOT trigger its expand/collapse tap behavior

### Requirement 8: Trapping Card List Integration

**User Story:** As a player, I want to drag-reorder my trapping cards so that I can organize my inventory in a logical order.

#### Acceptance Criteria

1. THE Drag_System SHALL support reordering within the Trapping_Card grid rendered in `CharacterPage.tsx`
2. WHEN a trapping is reordered via drag, THE Drag_System SHALL persist the new order by calling `updateCharacter` with the result of `reorderArray`
3. WHILE a Trapping_Card is in an active dragging state, THE Trapping_Card SHALL NOT trigger its edit or checkbox interactions

### Requirement 9: Trapping Card Checkbox Discoverability

**User Story:** As a player, I want to understand what the checkbox on each trapping card means so that I can use it correctly without guessing.

#### Acceptance Criteria

1. THE Trapping_Card SHALL display a contextual label or icon adjacent to the "stored on horse" checkbox that communicates its purpose without requiring hover or interaction
2. THE contextual indicator SHALL occupy no more than 24 pixels of horizontal width at rest to avoid crowding the Trapping_Card layout
3. WHEN the "stored on horse" checkbox is checked, THE Trapping_Card SHALL display a distinct visual treatment (gold border and background tint) to reinforce the state change
4. THE Trapping_Card text content (name, encumbrance, quantity) SHALL NOT be truncated as a result of the checkbox indicator
5. THE contextual indicator SHALL have a tooltip (on hover) or accessible label that reads "Stored on horse — does not count toward personal encumbrance"

### Requirement 10: Performance and Smoothness

**User Story:** As a player, I want dragging to feel smooth and responsive so that the interaction does not feel laggy or janky.

#### Acceptance Criteria

1. WHILE the Drag_System is in an active dragging state, THE Drag_System SHALL update the dragged item's visual position on every animation frame (using requestAnimationFrame or CSS transforms)
2. THE Drag_System SHALL NOT cause layout reflow during pointer movement (transforms and opacity only for drag visuals)
3. WHILE the Drag_System is in an active dragging state, THE Drag_System SHALL throttle DOM reordering to occur only when the target insertion index changes
