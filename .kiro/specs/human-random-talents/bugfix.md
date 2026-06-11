# Bugfix Requirements Document

## Introduction

The Character Creation Wizard is missing the random talents that Humans (Reiklander) and Halflings are supposed to receive during character creation per the WFRP 4e rulebook. Humans should get 3 random talents and Halflings should get 2 random talents, rolled from the d100 Random Talent table. Currently the species data omits these entries entirely and the wizard has no mechanism to roll or display them, resulting in incomplete characters that are missing talents they are entitled to by the rules.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN creating a Human (Reiklander) character THEN the system only assigns the talents "Doomed" and "Savvy or Suave", omitting the 3 random talents required by the rulebook

1.2 WHEN creating a Halfling character THEN the system only assigns the talents "Acute Sense (Taste)", "Night Vision", "Resistance (Chaos)", and "Small", omitting the 2 random talents required by the rulebook

1.3 WHEN the Character Wizard reaches the species talents step for Human or Halfling THEN the system provides no mechanism to roll random talents from the Random Talent table

1.4 WHEN the Random Talent table is needed during character creation THEN the system has no data source for the d100 random talent table (36 entries mapping roll ranges to talents)

1.5 WHEN a duplicate talent is rolled (one the character already possesses) THEN the system has no mechanism to detect the conflict or allow a reroll

### Expected Behavior (Correct)

2.1 WHEN creating a Human (Reiklander) character THEN the system SHALL allow rolling 3 random talents from the d100 Random Talent table and include them in the character's species talents

2.2 WHEN creating a Halfling character THEN the system SHALL allow rolling 2 random talents from the d100 Random Talent table and include them in the character's species talents

2.3 WHEN the Character Wizard reaches the species talents step for Human or Halfling THEN the system SHALL display a roll button or mechanism for each required random talent slot, showing the rolled result

2.4 WHEN the Random Talent table is needed THEN the system SHALL use the complete d100 table with 36 entries (roll ranges 01–03 through 98–00) mapping to the correct talents as defined in the rulebook

2.5 WHEN a duplicate talent is rolled (one the character already has from species talents or a previous random roll) THEN the system SHALL allow the player to reroll that talent slot

2.6 WHEN the character wizard is completed THEN the system SHALL save all resolved random talents to the character's talent list alongside the fixed species talents

### Unchanged Behavior (Regression Prevention)

3.1 WHEN creating a Dwarf character THEN the system SHALL CONTINUE TO assign only fixed species talents with no random talent rolling mechanism

3.2 WHEN creating a High Elf character THEN the system SHALL CONTINUE TO assign only fixed species talents with no random talent rolling mechanism

3.3 WHEN creating a Wood Elf character THEN the system SHALL CONTINUE TO assign only fixed species talents with no random talent rolling mechanism

3.4 WHEN creating a Human character THEN the system SHALL CONTINUE TO assign the fixed talents "Doomed" and "Savvy or Suave" in addition to the new random talents

3.5 WHEN creating a Halfling character THEN the system SHALL CONTINUE TO assign the fixed talents "Acute Sense (Taste)", "Night Vision", "Resistance (Chaos)", and "Small" in addition to the new random talents

3.6 WHEN the "Savvy or Suave" choice talent is presented for Humans THEN the system SHALL CONTINUE TO allow the player to choose between Savvy and Suave as before

3.7 WHEN all other wizard steps (name, species selection, class, career, characteristics, skills, fate/resilience, details) are used THEN the system SHALL CONTINUE TO function identically to the current behavior
