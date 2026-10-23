# GM Read-Only Share / Export — Implementation Plan

Derived from the APPROVED design (`.agents/tasks/gm-share/design.md`) and requirements
(`.agents/tasks/gm-share/requirements.md`), grounded in the actual code (`App.tsx`, `useCharacter.ts`,
`export-import.ts`, `SettingsPage.tsx`, `PrintLayout.tsx`, `calculators.ts`, `breakdown-helpers.ts`,
`weapons.ts`, `TooltipTriggerCell.tsx`, `Tooltip.tsx`, `vite.config.ts`).

## Steering rules in force (apply throughout)

- **rules-compliance**: reuse the existing calculators (`src/logic/*`) — never reimplement stat math.
  The single derived-totals source of truth is the new `deriveSheetTotals` (a verbatim extraction of
  the logic already inline in `useCharacter`). Any new code that *presents* a derived stat cites the
  Core page it comes from in a comment (wounds: `calculators.ts` `calculateWoundsCore`; AP: Core p.293;
  max encumbrance: Core p.293/p.146; movement: Core p.164 "Walk = 2×M, Run = 4×M"). Never invent a
  mechanic — `MoveBreakdownContent` renders the *stored* `move.{m,w,r}` and only labels a value `2×M`/
  `4×M` when it already equals the multiple.
- **calculated-total-tooltips**: every calculated total shown in the viewer (characteristic total & CB,
  skill total, wounds max, max encumbrance, carried trappings enc, coin weight, AP per location, weapon
  damage, movement) is rendered through `TooltipTriggerCell` + `Tooltip` with the matching
  `*BreakdownContent`, so each total exposes its component breakdown exactly as the live sheet does.
- **fix-errors**: fix any surfaced type/lint/test/build error at root cause. No new `@ts-ignore` /
  `eslint-disable`. The one sanctioned `// eslint-disable-next-line react-hooks/set-state-in-effect`
  pattern mirroring `src/components/shared/Tooltip.tsx` may be reused **only** if a setState-in-effect
  is genuinely needed (e.g. the viewer's async link-decode effect) — prefer a structure that avoids it.

## Definition of done (ALL must be clean, run from `d:\Git\PWACharSheet`)

- `npx tsc --build --force --noEmit`
- `npm run build`
- `vitest --run`
- `npx eslint .` — 0 errors and no new warnings

No existing test is modified to accommodate the feature; the work is strictly additive. Node ≥ 20 is
required (the gzip codec uses the `CompressionStream`/`DecompressionStream` globals; `package.json`
already pins `engines.node >= 20` and `vite.config.ts` runs tests under `environment: 'jsdom'` with
those globals supplied by the Node runtime).

---

# Implementation Plan

## Part A — Pure logic foundation (no UI)

- [ ] 1. Extract `shouldRenderSection` + `SectionKey` verbatim into a pure module.
      Create `src/logic/section-visibility.ts` exporting the `SectionKey` union
      (`spells|companions|mutations|criticalWounds|hirelings|enterprises|grudgeBook|psychologyTraits|rituals|yenlui|estate|conditions|ammunition`)
      and `shouldRenderSection(character, key)` copied exactly from `PrintLayout.tsx`. Then change
      `src/components/layout/PrintLayout.tsx` to delete its module-private copy and import the identical
      function (import-only change; no behavior change).
      Files: `src/logic/section-visibility.ts` (new), `src/components/layout/PrintLayout.tsx`.
      Verify: `vitest --run` — existing PrintLayout tests still pass; `npx tsc --build --force --noEmit` clean.

- [ ] 2. Create the single derived-totals source of truth `deriveSheetTotals`.
      Create `src/logic/sheet-totals.ts` exporting `SheetTotals` and `deriveSheetTotals(character)`,
      lifting the inline derivations currently in `useCharacter` verbatim: `hardyLevel` (Hardy talent),
      `strongBackLevel`/`sturdyLevel` (talents), `woundMultiplier` (`SPECIES_DATA[species]?.woundMultiplier ?? 1`),
      `effectiveWoundsUseSB` (species-corrected `woundsUseSB`), `SB = getBonus(S total)`,
      `rangedDamageSBMode`; and totals `wounds = computeWoundMaximum(S,T,WP,hardyLevel,effectiveWoundsUseSB,woundMultiplier)`,
      `armourPoints = apResultToArmourPoints(calculateArmourPointsUnified(armour,{filterByWorn:true}))`
      (re-key `APResult head/leftArm/rightArm/body/leftLeg/rightLeg/shield` → sheet `ArmourPoints`
      `head/lArm/rArm/body/lLeg/rLeg/shield`, identical to `useCharacter`'s memo), `maxEncumbrance`,
      `coinWeight`. Pure, no React/DOM/storage. Cite Core pages in comments (rules-compliance).
      Files: `src/logic/sheet-totals.ts` (new).
      Verify: `npx tsc --build --force --noEmit` clean.

- [ ] 3. Refactor `useCharacter` to consume `deriveSheetTotals` (pure extraction, no behavior change).
      In `src/hooks/useCharacter.ts`, replace the inline computations feeding the returned
      `totalWounds`/`armourPoints`/`maxEncumbrance`/`coinWeight` memos with values from
      `deriveSheetTotals(character)`. Keep all side-effecting sync effects (`syncWoundFields`, auto-`wCur`,
      talent/armour/Fatigued syncs) untouched. Observable outputs must be identical.
      Files: `src/hooks/useCharacter.ts`.
      Verify: `vitest --run` — existing `useCharacter` tests pass unchanged.

- [ ] 4. Add the AC2 equivalence test for `deriveSheetTotals`.
      Create `src/logic/__tests__/sheet-totals.test.ts` asserting `deriveSheetTotals(fixture)` yields
      `wounds.total`, `armourPoints` (deep-equal via `toEqual` in the sheet key vocabulary),
      `maxEncumbrance`, and `coinWeight` equal to what `useCharacter` returns for the same fixtures
      (render `useCharacter` via a tiny harness). Fixtures MUST include: an Ogre (woundMultiplier 2),
      a Hardy + Strong Back + Sturdy character, a character with an unworn armour piece and a
      `worn === undefined` piece (worn-only AP), and a character with `houseRules.rangedDamageSBMode !== 'none'`
      feeding a ranged weapon.
      Files: `src/logic/__tests__/sheet-totals.test.ts` (new).
      Verify: `vitest --run src/logic/__tests__/sheet-totals.test.ts` — all pass.

- [ ] 5. Create the pure view-route helpers.
      Create `src/logic/view-route.ts` with `VIEW_ROUTE_PREFIX = 'view'`, `parseViewRoute(hash)`
      (returns the opaque payload after `view/`, or null; no decoding), and
      `formatViewHref(origin, pathname, encoded)` building `${origin}${pathname}#view/${encoded}`.
      Create `src/logic/__tests__/view-route.test.ts` asserting it recognises `#view/...`, returns null
      for normal pages (`#character`, `#combat`, bare `#`), and does not collide with `parseHash`.
      Files: `src/logic/view-route.ts` (new), `src/logic/__tests__/view-route.test.ts` (new).
      Verify: `vitest --run src/logic/__tests__/view-route.test.ts` — all pass.

- [ ] 6. Create the base64url + gzip codecs.
      Create `src/logic/base64url.ts` (`base64urlEncode(bytes)`/`base64urlDecode(s)` using `btoa`/`atob`;
      reject chars outside `[A-Za-z0-9_-]` before decoding; no `structuredClone`). Create
      `src/logic/gzip.ts` (`gzip(bytes)`/`gunzip(bytes, maxBytes)` over `CompressionStream`/
      `DecompressionStream`; `gunzip` aborts once summed chunk length exceeds `maxBytes`).
      Add `src/logic/__tests__/gzip.test.ts` that OPENS with
      `expect(typeof CompressionStream).toBe('function')` and
      `expect(typeof DecompressionStream).toBe('function')` (loud Node-global guard), then round-trips
      `gunzip(gzip(bytes)) === bytes` and asserts the `maxBytes` abort.
      Files: `src/logic/base64url.ts` (new), `src/logic/gzip.ts` (new), `src/logic/__tests__/gzip.test.ts` (new).
      Verify: `vitest --run src/logic/__tests__/gzip.test.ts` — all pass.

- [ ] 7. Create the versioned share-codec envelope.
      Create `src/logic/share-codec.ts`: `SHARE_FORMAT_V = 1`; `encodeSharePayload(json: string): Promise<string>`
      = `base64url([SHARE_FORMAT_V] ++ gzip(utf8(json)))`; `decodeSharePayload(encoded): Promise<DecodeResult>`
      where `DecodeResult = {ok:true;json} | {ok:false;error;code}`. Decode order: reject if
      `encoded.length > MAX_ENCODED_CHARS`; base64url-decode; check version byte; `gunzip(..., MAX_DECOMPRESSED_BYTES)`;
      UTF-8 decode with `{fatal:true}`. Define size constants here or in step 9's module
      (`MAX_ENCODED_CHARS = 2_000_000`, `MAX_DECOMPRESSED_BYTES = 4_000_000`, `MAX_JSON_CHARS = 3_000_000`).
      Files: `src/logic/share-codec.ts` (new).
      Verify: `npx tsc --build --force --noEmit` clean.

- [ ] 8. Create the untrusted-payload validator `validateSharedPayload`.
      Create `src/logic/share-validate.ts`: `validateSharedPayload(json): {ok:true;character} | {ok:false;error}`.
      Order: (1) version pre-check — `JSON.parse` in try/catch, then reject unless raw `_v` is a finite
      number ≤ `CURRENT_VERSION` (catches non-numeric `_v` that `importFromJSON` would force-relabel);
      (2) delegate to `importFromJSON`; (3) normalize in place via a single-sourced spec — exported
      `ARRAY_FIELDS = ['weapons','armour','bSkills','aSkills','talents','trappings','conditions','spells','ammo','mutations','diseases']`
      each `Array.isArray(x) ? x : []`; coerce `chars[k].{i,a,b}` and `move.{m,w,r}` non-finite → 0;
      coerce non-object `houseRules` → `BLANK_CHARACTER.houseRules` and validate `rangedDamageSBMode`
      ∈ `none|halfSB|fullSB` + `ignoreBackpackEnc` boolean; `species` non-string → `''`;
      each `armour[].worn = item.worn !== false` (boolean); scalar numerics (`wCur,corr,sin,fate,fortune,wGC,wSS,wD`)
      non-finite → 0; `portrait` kept only if `isValidPortraitDataUrl`, else `''`. No storage writes.
      Files: `src/logic/share-validate.ts` (new).
      Verify: `npx tsc --build --force --noEmit` clean.

- [ ] 9. Create the portrait/log trim + length-threshold module.
      Create `src/logic/share-portrait.ts`: constants `SHARE_SOFT_LIMIT = 8000`, `SHARE_HARD_LIMIT = 16000`;
      a `trimForLink(character)` that returns the character with `portrait: ''` and `eventLog: []`
      (snapshot keeps both); helpers to classify a full `href` length with the `>=` operator into
      none/soft/hard. (If the `MAX_*` size constants were not placed in step 7, place them in a shared
      constants module imported by both.)
      Files: `src/logic/share-portrait.ts` (new).
      Verify: `npx tsc --build --force --noEmit` clean.

- [ ] 10. Create the plain-text combat stat block generator.
      Create `src/logic/combat-stat-block.ts`: `buildCombatStatBlock(character): string` calling
      `deriveSheetTotals(character)` once. Emit name/species/careerLevel; combat characteristics line
      (`WS BS S T I Ag Dex` as `i+a+b`); `Wounds: <t.wounds.total>`; `Move/Walk/Run` from stored
      `move.{m,w,r}` (Core p.164 comment); `Armour:` from `t.armourPoints` (worn-only, Core p.293);
      one line per weapon with reach/range and damage via
      `calcWeaponDamage(w, t.SB, character.talents, w.runes ?? [], t.rangedDamageSBMode)` — when
      `num === null` print the raw `damage` string, never `null`; include qualities; active conditions
      (`level > 0`). Do NOT list ammunition. Plain text only, no JSON/markup.
      Files: `src/logic/combat-stat-block.ts` (new).
      Verify: `npx tsc --build --force --noEmit` clean.

- [ ] 11. Add the codec/validation/portrait/stat-block tests.
      Create `src/logic/__tests__/share-codec.property.test.ts` (fast-check): round-trip
      `decodeSharePayload(await encodeSharePayload(json)) === {ok:true,json}` for arbitrary JSON strings
      and serialized Character arbitraries; base64url round-trip for arbitrary `Uint8Array`; malformed
      (non-base64url, truncated, wrong first byte) → `{ok:false}` never throws; oversized (encoded
      > `MAX_ENCODED_CHARS`, inflate > `MAX_DECOMPRESSED_BYTES`) reject safely; `validateSharedPayload`
      rejects missing-key/non-object/`_v>CURRENT_VERSION`/`_v:'abc'`/`_v:null` with the version message,
      accepts a real export. Create `src/logic/__tests__/share-validate.hardening.test.ts` enumerating
      the exported `ARRAY_FIELDS` + scalar/object spec with every guarded field wrong-typed, asserting
      `{ok:true}`, coercions applied, and `deriveSheetTotals(result)` does not throw. Create
      `src/logic/__tests__/combat-stat-block.test.ts` (fixtures incl. unworn armour, non-default
      `rangedDamageSBMode`, and a `num===null` weapon). Create `src/logic/__tests__/share-portrait.test.ts`
      (link strips portrait+eventLog; snapshot keeps them; thresholds measured on the full `href` from
      `formatViewHref` with `>=`).
      Files: the four test files above (new).
      Verify: `vitest --run src/logic/__tests__` — all pass.

## Part B — Read-only viewer, breakdown components, and app-shell wiring

- [ ] 12. Add the three new `*BreakdownContent` presentational components (no new math).
      Create `src/components/pages/WoundsBreakdownContent.tsx` (renders a given `WoundMaxResult`: SB, TB×2,
      WPB, Hardy, Total; does NOT re-call `computeWoundMaximum`), `WeaponDamageBreakdownContent.tsx`
      (renders `{num,breakdown}` from `calcWeaponDamage`; shows `breakdown` verbatim and appends `= {num}`
      composed by the component; when `num===null` renders the raw `damage` string with no derived
      tooltip), and `MoveBreakdownContent.tsx` (renders stored `move.{m,w,r}`; labels `Walk = 2×M` only
      when `w === 2*m` and `Run = 4×M` only when `r === 4*m`, else "as recorded on the sheet"; Core p.164
      comment). Add matching `.module.css` files. These read calculator output only.
      Files: `src/components/pages/WoundsBreakdownContent.tsx` (+css), `.../WeaponDamageBreakdownContent.tsx` (+css),
      `.../MoveBreakdownContent.tsx` (+css) (all new).
      Verify: `npx tsc --build --force --noEmit` clean.

- [ ] 13. Add the `useViewRoute` hook.
      Create `src/hooks/useViewRoute.ts` subscribing to `hashchange` and returning
      `parseViewRoute(window.location.hash)` (payload or null). Use `useSyncExternalStore` to avoid a
      setState-in-effect; if an effect is genuinely required, the sanctioned `Tooltip.tsx`
      eslint-disable pattern may be reused.
      Files: `src/hooks/useViewRoute.ts` (new).
      Verify: `npx tsc --build --force --noEmit` clean.

- [ ] 14. Build the `SharedCharacterViewer` component.
      Create `src/components/shared/SharedCharacterViewer.tsx` (+ `.module.css`). It takes `encoded: string`;
      runs the decode pipeline (bare `#view`/`#view/` → "Open a shared character" panel with Paste
      textarea + `<input type="file" accept=".json,application/json">` via `FileReader`; payload present
      → `decodeSharePayload` then `validateSharedPayload`). States: loading (link async path only),
      error (graceful mapped messages per the design's error table + "← Back to my characters"), sheet.
      For the sheet, compute `deriveSheetTotals(character)` once and thread it through every total and
      every `*BreakdownContent`. Render all sections gated by `shouldRenderSection` with the identical
      `SectionKey` values; render identity/characteristics/skills/talents/weapons/armour always. Every
      calculated total uses `TooltipTriggerCell` + a single `Tooltip` (one open at a time). Render portrait
      only if `isValidPortraitDataUrl`. Add a footer "Import into my characters" button that opens the
      viewer's own `ConfirmDialog` and, on confirm, calls `importFromJSONWithPortrait(json)` (create-new
      semantics — NOT SettingsPage's overwrite handler). Imports NO editable inputs, NO update/storage/
      appendEvent. Back control uses `history.replaceState` + synthetic `hashchange`.
      Files: `src/components/shared/SharedCharacterViewer.tsx` (+css) (new).
      Verify: `npx tsc --build --force --noEmit` clean; `npm run build` succeeds.

- [ ] 15. Wire the viewer into `App.tsx` (two changes).
      (1) In `App()`, compute `isViewMode = parseViewRoute(window.location.hash) !== null` and, in the
      init effect, skip `runMigration()` + portrait-store init/migration in view mode (set `migrated`
      true directly); add the `leftViewMode` belt-and-braces path so "Back to my characters" re-runs the
      normal init branch once before the shell renders. (2) In `AppContent`, before the welcome/shell
      branch, read `useViewRoute()`; when non-null render ONLY `<SharedCharacterViewer encoded={payload} />`
      (no Navigation/WelcomeScreen/AppWithCharacter/PrintLayout/quick actions). No other behavior altered.
      Files: `src/App.tsx`.
      Verify: `vitest --run` — existing App/shell tests still pass; `npm run build` succeeds.

- [ ] 16. Add viewer + App view-mode tests.
      Create `src/components/shared/__tests__/SharedCharacterViewer.test.tsx`: totals equal
      `deriveSheetTotals(fixture)` (incl. unworn-armour + non-default-house-rule fixtures); each total
      wrapped in `TooltipTriggerCell` and activating opens a `Tooltip` with the matching `*BreakdownContent`
      (single-open-at-a-time); movement tooltip asserted source-stating (conditional `2×M`/`4×M` labels);
      `container.querySelectorAll('input,textarea,select')` empty and spies on `localStorage.setItem`,
      `getPortraitStore().savePortrait`, `appendEvent` show no calls during render/tooltip; malformed/
      oversized/newer-version payloads render the mapped message with no throw; "Import into my characters"
      touches storage only after confirm and calls `importFromJSONWithPortrait` once (mocked). Create
      `src/__tests__/App.view-mode.test.tsx`: (1) mounting `App` on `#view/...` in a clean env performs no
      `localStorage.setItem`/IndexedDB open; (2) fresh `#view/...` → Back → create character initialises
      the shell correctly and persists the created character.
      Files: `src/components/shared/__tests__/SharedCharacterViewer.test.tsx` (new), `src/__tests__/App.view-mode.test.tsx` (new).
      Verify: `vitest --run` — new tests pass, all existing tests green.

## Part C — Settings share UI

- [ ] 17. Add the "Share with GM" card to Settings.
      In `src/components/pages/SettingsPage.tsx`, add a new `Card` (alongside Export/Import) with:
      **Download snapshot** (writes `exportToJSONWithPortrait(character, characterId)` JSON to a Blob with
      filename `<safeName>_share_<timestamp>.json`, reusing the existing safe-name/timestamp construction),
      **Copy snapshot** (same payload to clipboard), **Copy Combat Stat Block**
      (`buildCombatStatBlock(character)` via `navigator.clipboard.writeText`), and **Copy Share Link**
      (`trimForLink` → `exportToJSONWithPortrait` → `encodeSharePayload` → `formatViewHref(location.origin,
      location.pathname, encoded)`). Feature-detect `CompressionStream`; disable Copy Share Link with a
      snapshot hint when absent. Show the privacy note (link embeds data — anyone with it can read the
      sheet) visually contrasted with the local-only file/clipboard option. Render soft warning when
      `href.length >= SHARE_SOFT_LIMIT` (link stays primary) and a `data-testid="share-hard-warning"`
      element demoting Copy Share Link below Download snapshot when `href.length >= SHARE_HARD_LIMIT`;
      warning text names portrait and "a large sheet (many items or a long log)" as causes. Reuse existing
      clipboard/download patterns; change no existing control. `characterId` is already a prop.
      Files: `src/components/pages/SettingsPage.tsx` (+ `SettingsPage.module.css` as needed).
      Verify: `npx tsc --build --force --noEmit` clean; `npm run build` succeeds.

- [ ] 18. Add the Settings share tests (new file, existing Settings tests untouched).
      Create `src/components/pages/__tests__/SettingsShare.test.tsx`: the three controls appear; "Copy
      Combat Stat Block" writes plain text to a mocked clipboard; "Copy Share Link" writes a `#view/...`
      URL and shows the privacy note contrasted with the local-only snapshot; length-warning transition
      asserted on the full `href` with `>=` — just-below-`SHARE_SOFT_LIMIT` fixture shows neither warning,
      at/above `SHARE_SOFT_LIMIT` shows soft caution with link primary, at/above `SHARE_HARD_LIMIT` renders
      `data-testid="share-hard-warning"` and demotes Copy Share Link so Download snapshot is primary.
      Files: `src/components/pages/__tests__/SettingsShare.test.tsx` (new).
      Verify: `vitest --run src/components/pages/__tests__/SettingsShare.test.tsx` — all pass.

## Part D — Full-suite gate

- [ ] 19. Run the complete verification gate and fix any failure at root cause.
      Run all four commands from `d:\Git\PWACharSheet`: `npx tsc --build --force --noEmit`, `npm run build`,
      `vitest --run`, `npx eslint .`. All must be clean (0 eslint errors, no new warnings; no new
      suppressions). Confirm no existing test file was modified. Fix any surfaced error per the fix-errors
      rule.
      Files: as needed to resolve failures.
      Verify: the four commands above all pass clean.

---

## Notes / assumptions

- Verify commands follow the task's exact wording (`npx tsc --build --force --noEmit`, `npm run build`,
  `vitest --run`, `npx eslint .`), which are equivalent to the `package.json` scripts (`typecheck`,
  `build`, `test`) with the explicit `--force` rebuild.
- `src/App.tsx` currently returns `null` while `!migrated`; the view-mode skip sets `migrated` directly
  so a fresh-browser share link never blocks on (or triggers) migration — the key AC1/AC4 guarantee.
- `useCharacter`'s returned `armourPoints` memo already includes `shield`; `deriveSheetTotals` re-keys to
  the same shape so the AC2 deep-equal holds.
- Base path is `/PWACharSheet/` (`vite.config.ts`), so `formatViewHref` prefixes a non-trivial
  origin+pathname — thresholds are measured on the full `href`, as the design pins.
