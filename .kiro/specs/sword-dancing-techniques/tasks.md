# Implementation Plan: Sword-dancing Techniques

## Overview

Add the Sword-dancing techniques subsystem following the same architectural pattern as the existing Rune system: static data catalogue → pure logic functions → React UI component. The implementation adds a `SwordDancingTechnique` interface, a static data array of 10 canonical techniques, logic functions for XP cost calculation and technique learning, and a `SwordDancingPanel` component for display and interaction.

## Tasks

- [x] 1. Define the SwordDancingTechnique interface and extend Character type
  - [x] 1.1 Add `SwordDancingTechnique` interface to `src/types/character.ts`
    - Fields: `id` (string), `name` (string), `sl` (number), `description` (string), `order` (number)
    - Place near other shared interfaces (e.g. after `TalentData`)
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 1.2 Add `learnedTechniques?: string[]` field to the `Character` interface
    - Must be optional for backward compatibility
    - Add after `knownRunes` field to keep related fields together
    - _Requirements: 3.1, 3.3, 3.4, 9.1_
  - [x] 1.3 Add `learnedTechniques: []` to `BLANK_CHARACTER` constant
    - _Requirements: 3.1_

- [x] 2. Create the static technique data catalogue
  - [x] 2.1 Create `src/data/swordDancingTechniques.ts` with the `SWORD_DANCING_TECHNIQUES` array
    - Import `SwordDancingTechnique` from `src/types/character.ts`
    - Include all 10 techniques with correct id, name, sl, order, and description fields
    - Extract technique descriptions from `highelfguide.md` source material
    - Techniques: Ritual of Cleansing (sl:1, order:1), Flight of the Phoenix (sl:1, order:2), Path of the Sun (sl:1, order:3), Path of Frost (sl:1, order:4), Path of the Storm (sl:1, order:5), Path of the Rain (sl:2, order:6), Shadows of Loec (sl:2, order:7), Path of the Hawk (sl:3, order:8), Path of Falling Water (sl:3, order:9), Final Stroke of the Master (sl:4, order:10)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

- [x] 3. Implement logic functions in `src/logic/swordDancing.ts`
  - [x] 3.1 Implement `getTechniqueById`, `getTechniqueXpCost`, and `hasSwordDancingTalent` functions
    - `getTechniqueById(id: string): SwordDancingTechnique | undefined` — lookup from catalogue
    - `getTechniqueXpCost(knownCount: number): number` — returns `knownCount * 100`
    - `hasSwordDancingTalent(character: Character): boolean` — checks character talents for "Sword-dancing"
    - `getLearnedTechniques(character: Character): string[]` — returns `character.learnedTechniques ?? []`
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 3.2 Implement `canLearnTechnique` function
    - Signature: `canLearnTechnique(techniqueId: string, character: Character): { canLearn: boolean; error?: string }`
    - Check: character has Sword-dancing talent, has sufficient XP, technique not already learned, technique id is valid
    - Return appropriate error messages for each failure case
    - _Requirements: 4.4, 5.4, 5.5, 5.6_
  - [x] 3.3 Implement `learnTechnique` function
    - Signature: `learnTechnique(character: Character, techniqueId: string): Character`
    - Deduct XP from `xpCur`, add to `xpSpent`
    - Append technique id to `learnedTechniques`
    - Create advancement log entry with type "technique", technique name, and XP cost
    - Return new Character object (immutable update pattern)
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 4. Checkpoint — Verify data and logic compile
  - Run `npx tsc --noEmit` to confirm no type errors
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Write unit tests for logic functions
  - [x] 5.1 Create `src/logic/__tests__/swordDancing.test.ts` with unit tests
    - Verify all 10 techniques exist in `SWORD_DANCING_TECHNIQUES` with correct id, name, sl, order
    - Verify `getTechniqueXpCost` returns correct escalating costs (100 through 900)
    - Verify `learnTechnique` deducts XP, updates `learnedTechniques`, creates advancement log entry
    - Verify `canLearnTechnique` returns false when character lacks talent
    - Verify `canLearnTechnique` returns false when character has insufficient XP
    - Verify `canLearnTechnique` returns false when technique already learned
    - Verify `canLearnTechnique` returns false for unknown technique id
    - Verify backward compatibility: `getLearnedTechniques` returns `[]` when field is undefined
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 5.2 Write property test: XP cost scales linearly
    - Create `src/logic/__tests__/swordDancing.property.test.ts`
    - **Property 1: XP cost scales linearly with known technique count**
    - For any valid count N (1–9), `getTechniqueXpCost(N)` returns exactly `N * 100`
    - Use `fc.integer({ min: 1, max: 9 })` as generator
    - **Validates: Requirements 4.1, 4.3, 8.2**

  - [x] 5.3 Write property test: Learning produces correct state transformation
    - **Property 2: Learning a technique produces correct state transformation**
    - Generate characters with Sword-dancing talent, sufficient XP, and varying learnedTechniques
    - Assert: xpCur decreased by cost, xpSpent increased by cost, technique id appended, advancement log entry created
    - **Validates: Requirements 5.1, 5.2, 5.3, 8.3**

  - [x] 5.4 Write property test: Guard conditions prevent invalid learning
    - **Property 3: Guard conditions prevent invalid learning**
    - Generate characters missing talent, or with insufficient XP, or with technique already learned
    - Assert: `canLearnTechnique` returns `{ canLearn: false }` in all cases
    - **Validates: Requirements 5.4, 5.5, 5.6, 8.4, 8.5, 8.6**

  - [x] 5.5 Write property test: Technique lookup round-trip
    - **Property 4: Technique lookup round-trip**
    - For any technique in `SWORD_DANCING_TECHNIQUES`, `getTechniqueById(technique.id)` returns the original object
    - **Validates: Requirements 8.7**

  - [x] 5.6 Write property test: learnTechnique preserves other character fields
    - **Property 5: Adding learnedTechniques preserves all other character fields**
    - Generate valid character + technique, call `learnTechnique`, assert all fields except `xpCur`, `xpSpent`, `learnedTechniques`, `advancementLog` remain unchanged
    - **Validates: Requirements 3.3, 9.1**

- [x] 6. Checkpoint — Verify all logic tests pass
  - Run `npx vitest run src/logic/__tests__/swordDancing` to confirm all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Create the SwordDancingPanel UI component
  - [x] 7.1 Create `src/components/shared/SwordDancingPanel.module.css`
    - Style following the same pattern as `RuneLearningPanel.module.css`
    - Include styles for: row states (learned, available, unavailable), technique name, SL badge, XP cost, learn button, learned badge, category labels
    - _Requirements: 6.3_
  - [x] 7.2 Create `src/components/shared/SwordDancingPanel.tsx`
    - Props: `{ character: Character; updateCharacter: (mutator: (char: Character) => Character) => void }`
    - Only render when character has the "Sword-dancing" talent (use `hasSwordDancingTalent`)
    - Display current XP badge
    - List all techniques sorted by `order`, showing name, SL requirement, and description
    - Visually distinguish learned vs unlearned techniques
    - Show "Learn" button for unlearned techniques with XP cost; disable when prerequisites not met
    - Display error message from `canLearnTechnique` when learning is blocked
    - Display XP cost for the next available technique
    - Use `Card` and `SectionHeader` shared components
    - Use a Swords icon from lucide-react
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.3, 7.4, 7.5_

  - [x] 7.3 Add confirmation step before learning a technique
    - When "Learn" button is clicked, show confirmation with technique name and XP cost before calling `learnTechnique`
    - After learning, update display to reflect new state and recalculated next-technique cost
    - _Requirements: 7.2, 7.5_

- [x] 8. Integrate SwordDancingPanel into the Advancement page
  - [x] 8.1 Import and render `SwordDancingPanel` in `src/components/pages/AdvancementPage.tsx`
    - Conditionally render only when character has the Sword-dancing talent
    - Place near the RuneLearningPanel for consistency
    - Pass `character` and `updateCharacter` props
    - _Requirements: 6.1, 6.4_

- [x] 9. Checkpoint — Verify UI compiles and renders
  - Run `npx tsc --noEmit` to confirm no type errors
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Write component tests for SwordDancingPanel
  - [x] 10.1 Create `src/components/__tests__/SwordDancingPanel.test.tsx`
    - Test: panel does not render when character lacks Sword-dancing talent
    - Test: panel renders all 10 techniques when character has the talent
    - Test: learned techniques show "Learned" badge, not "Learn" button
    - Test: unlearned techniques show "Learn" button with correct XP cost
    - Test: "Learn" button is disabled when character has insufficient XP
    - Test: clicking "Learn" triggers confirmation and calls updateCharacter on confirm
    - Test: "Ritual of Cleansing" shows as learned when character has the talent and `learnedTechniques` includes it
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 11. Verify backward compatibility and non-regression
  - [x] 11.1 Verify existing test suite passes without modification
    - Run `npx vitest run` to confirm all existing tests still pass
    - Confirm characters without `learnedTechniques` field load without errors
    - Confirm the "Sword-dancing" talent entry in `TALENT_DB` remains unchanged
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 12. Final checkpoint — Full verification
  - Run `npx tsc --noEmit` to confirm no type errors
  - Run `npx vitest run` to confirm all tests pass (existing and new)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation follows the same pattern as the existing Rune subsystem (`src/data/runes.ts`, `src/logic/runes.ts`, `RuneLearningPanel.tsx`)
- Source technique descriptions should be extracted from `highelfguide.md`
- The `learnedTechniques` field is optional on Character for backward compatibility — logic functions use `?? []` to handle undefined
