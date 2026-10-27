# Implementation Plan — Guided Combat Turn Walkthrough

Derived from the APPROVED `design.md` and `requirements.md` in this folder, and
grounded in the current code (`src/components/pages/CombatPage.tsx`,
`src/logic/reminders.ts`, `src/logic/reminders-target.ts`,
`src/logic/assistant/types.ts`, `src/components/assistant/AssistantPanel.tsx`,
`src/components/combat/CombatDashboard.tsx`, `src/components/shared/Tooltip.tsx`).

Guiding constraints carried into every item (do not violate):

- **Orchestrate, don't fork.** Reuse `deriveAllReminders`,
  `resolveReminderBaseTarget`, `AttackFlow`, `SpellCastingPanel`,
  `TakeDamagePanel`, the shared `RollDialog`, the condition picker
  (`onOpenConditionPicker`), the dashboard End Turn button (`data-testid="end-turn-btn"`)
  + `processEndOfTurn` + `EndOfTurnReportModal`, and `InitiativeTracker` /
  `onUpdateRound`. Add **no** attack/damage/end-of-turn/reminder-derivation logic
  and **no** new mutation logic.
- **Nothing auto-applies or auto-advances.** Every transition is an explicit
  player event; no timers. Opt-in, OFF by default, dismissible. Existing combat
  UI is byte-for-byte unchanged when the guide is off — do not touch the
  segmented control `role="tablist"` (exactly three tabs), the dashboard, mode
  panels, `AttackFlow`, `TakeDamagePanel`, reminders strip, End Turn, or
  `InitiativeTracker` JSX.
- **Transient, local-only state.** Reducer state lives in `CombatPage` React
  state; resets at turn (`character.activeInitiativeIndex`), round
  (`character.combatState.currentRound`), and END COMBAT
  (`character.combatState.inCombat` → false, which also force-closes the panel).
  No new persisted `Character`/`CombatState` fields. Keep the `SuggestionSource`
  boundary in `src/logic/assistant/types.ts` untouched; add no network/LLM code.
- **rules-compliance.** Every mechanic rendered by the guide carries an exact
  WFRP4e Core citation in a `// Core p.NNN` code comment and on-screen string
  (turn shape Core p.156–157; On The Defensive / Free Actions / default
  Challenging difficulty Core p.157; Advantage / Charge / Disengage Core p.164;
  Charge rendered `Core p.156–157 (Advantage p.164)`; end-of-turn condition
  timing Core p.167–169). Invent no TNs, costs, or rules; flagged ambiguities in
  the design stay guidance-only or deferred.
- **calculated-total-tooltips.** v1 echoes no calculated total (it points at
  totals the dashboard/`EndOfTurnReportModal`/`RollDialog` already render). If
  any item ends up echoing a total inline, wrap that number in the shared
  `Tooltip` (`src/components/shared/Tooltip.tsx`) with an additive breakdown.
- **Additive tests.** No existing test file is edited. Existing suite stays green
  unchanged.

Note on stack: the repo is **React 19** (`package.json`), not React 18 as the
design prose says. Use the repo's hooks/JSX as-is; this does not change any
design decision. The sanctioned `react-hooks/set-state-in-effect` eslint-disable
mirrors `src/components/shared/Tooltip.tsx` — reuse it **only** if a reset/focus
effect genuinely needs it; prefer not to.

Verification commands (every item's build/test must leave these green; the final
item runs all four):

```
npx tsc --build --force --noEmit
npm run build
npx vitest --run
npx eslint .
```

---

- [ ] 1. Create the pure turn-state module's types.
      Create `src/logic/combat-turn/types.ts` with `TurnStep`
      (`'start' | 'choose' | 'resolve' | 'end'`), `TurnOption`
      (`'attack' | 'cast' | 'defend' | 'skill' | null`), `TurnState`
      (`step`, `moveUsed`, `actionUsed`, `chosenOption`), the `TurnEvent`
      discriminated union (`next` | `back` | `goto` | `chooseOption` | `markMove`
      | `markAction` | `reset`), `TurnStepInfo` (`step`, `title`, `body`,
      `citation`), and the `TurnAdvisorSource` interface whose `describe(step, ctx)`
      returns `TurnStepInfo | Promise<TurnStepInfo>` (same sync/async-union
      contract as `SuggestionSource`, so a future async advisor is a non-breaking
      swap). React-free, JSON-serializable data only; no imports from React.
      Files: `src/logic/combat-turn/types.ts`
      Verify: `npx tsc --build --force --noEmit` succeeds (file compiles with no
      new errors).

- [ ] 2. Create the pure reducer.
      Create `src/logic/combat-turn/reducer.ts` exporting
      `STEP_SEQUENCE = ['start','choose','resolve','end'] as const`,
      `initialTurnState`, and `turnReducer(state, event): TurnState` — pure, total,
      deterministic, never throws, never mutates its `state` argument. Transition
      rules per design Decision 5: `next` clamps at `'end'`; `back` clamps at
      `'start'`; `goto` sets any valid step, ignores out-of-range (returns
      `state`); `chooseOption` sets `chosenOption` (never sets `actionUsed`) and
      may advance `'choose'→'resolve'` because the player tapped; `markMove`/
      `markAction` set the flag only, never change `step`; `reset` returns a fresh
      `initialTurnState`.
      Files: `src/logic/combat-turn/reducer.ts`
      Verify: `npx tsc --build --force --noEmit` succeeds; the reducer is
      exercised by the tests in item 4.

- [ ] 3. Create the cited step copy and default advisor.
      Create `src/logic/combat-turn/steps.ts` exporting
      `describeStep(step, ctx: { inCombat: boolean }): TurnStepInfo` with static,
      rulebook-cited copy for all four steps, plus
      `export const defaultTurnAdvisor: TurnAdvisorSource = { describe: describeStep }`.
      Each step's `citation` is an exact Core string in both the code comment and
      the returned `citation` field: Step 1 end-of-turn/condition framing cites
      Core p.167–169; Step 2 cites Core p.156–157 (turn shape), Core p.157 (On The
      Defensive, Free Actions, default Challenging), Core p.164 (Advantage,
      Disengage), Charge as `Core p.156–157 (Advantage p.164)`; Step 3 cites Core
      p.157–158 (Attacking); Step 4 cites Core p.167–169. No invented TN/cost/rule.
      Files: `src/logic/combat-turn/steps.ts`
      Verify: `npx tsc --build --force --noEmit` succeeds; citations asserted by
      item 4's `steps.test.ts`.

- [ ] 4. Add reducer/steps unit + property tests.
      Create `src/logic/combat-turn/__tests__/reducer.test.ts` (clamping at
      `'start'`/`'end'`; `goto` invalid value is a no-op; `chooseOption` sets
      `chosenOption` without setting `actionUsed`), `reducer.property.test.ts`
      (fast-check: `step ∈ STEP_SEQUENCE` after any event sequence; `next∘back`
      round-trips from any interior step; `reset` from any state deep-equals
      `initialTurnState`; reducer never mutates a frozen input;
      `markMove`/`markAction` never change `step`), and `steps.test.ts` (every
      `TurnStepInfo.citation` is a non-empty Core citation matching the design's
      quoted page strings — guards against invented rules per AC-15). Follow the
      `fast-check` + Vitest pattern in
      `src/logic/assistant/__tests__/engine.test.ts`.
      Files: `src/logic/combat-turn/__tests__/reducer.test.ts`,
      `src/logic/combat-turn/__tests__/reducer.property.test.ts`,
      `src/logic/combat-turn/__tests__/steps.test.ts`
      Verify: `npx vitest --run src/logic/combat-turn` — all new tests pass.

- [ ] 5. Create the "Guide my turn" trigger button.
      Create `GuidedTurnTrigger.tsx` + `.module.css` in `src/components/combat/`:
      a native `<button>` (NOT a tab, outside any `role="tablist"`) with a text
      label on desktop and an icon-only `Compass` (`lucide-react`) variant with
      `aria-label="Guide my turn"` on mobile (`useMediaQuery('(max-width: 767px)')`).
      Props: `onOpen`, `isMobile` (or compute internally). Styling via CSS Modules
      matching the segmented-control strip.
      Files: `src/components/combat/GuidedTurnTrigger.tsx`,
      `src/components/combat/GuidedTurnTrigger.module.css`
      Verify: `npx tsc --build --force --noEmit` succeeds; covered by item 9's
      `GuidedTurnTrigger.test.tsx`.

- [ ] 6. Create the per-step content sub-components.
      Create presentational sub-components in
      `src/components/combat/guidedTurnSteps/`: `StartStep.tsx` (renders the
      `deriveAllReminders(...)` items passed in — same items, same order, each with
      its `citation`; roll-backed reminders get a button calling
      `onGuideRollReminder(reminder)`, informational ones render text + citation,
      no button), `ChooseStep.tsx` (option chips Attack / Cast-Pray / Defend-other /
      Skill wired to the host hand-off callbacks; Cast chip disabled with an
      explanatory tooltip when `hasSpellcasting` is false; Charge/On The Defensive/
      Disengage shown as named, cited, guidance-only text), `ResolveStep.tsx`
      (framing text + "Mark Action done" toggle dispatching `markAction`; reads
      nothing back from `AttackFlow`), and `EndStep.tsx` (framing text that
      end-of-turn effects may apply + a "Go to End Turn" control calling
      `onGuideRevealEndTurn`; renders NO guide-owned End Turn button). All copy
      comes from `describeStep`/props; these components compute no mechanic and
      apply no mutation.
      Files: `src/components/combat/guidedTurnSteps/StartStep.tsx`,
      `.../ChooseStep.tsx`, `.../ResolveStep.tsx`, `.../EndStep.tsx`
      Verify: `npx tsc --build --force --noEmit` succeeds; behaviour asserted by
      item 9's panel + integration tests.

- [ ] 7. Create the overlay panel.
      Create `GuidedTurnPanel.tsx` + `.module.css` in `src/components/combat/`,
      mirroring `AssistantPanel.tsx`: `createPortal` to `document.body`, returns
      `null` when closed, `role="dialog"` + `aria-modal="true"` +
      `aria-label="Guide my turn"`, right-side slide-over on desktop / bottom sheet
      on mobile via `data-variant` + `useMediaQuery('(max-width: 767px)')`, focus
      moved into the panel on open and restored to the trigger on close
      (previousFocusRef + `requestAnimationFrame`), `Esc` closes, Tab focus trap,
      backdrop click closes. Renders a stepper with `aria-current="step"` on the
      active step and an `aria-live="polite"` region announcing the current step
      title; Back/Next buttons dispatch `back`/`next`; renders the item-6 sub
      component for `turn.step`. Props: `turn`, `dispatchTurn`, `character`
      (read-only), `reminders` (or derive via `deriveAllReminders` with the exact
      `CombatDashboard` arg shape incl. `psychologyEnabled`), `onGuideRollReminder`,
      `onGuideChooseAttack`, `onGuideChooseCast`, `onGuideChooseDefend`,
      `hasSpellcasting`, `onGuideRevealEndTurn`, `onClose`. The panel performs no
      mutation and derives no reminders of its own.
      Files: `src/components/combat/GuidedTurnPanel.tsx`,
      `src/components/combat/GuidedTurnPanel.module.css`
      Verify: `npx tsc --build --force --noEmit` succeeds; behaviour asserted by
      item 9.

- [ ] 8. Wire the guide into `CombatPage` (host).
      Edit `src/components/pages/CombatPage.tsx`:
      (a) extend the React import `{ useState, useCallback }` to also import
      `useReducer` and `useEffect`;
      (b) add `const [turn, dispatchTurn] = useReducer(turnReducer, initialTurnState)`
      and `const [guideOpen, setGuideOpen] = useState(false)`;
      (c) add a host-level reminder-roll `RollDialog` seed state + an
      `onGuideRollReminder(reminder)` that, mirroring
      `CombatDashboard.handleRollReminder`, resolves `test.def` via
      `resolveReminderBaseTarget(character, …)` and passes `test.difficulty`
      through — forwarding the result to `addRoll` exactly as the page already does
      (no new roll math; `performRoll` stays the one resolver);
      (d) add `onGuideChooseAttack`/`onGuideChooseCast`/`onGuideChooseDefend` that
      set `combatMode` to `'attack'`/`'status'`/`'defend'` respectively and reveal
      the relevant already-mounted section, reusing the existing `hasSpellcasting`
      flag for the Cast enablement;
      (e) add `onGuideRevealEndTurn` that locates the existing dashboard
      `[data-testid="end-turn-btn"]`, scrolls it into view, and `.focus()`es it
      (no-op if absent; never calls `handleEndTurn`/`processEndOfTurn`);
      (f) add three reset `useEffect`s keyed on `character.activeInitiativeIndex`,
      `character.combatState.currentRound`, and `character.combatState.inCombat`
      that `dispatchTurn({ kind: 'reset' })`; the `inCombat → false` effect also
      `setGuideOpen(false)`;
      (g) render `<GuidedTurnTrigger onOpen={() => setGuideOpen(true)} …>` as the
      trailing element of the existing segmented-control container, **only when
      `inCombat`**, as a sibling button outside the `role="tablist"`;
      (h) render `<GuidedTurnPanel …>` **only when `inCombat && guideOpen`**,
      passing the props from item 7 and `onClose={() => setGuideOpen(false)}`.
      Do not modify any existing dashboard / mode-panel / AttackFlow /
      TakeDamagePanel / reminders / End Turn / InitiativeTracker JSX.
      Files: `src/components/pages/CombatPage.tsx`
      Verify: `npx tsc --build --force --noEmit` and `npm run build` succeed;
      existing `src/components/__tests__/pages/CombatPage.test.tsx` passes
      unchanged (`npx vitest --run src/components/__tests__/pages/CombatPage.test.tsx`).

- [ ] 9. Add component + integration tests for the guide.
      Create tests under `src/components/combat/__tests__/` using
      `@testing-library/react` (follow the render harness in
      `src/components/__tests__/pages/CombatPage.test.tsx`: `makeCharacter`,
      `combatState` shape, spy `update`/`updateCharacter`):
      `GuidedTurnTrigger.test.tsx` (trigger visible when `inCombat` and guide
      closed — AC-1; absent when `!inCombat` — AC-2),
      `GuidedTurnPanel.test.tsx`, and `guidedTurn.integration.test.tsx` covering:
      no-regression DOM contract with guide off (segmented `role="tablist"` has
      exactly three tabs, dashboard present — AC-3/AC-19); opening shows Step 1 and
      fires zero `update`/`updateCharacter` (AC-4); Step 1 reminder rows equal
      `deriveAllReminders(...)` items in order each with `citation` (AC-5) and a
      roll-backed reminder opens the shared `RollDialog` seeded with the right
      name/target/difficulty and rolls nothing itself (AC-6); Step 2 shows the
      one-Move-one-Action copy citing Core p.156–157 with Attack/Cast-Pray/
      Defend-other options (AC-7) and choosing Attack sets `combatMode='attack'`
      and reveals `AttackFlow` without intercepting it (AC-8); the guide applies no
      wound/condition/advantage during resolution (AC-9); Step 4 "Go to End Turn"
      reveals/focuses the existing `end-turn-btn` (assert `.focus()` landed) with
      no guide-owned button (AC-10); marking Move/Action is guidance-only and gates
      nothing (AC-13); changing `activeInitiativeIndex` / `currentRound` /
      flipping `inCombat → false` resets to Step 1 (and END COMBAT closes the
      panel) (AC-14); focus/`aria-current`/`Esc`/arrow/Tab with no trap (AC-17);
      no `fetch`/async source invoked and the default advisor is synchronous
      (AC-18). Edit no existing test file.
      Files: `src/components/combat/__tests__/GuidedTurnTrigger.test.tsx`,
      `src/components/combat/__tests__/GuidedTurnPanel.test.tsx`,
      `src/components/combat/__tests__/guidedTurn.integration.test.tsx`
      Verify: `npx vitest --run src/components/combat` — all new tests pass.

- [ ] 10. Full verification pass (clean).
      Run the full project gate and fix any error or new warning surfaced
      (per the fix-errors rule, including any pre-existing error a change
      reveals). Confirm the existing combat suite is unchanged and green.
      Files: none (verification only; fixes land in the files above if needed)
      Verify (all must pass clean):
      `npx tsc --build --force --noEmit`;
      `npm run build`;
      `npx vitest --run`;
      `npx eslint .` — 0 errors and no new warnings (the single sanctioned
      `react-hooks/set-state-in-effect` disable, if used, mirrors
      `src/components/shared/Tooltip.tsx`).

---

## Notes and assumptions

- **Single feature, not decomposed.** The reducer, panel, and host wiring form
  one coherent unit (the panel depends on the reducer; the host wires both), so
  this is a single ordered plan rather than separable FEATs. The existing
  implement-and-review loop runs this plan.
- **Reset-boundary ownership.** The pure reducer owns sequence/flag invariants;
  the three `CombatPage` effects own reset-boundary enforcement (they depend on
  host/React state the pure module must not import) — per design Decision 5.
- **Citation cross-doc note (flagged, not resolved here).** `src/logic/reminders.ts`
  cites the Master Condition List at Core p.168–171 / p.169, while the guide's
  own Step 1/4 end-of-turn copy cites Core p.167–169 per the approved design. The
  guide uses its own `steps.ts` citations and does not alter `reminders.ts`; the
  guide only renders `deriveAllReminders` item citations verbatim. No reconciliation
  of `reminders.ts` is in scope. Flagged so a reviewer is aware the two modules
  cite the condition list with slightly different page spans.
- **Tooltip API.** `src/components/shared/Tooltip.tsx` exports `Tooltip`
  (anchor-element based); there is no `TooltipTriggerCell`. v1 echoes no
  calculated total, so no `Tooltip` usage is required; if a total is later echoed
  inline, anchor a `Tooltip` to it with an additive breakdown.
