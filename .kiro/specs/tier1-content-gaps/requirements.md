# Requirements Document

## Introduction

This feature addresses three related content gaps in the WFRP 4e character sheet PWA by integrating material from two expansion sourcebooks. The three items are: (1) adding Warrior-class endeavours from Up in Arms Appendix II, (2) adding a Group Advantage house rule toggle from Up in Arms Appendix I, and (3) adding Dwarf deity-specific miracles from the Dwarf Players Guide Chapter VI. Each item extends existing data structures and UI patterns already present in the application.

## Glossary

- **Endeavour_Module**: The TypeScript source file (`src/logic/endeavours.ts`) containing the `GENERAL_ENDEAVOURS` array and `CLASS_ENDEAVOURS` record that stores class-specific downtime activity lists.
- **CLASS_ENDEAVOURS**: The Record<string, string[]> in the Endeavour_Module mapping character class names to arrays of available endeavour names.
- **HouseRules_Interface**: The TypeScript interface `HouseRules` in `src/types/character.ts` defining the shape of the house rules settings object stored per character.
- **Settings_Page**: The React component (`src/components/pages/SettingsPage.tsx`) that renders house rule toggle controls.
- **Combat_Page**: The React component (`src/components/pages/CombatPage.tsx`) that renders the combat dashboard including advantage tracking.
- **Combat_Dashboard**: The React component (`src/components/combat/CombatDashboard.tsx`) that displays the advantage counter and combat state.
- **Spell_Data_Module**: The TypeScript source file (`src/data/spells.ts`) containing the `SPELL_LIST` array of spell/miracle entries with fields: name, cn, range, target, duration, effect.
- **SpellData**: The TypeScript interface defining a spell entry (name, cn, range, target, duration, effect).
- **Dwarf_Source**: The source text file (`dwarfguide.md`) in the project root containing extracted Dwarf Players Guide content.
- **Group_Advantage**: An alternative advantage tracking mode from Up in Arms where the entire party shares a single advantage pool instead of each character tracking individual advantage.
- **Advantage_Cap**: The existing house rule field (`advantageCap`) that limits the maximum value of the advantage counter; applies equally to individual or group advantage.
- **Miracle**: A deity-specific divine spell with a casting number greater than 0, distinct from generic Blessings (CN 0). Miracles are unlocked via the "Invoke (Deity)" talent.
- **Dwarf_Ancestor_Gods**: The seven Dwarf deities with defined miracles: Grungni, Valaya, Grimnir, Gazul, Smednir, Thungni, and Morgrim.

## Requirements

### Requirement 1: Add Warrior Endeavours from Up in Arms

**User Story:** As a player with a Warriors-class character, I want to see the expanded endeavour options from Up in Arms, so that I have the full set of downtime activities available during between-adventure periods.

#### Acceptance Criteria

1. THE Endeavour_Module SHALL include the following entries in the `CLASS_ENDEAVOURS` record for the "Warriors" key: "Combat Training", "Drill", "Challenge", "Seek Patronage", "Establish Contacts", and "Tournament".
2. THE Endeavour_Module SHALL retain the existing "Combat Training" entry for Warriors alongside the new additions.
3. WHEN a user views the endeavour selection for a Warriors-class character, THE Endeavours_Page SHALL display all six Warrior endeavours as selectable options.
4. THE Endeavour_Module SHALL compile without TypeScript errors after adding the new entries.
5. WHEN the existing test suite is executed, THE application SHALL pass all pre-existing tests without regression.

### Requirement 2: Add Group Advantage House Rule Toggle

**User Story:** As a GM, I want to toggle Group Advantage mode in the house rules settings, so that the party can use the shared advantage pool variant from Up in Arms instead of individual tracking.

#### Acceptance Criteria

1. THE HouseRules_Interface SHALL include a boolean field `useGroupAdvantage` with a default value of `false`.
2. WHEN the `useGroupAdvantage` field is not present on existing character data, THE application SHALL treat the value as `false` for backward compatibility.
3. THE Settings_Page SHALL display a toggle control for "Group Advantage" with a description explaining that the party shares a single advantage pool.
4. WHEN the user enables the Group Advantage toggle, THE Settings_Page SHALL persist the value `true` to `houseRules.useGroupAdvantage`.
5. WHEN the user disables the Group Advantage toggle, THE Settings_Page SHALL persist the value `false` to `houseRules.useGroupAdvantage`.
6. THE HouseRules_Interface SHALL compile without TypeScript errors after adding the new field.

### Requirement 3: Group Advantage Combat Display

**User Story:** As a player using the Group Advantage house rule, I want the combat page to display a single shared advantage pool instead of per-character advantage, so that the UI matches the house rule being used.

#### Acceptance Criteria

1. WHILE `useGroupAdvantage` is `false`, THE Combat_Dashboard SHALL display the individual advantage counter as it does currently (per-character advantage tracking unchanged).
2. WHILE `useGroupAdvantage` is `true`, THE Combat_Dashboard SHALL display the advantage counter with a label indicating it represents the shared group pool (e.g., "Group Advantage" instead of "Advantage").
3. WHILE `useGroupAdvantage` is `true`, THE Combat_Dashboard SHALL apply the existing `advantageCap` to the group advantage value using the same capping logic as individual advantage.
4. WHILE `useGroupAdvantage` is `true`, THE Combat_Dashboard SHALL allow incrementing and decrementing the group advantage value using the same +/− controls as individual advantage.
5. WHEN combat ends while `useGroupAdvantage` is `true`, THE Combat_Page SHALL reset the advantage value to 0 using the same end-combat logic as individual advantage.

### Requirement 4: Add Miracles of Grungni

**User Story:** As a player with a Dwarf priest of Grungni, I want the Miracles of Grungni available in the spell list, so that I can reference and track my deity-specific divine spells.

#### Acceptance Criteria

1. THE Spell_Data_Module SHALL contain entries for all Miracles of Grungni as defined in the Dwarf_Source, each with name, cn, range, target, duration, and effect fields.
2. THE Spell_Data_Module SHALL group the Miracles of Grungni under a comment section header "// MIRACLES OF GRUNGNI" following the same organizational pattern as "// MIRACLES OF MYRMIDIA".
3. THE Spell_Data_Module SHALL assign each Miracle of Grungni a casting number greater than "0" matching the values in the Dwarf_Source.
4. THE Spell_Data_Module SHALL provide a concise effect description for each miracle consistent in style with existing spell entries.

### Requirement 5: Add Miracles of Valaya

**User Story:** As a player with a Dwarf priest of Valaya, I want the Miracles of Valaya available in the spell list, so that I can reference and track my deity-specific divine spells.

#### Acceptance Criteria

1. THE Spell_Data_Module SHALL contain entries for all Miracles of Valaya as defined in the Dwarf_Source, each with name, cn, range, target, duration, and effect fields.
2. THE Spell_Data_Module SHALL group the Miracles of Valaya under a comment section header "// MIRACLES OF VALAYA" following the same organizational pattern as "// MIRACLES OF MYRMIDIA".
3. THE Spell_Data_Module SHALL assign each Miracle of Valaya a casting number greater than "0" matching the values in the Dwarf_Source.
4. THE Spell_Data_Module SHALL provide a concise effect description for each miracle consistent in style with existing spell entries.

### Requirement 6: Add Miracles of Grimnir

**User Story:** As a player with a Dwarf Slayer-priest of Grimnir, I want the Miracles of Grimnir available in the spell list, so that I can reference and track my deity-specific divine spells.

#### Acceptance Criteria

1. THE Spell_Data_Module SHALL contain entries for all Miracles of Grimnir as defined in the Dwarf_Source, each with name, cn, range, target, duration, and effect fields.
2. THE Spell_Data_Module SHALL group the Miracles of Grimnir under a comment section header "// MIRACLES OF GRIMNIR" following the same organizational pattern as "// MIRACLES OF MYRMIDIA".
3. THE Spell_Data_Module SHALL assign each Miracle of Grimnir a casting number greater than "0" matching the values in the Dwarf_Source.
4. THE Spell_Data_Module SHALL provide a concise effect description for each miracle consistent in style with existing spell entries.

### Requirement 7: Add Miracles of Gazul

**User Story:** As a player with a Dwarf priest of Gazul, I want the Miracles of Gazul available in the spell list, so that I can reference and track my deity-specific divine spells.

#### Acceptance Criteria

1. THE Spell_Data_Module SHALL contain entries for all Miracles of Gazul as defined in the Dwarf_Source, each with name, cn, range, target, duration, and effect fields.
2. THE Spell_Data_Module SHALL group the Miracles of Gazul under a comment section header "// MIRACLES OF GAZUL" following the same organizational pattern as "// MIRACLES OF MYRMIDIA".
3. THE Spell_Data_Module SHALL assign each Miracle of Gazul a casting number greater than "0" matching the values in the Dwarf_Source.
4. THE Spell_Data_Module SHALL provide a concise effect description for each miracle consistent in style with existing spell entries.

### Requirement 8: Add Miracles of Smednir

**User Story:** As a player with a Dwarf priest of Smednir, I want the Miracles of Smednir available in the spell list, so that I can reference and track my deity-specific divine spells.

#### Acceptance Criteria

1. THE Spell_Data_Module SHALL contain entries for all Miracles of Smednir as defined in the Dwarf_Source, each with name, cn, range, target, duration, and effect fields.
2. THE Spell_Data_Module SHALL group the Miracles of Smednir under a comment section header "// MIRACLES OF SMEDNIR" following the same organizational pattern as "// MIRACLES OF MYRMIDIA".
3. THE Spell_Data_Module SHALL assign each Miracle of Smednir a casting number greater than "0" matching the values in the Dwarf_Source.
4. THE Spell_Data_Module SHALL provide a concise effect description for each miracle consistent in style with existing spell entries.

### Requirement 9: Add Miracles of Thungni

**User Story:** As a player with a Dwarf Runesmith-priest of Thungni, I want the Miracles of Thungni available in the spell list, so that I can reference and track my deity-specific divine spells.

#### Acceptance Criteria

1. THE Spell_Data_Module SHALL contain entries for all Miracles of Thungni as defined in the Dwarf_Source, each with name, cn, range, target, duration, and effect fields.
2. THE Spell_Data_Module SHALL group the Miracles of Thungni under a comment section header "// MIRACLES OF THUNGNI" following the same organizational pattern as "// MIRACLES OF MYRMIDIA".
3. THE Spell_Data_Module SHALL assign each Miracle of Thungni a casting number greater than "0" matching the values in the Dwarf_Source.
4. THE Spell_Data_Module SHALL provide a concise effect description for each miracle consistent in style with existing spell entries.

### Requirement 10: Add Miracles of Morgrim

**User Story:** As a player with a Dwarf priest of Morgrim, I want the Miracles of Morgrim available in the spell list, so that I can reference and track my deity-specific divine spells.

#### Acceptance Criteria

1. THE Spell_Data_Module SHALL contain entries for all Miracles of Morgrim as defined in the Dwarf_Source, each with name, cn, range, target, duration, and effect fields.
2. THE Spell_Data_Module SHALL group the Miracles of Morgrim under a comment section header "// MIRACLES OF MORGRIM" following the same organizational pattern as "// MIRACLES OF MYRMIDIA".
3. THE Spell_Data_Module SHALL assign each Miracle of Morgrim a casting number greater than "0" matching the values in the Dwarf_Source.
4. THE Spell_Data_Module SHALL provide a concise effect description for each miracle consistent in style with existing spell entries.

### Requirement 11: Dwarf Miracle Data Integrity

**User Story:** As a developer, I want all Dwarf miracle data to be consistent with existing spell conventions and compile without errors, so that the application remains stable.

#### Acceptance Criteria

1. THE Spell_Data_Module SHALL compile without TypeScript errors after adding all Dwarf deity miracle entries.
2. WHEN the existing test suite is executed, THE application SHALL pass all pre-existing tests without regression.
3. THE Spell_Data_Module SHALL follow the same SpellData interface format (name, cn, range, target, duration, effect) for each Dwarf miracle entry.
4. THE Spell_Data_Module SHALL extract miracle data from the Dwarf_Source file, cross-referencing spell names, casting numbers, and effects against the Chapter VI miracle tables.
5. IF a miracle name in the Dwarf_Source contains formatting artifacts or inconsistencies, THEN THE Spell_Data_Module SHALL normalize the name to use consistent title case and spacing.

### Requirement 12: Backward Compatibility for Group Advantage

**User Story:** As a developer, I want the Group Advantage feature to be backward compatible with existing saved character data, so that users upgrading do not lose data or encounter errors.

#### Acceptance Criteria

1. WHEN loading a character that was saved before the `useGroupAdvantage` field existed, THE application SHALL default the field to `false` without error.
2. THE application SHALL use the existing `advantage` numeric field on the Character interface to store the group advantage value when group mode is enabled, avoiding the need for a separate storage field.
3. WHEN the existing test suite is executed, THE application SHALL pass all pre-existing tests without regression.
4. THE application SHALL compile without TypeScript errors after all house rule modifications.
