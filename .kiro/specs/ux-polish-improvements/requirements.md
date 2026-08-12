# Requirements Document

## Introduction

This feature addresses a set of UX/UI polish improvements identified during a full audit of the WFRP4e PWA Character Sheet application. The improvements span animation quality, form validation feedback, empty states, touch interactions, data density controls, color contrast accessibility, and loading performance. Together they elevate the overall user experience from functional to polished.

## Glossary

- **App**: The WFRP4e PWA Character Sheet single-page application
- **CollapsibleSection**: The existing shared component that wraps content in an expandable/collapsible panel using max-height transitions
- **EmptyState**: The existing shared component that displays a placeholder message when a section has no data
- **EditableField**: The existing shared component for inline-editable text and number inputs
- **Character_Page**: The main page displaying character attributes, skills, talents, and equipment
- **Route_Transition**: An animated visual effect applied when the user navigates between pages
- **Compact_Mode**: A display mode showing abbreviated character data in a summary layout
- **Expanded_Mode**: A display mode showing all character details in full
- **Long_Press**: A touch interaction where the user holds a finger on an element for at least 500ms
- **Contextual_Menu**: A popup menu presenting actions relevant to the touched element
- **Splash_Screen**: A lightweight HTML/CSS loading indicator displayed before React hydrates
- **Skeleton_Screen**: A placeholder layout mimicking page structure shown during initial load
- **WCAG_AA**: Web Content Accessibility Guidelines level AA, requiring a minimum contrast ratio of 4.5:1 for normal text
- **Old_Guy_Mode**: The existing "old-guy" theme that scales the UI up for readability using the CSS `zoom` property

## Requirements

### Requirement 1: Smooth Collapsible Section Height Animation

**User Story:** As a user, I want collapsible sections to animate smoothly to their natural height, so that open/close transitions feel polished rather than jumpy.

#### Acceptance Criteria

1. WHEN a CollapsibleSection expands, THE App SHALL animate the content height from 0 to its intrinsic height using CSS `grid-template-rows` transitioning from `0fr` to `1fr`
2. WHEN a CollapsibleSection collapses, THE App SHALL animate the content height from its intrinsic height to 0 using CSS `grid-template-rows` transitioning from `1fr` to `0fr`
3. THE CollapsibleSection SHALL maintain `overflow: hidden` on the grid child during the transition to prevent content from being visible outside the animated bounds
4. WHILE the user has enabled `prefers-reduced-motion: reduce`, THE CollapsibleSection SHALL skip the height animation and expand or collapse instantly
5. THE CollapsibleSection SHALL preserve all existing keyboard accessibility (Enter/Space to toggle, focus-visible outline)

### Requirement 2: Page Transition Animations

**User Story:** As a user, I want smooth visual transitions when switching between pages, so that navigation feels fluid instead of abrupt.

#### Acceptance Criteria

1. WHEN the user navigates to a different page, THE App SHALL apply a crossfade transition with a duration between 150ms and 250ms
2. THE App SHALL ensure the outgoing page fades out and the incoming page fades in without layout shift or scroll position jumps
3. WHILE the user has enabled `prefers-reduced-motion: reduce`, THE App SHALL skip the transition animation and render the new page immediately
4. THE Route_Transition SHALL not delay the interactive readiness of the destination page beyond the transition duration
5. IF a navigation occurs during an in-progress transition, THEN THE App SHALL cancel the in-progress transition and begin the new transition immediately

### Requirement 3: Form Validation Error States

**User Story:** As a user, I want to see clear visual feedback when I enter invalid data, so that I know what to correct.

#### Acceptance Criteria

1. WHEN a numeric EditableField receives a non-numeric value (NaN result after parsing), THE EditableField SHALL display a visible error state with a red border (`--danger` color) and an inline error message stating "Must be a number"
2. WHEN a required field is left empty on blur, THE EditableField SHALL display a visible error state with a red border and an inline error message stating "Required"
3. WHEN the user corrects the invalid input, THE EditableField SHALL remove the error state immediately upon the input becoming valid
4. THE EditableField SHALL announce error messages to screen readers using an `aria-live="polite"` region or `aria-invalid` attribute with an associated `aria-describedby` error message
5. THE EditableField SHALL not submit or save invalid values to the character data store

### Requirement 4: Undo Support for Edits

**User Story:** As a user, I want to undo my last edit with Ctrl+Z, so that I can quickly recover from accidental changes.

#### Acceptance Criteria

1. WHEN the user presses Ctrl+Z (or Cmd+Z on macOS) outside of an active text input focus, THE App SHALL revert the most recent character data change to its previous value
2. THE App SHALL maintain an undo stack of at least the 10 most recent character data changes
3. WHEN an undo is performed, THE App SHALL display a toast notification indicating the reverted field name and its restored value
4. IF no undo history exists, THEN THE App SHALL take no action when Ctrl+Z is pressed
5. THE App SHALL clear the undo stack when the user switches to a different character

### Requirement 5: Discoverable Escape-to-Revert Behavior

**User Story:** As a user, I want to know that pressing Escape will revert my edits, so that I can use this shortcut confidently.

#### Acceptance Criteria

1. WHEN an EditableField enters edit mode, THE EditableField SHALL display a tooltip or hint text reading "Esc to revert" near the input field
2. THE hint SHALL appear after a 1-second delay to avoid visual clutter during quick edits
3. THE hint SHALL disappear when the field exits edit mode (via save, blur, or escape)
4. WHILE the user has interacted with the escape-to-revert hint at least 3 times in the current session, THE EditableField SHALL suppress the hint for the remainder of the session

### Requirement 6: Consistent Empty State Usage

**User Story:** As a user, I want all empty sections to display a helpful placeholder, so that I understand what content goes there and how to add it.

#### Acceptance Criteria

1. THE App SHALL use the EmptyState component in every list or section that can be empty, including: talents, trappings, spells, prayers, weapons, armour, injuries, diseases, corruption, mutations, and session notes
2. WHEN a section has no items, THE EmptyState SHALL display a contextual icon, a heading describing what belongs there, and a description explaining how to add content
3. WHERE a section supports an add action, THE EmptyState SHALL include an action button that triggers the add flow for that section

### Requirement 7: Contextual Help Tooltips for Complex Features

**User Story:** As a first-time user, I want contextual hints on complex features, so that I can learn the interface without consulting external documentation.

#### Acceptance Criteria

1. THE App SHALL display a help icon (question mark) next to complex features including: Advantage tracking, Corruption/Mutation mechanics, Channelling, Overcast allocation, and Fortune/Resolve spending
2. WHEN the user hovers over or taps the help icon, THE App SHALL display a tooltip with a brief explanation (maximum 2 sentences) of the feature
3. WHERE the user has dismissed a specific help tooltip 3 times, THE App SHALL stop showing that tooltip automatically (user can still trigger it via the icon)

### Requirement 8: Long-Press Contextual Menu on Mobile

**User Story:** As a mobile user, I want to long-press on trapping or weapon cards to access edit, delete, and move actions, so that I can manage items without hunting for small buttons.

#### Acceptance Criteria

1. WHEN a user performs a Long_Press (500ms or more) on a trapping card or weapon card on a touch device, THE App SHALL display a Contextual_Menu with options: Edit, Delete, and Move (reorder)
2. THE Contextual_Menu SHALL appear positioned near the touch point without overflowing the viewport
3. WHEN the user taps outside the Contextual_Menu or presses the back gesture, THE Contextual_Menu SHALL dismiss without performing any action
4. THE Contextual_Menu SHALL not interfere with normal tap (select) or swipe (scroll) gestures
5. THE App SHALL provide a subtle haptic feedback (via Vibration API where supported) when the Contextual_Menu appears
6. WHILE the device does not support touch events, THE App SHALL not register long-press handlers (desktop users use existing button controls)

### Requirement 9: Compact/Expanded Mode Toggle for Character Page

**User Story:** As a user, I want to toggle between a compact summary view and a full detail view on the Character page, so that I can choose the information density I need.

#### Acceptance Criteria

1. THE Character_Page SHALL provide a toggle control (button or switch) allowing the user to switch between Compact_Mode and Expanded_Mode
2. WHILE in Compact_Mode, THE Character_Page SHALL display only: character name, species, career, current wounds/max wounds, key characteristics as a single row of values, and a summary of equipped weapons
3. WHILE in Expanded_Mode, THE Character_Page SHALL display all character details as currently shown (full characteristics table, all skills, talents, trappings, notes)
4. THE App SHALL persist the user's mode preference in local storage and restore it on subsequent visits
5. WHEN the user toggles between modes, THE Character_Page SHALL animate the transition using a smooth height change (no abrupt layout jumps)

### Requirement 10: WCAG AA Color Contrast Fix for Muted Text

**User Story:** As a user with low vision, I want muted text to be readable against the background, so that I can access all information in the interface.

#### Acceptance Criteria

1. THE App SHALL set `--text-muted` in the default dark theme to a color value that achieves at least a 4.5:1 contrast ratio against `--bg-primary` (#121212)
2. THE App SHALL verify that the updated `--text-muted` value also achieves at least 4.5:1 contrast against `--card-bg` (#1e1e1e)
3. THE App SHALL audit `--text-muted` usage in the light theme and high-contrast theme to confirm WCAG_AA compliance in those themes as well
4. IF any other text color variable falls below 4.5:1 contrast ratio against its typical background in any theme, THEN THE App SHALL adjust that variable to meet the minimum ratio

### Requirement 11: Splash Screen for Initial App Load

**User Story:** As a user, I want to see an immediate visual indicator when opening the app, so that I know the app is loading rather than seeing a blank screen.

#### Acceptance Criteria

1. THE App SHALL render a Splash_Screen in the `index.html` before any JavaScript executes, using only inline HTML and CSS
2. THE Splash_Screen SHALL display the app icon, app name, and a subtle loading animation (pulse or spinner)
3. WHEN React hydrates and renders the first meaningful content, THE Splash_Screen SHALL fade out and be removed from the DOM
4. THE Splash_Screen SHALL render within 100ms of the initial HTML parse (no external resource dependencies)
5. THE Splash_Screen SHALL use the dark theme colors by default and respect the user's previously stored theme preference if available via a `data-theme` attribute on `<html>`

### Requirement 12: Replace Zoom with Transform Scale in Old Guy Mode

**User Story:** As a user of the Old_Guy_Mode theme, I want the enlarged UI to render cleanly without blurry text or subpixel artifacts, so that the accessibility benefit is not undermined by visual degradation.

#### Acceptance Criteria

1. THE App SHALL replace `zoom: 1.2` on `#root` in Old_Guy_Mode with `transform: scale(1.2)` applied to a wrapper container
2. THE App SHALL apply `transform-origin: top left` to the scaled container so that content scales from the top-left corner
3. THE App SHALL adjust the container dimensions (width/height) to account for the scale factor so that no content is clipped or generates unexpected scrollbars
4. THE App SHALL not produce subpixel rendering artifacts (blurry text) in Old_Guy_Mode as verified by visual inspection on Chrome and Firefox
5. WHILE in Old_Guy_Mode, THE App SHALL maintain correct touch target sizes (minimum 44×44 CSS pixels after scaling)
