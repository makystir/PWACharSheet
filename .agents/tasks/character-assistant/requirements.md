# Character Assistant — Requirements

## Summary

The app today is a passive tracker: it computes a great deal of actionable state
(unspent XP, pending endeavours, encumbrance, corruption, combat/psychology
reminders) but leaves the player to go looking for it page by page. The
**Character Assistant** turns the app into an active assistant by surfacing that
already-computed state as a single, consolidated, non-intrusive list of
**suggestions** — short recommendations that the player may act on with one tap.

The Assistant is a persistent control (a badge-carrying trigger) that opens a
dockable panel: a slide-over **drawer** on desktop and a **bottom sheet** on
mobile. It is **closed by default**, dismissible, and never permanently occupies
or covers the content the player is working on. Each suggestion carries a short
title, a brief "why" rationale (rulebook-cited where it encodes a rule), and a
one-tap action. The action never applies anything itself — it routes through the
app's existing, explicit, player-confirmed flows (open the roll dialog, navigate
to the relevant page/sub-tab, or invoke the real advance/apply handler). The
player always decides.

The suggestion engine is a **pure, deterministic, offline** function with no
AI/LLM, no backend, and no network. It is modelled behind a `SuggestionSource`
interface so that an optional LLM-backed source could later feed the same panel
with no UI rewrite, while the deterministic engine remains the default and
permanent offline fallback.

This is **additive**. It must not regress the recently completed UX work (reduced
page busyness, the nav touch-end fix, consistent collapse chevrons), and all
existing tests must stay green unchanged.

### Grounding (verified against the codebase)

- `src/components/command-palette/CommandPaletteContext.tsx` — the provider +
  `open()`/`close()`/`toggle()` + overlay shape the Assistant mirrors.
- `src/components/layout/Navigation.tsx` — renders Search and Keyboard-Shortcuts
  triggers (desktop sidebar + mobile scroll row) via `useCommandPaletteContext`,
  and already renders nav badge dots (`badgeItems`, `styles.badgeDot`).
- `src/App.tsx` — `showAdvancementBadge={character.xpCur > 0}` and
  `showEndeavoursBadge={character.endeavours.some(p => p.entries.some(e =>
  e.status === 'pending' || e.status === 'in_progress'))}` are already computed
  and passed to `Navigation`.
- `src/logic/reminders.ts` — `deriveAllReminders` / `deriveConditionReminders` /
  `derivePsychologyReminders` return `CombatReminder[]` (already rulebook-cited,
  with `test` descriptors and `citation` strings). `CombatDashboard.tsx` consumes
  these and seeds the shared `RollDialog` via `handleRollReminder`; it gates on an
  `inCombat` flag.
- `src/logic/advancement-planner.ts` (`planNextCareerLevel`) and
  `AdvancementPage.tsx` (`readyToProgress = charsMet && skillsMet && talentsMet`,
  `canAffordAdvance`) already compute advancement readiness.
- `src/logic/encumbrance.ts` (`getEncumbranceLevel`) / `calculateMaxEncumbrance`
  (Core p.293) / `sheet-totals.ts` (`maxEncumbrance`) already compute encumbrance.
- `src/logic/corruption.ts` (`getCorruptionThreshold = TB + WPB + Pure Soul`,
  `getCorruptionStatus`) already computes the corruption threshold/status.
- `src/components/shared/Tooltip.tsx` — the shared tooltip used for breakdown
  tooltips (hover on desktop, tap on mobile), rendered via portal with
  `role="tooltip"` and Escape/outside-dismiss.

---

## Functional Requirements

### FR-1 — Persistent Assistant control + badge

- **FR-1.1** A single persistent "Assistant" trigger control exists.
- **FR-1.2** The trigger shows a **badge count** of currently active, actionable
  suggestions (the count of suggestions the engine emits for the active
  character and context). When the count is 0, no count is shown (the trigger
  remains visible and usable).
- **FR-1.3** The panel is **closed by default**; activating the trigger opens it;
  the panel is dismissible back to the closed state.

### FR-2 — Dockable, non-intrusive panel

- **FR-2.1** On desktop the panel is a slide-over **drawer**; on mobile it is a
  **bottom sheet** (breakpoint consistent with the existing `useMediaQuery`
  `(max-width: 767px)` convention used by `Navigation`).
- **FR-2.2** The panel is non-blocking and never permanently occupies layout
  space or covers the primary content area while closed. It does not regress the
  reduced-page-busyness work.
- **FR-2.3** The panel lists suggestions **grouped by context/urgency**. Each item
  renders: a short **title**, a one-tap **action** control, and a brief **"why"
  rationale**.

### FR-3 — Context-aware ordering

- **FR-3.1** The engine receives a `context` describing at minimum whether the
  character is **in combat** (derivable from the same signal `CombatDashboard`
  uses for its `inCombat` gate). The `context` type must be extensible without a
  breaking change.
- **FR-3.2** **In combat**, combat suggestions (surfaced reminders) rank first.
- **FR-3.3** **Out of combat**, downtime/progression suggestions (advancement,
  endeavours) rank first.
- **FR-3.4** Ordering is deterministic: identical `(character, context)` inputs
  always yield the same ordered list.

### FR-4 — Dismiss / snooze

- **FR-4.1** A suggestion can be **dismissed**.
- **FR-4.2** A suggestion can be **snoozed**.
- **FR-4.3** Dismiss/snooze state is per-suggestion (keyed by the suggestion's
  stable `id`) and persisted **locally only** (no network). Dismissed/snoozed
  suggestions do not contribute to the FR-1.2 badge count while suppressed.
- **FR-4.4** Snooze expiry and dismiss scope (e.g. does a dismissed suggestion
  reappear when its underlying condition clears and re-triggers?) are defined in
  design; see **OQ-5**.

### FR-5 — Deterministic suggestion engine (the boundary)

- **FR-5.1** The engine is a pure function, shaped like
  `getSuggestions(character, context): Suggestion[]`. It performs **no side
  effects** — it never mutates the character, never writes storage, never
  navigates, never opens dialogs, never touches the network.
- **FR-5.2** `Suggestion` is a plain, serializable data type:
  `{ id, title, rationale, category, urgency, action }`.
  - `id` — stable string key for React lists, dedupe, and dismiss/snooze.
  - `title` — short human-readable label.
  - `rationale` — brief "why" string (rulebook-cited where it encodes a rule).
  - `category` — grouping key (e.g. `combat` | `advancement` | `endeavour` |
    `encumbrance` | `corruption`).
  - `urgency` — ordering/grouping signal.
  - `action` — a **descriptor** (see FR-6), not a function/closure.
- **FR-5.3** `Suggestion` and `action` descriptors must be JSON-serializable
  (no functions, DOM nodes, or class instances), so a future async source could
  produce them off-thread or over a boundary without the UI changing.

### FR-6 — Action descriptors route through existing flows only

- **FR-6.1** `action` is a discriminated-union **descriptor** that references
  existing explicit flows, for example:
  `{ kind: 'navigate', page, subTab? }` | `{ kind: 'roll', ... }` |
  `{ kind: 'openSection', ... }`. The exact union is fixed in design.
- **FR-6.2** The **UI** interprets the descriptor and invokes the real handler
  (the `navigate(page, subTab)` already threaded through `App.tsx`; the shared
  `RollDialog` seeded exactly as `CombatDashboard.handleRollReminder` does;
  opening the relevant page section/panel). The engine never performs the action.
- **FR-6.3** **Nothing is ever auto-applied.** Every action lands the player on
  an existing explicit, player-confirmed step (a dialog, a page, or a handler the
  player then confirms). No suggestion mutates character state without that
  explicit confirmation.
- **FR-6.4** A `roll` action descriptor reuses the existing reminder `test`
  shape (characteristic/skill def + difficulty + roll name) so the panel can seed
  `RollDialog` with no new roll logic.

### FR-7 — `SuggestionSource` interface (LLM future-proofing)

- **FR-7.1** The engine is exposed as an implementation of a `SuggestionSource`
  interface. The panel consumes `Suggestion[]` from a source and **knows nothing**
  about how they were produced.
- **FR-7.2** The interface is typed so that an **async** variant is a
  **non-breaking** extension of the current sync variant (e.g. the source method's
  return type permits `Suggestion[] | Promise<Suggestion[]>`, or an explicit
  async sibling method, chosen in design). This design intent must be documented
  in code comments at the interface.
- **FR-7.3** The deterministic engine is the **default** source and the
  **permanent offline fallback**. No network code, provider SDK, or backend is
  added now; the interface must merely not preclude one.

### FR-8 — Starter suggestion set (v1 scope)

All items derive from data the app **already computes**. No new mechanics are
invented. Each item contributes to the FR-1.2 badge count and acts via existing
flows only.

- **FR-8.1 Advancement readiness.**
  - When `xpCur > 0` **and** the character meets advance requirements
    (`readyToProgress` per `AdvancementPage`/`planNextCareerLevel`), emit a
    recommendation to advance the career level. Action: navigate to the
    Advancement page (and the advance affordance). This is an **opinionated
    recommendation** ("you're ready — consider advancing") but never forces the
    advance; the real advance handler is invoked only by the player on that page.
  - When `xpCur > 0` but **not** yet ready, emit a softer "you have N unspent XP
    to spend" suggestion. Action: navigate to the Advancement page.
  - Mirrors `App.tsx`'s `showAdvancementBadge={character.xpCur > 0}`.
- **FR-8.2 Endeavours needing a result.**
  - When any endeavour entry has status `'pending'` or `'in_progress'`, emit a
    suggestion to resolve it. Action: navigate to the Endeavours page.
  - Mirrors `App.tsx`'s `showEndeavoursBadge` computation exactly; it must not
    diverge from that predicate.
- **FR-8.3 Overburdened.**
  - When current encumbrance **exceeds** max encumbrance (`current > max`, using
    the existing `maxEncumbrance` / `getEncumbranceLevel`), emit a suggestion that
    the character is overburdened. Rationale cites Core p.293. Action: navigate to
    the Gear/encumbrance view. See **OQ-1** (penalty wording / "at limit" edge).
- **FR-8.4 Corruption at/over threshold.**
  - When corruption points reach the corruption threshold (`getCorruptionThreshold`
    = TB + WPB + Pure Soul; `getCorruptionStatus` 'danger'), emit a suggestion that
    a corruption/mutation resistance Test is due. Rationale cites the rulebook.
    Action: navigate to the Corruption panel. See **OQ-2** and **OQ-3** (the
    precise trigger comparison and what Test "is due").
- **FR-8.5 Surface existing combat reminders (consume, do not fork).**
  - The panel surfaces the **existing** reminders from `src/logic/reminders.ts`
    (`deriveAllReminders` — condition + psychology) so the Assistant is the
    consolidated "everything that needs attention" view. In combat these rank
    first (FR-3.2).
  - `reminders.ts` **must not be duplicated or forked**; it is consumed. A
    `CombatReminder` is adapted into a `Suggestion` (its `citation` → rationale,
    its `test` → a `roll` action descriptor). The existing `CombatReminders`
    rendering in `CombatDashboard` is unaffected.

### FR-9 — Placement / integration

- **FR-9.1 Desktop:** the Assistant trigger lives in the sidebar
  (`Navigation.tsx`) alongside the existing Search and Keyboard-Shortcuts
  triggers, styled consistently with them, including collapsed-sidebar behaviour.
- **FR-9.2 Mobile:** the trigger lives in the mobile nav/action bar
  (`Navigation`'s `mobileScrollRow`), consistent with the existing Search and
  Shortcuts entries there, and honouring the existing touch-end fix (no
  synthesized-click leak).
- **FR-9.3 Architecture:** the Assistant mirrors the command-palette shape — a
  context **provider + hook** exposing `open()`/`close()`/`toggle()`, a persistent
  **trigger**, and a **drawer/sheet overlay**. It must not invent a new paradigm.
- **FR-9.4** The badge count (FR-1.2) is produced by the same engine that feeds
  the panel, so the count and the panel contents never disagree.

### FR-10 — Rules compliance & citations

- **FR-10.1** Every game-mechanic claim in a suggestion title/rationale must match
  the WFRP4e rulebooks in `docs/` (core `WarhammerFantasyRoleplay4e.md`; `Errata`
  overrides; supplements extend). No mechanic may be invented.
- **FR-10.2** Where a suggestion encodes a rule, the source page is cited in a
  code comment (e.g. `// Core p.293: Overburdened`), following the precedent set
  by `reminders.ts` and `calculators.ts`.
- **FR-10.3** Reminder-derived suggestions reuse the citations already in
  `reminders.ts` verbatim; they are not re-authored.

### FR-11 — Calculated-total tooltips

- **FR-11.1** Any **calculated total** displayed in the panel (e.g. an
  encumbrance `current / max`, a corruption `points / threshold`, an XP figure)
  must have a breakdown **tooltip** via `src/components/shared/Tooltip.tsx`
  (and `TooltipTriggerCell`), showing the components and formula that produce the
  total (e.g. `SB 4 + TB 3 + Strong Back 1 = 8`). Reuse the existing breakdown
  helpers in `src/logic/breakdown-helpers.ts` rather than recomputing.
- **FR-11.2** Tooltips appear on hover for desktop and on tap/long-press for
  touch, consistent with the existing shared `Tooltip` behaviour.

---

## Non-Functional Requirements

- **NFR-1 Offline / privacy:** no backend, no network request, no telemetry, no
  AI/LLM. The engine is deterministic and runs entirely offline. Dismiss/snooze
  state is stored locally only. This invariant is permanent.
- **NFR-2 Additivity:** the feature is additive. Existing behaviour and existing
  tests remain unchanged and green. `reminders.ts`, `CombatReminders`,
  `AdvancementPage`, and `Navigation`'s existing badges are consumed/extended, not
  rewritten.
- **NFR-3 Testability:** the engine is pure and React-free, unit- and
  property-testable (Vitest + fast-check) in isolation, mirroring the
  `reminders.ts` / `attack-consequences.ts` precedent. The provider/panel are
  testable with Testing Library.
- **NFR-4 Accessibility:** the trigger has an accessible name and exposes its
  badge count to assistive tech (not a decoration-only dot); the panel is a
  labelled dialog/region with a focus trap while open, is dismissible via Escape,
  and restores focus to the trigger on close. Suggestion actions are reachable and
  operable by keyboard.
- **NFR-5 No regressions:** reduced page busyness, the nav touch-end fix, and the
  consistent collapse chevrons must all be preserved.
- **NFR-6 Error handling:** if the active character is absent/partial, the engine
  returns `[]` (empty, never throws), exactly as `reminders.ts` tolerates a
  missing sheet by returning informational-only or empty results.

---

## Acceptance Criteria

1. A persistent Assistant trigger is visible on desktop (in the `Navigation`
   sidebar, beside Search/Shortcuts) and on mobile (in the mobile nav bar), with
   collapsed-sidebar behaviour consistent with the sibling triggers.
2. The trigger displays a badge count equal to the number of active, actionable
   suggestions for the current `(character, context)`; the count shows nothing
   when 0; the count equals the number of items rendered in the panel.
3. The panel is closed by default; activating the trigger opens it (drawer on
   desktop, bottom sheet on mobile); it is dismissible back to closed; while
   closed it occupies no layout space and covers no primary content.
4. The panel lists suggestions grouped by context/urgency; each item shows a
   short title, a brief rationale, and a one-tap action control.
5. With the character in combat, combat (reminder-derived) suggestions appear
   first; out of combat, advancement/endeavour suggestions appear first; the same
   inputs always produce the same order.
6. `getSuggestions(character, context)` is pure: calling it does not mutate the
   character, write storage, navigate, open a dialog, or make any network call
   (asserted by a test that freezes/spies on these channels).
7. Every `Suggestion` and its `action` descriptor is JSON-serializable
   (`JSON.parse(JSON.stringify(s))` round-trips to an equal object; no functions
   or DOM nodes present) — asserted by a property test.
8. Activating a suggestion's action performs only an existing flow:
   - a `navigate` action calls the existing `navigate(page, subTab)`;
   - a `roll` action opens the shared `RollDialog` seeded from the descriptor's
     test (same path as `CombatDashboard.handleRollReminder`);
   - an `openSection` action opens the relevant existing panel/section.
   No action mutates character state without a subsequent explicit
   player-confirmed step.
9. No code path auto-applies a suggestion; the advance/apply recommendation
   (FR-8.1) only invokes the real advance handler after the player confirms on the
   Advancement page.
10. The engine is an implementation of a `SuggestionSource` interface; the panel
    renders whatever `Suggestion[]` the source returns and contains no logic tied
    to how they were produced. The interface's typing admits an async source as a
    non-breaking change, and a code comment documents this intent.
11. Starter set — advancement: with `xpCur > 0` and `readyToProgress`, a
    "ready to advance" recommendation is emitted; with `xpCur > 0` and not ready,
    a softer "N unspent XP" suggestion is emitted; with `xpCur === 0`, neither is
    emitted.
12. Starter set — endeavours: a suggestion is emitted iff
    `character.endeavours.some(p => p.entries.some(e => e.status === 'pending'
    || e.status === 'in_progress'))` (identical predicate to `showEndeavoursBadge`).
13. Starter set — overburdened: a suggestion is emitted when current encumbrance
    `>` max encumbrance, with a rationale citing Core p.293 and a navigate action
    to the Gear/encumbrance view. (Trigger boundary subject to **OQ-1**.)
14. Starter set — corruption: a suggestion is emitted when corruption reaches the
    threshold (`getCorruptionThreshold`/`getCorruptionStatus` 'danger'), citing the
    rulebook, with a navigate action to the Corruption panel. (Trigger comparison
    and Test wording subject to **OQ-2/OQ-3**.)
15. Starter set — reminders: combat/psychology reminders shown in the panel are
    produced by calling `deriveAllReminders` from `src/logic/reminders.ts`;
    `reminders.ts` is not duplicated or modified, and the existing
    `CombatReminders` display in `CombatDashboard` is unchanged.
16. Dismissing a suggestion removes it from the panel and decrements the badge;
    snoozing suppresses it per its policy; both states persist locally with no
    network call.
17. Every calculated total rendered in the panel has a breakdown tooltip using the
    shared `Tooltip`/`TooltipTriggerCell`, showing components and formula, working
    on hover (desktop) and tap (touch).
18. Every suggestion that encodes a rule carries a code-comment page citation to
    the WFRP4e rulebook; reminder-derived citations are reused verbatim.
19. Accessibility: the trigger has an accessible name and its badge count is
    announced to assistive tech; the open panel is a labelled dialog/region,
    traps focus, closes on Escape, and restores focus to the trigger; actions are
    keyboard-operable.
20. The full existing test suite passes unchanged, and the build/type-check/lint
    pass with no new suppressions.

---

## Out of Scope / Non-Goals

- Any AI/LLM source, backend, network call, or telemetry (now). Only the
  interface is future-proofed; no provider is implemented.
- Inventing or changing any game mechanic. The engine only surfaces values the
  app already computes.
- Auto-applying advances, rolls, condition removal, or any other state change.
- New suggestion categories beyond the v1 starter set (FR-8). Additional sources
  may be added later behind the same `SuggestionSource` interface.
- Rewriting or forking `reminders.ts`, `CombatReminders`, `AdvancementPage`, or
  the `Navigation` badge logic.
- Cross-device/cloud sync of dismiss/snooze state.

---

## Open Questions / Flagged Rulebook Ambiguities

> Per the rules-compliance steering: these are flagged rather than resolved
> silently. Design should confirm each against `docs/` before implementation.

- **OQ-1 — Overburdened trigger vs. penalty onset (Core p.293).** The Core p.293
  table lists **"Up to limit → No penalties"** and the first penalty band as
  **"Up to double limit"** (−1 Movement, −10 Ag, +1 Travel Fatigue). So mechanical
  penalties begin only when `current > max` (i.e. at limit+1), not *at* the limit.
  The brief says "when current encumbrance exceeds max," which matches `current >
  max`. **Confirm**: should the suggestion fire at `current > max` (first penalty
  band) as written, or at `current >= max` (reaching capacity)? The rationale
  wording must match the exact p.293 penalty text and must not overstate a penalty
  at exactly the limit.

- **OQ-2 — Corruption trigger comparison: `>` vs `>=`.** The Core "Corrupting"
  rule (p.182) reads: *"Should you ever gain **more** Corruption points than your
  Willpower Bonus plus your Toughness Bonus, immediately attempt a Challenging
  (+0) Endurance Test."* That is a **strict `>` (WPB + TB)** trigger. The app's
  `getCorruptionStatus` returns `'danger'` at `corr >= threshold` (`>=`), and
  `getCorruptionThreshold` is `TB + WPB + Pure Soul`. **Confirm** whether the
  suggestion fires on `corr > (TB + WPB + Pure Soul)` (rulebook-literal) or reuses
  the app's existing `>=` danger status. Also confirm whether **Pure Soul** should
  raise the Corrupting trigger — the p.182 rule states only WPB + TB; Pure Soul is
  layered in by `corruption.ts` and may be an app convention to verify/cite.

- **OQ-3 — What Test "is due" at threshold.** The rulebook (p.182) makes the
  trigger a **Challenging (+0) Endurance Test** to *resist* corruption; a mutation
  is only rolled **if that Endurance Test is failed**, and it re-tests next time
  corruption is gained. The brief phrases this as "a mutation test is due." To stay
  rulebook-accurate, the suggestion title/rationale should describe the **Endurance
  Test to resist corruption** (not a "mutation test"), and ideally the `roll`
  action could seed that Endurance Test. **Confirm** the exact title wording and
  whether the action is a navigate-to-Corruption-panel or a seeded Endurance roll
  (or both).

- **OQ-4 — "In combat" signal source.** `CombatDashboard` receives `inCombat` as a
  prop; the engine needs the same signal in its `context`. **Confirm** the single
  source of truth for `inCombat` that both `CombatDashboard` and the Assistant read
  (so combat-first ordering matches the combat UI's own gate) rather than deriving
  a second, possibly divergent, notion of "in combat."

- **OQ-5 — Dismiss/snooze semantics.** **Confirm**: snooze duration(s) and whether
  snooze is time-based or "until next session"; whether a dismissed suggestion
  reappears when its underlying condition clears and later re-triggers (recommended)
  or stays dismissed permanently; and the exact local persistence key/shape. These
  are product/UX decisions with no rulebook bearing.

- **OQ-6 — Reminder-count double-surfacing.** Combat reminders will now appear both
  in `CombatDashboard`'s existing `CombatReminders` and in the Assistant panel (by
  design — the panel is the consolidated view). **Confirm** this intended
  duplication is acceptable and that reminder-derived suggestions should count
  toward the Assistant badge while in combat.
