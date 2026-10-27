# Guided Combat Turn Walkthrough — Requirements

## Summary

Add an opt-in, step-by-step "co-pilot" that guides a player through a single
WFRP 4e combat turn. The guide **suggests and explains**; the player decides and
acts. It never auto-applies state and never auto-advances steps — every step is
explicit and player-driven, and every mutating action routes through an
**existing** flow (AttackFlow, the shared RollDialog, the condition picker, the
End Turn button + `EndOfTurnReportModal`, the round/initiative controls).

This mirrors the proactive-reminders, crit-pipeline, and Character Assistant
patterns already shipped in the codebase: a pure/derived guidance layer feeding a
thin UI that only ever *invokes* real handlers. No backend, no network, no LLM.
Transient turn state is local-only and resets at turn/round boundaries and at END
COMBAT.

The RAW turn structure the guide reflects is from the Core Rulebook **"Taking
Your Turn"** section (Core ~p.156–157): *"On your Turn you have a Move and an
Action, you can take these in any order … You can also skip taking an Action or
Move."* Advantage, Conditions, and end-of-round effects are cited inline in the
functional requirements below.

### Rulebook grounding (authoritative: `docs/WarhammerFantasyRoleplay4e.md`)

Verified against the Core Rulebook for this document:

- **Turn = one Move + one Action, either order, either skippable** — "Taking Your
  Turn" (Core ~p.156–157, verbatim: *"On your Turn you have a Move and an Action,
  you can take these in any order … You can also skip taking an Action or Move,
  though you won't get another opportunity until the next Round!"*).
- **Move options** — Move / Charge into close combat for +1 Advantage; a Move that
  needs a Skill Test (Climb, Athletics) also uses your Action (Core ~p.156, and
  **Moving**, Core p.164).
- **Action options** — attack, cast/pray, use a Skill, or "On The Defensive"
  (choose a Skill to use defensively for +20 to defensive Tests until your next
  Turn) (Core ~p.157).
- **Free Actions** — some acts (shouting, drawing a weapon, drinking a potion) do
  not consume your Action; GM adjudicates. General guide: *"if an act requires you
  to make a Test, it is an Action rather than a Free Action."* (Core ~p.157).
- **Losing Advantage** — *"If you lose an Opposed Test during combat, suffer any
  Conditions … or lose any Wounds, you automatically lose all Advantage."*
  (Core p.164, "Losing Advantage"). Suffering a Condition also immediately loses
  all Advantage (Core p.164, referenced from Conditions on p.167).
- **End-of-Round / end-of-turn condition effects** — Bleeding, Ablaze, Poisoned,
  Stunned (Endurance Test to remove), Surprised (auto-remove), Blinded/Deafened
  (removed every other Round), Broken (Cool Test to rally) — Master Condition
  List, Core p.167–169. These are **already computed** by
  `src/logic/end-of-turn.ts` (`processEndOfTurn`) and surfaced via
  `EndOfTurnReportModal`; the guide must not recompute them.

Any mechanic not confirmed in a rulebook must not be invented — see the
Ambiguities section, which lists the cases to defer rather than guess.

---

## Functional Requirements

### FR-1 — Opt-in affordance (OFF by default)

1. During active combat (`character.combatState.inCombat === true`), the Combat
   page presents a dismissible **"Guide my turn"** affordance.
2. The guide is **OFF by default**. It is only active after the player explicitly
   starts it, and it can be dismissed/closed at any time.
3. When the guide is off, the existing non-guided combat UI (segmented Attack /
   Defend / Status control, CombatDashboard, AttackFlow, TakeDamagePanel,
   reminders strip, End Turn, InitiativeTracker) remains fully usable and visually
   unchanged.
4. The affordance is not shown when combat is not active.

### FR-2 — Ordered turn sequence (RAW)

The guide presents an ordered, player-advanced sequence of steps reflecting the
RAW turn. Steps are advanced only by explicit player action (a "Next"/"Mark done"
control or an equivalent explicit confirmation) — **never** automatically.

1. **Step 1 — Start of turn / checks due.** Surface applicable reminders
   (conditions + psychology) for the current character, each with its rulebook
   citation, using the **existing** `deriveAllReminders` output (consume, do not
   fork). Roll-backed reminders hand off to the existing seeded RollDialog path
   (`handleRollReminder`); the guide adds no new roll logic. This is guidance
   only — nothing is auto-rolled or auto-removed.
2. **Step 2 — Choose Move and/or Action.** Explain the legal turn shape (one Move
   + one Action, either order, either skippable — Core ~p.156–157) and surface the
   option categories, each linking to the real control:
   - **Attack** → hands off to the existing `AttackFlow` (Attack mode).
   - **Cast / Pray** → links to the existing spell/prayer casting control
     (`SpellCastingPanel`) where present.
   - **Defend / other** → links to the relevant existing control (e.g. Defend mode
     / TakeDamagePanel, or a plain roll via the existing RollDialog for a Skill).
   The guide names the options and routes to real controls; it does not duplicate
   any resolution logic.
3. **Step 3 — Resolve the chosen action through the existing flow.** For an
   attack, the player resolves it entirely inside `AttackFlow` (select weapon →
   roll to hit → hit location → damage → consequences). The guide does not wrap,
   re-implement, or intercept AttackFlow's internal steps.
4. **Step 4 — End of turn.** Surface that pending end-of-turn condition effects
   (Bleeding/Ablaze/Poisoned damage, Stunned Endurance Test, etc.) exist, then
   drive the **existing** End Turn flow: the player presses End Turn, which shows
   `EndOfTurnReportModal` with the values `processEndOfTurn` already computed, and
   the player confirms/cancels. The guide must **not** duplicate or pre-empt that
   computation. After the existing End Turn applies, the round advances and
   initiative moves on via the existing `onUpdateRound` / InitiativeTracker
   controls.

### FR-3 — Rulebook-cited, guidance-only explanations

1. Each step shows a brief explanation of the legal options, with the Core page
   cited: the one-Move-one-Action shape (Core ~p.156–157), what Advantage does and
   that taking damage or suffering a Condition loses all Advantage (Core p.164),
   and the end-of-round condition timing (Core p.167–169).
2. All explanatory text is **guidance only** — it never gates, blocks, or forces a
   choice.
3. Citations shown in the guide must match the rulebook; no invented rule text,
   TNs, or costs.

### FR-4 — Soft Move/Action tracking (guidance, not a gate)

1. The guide tracks, within the current turn, whether the player has indicated
   "I did a Move" and "I did an Action" as **guidance**.
2. This tracking never hard-gates: the player can always deviate (do them in
   either order, skip one, or take neither), consistent with Core ~p.156–157.
3. The guide may reflect the RAW note that a Move requiring a Skill Test also uses
   the Action (Core p.164) as advice, but still must not block the player.

### FR-5 — Transient, local-only turn state

1. Guide state (current step, Move-used / Action-used flags, open/closed) is
   transient and local to the component — it is **not** persisted beyond the
   combat/undo state that already exists.
2. Guide state resets at turn and round boundaries and on END COMBAT.
3. No new persisted combat fields are introduced; the guide reads existing state
   (`combatState`, `conditions`, `advantage`, `wCur`, etc.) and reuses existing
   mutators.

### FR-6 — Route every action through existing flows (no new mutation)

1. The guide introduces **no new mutation logic**. Every state change it leads the
   player toward is performed by an existing handler:
   - attacks → `AttackFlow` and its existing consequence bridges;
   - rolls → the shared `RollDialog` seeded via the existing reminder path;
   - conditions → the existing condition picker (`onOpenConditionPicker`);
   - end of turn → the existing End Turn button + `processEndOfTurn` +
     `EndOfTurnReportModal`;
   - round/initiative → existing `onUpdateRound` / InitiativeTracker.
2. The guide must not auto-apply wounds, conditions, Advantage changes, round
   advances, or rolls.

### FR-7 — Future-proof SuggestionSource boundary (no LLM now)

1. If the guide derives its step content/suggestions through a source boundary,
   it must keep the existing `SuggestionSource` boundary intact and
   forward-compatible with a future async (e.g. LLM-backed) source — **without**
   adding any network/LLM code now.
2. The default and only shipped source remains the pure, deterministic, offline
   one.

### FR-8 — Calculated-total tooltips

1. Any calculated total the guide displays in the UI (e.g. if it echoes Advantage,
   Wounds max, a test target, or an end-of-turn damage figure) must show a
   breakdown tooltip via the existing `src/components/shared/Tooltip.tsx` /
   `TooltipTriggerCell`, per the calculated-totals steering rule.
2. Where the guide merely points at a total already rendered elsewhere (e.g. the
   CombatDashboard Wounds/Advantage), it should rely on that component's existing
   tooltip rather than recomputing the value.

---

## Non-Functional Requirements

### NFR-1 — Offline-first, local-only

No backend, network, telemetry, or LLM calls. All logic is local and deterministic
and works fully offline.

### NFR-2 — Consume, don't fork

Reuse `deriveAllReminders`, `AttackFlow`, `processEndOfTurn`,
`EndOfTurnReportModal`, the condition picker, RollDialog, and the round/initiative
controls. Do not re-implement attack resolution, damage math, end-of-turn
processing, or reminder derivation. Any shared helper extraction must be
behaviour-preserving.

### NFR-3 — Accessibility

1. The stepper has correct focus management: focus moves predictably as steps
   change and returns sensibly on open/close, consistent with existing
   dialogs/panels.
2. ARIA roles/labels mark the stepper, current step, and controls; the current
   step is announced to assistive tech.
3. Full keyboard navigation (advance, go back, close) with no keyboard trap,
   consistent with the existing CommandPalette / modal patterns.

### NFR-4 — Pattern & stack consistency

TypeScript + React 18 function components, CSS Modules, `lucide-react` icons,
Vitest + fast-check for any pure logic, `@testing-library/react` for component
tests — matching the shipped Character Assistant / reminders precedent.

### NFR-5 — No regression when off

With the guide off, existing combat tests and behaviour are unchanged.

---

## Acceptance Criteria (EARS-style, testable)

1. **AC-1** While combat is active and the guide is off, when the Combat page
   renders, then a dismissible "Guide my turn" affordance is visible and the guide
   is inactive.
2. **AC-2** When combat is not active, then the "Guide my turn" affordance is not
   rendered.
3. **AC-3** While the guide is off, the existing combat UI (segmented control,
   CombatDashboard, AttackFlow, TakeDamagePanel, reminders strip, End Turn,
   InitiativeTracker) renders and behaves exactly as before (no changed DOM
   contract for existing tests).
4. **AC-4** When the player starts the guide, then it opens at Step 1 (start of
   turn) and no character state has been mutated by the act of opening it.
5. **AC-5** While on Step 1, the guide lists exactly the reminders returned by
   `deriveAllReminders` for the current character (same items, same order), each
   showing its `citation`; it derives no reminders of its own.
6. **AC-6** When the player triggers a roll-backed reminder from Step 1, then the
   shared RollDialog opens seeded by the existing `handleRollReminder` path
   (name, base target, difficulty) and the guide performs no roll itself.
7. **AC-7** While on Step 2, the guide shows the one-Move-one-Action explanation
   citing Core ~p.156–157 and lists the Attack / Cast-Pray / Defend-other options,
   each wired to its real control.
8. **AC-8** When the player chooses "Attack" on Step 2, then control is handed to
   the existing `AttackFlow` (Attack mode) and the guide does not re-implement or
   intercept AttackFlow's internal steps.
9. **AC-9** While resolving an attack, the guide never applies wounds, conditions,
   or Advantage directly — all such changes occur only through AttackFlow's
   existing handlers.
10. **AC-10** While on Step 4, the guide states that end-of-turn condition effects
    may apply, and the only way they are applied is the player pressing the
    existing End Turn button, which shows `EndOfTurnReportModal` with
    `processEndOfTurn` values; the guide computes none of these numbers itself.
11. **AC-11** When the player confirms End Turn, then wounds/conditions/round
    advance via the existing End Turn apply path; when the player cancels, then no
    state changes (identical to current behaviour).
12. **AC-12** The guide never advances from one step to the next without an
    explicit player action; there is no timer or automatic progression.
13. **AC-13** When the player marks "I did a Move" and/or "I did an Action", then
    the guide records it as guidance only and still allows the player to take any
    legal action, skip, or deviate (no hard gate).
14. **AC-14** When the turn ends, the round advances, or combat ends (END COMBAT),
    then the guide's transient state (current step, Move/Action flags) resets and
    no guide-specific state is persisted.
15. **AC-15** Every explanation shown by the guide that encodes a rule includes a
    Core page citation matching the rulebook; no invented rule, TN, or cost
    appears.
16. **AC-16** Any calculated total the guide itself displays has a breakdown
    tooltip via the shared `Tooltip` component; totals it only references are left
    to their owning component's existing tooltip.
17. **AC-17** The stepper is keyboard-navigable and manages focus per NFR-3, with
    ARIA marking the current step; no keyboard trap exists.
18. **AC-18** No code path added by the guide performs a network, backend,
    telemetry, or LLM request; the `SuggestionSource` boundary (if used) remains
    sync-by-default and non-breaking for a future async source.
19. **AC-19** With the guide off, the existing combat test suite passes unchanged
    (no regression).

---

## WFRP 4e Rulebook Ambiguities (flagged — recommend deferring from v1)

These are genuine RAW ambiguities or non-standard cases. Per the rules-compliance
steering rule, they are flagged rather than guessed, and recommended **out of
scope for v1**:

1. **Free Actions vs Actions (Core ~p.157).** The rulebook leaves what counts as a
   Free Action (shout, draw weapon, drink potion) to GM adjudication — *"It's the
   GM's decision … A good general guide is that if an act requires you to make a
   Test, it is an Action."* There is no deterministic list the app can enforce.
   **Recommendation:** v1 mentions Free Actions as guidance text only (citing
   p.157) and does not track or gate them.
2. **"On The Defensive" option (Core ~p.157).** Choosing a Skill to use
   defensively (+20 to defensive Tests until next Turn) is an Action-level choice
   whose effect spans into the opponent's turn. The app has no persistent
   "defensive stance" buff tracker. **Recommendation:** surface it as a named
   Action option with its citation in v1, but do not auto-apply or track the +20;
   defer stance tracking.
3. **Multiple attacks / extra attacks.** Talents and traits that grant more than
   one attack per turn (e.g. Frenzy's Free Action Melee Test, Core p.190; other
   multi-attack sources) deviate from the one-Move-one-Action baseline.
   **Recommendation:** defer; v1 assumes a single standard Action.
4. **Mounted combat (Up In Arms, "Mounted Combat", ~p.105).** Up In Arms provides
   expanded/clarified mounted rules (mount's Move, trampling, etc.) that change the
   turn shape. **Recommendation:** defer; v1 is on-foot only.
5. **Expanded Advantage / Group Advantage (Up In Arms, "Group Advantage",
   ~p.133).** Up In Arms offers an alternative Advantage system; the app already
   has a Group Advantage house rule in CombatDashboard. The guide should defer to
   whatever Advantage model is already active and not introduce a competing
   explanation. **Recommendation:** the guide's Advantage explanation cites Core
   p.164 and otherwise points at the existing CombatDashboard Advantage control;
   do not re-explain or re-mechanic Group Advantage in v1.
6. **Special/free movement and Disengage (Core p.164–165).** Disengaging from
   combat and other special movement interact with Advantage and Opposed Tests.
   **Recommendation:** name Disengage as a Move option with its citation; defer any
   bespoke Disengage resolution to the existing controls.

---

## Out of Scope (v1)

- Any backend, network, telemetry, or LLM integration (explicitly excluded; the
  `SuggestionSource` boundary is merely kept future-proof).
- Re-implementing or forking attack resolution, damage/mitigation math,
  end-of-turn processing, or reminder derivation.
- New persisted combat state or new mutation logic.
- Mounted combat, multiple/extra attacks, defensive-stance (+20) tracking, Free
  Action tracking, and bespoke Disengage resolution (all deferred — see
  Ambiguities).
- Multi-combatant / GM-side turn orchestration beyond the single sheet owner's
  turn and the existing InitiativeTracker.

---

## Assumptions

- The guide is a single-character, player-facing co-pilot for the sheet owner's
  own turn; it does not orchestrate other combatants.
- "Guide my turn" lives on the Combat page alongside the existing segmented
  control / dashboard; exact placement is a design decision, constrained only by
  FR-1 (opt-in, dismissible, off by default) and NFR-3 (accessibility).
- Page citations use the Core Rulebook markdown in `docs/`; the "Taking Your Turn"
  / Move / Action text resolves to Core ~p.156–157, Advantage to p.164, and the
  Master Condition List to p.167–169 (verified in this document). The design step
  should re-confirm exact page numbers against `docs/WarhammerFantasyRoleplay4e.md`
  where a precise citation is rendered.
