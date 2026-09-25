# Requirements Document

## Introduction

This spec hardens the two highest-risk state-safety problems in the WFRP4e PWA character sheet. Both live in the same subsystem — the character state/persistence layer in `src/hooks/useCharacter.ts` (with its undo mirror in `src/App.tsx`) — which is why they are grouped into one spec rather than split apart.

**Concern 1 — Typed character update API (correctness / type-safety).** `useCharacter` exposes `update: (field: string, value: unknown) => void`, which routes through a `setNestedValue(obj, path, value)` helper that walks a `structuredClone` by splitting a dot-notation string path and assigning an `unknown` value at the leaf. The undo system in `App.tsx` mirrors the same stringly-typed shape with `getNestedValue(obj, path)`, `fieldToLabel(field)`, and the `useUndoStack` `UndoEntry { field: string; previousValue: unknown; newValue: unknown }`. Roughly 40+ call sites in `CharacterPage.tsx`, plus sites in `AdvancementPage.tsx`, `CombatPage.tsx`, `CorruptionCard.tsx`, and others, pass raw string paths such as `update('name', v)`, `update('move.m', v)`, `update('chars.WS.a', Number(...))`, `update('bSkills.3.a', ...)`, `update('trappings.2.name', ...)`, `update('ap.head', ...)`, and `update('wGC', result.gc)`. TypeScript cannot verify that these paths exist on `Character`, cannot verify the value type matches the target field, and cannot catch typos or renamed fields, so mistakes become silent runtime bugs — a serious risk in a rules-driven app. A fully typed `updateCharacter(mutator: (char: Character) => Character)` already exists on the hook and is the safe alternative for new code.

**Concern 2 — Save-race / persistence robustness (data-loss risk).** Auto-save is debounced 500ms in a `useEffect` keyed on `[character, flushSave]`. A separate `latestCharRef` effect "lags by one effect," so the ref can be stale immediately after a `setCharacter` in the same tick. To work around that lag, a `saveNow(explicit?: Character)` escape hatch exists: money-move handlers (deposit / withdraw / collect income) in `CharacterPage.tsx` and `EstatePage.tsx` must pass the exact post-mutation character so the write cannot be dropped by the debounce race (the code comments explicitly name this a race). Several setState-in-effect sync passes — `syncTalentBonuses` keyed on `JSON.stringify(character.talents)`, the wound-field sync, the armour-points sync, and the Fatigued threshold pass — each produce new commits that re-arm the debounce. `flushSave()` runs on effect cleanup, `beforeunload`, and `visibilitychange = hidden`, persisting `latestCharRef.current` only when `pendingRef` is set. `pendingRef` / `isResettingRef` / `isFirstRender` refs coordinate skipping the prop-driven reset commit.

**Framing.** This is an infrastructure/refactor spec. It targets the same subsystem twice — the typed update surface and the persistence model are two faces of `useCharacter`'s state layer. It intends **no change to WFRP4e game mechanics** and **no semantic change to persisted character data**. The requirements below capture goals and testable outcomes without prescribing an implementation; the design phase will select the mechanisms (for the typed API: a `FieldPath<Character>` template-literal path type with a type-checked value, migration of call sites to the typed `updateCharacter` mutator, or a small typed store/reducer; for persistence: a serialized write queue, persisting from a reducer commit, or a single always-current ref).

## Glossary

- **Character**: The character data model defined in `src/types/character.ts` and persisted to `localStorage` by `saveCharacter` in `src/storage/character-manager.ts`.
- **Character_State_Hook**: The `useCharacter` hook in `src/hooks/useCharacter.ts` that owns character state, derived values, auto-save, and the update APIs.
- **String_Path_Update**: The current `update(field: string, value: unknown)` API and its `setNestedValue` helper that assign a value at a dot-notation path.
- **Typed_Update_API**: The compile-time-checked update surface this spec introduces or extends so field paths and values are verified against `Character` at build time (e.g. the existing `updateCharacter` mutator and/or a typed field-path variant).
- **Undo_System**: The undo/redo machinery in `src/App.tsx` (`undoableUpdate`, `getNestedValue`, `fieldToLabel`) backed by `useUndoStack` (`UndoEntry`, `push`, `undo`, `clear`) in `src/hooks/useUndoStack.ts`.
- **Auto_Save**: The 500ms-debounced persistence effect in the Character_State_Hook keyed on `[character, flushSave]`.
- **Flush_Save**: The `flushSave` callback that synchronously persists a pending edit on effect cleanup, `beforeunload`, and `visibilitychange = hidden`.
- **Save_Now**: The current `saveNow(explicit?: Character)` escape hatch used by money-move handlers to persist an exact post-mutation Character synchronously.
- **Latest_Char_Ref**: The `latestCharRef` in the Character_State_Hook intended to hold the most recent Character for synchronous access, which currently lags by one effect.
- **Sync_Pass**: A setState-in-effect that derives and writes back a field (talent bonuses, wound fields, armour points, Fatigued threshold), each producing a new commit.
- **Money_Move**: A discrete deposit, withdrawal, or income-collection handler in `CharacterPage.tsx` / `EstatePage.tsx` that mutates carried/estate currency and currently calls Save_Now with an explicit Character.
- **Character_Switch**: A change of the active character id or `initialCharacter` prop that resets the Character_State_Hook to a new external Character (character switch / import).
- **Build_Type_Check**: The strict TypeScript type-check (`tsc`) run under the project's strict configuration with `verbatimModuleSyntax` enabled.
- **Test_Suite**: The existing automated test suite (4706 tests across 411 files) plus new tests added by this spec, including property-based tests using fast-check.

## Requirements

### Requirement 1: Compile-time-checked field updates

**User Story:** As a developer, I want character field updates to be verified by the type checker, so that invalid field paths and mismatched value types are caught at build time instead of becoming silent runtime bugs.

#### Acceptance Criteria

1. THE Typed_Update_API SHALL reject, at Build_Type_Check time, any character update whose target field does not exist on Character.
2. THE Typed_Update_API SHALL reject, at Build_Type_Check time, any character update whose value type does not match the type of the target field on Character.
3. WHERE application code updates a character field, THE application code SHALL use the Typed_Update_API rather than an untyped String_Path_Update.
4. THE application code (all files under `src/` excluding test files) SHALL contain zero calls to the untyped `update(field: string, value: unknown)` String_Path_Update surface after migration.
5. IF a field is renamed or removed on Character, THEN THE Build_Type_Check SHALL report an error at every update site that referenced the old field.

### Requirement 2: Behavior preservation for character updates

**User Story:** As a player, I want the typed update work to change nothing about what gets saved, so that my characters behave and persist exactly as they did before.

#### Acceptance Criteria

1. WHEN a field is updated through the Typed_Update_API with a given value, THE Character_State_Hook SHALL produce the same resulting Character state that the equivalent String_Path_Update produced for that field and value.
2. THE persisted Character data shape SHALL remain semantically unchanged, such that a Character saved before this change loads identically after this change.
3. WHERE a character update touches a value governed by a WFRP4e game mechanic, THE resulting Character SHALL comply with the rulebooks in `docs/`, with the governing source cited in a code comment.
4. THE Test_Suite SHALL include coverage that verifies typed updates and their String_Path_Update equivalents yield equivalent Character state across representative and randomly generated field/value pairs.

### Requirement 3: Type-safe undo and redo

**User Story:** As a player, I want undo to be as reliable as editing, so that reverting a change restores exactly the field and value I changed without stringly-typed guesswork.

#### Acceptance Criteria

1. THE Undo_System SHALL record the changed field and its previous and new values in a form that the Build_Type_Check verifies against Character rather than as an untyped string path with `unknown` values.
2. WHEN a user triggers undo for a recorded edit, THE Undo_System SHALL restore the affected field to its previous value and produce the same Character state as before the edit was applied.
3. WHEN a user triggers undo, THE Undo_System SHALL present a label identifying the reverted field, preserving the label output currently produced by `fieldToLabel` for the same field.
4. WHEN the active character changes, THE Undo_System SHALL clear the recorded undo history.
5. THE Test_Suite SHALL include coverage that verifies, for recorded edits, that applying an edit and then undoing it restores the original Character state (round-trip).

### Requirement 4: No dropped edits under the persistence model

**User Story:** As a player, I want every edit I make to be saved, so that I never lose changes because of a save-timing race.

#### Acceptance Criteria

1. WHEN a user makes an edit to the Character, THE Character_State_Hook SHALL persist that edit to storage such that no subsequent commit, debounce reset, or Sync_Pass can cause the edit to be dropped.
2. WHEN a user makes several successive edits in rapid succession, THE Character_State_Hook SHALL persist the final resulting Character state.
3. WHEN a Money_Move mutates currency, THE Character_State_Hook SHALL persist the exact post-mutation Character without requiring the call site to pass an explicit Character to a Save_Now escape hatch.
4. WHEN a Sync_Pass writes derived fields back into the Character, THE Character_State_Hook SHALL persist the resulting Character state without dropping the user edit that triggered the Sync_Pass.
5. THE Test_Suite SHALL include regression tests for the data-loss scenarios of rapid successive edits, a Money_Move immediately preceding a Character_Switch or unload, and an edit occurring during a talent-bonus or wound-field Sync_Pass, using property-based tests (fast-check) where behavior varies with input.

### Requirement 5: Elimination of one-effect staleness

**User Story:** As a developer, I want the "most recent character" state to always be current, so that synchronous persistence never reads a value that lags reality by one effect.

#### Acceptance Criteria

1. WHEN a synchronous persist is requested immediately after a character mutation in the same tick, THE Character_State_Hook SHALL persist the post-mutation Character state and SHALL NOT persist a Character state that predates that mutation.
2. THE Character_State_Hook SHALL make the current Character available for synchronous persistence without relying on the Latest_Char_Ref lag that the current implementation compensates for with an explicit-Character escape hatch.
3. THE Test_Suite SHALL include coverage that mutates the Character and requests a synchronous persist in the same tick and verifies the persisted Character equals the post-mutation state.

### Requirement 6: Preserved persistence behavior on lifecycle events

**User Story:** As a player, I want saving to keep working the same on character switch, import, tab close, and backgrounding, so that the persistence rework does not change when or whether my data is written.

#### Acceptance Criteria

1. WHEN a Character_Switch occurs, THE Character_State_Hook SHALL load the new external Character and SHALL NOT persist the prop-driven reset commit as if it were a user edit.
2. WHEN the browser tab is closed or reloaded, THE Character_State_Hook SHALL persist any pending edit before the page unloads.
3. WHEN the document visibility changes to hidden, THE Character_State_Hook SHALL persist any pending edit.
4. WHEN there is no pending edit, THE Flush_Save behavior SHALL NOT overwrite storage with a mismatched Character.
5. THE Test_Suite SHALL include coverage verifying that Character_Switch, unload, and visibility-hidden persistence behaviors match the current behavior, including that a prop-driven reset does not trigger a spurious save.

### Requirement 7: Project quality and tooling constraints

**User Story:** As a maintainer, I want this rework to respect the project's existing standards and tests, so that it integrates cleanly without regressions.

#### Acceptance Criteria

1. THE full existing Test_Suite (4706 tests across 411 files) SHALL continue to pass after this change, and new behavior SHALL be covered by new tests.
2. THE code SHALL pass the strict Build_Type_Check under TypeScript 7.0.2 with `verbatimModuleSyntax` enabled, using `import type` for type-only imports.
3. THE change SHALL NOT regress the project's calculated-total-tooltip behavior for any displayed derived total.
4. IF an error surfaces during this work (failing test, type error, lint failure, or build failure), THEN THE change SHALL resolve the root cause before completion rather than suppressing or deferring it.
