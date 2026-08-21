# Requirements Document

## Introduction

This feature adds a visible toggle on each armour piece in the character sheet allowing the user to mark armour as worn or unworn. The worn/unworn state drives two game mechanics from WFRP4e Core p.293:

1. **Encumbrance:** Worn items have their Encumbrance dropped by 1 (to a minimum of 0). Unworn armour contributes its full Encumbrance value.
2. **Armour Points:** Only worn armour provides Armour Points (AP) to body locations. Unworn armour does not protect the character.

The existing codebase already has the `worn` boolean field on `ArmourItem` and some logic that filters by it, but lacks a user-facing control and has inconsistent application of the filter in the main AP calculation.

## Glossary

- **ArmourMap**: The UI component displaying a body silhouette with AP values per hit location and a list of armour pieces.
- **Armour_Item**: A single piece of armour with name, locations, AP, encumbrance, qualities, and worn status.
- **Encumbrance_Calculator**: The logic that sums all carried item weights to determine total encumbrance.
- **AP_Calculator**: The logic that computes effective Armour Points per body location from the armour list.
- **Worn_Toggle**: A checkbox or switch control that sets an armour piece's worn status.
- **Enc**: Abbreviation for Encumbrance — a numeric weight value assigned to each item.

## Requirements

### Requirement 1: Worn Toggle UI Control

**User Story:** As a player, I want to toggle each armour piece between worn and unworn, so that I can manage which pieces my character is actively wearing.

#### Acceptance Criteria

1. THE ArmourMap SHALL display a Worn_Toggle control for each Armour_Item in the armour list.
2. WHEN the user activates the Worn_Toggle for an Armour_Item, THE ArmourMap SHALL set that Armour_Item's worn field to the opposite of its current value.
3. THE Worn_Toggle SHALL visually indicate the current worn state of the Armour_Item (checked for worn, unchecked for unworn).
4. WHEN an Armour_Item has no explicit worn value set, THE ArmourMap SHALL treat the Armour_Item as worn by default.
5. THE Worn_Toggle SHALL be accessible with a descriptive aria-label that includes the Armour_Item name and current state.

### Requirement 2: Encumbrance Calculation for Worn Armour

**User Story:** As a player, I want worn armour to count less toward encumbrance, so that my character sheet reflects the WFRP4e rules for carried weight.

#### Acceptance Criteria

1. WHILE an Armour_Item is worn, THE Encumbrance_Calculator SHALL reduce that Armour_Item's Enc contribution by 1 to a minimum of 0.
2. WHILE an Armour_Item is unworn, THE Encumbrance_Calculator SHALL use the full Enc value of that Armour_Item without reduction.
3. THE Encumbrance_Calculator SHALL apply the worn reduction consistently for all armour pieces regardless of armour type.

### Requirement 3: Armour Points from Worn Items Only

**User Story:** As a player, I want only worn armour to contribute AP to my body locations, so that carrying spare armour in my pack does not provide protection.

#### Acceptance Criteria

1. THE AP_Calculator SHALL include only Armour_Items with worn status equal to true (or undefined, treated as true) when computing AP per body location.
2. WHEN an Armour_Item is toggled to unworn, THE AP_Calculator SHALL exclude that Armour_Item from the AP calculation for all body locations.
3. WHEN an Armour_Item is toggled back to worn, THE AP_Calculator SHALL include that Armour_Item in the AP calculation for all covered body locations.
4. THE ArmourMap body map display SHALL reflect AP values computed from worn armour only.

### Requirement 4: Armour Map Display Consistency

**User Story:** As a player, I want the armour map and contributing armour details to reflect only worn pieces, so that I have an accurate picture of my current protection.

#### Acceptance Criteria

1. THE ArmourMap contributing armour section SHALL list only Armour_Items that are worn for the selected body location.
2. THE ArmourMap stealth penalty badge SHALL appear only when at least one worn Armour_Item has armourType of Chainmail or Plate.
3. WHEN all Armour_Items are toggled to unworn, THE ArmourMap body map SHALL display 0 AP for all body locations.

### Requirement 5: Persistence of Worn State

**User Story:** As a player, I want the worn/unworn state of my armour to persist when I save and reload my character, so that I do not have to re-toggle armour each session.

#### Acceptance Criteria

1. WHEN the user toggles an Armour_Item's worn state, THE system SHALL persist the updated worn value as part of the character data.
2. WHEN a character is loaded from storage, THE system SHALL restore each Armour_Item's worn state from the persisted data.
3. IF an Armour_Item has no persisted worn value, THEN THE system SHALL default the worn state to true.
