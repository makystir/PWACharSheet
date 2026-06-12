# Requirements Document

## Introduction

On mobile viewports (below 767px), the left sidebar is hidden by the mobile UI optimization and replaced with a bottom navigation bar. The sidebar contains all character management functions: switching between characters, renaming characters, duplicating characters, deleting characters, and creating new characters. Mobile players currently have no way to access these functions. This feature provides an alternative mobile-friendly interface for character management that integrates with the existing bottom navigation pattern and maintains the same touch target and usability standards established in the mobile UI optimization spec.

## Glossary

- **Mobile_Viewport**: A screen width below 768px where the sidebar is hidden and the bottom Navigation_Bar is shown
- **Navigation_Bar**: The bottom-fixed horizontal navigation bar shown on mobile viewports, containing page section tabs
- **Character_Management_Sheet**: A bottom sheet overlay on mobile that provides access to character switching, renaming, duplicating, deleting, and creating new characters
- **Character_List**: The scrollable list of saved characters displayed within the Character_Management_Sheet
- **Character_Card**: A single row within the Character_List representing one saved character, with action buttons for rename, duplicate, and delete
- **Active_Character_Indicator**: A visual marker (border highlight and distinct text color) showing which character is currently loaded
- **Character_Name_Header**: A tappable element in the mobile UI that displays the current character name and opens the Character_Management_Sheet
- **ConfirmDialog**: The existing modal dialog component used for confirming destructive actions

## Requirements

### Requirement 1: Mobile Character Name Header Access Point

**User Story:** As a player on my phone, I want a visible, tappable element showing my current character name, so that I can access character management without needing the desktop sidebar.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active, THE Character_Name_Header SHALL be rendered at the top of the PageContainer displaying the current character name, truncated with an ellipsis if it exceeds the available width, up to a maximum display of 30 characters
2. WHILE the Mobile_Viewport is active, THE Character_Name_Header SHALL have a minimum tap target height of 44 CSS pixels
3. WHEN the Character_Name_Header is tapped on mobile, THE Character_Management_Sheet SHALL open as an overlay
4. WHILE the Mobile_Viewport is active, THE Character_Name_Header SHALL display a chevron icon or visual affordance indicating it is tappable and will reveal additional options
5. WHILE the desktop sidebar is visible (viewport width 768px or above), THE Character_Name_Header SHALL NOT be rendered
6. THE Character_Name_Header SHALL include a button role and an accessible label of "Character management" so that assistive technologies identify it as an actionable control
7. IF the current character name is empty or whitespace-only, THEN THE Character_Name_Header SHALL display the fallback text "Unnamed Character"

### Requirement 2: Character Management Bottom Sheet

**User Story:** As a player on my phone, I want a bottom sheet overlay for character management, so that I can switch, create, rename, duplicate, and delete characters in a mobile-friendly interface.

#### Acceptance Criteria

1. WHEN the Character_Management_Sheet opens, THE Character_Management_Sheet SHALL animate upward from the bottom of the screen with a backdrop overlay that dims the background
2. THE Character_Management_Sheet SHALL fill at least 60% of the viewport height and at most 90% of the viewport height
3. THE Character_Management_Sheet SHALL display a drag handle indicator at the top to communicate swipe-to-dismiss affordance
4. WHEN the user taps the backdrop overlay or swipes down on the drag handle, THE Character_Management_Sheet SHALL close and return focus to the triggering element
5. WHILE the Character_Management_Sheet is open, THE Character_Management_Sheet SHALL prevent background content from scrolling

### Requirement 3: Character List Display

**User Story:** As a player on my phone, I want to see all my saved characters in a clear list, so that I can pick the one I want to play.

#### Acceptance Criteria

1. THE Character_Management_Sheet SHALL display all saved characters in a vertical scrollable Character_List ordered by most recently modified first
2. THE Character_List SHALL render each Character_Card displaying the character name and career, with a minimum height of 56 CSS pixels to provide adequate touch targets for the character name and action buttons
3. THE Character_List SHALL highlight the currently active character using the Active_Character_Indicator (a distinct border color and text color matching the accent-gold theme variable)
4. WHEN no characters exist, THE Character_List SHALL display a message indicating no characters are saved, alongside the create button

### Requirement 4: Switch Character on Mobile

**User Story:** As a player on my phone, I want to tap a character in the list to switch to it, so that I can quickly change which character sheet I am viewing.

#### Acceptance Criteria

1. WHEN a non-active Character_Card name is tapped, THE Character_Management_Sheet SHALL save the current character state, load the tapped character as the active character, update the display to show the newly loaded character's data, and close the sheet
2. WHEN the active Character_Card name is tapped, THE Character_Management_Sheet SHALL close the sheet without performing a character switch
3. THE Character_Card name tap target SHALL span the full available width of the card minus the action buttons area and have a minimum height of 44 CSS pixels
4. IF a character switch is initiated and the target character fails to load, THEN THE Character_Management_Sheet SHALL remain open, continue displaying the current character as active, and present an error message indicating the character could not be loaded

### Requirement 5: Create New Character on Mobile

**User Story:** As a player on my phone, I want to create a new character from the character management sheet, so that I can start a new character without needing a desktop.

#### Acceptance Criteria

1. THE Character_Management_Sheet SHALL display a "New Character" button with a minimum height of 48 CSS pixels and full container width, positioned below the Character_List (or in place of the list when no characters exist)
2. WHEN the "New Character" button is tapped, THE Character_Management_Sheet SHALL close and then the Character Wizard SHALL open in the same viewport
3. IF the Character Wizard is cancelled without completing character creation, THEN THE Character_Management_Sheet SHALL reopen and the Character_List SHALL remain unchanged
4. THE "New Character" button SHALL be visually distinct from the Character_List items by applying the accent-gold color to its border and text

### Requirement 6: Rename Character on Mobile

**User Story:** As a player on my phone, I want to rename a character from the character list, so that I can fix typos or update a character name during a session.

#### Acceptance Criteria

1. THE Character_Card SHALL display a rename action button with a minimum tap target size of 44×44 CSS pixels
2. WHEN the rename action button is tapped, THE Character_Card SHALL replace the character name with an inline text input pre-filled with the current name and auto-focused
3. WHEN the rename input receives an Enter key press or the confirm button is tapped with a trimmed value between 1 and 50 characters, THE Character_Management_Sheet SHALL save the trimmed name and return the card to display state
4. IF the rename input loses focus or the confirm button is tapped with a value that is empty or whitespace-only, THEN THE Character_Management_Sheet SHALL cancel the rename and restore the original name
5. THE rename input SHALL use a font size of 16px to prevent iOS automatic zoom on focus
6. WHEN the rename input loses focus with a trimmed value between 1 and 50 characters, THE Character_Management_Sheet SHALL save the trimmed name and return the card to display state
7. WHEN the Escape key is pressed while the rename input is focused, THE Character_Management_Sheet SHALL cancel the rename, restore the original name, and return the card to display state
8. IF the rename input value exceeds 50 characters, THEN THE rename input SHALL prevent further character entry

### Requirement 7: Duplicate Character on Mobile

**User Story:** As a player on my phone, I want to duplicate an existing character, so that I can create a variant or backup without re-entering all the data.

#### Acceptance Criteria

1. THE Character_Card SHALL display a duplicate action button with a minimum tap target size of 44×44 CSS pixels
2. WHEN the duplicate action button is tapped, THE Character_Management_Sheet SHALL invoke the duplicate character function, append " (Copy)" to the original character name for the new entry, and refresh the Character_List to show the new copy
3. WHEN the duplicate character is successfully created, THE Character_List SHALL scroll the newly duplicated Character_Card into the visible area of the list
4. IF the duplicate character function fails (e.g., the source character is not found), THEN THE Character_Management_Sheet SHALL display an error message indicating the duplication could not be completed and leave the Character_List unchanged

### Requirement 8: Delete Character on Mobile

**User Story:** As a player on my phone, I want to delete a character from the list with a confirmation step, so that I don't accidentally lose character data.

#### Acceptance Criteria

1. THE Character_Card SHALL display a delete action button with a minimum tap target size of 44×44 CSS pixels, visually distinguished using the danger color
2. WHEN the delete action button is tapped, THE ConfirmDialog SHALL open with a message that includes the name of the character to be deleted
3. WHEN the ConfirmDialog confirm button is tapped, THE Character_Management_Sheet SHALL delete the character, refresh the Character_List to reflect the removal, and keep the Character_Management_Sheet open
4. IF the deleted character was the active character and other characters remain, THEN THE Character_Management_Sheet SHALL switch to the first character in the updated Character_List
5. IF the deleted character was the active character and no other characters remain, THEN THE Character_Management_Sheet SHALL close and the application SHALL display the welcome screen
6. WHEN the ConfirmDialog cancel button is tapped or the ConfirmDialog backdrop is tapped, THE ConfirmDialog SHALL close without deleting the character and the Character_Management_Sheet SHALL remain open with the Character_List unchanged

### Requirement 9: Accessibility and Focus Management

**User Story:** As a player using assistive technology on my phone, I want the character management sheet to be keyboard and screen-reader accessible, so that I can manage characters regardless of input method.

#### Acceptance Criteria

1. WHEN the Character_Management_Sheet opens, THE Character_Management_Sheet SHALL trap focus within the sheet so that pressing Tab from the last interactive element moves focus to the first interactive element, and pressing Shift+Tab from the first interactive element moves focus to the last interactive element
2. WHEN the Character_Management_Sheet opens, THE Character_Management_Sheet SHALL move focus to the first interactive element in DOM order within the sheet
3. THE Character_Management_Sheet SHALL include an aria-label of "Character management" and role of "dialog" for screen reader identification
4. WHEN the Escape key is pressed while the Character_Management_Sheet is open, THE Character_Management_Sheet SHALL close and return focus to the Character_Name_Header
5. THE Character_List SHALL use ARIA roles of "list" and "listitem" for screen reader navigation, and each action button (rename, duplicate, delete) within a Character_Card SHALL have an accessible name that includes the action type and the character name
6. WHEN a character is switched, created, duplicated, deleted, or renamed within the Character_Management_Sheet, THE Character_Management_Sheet SHALL announce the result of the action via an ARIA live region with politeness level "polite"
7. IF a Character_Card is removed from the Character_List while the sheet remains open, THEN THE Character_Management_Sheet SHALL move focus to the next Character_Card in the list, or to the previous Character_Card if the deleted card was last, or to the "New Character" button if no characters remain
