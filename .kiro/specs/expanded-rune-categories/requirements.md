# Requirements Document

## Introduction

This feature extends the existing Dwarf Runesmith rune system to include three additional rune categories from the Dwarf Players Guide (DPG): Protection Runes (p.128), Engineering Runes (p.129), and Doom Runes (p.130). Each category has distinct placement rules, target items, and activation mechanics that differ from the existing weapon/armour/talisman runes. The feature adds the rune data, validation logic, and UI tracking needed to manage these new categories on a player's character sheet.

All rune names, effects, SLs Required values, and placement rules are sourced directly from the DPG text. Some rune names (e.g. "Rune of Alarm", "Rune of Accuracy") appear in both the existing personal-rune categories and the new Protection/Engineering categories — in the DPG these are genuinely distinct rune entries with different effects and placement targets, requiring separate IDs in the catalogue.

## Glossary

- **Rune_System**: The existing module comprising `RuneCategory` type, `RUNE_CATALOGUE`, `validateRunePlacement`, `canLearnRune`, and related functions in `src/logic/runes.ts` and `src/data/runes.ts`.
- **Protection_Rune**: A rune inscribed on communal items (religious icons, ale kegs, war banners, oathstones, permanent installations) whose effects extend to all Dwarf allies within 6 yards of the item.
- **Engineering_Rune**: A rune inscribed exclusively on Dwarf artillery weapons (Grudge Throwers, Bolt Throwers, Blackpowder cannons) to enhance their combat performance.
- **Doom_Rune**: A rune struck upon an Anvil of Doom that is activated as a single action with a Hard (-20) Runesmithing Test; all three Doom Runes are learned automatically when a character learns any Master Rune.
- **Protection_Item**: A named communal object or installation that can bear Protection Runes (e.g. a banner, shrine, gatehouse, oathstone).
- **Engineering_Item**: A named artillery weapon that can bear Engineering Runes.
- **Anvil_of_Doom**: A rare Runesmith artefact required for striking Doom Runes; tracked as a special trapping on the character sheet.
- **SLs_Required**: The Success Levels required on the Extended Runesmithing Test to craft a given rune; stored as reference data for the player.
- **Rune_of_Forging_Charges**: Engineering Rune of Forging has limited activations per adventure; the system tracks remaining charges.

## Requirements

### Requirement 1: Extend RuneCategory Type

**User Story:** As a developer, I want the RuneCategory type to include the new categories, so that the type system correctly represents all valid rune categories.

#### Acceptance Criteria

1. THE Rune_System SHALL define RuneCategory as `'weapon' | 'armour' | 'talisman' | 'protection' | 'engineering' | 'doom'`.
2. WHEN a rune with category 'protection', 'engineering', or 'doom' is added to the RUNE_CATALOGUE, THE Rune_System SHALL accept the entry without type errors.
3. THE Rune_System SHALL continue to validate existing weapon, armour, and talisman runes without modification to their behaviour.
4. WHEN a rune has category 'protection', 'engineering', or 'doom', THE rune placement validation SHALL treat it with the same item-compatibility rules as 'talisman' (placeable on both weapons and armour) until category-specific placement rules are defined in a subsequent requirement.
5. WHEN the `getRunesByCategory` function is called with 'protection', 'engineering', or 'doom', THE Rune_System SHALL return only runes matching the specified category from the RUNE_CATALOGUE.

### Requirement 2: Protection Rune Data

**User Story:** As a player with a Runesmith or Priest character, I want the Protection Runes from the Dwarf Players Guide available in the catalogue, so that I can track which ones my character knows.

#### Acceptance Criteria

1. THE Rune_System SHALL include exactly the following 16 Protection Runes in the RUNE_CATALOGUE: Rune of Alarm, Rune of Battle, Rune of Courage, Rune of Discovery, Rune of Enemy Detection, Rune of Locking, Rune of Purification, Rune of Retribution, Rune of Sanctuary, Rune of Slowness, Rune of Verminkill, Master Rune of Expel Chaos, Master Rune of Grimnir, Master Rune of Grungni, Master Rune of Stromni Redbeard, Master Rune of Valaya.
2. WHEN a Protection Rune entry is defined, THE Rune_System SHALL store its id (kebab-case, prefixed with `protection-` to distinguish from personal runes of the same name), name, category as 'protection', isMaster flag (true for entries named "Master Rune of...", false otherwise), maxPerItem as 1, slsRequired as a positive integer representing Success Levels needed to craft the rune, xpCost of 50 for non-master runes and 100 for master runes, effects array containing at least one RuneEffect entry, and description as a non-empty string.
3. THE Rune_System SHALL store the slsRequired field on RuneDefinition as a positive integer in the range 1 to 10 for Protection Runes, representing the crafting difficulty sourced from the DPG.
4. WHEN the RUNE_CATALOGUE is loaded, THE Rune_System SHALL contain exactly 11 non-master Protection Runes (isMaster: false) and exactly 5 master Protection Runes (isMaster: true).

### Requirement 3: Engineering Rune Data

**User Story:** As a player with an Engineer Runesmith character, I want the Engineering Runes from the Dwarf Players Guide available in the catalogue, so that I can track which ones my character knows and which artillery pieces bear them.

#### Acceptance Criteria

1. THE Rune_System SHALL include the following Engineering Runes in the RUNE_CATALOGUE: Rune of Accuracy, Rune of Burning, Rune of Forging, Rune of Penetrating, Rune of Reloading, Rune of Seeking, Rune of the Stalwart, Rune of the Valiant, Master Rune of Defence, Master Rune of Disguise, Master Rune of Immolation, Master Rune of Skewering.
2. WHEN an Engineering Rune entry is defined, THE Rune_System SHALL store its id, name, category as 'engineering', isMaster flag (set to true for runes prefixed with "Master Rune" and false for all others), slsRequired value as a positive integer, xpCost of 50 for non-master runes and 100 for master runes, effects array, description, and maxPerItem set to 1.
3. THE Rune_System SHALL store the slsRequired field on RuneDefinition for Engineering Runes as a positive integer representing the number of Success Levels required to inscribe the rune, using the values specified per rune in the Dwarf Players Guide (valid range: 1 to 10 inclusive).
4. THE Rune_System SHALL classify Engineering Runes with category value 'engineering' so that they are distinguishable from weapon, armour, and talismanic runes in catalogue lookups and filtering.
5. WHEN an Engineering Rune is inscribed on an item, THE Rune_System SHALL permit inscription only on items designated as artillery pieces, applying the same maximum of 3 runes per item and maximum of 1 Master Rune per item constraints used for other rune categories.

### Requirement 4: Doom Rune Data

**User Story:** As a player with a Runesmith who knows a Master Rune, I want the three Doom Runes available in the catalogue, so that I can track and activate them during play.

#### Acceptance Criteria

1. THE Rune_System SHALL include exactly three Doom Runes in the RUNE_CATALOGUE with the following names: "Rune of Hearth and Home", "Rune of Oath and Steel", "Rune of Wrath and Ruin".
2. THE Rune_System SHALL extend the RuneCategory type to include 'doom' as a valid category value, so that Doom Runes are categorically distinct from weapon, armour, and talisman runes.
3. WHEN a Doom Rune entry is defined, THE Rune_System SHALL store: id (following the existing kebab-case convention, e.g. 'rune-of-hearth-and-home'), name, category set to 'doom', isMaster set to false, xpCost set to 0, maxPerItem set to 0 (indicating Doom Runes are not inscribed onto items), effects as a single-element array with type 'special' and a description summarising the rune's game effect, and a description field containing a short summary of the rune's purpose.
4. THE Rune_System SHALL mark each Doom Rune with a boolean field `isAutoLearned` set to true, indicating the rune is added to `knownRunes` automatically when a character first acquires the Master Rune Magic talent rather than being learned individually for XP.

### Requirement 5: Protection Rune Placement Validation

**User Story:** As a player, I want the system to enforce Protection Rune placement rules, so that I only inscribe them on valid communal items.

#### Acceptance Criteria

1. WHEN a player attempts to place a Protection Rune on a Protection_Item that currently has fewer than 3 runes inscribed, THE Rune_System SHALL allow the placement.
2. IF a player attempts to place a Protection Rune on a Protection_Item that already has 3 runes inscribed, THEN THE Rune_System SHALL reject the placement with an error message indicating the item has reached the maximum of 3 runes.
3. IF a player attempts to place a Protection Rune on a weapon or armour item, THEN THE Rune_System SHALL reject the placement with an error message indicating that protection runes can only be inscribed on communal items and installations.
4. IF a Protection_Item already has a Master Rune inscribed and a player attempts to place a second Master Rune, THEN THE Rune_System SHALL reject the placement with an error message indicating only one Master Rune is allowed per item.
5. IF a player attempts to place a weapon, armour, or talisman rune on a Protection_Item, THEN THE Rune_System SHALL reject the placement with an error message indicating only protection runes can be inscribed on that item.
6. IF a player attempts to place a rune with an unknown or invalid rune identifier on a Protection_Item, THEN THE Rune_System SHALL reject the placement with an error message indicating the rune is unknown.

### Requirement 6: Engineering Rune Placement Validation

**User Story:** As a player, I want the system to enforce Engineering Rune placement rules, so that I only inscribe them on valid artillery weapons.

#### Acceptance Criteria

1. WHEN a player attempts to place an Engineering Rune on an Engineering_Item, IF the item has fewer than 3 runes already inscribed and no more than 1 of those runes is a Master Rune being duplicated, THEN THE Rune_System SHALL allow the placement.
2. IF a player attempts to place an Engineering Rune on an Engineering_Item that already has 3 runes inscribed, THEN THE Rune_System SHALL reject the placement with an error message indicating the item has reached its maximum rune capacity of 3.
3. WHEN a player attempts to place an Engineering Rune on a personal weapon, armour, talisman, or Protection_Item, THE Rune_System SHALL reject the placement with an error message indicating that engineering runes can only be inscribed on Dwarf artillery weapons.
4. IF an Engineering_Item already has a Master Rune inscribed, THEN THE Rune_System SHALL reject placement of a second Master Rune with an error message indicating that only one Master Rune is allowed per item.
5. WHEN a player attempts to place a non-engineering rune (weapon, armour, talisman, protection, or doom category) on an Engineering_Item, THE Rune_System SHALL reject the placement with an error message indicating that only engineering runes can be inscribed on artillery weapons.

### Requirement 7: Doom Rune Activation and Single-Use Tracking

**User Story:** As a player, I want to track Doom Rune activations during play, so that I know when I use one and can record its effect.

#### Acceptance Criteria

1. WHEN a character's `knownRunes` list contains any rune where `isMaster` is true, THE Rune_System SHALL include all three Doom Runes (Rune of Hearth and Home, Rune of Oath and Steel, Rune of Wrath and Ruin) in that character's known runes for display and activation purposes.
2. WHEN a player activates a Doom Rune and the activation is confirmed, THE Rune_System SHALL append an entry to the character's log array containing the rune id, a timestamp (milliseconds since epoch), and a label indicating it is a Doom Rune activation.
3. WHEN a Doom Rune activation has been recorded for a given rune id within the current session, THE Rune_System SHALL visually mark that Doom Rune as already used and SHALL disable its activation control to prevent duplicate activation.
4. WHEN a player views the Doom Runes list, THE Rune_System SHALL display each Doom Rune's effect description, the test difficulty label "Hard (-20) Runesmithing Test", and a note indicating that an Anvil_of_Doom is required for activation.
5. IF the player attempts to activate a Doom Rune that has already been activated in the current session, THEN THE Rune_System SHALL reject the activation and SHALL retain the existing log entry unchanged.

### Requirement 8: Learning Prerequisites for New Categories

**User Story:** As a player, I want the system to enforce proper talent prerequisites for learning new-category runes, so that my character only learns runes they are qualified for.

#### Acceptance Criteria

1. WHEN a character attempts to learn a non-master Protection Rune, THE Rune_System SHALL require the character to have a talent whose name starts with "Rune Magic" and whose parenthetical form specifier contains "Protection Runes" or "All Forms"; IF this prerequisite is not met, THEN THE Rune_System SHALL reject the attempt with an error indicating the required talent form.
2. WHEN a character attempts to learn a non-master Engineering Rune, THE Rune_System SHALL require the character to have a talent whose name starts with "Rune Magic" and whose parenthetical form specifier contains "Engineering Runes" or "All Forms"; IF this prerequisite is not met, THEN THE Rune_System SHALL reject the attempt with an error indicating the required talent form.
3. WHEN a character attempts to learn a Master Protection Rune, THE Rune_System SHALL require the character to have a talent whose name starts with "Master Rune Magic" and whose parenthetical form specifier contains "Protection Runes", "Protective Runes", or "All Forms"; IF this prerequisite is not met, THEN THE Rune_System SHALL reject the attempt with an error indicating the required talent form.
4. WHEN a character attempts to learn a Master Engineering Rune, THE Rune_System SHALL require the character to have a talent whose name starts with "Master Rune Magic" and whose parenthetical form specifier contains "Engineering Runes" or "All Forms"; IF this prerequisite is not met, THEN THE Rune_System SHALL reject the attempt with an error indicating the required talent form.
5. WHEN a character acquires the "Master Rune Magic" talent and the character's knownRunes list does not already contain all three Doom Runes, THE Rune_System SHALL automatically add all three Doom Runes (Rune of Hearth and Home, Rune of Oath and Steel, Rune of Wrath and Ruin) to the character's knownRunes list without XP cost.
6. IF a character attempts to learn a Doom Rune individually via the standard learn-rune action, THEN THE Rune_System SHALL reject the attempt with an error indicating that Doom Runes are only granted automatically upon acquiring the Master Rune Magic talent.
7. WHEN a character has a "Rune Magic" talent with no parenthetical form specifier (bare "Rune Magic"), THE Rune_System SHALL treat it as satisfying the prerequisite for weapon, armour, and talisman runes only, and SHALL NOT satisfy the prerequisite for Protection or Engineering category runes.

### Requirement 9: Protection Item Tracking on Character Sheet

**User Story:** As a player, I want to add and manage Protection Items on my character sheet, so that I can track which communal items bear my runes and where they are located.

#### Acceptance Criteria

1. THE Rune_System SHALL provide a data structure for Protection_Item with fields: id (unique string), name (string, 1 to 100 characters), type (one of: "banner", "shrine", "gatehouse", "oathstone", "icon", "other"), location (string, 0 to 200 characters), and runes (array of rune identifiers referencing entries in the RUNE_CATALOGUE with category 'protection').
2. WHEN a player adds a new Protection_Item, THE Rune_System SHALL require a non-empty name and a valid type selection, generate a unique id, and store the item in the character's protectionItems array with an initially empty runes array.
3. IF a player attempts to add a Protection_Item without providing a name or with a name exceeding 100 characters, THEN THE Rune_System SHALL reject the addition and display an error message indicating the name is required and must be between 1 and 100 characters.
4. WHEN a player edits an existing Protection_Item, THE Rune_System SHALL allow modification of the name, type, and location fields while preserving the item's id and inscribed runes array.
5. WHEN a player removes a Protection_Item, THE Rune_System SHALL display a confirmation prompt indicating the item name and the number of inscribed runes that will be lost, and SHALL only remove the item and its rune associations from the character's data upon confirmation.
6. THE Rune_System SHALL display each Protection_Item with its name, type, location, inscribed runes (showing each rune's name from the RUNE_CATALOGUE), and the number of rune slots remaining (calculated as 3 minus the number of inscribed runes).
7. THE Rune_System SHALL support a maximum of 20 Protection_Items per character.

### Requirement 10: Engineering Item Tracking on Character Sheet

**User Story:** As a player, I want to add and manage Engineering Items (artillery weapons) on my character sheet, so that I can track which war machines bear my runes.

#### Acceptance Criteria

1. THE Rune_System SHALL provide a data structure for Engineering_Item with fields: id (unique string), name (string, maximum 100 characters), type (one of "Grudge Thrower", "Bolt Thrower", or "Blackpowder Cannon"), and runes array (array of rune id strings, maximum 3 entries as enforced by Requirement 6).
2. WHEN a player adds a new Engineering_Item with a non-empty name and a valid type, THE Rune_System SHALL store the item in the character's data with an empty runes array, up to a maximum of 20 Engineering_Items per character.
3. IF a player attempts to add an Engineering_Item with an empty or whitespace-only name, THEN THE Rune_System SHALL reject the addition and not modify the character's data.
4. WHEN a player removes an Engineering_Item, THE Rune_System SHALL remove the item and its inscribed rune entries from the character's data while retaining those rune ids in the character's knownRunes array.
5. THE Rune_System SHALL display each Engineering_Item with its name, type, inscribed runes, and each rune's description from the RUNE_CATALOGUE.

### Requirement 11: Rune of Forging Charge Tracking

**User Story:** As a player, I want to track remaining activations of the Engineering Rune of Forging, so that I know how many times I can negate a Fumble or Misfire per adventure.

#### Acceptance Criteria

1. WHEN the Rune of Forging is inscribed on an Engineering_Item, THE Rune_System SHALL initialise a charge counter for that item equal to the number of Runes of Forging inscribed on it.
2. WHEN a player activates the Rune of Forging on a specific Engineering_Item, THE Rune_System SHALL decrement that item's charge counter by 1.
3. IF a player attempts to activate the Rune of Forging on an Engineering_Item with 0 remaining charges, THEN THE Rune_System SHALL reject the activation with the message "All Runes of Forging on this item have been used this adventure."
4. THE Rune_System SHALL provide a user-initiated reset action to restore all Rune of Forging charges across all Engineering_Items when a new adventure begins.
5. WHEN a Rune of Forging is added to or removed from an Engineering_Item, THE Rune_System SHALL recalculate the charge counter for that item to equal the current number of Runes of Forging inscribed on it.

### Requirement 12: UI Integration for New Rune Categories

**User Story:** As a player, I want a clear interface for viewing and managing Protection, Engineering, and Doom runes, so that I can use them during play without confusion.

#### Acceptance Criteria

1. THE Rune_System SHALL display a tabbed or sectioned interface that separates runes by category: Weapon, Armour, Talisman, Protection, Engineering, and Doom, with each category accessible independently.
2. WHEN a player navigates to the Protection section, THE Rune_System SHALL show a list of known Protection Runes displaying each rune's name, effects summary, and SLs Required value, followed by a list of Protection_Items showing each item's name, type, location, and inscribed runes with their effect summaries.
3. WHEN a player navigates to the Engineering section, THE Rune_System SHALL show a list of known Engineering Runes displaying each rune's name, effects summary, and SLs Required value, followed by a list of Engineering_Items showing each item's name, type, inscribed runes, and the remaining Rune of Forging charge count for any item bearing that rune.
4. WHEN a player navigates to the Doom section, THE Rune_System SHALL show the three Doom Runes each displaying their name, full effect description, a note that activation requires access to an Anvil of Doom and a Hard (-20) Runesmithing Test, and a button to log an activation.
5. WHILE a character does not know any Master Rune, THE Rune_System SHALL display the Doom section as locked with a message indicating that the character must learn a Master Rune before Doom Runes become available.
6. WHEN a player navigates to the Protection or Engineering section and the character knows no runes in that category and has no items of that type, THE Rune_System SHALL display an empty state message indicating no runes are known and no items have been added for that category.

### Requirement 13: Backward Compatibility

**User Story:** As a player with an existing character, I want the expanded rune system to load my saved data without errors, so that my current weapon, armour, and talisman runes continue to work.

#### Acceptance Criteria

1. WHEN loading a character that has no Protection_Items, Engineering_Items, or Doom Rune activations stored, THE Rune_System SHALL initialise empty arrays for these fields and SHALL preserve all existing character fields including `knownRunes`, `weapons[].runes`, and `armour[].runes` with their previously stored values unchanged.
2. THE Rune_System SHALL not modify the behaviour of `validateRunePlacement` for 'weapon' and 'armour' item types: the function SHALL continue to enforce a maximum of 3 runes per item, a maximum of 1 Master Rune per item, weapon-category runes only on weapons, armour-category runes only on armour, talismanic runes on either, and per-rune `maxPerItem` limits with the same acceptance and rejection outcomes as before the expansion.
3. THE Rune_System SHALL not modify the behaviour of `getAvailableRunesForItem` for 'weapon' and 'armour' item types: the function SHALL continue to return only runes whose category is the requested item type or 'talisman', excluding runes with categories 'protection', 'engineering', or 'doom'.
4. WHEN the expanded RUNE_CATALOGUE is loaded, THE Rune_System SHALL return results for `getRunesByCategory('weapon')`, `getRunesByCategory('armour')`, and `getRunesByCategory('talisman')` that contain only runes explicitly assigned to that category, excluding all runes assigned to the 'protection', 'engineering', or 'doom' categories.
5. WHEN loading a character whose `knownRunes`, `weapons[].runes`, or `armour[].runes` arrays contain rune IDs that exist in the pre-expansion RUNE_CATALOGUE, THE Rune_System SHALL resolve each of those IDs to the same RuneDefinition (same name, category, effects, and isMaster value) as before the expansion.
6. IF a stored rune ID does not match any entry in the expanded RUNE_CATALOGUE, THEN THE Rune_System SHALL retain the ID in the character's data without removing it and SHALL treat the unresolved rune as having no active effects.
