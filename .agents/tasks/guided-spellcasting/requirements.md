# Guided Spellcasting / Miscast Flow — Requirements

## Summary

Add an **opt-in, OFF-by-default** "Guide my spell" co-pilot that walks a player
through a single WFRP 4e spellcasting attempt in six explicit, rulebook-cited
steps. The guide **orchestrates the app's EXISTING spellcasting machinery** — it
surfaces the relevant existing control at each step with a short, cited "why",
and the player decides and acts. It **never auto-applies** a result, **never
auto-advances** a step, **never rolls on its own**, and introduces **no new
casting / channelling / overcast / miscast math**. Every roll goes through the
existing `RollDialog`; every outcome is read from the existing
`src/logic/spell-casting.ts` outputs and rendered by (or alongside) the existing
`SpellCastingPanel` / `CastResultDisplay` / `OvercastAllocator` UI.

The feature mirrors two existing precedents exactly so it introduces no new
paradigm:

- **Guided Combat Turn** (`src/logic/combat-turn/` reducer + `types.ts` +
  `steps.ts`; `src/components/combat/GuidedTurnPanel.tsx`) — a pure, total,
  deterministic, property-testable step reducer driven only by explicit player
  events, plus a portal overlay with a stepper, focus management, and ARIA.
- **Character Assistant** (`src/logic/assistant/types.ts` `SuggestionSource`;
  `src/components/assistant/*`) — a sync-by-default advisor boundary whose
  return type is a `T | Promise<T>` union so a future offline-only LLM advisor is
  a non-breaking swap. v1 ships **only** the deterministic, synchronous default.

### Scope anchor (rulebook, verified in `docs/`)

The guided procedure rests on these pages (read directly, not from memory):

- **Memorising Spells** — Core p.233 (`docs/WarhammerFantasyRoleplay4e.md`).
- **Casting Test** — Core p.234 ("make a **Language (Magick)** Test … match your
  SL to the Casting Number (CN) … SL equal to or higher than CN → cast").
- **Critical Casting** — Core p.234 (doubles on a *successful* cast → roll on
  the Minor Miscast Table unless **Instinctive Diction**; plus choose Critical
  Cast / Total Power / Unstoppable Force).
- **Fumbled Casting** — Core p.234-235 (doubles on a *failed* cast → Minor
  Miscast).
- **Minor / Major Miscast Tables** — Core p.234-235
  (`src/data/miscast-tables.ts` encodes these).
- **Overcasting** — Core p.238 (base rule), **superseded** by the revised
  **Overcast Table** in `docs/windsofmagic.md` (Fibonacci-style SL thresholds
  1/2/3/5/8/13/21; already encoded as `OVERCAST_TABLE`).
- **Winds of Magic casting revisions** — `docs/windsofmagic.md` §"Casting Test",
  §"Critical Casting", §"Fumbled Casting", §"Channelling Test", §"Advantage and
  Magic" — explicitly: *"These rules supersede those in the WFRP Core
  Rulebook."* (relevant to overcast, Total Power = "add the tens digit of the
  casting roll to SL for Overcasting", channelling, and the mandatory Minor
  Miscast on a failed channelled cast).

The guide **cites**, it does not re-derive. All mechanics it displays are
computed by the existing functions (`computeCastingTarget`,
`computeChannellingTarget`, `resolveCastingResult`, `computeOvercastSlots`,
`computeOvercastOptions`, `resolveOvercastAllocations`, `lookupOvercastEffect`,
`lookupMiscast`, `isMagicMissile`, `computeMagicMissileDamage`,
`parseDamageFromEffect`, `getHitLocation`, `reverseRollDigits`,
`getArmourCastingPenalty`, `resolveChannellingResult`).

---

## Functional Requirements

### FR-1 — Opt-in, OFF by default

- **FR-1.1** The guide is OFF by default. Nothing about the spellcasting
  experience changes until the player explicitly turns the guide on.
- **FR-1.2** The guide is entered from a single, unobtrusive trigger associated
  with the `SpellCastingPanel` (e.g. a "Guide my spell" button for a memorized,
  castable spell), consistent with how `GuidedTurnTrigger` opens the Guided
  Combat Turn and how the Assistant trigger opens its panel.
- **FR-1.3** When the guide is OFF, `SpellCastingPanel` renders and behaves
  **exactly as it does today** — the Cast button, Channel button, roll dialog,
  overcast allocator, miscast handling, saturation selector, armour-penalty
  note, and alt-channelling cants are all unchanged.
- **FR-1.4** There is **no persisted preference** required for v1 beyond what the
  existing code already persists; the guide's own on/off is per-invocation
  (opening the panel). No new persisted casting state is introduced (see FR-9).

### FR-2 — Six explicit, player-driven steps

The guide presents exactly these six steps. Each step **surfaces the relevant
EXISTING control** plus a short, rulebook-cited explanation. Nothing in a step
happens automatically; the player triggers every transition and every action.

- **FR-2.1 — Step 1: Select Spell.** Show the chosen memorized spell's
  **CN, Range, Target, Duration, Effect** (same fields the existing `SpellCard` /
  `CompactSpellRow` show) and the **casting target number** from
  `computeCastingTarget(character)`. If `getArmourCastingPenalty(character) > 0`,
  surface the existing armour-penalty note and the current magic-saturation
  modifier as context (both already computed by the panel). The casting target
  is a calculated total and MUST carry a breakdown tooltip (FR-8).
- **FR-2.2 — Step 2: Choose Cast vs Channel.** Offer the two existing routes and
  cite the rule. **Channel** hands off to the panel's existing channelling
  control (`openChannelDialog` → `RollDialog` for "Channelling",
  `resolveChannellingResult`, `channellingProgress`); **Cast** proceeds to Step 3
  (opens the Cast roll). For Petty spells (CN `'0'` / `'-'`) Channel is **not**
  offered, mirroring `CompactSpellRow`'s `isPetty` gate. Cite Core p.234 (Casting
  Test) and `windsofmagic.md` §"Channelling Test" (channel to reduce CN, then
  cast at reduced CN; channelled power may **not** be used to overcast).
- **FR-2.3 — Step 3: Resolve the Cast Test.** Drive the **existing** `RollDialog`
  for the **Language (Magick)** test, seeded exactly as
  `SpellCastingPanel.openCastDialog` does (`name: 'Language (Magick)'`,
  `baseTarget: computeCastingTarget(character)`), honouring `defaultDifficulty`
  the same way existing seeded-roll paths do. Feed the dialog result into
  `resolveCastingResult(result, spell, character, options)` using the **same**
  fully-channelled `{ channelledCN: 0 }` option detection the panel already
  performs. Display the **SL vs CN** comparison and the critical/fumble flags
  read from the `CastingResult` (`slAchieved`, `cn`, `castSuccess`,
  `isCriticalCast`, `isFumbledCast`). The SL and target are calculated totals and
  MUST carry breakdown tooltips (FR-8). The guide itself does **not** roll — the
  d100 comes only from `RollDialog`/`performRoll`.
- **FR-2.4 — Step 4: Overcast (only when surplus SL exists).** This step appears
  **only** when `castingResult.castSuccess === true` and
  `castingResult.overcastSlots > 0` (i.e. `computeOvercastSlots(sl, cn) > 0`).
  Surface the existing overcast allocation UI (`OvercastAllocator` fed by
  `computeOvercastOptions(spell)` and `availableSlots = overcastSlots`), show the
  **surplus-SL budget** and the **Fibonacci thresholds** (1/2/3/5/8/13/21) from
  `OVERCAST_TABLE`, and let the **player** allocate. The guide performs **no
  auto-allocation**; allocation math is `resolveOvercastAllocations` /
  `lookupOvercastEffect` only. The surplus-SL budget and any derived
  overcast-damage preview are calculated totals and MUST carry breakdown
  tooltips (FR-8). Cite Core p.238 as superseded by `windsofmagic.md` Overcast
  Table.
- **FR-2.5 — Step 5: Miscast Resolution (only when triggered).** This step
  appears **only** when `castingResult.triggerMinorMiscast === true` or
  `triggerMajorMiscast === true`. It explains **why** the miscast triggered with
  a citation (Critical Cast on doubles — Core p.234; Fumbled Cast on doubles —
  Core p.234-235; failed channelled cast — `windsofmagic.md` §"Channelling
  Test") and guides the player to roll the miscast via the panel's **existing**
  handling (`handleMiscastRoll` → `lookupMiscast(roll, 'minor'|'major')` and the
  existing `CastResultDisplay` miscast section, including its `cascading_chaos`,
  `multiplying_misfortune`, and `marked_by_magic` follow-ups). The miscast roll
  is **player-triggered**, never automatic. The guide adds no new miscast table
  or escalation logic.
- **FR-2.6 — Step 6: Outcome Summary.** Present the final outcome read **only**
  from existing logic outputs: success/failure, SL vs CN, Critical/Fumble/
  Unstoppable Force (`isUndispellable`) flags, any overcast effects chosen, and —
  for magic missiles — `hitLocation` and `damage` as already formatted by
  `formatCastDamageBreakdown` / the `CastResultDisplay` damage section. No new
  math; every number traces to the `CastingResult` or the existing allocator
  result. Damage is a calculated total and MUST carry a breakdown tooltip (FR-8).

### FR-3 — All actions route through EXISTING flows (no new mutation logic)

- **FR-3.1** Rolling (cast or channel) opens the **existing** `RollDialog`; the
  guide never generates a d100 itself.
- **FR-3.2** Casting resolution uses **only** `resolveCastingResult`;
  channelling uses **only** `resolveChannellingResult`; overcast uses **only**
  `computeOvercastOptions` / `resolveOvercastAllocations` / `lookupOvercastEffect`;
  miscast uses **only** `lookupMiscast` and the existing miscast UI. No casting,
  channelling, overcast, or miscast arithmetic is re-implemented in the guide.
- **FR-3.3** Any character-state change (e.g. `channellingProgress` updates,
  cancelling a channel, storing an arcane mark) is performed by the **same
  existing handlers** the panel already uses (`updateCharacter`,
  `onArcaneMarkAcquired`, `cancelChannelling`). The guide dispatches these via
  the existing props; it owns no mutator of its own.

### FR-4 — Nothing auto-applies; nothing auto-advances

- **FR-4.1** Every step transition is an explicit player event (Next / Back /
  jump via the stepper), mirroring the `turnReducer` event model. There is no
  timer and no event the UI dispatches without a user action.
- **FR-4.2** Advancing or retreating a step applies **nothing** to the character.
  A result is applied only when the player acts in the underlying existing
  control (rolls in `RollDialog`, allocates in `OvercastAllocator`, rolls a
  miscast, stores a mark, etc.).
- **FR-4.3** Steps 4 and 5 are **conditional**: they are reachable only when the
  existing logic sets the corresponding flag (`overcastSlots > 0` /
  `triggerMinorMiscast || triggerMajorMiscast`). When a conditional step does not
  apply, the guide skips presenting it but still lets the player move between the
  steps that do apply. The guide never *decides* an outcome — it only reflects
  the flags the existing logic produced.

### FR-5 — Pure, property-testable guided-flow reducer

- **FR-5.1** The guide's step/flow state lives in a **pure, total,
  deterministic** reducer that never throws and never mutates its input,
  mirroring `src/logic/combat-turn/reducer.ts`. State is plain, JSON-serializable
  data (step identifier + which conditional steps are currently applicable +
  references to the current `CastingResult`/allocation as produced by existing
  logic). No React imports in the reducer/types module.
- **FR-5.2** Transitions are a discriminated-union of **explicit player events**
  (e.g. `next`, `back`, `goto`, `reset`, and events recording that a roll /
  allocation / miscast was completed in the existing control so the guide can
  reflect it). `reset` returns a fresh initial state.
- **FR-5.3** The reducer derives nothing mechanical: it stores the
  already-computed `CastingResult` (or null) and reads flags off it; it computes
  no SL, CN, surplus, damage, or miscast result.

### FR-6 — Advisor boundary (future-proofed, sync & offline today)

- **FR-6.1** Step copy (title, cited "why" body, citation string) comes from a
  deterministic advisor object typed with the **same sync/async-union contract**
  as `TurnAdvisorSource.describe` / `SuggestionSource.getSuggestions`
  (`T | Promise<T>`), so a future **offline** LLM advisor is a non-breaking swap
  of the object.
- **FR-6.2** v1 ships **only** the synchronous, deterministic default. The guide
  depends on the advisor **object**, never on the bare describe function, exactly
  as `GuidedTurnPanel` depends on `defaultTurnAdvisor`.
- **FR-6.3** The advisor makes **no** network/LLM/telemetry call. No new runtime
  dependency is added.

### FR-7 — Rulebook compliance & citations

- **FR-7.1** Every step displays a citation sourced from `docs/` (Core p.233-238
  for the casting procedure; `windsofmagic.md` for the overcast table and
  channelling/critical/fumble revisions). Citations are carried as **data** and
  rendered source-agnostically, matching how the Assistant carries
  `citation` and how `steps.ts` embeds `citation` per step.
- **FR-7.2** No mechanic is invented. Where the rulebooks are silent or
  ambiguous, the guide flags it (see Open Questions) rather than guessing.
- **FR-7.3** Scope is **standard Arcane and Petty Magic** casting (the spells the
  existing panel already casts), plus **Bless / Invoke** only insofar as the
  existing panel already handles them with no new logic. **Ritual Magic is OUT of
  scope for v1** (separate extended procedure). Exotic lores, Dark Magic, and
  Chaos tongues are OUT of scope for v1 (flagged below).

### FR-8 — Breakdown tooltips on every calculated total

- **FR-8.1** Every calculated total the guide displays carries a breakdown
  tooltip rendered through the shared `Tooltip` / `TooltipTriggerCell`
  components, per the `calculated-totals` steering rule. This covers at least:
  the **casting target** (Step 1/3), **SL achieved** and the **SL-vs-CN** figure
  (Step 3), the **surplus-SL overcast budget** and any **overcast-damage
  preview** (Step 4), and the **magic-missile damage** total (Step 6).
- **FR-8.2** Tooltip breakdown lines use labelled components in an additive form
  (e.g. casting target: `Int total 42 + Language (Magick) advances 10 = 52`;
  SL comparison: `SL +3 vs CN 2`; damage: `WPB(4) + SL(3) + Overcast(2) = 9`).
  Zero-valued components are shown. Breakdown values come from the existing
  calculators/format helpers (`computeCastingTarget` internals,
  `formatCastDamageBreakdown`, `formatDamageBreakdown`,
  `computeOvercastDamagePreview`), never recomputed a second way in the guide.
- **FR-8.3** Tooltips open on hover (desktop) and tap/keyboard (touch/keyboard)
  via the existing `TooltipTriggerCell` behaviour.

### FR-9 — Transient, local-only state

- **FR-9.1** Guided-flow state is **transient and local** to the open flow. No
  casting state is persisted to the character or to storage.
- **FR-9.2** The flow **resets** on flow end (close) and on spell change (picking
  a different spell starts a fresh flow via `reset`), mirroring the
  reset-boundary discipline in the combat-turn reducer.
- **FR-9.3** The feature is **offline-first and local-only**: no backend, no
  network, no LLM, no telemetry. Any advisor/source boundary stays synchronous in
  v1.
- **FR-9.4** The guide does **not** introduce a parallel source of truth for any
  mechanic; the badge/flags/results all derive from the single existing
  `CastingResult` produced by `resolveCastingResult`.

### FR-10 — Accessibility & UX consistency

- **FR-10.1** The guide is a portal overlay (`createPortal` to `document.body`)
  with `role="dialog"`, `aria-modal="true"`, an accessible label, a focus trap,
  Esc-to-close, backdrop-close, focus moved to the step heading on open and on
  each step change, and focus restored to the trigger on close — matching
  `GuidedTurnPanel` and `AssistantPanel`.
- **FR-10.2** A stepper lists the (applicable) steps with `aria-current="step"`
  on the active step, keyboard navigation (Arrow Left/Right to move between
  steps, Tab trap), and a polite `aria-live` region announcing the current step.
- **FR-10.3** The implementation preserves recent UX work and does not regress
  it: the nav `onTouchEnd` preventDefault fix, collapse chevrons, reduced
  busyness, the Assistant panel, and the Guided Combat Turn all continue to
  behave as before.

---

## Non-Functional Requirements

- **NFR-1 — Additive & non-regressive.** The feature is purely additive.
  `SpellCastingPanel`, `CastResultDisplay`, `OvercastAllocator`, `RollDialog`,
  `spell-casting.ts`, `dice-roller.ts`, and `miscast-tables.ts` are **consumed,
  not rewritten**. All existing tests stay green **unchanged**.
- **NFR-2 — Single source of truth.** The guide reuses existing calculators and
  never recomputes a mechanic a second way (rules-compliance + DRY).
- **NFR-3 — Testability.** The reducer and advisor are pure and unit/property
  testable with Vitest + `fast-check` (mirroring the combat-turn and assistant
  test suites). UI is component-testable with `@testing-library/react`. New tests
  are added; existing tests are not modified to pass.
- **NFR-4 — No new runtime dependencies.** TypeScript + React function
  components, CSS Modules (`*.module.css`), `createPortal`, `lucide-react` icons
  — matching the existing stack.
- **NFR-5 — Offline/local performance.** All computation is synchronous and
  in-memory; no async work ships in v1.

---

## Acceptance Criteria

1. With the guide OFF (default), `SpellCastingPanel` renders and behaves
   identically to today — Cast, Channel, roll dialog, overcast allocator, miscast
   handling, saturation, armour-penalty note, and cants all unchanged; no new
   element is added to the panel's default render beyond the single opt-in
   trigger.
2. Opening the guide for a memorized, castable spell shows **Step 1** with the
   spell's CN/Range/Target/Duration/Effect and a casting-target total equal to
   `computeCastingTarget(character)`, with a breakdown tooltip whose lines sum to
   that total.
3. **Step 2** offers Cast and Channel for a non-Petty spell and offers **only**
   Cast for a Petty spell (CN `'0'`/`'-'`); each route cites the rulebook. The
   citations name Core p.234 (Casting Test) and `windsofmagic.md` (Channelling).
4. Choosing **Channel** opens the **existing** channelling `RollDialog`
   (name "Channelling", base `computeChannellingTarget(character)`) and routes
   results through `resolveChannellingResult` and the existing
   `channellingProgress` update — the guide adds no channelling math.
5. Choosing **Cast** → **Step 3** opens the **existing** `RollDialog`
   (name "Language (Magick)", base `computeCastingTarget(character)`); the guide
   does **not** roll a d100 itself.
6. After the player rolls, Step 3 shows SL, target, and an **SL vs CN** figure
   taken verbatim from the `CastingResult` (`slAchieved`, `cn`, `castSuccess`),
   plus `isCriticalCast` / `isFumbledCast` flags; SL and target carry breakdown
   tooltips.
7. **Step 4 (Overcast)** is presented **iff** `castSuccess && overcastSlots > 0`.
   It shows the `OvercastAllocator` with `computeOvercastOptions(spell)` and
   `availableSlots = overcastSlots`, displays the Fibonacci thresholds
   (1/2/3/5/8/13/21) and the surplus-SL budget with a breakdown tooltip, and the
   **player** allocates; the guide auto-allocates nothing.
8. For a self/touch spell, the overcast options disabled by
   `computeOvercastOptions` (Range/Targets for self; Range for touch; Duration for
   Instant; Damage only for magic missiles) are disabled in the guide exactly as
   the existing allocator disables them — the guide adds no new enable/disable
   logic.
9. **Step 5 (Miscast)** is presented **iff**
   `triggerMinorMiscast || triggerMajorMiscast`. It states **why** (Critical Cast
   / Fumbled Cast / failed channelled cast) with a citation, and the miscast is
   rolled only by an explicit player action via `handleMiscastRoll` →
   `lookupMiscast`; `cascading_chaos` / `multiplying_misfortune` /
   `marked_by_magic` follow-ups route through the **existing**
   `CastResultDisplay` handling.
10. **Step 6 (Outcome)** shows only values read from existing logic
    (success/failure, SL vs CN, Unstoppable Force flag, chosen overcast effects,
    and for magic missiles the hit location and damage via
    `formatCastDamageBreakdown`); the damage total carries a breakdown tooltip.
11. No guide action changes the character except through the existing handlers
    (`updateCharacter`, `cancelChannelling`, `onArcaneMarkAcquired`); advancing or
    retreating a step changes nothing on the character.
12. Every step transition is an explicit player event; there is no timer and no
    auto-advance. Closing the flow or changing the selected spell dispatches
    `reset` and leaves no persisted casting state.
13. The guided-flow reducer is pure, total, deterministic, never throws, and
    never mutates its input (property tests assert this, mirroring the
    combat-turn reducer tests).
14. The advisor object is typed with the `T | Promise<T>` union contract; v1's
    default is synchronous and makes no network/LLM/telemetry call (a test asserts
    the sync branch is the only path taken).
15. Every mechanic the guide displays matches the cited rulebook pages; no SL/CN/
    surplus/damage/miscast value is produced by code outside the existing
    `spell-casting.ts` / `dice-roller.ts` functions.
16. The overlay has `role="dialog"`, `aria-modal`, focus trap, Esc/backdrop
    close, focus-on-open/step-change, focus-restore-on-close, a stepper with
    `aria-current="step"`, Arrow-key step navigation, and a polite live region —
    matching `GuidedTurnPanel`.
17. The nav `onTouchEnd` preventDefault fix, collapse chevrons, Assistant panel,
    and Guided Combat Turn continue to work (no regression); the full existing
    test suite passes unchanged and the build/type-check is clean.

---

## Out of Scope (v1)

- **Ritual Magic** — a separate extended procedure (ingredients, extended tests,
  time); not part of the standard Casting Test and explicitly excluded.
- **Exotic / non-standard lores, Dark Magic, and Chaos tongues** — any casting
  that is not the standard `Language (Magick)` Arcane/Petty procedure the
  existing panel already handles.
- **New casting/channelling/overcast/miscast mechanics or tables** — none are
  added; the feature only orchestrates existing logic.
- **New persisted state** beyond what the app already persists (no saved
  guided-flow / casting state).
- **Any backend, network, LLM, or telemetry integration.** The advisor boundary
  is future-proofed in shape only; no async source ships in v1.
- **Dispel flow, Prayer-specific miscast variants, and vortex/random-vortex
  procedures** beyond whatever the existing panel already covers — not expanded
  here.

---

## Open Questions / Ambiguities (flagged, not guessed)

- **OQ-1 — Overcast rule source (supersession vs "extends").** The existing code
  uses the **Winds of Magic** Overcast Table (Fibonacci thresholds), not the Core
  p.238 "+2 SL per overcast" rule. The `rules-compliance` steering rule normally
  treats supplements as "extend, not override," but `windsofmagic.md` explicitly
  states *"These rules supersede those in the WFRP Core Rulebook."* The guide will
  **cite Core p.238 as superseded by the Winds of Magic Overcast Table**,
  matching the existing `resolveCastingResult` behaviour. **Confirm** this is the
  intended ruleset (i.e. Winds of Magic is "in use" for this table). If the Core
  overcast rule should be an option, that is a separate request.
- **OQ-2 — Bless / Invoke inclusion.** Divine casting (`Pray` / `Language
  (Magick)`-equivalent for miracles) differs from Arcane casting in the
  rulebooks. Requirement FR-7.3 limits v1 to what the **existing panel already
  handles with no new logic**. **Confirm** whether Bless/Invoke should appear in
  the guide's Step 2 at all, or be excluded from the guide entirely in v1.
- **OQ-3 — Malignant Influences / saturation interplay.** Core p.235 ("Malignant
  Influences": a units-die 8 near a Corrupting Influence forces a Minor Miscast,
  escalating an existing Minor to Major) and the magic-saturation modifiers are
  **not** currently applied by `resolveCastingResult`. v1 will **display these as
  cited context only** (not auto-apply them), consistent with "no new mechanics."
  **Confirm** that surfacing them as advisory notes (no enforcement) is
  acceptable.
- **OQ-4 — `triggerMajorMiscast` source.** `resolveCastingResult` sets
  `triggerMajorMiscast = false` and notes it is "set later by UI for cascading
  chaos." The guide will reflect the Major-miscast path **only** through the
  existing `CastResultDisplay` escalation (`cascading_chaos` → Roll Major
  Miscast), not by setting the flag itself. **Confirm** this matches the intended
  flow (the guide reads the existing UI's escalation rather than driving it).
- **OQ-5 — Channelled-cast overcast interaction.** `windsofmagic.md` states
  channelled power may **not** be used to overcast, though reducing CN makes
  overcasting more likely. The existing `resolveCastingResult` handles the
  channelled-CN path; the guide will present Step 4 based on whatever
  `overcastSlots` the existing logic returns. **Confirm** no additional
  guide-side restriction is expected beyond what the existing function computes.

---

## Assumptions

- The guide wraps the **existing** `SpellCastingPanel` props/handlers
  (`character`, `update`, `updateCharacter`, `addRoll`) and the existing
  `RollDialog` / `CastResultDisplay` / `OvercastAllocator` components; it does not
  re-mount or fork them.
- "Castable" and "memorized" use the panel's existing predicates
  (`hasSpellcastingTalent`, `spell.memorized`); the guide does not redefine
  eligibility.
- The pure reducer + advisor live under `src/logic/` (mirroring
  `src/logic/combat-turn/`), and the overlay lives under `src/components/`
  (mirroring `src/components/combat/GuidedTurnPanel.tsx`); exact paths are a
  design decision, not a requirement.
