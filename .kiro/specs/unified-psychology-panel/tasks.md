# Implementation Plan: Unified Psychology Panel

## Overview

This plan consolidates two overlapping React components (PsychologyTracker on Identity tab, PsychologyPanel on Notes tab) into a single `UnifiedPsychologyPanel` component. The implementation extends the logic module first, then builds the new component, integrates it into CharacterPage, adds tests, and finally removes the old components.

## Tasks

- [x] 1. Extend the psychology logic module
  - [x] 1.1 Add Phobia and Trauma to PSYCHOLOGY_REMINDERS, add ALL_PSYCHOLOGY_TYPES constant, add requiresTarget and requiresRating helper functions, and update validatePsychologyTrait to handle Phobia/Trauma requiring a target
    - In `src/logic/psychology.ts`:
      - Add `Phobia` and `Trauma` entries to the `PSYCHOLOGY_REMINDERS` record
      - Export a new `ALL_PSYCHOLOGY_TYPES` constant array containing all 8 types
      - Export `requiresTarget(type)` → returns true for Animosity, Hatred, Prejudice, Phobia, Trauma
      - Export `requiresRating(type)` → returns true for Fear, Terror
      - Update `validatePsychologyTrait` to include Phobia and Trauma in the target-requiring branch
    - _Requirements: 1.1, 2.2, 2.3, 2.4, 4.3, 8.1, 8.2, 8.3_

  - [x] 1.2 Write property test for validation correctness (Property 1)
    - **Property 1: Validation correctness by type category**
    - Create `src/logic/__tests__/psychology.validation.property.test.ts`
    - Generate random PsychologyType × random strings × random numbers
    - Assert validatePsychologyTrait returns true iff the type-specific requirements are met
    - **Validates: Requirements 2.2, 2.3, 2.4, 8.1, 8.2, 8.3**

  - [x] 1.3 Write property test for trait removal (Property 2)
    - **Property 2: Trait removal preserves other traits**
    - Create `src/logic/__tests__/psychology.removal.property.test.ts`
    - Generate random trait arrays (0–20 items) × random valid IDs
    - Assert removed ID is absent, all other traits preserved in order
    - **Validates: Requirements 2.5**

  - [x] 1.4 Write property test for phobia alert (Property 3)
    - **Property 3: Phobia alert biconditional**
    - Note: existing `src/logic/__tests__/psychology.property.test.ts` may already cover this; extend or add dedicated test
    - Generate random (brokenTally, wpValue) pairs
    - Assert isPhobiaAlertActive returns true iff brokenTally >= wpValue
    - **Validates: Requirements 3.3, 3.4**

  - [x] 1.5 Write property test for rule reminders completeness (Property 4)
    - **Property 4: Rule reminders completeness**
    - Create `src/logic/__tests__/psychology.reminders.property.test.ts`
    - Exhaustively check all 8 PsychologyType values have non-empty reminder strings
    - **Validates: Requirements 4.1, 4.3**

  - [x] 1.6 Write property test for round-trip validation (Property 5)
    - **Property 5: Trait creation round-trip validation**
    - Create `src/logic/__tests__/psychology.roundtrip.property.test.ts`
    - Generate random valid type/target/rating combos that pass validation
    - Construct a PsychologyTrait and re-validate — must still pass
    - **Validates: Requirements 2.1, 7.1, 8.4**

- [x] 2. Checkpoint - Ensure logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Create the UnifiedPsychologyPanel component
  - [x] 3.1 Create `src/components/pages/UnifiedPsychologyPanel.tsx` and `src/components/pages/UnifiedPsychologyPanel.module.css`
    - Implement component with props interface matching design: `psychologyTraits`, `brokenTally`, `wpValue`, `onAddTrait`, `onRemoveTrait`, `onIncrementBrokenTally`
    - Render Summary Bar (Broken Tally + WP threshold), Phobia Acquisition Alert (conditional), Trait List (with rule reminders), and collapsible Add Trait Form
    - Use `ALL_PSYCHOLOGY_TYPES` from logic module for the type dropdown (all 8 types)
    - Show conditional target/rating fields based on `requiresTarget`/`requiresRating` helpers
    - Show rule reminder preview when type is selected in form
    - Display rule reminder alongside each trait in the list
    - Apply proper ARIA labels and roles for accessibility
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 8.1, 8.2, 8.3_

  - [x] 3.2 Write unit tests for UnifiedPsychologyPanel
    - Create `src/components/pages/__tests__/UnifiedPsychologyPanel.test.tsx`
    - Test: form shows all 8 types in dropdown
    - Test: Frenzy submits without target/rating
    - Test: Broken Tally displays and increment calls callback
    - Test: Alert banner renders when brokenTally >= wpValue
    - Test: Rule reminder preview on type selection
    - Test: Remove button calls onRemoveTrait with correct id
    - Test: Submit disabled when form is incomplete
    - _Requirements: 1.2, 2.4, 3.1, 3.2, 3.3, 4.2, 8.1_

- [x] 4. Integrate into CharacterPage and remove old components
  - [x] 4.1 Update CharacterPage to render UnifiedPsychologyPanel on Identity tab, replacing PsychologyTracker; remove PsychologyPanel from Notes tab
    - In `src/components/pages/CharacterPage.tsx`:
      - Import `UnifiedPsychologyPanel` instead of `PsychologyTracker`
      - Replace the `PsychologyTracker` render on the Identity tab with `UnifiedPsychologyPanel`, passing the same props
      - Remove the `PsychologyPanel` import and its render from the Notes tab
      - Ensure the freeform `character.psych` textarea remains on the Notes tab
      - Ensure rendering is gated by `houseRules.usePsychologyTracker`
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3_

  - [x] 4.2 Delete old component files and their tests
    - Delete `src/components/pages/PsychologyTracker.tsx`
    - Delete `src/components/pages/PsychologyTracker.module.css`
    - Delete `src/components/shared/PsychologyPanel.tsx`
    - Delete `src/components/shared/PsychologyPanel.module.css`
    - Delete `src/components/pages/__tests__/PsychologyTracker.test.tsx`
    - Delete `src/components/pages/__tests__/PsychologyTracker.visibility.test.tsx`
    - _Requirements: 5.2_

  - [x] 4.3 Write visibility and integration tests for the unified panel in CharacterPage
    - Create `src/components/pages/__tests__/UnifiedPsychologyPanel.visibility.test.tsx`
    - Test: panel visible when usePsychologyTracker is true
    - Test: panel hidden when usePsychologyTracker is false
    - Test: freeform psych textarea still on Notes tab regardless of toggle
    - Test: existing traits display correctly after component swap (data compatibility)
    - _Requirements: 6.1, 6.2, 6.3, 7.3_

- [x] 5. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- No schema migration needed — the existing `PsychologyTrait` interface and `character.psychologyTraits` array are unchanged
- The existing property test in `psychology.property.test.ts` (psychologyToggle tests) remains valid since data shape is unchanged

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "1.6"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3"] }
  ]
}
```
