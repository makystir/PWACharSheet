# Implementation Plan: Unified Event Log

## Overview

This plan builds a single per-character `eventLog` using the **mirror + migrate** model. Work proceeds from the data model and the pure `Log_Service` (`src/logic/event-log.ts`) outward to the mirror helpers (`src/logic/event-log-mirrors.ts`), then wiring: advancement + ledger emit mirror events, roll history migrates into the log (both live-write re-sourcing and a one-time legacy import), persistence normalises on load, export bumps the schema version, and finally the `TimelineView` component surfaces the log with category filters and a confirm-guarded clear. The `RollHistoryPanel` is re-sourced via an adapter so existing roll-display tests keep passing.

The invariant enforced throughout: **the event log is never read to reconstruct mechanics** — `advancementLog`/`advancementLogArchive` (undo/redo, archive) and `estate.ledger` (wealth math) stay authoritative and only mirror into the log. Property-based tests (fast-check, ≥100 iterations) validate the log-service correctness properties; unit/render/integration tests cover mirrors, migration, persistence, export/import, and the timeline UI. Each step ends wired into a consumer so no orphaned code remains.

## Tasks

- [x] 1. Add the event-log data model
  - [x] 1.1 Define `LogCategory`, `LogEvent`, and per-category payload interfaces
    - Add `LogCategory` (`'roll' | 'advancement' | 'combat' | 'wealth' | 'condition' | 'session' | 'system'`), `LogEvent { id: string; timestamp: number; category; type: string; summary: string; payload: Record<string, unknown> }`, and documented `RollEventPayload` / `AdvancementEventPayload` / `WealthEventPayload` interfaces in `src/types/character.ts`
    - Add optional `eventLog?: LogEvent[]` to the `Character` interface; add `eventLog: []` to `BLANK_CHARACTER`
    - Confirm no `deepMerge`/migration change is required for load defaulting beyond the `normaliseEventLog` step in task 6 (optional field, merge copies arrays verbatim)
    - _Requirements: 1.1, 1.2, 1.3, 10.1_

- [x] 2. Implement the pure `Log_Service` in `src/logic/event-log.ts`
  - [x] 2.1 Implement `appendEvent`, `rotate`, and `EVENT_LOG_CAP`
    - Add `EVENT_LOG_CAP = 200`
    - Implement `appendEvent(character, { category, type, summary, payload? })`: assign a unique string `id` (reuse the `crypto.randomUUID()` + fallback pattern already in `character-manager.ts`), set `timestamp = Date.now()`, append to a copy of `eventLog` (oldest-first), then apply `rotate`; return a NEW character without mutating the input
    - Implement `rotate(events, cap = EVENT_LOG_CAP)`: keep the most-recent `cap` events by dropping from the front (oldest-first storage)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4_

  - [x] 2.2 Implement `filterByCategory`, `normaliseEventLog`, and `clearEventLog`
    - `filterByCategory(events, categories?)`: empty/undefined set → all events; otherwise events whose category is in the set
    - `normaliseEventLog(events, cap = EVENT_LOG_CAP)`: non-array/undefined → `[]`; otherwise `rotate(events, cap)`
    - `clearEventLog(character)`: return a NEW character with `eventLog: []`, leaving all other fields (including `advancementLog`, `advancementLogArchive`, `estate.ledger`) untouched
    - _Requirements: 7.1, 8.3, 8.4, 9.3, 9.4, 10.1, 11.3_

  - [x] 2.3 Write property test for append behaviour
    - **Property 1: appendEvent is immutable, unique-id, timestamped, order-preserving**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
    - Location `src/logic/__tests__/event-log.property.test.ts`; generate random append sequences; assert the input character is not mutated, all event ids are unique, each appended event's timestamp is set, and append order is preserved (below the cap); ≥100 iterations; tag `// Feature: unified-event-log, Property 1: ...`

  - [x] 2.4 Write property test for capping/rotation
    - **Property 2: Rotation bounds length and retains the most recent events**
    - **Validates: Requirements 3.2, 3.3, 3.4**
    - Same file as 2.3; generate append sequences longer than `EVENT_LOG_CAP`; assert length never exceeds the cap after any append and that the retained events are exactly the most-recent `cap` by insertion order; ≥100 iterations; tagged comment

  - [x] 2.5 Write property test for filter and normalise
    - **Property 3: Filter and normalise correctness**
    - **Validates: Requirements 8.3, 8.4, 10.1, 11.3**
    - Same file as 2.3; for `filterByCategory`: empty set → identity, single/multi-category subsets equal manual filter; for `normaliseEventLog`: undefined/non-array → `[]`, oversized input → capped; ≥100 iterations; tagged comment

  - [x] 2.6 Write unit test for `clearEventLog` isolation
    - Assert `clearEventLog` empties `eventLog` and leaves `advancementLog`, `advancementLogArchive`, and `estate.ledger` referentially/structurally unchanged
    - _Requirements: 9.3, 9.4_

- [x] 3. Checkpoint - core log service
  - Run the new event-log tests and type-check; ensure all pass; ask the user if questions arise.

- [x] 4. Implement mirror helpers in `src/logic/event-log-mirrors.ts`
  - [x] 4.1 Implement `mirrorAdvancement` and `mirrorLedger`
    - `mirrorAdvancement(character, entry: AdvancementEntry, opts?: { undo?: boolean })`: build a summary (e.g. `"XP: Advance WS 5→6 (−100 XP)"`, or for `undo` `"Undo: Advance WS 6→5 (+100 XP)"`) and `appendEvent` a `category:'advancement'` event with an `AdvancementEventPayload`; wrap summary construction so a formatting failure falls back to a generic summary rather than throwing into the caller
    - `mirrorLedger(character, entry: LedgerEntry)`: build a summary including the monetary amount (e.g. `"Wealth: Sold loot +2 GC 5 ss"`) and `appendEvent` a `category:'wealth'` event with a `WealthEventPayload`
    - Both are pure transforms applied to the character AFTER the authoritative write; neither reads or alters `advancementLog`/`estate.ledger`
    - _Requirements: 5.2, 5.4, 6.2_

  - [x] 4.2 Write unit tests for the mirror helpers
    - `mirrorAdvancement` appends one `advancement` event with correct summary for a normal advance and for an undo (`undo: true`), and does not modify `advancementLog`/`advancementLogArchive` (Req 5.2, 5.4)
    - `mirrorLedger` appends one `wealth` event whose summary includes the amount, and does not modify `estate.ledger` or treasury fields (Req 6.2)
    - _Requirements: 5.2, 5.4, 6.2_

- [x] 5. Wire mirror emission into the authoritative write paths
  - [x] 5.1 Emit advancement mirror events
    - In `src/logic/advancement.ts`, at each site that appends an `AdvancementEntry` (advance characteristic/skill/talent, career level, career switch) and at the undo/redo sites, pass the returned character through `mirrorAdvancement` (using `opts.undo` for undo)
    - Confirm undo/redo continue to operate solely on `advancementLog` and are not affected by `eventLog` contents
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 5.2 Emit wealth mirror events
    - At the estate/wealth ledger write path (where a `LedgerEntry` is pushed to `estate.ledger`), pass the returned character through `mirrorLedger`
    - Confirm treasury/income/expense computations still read `estate.ledger` and never read `eventLog`
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 5.3 Write integration test for advancement undo/redo independence
    - Perform an advance (asserts an `advancement` mirror event is appended), then undo and redo; assert XP totals and `advancementLog`/archive reconstruct correctly from the typed structures regardless of `eventLog` contents, and that undo appends an undo mirror event rather than deleting prior events
    - _Requirements: 5.3, 5.4, 5.5_

- [x] 6. Migrate roll history into the event log
  - [x] 6.1 Re-source live roll writes and reads through the event log
    - In `src/App.tsx`, replace the `useRollHistory` wiring so `addRoll` becomes `updateCharacter((c) => appendEvent(c, { category: 'roll', type: 'roll.'+kind, summary, payload }))` with a `RollEventPayload` capturing name, roll, target, sl, passed, isCritical, isFumble
    - Derive the `rollHistory` prop from `filterByCategory(character.eventLog, {'roll'})`; route `clearHistory` to the timeline clear path
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

  - [x] 6.2 Adapt `RollHistoryPanel` to the event-log source
    - Add a thin adapter mapping `LogEvent`(category `roll`) → the display shape `RollHistoryPanel` currently consumes, so its placement (Character Abilities tab, CombatPage) and existing tests keep working
    - Keep `RollHistoryPanel`'s public props stable where possible; if props change, update its call sites accordingly
    - _Requirements: 4.4_

  - [x] 6.3 One-time legacy roll-history migration
    - In `src/storage/migration.ts` (`runMigration`), if `localStorage['wfrp-roll-history']` exists and `localStorage['wfrp-roll-history-migrated']` is not set, convert legacy entries to `roll` LogEvents, append them to the ACTIVE character's `eventLog`, set the migration marker, and remove the legacy key; wrap in try/catch so any failure leaves the legacy key intact and does not block app init
    - Ensure no duplicate import on a second run (marker check) and that new rolls never write to the legacy key afterward
    - _Requirements: 4.5, 4.6_

  - [x] 6.4 Write unit tests for roll migration
    - Legacy key present + no marker → entries become `roll` events on the active character, marker set, legacy key removed; second `runMigration` run imports nothing (no duplicates) (Req 4.5, 4.6)
    - After migration, `addRoll` writes a `roll` event to the character's `eventLog` and not to the legacy key (Req 4.3, 4.6)
    - _Requirements: 4.3, 4.5, 4.6_

- [x] 7. Persistence, export, and import
  - [x] 7.1 Normalise the event log on load
    - In `src/storage/character-manager.ts` `loadCharacter`, after the `BLANK_CHARACTER` merge set `merged.eventLog = normaliseEventLog(merged.eventLog)` so absent logs default to `[]` and oversized imported logs are capped
    - _Requirements: 1.4, 10.1, 10.2, 11.3_

  - [x] 7.2 Bump the export schema version
    - In `src/storage/export-import.ts`, bump `CURRENT_VERSION` from 7 to 8; confirm `exportToJSON` already serialises `eventLog` (no code change needed) and that `importFromJSON` merges `eventLog` then relies on load-time `normaliseEventLog`
    - _Requirements: 11.1, 11.2_

  - [x] 7.3 Write persistence and export/import tests
    - Save→load round-trip preserves `eventLog` events (Req 1.5)
    - Pre-feature character (no `eventLog`) loads with `eventLog: []` and unchanged `advancementLog`/`advancementLogArchive`/`estate.ledger` (Req 10.1, 10.2)
    - Export includes `eventLog`; import of a v8 export restores it; oversized imported `eventLog` is capped on load; pre-v8 import → empty `eventLog` (Req 10.4, 11.1, 11.2, 11.3)
    - _Requirements: 1.5, 10.1, 10.2, 10.4, 11.1, 11.2, 11.3_

- [x] 8. Build the `TimelineView` component
  - [x] 8.1 Implement `TimelineView` in `src/components/shared/TimelineView.tsx`
    - Props `{ events: LogEvent[]; onClear: () => void }`; render events reverse-chronological (map + reverse of the oldest-first store), each row showing `summary` and a formatted `timestamp`
    - Category filter as toggle chips (matching the app's chip/button styling and the `ui-layout` steering rule for touch targets); none selected → all; use `filterByCategory`
    - Empty state via the existing `EmptyState` component
    - Clear control → existing `ConfirmDialog` → `onClear`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2_

  - [x] 8.2 Mount `TimelineView` at a minimal standalone surface
    - Add a collapsible "Timeline" section (existing `CollapsibleSection` pattern) on a character-relevant surface, passing `character.eventLog` and an `onClear` that calls `updateCharacter((c) => clearEventLog(c))`
    - Note: the primary/combat surface and richer filtering are chosen by the `ux-audit-improvements` spec (its Req 13); this task provides a usable standalone entry point only
    - _Requirements: 8.1, 9.1, 9.3_

  - [x] 8.3 Write render tests for `TimelineView`
    - Renders events newest-first with summary + timestamp; category filter narrows to selected categories and shows all when none selected; empty state shown for an empty log; clear triggers confirm then calls `onClear` (Req 8.1–8.5, 9.1, 9.2)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2_

  - [x] 8.4 Confirm no regression in roll display
    - Run the existing `RollHistoryPanel` tests against the event-log-sourced adapter; assert roll entries still render in reverse-chronological order and the panel's clear behaviour is intact
    - _Requirements: 4.4_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Run the full test suite, `tsc --noEmit`, and `npm run build`; ensure all pass; ask the user if questions arise.

## Notes

- The event log is display/audit only and is NEVER read to reconstruct XP totals, advancement undo/redo, archive contents, or treasury balances (Req 5.5, 6.3). Source-of-truth structures stay authoritative.
- `advancementLog`/`advancementLogArchive` and `estate.ledger` are preserved unchanged; mirroring is a follow-on transform after their authoritative write (Req 5.1, 6.1).
- Legacy roll history was a single global localStorage key with no character association; the one-time migration attributes those entries to the ACTIVE character and is documented as a known limitation.
- `EVENT_LOG_CAP = 200` (above the old roll cap of 50 and advancement-archive threshold of 100); it is a single tunable constant.
- Property-based tests use `fast-check`, run ≥100 iterations, and are tagged `// Feature: unified-event-log, Property N: ...`.
- Storage-quota handling rides the existing `updateCharacter → saveCharacter → setItem` path (`StorageWriteResult` + storage-error toast); rotation is the primary growth mitigation. No new error surface is introduced.
- `TimelineView` uses the existing `EmptyState`, `ConfirmDialog`, and `CollapsibleSection` components and follows the `ui-layout` steering rule; it does not create a new persistence store.
- This spec is a dependency of `ux-audit-improvements` (its Req 13 history-review surface and its combat/initiative event logging). It must be completed first.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "2.5", "2.6"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["4.2", "5.1", "5.2"] },
    { "id": 5, "tasks": ["5.3", "6.1", "6.2"] },
    { "id": 6, "tasks": ["6.3", "7.1", "7.2"] },
    { "id": 7, "tasks": ["6.4", "7.3", "8.1"] },
    { "id": 8, "tasks": ["8.2", "8.3", "8.4"] }
  ]
}
```
