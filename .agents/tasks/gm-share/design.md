# GM Read-Only Share / Export — Technical Design

## Overview

This feature adds a **read-only character viewer** reachable via a dedicated hash route, fed by two
delivery mechanisms that already share the app's single-character serialization format:

- **(a) Offline snapshot** — Settings produces (i) a downloadable `*.json` snapshot file and
  (ii) a clipboard copy of the same payload, plus a separate **Copy Combat Stat Block** button
  that copies a concise plain-text block. Both open fully offline.
- **(b) URL-hash share link** — Settings produces a link whose `#view/<payload>` hash fragment
  carries the **compressed** character; opening it decodes entirely client-side.

Both mechanisms render the **same** viewer component. That viewer reuses the existing calculators
(`src/logic/*`) and the existing `*BreakdownContent` components + `TooltipTriggerCell` + `Tooltip`,
so every number and every breakdown tooltip matches the live sheet exactly. Nothing in the feature
mutates, auto-saves, imports, or logs — viewing is strictly read-only, and importing into the saved
list is a separate, explicit, opt-in action routed through the existing import path.

**The derived-totals reuse contract (the load-bearing decision of this revision).** The live sheet's
derived totals (wounds, worn-only armour points, max encumbrance, coin weight, and weapon damage) are
**not** produced by a calculator called on a bare `Character`. They are produced by `useCharacter`,
which first runs `backfillCharacter` (species `woundsUseSB` correction, `syncTalentBonuses`, armour
migration, `syncWoundFields`) and then feeds the calculators **derived inputs** it computes inline:
`hardyLevel` (from the `Hardy` talent), `woundMultiplier` (from `SPECIES_DATA[species]`),
`strongBackLevel`/`sturdyLevel` (from talents), and — for weapon damage — `SB = getBonus(S total)`,
`character.talents`, `weapon.runes`, and `character.houseRules.rangedDamageSBMode`. Because the viewer
deliberately bypasses `useCharacter` (it must render with zero saved characters and perform no
writes), calling the calculators on the decoded `Character` **without reproducing those derived
inputs would silently diverge** from the live sheet for Ogres, Hardy/Strong Back/Sturdy characters,
characters with a stale stored `woundsUseSB`, and characters with a non-default ranged-damage house
rule — a direct AC2 failure, and the breakdown tooltips would show the wrong breakdown too.

This revision resolves that by **extracting the derivation currently inline in `useCharacter` into one
shared pure helper, `deriveSheetTotals(character)` (`src/logic/sheet-totals.ts`), consumed by BOTH
`useCharacter` and the viewer.** This is the "reuse, don't fork" (NFR2) answer and makes AC2
mechanical: there is exactly one place that turns a `Character` into its derived totals, and both the
live sheet and the viewer go through it. See §1a.

**Locked technology stack / runtime:** Vite + React + TypeScript; Vitest + fast-check; CSS modules;
existing PWA service worker. **No new runtime dependency.** Compression uses the browser-native
`CompressionStream`/`DecompressionStream` (gzip) with a hand-rolled base64url codec. These stream
globals require **Node ≥ 20** for the build/test environment (they are not provided by jsdom itself —
see §5). No backend, no network, no telemetry.

The work is **additive**. No existing file's behavior changes except that `SettingsPage` gains new
controls, `App.tsx` gains a new route branch, and `useCharacter` is refactored to call the new
`deriveSheetTotals` helper **with no change to its observable behavior** (pure extraction — the
existing `useCharacter` tests remain green unchanged). No existing test is modified.

---

## 1. Viewer route and app-shell coexistence

### Decision: a distinct top-level hash segment `#view/...`, intercepted *before* the normal shell

Two options were considered:

- **A — add `'view'` to `VALID_PAGES`.** Rejected. `VALID_PAGES` entries are navigation tabs rendered
  *inside* `AppWithCharacter`, which assumes an active saved character and is gated behind the
  welcome screen when `characters.length === 0`. A shared viewer must render with zero saved
  characters and must not touch the saved-character machinery. Reusing the tab router would force
  the viewer through exactly the gating FR2 says to bypass.
- **B — a separate top-level hash segment handled above the shell (chosen).** The viewer is not a
  tab; it is a different *mode* of the app. Intercepting it at the top of `AppContent`, before the
  welcome-screen / `AppWithCharacter` branch, keeps the editable shell and its migrations untouched
  and lets the viewer render standalone.

The normal page router keeps `parseHash`/`formatHash` for `#character`, `#combat`, … unchanged
(additive guarantee). A new **pure** helper module parses the view route separately.

**New file `src/logic/view-route.ts`** (pure, unit-testable):

```ts
export const VIEW_ROUTE_PREFIX = 'view';

/** Returns the raw encoded payload when the hash is a view route, else null. */
export function parseViewRoute(hash: string): string | null {
  const s = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!s.startsWith(VIEW_ROUTE_PREFIX + '/')) return null;
  return s.slice(VIEW_ROUTE_PREFIX.length + 1); // everything after "view/"
}

/** Builds a full shareable URL for an already-encoded payload. */
export function formatViewHref(origin: string, pathname: string, encoded: string): string {
  return `${origin}${pathname}#${VIEW_ROUTE_PREFIX}/${encoded}`;
}
```

`parseViewRoute` deliberately does **no** decoding/validation — it only recognises the segment and
returns the opaque payload string. Decoding is isolated (Section 5) so it can be property-tested.

**Wiring in `src/App.tsx`:** add a `useSyncExternalStore`-free check at the very top of `AppContent`
(it already runs `useHashRoute`, so we read `window.location.hash` via a tiny new hook
`useViewRoute()` that subscribes to `hashchange` and returns `parseViewRoute(...)`). When it returns
non-null, `AppContent` returns `<SharedCharacterViewer encoded={payload} />` and renders **nothing
else** — no `Navigation`, no `WelcomeScreen`, no `AppWithCharacter`, no `PrintLayout`, no undo/quick
actions. This runs regardless of `manager.characters.length`, satisfying AC4.

### Startup migrations MUST be skipped in view mode (resolves review finding 1)

The top-level `App()` today gates **all** rendering behind a `migrated` flag and, inside that effect,
runs `runMigration()` then `getPortraitStore().init()` + `runPortraitMigration()` **before anything
renders**. This is **not** harmless for the AC8 scenario ("open the share URL in a fresh browser
context with no saved data"):

- `runMigration()` → `runMultiCharMigration()` on a fresh install reaches its empty-store branch and
  executes `setItem(INDEX_KEY, JSON.stringify(emptyIndex))` — a **localStorage write** (verified in
  `src/storage/migration.ts`).
- `getPortraitStore().init()` **creates the IndexedDB database** (verified in
  `src/storage/portrait-store.ts`).

Both violate AC1 ("no writes to `localStorage`, IndexedDB, or the event log") and AC4 ("viewing does
not create, modify, or require a saved character") for a GM who merely opens a link in a clean
browser. A render-time spy would not catch it because the write happens in `App()` **before** the
viewer renders.

**Decision: detect view mode before the migration effect and skip startup migrations entirely in
view mode.** `parseViewRoute` is pure (no side effects), so `App()` can call it synchronously on the
current hash and branch:

```ts
export default function App() {
  const [migrated, setMigrated] = useState(false);
  // Pure, side-effect-free: recognise the view route before any storage touch.
  const isViewMode = parseViewRoute(window.location.hash) !== null;

  useEffect(() => {
    if (isViewMode) {
      // Viewer reads only the decoded payload and renders link portraits from the
      // inline data-URL, so it needs neither the saved store nor the portrait DB.
      // Skipping migration keeps AC1/AC4 intact for a fresh-browser share link.
      setMigrated(true);
      return;
    }
    async function initApp() {
      runMigration();
      const store = getPortraitStore();
      await store.init();
      await runPortraitMigration(store);
      setMigrated(true);
    }
    initApp();
  }, [isViewMode]);
  // …
}
```

`isViewMode` is computed once from the initial hash. If a user is *already* in the normal shell and
then navigates to a `#view/...` link (same tab), the snapshot/link viewer still works because the
viewer itself depends only on the decoded payload; the saved store having been initialised earlier in
that session is irrelevant to the viewer and is not a new write caused by viewing. The fresh-context
case — the one AC8 and finding 1 care about — never initialises the store at all. A unit/integration
test asserts that mounting `App` on a `#view/...` hash in a clean environment performs **no**
`localStorage.setItem` and **no** IndexedDB `open`/`init` (see §7).

### Returning to your own characters

The viewer renders a prominent **"← Back to my characters"** control (and, on the shared-link
privacy banner, the same affordance). It calls `history.replaceState(null, '', location.pathname)`
to drop the `#view/...` fragment, then dispatches a `hashchange` so `AppContent` re-renders into the
normal shell (welcome screen if the user has no characters, otherwise their active character). No
reload is required. Because the fragment is only in `location.hash`, leaving the viewer never
mutates storage.

#### Transitioning out of view mode in a fresh context (resolves finding 9)

`isViewMode` is computed once at mount, so a user who opens a `#view/...` link in a **fresh** browser
has startup migration (`runMigration()` + portrait-store init/`runPortraitMigration`) **skipped for
the whole session**. If they then click "Back to my characters", `AppContent` re-renders into the
normal shell without migration ever having run — meaning no `INDEX_KEY` was written and the portrait
IndexedDB DB was never created for that session. Two ways to make this safe were considered:

- **Rely on the welcome-screen path being migration-independent.** Verified: when migration is
  skipped, `manager.characters` is empty, so `AppContent` renders `WelcomeScreen` (the
  `characters.length === 0` branch), which does not assume a pre-existing index or portrait DB. A
  subsequent "create character" goes through `createCharacter`/`saveCharacter`, which write a fresh
  index on demand. So the welcome path is already safe.
- **Run the skipped startup migration lazily on the transition (chosen, belt-and-braces).** Relying
  on *every* downstream consumer being lazily safe is fragile; the robust fix is to make leaving view
  mode idempotently run the one-time startup init. Decision: the "Back to my characters" handler, in
  addition to clearing the hash, flips a module-level `leftViewMode` flag and re-dispatches so
  `App()`'s init effect re-runs its **normal** (non-view) branch once — `runMigration()` →
  `getPortraitStore().init()` → `runPortraitMigration()` — before `AppContent` renders the shell.
  Because `App()` already gates on `migrated`, the effect sets `migrated` only after init completes,
  so the shell never renders un-migrated. `runMigration` is idempotent (it no-ops when the index
  already exists), so this is safe whether or not the user had data.

A test (§7) covers "open `#view/...` in a clean environment → Back to my characters → create a
character": it asserts no storage write happens **while viewing**, then that after Back + create, the
index and portrait store are initialised and the created character persists — proving the shell
initialises correctly on the way out.

### 1a. The derived-totals contract: `deriveSheetTotals` (resolves findings 1, 2, 3, 4)

**New file `src/logic/sheet-totals.ts`** — a single pure function that is the one source of truth for
every derived total the sheet shows. It holds the exact derivations that are **currently inline in
`useCharacter`** (verified in `src/hooks/useCharacter.ts`), so moving them here changes no behavior:

```ts
import { getBonus, calculateTotalWounds, computeWoundMaximum,
         calculateArmourPointsUnified, calculateMaxEncumbrance,
         calculateCoinWeight } from './calculators';
import { SPECIES_DATA } from '../data/species';
import type { APResult } from './calculators';
import type { Character, WoundMaxResult, ArmourPoints } from '...';

export interface SheetTotals {
  // derived inputs (needed to drive breakdown components identically)
  hardyLevel: number;
  woundMultiplier: number;
  strongBackLevel: number;
  sturdyLevel: number;
  effectiveWoundsUseSB: boolean;   // species-corrected, see below
  SB: number;                      // getBonus(S total) — for weapon damage
  rangedDamageSBMode: Character['houseRules']['rangedDamageSBMode'];
  // totals
  wounds: WoundMaxResult;          // computeWoundMaximum output (total + breakdown parts)
  armourPoints: ArmourPoints;      // worn-only, Core p.293 — SHEET key vocabulary (see below)
  maxEncumbrance: number;
  coinWeight: number;
}

export function deriveSheetTotals(c: Character): SheetTotals {
  const hardyLevel     = c.talents.find(t => t.n === 'Hardy')?.lvl ?? 0;
  const strongBackLevel= c.talents.find(t => t.n === 'Strong Back')?.lvl ?? 0;
  const sturdyLevel    = c.talents.find(t => t.n === 'Sturdy')?.lvl ?? 0;
  const species        = SPECIES_DATA[c.species];               // may be undefined
  const woundMultiplier= species?.woundMultiplier ?? 1;
  // useCharacter corrects woundsUseSB from species on load (backfillCharacter);
  // reproduce that so a stale stored flag can't diverge the total.
  const effectiveWoundsUseSB = species ? species.woundsUseSB : c.woundsUseSB;
  const S = c.chars.S.i + c.chars.S.a + c.chars.S.b;
  const T = c.chars.T.i + c.chars.T.a + c.chars.T.b;
  const WP = c.chars.WP.i + c.chars.WP.a + c.chars.WP.b;
  return {
    hardyLevel, woundMultiplier, strongBackLevel, sturdyLevel,
    effectiveWoundsUseSB,
    SB: getBonus(S),
    rangedDamageSBMode: c.houseRules.rangedDamageSBMode,
    wounds: computeWoundMaximum(S, T, WP, hardyLevel, effectiveWoundsUseSB, woundMultiplier),
    // Worn-only, Core p.293. Re-key APResult -> ArmourPoints exactly as useCharacter does,
    // so the viewer, table, stat block, and AC2 test all index the SAME key vocabulary.
    armourPoints: apResultToArmourPoints(
      calculateArmourPointsUnified(c.armour, { filterByWorn: true })
    ),
    maxEncumbrance: calculateMaxEncumbrance(c.chars, strongBackLevel, sturdyLevel),
    coinWeight: calculateCoinWeight(c.wGC, c.wSS, c.wD),
  };
}

// The ONE place APResult (head/leftArm/rightArm/body/leftLeg/rightLeg/shield) is mapped to the
// sheet's ArmourPoints (head/lArm/rArm/body/lLeg/rLeg/shield). Lifted verbatim from useCharacter's
// armourPoints memo so the two cannot diverge.
function apResultToArmourPoints(u: APResult): ArmourPoints {
  return {
    head: u.head, lArm: u.leftArm, rArm: u.rightArm,
    body: u.body, lLeg: u.leftLeg, rLeg: u.rightLeg, shield: u.shield,
  };
}
```

**Armour-points key vocabulary (resolves finding 4).** `calculateArmourPointsUnified` returns the
`APResult` shape (`head/leftArm/rightArm/body/leftLeg/rightLeg/shield`, verified in `calculators.ts`),
but `useCharacter`'s `armourPoints` memo re-keys it to the sheet's `ArmourPoints` shape
(`head/lArm/rArm/body/lLeg/rLeg/shield`, verified). `deriveSheetTotals` performs the **identical**
re-key via `apResultToArmourPoints`, so `totals.armourPoints` is the `ArmourPoints` shape
**throughout** — the viewer, the §1 table, the stat block, and the AC2 test all index with the sheet
keys (`head, lArm, rArm, body, lLeg, rLeg, shield`). This also matches `getAPBreakdown`'s
`LocationKey` vocabulary (`head/lArm/rArm/body/lLeg/rLeg`, verified in `armourLayering.ts`), so the AP
tooltip is driven with the same `loc` the display uses — no second vocabulary anywhere. The AC2 test
asserts `totals.armourPoints` **deep-equals** `useCharacter`'s `armourPoints` (same keys, same
numbers), not a cross-shape comparison.

**Why this matches the live sheet exactly (per finding, verified in source):**

- **Wounds (finding 1).** `useCharacter` computes `totalWounds = calculateTotalWounds(chars,
  woundsUseSB, hardyLevel, woundMultiplier)` with `hardyLevel` from the `Hardy` talent and
  `woundMultiplier` from `SPECIES_DATA[species]?.woundMultiplier ?? 1`, and `backfillCharacter`
  **overwrites `woundsUseSB` from `SPECIES_DATA`** on load. `computeWoundMaximum` and
  `calculateTotalWounds` both delegate to the same `calculateWoundsCore`, so `wounds.total` here
  equals the live `totalWounds` **for the identical inputs** — which is why `deriveSheetTotals`
  reproduces `hardyLevel`, `woundMultiplier`, **and** the species `woundsUseSB` correction
  (`effectiveWoundsUseSB`) rather than trusting the decoded `woundsUseSB`.
- **Armour points.** Pinned to `calculateArmourPointsUnified(armour,
  { filterByWorn: true })` — byte-identical to `useCharacter`'s `armourPoints` memo (worn-only, Core
  p.293). The legacy `calculateArmourPoints` wrapper (which uses `filterByWorn: false`, counting
  **unworn** armour) is **not** used anywhere in the viewer or the stat block.
- **Max encumbrance / coin weight (finding 3).** `calculateMaxEncumbrance(chars, strongBackLevel,
  sturdyLevel)` with the `Strong Back`/`Sturdy` talent levels re-derived exactly as `useCharacter`
  does; `calculateCoinWeight(wGC, wSS, wD)` identically.
- **Weapon damage SB & house rule.** `SB = getBonus(S total)` and `rangedDamageSBMode =
  houseRules.rangedDamageSBMode` are carried so the viewer and stat block call
  `calcWeaponDamage(weapon, totals.SB, character.talents, weapon.runes ?? [], totals.rangedDamageSBMode)`
  — the **exact** argument list used by `WeaponCards.tsx`/`AttackFlow.tsx` (verified). Because
  `houseRules` is **not** a `REQUIRED_TOP_LEVEL_KEYS` field, a decoded character that omitted it is
  filled from `BLANK_CHARACTER`, whose `houseRules.rangedDamageSBMode` default is `'none'` (verified
  in `types/character.ts`) — the RAW default, identical to the sheet's effective default, so a shared
  character with a non-default house rule (which **is** carried in the payload) still matches.

**`useCharacter` is refactored to call `deriveSheetTotals`** for its `totalWounds`, `armourPoints`,
`maxEncumbrance`, and `coinWeight` memos (it continues to own the `syncWoundFields`/auto-`wCur`
side-effects, which the viewer does not need). Because `deriveSheetTotals` is a byte-for-byte
extraction of the existing inline logic, `useCharacter`'s observable outputs are unchanged and its
tests stay green (NFR4). A new test (§7) asserts `deriveSheetTotals(fixture)` equals `useCharacter`'s
`totalWounds`/`armourPoints`/`maxEncumbrance`/`coinWeight` for the same fixtures, including an Ogre,
a Hardy + Strong Back + Sturdy character, a character with an unworn armour piece, and a character
with `rangedDamageSBMode !== 'none'`.

> **Input precondition.** `deriveSheetTotals` assumes a **normalized** `Character` (finite `chars`,
> object `move`, object `houseRules`, string `species`). The viewer only ever calls it on the output
> of `validateSharedPayload` (§5), which guarantees those shapes, so it never sees a wrong-typed
> field. `useCharacter` calls it on a `backfillCharacter` result, which is likewise well-shaped.

### The viewer component and the calculators/breakdowns it reuses

**New file `src/components/shared/SharedCharacterViewer.tsx`.** It receives the opaque `encoded`
string, runs the decode pipeline (Section 5), and renders one of three states: **loading** (link
path only — gzip decode is async; the snapshot paste/file path validates synchronously and has no
meaningful loading state, so it transitions straight to **sheet** or **error** — resolves finding 8),
**error** (graceful message, Section 5), or the **sheet**. For the sheet it computes
`const totals = deriveSheetTotals(character)` **once** (§1a) and threads `totals` into every total it
displays and every breakdown component, so no displayed number is ever computed a second, divergent
way.

#### Section visibility: one shared `shouldRenderSection` predicate (resolves finding 3)

`PrintLayout` gates each conditional section with a **module-private** `shouldRenderSection(character,
key)` (verified in `src/components/layout/PrintLayout.tsx`; e.g. `spells` →
`character.spells.length > 0`, `conditions` → `character.conditions.filter(c => c.level > 0).length >
0`, `ammunition` → `character.ammo.length > 0`, and the house-rule-gated `enterprises`/`grudgeBook`/
`psychologyTraits`/`yenlui` cases). The viewer MUST render sections "when present" with **exactly**
the same visibility as print — so the decision is pinned to **reuse, not reimplement** (NFR2):

- **Decision:** extract `shouldRenderSection` and its `SectionKey` union verbatim into a new pure
  module **`src/logic/section-visibility.ts`** (no React, no DOM — it reads only `Character`), export
  it, and have **both** `PrintLayout` and `SharedCharacterViewer` import and call it. `PrintLayout`'s
  change is import-only (delete the local copy, import the identical function); its behavior and
  tests are unchanged (NFR4 / additive). The viewer calls `shouldRenderSection(character, key)` per
  section, so viewer and print visibility can never diverge — including the edge cases the finding
  names (empty-but-present arrays, the `conditions` `level > 0` filter, house-rule-gated sections).
- **Rejected:** reimplementing an equivalent predicate inside the viewer. It duplicates logic and
  invites silent drift for exactly those edge sections, violating NFR2.

The viewer renders the following sections, each gated by `shouldRenderSection(character, <key>)` using
the **identical** `SectionKey` values print uses: `spells` (titled "Spells and Prayers", from
`character.spells` — there is no separate `prayers` field, finding 1), `conditions`, `ammunition`
(name / quantity / qualities, matching PrintLayout's Ammunition table — finding 5), `mutations`,
`criticalWounds`, `companions`, `hirelings`, `estate`, `rituals`, and the house-rule-gated
`enterprises` / `grudgeBook` / `psychologyTraits` / `yenlui`. Identity, characteristics, skills,
talents, weapons, and armour are always rendered (they are core to any sheet and have no
`shouldRenderSection` gate in print either). Psychology (`psych`), corruption/sin, and trappings are
rendered when their underlying field is non-empty, matching print's unconditional-but-empty-safe
rendering of those blocks.

To avoid duplicating stat math the viewer renders an on-screen, themed, **interactive-tooltip**
presentation (PrintLayout is print-targeted and has no tooltips) but calls the **exact same
calculators** the live sheet uses:

| Displayed total | Value shown (via `deriveSheetTotals` unless noted) | Breakdown component reused |
|---|---|---|
| Characteristic total (I+A+B) | inline `i+a+b` as in `CharBreakdownContent` precedent | `CharBreakdownContent` (`pages/CharBreakdownContent.tsx`) |
| Characteristic bonus (CB) | `getCBBreakdown` (`breakdown-helpers.ts`) | `CBBreakdownContent` |
| Skill total | `getSkillBreakdown` | `SkillBreakdownContent` |
| Wounds maximum | `totals.wounds` (`computeWoundMaximum` via §1a: species-corrected SB, Hardy, multiplier) | **new** `WoundsBreakdownContent` (fed `totals.wounds`) |
| Max encumbrance | `totals.maxEncumbrance`; tooltip `getEncumbranceBreakdown(chars, totals.strongBackLevel, totals.sturdyLevel)` | `EncumbranceBreakdownContent` |
| Carried trappings enc | `getTrappingEncBreakdown(trappings, houseRules.ignoreBackpackEnc)` | `TrappingsBreakdownContent` |
| Coin weight | `totals.coinWeight`; tooltip `getCoinWeightBreakdown(wGC, wSS, wD)` | `CoinWeightBreakdownContent` |
| Armour points / location | `totals.armourPoints[loc]` for `loc ∈ {head, lArm, rArm, body, lLeg, rLeg, shield}` (the `ArmourPoints`/sheet vocabulary — §1a, finding 4; worn-only, Core p.293); tooltip `getAPBreakdown(armour, loc, label)` with the **same** `loc` | `APBreakdownContent` |
| Weapon damage | `calcWeaponDamage(w, totals.SB, talents, w.runes ?? [], totals.rangedDamageSBMode)` | **new** `WeaponDamageBreakdownContent` (see below) |
| Movement (Move/Walk/Run) | character fields `move.m/.w/.r` (stored, not derived) | `MoveBreakdownContent` (new, see below) |

> **Worn-filter consistency for the AP tooltip (finding 4).** The displayed AP uses
> `calculateArmourPointsUnified(armour, { filterByWorn: true })`, which treats `worn !== false` as
> worn (so `worn === undefined` counts). `getAPBreakdown` filters `item.worn === true` (verified in
> `breakdown-helpers.ts`), which **excludes** `worn === undefined`. For armour saved through the
> current UI this is a non-issue (the armour migration sets an explicit `worn`), but a hand-crafted
> payload could carry `worn === undefined`. To guarantee the tooltip's listed items and total match
> the displayed per-location number, `validateSharedPayload` (§5) **normalises each armour item's
> `worn` to a boolean** (`worn: item.worn !== false`) as part of its coercion pass, after which the
> two worn-filters agree by construction. A viewer test asserts, for a fixture with an unworn piece
> and a `worn === undefined` piece, that `totals.armourPoints[loc]` equals both the live
> `useCharacter` AP and the `getAPBreakdown(...).total` shown in the tooltip.

Each total is rendered through `TooltipTriggerCell` driving the shared `Tooltip`, using the
single-tooltip-at-a-time state pattern already established (`CharacterBreakdownTooltips.tsx`,
`ArmourMap.tsx`). The viewer owns one `BreakdownTooltipState`-style union and renders exactly one
`Tooltip` at a time. This satisfies calculated-total-tooltips for **every** shown total and NFR5
(hover on desktop, tap/focus on touch/keyboard — both already handled inside `TooltipTriggerCell`).

**Two breakdown gaps exist today** (the live combat/character pages show these totals but through
bespoke inline tooltips, not a reusable `*BreakdownContent`). To keep the viewer's tooltips identical
to the live math *and* reusable, add small presentational components backed by existing calculators —
no new mechanics:

- **`src/components/pages/WoundsBreakdownContent.tsx`** — renders the `WoundMaxResult` it is **given**
  (the viewer passes `totals.wounds` from §1a; it does **not** re-call `computeWoundMaximum` with ad
  hoc inputs, so it can never diverge from the displayed total). Core wound formula is cited in
  `calculators.ts` (`calculateWoundsCore`). Lines: `SB`, `TB×2`, `WPB`, `Hardy`, `Total` — these are
  the `WoundMaxResult` fields (`sb`, `tb`, `wpb`, `hardy`, `total`), so the breakdown is exactly the
  components that produced the shown number.
- **`src/components/pages/WeaponDamageBreakdownContent.tsx`** — renders the `{ num, breakdown }` the
  viewer obtains from `calcWeaponDamage(w, totals.SB, character.talents, w.runes ?? [],
  totals.rangedDamageSBMode)` (the live-caller argument list — §1a). The calculator returns
  `breakdown` as
  `parts.join(' ')` with **no `= total` suffix** (e.g. `SB(4) +4 SM+1`), and returns
  `{ num: null, breakdown: '' }` for an empty/`'—'` damage field (verified in `weapons.ts`).
  Therefore:
  - When `num === null` the viewer renders the weapon's **raw `damage` string** (e.g. `—`) as plain
    text and attaches **no derived tooltip** — there is nothing to break down.
  - When `num !== null`, the component displays the calculator's `breakdown` verbatim and appends
    `= {num}` **composed by the component itself** (the `= total` is not implied to come from the
    calculator). The stat-block generator (§8) follows the same rule: it prints `num` when non-null,
    else the raw `damage` string, and never prints `null`.
- **`src/components/pages/MoveBreakdownContent.tsx`** — Movement values are **stored** fields, not
  derived (verified: `Character.move = { m, w, r }`, all numbers; `PrintLayout` renders
  `ch.move.m/.w/.r`). Per rules-compliance we do **not** invent a formula. The tooltip is
  **source-stating** and evaluates **Walk and Run independently** (see finding 8, §7 test note):
  - Movement line: `Move {m}` labelled "as recorded on the sheet".
  - Walk line: if `w === 2 * m`, show `Walk = 2×M ({w})`; otherwise show `Walk {w}` labelled "as
    recorded on the sheet".
  - Run line: if `r === 4 * m`, show `Run = 4×M ({r})`; otherwise show `Run {r}` labelled "as
    recorded on the sheet".

  Each field is judged on its own, so a sheet where only `w` matches the multiple still shows `2×M`
  for Walk while Run falls back to "as recorded". The component **always** renders the stored value
  and never overrides it, so it can never contradict the sheet (AC2) or invent a mechanic. A code
  comment cites the WFRP4e Core movement rule (**Core p.164, "Movement (M)"**, whose Movement Table
  gives Walk = 2×Movement and Run = 4×Movement — e.g. M3 → Walk 6, Run 12), matching the citation
  style in `calculators.ts`.

These three components are reused by the viewer **and are available to the live pages later**;
they only read calculator output, so they add no math. Writing them as `*BreakdownContent`
satisfies the requirement to reuse the existing breakdown pattern while covering totals the pattern
did not yet have a dedicated component for.

**Read-only guarantee:** `SharedCharacterViewer` renders only `TooltipTriggerCell` (a `role="button"`
div with no form semantics) and static text/tables. It imports **no** editable inputs, no
`update`/`updateCharacter`, no roll dialog, no storage modules, and no `appendEvent`. It receives
the decoded `Character` as a prop and never writes it anywhere. AC1 (no `<input>`, no writes) is
enforced structurally by what the component imports, and asserted by the component test (Section 7).

---

## 2. Snapshot payload shape

### Decision: reuse the existing `exportToJSONWithPortrait` format verbatim; no wrapper

The single-character export (`exportToJSONWithPortrait(character, characterId)` in
`src/storage/export-import.ts`) already produces exactly what a snapshot needs: the full `Character`
plus a `portrait` base64 field and the `_v` version tag (`CURRENT_VERSION = 8`). We reuse it
**as-is** for mechanism (a). This directly satisfies NFR2/FR3 ("MUST NOT fork the stat math or
invent a second character format") and means a snapshot is byte-identical to a normal export — so
the existing `importFromJSON` validation already accepts it (AC5), and a snapshot can even be
imported through the untouched Settings → Import path (AC12).

No read-only wrapper/envelope is added for the **snapshot**. A wrapper would (a) create a second
format, violating NFR2, and (b) add nothing: read-only-ness is a property of the *viewer*, not of
the data. The JSON is the same data the user can already export; "read-only" is enforced by routing
it to the viewer rather than the editor.

> The **share link** (Section 3) *does* wrap the JSON in a thin compression envelope, but that
> envelope carries the identical serialized `Character` JSON as its payload — it is a transport
> encoding, not a second character format.

### Helpers reused (named)

- Serialize (both mechanisms): `exportToJSONWithPortrait(character, characterId)` — this is the
  snapshot payload (it includes the portrait; note `exportToFile` stringifies the **bare** character
  **without** the portrait, so Download snapshot does **not** call `exportToFile`).
- Validate on open (both mechanisms): `importFromJSON(json)` — reused for required-key checks,
  version ceiling, and `BLANK_CHARACTER` merge. The viewer consumes `result.character` **without**
  calling `createCharacter`/`saveCharacter` (those run only on explicit import).
- Portrait decode for display: `isValidPortraitDataUrl` + render the data-URL directly in an
  `<img>` (no IndexedDB write). `base64ToBlob` is **not** needed for viewing.

> **Download snapshot filename (resolves finding 7).** The Download snapshot control writes the
> `exportToJSONWithPortrait` JSON to a Blob and triggers a download using the **same safe-name +
> timestamp construction** as `exportToFile`, but with a distinct infix so a share snapshot is not
> mistaken for a normal export: **`<safeName>_share_<timestamp>.json`** (e.g.
> `Gunther_share_20240115-1430.json`), MIME `application/json`. The `safeName`/`timestamp` logic is
> lifted from the existing `exportToFile` (verified: `name.replace(/[^a-zA-Z0-9_-]/g,'_')` +
> `YYYYMMDD-HHmm`); only the `_share` infix and the portrait-bearing JSON differ.

> **`characterId` is already in scope.** `exportToJSONWithPortrait` and
> the share-link encode flow both need `characterId`. `SettingsPage` already receives `characterId`
> as a prop (verified: used today by `handleExportClipboard`/`handleExportFile`), so the new share
> controls reuse that existing prop — **no new plumbing** is added to thread it through.

### How a snapshot is "opened into" the viewer

Decision: **a "Load snapshot" control on the viewer's empty state**, plus drag-and-drop/paste.
Visiting `#view` with **no payload** (bare `#view` or `#view/`) renders a small "Open a shared
character" panel offering: **Paste snapshot** (textarea) and **Open file**
(`<input type="file" accept=".json,application/json">` read via `FileReader`, exactly as
`handleFileImport` in `SettingsPage` does). The `accept` is the **permissive** `.json,application/json`
form rather than bare `application/json` (resolves finding 7): some OSes report `.json` with a
different MIME, which a MIME-only `accept` would hide in the picker. The opened text is validated by
content via `validateSharedPayload` regardless of the picker filter, so a loose `accept` is safe.
This keeps mechanism (a) fully offline and needs no link.
When a payload *is* present in the hash (mechanism b), the viewer decodes it directly and skips the
open panel. One viewer, two entry points (AC-shared viewer).

> **Both entry points funnel through `validateSharedPayload` (resolves finding 6).** The snapshot
> paste/file text is **not** handed to `importFromJSON` directly. After the pasted/read text is
> obtained, the viewer applies the **same `MAX_JSON_CHARS` pre-check** (§5) and then calls
> `validateSharedPayload(text)` — the identical function the link path uses after decompression.
> `validateSharedPayload` internally calls `importFromJSON` and then runs the §5 normalization pass,
> so the snapshot path gets the **same** wrong-typed-field hardening as the link path and the
> partial-corrupt-render guard (AC11) holds for snapshots too. The link path differs only in the
> preceding transport step (base64url + gunzip → JSON string); from the JSON string onward both
> paths are identical. No rendering path calls `importFromJSON` directly.

---

## 3. Compression method for the URL-hash link

### Decision: native gzip via `CompressionStream` + base64url; async; versioned 1-byte envelope

No compression dependency exists and the requirement is "lightweight, minimal bundle impact".
Options:

- **Native `CompressionStream('gzip')` / `DecompressionStream('gzip')` + base64url (chosen).**
  Zero bundle cost, standard, available in all current evergreen browsers and the PWA's target
  runtime. Gzip on repetitive JSON (the `Character` shape has many repeated keys) compresses very
  well. The only cost is that the API is async (stream-based).
- A bundled library (`lz-string`/`fflate`/`pako`). Rejected: adds bundle weight for no capability we
  lack. `lz-string` produces URL-safe output synchronously but is a dependency we don't need.

**Feature detection:** if `typeof CompressionStream === 'undefined'` (very old browser), the
**share-link** action is disabled with a tooltip pointing the user to the offline snapshot (which
needs no compression). Viewing a link on such a browser shows the graceful "can't open this link
here" error. The snapshot path never depends on `CompressionStream`.

### Envelope format (versioned)

The hash payload is `base64url( [1-byte format version] ++ gzip(utf8(json)) )`.

- **Format version byte** (`SHARE_FORMAT_V = 1`): this versions the *transport envelope*, separate
  from the character's `_v`. If we ever change compression/encoding, the decoder rejects unknown
  envelope versions with a clear message before touching the bytes.
- `json` is exactly the string from `exportToJSONWithPortrait` (Section 2) — same `_v`, same data.
- **base64url**: standard base64 with `+→-`, `/→_`, `=` stripped, so the payload is safe in a URL
  hash without percent-encoding bloat.

### Encode flow (`encodeSharePayload`)

1. `json = await exportToJSONWithPortrait(character, characterId)` (caller passes this in — see
   isolation note in Section 5; the pure core takes the JSON string, not the character).
2. Optionally strip/shrink the portrait per Section 4 (done by the caller before encoding).
3. `bytes = new TextEncoder().encode(json)`.
4. `gz = await gzip(bytes)` via `CompressionStream` (helper `src/logic/gzip.ts`).
5. `framed = concat([SHARE_FORMAT_V], gz)`.
6. `return base64urlEncode(framed)`.

### Decode flow (`decodeSharePayload`)

1. Reject if `encoded.length` exceeds the **hard input ceiling** (Section 5) — before any work.
2. `framed = base64urlDecode(encoded)` → fail → graceful error.
3. Read version byte; if `!== SHARE_FORMAT_V` → "This link was made by a newer/older version" error.
4. `gz = framed.slice(1)`; `bytes = await gunzip(gz)` with a **decompressed-size cap** (Section 5)
   → on overflow, abort and error (decompression-bomb guard).
5. `json = new TextDecoder('utf-8', { fatal: true }).decode(bytes)` → fail → error.
6. Hand `json` to the shared validation (Section 5) → `Character` or error.

---

## 4. Per-mechanism portrait-size policy (concrete thresholds)

Portraits dominate payload size. Policy differs by mechanism:

| Mechanism | Portrait policy | Thresholds |
|---|---|---|
| **(a) File snapshot** | **Keep full portrait.** File size is unconstrained. | none |
| **(a) Clipboard snapshot** | Keep full portrait (same payload as file). | none |
| **(b) Share link** | **Exclude the portrait by default.** The link encodes the character with `portrait: ''`. | always stripped for the link |

**Why exclude rather than downscale for the link:** even a downscaled JPEG (a few KB) base64-encoded
and gzipped still adds thousands of URL characters, and we cannot re-encode arbitrarily without an
image pipeline (none exists, and adding one is out of scope / risks inventing behavior). The portrait
is cosmetic for a GM reference view. So the link **drops** it; the UI states "Portrait is not
included in links — use the snapshot file to share the portrait."

**Link-length thresholds (resolves review finding 5).**

- **Measured quantity (pinned): the full `href`** returned by
  `formatViewHref(location.origin, location.pathname, encoded)` — i.e. the exact string the user
  copies and pastes, including `origin + pathname + "#view/"`. This is the only quantity that matters
  to the user and is what the test measures; it is **not** the bare encoded payload (the two differ
  by the origin/pathname prefix, which under `base: '/PWACharSheet/'` is non-trivial).
- **Comparison operator (pinned): `>=`.** `SHARE_SOFT_LIMIT = 8000`, `SHARE_HARD_LIMIT = 16000`,
  both in one module. The soft warning renders when `href.length >= SHARE_SOFT_LIMIT`; the hard
  warning when `href.length >= SHARE_HARD_LIMIT`.
- **Soft warning** (`>= 8000`) — inline caution: the link is long and some chat apps / browsers may
  truncate it; recommend the offline snapshot. The link stays the primary action and remains copyable.
- **Hard warning** (`>= 16000`) — a stronger, **structurally distinct** element renders with
  `data-testid="share-hard-warning"`, and the **Copy Share Link button is demoted** (visually and in
  DOM order) so that **Download snapshot** becomes the primary action. The link is still copyable (we
  never silently block it). Because this is a real DOM change keyed on a `data-testid`, the Settings
  test (§7) can assert the exact transition by feeding fixtures sized just below and just above each
  constant and checking the presence/absence of `share-hard-warning` and which button is primary.

Rationale for 8k/16k: these sit safely under the ~32–64k practical URL limits of mainstream browsers
while flagging early, before most messaging apps start truncating. They are constants in one module
so they are trivially adjustable and assertable. Even with the portrait stripped, a very large sheet
(many weapons/spells/log entries) can still exceed these; the warning text names "a large sheet (many
items or a long log)" as a cause alongside the portrait note.

> The event log (`character.eventLog`) can be large and is irrelevant to a GM reference view. For
> the **link**, we also strip `eventLog` to `[]` before encoding (it is not shown by the viewer).
> This is a transport trim, not a mechanic change; the snapshot keeps it. The viewer never renders
> the log either way.
>
> **Snapshot `eventLog` on import (resolves review finding 10).** `importFromJSON` does **not**
> normalise `eventLog` on import (verified), so a snapshot that is later taken down the explicit
> "Import into my characters" path (§6) carries its full `eventLog` into the saved character — exactly
> as a normal Settings → Import of a regular export does. This is the **intended parity**, not a bug;
> it is called out here (and will be noted in the tasks) so it is not mistaken for data leakage. The
> viewer itself never reads or renders `eventLog`.

---

## 5. Security / robustness (decoded data is UNTRUSTED)

All decode/validation is isolated in **pure, dependency-light modules** so it is property-testable
and so the viewer component contains no parsing logic.

### New pure modules

- **`src/logic/base64url.ts`** — `base64urlEncode(bytes: Uint8Array): string` /
  `base64urlDecode(s: string): Uint8Array`. Pure, synchronous. A byte↔char codec needs **only**
  `atob`/`btoa` (both present in the Node test runtime and all target browsers); it does **not** use
  `structuredClone` (resolves finding 7 — the prior `structuredClone` dependency claim is removed as
  it was never needed). Rejects non-base64url characters (anything outside `[A-Za-z0-9_-]`) before
  decoding.
- **`src/logic/gzip.ts`** — `gzip(bytes): Promise<Uint8Array>` /
  `gunzip(bytes, maxBytes): Promise<Uint8Array>` over `CompressionStream`/`DecompressionStream`.
  `gunzip` enforces `maxBytes` by summing chunk lengths and aborting the stream once the cap is
  exceeded.

  **Runtime dependency (resolves review finding 4).** `CompressionStream`/`DecompressionStream` are
  **not** implemented by jsdom itself; under `environment: 'jsdom'` (see `vite.config.ts`) they are
  supplied by the **Node runtime globals** passed through to the test environment. They are present
  in **Node ≥ 20** and verified in Node 24 locally. The task MUST document a **minimum Node version
  of 20** for building and testing. Because this dependency is a global passthrough (not something
  jsdom guarantees), an older CI Node or a config that shadows these globals would make every
  share-codec test fail at import with no clear reason. To fail loudly instead, the gzip helper test
  opens with an explicit availability assertion:

  ```ts
  // Fails with a clear reason if the Node global isn't present (see the §5 runtime-dependency note).
  expect(typeof CompressionStream).toBe('function');
  expect(typeof DecompressionStream).toBe('function');
  ```

  The app-side feature detection (`typeof CompressionStream === 'undefined'`) already disables the
  share-link action on browsers that lack the API; the snapshot path never depends on it.
- **`src/logic/share-codec.ts`** — the envelope: `encodeSharePayload(json: string): Promise<string>`
  and `decodeSharePayload(encoded: string): Promise<DecodeResult>` where
  `type DecodeResult = { ok: true; json: string } | { ok: false; error: string; code: ... }`.
  This is the property-test seam (Section 7): `decode(encode(json))` must return the same `json`.
- **`src/logic/share-validate.ts`** — `validateSharedPayload(json: string): { ok: true; character:
  Character } | { ok: false; error: string }`. It **delegates to `importFromJSON`** (reusing
  required-key checks, the `_v` version ceiling, and the `BLANK_CHARACTER` deep-merge) and then
  applies viewer-specific hardening (below). It performs **no** storage writes.

### Size limits (reject before unbounded work)

- **Encoded-input ceiling:** reject any `encoded` string longer than **`MAX_ENCODED_CHARS = 2_000_000`**
  (~2 MB of base64url) before decoding — guards memory from a pathological hash.
- **Decompressed ceiling:** `gunzip(..., MAX_DECOMPRESSED_BYTES = 4_000_000)` (~4 MB) — a
  decompression-bomb guard; aborts mid-stream on overflow. 4 MB comfortably exceeds any legitimate
  single-character JSON (even with a portrait) while bounding worst case.
- **Pre-parse JSON length:** if the decompressed string exceeds **`MAX_JSON_CHARS = 3_000_000`**,
  reject before `JSON.parse`.

For the **snapshot** path (no compression) the pasted/opened text is first checked against the same
`MAX_JSON_CHARS` ceiling and then passed to `validateSharedPayload` — the **same** function the link
path uses (finding 6). Neither path calls `importFromJSON` directly for rendering; both go through
`validateSharedPayload`, which calls `importFromJSON` internally and then normalizes, so an oversized
or malformed snapshot fails exactly the same way a bad link does and receives the same hardening.

### Sanitization / no code execution

- Decoding never uses `eval`, `Function`, `innerHTML`, or `dangerouslySetInnerHTML`. All decoded
  strings render as React text children or table cells — React escapes them, so embedded markup is
  inert (FR7 "embedded content never executed").
- **Portrait hardening:** a decoded `portrait` is rendered in `<img>` **only if**
  `isValidPortraitDataUrl(portrait)` passes (restricts to `data:image/(jpeg|png|webp);base64,...`).
  Any other value (including `javascript:`/`data:text/html` attempts) is dropped and the viewer shows
  no portrait. (Link payloads carry no portrait at all per Section 4.)
- **Type coercion safety (wrong-typed fields).** `importFromJSON` only guarantees the four
  required keys (`_v, name, species, chars`) exist and that `_v <= CURRENT_VERSION`; it then
  deep-merges the untrusted object onto `structuredClone(BLANK_CHARACTER)` via `deepMergeImport`.
  That merge recurses only into *plain objects* and copies arrays and primitives **verbatim**
  (verified in `export-import.ts`). So it fixes **missing** fields but does **not** fix
  **present-but-wrong-typed** fields: a payload where `weapons` is a string, `chars.WS` is a number,
  `move` is a string, or `conditions` is an object survives as the wrong type and will throw when the
  viewer maps/reads it — the partial-corrupt render AC11 forbids. `importFromJSON` reuse alone is
  therefore **not** sufficient; `validateSharedPayload` MUST run an explicit normalization pass after
  it.

  **Policy (chosen): coerce each wrong-typed field to its `BLANK_CHARACTER` default (never reject the
  whole payload for a type mismatch).** This matches "render the rest" and keeps the viewer resilient;
  rejection is reserved for the structural failures already listed (missing required key, bad
  envelope, oversize, non-numeric or newer `_v` — see the step-1 version pre-check below). The
  coercion targets are **exhaustive and single-sourced** — one
  `const NORMALIZE_SPEC` module declares every field the viewer/stat-block/`deriveSheetTotals` read,
  and the §7 hardening test enumerates **that same const** so the spec and the test can never drift.
  `validateSharedPayload(json)` runs, in order:

  1. **Version pre-check (resolves finding 2).** `JSON.parse` the string in a `try/catch` (a parse
     failure returns the "doesn't look like a valid character" error, not a throw), then inspect the
     **raw decoded `_v` before `importFromJSON` runs**. `importFromJSON`'s ceiling is
     `typeof data._v === 'number' && data._v > CURRENT_VERSION` (verified in `export-import.ts`): a
     payload whose `_v` is a **string, `null`, or otherwise non-numeric** satisfies the required-key
     *presence* check, skips the numeric ceiling branch, and is then silently force-relabeled
     `character._v = 8` by the merge. For the **untrusted** shared payload FR7/AC11 govern, that is a
     gap. So `validateSharedPayload` rejects when the raw `_v` is **not a finite number ≤
     `CURRENT_VERSION`** — i.e. reject when `typeof raw._v !== 'number'`, `!Number.isFinite(raw._v)`,
     or `raw._v > CURRENT_VERSION`. A missing `_v` continues to be caught by `importFromJSON`'s
     required-key check. A non-numeric `_v` and a `_v > CURRENT_VERSION` both yield the version
     message. (A `_v < CURRENT_VERSION` is accepted and migrated by the existing merge, exactly as a
     normal older export is.)
  2. `const r = importFromJSON(json)` — reuse required-key, version-ceiling, and merge logic. If
     `!r.success`, return its error unchanged.
  3. Normalise `c = r.character` **in place** (it is already a `structuredClone` off `BLANK_CHARACTER`,
     so mutation is safe and local). The single-sourced spec guards, at minimum:
     - **Arrays that must be shape-safe** — one `const ARRAY_FIELDS = ['weapons','armour','bSkills',
       'aSkills','talents','trappings','conditions','spells','ammo','mutations',
       'diseases'] as const` (resolves findings 1, 5, 6). This is the exhaustive list of array fields
       the viewer / stat-block / breakdown / `deriveSheetTotals` paths actually read, **derived
       directly from the `Character` type** (verified in `src/types/character.ts`):
       - **No `prayers` field exists** (finding 1). Spells **and** prayers are both stored in
         `spells: SpellItem[]`; `PrintLayout` renders a single "Spells and Prayers" section from
         `character.spells`. The viewer renders spells-and-prayers from `spells` only (matching
         `PrintLayout`), so `'prayers'` is removed from the list — guarding a non-existent key would
         be dead code and would make the single-sourced test assert over a field the viewer never
         reads.
       - **`ammo` is kept** (finding 5) because the viewer renders an Ammunition section (§1 /
         below); it is genuinely iterated.
       - **`xpLog` is removed** (finding 6): the viewer renders no XP/advancement history (FR1, §1),
         and §4 already strips the equally-irrelevant `eventLog` from the link. `xpLog` is therefore
         not iterated by any viewer path; leaving it in `ARRAY_FIELDS` would contradict this const's
         doc. (`deepMergeImport` already copies an absent/optional `xpLog` safely; the viewer never
         touches it, so no shape guard is needed.)

       Each listed field is guarded `c[X] = Array.isArray(c[X]) ? c[X] : []`. The §7 hardening test
       iterates `ARRAY_FIELDS` directly, so the spec and the test can never drift.
     - **`chars`** (object; drives every characteristic total, wounds, encumbrance, SB): for each of
       the 10 `CHARACTERISTIC_KEYS`, ensure `chars[k]` is an object whose `i, a, b` are finite numbers,
       coercing each non-finite/absent component to `0`. Runs **before** any calculator / before
       `deriveSheetTotals`, because calculators do `chars.S.i + …` and would otherwise produce `NaN`.
     - **`move`** (object; stored Move/Walk/Run): ensure `move` is a plain object and each of `m,w,r`
       is finite, else `0` (`Number.isFinite(x) ? x : 0`).
     - **`houseRules`** (object; `rangedDamageSBMode` is consumed by `calcWeaponDamage`, finding 5):
       `deepMergeImport` copies a non-object `houseRules` **verbatim** (verified), so a decoded
       `houseRules: "oops"` would throw at `character.houseRules.rangedDamageSBMode` read time. Coerce:
       if `houseRules` is not a plain object, replace with `structuredClone(BLANK_CHARACTER.houseRules)`;
       otherwise ensure `rangedDamageSBMode` is one of `'none'|'halfSB'|'fullSB'` (else `'none'`) and
       `ignoreBackpackEnc` is a boolean (else its `BLANK_CHARACTER` default).
     - **`species`** (string; drives `SPECIES_DATA[species]` for wound multiplier / `woundsUseSB` in
       §1a, finding 5): coerce to `''` when not a string. An unknown/empty species yields
       `woundMultiplier = 1` and falls back to the stored `woundsUseSB`, which §1a already handles.
     - **`armour[].worn`** (finding 4): for each armour item, set `item.worn = item.worn !== false`
       (a boolean), so the displayed-AP worn-filter (`worn !== false`) and the `getAPBreakdown`
       worn-filter (`worn === true`) agree by construction.
     - **Scalar numeric fields the viewer/stat-block read** (`wCur`, `corr`, `sin`, `fate`, `fortune`,
       `wGC`, `wSS`, `wD`): coerce non-finite to `0`.
     - **`portrait`**: see "portrait hardening" above — only a value passing `isValidPortraitDataUrl`
       is kept; anything else becomes `''`.
  4. Return `{ ok: true, character: c }`.

  The normalizer touches only known fields; unexpected extra keys remain in the object but are never
  read, rendered via `innerHTML`, or executed. A dedicated test (see §7) feeds a valid payload with
  **every** field in the single-sourced spec set to a wrong type — each `ARRAY_FIELDS` entry as a
  string/object, `chars.WS` as a number, `move` as a string, `houseRules` as a string, `species` as a
  number, an `armour` item with `worn: undefined`, a scalar as a string — and asserts
  `validateSharedPayload` returns `ok: true`, that `deriveSheetTotals` on the result does **not**
  throw, and that the subsequent viewer render does **not** throw.

### Error behavior (graceful, non-technical)

`decodeSharePayload`/`validateSharedPayload` return discriminated results; the viewer maps each to a
calm message and the **"← Back to my characters"** affordance. No throw reaches the React tree, so
the app never white-screens (AC11). Messages:

| Condition | Message |
|---|---|
| base64url/gzip/UTF-8 decode failure, bad envelope byte | "This shared link couldn't be read. It may be incomplete or corrupted." |
| Oversized (any ceiling) | "This shared character is too large to open safely. Ask for the snapshot file instead." |
| Missing required key / not an object | "This doesn't look like a valid character. (Missing: …)" |
| `_v` newer than `CURRENT_VERSION`, **or `_v` non-numeric** (string/null/etc. — finding 2) | "This character was made with a newer version of the app. Please update to view it." (mirrors `importFromJSON`; the non-numeric case is caught by the §5 version pre-check, which `importFromJSON` alone would miss) |

### Isolation for property testing

The pure core (`base64url`, `gzip`, `share-codec`, `share-validate`) takes/returns strings and bytes
only — **no React, no DOM layout, no storage.** `encodeSharePayload` takes the already-serialized
JSON string (the caller in Settings produces it via `exportToJSONWithPortrait`), so the round-trip
`decodeSharePayload(await encodeSharePayload(json)).json === json` is a pure property over strings.
This is the testability seam the requirements demand.

---

## 6. Explicit, separate "Import into my characters"

### Decision: expose an explicit "Import this character" button on the viewer, routed through the existing import flow, with confirmation; viewing never imports

Viewing never adds to or overwrites the saved list (AC12). Because a GM who is *also* a player may
legitimately want the shared character, the viewer shows a single, clearly separate **"Import into my
characters"** button (visually distinct from the read-only sheet, in a footer bar). Flow:

1. Button opens the viewer's **own** `ConfirmDialog` instance. The viewer reuses the `ConfirmDialog`
   **component** and the confirm-before-import **UX pattern** — it does **not** reuse the SettingsPage
   `handleImportConfirm` **handler**. That is deliberate: `handleImportConfirm` **overwrites the
   active character** via `updateCharacter(() => pendingImport)` (verified in `SettingsPage.tsx`),
   which is the wrong semantics for a GM adding someone else's shared character — it would destroy
   whatever character is active. The viewer needs **create-new** semantics instead.
2. On confirm, the viewer calls the canonical storage helper **`importFromJSONWithPortrait(json)`**
   (verified: it runs `createCharacter` + `saveCharacter` and routes the portrait), passing the
   decoded JSON string the viewer already holds. This **adds** a new saved character, never
   overwrites. For a **link** payload (portrait stripped) it imports without a portrait; for a
   **snapshot** payload the portrait is routed to IndexedDB exactly as a normal import. The
   `pendingImport → handleImportConfirm` SettingsPage flow is **not** referenced or reused here.
3. On success, show a success toast with two choices: **"Stay in view"** (default — remains on the
   read-only route, nothing else changes) or **"Open my characters"** (leaves the viewer via the
   Section 1 back path, landing on the freshly imported character).

This keeps import strictly opt-in and strictly separate from rendering, reuses the existing import
path (NFR2), and never mutates on mere viewing.

---

## 7. Testing approach

All new logic lives in pure modules or a presentational component, so it is directly testable.
Existing tests remain unchanged (NFR4 / additive).

### Property tests (fast-check) — `src/logic/__tests__/share-codec.property.test.ts`

- **Round-trip:** for arbitrary JSON strings (and, more meaningfully, for arbitrary `Character`
  objects generated by a fast-check arbitrary serialized via `JSON.stringify`),
  `decodeSharePayload(await encodeSharePayload(json))` is `{ ok: true, json }` with `json` byte-equal.
- **base64url round-trip:** `base64urlDecode(base64urlEncode(bytes))` deep-equals `bytes` for
  arbitrary `Uint8Array`.
- **Malformed rejection:** arbitrary strings with non-base64url characters, truncated payloads, and
  payloads with a wrong first byte all yield `{ ok: false }` and **never throw**.
- **Oversized rejection:** an `encoded` string longer than `MAX_ENCODED_CHARS`, and a crafted
  gzip stream that inflates past `MAX_DECOMPRESSED_BYTES`, both reject safely.
- **Validation:** `validateSharedPayload` rejects objects missing required keys, non-objects, and
  `_v > CURRENT_VERSION`; accepts a real exported character. **Version pre-check (finding 2):** add
  cases asserting `_v: 9999` (numeric-but-newer) and `_v: 'abc'` / `_v: null` (non-numeric) both
  reject with the version message — the non-numeric cases are the ones `importFromJSON` alone would
  force-relabel `_v = 8`, so they specifically exercise the §5 pre-check.
- **Wrong-typed field hardening (findings 5/6):** a dedicated test enumerates the **single-sourced**
  normalization spec (`ARRAY_FIELDS` + the scalar/object target list from §5) and feeds a valid
  payload with each guarded field set to a wrong type — every `ARRAY_FIELDS` entry as a string/object,
  `chars.WS` as a number, `move` as a string, **`houseRules` as a string**, **`species` as a number**,
  an **`armour` item with `worn: undefined`**, a scalar numeric field as a string — and asserts
  `validateSharedPayload` returns `{ ok: true }` with every array coerced to `[]`, `move`/`chars.*`
  coerced to finite-number defaults, `houseRules` coerced to a valid object, `species` to `''`, and
  each armour `worn` to a boolean; that **`deriveSheetTotals`** on the result does not throw; and that
  feeding the result into `SharedCharacterViewer` renders **without throwing**. Because the test reads
  the same const the normalizer uses, a newly-read field added to the spec is automatically covered.

### Unit tests

- `src/logic/__tests__/view-route.test.ts` — `parseViewRoute` recognises `#view/...`, returns null
  for normal pages, and `formatViewHref` builds the expected URL; no collision with `parseHash`.
- `src/logic/__tests__/gzip.test.ts` — **opens with `expect(typeof CompressionStream).toBe('function')`
  and `expect(typeof DecompressionStream).toBe('function')`** (the Node-global availability guard —
  see §5) so a missing Node global fails loudly; then round-trips `gunzip(gzip(bytes)) === bytes` and
  asserts `gunzip` aborts when the inflated size exceeds `maxBytes`.
- `src/logic/__tests__/sheet-totals.test.ts` — **the AC2 reuse contract (findings 1-4).** Asserts
  `deriveSheetTotals(fixture)` yields `wounds.total`, `armourPoints` (**`expect(totals.armourPoints)
  .toEqual(hook.armourPoints)`** — a deep-equal in the shared `ArmourPoints` key vocabulary
  `head/lArm/rArm/body/lLeg/rLeg/shield`, now that `deriveSheetTotals` re-keys `APResult` the same way
  `useCharacter` does — §1a / finding 4), `maxEncumbrance`, and `coinWeight` **equal to what
  `useCharacter` produces** (`totalWounds`, `armourPoints`, `maxEncumbrance`, `coinWeight`) for the
  same fixtures — rendering `useCharacter` via a tiny harness and reading its returned values.
  Fixtures explicitly include: an **Ogre**
  (`woundMultiplier = 2`), a character with **Hardy + Strong Back + Sturdy** levels, a character
  carrying an **unworn** armour piece **and** a `worn === undefined` piece (asserting worn-only AP),
  and a character with **`houseRules.rangedDamageSBMode !== 'none'`** feeding a ranged weapon
  (asserting `deriveSheetTotals`' `SB`/`rangedDamageSBMode` drive `calcWeaponDamage` to the live
  number). This is the test that makes AC2 mechanical.
- `src/logic/__tests__/combat-stat-block.test.ts` — the plain-text generator (Section 8) for a
  fixture character emits name, combat characteristics, wounds (`t.wounds.total`), movement, armour by
  location (`t.armourPoints`, **worn-only** — §1a), each weapon with damage
  (`calcWeaponDamage(w, t.SB, talents, runes, t.rangedDamageSBMode)` — §1a), and active
  conditions; numbers equal `deriveSheetTotals`' (and therefore the sheet's). The block does **not**
  list ammunition (finding 5 / §8). Includes a fixture with an **unworn** armour piece (asserting the
  block's AP matches worn-only, not the legacy wrapper) and a **non-default `rangedDamageSBMode`**
  ranged weapon (asserting the block's damage matches the house-rule-adjusted number). Also asserts a
  weapon with `calcWeaponDamage` returning `num === null` prints the raw `damage` string and never
  `null`. Snapshot + explicit-assertion mix.
- `src/logic/__tests__/share-portrait.test.ts` — the link encoder strips `portrait` and `eventLog`;
  the snapshot encoder keeps them. Threshold assertions (§4) use the **full `href`** from
  `formatViewHref` and the `>=` operator: a fixture producing an `href` just below `SHARE_SOFT_LIMIT`
  trips neither warning, one at/above `SHARE_SOFT_LIMIT` trips the soft warning, and one at/above
  `SHARE_HARD_LIMIT` trips the hard warning.
- `src/__tests__/App.view-mode.test.tsx` — two cases. (1) Mounts `App` on a `#view/...` hash in a
  clean environment (no saved data) and asserts the startup path performs **no** `localStorage.setItem`
  and **no** IndexedDB `open`/`init`, i.e. `runMigration`/portrait init are skipped in view mode,
  satisfying AC1/AC4 for the fresh-browser link. (2) **Fresh-context Back (§1):** from that
  same clean `#view/...` mount, activates "Back to my characters", then creates a character, and
  asserts the shell initialises correctly — `runMigration()`/portrait init run on the transition
  (idempotently), the welcome screen renders without assuming a pre-created index, and the created
  character persists.

### Component tests (Vitest + Testing Library) — `src/components/shared/__tests__/SharedCharacterViewer.test.tsx`

- Given a valid decoded character, the viewer renders characteristic totals, skill totals, wounds,
  encumbrance, AP per location, and weapon damage, and each equals **`deriveSheetTotals(fixture)`**
  (and therefore the live sheet — see the `sheet-totals.test.ts` equivalence above) for that fixture
  (AC2). Includes the unworn-armour and non-default-house-rule fixtures so the viewer's AP and ranged
  damage are asserted against the worn-only / house-rule-adjusted numbers.
- Each total is wrapped in a `TooltipTriggerCell`; activating one opens a `Tooltip` whose body is the
  corresponding `*BreakdownContent` (assert on breakdown text) (AC3). Verify single-open-at-a-time.
  **Movement is a stored field, not a derived total** (resolves finding 8): its tooltip is
  **source-stating** by design, so the AC2/AC3 assertion for movement checks that a breakdown tooltip
  **exists** and shows the **stored value** in the general case — it does **not** assert a derivation
  formula, which rules-compliance forbids for a stored value. The `2×M`/`4×M` multiple label is
  asserted **conditionally**: the test asserts the `Walk = 2×M` label **only** on a fixture where
  `w === 2 * m`, and the `Run = 4×M` label **only** where `r === 4 * m`; a fixture whose stored
  `w`/`r` do **not** equal the multiples asserts only the stored value and the "as recorded on the
  sheet" fallback, never the multiple label (finding 8).
- **No editable controls:** `container.querySelectorAll('input, textarea, select')` is empty; no
  `role="spinbutton"`/`contenteditable`. Spy on `localStorage.setItem`,
  `getPortraitStore().savePortrait`, and `appendEvent` import — assert none are called during render
  or tooltip interaction (AC1).
- **Graceful errors:** feeding a malformed/oversized/newer-version payload renders the mapped
  message and the back affordance, with no thrown error (AC11).
- **Import separation:** the "Import into my characters" button does nothing to storage until
  confirmed; confirming calls `importFromJSONWithPortrait` once (mock it) (AC12).

### Settings tests — extend-by-adding `src/components/pages/__tests__/SettingsShare.test.tsx`

New test file (does not modify existing Settings tests): the three controls appear; "Copy Combat Stat
Block" writes plain text to a mocked clipboard; "Copy Share Link" writes a `#view/...` URL and shows
the privacy note contrasted with the local-only snapshot. The length-warning transition (§4)
is asserted on the **full `href`** with `>=`: a just-below-`SHARE_SOFT_LIMIT` fixture shows neither
warning; a fixture at/above `SHARE_SOFT_LIMIT` shows the soft caution with the link still primary; a
fixture at/above `SHARE_HARD_LIMIT` renders `data-testid="share-hard-warning"` and demotes the Copy
Share Link button so Download snapshot is primary.

### Gate

`npm run typecheck`, `npm run build`, `npm test` all green; no `@ts-ignore`/`eslint-disable` added
(AC13, NFR4).

---

## 8. Combat Stat Block generator (FR4)

**New pure file `src/logic/combat-stat-block.ts`** — `buildCombatStatBlock(character): string`.
Plain text only (no JSON, no markup). It calls the **same `deriveSheetTotals(character)`** the viewer
uses, so every number in the block equals the sheet's (FR4 "numbers match the sheet"):

```ts
const t = deriveSheetTotals(character);   // one source of truth with the viewer / live sheet
```

- Name, species, careerLevel.
- Combat characteristics line: `WS BS S T I Ag Dex` totals (`i+a+b`).
- `Wounds: <t.wounds.total>` (from `computeWoundMaximum` via §1a — species-corrected SB, Hardy,
  multiplier; **not** a bare `computeWoundMaximum` with default args). Core wound-formula cite lives
  in `calculators.ts`.
- `Move <m> / Walk <w> / Run <r>` (stored fields; Core p.164 movement noted in comment, matching
  `MoveBreakdownContent`). Prints stored values verbatim; no derivation.
- `Armour: Head N, Body N, …` from **`t.armourPoints`** (the sheet `ArmourPoints` vocabulary,
  worn-only, `calculateArmourPointsUnified(armour, { filterByWorn: true })`, Core p.293; §1a /
  finding 4). The legacy `calculateArmourPoints` wrapper is **not** used (it counts unworn armour and
  would disagree with the sheet).
- One line per weapon: name, group, reach/range (`rangeReach`/`maxR`), damage from
  `calcWeaponDamage(w, t.SB, character.talents, w.runes ?? [], t.rangedDamageSBMode)` — the exact
  live-caller arguments (§1a). When `calcWeaponDamage` returns `num === null` (empty/`'—'`
  damage), the block prints the weapon's **raw `damage` string** and never prints `null`. Qualities
  included.
- Active conditions (`conditions.filter(c => c.level > 0)`).
- **Ammunition is not listed (finding 5).** The combat stat block is a concise combat summary (FR4
  enumerates name, combat characteristics, wounds, movement, armour, weapons, conditions — not
  ammunition); ammo appears only in the full viewer's Ammunition section (§1). This keeps the pasted
  block short for chat/VTT.

Settings' "Copy Combat Stat Block" button writes the return value via `navigator.clipboard.writeText`
(same mechanism as `handleExportClipboard`). Offline-safe; no network.

---

## 9. Files to add / change

### Add

| File | Responsibility |
|---|---|
| `src/logic/sheet-totals.ts` | **`deriveSheetTotals(character)`** — the single pure source of truth for wounds (species-corrected), worn-only AP, max encumbrance, coin weight, and the `SB`/`rangedDamageSBMode`/talent-level inputs for weapon damage. Consumed by `useCharacter`, the viewer, and the stat block (§1a). |
| `src/logic/view-route.ts` | Pure parse/format of the `#view/<payload>` route. |
| `src/logic/section-visibility.ts` | Pure `shouldRenderSection(character, key)` + the `SectionKey` union, extracted verbatim from `PrintLayout` so the viewer and print share one predicate (§1 / finding 3). |
| `src/logic/base64url.ts` | Pure base64url encode/decode. |
| `src/logic/gzip.ts` | `CompressionStream` gzip/gunzip with decompressed-size cap. |
| `src/logic/share-codec.ts` | Versioned envelope encode/decode (the property-test seam). |
| `src/logic/share-validate.ts` | Untrusted-payload validation (delegates to `importFromJSON`) + the single-sourced `NORMALIZE_SPEC`/`ARRAY_FIELDS` hardening (arrays, `chars`, `move`, `houseRules`, `species`, `armour[].worn`, scalars, portrait). The **one** entry point both the link and snapshot paths call. |
| `src/logic/share-portrait.ts` | Link-vs-snapshot portrait/log trimming + length-threshold constants/checks. |
| `src/logic/combat-stat-block.ts` | Plain-text combat block generator. |
| `src/hooks/useViewRoute.ts` | Subscribes to `hashchange`, returns the decoded view-route payload or null. |
| `src/components/shared/SharedCharacterViewer.tsx` (+ `.module.css`) | The read-only viewer: decode → loading/error/sheet; reuses calculators + breakdown tooltips; open-panel for snapshots; import button. |
| `src/components/pages/WoundsBreakdownContent.tsx` (+css) | Breakdown component for wounds max (reads `computeWoundMaximum`). |
| `src/components/pages/WeaponDamageBreakdownContent.tsx` (+css) | Breakdown component for weapon damage (reads `calcWeaponDamage`). |
| `src/components/pages/MoveBreakdownContent.tsx` (+css) | Breakdown component for movement (stored values; Core movement note). |
| Test files per Section 7. | Property/unit/component/settings coverage. |

### Change

| File | Change |
|---|---|
| `src/App.tsx` | Two changes: (1) in `App()`, compute `isViewMode = parseViewRoute(window.location.hash) !== null` and **skip** `runMigration()` + portrait-store init/migration in view mode (setting `migrated` directly), so a fresh-browser share link performs no localStorage/IndexedDB writes (§1 / AC1 / AC4); (2) in `AppContent`, before the welcome/shell branch, check `useViewRoute()` and if a view payload is present render only `SharedCharacterViewer`. No other behavior altered. |
| `src/components/pages/SettingsPage.tsx` | Add a "Share with GM" card: **Download snapshot** (reuses `exportToJSONWithPortrait` for the payload + the `exportToFile` safe-name/timestamp download pattern, with the distinct `<safeName>_share_<timestamp>.json` filename — §2 / finding 7), **Copy snapshot** (clipboard), **Copy Combat Stat Block** (`buildCombatStatBlock`), **Copy Share Link** (`share-portrait` trim → `encodeSharePayload` → `formatViewHref`) with the privacy note, local-only contrast, and soft/hard length warnings. Reuses existing clipboard/download patterns; no existing control changed. |
| `src/hooks/useCharacter.ts` | **Pure extraction only:** replace the inline derivations feeding the `totalWounds`/`armourPoints`/`maxEncumbrance`/`coinWeight` memos with a call to `deriveSheetTotals` (§1a). No change to observable behavior or the side-effecting sync effects; existing `useCharacter` tests stay green unchanged (NFR4). This is what makes the viewer provably match the live sheet (AC2). |
| `src/components/layout/PrintLayout.tsx` | **Import-only extraction (finding 3):** delete the module-private `shouldRenderSection`/`SectionKey` and import the **identical** function from the new `src/logic/section-visibility.ts`. No behavior change — the predicate is moved verbatim — so PrintLayout's rendering and its existing tests are unchanged (NFR4 / additive). This gives the viewer and print one shared visibility predicate. |

### Explicitly NOT changed

`export-import.ts`, all `src/logic/*` **calculators** (`calculators.ts`, `weapons.ts`,
`encumbrance.ts`, `armour*.ts`, `breakdown-helpers.ts` — `sheet-totals.ts` only *orchestrates* them,
it adds no math), `hash-route.ts`/`useHashRoute.ts` (the normal tab router is
untouched — the view route is handled by the new `useViewRoute`), backup/restore, and all existing
tests. (`PrintLayout.tsx` has one **import-only** change — see the Change table — that moves its
section predicate into a shared module without altering behavior.)

---

## 10. Edge cases

- **Bare `#view` with no payload** → render the "Open a shared character" panel (paste / open file),
  not an error.
- **`#view/` on a browser without `CompressionStream`** → graceful "can't open links here; use the
  snapshot file" error; snapshot open-panel still works (it needs no compression).
- **Decoded portrait invalid or `data:text/html`** → dropped; viewer shows no portrait, renders rest.
- **Malformed array field** (e.g. `weapons` is a string) → `share-validate.ts` coerces it to `[]`
  via the explicit `ARRAY_FIELDS` `Array.isArray` guard (§5), so render never throws. Likewise a
  wrong-typed `move`/`chars.*`/scalar is coerced to its `BLANK_CHARACTER` default before any
  calculator runs — the whole payload is **not** rejected for a type mismatch.
- **Very large sheet, portrait already stripped, still over hard limit** → hard warning names "a
  large sheet (many items or a long log)"; the snapshot is recommended and still available.
- **User imports, then navigates back** → lands on the imported character; the view fragment is gone;
  no duplicate work because import ran exactly once behind the confirm.
- **Leaving the viewer** → `history.replaceState` to `location.pathname` + synthetic `hashchange`;
  no storage touched.

---

## 11. Rulebook compliance (rules-compliance)

Every displayed mechanic/derived number comes from an existing calculator that already cites its
Core page: wound formula (`calculators.ts` `calculateWoundsCore`), max encumbrance (`calculators.ts`
`calculateMaxEncumbrance` — Core p.293, p.146), coin weight, armour combining (Archives of the Empire
III, `armourLayering.ts`), weapon damage (`weapons.ts`). The three new `*BreakdownContent` components
and `combat-stat-block.ts` **only present** calculator output — they introduce **no** formulas. The
`MoveBreakdownContent` adds a Core-movement comment (Core p.164: Walk = 2×M, Run = 4×M, per the
Movement Table) but renders the stored `move.{m,w,r}` values and never overrides them, evaluating
Walk and Run independently (§1, finding 8), so it cannot contradict the sheet or invent a mechanic.
No new mechanic is introduced anywhere in this feature.

---

## 12. Responses to design review

### Third-pass review (verdict: CHANGES_REQUESTED — 5 MEDIUM, 3 NIT)

All eight findings are **addressed**; each was verified against source first (`character.ts`,
`PrintLayout.tsx`, `calculators.ts`, `breakdown-helpers.ts`, `useCharacter.ts`, `armourLayering.ts`).

1. **[MEDIUM] `ARRAY_FIELDS` listed a non-existent `prayers` field.** Fixed in §5. Verified
   `src/types/character.ts` has **no `prayers`**; spells and prayers both live in `spells: SpellItem[]`
   and `PrintLayout` renders a single "Spells and Prayers" section from `character.spells`. `'prayers'`
   is removed from `ARRAY_FIELDS`; the viewer renders spells-and-prayers from `spells` only (§1
   section list). `ARRAY_FIELDS` is now `['weapons','armour','bSkills','aSkills','talents','trappings',
   'conditions','spells','ammo','mutations','diseases']`, re-derived from actual `Character` array
   fields, and the §7 hardening test iterates that same const.

2. **[MEDIUM] Version ceiling didn't cover a non-numeric `_v`.** Fixed in §5 (new validation step 1)
   and the §5 error table. Verified `importFromJSON`'s ceiling is `typeof data._v === 'number' &&
   data._v > CURRENT_VERSION`, so a string/null `_v` passes the required-key check and is
   force-relabeled `_v = 8`. `validateSharedPayload` now runs a **version pre-check** before
   `importFromJSON`: reject unless the raw `_v` is a finite number ≤ `CURRENT_VERSION`. §7 adds
   `_v: 'abc'`, `_v: null`, and `_v: 9999` cases, all asserting rejection with the version message.

3. **[MEDIUM] Section-visibility predicate not pinned.** Fixed in §1 ("Section visibility") and §9.
   Verified `shouldRenderSection` is **module-private** in `PrintLayout.tsx`. Decision: extract it
   (and `SectionKey`) **verbatim** into a new pure `src/logic/section-visibility.ts`, export it, and
   have **both** `PrintLayout` and `SharedCharacterViewer` import and call it (NFR2 reuse). PrintLayout's
   change is import-only; behavior and tests unchanged. §1 lists each viewer section and the exact
   `SectionKey` gate it uses.

4. **[MEDIUM] `armourPoints` shape mismatch (`APResult` vs `ArmourPoints`) in the AC2 equality.**
   Fixed in §1a, the §1 table, §8, and §7. Verified `calculateArmourPointsUnified` returns `APResult`
   (`leftArm/…`) while `useCharacter`'s memo re-keys to `ArmourPoints` (`lArm/…`). Decision:
   `deriveSheetTotals` now performs the **identical** re-key via `apResultToArmourPoints`, so
   `totals.armourPoints` is the `ArmourPoints` shape everywhere; the §1 table/`loc` vocabulary and the
   `getAPBreakdown` `LocationKey` (verified `head/lArm/rArm/body/lLeg/rLeg`) all agree. The AC2 test
   asserts `expect(totals.armourPoints).toEqual(hook.armourPoints)` (same keys).

5. **[MEDIUM] `ammo` render treatment unspecified.** Fixed in §1, §5, and §8. Decision: keep ammo
   **in** the viewer — it renders an Ammunition section gated by `shouldRenderSection(ch,'ammunition')`
   with rows of **name / quantity / qualities**, matching `PrintLayout`'s Ammunition table (verified).
   `ammo` stays in `ARRAY_FIELDS` (genuinely iterated). The **combat stat block does not list ammo**
   (§8), now stated explicitly; the stat-block test asserts its absence.

6. **[NIT] `xpLog` guarded though never rendered.** Fixed in §5 — `xpLog` is removed from
   `ARRAY_FIELDS` (the viewer renders no XP history per FR1/§1, and §4 already strips the analogous
   `eventLog` from the link). An absent/optional `xpLog` is copied safely by `deepMergeImport` and the
   viewer never touches it, so no guard is needed; the const's doc now reads "arrays that must be
   shape-safe".

7. **[NIT] Snapshot filename/accept not pinned.** Fixed in §2 and §9. Download snapshot writes the
   `exportToJSONWithPortrait` JSON with a **distinct** filename `<safeName>_share_<timestamp>.json`
   (reusing `exportToFile`'s safe-name/timestamp logic, not calling `exportToFile` itself — it omits
   the portrait), and the file-open `accept` is the permissive `.json,application/json`; content is
   validated by `validateSharedPayload` regardless of picker MIME.

8. **[NIT] Movement multiple-label test must be conditional.** Fixed in §7 — the component test
   asserts the `Walk = 2×M` label **only** when `w === 2*m` and `Run = 4×M` **only** when `r === 4*m`;
   otherwise it asserts only the stored value and the "as recorded on the sheet" fallback. No design
   change to `MoveBreakdownContent` beyond this test note.

### Second-pass review (verdict: CHANGES_REQUESTED — 2 HIGH, 4 MEDIUM, 3 NIT)

All nine findings are **addressed**. The blocking theme — "the viewer bypasses `useCharacter`, so the
design must specify how it reproduces the live derived totals" — is resolved by one structural change:
the new pure **`deriveSheetTotals(character)`** helper (§1a), a byte-for-byte extraction of the
derivations currently inline in `useCharacter`, consumed by `useCharacter`, the viewer, **and** the
stat block. Each fix was verified against source first.

1. **[HIGH] Viewer had no specified path to reproduce the live wounds total (AC2).** Addressed in §1a.
   Verified in `useCharacter`/`backfillCharacter` that the live total needs `hardyLevel` (Hardy
   talent), `woundMultiplier` (`SPECIES_DATA[species]`), and the species-corrected `woundsUseSB`, and
   that `computeWoundMaximum`/`calculateTotalWounds` both delegate to `calculateWoundsCore`.
   `deriveSheetTotals` reproduces all three (`effectiveWoundsUseSB` applies the species correction) and
   returns `computeWoundMaximum(...)`; `WoundsBreakdownContent` is fed that same `WoundMaxResult`. New
   `sheet-totals.test.ts` asserts viewer wounds === `useCharacter.totalWounds` for an Ogre, a Hardy
   character, and a stale-flag character.

2. **[HIGH] Armour-points source inconsistent (AC2).** Addressed in §1a, the §1 table, and §8.
   Everything (viewer per-location display, the AP tooltip total, and the stat block) is pinned to
   `calculateArmourPointsUnified(armour, { filterByWorn: true })` — the live-sheet behavior
   (worn-only, Core p.293). The legacy `calculateArmourPoints` wrapper (`filterByWorn: false`) is used
   **nowhere**. Because `getAPBreakdown` filters `worn === true` while the unified calc filters
   `worn !== false`, §5 now **normalises each armour item's `worn` to a boolean** so the two agree by
   construction. Tests cover an unworn piece and a `worn === undefined` piece, asserting viewer AP ===
   `useCharacter` AP === `getAPBreakdown().total` per location.

3. **[MEDIUM] Encumbrance/coin-weight depend on derived talent levels the viewer wasn't given.**
   Addressed in §1a — `strongBackLevel`/`sturdyLevel` are re-derived exactly as `useCharacter` does and
   fed into `calculateMaxEncumbrance`; `getEncumbranceBreakdown` is passed the same levels for the
   tooltip. `sheet-totals.test.ts` asserts viewer `maxEncumbrance`/`coinWeight` === `useCharacter`'s
   for a Strong Back + Sturdy fixture.

4. **[MEDIUM] `calcWeaponDamage`'s four runtime inputs never threaded.** Addressed in §1a, §1 table,
   and §8. The viewer/stat block call
   `calcWeaponDamage(w, totals.SB, character.talents, w.runes ?? [], totals.rangedDamageSBMode)` — the
   verified live-caller argument list (`WeaponCards.tsx`/`AttackFlow.tsx`). `totals.SB = getBonus(S
   total)`. `houseRules` survives decode via `BLANK_CHARACTER` fill; verified
   `BLANK_CHARACTER.houseRules.rangedDamageSBMode` defaults to `'none'` (RAW/sheet default), and §5 now
   coerces a wrong-typed `houseRules`. The combat-stat-block test uses a non-default-house-rule ranged
   weapon.

5. **[MEDIUM] `houseRules`/`species` omitted from the coercion spec.** Addressed in §5 — the
   normalization is now **exhaustive and single-sourced** (one `NORMALIZE_SPEC`/`ARRAY_FIELDS` const the
   test enumerates). Added `houseRules` (coerce to `BLANK_CHARACTER.houseRules` when not a plain object;
   validate `rangedDamageSBMode`), `species` (coerce to `''` when not a string), and `armour[].worn`
   (coerce to boolean). The hardening test feeds wrong-typed `houseRules` and `species`.

6. **[MEDIUM] Snapshot open path might skip `validateSharedPayload` normalization (AC11).** Addressed
   in §2 and §5 — both entry points (link decode **and** snapshot paste/file) funnel through
   `validateSharedPayload(json)`, which calls `importFromJSON` then normalizes. Neither path calls
   `importFromJSON` directly for rendering. The `MAX_JSON_CHARS` pre-check is applied to the snapshot
   text before `validateSharedPayload`.

7. **[NIT] `structuredClone` asserted but unneeded for `base64url`.** Addressed in §5 — the
   `structuredClone` dependency is **removed** from `base64url` (a byte↔char codec needs only
   `atob`/`btoa`). The loud Node-global availability assertion remains for `CompressionStream`/
   `DecompressionStream` in the gzip test.

8. **[NIT] Loading state over-stated for the synchronous snapshot path.** Addressed in §1 — the
   loading state applies to the **link** (async gzip) path only; the snapshot paste/file path validates
   synchronously and transitions straight to sheet/error.

9. **[NIT] Leaving view mode in a fresh context skipped startup migration for the session.** Addressed
   in §1 ("Transitioning out of view mode in a fresh context"). Confirmed the welcome-screen path is
   migration-independent (renders on empty `characters`, writes the index lazily on create), **and**
   chose the belt-and-braces fix: the Back handler re-runs `App()`'s normal init branch
   (`runMigration` → portrait init → portrait migration, all idempotent) before the shell renders.
   `App.view-mode.test.tsx` adds the "open `#view` fresh → Back → create a character" case.

### First-pass review (prior revision — all 10 findings previously resolved, unchanged here)

The earlier review's ten findings (view-mode migration skip, wrong-typed-field hardening, import-path
semantics, `CompressionStream` Node-global note, link-length `href`/`>=` pinning, `calcWeaponDamage`
null/`= total`, `MoveBreakdownContent` per-field fallback + Core p.164 cite, movement-is-stored test
note, `characterId` already in scope, snapshot `eventLog` import parity) remain addressed in §§1, 4,
5, 6, 8, 11 and are not re-litigated. Note the second-pass §5 rewrite (single-sourced `NORMALIZE_SPEC`)
**supersedes and subsumes** the first-pass hardening note, and §1a now carries the first-pass
`calcWeaponDamage` argument detail into the shared helper.
