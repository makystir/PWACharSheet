# Implementation Plan: High Elf Equipment & Talents

## Overview

Add High Elf static data from the High Elf Player's Guide into the existing data arrays. This is purely additive — new entries are appended to `WEAPONS`, `ARMOURS`, `TALENT_DB`, and `SPELL_LIST` following established patterns. Source data is extracted from `highelfguide.md`.

## Tasks

- [x] 1. Add High Elf melee weapons to `src/data/weapons.ts`
  - [x] 1.1 Add Elven Basic weapons (Elven Sword, Elven Dagger, Elven Shield) after the existing Dwarf Basic entries
    - Follow the existing pattern: `{name, group, enc, rangeReach, damage, qualities}`
    - _Requirements: 1.1, 1.2, 1.3, 1.9_
  - [x] 1.2 Add Elven Cavalry weapon (Elven Lance) after the existing Lance entry
    - _Requirements: 1.4, 1.9_
  - [x] 1.3 Add Elven Polearm weapons (Elven Halberd, Elven Spear) after the existing Polearm entries
    - _Requirements: 1.5, 1.6, 1.9_
  - [x] 1.4 Add Elven Two-Handed weapons ((2H) Elven Great Axe, (2H) Greatsword of Hoeth) after the existing Dwarf Two-Handed entries
    - _Requirements: 1.7, 1.8, 1.9_

- [x] 2. Add Ithilmar armour to `src/data/armour.ts`
  - [x] 2.1 Add all 5 Ithilmar armour entries after the existing Gromril entries
    - Ithilmar Breastplate, Ithilmar Open Helm, Ithilmar Bracers, Ithilmar Plate Leggings, Ithilmar Helm
    - All have ap: 2 and qualities including "Impenetrable"
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Add High Elf talents to `src/data/talents.ts`
  - [x] 3.1 Add all 9 High Elf talents in alphabetical order within the existing TALENT_DB array
    - Blessed by Isha, Blood of Aenarion, Eye of the Storm, High Magic, Martial Arts, Mind over Body, Sanctuary of the Mind, Sword-dancing, Uncouth Uranai
    - Each entry needs `name`, `max`, and `desc` fields with descriptions summarising mechanical effects
    - Extract full descriptions from `highelfguide.md`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [x] 4. Checkpoint — Verify weapons, armour, and talents compile
  - Run `npx tsc --noEmit` to confirm no type errors
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add Elven Petty Magic spells to `src/data/spells.ts`
  - [x] 5.1 Add a `// ELVEN PETTY SPELLS` section with all 6 spells
    - Bless Arrow, Calm, Greenfinger, Identify Disease, Remove Dirt, Reveal Magic
    - All CN "0"; extract range, target, duration, effect from `highelfguide.md`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 6. Add Elven Arcane spells to `src/data/spells.ts`
  - [x] 6.1 Add a `// ELVEN ARCANE SPELLS` section with all 8 spells
    - Enchant Plant, Lesser Banishment, Magic Alarm, Masking the Mind, Purify Body, Speak with Animal, Voice of Iron, Zone of Comfort
    - Extract cn, range, target, duration, effect from `highelfguide.md`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

- [x] 7. Add High Magic spells to `src/data/spells.ts`
  - [x] 7.1 Add a `// HIGH MAGIC` section with all 16 spells
    - Apotheosis, Arcane Unforging, Coruscation of Finreir, Curse of Arrow Attraction, Deadlock, Drain Magic, Fiery Convocation, Fortune is Fickle, Glamour of Teclis, Greater Banishment, Hand of Glory, Invisible Eye, Shield of Saphery, Soul Quench, Tempest, Walk between Worlds
    - Extract cn, range, target, duration, effect from `highelfguide.md`
    - _Requirements: 6.1, 6.2_

- [x] 8. Add Magic of Vaul spells to `src/data/spells.ts`
  - [x] 8.1 Add a `// MAGIC OF VAUL` section with all 9 spells
    - Artist's Touch, Patience of Vaul, Vaul's Grace, Vaul's Rage, Divination of Flames, Divination of Stones, Fires of Perfection, Wisdom of the Skysteel, Fortress of Hotek
    - Extract cn, range, target, duration, effect from `highelfguide.md`
    - _Requirements: 7.1, 7.2_

- [x] 9. Add Magic of Mathlann spells to `src/data/spells.ts`
  - [x] 9.1 Add a `// MAGIC OF MATHLANN` section with all 9 spells
    - Fishbonding, Stormsense, Ocean's Fury, Spirits of the Waves, Call of the Seas, Cloak of Mathlann, Mistress of the Deep, Waterlungs, Writhing Mists
    - Extract cn, range, target, duration, effect from `highelfguide.md`
    - _Requirements: 8.1, 8.2_

- [x] 10. Add Magic of Hoeth spells to `src/data/spells.ts`
  - [x] 10.1 Add a `// MAGIC OF HOETH` section with all spells
    - Divine Stylus, Enlightenment, Arcane Insight, plus any additional spells found in source material
    - Extract cn, range, target, duration, effect from `highelfguide.md`
    - _Requirements: 9.1, 9.2_

- [x] 11. Checkpoint — Verify all spells compile
  - Run `npx tsc --noEmit` to confirm no type errors
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Add tests for High Elf data to `src/data/__tests__/static-data.test.ts`
  - [x] 12.1 Add "High Elf Players Guide — Melee Weapons" describe block
    - Verify all 8 weapons exist by name in WEAPONS array
    - Spot-check field values (group, damage, qualities) for at least 3 weapons
    - _Requirements: 10.1, 11.1_
  - [x] 12.2 Add "High Elf Players Guide — Armour" describe block
    - Verify all 5 Ithilmar entries exist by name in ARMOURS array
    - Spot-check ap and qualities values
    - _Requirements: 10.2, 11.2_
  - [x] 12.3 Add "High Elf Players Guide — Talents" describe block
    - Verify all 9 talents exist by name in TALENT_DB array
    - Spot-check max and desc fields
    - _Requirements: 10.3, 11.3_
  - [x] 12.4 Add "High Elf Players Guide — Spells" describe block
    - Verify all ~50 spells exist by name in SPELL_LIST array across all 6 lores
    - Spot-check CN values for at least one spell per lore
    - _Requirements: 10.4, 11.4_
  - [x] 12.5 Add non-regression test verifying existing "(2H) Elfbow" entry is unchanged
    - _Requirements: 10.5, 11.5_

- [x] 13. Final checkpoint — Full verification
  - Run `npx tsc --noEmit` to confirm no type errors
  - Run `npx vitest run` to confirm all tests pass (existing and new)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Source data is in `highelfguide.md` (PDF-to-markdown with base64 images interspersed between text sections). The implementer must locate the relevant tables/sections and extract field values carefully.
- All spell `effect` fields should be concise one-sentence mechanical summaries following the existing pattern in `SPELL_LIST`.
- Talents must be inserted in alphabetical order within the existing sorted array.
- No new interfaces, components, or architectural changes are needed.
- Existing entries must remain unchanged — this is purely additive.
