# Implementation Plan: Combat Rules Compliance

## Overview

Implement six combat rules compliance fixes across the existing TakeDamagePanel, AttackFlow, and CombatDashboard components, with supporting pure-function logic in `armourCombat.ts`, `combat.ts`, and `weapons.ts`. Each fix adds a toggle or display, wired to pure calculation functions that are tested with property-based tests.

## Tasks

- [x] 1. Implement Penetrating weapon quality logic and UI
  - [x] 1.1 Add `isMetallicArmour` helper and `resolvePenetratingEffect` function in `src/logic/armourCombat.ts`
    - Implement `isMetallicArmour(armourType)` classifying Chainmail/Brigandine/Plate as metallic, SoftKit/BoiledLeather as non-metallic
    - Implement `resolvePenetratingEffect(armourItems, baseEffectiveAP, penetratingEnabled)` returning effective AP and notes
    - Non-metallic items get AP set to 0; metallic items get AP reduced by 1 (min 0 per item)
    - When disabled, return baseEffectiveAP unchanged
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Write property tests for Penetrating quality (Properties 1 & 2)
    - **Property 1: Penetrating zeroes non-metallic and reduces metallic AP**
    - **Property 2: Penetrating disabled preserves standard AP**
    - Create `src/logic/__tests__/penetrating.property.test.ts`
    - Use fast-check to generate arbitrary armour item arrays with varying types and AP values
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

  - [x] 1.3 Add Penetrating toggle UI and integration in `src/components/combat/TakeDamagePanel.tsx`
    - Add `penetratingEnabled` state hook
    - Render "Penetrating" checkbox toggle after existing Impale toggle
    - Call `resolvePenetratingEffect` in the effective AP calculation path
    - Display note indicating which armour was ignored/reduced when active
    - _Requirements: 1.6, 1.7_

- [x] 2. Implement Damaging weapon quality logic and UI
  - [x] 2.1 Add `hasWeaponQuality` helper in `src/logic/weapons.ts`
    - Parse the weapon's comma-separated qualities string for a case-insensitive match
    - Return boolean indicating presence of the named quality
    - _Requirements: 2.5_

  - [x] 2.2 Add `calculateDamagingSL` function in `src/logic/combat.ts`
    - Accept `roll` (d100 result) and `sl` (standard success levels)
    - Compute `unitsDigit = roll % 10`
    - Return `{ effectiveSL: max(unitsDigit, sl), unitsDigit, originalSL: sl, used: 'units' | 'sl' }`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.3 Write property tests for Damaging quality (Properties 3 & 4)
    - **Property 3: Damaging effective SL equals max of units digit and SL**
    - **Property 4: Non-Damaging weapons use unmodified SL**
    - Create `src/logic/__tests__/damaging.property.test.ts`
    - Use fast-check to generate arbitrary roll values (1–100) and SL values
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5, 2.6**

  - [x] 2.4 Integrate Damaging quality into `src/components/combat/AttackFlow.tsx`
    - In Step 4 (damage calculation), detect "Damaging" quality via `hasWeaponQuality`
    - If present and hit is successful, call `calculateDamagingSL` and use `effectiveSL`
    - Display breakdown showing original SL, units digit, and chosen effective SL
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

- [x] 3. Implement Shield Rating as defensive AP
  - [x] 3.1 Add `parseShieldRating` and `findEquippedShield` functions in `src/logic/combat.ts`
    - `parseShieldRating(weapon)`: parse "Shield Rating X" or "Rating X" from qualities string, return numeric rating (0 if not found)
    - `findEquippedShield(weapons)`: find weapon with "Shield" in its group field
    - _Requirements: 3.3_

  - [x] 3.2 Write property test for Shield Rating (Property 5)
    - **Property 5: Shield toggle adds Rating to effective AP**
    - Create `src/logic/__tests__/shieldRating.property.test.ts`
    - Generate arbitrary shield ratings and verify AP addition when enabled, no addition when disabled
    - **Validates: Requirements 3.2, 3.3, 3.5**

  - [x] 3.3 Add "Defended with Shield" toggle and integration in `src/components/combat/TakeDamagePanel.tsx`
    - Add `defendedWithShield` state hook
    - Conditionally render toggle only when `findEquippedShield` returns a shield
    - When enabled, add parsed shield rating to effective AP
    - Display shield AP contribution in the AP breakdown
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6_

- [x] 4. Checkpoint - Core defensive mechanics
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Ranged into Melee penalty
  - [x] 5.1 Add "Target Engaged in Melee" toggle and -20 modifier in `src/components/combat/AttackFlow.tsx`
    - Add `targetEngagedInMelee` state hook
    - Render toggle only when a ranged weapon is selected
    - When enabled, apply flat -20 to `modifiedTarget` independently of character's own engaged state
    - Display label explaining the -20 penalty source
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_

  - [x] 5.2 Write property test for Ranged into Melee (Property 6)
    - **Property 6: Ranged-into-melee penalty depends only on target toggle**
    - Create `src/logic/__tests__/rangedIntoMelee.property.test.ts`
    - Generate arbitrary combinations of toggle state and character engaged state
    - Verify -20 is applied iff toggle is enabled, regardless of character's engaged flag
    - **Validates: Requirements 4.2, 4.3, 4.5**

- [x] 6. Implement Movement display in Combat Dashboard
  - [x] 6.1 Add Walk and Run distance display in `src/components/combat/CombatDashboard.tsx`
    - Read `character.move.m` value
    - Display Walk = M × 2 yards, Run = M × 4 yards in a compact row in stats area
    - Only render when `inCombat === true`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.2 Write property test for Movement calculation (Property 7)
    - **Property 7: Movement distances are correct multiples**
    - Create `src/logic/__tests__/movement.property.test.ts`
    - Generate arbitrary non-negative movement values
    - Verify Walk = M × 2, Run = M × 4
    - **Validates: Requirements 5.1, 5.2**

- [x] 7. Implement Critical Wound excess damage modifier
  - [x] 7.1 Add `calculateCriticalModifier` function in `src/logic/combat.ts`
    - Accept netWounds, currentWounds, toughnessBonus
    - If netWounds <= currentWounds (no critical), return null
    - Calculate excessDamage = netWounds - currentWounds
    - If excess < TB: modifier = -20; if excess >= TB: modifier = 0
    - Return `{ excessDamage, toughnessBonus, modifier, description }`
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 7.2 Write property test for Critical Wound modifier (Property 8)
    - **Property 8: Critical wound modifier determined by excess vs TB**
    - Create `src/logic/__tests__/criticalModifier.property.test.ts`
    - Generate arbitrary netWounds, currentWounds, and TB values
    - Verify modifier is -20 when excess < TB, 0 when excess >= TB, null when no critical
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.5**

  - [x] 7.3 Integrate Critical Wound notification in `src/components/combat/TakeDamagePanel.tsx`
    - After netWounds calculation, call `calculateCriticalModifier` when netWounds > currentWounds
    - Display notification box showing excess damage, TB, and resulting modifier
    - Only show when critical wound is triggered
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Checkpoint - All individual mechanics complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Integration wiring and final validation
  - [x] 9.1 Verify TakeDamagePanel toggles interact correctly (Penetrating + Shield combined)
    - Ensure Penetrating and Shield toggles compose correctly in the AP calculation pipeline
    - Penetrating applies to armour items first, then shield rating adds on top
    - Write integration test in `src/components/combat/__tests__/TakeDamagePanel.integration.test.tsx`
    - _Requirements: 1.1, 1.2, 3.2, 3.5_

  - [x] 9.2 Write integration test for full AttackFlow with Damaging weapon
    - Test weapon selection → roll → damage calculation with modified SL end-to-end
    - Write test in `src/components/combat/__tests__/AttackFlow.damaging.integration.test.tsx`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 9.3 Write integration test for Critical Wound flow
    - Test damage application → excess calculation → modifier display
    - Write test in `src/components/combat/__tests__/TakeDamagePanel.critical.integration.test.tsx`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 10. Final checkpoint - All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use the existing `fast-check` v4.8.0 + `vitest` setup
- All new logic functions are pure for testability, matching existing project patterns
- UI toggles follow existing patterns in TakeDamagePanel (Impale toggle) and AttackFlow (difficulty selector)
- Checkpoints ensure incremental validation after defensive mechanics and after all mechanics
- The Ranged into Melee modifier (Requirement 4.4) regarding the existing "Hard" difficulty for firing-while-engaged is already implemented — task 5.1 ensures the new toggle does not interfere with it

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.2", "3.1", "6.1", "7.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.3", "2.4", "3.2", "3.3", "5.1", "6.2", "7.2", "7.3"] },
    { "id": 2, "tasks": ["5.2", "9.1"] },
    { "id": 3, "tasks": ["9.2", "9.3"] }
  ]
}
```
