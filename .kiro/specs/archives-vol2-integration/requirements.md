# Requirements Document

## Introduction

This feature integrates content from "Archives of the Empire: Volume II" into the WFRP 4e character sheet PWA. It adds the Ogre as a playable species with a unique doubled wound formula, three Ogre-only careers (Maneater, Rhinox Herder, Ogre Butcher), Ogre-specific weapons and armour, the Lore of the Great Maw spell lore, a star signs data table for character creation, and a psychology tracker UI component for managing acquired psychological conditions during play.

## Glossary

- **Character_Sheet**: The React/TypeScript PWA that manages WFRP 4e character data
- **Species_Data**: The data structure (`SpeciesData` in `src/types/character.ts`) holding base characteristics, movement, fate, resilience, extra points, wound formula flag, skills, and talents for a playable species
- **Career_Scheme**: The data structure (`CareerScheme` in `src/types/character.ts`) defining a career's class and four progression levels with titles, status, characteristics, skills, talents, and trappings
- **Wound_Calculator**: The logic module (`src/logic/calculators.ts`) responsible for computing maximum wounds from characteristic bonuses
- **Wound_Formula**: The standard WFRP 4e formula: SB + 2×TB + WPB (plus Hardy×TB). For Ogres, the result is doubled
- **Spell_Data**: The data structure (`SpellData` in `src/types/character.ts`) holding name, CN, range, target, duration, effect, and lore for a spell
- **Weapon_Data**: The data structure (`WeaponData` in `src/types/character.ts`) holding name, group, enc, range/reach, damage, and qualities for a weapon
- **Armour_Data**: The data structure (`ArmourData` in `src/types/character.ts`) holding name, locations, enc, AP, and qualities for armour
- **Psychology_Tracker**: A new UI component on the Identity tab that displays and manages psychological conditions (Phobia, Animosity, Hatred, Trauma)
- **Star_Sign**: A data entry associating a star sign name with characteristic bonuses (+2 to two characteristics) and a penalty (−3 to one characteristic), or a talent with a penalty
- **Broken_Tally**: A running count of times a character has gained the Broken condition from Terror sources, tracked to determine Phobia acquisition threshold
- **Ogre_Career**: A career restricted to the Ogre species only

## Requirements

### Requirement 1: Ogre Species Data

**User Story:** As a player creating an Ogre character, I want the Ogre species available in the species selector, so that I can generate an Ogre with correct base characteristics, fate, resilience, movement, skills, and talents.

#### Acceptance Criteria

1. WHEN "Ogre" is selected as a species, THE Character_Sheet SHALL populate base characteristics as: WS 20, BS 10, S 35, T 35, I 0, Ag 15, Dex 10, Int 10, WP 20, Fel 10
2. WHEN "Ogre" is selected as a species, THE Character_Sheet SHALL set movement to 6, fate to 0, resilience to 3, and extra points to 1
3. WHEN "Ogre" is selected as a species, THE Character_Sheet SHALL populate species skills with: Athletics, Consume Alcohol, Endurance, Entertain (Storytelling), Intimidate, Language (Grumbarth), Lore (Ogres), Melee (Basic), Melee (Brawling), Navigation, Outdoor Survival, Track
4. WHEN "Ogre" is selected as a species, THE Character_Sheet SHALL populate species talents with: Dirty Fighting, Large, Resistance (Chaos), Resistance (Poison (Ingested)), Very Resilient or Very Strong, Vice (Food)

### Requirement 2: Ogre Wound Formula

**User Story:** As a player with an Ogre character, I want wounds calculated using the doubled Ogre formula, so that my Ogre has the correct maximum wounds reflecting their massive physique.

#### Acceptance Criteria

1. WHILE the character species is "Ogre", THE Wound_Calculator SHALL compute maximum wounds as (SB + 2×TB + WPB) × 2, before adding Hardy bonuses
2. WHILE the character species is "Ogre", THE Wound_Calculator SHALL apply Hardy talent bonuses after the doubling, adding TB per Hardy level to the doubled base
3. THE Species_Data interface SHALL include a wound multiplier field to support the Ogre's doubled wound formula without hardcoding species name checks
4. FOR ALL species without a wound multiplier defined, THE Wound_Calculator SHALL default to a multiplier of 1

### Requirement 3: Maneater Career

**User Story:** As a player building an Ogre Maneater, I want the Maneater career available in the career selector, so that I can track advancement through Fresh Meat, Maneater, Maneater Crusher, and Maneater Captain levels.

#### Acceptance Criteria

1. THE Character_Sheet SHALL include the Maneater career in the Warriors class with four levels: Fresh Meat (Brass 3), Maneater (Silver 1), Maneater Crusher (Silver 3), Maneater Captain (Silver 5)
2. THE Character_Sheet SHALL define Maneater level 1 skills as: Athletics, Consume Alcohol, Cool, Dodge, Endurance, Gamble, Intimidate, Language (Battle), Melee (Basic), Outdoor Survival
3. THE Character_Sheet SHALL define Maneater level 1 talents as: Dirty Fighting, Menacing, Strong Back, Sturdy
4. THE Character_Sheet SHALL define Maneater characteristic advances as: T1: WS, S, T | T2: BS | T3: WP | T4: Fel
5. THE Character_Sheet SHALL define Maneater level 2 skills adding: Entertain (Bellow), Gossip, Lore (Local), Melee (Two-handed), Ranged (Blackpowder)
6. THE Character_Sheet SHALL define Maneater level 2 talents adding: Etiquette (Slims), Rapid Reload, Seasoned Traveller, Strike Mighty Blow
7. THE Character_Sheet SHALL define Maneater level 3 skills adding: Melee (Any), Intuition, Leadership
8. THE Character_Sheet SHALL define Maneater level 3 talents adding: Accurate Shot, Combat Reflexes, Frightening, Hardy
9. THE Character_Sheet SHALL define Maneater level 4 skills adding: Language (Any), Ranged (Any)
10. THE Character_Sheet SHALL define Maneater level 4 talents adding: Combat Master, Furious Assault, Reaction Strike, Warleader

### Requirement 4: Rhinox Herder Career

**User Story:** As a player building an Ogre Rhinox Herder, I want the Rhinox Herder career available in the career selector, so that I can track advancement through Rhinox Rustler, Rhinox Herder, Rhinox Breaker, and Rhinox Master levels.

#### Acceptance Criteria

1. THE Character_Sheet SHALL include the Rhinox Herder career in the Rangers class with four levels: Rhinox Rustler (Silver 1), Rhinox Herder (Silver 3), Rhinox Breaker (Silver 5), Rhinox Master (Gold 1)
2. THE Character_Sheet SHALL define Rhinox Herder level 1 skills as: Athletics, Bribery, Consume Alcohol, Dodge, Endurance, Melee (Basic), Perception, Ranged (Entangling), Set Trap, Stealth (Rural)
3. THE Character_Sheet SHALL define Rhinox Herder level 1 talents as: Flee!, Marksman, Rover, Strider (Mountains)
4. THE Character_Sheet SHALL define Rhinox Herder characteristic advances as: T1: BS, S, T | T2: Fel | T3: WS | T4: Agi
5. THE Character_Sheet SHALL define Rhinox Herder level 2 skills adding: Animal Care, Animal Training (Rhinox), Charm Animal, Endurance, Lore (Rhinox), Ranged (Throwing)
6. THE Character_Sheet SHALL define Rhinox Herder level 2 talents adding: Fearless (Large Beasts), Roughrider, Stout-hearted, Sturdy
7. THE Character_Sheet SHALL define Rhinox Herder level 3 skills adding: Cool, Intimidate, Outdoor Survival, Ride (Rhinox)
8. THE Character_Sheet SHALL define Rhinox Herder level 3 talents adding: Distract, Resolute, Seasoned Traveller, Trick Riding
9. THE Character_Sheet SHALL define Rhinox Herder level 4 skills adding: Intuition, Leadership
10. THE Character_Sheet SHALL define Rhinox Herder level 4 talents adding: Carouser, Frightening, Inspiring, Strike to Injure

### Requirement 5: Ogre Butcher Career

**User Story:** As a player building an Ogre Butcher, I want the Ogre Butcher career available in the career selector, so that I can track advancement through Slopscooper, Ogre Butcher, Mawsage, and Slaughtermaster levels.

#### Acceptance Criteria

1. THE Character_Sheet SHALL include the Ogre Butcher career in the Academics class with four levels: Slopscooper (Brass 3), Ogre Butcher (Silver 1), Mawsage (Silver 2), Slaughtermaster (Silver 4)
2. THE Character_Sheet SHALL define Ogre Butcher level 1 skills as: Climb, Consume Alcohol, Endurance, Gossip, Intimidate, Language (Magick), Melee (Basic), Outdoor Survival, Pray, Trade (Butcher)
3. THE Character_Sheet SHALL define Ogre Butcher level 1 talents as: Implacable, Petty Magic, Sixth Sense, Strong Back
4. THE Character_Sheet SHALL define Ogre Butcher characteristic advances as: T1: WS, T, WP | T2: Dex | T3: Fel | T4: I
5. THE Character_Sheet SHALL define Ogre Butcher level 2 skills adding: Art (Butchery), Channelling (Lore of the Great Maw), Intimidate, Lore (The Great Maw), Ranged (Throwing), Secret Signs (The Great Maw)
6. THE Character_Sheet SHALL define Ogre Butcher level 2 talents adding: Acute Sense (Taste), Aethyric Attunement, Arcane Magic (Lore of the Great Maw), Holy Visions
7. THE Character_Sheet SHALL define Ogre Butcher level 3 skills adding: Entertain (Speeches), Heal, Intuition, Perception
8. THE Character_Sheet SHALL define Ogre Butcher level 3 talents adding: Frightening, Second Sight, Strike Mighty Blow, War Wizard
9. THE Character_Sheet SHALL define Ogre Butcher level 4 skills adding: Language (Any), Lore (Magic)
10. THE Character_Sheet SHALL define Ogre Butcher level 4 talents adding: Detect Artefact, Impassioned Zeal, Inspiring, Magical Sense

### Requirement 6: Ogre Melee Weapons

**User Story:** As a player equipping an Ogre character, I want Ogre-specific melee weapons available in the weapon list, so that I can add them to my character's weapon inventory.

#### Acceptance Criteria

1. THE Character_Sheet SHALL include the Ogre Club in the weapons data with group Basic, Enc 2, Average reach, damage +SB+4, and a note that non-Ogres treat it as an Improvised weapon
2. THE Character_Sheet SHALL include the Ironfist in the weapons data with group Basic, Enc 2, Short reach, damage +SB+3, and qualities Shield 1, Defensive
3. THE Character_Sheet SHALL include the Great Ogre Club in the weapons data with group Two-Handed, Enc 4, Long reach, damage +SB+6, and qualities Impact, Tiring

### Requirement 7: Ogre Ranged Weapons and Ammunition

**User Story:** As a player equipping an Ogre character, I want Ogre-specific ranged weapons and ammunition available, so that I can add them to my character's ranged weapon and ammo inventory.

#### Acceptance Criteria

1. THE Character_Sheet SHALL include the Great Throwing Spear in the weapons data with group Throwing, Enc 2, Range SBx3, damage +SB+4, and quality Impale
2. THE Character_Sheet SHALL include the Leadbelcher Gun in the weapons data with group Blackpowder, Enc 8, Range 50, damage +10, and qualities Dangerous, Reload 5
3. THE Character_Sheet SHALL include the Ogre Pistol in the weapons data with group Blackpowder, Enc 3, Range 20, damage +8, and qualities Dangerous, Pistol, Reload 3
4. THE Character_Sheet SHALL include the Harpoon Launcher in the weapons data with group Engineering, Enc 4, Range 30, damage +SB+5, and qualities Impale, Reload 2
5. THE Character_Sheet SHALL include the Chain Trap in the weapons data with group Entangling, Enc 2, Range SBx2, damage —, and quality Entangle
6. THE Character_Sheet SHALL include Leadbelcher Shot (12) in the ammunition data with Range Half Weapon and quality Blast 3
7. THE Character_Sheet SHALL include Leadbelcher Ball (1) in the ammunition data with damage +4 and qualities Penetrating, Impale, Impact

### Requirement 8: Ogre Armour

**User Story:** As a player equipping an Ogre character, I want the Ogre Gutplate available in the armour list, so that I can add it to my character's worn armour.

#### Acceptance Criteria

1. THE Character_Sheet SHALL include the Ogre Gutplate in the armour data with type Plate, location Body, AP 3, and quality Impenetrable

### Requirement 9: Lore of the Great Maw Spells

**User Story:** As a player with an Ogre Butcher, I want the Lore of the Great Maw spells available in the spell picker, so that I can add Great Maw spells to my character's spell list.

#### Acceptance Criteria

1. THE Character_Sheet SHALL include "Lore of the Great Maw" as a lore category in the spell system
2. THE Character_Sheet SHALL include the Bonecrusher spell with CN 5, Range WP yards, Target 1, Duration Instant, Effect: Magic missile dealing +4 damage that ignores armour points
3. THE Character_Sheet SHALL include the Bullgorger spell with CN 5, Range WPB yards, Target 1, Duration WPB Rounds, Effect: Target gains +2 SB
4. THE Character_Sheet SHALL include the Braingobbler spell with CN 5, Range You, Target You, Duration WPB Rounds, Effect: Caster gains Fear 2
5. THE Character_Sheet SHALL include the Taste Death spell with CN 2, Range You, Target You, Duration Instant, Effect: Learn the cause of death from a corpse the caster is touching
6. THE Character_Sheet SHALL include the Trollguts spell with CN 7, Range TB yards, Target 1, Duration TB Rounds, Effect: Target gains the Regenerate trait
7. THE Character_Sheet SHALL include The Maw spell with CN 11, Range WP yards, Target AoE (WPB yards), Duration WPB Rounds, Effect: Creates a pit that deals Damage +10 and applies Entangle
8. THE Character_Sheet SHALL include the Feast of the Fallen spell with CN 9, Range You, Target Special, Duration WPB Rounds, Effect: All allies within WPB yards gain the Vampiric trait

### Requirement 10: Star Signs Data

**User Story:** As a player during character creation, I want a reference table of star signs with their characteristic modifiers, so that I can apply the correct bonuses and penalties from my character's birth sign.

#### Acceptance Criteria

1. THE Character_Sheet SHALL include a star signs data file containing 20 star sign entries
2. WHEN a star sign entry defines characteristic bonuses, THE Character_Sheet SHALL store two characteristics that receive +2 and one characteristic that receives −3
3. WHEN a star sign entry defines a talent bonus, THE Character_Sheet SHALL store the talent name and one characteristic that receives −3
4. THE Character_Sheet SHALL make star sign data accessible from the character creation or identity section of the character page

### Requirement 11: Psychology Tracker Display

**User Story:** As a player managing my character's mental state, I want a psychology tracker on the Identity tab, so that I can see all active psychological conditions with their targets and descriptions.

#### Acceptance Criteria

1. THE Psychology_Tracker SHALL display on the Identity tab of the character page
2. THE Psychology_Tracker SHALL show each active psychology entry with its type (Phobia, Animosity, Hatred, Trauma), target or description, and any numeric rating
3. THE Psychology_Tracker SHALL display the current Broken_Tally count
4. THE Psychology_Tracker SHALL display the character's Phobia threshold (equal to the WP characteristic value)

### Requirement 12: Psychology Tracker Management

**User Story:** As a player whose character gains or recovers from psychological conditions, I want to add and remove psychology entries, so that my character sheet reflects current mental state changes from gameplay.

#### Acceptance Criteria

1. WHEN the user adds a Phobia entry, THE Psychology_Tracker SHALL prompt for a target description (the source of the phobia)
2. WHEN the user adds an Animosity entry, THE Psychology_Tracker SHALL prompt for a target (species or group)
3. WHEN the user adds a Hatred entry, THE Psychology_Tracker SHALL prompt for a target (species or group)
4. WHEN the user adds a Trauma entry, THE Psychology_Tracker SHALL prompt for a custom description
5. WHEN the user removes a psychology entry, THE Psychology_Tracker SHALL delete the entry from the character's psychology list
6. WHEN the user increments the Broken_Tally, THE Psychology_Tracker SHALL increase the tally by 1
7. WHEN the Broken_Tally reaches or exceeds the character's WP characteristic value, THE Psychology_Tracker SHALL display an alert indicating a Phobia has been acquired

### Requirement 13: Ogre Career Species Restriction

**User Story:** As a player, I want Ogre-only careers clearly marked and filtered, so that non-Ogre characters cannot accidentally select Maneater, Rhinox Herder, or Ogre Butcher careers.

#### Acceptance Criteria

1. THE Career_Scheme data SHALL include a species restriction field for careers limited to specific species
2. WHILE the character species is not "Ogre", THE Character_Sheet SHALL exclude Maneater, Rhinox Herder, and Ogre Butcher from the career selector
3. WHILE the character species is "Ogre", THE Character_Sheet SHALL include Maneater, Rhinox Herder, and Ogre Butcher in the career selector alongside other available careers
