# Requirements Document

## Introduction

This feature integrates content from the "Warhammer Fantasy Roleplay: Winds of Magic" expansion book into the existing WFRP 4e character sheet PWA. The integration adds ~140 new lore-specific spells across 8 College Lores, new arcane utility spells, 12 new careers (8 College-specific Wizard careers + 4 supporting careers), revised miscast tables, a new overcast table, revised channelling/casting rules, ritual magic support, new talents, 2 new advanced skills (Augury, Psychometry), magical equipment (Power Stones, Scrolls, Wizard Robes, Enchanted Staves), familiars, the alchemy/potions system, and environmental saturation rules. The source material is `windsofmagic.md` in the project root.

## Glossary

- **Spell_Data_Module**: `src/data/spells.ts` containing the `SPELL_LIST` array.
- **Talent_Data_Module**: `src/data/talents.ts` containing the `TALENT_DB` array.
- **Career_Data_Module**: `src/data/careers.ts` containing the `CAREER_SCHEMES` record.
- **Advanced_Skills_Module**: `src/data/advanced-skills.ts` containing the `ADV_SKILL_DB` array.
- **Miscast_Tables_Module**: `src/data/miscast-tables.ts` containing the minor/major miscast tables.
- **Spell_Casting_Logic**: `src/logic/spell-casting.ts` containing casting/channelling resolution functions.
- **Advancement_Logic**: `src/logic/advancement.ts` containing XP cost functions and spell learning.
- **Trapping_Data_Module**: `src/data/trappings.ts` containing the `TRAPPING_LIST` array.
- **WoM_Source**: The text file `windsofmagic.md` in the project root.
- **College Lore**: One of the 8 traditions of magic (Light/Hysh, Metal/Chamon, Life/Ghyran, Heavens/Azyr, Shadows/Ulgu, Death/Shyish, Fire/Aqshy, Beasts/Ghur).
- **Ritual**: A powerful spell requiring ingredients, conditions, sacrifices, and extended channelling with a high CN and Learning XP cost.
- **Saturation**: Environmental magical energy level (Low, Normal, Heavy, Extreme, Corrupted) that modifies casting/channelling SL.
- **Power Stone**: A magical gem charged with a specific Wind, granting +3 SL to a single Casting Test before disintegrating.
- **Familiar**: A magical companion (Power, Spell, or Combat type) that assists a wizard.
- **Arcane Marks**: Physical manifestations of overuse of a Wind, gained on specific miscast results; each Lore has a d10 table.
- **Overcast Table**: A revised table (SL: 1/2/3/5/8/13/21+) defining how surplus SL can improve a spell's Range, AoE, Duration, Targets, or Damage.

## Requirements

### Requirement 1: Add College Lore Spells

**User Story:** As a wizard player, I want all spells from the 8 College Lores available in the spell picker, so that I can learn and cast spells from my Lore.

#### Acceptance Criteria

1. THE Spell_Data_Module SHALL contain all spells from the Lore of Light (Hysh), approximately 20 spells including Abulla's Snare (CN 5), Blinding Light (CN 5), Clarity of Thought (CN 6), Healing Light (CN 9), Net of Amyntok (CN 8), Phâ's Protection (CN 10), and others as listed in the WoM_Source.
2. THE Spell_Data_Module SHALL contain all spells from the Lore of Metal (Chamon), approximately 17 spells including Armour of Tin (CN 4), Crucible of Chamon (CN 7), Curse of Rust (CN 4), Forge of Chamon (CN 9), Golden Touch (CN 7), and others.
3. THE Spell_Data_Module SHALL contain all spells from the Lore of Life (Ghyran), approximately 18 spells including Barkskin (CN 3), Earthblood (CN 6), Flesh of Stone (CN 9), Lifebloom (CN 8), Regenerate (CN 6), and others.
4. THE Spell_Data_Module SHALL contain all spells from the Lore of Heavens (Azyr), approximately 18 spells including Curse of Fate (CN 8), Divination (CN 3), Fantastic Foresight (CN 7), T'Essla's Arc (CN 7), Thorsen's Thunderstorm (CN 11), and others.
5. THE Spell_Data_Module SHALL contain all spells from the Lore of Shadows (Ulgu), approximately 22 spells including Black Horrors (CN 6), Doppelganger (CN 10), Grand Illusion (CN 14), Pit of Tarnus (CN 8), Shroud of Invisibility (CN 8), and others.
6. THE Spell_Data_Module SHALL contain all spells from the Lore of Death (Shyish), approximately 20 spells including Acceptance of Fate (CN 6), Amaranth (CN 7), Crystal Maze (CN 13), Limbwither (CN 5), and others.
7. THE Spell_Data_Module SHALL contain all spells from the Lore of Fire (Aqshy), approximately 22 spells including Body of Fire (CN 5), Burning Head (CN 6), Flamestorm (CN 8), Flaming Sword of Rhuin (CN 8), Great Fires of U'Zhul (CN 10), and others.
8. THE Spell_Data_Module SHALL contain all spells from the Lore of Beasts (Ghur), approximately 22 spells including Amber Trance (CN 4), Awakening of the Wood (CN 8), Curse of Anraheir (CN 5), Merciw's Monstrous Regiment (CN 13), Transformation of Kadon (CN 14), and others.
9. EACH spell entry SHALL include name, cn, range, target, duration, and effect fields matching the SpellData interface.
10. THE Spell_Data_Module SHALL NOT contain duplicate entries for spells already present from the Core Rulebook; existing entries should be updated only if the WoM version differs materially.

### Requirement 2: Add New Arcane Utility Spells

**User Story:** As a wizard player, I want the new general arcane spells available for learning, so I can access Disrupt Magic, Silence, and construct-related spells.

#### Acceptance Criteria

1. THE Spell_Data_Module SHALL contain all new arcane utility spells: Belligerence of the Bloodmarsh (CN 2), Collapse Construct (CN 6), Decipher Curse (CN 4), Disrupt Magic (CN 8), Fly-Infested Rotweed (CN 4), Lifebloom Silt (CN 4), Silence (CN 4), and Succour Magical Servant (CN 2).
2. EACH utility spell SHALL include the full effect description summarized from the WoM_Source.

### Requirement 3: Add College Wizard Careers

**User Story:** As a player creating a wizard character, I want the 8 College-specific careers and 4 supporting careers available for selection, so I can follow the Winds of Magic career progression.

#### Acceptance Criteria

1. THE Career_Data_Module SHALL contain 8 College-specific Wizard careers: Hierophant (Hysh), Alchemist (Chamon), Druid (Ghyran), Astromancer (Azyr), Shadowmancer (Ulgu), Spiriter (Shyish), Pyromancer (Aqshy), and Shaman (Ghur).
2. THE Career_Data_Module SHALL contain 4 supporting careers: Beadle, Mundane Alchemist, Magister Vigilant, and Scryer.
3. EACH career SHALL have exactly 4 levels with title, status, characteristics array, skills array (10 skills at level 1), and talents array.
4. EACH career's skills and talents arrays SHALL be sorted alphabetically and use the cumulative pattern (each level is a superset of the previous).
5. College Wizard careers SHALL be restricted to Human species in the character wizard exclusion system.

### Requirement 4: Update Miscast Tables

**User Story:** As a GM or player using the casting system, I want the revised Minor and Major Miscast tables from Winds of Magic, so that miscast results match the expanded rules.

#### Acceptance Criteria

1. THE Miscast_Tables_Module SHALL contain the revised Minor Miscast Table (d100, 20 entries from 01-05 through 96-00) as defined in the WoM_Source, including new entries like Witchsign, Soured Milk, Blight, Hexeyes, Marked by Magic, etc.
2. THE Miscast_Tables_Module SHALL contain the revised Major Miscast Table (d100, 20 entries) as defined in the WoM_Source, including Ghostly Voices and other new entries.
3. THE existing miscast resolution logic in Spell_Casting_Logic SHALL continue to function with the updated table data without code changes.

### Requirement 5: Update Overcast Table

**User Story:** As a wizard player, I want the revised Overcast Table so that surplus SL on casting is resolved using the Fibonacci-like progression from Winds of Magic.

#### Acceptance Criteria

1. THE Spell_Casting_Logic SHALL implement the revised Overcast Table with SL thresholds: 1, 2, 3, 5, 8, 13, 21+ across columns: Additional Target (+1/+1/+1/+2/+2/+2/+3), Extra Damage (+1 through +7), Extra Range (2×/2×/2×/3×/3×/3×/4×), Extra AoE (listed/listed/2×/2×/2×/2×/3×), and Longer Duration (listed/2×/2×/2×/3×/3×/3×).
2. THE overcast resolution logic SHALL allow allocating SL across multiple columns, where each column may only be accessed once per casting.
3. THE existing CastingResult interface SHALL be extended to include overcast allocation details if not already present.

### Requirement 6: Implement Revised Channelling Rules

**User Story:** As a wizard player, I want channelling to work per the Winds of Magic rules, where each SL reduces the CN by 1 and Critical Channelling adds WP Bonus SL.

#### Acceptance Criteria

1. THE Spell_Casting_Logic SHALL implement channelling where each SL on the Extended Channelling Test reduces CN by 1 (minimum 0).
2. THE Spell_Casting_Logic SHALL implement Critical Channelling: doubles on a successful Channelling Test add WP Bonus SL, with a Minor Miscast triggered unless the character has the Aethyric Attunement talent.
3. THE Spell_Casting_Logic SHALL implement Fumbled Channelling: doubles on a failed Channelling Test trigger a Minor Miscast and all accumulated SL are lost.
4. THE Spell_Casting_Logic SHALL implement Interruptions: if a channelling wizard is interrupted, they must pass a Hard (-20) Cool Test or lose all channelled SL and trigger a Minor Miscast.

### Requirement 7: Implement Armour Casting Penalty

**User Story:** As a wizard player wearing armour, I want the casting penalty automatically calculated, so I see the correct SL modifier on my casting/channelling tests.

#### Acceptance Criteria

1. THE Spell_Casting_Logic SHALL calculate a casting penalty of -1 SL per Armour Point on the character's most-armoured location.
2. THE penalty SHALL be exempt for Metal (Chamon) wizards wearing metal armour and Beasts (Ghur) wizards wearing leather armour.
3. THE penalty SHALL be displayed to the player when relevant (e.g., in the casting target calculation or as a modifier note).

### Requirement 8: Add Ritual Magic Support

**User Story:** As a wizard player, I want to track rituals I've learned and their XP cost, so I can reference my known rituals.

#### Acceptance Criteria

1. THE Character type SHALL support a `rituals` array field for storing learned rituals.
2. EACH ritual entry SHALL store: name, cn, type (Lore restrictions), learningXP, ingredients, conditions, and a brief description.
3. THE Advancement_Logic SHALL support spending XP to learn rituals, using the `learningXP` value from each ritual (typically 400-600 XP).
4. THE Advancement page SHALL include a section for learning rituals (visible to characters with Arcane Magic or Chaos Magic talents), listing available rituals and their XP cost.
5. AT MINIMUM, the following rituals SHALL be available: Bind Monstrous Beast, Bind Spirit Within Power Stone (CN 32), Carve Ogham Stone (CN 50), Create Power Stone (CN 64), Conjuration rituals for Incarnate Elementals, Create Construct (CN 60), Create Familiar (CN 45), Imbue Staff (CN 35), Materialise the Living Swamp (CN 40), Remove Curse (CN 40).

### Requirement 9: Add New Talents

**User Story:** As a player, I want all new talents from Winds of Magic available in the talent system, so my character can acquire them during advancement.

#### Acceptance Criteria

1. THE Talent_Data_Module SHALL contain the 8 "Suffuse with (Wind)" talent variants (one per College Lore).
2. THE Talent_Data_Module SHALL contain any other new talents introduced in the WoM careers (War Wizard, Magical Assistant, etc.) with correct name, max, and desc fields.
3. ALL new talents SHALL NOT duplicate existing entries already in TALENT_DB.

### Requirement 10: Add New Advanced Skills

**User Story:** As a player with a Scryer or fortune-telling character, I want the Augury and Psychometry advanced skills available.

#### Acceptance Criteria

1. THE Advanced_Skills_Module SHALL contain Augury (associated characteristic: Int).
2. THE Advanced_Skills_Module SHALL contain Psychometry (associated characteristic: Int).
3. THESE skills SHALL appear in the career skill lists for the Scryer career and any other WoM careers that reference them.

### Requirement 11: Add Magical Equipment

**User Story:** As a wizard player, I want wizard-specific equipment (robes, staves, power stones) available in the trappings system.

#### Acceptance Criteria

1. THE Trapping_Data_Module SHALL contain Wizard Robes in 3 grades: Practical Robes (Enc 1), Standard Robes (Enc 2), Elaborate Robes (Enc 4).
2. THE Trapping_Data_Module SHALL contain Enchanted Staff (Enc 2).
3. THE Trapping_Data_Module SHALL contain Power Stones (one entry per Wind type): True Sapphires, Endstones, Ghost Amber, Lumen Stones, Fire Rubies, Goldstone, Crystal Mist, Vitaellum.
4. THE Trapping_Data_Module SHALL contain Scroll as an item type.

### Requirement 12: Add Environmental Saturation Tracking

**User Story:** As a GM or wizard player, I want to track the current magical saturation level so casting modifiers are visible.

#### Acceptance Criteria

1. THE Character's combat/session state SHALL support a `magicSaturation` field with values: 'low' | 'normal' | 'heavy' | 'extreme' | 'corrupted'.
2. THE SpellCastingPanel SHALL display the current saturation level and its SL modifier: Low (-1 SL), Normal (no modifier), Heavy (+1 SL for dominant Lore), Extreme (+2 SL dominant / +1 SL other Lores).
3. THE saturation modifier SHALL be factored into the casting target or displayed as a note for the player to apply.

### Requirement 13: Implement Arcane Marks

**User Story:** As a wizard player who miscasts, I want the Arcane Marks tables available so I can track any marks I gain.

#### Acceptance Criteria

1. THE app SHALL include 8 Arcane Marks tables (one per Wind), each a d10 table with 10 entries describing physical manifestations.
2. WHEN a Minor Miscast result of 86-90 ("Marked by Magic") occurs, THE app SHALL present the appropriate Lore's Arcane Marks table for rolling.
3. Acquired Arcane Marks SHALL be storable on the character (e.g., as a notes field or structured list).

## Priority Guidance

The requirements are listed roughly in implementation priority:
- **Phase 1 (Data):** Requirements 1, 2, 3, 9, 10, 11 — static data additions that expand available content.
- **Phase 2 (Rules):** Requirements 4, 5, 6, 7 — casting/channelling rule updates that affect gameplay.
- **Phase 3 (Features):** Requirements 8, 12, 13 — new systems that add wizard-specific tracking capabilities.
