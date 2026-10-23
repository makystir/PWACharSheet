# Design Review — GM Read-Only Share / Export

**Scope:** `d:\Git\PWACharSheet\.agents\tasks\gm-share\design.md` reviewed against
`d:\Git\PWACharSheet\.agents\tasks\gm-share\requirements.md`, with every load-bearing claim about
existing calculators, breakdown components, serialization helpers, routing, and migration verified
directly against source.

**Verdict: APPROVED** (0 HIGH, 0 MEDIUM, 2 NIT).

The design is unusually thorough. It has already absorbed three prior review passes (§12), and the
structural decisions those passes produced — the single `deriveSheetTotals` source of truth, the
extracted `section-visibility` predicate, the single-sourced `NORMALIZE_SPEC`/`ARRAY_FIELDS`
hardening, the view-mode migration skip — are all confirmed against the actual code. Every concrete
settlement the step called out (viewer route coexistence, serialization/calculator/breakdown reuse,
snapshot payload shape, gzip + base64url compression with zero bundle cost, portrait thresholds,
too-long-link warning, explicit import-vs-view separation, untrusted-input validation with a pure
encode/decode property seam, and breakdown tooltips on every calculated total) is resolved concretely
and consistently with the code and the rulebook-compliance / calculated-total / fix-errors rules.

Because there are no HIGH or MEDIUM findings, the plan is approved for implementation. The two NITs
below are optional polish and do not block.

---

## Findings

1. **[NIT] `handleFileImport`'s existing `accept=".json"` differs from the viewer's proposed
   `.json,application/json`.** (§2 "How a snapshot is opened", §9 Change table.)
   The design deliberately chooses the permissive `.json,application/json` for the viewer's open-file
   control and justifies it (some OSes report `.json` under a non-standard MIME; content is validated
   by `validateSharedPayload` regardless of the picker filter). Verified that the *existing* Settings
   import uses the stricter `accept=".json"` (`SettingsPage.tsx`). This is a harmless intentional
   divergence, not a defect. **Optional fix:** add a one-line note in the task that the viewer's
   looser `accept` is intentional and is *not* a change to the existing Settings import control (which
   stays `.json`), so a later reviewer does not "normalise" the two and silently narrow the picker.

2. **[NIT] "Psychology / corruption-sin / trappings rendered when non-empty" is described but not
   pinned to a predicate the way the gated sections are.** (§1 "Section visibility".)
   The gated sections are pinned to the shared `shouldRenderSection` (verified it is module-private in
   `PrintLayout.tsx` and covers exactly `spells, companions, mutations, criticalWounds, hirelings,
   enterprises, grudgeBook, psychologyTraits, rituals, yenlui, estate, conditions, ammunition`). The
   always-rendered-but-empty-safe blocks (identity, characteristics, skills, talents, weapons, armour)
   are also correctly outside the predicate — verified PrintLayout renders those unconditionally.
   `psych` (a `string`), corruption/`sin` (numbers), and `trappings` fall in a third "render when the
   underlying field is non-empty" bucket that the design states prose-only. Verified these fields
   exist (`psych: string`, `sin: number`, `trappings: Trapping[]`) so there is no feasibility gap, and
   `psychologyTraits` (the house-rule-gated array) is correctly distinct from `psych`. **Optional
   fix:** state the exact non-empty test the viewer uses for each of these three (e.g.
   `psych.trim().length > 0`, `(corr || sin) > 0`, `trappings.length > 0`) so the viewer's visibility
   is as mechanically pinned as the `shouldRenderSection` sections, avoiding interpretation drift at
   implementation time. Not blocking because every referenced field is confirmed present and the
   "render when present" intent is unambiguous enough to implement safely.

---

## Verified Assumptions (checked against source)

- **`useCharacter` produces the derived totals via inline derivations the viewer must reproduce.**
  Confirmed in `src/hooks/useCharacter.ts`: `totalWounds` uses `calculateTotalWounds(chars,
  woundsUseSB, hardyLevel, woundMultiplier)` with `hardyLevel` from the `Hardy` talent and
  `woundMultiplier` from `SPECIES_DATA[species]?.woundMultiplier ?? 1`; `armourPoints` memo calls
  `calculateArmourPointsUnified(armour, { filterByWorn: true })` and re-keys to
  `{head, lArm, rArm, body, lLeg, rLeg, shield}`; `maxEncumbrance` uses `calculateMaxEncumbrance(chars,
  strongBackLevel, sturdyLevel)`; `coinWeight` uses `calculateCoinWeight(wGC, wSS, wD)`. The
  `deriveSheetTotals` extraction (§1a) is a faithful, byte-for-byte lift of exactly these. The AC2
  deep-equal test (`toEqual(hook.armourPoints)`) is valid because both go through the same calc with
  the same re-key (shield included on both sides).
- **`backfillCharacter` overwrites `woundsUseSB` from `SPECIES_DATA` on load.** Confirmed — the
  `effectiveWoundsUseSB` species-correction in `deriveSheetTotals` correctly mirrors this, so a stale
  stored flag cannot diverge the wounds total.
- **AP worn-filter discrepancy is real and the normalization fix is correct.** Confirmed
  `calculateArmourPointsUnified` filters `item.worn !== false` (so `undefined` counts) while
  `getAPBreakdown` filters `item.worn === true` (so `undefined` is excluded). The §5 coercion
  `item.worn = item.worn !== false` makes both filters agree by construction. Finding 4 from the prior
  pass is correctly resolved.
- **`importFromJSON` force-relabels `_v = 8` and its ceiling is numeric-only.** Confirmed in
  `export-import.ts`: ceiling is `typeof data._v === 'number' && data._v > CURRENT_VERSION`, then
  `character._v = 8`. A string/null `_v` passes the required-key check and is silently relabeled, so
  the §5 version pre-check (reject when raw `_v` is not a finite number ≤ 8) is a genuine, necessary
  hardening. `CURRENT_VERSION = 8`, `REQUIRED_TOP_LEVEL_KEYS = ['_v','name','species','chars']`
  confirmed.
- **`deepMergeImport` copies arrays/primitives verbatim and only recurses into plain objects.**
  Confirmed — so present-but-wrong-typed fields survive, justifying the explicit `NORMALIZE_SPEC`
  pass. The coercion targets (`chars`, `move`, `houseRules`, `species`, `armour[].worn`, scalars,
  arrays, portrait) all correspond to real `Character` fields.
- **`ARRAY_FIELDS` matches the real `Character` array fields.** Confirmed all of `weapons, armour,
  bSkills, aSkills, talents, trappings, conditions, spells, ammo, mutations, diseases` exist as arrays
  in `src/types/character.ts`. Confirmed **there is no `prayers` field** (spells and prayers both live
  in `spells: SpellItem[]`; PrintLayout renders a single "Spells and Prayers" section from
  `character.spells`). `xpLog` exists but is correctly excluded (viewer renders no XP history).
- **`shouldRenderSection` / `SectionKey` are module-private in `PrintLayout.tsx`** and gate exactly
  the sections the design lists, including the `conditions` `level > 0` filter, the `ammunition`
  `ammo.length > 0` gate, and the house-rule-gated `enterprises`/`grudgeBook`(→`grudges`)/
  `psychologyTraits`/`yenlui` cases. Extracting them verbatim into `section-visibility.ts` is sound;
  PrintLayout's change is import-only.
- **`BLANK_CHARACTER.houseRules.rangedDamageSBMode` defaults to `'none'`.** Confirmed — equal to the
  RAW/sheet default, so a decoded character omitting `houseRules` matches the live sheet, and a
  non-default value carried in the payload is honoured.
- **`calcWeaponDamage(weapon, SB, talents, runes, rangedDamageSBMode = 'none')`** signature confirmed
  in `weapons.ts`, returns `{ num: number | null; breakdown: string }`, returns `{ num: null,
  breakdown: '' }` for empty/`'—'` damage, and the `breakdown` is `parts.join(' ')` with no `= total`
  suffix. The viewer/stat-block argument list and the "compose `= num` in the component; print raw
  `damage` string when `num === null`" rule are correct. `RangedDamageSBMode = 'none'|'halfSB'|'fullSB'`
  confirmed.
- **Fresh-install startup writes storage.** Confirmed `runMultiCharMigration` (via `runMigration`)
  reaches a fresh-install branch that does `setItem(INDEX_KEY, …)`, and `getPortraitStore().init()`
  calls `indexedDB.open(...)`. The view-mode migration skip (compute `isViewMode` from a pure
  `parseViewRoute` before the effect; set `migrated` directly) is therefore necessary for AC1/AC4 on a
  fresh-browser link, and the belt-and-braces "Back to my characters re-runs normal init
  (idempotent)" transition is justified. `runMigration` is idempotent (no-ops when the index exists).
- **Existing `*BreakdownContent` components exist and are reusable.** Confirmed files for
  `CharBreakdownContent`, `CBBreakdownContent`, `SkillBreakdownContent`, `EncumbranceBreakdownContent`,
  `TrappingsBreakdownContent`, `CoinWeightBreakdownContent`, `APBreakdownContent`. The three *new*
  components (`WoundsBreakdownContent`, `WeaponDamageBreakdownContent`, `MoveBreakdownContent`) only
  present calculator output and introduce no formulas. The Wounds breakdown lines (`SB`, `TB×2`,
  `WPB`, `Hardy`, `Total`) match `WoundMaxResult` and PrintLayout's existing Wounds table exactly.
- **`TooltipTriggerCell` is a pure presentational `role="button"` div** with caller-controlled
  open/close, no storage/writes, and built-in hover + Enter/Space + click handling. Confirmed — it is
  reusable in the viewer with no editable context, satisfying AC1 (no inputs/writes), AC3 (breakdown
  tooltips), and NFR5 (hover desktop / tap+focus touch+keyboard). The single-open-at-a-time precedent
  `CharacterBreakdownTooltips.tsx` exists.
- **Serialization reuse.** `exportToJSONWithPortrait(character, characterId)` confirmed to emit
  `{...character, portrait}` as JSON (snapshot payload), and `exportToFile` stringifies the *bare*
  character (no portrait) — so the design is right that Download snapshot must not call `exportToFile`
  and must reuse only its safe-name/timestamp construction (`name.replace(/[^a-zA-Z0-9_-]/g,'_')` +
  `YYYYMMDD-HHmm` confirmed). `importFromJSON` / `importFromJSONWithPortrait` behave as described
  (the latter does `createCharacter` + `saveCharacter` → create-new semantics, correct for the
  explicit import button).
- **`handleImportConfirm` overwrites the active character** via `updateCharacter(() => pendingImport)`
  (confirmed in `SettingsPage.tsx`) — so the design is correct not to reuse that handler for the
  viewer's "Import into my characters" (which needs create-new via `importFromJSONWithPortrait`).
  `SettingsPage` already receives `characterId` as a prop (used by `handleExportClipboard/File`), so
  no new plumbing is needed.
- **`isValidPortraitDataUrl`** restricts to `data:image/(jpeg|png|webp);base64,...` — confirmed; the
  portrait-hardening and `<img>`-only-if-valid rule is sound.
- **Build/runtime context.** `vite.config.ts` has `base: '/PWACharSheet/'` (so the design's "measure
  the full `href` including a non-trivial origin+pathname prefix" is correct), `test.environment:
  'jsdom'`, `globals: true`, and a 15s `testTimeout` already tuned for fast-check property suites. The
  property-test seam `decodeSharePayload(await encodeSharePayload(json)).json === json` is pure over
  strings/bytes and fits the existing fast-check setup.
- **`Condition` has `name` and `level: number`** — the stat-block `conditions.filter(c => c.level >
  0)` and the conditions section gate are valid. Identity fields (`class`, `career`, `careerLevel`,
  `careerPath`, `status`, etc.) exist on `Character`. Weapons carry `rangeReach`/`maxR` used by the
  stat block.

## Unverified / Wrong Assumptions

None found. Every claim the design makes about existing code — including the specific gaps it
identifies (`importFromJSON` numeric-only `_v` ceiling, `deepMergeImport` verbatim copy of
wrong-typed fields, the `worn !== false` vs `worn === true` filter mismatch, the fresh-install
`setItem`/IndexedDB `open` writes, and the `handleImportConfirm` overwrite semantics) — was confirmed
against the source files cited. No contradiction between design sections and no feasibility gap was
identified.

---

### Rules-compliance / steering check

- **rules-compliance / NFR3:** The feature introduces **no new mechanics**. All derived numbers flow
  through existing calculators (`calculateWoundsCore`, `calculateArmourPointsUnified`,
  `calculateMaxEncumbrance`, `calculateCoinWeight`, `calcWeaponDamage`) that already cite Core pages.
  The one genuinely new presentation — movement — is handled correctly: movement values are **stored
  fields** (`move.{m,w,r}`), so `MoveBreakdownContent` is source-stating, renders the stored values
  verbatim, evaluates Walk/Run multiples independently, and never overrides the sheet. The Core p.164
  (Walk = 2×M, Run = 4×M) citation is comment-only and does not invent a formula. Compliant.
- **calculated-total-tooltips:** Every calculated total enumerated in AC2 (characteristic total/CB,
  skill total, wounds max, encumbrance total/max, carried-trapping enc, coin weight, AP per location,
  weapon damage, movement) is mapped (§1 table) to a `*BreakdownContent` rendered through
  `TooltipTriggerCell` + `Tooltip`, including the three new breakdown components for the totals that
  lacked a reusable one. Compliant.
- **fix-errors / NFR4:** The plan is additive — `useCharacter` is a pure extraction (observable
  behavior unchanged, tests stay green), `PrintLayout` is import-only, and no existing test is
  modified. The §7 gate runs `typecheck`/`build`/`test` with no suppressions. Consistent with the
  fix-at-root-cause rule.
