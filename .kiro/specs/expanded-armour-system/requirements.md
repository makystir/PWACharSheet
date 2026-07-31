# Requirements Document

## Introduction

This feature adds expanded armour rules from Archives of the Empire Vol. III ("Suits of Steel" chapter) to the WFRP 4e character sheet PWA. It introduces new armour types (Soft Kits, Boiled Leather, Chainmail, Brigandine, Plate), armour Qualities and Flaws with mechanical effects, armour damage tracking (current AP vs max AP), Critical Deflection as an optional combat mechanic, helmet special abilities, layering rules, stealth penalty notes, and armour repair reference information. The feature replaces the core rulebook's simplified armour list with a richer system that provides more tactical depth in combat.

## Glossary

- **Armour_Database**: The static data array (`ARMOURS` in `src/data/armour.ts`) containing all armour piece definitions with name, locations, enc, ap, and qualities fields.
- **Armour_Map**: The UI component (`ArmourMap`) that displays armour points per hit location on the Combat Dashboard.
- **Take_Damage_Panel**: The UI component that handles incoming damage calculation, applying wounds, and triggering Critical Wound flows.
- **Armour_Item**: A character-level record of a worn or carried armour piece, stored in the `character.armour` array, including name, locations, enc, ap, qualities, and worn status.
- **Armour_Quality**: A beneficial mechanical property on an armour piece (Impenetrable, Overcoat, Reinforced, Visor).
- **Armour_Flaw**: A detrimental mechanical property on an armour piece (Partial, Requires Kit, Weakpoints).
- **Critical_Deflection**: An optional combat mechanic allowing a character to sacrifice 1 AP from armour in a hit location to ignore a Critical Wound on that location.
- **Armour_Damage**: The state tracking current AP vs maximum AP per armour piece per location, reflecting wear and destruction from combat.
- **House_Rules**: The `houseRules` object on the Character storing boolean flags and configuration for optional mechanics.
- **Settings_Page**: The application page where players configure house rules and optional mechanics.
- **Hit_Location**: One of the six body locations (Head, Left Arm, Right Arm, Body, Left Leg, Right Leg) tracked by the armour system.
- **Soft_Kit**: A category of undergarments (padded doublets, hose, head padding) designed to be worn under armour, providing cushioning and attachment points.
- **Visor_State**: The open or closed state of a visored helmet, tracked per armour piece, affecting its mechanical properties.

## Requirements

### Requirement 1: Expanded Armour Data

**User Story:** As a player, I want the armour database to include all armour pieces from Archives of the Empire Vol. III, so that I can select and equip them on my character.

#### Acceptance Criteria

1. THE Armour_Database SHALL contain the following Soft Kit entries: Soft Kit (0 AP, Arms/Body/Legs, no qualities), Reinforced Soft Kit (1 AP, Arms/Body/Legs, Partial/Reinforced), Padding (0 AP, Head, no qualities), Aventail (1 AP, Head, Partial/Reinforced).
2. THE Armour_Database SHALL contain the following Boiled Leather entries: Leather Jack (1 AP, Arms/Body), Leather Jerkin (1 AP, Body), Leather Leggings (1 AP, Legs), Leather Skullcap (1 AP, Head).
3. THE Armour_Database SHALL contain the following Chainmail entries: Chainmail Chausses (2 AP, Legs), Chainmail Coat (2 AP, Arms/Body), Chainmail Coif (2 AP, Head), Chainmail Shirt (2 AP, Body).
4. THE Armour_Database SHALL contain the following Brigandine entries: Brigandine Jack (2 AP, Arms/Body, Overcoat), Brigandine Jerkin (2 AP, Body, Overcoat).
5. THE Armour_Database SHALL contain the following Plate entries: Bracers (3 AP, Arms, Impenetrable/Requires Kit/Weakpoints), Breastplate (3 AP, Body, Impenetrable/Overcoat/Weakpoints), Open Helm (3 AP, Head, Partial), Plate Leggings (3 AP, Legs, Impenetrable/Requires Kit/Weakpoints), Great Helm (3 AP, Head, Impenetrable/Weakpoints), Bascinet (3 AP, Head, Impenetrable/Visor/Weakpoints), Armet (3 AP, Head, Impenetrable/Visor/Weakpoints), Sallet (3 AP, Head, Impenetrable/Visor/Weakpoints).
6. THE Armour_Database SHALL include an `armourType` field for each entry indicating its material category (SoftKit, BoiledLeather, Chainmail, Brigandine, Plate).
7. THE Armour_Database SHALL replace any core-rulebook armour entries that are superseded by the expanded system (Leather Jack, Leather Jerkin, Leather Leggings, Leather Skullcap, Mail Chausses, Mail Coat, Mail Coif, Mail Shirt, Plate Breastplate, Open Helm, Plate Bracers, Plate Leggings, Helm) with the Archives Vol. III versions.

### Requirement 2: Armour Qualities Mechanical Effects

**User Story:** As a player, I want armour qualities to be tracked per armour piece and their mechanical effects displayed, so that I understand how my armour behaves in combat.

#### Acceptance Criteria

1. THE Armour_Item SHALL store qualities as a parseable string field matching the existing pattern (comma-separated quality names).
2. WHEN an armour piece has the Impenetrable quality, THE Armour_Map SHALL display an indicator icon or label for that quality on the relevant location.
3. WHEN an armour piece has the Overcoat quality, THE Armour_Map SHALL display an indicator for that quality on the relevant location.
4. WHEN an armour piece has the Reinforced quality, THE Armour_Map SHALL display an indicator for that quality on the relevant location.
5. WHEN an armour piece has the Visor quality, THE Armour_Map SHALL display the current visor state (Open or Closed) on the relevant location.
6. THE Armour_Map SHALL display a tooltip or expandable section for each quality explaining its mechanical effect.

### Requirement 3: Armour Flaws Mechanical Effects

**User Story:** As a player, I want armour flaws to be tracked per armour piece and their effects displayed, so that I understand my armour's vulnerabilities.

#### Acceptance Criteria

1. WHEN an armour piece has the Partial flaw, THE Armour_Map SHALL display an indicator for that flaw on the relevant location.
2. WHEN an armour piece has the Requires Kit flaw, THE Armour_Map SHALL display an indicator for that flaw on the relevant location.
3. WHEN an armour piece has the Weakpoints flaw, THE Armour_Map SHALL display an indicator for that flaw on the relevant location.
4. THE Armour_Map SHALL display a tooltip or expandable section for each flaw explaining its mechanical effect.

### Requirement 4: Visor State Tracking

**User Story:** As a player wearing a visored helmet, I want to toggle the visor open or closed and see the mechanical effects update, so that I can manage the tactical trade-off during combat.

#### Acceptance Criteria

1. WHEN an Armour_Item has the Visor quality, THE Armour_Item SHALL track a `visorOpen` boolean state defaulting to `false` (closed).
2. WHEN the visor is closed, THE Armour_Map SHALL display the helmet's full AP and all its qualities without modification.
3. WHEN the visor is open, THE Armour_Map SHALL apply the Partial flaw to that helmet (opponent rolling even to-hit or scoring a Critical ignores the helmet APs).
4. WHEN the visor is open, THE Armour_Map SHALL display a note that Perception Tests have a -10 penalty.
5. WHEN the visor is open, THE Armour_Map SHALL remove any helmet special ability display (Bascinet missile bonus, Armet damage resistance, Sallet wound reduction).
6. THE Armour_Map SHALL provide a toggle button or tap action on visored helmets to switch between open and closed states.
7. WHEN the player toggles the visor, THE application SHALL persist the new state to the character data immediately.

### Requirement 5: Armour Damage Tracking

**User Story:** As a player, I want to track damage to my armour pieces (current AP vs max AP per location), so that I know when my armour degrades and becomes useless.

#### Acceptance Criteria

1. THE Armour_Item SHALL store a `currentAp` field representing the current AP value, defaulting to the item's base `ap` value.
2. THE Armour_Map SHALL display both current AP and maximum AP when they differ (e.g., "2/3").
3. WHEN an armour piece's current AP reaches 0 in a location, THE Armour_Map SHALL visually indicate that the armour in that location is destroyed (e.g., struck-through or greyed out).
4. THE Armour_Map SHALL provide a control to manually reduce AP by 1 on a specific armour piece in a specific location (to handle damage from spells, talents, or other effects).
5. THE Armour_Map SHALL provide a control to restore AP by 1 on a specific armour piece in a specific location (to handle repairs).
6. WHEN armour AP is reduced, THE effective AP total for the hit location in the Take_Damage_Panel SHALL use the current (damaged) AP values.
7. IF the current AP of an armour piece is already at its maximum, THEN THE restore control SHALL be disabled for that piece.

### Requirement 6: Critical Deflection Mechanic

**User Story:** As a player who suffers a Critical Wound on an armoured location, I want the option to sacrifice 1 AP from my armour to ignore the Critical Wound, so that I can make tactical decisions about absorbing critical damage.

#### Acceptance Criteria

1. THE House_Rules SHALL include a `useCriticalDeflection` field of type boolean.
2. THE `useCriticalDeflection` field SHALL default to `false` in the blank character template.
3. THE Settings_Page SHALL display a "Critical Deflection" toggle within the Optional Mechanics section with a description of "Sacrifice 1 AP to ignore a Critical Wound (Archives Vol. III)".
4. WHEN `houseRules.useCriticalDeflection` is `true` AND the character takes a Critical Wound on a location where armour has current AP greater than 0, THE Take_Damage_Panel SHALL present a "Deflect Critical" button.
5. WHEN the player activates Deflect Critical, THE application SHALL reduce the current AP of the armour piece protecting that location by 1.
6. WHEN the player activates Deflect Critical, THE application SHALL cancel the Critical Wound (the character still suffers normal Wounds with the now-reduced AP).
7. WHEN the player activates Deflect Critical and the resulting damage with reduced AP causes Wounds to go below zero, THE application SHALL still cancel the Critical Wound only if the AP reduction prevents Wounds from going below zero.
8. WHEN `houseRules.useCriticalDeflection` is `false`, THE Take_Damage_Panel SHALL NOT display the Deflect Critical option.
9. IF no armour piece protecting the hit location has current AP greater than 0, THEN THE Deflect Critical button SHALL be disabled or hidden.

### Requirement 7: Helmet Special Abilities

**User Story:** As a player wearing a named helmet (Bascinet, Armet, or Sallet), I want the helmet's unique mechanical bonuses reflected in the armour display, so that I gain the correct tactical benefits.

#### Acceptance Criteria

1. WHEN the character wears a Bascinet with visor closed AND missile fire originates from in front of the wearer, THE Armour_Map SHALL display the helmet as providing 4 AP rather than 3 AP against frontal missile fire.
2. WHEN the character wears an Armet AND the helmet would lose AP, THE application SHALL display a prompt or note referencing the Armet Damage table (d10: 1-5 damaged normally, 6-9 not damaged, 10 not damaged but visor jams).
3. WHEN a d10 roll of 6-9 is indicated for an Armet, THE application SHALL NOT reduce the helmet's current AP.
4. WHEN a d10 roll of 10 is indicated for an Armet, THE application SHALL NOT reduce the helmet's current AP AND SHALL display a note that the visor is jammed (cannot be removed until repaired with a Hard Trade (Blacksmith) Test).
5. WHEN the character wears a Sallet AND takes a Critical Hit to the head, THE application SHALL display a note that the Critical Hit deals 1 less Wound than normal.
6. THE Armour_Map SHALL display a brief label or icon indicating the special ability of each named helmet type when worn.

### Requirement 8: Armour Layering Validation

**User Story:** As a player, I want the app to guide me on valid armour layering combinations, so that I don't accidentally equip incompatible armour pieces.

#### Acceptance Criteria

1. THE application SHALL allow Soft Kit pieces to be worn under any other armour type in the same location.
2. THE application SHALL allow Brigandine pieces (Overcoat quality) to be worn over Boiled Leather or Chainmail in the same location.
3. THE application SHALL allow a Plate Breastplate (Overcoat quality) to be worn over Boiled Leather or Chainmail on the Body location.
4. THE application SHALL NOT allow Boiled Leather to be worn under Chainmail or under Plate pieces other than those with the Overcoat quality.
5. THE application SHALL NOT allow Chainmail to be worn under Plate pieces other than those with the Overcoat quality.
6. WHEN an armour piece has the Requires Kit flaw AND no Soft Kit is marked as worn in the same location, THE Armour_Map SHALL display a warning indicating that a Soft Kit is required underneath.
7. WHEN the Reinforced quality is present on a Soft Kit worn under a Plate piece with Weakpoints, THE application SHALL suppress the Weakpoints flaw display for that Plate piece in the relevant locations.
8. THE Armour_Map SHALL sum AP from validly layered pieces per location to show total effective AP.

### Requirement 9: Stealth Penalty Display

**User Story:** As a player wearing Chainmail or Plate, I want a visible reminder of the -10 Stealth penalty, so that I remember this modifier during play.

#### Acceptance Criteria

1. WHEN the character has any worn Chainmail or Plate armour piece, THE Armour_Map SHALL display a prominent note or badge reading "-10 Stealth".
2. WHEN the character has no worn Chainmail or Plate armour pieces, THE Armour_Map SHALL NOT display any stealth penalty note.
3. THE stealth penalty note SHALL be visible without needing to expand or interact with any section.

### Requirement 10: Armour Repair Reference

**User Story:** As a player, I want quick reference information about armour repair costs and requirements, so that I can make informed decisions during downtime.

#### Acceptance Criteria

1. THE Armour_Map SHALL include an expandable "Repair Info" section or tooltip accessible from the armour display.
2. THE repair reference SHALL display the Trade Skill required for each armour type (Leather/Brigandine: Trade (Tailor), Chainmail/Plate: Trade (Smith)).
3. THE repair reference SHALL display the SLs needed per AP restoration (Leather: 5, Brigandine: 7, Chainmail/Reinforced Soft Kit: 10, Plate: 15).
4. THE repair reference SHALL display the NPC repair cost formula (10% of base price per AP lost; 30% if section completely broken).

### Requirement 11: Partial Flaw Combat Interaction

**User Story:** As a player, I want the Partial flaw's combat effect to be visible when taking damage, so that I know when my partial armour might be bypassed.

#### Acceptance Criteria

1. WHEN a hit location is protected only by armour with the Partial flaw AND the to-hit roll is even, THE Take_Damage_Panel SHALL indicate that the Partial armour's APs are ignored for this hit.
2. WHEN a hit location is protected only by armour with the Partial flaw AND a Critical Hit is scored, THE Take_Damage_Panel SHALL indicate that the Partial armour's APs are ignored.
3. THE Take_Damage_Panel SHALL include an input or toggle for the to-hit roll value (or at minimum an "Even/Odd" selector) to determine Partial flaw applicability.

### Requirement 12: Impenetrable Quality Combat Interaction

**User Story:** As a player wearing Impenetrable armour, I want to see when Critical Wounds are automatically ignored due to odd to-hit rolls, so that I benefit from this quality correctly.

#### Acceptance Criteria

1. WHEN a Critical Wound occurs on a location protected by armour with the Impenetrable quality AND the to-hit roll is odd, THE application SHALL display a note that the Critical Wound is ignored due to Impenetrable.
2. WHEN a Critical Wound occurs on a location protected by armour with the Impenetrable quality AND the to-hit roll is even, THE Impenetrable quality SHALL NOT prevent the Critical Wound.
3. THE Take_Damage_Panel SHALL use the to-hit roll input (shared with Partial flaw) to determine Impenetrable applicability.

### Requirement 13: Weakpoints Flaw Combat Interaction

**User Story:** As a player, I want to see when my armour's Weakpoints flaw causes all APs to be ignored, so that I understand the vulnerability.

#### Acceptance Criteria

1. WHEN an opponent's weapon has the Impale quality AND a Critical Hit is scored on a location protected by armour with the Weakpoints flaw, THE Take_Damage_Panel SHALL indicate that all APs from that armour piece are ignored.
2. THE Take_Damage_Panel SHALL include an input or toggle for whether the attacking weapon has the Impale quality.
3. WHEN the Weakpoints flaw is negated by a Reinforced Soft Kit worn underneath, THE Take_Damage_Panel SHALL NOT ignore APs due to Weakpoints.

### Requirement 14: Data Migration for Existing Characters

**User Story:** As a player with an existing character, I want my armour data to be migrated gracefully to the expanded system, so that I don't lose any information.

#### Acceptance Criteria

1. WHEN a character is loaded that has armour items without the `currentAp` field, THE application SHALL default `currentAp` to the item's base `ap` value.
2. WHEN a character is loaded that has armour items without `visorOpen` state, THE application SHALL default `visorOpen` to `false` for items with the Visor quality.
3. WHEN a character is loaded that does not contain the `useCriticalDeflection` house rule field, THE application SHALL treat the missing field as `false`.
4. THE application SHALL preserve all existing armour item data (name, locations, enc, ap, qualities, worn, runes) during migration.
5. WHEN armour entries in the database are renamed or replaced (e.g., "Mail Coat" to "Chainmail Coat"), THE application SHALL map existing character armour to the updated entries by matching the original name.

