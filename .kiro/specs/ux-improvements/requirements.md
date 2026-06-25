# Requirements Document

## Introduction

This spec covers a comprehensive UX improvement pass for the WFRP 4e character sheet PWA. The app is built with React 19 + TypeScript + Vite + CSS Modules, uses localStorage for persistence, has 7 navigation tabs, and targets mobile-first usage during tabletop RPG sessions. The improvements address mobile usability pain points, interaction friction, accessibility gaps, code quality issues, and domain-specific opportunities across the existing page structure.

## Glossary

- **App**: The WFRP 4e character sheet Progressive Web App
- **Navigation_Bar**: The bottom tab bar displayed on mobile viewports (below 768px width)
- **Sidebar**: The desktop navigation panel shown at viewports 768px and above
- **Character_Switcher**: The UI mechanism for selecting which character is active
- **Character_Management_Sheet**: The bottom sheet overlay that opens when tapping the character name header on mobile
- **EditableField**: The shared component providing tap-to-edit inline editing for text and number values
- **Toast**: The transient notification component displayed at the bottom of the viewport
- **Picker**: The modal list selection component used for choosing items from a categorized list
- **SubTabBar**: A horizontal tab strip for switching between sub-sections within a page
- **Period_Header**: The header row of a downtime period card on the Endeavours page, containing label, date, session, slots, and delete controls
- **Combat_Page**: The page displaying all combat-related panels (dashboard, weapons, armour, attack flow, conditions)
- **Quick_Actions**: Pre-configured shortcuts to frequently used rolls or operations
- **Responsive_Hook**: A React hook that reactively tracks viewport dimensions using matchMedia
- **Undo_Toast**: A Toast variant that includes an actionable "Undo" button alongside the confirmation message
- **Overflow_Menu**: A navigation pattern that groups infrequently-used tabs behind a "More" button
- **Empty_State**: A standardized component shown when a list or section contains no items

## Requirements

### Requirement 1: Mobile Character Switching Affordance

**User Story:** As a mobile user, I want a clearly discoverable way to switch characters, so that I can manage multiple characters without knowing about the hidden desktop sidebar.

#### Acceptance Criteria

1. WHILE the viewport width is less than 768px, THE App SHALL display the character name header at the top of the page content area with a minimum tap target of 44×44 CSS pixels
2. WHILE the viewport width is less than 768px, THE App SHALL render a downward chevron icon immediately to the right of the character name text within the header to indicate that the element is interactive
3. WHEN a user taps the character name header, THE Character_Management_Sheet SHALL open as a bottom sheet overlay rendered above page content, listing all available characters sorted by last modified date descending
4. WHEN a user selects a different character from the Character_Management_Sheet, THE App SHALL switch to that character, close the sheet, and return focus to the character name header
5. WHEN a user taps the currently active character in the Character_Management_Sheet, THE App SHALL close the sheet without switching characters
6. WHEN a user taps the backdrop area outside the Character_Management_Sheet or swipes the drag handle downward by more than 50px, THE App SHALL close the sheet without switching characters

### Requirement 2: Navigation Overflow for Mobile

**User Story:** As a mobile user, I want the bottom navigation to remain usable at narrow viewport widths, so that tab labels remain readable and tappable without cramping.

#### Acceptance Criteria

1. WHILE the viewport width is below 768px, THE Navigation_Bar SHALL display a maximum of 5 visible tab items (Character, Combat, Retinue, Settings, and the Overflow_Menu button)
2. WHILE the viewport width is below 768px, THE Navigation_Bar SHALL group the remaining tabs (Estate, Endeavours, Advancement) behind an Overflow_Menu button displaying a "More" label with an ellipsis icon (⋯)
3. WHEN a user taps the Overflow_Menu button, THE Navigation_Bar SHALL display the grouped tabs in a popover positioned above the Navigation_Bar with each overflow item having a minimum touch target of 44×44 CSS pixels
4. WHEN a user selects a tab from the Overflow_Menu, THE App SHALL navigate to that page and close the overflow popover
5. WHILE a page from the Overflow_Menu is active, THE Overflow_Menu button SHALL display the active page's icon in place of the ellipsis and apply the active tab styling (accent colour, top border)
6. WHEN a user taps outside the Overflow_Menu popover, THE App SHALL close the popover without navigating

### Requirement 3: Reduced Edit Friction for EditableField

**User Story:** As a player editing my character sheet mid-session, I want frequently-edited fields to allow direct input without a tap-to-activate step, so that updating values is fast.

#### Acceptance Criteria

1. WHERE the EditableField is used for numeric values (wounds, advantage, currency, slot counts), THE EditableField SHALL render as a native `<input>` element with `type="number"` that is focusable and editable without requiring a tap-to-activate step
2. WHERE the EditableField is used for text values (names, labels, notes), THE EditableField SHALL retain the tap-to-edit pattern with a visible underline affordance on the display element indicating editability
3. WHEN a numeric EditableField loses focus, THE EditableField SHALL invoke the onSave callback with the current numeric value, triggering the existing 500ms debounced save mechanism
4. THE EditableField SHALL preserve the existing keyboard support: Enter commits the current draft value via onSave, and Escape reverts the displayed value to the last saved value without triggering onSave
5. IF a numeric EditableField contains a non-numeric or empty value when focus is lost, THEN THE EditableField SHALL coerce the value to 0 before saving

### Requirement 4: Undo for Destructive Actions

**User Story:** As a player, I want the ability to undo accidental deletions of periods, entries, weapons, armour, companions, or hirelings, so that I can recover from mistakes without re-entering data.

#### Acceptance Criteria

1. WHEN a user deletes a single period, endeavour entry, weapon, armour piece, companion, or hireling, THE App SHALL immediately remove the item from the displayed list, display an Undo_Toast containing the text "[Item type] removed" and an "Undo" action button, and keep the Undo_Toast visible for 5 seconds
2. WHEN the user taps the "Undo" action button within the Undo_Toast before its 5-second duration expires, THE App SHALL restore the deleted item to the same index position it occupied in its parent list prior to deletion, and immediately dismiss the Undo_Toast
3. IF the Undo_Toast 5-second duration expires without the user tapping "Undo", THEN THE App SHALL dismiss the Undo_Toast and permanently discard the deleted item such that no further recovery is possible through this mechanism
4. IF a new single-item deletion occurs while an existing Undo_Toast is still visible, THEN THE App SHALL permanently discard the previously pending item, replace the existing Undo_Toast with a new Undo_Toast for the latest deletion, and reset the 5-second timer
5. THE App SHALL display the Undo_Toast in place of the existing ConfirmDialog for single-item deletions only; deletions that remove more than one item in a single user action (such as deleting a period that contains entries) SHALL continue to display the ConfirmDialog requiring explicit confirmation before removal
6. THE Undo_Toast container SHALL have an ARIA live region attribute of "assertive" so that screen readers announce the undo opportunity when it appears

### Requirement 5: Combined Currency Input

**User Story:** As a player, I want a streamlined way to enter or adjust currency amounts, so that I do not have to tap through three separate fields for Gold Crowns, Silver Shillings, and Brass Pennies.

#### Acceptance Criteria

1. THE App SHALL provide a combined currency input component that accepts a text string of up to 60 characters, allowing the user to specify one or more denomination amounts in a single submission
2. WHEN a user submits a combined currency value, THE App SHALL parse the input string by recognising denomination tokens where each token consists of an optional sign ("+" or "-"), a numeric integer value from 0 to 999999, and a case-insensitive denomination suffix ("GC" for Gold Crowns, "SS" for Silver Shillings, or "D" for Brass Pennies), separated by optional whitespace
3. WHEN the parsed input contains valid denomination tokens, THE App SHALL add (for "+" or unsigned tokens) or subtract (for "-" tokens) the specified amounts to/from the corresponding wGC, wSS, or wD fields on the character
4. IF a subtraction would reduce a denomination field below 0, THEN THE App SHALL clamp the resulting denomination value to 0 rather than storing a negative number
5. IF a user submits input that contains no valid denomination tokens or includes characters that do not match the expected token format, THEN THE App SHALL display an inline validation message indicating the expected format and retain the previous wGC, wSS, and wD values unchanged
6. THE combined currency input SHALL support both adding and subtracting amounts from current values within the same submission (e.g., "+2GC -5SS +10D" applies all three operations in a single action)
7. WHEN a denomination appears more than once in the same input string (e.g., "+2GC +3GC"), THE App SHALL sum all tokens for that denomination before applying the net change to the field

### Requirement 6: Contextual Help System

**User Story:** As a new player, I want contextual help explaining game concepts and UI mechanics, so that I can use the app without consulting the rulebook for basic operations.

#### Acceptance Criteria

1. THE App SHALL provide an info icon or help affordance next to each of the following concepts: Status tier, slot calculation, career advancement, and Yenlui balance, rendered as a button element with an accessible label of "Help: [concept name]" and a minimum touch-target size of 44×44 CSS pixels
2. WHEN a user activates an info affordance, THE App SHALL display a popover containing explanatory text of no more than 280 characters for that concept, positioned adjacent to the affordance without obscuring the related data field, and dismissable by activating the affordance again, tapping outside the popover, or pressing the Escape key
3. WHEN a user navigates to the Endeavours page and no dismissal record for the "endeavours-first-use" hint exists in localStorage, THE App SHALL display a dismissable banner at the top of the page explaining the relationship between Status tier and available endeavour slots
4. WHEN a user dismisses a hint or first-use banner, THE App SHALL store a dismissal record keyed by hint identifier in localStorage so that the dismissed hint does not reappear on subsequent visits
5. IF localStorage is unavailable or write fails, THEN THE App SHALL still display help content on each visit without persisting dismissal state, and SHALL NOT display an error to the user

### Requirement 7: Period Header Layout Improvement

**User Story:** As a mobile user on the Endeavours page, I want the period header to be readable and not wrap awkwardly, so that I can see all period metadata clearly.

#### Acceptance Criteria

1. WHILE the viewport width is below 768px, THE Period_Header SHALL arrange its controls across two rows: primary row (label, slot badge, delete button) and secondary row (date input, session number input, slots field), with the primary row label truncated via ellipsis if it exceeds the available width rather than wrapping to a third line
2. WHILE the viewport width is 768px or above, THE Period_Header SHALL display all controls (label, date input, session number input, slots field, slot badge, delete button) in a single horizontal row
3. THE Period_Header layout SHALL not overflow its container or cause horizontal scrolling at any viewport width from 320px to the maximum container width
4. WHILE the viewport width is below 768px, THE Period_Header SHALL separate the primary row and secondary row with vertical spacing of at least 4px and no more than 12px

### Requirement 8: Status Cycling Discoverability

**User Story:** As a new user, I want to understand what the ○/◐/✓ status button does, so that I can use the endeavour tracking system correctly.

#### Acceptance Criteria

1. WHEN the first EndeavourEntry is added to any period and no previous tooltip dismissal has been recorded in localStorage, THE App SHALL display a tooltip adjacent to the status button explaining the three states: "○ Pending → ◐ In Progress → ✓ Completed. Click to cycle." and the tooltip SHALL remain visible until the user dismisses it by clicking a close control or clicking outside the tooltip
2. IF the user has previously dismissed the status tooltip (recorded in localStorage), THEN THE App SHALL not display the tooltip on subsequent entry additions
3. THE status cycling button SHALL include a title attribute whose value indicates the current state name and the next state on click (e.g., "Status: Pending — click to set In Progress"), updated each time the status changes
4. THE Endeavours page SHALL display a legend above the entries list within each period card showing the three status icons with text labels: "○ Pending", "◐ In Progress", "✓ Completed", rendered inline on a single row
5. THE status tooltip and legend text SHALL use the exact status icon characters: "○" for Pending, "◐" for In Progress, and "✓" for Completed

### Requirement 9: Combat Page Collapsible Sections

**User Story:** As a player in combat, I want to collapse less-relevant panels on the Combat page, so that I can focus on the information I need right now without scrolling past 8+ panels.

#### Acceptance Criteria

1. WHILE the user is in active combat, THE Combat_Page SHALL render each panel (Attack Flow, Quick Roll Bar, Take Damage, Weapons, Armour Map, Ammo Tracker, Critical Wounds, Roll History) as a collapsible section with a clickable header containing the panel title and a chevron indicator showing collapsed/expanded state
2. THE Combat_Page SHALL persist each panel's collapsed/expanded state in localStorage using a key scoped to the active character's ID, so that panel states are independent per character
3. WHEN the viewport width is below 768px and no saved panel state exists for the active character, THE Combat_Page SHALL default the Ammo Tracker, Critical Wounds, and Roll History panels to a collapsed state
4. THE Combat_Page SHALL keep the Combat Dashboard always expanded and not render a collapse toggle for it
5. WHEN a user taps a panel header, THE Combat_Page SHALL toggle that panel between collapsed and expanded state and persist the new state immediately

### Requirement 10: Reactive Viewport Detection

**User Story:** As a user rotating my device or resizing my browser, I want the app to respond immediately to viewport changes, so that layout adjustments happen without requiring a page refresh.

#### Acceptance Criteria

1. THE App SHALL use a matchMedia-based Responsive_Hook that listens on the `(max-width: 767px)` media query and returns a boolean indicating whether the viewport is at or below the mobile breakpoint
2. WHEN the Responsive_Hook mounts, THE App SHALL read the current matchMedia result and provide the correct mobile/desktop value before the first paint
3. WHEN the viewport width crosses the 768px breakpoint (via resize or orientation change), THE App SHALL update all responsive layout decisions within the same React render cycle, reflecting the new value in the next DOM commit
4. THE Responsive_Hook SHALL debounce rapid resize events by no more than 100ms to avoid layout thrashing while ensuring the final settled viewport state is always reflected
5. WHEN a component using the Responsive_Hook unmounts, THE App SHALL remove the matchMedia listener so that no stale references or updates occur
6. THE Combat_Page, Navigation_Bar, and Period_Header SHALL use the Responsive_Hook instead of one-time window.innerWidth checks, ensuring layout reactivity without a page refresh

### Requirement 11: Remove Dead CSS Files

**User Story:** As a developer, I want unused CSS files removed from the codebase, so that the bundle size is minimized and there are no conflicting style declarations.

#### Acceptance Criteria

1. THE App SHALL not include App.css in the production bundle, given that no source file imports it and it contains only Vite scaffold styles (e.g., `.counter`, `.hero`, `#center`, `#next-steps`)
2. IF index.css declares CSS custom properties (e.g., `--accent`, `--text`, `--bg`, `--border`) that share the same name as properties already declared in global.css, THEN THE App SHALL not include index.css in the production bundle
3. WHEN dead CSS files are removed, THE App SHALL continue to render all pages without layout shifts, missing backgrounds, broken typography, or unstyled components, as verified by loading each page section (character, combat, estate, advancement, endeavours, retinue, settings) and confirming elements retain their styled appearance
4. WHEN dead CSS files are removed, THE App SHALL still load global.css as the sole global stylesheet, and all CSS custom properties defined therein (e.g., `--bg-primary`, `--parchment`, `--font-heading`, `--font-body`) SHALL resolve correctly in rendered components

### Requirement 12: Remove Unused Props

**User Story:** As a developer, I want component prop interfaces to only declare props that are used, so that the component APIs are clean and maintainable.

#### Acceptance Criteria

1. THE EndeavoursPage component's prop interface SHALL not declare the totalWounds, armourPoints, maxEncumbrance, or coinWeight properties
2. THE EstatePage component's prop interface SHALL not declare the totalWounds, armourPoints, maxEncumbrance, or coinWeight properties
3. THE EndeavoursPage component SHALL not destructure or reference totalWounds, armourPoints, maxEncumbrance, or coinWeight in its function body
4. THE EstatePage component SHALL not destructure or reference totalWounds, armourPoints, maxEncumbrance, or coinWeight in its function body
5. WHEN unused props are removed from the EndeavoursPage and EstatePage interfaces, THE App SHALL compile without TypeScript errors and all existing call sites shall remain unchanged in behavior

### Requirement 13: Shared SubTabBar Component

**User Story:** As a developer, I want a single reusable sub-tab component, so that CharacterPage, EstatePage, and RetinuePage share consistent tab behaviour and styling.

#### Acceptance Criteria

1. THE App SHALL provide a shared SubTabBar component located at `src/components/shared/SubTabBar.tsx` that accepts props: `tabs` (array of `{ id: string; label: string }`), `activeTab` (string matching one tab id), and `onTabChange` (callback receiving the selected tab id)
2. WHEN a user taps a sub-tab, THE SubTabBar SHALL invoke the onTabChange callback with the selected tab's id string
3. THE CharacterPage, EstatePage, and RetinuePage SHALL import and render the shared SubTabBar component, removing their local sub-tab markup and associated CSS classes
4. THE SubTabBar SHALL apply the existing sub-tab visual styling (active state with accent gold background and bottom border, uppercase label, sticky positioning on mobile) via a dedicated CSS module `SubTabBar.module.css`
5. WHEN used on mobile viewports below 768px, THE SubTabBar SHALL set each tab button to a minimum height of 44px and apply sticky positioning at the top of the scroll container

### Requirement 14: URL-Based Hash Routing

**User Story:** As a user, I want the active page and sub-tab to persist across page refreshes, so that refreshing the browser returns me to where I was.

#### Acceptance Criteria

1. WHEN a user navigates to a page or sub-tab, THE App SHALL update the URL hash using the format `#<page>` for pages without a sub-tab selection and `#<page>/<subtab>` for pages with an active sub-tab (e.g., `#combat`, `#character/gear`, `#estate/holdings`)
2. WHEN the App loads with a URL hash containing a valid page and valid sub-tab, THE App SHALL navigate to the corresponding page and activate the specified sub-tab
3. IF the URL hash references a valid page but an invalid sub-tab, THEN THE App SHALL navigate to the referenced page and display that page's default sub-tab
4. IF the URL hash references an invalid page, THEN THE App SHALL navigate to the default Character page with its default sub-tab
5. THE hash-based routing SHALL not add external routing library dependencies
6. WHEN the App loads with a URL hash containing a valid page and no sub-tab segment, THE App SHALL navigate to that page and display the page's default sub-tab

### Requirement 15: Grouped Picker Items

**User Story:** As a user selecting from a picker, I want items visually grouped by category with headers, so that I can find what I need faster than scanning a flat prefixed list.

#### Acceptance Criteria

1. WHEN items in the Picker are supplied with a grouping function (getGroup) that returns a group label string per item, THE Picker SHALL render items organized under group headers, preserving the order in which groups first appear in the items array
2. THE Picker group headers SHALL be rendered as non-selectable, non-focusable elements with a role of "separator" or "presentation", styled with a distinct CSS class that differentiates them from selectable item rows (e.g. bold font-weight or background colour change)
3. WHEN a user types in the Picker search field and grouped items are displayed, THE Picker SHALL filter items across all groups by matching the search text against item labels, and SHALL hide any group header whose group contains zero matching items
4. IF items are supplied without a grouping function (getGroup is undefined), THEN THE Picker SHALL render items as a flat list with no group headers, matching the existing ungrouped behaviour
5. THE Picker SHALL render group headers using semantic list grouping (e.g. role="group" with aria-label set to the group name) so that assistive technologies announce group boundaries

### Requirement 16: Undo-Capable Toast Component

**User Story:** As a developer, I want the Toast component to support an optional action button, so that it can be used for undo operations and other actionable notifications.

#### Acceptance Criteria

1. THE Toast component SHALL accept an optional `action` prop defined as `{ label: string; onAction: () => void }` alongside the existing `message` and `duration` props
2. WHEN an `action` prop is provided and the toast is visible, THE Toast SHALL render a clickable `<button>` element displaying the action label text to the right of the message text, within the toast container
3. WHEN the action button is tapped, THE Toast SHALL invoke the `onAction` callback, immediately hide the toast, and cancel the auto-dismiss timer
4. IF no `action` prop is provided, THE Toast SHALL render as a text-only notification matching the existing behaviour (message text, auto-dismiss after duration, no button element)
5. THE action button SHALL have a minimum touch target of 44×44 CSS pixels and use a contrasting colour (e.g., accent-gold) to distinguish it from the message text

### Requirement 17: Unified Empty State Component

**User Story:** As a developer, I want a consistent empty state component used across all pages, so that users see a uniform experience when lists are empty.

#### Acceptance Criteria

1. THE App SHALL provide a shared Empty_State component that accepts a Lucide icon component, a heading string (max 100 characters), an optional description string (max 250 characters), and an optional action button defined by a label string and an onClick callback
2. THE Empty_State component SHALL centre its content vertically and horizontally within its parent container using CSS flexbox alignment, and SHALL assign a role="status" attribute to its root element for accessibility
3. WHEN a list rendered by EndeavoursPage, RetinuePage, EstatePage, or CharacterPage (gear sub-tab) contains zero items, THE page SHALL render the shared Empty_State component in place of the list content
4. THE Empty_State component SHALL use only CSS custom properties (theme variables) defined by the current theme for all text colours, icon colours, and background colours, applying no hard-coded colour values
5. IF the optional description prop is not provided, THEN THE Empty_State component SHALL render only the icon and heading without reserving space for description text
6. IF the optional action button prop is not provided, THEN THE Empty_State component SHALL render without a button element

### Requirement 18: Contextual Move Buttons

**User Story:** As a user viewing my endeavour entries, I want reorder controls to be unobtrusive until needed, so that the entry list is not cluttered with arrow buttons.

#### Acceptance Criteria

1. WHILE the viewport width is 768px or above, THE move buttons (↑↓) on endeavour entries SHALL be visually hidden by default (opacity 0 and no pointer events) and revealed when the entry row receives a mouse hover or when any focusable element within the entry row holds keyboard focus (using the CSS :focus-within pseudo-class on the row)
2. WHILE the viewport width is below 768px, THE move buttons SHALL remain visible at all times without requiring hover or focus interaction
3. WHILE the move buttons are visually hidden on viewports 768px or above, THE entry row SHALL collapse the space occupied by the move buttons so that adjacent elements (notes input and cost input) expand to fill the available row width, with no empty gap remaining where the buttons would appear
4. THE move buttons SHALL remain in the DOM and in the sequential keyboard tab order (tabindex 0 or natural button tab order) at all viewport widths so that keyboard users can focus and activate them, and focusing a move button SHALL trigger the row's focus-within state to reveal all move buttons in that row
5. WHEN a move button becomes visible due to hover or focus-within, THE entry row SHALL reveal the buttons within 150 milliseconds using a CSS opacity transition, with no layout shift to other elements in the row during the transition

### Requirement 19: Smart Slot Auto-Calculation

**User Story:** As a player creating a new downtime period, I want the slot count auto-calculated from my Status tier, so that I do not have to look up the formula.

#### Acceptance Criteria

1. WHEN a new downtime period is created, THE App SHALL auto-calculate the slot count by parsing the character's Status field: "Gold N" yields 3 slots, "Silver N" yields 2 slots, "Brass N" yields 1 slot (case-insensitive match on tier keyword)
2. IF the character's Status field is empty or does not contain the word "Gold", "Silver", or "Brass", THEN THE App SHALL default to 1 slot and set the period's `statusWarning` flag to true, causing the existing warning message to display
3. THE auto-calculated slot value SHALL be rendered in an editable slots field so the user can override it manually after creation
4. THE App SHALL display a brief explanation tooltip on the slots field (accessible via an info icon) indicating the formula: "Slots are based on your Status tier: Gold=3, Silver=2, Brass=1"

### Requirement 20: Session-Aware Features

**User Story:** As a player tracking sessions, I want the app to use session numbers intelligently, so that new periods auto-increment and I can see context about when things happened.

#### Acceptance Criteria

1. WHEN a new downtime period is created and at least one existing period has a numeric sessionNumber set, THE App SHALL auto-populate the new period's sessionNumber field with the value equal to the maximum sessionNumber across all existing periods plus 1
2. IF no existing periods have a sessionNumber set, THEN THE App SHALL leave the new period's sessionNumber field undefined (empty)
3. WHEN a user views the Endeavours page and at least one period has a sessionNumber set, THE App SHALL display a "Last session: N" label in the page header card where N is the maximum sessionNumber value across all periods
4. IF no periods have a sessionNumber set, THEN THE App SHALL not display the "Last session" label

### Requirement 21: Quick Actions on Mobile

**User Story:** As a mobile user, I want quick access to my most frequent rolls (Dodge, Perception, weapon attacks) from any page, so that I can respond immediately during play without navigating to the Combat tab.

#### Acceptance Criteria

1. WHILE the viewport width is at most 767px, THE App SHALL display a floating quick-access bar on every page providing access to configured Quick_Actions, positioned above the Navigation_Bar
2. WHEN a user taps a Quick_Action, THE App SHALL open a roll dialog pre-populated with the action's associated skill name and computed target number without requiring page navigation
3. THE App SHALL allow users to configure which skills appear in the Quick_Actions list via the Settings page, with a maximum of 6 actions
4. THE Quick_Actions UI SHALL be positioned so that it does not overlap the Navigation_Bar and does not cover scrollable page content (the page content area remains independently scrollable beneath it)
5. IF no Quick_Actions are configured and no default actions are available, THEN THE App SHALL hide the quick-access UI element entirely
6. WHEN a character is loaded that has no user-configured Quick_Actions, THE App SHALL display a default set of Quick_Actions consisting of the character's Dodge, Perception, and Melee (Basic) skills
