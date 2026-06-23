# Implementation Plan: Expanded Rune Categories

## Overview

This plan implements three new rune categories (Protection, Engineering, Doom) for the Dwarf Runesmith system. The implementation proceeds bottom-up: type extensions → catalogue data → validation logic → learning prerequisites → character migration → UI components → tests. Each category has distinct placement targets (communal items, artillery, Anvil of Doom) and new validation modules are added alongside existing ones without modifying current weapon/armour/talisman behaviour.

## Tasks

- [x] 1. Extend data models and type definitions
  - [x] 1.1 Extend `RuneCategory` type and `RuneDefinition` interface in `src/data/runes.ts`
    - Widen `RuneCategory` union to `'weapon' | 'armour' | 'talisman' | 'protection' | 'engineering' | 'doom'`
    - Add optional `slsRequired?: number` field to `RuneDefinition` interface
    - Add optional `isAutoLearned?: boolean` field to `RuneDefinition` interface
    - _Requirements: 1.1, 1.2, 2.2, 2.3, 3.2, 3.3, 4.3, 4.4_

  - [x] 1.2 Add `ProtectionItem`, `EngineeringItem`, and `DoomRuneActivation` interfaces to `src/types/character.ts`
    - Define `ProtectionItem` with fields: id, name, type (union of 'banner' | 'shrine' | 'gatehouse' | 'oathstone' | 'icon' | 'other'), location, runes
    - Define `EngineeringItem` with fields: id, name, type (union of 'Grudge Thrower' | 'Bolt Thrower' | 'Blackpowder Cannon'), runes
    - Define `DoomRuneActivation` with fields: runeId, timestamp, label
    - Extend `Character` interface with optional `protectionItems?: ProtectionItem[]`, `engineeringItems?: EngineeringItem[]`, `doomRuneActivations?: DoomRuneActivation[]`, `forgingCharges?: Record<string, number>`
    - _Requirements: 9.1, 10.1, 7.2, 11.1_

- [x] 2. Add Protection Rune catalogue entries to `src/data/runes.ts`
  - [x] 2.1 Add 11 non-master Protection Runes to RUNE_CATALOGUE
    - Add entries for: protection-rune-of-alarm, protection-rune-of-battle, protection-rune-of-courage, protection-rune-of-discovery, protection-rune-of-enemy-detection, protection-rune-of-locking, protection-rune-of-purification, protection-rune-of-retribution, protection-rune-of-sanctuary, protection-rune-of-slowness, protection-rune-of-verminkill
    - Each entry: category 'protection', isMaster false, maxPerItem 1, xpCost 50, slsRequired per DPG values, effects array with at least one entry, non-empty description
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.2 Add 5 master Protection Runes to RUNE_CATALOGUE
    - Add entries for: protection-master-rune-of-expel-chaos, protection-master-rune-of-grimnir, protection-master-rune-of-grungni, protection-master-rune-of-stromni-redbeard, protection-master-rune-of-valaya
    - Each entry: category 'protection', isMaster true, maxPerItem 1, xpCost 100, slsRequired per DPG values, effects array, non-empty description
    - _Requirements: 2.1, 2.2, 2.4_

- [x] 3. Add Engineering Rune catalogue entries to `src/data/runes.ts`
  - [x] 3.1 Add 8 non-master Engineering Runes to RUNE_CATALOGUE
    - Add entries for: engineering-rune-of-accuracy, engineering-rune-of-burning, engineering-rune-of-forging, engineering-rune-of-penetrating, engineering-rune-of-reloading, engineering-rune-of-seeking, engineering-rune-of-the-stalwart, engineering-rune-of-the-valiant
    - Each entry: category 'engineering', isMaster false, maxPerItem 1, xpCost 50, slsRequired per DPG values, effects array, non-empty description
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Add 4 master Engineering Runes to RUNE_CATALOGUE
    - Add entries for: engineering-master-rune-of-defence, engineering-master-rune-of-disguise, engineering-master-rune-of-immolation, engineering-master-rune-of-skewering
    - Each entry: category 'engineering', isMaster true, maxPerItem 1, xpCost 100, slsRequired per DPG values, effects array, non-empty description
    - _Requirements: 3.1, 3.2, 3.5_

- [x] 4. Add Doom Rune catalogue entries to `src/data/runes.ts`
  - [x] 4.1 Add 3 Doom Runes to RUNE_CATALOGUE
    - Add entries for: rune-of-hearth-and-home, rune-of-oath-and-steel, rune-of-wrath-and-ruin
    - Each entry: category 'doom', isMaster false, xpCost 0, maxPerItem 0, isAutoLearned true, effects as single-element array with type 'special', non-empty description
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. Checkpoint - Data layer verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Protection Rune validation logic
  - [x] 6.1 Create `src/logic/protectionRunes.ts` with validation functions
    - Implement `validateProtectionPlacement(runeId: string, item: ProtectionItem): RuneValidationResult`
      - Enforce max 3 runes per item
      - Enforce max 1 master rune per item
      - Reject runes not in 'protection' category
      - Reject unknown rune IDs
    - Implement `getAvailableProtectionRunes(knownRunes: string[]): RuneDefinition[]`
      - Return known runes filtered to category 'protection'
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 6.2 Write property tests for Protection placement (Properties 5, 6)
    - **Property 5: Protection placement capacity and master-rune limit**
    - **Property 6: Protection item category exclusivity**
    - Test file: `src/logic/__tests__/protectionRunes.property.test.ts`
    - Create `arbitraryProtectionItem()` generator
    - Create `arbitraryRuneId('protection')` generator
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

- [x] 7. Implement Engineering Rune validation logic
  - [x] 7.1 Create `src/logic/engineeringRunes.ts` with validation and forging functions
    - Implement `validateEngineeringPlacement(runeId: string, item: EngineeringItem): RuneValidationResult`
      - Enforce max 3 runes per item
      - Enforce max 1 master rune per item
      - Reject runes not in 'engineering' category
      - Reject unknown rune IDs
    - Implement `getAvailableEngineeringRunes(knownRunes: string[]): RuneDefinition[]`
    - Implement `calculateForgingCharges(item: EngineeringItem): number`
    - Implement `activateRuneOfForging(item: EngineeringItem, forgingCharges: Record<string, number>): { success: boolean; error?: string; updatedCharges: Record<string, number> }`
    - Implement `resetForgingCharges(items: EngineeringItem[]): Record<string, number>`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 7.2 Write property tests for Engineering placement and forging (Properties 7, 8, 14, 15)
    - **Property 7: Engineering placement capacity and master-rune limit**
    - **Property 8: Engineering item category exclusivity**
    - **Property 14: Rune of Forging charge calculation**
    - **Property 15: Rune of Forging activation and depletion**
    - Test file: `src/logic/__tests__/engineeringRunes.property.test.ts`
    - Create `arbitraryEngineeringItem()` generator
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 11.1, 11.2, 11.3, 11.4, 11.5**

- [x] 8. Implement Doom Rune logic
  - [x] 8.1 Create `src/logic/doomRunes.ts` with availability and activation functions
    - Implement `getDoomRunesForCharacter(knownRunes: string[]): RuneDefinition[]`
      - Return all 3 doom runes if character knows any master rune, else empty array
    - Implement `shouldAutoLearnDoomRunes(knownRunes: string[], talents: Talent[]): boolean`
      - Return true if character has Master Rune Magic talent and does not already know all doom runes
    - Implement `activateDoomRune(runeId: string, currentActivations: DoomRuneActivation[]): { success: boolean; error?: string; activation?: DoomRuneActivation }`
      - Reject if already activated this session; append new activation entry otherwise
    - Implement `isDoomRuneUsedThisSession(runeId: string, activations: DoomRuneActivation[]): boolean`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.5_

  - [x] 8.2 Write property tests for Doom Rune logic (Properties 9, 10, 13)
    - **Property 9: Doom Rune availability follows master rune knowledge**
    - **Property 10: Doom Rune single-activation enforcement**
    - **Property 13: Doom Rune auto-learning trigger**
    - Test file: `src/logic/__tests__/doomRunes.property.test.ts`
    - Create `arbitraryDoomActivations()` generator
    - Create `arbitraryCharacterWithTalents(talents)` generator
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.5, 8.5**

- [x] 9. Update `canLearnRune` with new category prerequisites
  - [x] 9.1 Extend `canLearnRune` in `src/logic/runes.ts` for protection/engineering/doom prerequisites
    - Add check: if rune category is 'doom', reject with message about auto-granting
    - Add check: if rune category is 'protection' (non-master), require talent "Rune Magic" with "(Protection Runes)" or "(All Forms)"
    - Add check: if rune category is 'protection' (master), require "Master Rune Magic" with "(Protection Runes)", "(Protective Runes)", or "(All Forms)"
    - Add check: if rune category is 'engineering' (non-master), require "Rune Magic" with "(Engineering Runes)" or "(All Forms)"
    - Add check: if rune category is 'engineering' (master), require "Master Rune Magic" with "(Engineering Runes)" or "(All Forms)"
    - Ensure bare "Rune Magic" (no parenthetical) does NOT satisfy protection/engineering prerequisites
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6, 8.7_

  - [x] 9.2 Write property tests for learning prerequisites (Properties 11, 12)
    - **Property 11: Learning prerequisites for Protection and Engineering runes**
    - **Property 12: Doom Runes cannot be learned individually**
    - Test file: `src/logic/__tests__/canLearnRune.property.test.ts`
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.6, 8.7**

- [x] 10. Checkpoint - Logic layer verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement backward-compatible character loading and migration
  - [x] 11.1 Update character loading/migration logic to initialise new fields
    - Ensure `protectionItems` defaults to `[]` when missing from stored data
    - Ensure `engineeringItems` defaults to `[]` when missing from stored data
    - Ensure `doomRuneActivations` defaults to `[]` when missing from stored data
    - Ensure `forgingCharges` defaults to `{}` when missing from stored data
    - Preserve all existing fields unchanged during migration
    - _Requirements: 13.1, 13.5_

  - [x] 11.2 Update `getAvailableRunesForItem` to exclude new categories
    - Ensure 'protection', 'engineering', 'doom' category runes are never returned for weapon/armour item types
    - Existing talisman/weapon/armour filtering logic remains unchanged
    - _Requirements: 13.2, 13.3, 13.4_

  - [x] 11.3 Write property tests for backward compatibility (Properties 1, 19, 20)
    - **Property 1: Category filtering correctness**
    - **Property 19: Backward-compatible character loading**
    - **Property 20: getAvailableRunesForItem excludes new categories**
    - Test file: `src/logic/__tests__/runeCategories.property.test.ts`
    - **Validates: Requirements 1.5, 13.1, 13.3, 13.4, 13.5**

- [x] 12. Write catalogue structural property tests
  - [x] 12.1 Write property tests for catalogue invariants (Properties 2, 3, 4)
    - **Property 2: Protection rune structural invariants**
    - **Property 3: Engineering rune structural invariants**
    - **Property 4: Doom rune structural invariants**
    - Test file: `src/logic/__tests__/runeCategories.property.test.ts`
    - **Validates: Requirements 2.2, 2.3, 3.2, 3.3, 3.4, 4.3, 4.4**

  - [x] 12.2 Write property tests for item creation/edit/removal (Properties 16, 17, 18)
    - **Property 16: Item creation name validation**
    - **Property 17: Item edit preserves identity and runes**
    - **Property 18: Engineering item removal preserves knownRunes**
    - Test file: `src/logic/__tests__/runeCategories.property.test.ts`
    - **Validates: Requirements 9.2, 9.3, 9.4, 10.2, 10.3, 10.4**

- [x] 13. Checkpoint - All logic and property tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement UI components for rune categories
  - [x] 14.1 Create `src/components/runes/RunePanel.tsx` tabbed container
    - Implement 6-tab interface: Weapon, Armour, Talisman, Protection, Engineering, Doom
    - Use controlled tab state with URL hash or local state
    - Match existing component patterns (CSS modules, accessibility attributes)
    - _Requirements: 12.1_

  - [x] 14.2 Create `src/components/runes/ProtectionRuneSection.tsx`
    - Display known Protection Runes list with name, effects summary, SLs Required
    - Display Protection Items list with name, type, location, inscribed runes, slots remaining
    - Add/edit/remove Protection Items with name validation (1-100 chars) and type selection
    - Rune inscription UI: select rune from available list, validate placement
    - Show confirmation dialog on item removal with inscribed rune count warning
    - Empty state when no runes known and no items added
    - Enforce max 20 items limit
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 12.2, 12.6_

  - [x] 14.3 Create `src/components/runes/EngineeringRuneSection.tsx`
    - Display known Engineering Runes list with name, effects summary, SLs Required
    - Display Engineering Items list with name, type, inscribed runes, descriptions
    - Show Rune of Forging charge counters per item (remaining/total)
    - Charge activation button (decrement) and adventure-reset button
    - Add/remove Engineering Items with name validation
    - Enforce max 20 items limit
    - Empty state when no runes known and no items added
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 12.3_

  - [x] 14.4 Create `src/components/runes/DoomRuneSection.tsx`
    - Display 3 Doom Runes with name, full effect description, test difficulty label, Anvil requirement note
    - Activation button per rune; disable after use in current session
    - Locked state with message when character has no master rune known
    - _Requirements: 7.4, 12.4, 12.5_

- [x] 15. Wire UI components into existing pages
  - [x] 15.1 Integrate RunePanel into the character page/rune management area
    - Import and render RunePanel with character state connections
    - Connect Protection/Engineering/Doom sections to character data (read/write)
    - Ensure reactive updates when runes are inscribed, items added/removed, or forging charges change
    - _Requirements: 12.1, 12.6_

  - [x] 15.2 Write unit tests for UI components
    - Test: RunePanel renders 6 tabs
    - Test: DoomSection shows locked state when no master rune known
    - Test: ProtectionSection shows empty state message
    - Test: EngineeringSection displays forging charge counters
    - Test: Item removal confirmation dialog appears with correct rune count
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [x] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 20 correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- Protection Rune IDs are prefixed with `protection-` to distinguish from existing personal runes with the same names (e.g. "Rune of Alarm" exists in both talisman and protection categories)
- Engineering Rune IDs are prefixed with `engineering-` for the same reason
- The `forgingCharges` record uses Engineering Item IDs as keys
- All new Character fields are optional with empty defaults for backward compatibility

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1", "3.2", "4.1"] },
    { "id": 2, "tasks": ["6.1", "7.1", "8.1"] },
    { "id": 3, "tasks": ["6.2", "7.2", "8.2", "9.1"] },
    { "id": 4, "tasks": ["9.2", "11.1", "11.2"] },
    { "id": 5, "tasks": ["11.3", "12.1", "12.2"] },
    { "id": 6, "tasks": ["14.1"] },
    { "id": 7, "tasks": ["14.2", "14.3", "14.4"] },
    { "id": 8, "tasks": ["15.1"] },
    { "id": 9, "tasks": ["15.2"] }
  ]
}
```
