# Implementation Plan: Empire Deity Miracles

## Overview

Add 54 miracles for 9 Empire deities to the SPELL_LIST, fix the CN representation for all blessings and existing Myrmidia miracles from numeric values to `"-"`, update SpellCastingPanel logic to hide the Channel button for divine abilities, and add property-based tests to verify data integrity.

## Tasks

- [x] 1. Fix existing Blessing and Myrmidia Miracle CN values
  - [x] 1.1 Update all 19 Blessing entries in `src/data/spells.ts` from `cn:"0"` to `cn:"-"`
    - Change each Blessing entry's cn field from `"0"` to `"-"`
    - Blessings: Blessing of Battle through Blessing of Wit (19 entries in the `// BLESSINGS` section)
    - _Requirements: 10.1_

  - [x] 1.2 Update all 9 Myrmidia Miracle entries in `src/data/spells.ts` from numeric cn to `cn:"-"`
    - Change cn values `"4"`, `"6"`, `"8"` to `"-"` for all entries in the `// MIRACLES OF MYRMIDIA` section
    - Entries: Command the Legion, Dismay Foe, In Good Order, Know Your Enemy, On Deadly Ground, Quick Strike, Shieldmaiden's Devotion, Skill of Combat, Vengeful Wrath
    - _Requirements: 10.2_

  - [x] 1.3 Update existing test assertions in `src/data/__tests__/static-data.test.ts` that check Myrmidia miracle cn values
    - Change the test `'all Miracles of Myrmidia exist in SPELL_LIST with cn > "0"'` to assert `cn === "-"` instead of `Number(cn) > 0`
    - Verify the petty spell filter in `static-data.test.ts` still correctly excludes blessings (blessings no longer have `cn === '0'` so existing filter logic may need adjustment)
    - _Requirements: 10.4_

- [x] 2. Add new deity miracle data
  - [x] 2.1 Add Miracles of Manann (6 entries) to `src/data/spells.ts`
    - Add `// MIRACLES OF MANANN` comment header
    - Add entries: Becalm, Drowned Man's Face, Fair Winds, Manann's Bounty, Sea Legs, Waterwalk
    - All entries use `cn:"-"` and single-line object format
    - Source data from `WarhammerFantasyRoleplay4e.md` pages 222-228
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.2 Add Miracles of Morr (6 entries) to `src/data/spells.ts`
    - Add `// MIRACLES OF MORR` comment header
    - Add entries: Death Mask, Destroy Undead, Dooming, Last Rites, Portal's Threshold, Stay Morr's Hand
    - All entries use `cn:"-"` and single-line object format
    - Source data from `WarhammerFantasyRoleplay4e.md` pages 222-228
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.3 Add Miracles of Ranald (6 entries) to `src/data/spells.ts`
    - Add `// MIRACLES OF RANALD` comment header
    - Add entries: An Invitation, Cat's Eyes, Ranald's Grace, Rich Man Poor Man Beggar Man Thief, Stay Lucky, You Ain't Seen Me Right?
    - All entries use `cn:"-"` and single-line object format
    - Source data from `WarhammerFantasyRoleplay4e.md` pages 222-228
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 2.4 Add Miracles of Rhya (6 entries) to `src/data/spells.ts`
    - Add `// MIRACLES OF RHYA` comment header
    - Add entries: Rhya's Children, Rhya's Harvest, Rhya's Shelter, Rhya's Succour, Rhya's Touch, Rhya's Union
    - All entries use `cn:"-"` and single-line object format
    - Source data from `WarhammerFantasyRoleplay4e.md` pages 222-228
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 2.5 Add Miracles of Shallya (6 entries) to `src/data/spells.ts`
    - Add `// MIRACLES OF SHALLYA` comment header
    - Add entries: Anchorite's Endurance, Balm to a Wounded Mind, Bitter Catharsis, Martyr, Shallya's Tears, Unblemished Innocence
    - All entries use `cn:"-"` and single-line object format
    - Source data from `WarhammerFantasyRoleplay4e.md` pages 222-228
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 2.6 Add Miracles of Sigmar (6 entries) to `src/data/spells.ts`
    - Add `// MIRACLES OF SIGMAR` comment header
    - Add entries: Beacon of Righteous Virtue, Heed Not the Witch, Sigmar's Fiery Hammer, Soulfire, Twin-tailed Comet, Vanquish the Unrighteous
    - All entries use `cn:"-"` and single-line object format
    - Source data from `WarhammerFantasyRoleplay4e.md` pages 222-228
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 2.7 Add Miracles of Taal (6 entries) to `src/data/spells.ts`
    - Add `// MIRACLES OF TAAL` comment header
    - Add entries: Animal Instincts, King of the Wild, Leaping Stag, Lord of the Hunt, Tanglefoot, Tooth and Claw
    - All entries use `cn:"-"` and single-line object format
    - Source data from `WarhammerFantasyRoleplay4e.md` pages 222-228
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 2.8 Add Miracles of Ulric (6 entries) to `src/data/spells.ts`
    - Add `// MIRACLES OF ULRIC` comment header
    - Add entries: Hoarfrost's Chill, Howl of the Wolf, Ulric's Fury, Pelt of the Winter Wolf, The Snow King's Judgement, Winter's Bite
    - All entries use `cn:"-"` and single-line object format
    - Source data from `WarhammerFantasyRoleplay4e.md` pages 222-228
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 2.9 Add Miracles of Verena (6 entries) to `src/data/spells.ts`
    - Add `// MIRACLES OF VERENA` comment header
    - Add entries: As Verena Is My Witness, Blind Justice, Shackles of Truth, Sword of Justice, Truth Will Out, Wisdom of the Owl
    - All entries use `cn:"-"` and single-line object format
    - Source data from `WarhammerFantasyRoleplay4e.md` pages 222-228
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 2.10 Ensure deity sections are ordered alphabetically in `src/data/spells.ts`
    - Verify final ordering: Manann, Morr, Myrmidia, Ranald, Rhya, Shallya, Sigmar, Taal, Ulric, Verena
    - All miracle sections should appear after the Blessings section
    - _Requirements: 11.4, 11.5_

- [x] 3. Checkpoint - Verify data compiles and existing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Fix SpellCastingPanel channelling logic
  - [x] 4.1 Update `isPetty` check in `src/components/shared/SpellCastingPanel.tsx` to include `cn === '-'`
    - Change `const isPetty = spell.cn === '0';` to `const isPetty = spell.cn === '0' || spell.cn === '-';`
    - This hides the Channel button for divine abilities (blessings and miracles) since they use Pray tests, not Language (Magick) CN thresholds
    - _Requirements: 10.3_

- [x] 5. Add property-based tests
  - [x] 5.1 Write property test for canonical miracle existence
    - Create `src/data/__tests__/spells.property.test.ts`
    - **Property 1: All canonical miracles exist in SPELL_LIST**
    - Define canonical miracle name sets per deity as test constants
    - Use `fc.constantFrom()` to select random miracles and verify they exist in SPELL_LIST
    - **Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1**

  - [x] 5.2 Write property test for non-empty fields
    - **Property 2: All miracle and blessing entries have non-empty fields**
    - For any entry whose name belongs to a canonical blessing/miracle set, verify all SpellData fields are non-empty strings
    - **Validates: Requirements 1.3, 2.3, 3.3, 4.3, 5.3, 6.3, 7.3, 8.3, 9.3**

  - [x] 5.3 Write property test for divine ability CN values
    - **Property 3: All blessings and miracles use cn:"-"**
    - For any entry whose name belongs to a canonical blessing/miracle set, verify cn equals `"-"`
    - **Validates: Requirements 1.4, 2.4, 3.4, 4.4, 5.4, 6.4, 7.4, 8.4, 9.4, 10.1, 10.2**

  - [x] 5.4 Write property test for non-divine spell CN values
    - **Property 4: Non-divine spells retain numeric CN values**
    - For any entry NOT in the blessing/miracle name sets, verify cn parses to a valid non-negative integer
    - **Validates: Requirements 11.2**

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The CN fix (task 1) must complete before adding new miracle data to ensure consistency
- Existing test files that reference cn:"0" for blessings or numeric cn for Myrmidia miracles must be updated in task 1.3
- Source data for miracle entries comes from `WarhammerFantasyRoleplay4e.md` (pages 222-228)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9"] },
    { "id": 2, "tasks": ["2.10", "4.1"] },
    { "id": 3, "tasks": ["5.1", "5.2", "5.3", "5.4"] }
  ]
}
```
