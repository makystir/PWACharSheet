# Requirements Document

## Introduction

This feature implements the Dwarf Priestly Runic Magic system from the Dwarf Players Guide. Dwarf priests do not use the standard WFRP miracle system. Instead, they inscribe Runic Magic of limited power. Each Ancestor God's priesthood grants access to a specific subset of runes. This feature adds deity tracking to the character, maps deity-specific rune access lists, and integrates with the existing `knownRunes` system so that priests can only learn and inscribe runes permitted by their patron deity.

## Glossary

- **Rune_Filter**: The logic module responsible for determining which runes a Dwarf priest character is permitted to learn or inscribe based on their patron Ancestor God.
- **Deity_Registry**: The data structure that maps each Ancestor God to the list of rune names that deity's priesthood can access.
- **Priest_Character**: A Character whose career path includes a Dwarf priestly role and who has a patron Ancestor God assigned.
- **Ancestor_God**: One of the seven Dwarf deities whose priesthood grants access to specific runes: Grungni, Valaya, Grimnir, Gazul, Smednir, Thungni, or Morgrim.
- **High_Priest_Bonus**: An additional Master Rune available only to High Priests of certain Ancestor Gods (Smednir and Morgrim).
- **Character_Interface**: The TypeScript interface representing a player character's stored data, including the `knownRunes` field.

## Requirements

### Requirement 1: Patron Deity Assignment

**User Story:** As a player with a Dwarf priest character, I want to assign a patron Ancestor God to my character, so that the app knows which deity my priest serves and can filter available runes accordingly.

#### Acceptance Criteria

1. THE Character_Interface SHALL include a field to store the patron Ancestor God for a Priest_Character.
2. WHEN a user assigns a patron Ancestor God, THE Character_Interface SHALL store exactly one of the following values: Grungni, Valaya, Grimnir, Gazul, Smednir, Thungni, or Morgrim.
3. WHEN no patron Ancestor God is assigned, THE Character_Interface SHALL store a null or undefined value for the deity field.
4. WHEN a patron Ancestor God has already been assigned and the user selects a different deity, THE Character_Interface SHALL replace the previously stored deity value with the newly selected value.
5. IF a user attempts to assign a value that is not one of the seven valid Ancestor Gods, THEN THE Character_Interface SHALL reject the assignment and retain the previous deity value unchanged.

### Requirement 2: Deity-to-Rune Mapping Data

**User Story:** As a player with a Dwarf priest character, I want the app to know which runes each Ancestor God grants access to, so that I only see runes appropriate to my deity.

#### Acceptance Criteria

1. THE Deity_Registry SHALL define the rune access list for Grungni as exactly the following 11 runes: Alarm, Courage, Enemy Detection, Forging, Fortitude, Furnace, Preservation, Purification, Verminkill, Valiant, Warding.
2. THE Deity_Registry SHALL define the rune access list for Smednir as exactly the following 8 runes: Cleaving, Cutting, Fire, Forging, Furnace, Iron, Truth, Warding.
3. THE Deity_Registry SHALL define the rune access list for Thungni as exactly the following 7 runes: Alarm, Clear Sight, Enemy Detection, Luck, Sanctuary, Restoration, Truth.
4. THE Deity_Registry SHALL define the rune access list for Morgrim as exactly the following 13 runes: Accuracy, Alarm, Burning, Clear Seeing, Disguise, Enemy Detection, Farseeing, Forging, Furnace, Immolation, Penetrating, Reloading, Seeking.
5. THE Deity_Registry SHALL define rune access lists for Valaya, Grimnir, and Gazul as empty lists (0 runes).
6. THE Deity_Registry SHALL associate the Master Rune of Industry as a High_Priest_Bonus for Smednir.
7. THE Deity_Registry SHALL associate the Master Rune of Defence as a High_Priest_Bonus for Morgrim.
8. THE Deity_Registry SHALL define no High_Priest_Bonus for Grungni, Valaya, Grimnir, Gazul, and Thungni.
9. WHEN the Deity_Registry is loaded, THE application SHALL verify that every rune name in each deity's access list and every High_Priest_Bonus rune corresponds to an entry in the RUNE_CATALOGUE.

### Requirement 3: Priest Rune Filtering

**User Story:** As a player with a Dwarf priest character, I want the available runes to be filtered based on my patron deity, so that I cannot accidentally learn or inscribe runes my priesthood does not permit.

#### Acceptance Criteria

1. WHEN a Priest_Character has a patron Ancestor God assigned, THE Rune_Filter SHALL restrict the list of learnable runes to only those runes in the Deity_Registry for that Ancestor God.
2. WHEN a Priest_Character has no patron Ancestor God assigned, THE Rune_Filter SHALL not apply deity-based filtering and SHALL fall back to the standard Runesmith rune availability.
3. WHEN a Priest_Character attempts to learn a rune not in their deity's access list, THE Rune_Filter SHALL reject the attempt and SHALL return an error message identifying the rune name and the deity that restricts it.
4. WHEN a Priest_Character is a High Priest and their deity has a High_Priest_Bonus, THE Rune_Filter SHALL include that bonus Master Rune in the available rune list.
5. WHEN a Priest_Character is not a High Priest, THE Rune_Filter SHALL exclude any High_Priest_Bonus runes from the available rune list even if the rune appears in the deity's standard access list.

### Requirement 4: Integration with Existing Rune System

**User Story:** As a player, I want the priestly rune system to work alongside the existing Runesmith rune system, so that both Runesmiths and priests can use the same underlying rune mechanics without conflict.

#### Acceptance Criteria

1. THE Rune_Filter SHALL use the same `knownRunes` field on the Character_Interface for both Runesmith characters and Priest_Characters.
2. WHEN a rune is learned by a Priest_Character, THE Character_Interface SHALL store the rune identifier as a string in the `knownRunes` array using the same identifier format as Runesmith-learned runes.
3. THE Rune_Filter SHALL apply deity-based restrictions only to Priest_Characters and SHALL not alter rune availability for Runesmith characters.
4. WHEN a Priest_Character inscribes a rune onto an item, THE existing rune placement validation SHALL continue to apply unchanged, including: maximum 3 runes per item, maximum 1 Master Rune per item, weapon runes only on weapons, armour runes only on armour, talismanic runes on either, and per-rune maximum inscription limits.
5. WHEN a Priest_Character attempts to learn a rune, THE canLearnRune function SHALL accept the Rune Magic talent as the prerequisite for standard runes and Master Rune Magic as the prerequisite for Master Runes, identical to Runesmith characters.
6. IF a character qualifies as both a Runesmith and a Priest_Character, THEN THE Rune_Filter SHALL apply the union of both Runesmith availability and the deity-restricted list, granting access to any rune permitted by either career path.

### Requirement 5: Deity Selection UI

**User Story:** As a player, I want a user interface element to select my Dwarf priest's patron Ancestor God, so that I can configure my character's deity affiliation.

#### Acceptance Criteria

1. WHEN the character's species is Dwarf and the character's career includes a priestly role (e.g., Doom Priest, Forge Priest, Hearth Priest, or any career granting the Invoke talent for a Dwarf deity), THE application SHALL display a deity selection control presenting all seven Ancestor Gods as selectable options: Grungni, Valaya, Grimnir, Gazul, Smednir, Thungni, Morgrim.
2. WHEN no patron Ancestor God has been assigned, THE deity selection control SHALL display a placeholder prompt indicating no deity is selected and SHALL not pre-select any option.
3. WHEN a user selects a deity from the control, THE application SHALL persist the selection to the Character_Interface immediately.
4. IF the user changes the patron deity while the character already knows runes not permitted by the new deity, THEN THE application SHALL display a warning listing the names of the known runes that are no longer on the new deity's access list.
5. WHEN runes are already known that fall outside the currently assigned deity's access list, THE application SHALL retain those runes in `knownRunes` and SHALL display them with a distinct visual differentiation from permitted runes (such as a different background colour or a badge) so that users can distinguish restricted runes from permitted runes without relying on colour alone.
6. IF the character's career changes from a priestly career to a non-priestly career while a patron deity is assigned, THEN THE application SHALL hide the deity selection control but SHALL retain the stored deity value in the Character_Interface.

### Requirement 6: High Priest Designation

**User Story:** As a player whose priest character has advanced to High Priest rank, I want the app to recognise my High Priest status, so that I gain access to the additional Master Rune granted by my deity.

#### Acceptance Criteria

1. WHEN a Priest_Character's career level is 3 or 4 (indicating High Priest rank), THE Rune_Filter SHALL include the High_Priest_Bonus rune for the assigned deity in the available rune list.
2. WHEN a Priest_Character's career level is 1 or 2, THE Rune_Filter SHALL exclude the High_Priest_Bonus rune from the available rune list.
3. IF a Priest_Character's career level is reduced from 3 or 4 to a lower level, THEN THE application SHALL retain any already-learned High_Priest_Bonus rune in `knownRunes` but SHALL visually indicate it as restricted using the same visual pattern as Requirement 5 criterion 5.
4. WHEN a Priest_Character's deity has no defined High_Priest_Bonus (Grungni, Valaya, Grimnir, Gazul, Thungni), THE Rune_Filter SHALL not add any additional runes regardless of career level.
