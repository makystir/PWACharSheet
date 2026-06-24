# Requirements Document

## Introduction

This feature adds the Miracles for all 9 remaining Empire deities from the WFRP 4th Edition core rulebook (pages 222-228) to the application's spell data. The app currently includes only the Miracles of Myrmidia (from the Up in Arms supplement). The core rulebook defines miracles for Manann, Morr, Ranald, Rhya, Shallya, Sigmar, Taal, Ulric, and Verena, each with approximately 6 miracles. These miracles must be added to `src/data/spells.ts` following the established `SpellData` interface and comment-header grouping pattern.

## Glossary

- **Spell_Data_Module**: The TypeScript source file (`src/data/spells.ts`) containing the `SPELL_LIST` array that stores all spell, blessing, and miracle entries.
- **SpellData**: The TypeScript interface defining a spell/blessing/miracle entry with fields: name, cn, range, target, duration, effect.
- **Miracle**: A deity-specific divine ability available to priests with the Invoke talent; distinct from Blessings which are minor divine effects. Both Miracles and Blessings use a flat Challenging (+0) Pray test rather than a CN threshold.
- **Casting_Number**: A string field in the SpellData interface. For spells, this is a numeric value representing the Language (Magick) test threshold. For Blessings and Miracles (which use a flat Pray test), the value SHALL be "-" to indicate no CN threshold applies.
- **Deity_Section_Header**: A TypeScript comment in the format `// MIRACLES OF [DEITY NAME]` used to group miracles by deity in the spell data file.
- **Core_Rulebook_Source**: The WFRP 4th Edition core rulebook content available in `WarhammerFantasyRoleplay4e.md` (pages 222-228, lines ~10374-10930).
- **SPELL_LIST**: The exported constant array in the Spell_Data_Module containing all spell and miracle entries.

## Requirements

### Requirement 1: Add Miracles of Manann

**User Story:** As a player of a Priest of Manann, I want the Miracles of Manann available in the app, so that I can reference my character's divine abilities.

#### Acceptance Criteria

1. WHEN the SPELL_LIST is loaded, THE Spell_Data_Module SHALL contain entries for all Miracles of Manann: Becalm, Drowned Man's Face, Fair Winds, Manann's Bounty, Sea Legs, and Waterwalk.
2. THE Spell_Data_Module SHALL group the Miracles of Manann under a Deity_Section_Header comment reading `// MIRACLES OF MANANN`.
3. FOR EACH Miracle of Manann entry, THE Spell_Data_Module SHALL provide a valid SpellData object with non-empty name, cn, range, target, duration, and effect fields.
4. FOR EACH Miracle of Manann entry, THE Spell_Data_Module SHALL assign a cn value of "-" to indicate a Pray test rather than a Language (Magick) Casting Number.

### Requirement 2: Add Miracles of Morr

**User Story:** As a player of a Priest of Morr, I want the Miracles of Morr available in the app, so that I can reference my character's divine abilities.

#### Acceptance Criteria

1. WHEN the SPELL_LIST is loaded, THE Spell_Data_Module SHALL contain entries for all Miracles of Morr: Death Mask, Destroy Undead, Dooming, Last Rites, Portal's Threshold, and Stay Morr's Hand.
2. THE Spell_Data_Module SHALL group the Miracles of Morr under a Deity_Section_Header comment reading `// MIRACLES OF MORR`.
3. FOR EACH Miracle of Morr entry, THE Spell_Data_Module SHALL provide a valid SpellData object with non-empty name, cn, range, target, duration, and effect fields.
4. FOR EACH Miracle of Morr entry, THE Spell_Data_Module SHALL assign a cn value of "-" to indicate a Pray test rather than a Language (Magick) Casting Number.

### Requirement 3: Add Miracles of Ranald

**User Story:** As a player of a Priest of Ranald, I want the Miracles of Ranald available in the app, so that I can reference my character's divine abilities.

#### Acceptance Criteria

1. WHEN the SPELL_LIST is loaded, THE Spell_Data_Module SHALL contain entries for all Miracles of Ranald: An Invitation, Cat's Eyes, Ranald's Grace, Rich Man Poor Man Beggar Man Thief, Stay Lucky, and You Ain't Seen Me Right?.
2. THE Spell_Data_Module SHALL group the Miracles of Ranald under a Deity_Section_Header comment reading `// MIRACLES OF RANALD`.
3. FOR EACH Miracle of Ranald entry, THE Spell_Data_Module SHALL provide a valid SpellData object with non-empty name, cn, range, target, duration, and effect fields.
4. FOR EACH Miracle of Ranald entry, THE Spell_Data_Module SHALL assign a cn value of "-" to indicate a Pray test rather than a Language (Magick) Casting Number.

### Requirement 4: Add Miracles of Rhya

**User Story:** As a player of a Priest of Rhya, I want the Miracles of Rhya available in the app, so that I can reference my character's divine abilities.

#### Acceptance Criteria

1. WHEN the SPELL_LIST is loaded, THE Spell_Data_Module SHALL contain entries for all Miracles of Rhya: Rhya's Children, Rhya's Harvest, Rhya's Shelter, Rhya's Succour, Rhya's Touch, and Rhya's Union.
2. THE Spell_Data_Module SHALL group the Miracles of Rhya under a Deity_Section_Header comment reading `// MIRACLES OF RHYA`.
3. FOR EACH Miracle of Rhya entry, THE Spell_Data_Module SHALL provide a valid SpellData object with non-empty name, cn, range, target, duration, and effect fields.
4. FOR EACH Miracle of Rhya entry, THE Spell_Data_Module SHALL assign a cn value of "-" to indicate a Pray test rather than a Language (Magick) Casting Number.

### Requirement 5: Add Miracles of Shallya

**User Story:** As a player of a Priest of Shallya, I want the Miracles of Shallya available in the app, so that I can reference my character's divine abilities.

#### Acceptance Criteria

1. WHEN the SPELL_LIST is loaded, THE Spell_Data_Module SHALL contain entries for all Miracles of Shallya: Anchorite's Endurance, Balm to a Wounded Mind, Bitter Catharsis, Martyr, Shallya's Tears, and Unblemished Innocence.
2. THE Spell_Data_Module SHALL group the Miracles of Shallya under a Deity_Section_Header comment reading `// MIRACLES OF SHALLYA`.
3. FOR EACH Miracle of Shallya entry, THE Spell_Data_Module SHALL provide a valid SpellData object with non-empty name, cn, range, target, duration, and effect fields.
4. FOR EACH Miracle of Shallya entry, THE Spell_Data_Module SHALL assign a cn value of "-" to indicate a Pray test rather than a Language (Magick) Casting Number.

### Requirement 6: Add Miracles of Sigmar

**User Story:** As a player of a Priest of Sigmar, I want the Miracles of Sigmar available in the app, so that I can reference my character's divine abilities.

#### Acceptance Criteria

1. WHEN the SPELL_LIST is loaded, THE Spell_Data_Module SHALL contain entries for all Miracles of Sigmar: Beacon of Righteous Virtue, Heed Not the Witch, Sigmar's Fiery Hammer, Soulfire, Twin-tailed Comet, and Vanquish the Unrighteous.
2. THE Spell_Data_Module SHALL group the Miracles of Sigmar under a Deity_Section_Header comment reading `// MIRACLES OF SIGMAR`.
3. FOR EACH Miracle of Sigmar entry, THE Spell_Data_Module SHALL provide a valid SpellData object with non-empty name, cn, range, target, duration, and effect fields.
4. FOR EACH Miracle of Sigmar entry, THE Spell_Data_Module SHALL assign a cn value of "-" to indicate a Pray test rather than a Language (Magick) Casting Number.

### Requirement 7: Add Miracles of Taal

**User Story:** As a player of a Priest of Taal, I want the Miracles of Taal available in the app, so that I can reference my character's divine abilities.

#### Acceptance Criteria

1. WHEN the SPELL_LIST is loaded, THE Spell_Data_Module SHALL contain entries for all Miracles of Taal: Animal Instincts, King of the Wild, Leaping Stag, Lord of the Hunt, Tooth and Claw, and Tanglefoot.
2. THE Spell_Data_Module SHALL group the Miracles of Taal under a Deity_Section_Header comment reading `// MIRACLES OF TAAL`.
3. FOR EACH Miracle of Taal entry, THE Spell_Data_Module SHALL provide a valid SpellData object with non-empty name, cn, range, target, duration, and effect fields.
4. FOR EACH Miracle of Taal entry, THE Spell_Data_Module SHALL assign a cn value of "-" to indicate a Pray test rather than a Language (Magick) Casting Number.

### Requirement 8: Add Miracles of Ulric

**User Story:** As a player of a Priest of Ulric, I want the Miracles of Ulric available in the app, so that I can reference my character's divine abilities.

#### Acceptance Criteria

1. WHEN the SPELL_LIST is loaded, THE Spell_Data_Module SHALL contain entries for all Miracles of Ulric: Hoarfrost's Chill, Howl of the Wolf, Ulric's Fury, Pelt of the Winter Wolf, The Snow King's Judgement, and Winter's Bite.
2. THE Spell_Data_Module SHALL group the Miracles of Ulric under a Deity_Section_Header comment reading `// MIRACLES OF ULRIC`.
3. FOR EACH Miracle of Ulric entry, THE Spell_Data_Module SHALL provide a valid SpellData object with non-empty name, cn, range, target, duration, and effect fields.
4. FOR EACH Miracle of Ulric entry, THE Spell_Data_Module SHALL assign a cn value of "-" to indicate a Pray test rather than a Language (Magick) Casting Number.

### Requirement 9: Add Miracles of Verena

**User Story:** As a player of a Priest of Verena, I want the Miracles of Verena available in the app, so that I can reference my character's divine abilities.

#### Acceptance Criteria

1. WHEN the SPELL_LIST is loaded, THE Spell_Data_Module SHALL contain entries for all Miracles of Verena: As Verena Is My Witness, Blind Justice, Shackles of Truth, Sword of Justice, Truth Will Out, and Wisdom of the Owl.
2. THE Spell_Data_Module SHALL group the Miracles of Verena under a Deity_Section_Header comment reading `// MIRACLES OF VERENA`.
3. FOR EACH Miracle of Verena entry, THE Spell_Data_Module SHALL provide a valid SpellData object with non-empty name, cn, range, target, duration, and effect fields.
4. FOR EACH Miracle of Verena entry, THE Spell_Data_Module SHALL assign a cn value of "-" to indicate a Pray test rather than a Language (Magick) Casting Number.

### Requirement 10: Correct Existing Blessings and Myrmidia Miracle CN Values

**User Story:** As a developer, I want all Blessings and Miracles to use the correct cn value of "-" instead of numeric CN values, so that the data accurately reflects that these abilities use Pray tests rather than Language (Magick) Casting Number thresholds.

#### Acceptance Criteria

1. THE Spell_Data_Module SHALL update all existing Blessing entries to use cn:"-" instead of cn:"0".
2. THE Spell_Data_Module SHALL update all existing Miracles of Myrmidia entries to use cn:"-" instead of their current numeric cn values.
3. WHEN a Blessing or Miracle entry has cn:"-", THE SpellCastingPanel SHALL not apply channelling logic to that entry.
4. THE application SHALL update any existing test assertions that check Blessing cn values of "0" or Miracle cn values greater than "0" to assert cn:"-" instead.

### Requirement 11: Data Consistency and Structural Compliance

**User Story:** As a developer, I want all miracle data to follow the established patterns and compile correctly, so that the app remains stable after the data addition.

#### Acceptance Criteria

1. THE Spell_Data_Module SHALL compile without TypeScript errors after adding all deity miracle entries and updating existing cn values.
2. THE Spell_Data_Module SHALL maintain the existing SPELL_LIST spell entries (Petty Spells and Arcane Spells) without modification to their cn values.
3. WHEN the test suite is executed, THE application SHALL pass all tests without regression.
4. FOR EACH miracle entry, THE Spell_Data_Module SHALL use the single-line object format consistent with existing entries in the SPELL_LIST array.
5. THE Spell_Data_Module SHALL order deity miracle sections alphabetically by deity name (Manann, Morr, Myrmidia, Ranald, Rhya, Shallya, Sigmar, Taal, Ulric, Verena).
