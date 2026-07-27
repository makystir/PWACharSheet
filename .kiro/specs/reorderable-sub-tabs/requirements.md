# Requirements Document

## Introduction

This feature allows players to reorder the sub-tabs within each page (Character, Retinue, Estate) to match their personal workflow preferences. The reordering persists across sessions via localStorage and gracefully handles tab additions or removals in future updates. The interaction mechanism uses an "edit mode" with arrow buttons, prioritizing simplicity and touch-friendliness over drag-and-drop complexity.

## Glossary

- **SubTabBar**: The shared React component (`src/components/shared/SubTabBar.tsx`) that renders a horizontal row of tab buttons for navigating sub-sections within a page
- **Tab_Order**: A persisted array of tab IDs representing the user's preferred display sequence for a specific page
- **Edit_Mode**: A UI state in which the SubTabBar displays reordering controls (arrow buttons) instead of standard tab navigation
- **Tab_Order_Store**: The localStorage-backed persistence layer that saves and retrieves per-page tab order preferences
- **Default_Order**: The original tab sequence defined in source code for each page, used as the fallback when no custom order exists
- **Page_Key**: A unique string identifier for each page that uses SubTabBar (e.g., "character", "retinue", "estate"), used as the storage key

## Requirements

### Requirement 1: Persist Tab Order Per Page

**User Story:** As a player, I want my custom tab arrangement to be saved, so that I see my preferred order every time I return to a page.

#### Acceptance Criteria

1. WHEN a player completes a tab reorder action on a page, THE Tab_Order_Store SHALL serialize the new Tab_Order array as JSON and save it to localStorage keyed by the Page_Key
2. WHEN a page with SubTabBar loads, THE Tab_Order_Store SHALL retrieve the stored Tab_Order for that Page_Key and apply it to the SubTabBar display sequence
3. IF localStorage is unavailable or the stored value fails validation (not valid JSON, not an array, or contains any element that is not a string), THEN THE Tab_Order_Store SHALL fall back to the Default_Order without displaying an error to the player
4. THE Tab_Order_Store SHALL store each page's Tab_Order independently so that reordering on one page does not affect other pages
5. IF the Tab_Order_Store fails to write to localStorage (due to quota exceeded or unavailability), THEN THE Tab_Order_Store SHALL retain the reordered tabs in the current session view and indicate to the player that the order could not be saved

### Requirement 2: Enter and Exit Edit Mode

**User Story:** As a player, I want to toggle an edit mode on the tab bar, so that I can rearrange tabs without accidentally navigating away.

#### Acceptance Criteria

1. THE SubTabBar SHALL display an edit mode toggle button positioned outside the tablist container and visually differentiated from tab buttons by a distinct shape or icon
2. WHEN the player activates the edit mode toggle, THE SubTabBar SHALL enter Edit_Mode and display reordering controls (left-arrow and right-arrow buttons) on each tab within 200ms
3. WHILE in Edit_Mode, THE SubTabBar SHALL suppress tab navigation so that tapping a tab does not switch the active content and the currently active tab remains highlighted
4. WHEN the player deactivates the edit mode toggle, THE SubTabBar SHALL exit Edit_Mode, hide reordering controls, and persist the current Tab_Order to the Tab_Order_Store
5. THE edit mode toggle button SHALL meet the 44×44px minimum touch target size on viewports 768px wide or narrower
6. IF the player navigates away from the page while Edit_Mode is active, THEN THE SubTabBar SHALL exit Edit_Mode and persist the current Tab_Order before unmounting

### Requirement 3: Reorder Tabs via Arrow Buttons

**User Story:** As a player, I want to move tabs left or right using arrow buttons, so that I can arrange them in my preferred order with a simple, reliable interaction.

#### Acceptance Criteria

1. WHILE in Edit_Mode, THE SubTabBar SHALL display a left-arrow button and a right-arrow button on each tab
2. WHEN the player taps the left-arrow button on a tab, THE SubTabBar SHALL move that tab one position to the left in the display order and update the Tab_Order accordingly
3. WHEN the player taps the right-arrow button on a tab, THE SubTabBar SHALL move that tab one position to the right in the display order and update the Tab_Order accordingly
4. WHILE a tab is in the leftmost position, THE SubTabBar SHALL disable the left-arrow button for that tab so that it is not interactive and is visually distinguished as inactive
5. WHILE a tab is in the rightmost position, THE SubTabBar SHALL disable the right-arrow button for that tab so that it is not interactive and is visually distinguished as inactive
6. WHILE the viewport width is 768px or narrower, THE arrow buttons SHALL have a minimum touch target size of 44×44px
7. WHEN a tab is moved, THE SubTabBar SHALL animate the tab to its new position using a sliding transition lasting between 150ms and 300ms
8. WHEN a tab is moved via an arrow button, THE SubTabBar SHALL move focus to the same arrow button on the moved tab in its new position so the player can perform consecutive moves without re-targeting

### Requirement 4: Reset Tab Order to Default

**User Story:** As a player, I want to reset the tab order back to the original arrangement, so that I can undo all my customizations if I change my mind.

#### Acceptance Criteria

1. WHILE in Edit_Mode, THE SubTabBar SHALL display a reset button that is visually distinct from arrow buttons and tab buttons
2. WHEN the player activates the reset button, THE SubTabBar SHALL immediately revert the displayed tab order to the Default_Order while preserving the currently active tab selection
3. WHEN the player activates the reset button, THE Tab_Order_Store SHALL remove the stored Tab_Order for the current Page_Key
4. THE reset button SHALL meet the 44px minimum touch target size on mobile viewports
5. IF the current Tab_Order already matches the Default_Order, THEN THE SubTabBar SHALL disable the reset button
6. WHEN the player activates the reset button, THE SubTabBar SHALL announce the order reset to screen readers via the live region

### Requirement 5: Handle Tab List Changes Gracefully

**User Story:** As a player, I want my custom order to adapt when tabs are added or removed in future updates, so that I never see missing or phantom tabs.

#### Acceptance Criteria

1. WHEN a page loads and the stored Tab_Order contains tab IDs that no longer exist in the current Default_Order, THE Tab_Order_Store SHALL remove those obsolete IDs from the Tab_Order before displaying tabs
2. WHEN a page loads and the current Default_Order contains tab IDs not present in the stored Tab_Order, THE Tab_Order_Store SHALL append those new IDs to the end of the Tab_Order in the same relative order they appear in the Default_Order
3. IF the reconciled Tab_Order is empty after removing obsolete IDs, THEN THE Tab_Order_Store SHALL fall back to the Default_Order
4. WHEN the Tab_Order_Store completes reconciliation that changed the Tab_Order, THE Tab_Order_Store SHALL persist the reconciled Tab_Order to localStorage so that subsequent page loads do not repeat reconciliation
5. IF the stored Tab_Order contains duplicate tab IDs, THEN THE Tab_Order_Store SHALL retain only the first occurrence of each duplicated ID before applying reconciliation

### Requirement 6: Preserve URL Hash Routing

**User Story:** As a player, I want deep links and the back button to still work correctly with my custom tab order, so that navigation remains predictable.

#### Acceptance Criteria

1. THE SubTabBar SHALL use tab IDs (not display positions) in the URL hash format `#<Page_Key>/<tab_id>` for synchronization, regardless of Tab_Order
2. WHEN a URL hash references a tab ID that exists in the current page's tab list, THE SubTabBar SHALL activate that tab regardless of its current display position
3. IF a URL hash references a tab ID that does not exist in the current page's tab list, THEN THE SubTabBar SHALL fall back to the page's default sub-tab
4. WHEN a player selects a tab outside Edit_Mode, THE SubTabBar SHALL update the URL hash to the selected tab's ID without adding a new browser history entry
5. WHEN the browser fires a hashchange event (e.g., back/forward navigation), THE SubTabBar SHALL activate the tab matching the new hash's tab ID regardless of Tab_Order
6. WHILE in Edit_Mode, THE SubTabBar SHALL not update the URL hash in response to tab reorder actions

### Requirement 7: Accessibility of Reorder Controls

**User Story:** As a player using assistive technology, I want the reorder controls to be operable and understandable, so that I can customize my tab arrangement without relying solely on visual cues.

#### Acceptance Criteria

1. THE SubTabBar SHALL assign an aria-label to each arrow button containing the action direction and the tab label it operates on (e.g., "Move Identity tab left")
2. WHILE in Edit_Mode, WHEN a tab is moved, THE SubTabBar SHALL announce the tab label and its new numeric position (e.g., "Identity tab, position 2 of 5") via an aria-live="polite" region within 200 milliseconds of the move completing
3. THE edit mode toggle SHALL have an aria-label that reflects the current state: "Edit tab order" when Edit_Mode is inactive, and "Done editing tab order" when Edit_Mode is active
4. THE arrow buttons and edit mode toggle SHALL be rendered as native button elements operable via keyboard (Enter and Space keys)
5. WHEN a tab is moved via an arrow button, THE SubTabBar SHALL return keyboard focus to the same arrow button on the moved tab in its new position
6. WHILE a tab's arrow button is disabled due to boundary position, THE SubTabBar SHALL set aria-disabled="true" on that button so assistive technology conveys the disabled state
7. WHILE in Edit_Mode, THE SubTabBar SHALL maintain DOM focus order consistent with the current visual tab display order
