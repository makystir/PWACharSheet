# Requirements Document

## Introduction

This feature consolidates two overlapping psychology components — PsychologyTracker (Identity tab) and PsychologyPanel (Notes tab) — into a single unified panel. Both currently operate on the same `character.psychologyTraits` array but offer different type lists, different UX, and live on different tabs, creating confusion. The unified panel combines all psychology types, the Broken Tally / WP threshold mechanic, and rule reminders into one cohesive component placed on the Identity tab. The freeform `character.psych` textarea remains on the Notes tab as a separate quick-notes field.

## Glossary

- **Unified_Psychology_Panel**: The single consolidated component that replaces both PsychologyTracker and PsychologyPanel, providing CRUD for psychology traits, the Broken Tally mechanic, and rule reminders.
- **Psychology_Trait**: A stored entry representing a character's psychological condition, containing a type, optional target, and optional numeric rating.
- **Psychology_Type**: One of the supported psychology categories: Animosity, Hatred, Fear, Terror, Frenzy, Prejudice, Phobia, or Trauma.
- **Broken_Tally**: A numeric counter tracking how many times a character has been Broken, used to determine phobia acquisition.
- **WP_Value**: The character's Willpower characteristic total (initial + advance + bonus), used as the threshold for phobia acquisition.
- **Rule_Reminder**: A short text description of the mechanical effect for each Psychology_Type, displayed alongside the trait.
- **Identity_Tab**: The character page sub-tab where mechanical trackers (characteristics, skills, talents) are displayed.
- **Notes_Tab**: The character page sub-tab where freeform notes, session notes, and auxiliary panels are displayed.
- **House_Rules_Toggle**: The `usePsychologyTracker` boolean setting that controls visibility of the psychology tracking feature.
- **Character_Page**: The main page component displaying all character information across multiple sub-tabs.

## Requirements

### Requirement 1: Unified Type List

**User Story:** As a player, I want one panel that supports all psychology types from the rulebook, so that I can track any psychological condition without switching between tabs.

#### Acceptance Criteria

1. THE Unified_Psychology_Panel SHALL support all eight Psychology_Type values: Animosity, Hatred, Fear, Terror, Frenzy, Prejudice, Phobia, and Trauma.
2. WHEN a user opens the add-trait form, THE Unified_Psychology_Panel SHALL display all eight Psychology_Type values as selectable options.

### Requirement 2: Trait CRUD Operations

**User Story:** As a player, I want to add, view, and remove psychology traits, so that I can keep my character's psychological conditions up to date.

#### Acceptance Criteria

1. WHEN a user submits the add-trait form with a valid type and required fields, THE Unified_Psychology_Panel SHALL create a new Psychology_Trait and persist it to the `character.psychologyTraits` array.
2. WHEN the type is Animosity, Hatred, Prejudice, Phobia, or Trauma, THE Unified_Psychology_Panel SHALL require a non-empty target or description field before allowing submission.
3. WHEN the type is Fear or Terror, THE Unified_Psychology_Panel SHALL require a positive numeric rating before allowing submission.
4. WHEN the type is Frenzy, THE Unified_Psychology_Panel SHALL allow submission with only the type selected (no additional required fields).
5. WHEN a user activates the remove action on a Psychology_Trait, THE Unified_Psychology_Panel SHALL remove that trait from the `character.psychologyTraits` array.
6. THE Unified_Psychology_Panel SHALL display each stored Psychology_Trait showing its type, target (if present), and rating (if present).

### Requirement 3: Broken Tally Mechanic

**User Story:** As a player, I want to track my Broken Tally against my Willpower threshold, so that I know when my character acquires a phobia.

#### Acceptance Criteria

1. THE Unified_Psychology_Panel SHALL display the current Broken_Tally value and the WP_Value threshold.
2. WHEN a user activates the increment action, THE Unified_Psychology_Panel SHALL increase the Broken_Tally by one.
3. WHEN the Broken_Tally is greater than or equal to the WP_Value, THE Unified_Psychology_Panel SHALL display a prominent phobia acquisition alert.
4. WHILE the Broken_Tally is less than the WP_Value, THE Unified_Psychology_Panel SHALL display the tally in its default (non-alert) style.

### Requirement 4: Rule Reminders

**User Story:** As a player, I want to see a brief rule reminder for each psychology trait, so that I can quickly recall the mechanical effect during play.

#### Acceptance Criteria

1. THE Unified_Psychology_Panel SHALL display a Rule_Reminder alongside each Psychology_Trait in the trait list.
2. WHEN a user selects a Psychology_Type in the add-trait form, THE Unified_Psychology_Panel SHALL display a preview of the corresponding Rule_Reminder.
3. THE Unified_Psychology_Panel SHALL provide Rule_Reminder text for all eight Psychology_Type values.

### Requirement 5: Panel Placement

**User Story:** As a player, I want the unified psychology panel in one consistent location, so that I don't have to look in multiple places for psychology information.

#### Acceptance Criteria

1. THE Character_Page SHALL render the Unified_Psychology_Panel on the Identity_Tab.
2. THE Character_Page SHALL remove the separate PsychologyPanel component from the Notes_Tab.
3. THE Character_Page SHALL retain the freeform `character.psych` textarea on the Notes_Tab, independent of the Unified_Psychology_Panel.

### Requirement 6: House Rule Gating

**User Story:** As a player, I want the unified psychology panel to only appear when the house rule is enabled, so that it doesn't clutter the interface when not in use.

#### Acceptance Criteria

1. WHILE the House_Rules_Toggle `usePsychologyTracker` is enabled, THE Character_Page SHALL display the Unified_Psychology_Panel on the Identity_Tab.
2. WHILE the House_Rules_Toggle `usePsychologyTracker` is disabled, THE Character_Page SHALL hide the Unified_Psychology_Panel.
3. WHILE the House_Rules_Toggle `usePsychologyTracker` is disabled, THE Character_Page SHALL still display the freeform `character.psych` textarea on the Notes_Tab.

### Requirement 7: Data Compatibility

**User Story:** As a player, I want my existing psychology traits to appear in the new unified panel without data loss, so that I don't have to re-enter information.

#### Acceptance Criteria

1. THE Unified_Psychology_Panel SHALL read from and write to the existing `character.psychologyTraits` array without schema changes.
2. THE Unified_Psychology_Panel SHALL read the existing `character.brokenTally` field for the Broken_Tally display.
3. WHEN a character has existing Psychology_Trait entries of any valid Psychology_Type, THE Unified_Psychology_Panel SHALL display those entries correctly.

### Requirement 8: Validation

**User Story:** As a player, I want the form to prevent me from adding incomplete traits, so that my psychology data stays consistent.

#### Acceptance Criteria

1. WHILE the add-trait form has an empty type selection, THE Unified_Psychology_Panel SHALL disable the submit action.
2. WHILE the selected type requires a target and the target field is empty, THE Unified_Psychology_Panel SHALL disable the submit action.
3. WHILE the selected type requires a rating and the rating is not a positive number, THE Unified_Psychology_Panel SHALL disable the submit action.
4. FOR ALL valid Psychology_Trait submissions, parsing the trait type and re-validating SHALL confirm the trait meets the requirements for its type (round-trip validation property).
