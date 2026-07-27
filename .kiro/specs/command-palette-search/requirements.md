# Requirements Document

## Introduction

A global command palette search feature for the WFRP 4e character sheet PWA. This provides a quick-access reference tool accessible from any page, allowing players to instantly look up game entities — spells, talents, skills, careers, runes, rituals, conditions, blessings, and miracles — and view their descriptions and effects at a glance. The feature operates as a pure reference/lookup tool with no character-specific filtering.

## Glossary

- **Command_Palette**: A modal overlay containing a search input and results list, triggered by keyboard shortcut or UI button, used for searching game reference data
- **Search_Index**: The client-side data structure built from all game entity data sources that enables fast fuzzy matching
- **Entity**: A single game data record such as a spell, talent, skill, career, rune, ritual, or condition
- **Entity_Type**: A category of game data (e.g., "Spell", "Talent", "Skill", "Career", "Rune", "Ritual", "Condition")
- **Fuzzy_Match**: A search algorithm that matches results even when the query does not exactly match the target text, tolerating minor typos and partial inputs
- **Result_Card**: A UI element displaying a single search result with the entity name, type badge, and summary information
- **Detail_View**: An expanded view within the Command_Palette showing the full information for a selected entity
- **Header_Bar**: The existing top navigation header rendered by the Navigation component (src/components/layout/Navigation.tsx)
- **PWA**: Progressive Web App — the existing application architecture

## Requirements

### Requirement 1: Palette Activation via Keyboard Shortcut

**User Story:** As a player, I want to open the command palette with a keyboard shortcut, so that I can quickly search for game rules without leaving my current page.

#### Acceptance Criteria

1. WHEN the user presses Ctrl+K on Windows/Linux or Cmd+K on macOS, THE Command_Palette SHALL open as a modal overlay on top of the current page
2. WHILE the Command_Palette is open, WHEN the user presses Ctrl+K or Cmd+K again, THE Command_Palette SHALL close
3. WHILE a text input, textarea, or select element has focus, WHEN the user presses the keyboard shortcut, THE Command_Palette SHALL still open (overriding default browser behavior for Ctrl+K)
4. THE Command_Palette SHALL prevent the default browser action for the Ctrl+K / Cmd+K key combination

### Requirement 2: Palette Activation via Header Button

**User Story:** As a mobile user, I want a search icon in the header bar, so that I can open the command palette without a keyboard.

#### Acceptance Criteria

1. THE Header_Bar SHALL display a search icon button accessible from all pages
2. WHEN the user taps or clicks the search icon button, THE Command_Palette SHALL open as a modal overlay
3. THE search icon button SHALL use a lucide-react Search icon consistent with the existing icon system
4. THE search icon button SHALL include an aria-label of "Search game reference"

### Requirement 3: Palette Dismissal

**User Story:** As a player, I want multiple ways to close the command palette, so that I can quickly return to what I was doing.

#### Acceptance Criteria

1. WHEN the user presses the Escape key, THE Command_Palette SHALL close and return focus to the previously focused element
2. WHEN the user clicks or taps outside the Command_Palette modal content area, THE Command_Palette SHALL close
3. THE Command_Palette SHALL display a visible close button that closes the palette when activated
4. WHEN the Command_Palette closes, THE Command_Palette SHALL clear the search input and results

### Requirement 4: Search Input Behavior

**User Story:** As a player, I want to start typing immediately when the palette opens, so that I can find what I need without extra clicks.

#### Acceptance Criteria

1. WHEN the Command_Palette opens, THE search input SHALL receive focus automatically
2. THE search input SHALL display placeholder text indicating available search categories (e.g., "Search spells, talents, skills, careers...")
3. WHEN the user types in the search input, THE Search_Index SHALL return matching results within 16 milliseconds for datasets of 1000 or fewer entities
4. WHILE the search input is empty, THE Command_Palette SHALL display no results (empty state)

### Requirement 5: Fuzzy Search Across Entity Types

**User Story:** As a player, I want the search to be forgiving of typos and partial words, so that I can find entries even when I don't remember the exact name.

#### Acceptance Criteria

1. THE Search_Index SHALL include data from all Entity_Types: spells, talents, skills, careers, runes, rituals, and conditions
2. THE Fuzzy_Match algorithm SHALL match against entity names as the primary search field
3. THE Fuzzy_Match algorithm SHALL match against entity descriptions or effects as a secondary search field
4. WHEN the search query partially matches an entity name, THE Search_Index SHALL include that entity in results (e.g., "fire" matches "Fireball" and "Lore of Fire")
5. WHEN the search query contains minor character transpositions or omissions, THE Fuzzy_Match algorithm SHALL still return relevant results

### Requirement 6: Grouped and Ranked Results

**User Story:** As a player, I want search results organized by type and ranked by relevance, so that I can quickly scan and find the right entry.

#### Acceptance Criteria

1. THE Command_Palette SHALL group results by Entity_Type with a visible type heading for each group
2. THE Command_Palette SHALL rank results by match relevance with higher-scoring matches appearing first within each group
3. THE Command_Palette SHALL display a maximum of 50 total results across all groups to maintain scroll performance
4. EACH Result_Card SHALL display the entity name and a type badge indicating the Entity_Type
5. EACH Result_Card for spells SHALL display the casting number (CN) and lore
6. EACH Result_Card for talents SHALL display the max level
7. EACH Result_Card for skills SHALL display the linked characteristic
8. EACH Result_Card for careers SHALL display the career class
9. EACH Result_Card for runes SHALL display the rune category
10. EACH Result_Card for conditions SHALL display whether the condition is stackable

### Requirement 7: Detail View for Selected Result

**User Story:** As a player, I want to tap a result to see its full details, so that I can read the complete rules text without leaving the palette.

#### Acceptance Criteria

1. WHEN the user clicks or taps a Result_Card, THE Command_Palette SHALL display a Detail_View with the full entity information
2. THE Detail_View for spells SHALL display: name, CN, range, target, duration, effect, and lore
3. THE Detail_View for talents SHALL display: name, max level, and full description
4. THE Detail_View for skills SHALL display: name and linked characteristic
5. THE Detail_View for careers SHALL display: career name, class, and all four level titles with their status, characteristics, skills, and talents
6. THE Detail_View for runes SHALL display: name, category, master status, max per item, XP cost, effects, and description
7. THE Detail_View for rituals SHALL display: name, CN, type, learning XP, ingredients, conditions, and description
8. THE Detail_View for conditions SHALL display: name, stackable status, description, effects, duration, and removal method
9. WHEN the Detail_View is open, THE Command_Palette SHALL display a back button to return to the results list
10. WHEN the user activates the back button, THE Command_Palette SHALL return to the results list preserving the previous search query and scroll position

### Requirement 8: Mobile Responsiveness

**User Story:** As a player using a phone at the table, I want the command palette to be usable on small screens, so that I can look up rules during play.

#### Acceptance Criteria

1. WHILE the viewport width is 767px or less, THE Command_Palette SHALL occupy the full viewport width and at least 90% of the viewport height
2. WHILE the viewport width is greater than 767px, THE Command_Palette SHALL display as a centered overlay with a maximum width of 640px
3. THE search input SHALL have a minimum touch target height of 44px on all viewport sizes
4. EACH Result_Card SHALL have a minimum touch target height of 44px on all viewport sizes
5. WHILE the mobile virtual keyboard is open, THE Command_Palette results list SHALL remain scrollable above the keyboard

### Requirement 9: Keyboard Navigation

**User Story:** As a power user, I want to navigate search results with keyboard arrows and Enter, so that I can look up entries without touching the mouse.

#### Acceptance Criteria

1. WHILE the Command_Palette is open, WHEN the user presses the ArrowDown key, THE Command_Palette SHALL move focus to the next Result_Card in the list
2. WHILE the Command_Palette is open, WHEN the user presses the ArrowUp key, THE Command_Palette SHALL move focus to the previous Result_Card in the list
3. WHEN a Result_Card has focus and the user presses Enter, THE Command_Palette SHALL open the Detail_View for that result
4. WHILE the Detail_View is open, WHEN the user presses Escape or Backspace, THE Command_Palette SHALL return to the results list

### Requirement 10: No Eligibility Filtering

**User Story:** As a player, I want to see all game entries regardless of my character's species or career, so that I can use this as a general reference tool.

#### Acceptance Criteria

1. THE Search_Index SHALL include all entities from all data sources without filtering by character species, career, or any character-specific attribute
2. THE Command_Palette SHALL display results from all lore categories including species-specific content (Elven magic, Dwarf runes, all deity miracles)
3. THE Command_Palette SHALL not require a character to be loaded to function

### Requirement 11: Accessibility

**User Story:** As a user relying on assistive technology, I want the command palette to be accessible, so that I can use it with screen readers and keyboard-only navigation.

#### Acceptance Criteria

1. THE Command_Palette modal SHALL use role="dialog" with aria-modal="true" and an aria-label describing its purpose
2. THE Command_Palette SHALL trap focus within the modal while open
3. THE results list SHALL use role="listbox" with each Result_Card using role="option"
4. THE currently highlighted Result_Card SHALL be indicated with aria-selected="true"
5. THE search input SHALL use aria-controls referencing the results listbox and aria-activedescendant referencing the highlighted option

### Requirement 12: Performance and Index Construction

**User Story:** As a player, I want the search to be instantly responsive, so that results appear as I type without any perceptible delay.

#### Acceptance Criteria

1. THE Search_Index SHALL be constructed from static data imports at application initialization time
2. THE Search_Index construction SHALL complete within 100 milliseconds on a mid-range mobile device
3. WHEN the user types a character in the search input, THE Command_Palette SHALL update displayed results within one animation frame (16ms)
4. THE Search_Index SHALL use a client-side fuzzy matching approach with no network requests required
