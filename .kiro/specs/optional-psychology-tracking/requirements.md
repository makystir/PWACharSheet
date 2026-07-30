# Requirements Document

## Introduction

Make the Psychology Tracker (Archives of the Empire Vol. II) an optional mechanic that players can enable or disable via the Settings page. When disabled, the Psychology Tracker section on the Identity tab renders no DOM elements. This follows the same pattern used by other optional mechanics (Yenlui Balance, Grudge Book) — a boolean flag in `houseRules` controls visibility, and a toggle in the "Optional Mechanics" collapsible section of the Settings page allows switching it on or off.

## Glossary

- **Psychology_Tracker**: The existing component on the Identity tab that tracks psychology traits (Phobia, Animosity, Hatred, Trauma), a broken tally counter, and displays a phobia acquisition alert when the tally reaches the WP threshold.
- **Settings_Page**: The application page where players configure house rules and optional mechanics via toggle controls.
- **Optional_Mechanics_Section**: The collapsible section within the Settings_Page's House Rules card that contains ON/OFF toggles for optional features (Yenlui Balance, Grudge Book).
- **HouseRules**: The data structure on the Character object that stores boolean flags and configuration values for optional and variant rules.
- **Identity_Tab**: The sub-tab of the Character page where personal details, motivations, and the Psychology_Tracker are rendered.

## Requirements

### Requirement 1: Add Psychology Tracking Toggle to HouseRules

**User Story:** As a player, I want a setting to enable or disable the Psychology Tracker, so that I can opt in to this optional mechanic only when my campaign uses it.

#### Acceptance Criteria

1. THE HouseRules interface SHALL include a `usePsychologyTracker` field of type boolean.
2. THE `usePsychologyTracker` field SHALL default to `false` in the blank character template.
3. WHEN a character is loaded that does not contain the `usePsychologyTracker` field, THE application SHALL treat the missing field as `false`.

### Requirement 2: Render Toggle in Optional Mechanics Section

**User Story:** As a player, I want an ON/OFF toggle for Psychology Tracking in the Optional Mechanics section of the Settings page, so that I can easily enable or disable the feature.

#### Acceptance Criteria

1. THE Settings_Page SHALL display a "Psychology Tracker" toggle within the Optional_Mechanics_Section.
2. THE toggle label SHALL read "Psychology Tracker" with a description of "Track phobias, animosity, hatred, and trauma (Archives Vol. II)".
3. WHEN the `usePsychologyTracker` field is `false`, THE toggle SHALL display "OFF".
4. WHEN the `usePsychologyTracker` field is `true`, THE toggle SHALL display "ON".
5. WHEN the player clicks the toggle, THE Settings_Page SHALL update the `houseRules.usePsychologyTracker` field to the opposite boolean value.

### Requirement 3: Conditionally Render Psychology Tracker on Identity Tab

**User Story:** As a player, I want the Psychology Tracker section to appear only when the mechanic is enabled, so that the Identity tab remains uncluttered when the feature is not in use.

#### Acceptance Criteria

1. WHEN `houseRules.usePsychologyTracker` is `true`, THE Identity_Tab SHALL render the Psychology_Tracker component inside its CollapsibleSection.
2. WHEN `houseRules.usePsychologyTracker` is `false`, THE Identity_Tab SHALL render zero DOM elements for the Psychology_Tracker (no wrapper, no CollapsibleSection).
3. WHEN the player toggles the mechanic from OFF to ON during a session, THE Identity_Tab SHALL immediately render the Psychology_Tracker without requiring a page refresh.
4. WHEN the player toggles the mechanic from ON to OFF during a session, THE Identity_Tab SHALL immediately remove the Psychology_Tracker without requiring a page refresh.

### Requirement 4: Preserve Psychology Data When Disabled

**User Story:** As a player, I want my existing psychology traits and broken tally to be preserved when I disable the tracker, so that I do not lose data if I temporarily turn the feature off.

#### Acceptance Criteria

1. WHEN the player disables the Psychology_Tracker, THE application SHALL retain all existing `psychologyTraits` and `brokenTally` data on the character object.
2. WHEN the player re-enables the Psychology_Tracker, THE Psychology_Tracker SHALL display all previously recorded traits and the correct broken tally value.
