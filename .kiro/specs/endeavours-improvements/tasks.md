# Implementation Plan: Endeavours Improvements

## Overview

This plan implements the endeavours improvements in layers: first updating types and pure logic functions, then adding the shared Toast component, then updating the page component UI, and finally adding comprehensive property-based tests. Each step builds on previous work so there's no orphaned code.

## Tasks

- [x] 1. Update type definitions and expand CLASS_ENDEAVOURS
  - [x] 1.1 Update EndeavourEntry and DowntimePeriod interfaces in src/types/character.ts
    - Add `EntryStatus` type alias (`'pending' | 'in_progress' | 'completed'`)
    - Change `EndeavourEntry.id` from `number` to `string`
    - Replace `EndeavourEntry.completed: boolean` with `status: EntryStatus`
    - Add optional `cost?: string` field to EndeavourEntry
    - Change `DowntimePeriod.id` from `number` to `string`
    - Add optional `date?: string` and `sessionNumber?: number` fields to DowntimePeriod
    - _Requirements: 2.1, 3.1, 3.2, 4.4, 4.5, 9.1_

  - [x] 1.2 Expand CLASS_ENDEAVOURS map in src/logic/endeavours.ts
    - Add entries for Priests, Doctors, Wizards, Entertainers, Soldiers, Servants, Nobles
    - Verify all 15 classes present with 1–10 options each
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [x] 2. Implement new pure logic functions in src/logic/endeavours.ts
  - [x] 2.1 Implement generateId, cycleStatus, migrateEntryStatus, and validateSessionNumber
    - `generateId()`: uses crypto.randomUUID with Math.random UUID v4 fallback
    - `cycleStatus(current: EntryStatus): EntryStatus`: cycles pending → in_progress → completed → pending
    - `migrateEntryStatus(entry)`: converts legacy boolean completed to status field, preserving other fields
    - `validateSessionNumber(value: string): number | null`: parses string, returns number if valid 1–9999 integer, else null
    - _Requirements: 2.6, 2.7, 3.5, 3.6, 4.1, 4.2, 4.3_

  - [x] 2.2 Implement move functions (movePeriodUp, movePeriodDown, moveEntryUp, moveEntryDown)
    - `movePeriodUp(periods, id)`: swaps period with predecessor, no-op at boundary
    - `movePeriodDown(periods, id)`: swaps period with successor, no-op at boundary
    - `moveEntryUp(periods, periodId, entryId)`: swaps entry within period
    - `moveEntryDown(periods, periodId, entryId)`: swaps entry within period
    - All functions preserve array length and element membership
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 2.3 Implement getCostSummary, buildPickerItems, and createEndeavourEntry
    - `getCostSummary(entries): string | null`: returns comma-separated non-empty costs or null
    - `buildPickerItems(className, isElfChar): PickerItem[]`: builds grouped picker items with unmatched class info message
    - `createEndeavourEntry(type: string): EndeavourEntry`: creates entry with UUID id, status "pending", empty cost
    - _Requirements: 6.1, 6.2, 6.3, 9.3, 9.4, 9.5_

  - [x] 2.4 Update existing functions for new types (createDowntimePeriod, removeDowntimePeriod, addEndeavourEntry, removeEndeavourEntry, updateEndeavourEntry, updateDowntimePeriod)
    - `createDowntimePeriod`: use generateId() for string id, add date: undefined, sessionNumber: undefined
    - Update all id parameter types from number to string
    - Ensure string comparison for id matching (supports legacy numeric-string and UUID ids)
    - _Requirements: 3.3, 4.1, 4.3, 4.6_

- [x] 3. Checkpoint - Verify logic module compiles
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create shared Toast component
  - [x] 4.1 Create Toast component at src/components/shared/Toast.tsx and Toast.module.css
    - Props: `message: string | null`, `duration?: number` (default 3000ms)
    - Uses `aria-live="polite"` on container for screen reader announcements
    - Fixed position bottom-centre of viewport, outside document flow
    - Auto-dismisses after duration; replaces existing toast if new message arrives (resets timer)
    - Renders nothing when message is null
    - _Requirements: 8.5, 8.6, 8.7, 8.8_

- [x] 5. Update EndeavoursPage component
  - [x] 5.1 Replace checkbox with status cycling control and add cost input
    - Replace checkbox `completed` toggle with status cycling button (calls cycleStatus)
    - Display status-dependent styling: pending (default), in_progress (distinct indicator), completed (strikethrough + reduced opacity 0.5–0.7)
    - Add cost text input field (maxLength 50) on each entry row adjacent to type label
    - Display cost summary line per period using getCostSummary when non-null
    - Wire migrateEntryStatus for backward compatibility when loading entries
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.6, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 5.2 Add date and session number fields to period header
    - Add date input (type="date") in period header after label
    - Add session number input (type="number", min=1, max=9999) in period header
    - Wire updateDowntimePeriod for date and sessionNumber fields
    - Use validateSessionNumber to reject invalid input, retain previous value
    - Clear field sets value to undefined
    - Display date and/or session number in header when set
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x] 5.3 Add move buttons for periods and entries
    - Add move-up/move-down buttons to each period header
    - Add move-up/move-down buttons to each entry row
    - Wire to movePeriodUp, movePeriodDown, moveEntryUp, moveEntryDown
    - Buttons are visible but perform no-op at boundaries (first/last)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 5.4 Integrate buildPickerItems and unmatched class info
    - Replace inline buildPickerItems logic with imported buildPickerItems function
    - Show non-selectable info message "No class endeavours found for [class name]" when class not in CLASS_ENDEAVOURS
    - Omit class group entirely when class is empty/undefined/whitespace
    - Use exact case-sensitive comparison for class matching
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 5.5 Integrate Toast notifications and update entry creation to use createEndeavourEntry
    - Add Toast component to EndeavoursPage
    - Show "Endeavour added" on entry add, "Endeavour removed" on entry remove
    - Show "Period added" on period add, "Period removed" on period remove
    - Replace Date.now() entry creation with createEndeavourEntry helper
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 4.3_

- [x] 6. Update CSS for touch targets and status styling in EndeavoursPage.module.css
  - [x] 6.1 Update EndeavoursPage.module.css with touch target sizing and status styles
    - Ensure all checkboxes, delete buttons, and move buttons have minimum 44×44px touch target
    - Maintain at least 8px spacing between adjacent interactive controls
    - Add status-dependent styles: in_progress distinct indicator (background/border/icon), completed strikethrough + opacity 0.5–0.7
    - Style move buttons consistently with existing delete button pattern
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 2.3, 2.4, 2.5_

- [x] 7. Checkpoint - Verify UI changes compile and render
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Property-based tests for logic module
  - [x] 8.1 Write property tests for CLASS_ENDEAVOURS constraints and status cycling (Properties 1–3)
    - **Property 1: CLASS_ENDEAVOURS map constraint** — verify at least 15 keys, each with 1–10 options
    - **Property 2: Status cycle determinism** — cycleStatus produces correct sequence, 3 applications return original
    - **Property 3: Legacy migration compatibility** — migrateEntryStatus maps completed=true to "completed", false to "pending"
    - **Validates: Requirements 1.1, 2.6, 2.7**

  - [x] 8.2 Write property tests for validation and ID generation (Properties 4–6)
    - **Property 4: Session number validation** — validateSessionNumber returns positive integer for valid 1–9999 strings, null otherwise
    - **Property 5: Generated IDs are valid UUID format** — generateId output matches UUID v4 regex
    - **Property 6: Mixed ID compatibility** — logic functions correctly locate items regardless of numeric-string vs UUID format
    - **Validates: Requirements 3.5, 3.6, 4.1, 4.3, 4.6**

  - [x] 8.3 Write property tests for reorder operations (Properties 7–8)
    - **Property 7: Move operations swap exactly two adjacent elements** — verify only target and neighbor swap, others unchanged; boundary returns unchanged
    - **Property 8: Reorder preserves collection membership** — array length and element IDs are preserved after any move
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7**

  - [x] 8.4 Write property tests for cost summary and round-trip operations (Properties 9–11)
    - **Property 9: Cost summary correctness** — null when no non-empty costs, comma-separated string otherwise
    - **Property 10: Add/remove period round-trip** — addDowntimePeriod then removeDowntimePeriod returns original array
    - **Property 11: Add/remove entry round-trip** — addEndeavourEntry then removeEndeavourEntry returns original entries
    - **Validates: Requirements 9.3, 9.4, 9.5, 10.1, 10.2**

  - [x] 8.5 Write property tests for update invariants and existing function properties (Properties 12–16)
    - **Property 12: updateEndeavourEntry preserves entry count** — targeted period entries length unchanged
    - **Property 13: updateDowntimePeriod preserves period count** — array length unchanged
    - **Property 14: parseStatusTier output range** — returns value in {"gold", "silver", "brass", null}
    - **Property 15: getDefaultSlots invariant** — returns positive integer ≥ 1 for all valid tiers
    - **Property 16: createDowntimePeriod structure validity** — entries empty, label matches pattern, slots ≥ 1, id is UUID, date/sessionNumber undefined
    - **Validates: Requirements 10.3, 10.4, 10.6, 10.7, 10.8**

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design's 16 properties
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout, matching the existing project stack (React 19 + TypeScript + Vite)
- All property tests go in `src/logic/__tests__/endeavours.property.test.ts` using fast-check v4.8.0 + vitest v4.1.2
- Backward compatibility with legacy numeric IDs and boolean `completed` field is maintained via defensive coercion

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 2, "tasks": ["2.4", "4.1"] },
    { "id": 3, "tasks": ["5.1", "5.2", "5.3", "5.4"] },
    { "id": 4, "tasks": ["5.5", "6.1"] },
    { "id": 5, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 6, "tasks": ["8.4", "8.5"] }
  ]
}
```
