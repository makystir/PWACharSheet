# Requirements Document

## Introduction

The Yenlui Balance System tracks the spiritual balance of Elven characters in a WFRP 4e character sheet PWA. Yenlui is a philosophy of spiritual harmony where an Elf's soul struggles between darkness and light. The system stores the current Yenlui state on the character, provides UI for viewing and adjusting the state, displays mechanical effects (particularly sword-dancing difficulty modifiers), and integrates with existing talent references. The feature is only relevant for Elf species characters (High Elf, Wood Elf).

## Glossary

- **Yenlui_Panel**: The UI component on the Character page that displays and controls the Yenlui spiritual balance state
- **Yenlui_State**: The current spiritual balance of an Elven character; one of four values: Unset, Light, Balanced, or Dark
- **Character_Store**: The persisted Character interface and its update mechanism used throughout the PWA
- **HouseRules**: The `houseRules` object on the Character interface containing optional rule toggles, displayed on the Settings page
- **Sword_Dancing_System**: The existing sword-dancing techniques feature that references Yenlui for test difficulty modifiers
- **Elf_Species**: Character species values that qualify for the Yenlui system: "High Elf" and "Wood Elf"

## Requirements

### Requirement 1: Yenlui State Data Model

**User Story:** As a player with an Elf character, I want the Yenlui state stored on my character data, so that my spiritual balance persists across sessions.

#### Acceptance Criteria

1. THE Character_Store SHALL include an optional `yenluiState` field with allowed values: `'light'`, `'balanced'`, `'dark'`, or `undefined`
2. WHEN `yenluiState` is `undefined`, THE Yenlui_Panel SHALL treat the character as having no active Yenlui Psychology Trait (neutral/unset)
3. WHEN a character is loaded from storage, THE Character_Store SHALL preserve the previously saved `yenluiState` value exactly as it was stored, including `undefined` for characters that never had a value set
4. THE Character_Store SHALL serialize and deserialize the `yenluiState` field such that saving a character with any allowed value and reloading it produces the same value
5. IF the stored `yenluiState` value is not one of the allowed values (`'light'`, `'balanced'`, `'dark'`, or `undefined`), THEN THE Character_Store SHALL treat the value as `undefined`

### Requirement 2: House Rule Toggle

**User Story:** As a player, I want to enable or disable the Yenlui tracking system via a house rule toggle, so that groups who do not use this optional mechanic are not encumbered by it.

#### Acceptance Criteria

1. THE HouseRules interface SHALL include a boolean `useYenlui` field, defaulting to `false`
2. THE Settings page SHALL display a toggle for "Yenlui Balance (High Elf)" in the House Rules section, following the same ON/OFF button pattern as existing toggles
3. THE Settings page toggle description SHALL read "Track Elven spiritual balance (High Elf Player's Guide)"
4. WHEN `useYenlui` is `false`, THE Yenlui_Panel SHALL not be rendered on the Character page regardless of character species
5. WHEN `useYenlui` is `true` AND the character species is an Elf_Species value, THE Yenlui_Panel SHALL be visible on the Character page
6. WHEN `useYenlui` is toggled from `true` to `false`, THE Character_Store SHALL preserve the existing `yenluiState` value (not clear it)

### Requirement 3: Species Gating

**User Story:** As a player, I want the Yenlui system to only appear for Elf characters, so that it does not clutter the interface for non-Elf species.

#### Acceptance Criteria

1. WHILE `useYenlui` is `true` AND the character species is an Elf_Species value, THE Yenlui_Panel SHALL be visible on the Character page
2. WHILE the character species is not an Elf_Species value, THE Yenlui_Panel SHALL not be rendered on the Character page even if `useYenlui` is `true`
3. WHEN the character species changes from an Elf_Species to a non-Elf_Species, THE Yenlui_Panel SHALL hide without clearing the stored `yenluiState` value from the Character_Store
4. WHEN the character species changes from a non-Elf_Species to an Elf_Species (and `useYenlui` is `true`), THE Yenlui_Panel SHALL appear and display the stored `yenluiState` value if one exists, or display the Unset state if no `yenluiState` value is stored
5. WHEN the character species is changed to an empty or unrecognized value, THE Yenlui_Panel SHALL not be rendered on the Character page

### Requirement 4: Display Current Yenlui State

**User Story:** As a player, I want to see my character's current Yenlui state at a glance, so that I can make informed roleplaying and mechanical decisions.

#### Acceptance Criteria

1. THE Yenlui_Panel SHALL display the current state using exactly one of the following labels: "Light", "Balanced", "Dark", or "Unset" when no state is active
2. THE Yenlui_Panel SHALL use a unique visual indicator (a distinct icon, colour, or combination of both) for each of the four Yenlui states such that any two states are distinguishable without relying on colour alone
3. WHEN the Yenlui_State is "Dark", THE Yenlui_Panel SHALL display a warning indicator noting the sword-dancing difficulty penalty of -30
4. WHILE a Yenlui_State of "Light", "Balanced", or "Dark" is active, THE Yenlui_Panel SHALL display a description of the active state's roleplaying implications in no more than 120 characters
5. WHILE the Yenlui_State is "Unset", THE Yenlui_Panel SHALL omit the roleplaying description area

### Requirement 5: Manual State Adjustment

**User Story:** As a player, I want to manually change my Yenlui state, so that I can update my character sheet when the GM rules a state change during play.

#### Acceptance Criteria

1. THE Yenlui_Panel SHALL provide controls to set the Yenlui_State to any of the four values: Unset, Light, Balanced, or Dark
2. WHEN the player selects a new Yenlui_State, THE Character_Store SHALL update the `yenluiState` field without requiring a separate save action, and the Yenlui_Panel SHALL visually indicate the newly active state
3. WHEN the player selects the Yenlui_State value that is already active, THE Character_Store SHALL not perform an update (no-op)
4. WHEN the player sets Yenlui_State to Unset, THE Character_Store SHALL set `yenluiState` to `undefined`
5. THE Yenlui_Panel SHALL not require confirmation dialogs for state changes (direct toggle interaction)
6. THE Yenlui_Panel state controls SHALL be operable via keyboard and provide accessible labels identifying each state option

### Requirement 6: Sword-Dancing Difficulty Integration

**User Story:** As a player using sword-dancing techniques, I want the Yenlui state to visibly affect technique difficulty, so that I can reference the correct test modifier during combat.

#### Acceptance Criteria

1. WHILE Yenlui_State is "light" or "balanced" or undefined, THE Sword_Dancing_System SHALL display the difficulty label "Challenging" and the numeric modifier "(+0)" for technique tests
2. WHILE Yenlui_State is "dark", THE Sword_Dancing_System SHALL display the difficulty label "Very Hard" and the numeric modifier "(-30)" for technique tests
3. IF the character possesses the "Sanctuary of the Mind" talent at level 3 or higher, THEN THE Sword_Dancing_System SHALL display "Challenging (+0)" difficulty regardless of the current Yenlui_State value
4. THE Sword_Dancing_System SHALL display the effective difficulty label and numeric modifier adjacent to each learned technique entry in the technique list
5. WHILE the character has no learned techniques, THE Sword_Dancing_System SHALL not display any difficulty indicator

### Requirement 7: Influencing Factors Reference

**User Story:** As a player, I want a reference of what behaviours affect Yenlui, so that I can track when my state should change during play.

#### Acceptance Criteria

1. THE Yenlui_Panel SHALL display a collapsible reference section containing two independently collapsible sub-lists: one for behaviours that shift Yenlui toward Dark (acts of cruelty, extreme indulgence, gaining a Corruption point) and one for behaviours that shift Yenlui toward Light (exceptional kindness, abstaining from pleasure, meditation at Cadai shrine or with Wayshard)
2. WHEN the Yenlui_Panel first renders, THE reference section SHALL default to a collapsed state
3. WHEN a reference sub-list is collapsed, THE Yenlui_Panel SHALL show a labelled toggle element displaying the direction name (e.g. "Dark Influences", "Light Influences") indicating the list can be expanded
4. WHEN the player activates a toggle element, THE Yenlui_Panel SHALL expand the corresponding sub-list to display its full content without affecting the other sub-list's collapse state

### Requirement 8: Talent Integration Indicators

**User Story:** As a player, I want to see when my talents interact with Yenlui, so that I understand relevant mechanical synergies.

#### Acceptance Criteria

1. WHEN the character has the "Blood of Aenarion" talent, THE Yenlui_Panel SHALL display a talent note stating that a weekly Average (+20) Cool Test is required or Yenlui_State shifts to Dark
2. WHEN the character has the "Cadai Meditation" talent, THE Yenlui_Panel SHALL display a talent note stating that daily meditation (at least 1 hour) with an Average (+20) Pray Test can shift Yenlui_State to Light on success
3. WHEN the character has the "Sanctuary of the Mind" talent at level 3, THE Yenlui_Panel SHALL display a talent note stating that the -30 Yenlui (Dark) penalty to sword-dancing difficulty is negated
4. IF the character has the "Sanctuary of the Mind" talent at level 1 or level 2, THEN THE Yenlui_Panel SHALL not display a talent note for that talent (no Yenlui interaction below level 3)
5. WHILE no Yenlui-related talents ("Blood of Aenarion", "Cadai Meditation", or "Sanctuary of the Mind" at level 3) are present on the character, THE Yenlui_Panel SHALL omit the talent integration section entirely
6. WHEN one or more Yenlui-related talents are present, THE Yenlui_Panel SHALL render the talent integration section as a list containing one note per qualifying talent

### Requirement 9: Character Page Placement

**User Story:** As a player, I want the Yenlui panel to fit naturally within the Character page layout, so that it is easy to find without disrupting the existing page flow.

#### Acceptance Criteria

1. THE Yenlui_Panel SHALL render within the Character page "identity" sub-tab section, positioned after the DeitySelector and before the Characteristics card
2. THE Yenlui_Panel SHALL use the existing Card component for its container, matching the same padding and border styling as other Card instances on the Character page
3. THE Yenlui_Panel SHALL use CSS modules for styling, with a dedicated `.module.css` file following the same naming convention as other Character page components
4. WHILE the viewport width is 768px or greater, THE Yenlui_Panel SHALL render at full width within the identity tab column layout
5. WHILE the viewport width is less than 768px, THE Yenlui_Panel SHALL stack vertically with no horizontal overflow, and all interactive elements SHALL meet a minimum touch-target size of 44×44 CSS pixels
