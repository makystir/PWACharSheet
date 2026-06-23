# Requirements Document

## Introduction

This feature integrates content from the "Warhammer Fantasy Roleplay: Up in Arms" expansion book into the existing WFRP 4e character sheet PWA. The integration adds 15 new careers (with full 4-level progression data), new talents, new advanced skills, new melee and ranged weapons (including blackpowder and engineering weapons), new ammunition types, new weapon qualities/flaws, new trappings and equipment from the "A Soldier's Burden" section, and the Miracles of Myrmidia deity-specific spells to the application's static data files. This follows the same pattern established by the prior Dwarf Players Guide integration.

## Glossary

- **Career_Data_Module**: The TypeScript source file (`src/data/careers.ts`) containing the `CAREER_SCHEMES` record that stores all career progression data.
- **Talent_Data_Module**: The TypeScript source file (`src/data/talents.ts`) containing the `TALENT_DB` array that stores all talent definitions.
- **Advanced_Skills_Module**: The TypeScript source file (`src/data/advanced-skills.ts`) containing the `ADV_SKILL_DB` array that stores all advanced skill definitions.
- **Weapon_Data_Module**: The TypeScript source file (`src/data/weapons.ts`) containing the `WEAPONS` array that stores all weapon entries with fields: name, group, enc, rangeReach (melee) or maxR/optR/rangeMod (ranged), damage, qualities, and optional reload.
- **Spell_Data_Module**: The TypeScript source file (`src/data/spells.ts`) containing the `SPELL_LIST` array that stores all spell, blessing, and miracle entries with fields: name, cn, range, target, duration, effect.
- **Trapping_Data_Module**: The TypeScript source file (`src/data/trappings.ts`) containing the `TRAPPING_LIST` array that stores all trapping/equipment entries with fields: name, enc.
- **Armour_Data_Module**: The TypeScript source file (`src/data/armour.ts`) containing the `ARMOURS` array that stores all armour entries.
- **CareerScheme**: The TypeScript interface defining the shape of a career entry (class, level1–level4, each containing title, status, characteristics, skills, and talents).
- **TalentData**: The TypeScript interface defining a talent entry (name, max, desc).
- **AdvancedSkillData**: The TypeScript interface defining an advanced skill entry (n, c).
- **WeaponData**: The TypeScript interface defining a weapon entry (name, group, enc, rangeReach or maxR/optR/rangeMod, damage, qualities, optional reload).
- **TrappingData**: The TypeScript interface defining a trapping/equipment entry (name, enc).
- **SpellData**: The TypeScript interface defining a spell/blessing/miracle entry (name, cn, range, target, duration, effect).
- **Advance_Scheme**: The characteristic advancement tier priority for a career (T1–T4), stored in `careeradvanceschemes.json`.
- **Up_In_Arms_Source**: The source text file (`Up_In_Arms.md`) in the project root containing the extracted book content.
- **Data_Parser**: The developer or automated process responsible for extracting structured career, talent, and skill data from the Up_In_Arms_Source.
- **Quartermaster_Store**: Chapter VIII of the Up in Arms book containing weapon tables, ammunition tables, and equipment lists.
- **Miracles_of_Myrmidia**: Deity-specific divine spells available to Priests of Myrmidia, distinct from generic Blessings which have a casting number of 0.

## Requirements

### Requirement 1: Add New Career Entries

**User Story:** As a player, I want all 15 Up in Arms careers available in the career selection system, so that I can create and advance characters using these new career paths.

#### Acceptance Criteria

1. WHEN a user opens the career selection interface, THE Career_Data_Module SHALL contain all 15 Up in Arms careers: Archer, Greatsword, Halberdier, Handgunner, Artillerist, Camp Follower, Cartographer, Freelance, Knight of the Blazing Sun, Knight of the White Wolf, Knight Panther, Light Cavalry, Siege Specialist, Pikeman, and Priest of Myrmidia.
2. THE Career_Data_Module SHALL assign each career to the correct class: Warriors for Archer, Greatsword, Halberdier, Handgunner, Artillerist, Freelance, Knight of the Blazing Sun, Knight of the White Wolf, Knight Panther, Light Cavalry, Siege Specialist, and Pikeman; Rangers for Camp Follower; Academics for Cartographer; and Warriors for Priest of Myrmidia.
3. THE Career_Data_Module SHALL define exactly 4 levels (level1 through level4) for each new career, with each level containing a title, status, characteristics array, skills array, and talents array matching the data in the Up_In_Arms_Source.
4. THE Career_Data_Module SHALL store each career entry as a key-value pair in the existing `CAREER_SCHEMES` record using the career name as the key, following the same format as existing entries (e.g., "Cavalryman", "Knight").
5. THE Career_Data_Module SHALL sort the skills array alphabetically within each level entry, consistent with existing career entries.
6. THE Career_Data_Module SHALL sort the talents array alphabetically within each level entry, consistent with existing career entries.

### Requirement 2: Accurate Career Level Data

**User Story:** As a player, I want each career level to contain the correct skills, talents, characteristics, and status from the book, so that my advancement choices are accurate.

#### Acceptance Criteria

1. THE Career_Data_Module SHALL use cumulative skill lists at each level, where higher levels include all skills from lower levels plus new additions, matching the pattern in existing careers like Cavalryman and Soldier.
2. THE Career_Data_Module SHALL use cumulative talent lists at each level, where higher levels include all talents from lower levels plus new additions.
3. THE Career_Data_Module SHALL use cumulative characteristic arrays at each level, where higher levels include all characteristics from lower levels plus new additions.
4. THE Career_Data_Module SHALL assign the correct social status tier to each career level (e.g., "Silver 1", "Gold 2") as specified in the Up_In_Arms_Source.
5. THE Career_Data_Module SHALL assign the correct career level title to each level as specified in the Up_In_Arms_Source (e.g., "Bowman" for Archer level 1, "Archer" for level 2).

### Requirement 3: Career Characteristic Advance Schemes

**User Story:** As a player, I want the characteristic advance priorities correctly recorded for each new career, so that the advancement cost calculations work properly.

#### Acceptance Criteria

1. THE Advance_Scheme SHALL record the characteristic advance tiers (T1 through T4) for all 15 new careers in `careeradvanceschemes.json`.
2. THE Advance_Scheme SHALL match the user-provided tier assignments exactly (e.g., Archer: BS T1, S T2, T T3, I T1, Agi T1, Int T4).
3. THE Advance_Scheme SHALL use null for characteristics that have no advance tier in a given career.
4. THE Advance_Scheme SHALL follow the same JSON structure as existing entries in the file (nested under the career class, using the career name as key, with an `advance_scheme` object).

### Requirement 4: Add New Talents

**User Story:** As a player, I want all new talents from Up in Arms available in the talent database, so that the talent selection and tooltip system reflects the full expansion content.

#### Acceptance Criteria

1. THE Talent_Data_Module SHALL contain entries for all new talents introduced in Up in Arms that are not already present in the existing database.
2. WHEN a new talent is added, THE Talent_Data_Module SHALL include the talent name, maximum level, and a concise description matching the Up_In_Arms_Source.
3. THE Talent_Data_Module SHALL update existing talent entries where Up in Arms provides revised descriptions or maximum values (e.g., Beat Blade, Distract, Drilled, Gunner, Rapid Reload, Relentless, Reversal, Shieldsman, Roughrider, Strike to Injure).
4. THE Talent_Data_Module SHALL include the following new talents at minimum: Crew Commander, Demolisher, and Flee!.
5. THE Talent_Data_Module SHALL maintain alphabetical ordering of all entries in the TALENT_DB array after additions.

### Requirement 5: Add New Advanced Skills

**User Story:** As a player, I want all new advanced skills from Up in Arms registered in the skills database, so that career auto-population and skill selection work for the new careers.

#### Acceptance Criteria

1. THE Advanced_Skills_Module SHALL contain entries for all new advanced skills referenced by the 15 new careers that are not already present in the existing database.
2. WHEN a new advanced skill is added, THE Advanced_Skills_Module SHALL include the skill name and its linked characteristic following the existing `{n, c}` format.
3. THE Advanced_Skills_Module SHALL include at minimum: Lore (Warfare), Lore (Myrmidia), Lore (Artillery), Trade (Cartographer), Trade (Gunsmith), Language (Battle), Secret Signs (Knightly Order), and any other skills referenced by the new careers that are missing from the database.
4. THE Advanced_Skills_Module SHALL maintain logical grouping and ordering consistent with existing entries (grouped by category: Lore entries together, Trade entries together, Language entries together).

### Requirement 6: Data Integrity and Consistency

**User Story:** As a developer, I want the new data to be consistent with existing conventions and not break any existing functionality, so that the application remains stable.

#### Acceptance Criteria

1. THE Career_Data_Module SHALL compile without TypeScript errors after adding all new career entries.
2. THE Talent_Data_Module SHALL compile without TypeScript errors after adding all new talent entries.
3. THE Advanced_Skills_Module SHALL compile without TypeScript errors after adding all new skill entries.
4. THE Weapon_Data_Module SHALL compile without TypeScript errors after adding all new weapon entries.
5. THE Spell_Data_Module SHALL compile without TypeScript errors after adding all new miracle entries.
6. THE Trapping_Data_Module SHALL compile without TypeScript errors after adding all new trapping entries.
7. WHEN the existing test suite is executed, THE application SHALL pass all pre-existing tests without regression.
8. THE Career_Data_Module SHALL use skill and talent names that exactly match entries in the Talent_Data_Module and Advanced_Skills_Module (case-sensitive, including parenthetical specializations).
9. THE Career_Data_Module SHALL not duplicate any existing career key names; if a career shares a name with an existing entry (e.g., "Knight"), a disambiguating suffix SHALL be used following the pattern established by "Ironbreaker (DPG)".
10. THE Weapon_Data_Module SHALL use weapon quality and flaw names that are consistent with existing entries (e.g., "Impale", "Damaging", "Dangerous") and introduce new quality names only for qualities defined in Up in Arms (e.g., "Unbalanced", "Slash", "Spread", "Trip").

### Requirement 7: Source Data Extraction Accuracy

**User Story:** As a developer, I want the data extraction from the Up in Arms source file to be verified against the original text, so that transcription errors do not propagate into the application.

#### Acceptance Criteria

1. WHEN extracting career data from the Up_In_Arms_Source, THE Data_Parser SHALL cross-reference each career's skills, talents, and characteristics against the advance scheme tables and level descriptions in the source file.
2. IF a skill or talent referenced in a career level does not exist in the Talent_Data_Module or Advanced_Skills_Module, THEN THE Data_Parser SHALL add the missing entry before completing integration.
3. THE Data_Parser SHALL handle known OCR or formatting artifacts in the source file (e.g., "Twohanded" should be normalized to "Two-handed", accented characters in career descriptions should not appear in data fields).

### Requirement 8: Add New Weapons and Ammunition

**User Story:** As a player, I want all new melee weapons, ranged weapons, shields, and ammunition from the Up in Arms Quartermaster_Store chapter available in the weapon selection system, so that I can equip my character with the expanded armoury.

#### Acceptance Criteria

1. THE Weapon_Data_Module SHALL contain entries for all new Basic group weapons introduced in Up in Arms: Axe, Ballock Knife, Club, Improvised Weapon, Mace, Military Pick, Scimitar, Sword, and Warhammer.
2. THE Weapon_Data_Module SHALL contain a new Shield entry for the Pavise.
3. THE Weapon_Data_Module SHALL contain entries for new Cavalry weapons: Demi-Lance and Sabre.
4. THE Weapon_Data_Module SHALL contain entries for new Fencing weapons: Smallsword.
5. THE Weapon_Data_Module SHALL contain entries for new Brawling weapons: Spiked Gauntlet, Boat Hook, Garrote, Locked Gauntlet, Unarmed, and Sap.
6. THE Weapon_Data_Module SHALL contain entries for new Flail weapons: Grain Flail.
7. THE Weapon_Data_Module SHALL contain entries for new Parrying weapons: Cloak and Weighted Net.
8. THE Weapon_Data_Module SHALL contain entries for new Polearm weapons: Ahlspiess, Bill, Mancatcher, Partizan/Glaive, Pollaxe, and Pike.
9. THE Weapon_Data_Module SHALL contain entries for new Two-Handed weapons: Flamberge Zweihander, Pick, and Zweihander.
10. THE Weapon_Data_Module SHALL contain entries for new Blackpowder weapons: Matchlock Handgun, Matchlock Blunderbuss, Arquebus, Double-barrelled Handgun, Griffonsfoot Pistol, Gun Axe, and Gun Halberd.
11. THE Weapon_Data_Module SHALL contain entries for new Engineering weapons: Repeater Handgun, Repeater Pistol, Pepperbox, Hand Mortar, and Cane Pistol.
12. THE Weapon_Data_Module SHALL contain entries for all traditional ammunition types: Arrow, Barbed Arrow, Bodkin Arrow, Elf Arrow, Sharp Stick, Bolt, Lead Bullet, Pebble, and Stone Bullet.
13. THE Weapon_Data_Module SHALL contain entries for all Blackpowder ammunition types: Bullet and Powder, Paper Cartridge, Aqshy-Infused Powder, Precision Shot, Improvised Shot, Small Shot, Scrap and Powder, Large Bullet, Bomb, Incendiary, and Grapple.
14. WHEN a new weapon or ammunition entry is added, THE Weapon_Data_Module SHALL include the weapon name, group, encumbrance, range/reach, damage, and qualities fields matching the data in the Up_In_Arms_Source.
15. THE Weapon_Data_Module SHALL assign each new weapon to the correct weapon group (Basic, Cavalry, Fencing, Brawling, Flail, Parry, Polearm, Two-Handed, Blackpowder, or Engineering) consistent with the Up_In_Arms_Source.
16. THE Weapon_Data_Module SHALL include a reload value for all ranged weapons that require reloading, following the same pattern as existing Blackpowder and Crossbow entries.
17. THE Weapon_Data_Module SHALL use the new weapon qualities (Unbalanced, Slash, Spread, Trip) in the qualities string field where specified by the Up_In_Arms_Source, following the same comma-separated format as existing entries.
18. WHEN a weapon quality includes a rating parameter (e.g., Spread), THE Weapon_Data_Module SHALL encode the rating in the qualities string using the same pattern as existing parameterized qualities (e.g., "Spread 3" following the pattern of "Shield 2" or "Blast 3").
19. WHEN a weapon quality includes a damage type suffix (e.g., Slash), THE Weapon_Data_Module SHALL encode the suffix in the qualities string (e.g., "Slash 2A") following the conventions for quality notation in the Up_In_Arms_Source.

### Requirement 9: Add New Trappings and Equipment

**User Story:** As a player, I want new equipment items from the Up in Arms "A Soldier's Burden" section available in the trappings list, so that I can add soldier-specific gear to my character's inventory.

#### Acceptance Criteria

1. THE Trapping_Data_Module SHALL contain entries for all new trappings from the Up in Arms "A Soldier's Burden" section: Theodolite, Ostrich Feather, Compass, Bandoleer, Slow Match, Fuse, Bow String, Whetstone, Sealskin, Silk Underwear, Captain Braun's Multi-Stove, and Captain Braun's Insta-Boiler.
2. WHEN a new trapping entry is added, THE Trapping_Data_Module SHALL include the trapping name and encumbrance value matching the data in the Up_In_Arms_Source.
3. THE Trapping_Data_Module SHALL assign the following encumbrance values: Theodolite (3), Ostrich Feather (0), Compass (0), Bandoleer (1), Slow Match (1), Fuse (1), Bow String (0), Whetstone (0), Sealskin (1), Silk Underwear (0), Captain Braun's Multi-Stove (3), Captain Braun's Insta-Boiler (2).
4. THE Trapping_Data_Module SHALL follow the existing TrappingData interface format using name and enc fields for each new entry.
5. THE Trapping_Data_Module SHALL compile without TypeScript errors after adding all new trapping entries.

### Requirement 10: Add Miracles of Myrmidia

**User Story:** As a player using a Priest of Myrmidia career, I want all Miracles of Myrmidia from Up in Arms available in the spell list, so that I can reference and track my divine spells during play.

#### Acceptance Criteria

1. THE Spell_Data_Module SHALL contain entries for all Miracles of Myrmidia: Command the Legion, Dismay Foe, In Good Order, Know Your Enemy, On Deadly Ground, Quick Strike, and Shieldmaiden's Devotion, plus any additional miracles found in the Up_In_Arms_Source.
2. WHEN a Miracle of Myrmidia is added, THE Spell_Data_Module SHALL include the miracle name, casting number (cn), range, target, duration, and effect fields matching the data in the Up_In_Arms_Source.
3. THE Spell_Data_Module SHALL group the Miracles of Myrmidia under a comment section header (e.g., "// MIRACLES OF MYRMIDIA") following the same organizational pattern as existing lore sections (e.g., "// LORE OF BEASTS", "// BLESSINGS").
4. THE Spell_Data_Module SHALL assign each miracle a casting number greater than "0" to distinguish miracles from blessings, matching the casting difficulty specified in the Up_In_Arms_Source.
5. THE Spell_Data_Module SHALL provide a concise effect description for each miracle that summarizes the mechanical effect in a format consistent with existing spell entries (short phrase, referencing game mechanics like conditions, bonuses, or durations).
6. THE Spell_Data_Module SHALL compile without TypeScript errors after adding all new miracle entries.
