# Design Document

## Overview

This design introduces a single per-character **unified event log** (`character.eventLog`) that becomes the shared home for display- and audit-oriented history. It follows the **mirror + migrate** model established in requirements:

- **Migrate:** the roll history (currently a global, non-per-character localStorage store via `useRollHistory`) moves fully into `character.eventLog` as `roll` events.
- **Mirror:** the advancement log/archive and the estate ledger remain the authoritative typed structures (they drive undo/redo, archive restore, and wealth math). When they record an entry, they additionally emit a read-only mirror event into `eventLog`.
- **Native:** future features (combat, initiative, conditions) write only to `eventLog`.

A new pure `Log_Service` module owns append, id generation, rotation, filtering, and clearing. A `TimelineView` component renders the log with category filters and a confirm-guarded clear. The character schema version is bumped so exports include the log and imports normalise it.

The guiding constraint: **the event log is never read to reconstruct mechanics.** XP totals, advancement undo/redo, archive restore, and treasury balances all continue to derive from their existing typed structures. This keeps the change additive and low-risk.

### Goals

- One structured event shape, one append path, one cap/rotation policy, one clear, one timeline UI.
- Fix the roll-history "not per-character" bug as a side effect of migration.
- Preserve undo/redo, archive restore, and wealth math untouched.
- Backward/forward compatible persistence and export/import.

### Non-Goals

- Replacing `advancementLog`/`advancementLogArchive` or `estate.ledger` (explicitly out of scope).
- Cross-character/global timeline; per-event editing or deletion.
- Migrating `sessionHistory`, `doomRuneActivations`, or `log: string[]` (optional future work).

## Architecture

```
                         ┌─────────────────────────────────────────┐
                         │            character.eventLog            │
                         │              LogEvent[]                  │
                         └───────────────▲───────────────▲─────────┘
                                         │ append         │ read (display only)
              ┌──────────────────────────┴──┐        ┌────┴─────────────┐
              │        Log_Service           │        │   TimelineView    │
              │  appendEvent / rotate /      │        │  (filter, clear)  │
              │  filterByCategory / clear /  │        └───────────────────┘
              │  normaliseOnLoad             │
              └───▲──────────▲──────────▲────┘
                  │          │          │
        native events   mirror events   migrate
                  │          │          │
   ┌──────────────┴┐  ┌──────┴───────┐  ┌┴────────────────────────────┐
   │ combat/init/… │  │ advancement  │  │ roll history                 │
   │ (Native)      │  │ + wealth     │  │ (useRollHistory → eventLog)  │
   │ writes only   │  │ (mirror only;│  │ fully migrated; legacy       │
   │ to eventLog   │  │  typed data  │  │ global key migrated once     │
   │               │  │  authoritative)│ then abandoned               │
   └───────────────┘  └──────────────┘  └──────────────────────────────┘
```

### Data flow

- **Append (native):** feature calls `appendEvent(character, {category, type, payload, summary})` → returns a new `Character` with the event appended and rotated. Feature commits via the existing `updateCharacter((c) => appendEvent(c, …))`.
- **Append (mirror):** the existing advancement/ledger writers, which already build their typed entry and return a new character, additionally pipe that character through `appendEvent(...)` with a derived summary. One helper per source keeps the mapping in one place.
- **Read:** `TimelineView` receives `character.eventLog` and renders it via `filterByCategory`. It never mutates mechanics.
- **Load normalisation:** on character load (in `loadCharacter`), `eventLog` is defaulted to `[]` when absent and passed through rotation to enforce the cap for oversized imports.

## Components and Interfaces

### 1. Types (`src/types/character.ts`)

```ts
export type LogCategory =
  | 'roll'
  | 'advancement'
  | 'combat'
  | 'wealth'
  | 'condition'
  | 'session'
  | 'system';

export interface LogEvent {
  id: string;              // unique within a character's eventLog
  timestamp: number;       // ms since epoch
  category: LogCategory;
  type: string;            // discriminator within a category, e.g. 'roll.skill', 'combat.attack'
  summary: string;         // human-readable, pre-rendered for the timeline
  payload: Record<string, unknown>; // structured detail; shape depends on type
}
```

Add to the `Character` interface as an **optional** field to match the existing extension pattern:

```ts
  eventLog?: LogEvent[];
```

`BLANK_CHARACTER` gets `eventLog: []` so new characters start with an empty array. (Optional on the type for backward-compatible loads; concrete on new characters.)

**Why `id: string`?** Native events, migrated rolls, and mirror events come from different sources; a string id generated via the existing `crypto.randomUUID()` fallback (already used in `character-manager.ts` and `InitiativeTracker`) avoids collisions across sources without a shared counter.

**Why `payload: Record<string, unknown>`?** Requirement 7 mandates that new event types be addable without changing the `Log_Service` public shape. A structured-but-open payload keeps `appendEvent` stable; per-category payload interfaces (below) are layered on top for the writers/readers that care.

Per-category payload shapes (documented, not enforced at the `appendEvent` boundary):

```ts
export interface RollEventPayload {        // category 'roll'
  name: string;            // skill or characteristic name
  roll: number;            // d100 result
  target: number;          // target number
  sl: number;              // success levels
  passed: boolean;
  isCritical?: boolean;
  isFumble?: boolean;
}
export interface AdvancementEventPayload { // category 'advancement' (mirror)
  entryType: string;       // AdvancementEntry.type
  name: string;
  from: number; to: number;
  xpCost: number;
  undo?: boolean;          // true for undo mirror events
}
export interface WealthEventPayload {      // category 'wealth' (mirror)
  entryType: string;       // LedgerEntry.type
  description: string;
  amount: { d: number; ss: number; gc: number };
}
```

### 2. Log_Service (`src/logic/event-log.ts`) — new, pure module

```ts
export const EVENT_LOG_CAP = 200;

export interface AppendEventInput {
  category: LogCategory;
  type: string;
  summary: string;
  payload?: Record<string, unknown>;
}

/** Append an event, assign id+timestamp, rotate to cap. Returns a NEW character. */
export function appendEvent(character: Character, input: AppendEventInput): Character;

/** Enforce the cap, keeping the most recent by timestamp. Pure. */
export function rotate(events: LogEvent[], cap?: number): LogEvent[];

/** Return the log (or []) rotated to cap — used on load/import. Pure. */
export function normaliseEventLog(events: LogEvent[] | undefined, cap?: number): LogEvent[];

/** Filter by a set of categories; empty/undefined set → all events. Pure. */
export function filterByCategory(events: LogEvent[], categories?: Set<LogCategory>): LogEvent[];

/** Return a NEW character with an empty eventLog. */
export function clearEventLog(character: Character): Character;
```

Design points:
- `appendEvent` is the **single public append path** (Req 2.1). It generates a UUID id (Req 2.2), sets `timestamp` to `Date.now()` (Req 2.3), never mutates its input (Req 2.4), and appends preserving order (Req 2.5) then calls `rotate` (Req 3).
- `EVENT_LOG_CAP = 200`. Rationale: higher than the old roll cap (50) and advancement archive threshold (100) so the combined stream retains enough history to be useful, while bounding localStorage growth. The cap is a single constant, easy to tune. `rotate` keeps the **newest** events (Req 3.3): it slices the tail after a stable sort/most-recent-keep. Events are stored oldest→newest internally; `rotate` drops from the front.
- Ordering convention: `eventLog` is stored **append-order (oldest first)**; the timeline reverses for display (Req 8.1). This keeps `appendEvent` a cheap push + tail-trim.

### 3. Mirror helpers (`src/logic/event-log-mirrors.ts`) — new

Two small pure helpers that map a just-recorded typed entry to an `appendEvent` call, co-located so the summary formatting lives in one place:

```ts
export function mirrorAdvancement(character: Character, entry: AdvancementEntry, opts?: { undo?: boolean }): Character;
export function mirrorLedger(character: Character, entry: LedgerEntry): Character;
```

- `mirrorAdvancement` builds summary like `"XP: Advance WS 5→6 (−100 XP)"` / for undo `"Undo: Advance WS 6→5 (+100 XP)"` (Req 5.2, 5.4) and appends a `category:'advancement'` event.
- `mirrorLedger` builds summary like `"Wealth: Sold loot +2 GC 5 ss"` including the amount (Req 6.2) and appends a `category:'wealth'` event.

These are invoked from the **existing** advancement and ledger write paths (see Integration below), so the typed structures remain authoritative and are written first; the mirror is a follow-on transform on the returned character.

### 4. Roll migration

- `useRollHistory` is **replaced at its call sites** by writing rolls through `appendEvent` on the active character. Because rolls must be per-character (Req 4.3) and the character is the persistence unit, `addRoll` becomes `updateCharacter((c) => appendEvent(c, { category:'roll', type: 'roll.'+kind, summary, payload }))`.
  - Concretely: `CombatPage`/`CharacterPage` currently receive `addRoll`/`rollHistory`/`clearHistory` props sourced from the `useRollHistory` hook in `App.tsx`. These become derived from the character: `rollHistory` → `character.eventLog` filtered to `roll`; `addRoll` → append a roll event via `updateCharacter`; `clearHistory` → routed to the timeline clear (or a roll-only clear is out of scope — clear is global per Req 9).
- **One-time legacy migration** (Req 4.5, 4.6): in `runMigration()` (already called on startup in `App.tsx`), if `localStorage['wfrp-roll-history']` exists, convert its entries to `roll` LogEvents and append them to the **active** character's eventLog (dedup by not re-importing if a migration marker is set), then remove the legacy key so new rolls never write there again. A migration marker (`localStorage['wfrp-roll-history-migrated'] = '1'`) prevents re-import.
  - Ambiguity handled: legacy roll history was global (not attributable to a specific character). Design decision: migrate legacy entries into the **currently active** character only, once. This is documented as a known imperfect attribution in the design (the legacy data had no character association to recover).
- `RollHistoryPanel` is retained but re-sourced: it accepts the roll-filtered events (mapped to its existing display shape) so its tests and placement (Abilities tab, CombatPage) keep working. A thin adapter maps `LogEvent`(roll) → the panel's current `RollHistoryEntry`-like display, minimising churn.

### 5. TimelineView (`src/components/shared/TimelineView.tsx`) — new

- Props: `events: LogEvent[]`, `onClear: () => void`.
- Renders reverse-chronological (Req 8.1), each row showing `summary` + formatted `timestamp` (Req 8.2).
- Category filter: a row of toggle chips (matching the app's existing chip/button styling and the `ui-layout` steering rule for touch targets); none selected = all (Req 8.3, 8.4).
- Empty state via the existing `EmptyState` component (Req 8.5).
- Clear button → existing `ConfirmDialog` (Req 9.1, 9.2) → `onClear` → `clearEventLog` (Req 9.3). Clear only empties `eventLog`; it does not touch advancement/ledger (Req 9.4) because those are separate fields.
- Surfaced from a location the `ux-audit-improvements` spec will wire (Req 8 there); this spec provides the component and a minimal mount point (e.g., a collapsible "Timeline" section) so the feature is usable standalone.

### 6. Persistence & export/import

- **Load** (`character-manager.ts loadCharacter`): after the existing `BLANK_CHARACTER` merge, set `merged.eventLog = normaliseEventLog(merged.eventLog)` (defaults to `[]`, applies cap for oversized imports — Req 10.1, 11.3).
- **Export** (`export-import.ts exportToJSON`): no code change needed — `JSON.stringify(character)` already includes `eventLog` (Req 11.1). Bump `CURRENT_VERSION` 7 → 8 so exports carry the new schema and older apps that reject `_v > their max` behave predictably.
- **Import** (`importFromJSON`): existing merge fills `eventLog` from parsed data or default; then `normaliseEventLog` enforces the cap (Req 11.2, 11.3). Pre-v8 imports simply have no `eventLog` → treated empty (Req 10.4).

## Data Models

| Field | Type | Storage | Authoritative for | Emits mirror? |
|---|---|---|---|---|
| `eventLog` (new) | `LogEvent[]` | per-character localStorage | display/audit only | n/a |
| `advancementLog` / `advancementLogArchive` | `AdvancementEntry[]` | per-character | XP undo/redo, archive | yes → `advancement` |
| `estate.ledger` | `LedgerEntry[]` | per-character | wealth math | yes → `wealth` |
| legacy `wfrp-roll-history` | `RollHistoryEntry[]` | **global** (removed) | — | migrated → `roll` |

## Integration Points

1. `src/types/character.ts` — add `LogEvent`/`LogCategory`, `eventLog?` on `Character`, `eventLog: []` in `BLANK_CHARACTER`.
2. `src/logic/event-log.ts` (new) — `Log_Service`.
3. `src/logic/event-log-mirrors.ts` (new) — advancement/ledger mirror helpers.
4. `src/logic/advancement.ts` — after building each `AdvancementEntry` (advance char/skill/talent/level/switch and undo/redo), pass the returned character through `mirrorAdvancement`. This is the single place these entries are created (per prior audit).
5. Estate/wealth ledger write path — after pushing a `LedgerEntry`, pass through `mirrorLedger`.
6. `src/App.tsx` — replace `useRollHistory` wiring: derive `rollHistory` from `character.eventLog`; route `addRoll`/`clearHistory` to `appendEvent`/timeline clear.
7. `src/storage/migration.ts` (`runMigration`) — one-time legacy roll-history import + marker + key removal.
8. `src/storage/character-manager.ts` — `normaliseEventLog` on load.
9. `src/storage/export-import.ts` — bump `CURRENT_VERSION` to 8.
10. `src/components/shared/TimelineView.tsx` (new) + a mount point; `RollHistoryPanel` re-sourced via adapter.

## Error Handling

- **localStorage quota:** appends flow through the existing `updateCharacter`→`saveCharacter`→`setItem` path, which already returns `StorageWriteResult` and surfaces the storage-error toast (`useStorageErrorToast`). The `EVENT_LOG_CAP` bounds growth. No new error surface needed; rotation is the primary mitigation.
- **Malformed persisted log:** `normaliseEventLog` guards non-array input → `[]` (mirrors the defensive parsing already in `useRollHistory.loadFromStorage`).
- **Migration failure:** the one-time roll migration is wrapped so any exception leaves the legacy key intact and does not block app init (consistent with `runMigration`'s existing best-effort posture).
- **Mirror never throws into the source path:** mirror helpers are pure transforms applied after the authoritative write; if a summary can't be built, it falls back to a generic summary rather than failing the advancement/ledger write.

## Testing Strategy

Property/unit tests for the pure `Log_Service` (mirrors the existing `useRollHistory.property.test.ts` style):
- `appendEvent`: returns new object (no mutation), unique ids, timestamp set, order preserved (Req 2).
- `rotate`/cap: length never exceeds `EVENT_LOG_CAP`; most-recent retained; property test over random append sequences (Req 3).
- `filterByCategory`: empty set → all; single/multi category subsets correct (Req 8.3, 8.4).
- `normaliseEventLog`: undefined/non-array → []; oversized → capped (Req 10.1, 11.3).
- `clearEventLog`: empties eventLog; leaves `advancementLog`, `advancementLogArchive`, `estate.ledger` untouched (Req 9.3, 9.4).

Mirror tests:
- `mirrorAdvancement` appends an `advancement` event with correct summary for advance and undo; does not alter `advancementLog` (Req 5).
- `mirrorLedger` appends a `wealth` event including amount; does not alter treasury math (Req 6).
- Advancement undo/redo integration test: undo/redo still operate on `advancementLog` and are unaffected by eventLog contents (Req 5.3).

Migration tests:
- Legacy `wfrp-roll-history` present → entries become `roll` events on the active character, marker set, legacy key removed, no duplicates on second run (Req 4.5, 4.6).
- Round-trip: save→load preserves eventLog (Req 1.5); pre-feature character loads with empty eventLog and unchanged ledger/advancement (Req 10.1, 10.2).

Export/import tests:
- Export includes eventLog; import restores it; oversized import capped; pre-v8 import → empty eventLog (Req 11).

Component tests for `TimelineView`:
- Reverse-chronological render, summary+timestamp shown, category filter, empty state, clear→confirm→cleared (Req 8, 9). Reuse `RollHistoryPanel` tests via the adapter to confirm no regression in roll display.

## Design Decisions & Rationale

- **Mirror + migrate over full replace (Req chosen model).** Full replacement would force reimplementing advancement undo/redo and wealth math on top of a generic log — high risk for no user-visible gain. Mirroring preserves those systems verbatim and still delivers one timeline.
- **String UUID ids.** Multiple independent producers (rolls, mirrors, native) can't share a monotonic counter safely; UUID sidesteps coordination and matches existing id generation in the codebase.
- **Open `payload` + documented per-category interfaces.** Satisfies "add new event types without changing Log_Service" (Req 7.3) while giving writers/readers typed shapes where useful.
- **Store oldest-first, display newest-first.** Cheap appends (push + tail trim) and a single reversal at the view boundary.
- **Legacy roll migration attributes to the active character.** The legacy store had no character association; migrating to the active character once is the least-surprising recoverable behaviour, documented as a known limitation.
- **Version bump to 8.** Makes the schema change explicit for import validation and future migrations; older builds correctly reject newer exports via the existing `_v > CURRENT_VERSION` guard.

## Open Questions Deferred to Tasks/Implementation

- Exact mount point/surface for `TimelineView` (this spec provides a minimal collapsible section; `ux-audit-improvements` Req 13 chooses the primary surface and filters).
- Whether `clearHistory` should offer a roll-only clear in addition to the global clear (currently global-only per Req 9); can be revisited if users want granular clears.
- Whether to also mirror `sessionHistory`/`doomRuneActivations` (flagged optional; not in this spec's scope).
