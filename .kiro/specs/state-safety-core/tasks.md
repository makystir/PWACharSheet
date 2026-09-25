# Implementation Plan

## Overview

Two coupled workstreams in the `useCharacter` subsystem: (A) a compile-time-checked
update API (tasks 1–6) and (B) a persistence model that removes the one-effect lag and
the `saveNow(explicit)` escape hatch (tasks 7–9), followed by property/regression tests
and full verification (tasks 10–12). No WFRP4e mechanic changes; no persisted-shape change.

## Tasks

- [x] 1. Add typed field-path utilities to the Character model
  - Add `FieldPath<T>` and `FieldValue<T, P>` type-only utilities to `src/types/character.ts` (no runtime/shape change).
  - Add a focused type-level test (`expectTypeOf` / `@ts-expect-error` cases) proving valid paths compile and bad paths / mismatched values fail.
  - Measure `npm run typecheck` time before/after; if recursion is too deep or slow, fall back to an explicit union of editable path prefixes (documented in design).
  - _Requirements: 1.1, 1.2, 1.5, 7.2_

- [x] 2. Narrow the `update` signature on `useCharacter`
  - Change `update` to `update<P extends FieldPath<Character>>(path: P, value: FieldValue<Character, P>): void`, keeping `setNestedValue` runtime behavior unchanged.
  - Keep `updateCharacter(mutator)` as-is for multi-field ops.
  - _Requirements: 1.1, 1.2, 1.3, 2.1_

- [x] 3. Add the typed-update equivalence property test
  - fast-check: for randomly generated valid `(path, value)`, assert `update(path, v)` yields the same Character as legacy `setNestedValue(prev, path, v)`.
  - _Requirements: 2.1, 2.4_

- [x] 4. Make the undo system type-safe
  - Make `UndoEntry` generic over `FieldPath<Character>` with typed `previousValue`/`newValue` in `src/hooks/useUndoStack.ts`.
  - Update `App.tsx` `undoableUpdate`, the previous-value getter, the Ctrl+Z handler, and preserve `fieldToLabel` output exactly.
  - _Requirements: 3.1, 3.3, 3.4_

- [x] 5. Add the undo round-trip property test
  - fast-check: apply a recorded edit then undo restores the original Character exactly; assert `fieldToLabel` output unchanged for a fixed set of paths.
  - _Requirements: 3.2, 3.5_

- [x] 6. Migrate string-path `update()` call sites to the typed API
- [x] 6.1 Migrate mechanical sites in `CharacterPage.tsx`
  - Direct field edits (`name`, `move.*`, `chars.*.*`, `bSkills.*.a`, `ap.*`, `wGC/wSS/wD`, etc.).
  - _Requirements: 1.3, 2.1_
- [x] 6.2 Migrate `AdvancementPage.tsx`, `CombatPage.tsx`, `CorruptionCard.tsx`, and any remaining update sites
  - _Requirements: 1.3, 2.1_
- [x] 6.3 Fix needs-judgment sites at the source
  - Where a value type does not match the leaf (number/string coercions), fix the coercion at the source; do not cast to satisfy the checker.
  - _Requirements: 2.1, 2.3, 7.4_
- [x] 6.4 Remove/deprecate the untyped update surface and prove Req 1.4
  - Ensure no non-test `src` code calls an untyped `update(field: string, value: unknown)`; verify via grep (`update(` in `*.tsx` minus tests; `field: string` / `: unknown` update signatures absent).
  - _Requirements: 1.4_

- [x] 7. Introduce `commit(next)` and remove the one-effect ref lag
  - Add internal `commit(next)` that sets `latestCharRef.current` synchronously then `setCharacter(next)`; route both `update` and `updateCharacter` through it.
  - Remove the separate `[character]` ref-sync effect; keep the debounce, `beforeunload`, and `visibilitychange` effects reading the always-current ref.
  - _Requirements: 5.1, 5.2_

- [x] 8. Route the four Sync_Passes through `commit`
  - Talent bonuses, wound fields + wCur, Fatigued threshold, and armour `ap` sync passes update the ref via `commit` so their derived writes persist without dropping the triggering edit. Keep them as separate commits.
  - Any mechanic-touching line keeps/adds its `docs/` rulebook citation comment.
  - _Requirements: 4.4, 2.3_

- [x] 9. Remove the `saveNow(explicit)` requirement at money-move call sites
  - Drop `saveNow?.(next)` from the deposit handler in `CharacterPage.tsx` (1) and the transfer/withdraw handlers in `EstatePage.tsx` (3); rely on `updateCharacter(() => next)` + the always-current ref.
  - Keep `saveNow` available internally; remove the `explicit` argument from public prop threading if no longer needed.
  - _Requirements: 4.3, 5.2_

- [x] 10. Add no-dropped-edit and same-tick-freshness property tests
  - fast-check: (a) N rapid successive `update`s then flush persists the final state; (b) money-move immediately followed by Character_Switch or `beforeunload`/visibility-hidden persists the post-move state with no `explicit` arg; (c) edit during a talent-bonus or wound-field Sync_Pass persists both edit and derived fields; (d) mutate then synchronously flush in the same tick persists post-mutation state.
  - _Requirements: 4.1, 4.2, 4.5, 5.3_

- [x] 11. Add lifecycle-parity tests
  - Assert prop-driven reset (Character_Switch/import) does NOT trigger a save; `beforeunload` and visibility-hidden do; a no-pending flush is a no-op (no mismatched overwrite).
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 12. Full verification
  - `npm run typecheck`, `npm run test` (all 4706+ tests green), `npm run build` produce a clean result; confirm calculated-total tooltips unaffected; fix any surfaced error at the root cause.
  - Confirm shape invariance: a Character saved before the change loads identically after.
  - _Requirements: 2.2, 7.1, 7.2, 7.3, 7.4_

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3", "4", "6.1"] },
    { "id": 3, "tasks": ["5", "6.2", "6.3"] },
    { "id": 4, "tasks": ["6.4", "7"] },
    { "id": 5, "tasks": ["8", "9", "11"] },
    { "id": 6, "tasks": ["10"] },
    { "id": 7, "tasks": ["12"] }
  ]
}
```

```mermaid
graph TD
  T1[1. Field-path types] --> T2[2. Narrow update signature]
  T2 --> T3[3. Equivalence property test]
  T1 --> T4[4. Type-safe undo]
  T2 --> T4
  T4 --> T5[5. Undo round-trip test]
  T2 --> T6[6. Migrate call sites]
  T6 --> T7[7. commit + remove ref lag]
  T7 --> T8[8. Sync_Passes via commit]
  T7 --> T9[9. Remove saveNow(explicit)]
  T8 --> T10[10. No-dropped-edit / freshness tests]
  T9 --> T10
  T7 --> T11[11. Lifecycle-parity tests]
  T3 --> T12[12. Full verification]
  T5 --> T12
  T10 --> T12
  T11 --> T12
```

## Notes

- Tasks 1–6 (typed API) and 7–9 (persistence) are largely independent after task 6; both
  converge at verification.
- Task 3, 5, 10, 11 are test-only and gate the final verification.
- Any error surfaced during any task is fixed at the root cause before that task is complete
  (project fix-on-sight rule); mechanic-touching code cites the relevant `docs/` rulebook.
