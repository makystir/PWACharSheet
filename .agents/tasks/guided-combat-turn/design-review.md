# Design Review — Guided Combat Turn Walkthrough

Reviewed: `design.md` against `requirements.md`, the WFRP4e rulebooks in
`docs/`, and the actual source in `src/`. This is a fresh review; every rulebook
citation and every "we reuse the existing X" claim was independently verified by
reading the cited file, not taken on the design's word.

**Verdict: APPROVED** — zero HIGH and zero MEDIUM findings. Three NITs are
recorded below for the implementer; none block implementation.

---

## Verified Assumptions (independently confirmed)

### Rulebook (RAW) citations — all confirmed in `docs/WarhammerFantasyRoleplay4e.md`

1. **Turn = one Move + one Action, either order, either skippable.** Verbatim at
   line 7617: *"On your Turn you have a Move and an Action, you can take these in
   any order … You can also skip taking an Action or Move, though you won't get
   another opportunity until the next Round!"* The TOC (line 217) pins "Taking
   Your Turn" to **p.157**; the verbatim sentence sits just before the
   `_page_156_Picture_17` marker, so the markdown pagination straddles p.156–157.
   The design cites **"Core p.156–157"** and explicitly flags this
   pagination-granularity nuance under "Remaining rulebook ambiguities." Correct
   and honestly disclosed.
2. **Move / Charge / Skill-Test-Move-uses-Action.** Confirmed (lines ~7627–7633):
   *"use your Move to Charge into close combat, gaining +1 Advantage (see page
   164)"* and *"Reaching difficult places … will also use your Action if you need
   to Test a Skill."* The design renders Charge as `Core p.156–157 (Advantage
   p.164)`, matching the book's own cross-reference, and never auto-applies the +1.
   Correct.
3. **Action / Free Actions / On The Defensive / Default Combat Difficulty.**
   Confirmed on p.157 (lines ~7636–7665): Action *"only limited by your
   imagination"*; Free Actions GM-adjudicated (*"if an act requires you to make a
   Test, it is an Action"*); **On The Defensive** *"+20 to defensive Tests … until
   the start of your next Turn"*; **Default Combat Difficulty** *"all Difficulty
   is assumed to be Challenging (+0)."* All quoted accurately.
4. **Advantage benefits + Losing Advantage.** Confirmed (lines 7948–7953):
   *"Each Advantage you secure adds +10…"* and *"If you lose an Opposed Test …
   suffer any Conditions (see page 167), or lose any Wounds, you automatically
   lose all Advantage. Further, should the combat end, all Advantage … is lost …
   used to Disengage from combat (see page 165)."* TOC pins Advantage to p.164
   while the markdown markers read `_page_163_`; the design cites the
   authoritative TOC value **p.164** and flags the marker offset. **Disengage is
   p.165** per the in-text cross-reference, and the design cites Disengage as
   `Core p.165`. Correct.
5. **End-of-turn / Master Condition List timing (p.167–169).** Confirmed: TOC
   (lines 231–234) pins Conditions / Multiple Conditions / Master Condition List
   to **p.167** and Fate & Resilience to **p.170**, so the list spans
   **p.167–169**. Individual effects verified in the condition entries: Stunned →
   *"Challenging (+0) Endurance Test"*; Surprised → auto-removed end of Round;
   Blinded/Deafened → *"removed at the end of every other Round"*; Broken → Cool
   Test; Bleeding/Ablaze/Poisoned → damage at end of Round. The design's
   `p.167–169` citation is correct (and a prior review's `p.168–169` was corrected
   in both documents).

### Source-code orchestration claims — all confirmed in `src/`

6. **`CombatPage.tsx` imports `{ useState, useCallback }` (line 2).** Confirmed.
   Adding `useReducer`/`useEffect` is the correct minimal import delta.
7. **Segmented control is `role="tablist"` with exactly three tabs.** Confirmed
   (CombatPage.tsx). Adding the trigger as a trailing sibling *outside* the
   tablist preserves the DOM contract (AC-3).
8. **Attack-mode panel kept mounted + CSS-hidden across modes
   (`modePanel`/`modePanelHidden`).** Confirmed. The Step-2 "set `combatMode =
   'attack'` then scroll/focus AttackFlow" hand-off is feasible exactly as
   described (AttackFlow persists its internal state across mode switches).
9. **End Turn internals live inside `CombatDashboardFull`.** Confirmed:
   `handleEndTurn` (line 342), `handleApplyEndOfTurn` (374), `handleCancelEndOfTurn`
   (395), `<EndOfTurnReportModal>` (~824), and the button
   `data-testid="end-turn-btn"` + `aria-label="End Turn"` (~805–811). `CombatPage`
   only supplies the `onEndTurn` apply callback. The design's decision to
   *reveal/focus* the existing button (not own one) is sound and matches the code.
10. **Round advance routes solely through `onEndTurn` (not double-counted).**
    Confirmed: `handleApplyEndOfTurn` calls `onUpdateRound(1)` **only in the
    `else` fallback** (when `onEndTurn` is absent). CombatPage always passes
    `onEndTurn`, which sets `currentRound = result.roundAdvanced`. So the design's
    `currentRound`-keyed reset boundary observes exactly one advance per End Turn.
11. **`handleRollReminder` + `resolveReminderBaseTarget` + `deriveAllReminders`.**
    Confirmed in CombatDashboard.tsx (lines ~176, ~186–193). The design reproduces
    the **exact** call
    `deriveAllReminders({ conditions, psychologyTraits: character.psychologyTraits ?? [], psychologyEnabled: character.houseRules?.usePsychologyTracker ?? false })`
    including the `psychologyEnabled` parameter name. The seeded-roll shape
    `{ name, baseTarget, difficulty }` matches. No roll math is forked
    (`performRoll` stays the single resolver).
12. **`SuggestionSource` boundary.** Confirmed in `src/logic/assistant/types.ts`:
    `getSuggestions(...) => Suggestion[] | Promise<Suggestion[]>`. The design does
    **not** modify or narrow it; the parallel `TurnAdvisorSource` carries the same
    sync/async-union contract, keeping the seam intact and future-proof (FR-7,
    AC-18). No network/LLM code is introduced.
13. **`reminderRollState` shell precedent.** Confirmed in `App.tsx` (line 465) as
    `{ name, baseTarget, difficulty }` with `ReminderRollState` exported from
    `useAssistantActions`. The design's host-level seeded `RollDialog` on
    CombatPage mirrors this; it is the same seeding inputs, not a second resolver.
14. **`activeInitiativeIndex` reset signal.** Confirmed: the field is at the
    Character root (`character.activeInitiativeIndex`, optional `number`), and
    `InitiativeTracker`'s "Next" advances it via `nextTurn`. The design watches
    `character.activeInitiativeIndex` (correct path, not `combatState.*`).
15. **Accessibility precedents.** Confirmed: `AssistantPanel` uses
    `createPortal(_, document.body)`, `role="dialog"` + `aria-modal="true"`,
    `data-variant` drawer/sheet on `useMediaQuery('(max-width: 767px)')`, focus
    trap + restore via `previousFocusRef`. `CommandPalette` matches. The design's
    a11y section is consistent with these shipped patterns.
16. **Calculated-total tooltip pattern.** Confirmed: `InitiativeTracker` uses
    `TooltipTriggerCell` + `Tooltip` (shared) for its rolled value exactly as the
    design references. The v1 design echoes **no** calculated total of its own
    (it points at dashboard/modal/RollDialog totals that already carry tooltips),
    so AC-16 / the calculated-total-tooltips steering rule is satisfied, and the
    obligation for any future inline total is recorded.
17. **Reuse of `onOpenConditionPicker`, `onUpdateRound`, AttackFlow, TakeDamagePanel.**
    All confirmed present on the existing CombatPage/CombatDashboard wiring. No
    duplication of attack resolution, damage math, end-of-turn processing, or
    reminder derivation is introduced (NFR-2).

### Non-functional / scope claims — confirmed

18. **Opt-in, off by default, dismissible; UI unchanged when off.** The trigger
    renders only when `inCombat` and only when the guide is closed; the panel
    mounts only when `inCombat && guideOpen`; no existing JSX is modified
    (AC-1/AC-2/AC-3/NFR-5). Design is internally consistent.
19. **Transient local-only state; resets at turn/round/END COMBAT; nothing
    persisted.** `turn` (reducer) + `guideOpen` are component/host state; three
    `useEffect`s keyed on `activeInitiativeIndex` / `currentRound` / `inCombat`
    reset; no new `Character`/`CombatState` fields. Idempotent-reset and
    manual-rewind edge cases are explicitly addressed. Matches FR-5.
20. **No auto-apply / no auto-advance; Move/Action tracking is guidance only.**
    The reducer sets `moveUsed`/`actionUsed` only on explicit player events, never
    gates, never infers a mutation; `chooseOption` may advance `choose → resolve`
    but only on the player's tap. Matches FR-4 / AC-12 / AC-13.
21. **Exotic cases deferred; v1 = standard on-foot turn.** Free Actions, On The
    Defensive (+20), multiple/extra attacks (incl. Frenzy Free Action Melee Test),
    mounted combat (Up In Arms ~p.105), Group Advantage (Up In Arms ~p.133), and
    Disengage resolution are all explicitly deferred and surfaced at most as cited
    guidance. Matches the requirements' Ambiguities / Out-of-Scope.
22. **Pure reducer has a property-testable contract.** `turnReducer(state, event)`
    is declared pure/total/deterministic with enumerated transition rules and a
    concrete invariant list (membership, `next∘back` round-trip, `reset` ≡ initial,
    flags never change `step`, no input mutation). Property + unit + steps tests
    are specified. Contract is testable in isolation.
23. **Testing strategy is concrete and verifiable.** Per-AC component/integration
    coverage plus the four verification commands (`tsc --build`, `npm run build`,
    `vitest --run`, `eslint .`) and the "existing combat suite unchanged"
    guarantee. Adequate.

---

## Findings

### NIT-1 — "Attacking, Core p.157–158" citation granularity
**Where:** Decision/RAW-structure "Action options" bullet — *"attacking (→
**Attacking**, Core p.157–158)"*.
**Problem:** The TOC (line 219) pins "Attacking" to **p.158**, and in the markdown
the Attacking heading appears after the `_page_157_Picture_19` marker / before
`_page_158_Picture_20`. The span "p.157–158" is defensible (the section opens at
the p.157/158 boundary) but is one page looser than the TOC's single-page pin,
and the design has been meticulous elsewhere about distinguishing TOC-pinned pages
from marker offsets.
**Concrete fix:** Either cite the Attacking hand-off as **`Core p.158`** (TOC
value, consistent with how Advantage→p.164 was handled) or add a one-line note
under "Remaining rulebook ambiguities" that Attacking is TOC-pinned to p.158 and
the p.157–158 span reflects the section's boundary placement — same treatment the
Move/Action straddle already received. No mechanic is affected either way.

### NIT-2 — Existing `StepIndicator` component not referenced
**Where:** "Accessibility" (stepper semantics) and the new-files list
(`GuidedTurnPanel.tsx`).
**Problem:** The codebase already ships `src/components/combat/StepIndicator.tsx`
(and a shared one) that renders `aria-current="step"` and is covered by tests
(`StepIndicator.test.tsx`, `CombatPage.integration.test.tsx`). The design
re-specifies stepper semantics from scratch without noting whether it reuses
`StepIndicator` or renders a bespoke list. This is not a correctness gap (the
described semantics are correct), but calling it out would reduce duplication and
keep the a11y contract aligned with the shipped component.
**Concrete fix:** Add a sentence to the Accessibility section stating whether the
guide reuses the existing `StepIndicator` for the 1-of-4 progress affordance (and
if not, why a bespoke ordered-list stepper is preferred). If reused, confirm it
supports the `aria-current="step"` + `aria-live` announcement the design wants.

### NIT-3 — Charge "see page 165" vs Move-subsection "see page 164" not fully reconciled
**Where:** "Remaining rulebook ambiguities" (Charge note) and the Advantage
"Gaining Advantage" list.
**Problem:** The design renders Charge as `Core p.156–157 (Advantage p.164)`,
matching the **Move** subsection's own cross-reference (*"gaining +1 Advantage
(see page 164)"*). However, the **Gaining Advantage** list on the Advantage page
cross-references Charging to *"See page 165"*. Both numbers appear in the
rulebook for Charge, so the design's choice is defensible, but the mismatch is not
acknowledged, which could confuse the implementer baking the citation string into
`steps.test.ts`.
**Concrete fix:** Add a half-line to the Charge ambiguity note: the Move
subsection cross-refs Charge→Advantage at p.164 while the Gaining-Advantage list
cross-refs Charging→p.165; the guide follows the Move subsection (p.164) because
that is where the guide names the Move option. This keeps the baked citation
string unambiguous and auditable.

---

## Unverified / Wrong Assumptions

None. Every rulebook quotation and every source-code claim in the design was
checked against the actual file and found accurate. The two prior-review
corrections (End Turn hand-off feasibility; `p.167–169` condition timing) are
reflected correctly in the current document and match the source and rulebook.

---

## Summary

The design is implementation-ready. It orchestrates existing modules
(AttackFlow, CombatDashboard's End Turn flow, `deriveAllReminders`,
`resolveReminderBaseTarget` + shared `RollDialog`, InitiativeTracker,
condition picker) without forking attack resolution, damage math, end-of-turn
processing, or reminder derivation. Nothing auto-applies or auto-advances; the
Move/Action tracking is clearly specified as guidance-only. The opt-in overlay is
off by default, dismissible, and leaves the existing combat UI byte-for-byte
unchanged when off. Turn state is transient/local with well-specified resets and
no new persisted combat fields. The `SuggestionSource` seam is preserved and
future-proofed with no network/LLM code. Accessibility, calculated-total
tooltips, the property-testable reducer contract, exotic-case deferral, and the
testing strategy are all specified and consistent with shipped patterns. The
three NITs are citation/documentation polish and do not block.
