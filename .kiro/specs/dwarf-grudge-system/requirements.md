# Requirements Document

## Introduction

The Dwarf Grudge Book System tracks personal and party grudges for Dwarf characters in a WFRP 4e character sheet PWA. Based on the Dwarf Player's Guide, grudges replace or supplement the Ambitions system for Dwarf characters — recording wrongs done to them, the perpetrator responsible, and the restitution required. The system supports Standard Grudges (25 XP) and Blood Grudges (50 XP), up to 3 Party Grudges, and tracks satisfied/outstanding status. The feature is gated behind a house rule toggle and only visible for Dwarf species characters.

## Glossary

- **Grudge_Panel**: The UI component on the Character page that displays and manages the Dwarf character's Book of Grudges
- **Grudge_Entry**: A single grudge record containing: offence description, perpetrator, restitution required, type (standard or blood), status (outstanding or satisfied), and date fields
- **Standard_Grudge**: A grudge that can be resolved through restitution (apology, payment, a specific act); earns 25 XP when satisfied
- **Blood_Grudge**: A serious grudge that requires the death of the perpetrator; earns 50 XP when satisfied
- **Party_Grudge**: A shared grudge recorded by all Dwarf characters in the party, reflecting a collective commitment to vengeance; maximum of 3 allowed
- **Character_Store**: The persisted Character interface and its update mechanism used throughout the PWA
- **HouseRules**: The `houseRules` object on the Character interface containing optional rule toggles, displayed on the Settings page
- **Dwarf_Species**: Character species values that qualify for the Grudge system: any species string containing "Dwarf" (e.g. "Dwarf", "Dwarf (Karaz-a-Karak)", "Dwarf (Barak Varr)", "Dwarf (Karak Azul)")

## Requirements

### Requirement 1: Grudge Data Model

**User Story:** As a player with a Dwarf character, I want my grudges stored on my character data, so that my Book of Grudges persists across sessions.

#### Acceptance Criteria

1. THE Character_Store SHALL include an optional `grudges` field containing an array of Grudge_Entry objects
2. THE Grudge_Entry SHALL contain the following fields: a unique identifier (string), offence description (string), perpetrator name (string), restitution required (string), type (`'standard'` or `'blood'`), status (`'outstanding'` or `'satisfied'`), date recorded (string), and date satisfied (string or undefined)
3. THE Grudge_Entry SHALL include a boolean `isPartyGrudge` field indicating whether the grudge is shared by the party
4. WHEN a character is loaded from storage, THE Character_Store SHALL preserve the previously saved `grudges` array exactly as it was stored, including an empty array for characters that never had grudges added
5. THE Character_Store SHALL serialize and deserialize the `grudges` array such that saving a character with any valid grudge entries and reloading it produces the same entries with identical field values

### Requirement 2: House Rule Toggle

**User Story:** As a player, I want to enable or disable the Grudge Book system via a house rule toggle, so that groups who do not use this optional mechanic are not encumbered by it.

#### Acceptance Criteria

1. THE HouseRules interface SHALL include a boolean `useGrudgeBook` field, defaulting to `false`
2. THE Settings page SHALL display a toggle for "Grudge Book (Dwarf)" in the House Rules section, following the same ON/OFF button pattern as existing toggles
3. THE Settings page toggle description SHALL read "Track Dwarf grudges for XP (Dwarf Player's Guide)"
4. WHEN `useGrudgeBook` is `false`, THE Grudge_Panel SHALL not be rendered on the Character page regardless of character species
5. WHEN `useGrudgeBook` is `true` AND the character species is a Dwarf_Species value, THE Grudge_Panel SHALL be visible on the Character page
6. WHEN `useGrudgeBook` is toggled from `true` to `false`, THE Character_Store SHALL preserve the existing `grudges` array (not clear it)

### Requirement 3: Species Gating

**User Story:** As a player, I want the Grudge Book to only appear for Dwarf characters, so that it does not clutter the interface for non-Dwarf species.

#### Acceptance Criteria

1. WHILE `useGrudgeBook` is `true` AND the character species is a Dwarf_Species value, THE Grudge_Panel SHALL be visible on the Character page
2. WHILE the character species is not a Dwarf_Species value, THE Grudge_Panel SHALL not be rendered on the Character page even if `useGrudgeBook` is `true`
3. WHEN the character species changes from a Dwarf_Species to a non-Dwarf_Species, THE Grudge_Panel SHALL hide without clearing the stored `grudges` array from the Character_Store
4. WHEN the character species changes from a non-Dwarf_Species to a Dwarf_Species (and `useGrudgeBook` is `true`), THE Grudge_Panel SHALL appear and display the stored grudges if any exist, or display an empty state if no grudges are stored
5. THE species detection logic SHALL treat any species string containing "Dwarf" (case-insensitive) as a Dwarf_Species value

### Requirement 4: Add New Grudge

**User Story:** As a player, I want to record a new grudge in my Book of Grudges, so that I can track wrongs committed against my character during play.

#### Acceptance Criteria

1. THE Grudge_Panel SHALL provide a control to add a new Grudge_Entry
2. WHEN adding a new grudge, THE Grudge_Panel SHALL present input fields for: offence description, perpetrator name, restitution required, type (Standard or Blood), and whether it is a Party Grudge
3. WHEN the player submits a new grudge with all required fields populated (offence, perpetrator, restitution, type), THE Character_Store SHALL append a new Grudge_Entry with status `'outstanding'`, a generated unique identifier, and the current date as the date recorded
4. IF the player attempts to submit a new grudge with any required field empty, THEN THE Grudge_Panel SHALL prevent submission and indicate which fields are missing
5. WHEN a new Party_Grudge is added AND 3 party grudges with status `'outstanding'` already exist, THE Grudge_Panel SHALL prevent the addition and display a message stating the maximum of 3 outstanding party grudges has been reached
6. THE Grudge_Panel SHALL default the type selector to "Standard" when the add-grudge form is presented

### Requirement 5: Display Grudge List

**User Story:** As a player, I want to see all my grudges at a glance, so that I can reference them during play and track my progress toward satisfaction.

#### Acceptance Criteria

1. THE Grudge_Panel SHALL display all Grudge_Entry items from the character's `grudges` array
2. THE Grudge_Panel SHALL visually distinguish outstanding grudges from satisfied grudges using distinct styling (e.g. satisfied entries appear struck through or dimmed)
3. THE Grudge_Panel SHALL visually distinguish Blood_Grudge entries from Standard_Grudge entries using a distinct indicator (e.g. icon, colour accent, or label) that does not rely on colour alone
4. THE Grudge_Panel SHALL display Party_Grudge entries with a distinct "Party" indicator distinguishing them from personal grudges
5. WHILE no grudges exist in the character's `grudges` array, THE Grudge_Panel SHALL display an empty state message indicating no grudges have been recorded
6. THE Grudge_Panel SHALL display outstanding grudges before satisfied grudges in the list

### Requirement 6: Satisfy a Grudge

**User Story:** As a player, I want to mark a grudge as satisfied when restitution has been obtained, so that I can track my XP rewards and narrative progress.

#### Acceptance Criteria

1. THE Grudge_Panel SHALL provide a control on each outstanding Grudge_Entry to mark it as satisfied
2. WHEN the player marks a grudge as satisfied, THE Character_Store SHALL update the Grudge_Entry status to `'satisfied'` and set the date satisfied to the current date
3. WHEN a Standard_Grudge is satisfied, THE Grudge_Panel SHALL display a confirmation indicating 25 XP earned
4. WHEN a Blood_Grudge is satisfied, THE Grudge_Panel SHALL display a confirmation indicating 50 XP earned
5. THE Grudge_Panel SHALL not allow a satisfied grudge to be reverted to outstanding status (satisfaction is permanent)
6. WHEN a grudge is satisfied, THE Grudge_Panel SHALL not automatically modify the character's XP totals (XP tracking is manual and managed elsewhere on the sheet)

### Requirement 7: Delete a Grudge

**User Story:** As a player, I want to remove a grudge entry that was added by mistake, so that I can correct errors in my Book of Grudges.

#### Acceptance Criteria

1. THE Grudge_Panel SHALL provide a control on each Grudge_Entry to delete it
2. WHEN the player activates the delete control, THE Grudge_Panel SHALL display a confirmation dialog before removing the entry
3. WHEN the player confirms deletion, THE Character_Store SHALL remove the Grudge_Entry from the `grudges` array
4. WHEN the player cancels deletion, THE Character_Store SHALL retain the Grudge_Entry unchanged

### Requirement 8: XP Reference Display

**User Story:** As a player, I want to see the XP rewards associated with each grudge type, so that I can reference the rules without consulting the book.

#### Acceptance Criteria

1. THE Grudge_Panel SHALL display a reference indicating that Standard Grudges earn 25 XP when satisfied
2. THE Grudge_Panel SHALL display a reference indicating that Blood Grudges earn 50 XP when satisfied
3. THE Grudge_Panel SHALL display the XP reference in a summary or header area that is visible without scrolling through the grudge list

### Requirement 9: Party Grudge Limit

**User Story:** As a player, I want the system to enforce a maximum of 3 outstanding party grudges, so that the party cannot exceed the rules-defined limit.

#### Acceptance Criteria

1. THE Grudge_Panel SHALL permit a maximum of 3 Grudge_Entry items with `isPartyGrudge` set to `true` AND status `'outstanding'` at any given time
2. WHEN fewer than 3 outstanding party grudges exist, THE Grudge_Panel SHALL allow new party grudges to be added without restriction
3. WHEN exactly 3 outstanding party grudges exist AND the player attempts to add a new party grudge, THE Grudge_Panel SHALL prevent the addition and display a message indicating the limit has been reached
4. WHEN a party grudge is satisfied (changing status from `'outstanding'` to `'satisfied'`), THE Grudge_Panel SHALL allow a new party grudge to be added (the satisfied grudge no longer counts toward the limit)

### Requirement 10: Character Page Placement

**User Story:** As a player, I want the Grudge Book panel to fit naturally within the Character page layout, so that it is easy to find without disrupting the existing page flow.

#### Acceptance Criteria

1. THE Grudge_Panel SHALL render within the Character page identity sub-tab section, positioned after the DeitySelector and before the Characteristics card
2. THE Grudge_Panel SHALL use the existing Card component for its container, matching the same padding and border styling as other Card instances on the Character page
3. THE Grudge_Panel SHALL use CSS modules for styling, with a dedicated `.module.css` file following the same naming convention as other Character page components
4. WHILE the viewport width is 768px or greater, THE Grudge_Panel SHALL render at full width within the identity tab column layout
5. WHILE the viewport width is less than 768px, THE Grudge_Panel SHALL stack vertically with no horizontal overflow, and all interactive elements SHALL meet a minimum touch-target size of 44×44 CSS pixels
