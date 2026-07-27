# Requirements Document

## Introduction

The WFRP 4e character sheet PWA contains over 300 spells organized across more than 20 lore categories (Petty, Arcane, 8 College Lores, Chaos, Elven, High Magic, Miracles, and supplement-specific lores). The current spell picker is a flat list inside a generic Picker modal with text search only. On mobile devices at gaming tables, scrolling through 300+ spells to find relevant ones is slow and frustrating. This feature improves the spell picker UI to support lore-based categorization, intelligent filtering based on the character's talents, and a mobile-friendly browsing experience.

## Glossary

- **Spell_Picker**: The modal UI component used to browse and select spells from the rulebook spell list
- **Lore**: A thematic category of spells (e.g., Lore of Fire, Lore of Beasts, Petty, Arcane, High Magic)
- **Spell_Data**: The data structure representing a spell entry with name, CN, range, target, duration, and effect fields
- **Lore_Tag**: A string field on Spell_Data that identifies which lore category a spell belongs to
- **Character_Lore**: The lore(s) a character has access to, derived from their talents (e.g., Arcane Magic (Fire) grants access to the Lore of Fire)
- **CN**: Casting Number, the difficulty value for casting a spell (0 for Petty spells, "-" for Blessings/Miracles)
- **Lore_Filter**: A UI control that allows the user to select one or more lore categories to narrow the displayed spell list
- **Relevance_Section**: A visual grouping within the picker that surfaces spells matching the character's known lore talents above other spells

## Requirements

### Requirement 1: Add Lore Classification to Spell Data

**User Story:** As a developer, I want each spell in the data file to carry a lore tag, so that the UI can group and filter spells by lore category.

#### Acceptance Criteria

1. THE Spell_Data interface SHALL include a `lore` field of type string
2. WHEN the application loads, THE Spell_Data for every entry in SPELL_LIST SHALL have a populated lore field matching one of the defined lore categories
3. THE Spell_Data lore field SHALL use consistent category names: "Petty", "Arcane", "Arcane Utility", "Lore of Beasts", "Lore of Death", "Lore of Fire", "Lore of Heavens", "Lore of Metal", "Lore of Life", "Lore of Light", "Lore of Shadows", "Blessings", "Lore of Hedgecraft", "Lore of Witchcraft", "Lore of Daemonology", "Lore of Necromancy", "Chaos", "Elven Petty", "Elven Arcane", "High Magic", "Magic of Vaul", "Magic of Mathlann", "Magic of Hoeth", "Miracles of Manann", "Miracles of Morr", "Miracles of Myrmidia"

### Requirement 2: Lore-Based Grouping in Spell Picker

**User Story:** As a player, I want spells to be visually grouped by lore in the picker, so that I can browse spells within a specific magical tradition without scrolling past unrelated spells.

#### Acceptance Criteria

1. WHEN the Spell_Picker is opened, THE Spell_Picker SHALL display spells organized under lore group headers
2. THE Spell_Picker SHALL display lore group headers as sticky section labels that remain visible while scrolling within that group
3. WHEN the user scrolls through the spell list, THE Spell_Picker SHALL show only spells belonging to the currently visible lore group beneath each header
4. THE Spell_Picker SHALL preserve the logical ordering of lore groups: Petty spells first, then Arcane, then College Lores alphabetically, then supplemental lores, then Miracles and Blessings

### Requirement 3: Lore Filter Tabs

**User Story:** As a player, I want to filter the spell list to show only one lore at a time, so that I can quickly jump to the specific lore my character uses without scrolling through the entire list.

#### Acceptance Criteria

1. WHEN the Spell_Picker is opened, THE Spell_Picker SHALL display a horizontal scrollable row of Lore_Filter tabs above the spell list
2. WHEN the user taps a Lore_Filter tab, THE Spell_Picker SHALL display only spells belonging to the selected lore category
3. WHEN the "All" Lore_Filter tab is selected, THE Spell_Picker SHALL display all available spells grouped by lore
4. THE Lore_Filter tabs SHALL include an "All" option and one tab per lore category present in the currently displayed spell list
5. WHILE a Lore_Filter tab is active, THE Spell_Picker SHALL visually highlight the selected tab to indicate the active filter

### Requirement 4: Text Search Within Filtered Results

**User Story:** As a player, I want to search by spell name within the current lore filter, so that I can quickly find a specific spell I already know the name of.

#### Acceptance Criteria

1. THE Spell_Picker SHALL display a text search input field above the spell list
2. WHEN the user types in the search field, THE Spell_Picker SHALL filter the displayed spells to only those whose name contains the search text (case-insensitive)
3. WHILE a Lore_Filter tab is active, THE search SHALL apply within the filtered lore subset only
4. WHEN the search field is cleared, THE Spell_Picker SHALL restore the full list for the active Lore_Filter selection
5. IF no spells match the current search and filter combination, THEN THE Spell_Picker SHALL display a "No spells found" message

### Requirement 5: Character Lore Relevance Prioritization

**User Story:** As a player, I want the picker to show spells from my character's lore first, so that the most relevant spells are immediately visible without manual filtering.

#### Acceptance Criteria

1. WHEN the Spell_Picker is opened and the character has one or more lore-granting talents, THE Spell_Picker SHALL pre-select the Lore_Filter tab matching the character's primary lore
2. WHEN the character has the talent "Arcane Magic (Fire)", THE Spell_Picker SHALL pre-select the "Lore of Fire" filter tab
3. WHEN the character has the talent "Petty Magic" and no arcane lore talent, THE Spell_Picker SHALL pre-select the "Petty" filter tab
4. WHEN the character has no lore-granting talent, THE Spell_Picker SHALL default to the "All" filter tab
5. THE Spell_Picker SHALL derive the character's lore from talents matching the patterns "Arcane Magic (X)", "Chaos Magic (X)", "Invoke (X)", or "Petty Magic"

### Requirement 6: Mobile-Optimized Layout

**User Story:** As a player using the app on a phone at a gaming table, I want the spell picker to be easy to use on small screens, so that I can select spells quickly without frustrating scrolling or tiny tap targets.

#### Acceptance Criteria

1. THE Spell_Picker modal SHALL occupy the full viewport height on mobile devices (screens narrower than 768px)
2. THE Spell_Picker spell list items SHALL have a minimum tap target height of 44px
3. THE Lore_Filter tabs SHALL be horizontally scrollable with touch-based momentum scrolling on mobile devices
4. THE Spell_Picker search input SHALL remain fixed at the top of the modal while the spell list scrolls
5. WHILE the Spell_Picker is open on a mobile device, THE Spell_Picker SHALL prevent background page scrolling

### Requirement 7: Spell Detail Preview

**User Story:** As a player, I want to see a spell's key details (CN, range, duration, effect) before selecting it, so that I can confirm it is the correct spell without having to add it first and then remove it.

#### Acceptance Criteria

1. THE Spell_Picker SHALL display each spell entry with the spell name and CN value visible in the list
2. WHEN the user taps on a spell entry, THE Spell_Picker SHALL expand that entry inline to reveal the full details: range, target, duration, and effect
3. WHEN the user taps the expanded spell entry again or taps a "Select" button within the expanded view, THE Spell_Picker SHALL add the spell to the character and close the picker
4. WHEN the user taps a different spell entry while one is expanded, THE Spell_Picker SHALL collapse the previously expanded entry and expand the newly tapped entry

### Requirement 8: Already-Known Spell Indication

**User Story:** As a player, I want to see which spells I already know in the picker, so that I do not accidentally try to add a duplicate.

#### Acceptance Criteria

1. WHEN the Spell_Picker displays a spell that the character already has in their spell list, THE Spell_Picker SHALL visually mark that spell as already known (e.g., greyed out with a checkmark icon)
2. WHEN the user taps a spell that is already known, THE Spell_Picker SHALL not add a duplicate to the character's spell list
3. THE Spell_Picker SHALL display already-known spells in their normal position within the lore group rather than hiding them
