# Design Review — Guided Spellcasting / Miscast Flow

Reviewer: design-review subagent (fresh context)
Scope: `design.md` vs `requirements.md`, verified against source and `docs/` rulebooks.
Build/test suites were **not** run (per instructions); all verification is by reading source.

This design has already been through three internal review passes (documented in the
design under "Responses to design review — pass 1/2/3"). I re-verified the load-bearing
claims independently against source and the rulebooks rather than trusting those
responses. The design is unusually complete and its source/rulebook claims are
overwhelmingly accurate. The findings below are the residual issues I could still
substantiate.

---

## Findings

### 1. MEDIUM — "same existing child components" claim is inaccurate for the re-hosted controls

**Where:** §"Overlay layering" (option B), §"New & changed files" (`CastResultDisplay.tsx`
row and the `guidedCastSteps/*` rows), §Step-by-step hand-off Steps 3 and 5.

**Problem:** The design repeatedly frames the guide-path re-hosting as rendering "the
**same existing child components** `CastResultDisplay` uses — `OvercastAllocator` (for
Step 4) and the existing miscast/escalation buttons (for Step 5)". Verified against
`src/components/shared/CastResultDisplay.tsx`: only `OvercastAllocator` is an actual
extracted, reusable component. The three **Critical-Cast choice buttons** (Step 3), the
**fumble / minor-miscast "Roll" buttons**, the **`cascading_chaos` / `multiplying_misfortune`
/ `marked_by_magic` escalation buttons**, and the **arcane-mark roll + "Store Mark"
buttons** are all **inline JSX literals inside `CastResultDisplay`**, not separate
components. On the guide path `CastResultDisplay` is deliberately not mounted
(§"Overlay layering" option B), so `ResolveStep`/`MiscastStep`/`OutcomeStep` must
**re-create that button markup**. That is duplication of UI markup (not just new
wiring), which the design's own "duplicates no logic / reuses the same components"
framing papers over. It is not a math/logic duplication (the handlers are still
delegated to the panel), so it does not breach NFR-2, but the design misdescribes what
an implementer must build and risks the markup drifting out of sync with
`CastResultDisplay` (e.g. the `marked_by_magic` arcane-mark sub-flow with its local
`arcaneMarkResult` state, the `cascading_chaos → Roll Major Miscast` branch).

**Fix (choose one, state it in the design):**
- (a) **Extract** the shared button clusters out of `CastResultDisplay` into small
  presentational components (e.g. `CriticalChoiceButtons`, `MiscastRollButtons`,
  `MiscastEscalation`, `ArcaneMarkControl`) that **both** `CastResultDisplay` and the
  guide step bodies render, so the "same components" claim becomes true and the markup
  has a single source. Note that the `marked_by_magic` branch carries **local state**
  (`arcaneMarkResult`), so the extracted `ArcaneMarkControl` must own that state. This
  is the cleaner option and keeps the two paths from drifting.
- (b) Keep the inline JSX but **correct the design wording**: state explicitly that
  Step 3/5 **re-create the button markup** that is inline in `CastResultDisplay`
  (delegating to the same handlers), that this markup is duplicated (not shared), and
  that the `marked_by_magic` local `arcaneMarkResult` state must be re-created in the
  guide step. Add a test asserting the guide's re-hosted miscast escalation
  (`cascading_chaos`, `multiplying_misfortune`, `marked_by_magic`) reaches the same
  handlers as the panel.

Either resolves the inaccuracy; (a) is preferable because it also prevents drift.

### 2. MEDIUM — Step 3 "Open Cast roll" + `onCastResolved` round-trip is under-specified for the case where the player opens the Cast roll from Step 2

**Where:** §Step-by-step hand-off Step 2 ("Choosing **Cast** … advances to `'resolve'`
and calls `onOpenCast()`") and Step 3 ("Provides an 'Open Cast roll' button … if the
player arrived without rolling").

**Problem:** The flow has **two** entry points that open the same existing
`RollDialog`: Step 2's Cast button (`chooseRoute('cast')` → advance to `resolve` →
`onOpenCast()`) and Step 3's "Open Cast roll" button (`onOpenCast()`). But the
`RollDialog` is rendered by `SpellCastingPanel`, which on the guide path **suppresses
its own `CastResultDisplay`** while `guideActive` but says nothing about whether the
`RollDialog` itself renders over/under the guide overlay. Verified in source:
`RollDialog` is itself a `role="dialog" aria-modal="true"` portal overlay (same
pattern as `CastResultDisplay`). The design's §"Overlay layering" resolves the
`CastResultDisplay` two-dialog problem but is **silent about `RollDialog`** — yet
opening the Cast/Channel roll necessarily mounts a second `aria-modal` dialog on top of
(or behind) the guide's own `aria-modal` overlay, which is the exact anti-pattern the
design says it is avoiding (two simultaneous modal dialogs, two focus traps, two
backdrops). This is the same class of gap that finding (pass-3 #3) fixed for
`CastResultDisplay`, left unaddressed for `RollDialog`.

**Fix:** Specify the `RollDialog` layering explicitly, mirroring the `CastResultDisplay`
decision. Options: (i) while the Cast/Channel `RollDialog` is open, the guide overlay
intentionally yields (the `RollDialog` is the top modal; the guide's focus trap is
inert until the dialog closes), or (ii) the guide suppresses its own backdrop/focus-trap
while `rollDialogState != null`. State which, and add an integration-test assertion that
exactly one `aria-modal` dialog is focus-trapping at a time while the Cast roll is open
(the same invariant the overlay-layering test asserts for `CastResultDisplay`). Without
this, AC-16 (focus trap) and the "exactly one `aria-modal`" invariant are not actually
guaranteed on the most common path (every cast opens `RollDialog`).

### 3. NIT — Existing `spell-casting.ts` code comments cite "Winds of Magic p.19" / "p.20" which the design correctly abandons but does not reconcile

**Where:** §"Responses … pass 3" finding 1 (the design switches Total Power citation to
`WoM §"Critical Casting" … (see WoM p.23 Overcast Table)`), vs the existing source
`resolveCastingResult` comment `// Total Power (Winds of Magic p.19)` and
`// Channelled cast failure (Winds of Magic p.20)`.

**Problem:** Verified: `docs/windsofmagic.md` has no `p.19`/`p.20` markers for these;
Total Power is in §"Critical Casting" (line 511, "see page 23"), the failed-channelled-
cast rule is in §"Channelling Test" (line 593). The design's **new** citations are
correct and source-anchored. But the design adds the `computeOvercastBudgetBreakdown`
helper **next to** existing functions whose comments carry the wrong page numbers, and
the `fix-errors` steering rule says to fix known errors on sight. Since the design is
already editing `spell-casting.ts` (adding three helpers) and already researched the
correct anchors, the stale `p.19`/`p.20` comments should be corrected in the same edit.

**Fix:** Add a one-line note to the `spell-casting.ts` changed-files row to also correct
the two existing stale citations to `WoM §"Critical Casting"` / `WoM §"Channelling
Test"` (non-behavioural comment fix), so the file's citations are internally consistent
with the new helper's citation and with `rules-compliance` rule 5.

### 4. NIT — `RollDialog` seam naming mismatch (`name` vs `skillOrCharName`)

**Where:** §"The seam" and multiple hand-off paragraphs: "seeded with
`name:'Language (Magick)', baseTarget: computeCastingTarget(character)`".

**Problem:** Verified: `RollDialog`'s prop is `skillOrCharName`, not `name`; the
`'Language (Magick)'` string lives on the panel's internal `RollDialogInfo.name` field
which is then passed to `RollDialog` as `skillOrCharName`. The design's shorthand
`name:'Language (Magick)'` is accurate as a description of the panel's internal
`openCastDialog` (which does set `name: 'Language (Magick)'` on `RollDialogInfo`), but
an implementer skimming the design could wire a non-existent `name` prop on
`RollDialog`.

**Fix:** Clarify once that the guide **does not** pass props to `RollDialog` directly —
it calls `handle.openCast(spell)`, which runs the **existing** `openCastDialog`, which
sets `RollDialogInfo.name='Language (Magick)'` and the panel renders `<RollDialog
skillOrCharName={rollDialogState.name} baseTarget={rollDialogState.baseTarget} … />`.
No `name` prop exists on `RollDialog`.

### 5. NIT — Step-4 overcast-budget tooltip label "surplus" collides with `CastingResult.surplusSL`, which can differ from `overcastSlots` only in that both are already equal here

**Where:** §Calculated-total tooltips (overcast budget row) and
`computeOvercastBudgetBreakdown`.

**Problem (minor):** Verified in `resolveCastingResult`:
`surplusSL = max(0, overcastSL − cn)` and
`overcastSlots = computeOvercastSlots(overcastSL, cn) = max(0, overcastSL − cn)` — they
are computed identically and are always equal. The design's tooltip uses `overcastSlots`
for the total while labelling the sum result "surplus", and `computeOvercastBudgetBreakdown`
returns `overcastSlots` (not `surplusSL`). This is self-consistent and arithmetically
correct, but the two field names for the same number (`surplusSL` vs `overcastSlots`) in
the same `CastingResult` are a latent trap: a future change that makes them diverge
would silently break the tooltip's "= surplus {overcastSlots}" label.

**Fix:** Add one sentence noting `surplusSL === overcastSlots` by construction today and
that the tooltip and helper deliberately use `overcastSlots`; if they ever diverge the
tooltip label must be revisited. (Documentation-only; no code change required.)

---

## Verified Assumptions (claims I checked and found TRUE)

- **`dice-roller.ts` `isCritical = passed && double`** — verified (`resolveRoll`:
  `isCritical = passed && double`). The design's pass-2 finding-1 reasoning (a Critical
  always implies a passed Language (Magick) Test, so gating the critical-choice surface
  on `isCriticalCast` alone matches RAW and the panel) is **correct**.
- **`CastResultDisplay` gates the three critical buttons on `isCriticalCast` alone** (no
  `castSuccess`) — verified (`{isCriticalCast && ( …three buttons… )}`). The guide's
  matching gate is correct.
- **Overcast-section render guard is `overcastSlots > 0 && castSuccess &&
  onOvercastAllocated`** — verified. The design's widening to
  `… && (onOvercastAllocated || onOvercastResolved)` is strictly additive and necessary
  for the component-test / direct-mount path.
- **`handleOvercastAllocated` nulls the result** (`setCastingResult(null)`) and
  `CastingResult.overcastAllocation` is hard-coded `null` by `resolveCastingResult` —
  verified; so no allocator result is persisted today. The `onOvercastResolved` capture
  callback is genuinely required for Step 6 (AC-10).
- **Three non-null `setCastingResult(...)` sites** (`handleRollResult` initial resolve;
  `handleCriticalChoice` `total_power` and `unstoppable_force` re-resolves) and
  **`critical_wound` is display-only** (comment "just display, no re-resolve needed", no
  `setCastingResult` call) — verified. Firing `onCastResolved` at all three and **not**
  on `critical_wound` is correct.
- **`OvercastAllocator` emits `Record<string, number>` keyed by `opt.category`
  (`'range'|'aoe'|'duration'|'targets'|'damage'`)**, which are exactly the keys
  `resolveOvercastAllocations(surplusSL, Partial<Record<…>>)` expects — verified; the
  design's "no key mapping needed" claim for Step 6 is correct.
- **`computeOvercastDamagePreview(baseDamage, damageAllocation)`**,
  **`formatCastDamageBreakdown(mod, sl, overcast?)`**, **`computeCastingTarget`** (= Int
  total + Language (Magick) advances), **`computeChannellingTarget`** (= WP total +
  Channelling advances), **`tensDigit`**, **`computeOvercastSlots(sl,cn)=max(0,sl−cn)`**,
  **`lookupMiscast`**, **`computeOvercastOptions`** column-disable rules — all verified
  to exist with the signatures/semantics the design relies on.
- **Combat-turn reducer is pure/total, derives `isFirst`/`isLast` from `STEP_SEQUENCE`**
  — verified. The design's finding-4 observation (the guided-cast panel **cannot** do
  this because `overcast`/`miscast` are conditional, and must index into
  `applicableSteps`) is a genuine, correctly-handled divergence.
- **`GuidedTurnPanel` a11y structure** (createPortal to document.body, `role="dialog"`
  `aria-modal="true"`, focus trap on Tab/Shift-Tab, Esc + backdrop close, focus to
  heading on open/step-change via `requestAnimationFrame`, focus restore via
  `previousFocusRef`, stepper `<ol>` with `aria-current="step"`, polite live region,
  Arrow Left/Right nav) — verified; the guide's claim to mirror it is accurate.
- **Advisor union contract** — `SuggestionSource.getSuggestions` returns
  `Suggestion[] | Promise<Suggestion[]>` and `TurnAdvisorSource.describe` returns
  `TurnStepInfo | Promise<TurnStepInfo>`; `GuidedTurnPanel` unwraps with
  `info instanceof Promise ? null : info` — all verified. The `CastAdvisorSource`
  mirror and the sync-only v1 default are consistent.
- **`Tooltip` / `TooltipTriggerCell`** exist and are used with the single-open-index
  pattern (`SuggestionItem`, `AdvancementPlanner`, `CharCurrentCell`) the design cites.
- **Rulebook citations (all read directly in `docs/`):**
  - WoM "These rules supersede those in the WFRP Core Rulebook" — verified (line 459).
  - WoM Critical Casting: doubles on **successful** cast → Minor Miscast unless
    Instinctive Diction; Critical Cast / Total Power ("add the tens digit of their
    casting roll to their SL for the purpose of Overcasting (see page 23)") /
    Unstoppable Force ("spell cannot be dispelled") — verified (lines 508–513).
  - WoM Fumbled Casting → Minor Miscast (line 516); failed channelled cast → Minor
    Miscast ("If the Casting Test fails … must roll on the Minor Miscast Table", line
    593); **"Channelled power may not be used to Overcast a spell"** (line 594) —
    verified, supporting OQ-5.
  - WoM OVERCAST TABLE present (line 662); the supplement's own cross-reference
    ("see page 23") confirms **p.23** for the table — verified. Dropping the earlier
    unverifiable "p.19" was correct.
  - WoM Malignant Influences (line 614) — verified; Core index "Malignant Influences
    236" supports the pass-3 correction to Core p.235-236.
  - Core "Overcasting 238", "Magic Missiles 236", and the Critical Casting section
    ("choose one of the following effects" with Critical Cast, etc., line 11131) —
    verified via `docs/WarhammerFantasyRoleplay4e.md`.
- **OQ-5 (channelled overcast)** — the existing `resolveCastingResult` computes
  `overcastSlots` from the **casting-test SL** against the (reduced) CN, not from
  channelled power; so presenting Step 4 on the function's `overcastSlots` is
  RAW-consistent with "channelled power may not be used to Overcast" (the overcast
  budget derives from the cast roll's own SL). The design's "no extra guide-side
  restriction" stance is sound.
- **Scope deferrals** — Ritual Magic, exotic/Dark lores, dispel/prayer-miscast/vortex
  are deferred with citations (FR-7.3), matching requirements Out-of-Scope. No invented
  mechanic found anywhere in the design.
- **Opt-in / OFF-by-default / additive-prop** design — the seam is three optional props
  + one per-row trigger; when absent, the panel's default render and behaviour are
  unchanged. Consistent with FR-1, NFR-1, AC-1.
- **No new mutation logic** — every mutation routes through existing handlers
  (`updateCharacter`, `cancelChannelling`, `onArcaneMarkAcquired`); the reducer stores
  the existing `CastingResult` and reads flags only (FR-3, FR-5.3, NFR-2) — consistent
  with the pure, property-testable mandate.

## Unverified / Wrong Assumptions

- **Core ToC line "Casting Test 234".** I did not locate that exact ToC line in
  `docs/WarhammerFantasyRoleplay4e.md` by grep (the Core index I confirmed lists
  "Overcasting 238", "Magic Missiles 236", and the Critical Casting body section). The
  **content** the design attributes to p.234 (Language (Magick) Test, SL-vs-CN
  comparison, Critical Casting choices) is present and correct; the **exact page number
  234** for the base Casting Test I could not independently confirm from the ToC in this
  pass. Low risk (the adjacent pages 236/238 and the Critical Casting section are
  confirmed), but the implementer should spot-check the "p.234" string against the Core
  body heading before committing the citation data. Not scored as a blocking finding
  because the mechanic and its neighbourhood are verified; flagged here for honesty.
- **`guideActive`-gated suppression of `CastResultDisplay` preserves "byte-for-byte"
  default render.** I verified the logic is sound in principle (the suppression is
  `{!guideActive && …}` and `guideActive` is false by default), but I did **not** run
  the test suite, so the "existing tests stay green unchanged" / AC-1 snapshot claim is
  asserted, not verified. Consistent with the "do not run suites" instruction.

---

## Verdict

Findings: **2 MEDIUM**, 3 NIT, 0 HIGH.

Because the count of HIGH + MEDIUM findings is greater than zero, the verdict is
**CHANGES_REQUESTED**. The two MEDIUM items are narrow and fixable with documentation
precision plus (for finding 1, option a) a small, additive component extraction and (for
finding 2) specifying the `RollDialog` layering invariant the design already established
for `CastResultDisplay`. Neither requires rethinking the architecture; both keep the
design within its additive, single-source-of-truth, single-`aria-modal` approach.
