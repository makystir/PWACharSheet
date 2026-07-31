# Requirements Document

## Introduction

This spec adds Archives of the Empire Volume III spell and miracle content to the WFRP 4e character sheet PWA. It introduces additional Lore of Hedgecraft spells (beyond the core rulebook set already present), new miracle lists for Handrich, Solkan, and Rhya, and an optional house rule for Alternative Channelling Cants — lore-specific bonuses that give wizards minor effects when expending channelled power.

## Glossary

- **Spell_Picker**: The existing UI component that allows players to browse and add spells/miracles to their character sheet, organized by lore category.
- **Spell_Data_Array**: The `SPELL_LIST` constant in `src/data/spells.ts` containing all available `SpellData` entries with name, CN, range, target, duration, effect, and lore fields.
- **Lore_Categories**: The `LORE_CATEGORIES` constant defining valid lore strings used to group spells in the picker.
- **House_Rules_Panel**: The existing settings UI where players toggle optional mechanics on or off, stored in `character.houseRules`.
- **Channelling_Flow**: The existing UI and logic in `SpellCastingPanel` that tracks accumulated SL when a character channels magic before casting a spell.
- **Cant**: A minor magical effect that a wizard can invoke by expending accumulated channelling SL. Each Cant is associated with one of the eight College Winds of Magic. Cants do not cost an action unless stated and a wizard may use at most one per round.
- **Wind_Lore**: One of the eight College lores (Beasts, Death, Fire, Heavens, Metal, Life, Light, Shadows), each associated with a specific Wind of Magic.

## Requirements

### Requirement 1: Additional Lore of Hedgecraft Spell Data

**User Story:** As a player with a Hedge Witch character, I want the additional Hedgecraft spells from Archives Vol. III available in the spell picker, so that I can add them to my character sheet.

#### Acceptance Criteria

1. THE Spell_Data_Array SHALL contain entries for the following Lore of Hedgecraft spells: Dagger of the Art, Fellstave, Invigorate, Lovelock, Mirkride (already exists — skip if duplicate), Protection Pouch, Sightstep, Silvertide, The Ousting, Wyrd Ward.
2. WHEN a Lore of Hedgecraft spell entry is added, THE Spell_Data_Array SHALL include the correct CN, range, target, duration, and effect values matching the Archives Vol. III source material.
3. THE Spell_Data_Array SHALL assign the lore value "Lore of Hedgecraft" to each new Hedgecraft spell entry.
4. WHEN a spell name from this requirement duplicates an existing entry in the Spell_Data_Array (e.g. Goodwill, Mirkride), THE Spell_Data_Array SHALL retain only one entry per spell name with the most complete effect description.

### Requirement 2: Miracles of Handrich Data

**User Story:** As a player with a Priest of Handrich character, I want Handrich's miracles available in the spell picker, so that I can add them to my character sheet.

#### Acceptance Criteria

1. THE Lore_Categories SHALL include the value "Miracles of Handrich".
2. THE Spell_Data_Array SHALL contain entries for the six Miracles of Handrich: A Deal's a Deal, Carry My Burdens, Shake On It, Supply and Demand, Trickle Down, Twist of Fortune.
3. WHEN a Miracles of Handrich entry is added, THE Spell_Data_Array SHALL include the correct CN (set to "-" for miracles), range, target, duration, and effect values matching the Archives Vol. III source material.
4. THE Spell_Data_Array SHALL assign the lore value "Miracles of Handrich" to each Handrich miracle entry.

### Requirement 3: Miracles of Solkan Data

**User Story:** As a player with a Priest of Solkan character, I want Solkan's miracles available in the spell picker, so that I can add them to my character sheet.

#### Acceptance Criteria

1. THE Lore_Categories SHALL include the value "Miracles of Solkan".
2. THE Spell_Data_Array SHALL contain entries for the six Miracles of Solkan: Absolute Purity, Fist of Vengeance, Flaming Blade, Fury of the Righteous Sun, Light of Stasis, Still the Winds.
3. WHEN a Miracles of Solkan entry is added, THE Spell_Data_Array SHALL include the correct CN (set to "-" for miracles), range, target, duration, and effect values matching the Archives Vol. III source material.
4. THE Spell_Data_Array SHALL assign the lore value "Miracles of Solkan" to each Solkan miracle entry.

### Requirement 4: Additional Miracles of Rhya Data

**User Story:** As a player with a Priestess of Rhya character, I want the additional Rhya miracles from Archives Vol. III available in the spell picker, so that I can add them to my character sheet.

#### Acceptance Criteria

1. THE Spell_Data_Array SHALL contain entries for the following Miracles of Rhya: Rhya's Abundance, Rhya's Demand, Rhya's Dominion, Rhya's Flock, Rhya's Taming, Rhya's Rage.
2. WHEN a Miracles of Rhya entry is added, THE Spell_Data_Array SHALL include the correct CN (set to "-" for miracles), range, target, duration, and effect values matching the Archives Vol. III source material.
3. THE Spell_Data_Array SHALL assign the lore value "Miracles of Rhya" to each new Rhya miracle entry.
4. WHEN a miracle name from this requirement duplicates an existing Miracles of Rhya entry, THE Spell_Data_Array SHALL retain only one entry per miracle name with the most complete effect description.

### Requirement 5: Lore Display Order Update

**User Story:** As a player, I want the new miracle categories to appear in the spell picker in a logical order alongside existing categories, so that I can find them easily.

#### Acceptance Criteria

1. THE Lore_Categories SHALL list "Miracles of Handrich" and "Miracles of Solkan" as valid lore values.
2. THE LORE_DISPLAY_ORDER array SHALL include "Miracles of Handrich" and "Miracles of Solkan" in alphabetical position among the other miracle categories.

### Requirement 6: Channelling Cants House Rule Toggle

**User Story:** As a GM, I want to enable or disable the Alternative Channelling Cants system as a house rule, so that I can control whether this optional mechanic is active for my campaign.

#### Acceptance Criteria

1. THE House_Rules_Panel SHALL include a toggle labelled "Use Channelling Cants" with a description explaining it enables lore-specific channelling bonuses for the eight Winds of Magic.
2. WHEN the toggle is enabled, THE Character model SHALL store the value `true` for `houseRules.useChannellingCants`.
3. WHEN the toggle is disabled, THE Character model SHALL store the value `false` for `houseRules.useChannellingCants`.
4. THE `useChannellingCants` field SHALL default to `false` for new and existing characters.

### Requirement 7: Channelling Cants Data

**User Story:** As a player with a wizard character, I want the specific Cant effects for each Wind lore documented in the app, so that I can reference them during play.

#### Acceptance Criteria

1. THE application SHALL define Cant data for all eight Wind lores: Lore of Beasts, Lore of Death, Lore of Fire, Lore of Heavens, Lore of Metal, Lore of Life, Lore of Light, Lore of Shadows.
2. WHEN Cant data is defined for a Wind lore, THE data SHALL include exactly three Cants per lore, each with a name, SL cost (1, 2, or 3), and effect description matching the Archives Vol. III source material.
3. THE Cant data for Lore of Beasts SHALL contain: Face of the Wild (1 SL — gain Fear(1) until next turn), Talons of Ghur (up to WPB SL — +1 Damage per SL to unarmed attacks until next turn), Thick Hide (3 SL — +1 AP to leather armour locations until next turn).
4. THE Cant data for Lore of Death SHALL contain: Eyes of Death (1 SL — learn how close a creature is to death), Whispers of Doom (2 SL — learn Dooming of creature you wounded in last WPB minutes), Death's Visage (3 SL — ignore Fatigued/disease/Poisoned, Undead ignore you this round).
5. THE Cant data for Lore of Fire SHALL contain: Brighten Blaze (1 SL — intensify nearby non-magical fire within WP yards), Set Alight (2 SL — inflict 1 Ablaze on melee hit), Fervent Bellow (3 SL — one ally loses 1 Broken Condition).
6. THE Cant data for Lore of Heavens SHALL contain: Visions of Trauma (1 SL — +1 SL to Dodge or Melee to avoid/parry), Crackling Blade (up to WPB SL — +1 Damage per SL to metal weapon melee attack), Visions of Fortune (3 SL — ally gains +2 SL to one test next turn).
7. THE Cant data for Lore of Metal SHALL contain: Reinforcement (1 SL — +1 AP to metal armour locations until next turn), Heart of Iron (2 SL — attacker rolls Critical Wound twice, takes lesser result), Quicksilver Blade (3 SL — metal weapon ignores metal AP and deals bonus damage equal to AP ignored).
8. THE Cant data for Lore of Life SHALL contain: Staunch (1 SL — remove all Fatigued and Bleeding from self), Invigorate (2 SL — touched creature gains +1 SL to Strength/Toughness tests, auto-passes disease/poison resistance until next turn), Regenerate (3 SL — gain Regenerate trait until next round).
9. THE Cant data for Lore of Light SHALL contain: Brighteyes (1 SL — gain Dark Vision, immune to Blinded until next turn), Purging Light (2 SL — struck targets must pass Endurance or gain Blinded; +3 Damage vs Daemonic), Perfection of the Self (3 SL — ignore Diseases, Poisons, Critical Wounds, Mutations until next turn).
10. THE Cant data for Lore of Shadows SHALL contain: Ulgu's Touch (1 SL — add up to WPB SL to Stealth tests this round), Not Your Problem (2 SL — enemies prefer other targets this round), A Passing Shadow (3 SL — slip free of bonds, pass through difficult terrain and tight spaces).

### Requirement 8: Channelling Cants UI Display

**User Story:** As a player channelling a spell, I want to see the available Cants for my active lore while channelling, so that I can decide whether to spend accumulated SL on a Cant effect.

#### Acceptance Criteria

1. WHILE `houseRules.useChannellingCants` is `true` AND a character has accumulated channelling SL for a spell, THE Channelling_Flow SHALL display the available Cants for the spell's associated Wind lore.
2. WHEN displaying Cants, THE Channelling_Flow SHALL show each Cant's name, SL cost, and effect description.
3. WHILE `houseRules.useChannellingCants` is `false`, THE Channelling_Flow SHALL NOT display any Cant information.
4. WHEN a character's accumulated SL is less than a Cant's cost, THE Channelling_Flow SHALL display that Cant as unavailable (visually dimmed or marked).
5. THE Channelling_Flow SHALL only display Cants for the eight Wind lores (Beasts, Death, Fire, Heavens, Metal, Life, Light, Shadows) and SHALL NOT display Cants for Hedgecraft, Necromancy, Daemonology, Chaos lores, or Miracles.

### Requirement 9: Handrich Blessings Data

**User Story:** As a player with a Priest of Handrich character, I want Handrich's Blessings available in the spell picker, so that I can add them to my character sheet.

#### Acceptance Criteria

1. THE Spell_Data_Array SHALL contain Blessing entries accessible to Priests of Handrich: Charisma, Fortune, Hardiness, Protection, Wisdom, Wit.
2. WHEN Handrich Blessing entries already exist in the "Blessings" lore category (as generic Blessings), THE application SHALL allow Priests of Handrich to select from the existing Blessings pool without duplicating entries.

### Requirement 10: Solkan Blessings Data

**User Story:** As a player with a Priest of Solkan character, I want Solkan's Blessings available in the spell picker, so that I can add them to my character sheet.

#### Acceptance Criteria

1. THE Spell_Data_Array SHALL contain Blessing entries accessible to Priests of Solkan: Battle, Conscience, Courage, Hardiness, Might, Tenacity.
2. WHEN Solkan Blessing entries already exist in the "Blessings" lore category (as generic Blessings), THE application SHALL allow Priests of Solkan to select from the existing Blessings pool without duplicating entries.
