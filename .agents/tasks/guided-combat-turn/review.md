# Review — Guided Combat Turn Walkthrough

**Verdict: APPROVED** — no blocking findings; recorded verification is clean and
corroborated by a narrow spot-check.

Scope reviewed: commits `65d1a0b` (feat: add opt-in Guided Combat Turn
Walkthrough) and `89e6898` (refactor: remove undisclosed eslint-disable in
GuidedTurnPanel) against `plan.md`, `design.md`, `requirements.md`, and the
rulebooks in `docs/`. The progression-advisor files in `git diff` belong to a
separate commit (`2233d14`) and are out of scope for this review.

---

## Verification evidence

Recorded by the coder in the commit messages (not re-run in full per the review
protocol):

- `npx tsc --build --force --noEmit`: OK
- `npm run build`: built successfully
- `npx vitest --run`: 502 files, 5437 tests passed
- `npx eslint .`: 0 errors; 3 pre-existing `react-refresh/only-export-components`
  warnings (CommandPaletteContext.tsx:43, CombatPage.tsx:59, SettingsPage.tsx:30);
  no new warnings
- `89e6898` additionally recorded `eslint … --report-unused-disable-directives`
  on GuidedTurnPanel.tsx emitting no output.

Narrow spot-check I ran (specific doubt: that the review-fix in `89e6898` left
no undisclosed/unused disables and that the pure module is green):

- `npx eslint src/components/combat/{GuidedTurnPanel,GuidedTurnTrigger}.tsx
  src/components/combat/guidedTurnSteps src/logic/combat-turn
  src/components/pages/CombatPage.tsx --report-unused-disable-directives`
  → 0 errors; 1 warning only: the pre-existing `react-refresh` warning at
  `CombatPage.tsx:59` (the `CombatMode` type export, pre-existing to this
  feature). No unused disable directives reported.
- `npx vitest --run src/logic/combat-turn` → 3 files, 18 tests passed.

Both are consistent with the recorded full-suite evidence.

---

## Checklist findings

### Mechanics / RAW — PASS
Every mechanic rendered carries a Core citation, and each was verified against
`docs/WarhammerFantasyRoleplay4e.md`:
- Turn = one Move + one Action, either order, either skippable — verbatim text
  found ("You can also skip taking an Action or Move, though you won't get
  another opportunity until the next Round!"); TOC pins "Taking Your Turn" to
  p.157. Cited `Core p.156-157`. ✔
- On The Defensive +20 to defensive Tests until next Turn (p.157) — found. ✔
- Default combat Difficulty Challenging (+0) (p.157) — found verbatim ("During
  combat, all Difficulty is assumed to be Challenging (+0)"). ✔
- Attacking p.158 (TOC) — guide cites `Core p.157-158`, consistent. ✔
- Advantage / Disengage p.164 (TOC lists Advantage p.164, Moving p.164) — cited
  `Core p.164`; Charge rendered `Core p.156-157 (Advantage p.164)`. ✔
- Master Condition List / Conditions p.167 (TOC) — end-of-turn timing cited
  `Core p.167-169`. ✔

No invented TNs, costs, or rules. `steps.test.ts` guards each step's citation
against the approved page strings (AC-15). Exotic cases (mounted, multiple
attacks, On The Defensive/Disengage tracking, Free Actions) are deferred and
rendered as named, cited, guidance-only text — matching the requirements'
Ambiguities section.

### Orchestration not duplication (NFR-2) — PASS
- `StartStep` reuses the existing presentational `CombatReminders` component; no
  forked reminder UI.
- Host `guideReminders` calls `deriveAllReminders({ conditions, psychologyTraits,
  psychologyEnabled })` with the **identical** argument shape as
  `CombatDashboard`'s memo (confirmed line-for-line).
- `onGuideRollReminder` mirrors `CombatDashboard.handleRollReminder` exactly:
  `resolveReminderBaseTarget(character, test.def)` + `test.rollName` +
  `test.difficulty`, seeding the shared `RollDialog`. `performRoll` remains the
  sole resolver; no new roll math.
- Step 2 hand-offs only set `combatMode` ('attack'/'status'/'defend') to reveal
  the already-mounted AttackFlow / SpellCastingPanel / TakeDamagePanel.
- Step 4 `onGuideRevealEndTurn` queries the existing `[data-testid=end-turn-btn]`,
  scrolls (guarded for jsdom) and `.focus()`es it; it never calls
  `handleEndTurn`/`processEndOfTurn`. The guide owns **no** End Turn button.
- No new attack/damage/end-of-turn/reminder-derivation or mutation logic added.

### No auto-apply / no auto-advance — PASS
- `turnReducer` is pure and event-driven; every transition is an explicit player
  event (`next`/`back`/`goto`/`chooseOption`/`markMove`/`markAction`/`reset`). No
  timers anywhere.
- `chooseOption` advances `choose → resolve` only because the player tapped, and
  never sets `actionUsed` (asserted in `reducer.test.ts`).
- Integration tests assert `update`/`updateCharacter` are **not** called on:
  opening the guide (AC-4), choosing Attack (AC-8/AC-9), and triggering a
  reminder roll (AC-6). The RollDialog opens seeded but applies nothing.

### Opt-in, OFF by default, dismissible, no-regression — PASS
- Trigger renders only when `inCombat` (AC-2 test) and only when the guide is
  closed; it is a sibling **outside** `role="tablist"` (AC-3 test asserts the
  tablist still has exactly three tabs and the trigger is not inside it).
- Panel renders only when `inCombat && guideOpen`. Close button, Esc, and
  backdrop click all dismiss. Coexists with Attack/Defend/Status and START/END
  COMBAT; no existing dashboard/mode-panel/AttackFlow/TakeDamage/reminders/End
  Turn/InitiativeTracker JSX modified.

### Transient/local reset boundaries (FR-5) — PASS
Three `useEffect`s keyed on `activeInitiativeIndex`, `combatState.currentRound`,
and `combatState.inCombat` dispatch `reset`; the `inCombat → false` effect also
force-closes the panel. Integration tests cover all three (currentRound change,
activeInitiativeIndex change, END COMBAT closes the dialog). No new persisted
`Character`/`CombatState` fields.

### SuggestionSource boundary / offline-first (FR-7, NFR-1, AC-18) — PASS
- `src/logic/assistant/types.ts` `SuggestionSource` is untouched. The guide adds
  its own parallel `TurnAdvisorSource` with the same sync/async-union contract;
  the shipped `defaultTurnAdvisor` is synchronous. `steps.test.ts` asserts the
  default advisor returns a non-Promise.
- No `fetch`/XHR/WebSocket/beacon/LLM/telemetry in the feature code (grep clean);
  only comments referencing a future LLM seam. `GuidedTurnPanel.test.tsx` spies
  `globalThis.fetch` and asserts zero calls.

### Accessibility (NFR-3) — PASS
`role="dialog"` + `aria-modal="true"` + `aria-label`; focus moved to the step
heading on open/step-change and restored to the previous element on close; Esc
closes; ArrowLeft/ArrowRight navigate; Tab focus trap; stepper uses
`aria-current="step"`; an `aria-live="polite"` region announces the step. Covered
by `GuidedTurnPanel.test.tsx` and the integration accessibility test.

### Calculated-total tooltips (FR-8 / steering) — PASS
The guide echoes no calculated total (it points at totals the
dashboard/RollDialog/EndOfTurnReportModal already render). The only `Tooltip`
usage is the disabled-Cast explanation in `ChooseStep` — not a numeric total.
`TooltipTriggerCell` does not exist in the repo; the plan documents this and v1
correctly needs no total breakdown.

### No error-hiding suppressions — PASS
- Exactly one sanctioned `eslint-disable-next-line react-hooks/set-state-in-effect`
  in `CombatPage.tsx` for the END COMBAT force-close, mirroring `Tooltip.tsx` /
  the existing `CombatDashboard`/`TakeDamagePanel` precedent.
- `89e6898` removed a previously-undisclosed `react-hooks/exhaustive-deps` disable
  in `GuidedTurnPanel.tsx`; grep confirms the panel now has no disable, and
  `--report-unused-disable-directives` is clean.
- The single `@ts-expect-error` in `reducer.test.ts` is a legitimate test of the
  invalid-`goto` no-op path (asserting the reducer returns `state` unchanged for
  an out-of-range step), not error-hiding.
- No skipped/`.only`/`it.todo` tests in the feature.

### v1 scope — PASS
On-foot standard turn only; mounted combat, multiple/extra attacks,
defensive-stance and Free-Action tracking, and bespoke Disengage are deferred and
surfaced as cited guidance text, exactly as the requirements prescribe.

---

## Conclusion
The implementation faithfully follows the approved plan and design, honours the
rules-compliance and calculated-totals steering rules, and introduces no
reachable correctness, security, or data failure. Verification is recorded and
clean, and corroborated by a narrow spot-check. **APPROVED.**
