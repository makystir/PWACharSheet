# Implementation Plan

## Overview

Integrate Winds of Magic supplement content into the WFRP 4e character sheet PWA. This covers ~140 new spells across 8 College Lores, 12 new careers, revised miscast/overcast/channelling rules, ritual magic, new talents, skills, equipment, environmental saturation, and arcane marks.

## Tasks

- [x] 1. Add Lore of Light (Hysh) Spells
  - Extract all ~20 Hysh spells from windsofmagic.md with CN, range, target, duration, effect
  - Add to `src/data/spells.ts` under a `// LORE OF LIGHT (HYSH)` comment section
  - Verify no duplicates with existing spell entries
  - Build passes with no errors

- [x] 2. Add Lore of Metal (Chamon) Spells
  - Extract all ~17 Chamon spells from windsofmagic.md
  - Add to `src/data/spells.ts` under a `// LORE OF METAL (CHAMON)` comment section
  - Build passes with no errors

- [x] 3. Add Lore of Life (Ghyran) Spells
  - Extract all ~18 Ghyran spells from windsofmagic.md
  - Add to `src/data/spells.ts` under a `// LORE OF LIFE (GHYRAN)` comment section
  - Build passes with no errors

- [x] 4. Add Lore of Heavens (Azyr) Spells
  - Extract all ~18 Azyr spells from windsofmagic.md
  - Add to `src/data/spells.ts` under a `// LORE OF HEAVENS (AZYR)` comment section
  - Build passes with no errors

- [x] 5. Add Lore of Shadows (Ulgu) Spells
  - Extract all ~22 Ulgu spells from windsofmagic.md
  - Add to `src/data/spells.ts` under a `// LORE OF SHADOWS (ULGU)` comment section
  - Build passes with no errors

- [x] 6. Add Lore of Death (Shyish) Spells
  - Extract all ~20 Shyish spells from windsofmagic.md
  - Add to `src/data/spells.ts` under a `// LORE OF DEATH (SHYISH)` comment section
  - Deduplicate against existing Core Rulebook Shyish spells already present
  - Build passes with no errors

- [x] 7. Add Lore of Fire (Aqshy) Spells
  - Extract all ~22 Aqshy spells from windsofmagic.md
  - Add to `src/data/spells.ts` under a `// LORE OF FIRE (AQSHY)` comment section
  - Deduplicate against existing Core Rulebook Aqshy spells already present
  - Build passes with no errors

- [x] 8. Add Lore of Beasts (Ghur) Spells
  - Extract all ~22 Ghur spells from windsofmagic.md
  - Add to `src/data/spells.ts` under a `// LORE OF BEASTS (GHUR)` comment section
  - Deduplicate against existing Core Rulebook Ghur spells already present
  - Build passes with no errors

- [x] 9. Add Arcane Utility Spells
  - Add 8 new arcane utility spells (Disrupt Magic, Silence, construct spells, etc.)
  - Place under existing `// ARCANE SPELLS` section or a new `// ARCANE UTILITY (WoM)` section
  - Build passes with no errors

- [x] 10. Add 8 College Wizard Careers
  - Extract Hierophant (Hysh) career data: 4 levels, skills (10 per level), talents, characteristics, status
  - Extract Alchemist (Chamon) career data
  - Extract Druid (Ghyran) career data
  - Extract Astromancer (Azyr) career data
  - Extract Shadowmancer (Ulgu) career data
  - Extract Spiriter (Shyish) career data
  - Extract Pyromancer (Aqshy) career data
  - Extract Shaman (Ghur) career data
  - Add all 8 to `src/data/careers.ts` with cumulative skill/talent lists, alphabetically sorted
  - Add species restrictions (Human only) in CharacterWizard.tsx
  - Build and tests pass

- [x] 11. Add 4 Supporting Careers
  - Extract Beadle career data (4 levels, 10 skills per level)
  - Extract Mundane Alchemist career data
  - Extract Magister Vigilant career data
  - Extract Scryer career data
  - Add all 4 to `src/data/careers.ts`
  - Add appropriate species restrictions
  - Build and tests pass

- [x] 12. Add New Talents
  - Add Suffuse with Hysh, Suffuse with Chamon, Suffuse with Ghyran, Suffuse with Azyr, Suffuse with Ulgu, Suffuse with Shyish, Suffuse with Aqshy, Suffuse with Ghur
  - Add War Wizard, Magical Assistant, and any other new talents referenced in WoM careers
  - Ensure no duplicates with existing TALENT_DB
  - Build passes

- [x] 13. Add New Advanced Skills
  - Add Augury (Int) to `src/data/advanced-skills.ts`
  - Add Psychometry (Int) to `src/data/advanced-skills.ts`
  - Build passes

- [x] 14. Add Magical Equipment/Trappings
  - Add Practical Robes (Enc 1), Standard Robes (Enc 2), Elaborate Robes (Enc 4)
  - Add Enchanted Staff (Enc 2)
  - Add 8 Power Stone types (Enc 0)
  - Add Scroll (Enc 0)
  - Build passes

- [x] 15. Replace Miscast Tables
  - Replace Minor Miscast Table in `src/data/miscast-tables.ts` with 20-entry WoM version
  - Replace Major Miscast Table with 20-entry WoM version
  - Update any tests that assert specific miscast table content
  - All tests pass

- [x] 16. Implement Revised Overcast Table
  - Add `OVERCAST_TABLE` data structure with SL thresholds (1,2,3,5,8,13,21+) and 5 columns
  - Update overcast resolution logic in `spell-casting.ts` to use new table
  - Ensure CastingResult reflects new overcast structure
  - All tests pass

- [x] 17. Update Channelling Logic
  - Implement Critical Channelling: doubles + success → add WP Bonus SL (+ Minor Miscast if no Aethyric Attunement)
  - Implement Fumbled Channelling: doubles + failure → lose all SL + Minor Miscast
  - Implement Interruption handling: Hard (-20) Cool test or lose SL + Minor Miscast
  - Update ChannellingResult interface if needed
  - All tests pass

- [x] 18. Implement Armour Casting Penalty
  - Add `getArmourCastingPenalty(character)` function that returns penalty based on highest AP location
  - Add exemption logic for Metal (metal armour) and Beasts (leather armour) wizards
  - Integrate penalty into casting target display in SpellCastingPanel
  - All tests pass

- [x] 19. Create Ritual Data File
  - Create `src/data/rituals.ts` with RitualData interface and RITUAL_LIST array
  - Add ~13 rituals with CN, type, learningXP, ingredients, conditions, description
  - Export from data module

- [x] 20. Add Ritual Support to Character Type
  - Add `RitualItem` interface to `src/types/character.ts`
  - Add `rituals: RitualItem[]` to Character interface
  - Add `rituals: []` to BLANK_CHARACTER defaults
  - Build passes

- [x] 21. Add Ritual Learning to Advancement Page
  - Add ritual learning section (visible when character has Arcane Magic or Chaos Magic talent)
  - Show available rituals with their XP cost
  - Implement `learnRitual()` function in advancement logic (deduct learningXP, add to rituals array, log entry)
  - Add ritual picker UI
  - All tests pass

- [x] 22. Add Environmental Saturation Tracking
  - Add `magicSaturation` field to SessionState interface with default 'normal'
  - Add saturation dropdown/toggle to SpellCastingPanel
  - Display SL modifier note based on current saturation level
  - Build passes

- [x] 23. Add Arcane Marks System
  - Create `src/data/arcane-marks.ts` with 8 tables (10 entries each, keyed by Lore name)
  - Add `arcaneMarks: string[]` to Character interface with default `[]`
  - When miscast 86-90 ("Marked by Magic") is displayed, offer to roll on appropriate Lore's Arcane Marks table
  - Store acquired mark on character
  - Build passes

- [x] 24. Update Static Data Tests
  - Add test assertions for new WoM spell count expectations
  - Add test assertions for new WoM career structure validity
  - Add test assertions for new talents existing in TALENT_DB
  - Add test assertions for new advanced skills
  - All 190+ test files pass

## Task Dependency Graph

```
1 --> []
2 --> []
3 --> []
4 --> []
5 --> []
6 --> []
7 --> []
8 --> []
9 --> []
10 --> [12]
11 --> [12, 13]
12 --> []
13 --> []
14 --> []
15 --> []
16 --> []
17 --> []
18 --> []
19 --> []
20 --> [19]
21 --> [19, 20]
22 --> []
23 --> [15, 20]
24 --> [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
```

## Notes

- Source material is `windsofmagic.md` in the project root.
- Tasks 1-9 are independent spell data tasks that can run in parallel.
- Tasks 10-11 depend on Task 12 (talents) and Task 13 (skills) being added first so career references are valid.
- Task 20 depends on Task 19 (ritual data) for the type definitions.
- Task 21 depends on both 19 and 20.
- Task 23 depends on Task 15 (miscast tables) and Task 20 (character type).
- Task 24 is the final validation task that depends on all others.
