# Requirements Document

## Introduction

This feature adds the ability to randomly roll or manually select character personal details (age, height, eye colour, hair colour, and distinguishing features) during character creation and editing. Determination is based on species-specific tables and formulas from the WFRP4e rulebooks. Each personal detail field offers both a random roll option (using the correct dice formula for the character's species) and a manual selection dropdown constrained to valid options for that species.

## Glossary

- **App**: The PWA character sheet application
- **Character**: A player character record within the App
- **Species**: The character's species as stored in Character.species, mapped to a species group for table lookup
- **Species_Group**: One of Human, Dwarf, Halfling, High_Elf, Wood_Elf, or Ogre — derived from the Character's species variant
- **Personal_Details_Section**: The UI area within the Identity tab where age, height, eye colour, and hair colour fields are displayed
- **Roll_Button**: A UI control that triggers random determination of a personal detail using the appropriate dice formula
- **Species_Dropdown**: A UI select control populated with valid options for the character's Species_Group
- **Dice_Formula**: A species-specific calculation combining a base value with one or more d10 rolls
- **Eye_Colour_Table**: A 2d10 lookup table mapping roll results to eye colour values per Species_Group
- **Hair_Colour_Table**: A 2d10 lookup table mapping roll results to hair colour values per Species_Group
- **Variegated_Eyes**: An Elf-specific rule allowing two eye colour rolls to be combined (e.g., "sapphire blue flecked with gold")
- **Height_Bonus_Rule**: A Human-specific rule where rolling a 10 on either height die triggers an additional d10 to be added
- **Dwarf_Regional_Modifier**: A modifier of -5 (Norse) or +5 (southern holds) applied to the d100 roll on the Dwarf Guide alternate table
- **Distinguishing_Feature**: An optional physical trait for Dwarf characters selected from the Dwarf Guide d100 table

## Requirements

### Requirement 1: Species Group Mapping

**User Story:** As a player, I want the app to correctly identify which species tables apply to my character, so that personal detail options match my character's species variant.

#### Acceptance Criteria

1. THE App SHALL map the species key "Human / Reiklander" to the Human Species_Group
2. THE App SHALL map the species key "Dwarf" and all species keys prefixed with "Dwarfs (" — specifically "Dwarfs (Karaz-a-Karak)", "Dwarfs (Barak Varr)", "Dwarfs (Karak Azul)", "Dwarfs (Karak Eight Peaks)", "Dwarfs (Karak Kadrin)", "Dwarfs (Zhufbar)", "Dwarfs (Karak Hirn/Black Mountains)", "Dwarfs (Karak Izor/The Vaults)", "Dwarfs (Karak Norn/Grey Mountains)", "Dwarfs (Norse)", "Dwarfs (Imperial)" — to the Dwarf Species_Group using case-insensitive prefix matching against "dwarf"
3. THE App SHALL map the species key "Halfling" to the Halfling Species_Group
4. THE App SHALL map the species key "High Elf" and all species keys prefixed with "High Elves (" — specifically "High Elves (Caledor)", "High Elves (Ellyrion)", "High Elves (Avelorn)", "High Elves (Saphery)", "High Elves (Eataine)", "High Elves (Tiranoc)", "High Elves (Nagarythe)", "High Elves (Chrace)", "High Elves (Cothique)", "High Elves (Yvresse)", "High Elves (Sea Elf)" — to the High_Elf Species_Group using case-insensitive prefix matching against "high elf" or "high elves"
5. THE App SHALL map the species key "Wood Elf" to the Wood_Elf Species_Group
6. THE App SHALL map the species key "Ogre" to the Ogre Species_Group
7. IF the App receives a species string that does not match any defined species key in SPECIES_DATA, THEN THE App SHALL treat the species as unmapped and not assign it to any Species_Group
8. THE App SHALL perform species-to-group matching using case-insensitive comparison so that "dwarf", "DWARF", and "Dwarf" all resolve to the Dwarf Species_Group

### Requirement 2: Random Age Determination

**User Story:** As a player, I want to roll a random starting age for my character, so that I can quickly generate a lore-appropriate age.

#### Acceptance Criteria

1. WHEN the player activates the Roll_Button for age, THE App SHALL generate a random age using the Dice_Formula for the character's Species_Group
2. THE App SHALL use the formula 15 + 1d10 for Human characters, producing a value in the range 16 to 25
3. THE App SHALL use the formula 15 + 10d10 for Dwarf characters, producing a value in the range 25 to 115
4. THE App SHALL use the formula 15 + 5d10 for Halfling characters, producing a value in the range 20 to 65
5. THE App SHALL use the formula 30 + 10d10 for High_Elf characters (default Time of Ending age), producing a value in the range 40 to 130
6. THE App SHALL use the formula 30 + 10d10 for Wood_Elf characters, producing a value in the range 40 to 130
7. THE App SHALL use the formula 15 + 5d10 for Ogre characters, producing a value in the range 20 to 65
8. WHEN a random age is generated, THE App SHALL store the result as a numeric string (e.g. "23") in Character.age, replacing any previously stored value
9. IF the player activates the Roll_Button for age and the character has no Species_Group assigned, THEN THE App SHALL not generate an age and SHALL leave the Character.age field unchanged

### Requirement 3: High Elf Elder Age Tiers

**User Story:** As a player creating a High Elf elder character, I want to select an age tier before rolling, so that my character's age reflects the correct historical era.

#### Acceptance Criteria

1. WHEN the character's Species_Group is High_Elf, THE App SHALL present age tier options: Time of Ending (default), Time of Steel, Time of Incursion, Time of Voyages, and Time of the Sage
2. IF the character's Species_Group is not High_Elf, THEN THE App SHALL not display the age tier selector
3. WHEN the player selects Time of Ending and activates the Roll_Button for age, THE App SHALL use the formula 30 + 10d10
4. WHEN the player selects Time of Steel and activates the Roll_Button for age, THE App SHALL use the formula 120 + 9d10
5. WHEN the player selects Time of Incursion and activates the Roll_Button for age, THE App SHALL use the formula 200 + 15d10
6. WHEN the player selects Time of Voyages and activates the Roll_Button for age, THE App SHALL use the formula 320 + 30d10
7. WHEN the player selects Time of the Sage and activates the Roll_Button for age, THE App SHALL use the formula 580 + 30d10
8. WHEN no age tier has been explicitly selected by the player, THE App SHALL default to Time of Ending

### Requirement 4: Random Height Determination

**User Story:** As a player, I want to roll a random height for my character, so that I get a lore-appropriate height based on species.

#### Acceptance Criteria

1. WHEN the player activates the Roll_Button for height, THE App SHALL generate a random height using the Dice_Formula for the character's Species_Group, where each d10 produces a value from 1 to 10 inclusive
2. THE App SHALL use the formula 4'9" + 2d10 inches for Human characters (base height range before Height_Bonus_Rule: 4'11" to 5'5")
3. THE App SHALL use the formula 4'3" + 1d10 inches for Dwarf characters (height range: 4'4" to 5'1")
4. THE App SHALL use the formula 3'1" + 1d10 inches for Halfling characters (height range: 3'2" to 3'11")
5. THE App SHALL use the formula 5'11" + 1d10 inches for High_Elf characters (height range: 6'0" to 6'9")
6. THE App SHALL use the formula 5'11" + 1d10 inches for Wood_Elf characters (height range: 6'0" to 6'9")
7. THE App SHALL use the formula 7'7" + 1d10 inches for Ogre characters (height range: 7'8" to 8'5")
8. WHEN the total inches from base height plus dice result equals or exceeds 12, THE App SHALL convert every 12 inches into 1 additional foot before formatting
9. WHEN a random height is generated, THE App SHALL format the result as feet and inches (e.g., "5'7\"") with the inches portion ranging from 0 to 11, and store it in Character.height

### Requirement 5: Human Height Bonus Rule

**User Story:** As a player with a Human character, I want the special height rule applied when I roll a 10, so that my character can be unusually tall per the rulebook.

#### Acceptance Criteria

1. WHEN the character's species is identified as Human AND either of the two initial height d10 rolls shows a result of 10, THE App SHALL roll exactly one additional d10 (producing a value from 1 to 10) and add the result to the height total (the sum of the two initial d10 values plus the bonus d10 value)
2. IF both initial height d10 rolls show a result of 10, THEN THE App SHALL still roll only one additional bonus d10
3. THE App SHALL NOT apply the height bonus d10 rule to non-Human species (Dwarf, Halfling, High Elf, Wood Elf, Ogre, or any sub-species thereof)
4. IF the bonus d10 also shows a result of 10, THEN THE App SHALL NOT roll any further bonus dice (the bonus is non-recursive)

### Requirement 6: Random Eye Colour Determination

**User Story:** As a player, I want to roll a random eye colour for my character, so that I get a species-appropriate result from the official tables.

#### Acceptance Criteria

1. WHEN the player activates the Roll_Button for eye colour, THE App SHALL roll 2d10 (producing a sum in the range 2–20), and look up the eye colour from the Eye_Colour_Table for the character's Species_Group
2. IF the character's Species_Group is Human, THEN THE App SHALL use the Reikland Human eye colour column of the Eye_Colour_Table
3. IF the character's Species_Group is Dwarf, THEN THE App SHALL use the Dwarf eye colour column of the Eye_Colour_Table
4. IF the character's Species_Group is Halfling, THEN THE App SHALL use the Halfling eye colour column of the Eye_Colour_Table
5. IF the character's Species_Group is High_Elf, THEN THE App SHALL use the High Elf eye colour column of the Eye_Colour_Table
6. IF the character's Species_Group is Wood_Elf, THEN THE App SHALL use the Wood Elf eye colour column of the Eye_Colour_Table
7. IF the character's Species_Group is Ogre, THEN THE App SHALL use the Ogre eye colour column of the Eye_Colour_Table
8. WHEN the roll result is 2 for a Human character, THE App SHALL present a Species_Dropdown populated with all eye colour values from the Reikland Human column and allow the player to select one (Free Choice)
9. WHEN a random eye colour is determined (either by table lookup or Free Choice selection), THE App SHALL store the result as a string in Character.eyes and display the value in the eye colour field
10. IF the player activates the Roll_Button for eye colour and no Species_Group is assigned to the character, THEN THE App SHALL not perform a roll and SHALL indicate that a species must be selected first

### Requirement 7: Elf Variegated Eye Colour

**User Story:** As a player with an Elf character, I want the option to roll twice for eye colour to create variegated eyes, so that my character can have the distinctive Elf eye appearance described in the rulebook.

#### Acceptance Criteria

1. WHEN the character's Species_Group is High_Elf or Wood_Elf AND the player has rolled a first eye colour result, THE App SHALL offer a "Roll Second Colour" option
2. WHEN the player activates the "Roll Second Colour" option, THE App SHALL roll 2d10 on the same species Eye_Colour_Table and combine both results into a variegated description using the format "{first colour} flecked with {second colour}" (e.g., "Sapphire flecked with Gold")
3. IF both eye colour rolls produce the same value, THE App SHALL use only the single colour without the "flecked with" format
4. WHEN the player declines the second roll, THE App SHALL use only the first roll result
5. WHEN the variegated description is generated, THE App SHALL store the combined string in Character.eyes

### Requirement 8: Random Hair Colour Determination

**User Story:** As a player, I want to roll a random hair colour for my character, so that I get a species-appropriate result from the official tables.

#### Acceptance Criteria

1. WHEN the player activates the Roll_Button for hair colour, THE App SHALL roll 2d10, sum the result (producing a value from 2 to 20), and look up the hair colour from the Hair_Colour_Table for the character's Species_Group
2. IF the character's Species_Group is Human, THEN THE App SHALL use the Reikland Human hair colour column
3. IF the character's Species_Group is Dwarf, THEN THE App SHALL use the Dwarf hair colour column
4. IF the character's Species_Group is Halfling, THEN THE App SHALL use the Halfling hair colour column
5. IF the character's Species_Group is High_Elf, THEN THE App SHALL use the High Elf hair colour column
6. IF the character's Species_Group is Wood_Elf, THEN THE App SHALL use the Wood Elf hair colour column
7. IF the character's Species_Group is Ogre, THEN THE App SHALL use the Ogre hair colour column
8. WHEN a random hair colour is generated, THE App SHALL store the result as a string in Character.hair

### Requirement 9: Manual Selection of Personal Details

**User Story:** As a player, I want to manually choose my character's personal details from valid species options, so that I have control over my character's appearance while staying within lore-appropriate bounds.

#### Acceptance Criteria

1. THE App SHALL provide a Species_Dropdown for eye colour populated with the unique (deduplicated) set of eye colour values from the Eye_Colour_Table for the character's Species_Group
2. THE App SHALL provide a Species_Dropdown for hair colour populated with the unique (deduplicated) set of hair colour values from the Hair_Colour_Table for the character's Species_Group
3. WHEN the player selects a value from the eye colour Species_Dropdown, THE App SHALL store the selected value in Character.eyes and display it in the corresponding free-text input field
4. WHEN the player selects a value from the hair colour Species_Dropdown, THE App SHALL store the selected value in Character.hair and display it in the corresponding free-text input field
5. THE App SHALL retain the existing free-text input for each personal detail field so the player can type custom values that override any previous dropdown selection
6. WHEN the Character.species changes and the currently stored eye or hair colour value is not present in the new Species_Group's dropdown options, THE App SHALL retain the stored value in the free-text field without clearing it
7. WHEN the Character.species changes, THE App SHALL reset the Species_Dropdown selection indicator to show no active selection if the previously selected value is not in the new options list

### Requirement 10: Dwarf Guide Alternate Table

**User Story:** As a player with a Dwarf character, I want the option to use the Dwarf Guide's d100 table, so that I can get regionally-appropriate hair, eye colour, and distinguishing features in a single roll.

#### Acceptance Criteria

1. IF the character's Species_Group is Dwarf, THEN THE App SHALL display an alternate roll option that uses the Dwarf Guide d100 table alongside the standard appearance generation
2. WHEN the player activates the alternate table roll, THE App SHALL generate a 1d100 result (range 1–100) and look up the corresponding row to determine hair colour, eye colour, and distinguishing feature from the Dwarf Guide table
3. IF the character's species variant is Norse, THEN THE App SHALL apply a -5 modifier to the d100 result before looking up hair colour and eye colour only (the distinguishing feature column uses the unmodified result), clamping the modified result to a minimum of 1
4. IF the character's species variant is from a southern hold (Karak Hirn/Black Mountains, Karak Izor/The Vaults, or any origin described as Tilea or southern Worlds Edge Mountains), THEN THE App SHALL apply a +5 modifier to the d100 result before looking up hair colour and eye colour only (the distinguishing feature column uses the unmodified result), clamping the modified result to a maximum of 100
5. WHEN the alternate table produces a result, THE App SHALL store the hair colour in Character.hair and the eye colour in Character.eyes, replacing any previously assigned values, and present the distinguishing feature to the player as an optional selection that is stored only if the player confirms it
6. WHEN the player activates the alternate table roll and the character already has hair or eye colour values assigned from a previous method, THE App SHALL replace those values with the new alternate table results without requiring additional confirmation

### Requirement 11: Distinguishing Features for Dwarfs

**User Story:** As a player with a Dwarf character, I want to optionally select or roll a distinguishing feature, so that my character has a unique physical trait.

#### Acceptance Criteria

1. WHEN the character's Species_Group is Dwarf, THE App SHALL provide a separate Roll_Button for distinguishing features
2. WHEN the player activates the Roll_Button for distinguishing features, THE App SHALL roll 1d100 with no regional modifier applied, look up the result on the Dwarf Guide distinguishing features column (using the same 5-point band ranges as the hair/eye table: less than 06, 06–10, 11–15, …, 91–95, more than 95), and display the resulting feature
3. WHEN the character's Species_Group is Dwarf, THE App SHALL provide a dropdown listing all 20 distinguishing features for manual selection
4. THE App SHALL limit each Dwarf character to one distinguishing feature at a time
5. IF the Dwarf character already has a distinguishing feature assigned, THEN THE App SHALL replace the existing feature with the newly rolled or selected value

### Requirement 12: Species Requirement for Rolling

**User Story:** As a player, I want the app to require a species selection before allowing personal detail rolls, so that the correct tables and formulas are used.

#### Acceptance Criteria

1. WHILE the Character.species field is an empty string, THE App SHALL disable all Roll_Buttons in the Personal_Details_Section so that they do not respond to user interaction
2. WHILE the Character.species field is an empty string, THE App SHALL disable all Species_Dropdowns in the Personal_Details_Section so that they do not respond to user interaction
3. WHEN the Character.species changes to a non-empty value, THE App SHALL enable all Roll_Buttons and Species_Dropdowns in the Personal_Details_Section within 500 milliseconds
4. WHEN the Character.species changes from one species to another, THE App SHALL reset all Species_Dropdowns to their default unselected state and update the available options to reflect the newly selected species's Species_Group
5. WHILE a Roll_Button or Species_Dropdown is disabled, THE App SHALL display the control with a visually distinct disabled appearance and set the aria-disabled attribute to true

### Requirement 13: Persistence of Free-Text Editing

**User Story:** As a player, I want to keep the ability to type custom values for personal details, so that I am not forced to use only the predefined options.

#### Acceptance Criteria

1. THE App SHALL display an editable free-text input field for each of the following Character fields: age, height, hair, and eyes, each accepting any text up to 100 characters in length
2. WHEN the player types a custom value into a free-text field, THE App SHALL store that value in the corresponding Character field (Character.age, Character.height, Character.hair, or Character.eyes), replacing any previously stored value
3. WHEN a value has been set by a Roll_Button or Species_Dropdown, THE App SHALL keep the corresponding free-text input field editable so the player can overwrite the rolled or selected value by typing
4. THE App SHALL accept any text input in the free-text fields, including values not present in the Species_Dropdown options

### Requirement 14: UI Integration on Identity Tab

**User Story:** As a player, I want the roll and select controls placed alongside the existing personal detail fields on the Identity tab, so that the workflow is intuitive and consistent with the existing layout.

#### Acceptance Criteria

1. THE App SHALL display the Roll_Button within the same grid cell or immediately following the text input for each personal detail field (age, height, eyes, hair), such that no other unrelated control appears between the text input and its Roll_Button
2. THE App SHALL display the Species_Dropdown within the same grid cell or immediately following the text input for each colour/feature field (eyes, hair), grouped visually with the corresponding Roll_Button and text input
3. WHEN the character's Species_Group is High_Elf, THE App SHALL display the age tier selector (listing all five era options defined in Requirement 3) within the same grid cell as the age field, positioned between the age text input and the age Roll_Button
4. WHEN the character's Species_Group is Dwarf, THE App SHALL display the alternate d100 roll option (as defined in Requirement 10) and the distinguishing features controls (Roll_Button and dropdown as defined in Requirement 11) within the Personal_Details_Section
5. WHILE the Character.species field is empty, THE App SHALL render all Roll_Buttons and Species_Dropdowns in the Personal_Details_Section in a visually distinct disabled state by reducing their opacity to no more than 50% of the enabled state and setting the cursor to not-allowed
6. IF the player activates a disabled Roll_Button or Species_Dropdown, THEN THE App SHALL not perform the roll or selection action
