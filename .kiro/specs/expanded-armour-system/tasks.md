# Implementation Plan: Expanded Armour System

## Overview

This plan implements the expanded armour rules from Archives of the Empire Vol. III for the WFRP 4e character sheet PWA. The implementation follows a layered approach: data definitions first, then pure logic modules (testable independently), then UI integration, and finally data migration. Each task builds incrementally so that the system is never left in a broken state.

## Tasks

- [x] 1. Define armour type system and quality/flaw data
  - [x] 1.1 Extend type definitions in `src/types/character.ts`
    - Add `ArmourType` type (`'SoftKit' | 'BoiledLeather' | 'Chainmail' | 'Brigandine' | 'Plate'`)
    - Add `armourType?: ArmourType` field to `ArmourItem` interface
    - Add `currentAp?: number` field to `ArmourItem` interface
    - Add `visorOpen?: boolean` field to `ArmourItem` interface
    - Add `useCriticalDeflection: boolean` to `HouseRules` interface
    - _Requirements: 1.6, 5.1, 4.1, 6.1_

  - [x] 1.2 Create `src/data/armourQualities.ts` with quality and flaw definitions
    - Define `ArmourQuality`, `ArmourFlaw`, and `ArmourType` type exports
    - Define `QualityDefinition` interface with `name`, `type`, `description`, `combatEffect` fields
    - Implement `QUALITY_DEFINITIONS` array with all quality/flaw descriptions and combat effect summaries
    - _Requirements: 2.6, 3.4_

  - [x] 1.3 Replace armour database in `src/data/armour.ts` with expanded Archives Vol. III entries
    - Add all Soft Kit entries (Soft Kit, Reinforced Soft Kit, Padding, Aventail) with correct AP, locations, qualities, and `armourType: 'SoftKit'`
    - Add all Boiled Leather entries (Leather Jack, Jerkin, Leggings, Skullcap) with `armourType: 'BoiledLeather'`
    - Add all Chainmail entries (Chausses, Coat, Coif, Shirt) with `armourType: 'Chainmail'`
    - Add all Brigandine entries (Jack, Jerkin) with Overcoat quality and `armourType: 'Brigandine'`
    - Add all Plate entries (Bracers, Breastplate, Open Helm, Plate Leggings, Great Helm, Bascinet, Armet, Sallet) with correct qualities and `armourType: 'Plate'`
    - Remove superseded core-rulebook entries
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. Implement armour layering validation logic
  - [x] 2.1 Create `src/logic/armourLayering.ts` with pure validation functions
    - Implement `validateLayering(items, location)` returning `{ valid, warnings }`
    - Implement `canLayerOver(existing, newPiece, location)` for equip-time checks
    - Implement `calculateEffectiveAP(items, location)` summing current AP of valid layers
    - Implement `isWeakpointsSuppressed(items, location)` checking for Reinforced Soft Kit under Plate
    - Implement layering matrix: Soft Kit under anything, Brigandine/Overcoat Plate over Leather/Chainmail, reject invalid combinations
    - Handle "Requires Kit" warning when no Soft Kit is present
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x] 2.2 Write property test for layering validity (valid combinations accepted)
    - **Property 7: Layering Validity - Valid Combinations Accepted**
    - **Validates: Requirements 8.1, 8.2**

  - [x] 2.3 Write property test for layering invalidity (invalid combinations rejected)
    - **Property 8: Layering Invalidity - Invalid Combinations Rejected**
    - **Validates: Requirements 8.4, 8.5**

  - [x] 2.4 Write property test for Reinforced Soft Kit suppresses Weakpoints
    - **Property 9: Reinforced Soft Kit Suppresses Weakpoints**
    - **Validates: Requirements 8.7, 13.3**

  - [x] 2.5 Write property test for AP summation of layered armour
    - **Property 10: AP Summation for Layered Armour**
    - **Validates: Requirements 8.8**

- [x] 3. Implement armour combat mechanics logic
  - [x] 3.1 Create `src/logic/armourCombat.ts` with pure combat resolution functions
    - Implement `resolveArmourCombatEffects(context)` applying Partial, Impenetrable, and Weakpoints logic
    - Implement `canDeflectCritical(armourItems, location, useCriticalDeflection)` checking eligibility
    - Implement `applyDeflection(item)` reducing currentAp by 1
    - Handle even/odd to-hit roll for Partial bypass and Impenetrable negation
    - Handle Weakpoints + Impale interaction
    - _Requirements: 11.1, 11.2, 12.1, 12.2, 13.1, 6.4, 6.5, 6.6_

  - [x] 3.2 Write property test for Partial flaw combat bypass
    - **Property 12: Partial Flaw Combat Bypass**
    - **Validates: Requirements 11.1, 11.2**

  - [x] 3.3 Write property test for Impenetrable quality critical negation
    - **Property 13: Impenetrable Quality Critical Negation**
    - **Validates: Requirements 12.1, 12.2**

  - [x] 3.4 Write property test for Weakpoints + Impale ignores AP
    - **Property 14: Weakpoints + Impale Ignores AP**
    - **Validates: Requirements 13.1**

  - [x] 3.5 Write property test for Critical Deflection reduces AP by exactly 1
    - **Property 6: Critical Deflection Reduces AP By Exactly 1**
    - **Validates: Requirements 6.5**

  - [x] 3.6 Write property test for damage calculation uses current AP
    - **Property 5: Damage Calculation Uses Current AP**
    - **Validates: Requirements 5.6**

- [x] 4. Implement data migration logic
  - [x] 4.1 Create `src/logic/armourMigration.ts` with migration functions
    - Implement `ARMOUR_NAME_MAP` mapping old core-rulebook names to Archives Vol. III names (e.g., "Mail Coat" → "Chainmail Coat")
    - Implement `migrateArmourItem(item)` setting defaults for `currentAp`, `visorOpen`, `armourType`
    - Implement `migrateCharacterArmour(armour)` applying migration to all items
    - Preserve all existing fields (name, locations, enc, ap, qualities, worn, runes)
    - Clamp invalid `currentAp` values to `[0, ap]`
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 4.2 Write property test for data migration integrity
    - **Property 15: Data Migration Integrity**
    - **Validates: Requirements 14.1, 14.2, 14.4**

- [x] 5. Checkpoint - Ensure all logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Enhance ArmourMap UI with expanded armour display
  - [x] 6.1 Add quality/flaw indicator badges to `ArmourMap.tsx` location cells
    - Display small icons or labels for each quality (Impenetrable, Overcoat, Reinforced, Visor) and flaw (Partial, Requires Kit, Weakpoints) on armour items per location
    - Add tooltip or expandable text for each quality/flaw with its mechanical description from `QUALITY_DEFINITIONS`
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 2.6, 3.4_

  - [x] 6.2 Add visor toggle control and state display to `ArmourMap.tsx`
    - For armour items with the Visor quality, show a toggle button (Open/Closed)
    - When open: show Partial flaw indicator and -10 Perception note, hide helmet special ability
    - When closed: show full AP and all original qualities
    - Persist visor state to character data on toggle
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 6.3 Add armour damage display (current/max AP) and +/- controls to `ArmourMap.tsx`
    - Show "currentAp/ap" format when they differ
    - Show destroyed indicator when currentAp = 0
    - Add -1 AP button (disabled when currentAp = 0)
    - Add +1 AP button (disabled when currentAp = max ap)
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.7_

  - [x] 6.4 Add layering warnings and total effective AP to `ArmourMap.tsx`
    - Show validation warnings for invalid layering combinations (non-blocking)
    - Show "Requires Kit" warning when plate has no Soft Kit underneath
    - Display total effective AP per location from `calculateEffectiveAP`
    - Suppress Weakpoints display when Reinforced Soft Kit is underneath
    - _Requirements: 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x] 6.5 Add stealth penalty badge and helmet special ability labels to `ArmourMap.tsx`
    - Display "-10 Stealth" badge when any Chainmail or Plate is worn (always visible, no expand needed)
    - Display helmet special ability labels (Bascinet: +1 AP frontal missile, Armet: damage resistance, Sallet: -1 Critical Wound)
    - _Requirements: 9.1, 9.2, 9.3, 7.1, 7.5, 7.6_

  - [x] 6.6 Add expandable "Repair Info" section to `ArmourMap.tsx`
    - Show Trade Skill required per armour type
    - Show SLs needed per AP restoration
    - Show NPC repair cost formula
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 6.7 Write property test for quality and flaw indicator completeness
    - **Property 1: Quality and Flaw Indicator Completeness**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3**

  - [x] 6.8 Write property test for stealth penalty display logic
    - **Property 11: Stealth Penalty Display Logic**
    - **Validates: Requirements 9.1, 9.2**

- [x] 7. Enhance TakeDamagePanel with expanded combat interactions
  - [x] 7.1 Add to-hit roll Even/Odd selector and Impale toggle to `TakeDamagePanel.tsx`
    - Add Even/Odd radio buttons or toggle for to-hit roll parity
    - Add Impale weapon quality toggle checkbox
    - Default to Odd (safe default per error handling spec)
    - _Requirements: 11.3, 12.3, 13.2_

  - [x] 7.2 Integrate armour combat effects into TakeDamagePanel damage calculation
    - Call `resolveArmourCombatEffects` with context built from current UI state
    - Display Partial bypass indicator when Partial armour is bypassed
    - Display Impenetrable critical negation note when applicable
    - Display Weakpoints bypass indicator when Weakpoints + Impale triggers
    - Use `currentAp` values (not base `ap`) for all damage reduction calculations
    - _Requirements: 11.1, 11.2, 12.1, 12.2, 13.1, 5.6_

  - [x] 7.3 Add Critical Deflection button and logic to `TakeDamagePanel.tsx`
    - Show "Deflect Critical" button only when `useCriticalDeflection` is true AND armour at location has currentAp > 0 AND a Critical Wound was triggered
    - On click: reduce armour currentAp by 1, cancel Critical Wound
    - Hide/disable button when conditions not met
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.8, 6.9_

  - [x] 7.4 Add helmet special ability interactions to `TakeDamagePanel.tsx`
    - Bascinet: show +1 AP note for frontal missile hits (require player toggle for "frontal missile" context)
    - Armet: show d10 damage table prompt when Armet would lose AP, with result input (1-5 damaged, 6-9 not, 10 jammed)
    - Sallet: display note that Critical Hits deal 1 less Wound
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 8. Add Critical Deflection house rule toggle to Settings page
  - [x] 8.1 Add `useCriticalDeflection` toggle to the Settings/House Rules section
    - Add toggle in Optional Mechanics section with description "Sacrifice 1 AP to ignore a Critical Wound (Archives Vol. III)"
    - Default to `false` in blank character template
    - Persist immediately on toggle
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 9. Integrate data migration into character loading
  - [x] 9.1 Wire `migrateCharacterArmour` into the character load/hydration path
    - Call migration on character load when armour items lack expanded fields
    - Ensure `useCriticalDeflection` defaults to `false` when missing from loaded data
    - Apply name mapping for renamed armour entries
    - Preserve all existing data during migration
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Wire components together and integration testing
  - [x] 11.1 Connect ArmourMap to character state for AP damage persistence
    - Wire +/- AP controls to update `currentAp` in character state
    - Wire visor toggle to persist `visorOpen` in character state
    - Ensure ArmourMap reads `currentAp` for display and passes it to TakeDamagePanel
    - _Requirements: 5.4, 5.5, 5.6, 4.7_

  - [x] 11.2 Connect TakeDamagePanel to expanded armour state
    - Pass armour items with `currentAp`, qualities, and `armourType` to TakeDamagePanel
    - Ensure net wound calculation uses effective AP from `resolveArmourCombatEffects`
    - Wire Critical Deflection to update armour state and cancel critical wound flow
    - _Requirements: 5.6, 6.5, 6.6, 11.1, 12.1, 13.1_

  - [x] 11.3 Write integration tests for full combat flow with expanded armour
    - Test: layered armour damage → correct wound calculation with currentAp
    - Test: Critical Deflection end-to-end (house rule on → take critical → deflect → AP reduced)
    - Test: migration on character load → correct expanded format
    - _Requirements: 5.6, 6.4, 6.5, 6.6, 14.1, 14.4_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Pure logic modules (armourLayering, armourCombat, armourMigration) are implemented before UI to enable property-based testing independently of React rendering
- The existing `fast-check` and `vitest` dependencies are already available in devDependencies

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3"] },
    { "id": 2, "tasks": ["2.1", "3.1", "4.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "2.5", "3.2", "3.3", "3.4", "3.5", "3.6", "4.2"] },
    { "id": 4, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "7.1", "8.1", "9.1"] },
    { "id": 5, "tasks": ["7.2", "7.3", "7.4"] },
    { "id": 6, "tasks": ["6.7", "6.8", "11.1", "11.2"] },
    { "id": 7, "tasks": ["11.3"] }
  ]
}
```
