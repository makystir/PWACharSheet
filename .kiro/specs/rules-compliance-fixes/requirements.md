# Requirements Document

## Introduction

This specification addresses 9 rules compliance issues identified by auditing the app's game mechanics logic against the WFRP 4e Core Rulebook, Up In Arms, the Dwarf Player's Guide, the High Elf Player's Guide, and the official WFRP Errata (February 2022). Issues range from critical (damage formulas entirely wrong) to medium (tie-breaking logic) to low (missing explicit guard clauses). All fixes affect pure logic modules in `src/logic/` and data in `src/data/`, with corresponding UI updates where behaviour changes are user-visible.

**Note:** The `WFRP-Character-Sheet (1).html` file in this repo contains hardcoded house rules (e.g., ½SB for ranged weapons) and should NOT be used as a reference or source of truth. The app correctly implements the ½SB ranged variant as an optional house rule toggle (`rangedDamageSBMode`), defaulting to RAW (full SB per the printed rulebook).

## Glossary

- **SL**: Success Levels — tensDigit(targetNumber) - tensDigit(roll).
- **SB**: Strength Bonus — floor(totalStrength / 10).
- **TB**: Toughness Bonus — floor(totalToughness / 10).
- **WPB**: Willpower Bonus — floor(totalWillpower / 10).
- **AP**: Armour Points — protection value per body location from worn armour.
- **CN**: Casting Number — the SL threshold that must be met for a spell to succeed.
- **Opposed_Test**: A contest where two parties roll and compare net SL to determine a winner.
- **Condition_Level**: The stacked level of a condition (e.g., Bleeding 3 = 3 stacked Bleeding conditions).
- **End_Of_Turn**: The processing that occurs at the end of a combat round for a character's active conditions.
- **Magic_Missile**: A damage-causing spell that uses reversed roll digits for hit location and adds SL to listed damage.
- **Weapon_Damage**: The base damage value of a weapon before adding SL or applying reductions.
- **Errata**: The official February 2022 WFRP errata document (WFRP_Errata_28_Feb.pdf) correcting printed rules.

## Requirements

### Requirement 1: Fix Ablaze Condition Damage Calculation

**User Story:** As a player, I want the Ablaze condition to deal damage per the rulebook (1d10 modified by TB and lowest AP, minimum 1, +1 per extra condition), so that fire damage is calculated correctly.

#### Acceptance Criteria

1. WHEN the end-of-turn processor encounters an Ablaze condition with level N, IT SHALL calculate damage as: `1d10 + (N - 1) - TB - lowestAP`, floored at a minimum of 1 wound.
2. THE `processEndOfTurn` function SHALL accept TB (Toughness Bonus) and lowestAP (the lowest Armour Points value across all body locations) as parameters.
3. THE `processEndOfTurn` function SHALL accept an optional injected d10 roll value for testability, defaulting to a random 1d10 roll when not provided.
4. THE `EndOfTurnEffect` for Ablaze SHALL include the d10 roll value, TB, AP, and final damage in its description field for transparency.
5. THE `conditions.ts` data for Ablaze SHALL have its `effects` field updated to: "1d10 + (level-1) Damage at end of round, reduced by TB and lowest AP (minimum 1 Wound)".

### Requirement 2: Fix Stunned Condition (Stackable + Endurance Test Removal)

**User Story:** As a player, I want the Stunned condition to be stackable and require an Endurance Test to remove (not auto-remove), so that combat difficulty matches the rules.

#### Acceptance Criteria

1. THE `conditions.ts` entry for Stunned SHALL be changed to `stackable: true` with `maxLevel: 10`.
2. THE `processEndOfTurn` function SHALL NOT auto-remove Stunned conditions.
3. THE end-of-turn effects summary SHALL include a reminder that "Stunned: Endurance Test (Challenging +0) required to remove" when the character has any Stunned conditions.
4. THE `conditions.ts` description for Stunned SHALL be updated to: "Dazed and reeling. Only Move action on your turn. Opponents gain +20 to hit. At end of each round, attempt Challenging (+0) Endurance Test to remove; each SL removes an extra Stunned Condition."
5. THE `CombatDashboard` and any UI that processes end-of-turn SHALL no longer automatically decrement or remove Stunned conditions.

### Requirement 3: Fix Combat Damage Formula (Include SL)

**User Story:** As a player resolving an attack, I want SL added to weapon damage per the rules (Damage = Weapon Damage + SL), so that combat damage is calculated correctly.

#### Acceptance Criteria

1. THE `calculateDamage` function in `combat.ts` SHALL accept an `sl` parameter representing the attack's Success Levels.
2. THE damage formula SHALL be: `Weapon Damage + SL - (AP + TB)`, floored at a minimum of 1 (per RAW: "if this is 1 or less, your opponent loses 1 Wound").
3. ALL callers of `calculateDamage` (including `AttackFlow.tsx` and `TakeDamagePanel.tsx`) SHALL pass the attack SL to the function.
4. THE `calculateDamage` function SHALL NOT apply a blanket half-SB rule for ranged weapons; instead, the `weaponDamage` parameter passed in SHALL already incorporate the correct SB contribution from the weapon formula (as computed by `calcWeaponDamage` in `weapons.ts`).

### Requirement 4: Fix Opposed Test Tie-Breaking

**User Story:** As a player in an opposed test, I want ties (equal SL) resolved by comparing the tested Skill/Characteristic values (not roll values), so that the more skilled character wins ties per the rules.

#### Acceptance Criteria

1. THE `resolveOpposedTest` function SHALL accept player and opponent target numbers as parameters (already does).
2. WHEN netSL equals 0, THE tie-breaker SHALL compare `playerTarget` vs `opponentTarget` — the higher target number wins.
3. WHEN netSL equals 0 AND both target numbers are equal, THE result SHALL be a `'tie'`.
4. THE `calculateOpposedResult` helper SHALL be updated or deprecated to match this logic.
5. THE function SHALL NOT use roll values as the tie-breaking mechanism.

### Requirement 5: Fix Ranged Weapon Damage (Remove Blanket Half-SB)

**User Story:** As a player using ranged weapons, I want damage calculated per the weapon's listed formula rather than a universal half-SB rule, so that crossbows, guns, bows, and throwing weapons each calculate damage correctly.

#### Acceptance Criteria

1. THE `calculateDamage` function in `combat.ts` SHALL remove the `isRanged` parameter and the `Math.floor(SB / 2)` computation.
2. THE function SHALL accept a single `weaponDamage` number that is the pre-computed effective weapon damage (already includes appropriate SB per weapon formula).
3. ALL callers SHALL use `calcWeaponDamage` from `weapons.ts` to compute the base weapon damage before passing it to `calculateDamage`.
4. THE attack flow UI SHALL display the weapon damage breakdown (from `calcWeaponDamage`) so players can verify the computation.

### Requirement 6: Fix Magic Missile Damage Formula

**User Story:** As a spellcaster, I want magic missile damage calculated as listed_damage + SL (without an extra WPB addition), so that spell damage matches the rules.

#### Acceptance Criteria

1. THE `computeMagicMissileDamage` function SHALL calculate damage as: `spell_listed_damage + casting_SL`.
2. THE function SHALL NOT add an extra WPB to the total (the spell's listed damage may already encode WPB if the spell description says so, but the function should not add it separately).
3. THE `parseDamageFromEffect` helper SHALL correctly extract the numeric damage value from spell effect text, interpreting "Dmg +N" as N, "Dmg WPB" as the WPB value, and "Dmg TB" as the TB value.
4. THE casting resolution SHALL pass the extracted damage value and SL to `computeMagicMissileDamage` without further WPB addition.

### Requirement 7: Fix Condition Stackability (Blinded, Deafened, Poisoned)

**User Story:** As a player, I want Blinded, Deafened, and Poisoned conditions to be stackable per the rulebook, so that multiple applications of these conditions accumulate correctly.

#### Acceptance Criteria

1. THE `conditions.ts` entry for Blinded SHALL be changed to `stackable: true` with `maxLevel: 10`.
2. THE `conditions.ts` entry for Deafened SHALL be changed to `stackable: true` with `maxLevel: 10`.
3. THE `conditions.ts` entry for Poisoned SHALL be changed to `stackable: true` with `maxLevel: 10`.
4. THE UI condition badges SHALL correctly display the level count for these newly-stackable conditions.

### Requirement 8: Add Missing End-of-Turn Condition Processing

**User Story:** As a player, I want the end-of-turn processor to handle Poisoned damage and remind me about Broken/Blinded/Deafened removal tests, so that all round-end condition effects are tracked.

#### Acceptance Criteria

1. WHEN the character has Poisoned conditions, THE `processEndOfTurn` function SHALL apply 1 wound per Poisoned level at end of round (ignoring modifiers), matching Bleeding behaviour.
2. THE effects summary SHALL include a reminder "Poisoned: Endurance Test to remove (each SL removes extra)" when Poisoned conditions are present.
3. THE effects summary SHALL include a reminder "Broken: Cool Test to remove" when a Broken condition is present.
4. THE effects summary SHALL include a reminder "Blinded: 1 removed every other round" when Blinded conditions are present.
5. THE effects summary SHALL include a reminder "Deafened: 1 removed every other round" when Deafened conditions are present.
6. THE Poisoned damage processing SHALL skip if wounds are already at 0 (same as Bleeding/Ablaze).

### Requirement 9: Fix Casting Success Condition

**User Story:** As a spellcaster, I want the casting resolution to explicitly verify that the Language (Magick) test was passed before checking SL ≥ CN, so that the logic correctly handles edge cases.

#### Acceptance Criteria

1. THE `resolveCastingResult` function SHALL check `rollResult.passed === true` as a precondition for cast success (in addition to SL ≥ CN).
2. IF `rollResult.passed` is false AND `totalPower` override is not active, THE cast SHALL fail regardless of SL value.
3. THE existing behaviour for `totalPower` override SHALL be preserved (allows success even on failure, representing the Total Power talent).
