# Implementation Plan — Guided Spellcasting / Miscast Flow

Source of truth: `.agents/tasks/guided-spellcasting/design.md` (APPROVED) and
`requirements.md`. This plan sequences that design; it does not re-decide the
architecture. Three items are carried forward from the design-loop exit
(CHANGES_REQUESTED, 0 HIGH / 2 MEDIUM + 3 NIT remaining) and are marked
**[CARRY-FORWARD]** — they are REQUIRED, not optional.

## Hard constraints (apply to every item)

- **Orchestrate, don't duplicate.** No new casting / channelling / overcast /
  miscast math. All numbers come from `src/logic/spell-casting.ts`; all d100
  casting/channelling rolls go through the existing `RollDialog`/`performRoll`;
  the miscast d100 and arcane-mark d10 stay on the panel's existing
  `Math.random()` handlers (design §"Who rolls", OQ-6).
- **Nothing auto-applies / auto-advances.** Every step transition and every
  mutation is an explicit player event through an existing handler.
- **Opt-in, OFF by default.** When the guide is off, `SpellCastingPanel` renders
  and behaves exactly as today; the only default-render change is one opt-in
  trigger per memorized castable row.
- **Additive.** Existing tests (spell-casting, `SpellCastingPanel.*`,
  `CastResultDisplay.*`, combat-turn, assistant suites) stay green **unchanged**.
- **Tooltips.** Every calculated total the guide shows carries a breakdown
  tooltip via the shared `Tooltip` / `TooltipTriggerCell` (steering:
  `calculated-totals`), breakdown sourced from the existing calculators.
- **Citations.** Every rulebook-derived rule carries a code-comment citation
  (Core p.234-239 / `windsofmagic.md`; Errata overrides). The guide cites; it
  does not re-derive.
- **Scope.** Ritual Magic is OUT for v1.
- **No worktree.** Implement directly on the current branch.
- **eslint discipline.** 0 eslint errors; no new warnings (baseline has 3
  pre-existing `react-refresh/only-export-components` warnings in unrelated
  files — do not add more). The ONLY sanctioned
  `react-hooks/set-state-in-effect` eslint-disable mirrors
  `src/components/shared/Tooltip.tsx` and may be reused ONLY if genuinely needed.
  Add NO other eslint-disable.

## Verification gate (run in `d:\Git\PWACharSheet`)

All four MUST be clean before the work is considered done:

1. `npx tsc --build --force --noEmit` — exit 0.
2. `npm run build` — succeeds.
3. `npx vitest --run` — all tests pass (existing suites unchanged + new suites green).
4. `npx eslint .` — 0 errors; no new warnings (3 pre-existing warnings only).

Baseline confirmed clean at plan time (tsc 0, eslint 0 errors / 3 warnings).

---

# Implementation Plan

- [ ] 1. Add the additive, non-behavioural pure helpers + citation fixes to `src/logic/spell-casting.ts`.
      Add `computeCastingTargetBreakdown(character): { intTotal; advances; total }` and refactor
      `computeCastingTarget` to `return computeCastingTargetBreakdown(character).total` (byte-identical result).
      Add `isPettySpell(spell): boolean` (`spell.cn === '0' || spell.cn === '-'`).
      Add `computeOvercastBudgetBreakdown(result: CastingResult): { slAchieved; totalPowerTens; cn; overcastSlots }`
      with `totalPowerTens = Math.max(0, result.overcastSlots + result.cn - result.slAchieved)` (no re-derivation
      of `tensDigit(roll)`). All three are pure, additive, derive no new mechanic.
      **[CARRY-FORWARD — NIT 3]** In the same file, correct the stale citation comments on the
      `resolveCastingResult` area: `Total Power (Winds of Magic p.19)` → `Winds of Magic §"Critical Casting" (Total Power) — add the tens digit of the casting roll to SL for Overcasting (see WoM p.23 Overcast Table)`;
      `Channelled cast failure (Winds of Magic p.20)` → `Winds of Magic §"Channelling Test" — failed channelled cast forces a Minor Miscast`.
      Add `// Core p.234: Casting Test — Int total + Language (Magick) advances` on the new breakdown helper.
      Files: `src/logic/spell-casting.ts`
      Verify: `npx vitest --run src/logic/__tests__` (and any spell-casting suite) — existing spell-casting tests pass unchanged; `npx tsc --build --force --noEmit` exit 0.

- [ ] 2. Add unit tests for the new `spell-casting.ts` helpers.
      Cover: `computeCastingTargetBreakdown` lines sum to `computeCastingTarget`; `isPettySpell` true for `'0'`/`'-'`
      and false otherwise; `computeOvercastBudgetBreakdown` yields `totalPowerTens === 0` in the normal case and the
      positive tens contribution under a Total-Power re-resolve, and `slAchieved + totalPowerTens - cn === overcastSlots`.
      Files: `src/logic/__tests__/spell-casting.breakdown.test.ts` (new; mirror existing spell-casting test style).
      Verify: `npx vitest --run src/logic/__tests__/spell-casting.breakdown.test.ts` — all pass.

- [ ] 3. Create the React-free guided-cast types in `src/logic/guided-cast/types.ts`.
      Define `CastStep` (`'select'|'route'|'resolve'|'overcast'|'miscast'|'outcome'`), `CastRoute`,
      `GuidedCastState` (step, spellName, route, result: CastingResult|null, overcastDone, overcastAllocations:
      `Record<string,number>|null`, miscastDone), the `GuidedCastEvent` discriminated union
      (`start`/`next`/`back`/`goto`/`chooseRoute`/`castResolved`/`overcastResolved`/`miscastCompleted`/`reset`),
      `CastStepInfo` (step/title/body/citation), and `CastAdvisorSource` with
      `describe(step, ctx): CastStepInfo | Promise<CastStepInfo>` (sync/async-union, mirroring `TurnAdvisorSource`).
      Import `CastingResult` as a type from `../spell-casting`; import no React.
      Files: `src/logic/guided-cast/types.ts`
      Verify: `npx tsc --build --force --noEmit` exit 0.

- [ ] 4. Create the pure reducer in `src/logic/guided-cast/reducer.ts`.
      Export `STEP_SEQUENCE`, `initialGuidedCastState`, `applicableSteps(state)` (overcast iff
      `result.castSuccess && result.overcastSlots > 0`; miscast iff `triggerMinorMiscast || triggerMajorMiscast`),
      `applicableIndex`, and `guidedCastReducer(state, event)`. `next`/`back` index into `applicableSteps` and clamp;
      `goto` is a no-op unless the target is applicable; `chooseRoute` sets route without changing step;
      `castResolved` stores result, resets overcastDone/miscastDone/overcastAllocations, and clamps `step` to the
      nearest still-applicable step (per design snippet); `overcastResolved` stores allocations + sets overcastDone
      without changing step; `miscastCompleted` sets miscastDone without changing step; `reset` returns a fresh
      initial state. Pure, total, never throws, never mutates input. No React import.
      Files: `src/logic/guided-cast/reducer.ts`
      Verify: `npx tsc --build --force --noEmit` exit 0.

- [ ] 5. Create the advisor copy in `src/logic/guided-cast/steps.ts`.
      Add `describeCastStep(step, ctx)` returning static rulebook-cited copy for all six steps, and
      `export const defaultCastAdvisor: CastAdvisorSource = { describe: describeCastStep }`. `ctx` carries only
      local offline data (`{ isPetty: boolean; route: CastRoute }`). Citations per design §"RAW procedure":
      Casting Test Core p.234; Channelling Core p.237 + WoM §"Channelling Test"; Critical/Fumbled Core p.234-235 +
      WoM §"Critical Casting"/§"Fumbled Casting"; Overcasting Core p.238 superseded by WoM Overcast Table p.23;
      Miscast tables Core p.234-235. Step 2 separates the Core p.234 cast/CN cite from the app-convention
      Petty-no-channel clause (derived from `isPettySpell`), per design §Step 2. No network/LLM/telemetry call.
      Files: `src/logic/guided-cast/steps.ts`
      Verify: `npx tsc --build --force --noEmit` exit 0.

- [ ] 6. Add reducer unit tests in `src/logic/guided-cast/__tests__/reducer.test.ts`.
      Mirror `src/logic/combat-turn/__tests__/reducer.test.ts`. Assert: `next`/`back` move over the applicable
      subset and clamp at its boundaries (not `STEP_SEQUENCE`); `next` from `resolve` lands on `overcast` when
      applicable else `outcome`; `goto` to an inapplicable step is a no-op; `chooseRoute` sets route without
      touching step; `castResolved` stores result, resets the done flags + allocations, and clamps step to the
      nearest applicable step when a re-resolve makes the current step inapplicable (e.g. on `overcast`, re-resolve
      zeroes `overcastSlots` → clamps to `resolve`); `overcastResolved` stores allocations + sets overcastDone
      without changing step; `miscastCompleted` never changes step; `applicableSteps` gates overcast/miscast on the
      right flags.
      Files: `src/logic/guided-cast/__tests__/reducer.test.ts`
      Verify: `npx vitest --run src/logic/guided-cast` — all pass.

- [ ] 7. Add reducer property tests in `src/logic/guided-cast/__tests__/reducer.property.test.ts`.
      Port the combat-turn property suite with `fast-check`. Invariants: (1) `step ∈ STEP_SEQUENCE` after any event
      sequence; (1b) `step ∈ applicableSteps(state)` after any event sequence; (2) `next` then `back` round-trips
      from any interior applicable step (over the applicable subset); (3) `reset` deep-equals
      `initialGuidedCastState`; (4) `overcastResolved`/`miscastCompleted` never change step; (5) never throws on a
      frozen input; (6) pure function of `(state, event)`. Arbitraries cover every `CastStep`, `CastRoute`, and a
      representative set of `CastingResult` flag combinations.
      Files: `src/logic/guided-cast/__tests__/reducer.property.test.ts`
      Verify: `npx vitest --run src/logic/guided-cast` — all pass.

- [ ] 8. Add advisor tests in `src/logic/guided-cast/__tests__/steps.test.ts`.
      Assert `defaultCastAdvisor.describe(step, ctx)` returns a non-Promise for every step, citation strings match
      the exact rulebook pages above, and no copy contains an invented TN/cost.
      Files: `src/logic/guided-cast/__tests__/steps.test.ts`
      Verify: `npx vitest --run src/logic/guided-cast` — all pass.

- [ ] 9. **[CARRY-FORWARD — MEDIUM 1]** Extract CastResultDisplay's inline control clusters into shared presentational components.
      Extract into new files under `src/components/shared/castControls/`: the Critical-Cast choice buttons
      (`CriticalChoiceButtons`), the fumble + minor-miscast roll buttons (`MiscastRollButtons`), and the miscast
      escalation cluster (`MiscastEscalation` — the `cascading_chaos` / `multiplying_misfortune` / `marked_by_magic`
      follow-ups incl. its local `arcaneMarkResult` state and the arcane-mark store control). Each is purely
      presentational, takes the same callbacks the current inline markup uses (`onCriticalChoice`, `onMiscastRoll`,
      `onArcaneMarkAcquired`, plus `character`/`miscastResult` as needed), and introduces no logic. Refactor
      `CastResultDisplay.tsx` to render these extracted components in place of its inline clusters. This is a
      non-behavioural refactor — `CastResultDisplay`'s rendered output and wiring stay identical.
      Files: `src/components/shared/castControls/CriticalChoiceButtons.tsx`,
      `src/components/shared/castControls/MiscastRollButtons.tsx`,
      `src/components/shared/castControls/MiscastEscalation.tsx` (+ any shared `.module.css` reused/moved as needed);
      `src/components/shared/CastResultDisplay.tsx`.
      Verify: `npx vitest --run src/components/shared/__tests__/CastResultDisplay.damage.test.tsx` and the
      spell-casting UI suites pass unchanged; `npx tsc --build --force --noEmit` exit 0; `npx eslint .` clean.

- [ ] 10. Widen the CastResultDisplay overcast render guard and route the allocator callback (additive).
      **[CARRY-FORWARD overlap]** Add optional prop `onOvercastResolved?(allocations: Record<string, number>)`.
      Widen the overcast-section guard from `overcastSlots > 0 && castSuccess && onOvercastAllocated` to
      `overcastSlots > 0 && castSuccess && (onOvercastAllocated || onOvercastResolved)`, and route
      `OvercastAllocator.onAllocate` to `onOvercastResolved ?? onOvercastAllocated`. Absence of both props preserves
      today's behaviour exactly (section does not render); only `onOvercastAllocated` → close-on-confirm as today.
      Files: `src/components/shared/CastResultDisplay.tsx`
      Verify: `npx vitest --run src/components/shared/__tests__/CastResultDisplay.damage.test.tsx` passes unchanged;
      `npx tsc --build --force --noEmit` exit 0.

- [ ] 11. Add the guide seam to `SpellCastingPanel.tsx` (optional imperative handle + push callbacks + RollDialog yield).
      Export `interface SpellCastingGuideHandle` (`openCast(spell)`, `openChannel(spell)`, `chooseCritical(choice)`,
      `rollMiscast(table)`, `dismissResult()` — NO read-back method). Add optional props `guideHandleRef`,
      `onCastResolved?(result)`, `onOvercastResolved?(allocations)`. Wire `useImperativeHandle(guideHandleRef, …)`
      delegating to the existing private functions (`openCastDialog`, `openChannelDialog`, `handleCriticalChoice`,
      `handleMiscastRoll`, `handleCloseCastResult`). Fire `onCastResolved(result)` at ALL THREE non-null
      `setCastingResult(...)` sites (`handleRollResult` initial resolve; `handleCriticalChoice` `total_power` and
      `unstoppable_force` re-resolves) — NOT the display-only `critical_wound` branch. When `onOvercastResolved` is
      present, `handleOvercastAllocated` forwards allocations to it and does NOT null the result.
      Files: `src/components/shared/SpellCastingPanel.tsx`
      Verify: existing `SpellCastingPanel.*` / `spell-casting-ui` suites pass unchanged; `npx tsc --build --force --noEmit` exit 0.

- [ ] 12. Own the guided-flow reducer + render the trigger and overlay inside `SpellCastingPanel.tsx`.
      Add `useReducer(guidedCastReducer, initialGuidedCastState)` local to the panel. Render a per-row
      `GuidedCastTrigger` on each memorized castable row (the only new default-render element). Track a
      `guideActive` flag (overlay open). **[CARRY-FORWARD — MEDIUM 2]** While `guideActive`, suppress the panel's own
      `CastResultDisplay` render (`{!guideActive && castingResult && <CastResultDisplay … />}`) so only one
      `aria-modal` dialog exists; the guide hosts the allocator/miscast controls in-body. **Also** make the guide
      overlay YIELD while `rollDialogState != null`: the existing `RollDialog` (itself `role="dialog" aria-modal`)
      becomes the single top modal; the guide's focus trap/backdrop go inert (do not render the guide's trap, or
      disable its key/backdrop handlers) until the dialog closes, then resume. On spell change / un-memorize /
      close, dispatch `reset` (reuse the sanctioned `set-state-in-effect` eslint-disable only if genuinely needed,
      mirroring `CombatPage`/`Tooltip`). `CombatPage` needs no edit (panel owns the state).
      Files: `src/components/shared/SpellCastingPanel.tsx`
      Verify: existing panel suites pass unchanged; `npx tsc --build --force --noEmit` exit 0; `npx eslint .` clean (no new warnings).

- [ ] 13. Create the `GuidedCastTrigger` opt-in button.
      Mirror `GuidedTurnTrigger`: native `<button>`, icon-only (`Wand2`/`Sparkles`) on mobile via `useMediaQuery`,
      label on desktop, `aria-label="Guide my spell"`, `data-testid="guided-cast-trigger"`, `onOpen` prop.
      Files: `src/components/shared/GuidedCastTrigger.tsx` (+ `.module.css`)
      Verify: `npx tsc --build --force --noEmit` exit 0.

- [ ] 14. Create the `GuidedCastPanel` portal overlay/stepper.
      Mirror `GuidedTurnPanel`: `createPortal` to `document.body`; `role="dialog"` `aria-modal="true"`
      `aria-label="Guide my spell"`; focus trap on Tab/Shift-Tab; Esc + backdrop close (backdrop dispatches `reset`);
      focus to step heading on open and step change; focus restore to trigger on close. Stepper `<ol>` over
      `applicableSteps(state)` with `aria-current="step"`, per-step `goto` buttons, Arrow Left/Right over the
      applicable subset, Back/Next disabled at applicable boundaries, polite `aria-live` region. Derive
      `isFirst`/`isLast` from the applicable subset, not `STEP_SEQUENCE`. Unwrap advisor copy with the
      `info instanceof Promise ? null : info` guard. Props per design (`state`, `dispatch`, `character`, `spell`,
      `armourPenalty`, `saturation: MagicSaturation` resolved with `?? 'normal'`, `onOpenCast`, `onOpenChannel`,
      `onChooseCritical`, `onRollMiscast`, `onClose`). Import `MagicSaturation` from `../../types/character`.
      Render the per-step child components (item 15) and, for Steps 4/5, host the extracted controls (item 9) +
      `OvercastAllocator` in-body.
      Files: `src/components/shared/GuidedCastPanel.tsx` (+ `.module.css`)
      Verify: `npx tsc --build --force --noEmit` exit 0.

- [ ] 15. Create the six step components under `src/components/shared/guidedCastSteps/`.
      Each presentational, no mutation/computation; totals use existing calculators + `TooltipTriggerCell`/`Tooltip`
      with a single-open index (`openTotalIndex` + `anchorEl`). `SelectStep` (spell meta + casting target via
      `computeCastingTargetBreakdown`, armour-penalty + saturation as context only); `RouteStep` (Cast + Channel,
      Channel hidden when `isPettySpell`); `ResolveStep` ("Open Cast roll" + SL/CN read-back tooltips + the three
      Critical-Cast choice buttons via the extracted `CriticalChoiceButtons`, gated on `result.isCriticalCast`
      ALONE — not `castSuccess`); `OvercastStep` (surplus-SL budget + Fibonacci thresholds, existing
      `OvercastAllocator` with `availableSlots = state.result.overcastSlots` read on every render, overcast-budget
      tooltip via `computeOvercastBudgetBreakdown` summing under Total Power, damage preview via
      `computeOvercastDamagePreview`); `MiscastStep` (cited "why" + extracted `MiscastRollButtons` +
      `MiscastEscalation`); `OutcomeStep` (success/SL-vs-CN/Unstoppable Force; magic-missile hitLocation + damage via
      `formatCastDamageBreakdown` with tooltip; chosen overcast effects via existing
      `resolveOvercastAllocations`/`lookupOvercastEffect`).
      Files: `src/components/shared/guidedCastSteps/{SelectStep,RouteStep,ResolveStep,OvercastStep,MiscastStep,OutcomeStep}.tsx`
      Verify: `npx tsc --build --force --noEmit` exit 0; `npm run build` succeeds.

- [ ] 16. Add trigger + reducer-integration-light component tests.
      Default-off: `SpellCastingPanel` with no `guideHandleRef`/`onCastResolved` renders identically to today plus
      exactly one opt-in trigger per memorized row (AC-1). Opening the guide shows Step 1 with casting-target total
      equal to `computeCastingTarget(character)` and a tooltip whose lines sum to it (AC-2). Step 2 offers
      Cast+Channel for non-Petty, Cast-only for Petty (AC-3); citations present.
      Files: `src/components/shared/__tests__/GuidedCastTrigger.test.tsx`,
      `src/components/shared/__tests__/GuidedCastPanel.steps.test.tsx`
      Verify: `npx vitest --run src/components/shared/__tests__/GuidedCast` — all pass.

- [ ] 17. Add the full integration tests for the hand-off through `SpellCastingPanel` + `GuidedCastPanel`.
      Cast route opens the existing `RollDialog` (title "Language (Magick)", correct base target); the guide renders
      no dice (AC-5). **[CARRY-FORWARD — MEDIUM 2]** While the Cast roll is open assert EXACTLY ONE `aria-modal`
      dialog focus-traps at a time (the `RollDialog`), the guide's trap is inert; after a seeded manual roll
      (`diceEntryMode="manual"`), Step 3 shows SL/CN/flags (AC-6). Critical-choice surface renders on
      `isCriticalCast` ALONE, including the passed-but-under-CN case; Total Power re-resolves and raises
      `overcastSlots` (Step 4 `availableSlots` updates on re-render + budget tooltip sums under Total Power);
      Unstoppable Force → `isUndispellable` in Step 6; `critical_wound` fires no `onCastResolved`.
      **[CARRY-FORWARD overlay layering]** While the guide is open assert NO `CastResultDisplay`
      (`aria-label="Cast Result"`) overlay is mounted; the in-body `OvercastAllocator` (Step 4) and
      miscast/escalation buttons (Step 5) are reachable via the guide's Tab focus trap; backdrop click dispatches
      `reset` + restores focus. Overcast appears iff `castSuccess && overcastSlots > 0`, disables self/touch columns
      exactly as `computeOvercastOptions` (AC-7/8); confirm fires `onOvercastResolved` (not `onOvercastAllocated`),
      result stays mounted, Step 6 shows effects via `resolveOvercastAllocations`. Default-off regression: with only
      `onOvercastAllocated` the allocator still nulls + closes as today. Miscast appears iff a trigger fires, cited
      reason shown, rolls via `handleMiscastRoll` (`Math.random()`) — assert NO `RollDialog` opens for the miscast
      (AC-9). Accessibility assertions mirror `GuidedTurnPanel.test.tsx` (AC-16).
      Files: `src/components/shared/__tests__/GuidedCastPanel.integration.test.tsx`
      Verify: `npx vitest --run src/components/shared/__tests__/GuidedCastPanel.integration.test.tsx` — all pass.

- [ ] 18. **[CARRY-FORWARD — MEDIUM 1]** Add the mandatory no-drift test for the extracted cast controls.
      Assert the controls re-hosted by the guide (`CriticalChoiceButtons`, `MiscastRollButtons`,
      `MiscastEscalation`) reach the SAME handlers as when rendered by `CastResultDisplay` — e.g. clicking the
      extracted Critical choice button invokes the `onCriticalChoice`/`chooseCritical` handler, and the escalation
      buttons invoke `onMiscastRoll`/`onArcaneMarkAcquired` — proving a single wiring with no handler drift between
      the two host surfaces.
      Files: `src/components/shared/__tests__/castControls.nodrift.test.tsx`
      Verify: `npx vitest --run src/components/shared/__tests__/castControls.nodrift.test.tsx` — all pass.

- [ ] 19. Full verification gate + regression sweep.
      Run the complete gate and confirm the existing spell-casting, `SpellCastingPanel.*`, `CastResultDisplay.*`,
      combat-turn, and assistant suites are green UNCHANGED, and the nav/collapse/Assistant/Guided-Turn UX did not
      regress. Clean up any temporary files.
      Files: none (verification only).
      Verify (all must be clean): `npx tsc --build --force --noEmit` (exit 0); `npm run build` (succeeds);
      `npx vitest --run` (all pass); `npx eslint .` (0 errors; only the 3 pre-existing warnings).

---

## Design decisions carried from the design (rationale, not re-decided)

- Guide reducer owned inside `SpellCastingPanel` (not `CombatPage`) so the handle is a same-component call and
  `CombatPage` is untouched (design §"Host ownership").
- Result reaches the guide ONLY via the `onCastResolved` push (no handle read-back) to avoid a stale-render race
  (design §"The seam", pass-3 finding 4).
- On the guide path `CastResultDisplay` is not mounted; the guide hosts the EXISTING extracted controls +
  `OvercastAllocator` in its own single `aria-modal` body (design §"Overlay layering").
- Open Questions OQ-1..OQ-6 remain user-confirmation items; the guide surfaces Malignant-Influences/saturation and
  the Major-miscast path as context/existing-escalation only (no new mechanic).

## Notes / assumptions

- Baseline eslint has 3 pre-existing `react-refresh/only-export-components` warnings
  (`CommandPaletteContext.tsx`, `CombatPage.tsx`, `SettingsPage.tsx`) unrelated to this feature; the gate requires
  no NEW warnings. If a new shared-module file would trip that rule, keep component-only exports (put constants/types
  in a sibling module) rather than adding a disable.
- Co-locating `SpellCard`/`SpellCastingGuideHandle` with the panel is acceptable (the panel already co-locates
  `SpellCard`); do not introduce a new eslint-disable for it.
