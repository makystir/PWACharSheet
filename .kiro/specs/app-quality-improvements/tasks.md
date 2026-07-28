# Implementation Plan: App Quality Improvements

## Overview

This plan implements a comprehensive quality improvement pass across four categories: rules compliance (talent data, condition automation, XP documentation), combat & spell UX (quick buttons, end-of-turn modal, overcast preview, mobile cards, expandable cells), feature addition (Obsessions system), and UI polish (skeleton loaders, empty states, micro-interactions, dashboard grouping). Implementation uses existing architecture: React 19, TypeScript, CSS Modules, Zustand via `useCharacter`, and vitest + fast-check for testing.

## Tasks

- [x] 1. Talent database additions and data-layer validation
  - [x] 1.1 Add Up In Arms combat talents to `src/data/talents.ts`
    - Append entries for Beat Blade, Distract, Reversal, Shieldsman, Strike to Injure, Drilled (updated), Flee!, Gunner, Rapid Reload, Relentless, Roughrider, Crew Commander
    - Each entry uses existing `{ name, max, desc }` format
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 1.2 Add Dwarf Player's Guide talents to `src/data/talents.ts`
    - Append entries for Ancestral Grudge, Bludgeoner, Demolisher, Dragon Belcher, Entrenchment, Forgefire, Glorious Demise, Harpooner, Kingsguard, Liquid Fortification, Long Memory, Magic Defiance, Master Rune Magic, Maverick, Rune Magic, Short Fuse, Tireless, Underminer, Whirlwind of Death
    - Each entry uses existing `{ name, max, desc }` format
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 1.3 Write property test for talent database structural consistency
    - **Property 1: Talent database structural consistency**
    - Verify every entry in TALENT_DB has non-empty `name`, `max`, and `desc` strings
    - Create `src/data/__tests__/talents.property.test.ts`
    - **Validates: Requirements 2.3**

- [x] 2. Fatigued-to-Unconscious automation logic
  - [x] 2.1 Create `src/logic/conditions.ts` with `evaluateFatiguedThreshold` function
    - Implement pure function: if Fatigued level >= TB and Unconscious not present, add Unconscious at level 1
    - If already unconscious, return unchanged
    - If Fatigued < TB, retain Unconscious (no removal)
    - Handle edge case: TB <= 0 treated as TB=1
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 2.2 Integrate `evaluateFatiguedThreshold` into `useCharacter` hook
    - Call after any condition update; if `applied.length > 0`, update character state
    - _Requirements: 3.1_

  - [x] 2.3 Write property test for Fatigued-to-Unconscious correctness
    - **Property 2: Fatigued-to-Unconscious automation correctness**
    - Generate arbitrary TB in [1..10] and condition sets with Fatigued; verify Unconscious presence iff Fatigued.level >= TB, and idempotence
    - Create `src/logic/__tests__/conditions.property.test.ts`
    - **Validates: Requirements 3.1, 3.2**

- [x] 3. Quick condition buttons on Combat Dashboard
  - [x] 3.1 Add `QuickConditionButton` sub-component and quick-button row to `CombatDashboard.tsx`
    - Render 4 buttons: Bleeding, Stunned, Prone, Ablaze with icons from lucide-react
    - Position near existing condition badge area
    - Apply condition using same logic as ConditionPicker (increment if stackable, add if absent, respect maxLevel)
    - Apply `.pressable` class from micro-interactions module
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 3.2 Write property test for quick condition application equivalence
    - **Property 3: Quick condition application equivalence**
    - For arbitrary condition states, verify quick-button logic produces same result as ConditionPicker logic
    - Add to `src/logic/__tests__/conditions.property.test.ts`
    - **Validates: Requirements 5.2, 5.4**

- [x] 4. End-of-Turn report modal
  - [x] 4.1 Create `EndOfTurnReportModal` component at `src/components/combat/EndOfTurnReportModal.tsx`
    - Display damage effects with breakdowns, reminder effects, and auto-removed conditions
    - Include "Apply" and "Cancel" buttons
    - Style with CSS Module: `EndOfTurnReportModal.module.css`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 4.2 Modify `CombatDashboard.tsx` End Turn handler to show modal before applying
    - Call `processEndOfTurn()` to compute effects, pass results to modal
    - On "Apply": commit result to character state (wounds, removed conditions, round counter)
    - On "Cancel": discard results
    - _Requirements: 6.1, 6.6_

  - [x] 4.3 Write property test for end-of-turn report completeness
    - **Property 4: End-of-turn report completeness**
    - For arbitrary EndOfTurnResult, verify formatted report contains one entry per effect with condition name and damage amount
    - Create `src/logic/__tests__/end-of-turn.property.test.ts`
    - **Validates: Requirements 6.2, 6.3**

  - [x] 4.4 Write property test for end-of-turn apply correctness
    - **Property 5: End-of-turn apply correctness**
    - For arbitrary valid EndOfTurnResult and character state, verify apply sets wounds to result.newWounds, removes result.removedConditions, and advances round
    - Add to `src/logic/__tests__/end-of-turn.property.test.ts`
    - **Validates: Requirements 6.6**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Overcast damage preview
  - [x] 6.1 Add `computeOvercastDamagePreview` function to `src/logic/spell-casting.ts`
    - Compute base + bonus from OVERCAST_TABLE for given allocation count
    - Return `{ base, bonus, total }` object
    - Handle 0 allocation (bonus=0) and NaN/undefined baseDamage
    - _Requirements: 7.2, 7.3_

  - [x] 6.2 Add live damage preview display to `OvercastAllocator.tsx`
    - Call `computeOvercastDamagePreview` on each allocation change
    - Display "Base: X → Modified: Y" below the damage allocation row
    - _Requirements: 7.1, 7.4_

  - [x] 6.3 Write property test for overcast damage preview correctness
    - **Property 6: Overcast damage preview correctness**
    - For arbitrary baseDamage >= 0 and allocation >= 0, verify total = base + bonus from highest matching OVERCAST_TABLE row
    - Create `src/logic/__tests__/spell-casting.property.test.ts`
    - **Validates: Requirements 7.2, 7.3, 7.4**

- [x] 7. Mobile spell card layout
  - [x] 7.1 Add responsive card rendering to `SpellCastingPanel.tsx`
    - Add `SpellCard` sub-component with card-based layout for mobile
    - Use `useMediaQuery('(max-width: 767px)')` to conditionally render cards vs table rows
    - Cards show spell name + CN prominently, then Range, Target, Duration, Effect as secondary fields
    - Add `.spellCard` styles to `SpellCastingPanel.module.css`
    - Include appropriate ARIA roles (`role="article"`, `aria-label`)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 7.2 Write property test for spell card field completeness
    - **Property 7: Spell card field completeness**
    - For arbitrary spell data with non-empty fields, verify rendered card contains name, CN, range, target, duration, effect
    - Create `src/components/combat/__tests__/SpellCard.property.test.tsx`
    - **Validates: Requirements 8.2, 8.3**

- [x] 8. Expandable effect cells
  - [x] 8.1 Create `ExpandableCell` component at `src/components/shared/ExpandableCell.tsx`
    - Render text with CSS truncation, click toggles expanded/collapsed state
    - Use `aria-expanded` attribute for accessibility
    - At viewport >= 1024px, increase max-width to reduce truncation frequency
    - Style with `ExpandableCell.module.css`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 8.2 Write property test for effect cell toggle idempotence
    - **Property 8: Effect cell toggle idempotence**
    - For arbitrary text, verify toggle(toggle(state)) returns to original truncated state
    - Create `src/components/shared/__tests__/ExpandableCell.property.test.tsx`
    - **Validates: Requirements 9.2, 9.3**

- [x] 9. Obsessions system
  - [x] 9.1 Create `src/logic/obsessions.ts` with `getObsessionDisplayState` function
    - Implement pure logic mapping YenluiState to display flags (showBenefit, showPenalty, benefitText, penaltyText)
    - Light: benefit only; Balanced: benefit + penalty; Dark: penalty only; undefined: nothing
    - Export `ObsessionData` and `ObsessionDisplayState` interfaces
    - _Requirements: 10.3, 10.4, 10.5_

  - [x] 9.2 Add `obsession` field to Character interface in `src/types/character.ts`
    - Add optional `obsession?: ObsessionData` field
    - No migration needed (additive, defaults to undefined)
    - _Requirements: 10.6_

  - [x] 9.3 Create `ObsessionTracker` component at `src/components/shared/ObsessionTracker.tsx`
    - Free-text inputs for obsession description and related test types
    - Conditional display of benefit/penalty based on `getObsessionDisplayState`
    - Render within YenluiPanel when character is High Elf
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 9.4 Integrate `ObsessionTracker` into Yenlui panel and wire persistence
    - Conditionally render when species is High Elf and Yenlui house rule enabled
    - Persist via existing `saveCharacter()` path
    - Silently retain data if species changes away from High Elf
    - _Requirements: 10.1, 10.6_

  - [x] 9.5 Write property test for obsession state-dependent display
    - **Property 9: Obsession state-dependent display**
    - For arbitrary ObsessionData and YenluiState, verify correct benefit/penalty flags per state
    - Create `src/logic/__tests__/obsessions.property.test.ts`
    - **Validates: Requirements 10.3, 10.4, 10.5**

  - [x] 9.6 Write property test for obsession data persistence round-trip
    - **Property 10: Obsession data persistence round-trip**
    - For arbitrary valid ObsessionData, verify JSON.parse(JSON.stringify(data)) equals original
    - Add to `src/logic/__tests__/obsessions.property.test.ts`
    - **Validates: Requirements 10.6**

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Skeleton loaders for lazy-loaded pages
  - [x] 11.1 Create skeleton loader components in `src/components/skeletons/`
    - Create `CombatSkeleton.tsx`, `AdvancementSkeleton.tsx`, `SettingsSkeleton.tsx`
    - Each skeleton approximates target page layout using CSS shimmer rectangles
    - Include `role="status"` and `aria-label="Loading page content"`
    - Create shared `Skeleton.module.css` with shimmer keyframe animation
    - _Requirements: 11.1, 11.2, 11.3, 11.5_

  - [x] 11.2 Modify `PageLoader.tsx` to accept `skeleton` prop
    - Add optional `skeleton?: ReactNode` prop to `PageLoaderProps`
    - Pass skeleton as Suspense fallback instead of generic LoadingIndicator when provided
    - Wire page-specific skeletons in route definitions
    - _Requirements: 11.1, 11.4_

- [x] 12. Empty state improvements
  - [x] 12.1 Add descriptive empty states to list panels
    - Update SpellCastingPanel, WeaponCards, TalentsPanel, and ConditionPicker area
    - Use existing `EmptyState` component with icon, heading, description, and CTA action
    - Follow consistent visual pattern (icon + message + CTA button) across all panels
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 13. Micro-interaction feedback and visual polish
  - [x] 13.1 Create `src/styles/micro-interactions.module.css` with pressable class
    - Implement `.pressable` with `transform: scale(0.96)` on `:active`
    - Use 150ms transition duration
    - Add `@media (prefers-reduced-motion: reduce)` block to disable
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 13.2 Apply `.pressable` class to interactive buttons across the app
    - Apply to dice roll buttons, action buttons, condition buttons, quick-action bar items
    - Import micro-interactions module where needed
    - _Requirements: 13.1_

- [x] 14. Combat Dashboard visual grouping
  - [x] 14.1 Add ARIA groups and visual dividers to `CombatDashboard.tsx`
    - Wrap Status elements (wounds, condition badges) in `role="group" aria-label="Status"`
    - Wrap Actions elements (advantage, round counter, engaged toggle) in `role="group" aria-label="Actions"`
    - Add `.groupDivider` between groups in CSS Module
    - At < 768px: groups stack vertically; at >= 768px: side-by-side with vertical divider
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 15. XP table documentation note
  - [x] 15.1 Add informational note to advancement UI
    - Add collapsible info section or tooltip near XP cost display
    - Note states: advances 1–50 match Core Rulebook exactly; advances 51+ are extrapolated
    - Use non-intrusive presentation (info icon with expandable text)
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (10 properties total)
- Unit tests validate specific examples and edge cases
- All new components follow existing project patterns (CSS Modules, functional components, lucide-react icons)
- The micro-interactions module (task 13.1) is referenced by earlier tasks (3.1) — implement early or apply retroactively

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "6.1", "9.1", "13.1"] },
    { "id": 1, "tasks": ["1.3", "2.2", "2.3", "6.2", "6.3", "9.2", "11.1", "13.2"] },
    { "id": 2, "tasks": ["3.1", "4.1", "7.1", "8.1", "9.3", "11.2", "14.1", "15.1"] },
    { "id": 3, "tasks": ["3.2", "4.2", "4.3", "4.4", "7.2", "8.2", "9.4", "9.5", "9.6", "12.1"] }
  ]
}
```
