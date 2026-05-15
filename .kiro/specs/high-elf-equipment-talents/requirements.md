# Requirements Document

## Introduction

This feature integrates the remaining content from the High Elf Player's Guide into the WFRP 4e character sheet PWA. The careers and species have already been added. This scope covers High Elf weapons, Ithilmar armour, new talents, and all new spells (Elven Petty Magic, Elven Arcane, High Magic, Magic of Vaul, Magic of Mathlann, and Magic of Hoeth). All data must conform to the existing `WeaponData`, `ArmourData`, `TalentData`, and `SpellData` interfaces and follow the established patterns in the codebase.

## Glossary

- **Weapons_Module**: The `src/data/weapons.ts` file exporting the `WEAPONS` array of `WeaponData` objects
- **Armour_Module**: The `src/data/armour.ts` file exporting the `ARMOURS` array of `ArmourData` objects
- **Talents_Module**: The `src/data/talents.ts` file exporting the `TALENT_DB` array of `TalentData` objects
- **Spells_Module**: The `src/data/spells.ts` file exporting the `SPELL_LIST` array of `SpellData` objects
- **Static_Data_Tests**: The `src/data/__tests__/static-data.test.ts` file containing validation tests for all static data arrays
- **WeaponData**: TypeScript interface with fields `name`, `group`, `enc`, `rangeReach` (melee), `damage`, `qualities`, and optionally `maxR`, `optR`, `rangeMod`, `reload` (ranged)
- **ArmourData**: TypeScript interface with fields `name`, `locations`, `enc`, `ap`, `qualities`
- **TalentData**: TypeScript interface with fields `name`, `max`, `desc`
- **SpellData**: TypeScript interface with fields `name`, `cn`, `range`, `target`, `duration`, `effect`
- **Ithilmar**: A lightweight Elven metal used for armour; provides Impenetrable quality without the Weakpoints drawback and at reduced encumbrance compared to standard plate
- **High Magic**: The unique Elven magical tradition that combines all eight Winds of Magic into Qhaysh
- **Cadai**: The benevolent gods of the Elven pantheon

## Requirements

### Requirement 1: Add High Elf Melee Weapons

**User Story:** As a player with a High Elf character, I want the High Elf melee weapons available in the weapons list, so that I can equip my character with lore-accurate Elven weaponry.

#### Acceptance Criteria

1. WHEN the Weapons_Module is loaded, THE Weapons_Module SHALL include an "Elven Sword" entry with group "Basic", enc "1", rangeReach "Average", damage "+SB+4", and qualities "Fast"
2. WHEN the Weapons_Module is loaded, THE Weapons_Module SHALL include an "Elven Dagger" entry with group "Basic", enc "0", rangeReach "Very Short", damage "+SB+2", and qualities "Fast"
3. WHEN the Weapons_Module is loaded, THE Weapons_Module SHALL include an "Elven Shield" entry with group "Basic", enc "1", rangeReach "Very Short", damage "+SB+2", and qualities "Shield 2, Defensive, Undamaging"
4. WHEN the Weapons_Module is loaded, THE Weapons_Module SHALL include an "Elven Lance" entry with group "Cavalry", enc "3", rangeReach "Very Long", damage "+SB+6", and qualities "Impact, Impale"
5. WHEN the Weapons_Module is loaded, THE Weapons_Module SHALL include an "Elven Halberd" entry with group "Polearm", enc "3", rangeReach "Long", damage "+SB+4", and qualities "Defensive, Hack, Impale"
6. WHEN the Weapons_Module is loaded, THE Weapons_Module SHALL include an "Elven Spear" entry with group "Polearm", enc "2", rangeReach "Very Long", damage "+SB+4", and qualities "Impale, Fast"
7. WHEN the Weapons_Module is loaded, THE Weapons_Module SHALL include a "(2H) Elven Great Axe" entry with group "Two-Handed", enc "3", rangeReach "Long", damage "+SB+6", and qualities "Hack, Impact"
8. WHEN the Weapons_Module is loaded, THE Weapons_Module SHALL include a "(2H) Greatsword of Hoeth" entry with group "Two-Handed", enc "3", rangeReach "Long", damage "+SB+5", and qualities "Damaging, Defensive, Fast"
9. THE Weapons_Module SHALL place all new Elven melee weapons within the appropriate group sections of the WEAPONS array, following the existing organisational pattern

### Requirement 2: Add Ithilmar Armour

**User Story:** As a player with a High Elf character, I want Ithilmar armour pieces available in the armour list, so that I can equip my character with lightweight Elven armour.

#### Acceptance Criteria

1. WHEN the Armour_Module is loaded, THE Armour_Module SHALL include an "Ithilmar Breastplate" entry with locations "Body", enc "1", ap 2, and qualities "Impenetrable"
2. WHEN the Armour_Module is loaded, THE Armour_Module SHALL include an "Ithilmar Open Helm" entry with locations "Head", enc "0", ap 2, and qualities "Impenetrable, Partial"
3. WHEN the Armour_Module is loaded, THE Armour_Module SHALL include an "Ithilmar Bracers" entry with locations "Arms", enc "1", ap 2, and qualities "Impenetrable"
4. WHEN the Armour_Module is loaded, THE Armour_Module SHALL include "Ithilmar Plate Leggings" entry with locations "Legs", enc "1", ap 2, and qualities "Impenetrable"
5. WHEN the Armour_Module is loaded, THE Armour_Module SHALL include an "Ithilmar Helm" entry with locations "Head", enc "1", ap 2, and qualities "Impenetrable"

### Requirement 3: Add High Elf Talents

**User Story:** As a player with a High Elf character, I want all new High Elf talents available in the talent database, so that I can select them during character creation and advancement.

#### Acceptance Criteria

1. THE Talents_Module SHALL include a "Blood of Aenarion" talent with max "1" and a description summarising its effects (additional Fate Point, choice of Magical or Martial Prodigy, weekly Cool Test, Madness of Khaine)
2. THE Talents_Module SHALL include an "Uncouth Uranai" talent with max "1" and a description noting reduced standing with inner kingdom High Elves
3. THE Talents_Module SHALL include a "Martial Arts" talent with max "WS Bonus" and a description of unarmed combat improvements (lose Undamaging, gain qualities per level)
4. THE Talents_Module SHALL include a "Sword-dancing" talent with max "1" and a description noting it enables learning Sword-dancing techniques starting with Ritual of Cleansing
5. THE Talents_Module SHALL include a "Sanctuary of the Mind" talent with max "3" and a description of Hoeth's meditative shielding techniques (requires Pray Test, grants mental protection)
6. THE Talents_Module SHALL include a "Blessed by Isha" talent with max "1" and a description noting it is the prerequisite for High Magic (Elves only, requires Everqueen's blessing)
7. THE Talents_Module SHALL include a "High Magic" talent with max "1" and a description noting it enables drawing upon all Winds of Magic and adds to Overcasting SL for High Magic spells
8. THE Talents_Module SHALL include a "Mind over Body" talent with max "3" and a description of the Smith-Priest meditative technique (requires Pray Test, endure physical suffering)
9. THE Talents_Module SHALL include an "Eye of the Storm" talent with max "3" and a description of the Storm Weaver meditative technique (requires Pray Test, improves focus and weather influence)
10. THE Talents_Module SHALL insert all new talents in alphabetical order within the existing TALENT_DB array

### Requirement 4: Add Elven Petty Magic Spells

**User Story:** As a player with a High Elf spellcaster, I want the Elven Petty Magic spells available in the spell list, so that I can learn and cast them.

#### Acceptance Criteria

1. THE Spells_Module SHALL include "Bless Arrow" (CN "0", Range "Touch", Target "1 arrow", Duration "Willpower Bonus Rounds", Effect: imbues arrow with magic, counts as magical, +1 Damage)
2. THE Spells_Module SHALL include "Calm" (CN "0", Range "Touch", Target "1", Duration "Instant", Effect: removes Prejudice, Animosity, Fear, or Frenzy on Challenging Fellowship Test)
3. THE Spells_Module SHALL include "Greenfinger" (CN "0", Range "Touch", Target "AoE (WPB yards)", Duration "Instant", Effect: plants grow to maximum, dead plants return to life)
4. THE Spells_Module SHALL include "Identify Disease" (CN "0", Range "Touch", Target "1", Duration "Instant", Effect: reveals names and effects of diseases)
5. THE Spells_Module SHALL include "Remove Dirt" (CN "0", Range "Touch", Target "1 or AoE (WPB yards)", Duration "Instant", Effect: cleans target impeccably)
6. THE Spells_Module SHALL include "Reveal Magic" (CN "0", Range "You", Target "AoE (WPB yards)", Duration "WPB Rounds", Effect: magical objects and creatures glow visibly)

### Requirement 5: Add Elven Arcane Spells

**User Story:** As a player with a High Elf mage learning multiple lores, I want the Elven Arcane spells available, so that I can learn spells that combine multiple Winds.

#### Acceptance Criteria

1. THE Spells_Module SHALL include "Enchant Plant" (CN "4", Winds: Ghyran/Chamon)
2. THE Spells_Module SHALL include "Lesser Banishment" (CN "4", Winds: Hysh/Shyish)
3. THE Spells_Module SHALL include "Magic Alarm" (CN "5", Winds: Azyr/Ulgu)
4. THE Spells_Module SHALL include "Masking the Mind" (CN "4", Winds: Shyish/Ulgu)
5. THE Spells_Module SHALL include "Purify Body" (CN "6", Winds: Ghyran/Hysh)
6. THE Spells_Module SHALL include "Speak with Animal" (CN "3", Winds: Azyr/Ghur)
7. THE Spells_Module SHALL include "Voice of Iron" (CN "4", Winds: Aqshy/Chamon)
8. THE Spells_Module SHALL include "Zone of Comfort" (CN "2", Winds: Aqshy/Ghur)
9. Each Elven Arcane spell SHALL include range, target, duration, and effect fields per the SpellData interface

### Requirement 6: Add High Magic Spells

**User Story:** As a player with a High Elf mage who has mastered High Magic, I want the High Magic (Qhaysh) spells available, so that I can learn and cast the most powerful Elven magic.

#### Acceptance Criteria

1. THE Spells_Module SHALL include all High Magic spells: Apotheosis (CN 4), Arcane Unforging (CN 9), Coruscation of Finreir (CN 11), Curse of Arrow Attraction (CN 5), Deadlock (CN 5), Drain Magic (CN 6), Fiery Convocation (CN 10), Fortune is Fickle (CN 6), Glamour of Teclis (CN 7), Greater Banishment (CN 14), Hand of Glory (CN 4), Invisible Eye (CN 4), Shield of Saphery (CN 4), Soul Quench (CN 7), Tempest (CN 8), Walk between Worlds (CN 7)
2. Each High Magic spell SHALL include range, target, duration, and effect fields per the SpellData interface

### Requirement 7: Add Magic of Vaul Spells

**User Story:** As a player with a Smith-Priest of Vaul, I want the Vaul magic spells available, so that I can learn and cast smith-priest specific magic.

#### Acceptance Criteria

1. THE Spells_Module SHALL include all Magic of Vaul spells: Artist's Touch (CN 0), Patience of Vaul (CN 0), Vaul's Grace (CN 7), Vaul's Rage (CN 5), Divination of Flames (CN 4), Divination of Stones (CN 6), Fires of Perfection (CN 9), Wisdom of the Skysteel (CN 11), Fortress of Hotek (CN 14)
2. Each Magic of Vaul spell SHALL include range, target, duration, and effect fields per the SpellData interface

### Requirement 8: Add Magic of Mathlann Spells

**User Story:** As a player with a Storm Weaver, I want the Mathlann sea magic spells available, so that I can learn and cast sea-priest specific magic.

#### Acceptance Criteria

1. THE Spells_Module SHALL include all Magic of Mathlann spells: Fishbonding (CN 0), Stormsense (CN 0), Ocean's Fury (CN 8), Spirits of the Waves (CN 5), Call of the Seas (CN 14), Cloak of Mathlann (CN 11), Mistress of the Deep (CN 9), Waterlungs (CN 7), Writhing Mists (CN 6)
2. Each Magic of Mathlann spell SHALL include range, target, duration, and effect fields per the SpellData interface

### Requirement 9: Add Magic of Hoeth Spells

**User Story:** As a player with a Loremaster of Hoeth, I want the Hoeth magic spells available, so that I can learn and cast loremaster-specific magic.

#### Acceptance Criteria

1. THE Spells_Module SHALL include all Magic of Hoeth spells: Divine Stylus (CN 0), Enlightenment (CN 0), Arcane Insight (CN 8), and any additional spells found in the source material
2. Each Magic of Hoeth spell SHALL include range, target, duration, and effect fields per the SpellData interface

### Requirement 10: Validate Data Integrity with Tests

**User Story:** As a developer, I want automated tests verifying the new High Elf data entries, so that regressions are caught if the data is accidentally modified.

#### Acceptance Criteria

1. THE Static_Data_Tests SHALL verify that all 8 new Elven melee weapons exist in the WEAPONS array with correct fields
2. THE Static_Data_Tests SHALL verify that all 5 Ithilmar armour entries exist in the ARMOURS array with correct fields
3. THE Static_Data_Tests SHALL verify that all new High Elf talents exist in TALENT_DB with correct name, max, and desc fields
4. THE Static_Data_Tests SHALL verify that all new Elven spells (Petty, Arcane, High Magic, Vaul, Mathlann, Hoeth) exist in SPELL_LIST with correct fields
5. THE Static_Data_Tests SHALL pass without modifying or breaking any existing test assertions

### Requirement 11: Preserve Existing Data

**User Story:** As a developer, I want the addition of High Elf data to leave all existing entries unchanged, so that no existing character data is corrupted.

#### Acceptance Criteria

1. THE Weapons_Module SHALL retain all pre-existing weapon entries unchanged after the addition of Elven weapons
2. THE Armour_Module SHALL retain all pre-existing armour entries unchanged after the addition of Ithilmar armour
3. THE Talents_Module SHALL retain all pre-existing talent entries unchanged after the addition of High Elf talents
4. THE Spells_Module SHALL retain all pre-existing spell entries unchanged after the addition of Elven spells
5. THE Weapons_Module SHALL continue to include the existing "(2H) Elfbow" entry unchanged (the Elf Bow is already present and requires no modification)


---

## Follow-up Notes

- **Sword-dancing Techniques Subsystem**: After this feature is complete, implement the Sword-dancing techniques as a separate feature. This includes ~10 techniques (Ritual of Cleansing, Flight of the Phoenix, Path of the Sun, Path of Frost, Path of the Storm, Path of the Rain, Shadows of Loec, Path of the Hawk, Path of Falling Water, Final Stroke of the Master) that are learned progressively for increasing XP costs. This will likely require a new data structure and UI component to track learned techniques and their SL requirements.
