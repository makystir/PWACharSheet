# Implementation Plan: UX Polish and Functionality

## Overview

This plan implements 22 UX improvements across visual polish, combat enhancements, automation, mobile experience, and quality-of-life features. The approach prioritizes pure logic modules first (enabling property-based testing), then hooks and shared components, then integration into existing pages. Each task builds incrementally on prior work, with checkpoints to validate before proceeding.

## Tasks

- [x] 1. Core logic modules and type extensions
  - [x] 1.1 Extend Character type with new fields
    - Add `consumables?: Consumable[]`, `psychologyTraits?: PsychologyTrait[]`, `initiativeList?: Combatant[]`, `activeInitiativeIndex?: number` to the Character interface in `src/types/character.ts`
    - Export new types: `Consumable`, `PsychologyTrait`, `PsychologyType`, `Combatant` from appropriate type files
    - _Requirements: 10.1, 11.1, 19.1_

  - [x] 1.2 Implement end-of-turn logic module
    - Create `src/logic/end-of-turn.ts` with `processEndOfTurn` function
    - Handle Bleeding damage (reduce wounds by level), Ablaze damage (reduce wounds by level)
    - Auto-remove Stunned and Surprised conditions
    - Floor wounds at 0; skip all damage if wounds already at 0
    - Return `EndOfTurnResult` with effects summary, new wounds, removed conditions, and advanced round number
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.7, 8.8_

  - [x] 1.3 Write property test for end-of-turn logic
    - **Property 7: End-of-Turn Condition Damage**
    - Test with fast-check: for any currentWounds (≥0), Bleeding level (0-10), Ablaze level (0-10), verify wounds = max(0, currentWounds - bleedingLevel - ablazeLevel) when wounds > 0, and wounds remain 0 when already 0
    - **Validates: Requirements 8.3, 8.4, 8.7, 8.8**

  - [x] 1.4 Implement initiative logic module
    - Create `src/logic/initiative.ts` with `sortByInitiative` and `nextTurn` functions
    - `sortByInitiative`: stable sort descending by initiative value
    - `nextTurn`: advance active index, wrapping to 0 after last combatant
    - _Requirements: 19.3, 19.5_

  - [x] 1.5 Write property tests for initiative logic
    - **Property 13: Initiative Sort Invariant** — sorted list has each initiative ≤ previous
    - **Property 14: Initiative Turn Cycling** — calling nextTurn N times returns to original index
    - **Validates: Requirements 19.3, 19.5, 19.8**

  - [x] 1.6 Implement skill-filter logic module
    - Create `src/logic/skill-filter.ts` with `filterSkills` function
    - Filter by name (case-insensitive substring match) and trained-only toggle (advances > 0)
    - Apply both filters as intersection when both active
    - _Requirements: 22.2, 22.3, 22.4, 22.5_

  - [x] 1.7 Write property tests for skill-filter logic
    - **Property 19: Skill Filter Subset Invariant** — result is subset of input, every result contains filter text, every matching skill from input is in result
    - **Property 20: Combined Skill Filter Intersection** — result equals intersection of text-match set and trained set
    - **Validates: Requirements 22.2, 22.4, 22.6**

  - [x] 1.8 Implement consumables logic module
    - Create `src/logic/consumables.ts` with `incrementDose` and `decrementDose` functions
    - `decrementDose`: floor at 0
    - `incrementDose`: cap at maxDoses
    - _Requirements: 10.6, 10.7_

  - [x] 1.9 Write property test for consumables logic
    - **Property 9: Consumable Dose Clamping** — after any sequence of increment/decrement, currentDoses is always in [0, maxDoses]
    - **Validates: Requirements 10.6, 10.7**

  - [x] 1.10 Implement psychology logic module
    - Create `src/logic/psychology.ts` with `validatePsychologyTrait` function and `PSYCHOLOGY_REMINDERS` constant
    - Validate: type non-empty, Fear/Terror require positive numeric rating, Animosity/Hatred/Prejudice require non-empty text target
    - Define mechanical reminder strings for each type
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 1.11 Write property test for psychology validation
    - **Property 10: Psychology Trait Validation** — validation returns true only when type is non-empty AND type-specific requirements are met
    - **Validates: Requirements 11.3**

  - [x] 1.12 Add wound maximum calculation to calculators
    - Add `computeWoundMaximum` function to `src/logic/calculators.ts`
    - Formula: (woundsUseSB ? floor(S/10) : 0) + 2×floor(T/10) + floor(WP/10) + Hardy×floor(T/10)
    - Return both total and formula breakdown components
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 1.13 Write property test for wound maximum calculation
    - **Property 1: Wound Maximum Formula Correctness** — for any S, T, WP (0-99), Hardy (0-5), woundsUseSB boolean, computed value matches formula and breakdown sums to total
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.6**

  - [x] 1.14 Add opposed test resolution to dice-roller
    - Add `resolveOpposedTest` function to `src/logic/dice-roller.ts`
    - Compute player SL, opponent SL, net SL = player - opponent
    - Tie resolution: when net SL = 0, higher roll wins; if rolls equal, result is tie
    - _Requirements: 7.3, 7.4, 7.5_

  - [x] 1.15 Write property tests for opposed test resolution
    - **Property 5: Opposed Test Net SL** — net SL always equals player SL minus opponent SL
    - **Property 6: Opposed Test Tie Resolution** — when net SL = 0, higher roll value wins
    - **Validates: Requirements 7.5, 7.6**

  - [x] 1.16 Add AP auto-calculation to calculators
    - Add `computeAPByLocation` function to `src/logic/calculators.ts`
    - Sum AP values of all worn armour items covering each body location
    - Return AP per location: head, left arm, right arm, body, left leg, right leg
    - _Requirements: 9.1, 9.2_

  - [x] 1.17 Write property test for AP computation
    - **Property 8: AP Computation Invariant** — computed AP for each location equals sum of individual AP values of armour items covering that location
    - **Validates: Requirements 9.1, 9.2, 9.6**

- [x] 2. Checkpoint - Core logic verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Hooks and persistence layer
  - [x] 3.1 Implement useOnlineStatus hook
    - Create `src/hooks/useOnlineStatus.ts`
    - Track `navigator.onLine` state, listen for 'online'/'offline' window events
    - Clean up event listeners on unmount
    - _Requirements: 17.1, 17.2, 17.4_

  - [x] 3.2 Enhance useRollHistory with localStorage persistence
    - Modify `src/hooks/useRollHistory.ts` to persist to localStorage key `wfrp-roll-history`
    - Restore on mount, trim oldest entries when exceeding 50
    - Add `clearHistory` function that clears both localStorage and in-memory list
    - Handle localStorage quota errors gracefully (fall back to in-memory)
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [x] 3.3 Write property test for roll history persistence
    - **Property 12: Roll History Persistence Invariant** — for any sequence of N additions, persisted history contains min(N, 50) entries representing most recent rolls in chronological order
    - **Validates: Requirements 18.1, 18.3, 18.5**

- [x] 4. Shared UI components
  - [x] 4.1 Create OfflineIndicator component
    - Create `src/components/shared/OfflineIndicator.tsx` and CSS Module
    - Small chip showing "Offline" text with icon, positioned non-intrusively
    - Use `useOnlineStatus` hook; show only when offline
    - Hide within 1 second of coming back online (CSS transition)
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

  - [x] 4.2 Create SkillFilter component
    - Create `src/components/shared/SkillFilter.tsx` and CSS Module
    - Text input for search, "Trained Only" toggle button
    - Expose filter state via props/callbacks for parent to use with `filterSkills` logic
    - _Requirements: 22.1, 22.3_

  - [x] 4.3 Create ConsumablesPanel component
    - Create `src/components/shared/ConsumablesPanel.tsx` and CSS Module
    - Display consumables list with name, doses (current/max), effect text
    - Increment/decrement buttons per item, add new item form, delete control
    - Visually indicate depleted items (currentDoses = 0)
    - Use `incrementDose`/`decrementDose` from logic module
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 4.4 Create PsychologyPanel component
    - Create `src/components/shared/PsychologyPanel.tsx` and CSS Module
    - List traits with type, target/rating, and mechanical reminder text
    - Add form: type selector, target/rating input (conditional on type), validation before submit
    - Delete control per trait
    - Use `validatePsychologyTrait` and `PSYCHOLOGY_REMINDERS` from logic module
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [x] 4.5 Create SessionNotesPanel component
    - Create `src/components/shared/SessionNotesPanel.tsx` and CSS Module
    - Display log entries in reverse chronological order (newest first)
    - Text input + submit for new entries, auto-prepend with current timestamp
    - Delete control per entry, empty state message when no notes
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 4.6 Create LedgerPanel component
    - Create `src/components/shared/LedgerPanel.tsx` and CSS Module
    - Display ledger entries (newest first) with timestamp, description, amount (GC/SS/D), type
    - Entry form: description, amount fields (GC, SS, D), type toggle (income/expense)
    - Validate amount > 0 before submission; reject zero-amount entries with message
    - Delete control per entry
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.7_

  - [x] 4.7 Write property tests for ledger and currency logic
    - **Property 11: Treasury Delta Application** — rejected when delta would produce negative balance, applied correctly otherwise
    - **Property 17: Ledger Amount Validation** — zero or negative amounts are rejected
    - **Property 18: Ledger Treasury Impact** — income increases treasury by amount, expense decreases it
    - **Validates: Requirements 12.3, 21.3, 21.5, 21.6**

  - [x] 4.8 Create InitiativeTracker component
    - Create `src/components/combat/InitiativeTracker.tsx` and CSS Module
    - Sorted combatant list (using `sortByInitiative`), highlight active combatant
    - Add combatant form (name + initiative value), remove control per combatant
    - "Next Turn" button (using `nextTurn`), wraps at end of list
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

- [x] 5. Checkpoint - Shared components verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Combat Dashboard enhancements
  - [x] 6.1 Add condition badge color-coding
    - Implement `CONDITION_COLORS` map in `src/components/combat/CombatDashboard.tsx` or a shared constants file
    - Apply background colors per condition name to Condition_Badge elements
    - Implement intensity scaling: increase opacity proportional to level/maxLevel for stackable conditions
    - Ensure all badge text/background combinations meet 4.5:1 contrast ratio
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 6.2 Add condition badge effect text tooltips
    - On desktop hover: show condition mechanical effect text as inline tooltip
    - On mobile tap: expand effect text below the badge
    - Compact format, one line, overflow truncated, display within 100ms
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 6.3 Add wound threshold visual escalation
    - Implement wound percentage thresholds: >50% healthy, ≤50% caution, ≤25% danger, =0 critical
    - Caution: warning color + cautionary icon; Danger: pulsing animation + danger color; Critical: skull icon + urgent treatment
    - CSS transitions between states (200-400ms)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 6.4 Add state change transitions
    - Animate wound number changes (200-300ms CSS transition)
    - Animate advantage number changes (200-300ms CSS transition)
    - Condition badge add: fade-in + scale (200-300ms); remove: fade-out (200-300ms)
    - Gate all animations behind `@media (prefers-reduced-motion: no-preference)`
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 6.5 Add End Turn button and integration
    - Display "End Turn" button when character is in combat
    - On activation: call `processEndOfTurn`, update wounds/conditions/round in character state
    - Display summary of all automated effects applied
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x] 6.6 Integrate InitiativeTracker into CombatDashboard
    - Render InitiativeTracker section within CombatDashboard
    - Clear initiative list when `inCombat` becomes false
    - Wire combatant state to character's `initiativeList` and `activeInitiativeIndex`
    - _Requirements: 19.1, 19.7_

- [x] 7. Roll Dialog enhancements
  - [x] 7.1 Add roll result animations
    - Critical: gold glow animation (100-200ms CSS keyframes)
    - Fumble: horizontal shake animation (100-200ms CSS keyframes), fumble takes priority
    - CSS-only implementation, no JS animation frames
    - Gate behind `@media (prefers-reduced-motion: no-preference)`; skip all animation logic when reduced motion is enabled
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 7.2 Add haptic feedback on dice rolls
    - Feature-detect `navigator.vibrate`; skip silently if undefined
    - Standard roll: 50ms vibration
    - Critical: pattern [50, 30, 50]
    - Fumble: 100ms vibration (overrides standard)
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 7.3 Add opposed test mode
    - "Opposed Test" toggle in Roll_Dialog
    - When active: show opponent target number input
    - Execute: roll for player, generate opponent roll, compute net SL via `resolveOpposedTest`
    - Display: player SL, opponent SL, net SL, winner (player/opponent/tie)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 8. Character Page enhancements
  - [x] 8.1 Add wound maximum auto-calculation and formula display
    - Compute wound max using `computeWoundMaximum` from calculators
    - Display formula breakdown (e.g., "SB 4 + 2×TB 8 + WPB 4 + Hardy 3 = 19")
    - Show override value when `eMaxOverride` is set, with calculated value for reference
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 8.2 Add AP auto-calculation display
    - Compute AP per location using `computeAPByLocation`
    - Display computed values alongside manual AP fields
    - Visually indicate discrepancies (computed ≠ manual, in either direction)
    - Provide "Sync" control to set manual AP to computed values
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 8.3 Add career skill highlighting on Abilities tab
    - Look up current career level's skill list from Career_Scheme data
    - Apply gold accent (left border or background tint using `--accent-gold`) to matching skills
    - Update on career/level change; remove highlighting when no valid career set
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 8.4 Add spell effect text expand/collapse
    - Add expand/collapse control on each spell row in Abilities tab
    - Show full `SpellItem.effect` text below summary when expanded
    - Keep summary row visible; support multiple expanded simultaneously
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 8.5 Integrate SkillFilter into Abilities tab
    - Render SkillFilter component above skills table
    - Wire filter state to `filterSkills` logic; filter both basic and advanced skill lists in real time
    - Clear filter restores full list
    - _Requirements: 22.1, 22.2, 22.4, 22.5_

  - [x] 8.6 Integrate ConsumablesPanel into Character Page
    - Add consumables section (likely in Gear sub-tab or dedicated area)
    - Wire to `character.consumables` via `update`/`updateCharacter`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 8.7 Integrate PsychologyPanel into Character Page
    - Add psychology traits section (likely in Identity or Abilities sub-tab)
    - Wire to `character.psychologyTraits` via `update`/`updateCharacter`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 9. Checkpoint - Character and Combat page verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Estate Page enhancements
  - [x] 10.1 Integrate CurrencyInput for estate treasury
    - Replace manual treasury input with Currency_Input component
    - Validate deltas: reject if would produce negative balance
    - Apply valid deltas to treasury balance
    - _Requirements: 12.1, 12.3_

  - [x] 10.2 Integrate CurrencyInput for property income/expense fields
    - Use Currency_Input for modifying property monthly income and monthly expense
    - _Requirements: 12.2, 12.4_

  - [x] 10.3 Integrate LedgerPanel into Estate Page
    - Render LedgerPanel with estate's ledger data
    - Wire new entry submissions: income adds to treasury, expense subtracts from treasury
    - Connect delete control
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7_

- [x] 11. Attack Flow enhancements
  - [x] 11.1 Add two-weapon fighting support
    - Add "Off-Hand" toggle to AttackFlow component
    - Apply −20 modifier when active (or −0 with Dual Wielder talent)
    - Display modified target number reflecting penalty
    - Show penalty reminder when character lacks Dual Wielder; hide when they have it
    - Allow second attack execution in same step sequence
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

  - [x] 11.2 Write property test for off-hand penalty computation
    - **Property 15: Off-Hand Penalty Computation** — without Dual Wielder: modified target = T - 20; with Dual Wielder: modified target = T
    - **Validates: Requirements 20.1**

- [x] 12. Layout and session notes integration
  - [x] 12.1 Integrate OfflineIndicator into PageContainer
    - Add OfflineIndicator to `src/components/layout/PageContainer.tsx`
    - Position non-intrusively (does not obscure interactive content or navigation)
    - Show immediately on load if offline
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

  - [x] 12.2 Integrate SessionNotesPanel into Notes tab
    - Render SessionNotesPanel in the Notes sub-tab of CharacterPage
    - Wire to `character.log` array via `update`/`updateCharacter`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 12.3 Write property test for session notes ordering
    - **Property 4: Session Notes Chronological Ordering** — displayed log is ordered by timestamp descending, most recent at index 0
    - **Validates: Requirements 6.1, 6.3**

- [x] 13. Final checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All CSS animations are gated behind `@media (prefers-reduced-motion: no-preference)` per Requirements 2.4 and 14.5
- The existing `fast-check` and `vitest` stack is used for all property-based testing
- No new external dependencies are required

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.4", "1.6", "1.8", "1.10", "1.12", "1.14", "1.16"] },
    { "id": 2, "tasks": ["1.3", "1.5", "1.7", "1.9", "1.11", "1.13", "1.15", "1.17"] },
    { "id": 3, "tasks": ["3.1", "3.2"] },
    { "id": 4, "tasks": ["3.3", "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.8"] },
    { "id": 5, "tasks": ["4.7", "6.1", "6.2", "6.3", "6.4", "7.1", "7.2"] },
    { "id": 6, "tasks": ["6.5", "6.6", "7.3", "8.1", "8.2", "8.3", "8.4"] },
    { "id": 7, "tasks": ["8.5", "8.6", "8.7", "10.1", "10.2", "10.3", "11.1"] },
    { "id": 8, "tasks": ["11.2", "12.1", "12.2", "12.3"] }
  ]
}
```
