# GM read-only share / export — code review

Adds a read-only character viewer reached via a `#view/<payload>` hash route, fed by two delivery mechanisms (offline snapshot file/clipboard, and a compressed URL-hash share link) plus a plain-text combat stat block. The load-bearing decision is a single shared derivation, `deriveSheetTotals(character)`, extracted verbatim from the inline logic in `useCharacter` and consumed by both the hook and the viewer, so every number and breakdown tooltip in the viewer matches the live sheet by construction. The work is additive across three commits (FEAT-001 pure logic, FEAT-002 viewer + app-shell wiring, FEAT-003 Settings UI).

Watch for: nothing blocking. The viewer displays characteristic totals via inline `i+a+b` (unfloored) while the char-total tooltip floors negatives — this is design-sanctioned (mirrors the live sheet) and only diverges for non-WFRP negative totals (possible, non-blocking). FEAT-001's `verification` array omits `npm run build`, but its findings prose records a clean build and the final FEAT-003 state records all four commands clean (confirmed).

**Verdict**: APPROVED

## High-level view

The derived-totals contract is the centre of gravity. `useCharacter`'s inline derivations (Hardy/Strong Back/Sturdy levels, species wound multiplier, species `woundsUseSB` correction, SB, ranged-damage house rule, and the four totals) were lifted verbatim into `src/logic/sheet-totals.ts`, and the hook now sources `armourPoints`/`maxEncumbrance`/`coinWeight` from it. `totalWounds` still routes through `calculateTotalWounds` to preserve the hook's historical `Math.max(0, …)` floor, passing `totals.effectiveWoundsUseSB` — behaviour-preserving because `backfillCharacter` already corrects `woundsUseSB` from species on load, so the stored and effective flags agree for any loaded character. The existing `useCharacter` tests stay green, confirming the extraction is observably identical.

Section visibility is the second reuse point: `shouldRenderSection` moved verbatim out of `PrintLayout` into `src/logic/section-visibility.ts`, and `PrintLayout`'s change is import-only, so viewer and print visibility cannot drift.

The share pipeline is a clean chain of small pure modules — `view-route` → `base64url` → `gzip` (native `CompressionStream`) → `share-codec` (versioned envelope, size ceilings) → `share-validate` (version pre-check, `importFromJSON` delegation, field coercion) — each independently tested, with property tests asserting malformed/truncated/oversized/newer-version inputs never throw and round-trip is byte-exact.

The viewer threads `deriveSheetTotals` once into every total and every `*BreakdownContent` tooltip. The read-only guarantee is structural: the rendered sheet imports no editable inputs and no write paths; the only write is the explicit, confirm-gated "Import into my characters" routed through `importFromJSONWithPortrait`. App-shell wiring intercepts `#view/` above the welcome/shell branch and skips startup migrations in view mode, so a fresh-browser share link performs no `localStorage`/IndexedDB writes.

Rulebook citations are present where stats are derived (Core p.36–37 wounds, p.164 movement, p.293 armour/encumbrance). The movement tooltip source-states non-standard Walk/Run values rather than inventing a formula.

<details>
<summary>Issues (1)</summary>

1. **Characteristic-total floor asymmetry** (possible, non-blocking) — the viewer displays char totals as raw `i+a+b` while the char-total tooltip (`getSkillBreakdown(key, chars, 0)`) floors negatives to 0; they diverge only for a negative characteristic total, which is not a real WFRP state and matches the live sheet's display. No action required; noted for awareness.

</details>

<details>
<summary>Details</summary>

### The derived-totals contract: `deriveSheetTotals`

`src/logic/sheet-totals.ts` is a verbatim lift of the derivations previously inline in `useCharacter`: talent-level lookups, `SPECIES_DATA` wound multiplier, the species `woundsUseSB` correction (`effectiveWoundsUseSB`), `SB = getBonus(S total)`, `rangedDamageSBMode`, and the four totals. It re-keys `calculateArmourPointsUnified(armour, { filterByWorn: true })` from the `APResult` shape into the sheet `ArmourPoints` vocabulary (`head/lArm/rArm/body/lLeg/rLeg/shield`) identically to the hook's old memo, so the viewer, stat block, and AC2 test all index one key set.

The `useCharacter` diff confirms the extraction is behaviour-preserving: `armourPoints`, `maxEncumbrance`, `coinWeight` now read straight off `totals`, and `totalWounds` routes through `calculateTotalWounds(character.chars, totals.effectiveWoundsUseSB, hardyLevel, woundMultiplier)` to keep the historical floor. Passing `totals.effectiveWoundsUseSB` instead of the raw `character.woundsUseSB` is safe because `backfillCharacter` overwrites `woundsUseSB` from species on load — the two agree for any character the hook ever sees. The recorded evidence shows the pre-existing `useCharacter` tests still green, and `sheet-totals.test.ts` deep-equals the helper against the hook for Ogre, Hardy+Strong Back+Sturdy, unworn/`undefined`-worn armour, and non-default ranged-damage fixtures.

### Section-visibility extraction

`shouldRenderSection` and its `SectionKey` union moved to `src/logic/section-visibility.ts`; the `PrintLayout` diff is a one-line import plus deletion of the local copy. Viewer and print now share one predicate, so the edge cases (empty-but-present arrays, the `conditions` `level > 0` filter, house-rule-gated sections) can't drift.

### Share/encode/decode pipeline and untrusted input

`share-codec` layers a version byte over gzip-then-base64url with `MAX_ENCODED_CHARS` / `MAX_DECOMPRESSED_BYTES` ceilings, returning a discriminated `{ok, code}` rather than throwing. `share-validate` runs a version pre-check (rejecting non-numeric or `> CURRENT_VERSION` `_v`), pre-coerces `ARRAY_FIELDS` on the raw parsed object before delegating to `importFromJSON` (so a hostile non-array `armour` can't throw inside the migration), then normalizes chars triples, `move`, `houseRules`, `species`, `armour.worn`, scalar numerics, and portrait so `deriveSheetTotals` never throws. The property test (`share-codec.property.test.ts`) and hardening test assert malformed/truncated/wrong-version inputs never throw and the round-trip is byte-exact. Native `CompressionStream`/`DecompressionStream` is a Node ≥ 20 / browser global, feature-detected in the Settings UI to disable the link action where absent — the snapshot path needs no gzip.

### Read-only viewer and the tooltip reuse

`SharedCharacterViewer` computes `deriveSheetTotals` once and threads it into every total. Each calculated total (char total/bonus, skill total, wounds, AP per location, max encumbrance, coin weight, movement, weapon damage) is wrapped in `TooltipTriggerCell` driving a single `Tooltip` (one open at a time via a `BreakdownTooltipState`-style union), fed by the matching `*BreakdownContent`. Skill-total display `(Math.max(0, cv.i+cv.a+cv.b)) + skill.a` matches `getSkillBreakdown`'s `total` exactly. The char-total display uses raw `i+a+b` while its tooltip floors — a divergence only for negative totals, which the live sheet also displays unfloored; design-sanctioned, not a real-data concern.

The read-only guarantee is structural: the rendered sheet imports no editable inputs or write paths. The `<textarea>`/`<input type=file>` live only in the "open a shared character" panel (the snapshot-load affordance for the bare `#view/` route, per FR3), not in the sheet — the viewer test asserts the sheet's `input,textarea,select` set is empty and that no `setItem`/`savePortrait`/`appendEvent`/import fires on render or tooltip. The sole write is the confirm-gated "Import into my characters" calling `importFromJSONWithPortrait(JSON.stringify(character))` with create-new semantics (not SettingsPage's overwrite handler).

### App-shell coexistence and migration skip

`App()` computes `isViewMode` from `useViewRoute()` and skips `runMigration()` + portrait-store init in view mode, with a module-level `leftViewMode` flag that re-runs the real init branch once on "Back to my characters" before the shell renders. `AppContent()` reads `useViewRoute()` before the welcome/shell branch and renders only the viewer when set, so a link opens with zero saved characters and no shell gating. `App.view-mode.test.tsx` asserts a clean `#view/` mount performs no `localStorage.setItem` and no IndexedDB `open`, and that Back → create persists. `useViewRoute` uses `useSyncExternalStore`, avoiding a setState-in-effect.

### New breakdown components and citations

`WoundsBreakdownContent` renders a given `WoundMaxResult` (never recomputes), cites Core p.36–37. `MoveBreakdownContent` shows stored `m/w/r`, labelling `2×M`/`4×M` only when the stored value matches the standard derivation and otherwise source-stating "as recorded on the sheet" — honouring rules-compliance by never inventing a movement formula, cites Core p.164. `WeaponDamageBreakdownContent` renders `calcWeaponDamage`'s `{num, breakdown}` and composes `= {num}` itself, falling back to the raw damage string when `num === null`. `combat-stat-block.ts` reuses `deriveSheetTotals` and `calcWeaponDamage`, cites p.164 and p.293, and omits ammunition per spec.

### Verification evidence

All four verify-commands are recorded clean. FEAT-001's `verification` array lists three commands but its findings prose records `npm run build` clean (704ms); FEAT-002 and FEAT-003 list all four. Final state (FEAT-003): `npx tsc --build --force --noEmit` exit 0; `npm run build` succeeded; `vitest --run` 5291 passed / 482 files / 0 failed; `npx eslint .` 0 errors, 3 warnings. The three warnings are confirmed pre-existing react-refresh/only-export-components in `CommandPaletteContext.tsx`, `CombatPage.tsx`, `SettingsPage.tsx` — `SettingsPage`'s is the `export { loadQuickActions }` line, which I confirmed exists on the base commit, and the feature added no new top-level exports there. All test files in the diff are additions (status `A`); no existing test was modified. The only code suppression is one `// eslint-disable-next-line react-hooks/set-state-in-effect` in the viewer's decode effect, matching the sanctioned pattern that exists in `Tooltip.tsx:46`.

</details>

<details>
<summary>File map</summary>

- `src/logic/sheet-totals.ts` — new shared derived-totals contract (`deriveSheetTotals`).
- `src/logic/section-visibility.ts` — `shouldRenderSection` extracted verbatim from PrintLayout.
- `src/logic/view-route.ts`, `base64url.ts`, `gzip.ts`, `share-codec.ts`, `share-validate.ts`, `share-portrait.ts` — share pipeline.
- `src/logic/combat-stat-block.ts` — plain-text combat stat block.
- `src/hooks/useCharacter.ts` — refactored to source totals from `deriveSheetTotals` (behaviour-preserving).
- `src/hooks/useViewRoute.ts` — hashchange subscription via `useSyncExternalStore`.
- `src/components/layout/PrintLayout.tsx` — import-only change (uses extracted predicate).
- `src/components/shared/SharedCharacterViewer.tsx` (+css) — the read-only viewer.
- `src/components/pages/WoundsBreakdownContent.tsx`, `WeaponDamageBreakdownContent.tsx`, `MoveBreakdownContent.tsx` (+css) — new breakdown tooltip bodies.
- `src/components/pages/SettingsPage.tsx` (+css) — new "Share with GM" card.
- `src/App.tsx` — `#view/` interception + migration skip in view mode.
- 10 new test files under `src/logic/__tests__/`, `src/components/**/__tests__/`, `src/__tests__/` (all additions).
- `.agents/tasks/gm-share/features/FEAT-00{1,2,3}.json` — evidence.

Full diff: `git diff e0a2839 HEAD`.

</details>
