# Design: State-Safety Core

## Overview

This spec hardens two coupled problems in `useCharacter` (`src/hooks/useCharacter.ts`)
and its undo mirror in `src/App.tsx`:

1. The untyped `update(field: string, value: unknown)` surface and its stringly-typed
   undo counterpart, replaced with a compile-time-checked update API.
2. The debounced auto-save race — the one-effect `latestCharRef` lag and the
   `saveNow(explicit)` escape hatch — replaced with a persistence model where the
   save source of truth is always the just-committed state.

It is an infrastructure/refactor spec: **no WFRP4e game-mechanic changes** and **no
semantic change to the persisted `Character` shape** (Req 2.2, 2.3). The two concerns
share one subsystem, so they are designed together.

## Design decisions

### Decision 1 — Typed update via `FieldPath<Character>` (hybrid, keep `updateCharacter`)

Chosen: a template-literal `FieldPath<Character>` path type plus a value-type lookup
`FieldValue<Character, P>`, so `update` becomes generic:

```ts
update<P extends FieldPath<Character>>(path: P, value: FieldValue<Character, P>): void
```

Call sites stay nearly identical (`update('chars.WS.a', 5)`), but the path is now
checked against `Character` and the value type is inferred from the leaf. `updateCharacter(mutator)`
is retained for multi-field / computed mutations (money-moves, wizard commits).

Rejected alternatives:
- **Migrate every site to `updateCharacter`** — ~40+ verbose closures; loses the concise
  field-edit ergonomics and churns more code than needed.
- **Full typed reducer/store** — larger blast radius than the requirements justify; can
  be layered later (it is the subject of the separate structural-refactor spec).

Rationale: smallest diff that satisfies Req 1.1–1.5 and Req 3 (a typed `UndoEntry`
keyed by `FieldPath`), while keeping the escape hatch (`updateCharacter`) for the cases
a single path cannot express.

### Decision 2 — Persist from the committed state, single always-current ref

Chosen: set the "latest character" ref **synchronously inside the state updater** that
computes the next state, so `flushSave()` and any synchronous persist always read the
value that was just committed — eliminating the one-effect lag (Req 5) and removing the
need for `saveNow(explicit)` at call sites (Req 4.3).

```ts
const commit = (next: Character) => { latestCharRef.current = next; setCharacter(next); };
// update() and updateCharacter() both route through commit()
```

Auto-save stays debounced (500ms) but reads `latestCharRef.current`; `flushSave` persists
it when `pendingRef` is set. Money-move handlers drop the `saveNow?.(next)` line and simply
call `updateCharacter(() => next)`; a discrete synchronous flush remains available internally.

Rejected alternatives:
- **`useReducer` commit as save source** — cleaner in theory but forces every `setCharacter`
  and the four setState-in-effect sync passes through a reducer, a large rewrite for this spec.
- **Serialized write queue** — solves ordering but not the staleness root cause; adds async
  complexity to a synchronous localStorage write.

Rationale: the ref-in-updater change is minimal, keeps all Req 6 lifecycle behavior
(reset-skip via `isResettingRef`, `beforeunload`/visibility flush, no mismatched overwrite),
and directly kills the documented race.

## Architecture

Affected files:

| File | Change |
|------|--------|
| `src/types/character.ts` | Add `FieldPath` / `FieldValue` type utilities (type-only; no runtime shape change). |
| `src/hooks/useCharacter.ts` | Generic typed `update`; `commit()` sets the ref in-updater; remove one-effect-lag compensations; keep debounce + lifecycle flushes. |
| `src/hooks/useUndoStack.ts` | `UndoEntry` becomes generic over `FieldPath<Character>` with a typed value. |
| `src/App.tsx` | `undoableUpdate`, `getNestedValue`, `fieldToLabel`, Ctrl+Z handler use the typed path; preserve `fieldToLabel` output. |
| `src/components/pages/CharacterPage.tsx` | Migrate ~40+ string-path `update()` calls; drop the deposit `saveNow?.(next)`. |
| `src/components/pages/EstatePage.tsx` | Drop 3 money-move `saveNow?.(next)` lines. |
| `src/components/pages/AdvancementPage.tsx`, `CombatPage.tsx`, `CorruptionCard.tsx`, other update sites | Migrate string-path `update()` calls. |
| `src/storage/character-manager.ts` | Untouched (`saveCharacter` remains the write primitive). |

Data flow: user edit -> `update`/`updateCharacter` -> `commit(next)` (sets ref +
`setCharacter`) -> debounced auto-save reads the ref -> `saveCharacter(id, char)` writes
localStorage. Sync_Passes and lifecycle flushes read the same always-current ref.

## Components and Interfaces

### `useCharacter` (public surface)

```ts
interface UseCharacterResult {
  character: Character;
  update<P extends FieldPath<Character>>(path: P, value: FieldValue<Character, P>): void;
  updateCharacter(mutator: (char: Character) => Character): void;
  saveNow(explicit?: Character): void; // retained as internal detail; call sites no longer pass `explicit`
  totalWounds: number;
  armourPoints: ArmourPoints;
  maxEncumbrance: number;
  coinWeight: number;
}
```

Internal `commit(next: Character)` centralizes ref-set + `setCharacter`. The separate
`[character]` ref-sync effect is removed; the debounce, `beforeunload`, and
`visibilitychange` effects are retained and read `latestCharRef.current`.

### `useUndoStack`

```ts
interface UndoEntry<P extends FieldPath<Character> = FieldPath<Character>> {
  field: P;
  previousValue: FieldValue<Character, P>;
  newValue: FieldValue<Character, P>;
  timestamp: number;
}
interface UseUndoStackResult {
  push(entry: Omit<UndoEntry, 'timestamp'>): void;
  undo(): UndoEntry | null;
  canUndo: boolean;
  clear(): void;
}
```

### `App.tsx` undo glue

`undoableUpdate<P extends FieldPath<Character>>(path: P, value: FieldValue<Character, P>)`
reads the previous value via a typed getter, pushes a typed `UndoEntry`, then calls
`update`. `fieldToLabel(field)` keeps its exact current output (Req 3.3).

## Data Models

No change to the persisted `Character` model in `src/types/character.ts` (Req 2.2). The
only additions are **type-only** utilities:

```ts
type FieldPath<T> = T extends (infer E)[]
  ? `${number}` | `${number}.${FieldPath<E>}`
  : T extends object
    ? { [K in keyof T & string]: `${K}` | `${K}.${FieldPath<T[K]>}` }[keyof T & string]
    : never;

type FieldValue<T, P extends string> =
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof T ? FieldValue<T[K], Rest>
    : T extends (infer E)[] ? FieldValue<E, Rest> : never
  : P extends keyof T ? T[P]
    : T extends (infer E)[] ? E : never;
```

Depth is bounded in practice (edited fields nest ~3 levels: `chars.WS.a`,
`trappings.3.name`). Fallback if recursion depth or DX becomes a problem: cap with an
explicit union of the known editable path prefixes (documented).

Before / after call site (runtime `setNestedValue` retained unchanged for behavior
preservation, Req 2.1; only the public signature is narrowed):

```ts
// before: field: string, value: unknown
update('chars.WS.a', Number(e.target.value) || 0)
// after: bad path or wrong value type now fails tsc (Req 1.1, 1.2)
update('chars.WS.a', Number(e.target.value) || 0)
```

## Error Handling

- **Type-mismatch at migration:** where a site passed a value whose type does not match
  the leaf (e.g. number-vs-string coercion), fix the coercion at the source rather than
  casting to satisfy the checker (Req 2.1, Req 7.4).
- **Storage write failure:** `saveCharacter` returns `StorageWriteResult`; existing
  storage-error toast handling is unchanged. `flushSave` no-ops when `pendingRef` is
  false so it never overwrites storage with a mismatched character (Req 6.4).
- **Prop-driven reset:** `isResettingRef` continues to skip persisting the reset commit
  on Character_Switch/import (Req 6.1).
- **Fix-on-sight:** any test/type/lint/build error surfaced by this work is resolved at
  the root cause before completion (Req 7.4).

## Reworked save model detail

- `commit(next)` sets `latestCharRef.current = next` then `setCharacter(next)`; both
  `update` and `updateCharacter` route through it.
- Debounced auto-save effect still keyed on `[character, flushSave]`, sets `pendingRef`,
  cleanup calls `flushSave()`; the persisted value comes from the always-current ref.
- The four setState-in-effect **Sync_Passes** (talent bonuses, wound fields + wCur,
  Fatigued threshold, armour `ap`) route through `commit`, so their derived writes update
  the ref and persist; they run after the triggering user edit already committed, so the
  edit is never dropped (Req 4.4). They remain separate commits (consolidation out of scope).
- Money-moves call `updateCharacter(() => next)` only; the discrete `saveNow?.(next)`
  lines are removed from CharacterPage (1) and EstatePage (3) (Req 4.3).

## Migration plan (Req 1.3, 1.4)

1. Add the type utilities and narrow `update`'s signature; fix resulting tsc errors site by site.
2. **Mechanical** sites: direct field edits (`name`, `move.m`, `chars.*.*`, `bSkills.*.a`,
   `ap.*`, `wGC/wSS/wD`) — path unchanged, now type-checked.
3. **Needs-judgment** sites: value-type mismatches — fix the coercion at source, do not cast.
4. Remove/deprecate the untyped surface. Prove Req 1.4 with
   `grep -rn "update(" src --include=*.tsx | grep -v test` showing only typed calls, and a
   search for `field: string` / `: unknown` update signatures returning none in non-test src.

## Testing strategy

Stack: vitest + @testing-library/react (jsdom) + fast-check. Property-based invariants:

- **Req 2.4 (equivalence):** for randomly generated valid `FieldPath` + matching value,
  `update(path, v)` yields the same `Character` as legacy `setNestedValue(prev, path, v)`.
- **Req 3.5 (undo round-trip):** apply a recorded edit then undo restores the original
  `Character` exactly; `fieldToLabel` output unchanged for a fixed set of paths.
- **Req 4.5 (no dropped edits):** (a) N rapid successive `update`s then flush persists the
  final state; (b) a money-move immediately followed by Character_Switch or
  `beforeunload`/visibility-hidden persists the post-move state with no `explicit` argument;
  (c) an edit during the talent-bonus or wound-field Sync_Pass persists both edit and derived fields.
- **Req 5.3 (no staleness):** mutate then synchronously flush in the same tick; persisted ===
  post-mutation state.
- **Req 6.5 (lifecycle parity):** prop-driven reset does NOT trigger a save; unload and
  visibility-hidden do; no-pending flush is a no-op.
- **Req 7.1:** full existing suite (4706 tests) stays green.

## Correctness Properties

### Property 1: Typed-update equivalence
For all valid `(path, value)`, the state produced by the typed `update` equals the state the
legacy string-path update produced.

**Validates: Requirements 2.1, 2.4**

### Property 2: Undo round-trip
For any recorded edit `e`, `apply(e)` then `undo()` returns the pre-edit `Character`.

**Validates: Requirements 3.2, 3.5**

### Property 3: No dropped edit
For any sequence of edits ending in a flush/lifecycle event, the persisted `Character` equals
the last committed `Character`.

**Validates: Requirements 4.1, 4.2, 4.5**

### Property 4: Same-tick freshness
A synchronous persist immediately after a mutation persists the post-mutation state, never a
predecessor.

**Validates: Requirements 5.1, 5.3**

### Property 5: Reset is not a save
A prop-driven reset commit never produces a storage write.

**Validates: Requirements 6.1, 6.5**

### Property 6: Shape invariance
A `Character` serialized before the change deserializes identically after it.

**Validates: Requirements 2.2**

## Rollback plan

Changes are confined to the files in the Architecture table (no storage-format or
persisted-shape change). Rollback = revert those files and run `npm install` (no dependency
changes). Because the persisted `Character` shape is unchanged, characters saved with either
version load in the other. Do the work on a branch and merge via PR.

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `FieldPath` recursion too deep / slow tsc or poor DX | Medium | Bounded nesting in practice; fallback to an explicit union of editable path prefixes; measure `npm run typecheck` time. |
| A migrated call site had a latent type mismatch (number/string) | Medium | Fix the coercion at source (Req 2.1); covered by the equivalence property test. |
| Ref-in-updater subtly changes save timing on a lifecycle event | Low | Req 6.5 parity tests assert reset-skip, unload, visibility, and no-pending behavior match today. |
| Sync_Pass ordering drops the triggering edit | Low | Sync_Passes route through `commit`; Req 4.5(c) test covers edit-during-sync. |
| Undo generic over `FieldPath` breaks inference at push/undo | Low | Default the type param; round-trip test (Req 3.5) guards behavior. |
