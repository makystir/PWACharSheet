# Implementation Plan: Dwarf Weapons

## Overview

This plan updates the weapon catalogue with corrected Dwarf weapon profiles from the Dwarf Players Guide, adds new Engineering-group weapons, introduces BP quality annotations, and fixes the damage calculation and skill resolution logic to properly handle Engineering weapons that can be either melee or ranged based on the presence of a `maxR` property.

## Tasks

- [x] 1. Update Dwarf melee weapon profiles in the catalogue
  - [x] 1.1 Update existing Dwarf melee weapon entries in `src/data/weapons.ts`
    - Update Dwarf Axe: group Basic, enc "1", rangeReach "Average", damage "+SB+4", qualities "Hack"
    - Update Dwarf Warhammer: group Basic, enc "1", rangeReach "Average", damage "+SB+4", qualities "Pummel"
    - Update Whirling Blades of Death: group Flail, enc "3", rangeReach "Long", damage "+SB+5", qualities "Distract, Hack, Impact, Tiring, Wrap"
    - Update (2H) Dwarf Greataxe: group Two-Handed, enc "3", rangeReach "Long", damage "+SB+6", qualities "Hack, Impact, Tiring"
    - Update (2H) Dwarf Greathammer: group Two-Handed, enc "3", rangeReach "Long", damage "+SB+7", qualities "Damaging, Pummel"
    - Update (2H) Dwarf Pick: group Two-Handed, enc "2", rangeReach "Average", damage "+SB+6", qualities "Damaging, Impale"
    - _Requirements: 1.1, 1.4_

  - [x] 1.2 Update existing Engineering melee weapon entries in `src/data/weapons.ts`
    - Update (2H) Steam Drill: group Engineering, enc "3", rangeReach "Short", damage "+SB+6", qualities "Impact, Impale"
    - Update Cog Axe: group Engineering, enc "2", rangeReach "Average", damage "+SB+4", qualities "Hack, Penetrating, Trap Blade"
    - Update Steam Gauntlet: group Engineering, enc "2", rangeReach "Very Short", damage "+SB+7", qualities "Pummel, Shield 1"
    - _Requirements: 1.2, 1.4_

  - [x] 1.3 Write unit tests for Dwarf melee weapon catalogue entries
    - Verify each updated melee weapon has correct damage, qualities, enc, and rangeReach values
    - Test in `src/logic/__tests__/weapons.test.ts`
    - _Requirements: 1.1, 1.2_

- [x] 2. Update Dwarf ranged weapon profiles in the catalogue
  - [x] 2.1 Update existing Dwarf ranged weapon entries in `src/data/weapons.ts`
    - Update (2H) Dwarf Handgun: group Blackpowder, enc "2", maxR "50", optR "16", rangeMod "10", damage "+10", qualities "Damaging, Impale, Penetrating, Reload 3, BP"
    - Update Dwarf Pistol: group Blackpowder, enc "0", maxR "20", optR "6", rangeMod "4", damage "+10", qualities "Damaging, Impale, Penetrating, Pistol, Reload 1, BP"
    - Update (2H) Dwarf Crossbow: group Crossbow, enc "2", maxR "80", optR "26", rangeMod "16", damage "+10", qualities "Impale, Precise, Damaging, Reload 1"
    - Update Dwarf Throwing Axe: group Throwing, maxR "SBx2", damage "+SB+4", qualities "Hack"
    - Update (2H) Drakegun: group Engineering, enc "3", maxR "30", optR "10", rangeMod "6", damage "+12", qualities "Blast 6, Damaging, Dangerous, Penetrating, Reload 4, BP"
    - Update Drakefire Pistol: group Engineering, enc "1", maxR "20", optR "6", rangeMod "4", damage "+11", qualities "Blast 3, Damaging, Dangerous, Penetrating, Pistol, Reload 4, BP"
    - Update Trollhammer Torpedo: group Engineering, enc "3", maxR "40", optR "13", rangeMod "8", damage "+14", qualities "Dangerous, Impact, Reload 6"
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 2.2 Add new Dwarf ranged weapon entries in `src/data/weapons.ts`
    - Move (2H) Repeating Dwarf Handgun from Blackpowder to Engineering group: enc "3", maxR "50", optR "16", rangeMod "10", damage "+10", qualities "Damaging, Dangerous, Impale, Penetrating, Reload 4, Repeater 3"
    - Move (2H) Grudge-raker from Blackpowder to Engineering group: enc "2", maxR "30", optR "10", rangeMod "6", damage "+10", qualities "Damaging, Dangerous, Impale, Penetrating, Reload 3, Salvo 2, Spread 3"
    - Update Blasting Charge: group Explosives, enc "0", maxR "SB", damage "+12", qualities "Blast 2, Dangerous, Impact, Penetrating"
    - Update Cinderblast Bomb: group Explosives, enc "0", maxR "SBx2", damage "+10", qualities "Blast 5, Dangerous, Impact, Penetrating"
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [x] 2.3 Write unit tests for Dwarf ranged weapon catalogue entries
    - Verify each updated ranged weapon has correct damage, maxR, optR, rangeMod, enc, and qualities values
    - Verify optR and rangeMod derivations for numeric maxR weapons
    - Test in `src/logic/__tests__/weapons.test.ts`
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 3. Add BP quality to all Blackpowder-group weapons
  - [x] 3.1 Annotate BP quality on Blackpowder and Drakefire weapons in `src/data/weapons.ts`
    - Ensure every weapon with group "Blackpowder" has "BP" in its qualities string (check existing entries: Blunderbuss, Long Rifle, Handgun, Pistol, Matchlock Handgun, Matchlock Blunderbuss, Arquebus, Double-barrelled Handgun, Griffonsfoot Pistol, Gun Axe, Gun Halberd, and all Dwarf Blackpowder entries)
    - Ensure (2H) Drakegun and Drakefire Pistol (Engineering group) have "BP" in qualities
    - Ensure no other weapons outside Blackpowder group and Drakefire weapons have "BP"
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 3.2 Write property test for BP quality annotation invariant
    - **Property 7: BP quality annotation invariant**
    - Iterate all WEAPONS entries; verify "BP" present ↔ (group is "Blackpowder" OR name is "(2H) Drakegun" or "Drakefire Pistol")
    - Test in `src/logic/__tests__/weapons.property.test.ts`
    - **Validates: Requirements 6.1, 6.4**

- [x] 4. Checkpoint - Verify catalogue updates
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update skill resolution for Engineering weapons
  - [x] 5.1 Update `findSkillForWeapon` in `src/logic/weapons.ts` to handle Engineering weapons
    - Add special case: if `weapon.group === 'Engineering'` and `weapon.maxR` is defined, search for `Ranged (Engineering)` skill and return null if not found
    - If `weapon.group === 'Engineering'` and `weapon.maxR` is not defined, search for `Melee (Engineering)` skill with fallback to `Melee (Basic)`
    - Verify that RANGED_GROUPS does not include "Engineering" (should already be excluded)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 5.2 Write property test for Engineering weapon skill resolution
    - **Property 5: Engineering weapon skill resolution**
    - Generate Engineering weapons with/without maxR and random skill lists; verify correct skill resolution logic
    - Test in `src/logic/__tests__/weapons.property.test.ts`
    - **Validates: Requirements 4.1, 4.2, 4.4**

  - [x] 5.3 Write unit tests for Engineering skill resolution edge cases
    - Test ranged Engineering weapon with no Ranged (Engineering) skill returns null
    - Test melee Engineering weapon with no Melee (Engineering) falls back to Melee (Basic)
    - Test RANGED_GROUPS does not contain "Engineering"
    - Test in `src/logic/__tests__/weapons.test.ts`
    - _Requirements: 4.3, 4.4_

- [x] 6. Update damage calculation for Engineering weapons
  - [x] 6.1 Update `calcWeaponDamage` in `src/logic/weapons.ts` to classify Engineering weapons correctly
    - Change ranged classification: `const ranged = RANGED_GROUPS.includes(weapon.group) || (weapon.group === 'Engineering' && !!weapon.maxR)`
    - This ensures Engineering weapons with maxR get Accurate Shot + Sure Shot bonuses and rangedDamageSBMode house rule
    - Engineering weapons without maxR continue to get Strike Mighty Blow bonus
    - Verify damage returns `{ num: null, breakdown: '' }` for "—" or empty damage strings
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 6.2 Write property test for damage calculation correctness
    - **Property 6: Damage calculation correctness**
    - Generate random (SB, damage formula, talents, runes, rangedDamageSBMode) combinations; verify calcWeaponDamage output matches manual computation, with Engineering+maxR classified as ranged
    - Test in `src/logic/__tests__/weapons.property.test.ts`
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

  - [x] 6.3 Write unit tests for specific damage calculation scenarios
    - Test (2H) Drakegun (+12 flat) applies Accurate Shot and Sure Shot
    - Test Steam Drill (+SB+6 melee) applies Strike Mighty Blow
    - Test rangedDamageSBMode 'halfSB' applies to Engineering ranged weapons
    - Test "—" damage returns null result
    - Test in `src/logic/__tests__/weapons.test.ts`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 7. Checkpoint - Verify logic updates
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Write property tests for catalogue data integrity
  - [x] 8.1 Write property test for encumbrance string invariant
    - **Property 2: Encumbrance string invariant**
    - Iterate all WEAPONS entries; verify enc field matches `/^\d+$/`
    - Test in `src/logic/__tests__/weapons.property.test.ts`
    - **Validates: Requirements 2.4**

  - [x] 8.2 Write property test for range derivation correctness
    - **Property 3: Range derivation correctness**
    - Filter WEAPONS to numeric-maxR entries; verify optR === `Math.floor(parseInt(maxR) / 3).toString()` and rangeMod === `Math.floor(parseInt(maxR) / 5).toString()`
    - Test in `src/logic/__tests__/weapons.property.test.ts`
    - **Validates: Requirements 2.5**

  - [x] 8.3 Write property test for weapon picker field copy correctness
    - **Property 1: Weapon picker field copy correctness**
    - For random weapon entries from WEAPONS, simulate picker selection and verify name, group, enc, rangeReach, damage, and qualities fields are identical to catalogue entry
    - Test in `src/logic/__tests__/weapons.property.test.ts`
    - **Validates: Requirements 1.3**

  - [x] 8.4 Write property test for quality rendering faithfulness
    - **Property 4: Quality rendering faithfulness**
    - Generate weapons with non-empty, non-"—" qualities; render WeaponCards component and verify qualities text matches source data including Salvo, Spread, Crewed ratings
    - Test in `src/logic/__tests__/weapons.property.test.ts`
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 6.3**

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The WeaponCards component requires no code changes since it already renders qualities as plain text from the data
- The `isRanged` check in WeaponCards is display-only (adds "(Ranged)" label) and uses `RANGED_GROUPS` — Engineering ranged weapons will not show this label, which is acceptable since the damage calculation handles them correctly

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3"] },
    { "id": 6, "tasks": ["8.1", "8.2", "8.3", "8.4"] }
  ]
}
```
