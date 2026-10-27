# Guided Spellcasting / Miscast Flow — Technical Design

## Overview

This feature adds an opt-in, OFF-by-default "Guide my spell" co-pilot that walks a
player through a single WFRP 4e spellcasting attempt in a fixed sequence of
rulebook-cited steps. It is a **thin orchestration overlay** that mirrors the
already-shipped **Guided Combat Turn** exactly (`src/logic/combat-turn/*` +
`src/components/combat/GuidedTurnPanel.tsx` / `GuidedTurnTrigger.tsx`) and reuses
the **Character Assistant** advisor seam (`src/logic/assistant/types.ts`
`SuggestionSource`'s `T | Promise<T>` sync/async-union contract). The guide
introduces **no new casting / channelling / overcast / miscast math**: every
number it displays comes from the existing `src/logic/spell-casting.ts`
calculators, and every character mutation goes through the existing
`SpellCastingPanel` handlers (`updateCharacter`, `cancelChannelling`,
`onArcaneMarkAcquired`).

A precise note on dice, since the brief's "all rolls through the roll dialog"
framing is **not** literally true of the existing code the guide reuses (verified
against source — see §"Who rolls" and OQ-6): the **casting** d100 and the
**channelling** d100 come from the existing `RollDialog` → `performRoll`; the
**miscast** d100 (`SpellCastingPanel.handleMiscastRoll` → `Math.floor(Math.random()
* 100) + 1`) and the **arcane-mark** d10 (inside `CastResultDisplay`,
`Math.floor(Math.random() * 10) + 1`) are produced by the panel's existing
`Math.random()`-based handlers, which the guide **triggers but does not replace**.
Unifying the miscast/arcane-mark rolls onto `RollDialog` would require rewriting
existing components and is therefore **out of scope** per NFR-1; it is flagged as
OQ-6 for the user to decide.

The design settles the three decisions the brief front-loads:

1. **What RAW procedure to model** — a 6-step branch structure (select → cast-vs-channel
   → resolve cast → overcast → miscast → outcome) with steps 4 and 5 conditional on
   flags the existing logic produces. Verified against the rulebooks (see
   §"RAW procedure & citations").
2. **What kind of surface the guide is** — a **new opt-in portal overlay/stepper**
   (`GuidedCastPanel`) that **drives** the existing `SpellCastingPanel`'s controls
   via a small imperative handle, duplicating no logic and leaving the non-guided
   panel fully usable. This is the least-intrusive option (see §"Decision 1").
3. **How each step hands off** — the guide seeds/opens the *existing* `RollDialog` via
   the handle and hosts the *existing* `OvercastAllocator` / miscast controls in its own
   dialog body; it receives the `CastingResult` the panel computed **only** via the
   panel's push callback `onCastResolved` (no pull/read-back), and never rolls or mutates
   itself (see §"Decision 2", §"The seam", §"Overlay layering", and §"Step-by-step
   hand-off").

The technology stack is **locked**: TypeScript + React function components, CSS
Modules (`*.module.css`), `createPortal`, `lucide-react` icons, Vitest +
`fast-check` + `@testing-library/react` for tests. **No new runtime dependency is
added** (NFR-4).

---

## RAW procedure & citations (verified in `docs/`)

Every rule below was read directly from the referenced file, not from memory. These
strings are **code-comment-ready** and are carried as data in the advisor copy so
they render source-agnostically (FR-7.1).

- **Casting Test** — *Core p.234* (`docs/WarhammerFantasyRoleplay4e.md`, ToC line
  "Casting Test 234"). Make a **Language (Magick)** Test; if successful, compare SL
  to the spell's CN — SL ≥ CN casts the spell, else it fails. The app models the base
  target as `computeCastingTarget` = Int total + Language (Magick) advances.
- **Channelling Test** — *Core p.237* (`docs/WarhammerFantasyRoleplay4e.md`, ToC
  line "Channelling Test 237", body heading "# **Channelling Test**"); revised by
  *Winds of Magic* §"Channelling Test" (`docs/windsofmagic.md`): an **Extended**
  test whose SL pool reduces the spell's CN by 1 per SL to a minimum of 0; the player
  then makes a Casting Test at the reduced CN; *"Any additional power is lost once a
  spell is cast"* and *"Channelled power may not be used to Overcast a spell."* The app
  models the channel base target as `computeChannellingTarget` = WP total + Channelling
  advances.
- **Critical Casting** — *Core p.234*; *Winds of Magic* §"Critical Casting": doubles
  on a **successful** cast → roll on the **Minor Miscast Table** (*WFRP p.234*)
  **unless the caster has Instinctive Diction**, and the caster may choose one of
  **Critical Cast** (spell that deals Damage also inflicts a Critical Wound),
  **Total Power** (*"add the tens digit of their casting roll to their SL for the
  purpose of Overcasting"*), or **Unstoppable Force** (*"The spell cannot be
  dispelled"*).
- **Fumbled Casting** — *Core p.234-235*; *Winds of Magic* §"Fumbled Casting":
  doubles on a **failed** cast → roll on the Minor Miscast Table.
- **Failed channelled cast** — *Winds of Magic* §"Channelling Test":
  *"If the Casting Test fails, the stored energy is lost and the spellcaster must roll
  on the Minor Miscast Table."* (Mandatory Minor Miscast, already set by
  `resolveCastingResult` via its `channelledCN` path.)
- **Minor / Major Miscast Tables** — *Core p.234-235*, encoded in
  `src/data/miscast-tables.ts`.
- **Overcasting** — *Core p.238* (base rule; `docs/WarhammerFantasyRoleplay4e.md`
  ToC "Overcasting 238") **superseded by** the revised **Overcast Table** in
  *Winds of Magic* **p.23** (`docs/windsofmagic.md`, §"oVercasTing" with the
  "## OVERCAST TABLE"; the page is confirmed by the supplement's own
  cross-references — Total Power *"for the purpose of Overcasting (see page 23)"*
  and the index entry "Overcasting …23"). The supplement
  explicitly states *"These rules supersede those in the WFRP Core Rulebook"*
  (`docs/windsofmagic.md`, Casting summary intro). SL thresholds follow a
  Fibonacci-style progression **1/2/3/5/8/13/21**, already encoded as
  `OVERCAST_TABLE`. Column rules (`computeOvercastOptions`): Range/Targets disabled
  when range="You" & target="You"; Range disabled for "Touch"; Duration disabled for
  "Instant"; Damage enabled only for magic missiles; *"each column may only be
  accessed once per casting."*
- **Instinctive Diction / Aethyric Attunement** — *Core* talent entries (verified:
  Instinctive Diction *"You do not suffer a Miscast if you roll a double on a
  successful Language (Magick) Test"*; Aethyric Attunement the Channelling equivalent).
  Already honoured inside `resolveCastingResult` / `resolveChannellingResult`.

The guide **cites**, it does not re-derive. See Open Questions for the
Malignant-Influences / saturation / Major-miscast nuances the existing logic does not
auto-apply.

---

## New & changed files

### New — pure logic (mirrors `src/logic/combat-turn/`)

| File | Purpose |
| --- | --- |
| `src/logic/guided-cast/types.ts` | React-free types: `CastStep`, `CastRoute`, `GuidedCastState`, `GuidedCastEvent` (discriminated union), `CastStepInfo`, `CastAdvisorSource` (sync/async-union). JSON-serializable data only. |
| `src/logic/guided-cast/reducer.ts` | `STEP_SEQUENCE`, `initialGuidedCastState`, pure/total/deterministic `guidedCastReducer(state, event)`; `applicableSteps(state)` helper deriving which conditional steps are reachable from the stored `CastingResult` flags. |
| `src/logic/guided-cast/steps.ts` | `describeCastStep(step, ctx)` with static, rulebook-cited copy; `export const defaultCastAdvisor: CastAdvisorSource = { describe: describeCastStep }`. |

### New — components (mirrors `src/components/combat/GuidedTurn*`)

| File | Purpose |
| --- | --- |
| `src/components/shared/GuidedCastTrigger.tsx` (+ `.module.css`) | "Guide my spell" opt-in button rendered per memorized castable spell row; icon-only (`Wand2`/`Sparkles`) on mobile, label on desktop. |
| `src/components/shared/GuidedCastPanel.tsx` (+ `.module.css`) | The portal overlay/stepper. Reuses `GuidedTurnPanel`'s structure (backdrop, `role="dialog"`, focus trap, Esc/backdrop close, stepper, live region, Back/Next). |
| `src/components/shared/guidedCastSteps/SelectStep.tsx` | Step 1 — spell meta + casting-target total (with breakdown tooltip). |
| `src/components/shared/guidedCastSteps/RouteStep.tsx` | Step 2 — Cast vs Channel buttons (Channel hidden for Petty). |
| `src/components/shared/guidedCastSteps/ResolveStep.tsx` | Step 3 — "Open Cast roll" + SL/CN read-back display (tooltips) + the three Critical-Cast choice buttons (shown when `result.isCriticalCast`, mirroring `CastResultDisplay`'s own gate exactly, delegating to `onChooseCritical`). |
| `src/components/shared/guidedCastSteps/OvercastStep.tsx` | Step 4 — surplus-SL budget + thresholds, surfaces the existing allocator (tooltips). |
| `src/components/shared/guidedCastSteps/MiscastStep.tsx` | Step 5 — "why" + cite, routes miscast roll through existing handling. |
| `src/components/shared/guidedCastSteps/OutcomeStep.tsx` | Step 6 — final outcome summary (damage tooltip). |

### Changed — minimal, additive edits

| File | Change |
| --- | --- |
| `src/components/shared/SpellCastingPanel.tsx` | (a) Add an **optional** `guideHandleRef` prop and expose an imperative handle (open cast/channel dialog for a spell, make the critical choice, roll a miscast, `dismissResult`). The handle has **no** result read-back method — the result reaches the guide only via `onCastResolved` (this-pass finding 4, §"The seam"). (b) Add an **optional** `onCastResolved?(result: CastingResult)` callback fired at **all three** non-null `setCastingResult(...)` sites (see §"The seam"). (c) Add an **optional** `onOvercastResolved?(allocations: Record<string, number>)` callback; when present, `handleOvercastAllocated` forwards the allocations to it and does **not** `setCastingResult(null)` (keeps the stored result alive for the guide). (d) Own the guided-flow `useReducer` and render the per-row `GuidedCastTrigger` + the `GuidedCastPanel` overlay; while the overlay is open (`guideActive`), **suppress the panel's own `CastResultDisplay` render** (`{!guideActive && …}`) so only one `aria-modal` dialog is ever active and the guide hosts the allocator/miscast controls in-body (this-pass finding 3, §"Overlay layering"). All additions are behind optional props / the opt-in trigger: when the guide is off (the default, `guideActive === false`), the panel is byte-for-byte behaviourally identical — `CastResultDisplay` renders as today and `handleOvercastAllocated` still nulls the result and closes exactly as today (FR-1.3, NFR-1, AC-1). |
| `src/components/shared/CastResultDisplay.tsx` | Add an **optional** `onOvercastResolved?(allocations: Record<string, number>)` prop. **(a) Widen the overcast-section render guard** from `overcastSlots > 0 && castSuccess && onOvercastAllocated` to `overcastSlots > 0 && castSuccess && (onOvercastAllocated \|\| onOvercastResolved)` (prior finding) so, **when this component is mounted directly** (component tests, or any future non-guide caller that supplies only the capture callback), the allocator still renders. **(b)** `OvercastAllocator.onAllocate` is routed to `onOvercastResolved ?? onOvercastAllocated`. Note: on the **guide path** `CastResultDisplay` is **not mounted** (the guide hosts `OvercastAllocator` in its own dialog body — this-pass finding 3, §"Overlay layering"), so these optional additions change nothing on either today's default path (neither callback → section still does not render; only `onOvercastAllocated` → close-on-confirm as today) or the guide path (component not mounted). Strictly additive; no existing behaviour changes. |

| `src/logic/spell-casting.ts` | Add a pure **`computeCastingTargetBreakdown(character): { intTotal: number; advances: number; total: number }`** helper that exposes the parts the tooltip needs, and refactor the existing `computeCastingTarget` to `return computeCastingTargetBreakdown(character).total`. This is a **non-behavioural refactor** — `computeCastingTarget`'s result is byte-for-byte identical — that makes the breakdown come from the **same single source** as the total (resolves the FR-8.2/NFR-2 conflict, finding 3). Cite `// Core p.234: Casting Test — Int total + Language (Magick) advances`. Also add a pure **`isPettySpell(spell): boolean`** predicate (`spell.cn === '0' \|\| spell.cn === '-'`) so the Petty rule is defined once (prior finding 9); `CompactSpellRow` may optionally be refactored to call it. Also add a pure **`computeOvercastBudgetBreakdown(result): { slAchieved; totalPowerTens; cn; overcastSlots }`** helper that exposes the Total-Power tens contribution as data (`totalPowerTens = max(0, overcastSlots + cn − slAchieved)`) so the Step-4 overcast-budget tooltip sums correctly in both the normal and Total-Power cases **without** re-deriving `tensDigit(roll)` (this-pass finding 2); cite `// Winds of Magic §"Critical Casting" (Total Power) — add the tens digit of the casting roll to SL for Overcasting (see WoM p.23 Overcast Table)`. All three helpers are pure, additive, and non-behavioural (they expose parts of values the existing functions already compute). |

No changes to `dice-roller.ts`, `miscast-tables.ts`, `RollDialog.tsx`, or
`OvercastAllocator.tsx` (NFR-1). `CastResultDisplay.tsx` and `SpellCastingPanel.tsx`
gain **only** optional props whose absence preserves today's exact behaviour (see
finding-1 resolution in §"Step-by-step hand-off"); `spell-casting.ts` gains **only**
the additive, non-behavioural `computeCastingTargetBreakdown` helper that
`computeCastingTarget` now delegates to. Existing tests stay green unchanged (NFR-1).

---

## Decision 1 — Surface shape: a new overlay that DRIVES the existing panel

Three options were considered:

- **(A) A mode of `SpellCastingPanel`.** Rejected: it would interleave guided-only
  branching into the panel's render, risking regressions to the default path and
  violating FR-1.3's "exactly as today" requirement.
- **(B) An augmentation rendered inline inside the panel.** Rejected: it couples the
  stepper's focus-trap/portal lifecycle to the panel's layout and cannot match
  `GuidedTurnPanel`'s overlay accessibility without duplicating it.
- **(C, chosen) A separate opt-in portal overlay (`GuidedCastPanel`) that drives the
  panel's existing controls via a small imperative handle.** This is the
  least-intrusive option that reuses existing controls and duplicates no
  casting/overcast/miscast logic. It mirrors `GuidedTurnPanel` one-to-one (a sibling
  overlay, not a panel mode), so the non-guided panel stays fully usable and OFF by
  default.

**Why a handle rather than the combat-turn's looser "switch mode + reveal" hand-off?**
The combat-turn guide only needs to *reveal* a control. The spellcasting guide must
additionally **seed the exact Cast roll** (`name: 'Language (Magick)'`,
`baseTarget: computeCastingTarget(character)`) and **receive** the resulting
`CastingResult` (via the push callback, not a pull) to decide whether the conditional
Overcast/Miscast steps are reachable (FR-2.3–2.5, FR-4.3). Because `SpellCastingPanel`
already owns `rollDialogState` / `castingResult` / `miscastResult` as internal state,
the minimal seam is an **optional imperative handle** the panel exposes (to *drive*
actions) plus an **optional `onCastResolved` callback** (to *deliver* the result) —
both no-ops when the guide is absent. This keeps the panel the single owner of the
controls and the single source of truth for the result; the guide neither forks the
controls nor recomputes anything.

### The seam

```ts
// src/components/shared/SpellCastingPanel.tsx  (additive)
export interface SpellCastingGuideHandle {
  /** Seed + open the EXISTING cast RollDialog for this spell (same as openCastDialog). */
  openCast(spell: SpellItem): void;
  /** Seed + open the EXISTING channel RollDialog for this spell (same as openChannelDialog). */
  openChannel(spell: SpellItem): void;
  /** Make the EXISTING critical-cast choice for the current result (same as handleCriticalChoice). */
  chooseCritical(choice: 'critical_wound' | 'total_power' | 'unstoppable_force'): void;
  /** Roll a miscast via the EXISTING Math.random() handler (same as handleMiscastRoll). */
  rollMiscast(table: 'minor' | 'major'): void;
  /** Clear the panel's internal castingResult state (same as handleCloseCastResult). */
  dismissResult(): void;
}
// NOTE: the handle deliberately has NO getLatestResult()/read-back method. The
// CastingResult reaches the guide ONLY via the push callback onCastResolved (see below).

interface SpellCastingPanelProps {
  /* ...existing props unchanged... */
  guideHandleRef?: React.Ref<SpellCastingGuideHandle>;              // optional
  onCastResolved?: (result: CastingResult) => void;                 // optional
  onOvercastResolved?: (allocations: Record<string, number>) => void; // optional
}
```

The panel wires this with `useImperativeHandle(guideHandleRef, () => ({...}))`,
delegating each method to the **existing** private functions (`openCastDialog`,
`openChannelDialog`, `handleCriticalChoice`, `handleMiscastRoll`,
`handleCloseCastResult`).

**`onCastResolved` is the single authoritative (push) path for the result
(this-pass finding 4).** The guide's stored `GuidedCastState.result` is updated
**only** from the `castResolved` event the host dispatches inside the panel's
`onCastResolved(result)` callback. The handle intentionally exposes **no**
`getLatestResult()`/read-back method, because an imperative handle closes over a
render's `castingResult` and can return a value one render stale — so a pull path would
race the push path and risk the guide reading pre-resolve numbers. Firing the callback
at the exact `setCastingResult(...)` call sites delivers the **fresh** value
synchronously with the state update, with no staleness window. There is exactly one way
the result enters the guide (the push), and the reducer's `result` is never sourced from
a handle read.

**`onCastResolved` fires at all THREE non-null `setCastingResult(...)` sites**
(verified in source — finding 5):

1. `handleRollResult` → `setCastingResult(castResult)` (the initial resolve), and
2. `handleCriticalChoice`'s `total_power` branch → `setCastingResult(reResolved)`, and
3. `handleCriticalChoice`'s `unstoppable_force` branch → `setCastingResult(reResolved)`.

The **`critical_wound`** branch of `handleCriticalChoice` is **display-only**: it does
**not** call `setCastingResult` (verified — comment *"critical_wound: just display, no
re-resolve needed"*), so it **must not** fire `onCastResolved` (this-pass finding 5).
This is correct and intentional — a Critical Wound adds no mechanical change the guide's
stored `result` depends on — so an implementer must **not** add a spurious
`onCastResolved(...)` call to that branch; the stored `CastingResult` is deliberately
left unchanged and there is no stale-state concern.

Firing on all three is mandatory because the critical-choice re-resolves change the
very flags the guide reads downstream: **Total Power** adds the tens digit of the
casting roll to SL, changing `overcastSlots`/`surplusSL` (and thus whether Step 4 is
applicable); **Unstoppable Force** sets `isUndispellable` (shown in Step 6). If
`onCastResolved` did not fire on the re-resolve, the guide's stored `result` would go
stale and Steps 4/6 would show pre-choice numbers. The guide therefore observes the
**same `CastingResult` object** the panel rendered at each site — no second
computation path (NFR-2, FR-9.4).

**`onOvercastResolved` captures the allocator result (finding 1).** The existing
`handleOvercastAllocated()` discards allocations and calls `setCastingResult(null)`
(comment: *"Allocations are informational — just close"*), which unmounts
`CastResultDisplay`, and `CastingResult.overcastAllocation` is hard-coded `null` by
`resolveCastingResult` — so **no allocator result is persisted anywhere today**. To
let Step 6 show chosen overcast effects and to keep the stored `result` alive across
Step 4 → Step 5/6, the panel adds the optional `onOvercastResolved(allocations)`
callback and `CastResultDisplay` (i) **widens its overcast-section render guard** from
`overcastSlots > 0 && castSuccess && onOvercastAllocated` to
`overcastSlots > 0 && castSuccess && (onOvercastAllocated || onOvercastResolved)`
(this-pass finding 3 — otherwise the allocator would never render on a guide path that
supplies only the capture callback, and `onOvercastResolved` could never fire, breaking
AC-7), and (ii) routes `OvercastAllocator.onAllocate` to
`onOvercastResolved ?? onOvercastAllocated`. When the guide supplies
`onOvercastResolved`:

- the raw `Record<string, number>` allocations are handed to the guide **before**
  any close, and
- `handleOvercastAllocated` is **not** invoked, so `setCastingResult(null)` does
  **not** run and the result stays mounted.

The design chooses option (a) (widen the guard) over option (b) (require the guide to
pass **both** callbacks): widening the guard keeps the guide seam a single optional
capture callback and avoids coupling the guide to the legacy close-on-confirm handler.
A default-off regression test asserts that with **only** `onOvercastAllocated` (today's
path) the allocator still renders and still closes-on-confirm, and that with **only**
`onOvercastResolved` (the guide path) the allocator renders and fires the capture
callback without nulling the result.

The guide stores the allocations in `GuidedCastState.overcastAllocations` and
resolves the display in Step 6 via the **existing**
`resolveOvercastAllocations(result.surplusSL, allocations)` /
`lookupOvercastEffect` (no new math — these functions already exist; this is new
*wiring* only). When the guide is absent, the allocator behaves exactly as today
(close-on-confirm). This revises the earlier "no new state/callback" wording to:
**one new optional capture callback on each of `SpellCastingPanel`/`CastResultDisplay`
plus transient `overcastAllocations` state in the reducer; still no new math.**

Because `guideHandleRef`, `onCastResolved`, and `onOvercastResolved` are optional and
the only other addition is the per-row trigger button, the default render changes by
**exactly one element per spell row** (the opt-in trigger) and nothing else (AC-1).

---

## Decision 2 — Who rolls, who mutates, who decides steps

- **Rolling (cast / channel).** The guide calls `handle.openCast(spell)` /
  `handle.openChannel(spell)`; the **existing** `RollDialog` performs the casting and
  channelling d100 via `performRoll`. The guide never generates the **casting /
  channelling** d100 (FR-3.1, AC-5). Difficulty handling (`defaultDifficulty`) and
  manual-entry mode are the dialog's existing behaviour — untouched.
- **Rolling (miscast / arcane mark).** The **miscast** d100 and the **arcane-mark**
  d10 are produced by the panel's existing `Math.random()` handlers
  (`handleMiscastRoll`; the `CastResultDisplay` arcane-mark button) — **not** through
  `RollDialog`. The guide **triggers** these via `handle.rollMiscast(...)` /
  the existing `CastResultDisplay` escalation buttons but does not replace them. This
  is a known deviation from the "all rolls via `RollDialog`" framing; unifying them is
  out of scope per NFR-1 and flagged as OQ-6.
- **Resolving.** The panel feeds the dialog result to the **existing**
  `resolveCastingResult` / `resolveChannellingResult` (including the fully-channelled
  `{ channelledCN: 0 }` detection the panel already performs), then fires
  `onCastResolved(result)`. The guide stores that `CastingResult` on its state and
  **reads flags off it** — it computes no SL/CN/surplus/damage/miscast (FR-3.2,
  FR-5.3, AC-15).
- **Mutating.** Channelling progress, cancel-channel, and arcane-mark storage all
  happen inside the panel's existing handlers (`updateCharacter`,
  `cancelChannelling`, `onArcaneMarkAcquired`). The guide owns no mutator (FR-3.3,
  AC-11).
- **Deciding steps.** Conditional steps 4/5 are reachable **iff** the stored result's
  flags say so: Overcast iff `castSuccess && overcastSlots > 0`; Miscast iff
  `triggerMinorMiscast || triggerMajorMiscast`. The guide reflects flags; it never
  decides an outcome (FR-4.3, AC-7, AC-9).

---

## Reducer state shape & transitions (`src/logic/guided-cast/`)

```ts
// types.ts
export type CastStep =
  | 'select'    // 1 — spell meta + casting target
  | 'route'     // 2 — cast vs channel
  | 'resolve'   // 3 — cast test result
  | 'overcast'  // 4 — conditional: surplus SL > 0
  | 'miscast'   // 5 — conditional: a miscast trigger fired
  | 'outcome';  // 6 — summary

export type CastRoute = 'cast' | 'channel' | null;

/**
 * Transient, local-only flow state. Plain JSON-serializable data; no React,
 * no closures, no functions. `result` is the SAME CastingResult the panel
 * produced via resolveCastingResult — stored, never recomputed (FR-5.3).
 */
export interface GuidedCastState {
  step: CastStep;
  /** Memorized spell name the flow is bound to; drives spell-change reset. */
  spellName: string | null;
  route: CastRoute;
  /** Existing CastingResult (or null before the cast is resolved). */
  result: CastingResult | null;
  /** True once the player completed the overcast allocation in the existing allocator. */
  overcastDone: boolean;
  /**
   * Raw allocations captured from the existing OvercastAllocator (column name →
   * SL spent), or null. Plain JSON data; resolved for display in Step 6 via the
   * EXISTING resolveOvercastAllocations/lookupOvercastEffect — never recomputed.
   */
  overcastAllocations: Record<string, number> | null;
  /** True once the player rolled a miscast in the existing path. */
  miscastDone: boolean;
}

export type GuidedCastEvent =
  | { kind: 'start'; spellName: string }     // open the flow for a spell (Step 1)
  | { kind: 'next' }                          // player: advance (skips inapplicable steps)
  | { kind: 'back' }                          // player: retreat (skips inapplicable steps)
  | { kind: 'goto'; step: CastStep }          // player: jump via the stepper
  | { kind: 'chooseRoute'; route: CastRoute } // player: picked Cast or Channel (Step 2)
  | { kind: 'castResolved'; result: CastingResult } // panel reported a resolved cast
    // (also fired on each critical-choice re-resolve — see §"The seam")
  | { kind: 'overcastResolved'; allocations: Record<string, number> } // allocator captured
  | { kind: 'miscastCompleted' }              // player rolled the miscast
  | { kind: 'reset' };                         // boundary: flow end / spell change
```

### Applicability (derived, never stored as the source of truth)

```ts
// reducer.ts
export const STEP_SEQUENCE: readonly CastStep[] =
  ['select','route','resolve','overcast','miscast','outcome'] as const;

/** Which steps are currently reachable. Conditional steps gate on result flags. */
export function applicableSteps(state: GuidedCastState): CastStep[] {
  const r = state.result;
  const overcastOn = !!r && r.castSuccess && r.overcastSlots > 0;
  const miscastOn  = !!r && (r.triggerMinorMiscast || r.triggerMajorMiscast);
  return STEP_SEQUENCE.filter(s =>
    (s !== 'overcast' || overcastOn) &&
    (s !== 'miscast'  || miscastOn));
}
```

`overcast`/`miscast` are included in `STEP_SEQUENCE` for a stable ordinal index but
are **filtered out of the stepper and skipped by `next`/`back`** when their flag is
false. The stepper renders only `applicableSteps(state)`; `goto` to an inapplicable
step is a **no-op** (mirrors `turnReducer`'s `goto` guard).

**Navigation operates over the applicable subset, NOT the full `STEP_SEQUENCE`**
(finding 4). `GuidedTurnPanel` can derive `isFirst`/`isLast` and Arrow/Next/Back
straight from `STEP_SEQUENCE` only because every combat-turn step is always
applicable; the guided-cast panel cannot, because `overcast`/`miscast` may be
filtered out. The reducer therefore computes `next`/`back` by indexing into
`applicableSteps(state)` and clamping:

```ts
// reducer.ts
/** Index of the current step within the APPLICABLE subset (guarded, never -1). */
function applicableIndex(state: GuidedCastState): number {
  const steps = applicableSteps(state);
  const i = steps.indexOf(state.step);
  return i < 0 ? 0 : i; // step currently inapplicable → treat as start of subset
}

case 'next': {
  const steps = applicableSteps(state);
  const i = applicableIndex(state);
  const nextStep = steps[Math.min(i + 1, steps.length - 1)];
  return nextStep === state.step ? state : { ...state, step: nextStep };
}
case 'back': {
  const steps = applicableSteps(state);
  const i = applicableIndex(state);
  const prevStep = steps[Math.max(i - 1, 0)];
  return prevStep === state.step ? state : { ...state, step: prevStep };
}
```

The overlay derives its boundary flags from the **applicable** list, not
`STEP_SEQUENCE`:

```ts
// GuidedCastPanel.tsx
const steps = applicableSteps(state);          // what the stepper renders
const idx   = Math.max(0, steps.indexOf(state.step));
const isFirst = idx === 0;
const isLast  = idx === steps.length - 1;
// stepper <ol> maps over `steps`; "Step {idx+1} of {steps.length}" in the label/live region.
```

**Clamp-to-nearest-applicable on re-resolve.** When a new `castResolved` changes the
applicable set so that `state.step` is no longer in it (e.g. the player is on
`overcast`, then a re-resolve zeroes `overcastSlots`), the `castResolved` handler
clamps `step` to the nearest still-applicable step rather than leaving it pointing at
a filtered-out value:

```ts
case 'castResolved': {
  const nextState = { ...state, result: event.result, overcastDone: false,
                      miscastDone: false, overcastAllocations: null };
  const steps = applicableSteps(nextState);
  // Keep current step if still applicable; else clamp to the nearest prior applicable
  // step (never past the end), so the UI never points at a filtered-out step.
  if (steps.includes(nextState.step)) return nextState;
  const fullIdx = STEP_SEQUENCE.indexOf(nextState.step);
  const fallback = [...steps].reverse().find(s => STEP_SEQUENCE.indexOf(s) <= fullIdx)
                   ?? steps[0];
  return { ...nextState, step: fallback };
}
```

`goto` guards identically: jump only if `event.step ∈ applicableSteps(state)`, else
no-op.

### Transition rules (pure, total, deterministic — mirrors `turnReducer`)

- `start`: returns `{ ...initial, step: 'select', spellName }` — a fresh flow bound to
  the spell. If `spellName` differs from the current one, this is effectively a reset
  for the new spell (FR-9.2).
- `next`: advance to the next **applicable** step, clamp at the last applicable step
  (no wrap, idempotent at the end).
- `back`: retreat to the previous **applicable** step, clamp at `'select'`.
- `goto`: jump to `event.step` **iff** it is in `applicableSteps(state)`, else no-op.
- `chooseRoute`: set `route`; does **not** change `step` on its own (the UI advances
  to `'resolve'` for Cast, or stays to let the player channel — see §"Step 2").
  Setting the route applies nothing to the character.
- `castResolved`: store `result`; reset `overcastDone`/`miscastDone`/
  `overcastAllocations` because a new cast supersedes a prior one; **clamp `step` to
  the nearest applicable step** if the new flags made the current step inapplicable
  (see the snippet above). Does **not** auto-advance (the player presses Next).
- `overcastResolved`: store `event.allocations` into `overcastAllocations` and set
  `overcastDone = true`; never changes `step`. Used by Step 6 to display chosen
  overcast effects via `resolveOvercastAllocations`/`lookupOvercastEffect`.
- `miscastCompleted`: set `miscastDone = true` only; never changes `step` (guidance
  flags, like `turnReducer`'s `markMove`/`markAction`).
- `reset`: return a fresh `initialGuidedCastState` (`step: 'select'`, all null/false).

`initialGuidedCastState = { step: 'select', spellName: null, route: null, result: null,
overcastDone: false, overcastAllocations: null, miscastDone: false }`.

The reducer **never throws, never mutates its input** (spread-copy only), and derives
no mechanic (it only reads boolean flags off the already-computed `CastingResult`).

---

## Component structure & wiring

### Host ownership (where the reducer lives)

`SpellCastingPanel` is rendered by `CombatPage` (Status mode) today, and the guide
must coexist with that panel. To keep the seam local and avoid threading state through
`CombatPage`, the **`GuidedCastTrigger` + reducer + `GuidedCastPanel` are owned by a
thin wrapper rendered alongside `SpellCastingPanel`**. Two placements were considered:

- Owning the reducer in `CombatPage` (like the combat-turn `useReducer`). Rejected:
  it spreads guide wiring across a large page component and couples it to combat-only
  context, whereas spellcasting also appears outside combat.
- **(chosen)** Owning the reducer inside `SpellCastingPanel` itself (a
  `useReducer(guidedCastReducer, initialGuidedCastState)` local to the panel), with the
  panel rendering its own `GuidedCastTrigger` per row and the `GuidedCastPanel` overlay.
  The panel already holds the imperative handle targets, so co-locating the guide state
  there keeps the handle a same-component call (no ref indirection across components)
  and keeps `CombatPage` unchanged. The guide remains a **separate overlay component**;
  only its state lives in the panel.

This keeps all additions inside `SpellCastingPanel` + the new files, and `CombatPage`
needs **no edit** (it already renders `SpellCastingPanel`).

### `GuidedCastPanel` (overlay)

Mirrors `GuidedTurnPanel` precisely:

- `createPortal(content, document.body)`; rendered only when open.
- `role="dialog"`, `aria-modal="true"`, `aria-label="Guide my spell"`.
- Focus trap on Tab/Shift-Tab; Esc and backdrop-click close; focus moved to the step
  heading (`tabIndex={-1}`, `requestAnimationFrame`) on open and on each step change;
  focus restored to the trigger on close (`previousFocusRef`).
- A stepper `<ol>` over `applicableSteps(state)` with `aria-current="step"` on the
  active step and per-step `goto` buttons; a polite `aria-live` region announcing the
  current step; Arrow Left/Right move between **applicable** steps; Back/Next footer
  buttons disabled at the applicable boundaries.
- Step copy (`title`, `body`, `citation`) comes from
  `defaultCastAdvisor.describe(step, ctx)`; the returned value is unwrapped with the
  same `info instanceof Promise ? null : info` guard `GuidedTurnPanel` uses (sync in
  v1).

### Overlay layering — exactly one `aria-modal` dialog is ever active (this-pass finding 3)

Steps 4 and 5 need the player to operate the existing `OvercastAllocator` and the
existing miscast/escalation controls. Those controls live inside `CastResultDisplay`,
which is **itself** a full-screen `role="dialog" aria-label="Cast Result"` portal
overlay with its own backdrop-click-to-close handler (verified in source:
`<div className={styles.overlay} onClick={onClose} role="dialog" …>`). Mounting that
overlay **underneath** the `GuidedCastPanel` overlay (also `role="dialog"
aria-modal="true"` with a focus trap) would create two simultaneous modal dialogs with
two backdrops and two focus traps — the guide's trap would exclude the allocator's
buttons (making them keyboard-unreachable, breaking AC-7/AC-9) and a backdrop click
would be ambiguous. That is the gap this finding flags.

**Decision: on the guide path, `CastResultDisplay` is NOT mounted. The guide hosts the
existing interactive controls inside its own step body.** Two options were considered:

- **(A)** Render `CastResultDisplay` as a second overlay under the guide and try to
  merge focus traps / z-order. Rejected: two stacked `aria-modal` dialogs are an ARIA
  anti-pattern, the guide's focus trap cannot include a sibling portal's controls
  without bespoke cross-portal focus wiring, and two backdrops conflict.
- **(B, chosen)** On the guide path, the panel **does not render** `CastResultDisplay`;
  instead the guide's Step 4 / Step 5 bodies render the **same existing child
  components** `CastResultDisplay` uses — `OvercastAllocator` (for Step 4) and the
  existing miscast/escalation buttons (for Step 5) — directly inside the guide's single
  `role="dialog" aria-modal="true"` surface, wired through the handle to the **same
  panel handlers** (`handleMiscastRoll`, the critical/escalation handlers,
  `onOvercastResolved`). No casting/overcast/miscast logic is duplicated — only the
  **host container** of the already-existing control changes (from `CastResultDisplay`'s
  overlay to the guide's step body).

Concretely, the guide owns a `guideActive` flag (true while the overlay is open). When
`guideActive`, `SpellCastingPanel` suppresses its own `CastResultDisplay` render
(`{!guideActive && castResultState && <CastResultDisplay … />}`) so the Cast Result
overlay never appears behind the guide; the guide instead renders the allocator /
miscast controls in-body. The miscast-result text, the `cascading_chaos` /
`multiplying_misfortune` / `marked_by_magic` escalation buttons, and the arcane-mark
button are the **same components/handlers** `CastResultDisplay` invokes, re-hosted — the
guide adds no new escalation logic (OQ-4 unchanged). This keeps the **widened
`CastResultDisplay` overcast-render guard** (finding, pass-2 #3) relevant only to the
**non-guide** path and to component tests that mount `CastResultDisplay` directly; on
the guide path the allocator is mounted by the guide, not by `CastResultDisplay`.

This guarantees the three invariants the review asked for:

- **(a) Only one `aria-modal` dialog is active at a time** — the `GuidedCastPanel`
  overlay. `CastResultDisplay` is not mounted while the guide is open.
- **(b) The active focus trap includes the allocator / miscast controls** — they are
  children of the guide's own dialog surface, so the guide's existing
  focusable-elements query (the same `GuidedTurnPanel` Tab/Shift-Tab trap) naturally
  includes them and they are keyboard-reachable.
- **(c) Backdrop-click behaviour is unambiguous** — a backdrop click on the guide
  dispatches `reset` and closes the guide (restoring focus to the trigger), exactly as
  `GuidedTurnPanel`'s backdrop close. There is no second backdrop. Closing the guide
  mid-flow leaves the character state as produced by whatever existing handlers already
  ran (no auto-apply on close); re-opening starts a fresh flow (FR-9.2).

When the guide is **off** (default), nothing changes: `SpellCastingPanel` renders
`CastResultDisplay` exactly as today (`guideActive` is false), so the standard path's
Cast Result overlay, its backdrop close, and its allocator are byte-for-byte unchanged
(FR-1.3, AC-1).

Props (all host/panel-owned; the overlay performs no mutation):

```ts
// MagicSaturation is imported from ../../types/character (the same source
// SpellCastingPanel uses — do NOT declare a local type, finding 7).
import type { Character, SpellItem, MagicSaturation } from '../../types/character';

interface GuidedCastPanelProps {
  state: GuidedCastState;
  dispatch: React.Dispatch<GuidedCastEvent>;
  character: Character;
  spell: SpellItem;                       // the memorized spell the flow is bound to
  armourPenalty: number;                  // getArmourCastingPenalty(character) — context only
  // Resolved with the SAME `?? 'normal'` default the panel uses, so `undefined`
  // never leaks into the advisor ctx (finding 7). The panel passes
  // `character.sessionState.magicSaturation ?? 'normal'`.
  saturation: MagicSaturation;            // context only (not auto-applied — OQ-3)
  onOpenCast: () => void;                 // → handle.openCast(spell)
  onOpenChannel: () => void;              // → handle.openChannel(spell)
  onChooseCritical: (c: 'critical_wound'|'total_power'|'unstoppable_force') => void; // → handle.chooseCritical(c)
  onRollMiscast: (t: 'minor'|'major') => void; // → handle.rollMiscast(t)
  onClose: () => void;
}
```

### Step components

Each step is a presentational child that renders the advisor copy + the step-specific
surface. None performs mutation or computation; each displayed total uses the existing
calculators and a `TooltipTriggerCell`/`Tooltip` pair.

---

## Step-by-step hand-off

**Step 1 — Select (`select`).** Shows the spell's CN/Range/Target/Duration/Effect (same
fields as `SpellCard`) and the casting target from `computeCastingTarget(character)`.
If `getArmourCastingPenalty(character) > 0`, shows the existing armour-penalty note and
the current magic-saturation modifier as **context only** (OQ-3). The casting target is
a calculated total with a breakdown tooltip (see §Tooltips). No action here.

**Step 2 — Route (`route`).** Offers **Cast** and **Channel**. Channel is hidden when
the spell is Petty. To avoid duplicating the Petty rule as an inline string literal in
yet another site (finding 9), a shared pure predicate
**`isPettySpell(spell): boolean` (= `spell.cn === '0' || spell.cn === '-'`)** is
extracted into `src/logic/spell-casting.ts` and used by the guide; `CompactSpellRow`'s
existing inline check **may** be refactored to call it too (optional, non-behavioural),
but the guide depends only on the shared helper. The predicate is also threaded into
the advisor `ctx` (`isPetty`) so the Channel rationale copy can adapt.

**Citation separates the RAW mechanic from the app convention (this-pass finding 5).**
The Casting Test / CN comparison is Core p.234; CN reduction by channelling is Winds of
Magic §"Channelling Test". The **Petty-no-channel gate itself is an app convention
derived from the spell data, not a quote from Core p.234** — p.234 defines the Casting
Test/CN comparison but does **not** state that Petty spells have CN 0/"-" nor that
Channel is unavailable for them (FR-7.2: do not attribute an app rule to a page that
does not state it). The advisor copy therefore reads, as two distinct clauses:
*"Core p.234 (Casting Test / CN). Channelling reduces a spell's CN before casting
(Winds of Magic §'Channelling Test'); spells with CN 0 or '-' (Petty) have nothing to
channel, so Channel is not offered."* — the final clause is described as an app
consequence of the `isPettySpell` predicate (`spell.cn === '0' || spell.cn === '-'`),
not as a p.234 rule. (FR-2.2, AC-3). Choosing **Cast** dispatches
`chooseRoute('cast')` then advances to `'resolve'` and calls `onOpenCast()`
(→ `handle.openCast(spell)`), opening the existing `RollDialog` seeded with
`name:'Language (Magick)', baseTarget: computeCastingTarget(character)`. Choosing
**Channel** dispatches `chooseRoute('channel')` and calls `onOpenChannel()`
(→ existing channel `RollDialog`, `computeChannellingTarget`, `resolveChannellingResult`,
`channellingProgress`); the player may channel across rounds and return to Cast later —
the guide stays on `route`/`resolve` and never forces advance. Citations: Core p.234
(Casting Test) + Winds of Magic §"Channelling Test".

**Step 3 — Resolve (`resolve`).** Provides an "Open Cast roll" button
(→ `onOpenCast()`) if the player arrived without rolling. After the panel resolves the
roll and fires `onCastResolved`, the host dispatches `castResolved(result)` and the step
renders SL, target, the **SL vs CN** figure, and the `isCriticalCast`/`isFumbledCast`
flags **read verbatim** from the `CastingResult` (`slAchieved`, `cn`, `castSuccess`).
SL and target carry breakdown tooltips. The guide does not roll the casting d100
(FR-2.3, AC-5, AC-6).

**Critical-Cast choice lives in Step 3 (finding 6).** On a critical *successful* cast,
RAW gives the caster a mandatory choice of one of three effects — **Critical Cast** /
**Total Power** / **Unstoppable Force** (Core p.234; *Winds of Magic* §"Critical
Casting") — **in addition to** the Minor Miscast (handled in Step 5 unless Instinctive
Diction). The existing `CastResultDisplay` already renders these three choice buttons
wired to `onCriticalChoice`; the six-step model would otherwise have **no home** for
this player choice, risking an invented surface or a silently dropped mechanic
(FR-7.2). The design therefore surfaces the choice **in Step 3** when
`result.isCriticalCast` — **the same gate the existing `CastResultDisplay` uses**
(verified: `{isCriticalCast && ( …three buttons… )}`, with **no** `castSuccess`
check). This is deliberate and RAW-correct (finding 1): in `dice-roller.ts`
`isCritical = passed && double`, so a Critical *always* implies a passed
Language (Magick) Test (roll ≤ target) — which is exactly the "successful Casting
Test" RAW ties the choice to (Core p.234, line 11129: *"If the casting roll is a
Critical … you may also choose one of the following effects"*; Winds of Magic
§"Critical Casting", line 508: *"If a spellcaster rolls doubles on a **successful
Casting Test** … may also choose one of three extra effects"*). It is **not** tied
to meeting CN: `castSuccess = totalPower || slAchieved >= cn` is a *different*
condition, and a doubles-but-under-CN critical (`isCriticalCast === true`,
`castSuccess === false`) is reachable. Gating the guide's choice surface on
`isCriticalCast && castSuccess` would silently pick a narrower-than-RAW
interpretation **and** diverge from the panel the guide claims to orchestrate,
dropping a RAW-mandated player choice in that case. The guide therefore gates on
`result.isCriticalCast` **alone**. (Step 5's Minor-Miscast reachability is a
separate, already-correct gate — `triggerMinorMiscast` fires for a critical
regardless of `castSuccess`.) The step renders the three buttons, each delegating to
`onChooseCritical(choice)` → `handle.chooseCritical(choice)` →
the panel's existing `handleCriticalChoice`. Because `total_power`/`unstoppable_force`
**re-resolve** the result, the panel fires `onCastResolved(reResolved)` (the 2nd/3rd
seam site), so the guide's stored `result` is refreshed **before** the player advances
to Step 4/5/6 — Step 4's `overcastSlots`/`surplusSL` and Step 6's `isUndispellable`
reflect the choice. The guide surfaces the **existing** buttons; it does not re-derive
Total Power's "add the tens digit of the casting roll to SL" math (that lives in
`resolveCastingResult`). Citation: Core p.234 / WoM §"Critical Casting".

**Step 4 — Overcast (`overcast`, conditional).** Reachable iff
`castSuccess && overcastSlots > 0`. Shows the surplus-SL budget
(`overcastSlots = computeOvercastSlots(sl, cn)`) and the Fibonacci thresholds
(1/2/3/5/8/13/21) from `OVERCAST_TABLE`, and renders the **existing**
`OvercastAllocator` component **inside the guide's own dialog surface** (not via a
second `CastResultDisplay` overlay — see §"Overlay layering"), fed by
`computeOvercastOptions(spell)` and
**`availableSlots = state.result.overcastSlots` read from the *current* reducer state
on every Step-4 render** (this-pass finding 4). This matters because a Step-3
**Total Power** choice re-resolves the `CastingResult` and can *raise*
`overcastSlots`; since `onCastResolved` fires on that re-resolve and the host
dispatches `castResolved(reResolved)` (updating `state.result`), reading
`availableSlots` from `state.result.overcastSlots` at render time guarantees the
allocator reflects the post-choice budget rather than a value captured at an earlier
step render. The budget must **never** be snapshotted into a separate state field or a
step-local `useMemo` keyed on anything but `state.result`. The player allocates; the guide auto-allocates
nothing (FR-2.4, AC-7). Self/touch/instant/non-missile columns are disabled exactly as
`computeOvercastOptions` dictates — the guide adds no enable/disable logic (AC-8). The
surplus-SL budget and any overcast-damage preview
(`computeOvercastDamagePreview`) carry breakdown tooltips. On allocator confirm the
allocations are **captured** via the panel's new optional `onOvercastResolved`
callback (finding 1) and the host dispatches `overcastResolved(allocations)`; because
the guide supplies `onOvercastResolved`, the panel does **not** null the
`CastingResult`, so the result stays alive for Steps 5/6. (On the guide path the
allocator is hosted in-body and `CastResultDisplay` is not mounted — §"Overlay
layering" — so the "stays mounted" concern is about the stored `CastingResult`, not a
rendered overlay.) Citation: Core p.238 superseded by Winds of Magic Overcast
Table (p.23).

**Step 5 — Miscast (`miscast`, conditional).** Reachable iff
`triggerMinorMiscast || triggerMajorMiscast`. Explains **why** with a citation
(Critical Cast → Core p.234; Fumbled Cast → Core p.234-235; failed channelled cast →
Winds of Magic §"Channelling Test") and guides the player to roll via the existing path
(`onRollMiscast('minor'|'major')` → panel's `handleMiscastRoll` → `lookupMiscast`). The
`cascading_chaos` / `multiplying_misfortune` / `marked_by_magic` follow-ups use the
**same** escalation components/handlers `CastResultDisplay` invokes, re-hosted inside
the guide's own dialog body (§"Overlay layering"); the guide reads them, it does not
drive `triggerMajorMiscast` itself (OQ-4). The roll is player-triggered; the guide adds
no table or escalation logic (FR-2.5, AC-9). On completion the host dispatches
`miscastCompleted`.

**Step 6 — Outcome (`outcome`).** Summarizes values read only from existing outputs:
success/failure, SL vs CN, Critical/Fumble/Unstoppable Force (`isUndispellable`), and —
for magic missiles — `hitLocation` and `damage` formatted via
`formatCastDamageBreakdown` / `formatDamageBreakdown` as `CastResultDisplay` already
does. **Chosen overcast effects** are resolved from the captured
`state.overcastAllocations` (finding 1) by calling the **existing**
`resolveOvercastAllocations(result.surplusSL, state.overcastAllocations)` and
reading its `columnEffects` (each produced by `lookupOvercastEffect`) — this is
existing math with new wiring, not a new calculator. The captured allocations are the
`Record<string, number>` the `OvercastAllocator` emits, keyed by `opt.category`
(`'range' | 'aoe' | 'duration' | 'targets' | 'damage'`), which are **exactly** the
keys `resolveOvercastAllocations` expects (`Partial<Record<...>>`), so no key mapping
is needed;
when `overcastAllocations` is null (player did not overcast, or Step 4 was
inapplicable) the overcast line is simply omitted. The damage total carries a
breakdown tooltip. No new math (FR-2.6, AC-10).

---

## Calculated-total tooltips (steering: `calculated-totals`)

Every calculated total the guide shows is rendered through the shared `Tooltip` +
`TooltipTriggerCell` pair, following the `SuggestionItem` / `AdvancementPlanner` usage
pattern (single-open index state in the step component: `openTotalIndex` + `anchorEl`,
`onOpen(el)` / `onClose`). Breakdown values come from the **existing** calculators and
format helpers — never recomputed a second way (FR-8.2).

| Total (step) | Source | Breakdown lines (additive, zeros shown) |
| --- | --- | --- |
| Casting target (1, 3) | **`computeCastingTargetBreakdown(character)`** (new helper; see finding 3) | `Int total {intTotal} + Language (Magick) advances {advances} = {total}` |
| SL achieved (3) | `CastingResult.slAchieved` / `rollResult` | `Roll {roll} vs target {targetNumber} → SL {sl}` |
| SL vs CN (3) | `CastingResult.slAchieved`, `cn` | `SL {+sl} vs CN {cn}` |
| Overcast budget (4) | `CastingResult.overcastSlots` and `overcastSL` read off the stored result (see note below); a read-only restatement of already-computed values, not a second calculation | Normal: `SL {slAchieved} − CN {cn} = surplus {overcastSlots}`. Total Power: `SL {slAchieved} + Total Power tens {+tensContribution} − CN {cn} = surplus {overcastSlots}` |
| Overcast damage preview (4) | `computeOvercastDamagePreview(baseDamage, damageAllocation)` | `Base {base} + Overcast {bonus} = {total}` |
| Magic-missile damage (6) | `formatCastDamageBreakdown(mod, sl, overcast?)` | `{mod} + SL({sl}) [+ Overcast({oc})] = {total}` |

The casting-target row now reads **both** the total and its components from the single
`computeCastingTargetBreakdown` source (not a second computation).

**Overcast-budget breakdown must sum under Total Power (this-pass finding 2).**
`resolveCastingResult` computes `overcastSlots` from
`overcastSL = totalPower ? slAchieved + tensDigit(roll) : slAchieved` and
`overcastSlots = computeOvercastSlots(overcastSL, cn) = max(0, overcastSL − cn)`.
Therefore the naïve breakdown `SL {slAchieved} − CN {cn} = {overcastSlots}` does
**not** sum whenever Total Power was chosen (it omits the tens digit), violating the
`calculated-totals` steering rule. The design resolves this by making the breakdown
name **every** contributing value, sourced from the stored `CastingResult` (no second
calculation):

- The stored `CastingResult` today carries `slAchieved`, `cn`, `surplusSL`, and
  `overcastSlots`, but **not** `overcastSL` nor the Total-Power tens contribution, so
  the guide cannot reconstruct the breakdown from the current fields alone without
  recomputing `tensDigit(roll)` (a second calculation path — disallowed by NFR-2).
  To keep a single source, add a pure, additive
  **`computeOvercastBudgetBreakdown(result: CastingResult): { slAchieved: number;
  totalPowerTens: number; cn: number; overcastSlots: number }`** helper to
  `spell-casting.ts` that derives `totalPowerTens = result.overcastSlots + result.cn −
  result.slAchieved` **clamped to ≥ 0** (equivalently `overcastSL − slAchieved`, which
  is `tensDigit(roll)` when Total Power applied and `0` otherwise, because
  `overcastSL = overcastSlots + cn` whenever `overcastSlots > 0`, and Step 4 only
  renders when `overcastSlots > 0`). This exposes the tens contribution as data
  **without** re-deriving it from the raw roll, so the breakdown and the total share
  the same arithmetic source. Cite
  `// Winds of Magic §"Critical Casting" (Total Power) — add the tens digit of the casting roll to SL for Overcasting (see WoM p.23 Overcast Table)`.
- The tooltip then renders
  `SL {slAchieved}{ + Total Power tens {+totalPowerTens} when totalPowerTens > 0} − CN {cn} = surplus {overcastSlots}`,
  which sums to `overcastSlots` in **both** the normal case (`totalPowerTens === 0`,
  term hidden) and the Total-Power case (term shown). Zero-valued components are shown
  per the steering rule except the Total-Power term, which is only meaningful when a
  Total-Power re-resolve occurred; when it is 0 the line is already the correct
  `SL − CN = surplus` form.

This keeps the overcast-budget breakdown arithmetically correct and traceable to the
single `CastingResult` the panel produced, consistent with the `calculated-totals`
steering rule and NFR-2.

Tooltips open on hover (desktop, 300ms) and tap/keyboard (Enter/Space) via the existing
`TooltipTriggerCell` behaviour (FR-8.3). Values that are single lookups, not sums (e.g.
raw CN), are exempt per the steering rule's own carve-out.

---

## Advisor boundary (`src/logic/guided-cast/steps.ts`)

`CastAdvisorSource.describe(step, ctx)` returns `CastStepInfo | Promise<CastStepInfo>`,
the **same sync/async-union contract** as `TurnAdvisorSource.describe` /
`SuggestionSource.getSuggestions`. v1 ships only the synchronous, deterministic
`defaultCastAdvisor` object; the overlay depends on the **object**, never on the bare
function, so a future offline LLM advisor is a non-breaking swap (FR-6). `describe`
makes **no** network/LLM/telemetry call; no new runtime dependency is added. `ctx`
carries only local, offline data (e.g. `{ isPetty: boolean; route: CastRoute }`) so copy
can adapt (e.g. hide the Channel rationale for Petty) without computing mechanics.

---

## Error handling & validation (concrete, per operation)

The guide performs no I/O, no network, and no mutation, so its failure surface is
narrow and entirely in-memory. Each case below names the failure, whether it is
recoverable, what the caller receives, and logging.

- **Advisor returns a Promise (unexpected async in v1).** The overlay unwraps with
  `info instanceof Promise ? null : info` and renders **no copy** for that step (the
  surface controls still render). Recoverable; the caller (overlay) receives `null` and
  degrades gracefully. Not logged (matches `GuidedTurnPanel`). A unit test asserts the
  default advisor's return is never a Promise (AC-14).
- **`goto` to an inapplicable/unknown step.** The reducer returns `state` unchanged
  (no-op). Recoverable; non-fatal; not logged. Property-tested.
- **`next`/`back` at a boundary.** Clamped (idempotent). Recoverable; not logged.
- **`castResolved` with a malformed/absent result.** The event type requires a
  `CastingResult`; the reducer stores whatever it is given and reads flags defensively
  (`!!r && r.castSuccess`). If `result` is `null`, conditional steps are simply
  unreachable (Overcast/Miscast filtered out). Recoverable; non-fatal.
- **Spell un-memorized or character loses the talent mid-flow.** Eligibility uses the
  panel's existing predicates (`hasSpellcastingTalent`, `spell.memorized`). If the bound
  spell disappears from `memorizedSpells`, the panel dispatches `reset` and closes the
  overlay (same reset-boundary discipline as the combat-turn guide closing on END
  COMBAT). Recoverable; non-fatal.
- **End-Turn / dialog DOM not present (e.g. jsdom).** The handle methods delegate to
  existing panel functions that already guard optional DOM (`scrollIntoView?.`). No new
  guard needed.

Validation of external inputs: the only player-provided numeric input in the whole flow
is the d100 (and opponent values) entered in `RollDialog`, which the **existing** dialog
already validates (1–100, with `manualError`). The guide adds no new input field, so it
inherits that validation (NFR-1). The spell's `cn` string is parsed by the existing
`parseInt(spell.cn, 10) || 0` the panel/logic already use.

**Invariant ownership.** "No mechanic is computed outside `spell-casting.ts` /
`dice-roller.ts`" is enforced at the **guide layer**: the reducer and step components
import only *types* and *read-only* values from those modules and the stored
`CastingResult`; they call no arithmetic of their own. "No persisted casting state" is
enforced by keeping `GuidedCastState` in a `useReducer` local to the panel (never
written to the character or storage) and dispatching `reset` on close/spell-change
(FR-9).

---

## Reset boundaries (FR-9.2)

The flow resets to `initialGuidedCastState` when:

- the overlay closes (`onClose` dispatches `reset`), and
- the selected spell changes (`start` with a different `spellName` replaces the flow; a
  `reset` is also dispatched if the bound spell leaves `memorizedSpells`).

No `reset` is tied to combat round/turn (unlike the combat-turn guide) because
spellcasting is not combat-scoped; a cast attempt is a self-contained flow.

---

## Testability

**Pure reducer — unit + property (Vitest + `fast-check`), mirroring
`src/logic/combat-turn/__tests__/`:**

- `reducer.test.ts`: `next`/`back` move over the **applicable subset** and clamp at
  its boundaries (not `STEP_SEQUENCE`); `next` from `resolve` lands on `overcast` when
  applicable else `outcome`; `goto` to an inapplicable step is a no-op; `chooseRoute`
  sets `route` without touching the character/step-mutation flags; `castResolved`
  stores the result, resets `overcastDone`/`miscastDone`/`overcastAllocations`, and
  **clamps `step` to the nearest applicable step** when a re-resolve makes the current
  step inapplicable (e.g. on `overcast` → re-resolve zeroes `overcastSlots` → clamps to
  `resolve`); `overcastResolved` stores allocations + sets `overcastDone` without
  changing `step`; `miscastCompleted` never changes `step`; `applicableSteps` includes
  `overcast` iff `castSuccess && overcastSlots > 0` and `miscast` iff a trigger flag is
  set.
- `reducer.property.test.ts` (ported from the combat-turn property suite):
  (1) `step` is always a member of `STEP_SEQUENCE` after any event sequence;
  (1b) `step` is always a member of `applicableSteps(state)` after any event sequence
       (no step ever points at a filtered-out value — finding 4);
  (2) `next` then `back` round-trips from any interior applicable step (over the
      applicable subset, not `STEP_SEQUENCE` — finding 4);
  (3) `reset` from any state deep-equals `initialGuidedCastState`;
  (4) `overcastResolved`/`miscastCompleted` never change `step`;
  (5) the reducer never throws on a frozen input (no mutation);
  (6) it is a pure function of `(state, event)` (same inputs → deeply-equal output).
  `fast-check` arbitraries cover every `CastStep`, `CastRoute`, and a representative set
  of `CastingResult` flag combinations.
- `steps.test.ts`: `defaultCastAdvisor.describe(step, ctx)` returns a non-Promise for
  every step (AC-14) and the `citation` strings match the exact rulebook pages above
  (AC-15); no step copy contains an invented TN/cost.

**Overlay + steps — component/integration (`@testing-library/react`):**

- Default-off: `SpellCastingPanel` with no `guideHandleRef`/`onCastResolved` renders
  identically to today plus exactly one opt-in trigger per memorized row (AC-1); a
  snapshot/DOM assertion guards no other change.
- Opening the guide shows Step 1 with the casting-target total equal to
  `computeCastingTarget(character)` and a tooltip whose lines sum to it (AC-2).
- Step 2 offers Cast+Channel for non-Petty and Cast-only for Petty (AC-3); citations
  present.
- Cast route opens the existing `RollDialog` (assert dialog title "Language (Magick)"
  and base target); the guide renders no dice (AC-5). After a seeded roll (via the
  dialog's `diceEntryMode="manual"` test affordance), Step 3 shows SL/CN/flags from the
  result (AC-6).
- Critical-choice surface: with `result.isCriticalCast` (the **same** gate
  `CastResultDisplay` uses — **no** `castSuccess` requirement), Step 3 renders the
  three choice buttons. A dedicated test asserts the choice buttons render in the
  **passed-but-under-CN critical** case (`isCriticalCast === true`,
  `castSuccess === false`), proving the guide does not drop the RAW-mandated choice
  and matches the panel (this-pass finding 1). Choosing **Total Power** fires
  `onCastResolved` with a re-resolved result whose `overcastSlots`/`surplusSL`
  reflect the added tens digit (so Step 4 becomes/stays applicable), and choosing
  **Unstoppable Force** re-resolves to `isUndispellable: true` as shown in Step 6
  (assert the guide's stored `result` is refreshed at the 2nd/3rd
  `setCastingResult` site, not left stale). Choosing **Critical Wound** does **not**
  fire `onCastResolved` and leaves the stored `result` unchanged (this-pass
  finding 5 — the display-only branch).
- Overlay layering (this-pass finding 3): while the guide overlay is open, assert that
  **no** `CastResultDisplay` overlay (`role="dialog" aria-label="Cast Result"`) is in
  the DOM — exactly one `aria-modal` dialog (the guide) is present — and that the
  `OvercastAllocator` buttons (Step 4) and the miscast/escalation buttons (Step 5) are
  reachable via the guide's Tab focus trap (focusable-elements query includes them). A
  backdrop click on the guide dispatches `reset` and closes the guide, restoring focus
  to the trigger.
- Overcast step appears only when `castSuccess && overcastSlots > 0`, renders the
  existing allocator (hosted in-body) with `availableSlots = state.result.overcastSlots`,
  shows thresholds + budget tooltip, and disables self/touch columns (AC-7, AC-8). A
  dedicated test (this-pass finding 4) asserts that after a Step-3 **Total Power**
  re-resolve raises `overcastSlots`, the allocator's `availableSlots` **updates** to
  the new budget on re-render (proving Step 4 reads from the current `state.result`,
  not a stale snapshot), and that the overcast-budget tooltip's breakdown line
  (`SL … + Total Power tens … − CN … = surplus …`) sums to the new `overcastSlots`
  (this-pass finding 2). Confirming the allocator fires
  `onOvercastResolved` (not `onOvercastAllocated`), the `CastResultDisplay` stays
  mounted (result not nulled), the host dispatches `overcastResolved`, and Step 6 shows
  the chosen effects resolved via `resolveOvercastAllocations`/`lookupOvercastEffect`
  (finding 1).
- Default-off regression for the capture seam: with no `onOvercastResolved`, confirming
  the allocator still nulls the result and closes exactly as today (finding 1/8 — the
  optional prop's absence preserves current behaviour).
- Miscast step appears only when a trigger fires, states the cited reason, and rolls via
  the existing path (AC-9); the miscast d100 comes from the panel's existing
  `handleMiscastRoll` (`Math.random()`), not `RollDialog` (finding 2 — a test asserts
  no `RollDialog` opens for the miscast roll).
- Accessibility: `role="dialog"` + `aria-modal`, focus-on-open/step-change,
  focus-restore-on-close, Esc/backdrop close, stepper `aria-current="step"`, Arrow-key
  nav, live region — assert with the same queries as `GuidedTurnPanel.test.tsx` (AC-16).
- Regression: existing `SpellCastingPanel.gating`, `SpellCastingPanel.damage`,
  `CastResultDisplay.damage`, and the combat-turn/assistant suites stay green unchanged
  (NFR-1, AC-17).

**What is unit- vs integration-tested.** The reducer/advisor are pure and
unit/property-tested in isolation. The hand-off (handle calls, `onCastResolved`
read-back, conditional-step reachability driven by a real `CastingResult`) is
integration-tested through `SpellCastingPanel` + `GuidedCastPanel` together, because the
value of the seam is precisely that the guide reflects the panel's real output rather
than a mock.

---

## Scope (v1)

In scope: standard **Arcane and Petty Magic** casting the existing panel already handles
(the `Language (Magick)` procedure), including the existing channelling, overcast, and
miscast flows. **Bless / Invoke** appear only insofar as the existing panel already
casts them with no new logic (see OQ-2 — pending confirmation).

Out of scope (deferred with citations):

- **Ritual Magic** — a separate extended procedure (ingredients, extended tests, time);
  not the standard Casting Test. Core Chapter 8 treats rituals separately; excluded
  (FR-7.3). Deferred.
- **Exotic / non-standard lores, Dark Magic, and Chaos tongues** — any casting that is
  not the standard `Language (Magick)` Arcane/Petty procedure. Winds of Magic §"Dark
  Lores" / Malignant Influences note Dark-magic specifics the existing logic does not
  model; excluded. Deferred.
- **New casting/channelling/overcast/miscast mechanics or tables** — none added.
- **New persisted state**, **any backend/network/LLM/telemetry**, and **dispel /
  prayer-specific miscast variants / vortex procedures** beyond what the panel already
  covers.

---

## Open Questions (flagged, not decided)

These mirror the requirements' Open Questions and are **not** resolved in the design
because resolving them would either invent a mechanic or change ruleset scope:

- **OQ-1 — Overcast ruleset.** The design cites **Core p.238 as superseded by the Winds
  of Magic Overcast Table**, matching existing `resolveCastingResult`/`OVERCAST_TABLE`
  behaviour. This relies on Winds of Magic being "in use." *Confirm.* If the Core
  "+2 SL per overcast" rule should be a toggle, that is a separate request.
- **OQ-2 — Bless / Invoke in Step 2.** Divine casting differs from Arcane in the
  rulebooks. FR-7.3 limits v1 to what the existing panel handles with no new logic.
  *Confirm* whether Bless/Invoke should appear in the guide's Step 2 or be excluded from
  the guide entirely in v1.
- **OQ-3 — Malignant Influences / saturation.** Core **p.235-236** "Malignant
  Influences" (verified: body heading after the `_page_235` marker in
  `docs/WarhammerFantasyRoleplay4e.md`, but the Core index entry reads "Malignant
  Influences 236" and the cross-reference reads "page 236 for casting near Malignant
  Influences", so the authoritative page is **236**; the section spans the 235/236
  boundary) — a units-die 8 near a Corrupting Influence forces a Minor Miscast,
  escalating an existing Minor to Major — and the magic-saturation SL
  modifiers are **not** applied by `resolveCastingResult` today. The guide will
  **display them as cited context only** (no auto-apply), consistent with "no new
  mechanics." *Confirm* advisory-only is acceptable.
- **OQ-4 — `triggerMajorMiscast` source.** `resolveCastingResult` sets
  `triggerMajorMiscast = false` ("set later by UI for cascading chaos"). The guide
  reflects the Major path **only** through the existing `CastResultDisplay` escalation
  (`cascading_chaos` → Roll Major Miscast); it does not set the flag. *Confirm.*
- **OQ-5 — Channelled-cast overcast interaction.** Winds of Magic states channelled
  power may not be used to overcast, though reducing CN makes overcasting more likely.
  The guide presents Step 4 purely on the `overcastSlots` the existing function returns,
  with no extra guide-side restriction. *Confirm* no additional restriction is expected.
- **OQ-6 — Miscast / arcane-mark rolls bypass `RollDialog` (finding 2).** The brief's
  framing implies "all rolls go through the roll dialog," but the **existing** code the
  guide reuses rolls the **miscast** d100 (`handleMiscastRoll` → `Math.random()`) and
  the **arcane-mark** d10 (`CastResultDisplay` → `Math.random()`) directly, not via
  `RollDialog`. The guide **triggers** these existing handlers unchanged (routing a
  rewrite through `RollDialog` would violate NFR-1 "consume, don't rewrite existing
  components"). v1 therefore keeps the existing `Math.random()` miscast/arcane-mark
  rolls. *Confirm* this is acceptable, or raise "unify miscast/arcane-mark onto
  `RollDialog`" as a **separate** request (it would touch `SpellCastingPanel` /
  `CastResultDisplay` and their tests).

---

## Requirements traceability (spot)

- FR-1 (opt-in/off) → Decision 1 seam is optional; single per-row trigger; AC-1 test.
- FR-2 (six steps) → `STEP_SEQUENCE` + step components + §Step-by-step hand-off.
- FR-3 (route through existing) → Decision 2 (handle delegates to existing functions;
  casting/channelling via `RollDialog`, miscast/arcane-mark via existing
  `Math.random()` handlers — OQ-6).
- Critical-Cast choice → surfaced in Step 3 via existing `onCriticalChoice`, gated on
  `result.isCriticalCast` alone (mirrors `CastResultDisplay`; pass-2 finding 1);
  `total_power`/`unstoppable_force` re-resolve refreshes the stored result at the
  2nd/3rd seam site, while `critical_wound` is display-only and fires nothing
  (pass-2 finding 5).
- FR-4 (no auto-apply/advance) → reducer transitions are explicit player events; no
  timers; `castResolved` does not auto-advance.
- FR-5 (pure reducer) → `src/logic/guided-cast/reducer.ts` + property tests.
- FR-6 (advisor seam) → `CastAdvisorSource` sync/async-union; `defaultCastAdvisor`.
- FR-7 (citations/compliance) → §RAW procedure & citations; copy carries `citation`.
- FR-8 (tooltips) → §Calculated-total tooltips table.
- FR-9 (transient/local) → `useReducer` local to panel; `reset` boundaries; no persist.
- FR-10 (a11y) → `GuidedCastPanel` mirrors `GuidedTurnPanel` focus/ARIA/keyboard.
- NFR-1..5 → additive optional props; single source of truth; Vitest/fast-check/RTL;
  no new deps; synchronous in-memory only.

---

## Responses to design review — pass 1 (ten findings)

All ten findings in the first review were verified against source
(`SpellCastingPanel.tsx`, `CastResultDisplay.tsx`, `spell-casting.ts`,
`combat-turn/reducer.ts`, `GuidedTurnPanel.tsx`) and the rulebooks (`docs/`), then
addressed:

1. **HIGH — Step 6 overcast data source / close-on-confirm (addressed).** Chose the
   reviewer's *preferred* fix: added optional `onOvercastResolved(allocations)` to
   `SpellCastingPanel` + `CastResultDisplay`; when the guide supplies it,
   `handleOvercastAllocated` does **not** null the `CastingResult`, and the guide
   stores `overcastAllocations` in reducer state and resolves Step 6 effects via the
   existing `resolveOvercastAllocations`/`lookupOvercastEffect`. See §"The seam",
   Step 4/Step 6 hand-off, Changed-files table, and the new state field/event.
2. **HIGH — "every d100 via RollDialog" false (addressed).** Corrected the Overview
   and Decision 2 to scope `RollDialog` to casting/channelling only, acknowledged the
   miscast d100 / arcane-mark d10 use the panel's existing `Math.random()` handlers,
   and added **OQ-6** flagging the tension with the "all rolls via `RollDialog`"
   framing (unifying them is out of scope per NFR-1).
3. **MEDIUM — casting-target tooltip recompute (addressed).** Chose fix (a): add a pure
   `computeCastingTargetBreakdown(character)` helper in `spell-casting.ts` returning
   `{ intTotal, advances, total }`; `computeCastingTarget` now delegates to it
   (non-behavioural refactor). Tooltip reads both number and parts from the single
   source. Overcast-budget row restates the already-stored `overcastSlots`/`cn`/`sl`
   off the `CastingResult` (read-only, no second calculation). Changed-files table and
   tooltips table updated.
4. **MEDIUM — applicable-step navigation under-specified (addressed).** Added a
   concrete reducer algorithm: `applicableIndex`, `next`/`back` indexing into
   `applicableSteps(state)` with clamping, `GuidedCastPanel` deriving
   `isFirst`/`isLast` from the applicable subset (not `STEP_SEQUENCE`), and a
   clamp-to-nearest-applicable rule in `castResolved` when the current step becomes
   inapplicable. Added property-test invariant (1b) and reducer tests.
5. **MEDIUM — `onCastResolved` fires at three sites (addressed).** §"The seam" now
   states explicitly that `onCastResolved` fires at all **three** non-null
   `setCastingResult(...)` sites (initial resolve + both `handleCriticalChoice`
   re-resolves), with a test asserting Total-Power updates `overcastSlots`/`surplusSL`
   and Unstoppable-Force updates `isUndispellable` as reflected in Steps 4/6.
6. **MEDIUM — Critical-Cast choice had no step (addressed).** Surfaced the existing
   Critical/Total-Power/Unstoppable-Force choice buttons in **Step 3** via
   `onChooseCritical` → `handle.chooseCritical` → existing `handleCriticalChoice`.
   Added to the hand-off, the `ResolveStep` file, the handle interface, the panel
   props, tests, and traceability, with the Core p.234 / WoM §"Critical Casting"
   citation. *(The gate originally proposed here, `isCriticalCast && castSuccess`, was
   corrected to `isCriticalCast` alone in pass 2 — see pass-2 finding 1 below.)*
7. **NIT — `MagicSaturation` import source + default (addressed).** Named the import
   (`../../types/character`) and specified the prop is resolved with the same
   `?? 'normal'` default the panel uses, so `undefined` never leaks into the advisor
   `ctx`.
8. **NIT — "no changes to `CastResultDisplay.tsx`" conflict (addressed).** Updated the
   New-&-changed-files table to list `CastResultDisplay.tsx` as gaining the optional
   `onOvercastResolved` prop (matching the finding-1 resolution); reconciled the
   unchanged-files statement.
9. **NIT — Petty detection duplicated (addressed).** Added a shared pure
   `isPettySpell(spell)` predicate in `spell-casting.ts`, threaded `isPetty` through
   the advisor `ctx`, and noted `CompactSpellRow` may optionally be refactored to use
   it.
10. **NIT — imprecise overcast/channelling pages (addressed).** Dropped the `~`:
    confirmed the WoM **Overcast Table is p.23** (cross-referenced by the supplement's
    own "see page 23" and index), and cited Core Channelling as **p.237** (ToC +
    body heading) and Core Overcasting as **p.238** (ToC).

No pass-1 finding was backlogged or ignored. OQ-1..OQ-5 remain user-confirmation items
(unchanged); OQ-6 was added in pass 1 (its finding 2). The additive, optional-prop
approach keeps all existing tests green unchanged (NFR-1).

## Responses to design review — pass 2 (`design-review.json`)

The second review returned `CHANGES_REQUESTED` with six findings (1 HIGH, 3 MEDIUM,
2 NIT). Each was re-verified against source (`CastResultDisplay.tsx`,
`SpellCastingPanel.tsx`, `spell-casting.ts`, `dice-roller.ts`) and resolved:

1. **HIGH — Critical-Cast choice gate `isCriticalCast && castSuccess` diverged from RAW
   and from `CastResultDisplay` (addressed).** Verified: `dice-roller.ts`
   `isCritical = passed && double` (a Critical already implies a passed Language
   (Magick) Test), while `castSuccess = totalPower || slAchieved >= cn` is a different
   condition — a passed-but-under-CN critical is reachable — and the existing
   `CastResultDisplay` gates the three buttons on `isCriticalCast` **alone**. Changed
   the guide's Step-3 choice gate from `isCriticalCast && castSuccess` to
   **`result.isCriticalCast` only**, mirroring the component and the RAW
   ("successful Casting Test" = passed test; Core p.234, WoM §"Critical Casting").
   Updated the `ResolveStep` file row, the Step-3 hand-off prose (with citations and
   the dice-roller reasoning), and the test plan (a test now asserts the choice renders
   in the passed-but-under-CN critical case). The Step-5 Minor-Miscast gate was already
   correct and independent and is unchanged.
2. **MEDIUM — Overcast-budget tooltip did not sum under Total Power (addressed).**
   Verified: `overcastSlots = max(0, slAchieved + tensDigit(roll) − cn)` under Total
   Power, so `slAchieved − cn ≠ overcastSlots`. Added a pure
   `computeOvercastBudgetBreakdown(result)` helper to `spell-casting.ts` that exposes
   `totalPowerTens = max(0, overcastSlots + cn − slAchieved)` as data (no re-derivation
   of `tensDigit(roll)`), and changed the Step-4 breakdown line to
   `SL … + Total Power tens … − CN … = surplus …` so it sums in both the normal and
   Total-Power cases. Updated the tooltips table, the tooltip prose, the Changed-files
   `spell-casting.ts` row (with the WoM §"Critical Casting" / p.23 Overcast Table
   citation), and the test plan.
3. **MEDIUM — `CastResultDisplay` overcast render guard still required
   `onOvercastAllocated` (addressed).** Verified the guard is
   `overcastSlots > 0 && castSuccess && onOvercastAllocated`. Chose fix (a): **widen
   the guard** to `… && (onOvercastAllocated || onOvercastResolved)` so the allocator
   renders on the guide path that supplies only the capture callback. Updated the
   `CastResultDisplay.tsx` Changed-files row, §"The seam", the Step-4 hand-off, and
   added a default-off regression test (only-`onOvercastAllocated` closes as today;
   only-`onOvercastResolved` renders and captures without nulling the result).
4. **MEDIUM — Step-4 `availableSlots` could go stale after a Total-Power re-resolve
   (addressed).** Specified that Step 4 reads
   **`availableSlots = state.result.overcastSlots` from the current reducer state on
   every render** (never a snapshot), and added a test asserting the allocator's
   `availableSlots` updates after a Total-Power re-resolve raises the budget.
5. **NIT — `critical_wound` is display-only and must not fire `onCastResolved`
   (addressed).** Verified `handleCriticalChoice`'s `critical_wound` branch does not
   call `setCastingResult`. Added a sentence to §"The seam" stating the branch is
   display-only, deliberately leaves the stored `result` unchanged, and must **not**
   fire `onCastResolved`; added a corresponding test assertion.
6. **NIT — Step-2 Petty citation wording (addressed).** Reworded the citation copy to
   "Petty spells have CN 0 or no CN ("-")", matching the `isPettySpell` predicate
   (`spell.cn === '0' || spell.cn === '-'`).

No pass-2 finding was backlogged or ignored. All pass-2 fixes remain within the
additive, optional-prop, single-source-of-truth approach (NFR-1/NFR-2): the only new
code is one additional pure helper in `spell-casting.ts`, one widened (strictly
additive) render guard in `CastResultDisplay.tsx`, and a corrected gate/citation in the
guide — no existing behaviour changes on the default (guide-off) path, so existing
tests stay green unchanged. OQ-1..OQ-6 are unchanged.

## Responses to design review — pass 3 (`design-review.json`)

The third review returned `CHANGES_REQUESTED` with five findings (0 HIGH, 2 MEDIUM,
3 NIT). Each was re-verified against source (`docs/windsofmagic.md`,
`docs/WarhammerFantasyRoleplay4e.md`, `CastResultDisplay.tsx`, `SpellCastingPanel.tsx`)
and resolved:

1. **NIT — "Winds of Magic p.19" for Total Power is unverifiable (addressed).**
   Verified the mechanic in `docs/windsofmagic.md` §"Critical Casting"
   (line 511: *"Total Power: … add the tens digit of their casting roll to their SL for
   the purpose of Overcasting (see page 23)."*); no `p.19` marker exists in the
   supplement. Changed both citations (the `computeOvercastBudgetBreakdown` comment in
   the Changed-files row and the tooltip prose) to the source-anchored form
   `// Winds of Magic §"Critical Casting" (Total Power) — … (see WoM p.23 Overcast
   Table)`, keeping p.23 only for the Overcast Table (the one page the supplement's own
   cross-reference confirms). Updated the pass-2 response note accordingly.
2. **NIT — Malignant Influences cited as p.235; index says p.236 (addressed).**
   Verified: the body heading `# Malignant Influences` follows the `_page_235` image
   marker, but the Core index reads "Malignant Influences 236" and the cross-reference
   reads "page 236 for casting near Malignant Influences". Rewrote OQ-3 to cite it as
   **Core p.235-236** (authoritative page 236, section spanning the 235/236 boundary)
   and corrected the source attribution from "Winds of Magic §Malignant Influences" to
   Core.
3. **MEDIUM — two stacked `role=dialog` overlays unspecified for focus/ARIA/backdrop
   (addressed).** Added a new §"Overlay layering" section. Verified `CastResultDisplay`
   is itself a full-screen `role="dialog"` overlay with a backdrop-close handler.
   Decided (option B) that **on the guide path `CastResultDisplay` is not mounted**; the
   guide hosts the **same existing** `OvercastAllocator` / miscast / escalation
   components inside its own single `aria-modal` dialog body, wired to the same panel
   handlers. Stated the three invariants: (a) exactly one `aria-modal` dialog active,
   (b) the guide's focus trap includes the allocator/miscast controls (keyboard
   reachable), (c) a guide backdrop click dispatches `reset` and closes the guide
   (no second backdrop). Added a `guideActive` suppression note to the
   `SpellCastingPanel.tsx` Changed-files row, reconciled the `CastResultDisplay.tsx`
   row and the Step-4/Step-5 hand-off prose, and added an overlay-layering integration
   test.
4. **MEDIUM — `getLatestResult()` read-back timing vs React state unspecified
   (addressed).** Removed `getLatestResult()` from the `SpellCastingGuideHandle`
   entirely and documented that the result reaches the guide **only** via the push
   callback `onCastResolved`, which fires synchronously at the `setCastingResult(...)`
   call sites (no staleness window). Added an explicit §"The seam" paragraph naming
   `onCastResolved` as the single authoritative read path and stating the reducer's
   `result` is never sourced from a handle read; updated the handle interface and the
   `SpellCastingPanel.tsx` Changed-files row.
5. **NIT — Step-2 Channel-gate citation attributed the Petty rule to Core p.234
   (addressed).** Separated the mechanical cite from the app convention in Step 2: Core
   p.234 for the Casting Test / CN comparison, Winds of Magic §"Channelling Test" for
   CN reduction, and described the Petty-no-channel gate as an **app consequence** of
   the `isPettySpell` predicate (CN 0/'-' has nothing to channel) rather than a p.234
   rule.

No pass-3 finding was backlogged or ignored. All fixes are documentation/citation
precision plus one architectural clarification (overlay hosting) and one seam
simplification (dropping the pull read-back) — all within the existing additive,
single-`aria-modal`, single-source-of-truth approach. No new runtime dependency, no new
mechanic, and no change to the default (guide-off) path; existing tests stay green
unchanged (NFR-1). OQ-1..OQ-6 are unchanged.
