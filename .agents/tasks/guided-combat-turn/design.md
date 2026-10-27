# Guided Combat Turn Walkthrough — Technical Design

## Overview

The Guided Combat Turn Walkthrough ("the guide") is an **opt-in co-pilot** that
walks the sheet owner through one WFRP 4e combat turn. It **suggests and
explains**; the player decides and acts. It never auto-applies state, never
auto-advances a step, and performs **no mutation of its own** — every state
change it leads the player toward is executed by an existing, already-shipped
handler: `AttackFlow`, the shared `RollDialog` seeded via the existing reminder
path, the condition picker (`onOpenConditionPicker`), the End Turn button +
`processEndOfTurn` + `EndOfTurnReportModal`, and the round/initiative controls
(`onUpdateRound` / `InitiativeTracker`).

The guide is a **thin orchestration layer over a pure turn-state helper**,
mirroring the architecture already shipped for the Character Assistant
(`src/logic/assistant/*` pure engine behind a `SuggestionSource` boundary) and
the proactive reminders (`src/logic/reminders.ts` pure derivation feeding a thin
`CombatReminders` UI). It does **not** reimplement attack resolution, damage
math, end-of-turn processing, or reminder derivation. It reads existing combat
state (`combatState`, `conditions`, `advantage`, `wCur`, …) and reuses existing
mutators.

Concretely, the guide is a **new dockable overlay panel** mounted inside
`CombatPage`, driven by a **pure turn-state reducer** (`src/logic/combat-turn/`)
that is unit- and property-testable in isolation. The panel coexists with the
existing Attack / Defend / Status segmented control and START/END COMBAT; it does
not replace or restyle any of them. When closed (the default), the Combat page is
byte-for-byte the UI that ships today.

### Technology stack (locked once approved)

- **TypeScript + React 18** function components + hooks — matching the codebase.
- **CSS Modules** (`*.module.css`) for all styling, matching
  `CombatDashboard.module.css` / `AttackFlow.module.css` / the Assistant panel.
- **`createPortal` into `document.body`** for the overlay container, matching
  `CommandPalette`, `Tooltip`, and `AssistantPanel`.
- **`lucide-react`** icons (`Compass` for the trigger; `Check` for "mark done";
  `ChevronLeft`/`ChevronRight` for step navigation).
- **Vitest + `fast-check`** for the pure reducer's property tests;
  **`@testing-library/react`** for the component/integration tests — matching the
  `reminders.ts` / assistant / command-palette precedent.
- **No new runtime dependencies. No network, backend, telemetry, or LLM code.**

---

## RAW turn structure the guide models (rulebook-verified)

All citations below were read directly in `docs/WarhammerFantasyRoleplay4e.md`
for this design. The Core page numbers come from the book's own section headings
and Table of Contents (the TOC pins "Taking Your Turn" to **p.157**; the **Move**
and **Action** subheadings span **p.156–157**).

- **Turn = one Move + one Action, either order, either skippable.** Verbatim
  (Core p.156–157, "Taking Your Turn", TOC-pinned p.157): *"On your Turn you have
  a Move and an Action, you can take these in any order … You can also skip taking
  an Action or Move, though you won't get another opportunity until the next
  Round!"* This is the sole hard structure the guide reflects, and it is
  explicitly **not** a gate (either or both may be skipped).
- **Move options (Core p.156–157).** Use your Movement characteristic as a guide;
  *"you can also use your Move to Charge into close combat, gaining +1 Advantage
  (see page 164)."* A Move that needs a Skill Test (Climb, Athletics) *"will also
  use your Action."* Detailed movement is **Moving**, Core p.164. The guide renders
  the Charge mention as **`Core p.156–157 (Advantage p.164)`** to match the book's
  own cross-reference (the +1 sits in the Move subsection; its Advantage effect is
  defined on p.164).
- **Action options (Core p.157).** The Action *"is only limited by your
  imagination"*; the book names attacking (→ **Attacking**, Core p.157–158),
  prayers/magic (Chapters 7–8), using a Skill (Chapter 4), and the boxed option
  **On The Defensive**: *"As your Action, choose a Skill to use defensively and
  you will get +20 to defensive Tests using the Skill until the start of your next
  Turn."* (Core p.157).
- **Free Actions (Core p.157).** *"Some things … won't count as your Action …
  such as shouting a warning, drawing your weapon, or drinking a potion. It's the
  GM's decision … A good general guide is that if an act requires you to make a
  Test, it is an Action rather than a Free Action."* GM-adjudicated — no
  deterministic list.
- **Default Combat Difficulty (Core p.157).** *"During combat, all Difficulty is
  assumed to be Challenging (+0)."* This is why every seeded reminder roll (via
  the existing path) defaults to Challenging.
- **Advantage / Losing Advantage (Core p.164).** *"Each Advantage you secure adds
  +10 to any appropriate combat Test or Psychology Test."* And: *"If you lose an
  Opposed Test during combat, suffer any Conditions (see page 167), or lose any
  Wounds, you automatically lose all Advantage. Further, should the combat end,
  all Advantage you've gained is lost … Advantage can also be used to Disengage
  from combat (see page 165)."*
- **End-of-Round / end-of-turn condition timing (Core p.167–169, Master Condition
  List).** Bleeding/Ablaze/Poisoned damage, Stunned (Challenging +0 Endurance
  Test), Surprised (auto-remove), Blinded/Deafened (every other Round),
  Broken (Cool Test). These are **already computed** by `processEndOfTurn` and
  surfaced by `EndOfTurnReportModal`; the guide must not recompute them.

### Discrete steps modelled, and which are mandatory vs optional

The guide presents **four ordered steps**. None of the player's *choices* within
a step is mandatory (RAW allows skipping Move and/or Action); "mandatory" below
means only that the step is **always shown in the sequence**, not that it forces
an action.

| # | Step | Shown always? | Player choice within |
|---|------|---------------|----------------------|
| 1 | **Start of turn — checks due** | Yes | Optional: roll/clear any surfaced reminder, or none |
| 2 | **Choose Move and/or Action** | Yes | Optional: pick Attack / Cast-Pray / Defend-other / Skill, in either order, or skip |
| 3 | **Resolve the chosen Action** | Yes (may be a no-op the player skips past) | Resolution happens entirely inside the existing control |
| 4 | **End of turn** | Yes | Optional: press the existing End Turn button, then confirm/cancel in the modal |

Steps 1 and 4 are "always shown" framing steps that **surface existing output**
(reminders; end-of-turn effects) without computing anything new. Steps 2 and 3
are the Move/Action body and are explicitly skippable per Core p.156–157.

---

## Design decision 1 — Where the walkthrough lives (chosen: new opt-in overlay panel)

Three options were viable:

- **(A) A new overlay/stepper panel on the Combat page** mounted alongside the
  segmented control.
- **(B) A fourth "Guide" mode** of the existing Attack/Defend/Status segmented
  control.
- **(C) An assistant-driven flow** emitting `Suggestion`s through
  `src/logic/assistant/*`.

**Chosen: (A), a new opt-in overlay panel**, because it is the least-intrusive
option that satisfies FR-1 (off by default, dismissible, existing UI visually
unchanged when off) **and** AC-3 (no changed DOM contract for existing tests).

- Option (B) was rejected: adding a fourth segment mutates the existing
  `role="tablist"` DOM and the `CombatMode` union, breaking the "existing combat
  UI renders exactly as before / no changed DOM contract" guarantee (AC-3,
  NFR-5). It would also force the guide to *be* a mode rather than *coexist* with
  modes, whereas the guide must drive the player **into** Attack mode (Step 2 →
  AttackFlow) — a mode cannot cleanly hand off to a sibling mode.
- Option (C) was rejected as the primary surface: the Assistant is a
  **consolidated, context-ordered list** of independent nudges, not an **ordered,
  player-advanced sequence** with per-step framing. Forcing a strict 4-step
  ordered walkthrough through the unordered `Suggestion[]` model would distort
  that boundary. The guide is its own **focused UI**. See Decision 2 for how it
  nonetheless reuses the Assistant's reminder adapter *data*, and keeps the
  `SuggestionSource` boundary intact and future-proof.

The panel is rendered by `CombatPage` (which already owns all the handlers the
guide needs to reference) and presented via `createPortal` as a right-side
slide-over on desktop / bottom sheet on mobile, using the existing
`useMediaQuery('(max-width: 767px)')` convention and the same portal + focus
pattern as `CommandPalette` / `AssistantPanel`.

**Opt-in affordance placement (FR-4 / FR-1).** A single **"Guide my turn"**
trigger button is rendered **inside the existing Attack/Defend/Status segmented
control's sticky container, as a trailing element after the three segments** (not
a fourth tab — a separate button with its own `aria-label`, outside the
`role="tablist"`). It is rendered **only when `inCombat === true`** (AC-2) and is
visible whenever the guide is closed (AC-1). This keeps the affordance where the
player's eyes already are for turn flow, without touching the tablist DOM. On
mobile where the segmented control is compact, the trigger collapses to an
icon-only `Compass` button with an `aria-label`.

---

## Design decision 2 — Suggestion boundary (chosen: own focused UI, reuse reminder data, keep `SuggestionSource` future-proof)

The guide is its **own focused UI** (not an emitter of assistant `Suggestion`s),
but it must not fork reminder derivation (NFR-2) and must keep the future-proof
source boundary intact (FR-7, AC-18).

- **Step 1 reminders** are obtained by calling the **existing**
  `deriveAllReminders(...)` from `src/logic/reminders.ts` — the exact call
  `CombatDashboard` already makes — producing `CombatReminder[]` (with `label`,
  `description`, `test`, `citation`). The guide renders the **same items in the
  same order** (AC-5) and derives nothing of its own.
- **Roll hand-off** reuses the existing seeded-roll path. The guide does not own
  a `RollDialog`; it calls a handler threaded from `CombatPage` that mirrors
  `CombatDashboard.handleRollReminder` (resolve `test.def → baseTarget` via
  `resolveReminderBaseTarget`, pass `test.difficulty` through). No new roll logic
  (AC-6, FR-6).
- **`SuggestionSource` boundary (FR-7 / AC-18).** The guide does **not** add a new
  source, and it does **not** remove or narrow the existing
  `SuggestionSource` interface in `src/logic/assistant/types.ts`. That interface
  already returns `Suggestion[] | Promise<Suggestion[]>` and remains the single
  forward-compatible seam for a future async/LLM source. The guide's own step
  content comes from the **pure synchronous** `combat-turn` reducer (below); it
  ships no async code and makes no network/LLM call. To keep the boundary honest
  and *ready* for a future LLM-backed step-advisor without building one now, the
  reducer's "advice" strings are produced by a small internal
  `TurnAdvisorSource`-shaped function that is **synchronous-by-default and has the
  same sync/async-union return contract** as `SuggestionSource`, so a later async
  advisor is a non-breaking swap. No such async advisor exists in v1, and the
  default is the permanent offline fallback.

This satisfies "emits assistant suggestions vs own focused UI": **own focused
UI**, consuming the existing reminder *data* and preserving the existing
`SuggestionSource` seam untouched.

---

## Design decision 3 — Step hand-offs to existing controls

The guide **points at** and **reveals** existing controls; it never wraps or
intercepts their internals. Hand-off is by (a) switching the host's `combatMode`
where the control lives in a mode panel, and (b) scrolling/focusing the relevant
existing section. The guide stays mounted (as an overlay) so the player can
return to it.

- **Step 1 → reminders + rolls.** The guide lists the `deriveAllReminders` items.
  A roll-backed reminder's button calls the threaded
  `onGuideRollReminder(reminder)` handler (= the existing `handleRollReminder`
  behaviour lifted to `CombatPage` so both the dashboard and the guide share it;
  see "Shared extraction" below). The shared `RollDialog` opens seeded; the guide
  rolls nothing itself. Informational reminders (no `test`) are shown as text with
  their `citation` and no button.
- **Step 2 → option categories, each wired to a real control.**
  - **Attack** → `onGuideChooseAttack()`: sets `combatMode = 'attack'` on the host
    (the Attack-mode panel containing `AttackFlow` is already kept mounted and
    CSS-hidden across modes — see `CombatPage`), then scrolls the Attack Flow
    section into view and focuses its first control. Control is fully handed to
    `AttackFlow`; the guide does not re-implement or intercept its steps (AC-8).
  - **Cast / Pray** → `onGuideChooseCast()`: sets `combatMode = 'status'` (where
    `SpellCastingPanel` renders when `hasSpellcasting`) and reveals it. The guide's
    Cast option uses **`CombatPage`'s existing `hasSpellcasting` flag**
    (`CombatPage.tsx` ~lines 215–218: spells present / `Magic|Pray|Invoke` talent /
    `Channelling`|`Language (Magick)` skill) for enable/disable — so the option
    appears exactly when the `SpellCastingPanel` would render in Status mode. When
    that flag is false the option renders **disabled** with an explanatory tooltip
    (no invented capability). The panel's own `hasSpellcastingTalent(character)`
    gating continues to govern whether its Cast/Channel buttons are actually
    active; the guide does not duplicate or second-guess that gate.
  - **Defend / other** → `onGuideChooseDefend()`: sets `combatMode = 'defend'`
    (TakeDamagePanel / ArmourMap) for a defensive posture, **or** the player uses
    the plain Quick Roll / weapon roll already on the page for a Skill test. The
    guide names these and routes to them.
  - **On The Defensive** and **Disengage** are shown as **named, cited options**
    (Core p.157 and p.165 respectively) with guidance text only; per the
    Ambiguities they are **not** tracked or auto-applied in v1.
- **Step 3 → resolution lives entirely in the existing control.** For an attack,
  the player completes weapon → to-hit → hit location → damage → consequences
  **inside `AttackFlow`**. The guide shows a short "resolve it in the Attack Flow"
  framing with the Core p.157–158 citation and a "Mark Action done" control; it
  reads nothing back out of `AttackFlow` and applies nothing (AC-9).
- **Step 4 → End Turn (chosen: reveal/focus the existing dashboard button, not a
  guide-owned button).** The End Turn flow — the button, its `handleEndTurn`
  click handler (which calls `processEndOfTurn`), `handleApplyEndOfTurn`,
  `handleCancelEndOfTurn`, and `<EndOfTurnReportModal>` — all live **inside
  `CombatDashboardFull`** (`CombatDashboard.tsx` ~lines 342–392, 805–828), and
  `CombatPage` only supplies the `onEndTurn(result)` *apply* callback as a prop.
  The guide is mounted by `CombatPage`, so it has **no** CombatPage-level End Turn
  handler to invoke. Rather than lift the dashboard's internals (which would
  modify the dashboard and break the "End Turn internals unmodified" guarantee),
  the guide **does not expose its own End Turn button**. Step 4 is framing text
  (end-of-turn condition effects may apply; pressing the existing End Turn button
  is the only way they are applied, cited Core p.167–169) plus a **"Go to End
  Turn"** control that **reveals and focuses the existing dashboard End Turn
  button** (`data-testid="end-turn-btn"`, already rendered on the page): it
  scrolls that button into view and calls `.focus()` on it. The player presses the
  **real** dashboard button; `handleEndTurn` runs `processEndOfTurn` and the
  dashboard's own `EndOfTurnReportModal` appears exactly as it does today. The
  player confirms (applies via the existing `onEndTurn` path:
  wounds/conditions/round advance) or cancels (no change). The guide touches no
  End Turn internals and computes none of these numbers (AC-10, AC-11). This is
  the "point at, don't wrap" rule applied literally: the dashboard DOM/handlers are
  byte-for-byte unchanged (AC-3, NFR-5).
- **Round / initiative.** Round advance happens through the existing End Turn
  apply path (`onEndTurn` → `combatState.currentRound = result.roundAdvanced`) and
  the `InitiativeTracker` "Next ▶" control. The guide does not advance the round
  itself.

### Tracking "I did a Move" vs "I did an Action" (guidance, not a gate)

The reducer holds two booleans, `moveUsed` and `actionUsed` (see Decision 5).
They are set **only by explicit player taps** ("Mark Move done" / "Mark Action
done", and implicitly offered after the player chooses an option in Step 2). They
are pure **guidance**: the guide may show an advisory note (e.g. *"You've marked
both your Move and Action used — RAW gives one of each per Turn (Core
p.156–157)"*, or the Core p.164 note that a Skill-Test Move also uses the Action),
but it **never disables** any option, never blocks advancing, and always lets the
player skip, reorder, or deviate (AC-13). No hand-off is conditioned on these
flags.

---

## Design decision 4 — Transient, local-only turn state and reset boundaries

Guide state is **transient and local to the overlay component / host**, held in
React state (via the reducer), and is **never persisted** beyond the combat/undo
state that already exists (FR-5, AC-14). No new fields are added to `Character` or
`CombatState`.

State held:
- `open: boolean` — guide open/closed (default `false`).
- `turn: TurnState` (from the reducer): `step`, `moveUsed`, `actionUsed`,
  `chosenOption` (for Step 2→3 framing only).

**Reset boundaries (all reset `turn` to its initial value; `open` is left to the
player except at END COMBAT where it is forced closed):**
- **Turn boundary** — when the active initiative turn changes. Detected by
  watching `character.activeInitiativeIndex` for a change (the value
  `InitiativeTracker`'s "Next ▶" mutates). A change resets `turn`.
- **Round boundary** — when `character.combatState.currentRound` changes
  (End Turn apply, or manual round +/−). Resets `turn`.
- **END COMBAT** — when `character.combatState.inCombat` transitions `true →
  false`. Resets `turn` **and** forces `open = false` and unmounts the panel (the
  trigger is already hidden when `!inCombat`, AC-2).

These are implemented with `useEffect`s keyed on those three existing values
(`activeInitiativeIndex`, `currentRound`, `inCombat`) — the same "react to an
external prop change" effect pattern `CombatDashboard` already uses. No new
persisted combat state is introduced (FR-5.3).

> **Edge case — concurrent round+turn change on End Turn.** End Turn advances the
> round (and the player then taps Next ▶ to advance the turn). Each triggers a
> reset independently; resetting an already-initial `turn` is idempotent, so a
> double reset is harmless. The reset effects are therefore order-independent.

> **Edge case — manual round rewind.** A player pressing round "−" also changes
> `currentRound` and resets the guide to Step 1. This is acceptable and
> consistent with "reset at round boundaries"; it is not a correctness issue
> because the guide holds no cumulative state worth preserving.

---

## Design decision 5 — The pure turn-state reducer (property-testable)

A new pure module `src/logic/combat-turn/` owns all turn-sequence logic. It is
**React-free, deterministic, and side-effect-free**, mirroring `reminders.ts` and
the assistant engine, so it is unit- and property-testable in isolation.

### Files

```
src/logic/combat-turn/
  types.ts        // TurnState, TurnStep, TurnEvent, TurnStepInfo, TurnAdvisorSource
  reducer.ts      // initialTurnState, turnReducer(state, event): TurnState
  steps.ts        // STEP_SEQUENCE + describeStep(step): TurnStepInfo (cited copy)
                  //   + defaultTurnAdvisor: TurnAdvisorSource = { describe: describeStep }
  __tests__/
    reducer.property.test.ts
    reducer.test.ts
    steps.test.ts
```

### Types and contract (`types.ts`)

```ts
/** The four RAW steps, in order (Core p.156–157). */
export type TurnStep = 'start' | 'choose' | 'resolve' | 'end';

/** Which Step-2 category the player picked (framing for Step 3 only). */
export type TurnOption = 'attack' | 'cast' | 'defend' | 'skill' | null;

/** Transient per-turn state. Plain data; JSON-serializable; no closures. */
export interface TurnState {
  step: TurnStep;
  moveUsed: boolean;     // guidance only — never gates (AC-13)
  actionUsed: boolean;   // guidance only — never gates (AC-13)
  chosenOption: TurnOption;
}

/**
 * Every transition is driven by an explicit player EVENT. There is no timer,
 * no auto-advance, and no event the UI dispatches without a user action
 * (AC-12). `reset` is dispatched by the turn/round/END-COMBAT effects.
 */
export type TurnEvent =
  | { kind: 'next' }                              // player: advance one step
  | { kind: 'back' }                              // player: go back one step
  | { kind: 'goto'; step: TurnStep }              // player: jump to a step
  | { kind: 'chooseOption'; option: TurnOption }  // player: picked a Step-2 option
  | { kind: 'markMove'; used: boolean }           // player: toggled "Move done"
  | { kind: 'markAction'; used: boolean }         // player: toggled "Action done"
  | { kind: 'reset' };                            // boundary: turn/round/END COMBAT

/** Static, rulebook-cited copy for a step. No runtime computation. */
export interface TurnStepInfo {
  step: TurnStep;
  title: string;
  /** Guidance prose (never gates). */
  body: string;
  /** Core page citation string, rendered in the step header. */
  citation: string;
}

/**
 * Future-proof advisor seam (FR-7). Synchronous-by-default with the SAME
 * sync/async union contract as assistant's SuggestionSource, so a future
 * LLM-backed advisor is a non-breaking swap. v1 ships only the deterministic
 * sync default; it makes no network/LLM call.
 */
export interface TurnAdvisorSource {
  describe(step: TurnStep, ctx: { inCombat: boolean }):
    | TurnStepInfo
    | Promise<TurnStepInfo>;
}
```

`steps.ts` provides the concrete default by **adapting the free `describeStep`
function to the interface object** so the future async swap is a drop-in
replacement of a value, not a signature change:

```ts
// steps.ts
export function describeStep(
  step: TurnStep,
  ctx: { inCombat: boolean },
): TurnStepInfo { /* static, cited copy */ }

export const defaultTurnAdvisor: TurnAdvisorSource = { describe: describeStep };
```

The guide depends on the `defaultTurnAdvisor` **object** (typed
`TurnAdvisorSource`), never on the bare function, so a later LLM-backed advisor is
substituted by swapping the object — a non-breaking change that honours the
sync/async-union contract.

### Reducer contract (`reducer.ts`)

```ts
export const STEP_SEQUENCE: readonly TurnStep[] =
  ['start', 'choose', 'resolve', 'end'] as const;

export const initialTurnState: TurnState = {
  step: 'start', moveUsed: false, actionUsed: false, chosenOption: null,
};

/** Pure. Total. Deterministic. Never throws. */
export function turnReducer(state: TurnState, event: TurnEvent): TurnState;
```

Transition rules (the full, testable contract):

- `next`: move to the next step in `STEP_SEQUENCE`; **clamp at `'end'`** (no wrap,
  no auto-loop). Idempotent at the last step.
- `back`: move to the previous step; **clamp at `'start'`**. Idempotent at the
  first step.
- `goto`: set `step` to any valid `TurnStep` (lets the player jump freely —
  guidance, not a gate). An out-of-range value is ignored (returns `state`).
- `chooseOption`: set `chosenOption`; if the option is an Action-type
  (`attack`/`cast`/`skill`) it **does not** set `actionUsed` (the player marks
  that explicitly — the guide never infers a mutation happened). It may advance
  `step` from `'choose'` to `'resolve'` **only because the player tapped the
  option** (still an explicit player event, satisfying AC-12).
- `markMove` / `markAction`: set the respective flag to `event.used`. Never change
  `step`. Never clamp any other field.
- `reset`: return `initialTurnState` (a fresh object).

**Invariants (property-tested):** `step` is always a member of `STEP_SEQUENCE`;
`next` then `back` from any non-boundary step returns the original `step`;
`reset` from any state equals `initialTurnState`; `markMove`/`markAction` never
alter `step`; the reducer is a pure function of `(state, event)` (same inputs →
deeply-equal output), and never mutates its `state` argument.

**Invariant ownership.** The reducer owns sequence/flag invariants (pure,
unit-testable). The *UI* owns reset-boundary enforcement (the effects keyed on
`activeInitiativeIndex` / `currentRound` / `inCombat`), because those depend on
React/host state the pure module must not import. This split keeps the
mechanically-rich part testable without a DOM.

### `steps.ts`

Exports `describeStep(step, ctx): TurnStepInfo` plus
`defaultTurnAdvisor: TurnAdvisorSource = { describe: describeStep }` — the
concrete, deterministic default advisor object the guide depends on (see the
`TurnAdvisorSource` note above). All copy is static and carries the exact Core
citation
(p.156–157 for the Move/Action shape, p.157 for On The Defensive/Free Actions,
p.164 for Advantage and Disengage, p.167–169 for end-of-turn condition timing).
No TN, cost, or rule text not present in the rulebook appears here (AC-15).

---

## Components and host wiring

### New files

```
src/components/combat/
  GuidedTurnPanel.tsx          // the overlay: stepper + per-step content (portal)
  GuidedTurnPanel.module.css
  GuidedTurnTrigger.tsx        // "Guide my turn" button (in the segmented strip)
  GuidedTurnTrigger.module.css
  guidedTurnSteps/             // per-step content sub-components (presentational)
    StartStep.tsx              // lists deriveAllReminders items (consumes, not forks)
    ChooseStep.tsx             // option chips → host hand-off callbacks
    ResolveStep.tsx            // framing + "mark Action done"
    EndStep.tsx                // framing + "Go to End Turn" (reveals/focuses the
                               //   existing dashboard end-turn-btn; no guide button)
  __tests__/
    GuidedTurnPanel.test.tsx
    GuidedTurnTrigger.test.tsx
    guidedTurn.integration.test.tsx
```

### Changed file: `CombatPage.tsx`

- **Imports.** `CombatPage.tsx` currently imports only `{ useState, useCallback }`
  (line 2); add `useReducer` and `useEffect` to that React import line (the
  reducer and the three reset effects need them). No other import churn.
- Add two pieces of local state: `const [turn, dispatchTurn] = useReducer(
  turnReducer, initialTurnState)` and `const [guideOpen, setGuideOpen] =
  useState(false)`.
- Add the three reset effects (keyed on `character.activeInitiativeIndex`,
  `character.combatState.currentRound`, `character.combatState.inCombat`) that
  `dispatchTurn({ kind: 'reset' })`; the `inCombat → false` effect also
  `setGuideOpen(false)`.
- Render `<GuidedTurnTrigger>` as the trailing element of the existing segmented
  control container, **only when `inCombat`** (AC-1/AC-2).
- Render `<GuidedTurnPanel>` via the panel's own portal **only when `inCombat &&
  guideOpen`**, passing:
  - `turn`, `dispatchTurn`;
  - `character` (read-only, for `deriveAllReminders`);
  - `onGuideRollReminder` — the shared reminder-roll handler (extraction below);
  - `onGuideChooseAttack` / `onGuideChooseCast` / `onGuideChooseDefend` — set
    `combatMode` + reveal the section;
  - `onGuideRevealEndTurn` — scrolls the existing dashboard End Turn button
    (`data-testid="end-turn-btn"`) into view and focuses it; the guide owns **no**
    End Turn button or handler (see Decision 3, Step 4). No new End Turn handler is
    threaded, and the dashboard's internals are untouched;
  - `onClose` — `() => setGuideOpen(false)`.
- **No existing JSX for the dashboard, mode panels, AttackFlow, TakeDamagePanel,
  reminders strip, End Turn, or InitiativeTracker is modified** (AC-3, NFR-5).

### Shared extraction (behaviour-preserving, NFR-2)

The one-tap reminder roll currently lives **inside `CombatDashboardFull`**
(`handleRollReminder` + the local `reminderRoll` `RollDialog`). Both the
dashboard and the guide must seed the **same** dialog the **same** way. Rather
than duplicate it, extract the seeding into a tiny pure helper already half-done
by the Assistant work:

- Reuse the existing `resolveReminderBaseTarget(character, def)` from
  `src/logic/reminders-target.ts` (already extracted for the Assistant).
- Add a single host-level reminder-roll `RollDialog` state on **`CombatPage`**
  (mirroring the Assistant's shell-level `reminderRollState` with `name`,
  `baseTarget`, `difficulty`) and a `onGuideRollReminder(reminder)` that seeds it
  via `resolveReminderBaseTarget` + `reminder.test.difficulty`. The guide and (if
  desired later) the dashboard both call it. **v1 does not refactor the
  dashboard's internal copy** — to keep the change surface minimal and avoid
  touching the dashboard's existing tested DOM, the guide gets its own host-level
  seeded `RollDialog`; this is the identical seeding logic, not a second
  implementation of roll resolution (`performRoll` stays the one resolver).
  Result forwarded to `addRoll` exactly as the dashboard does.

This keeps "consume, don't fork" (NFR-2): no new roll math, no new mutation; just
one more caller of the already-shared seeding inputs.

---

## Accessibility (NFR-3)

The overlay follows the established `CommandPalette` / `AssistantPanel` dialog
pattern:

- **Container.** `role="dialog"`, `aria-modal="true"` on desktop slide-over;
  `aria-label="Guide my turn"`. Rendered through `createPortal` to `document.body`.
- **Stepper semantics.** The step list uses an ordered structure with
  `aria-current="step"` on the active step, and an
  `aria-live="polite"` region announcing the current step title when `step`
  changes (so assistive tech hears "Step 2 of 4: Choose Move and/or Action").
- **Focus management.** On open, focus moves to the panel heading (or the first
  interactive control). On `next`/`back`/`goto`, focus moves to the new step's
  heading. On close (including END COMBAT force-close), focus returns to the
  "Guide my turn" trigger. Focus is trapped within the desktop dialog (no
  keyboard trap escaping into the page behind it); the bottom-sheet variant
  follows the same trap/restore rules the Assistant sheet uses.
- **Keyboard.** `Esc` closes; `Left/Right` (or dedicated Back/Next buttons,
  reachable by Tab) move between steps; all option chips and the End Turn button
  are native `<button>`s reachable by Tab and activatable by Enter/Space. No
  keyboard trap (AC-17).
- **Trigger.** `GuidedTurnTrigger` is a native `<button>` with a text label on
  desktop and `aria-label="Guide my turn"` when icon-only on mobile; it is **not**
  part of the `role="tablist"`, so the existing tab semantics are unchanged.

---

## Calculated-total tooltips (FR-8 / calculated-total-tooltips steering rule)

The guide's design is to **reference totals that already render elsewhere** and
rely on their owning component's existing tooltip — it recomputes nothing:

- Advantage, Wounds max, conditions: the guide points the player at the
  `CombatDashboard`, which already shows these with their own tooltips/help. The
  guide shows **no duplicate numeric total** for them.
- End-of-turn damage figures: shown by `EndOfTurnReportModal` (via
  `processEndOfTurn`), not by the guide.
- Seeded reminder roll targets: shown and broken down by the shared `RollDialog`,
  not by the guide.

**If** a future iteration has the guide echo any calculated total inline (e.g. a
test target), that specific number **must** be wrapped in
`TooltipTriggerCell` + `Tooltip` (`src/components/shared/`) with an additive
breakdown (`Initial + Advances + Bonus = Total`), exactly as
`InitiativeTracker` does for its rolled value. The v1 design deliberately avoids
echoing any total so this obligation is trivially met (AC-16), and this rule is
recorded so a reviewer can enforce it if the UI copy changes.

---

## Error handling and validation

The guide performs no mutation and no computation that can fail, so its own error
surface is minimal. Concretely, per operation that can fail:

- **`deriveAllReminders` on Step 1.** Pure; cannot throw for valid character
  state. The guide makes the **exact** call `CombatDashboard` makes
  (`CombatDashboard.tsx` ~line 176):
  `deriveAllReminders({ conditions, psychologyTraits: character.psychologyTraits ?? [], psychologyEnabled: character.houseRules?.usePsychologyTracker ?? false })`
  — note the function parameter is `psychologyEnabled` (its semantic source is the
  `usePsychologyTracker` house rule). If
  `character` were somehow absent the panel is not rendered (it is only mounted
  when `inCombat`, which requires a character), so there is no undefined-sheet
  path. **Recoverable: N/A** (no throw). **Caller receives:** the list (possibly
  empty → "No checks due" empty state). **Logged:** no.
- **Seeded reminder roll (`onGuideRollReminder`).** Delegates to the existing
  `resolveReminderBaseTarget` + `RollDialog`. If `reminder.test` is absent, the
  guide shows the reminder as informational and renders **no** roll button (same
  guard as the dashboard). **Recoverable:** yes — the button simply isn't offered.
  **Logged:** no.
- **End Turn (`onGuideRevealEndTurn`).** The guide only scrolls-to and focuses the
  existing dashboard End Turn button; it never invokes `handleEndTurn` or
  `processEndOfTurn` itself. If the button cannot be located (e.g. the dashboard
  is collapsed), the reveal is a no-op and the framing text still instructs the
  player to press End Turn — no exception is raised. The actual End Turn handler
  (inside the dashboard) already wraps `processEndOfTurn` in try/catch and surfaces
  `endTurnError` with a 5-second auto-dismiss; that error path is wholly owned by
  the dashboard. **Recoverable:** yes (reveal no-op is benign; End Turn errors
  handled by the existing path). **Logged:** by the existing dashboard path only.
- **Hand-off mode switch.** Setting `combatMode` is a local state write that
  cannot fail. If the target control is unavailable (e.g. Cast with no
  spellcasting), the option is pre-disabled with an explanatory tooltip rather
  than attempting the switch — **validated at render**, no runtime failure.

**External input / validation.** The only inputs are player taps dispatching
`TurnEvent`s. Each event is a closed discriminated union; `turnReducer` handles
every variant and returns `state` unchanged for any out-of-range `goto` target
(required: the `step` field; type: `TurnStep`; on invalid value: no-op). There is
no free-text, numeric, or external data input to validate.

---

## Testing strategy (NFR-4)

**Pure reducer — property + unit (`src/logic/combat-turn/__tests__`):**
- Property (fast-check): `step ∈ STEP_SEQUENCE` after any event sequence;
  `next∘back` round-trips from any interior step; `reset` from any state deep-
  equals `initialTurnState`; reducer never mutates its input (frozen-input test);
  `markMove`/`markAction` never change `step`.
- Unit: clamping at `'start'`/`'end'`; `goto` with an invalid value is a no-op;
  `chooseOption` sets `chosenOption` without setting `actionUsed`.
- `steps.test.ts`: every `TurnStepInfo.citation` is a non-empty Core citation and
  matches the strings quoted in this design (guards against invented rules →
  AC-15).

**Component / integration (`@testing-library/react`):**
- **Opt-in off by default:** with `inCombat` and the guide unopened, the panel is
  absent and the "Guide my turn" trigger is present (AC-1); with `!inCombat` the
  trigger is absent (AC-2).
- **No-regression DOM contract:** rendering `CombatPage` with the guide closed
  produces the same combat-UI DOM the existing tests assert (AC-3, AC-19) — assert
  the existing `data-testid="combat-dashboard"`, segmented `role="tablist"` with
  exactly three tabs, etc., are unchanged.
- **Open at Step 1, no mutation:** opening the guide shows Step 1 and does not
  call any `updateCharacter`/`update` (spy asserts zero mutations) (AC-4).
- **Step 1 reminders match source:** the rendered reminder rows equal
  `deriveAllReminders(...)` items in the same order, each showing its `citation`
  (AC-5); triggering a roll-backed reminder opens the shared `RollDialog` seeded
  with the right name/target/difficulty and performs no roll itself (AC-6).
- **Steps in RAW order / right control surfaced:** Step 2 shows the
  one-Move-one-Action copy citing Core p.156–157 and the Attack/Cast-Pray/
  Defend-other options (AC-7); choosing Attack sets `combatMode='attack'` and
  reveals `AttackFlow` without intercepting its internal steps (AC-8); Step 4
  states end-of-turn effects apply and its "Go to End Turn" control reveals/focuses
  the existing dashboard `end-turn-btn` (assert `.focus()` lands on it) rather than
  rendering a guide-owned button; pressing the real dashboard button opens
  `EndOfTurnReportModal` via `processEndOfTurn` (AC-10); confirming applies via
  the existing path, cancelling changes nothing (AC-11).
- **No auto-apply / no-mutation while resolving:** during an attack, the guide
  issues no wound/condition/advantage mutation (spy asserts only AttackFlow's
  handlers fire) (AC-9, AC-12 — no timer/auto-advance).
- **Soft tracking:** marking Move/Action done records guidance but disables no
  option and blocks no advance (AC-13).
- **Reset boundaries:** changing `activeInitiativeIndex`, `currentRound`, or
  flipping `inCombat → false` resets the reducer to Step 1 (and END COMBAT also
  closes the panel); no guide state is persisted (AC-14).
- **Accessibility:** focus moves to the step heading on open/advance and returns
  to the trigger on close; `aria-current="step"` marks the active step; `Esc`/
  arrow/Tab navigation works with no trap (AC-17).
- **No network boundary:** a test asserts no `fetch`/async source is invoked and
  the `SuggestionSource`/`TurnAdvisorSource` default is synchronous (AC-18).

**Verification commands implementation must pass (all green; existing tests
unchanged):**

```
npx tsc --build --force --noEmit
npm run build
npx vitest --run
npx eslint .
```

The existing combat test suite must remain green **unchanged** (NFR-5 / AC-19) —
no existing test file is edited to accommodate the guide.

---

## Scope: deferred cases (v1 = standard on-foot turn)

Per the requirements' Ambiguities and Out-of-Scope, v1 covers only the standard
single on-foot turn. The following are **explicitly deferred** and are surfaced
(at most) as cited guidance text, never tracked or applied:

1. **Free Actions vs Actions** — GM-adjudicated, no deterministic list (Core
   p.157). v1: guidance text only; not tracked/gated.
2. **"On The Defensive" (+20 defensive)** — spans into the opponent's turn; no
   stance tracker exists (Core p.157). v1: named, cited option; **not** applied or
   tracked.
3. **Multiple / extra attacks** — e.g. Frenzy's Free Action Melee Test (Core
   p.190) and other multi-attack sources deviate from one-Action baseline. v1
   assumes a single standard Action; deferred.
4. **Mounted combat** — expanded/clarified turn shape (Up In Arms, "Mounted
   Combat", ~p.105). v1 is on-foot only; deferred.
5. **Expanded / Group Advantage** — alternative Advantage system (Up In Arms,
   "Group Advantage", ~p.133); the app already has a Group Advantage house rule in
   `CombatDashboard`. The guide's Advantage explanation cites **Core p.164** and
   otherwise defers to the existing `CombatDashboard` Advantage control; it does
   **not** re-explain or re-mechanic Group Advantage.
6. **Disengage and other special movement** (Core p.164–165) — named as a cited
   Move option; any bespoke resolution defers to existing controls. Deferred.

---

## Remaining rulebook ambiguities (flagged, not guessed)

- **Exact page for the "Move + Action" quote.** The verbatim one-Move-one-Action
  sentence sits under "Taking Your Turn" (TOC-pinned **p.157**), while the **Move**
  and **Action** subheadings render across **p.156–157** in the markdown. This
  design cites **"Core p.156–157"** for the turn shape (matching the requirements'
  `~p.156–157`) and pins the quote to the p.157 section. This is a
  pagination-granularity note, not a mechanics ambiguity — no rule is invented.
- **Charge Advantage interaction.** The Charge "+1 Advantage" sentence sits in the
  Move subsection (Core p.156–157), while the +1 Advantage effect itself is defined
  on Core p.164 (the book cross-references "see page 164"). The guide renders this
  as **`Core p.156–157 (Advantage p.164)`** and must **not** auto-apply the +1 (that
  is the player's and the existing Advantage control's job). Flagged so no reviewer
  reads "guide shows Charge" as "guide grants Advantage" or reads a bare "p.156" as
  the Advantage page. The guide only *names* Charge with the dual citation.
- **"Skill-Test Move also uses the Action" as advice vs mechanic.** Core p.156
  states a Move needing a Skill Test uses the Action. Because the guide does not
  gate, this is surfaced as advisory copy only; whether a given Move "needs a
  Test" is GM-adjudicated and not something the app can detect — flagged as
  guidance-only, consistent with the Free Actions ambiguity.

No mechanic in this design is implemented beyond what the cited rulebook text
states; every ambiguity above is surfaced as guidance or deferred rather than
resolved by invention (rules-compliance steering rule).

---

## Responses to design review — Round 1 (prior review, verdict CHANGES_REQUESTED)

All six findings resolved. Summary:

- **Finding 1 [MEDIUM] — End Turn hand-off infeasible (handler is
  dashboard-internal).** **Addressed, Option A adopted.** Confirmed by reading
  `CombatDashboard.tsx` that `handleEndTurn` / `handleApplyEndOfTurn` /
  `handleCancelEndOfTurn` / `<EndOfTurnReportModal>` all live inside
  `CombatDashboardFull` (~lines 342–392, 805–828) and the button carries
  `data-testid="end-turn-btn"`; `CombatPage` only passes the `onEndTurn` apply
  callback. The guide now exposes **no** End Turn button and instead reveals/focuses
  the existing dashboard `end-turn-btn` (new prop `onGuideRevealEndTurn`, replacing
  the infeasible `onGuideRequestEndTurn`). Updated Decision 3 Step 4, the host-wiring
  prop list, the `EndStep` file note, the error-handling entry, and AC-10's test
  wording. The "dashboard internals unmodified" guarantee now holds without
  contradiction; Option B (lifting the handler) was rejected as a larger,
  dashboard-touching change that AC-3/NFR-5 do not require.
- **Finding 2 [MEDIUM] — condition-timing citation off by a page.** **Addressed.**
  Re-read the Core TOC (`docs/WarhammerFantasyRoleplay4e.md` ~lines 228–231):
  Conditions / Multiple Conditions / Master Condition List all begin at **p.167**,
  Fate & Resilience at p.170, so the list spans **p.167–169**. Changed every
  `p.168–169` condition-timing citation to `p.167–169` (RAW-structure bullet,
  `steps.ts` citation note, and the implied Step 4 `describeStep` copy).
  **Flagged back to requirements:** `requirements.md` carries the same `p.168–169`
  error in its "Rulebook grounding" bullet, FR-3, FR-2 Step 4, and AC-15 context —
  it should be corrected to `p.167–169` so the two documents agree before the
  citation strings are baked into `steps.test.ts`.
- **Finding 3 [NIT] — Advantage p.164 vs markdown marker p.163.** No change
  required (confirmed in the review). The design already cites the authoritative
  TOC/index value p.164 and flags the marker offset under "Remaining rulebook
  ambiguities". Recorded.
- **Finding 4 [NIT] — Default Combat Difficulty at the p.157/158 boundary.** No
  change required; p.157 citation is defensible and retained.
- **Finding 5 [NIT] — Cast disable predicate named loosely.** **Addressed.**
  Decision 3 Step 2 now states the Cast option uses `CombatPage`'s existing
  `hasSpellcasting` flag for enable/disable (so it tracks when `SpellCastingPanel`
  renders in Status mode) while `SpellCastingPanel`'s own `hasSpellcastingTalent`
  gate governs whether its buttons are active.
- **Finding 6 [NIT] — CombatPage import additions unstated.** **Addressed.** The
  "Changed file: CombatPage.tsx" section now explicitly adds `useReducer` and
  `useEffect` to the existing `{ useState, useCallback }` React import.

---

## Responses to design review — Round 2 (`design-review.json`, verdict CHANGES_REQUESTED)

All findings resolved. One MEDIUM finding lived in `requirements.md` (not the
design); it is corrected in that document. The three NITs are folded into the
design. Summary:

- **Finding 1 [MEDIUM] — cross-document citation conflict (`p.168–169` vs
  `p.167–169`).** **Addressed in `requirements.md`.** The reviewer confirmed the
  design's `p.167–169` is the verified-correct value (Core TOC pins Conditions /
  Master Condition List to p.167, Fate & Resilience to p.170; image markers run
  `_page_167_`…`_page_169_`). `requirements.md` carried the stale `p.168–169`; I
  corrected all three literal occurrences to `p.167–169` (the "Rulebook grounding"
  end-of-round bullet, the FR-3.1 end-of-round-timing citation, and the Assumptions
  Master-Condition-List citation). FR-2 Step 4 cites no bare page number inline, so
  no change was needed there. Both documents now read **Core p.167–169**, so the
  citation string baked into `steps.test.ts` per AC-15 is unambiguous. No design
  change was required — the design's citation was already correct.
- **Finding 2 [NIT] — `deriveAllReminders` argument named inconsistently.**
  **Addressed.** The "Error handling and validation" Step-1 entry now states the
  **exact** call `CombatDashboard` makes
  (`deriveAllReminders({ conditions, psychologyTraits: character.psychologyTraits ?? [], psychologyEnabled: character.houseRules?.usePsychologyTracker ?? false })`),
  noting the parameter key is `psychologyEnabled` and its semantic source is the
  `usePsychologyTracker` house rule — removing the risk an implementer looks for a
  `usePsychologyTracker` parameter.
- **Finding 3 [NIT] — `TurnAdvisorSource.describe` vs free-function
  `describeStep`.** **Addressed.** `types.ts`/`steps.ts` now show the adapter
  explicitly: `export const defaultTurnAdvisor: TurnAdvisorSource = { describe: describeStep }`,
  and the guide depends on the `defaultTurnAdvisor` object (not the bare function),
  so a future async/LLM advisor is a non-breaking value swap. The `steps.ts` file
  comment and the "deterministic default advisor" prose were updated to match.
- **Finding 4 [NIT] — Charge "+1 Advantage" page granularity.** **Addressed
  (optional fix taken).** The RAW-section Move bullet and the "Remaining rulebook
  ambiguities" Charge note now render the Charge citation as
  **`Core p.156–157 (Advantage p.164)`**, matching the book's own cross-reference,
  so a bare "p.156" is never mistaken for the Advantage page. The guide still only
  *names* Charge and never auto-applies the +1.
