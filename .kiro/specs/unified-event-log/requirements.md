# Requirements Document

## Introduction

The application currently maintains several independent, inconsistent log-like systems: the advancement log and its archive (`character.advancementLog` / `advancementLogArchive`, typed `AdvancementEntry[]`, per-character, drives undo/redo and archive restore), the roll history (`useRollHistory`, `RollHistoryEntry[]`, stored under a single **global** localStorage key that is not scoped per character, capped at 50), the estate ledger (`estate.ledger`, `LedgerEntry[]`, per-character, feeds wealth tracking), the session history (`sessionHistory`), and assorted scattered logs (`doomRuneActivations`, `log: string[]`, disease timestamps). Each new feature that wants a history has reinvented its own storage, shape, cap, and UI.

This feature introduces a single **unified event log** on the character: an append-only, per-character stream of structured events with a consistent shape, one capping/rotation policy, one clear operation, and one filterable timeline UI. It is intended to be the single home for **display- and audit-oriented history**.

The unification is deliberately **additive/observational**, not a rewrite of mechanics (the "mirror + migrate" model):

- Systems that are the **source of truth for mechanics** — the advancement log (undo/redo, archive restore) and the estate ledger (wealth math) — retain their existing typed structures unchanged, and additionally **emit a mirror event** into the unified log so the timeline can show them.
- The **roll history** is purely observational and is currently not even scoped per character; it **migrates fully** into the unified log (and in doing so becomes correctly per-character).
- **New features** (e.g. combat actions, initiative rolls, condition changes) write **only** to the unified log.

This spec is a foundational dependency: the `ux-audit-improvements` spec's roll-history-review and combat-log surfaces build on top of the timeline this feature provides.

## Glossary

- **Event_Log**: The append-only, per-character array of `LogEvent` records stored on the character as `character.eventLog`.
- **LogEvent**: A single structured record in the Event_Log with a stable shape: a unique `id`, a `timestamp` (ms since epoch), a `category`, a discriminated `type`, a structured `payload`, and a human-readable `summary` string.
- **Category**: A coarse grouping used for filtering the timeline. The defined categories are `roll`, `advancement`, `combat`, `wealth`, `condition`, `session`, and `system`.
- **Mirror_Event**: A LogEvent emitted by a source-of-truth system (advancement log or estate ledger) that reflects an entry recorded in that system's own typed structure. Mirror_Events are for display only and are never read back to reconstruct the source system's state.
- **Source_Of_Truth_System**: A system whose typed structure remains authoritative for mechanics and is not replaced by the Event_Log. In this feature: the advancement log/archive (drives undo/redo and archive restore) and the estate ledger (drives wealth math).
- **Migrated_System**: A system that is fully moved into the Event_Log and no longer maintains a separate structure. In this feature: the roll history.
- **Native_Event**: A LogEvent written directly by a feature that has no separate source-of-truth structure (e.g. a future combat or initiative event).
- **Log_Cap**: The maximum number of LogEvents retained in the active Event_Log before rotation occurs.
- **Rotation**: The policy that removes the oldest LogEvents once the Event_Log exceeds the Log_Cap, preserving the most recent events.
- **Timeline_View**: The user-facing UI that renders the Event_Log in reverse-chronological order with Category filters and a clear control.
- **Category_Filter**: The Timeline_View control that limits displayed events to one or more selected Categories.
- **Log_Service**: The single logic module responsible for appending events, generating ids, applying Rotation, filtering, and clearing.
- **Roll_History_Consumer**: Any existing UI or hook that today reads roll history via `useRollHistory` (e.g. quick-roll results, roll result display consumers).

## Requirements

### Requirement 1: Unified event log data model

**User Story:** As a developer, I want a single structured event type on the character, so that all display-oriented history shares one shape instead of reinventing bespoke structures.

#### Acceptance Criteria

1. THE Character model SHALL include a field `eventLog` typed as an array of LogEvent.
2. THE LogEvent type SHALL include a unique `id`, a numeric `timestamp` in milliseconds since epoch, a `category` drawn from the defined Category set, a discriminated `type` string, a structured `payload`, and a human-readable `summary` string.
3. THE Category of a LogEvent SHALL be one of `roll`, `advancement`, `combat`, `wealth`, `condition`, `session`, or `system`.
4. WHERE a character is loaded without an `eventLog` field, THE Log_Service SHALL treat the Event_Log as empty.
5. WHEN a character containing an Event_Log is saved and then loaded, THE Log_Service SHALL produce an Event_Log whose events equal the events before saving.

### Requirement 2: Appending events

**User Story:** As a developer, I want one way to append an event, so that every feature logs consistently.

#### Acceptance Criteria

1. THE Log_Service SHALL expose a single append operation that accepts an event's category, type, payload, and summary, and returns a character with the new LogEvent appended.
2. WHEN the Log_Service appends a LogEvent, THE Log_Service SHALL assign it a unique `id` that does not collide with any existing event `id` in that character's Event_Log.
3. WHEN the Log_Service appends a LogEvent, THE Log_Service SHALL set its `timestamp` to the time of the append.
4. THE Log_Service SHALL append events without mutating the input character object (it SHALL return a new character value).
5. WHEN multiple events are appended in sequence, THE Log_Service SHALL preserve their append order in the Event_Log.

### Requirement 3: Capping and rotation

**User Story:** As a user with limited local storage, I want the log to stay bounded, so that it does not exhaust storage or degrade performance.

#### Acceptance Criteria

1. THE Log_Service SHALL define a Log_Cap for the number of active LogEvents retained.
2. WHEN appending a LogEvent would cause the Event_Log to exceed the Log_Cap, THE Log_Service SHALL remove the oldest events so the Event_Log length equals the Log_Cap.
3. WHEN Rotation removes events, THE Log_Service SHALL retain the most recent events by `timestamp` order.
4. AT ALL TIMES after an append, THE Event_Log length SHALL be less than or equal to the Log_Cap.

### Requirement 4: Roll history migration (Migrated_System)

**User Story:** As a player, I want my dice rolls recorded in the same place as everything else and correctly tied to the active character, so that roll history is consistent and per-character.

#### Acceptance Criteria

1. THE application SHALL record each completed dice roll as a LogEvent with Category `roll`.
2. THE `roll` LogEvent payload SHALL capture the roll's identifying information sufficient to render the same details previously shown by the roll history (at minimum the skill or characteristic name, the rolled value, the target number, the success levels, and pass/fail/critical/fumble outcome).
3. THE roll LogEvents SHALL be stored per character within that character's Event_Log rather than in a single global storage key.
4. WHEN a roll is recorded, every Roll_History_Consumer that previously displayed roll history SHALL display the roll from the Event_Log.
5. WHEN the application starts and a legacy global roll-history store exists, THE application SHALL migrate existing legacy roll-history entries into the active character's Event_Log as `roll` events and SHALL NOT display duplicate entries for the same roll.
6. AFTER migration, THE application SHALL no longer write new rolls to the legacy global roll-history storage key.

### Requirement 5: Advancement mirror (Source_Of_Truth_System)

**User Story:** As a player, I want my XP spends to appear in the unified timeline, without breaking undo/redo or the advancement archive.

#### Acceptance Criteria

1. THE advancement log (`advancementLog`) and its archive (`advancementLogArchive`) SHALL remain the authoritative typed structures for advancement, and this feature SHALL NOT remove or repurpose them.
2. WHEN an advancement is recorded in `advancementLog`, THE application SHALL also append a Mirror_Event with Category `advancement` to the Event_Log summarising that advancement.
3. THE undo and redo operations for advancement SHALL continue to operate on the `advancementLog` typed structure and SHALL NOT depend on the Event_Log.
4. WHEN an advancement is undone, THE application SHALL append a Mirror_Event with Category `advancement` describing the undo rather than mutating or deleting prior Event_Log entries.
5. THE Event_Log SHALL NOT be read to reconstruct advancement state, XP totals, or archive contents.

### Requirement 6: Wealth ledger mirror (Source_Of_Truth_System)

**User Story:** As a player, I want money changes to appear in the unified timeline, without changing how my wealth is calculated.

#### Acceptance Criteria

1. THE estate ledger (`estate.ledger`) SHALL remain the authoritative typed structure for wealth entries, and this feature SHALL NOT remove or repurpose it.
2. WHEN a ledger entry is recorded in `estate.ledger`, THE application SHALL also append a Mirror_Event with Category `wealth` to the Event_Log summarising that ledger entry, including its monetary amount in the summary.
3. THE Event_Log SHALL NOT be read to compute treasury balances, income, or expenses.

### Requirement 7: Native events for new features

**User Story:** As a developer adding a new feature, I want to log to the unified log without building a new store, so that future logging does not reinvent the wheel.

#### Acceptance Criteria

1. THE Log_Service SHALL allow a feature to append a Native_Event of Category `combat`, `condition`, `session`, or `system` using the single append operation.
2. WHERE a feature has no separate source-of-truth structure, THAT feature SHALL write its history exclusively as Native_Events in the Event_Log.
3. THE Log_Service append operation SHALL be usable by future features without modification to the Log_Service's public shape for each new event type.

### Requirement 8: Timeline view

**User Story:** As a player, I want one place to review what has happened to my character, so that I can reconstruct rolls, spends, and combat events.

#### Acceptance Criteria

1. THE Timeline_View SHALL render the Event_Log in reverse-chronological order (most recent first).
2. THE Timeline_View SHALL display each event's human-readable `summary` and a representation of its `timestamp`.
3. THE Timeline_View SHALL provide a Category_Filter that limits displayed events to one or more selected Categories.
4. WHEN no Category is selected in the Category_Filter, THE Timeline_View SHALL display events of all Categories.
5. WHEN the Event_Log is empty, THE Timeline_View SHALL display an empty-state message rather than an empty container.

### Requirement 9: Clearing the log

**User Story:** As a player, I want to clear my event log, so that I can start fresh without deleting my character.

#### Acceptance Criteria

1. THE Timeline_View SHALL provide a control to clear the Event_Log.
2. WHEN the user activates the clear control, THE Timeline_View SHALL request confirmation before clearing, consistent with the app's existing destructive-action confirmation pattern.
3. WHEN the user confirms clearing, THE Log_Service SHALL empty the Event_Log.
4. WHEN the Event_Log is cleared, THE application SHALL NOT clear or alter the advancement log, advancement archive, or estate ledger.

### Requirement 10: Persistence and backward compatibility

**User Story:** As an existing user, I want the new log to coexist with my saved characters, so that upgrading does not corrupt or lose data.

#### Acceptance Criteria

1. WHEN a character saved before this feature is loaded, THE application SHALL treat its Event_Log as empty and SHALL NOT fail to load.
2. WHEN a pre-feature character is loaded, THE application SHALL preserve the character's existing `advancementLog`, `advancementLogArchive`, and `estate.ledger` unchanged.
3. THE Event_Log SHALL be included when a character is exported and SHALL be restored when a character is imported, subject to the app's existing import version rules.
4. WHERE importing a character whose schema predates the Event_Log, THE application SHALL treat the imported Event_Log as empty.

### Requirement 11: Export/backup interaction

**User Story:** As a user, I want the log to travel with my character data, so that backups and transfers are complete.

#### Acceptance Criteria

1. WHEN a character is exported to JSON, THE exported data SHALL include the Event_Log.
2. WHEN a character is imported from JSON that includes an Event_Log, THE application SHALL restore that Event_Log subject to the Log_Cap.
3. IF an imported Event_Log exceeds the Log_Cap, THEN THE Log_Service SHALL apply Rotation to bring it within the Log_Cap on load.

## Out of Scope / Flagged Ambiguities

- **Full replacement of source-of-truth systems.** Collapsing `advancementLog` (undo/redo, archive restore) or `estate.ledger` (wealth math) into the Event_Log is explicitly out of scope; those remain authoritative and only mirror into the log. A future migration could revisit this, but it carries high risk to undo/redo and wealth calculations.
- **Cross-character global timeline.** The Event_Log is per character. A combined timeline across all characters is out of scope.
- **Event editing.** Users cannot edit individual log events; the log is append-only with a bulk clear. Per-event deletion is out of scope.
- **Which existing scattered logs also migrate.** `sessionHistory`, `doomRuneActivations`, and the generic `log: string[]` are candidates to mirror or migrate but are flagged as optional; the confirmed migration is roll history only, with advancement and wealth mirrored. Extending mirroring to these others can be a follow-up.
- **Log_Cap value.** The specific numeric Log_Cap is a design decision to be set in design.md (the current roll-history cap is 50 and advancement archives at 100); the requirement is only that a bound exists and Rotation preserves the most recent events.
- **Undo of native events.** Whether clearing or rotation interacts with the app's global undo stack is deferred to design; requirements only guarantee clear/rotation do not touch source-of-truth systems.
