# Requirements Document

## Introduction

This feature adds breakdown tooltips to all calculated total numbers displayed in the WFRP4e character sheet. Wherever a derived value is shown, users can tap or hover to see exactly how that number was calculated, following the same pattern already established by the Characteristic "Current" column tooltip.

## Glossary

- **Tooltip**: The existing portal-based popover component (`src/components/shared/Tooltip.tsx`) that displays contextual information anchored to a UI element, triggered by click or hover.
- **Breakdown_Content**: A structured display within a Tooltip showing individual components that sum or derive to produce a calculated total.
- **Skill_Total**: The sum of a skill's linked Characteristic value and the skill's Advances (e.g., Agility 35 + Advances 10 = 45).
- **Characteristic_Bonus**: The integer result of floor(Current / 10) for a given characteristic, displayed in the CB column.
- **Max_Encumbrance**: The maximum encumbrance capacity calculated as Strength Bonus + Toughness Bonus + Strong Back talent level + (Sturdy level × 2).
- **Coin_Weight**: The encumbrance contribution from carried coins, calculated as floor((GC + SS + D) / 200).
- **Armour_Points_Per_Location**: The total effective AP for a body location, derived from summing the AP of all worn armour pieces covering that location (with layering rules applied).
- **Character_Sheet**: The WFRP4e PWA character sheet application.
- **Anchor_Element**: The UI element whose position determines where the Tooltip is rendered.

## Requirements

### Requirement 1: Skill Total Breakdown Tooltip

**User Story:** As a player, I want to tap on a skill's total value to see how it was calculated, so that I can verify the breakdown of characteristic value plus advances.

#### Acceptance Criteria

1. WHEN a user taps or clicks on a Skill_Total value in the Abilities tab, THE Character_Sheet SHALL display a Tooltip anchored to that value showing the Breakdown_Content.
2. THE Breakdown_Content for a Skill_Total SHALL display the linked characteristic name, the characteristic's current value, the skill advances value, and the resulting total in the format: "[Char] [value] + Adv [advances] = [total]".
3. WHEN the Skill_Total Tooltip is open and the user taps outside the Tooltip or presses Escape, THE Character_Sheet SHALL dismiss the Tooltip.
4. THE Character_Sheet SHALL display the Skill_Total Breakdown_Content for both basic skills and advanced skills.

### Requirement 2: Characteristic Bonus Breakdown Tooltip

**User Story:** As a player, I want to tap on a characteristic bonus (CB) value to see how it was derived, so that I can understand the relationship between my characteristic's current value and its bonus.

#### Acceptance Criteria

1. WHEN a user taps or clicks on a Characteristic_Bonus cell in the CB column, THE Character_Sheet SHALL display a Tooltip anchored to that cell showing the Breakdown_Content.
2. THE Breakdown_Content for a Characteristic_Bonus SHALL display the characteristic's current value and the resulting bonus in the format: "Current [value] → CB [bonus]".
3. WHEN the Characteristic_Bonus Tooltip is open and the user taps outside the Tooltip or presses Escape, THE Character_Sheet SHALL dismiss the Tooltip.

### Requirement 3: Max Encumbrance Breakdown Tooltip

**User Story:** As a player, I want to tap on the max encumbrance value to see how it was calculated, so that I can understand what contributes to my carrying capacity.

#### Acceptance Criteria

1. WHEN a user taps or clicks on the Max_Encumbrance value in the Encumbrance section, THE Character_Sheet SHALL display a Tooltip anchored to that value showing the Breakdown_Content.
2. THE Breakdown_Content for Max_Encumbrance SHALL display the Strength Bonus (SB), Toughness Bonus (TB), and any talent contributions (Strong Back, Sturdy) with the resulting total in the format: "SB [value] + TB [value] + [talent contributions] = [total]".
3. WHEN the character has no Strong Back or Sturdy talents, THE Breakdown_Content SHALL omit talent contribution lines and display only "SB [value] + TB [value] = [total]".
4. WHEN the Max_Encumbrance Tooltip is open and the user taps outside the Tooltip or presses Escape, THE Character_Sheet SHALL dismiss the Tooltip.

### Requirement 4: Coin Weight Breakdown Tooltip

**User Story:** As a player, I want to tap on the coin weight value to see how it was calculated, so that I can understand how my coin totals translate to encumbrance.

#### Acceptance Criteria

1. WHEN a user taps or clicks on the Coin_Weight value in the Encumbrance section, THE Character_Sheet SHALL display a Tooltip anchored to that value showing the Breakdown_Content.
2. THE Breakdown_Content for Coin_Weight SHALL display the gold crown (GC), silver shilling (SS), and brass penny (D) quantities, the sum, and the resulting weight in the format: "([GC] + [SS] + [D]) / 200 = [weight]".
3. WHEN all coin quantities are zero, THE Breakdown_Content SHALL display "No coins carried" instead of the formula.
4. WHEN the Coin_Weight Tooltip is open and the user taps outside the Tooltip or presses Escape, THE Character_Sheet SHALL dismiss the Tooltip.

### Requirement 5: Armour Points Per Location Breakdown Tooltip

**User Story:** As a player, I want to tap on an armour location's AP value in the body map to see which armour pieces contribute to that location's protection, so that I can understand my defensive coverage.

#### Acceptance Criteria

1. WHEN a user taps or clicks on an Armour_Points_Per_Location cell in the armour body map on the Combat tab, THE Character_Sheet SHALL display a Tooltip anchored to that cell showing the Breakdown_Content.
2. THE Breakdown_Content for Armour_Points_Per_Location SHALL list each worn armour piece covering that location with its name and AP contribution, followed by the total.
3. WHEN no armour pieces cover the tapped location, THE Breakdown_Content SHALL display "No armour covers this location" with a total of 0.
4. WHEN the Armour_Points_Per_Location Tooltip is open and the user taps outside the Tooltip or presses Escape, THE Character_Sheet SHALL dismiss the Tooltip.

### Requirement 6: Consistent Interaction Pattern

**User Story:** As a player, I want all breakdown tooltips to behave consistently, so that I have a predictable experience across the character sheet.

#### Acceptance Criteria

1. THE Character_Sheet SHALL use the existing Tooltip component for all Breakdown_Content displays.
2. THE Character_Sheet SHALL trigger breakdown tooltips on click for touch devices and on hover-with-delay for pointer devices, matching the existing characteristic Current column tooltip behavior.
3. THE Character_Sheet SHALL ensure only one breakdown Tooltip is visible at a time; opening a new Tooltip SHALL dismiss any previously open Tooltip.
4. THE Character_Sheet SHALL make all Anchor_Elements for breakdown tooltips keyboard-accessible with Enter and Space key activation.
5. THE Character_Sheet SHALL set `aria-describedby` on each Anchor_Element referencing the Tooltip's `id` attribute when the Tooltip is open.
