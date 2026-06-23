# Requirements Document

## Introduction

This feature adds hireling NPC tracking to the WFRP 4e character sheet PWA, based on the "Hire 'Em - Fire 'Em" chapter from the Up in Arms expansion (Chapter X). Hirelings are NPCs employed by player characters for various roles — muscle, brains, scouts, porters, physicians, scribes, and more. The system tracks hireling stat blocks (full characteristic profiles), upkeep costs tied to estate finances, combat wound/condition tracking, and the flavour elements (templates, quirks, work ethic) that make each hireling a distinct individual. The feature stores hirelings as part of the character's saved data, introduces a new "Retinue" page that combines hirelings with existing animal companions, and integrates with both the Estate page (upkeep costs) and the Combat page (wound/condition tracking).

## Glossary

- **Hireling**: A non-player character employed by the player character in exchange for payment, as defined in Up in Arms Chapter X.
- **Hireling_Profile**: A pre-defined stat block for a hireling type (e.g., Seasoned Mercenary, Local Scout, Lawyer, Porter, Doktor, Scribe) containing characteristics, skills, talents, traits, and trappings.
- **Hireling_Template**: A modifier applied to a hireling's base profile that adjusts characteristics, skills, or talents (e.g., Veteran of Adventures, Infirm, Bright Spark, Reformed Rogue, Old Salt, Diamond in the Rough).
- **Physical_Quirk**: A cosmetic or minor mechanical trait rolled on the d100 Physical Quirks table that describes the hireling's appearance.
- **Work_Ethic**: A behavioural trait rolled on the d100 Work Ethic table that describes how the hireling approaches their job.
- **Personality_Quirk**: A character trait rolled on the d100 Personality Quirks table that describes the hireling's personality.
- **Hireling_Manager**: The UI component and data layer responsible for creating, editing, displaying, and removing hirelings from a character's record.
- **Retinue_Page**: The new top-level navigation page that combines hireling management and animal companion management into a single unified view.
- **Character_Data**: The TypeScript `Character` interface and localStorage-persisted data object that stores all character information.
- **Estate_Finance_System**: The existing estate page financial tracking (treasury, monthly income/expenses, holdings) where hireling upkeep costs are integrated.
- **Combat_Tracker**: The existing combat page wound and condition tracking system where hireling combat state is displayed during encounters.
- **Upkeep_Cost**: The recurring monetary cost (in GC/SS/D) required to retain a hireling's services, derived from the hireling's status tier.

## Requirements

### Requirement 1: Hireling Data Model

**User Story:** As a player, I want hirelings stored as part of my character data with full stat blocks, so that I can track their capabilities and reference them during play.

#### Acceptance Criteria

1. THE Character_Data SHALL include a `hirelings` array field that stores zero or more hireling entries.
2. THE Hireling_Manager SHALL store each hireling with the following fields: name (string), role (string), status (string representing social tier e.g. "Silver 3"), characteristics (M, WS, BS, S, T, I, Ag, Dex, Int, WP, Fel, W), current wounds (wCur), skills (string), talents (string), traits (string), trappings (string), template (string), physicalQuirk (string), workEthic (string), personalityQuirk (string), notes (string), and upkeep cost (object with gc, ss, d fields).
3. THE Hireling_Manager SHALL store each hireling with a unique numeric id field to support stable identification across edits and reorders.
4. THE Character_Data SHALL persist hireling data to localStorage following the same save/load pattern used for companions and other character arrays.
5. THE Hireling_Manager SHALL support a maximum of 10 hirelings per character to maintain UI performance and reflect reasonable in-game limits.

### Requirement 2: Hireling Creation and Profile Selection

**User Story:** As a player, I want to create hirelings by selecting from pre-defined profiles or entering custom data, so that I can quickly add book-accurate NPCs or homebrew hirelings.

#### Acceptance Criteria

1. WHEN the user adds a new hireling, THE Hireling_Manager SHALL offer a choice between selecting a pre-defined Hireling_Profile and creating a custom blank hireling.
2. THE Hireling_Manager SHALL provide the following pre-defined Hireling_Profiles from Up in Arms: Seasoned Mercenary (Silver 3), Local Scout (Silver 1), Lawyer (Silver 3), Porter (Silver 1), Doktor (Silver 5), and Scribe (Silver 2).
3. WHEN the user selects a pre-defined Hireling_Profile, THE Hireling_Manager SHALL populate all characteristic values, skills, talents, traits, trappings, and status from the selected profile data.
4. WHEN the user creates a custom hireling, THE Hireling_Manager SHALL create a blank hireling entry with all numeric fields set to zero and all text fields set to empty strings.
5. WHEN a hireling is created from a profile, THE Hireling_Manager SHALL allow the user to edit all populated fields after creation.

### Requirement 3: Hireling Template Application

**User Story:** As a player, I want to apply templates to hirelings that modify their base stats, so that I can represent the variety described in the Up in Arms template system.

#### Acceptance Criteria

1. THE Hireling_Manager SHALL provide a template selection control when creating or editing a hireling, with options: None, Veteran of Adventures, Infirm, Bright Spark, Reformed Rogue, Old Salt, and Diamond in the Rough.
2. WHEN the user selects the Veteran of Adventures template, THE Hireling_Manager SHALL display the stat modifiers (WS +5, S +5, T +5, I +10) and additional skills/talents as reference text.
3. WHEN the user selects the Infirm template, THE Hireling_Manager SHALL display the stat modifiers (M -1, WS -10, BS -10, S -5, T -5, I -10, Ag -10, Dex -10, all skills -10) as reference text.
4. WHEN the user selects any template, THE Hireling_Manager SHALL store the template name in the hireling record but SHALL NOT automatically modify the hireling's stored characteristic values, allowing the user to apply modifiers manually.
5. THE Hireling_Manager SHALL display the selected template name on the hireling card for reference during play.

### Requirement 4: Hireling Quirks and Flavour

**User Story:** As a player, I want to record physical quirks, work ethic, and personality quirks for each hireling, so that I can reference their individuality during roleplay.

#### Acceptance Criteria

1. THE Hireling_Manager SHALL provide editable text fields for physical quirk, work ethic, and personality quirk on each hireling entry.
2. WHEN creating a hireling, THE Hireling_Manager SHALL offer a "Roll Random Quirks" action that populates the physical quirk, work ethic, and personality quirk fields with randomly selected entries from the Up in Arms d100 tables.
3. THE Hireling_Manager SHALL store the quirk text values as free-text strings, allowing the user to edit or override rolled results.
4. THE Hireling_Manager SHALL display quirk fields in a visually distinct section of the hireling card, separate from the stat block.

### Requirement 5: Hireling Upkeep and Estate Integration

**User Story:** As a player, I want hireling upkeep costs tracked and integrated with my estate finances, so that I can see the total financial impact of my retinue.

#### Acceptance Criteria

1. THE Hireling_Manager SHALL provide editable upkeep cost fields (GC, SS, D) representing the hireling's weekly or monthly pay rate on each hireling entry.
2. WHEN hirelings have upkeep costs defined, THE Estate_Finance_System SHALL display a "Hireling Upkeep" line item in the monthly financial summary showing the total combined upkeep of all hirelings.
3. WHEN the user triggers the "Collect Monthly Income & Pay Expenses" action on the Estate page, THE Estate_Finance_System SHALL subtract the total hireling upkeep from the treasury alongside existing estate expenses.
4. THE Estate_Finance_System SHALL compute total hireling upkeep by summing the upkeep cost fields across all hirelings in the character's hirelings array.
5. IF a hireling has no upkeep cost defined (all currency fields are zero), THEN THE Estate_Finance_System SHALL exclude that hireling from the upkeep total.

### Requirement 6: Hireling Combat Integration

**User Story:** As a player, I want to track hireling wounds and conditions during combat encounters, so that I can manage their status alongside my character.

#### Acceptance Criteria

1. THE Combat_Tracker SHALL display a collapsible "Hirelings" section showing each hireling's name, current wounds, maximum wounds, and active conditions.
2. WHEN the user adjusts a hireling's current wounds in the Combat_Tracker, THE Hireling_Manager SHALL persist the updated wound value to the hireling record in Character_Data.
3. THE Combat_Tracker SHALL provide controls to increment and decrement hireling wound values.
4. THE Combat_Tracker SHALL provide a control to add and remove conditions (from the existing condition list) to each hireling displayed in the combat section.
5. THE Hireling_Manager SHALL store an array of active conditions on each hireling entry, using the same condition format (name and level) as the main character's conditions.
6. WHEN a hireling's current wounds reach zero, THE Combat_Tracker SHALL visually indicate the hireling is incapacitated using a distinct style (e.g., greyed-out or marked with a warning indicator).

### Requirement 7: Retinue Page and Navigation

**User Story:** As a player, I want a dedicated "Retinue" page that combines hirelings and animal companions in one place, so that I can manage all my followers from a single location.

#### Acceptance Criteria

1. THE Hireling_Manager SHALL be accessible on a new top-level page called "Retinue" in the main navigation, replacing the current placement of animal companions on the Character page notes tab.
2. THE Retinue page SHALL display two sections: "Hirelings" and "Animal Companions", with hirelings listed first.
3. WHEN the user navigates to the Retinue page, THE Hireling_Manager SHALL display a list of all current hirelings with summary information (name, role, status, current wounds).
4. THE Retinue page SHALL display the existing animal companion cards (with their full stat blocks, trained skills, pack animal toggle, and notes) in the "Animal Companions" section, using the same functionality currently on the Character page.
5. THE Hireling_Manager SHALL provide an "Add Hireling" button that initiates the hireling creation flow (profile selection or custom).
6. THE Hireling_Manager SHALL provide a delete action on each hireling card, with a confirmation prompt before removal.
7. THE Hireling_Manager SHALL display an empty state message when no hirelings exist, with guidance text explaining the feature.
8. THE Retinue page SHALL remove the "Animal Companions" section from the Character page notes tab to avoid duplication.

### Requirement 8: Hireling Card Display

**User Story:** As a player, I want each hireling displayed as a detailed card with all their information organized clearly, so that I can quickly reference their capabilities at the table.

#### Acceptance Criteria

1. THE Hireling_Manager SHALL display each hireling as an expandable card showing the hireling name, role, status, and current wounds in the collapsed state.
2. WHEN the user expands a hireling card, THE Hireling_Manager SHALL display the full characteristic row (M, WS, BS, S, T, I, Ag, Dex, Int, WP, Fel, W), skills, talents, traits, trappings, template, quirks, upkeep cost, conditions, and notes.
3. THE Hireling_Manager SHALL render the characteristic values in a horizontal grid matching the layout style used for animal companions.
4. THE Hireling_Manager SHALL make all displayed fields editable in-place, following the existing EditableField pattern used throughout the application.
5. THE Hireling_Manager SHALL display the wound tracker (current/max) with increment/decrement controls, consistent with the combat page wound display pattern.

### Requirement 9: Hireling Data Migration

**User Story:** As a developer, I want the hireling feature to be backwards-compatible with existing character data, so that loading older characters does not cause errors.

#### Acceptance Criteria

1. WHEN loading a character record that does not contain a `hirelings` field, THE Character_Data SHALL default the field to an empty array without error.
2. THE Character_Data SHALL increment the character data version number to reflect the addition of the hirelings field.
3. THE Character_Data SHALL include the `hirelings` field with a default empty array in the BLANK_CHARACTER constant.
4. IF existing character data is loaded with a missing or undefined `hirelings` field, THEN THE Character_Data SHALL treat it as an empty array during all read operations.

### Requirement 10: Hireling Profile Static Data

**User Story:** As a developer, I want hireling profile data stored in a dedicated static data file, so that profiles can be referenced for creation and future profiles can be added easily.

#### Acceptance Criteria

1. THE Hireling_Manager SHALL load pre-defined hireling profiles from a static data file (`src/data/hirelings.ts`) following the same module pattern used by careers, talents, and weapons data.
2. THE static hireling data file SHALL define each profile with fields matching the hireling data model: name, role, status, characteristics, skills, talents, traits, and trappings.
3. THE static hireling data file SHALL contain accurate transcriptions of the six hireling profiles from Up in Arms: Seasoned Mercenary, Local Scout, Lawyer, Porter, Doktor, and Scribe.
4. THE static hireling data file SHALL export the hireling template descriptions (name, stat modifiers, skill modifiers, additional talents, and additional trappings) for display in the template selection UI.
5. THE static hireling data file SHALL export the d100 tables for Physical Quirks, Work Ethic, and Personality Quirks as arrays for use in the random generation feature.
6. THE static hireling data file SHALL compile without TypeScript errors and follow the existing project conventions for static data modules.
