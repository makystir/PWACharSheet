# Implementation Plan: Rules Compliance Fixes

## Overview

This plan implements 9 rules compliance fixes identified by auditing the app against the WFRP 4e rulebook and official errata. Tasks are ordered by dependency: data fixes first, then pure logic module rewrites, then UI caller updates, then tests.

**Note:** Weapon data (bows using full SB) is confirmed correct per the printed rulebook (p. 293). The ½SB variant is a house rule already implemented as an optional toggle (`rangedDamageSBMode`). No weapon data changes are needed.

## Tasks

- [x] 1. Fix condition data (stackability, descriptions)
  - [x] 1.1 Update Stunned to stackable
    - In `src/data/conditions.ts`, change Stunned entry: `stackable: true`, `maxLevel: 10`
    - Update `description` to: "Dazed and reeling. Only Move action on your turn. Opponents gain +20 to hit. At end of each round, attempt Challenging (+0) Endurance Test to remove; each SL removes an extra Stunned Condition."
    - Update `effects` to: "Can only take Move action; opponents gain +20 to hit; Endurance Test to remove"
    - Update `removedBy` to: "Challenging (+0) Endurance Test at end of each round (each SL removes extra)"
    - _Requirements: 2.1, 2.4_

  - [x] 1.2 Update Blinded, Deafened, Poisoned to stackable
    - In `src/data/conditions.ts`, change Blinded: `stackable: true`, `maxLevel: 10`
    - Change Deafened: `stackable: true`, `maxLevel: 10`
    - Change Poisoned: `stackable: true`, `maxLevel: 10`
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 1.3 Update Ablaze condition description
    - In `src/data/conditions.ts`, update Ablaze `description` to: "You are on fire. At end of each round, suffer 1d10 + (level-1) Wounds reduced by TB and lowest AP (minimum 1 Wound). Athletics test to extinguish (each SL removes 1 level)."
    - Update `effects` to: "1d10 + (level-1) Damage at end of round, reduced by TB and lowest AP (minimum 1 Wound)"
    - _Requirements: 1.5_

- [x] 2. Rewrite end-of-turn logic
  - [x] 2.1 Refactor processEndOfTurn signature
    - In `src/logic/end-of-turn.ts`, change `processEndOfTurn` to accept a params object: `{ currentWounds, conditions, currentRound, tb, lowestAP, injectedD10? }`
    - Add `tb: number` (Toughness Bonus) and `lowestAP: number` (minimum AP across locations) as required params
    - Add optional `injectedD10?: number` for testability (1-10 range)
    - Update `EndOfTurnEffect` type to include optional `d10Roll?: number` field
    - _Requirements: 1.2, 1.3_

  - [x] 2.2 Implement correct Ablaze damage calculation
    - Replace flat `level` damage with: `d10Roll + (ablazeLevel - 1) - tb - lowestAP`, floored at minimum 1
    - Use `injectedD10` if provided, otherwise generate random `Math.floor(Math.random() * 10) + 1`
    - Include d10 roll, TB, AP, and computed damage in the effect description
    - _Requirements: 1.1, 1.4_

  - [x] 2.3 Remove Stunned auto-removal, add reminders
    - Remove the block that auto-removes Stunned from the end-of-turn processor
    - Add a `'reminder'` type to `EndOfTurnEffect` type union
    - Emit reminder effect: `{ type: 'reminder', condition: 'Stunned', description: 'Endurance Test (Challenging +0) required to remove' }`
    - _Requirements: 2.2, 2.3, 2.5_

  - [x] 2.4 Add Poisoned damage processing
    - Add Poisoned condition processing: `newWounds -= poisonedLevel` (same pattern as Bleeding, ignores modifiers)
    - Skip if wounds already at 0
    - Emit reminder: "Endurance Test to remove (each SL removes extra)"
    - _Requirements: 9.1, 9.2, 9.6_

  - [x] 2.5 Add condition reminders for Broken, Blinded, Deafened
    - When Broken is present: emit reminder "Cool Test to remove"
    - When Blinded is present: emit reminder "1 level removed every other round"
    - When Deafened is present: emit reminder "1 level removed every other round"
    - _Requirements: 9.3, 9.4, 9.5_

- [x] 3. Fix combat damage formula
  - [x] 3.1 Refactor calculateDamage signature
    - In `src/logic/combat.ts`, change `calculateDamage` to: `calculateDamage(weaponDamage: number, sl: number, targetAP: number, targetTB: number): number`
    - Remove `SB` parameter, remove `isRanged` parameter
    - Implement as: `Math.max(1, weaponDamage + sl - (targetAP + targetTB))`
    - Note: minimum is 1 (not 0) per RAW
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 3.2 Update AttackFlow to pass SL and weapon damage
    - In `src/components/combat/AttackFlow.tsx`, update the call to `calculateDamage` to pass:
      - `weaponDamage`: the numeric result from `calcWeaponDamage`
      - `sl`: the SL from the attack roll result
    - Remove any separate SB/isRanged logic that was being passed
    - _Requirements: 3.3_

  - [x] 3.3 Update TakeDamagePanel to accept SL
    - In `src/components/combat/TakeDamagePanel.tsx`, add an SL input field (defaulting to 0 for manual damage entry)
    - Pass SL to `calculateDamage` when computing final damage
    - _Requirements: 3.3_

- [x] 4. Fix opposed test tie-breaking
  - [x] 4.1 Update resolveOpposedTest tie-breaker
    - In `src/logic/dice-roller.ts`, change the `netSL === 0` block in `resolveOpposedTest`:
    - Replace: compare `clampedPlayerRoll > clampedOpponentRoll`
    - With: compare `playerTarget > opponentTarget` (higher tested skill wins)
    - If `playerTarget === opponentTarget`, result is `'tie'`
    - _Requirements: 4.2, 4.3, 4.5_

  - [x] 4.2 Update calculateOpposedResult helper
    - In `src/logic/dice-roller.ts`, update `calculateOpposedResult` to accept target numbers and apply the same tie-breaking logic
    - Or deprecate/remove if unused elsewhere
    - _Requirements: 4.4_

- [x] 5. Fix magic missile damage
  - [x] 5.1 Remove extra WPB from computeMagicMissileDamage
    - In `src/logic/spell-casting.ts`, change `computeMagicMissileDamage` to:
      ```
      function computeMagicMissileDamage(spell: SpellItem, castingSL: number, wpBonus?: number, tbBonus?: number): number
      ```
    - Compute: `parseDamageFromEffect(spell.effect, wpBonus, tbBonus) + castingSL`
    - Do NOT add wpBonus again on top
    - _Requirements: 6.1, 6.2_

  - [x] 5.2 Update parseDamageFromEffect
    - Add optional `wpBonus` and `tbBonus` parameters to `parseDamageFromEffect`
    - For "Dmg +N": return N
    - For "Dmg WPB": return wpBonus (or 0 if not provided)
    - For "Dmg TB": return tbBonus (or 0 if not provided)
    - Export the function for testing
    - _Requirements: 6.3_

  - [x] 5.3 Update resolveCastingResult to use corrected formula
    - In the magic missile damage block of `resolveCastingResult`:
    - Call `computeMagicMissileDamage(spell, slAchieved, wpb, tbBonus)` — passing wpb only for `parseDamageFromEffect` resolution, not as additional damage
    - _Requirements: 6.4_

- [x] 6. Fix casting success guard clause
  - [x] 6.1 Add rollResult.passed check to casting
    - In `src/logic/spell-casting.ts`, in `resolveCastingResult`:
    - Change: `const castSuccess = totalPower || slAchieved >= cn;`
    - To: `const castSuccess = totalPower || (rollResult.passed && slAchieved >= cn);`
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 7. Update end-of-turn callers
  - [x] 7.1 Update CombatDashboard to pass TB and lowestAP
    - In `src/components/combat/CombatDashboard.tsx`, compute TB from character characteristics
    - Compute lowestAP from character's worn armour AP values (min across all locations)
    - Pass both to `processEndOfTurn`
    - Remove any Stunned auto-removal UI logic
    - _Requirements: 1.2, 2.5_

  - [x] 7.2 Display end-of-turn reminders in UI
    - In the CombatDashboard end-of-turn results display, show `'reminder'` type effects distinctly (e.g., info/warning style vs. damage effects)
    - Show Ablaze d10 roll details in the damage description
    - _Requirements: 1.4, 2.3, 9.2, 9.3, 9.4, 9.5_

- [x] 8. Write property tests for all fixes
  - [x] 8.1 Property test: Ablaze damage formula
    - For any d10 ∈ [1,10], level ∈ [1,10], TB ∈ [0,10], lowestAP ∈ [0,10]:
    - result = max(1, d10 + (level-1) - TB - lowestAP)
    - Verify wounds decrease by exactly `result` when current wounds > 0
    - Verify wounds remain 0 when already at 0
    - _Validates: Requirements 1.1, 1.2, 1.3_

  - [x] 8.2 Property test: Combat damage with SL
    - For any weaponDmg ∈ [0,20], SL ∈ [-6,10], AP ∈ [0,10], TB ∈ [0,10]:
    - result = max(1, weaponDmg + SL - AP - TB)
    - Verify output is always ≥ 1
    - Verify output increases with SL and decreases with AP/TB
    - _Validates: Requirements 3.1, 3.2_

  - [x] 8.3 Property test: Opposed test tie-breaking
    - When playerSL === opponentSL:
    - If playerTarget > opponentTarget → winner = 'player'
    - If opponentTarget > playerTarget → winner = 'opponent'
    - If equal → winner = 'tie'
    - Roll values must NOT affect the outcome
    - _Validates: Requirements 4.2, 4.3, 4.5_

  - [x] 8.4 Property test: Magic missile damage
    - For any baseDamage ∈ [0,12], SL ∈ [0,10]:
    - result = baseDamage + SL
    - Verify WPB is never added as a separate term
    - _Validates: Requirements 6.1, 6.2_

  - [x] 8.5 Property test: Poisoned end-of-turn damage
    - For any currentWounds > 0, poisonedLevel ∈ [1,10]:
    - wounds decrease by poisonedLevel (floored at 0)
    - When wounds = 0, no further decrease
    - _Validates: Requirements 9.1, 9.6_

  - [x] 8.6 Property test: Condition stackability
    - Applying Stunned/Blinded/Deafened/Poisoned multiple times increments level
    - Level is capped at maxLevel (10)
    - _Validates: Requirements 2.1, 8.1, 8.2, 8.3_

- [x] 9. Fix existing tests affected by changes
  - [x] 9.1 Update existing end-of-turn tests
    - Update any existing property tests in `src/components/combat/__tests__/` that test end-of-turn behaviour
    - Adjust test expectations: Ablaze now uses d10 formula, Stunned no longer auto-removed, Poisoned causes damage
    - Pass required `tb` and `lowestAP` params to processEndOfTurn
    - All existing tests must pass with the new logic

  - [x] 9.2 Update existing attack flow tests
    - Update `AttackFlow.mobile.test.tsx` and any combat tests that call `calculateDamage`
    - Adjust for new signature (weaponDamage + sl instead of SB + weaponBonus + isRanged)
    - All existing tests must pass

  - [x] 9.3 Run full test suite and verify TypeScript compilation
    - Run `npx vitest --run` to verify all tests pass
    - Run `npx tsc --noEmit` to verify no type errors
    - Fix any remaining test failures caused by signature changes

## Notes

- The `calculateDamage` signature change is breaking — all callers must be updated together
- The Surprised auto-removal behaviour is preserved (correct per RAW)
- No data migration needed for save files — condition levels are already stored as numbers
- The `WFRP-Character-Sheet (1).html` file is NOT a source of truth (contains house rules)
- Existing house rule toggle `rangedDamageSBMode` remains unchanged — weapon data is RAW-correct

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "4.1", "4.2", "5.1", "5.2", "6.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "3.1", "5.3"] },
    { "id": 3, "tasks": ["3.2", "3.3", "7.1", "7.2"] },
    { "id": 4, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6"] },
    { "id": 5, "tasks": ["9.1", "9.2", "9.3"] }
  ]
}
```
