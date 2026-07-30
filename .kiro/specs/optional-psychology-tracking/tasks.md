# Implementation Plan: Optional Psychology Tracking

## Overview

Add a `usePsychologyTracker` boolean to the `HouseRules` interface (default `false`), render a toggle in the Settings page Optional Mechanics section, and conditionally render the existing `PsychologyTracker` component on the Identity tab. Data is preserved when toggled off. Follows the established Yenlui/Grudge Book toggle pattern exactly.

## Tasks

- [x] 1. Add `usePsychologyTracker` field to data layer
  - [x] 1.1 Add `usePsychologyTracker: boolean` to the `HouseRules` interface and set default to `false` in `BLANK_CHARACTER`
    - In `src/types/character.ts`, add `usePsychologyTracker: boolean` to the `HouseRules` interface after `useGrudgeBook`
    - In `BLANK_CHARACTER.houseRules`, add `usePsychologyTracker: false` after `useGrudgeBook: false`
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Update existing tests that reference the full `HouseRules` object to include the new field
    - Update `src/hooks/__tests__/houseRules.backfill.test.ts` expected objects to include `usePsychologyTracker: false`
    - Update any other test files that spread or assert the complete `houseRules` shape
    - _Requirements: 1.3_

  - [x] 1.3 Write property test for backward-compatible field defaulting
    - **Property 1: Missing field defaults to false on load**
    - Generate random partial character objects with `houseRules` sub-objects that omit `usePsychologyTracker`
    - Merge through `{ ...structuredClone(BLANK_CHARACTER), ...parsed }` logic and assert result has `usePsychologyTracker === false`
    - Place test in `src/types/__tests__/psychologyToggle.backfill.property.test.ts`
    - **Validates: Requirements 1.3**

- [x] 2. Render toggle in Settings page Optional Mechanics section
  - [x] 2.1 Add "Psychology Tracker" toggle to `SettingsPage.tsx`
    - In `src/components/pages/SettingsPage.tsx`, add a new toggle row inside the "Optional Mechanics" `CollapsibleSection`
    - Follow the exact pattern of the Yenlui Balance and Grudge Book toggle rows
    - Label: "Psychology Tracker", description: "Track phobias, animosity, hatred, and trauma (Archives Vol. II)"
    - Button calls `update('houseRules.usePsychologyTracker', !character.houseRules.usePsychologyTracker)`
    - Display "ON" when true, "OFF" when false; apply muted text style when off
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.2 Write unit tests for the Psychology Tracker toggle on SettingsPage
    - Add tests in `src/components/__tests__/SettingsPage.houseRules.test.tsx` or a new adjacent file
    - Test: toggle renders with label "Psychology Tracker" in Optional Mechanics section
    - Test: shows "OFF" when `usePsychologyTracker` is false
    - Test: shows "ON" when `usePsychologyTracker` is true
    - Test: clicking toggle calls update with opposite boolean value
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Conditionally render PsychologyTracker on the Identity tab
  - [x] 4.1 Wrap PsychologyTracker rendering with house rule guard in `CharacterPage.tsx`
    - In the Identity tab section of `src/components/pages/CharacterPage.tsx`, wrap the existing `PsychologyTracker` `CollapsibleSection` with `{character.houseRules.usePsychologyTracker && (...)}`
    - When false, render zero DOM elements (no wrapper, no CollapsibleSection)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.2 Write unit tests for conditional rendering of PsychologyTracker
    - Add tests in `src/components/pages/__tests__/PsychologyTracker.visibility.test.tsx`
    - Test: renders PsychologyTracker when `usePsychologyTracker` is true
    - Test: renders zero DOM elements for tracker when `usePsychologyTracker` is false
    - Test: toggling on immediately shows tracker without page refresh
    - Test: toggling off immediately removes tracker without page refresh
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Data preservation on toggle round-trip
  - [x] 5.1 Write property test for toggle round-trip data preservation
    - **Property 2: Toggle off/on round-trip preserves psychology data**
    - Generate random arrays of `PsychologyTrait` objects (0–10 entries, random types from valid values, random target strings, optional ratings) and random non-negative `brokenTally` integers
    - Simulate toggling `usePsychologyTracker` true → false → true and assert `psychologyTraits` and `brokenTally` remain identical
    - Place test in `src/types/__tests__/psychologyToggle.roundTrip.property.test.ts`
    - **Validates: Requirements 4.1, 4.2**

- [x] 6. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The toggle pattern follows the exact same structure as Yenlui Balance and Grudge Book toggles already in the codebase

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "5.1"] }
  ]
}
```
