# Implementation Plan: Alternative Channelling Cants

## Overview

This plan implements the Alternative Channelling Cants house rule feature. The approach is: static data catalogue first, then logic module with pure functions, then Character model changes, then the UI components (CantPanel and CantActivationDialog), then integration into SpellCastingPanel and SettingsPage, and finally wiring persistence. Property tests validate core business logic throughout.

## Tasks

- [x] 1. Create static Cant catalogue and type definitions
  - [x] 1.1 Create `src/data/cants.ts` with all 24 Cant entries and type exports
    - Define `COLOUR_LORES` constant array with all 8 colour magic Lore strings
    - Export `ColourLore` type derived from the array
    - Export `CantEntry` interface with fields: id, lore, name, slCost, effect, variableSL
    - Export `CANT_CATALOGUE` array containing all 24 Cants (3 per Lore) with full rules text from Archives of the Empire Vol III
    - Export `WIND_DISPLAY_NAMES` map (e.g., "Lore of Beasts" → "Beasts (Ghur)")
    - Ensure each Lore has exactly one 1-SL, one 2-SL, and one 3-SL Cant
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12_

  - [x] 1.2 Add `LearnedCant` type and `useCants` toggle to Character model
    - In the Character types file, add `LearnedCant` interface with `lore: string` and `cantName: string`
    - Add `learnedCants?: LearnedCant[]` to the Character interface
    - Add `useCants: boolean` to the `HouseRules` interface
    - Update `BLANK_CHARACTER` to include `useCants: false` in houseRules and `learnedCants: []` at character level
    - _Requirements: 1.4, 2.1, 2.2, 8.2_

  - [x] 1.3 Write property test for catalogue structural integrity (Property 13)
    - **Property 13: Catalogue structural integrity**
    - Create `src/data/__tests__/cants.catalogue.property.test.ts`
    - Assert exactly 24 entries, 3 per Lore, each with non-empty id/name/effect, slCost in {1,2,3}
    - Assert each Lore has exactly one of each SL cost
    - **Validates: Requirements 6.1, 6.2**

- [x] 2. Implement core Cant logic module
  - [x] 2.1 Create `src/logic/cants.ts` with pure business logic functions
    - Implement `getSpellCountByLore(character, spellCatalogue)` → Map<string, number>
    - Implement `getPermittedCantSlots(spellCount)` → 0/1/2/3 based on thresholds (0→0, 1-2→1, 3-5→2, 6+→3)
    - Implement `getAggregatedSLByWind(character, spellCatalogue)` → Map<string, number>
    - Implement `canActivateCant(cant, aggregatedSL, alreadyActivatedThisRound)` → boolean
    - Implement `deductSLFromProgress(channellingProgress, lore, slCost, spellCatalogue)` → updated progress array (deduct from highest SL entry first)
    - Implement `validateLearnedCants(learnedCants, cantCatalogue)` → filtered valid entries
    - Implement `getCantsForLore(lore, cantCatalogue)` → CantEntry[]
    - Implement `computeCantState(character, cantCatalogue, spellCatalogue)` → CantPanelState
    - _Requirements: 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.4, 4.6, 5.4, 5.5, 5.6, 7.1, 7.5_

  - [x] 2.2 Write property test for permitted Cant slots threshold (Property 4)
    - **Property 4: Permitted Cant slots threshold**
    - Create `src/logic/__tests__/cants.slots.property.test.ts`
    - Generate random non-negative integers for spell counts
    - Assert: 0→0, 1-2→1, 3-5→2, 6+→3
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.7**

  - [x] 2.3 Write property test for Cant activation gating (Property 7)
    - **Property 7: Cant activation gating**
    - Create `src/logic/__tests__/cants.activation.property.test.ts`
    - Generate random (CantEntry, aggregatedSL, alreadyActivated) triples
    - Assert canActivateCant returns true iff SL ≥ cost AND !alreadyActivated
    - **Validates: Requirements 4.2, 4.4, 5.5**

  - [x] 2.4 Write property test for SL deduction correctness (Property 8)
    - **Property 8: SL deduction correctness**
    - Create `src/logic/__tests__/cants.deduction.property.test.ts`
    - Generate random channellingProgress arrays with valid SL, random slCost values
    - Assert: new aggregated SL = old aggregated SL − cost; other Winds unchanged
    - **Validates: Requirements 4.1**

  - [x] 2.5 Write property test for SL aggregation per Wind (Property 15)
    - **Property 15: SL aggregation per Wind**
    - Create `src/logic/__tests__/cants.aggregation.property.test.ts`
    - Generate random channellingProgress entries referencing spells from multiple Lores
    - Assert: aggregated SL per Wind = sum of accumulatedSL for that Wind's entries; Winds are independent
    - **Validates: Requirements 7.1, 7.5**

  - [x] 2.6 Write property test for invalid entry filtering (Property 17)
    - **Property 17: Invalid entry filtering on load**
    - Create `src/logic/__tests__/cants.validation.property.test.ts`
    - Generate arrays mixing valid and invalid {lore, cantName} pairs
    - Assert: validateLearnedCants returns only valid entries in original order
    - **Validates: Requirements 2.4, 2.5, 8.5**

  - [x] 2.7 Write property test for spell count excludes non-catalogue spells (Property 6)
    - **Property 6: Spell count excludes non-catalogue spells**
    - Create `src/logic/__tests__/cants.spellcount.property.test.ts`
    - Generate characters with mix of catalogue and non-catalogue spell names
    - Assert: only catalogue-matched spells contribute to count per Lore
    - **Validates: Requirements 3.5**

  - [x] 2.8 Write property test for variable SL expenditure bounds (Property 9)
    - **Property 9: Variable SL expenditure bounds**
    - Create `src/logic/__tests__/cants.variablesl.property.test.ts`
    - Generate random (availableSL, wpBonus, slCost) triples for variable-SL Cants
    - Assert: permitted range is [slCost, min(availableSL, wpBonus)]
    - **Validates: Requirements 4.6**

  - [x] 2.9 Write property test for Cant categorization correctness (Property 10)
    - **Property 10: Cant categorization correctness**
    - Create `src/logic/__tests__/cants.categorization.property.test.ts`
    - Generate characters with random learnedCants and spell counts
    - Assert: each Cant is categorized as learned/available/locked correctly
    - **Validates: Requirements 5.2, 5.3**

  - [x] 2.10 Write property test for catalogue lookup correctness (Property 14)
    - **Property 14: Catalogue lookup correctness**
    - Create `src/logic/__tests__/cants.lookup.property.test.ts`
    - For each valid {lore, cantName} pair, assert getCantsForLore returns matching entry
    - **Validates: Requirements 6.11**

- [x] 3. Checkpoint - Ensure all logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Build the CantPanel UI component
  - [x] 4.1 Create `src/components/shared/CantPanel.tsx` and `src/components/shared/CantPanel.module.css`
    - Accept props: character, updateCharacter, currentRound
    - Use `computeCantState` from logic module to derive display state
    - Render Lore groups in alphabetical order by Wind display name
    - Within each group: show aggregated SL, learned Cants (with name, cost, effect), available Cants (learnable indicator), locked Cants (prerequisite message)
    - Implement "Learn" button for available Cants (appends to learnedCants via updateCharacter)
    - Implement "Unlearn" button for learned Cants (removes from learnedCants)
    - Implement "Activate" button for learned Cants (calls deductSLFromProgress, sets round flag)
    - Disable activation buttons when: insufficient SL, or one-Cant-per-round limit reached
    - Display over-limit violation warning and disable all Learn actions when violation exists
    - Show confirmation after activation (Cant name, SL deducted, remaining SL)
    - Reset one-Cant-per-round flag when currentRound prop changes
    - Display current SL and required SL cost on disabled Cants
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.1, 7.2, 7.5_

  - [x] 4.2 Create `src/components/shared/CantActivationDialog.tsx`
    - Accept props: cant, availableSL, wpBonus, onConfirm, onCancel
    - Show numeric input constrained between cant.slCost and min(availableSL, wpBonus)
    - Render Cant name, effect description, and current SL context
    - Call onConfirm with chosen SL amount on submit
    - Only rendered for Cants with `variableSL: true`
    - _Requirements: 4.6_

  - [x] 4.3 Write unit tests for CantPanel
    - Create `src/components/shared/__tests__/CantPanel.test.tsx`
    - Test: Lore groups render in alphabetical order
    - Test: learned Cant shows name, SL cost, effect
    - Test: available Cant shows learnable indicator
    - Test: locked Cant shows prerequisite message
    - Test: Learn button calls updateCharacter correctly
    - Test: Activate button deducts SL and shows confirmation
    - Test: Activation disabled when SL insufficient
    - Test: All activation disabled after one Cant activated per round
    - Test: Round change re-enables activation
    - Test: Over-limit warning displayed and Learn disabled
    - _Requirements: 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.5, 5.6_

- [x] 5. Integrate CantPanel into existing UI
  - [x] 5.1 Add "Alternative Channelling Cants" toggle to SettingsPage
    - In the house rules section of SettingsPage, add a toggle for `useCants`
    - Label: "Alternative Channelling Cants"
    - Follow the same pattern as existing toggles (usePsychologyTracker, useEnterprises, etc.)
    - _Requirements: 1.1, 1.4_

  - [x] 5.2 Render CantPanel inside SpellCastingPanel
    - Conditionally render CantPanel when `houseRules.useCants` is true AND character has at least one colour magic spell
    - Place CantPanel after the memorized spells list for each corresponding Lore group
    - Pass character, updateCharacter, and currentRound props
    - Ensure panel does not render when toggle is false or character has no colour magic spells
    - _Requirements: 1.2, 1.3, 1.6, 7.3, 7.4_

  - [x] 5.3 Write integration tests for CantPanel visibility and toggle behaviour
    - Create `src/components/shared/__tests__/CantPanel.visibility.test.tsx`
    - Test: CantPanel renders when useCants=true and character has colour magic spells
    - Test: CantPanel does not render when useCants=false
    - Test: CantPanel does not render when character has no colour magic spells
    - Test: CantPanel positioned within SpellCastingPanel
    - **Validates Property 1: CantPanel visibility biconditional**
    - _Requirements: 1.2, 1.3, 1.6, 7.3_

- [x] 6. Implement data persistence and migration
  - [x] 6.1 Ensure deep-merge backfills learnedCants and useCants on character load
    - Verify that existing `deepMerge` with `BLANK_CHARACTER` handles missing `learnedCants` (backfills as []) and missing `useCants` (backfills as false)
    - Add `validateLearnedCants` call during character load to filter invalid entries
    - Ensure toggling useCants to false does not delete learnedCants on save
    - _Requirements: 1.4, 1.5, 2.5, 8.1, 8.2, 8.5, 8.6_

  - [x] 6.2 Write property test for serialization round-trip (Property 16)
    - **Property 16: learnedCants serialization round-trip**
    - Create `src/logic/__tests__/cants.roundtrip.property.test.ts`
    - Generate valid learnedCants arrays (entries from catalogue, no dupes, length ≤ 24)
    - Serialize to JSON and deserialize; assert identical entries in same order
    - **Validates: Requirements 8.1, 8.3, 8.4**

  - [x] 6.3 Write property test for toggle-off retains data (Property 3)
    - **Property 3: Toggle off retains learned Cants**
    - Create `src/logic/__tests__/cants.toggleRetain.property.test.ts`
    - Generate characters with non-empty learnedCants, set useCants=false, simulate save/load
    - Assert learnedCants array unchanged
    - **Validates: Requirements 1.5, 8.6**

  - [x] 6.4 Write property test for backfill defaults on load (Property 2)
    - **Property 2: Backfill defaults on load**
    - Create `src/logic/__tests__/cants.backfill.property.test.ts`
    - Generate character JSON missing useCants and learnedCants fields
    - After deep-merge with BLANK_CHARACTER, assert useCants=false and learnedCants=[]
    - **Validates: Requirements 1.4, 8.2**

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `deepMerge` + `BLANK_CHARACTER` pattern handles migration automatically; no explicit migration code needed
- The `SpellCastingPanel` already groups spells by Lore, making CantPanel integration straightforward
- The one-Cant-per-round state is component-local (not persisted) since it resets each round
- SL deduction targets the channellingProgress entry with the highest accumulated SL for deterministic behaviour
- The `fast-check` and `vitest` libraries are already available in the project

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9", "2.10"] },
    { "id": 3, "tasks": ["4.1", "4.2"] },
    { "id": 4, "tasks": ["4.3", "5.1"] },
    { "id": 5, "tasks": ["5.2"] },
    { "id": 6, "tasks": ["5.3", "6.1"] },
    { "id": 7, "tasks": ["6.2", "6.3", "6.4"] }
  ]
}
```
