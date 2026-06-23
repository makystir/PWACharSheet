# Implementation Plan: Up in Arms Content Integration

## Overview

This plan integrates all static content from the WFRP 4e "Up in Arms" expansion into the existing data layer. The approach appends new entries to existing TypeScript data modules following the established DPG integration pattern. Tasks are ordered by dependency: skills/talents first (referenced by careers), then weapons/trappings/spells, then careers (which reference skills/talents), then advance schemes, and finally tests.

All data is extracted from `Up_In_Arms.md` in the project root. The project uses TypeScript with Vitest for testing.

## Tasks

- [x] 1. Add new advanced skills to the skills database
  - [x] 1.1 Append new advanced skill entries to `src/data/advanced-skills.ts`
    - Extract all advanced skills referenced by the 15 new careers from `Up_In_Arms.md`
    - Add entries for: Lore (Warfare), Lore (Myrmidia), Lore (Artillery), Trade (Cartographer), Trade (Gunsmith), Language (Battle), Secret Signs (Knightly Order), and any others missing from the existing database
    - Use the existing `{n, c}` format with correct characteristic linkage (e.g., Lore skills → "Int", Trade skills → "Dex")
    - Maintain logical grouping: Lore entries together, Trade entries together, Language entries together, Secret Signs entries together
    - Verify no duplicates are introduced for skills already in ADV_SKILL_DB
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 2. Add new and updated talents to the talent database
  - [x] 2.1 Add new talent entries and update existing talents in `src/data/talents.ts`
    - Extract all new talents from `Up_In_Arms.md` not already in TALENT_DB
    - Add at minimum: Crew Commander, Demolisher, Flee!
    - Update existing entries where Up in Arms provides revised descriptions or max values: Beat Blade, Distract, Drilled, Gunner, Rapid Reload, Relentless, Reversal, Shieldsman, Roughrider, Strike to Injure
    - Each entry must have name, max, and desc fields
    - Maintain alphabetical ordering of all entries in the TALENT_DB array
    - Normalize OCR artifacts (encoding issues, case corruption, spacing)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3. Add new melee and ranged weapons to the weapons database
  - [x] 3.1 Append new melee weapon entries to `src/data/weapons.ts`
    - Add Basic group weapons: Axe, Ballock Knife, Club, Improvised Weapon, Mace, Military Pick, Scimitar, Sword, Warhammer
    - Add Shield entry: Pavise
    - Add Cavalry weapons: Demi-Lance, Sabre
    - Add Fencing weapons: Smallsword
    - Add Brawling weapons: Spiked Gauntlet, Boat Hook, Garrote, Locked Gauntlet, Unarmed, Sap
    - Add Flail weapons: Grain Flail
    - Add Parrying weapons: Cloak, Weighted Net
    - Add Polearm weapons: Ahlspiess, Bill, Mancatcher, Partizan/Glaive, Pollaxe, Pike
    - Add Two-Handed weapons: Flamberge Zweihander, Pick, Zweihander
    - Each entry must include name, group, enc, rangeReach, damage, and qualities
    - Use new weapon qualities (Unbalanced, Slash, Spread, Trip) where specified by the source
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.14, 8.15, 8.17, 8.18, 8.19_

  - [x] 3.2 Append new ranged weapon entries to `src/data/weapons.ts`
    - Add Blackpowder weapons: Matchlock Handgun, Matchlock Blunderbuss, Arquebus, Double-barrelled Handgun, Griffonsfoot Pistol, Gun Axe, Gun Halberd
    - Add Engineering weapons: Repeater Handgun, Repeater Pistol, Pepperbox, Hand Mortar, Cane Pistol
    - Each entry must include name, group, enc, damage, maxR, optR, rangeMod, reload, and qualities
    - Include reload value for all ranged weapons that require reloading
    - _Requirements: 8.10, 8.11, 8.14, 8.15, 8.16_

  - [x] 3.3 Append new ammunition entries to `src/data/weapons.ts`
    - Add traditional ammunition: Arrow, Barbed Arrow, Bodkin Arrow, Elf Arrow, Sharp Stick, Bolt, Lead Bullet, Pebble, Stone Bullet
    - Add Blackpowder ammunition: Bullet and Powder, Paper Cartridge, Aqshy-Infused Powder, Precision Shot, Improvised Shot, Small Shot, Scrap and Powder, Large Bullet, Bomb, Incendiary, Grapple
    - Use group "Ammunition" for entries with damage-modifying stats per the design decision
    - Include damage modifier and qualities fields matching the source
    - _Requirements: 8.12, 8.13, 8.14, 8.17_

- [x] 4. Add new trappings and equipment
  - [x] 4.1 Append new trapping entries to `src/data/trappings.ts`
    - Add all items from the "A Soldier's Burden" section: Theodolite (enc:3), Ostrich Feather (enc:0), Compass (enc:0), Bandoleer (enc:1), Slow Match (enc:1), Fuse (enc:1), Bow String (enc:0), Whetstone (enc:0), Sealskin (enc:1), Silk Underwear (enc:0), Captain Braun's Multi-Stove (enc:3), Captain Braun's Insta-Boiler (enc:2)
    - Use existing `{name, enc}` format with enc as string values
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 5. Add Miracles of Myrmidia to the spell database
  - [x] 5.1 Append Miracles of Myrmidia entries to `src/data/spells.ts`
    - Add a section header comment `// MIRACLES OF MYRMIDIA` following the existing lore pattern
    - Add all miracles: Command the Legion, Dismay Foe, In Good Order, Know Your Enemy, On Deadly Ground, Quick Strike, Shieldmaiden's Devotion, and any additional miracles in the source
    - Each entry must include name, cn, range, target, duration, and effect fields
    - All cn values must be greater than "0" to distinguish miracles from blessings
    - Effect descriptions should be concise and consistent with existing spell entries
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 6. Add all 15 new career entries to the careers module
  - [x] 6.1 Add Archer, Greatsword, Halberdier, Handgunner, and Artillerist careers to `src/data/careers.ts`
    - Extract full 4-level progression data from `Up_In_Arms.md` for each career
    - Each level must include title, status, characteristics[], skills[], and talents[]
    - Apply cumulative rule: each level includes all entries from prior levels plus additions
    - Sort skills and talents arrays alphabetically within each level
    - Assign correct class (Warriors for all five)
    - Normalize OCR artifacts in skill/talent names
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 6.2 Add Camp Follower, Cartographer, and Freelance careers to `src/data/careers.ts`
    - Camp Follower → class: Rangers; Cartographer → class: Academics; Freelance → class: Warriors
    - Extract full 4-level progression data with cumulative arrays
    - Sort skills and talents alphabetically
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 6.3 Add Knight of the Blazing Sun, Knight of the White Wolf, Knight Panther, and Light Cavalry careers to `src/data/careers.ts`
    - All Warriors class
    - Extract full 4-level progression data with cumulative arrays
    - Sort skills and talents alphabetically
    - Use disambiguating suffix if any career name conflicts with existing keys (following "Ironbreaker (DPG)" pattern)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 6.9_

  - [x] 6.4 Add Siege Specialist, Pikeman, and Priest of Myrmidia careers to `src/data/careers.ts`
    - All Warriors class
    - Extract full 4-level progression data with cumulative arrays
    - Sort skills and talents alphabetically
    - Ensure all talent and skill names exactly match entries in TALENT_DB and ADV_SKILL_DB
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 6.8_

- [x] 7. Add career advance schemes to the JSON file
  - [x] 7.1 Add advance scheme entries for all 15 new careers to `careeradvanceschemes.json`
    - Add entries nested under the correct career class (Warriors, Rangers, Academics)
    - Each entry must include an `advance_scheme` object with all 10 characteristic keys (WS, BS, S, T, I, Agi, Dex, Int, WP, Fel)
    - Values must be "T1", "T2", "T3", "T4", or null
    - Match tier assignments from the Up_In_Arms.md source exactly
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8. Checkpoint - Verify TypeScript compilation and existing tests
  - Run `npx tsc --noEmit` to verify all data modules compile without errors
  - Run `npx vitest --run` to verify all pre-existing tests pass without regression
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Write tests for Up in Arms content
  - [x] 9.1 Write property tests for career data integrity in `src/data/__tests__/static-data.test.ts`
    - **Property 1: Career Level Structural Integrity** — all levels have non-empty title, status, characteristics, skills, talents
    - **Property 2: Career Level Alphabetical Ordering** — skills[] and talents[] sorted alphabetically in every level
    - **Property 3: Career Level Cumulative Progression** — level N+1 is superset of level N for skills, talents, and characteristics
    - Add under a new `describe('Up in Arms — Career Properties')` block
    - **Validates: Requirements 1.3, 1.5, 1.6, 2.1, 2.2, 2.3**

  - [x] 9.2 Write property tests for talent and skill data integrity in `src/data/__tests__/static-data.test.ts`
    - **Property 5: Talent Structural Integrity** — all talents have non-empty name, max, desc
    - **Property 6: Advanced Skill Structural Integrity** — all skills have non-empty n and valid c characteristic
    - **Property 7: Career Cross-Reference Integrity** — every talent name in career levels exists in TALENT_DB
    - Add under a new `describe('Up in Arms — Talent & Skill Properties')` block
    - **Validates: Requirements 4.2, 4.5, 5.2, 5.4, 6.8**

  - [x] 9.3 Write property tests for weapon and spell data integrity in `src/data/__tests__/static-data.test.ts`
    - **Property 8: Weapon Structural Integrity** — all weapons have name, group, enc, damage, qualities; melee have rangeReach, ranged have maxR
    - **Property 9: Trapping Structural Integrity** — all trappings have non-empty name and defined enc
    - **Property 10: Spell Structural Integrity** — all spells have name, cn, range, target, duration, effect
    - Add under a new `describe('Up in Arms — Weapon & Spell Properties')` block
    - **Validates: Requirements 8.14, 8.15, 9.2, 9.4, 10.2, 10.6**

  - [x] 9.4 Write property test for advance scheme validity in `src/data/__tests__/static-data.test.ts`
    - **Property 4: Advance Scheme Value Validity** — every characteristic value is null or "T1"–"T4"
    - Add under a new `describe('Up in Arms — Advance Scheme Properties')` block
    - **Validates: Requirements 3.3**

  - [x] 9.5 Write unit tests for Up in Arms content presence in `src/data/__tests__/static-data.test.ts`
    - Verify all 15 career names exist in CAREER_SCHEMES with correct class assignment
    - Spot-check: Archer level1 title is "Bowman", Priest of Myrmidia class is "Warriors"
    - Verify new weapons exist: Sword (Basic), Arquebus (Blackpowder), Repeater Handgun (Engineering)
    - Verify all 12 trappings exist in TRAPPING_LIST with correct enc values
    - Verify all Miracles of Myrmidia exist in SPELL_LIST with cn > "0"
    - Verify new talents (Crew Commander, Demolisher, Flee!) exist in TALENT_DB
    - Verify new advanced skills (Lore (Warfare), Trade (Cartographer)) exist in ADV_SKILL_DB
    - Add under `describe('Up in Arms — Content Presence')` block
    - _Requirements: 1.1, 1.2, 4.4, 5.3, 8.1, 8.10, 8.11, 9.1, 9.3, 10.1, 10.4_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Run `npx vitest --run` to verify all tests (existing and new) pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties across all data entries (iterating over full arrays)
- Unit tests validate specific examples and edge cases for the Up in Arms content
- The source data in `Up_In_Arms.md` contains OCR artifacts that must be normalized during extraction (see design document for normalization rules)
- All data fits existing TypeScript interfaces — no new types or components needed
- Career skill/talent names must exactly match entries in their respective databases (case-sensitive)
- The project uses Vitest with fast-check available for property-based tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["3.1", "3.2", "3.3", "4.1", "5.1"] },
    { "id": 2, "tasks": ["6.1", "6.2"] },
    { "id": 3, "tasks": ["6.3", "6.4"] },
    { "id": 4, "tasks": ["7.1"] },
    { "id": 5, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5"] }
  ]
}
```
