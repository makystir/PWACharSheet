# Requirements Document

## Introduction

This feature adds support for Dwarf Engineering and updated melee weapon groups from the Dwarf Players Guide, along with the new weapon qualities (Crewed, Salvo, Spread) specific to Dwarf weaponry. The existing weapon catalogue already contains some Dwarf weapons, but their stats need updating to match the Dwarf Players Guide, and new weapon qualities need to be represented in the UI and damage logic.

## Glossary

- **Weapon_Catalogue**: The data array (`WEAPONS` in `src/data/weapons.ts`) that stores all rulebook weapon profiles available for selection via the weapon picker.
- **Weapon_Picker**: The UI component that allows players to add weapons from the Weapon_Catalogue to their character sheet.
- **Weapon_Card**: The UI component displaying an equipped weapon's name, group, damage, reach/range, and qualities.
- **Quality_Rating**: A numeric value associated with a weapon quality that modifies its effect (e.g., Spread 3 means a rating of 3).
- **Engineering_Group**: A melee and ranged weapon group for steam-powered and mechanically-enhanced Dwarf weapons, using the `Melee (Engineering)` or `Ranged (Engineering)` skill.
- **Crewed_Flaw**: A weapon flaw indicating the weapon requires multiple operators; its Rating specifies the optimal crew size.
- **Salvo_Quality**: A weapon quality that allows a weapon to fire multiple times before reloading; its Rating specifies the number of shots available.
- **Spread_Quality**: A weapon quality where projectiles expand to hit multiple targets; its Rating governs damage modification and area coverage.
- **Damage_Calculator**: The function (`calcWeaponDamage` in `src/logic/weapons.ts`) that computes effective weapon damage including SB, talents, and rune bonuses.

## Requirements

### Requirement 1: Update Dwarf Melee Weapon Profiles

**User Story:** As a Dwarf character player, I want the Dwarf melee weapon profiles in the catalogue to match the Dwarf Players Guide stats, so that my character sheet reflects accurate damage, reach, and qualities.

#### Acceptance Criteria

1. THE Weapon_Catalogue SHALL contain the following Dwarf melee weapons with their correct profiles from the Dwarf Players Guide: Dwarf Axe (group: Basic, damage: +SB+4, qualities: Hack), Dwarf Warhammer (group: Basic, damage: +SB+4, qualities: Pummel), Whirling Blades of Death (group: Flail, damage: +SB+5, qualities: Distract/Hack/Impact/Tiring/Wrap), (2H) Dwarf Greataxe (group: Two-Handed, damage: +SB+6, qualities: Hack/Impact/Tiring), (2H) Dwarf Greathammer (group: Two-Handed, damage: +SB+7, qualities: Damaging/Pummel), (2H) Dwarf Pick (group: Two-Handed, damage: +SB+6, qualities: Damaging/Impale), where each weapon entry also includes an encumbrance value and a rangeReach value as specified in the Dwarf Players Guide
2. THE Weapon_Catalogue SHALL contain the following Engineering group melee weapons with their correct profiles from the Dwarf Players Guide: (2H) Steam Drill (group: Engineering, damage: +SB+6, qualities: Impact/Impale), Cog Axe (group: Engineering, damage: +SB+4, qualities: Hack/Penetrating/Trap Blade), Steam Gauntlet (group: Engineering, damage: +SB+7, qualities: Pummel/Shield 1), where each weapon entry also includes an encumbrance value and a rangeReach value as specified in the Dwarf Players Guide
3. WHEN a player selects a Dwarf melee weapon from the Weapon_Picker, THE Weapon_Picker SHALL add the weapon to the character with the name, group, encumbrance, rangeReach, damage, and qualities fields populated exactly as defined in the Weapon_Catalogue entry for that weapon
4. IF a Dwarf melee weapon entry already exists in the Weapon_Catalogue with values that differ from the Dwarf Players Guide, THEN THE Weapon_Catalogue SHALL be updated to replace the existing values with the Dwarf Players Guide values for damage, qualities, encumbrance, and rangeReach

### Requirement 2: Update Dwarf Ranged Weapon Profiles

**User Story:** As a Dwarf character player, I want accurate Dwarf ranged weapon profiles including Engineering weapons, so that my ranged combat calculations are correct per the Dwarf Players Guide.

#### Acceptance Criteria

1. THE Weapon_Catalogue SHALL contain the following Dwarf Blackpowder and Crossbow ranged weapons with profiles matching the Dwarf Players Guide: (2H) Dwarf Handgun (group: Blackpowder, maxR: 50, damage: +10, qualities: Damaging/Impale/Penetrating/Reload 3), Dwarf Pistol (group: Blackpowder, maxR: 20, damage: +10, qualities: Damaging/Impale/Penetrating/Pistol/Reload 1), (2H) Dwarf Crossbow (group: Crossbow, maxR: 80, damage: +10, qualities: Impale/Precise/Damaging/Reload 1), Dwarf Throwing Axe (group: Throwing, maxR: SBx2, damage: +SB+4, qualities: Hack).
2. THE Weapon_Catalogue SHALL contain the following Engineering group ranged weapons with profiles matching the Dwarf Players Guide: (2H) Drakegun (group: Engineering, maxR: 30, damage: +12, qualities: Blast 6/Damaging/Dangerous/Penetrating/Reload 4), Drakefire Pistol (group: Engineering, maxR: 20, damage: +11, qualities: Blast 3/Damaging/Dangerous/Penetrating/Pistol/Reload 4), Trollhammer Torpedo (group: Engineering, maxR: 40, damage: +14, qualities: Dangerous/Impact/Reload 6), (2H) Repeating Dwarf Handgun (group: Engineering, maxR: 50, damage: +10, qualities: Damaging/Dangerous/Impale/Penetrating/Reload 4/Repeater 3), (2H) Grudge-raker (group: Engineering, maxR: 30, damage: +10, qualities: Damaging/Dangerous/Impale/Penetrating/Reload 3/Salvo 2/Spread 3).
3. THE Weapon_Catalogue SHALL contain the following Dwarf explosive weapons with profiles matching the Dwarf Players Guide: Blasting Charge (group: Explosives, maxR: SB, damage: +12, qualities: Blast 2/Dangerous/Impact/Penetrating), Cinderblast Bomb (group: Explosives, maxR: SBx2, damage: +10, qualities: Blast 5/Dangerous/Impact/Penetrating).
4. WHEN the Weapon_Catalogue is updated with Dwarf ranged weapon profiles, THE Weapon_Catalogue SHALL specify the enc (encumbrance) value for each weapon entry as a string representing a non-negative integer.
5. IF a Dwarf ranged weapon entry specifies a numeric maxR value, THEN THE Weapon_Catalogue SHALL also include the derived optR (one-third of maxR, rounded down to the nearest integer) and rangeMod (one-fifth of maxR, rounded down to the nearest integer) values for that weapon entry.

### Requirement 3: Display New Weapon Qualities and Flaws

**User Story:** As a player, I want the new Dwarf weapon qualities (Salvo, Spread) and the Crewed flaw to appear correctly on my Weapon_Cards, so that I can see the full rules text for my weapons.

#### Acceptance Criteria

1. WHEN a weapon has the Salvo_Quality in its qualities string, THE Weapon_Card SHALL display the text "Salvo" followed by a space and its numeric Rating value (e.g., "Salvo 10")
2. WHEN a weapon has the Spread_Quality in its qualities string, THE Weapon_Card SHALL display the text "Spread" followed by a space and its numeric Rating value (e.g., "Spread 4")
3. WHEN a weapon has the Crewed_Flaw in its qualities string, THE Weapon_Card SHALL display the text "Crewed" followed by a space and its numeric Rating value (e.g., "Crewed 3")
4. THE Weapon_Card SHALL display all qualities and flaws from the weapon profile as a comma-and-space-separated text string (e.g., "Blackpowder, Crewed 2, Dangerous, Reload 4, Spread 4"), preserving the Rating number for each quality or flaw that has one
5. IF a weapon's qualities string is empty or contains only "—", THEN THE Weapon_Card SHALL not display a qualities section for that weapon

### Requirement 4: Engineering Weapon Group Skill Resolution

**User Story:** As a Dwarf Engineer, I want my Engineering weapons to resolve against the correct skill (Melee (Engineering) or Ranged (Engineering)), so that attack rolls use the right skill advances.

#### Acceptance Criteria

1. WHEN an Engineering-group weapon does not have a `maxR` property defined, THE Weapon_Picker SHALL associate the weapon with the Melee (Engineering) skill for attack resolution
2. WHEN an Engineering-group weapon has a `maxR` property defined, THE Weapon_Picker SHALL associate the weapon with the Ranged (Engineering) skill for attack resolution
3. THE RANGED_GROUPS constant SHALL NOT include "Engineering" so that Engineering-group weapon classification is determined per-weapon by the presence of the `maxR` property rather than by group membership alone
4. IF a character lacks the matching skill (Melee (Engineering) or Ranged (Engineering)) for an equipped Engineering-group weapon, THEN THE Weapon_Picker SHALL fall back to Melee (Basic) for melee Engineering weapons and return no matching skill for ranged Engineering weapons
5. WHEN a ranged Engineering-group weapon is used for damage calculation, THE system SHALL apply ranged damage bonuses (Accurate Shot, Sure Shot, rangedDamageSBMode house rule) instead of melee damage bonuses (Strike Mighty Blow)

### Requirement 5: Damage Calculation for Updated Dwarf Weapons

**User Story:** As a player, I want the damage calculator to correctly compute damage for the updated Dwarf weapon profiles, so that my total damage numbers are accurate during combat.

#### Acceptance Criteria

1. WHEN a Dwarf melee weapon uses the "+SB+N" damage formula, THE Damage_Calculator SHALL compute the total as Strength Bonus plus N plus the Strike Mighty Blow talent level plus rune damage bonuses
2. WHEN a Dwarf ranged weapon uses the "+N" flat damage formula, THE Damage_Calculator SHALL compute the total as N plus the Accurate Shot talent level plus the Sure Shot talent level plus rune damage bonuses
3. WHEN a weapon has the group "Engineering" and has a rangeReach property defined (indicating melee), THE Damage_Calculator SHALL classify it as a melee weapon and apply the Strike Mighty Blow talent bonus to the damage total
4. WHEN a weapon has the group "Engineering" and has a maxR property defined (indicating ranged), THE Damage_Calculator SHALL classify it as a ranged weapon and apply the Accurate Shot and Sure Shot talent bonuses to the damage total
5. WHEN a weapon has the group "Engineering" and has a maxR property defined, THE Damage_Calculator SHALL apply the rangedDamageSBMode house rule to modify the SB component of the damage formula, consistent with how other ranged weapon groups are handled
6. IF a weapon's damage value is "—" or an empty string, THEN THE Damage_Calculator SHALL return a null damage result with no breakdown

### Requirement 6: Blackpowder Quality Annotation

**User Story:** As a player using Dwarf blackpowder weapons, I want the Blackpowder (BP) quality to appear in my weapon's quality list where applicable, so that I know which weapons are affected by misfire and blackpowder rules.

#### Acceptance Criteria

1. THE Weapon_Catalogue SHALL include the "BP" quality in the qualities string of every weapon whose group is "Blackpowder", including Dwarf-specific entries ((2H) Dwarf Handgun, Dwarf Pistol, (2H) Repeating Dwarf Handgun, (2H) Grudge-raker) and all core-rulebook Blackpowder-group weapons (Blunderbuss, Long Rifle, Handgun, Pistol, Matchlock Handgun, Matchlock Blunderbuss, Arquebus, Double-barrelled Handgun, Griffonsfoot Pistol, Gun Axe, Gun Halberd)
2. THE Weapon_Catalogue SHALL include the "BP" quality in the qualities string of the Drakefire weapons ((2H) Drakegun and Drakefire Pistol) that belong to the "Engineering" group, because they use drake-oil propellant subject to the same misfire rules
3. WHEN a weapon has the "BP" quality present in its qualities string, THE Weapon_Card SHALL display "BP" as a comma-separated entry within the qualities text, in the same position it appears in the catalogue data
4. IF a weapon's group is not "Blackpowder" and the weapon is not a Drakefire weapon ((2H) Drakegun or Drakefire Pistol), THEN THE Weapon_Catalogue SHALL NOT include the "BP" quality in that weapon's qualities string
