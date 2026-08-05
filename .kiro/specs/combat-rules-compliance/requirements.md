# Requirements Document

## Introduction

This specification addresses medium and low severity combat rules compliance gaps identified in a WFRP4e (Warhammer Fantasy Roleplay 4th Edition) rules compliance audit. The app's combat flow (AttackFlow and TakeDamagePanel components) is missing mechanical enforcement of several weapon qualities, shield mechanics, ranged targeting logic, movement display values, and Critical Wound modifiers. Implementing these brings the application into full rules compliance with the Core Rulebook.

## Glossary

- **AttackFlow**: The component managing the attack pipeline (weapon selection → roll → damage calculation) when the player character attacks an opponent.
- **TakeDamagePanel**: The component managing incoming damage resolution (AP reduction → TB reduction → wound application) when the player character receives damage.
- **CombatDashboard**: The component displaying combat status (wounds, advantage, conditions, round tracking, movement) during combat turns.
- **Weapon_Quality**: A special property attached to a weapon that modifies combat behaviour (stored in the `qualities` comma-separated string field on WeaponItem).
- **AP**: Armour Points — the damage reduction provided by armour at a hit location.
- **TB**: Toughness Bonus — derived from the Toughness characteristic (tens digit of Toughness).
- **SL**: Success Levels — the margin of success on a percentile roll, calculated as tens digit of target minus tens digit of roll.
- **Units_Digit**: The ones digit of a d100 roll result (e.g., rolling 34 gives a units digit of 4).
- **Metallic_Armour**: Armour of type Chainmail, Brigandine, or Plate (per ArmourType enum).
- **Non_Metallic_Armour**: Armour of type SoftKit or BoiledLeather (per ArmourType enum).
- **Shield_Rating**: The numeric rating value of a Shield weapon, representing how many AP it provides when used to defend.
- **Engaged**: A combat state flag indicating the character is in melee combat with an opponent.
- **Movement_Value**: The character's Movement characteristic (M) used to derive Walk and Run distances.
- **Critical_Wound**: A wound triggered when damage reduces a character to 0 or fewer remaining wounds.
- **Excess_Damage**: The amount of damage that exceeds the character's remaining wounds when a Critical Wound is triggered.

## Requirements

### Requirement 1: Penetrating Weapon Quality in Damage Calculation

**User Story:** As a player taking damage from a weapon with the Penetrating quality, I want armour reduction to correctly ignore non-metallic armour and reduce metallic AP by 1, so that damage calculations match the Core Rulebook rules (p.298).

#### Acceptance Criteria

1. WHEN the Penetrating toggle is enabled in TakeDamagePanel, THE TakeDamagePanel SHALL set the effective AP contribution of all Non_Metallic_Armour items at the hit location to 0.
2. WHEN the Penetrating toggle is enabled in TakeDamagePanel, THE TakeDamagePanel SHALL reduce the effective AP contribution of each Metallic_Armour item at the hit location by 1 (minimum 0 per item).
3. THE TakeDamagePanel SHALL classify armour items with armourType "SoftKit" or "BoiledLeather" as Non_Metallic_Armour.
4. THE TakeDamagePanel SHALL classify armour items with armourType "Chainmail", "Brigandine", or "Plate" as Metallic_Armour.
5. WHEN the Penetrating toggle is disabled, THE TakeDamagePanel SHALL use the standard AP calculation without Penetrating modifications.
6. THE TakeDamagePanel SHALL display a "Penetrating" toggle control that the player can enable when the incoming attack has the Penetrating quality.
7. WHEN Penetrating is active, THE TakeDamagePanel SHALL display a note indicating which armour was ignored or reduced.

### Requirement 2: Damaging Weapon Quality in Attack Flow

**User Story:** As a player attacking with a Damaging weapon, I want the damage calculation to automatically use the higher of my units die or SL, so that the Damaging quality is mechanically enforced per Core Rulebook rules (p.297).

#### Acceptance Criteria

1. WHEN a successful hit is rolled with a weapon that has the "Damaging" quality, THE AttackFlow SHALL compare the Units_Digit of the roll result with the SL of the roll.
2. WHEN the Units_Digit exceeds the SL for a Damaging weapon hit, THE AttackFlow SHALL use the Units_Digit as the effective SL for damage calculation.
3. WHEN the SL is equal to or exceeds the Units_Digit for a Damaging weapon hit, THE AttackFlow SHALL use the SL as the effective SL for damage calculation.
4. THE AttackFlow SHALL display the original SL, the Units_Digit, and the chosen effective SL in the damage breakdown when a Damaging weapon is used.
5. THE AttackFlow SHALL detect the "Damaging" quality by parsing the weapon's qualities string (case-insensitive match).
6. WHEN the weapon does not have the Damaging quality, THE AttackFlow SHALL use the standard SL for damage calculation without modification.

### Requirement 3: Shield Rating as Defensive AP

**User Story:** As a player who defended with a shield, I want the Shield's Rating to be added as AP at the hit location when taking damage, so that shield defence is mechanically enforced per Core Rulebook rules (p.298).

#### Acceptance Criteria

1. THE TakeDamagePanel SHALL display a "Defended with Shield" toggle that the player can enable when the character actively opposed the incoming attack with a shield.
2. WHEN the "Defended with Shield" toggle is enabled, THE TakeDamagePanel SHALL add the Shield_Rating value to the effective AP at the selected hit location.
3. THE TakeDamagePanel SHALL read the Shield_Rating from the character's equipped shield weapon (a weapon with "Shield" in its group and a numeric Rating in its qualities string).
4. WHEN no shield weapon is equipped on the character, THE TakeDamagePanel SHALL hide the "Defended with Shield" toggle.
5. WHEN the "Defended with Shield" toggle is disabled, THE TakeDamagePanel SHALL not include the Shield_Rating in the effective AP.
6. THE TakeDamagePanel SHALL display the Shield_Rating contribution in the AP breakdown when the toggle is enabled.

### Requirement 4: Corrected Ranged into Melee Logic

**User Story:** As a player making a ranged attack, I want the -20 penalty to apply when my target is engaged in melee (not when I am engaged), so that the ranged-into-melee penalty matches the Core Rulebook rules (p.162).

#### Acceptance Criteria

1. THE AttackFlow SHALL display a "Target Engaged in Melee" toggle when a ranged weapon is selected.
2. WHEN the "Target Engaged in Melee" toggle is enabled for a ranged attack, THE AttackFlow SHALL apply a -20 modifier to the hit target number.
3. THE AttackFlow SHALL not use the player character's own Engaged state to determine the ranged-into-melee penalty.
4. WHEN the player character is Engaged and makes a ranged attack (excluding Blackpowder weapons), THE AttackFlow SHALL continue to apply the existing "Hard" difficulty setting for firing while engaged.
5. WHEN neither the "Target Engaged in Melee" toggle is enabled nor the player is Engaged, THE AttackFlow SHALL apply no ranged-into-melee penalty.
6. THE AttackFlow SHALL display a label explaining the -20 penalty source when the "Target Engaged in Melee" toggle is active.

### Requirement 5: Movement Values Display in Combat Dashboard

**User Story:** As a player in combat, I want to see my Walk and Run distances displayed on the Combat Dashboard, so that I can quickly reference movement allowances during combat turns per Core Rulebook rules (p.164).

#### Acceptance Criteria

1. WHILE the character is in combat, THE CombatDashboard SHALL display the Walk distance calculated as Movement × 2 yards.
2. WHILE the character is in combat, THE CombatDashboard SHALL display the Run distance calculated as Movement × 4 yards.
3. THE CombatDashboard SHALL read the Movement value from the character's `move.m` field.
4. WHEN the character's Movement value changes, THE CombatDashboard SHALL update the displayed Walk and Run distances immediately.
5. WHILE the character is not in combat, THE CombatDashboard SHALL not display Walk and Run distances.

### Requirement 6: Critical Wound Excess Damage Modifier Notification

**User Story:** As a player whose character has been reduced below 0 wounds, I want to know whether the Critical table roll receives a -20 modifier based on excess damage vs Toughness Bonus, so that I can apply the correct modifier per Core Rulebook rules (p.172).

#### Acceptance Criteria

1. WHEN net wounds applied reduce the character's current wounds below 0, THE TakeDamagePanel SHALL calculate the excess damage as the number of wounds below 0.
2. WHEN the excess damage is less than the character's TB, THE TakeDamagePanel SHALL display a notification stating the Critical table roll receives a -20 modifier.
3. WHEN the excess damage is equal to or greater than the character's TB, THE TakeDamagePanel SHALL display a notification stating no modifier applies to the Critical table roll.
4. THE TakeDamagePanel SHALL display the excess damage value and TB value in the Critical Wound notification for player reference.
5. IF no Critical Wound is triggered (character remains above 0 wounds), THEN THE TakeDamagePanel SHALL not display any Critical Wound modifier notification.
