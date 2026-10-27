# Progression Advisor — Requirements

## Summary

The Progression Advisor is a new **read-only** feature for the WFRP 4e character-sheet PWA that turns the Advancement experience from "here is what the next level of your *current* career costs" (the existing `AdvancementPlanner`) into "here is a recommended, costed path toward a **goal you pick**." The player selects a target — a target career, a target career level within the current or a chosen career, and/or a free-form XP budget — and the advisor computes an ordered sequence of advances that moves the character toward that goal, with real per-step XP costs, running totals (each with a breakdown tooltip), eligibility/prerequisite flags, affordability, and an XP timeline.

The advisor **recommends; the player decides.** It never mutates the character, never spends XP, and never auto-advances. All real spending stays on the existing advance controls on the Advancement page. Every XP cost, threshold, eligibility rule, and fee it displays is computed by the **existing** logic functions (`getAdvancementCost`, `ADVANCE_LEVEL_FEE`, `CAREER_COMPLETION_THRESHOLDS`, the switch-career cost formula, `getEligibleCareers`, `planNextCareerLevel`) so the numbers match the real controls exactly. The advisor invents no mechanics and hardcodes no costs.

The recommendation logic must be a **pure module with a clean function boundary** so a later LLM-assisted advisor could augment or replace the heuristic without a UI rewrite. No LLM/network is used now; the feature stays fully offline, local-only, with no backend or telemetry.

### Grounding (code already read; build on it, do not fork)

- `src/logic/advancement-planner.ts` — the existing read-only planner. `planNextCareerLevel(character)` returns a `NextLevelPlan` (ordered cheapest-first `orderedPath`, per-requirement `RequirementPlan` subtotals, `advanceLevelCost`, `grandTotal`, `canAfford`, `shortfall`). `projectBudget(plan, budget)` returns a `BudgetProjection`. The advisor must **reuse** `planNextCareerLevel` to cost "complete the current level," and reuse `projectBudget`'s model for the XP-budget idea.
- `src/logic/advancement.ts` — `getAdvancementCost(type, currentAdvances, inCareer)` (Core pp.44–45 tables + out-of-career doubling p.46), `CAREER_COMPLETION_THRESHOLDS` (`{1:5,2:10,3:15,4:20,5:25}`, Core p.48; L5 is an app convention), `ADVANCE_LEVEL_FEE` (`{ready:100, notReady:200}`, Core p.48), `isReadyToAdvance`, `getCurrentLevelTalents`, `careerSkillMatches`, `isCareerLevelComplete`.
- `src/logic/career-eligibility.ts` — `getEligibleCareers(species, className?)` and `isCareerEligible(career, species)` (species exclusion lists sourced from Core + species supplements).
- `src/logic/careers.ts` + `src/data/careers.ts` — `getCareerScheme`, `getCareersByClass`, `getCareerLevelOptions`, and `CAREER_SCHEMES` (each career's `class` + up to five levels, each level's characteristics/skills/talents/title/status).
- **Switch/Change Career cost formula (CRITICAL, currently inline in UI):** `src/components/pages/AdvancementPage.tsx` → `handleSwitchCareer` computes `switchCost = (readyToProgress ? ADVANCE_LEVEL_FEE.ready : ADVANCE_LEVEL_FEE.notReady) + (sameClass ? 0 : 100)`, where `sameClass = newScheme.class === character.class`. The different-class `+100` is a **hardcoded literal with no named constant and no inline Core citation** — see FR-7 and OQ-3.
- `src/components/pages/AdvancementPlanner.tsx` — the existing read-only panel; style/pattern the advisor must stay consistent with (collapsible via `storageKey`, far-right collapse arrow, breakdown tooltips via `Tooltip` + `TooltipTriggerCell`, per-step raw lookups exempt from tooltips).
- `src/components/pages/AdvancementPage.tsx` — hosts the planner, Experience Points, and **Career Progress** (the status section; the old "What's Left This Level" was removed in favor of it — do not reintroduce).
- `.agents/tasks/character-assistant/` — the sibling "Character Assistant" feature (badge + dockable panel + pure `getSuggestions` engine, action-descriptor pattern). The advisor is a distinct, goal-driven surface, but it shares the "recommend, never mutate; pure engine behind a clean boundary" philosophy. OQ-7 settles whether the advisor surfaces inside this panel or on the Advancement page.

---

## Functional Requirements

### FR-1 — Goal selection (player chooses; advisor never picks the goal)

- FR-1.1 The player can select a **target career** from the careers that are eligible for the character's species, via `getEligibleCareers(character.species)` + `CAREER_SCHEMES`. The current career is excluded from the target list (mirrors the existing Switch Career picker). Careers are grouped by class for selection, matching the existing picker.
- FR-1.2 The player can select a **target career level** — either within their current career or within a chosen target career — from that career's level titles (`getCareerLevelOptions`). The default target for a chosen career is its level 1.
- FR-1.3 The player can optionally enter a **free-form XP budget** (a non-negative integer), reusing the `projectBudget` model, to see how far their saved XP reaches along the recommended path.
- FR-1.4 The advisor must **not** auto-select a goal. With no goal chosen, the panel shows a neutral prompt to pick one (consistent with the planner's `!applicable` empty state). Selecting a goal is the only thing that produces a path.
- FR-1.5 Goal selection is UI-local state only; it never writes to the character (not even to `localStorage` character data — collapse state may persist via a `storageKey` like the planner, but no character mutation).

### FR-2 — Recommended path toward the chosen goal

- FR-2.1 For a target that is the **next level of the current career**, the path is exactly `planNextCareerLevel(character)` reused unchanged (do not recompute).
- FR-2.2 For a target **career switch** (target career ≠ current career), the recommended path is composed in this order, using real cost functions only:
  1. **Complete the current level** — the advances from `planNextCareerLevel(character)` needed to satisfy the current level's requirements (skipping the current-level `advanceLevelCost`, which is folded into the switch fee below — see OQ-4).
  2. **Pay the switch fee** — computed with the **same** formula the real Switch Career flow uses: `(isReadyToAdvance ? ADVANCE_LEVEL_FEE.ready : ADVANCE_LEVEL_FEE.notReady) + (sameClass ? 0 : differentClassSurcharge)`, where `sameClass = targetScheme.class === character.class`. This value must equal what `handleSwitchCareer` would charge for the same inputs (FR-7, cost-parity).
  3. **Build the target career's level-1 requirements** — characteristics/skills/talent for the target career's level 1, priced with `getAdvancementCost`. Advances that are **in-career for the target** price in-career; others price out-of-career (doubled), per Core p.46. (See OQ-5 for the "current advances carry over" modelling detail.)
- FR-2.3 For a target that is a **higher level of the current career** (multi-level within one career), the path chains "complete this level → advance level (fee) → build next level" for each intervening level up to the target. (See OQ-1 for the multi-hop modelling decision to settle in design.)
- FR-2.4 The path is presented as an **ordered list of steps**, each showing: the advance (characteristic/skill/talent name and from→to advances, or the named fee), its **real per-step cost**, and an in-career/out-of-career indicator. Per-step costs are single `getAdvancementCost`/fee lookups (not sums) and are therefore exempt from the breakdown-tooltip rule (consistent with the existing planner).
- FR-2.5 The advisor shows **running totals**: a requirement subtotal per phase and a **grand total to reach the goal**. Each running/derived total is a calculated total and carries a breakdown tooltip (FR-9).
- FR-2.6 The advisor shows **affordability**: whether `character.xpCur` covers the grand total, and the shortfall if not (reusing the planner's `canAfford`/`shortfall` semantics).
- FR-2.7 The advisor shows an **XP timeline**: given an XP-per-session rate, an estimate of sessions to reach the goal (`ceil(shortfall / rate)` or `ceil(grandTotal / rate)` — settle which in OQ-6). The rate source (fixed default, user-entered, or derived from the XP award log) is settled in OQ-6. The timeline is a deterministic function of its inputs.
- FR-2.8 **Unreachable goals** are reported clearly with the rulebook reason, not silently hidden:
  - Target career not eligible for the species → "Not available to {species}" citing the species-restriction source (via `isCareerEligible`).
  - Target equals a state with no further level to plan (already at/above max level of current career with no switch target) → the planner's neutral "no further level" message.
  - A requirement that cannot be auto-planned (e.g. a wildcard skill needing a specialisation choice) → surfaced as an **advisory**, reusing the planner's existing advisory mechanism rather than inventing a cost.

### FR-3 — Prioritisation guidance

- FR-3.1 Among the advances needed, the advisor recommends an **order**, clearly labelled as a recommendation (not a mandate): complete the current level first, then switch, then build the new level (FR-2.2 ordering). Within a phase, reuse the planner's deterministic cheapest-first ordering.
- FR-3.2 Any **inherently subjective** choice is framed as **options-with-rationale**, never a single prescription. Specifically: if the player has asked for guidance on *which* eligible career to pursue (as opposed to a single chosen target), the advisor presents a small set of candidate careers each with a short, rulebook-grounded rationale (e.g. "shares class with your current career → no different-class surcharge (Core p.48)"), and explicitly does not declare one "best."
- FR-3.3 Recommendation prose must distinguish **rule-derived facts** (costs, thresholds, eligibility — all cited) from **opinionated ordering** (which is a suggestion). No opinionated statement may imply a mechanic that is not in the rulebooks.

### FR-4 — Pure recommendation module with a clean boundary

- FR-4.1 All recommendation logic lives in a **pure, React-free, deterministic** module (e.g. `src/logic/progression-advisor.ts`) that reads a `Character` + a goal descriptor and returns new plain, serializable objects. It performs no side effects, no network, no `Date.now()`-dependent output in the core path (timeline rate is an explicit input), and no mutation.
- FR-4.2 The public entry point is a single clean function (e.g. `planProgression(character, goal): ProgressionPlan`) behind a typed interface, structured so a future async/LLM-backed advisor is a **non-breaking** addition (mirror the `SuggestionSource` future-proofing pattern from the character-assistant design). The deterministic function is the permanent offline default.
- FR-4.3 The module **reuses** `planNextCareerLevel`, `getAdvancementCost`, `ADVANCE_LEVEL_FEE`, `CAREER_COMPLETION_THRESHOLDS`, `getEligibleCareers`/`isCareerEligible`, and `getCareerScheme`. It must not duplicate or re-derive any of those mechanics.
- FR-4.4 The switch-fee formula must be available to the pure module as a **shared, cited helper**, extracted from the inline `handleSwitchCareer` literal (FR-7). The UI's real Switch Career flow and the advisor must call the same helper so they cannot drift.

### FR-5 — UI panel (read-only, consistent with the existing planner)

- FR-5.1 The advisor renders a panel consistent in style with `AdvancementPlanner`: a `Card` + `SectionHeader`, collapsible with the collapse arrow at the **far right**, persisting collapsed state via a `storageKey` (matching the planner's `wfrp-collapse-*` convention).
- FR-5.2 The panel contains the goal selectors (FR-1), the ordered path (FR-2.4), totals (FR-2.5), affordability (FR-2.6), timeline (FR-2.7), prioritisation note (FR-3), and unreachable/advisory messaging (FR-2.8).
- FR-5.3 The panel exposes **no editable control that mutates the character** — no advance buttons, no XP spend, no career change. Any "do it" affordance must route the player to the existing real controls (navigate/scroll to the Career Progress / advance section), consistent with the assistant's "route through existing explicit flow" principle.
- FR-5.4 Placement (sibling card on the Advancement page vs. inside the Character Assistant panel) is settled in OQ-7; either way it must not regress the Advancement-page UX (FR-8).

### FR-6 — Read-only / no-mutation guarantee

- FR-6.1 Neither the pure module nor the panel mutates the character, spends XP, advances a level, or switches a career.
- FR-6.2 All real spending remains exclusively on the existing Advancement-page controls.

### FR-7 — Cost parity with the real controls

- FR-7.1 Every cost the advisor shows must equal what the corresponding real control charges for the same character state:
  - advance costs = `getAdvancementCost` (same args the real advance buttons use),
  - advance-level fee = `ADVANCE_LEVEL_FEE` (ready/notReady by `isReadyToAdvance`),
  - switch fee = the extracted switch-fee helper = exactly `handleSwitchCareer`'s `switchCost`.
- FR-7.2 No cost number is invented, hardcoded, or approximated in the advisor. The only numeric literals permitted are those already defined in the shared logic (via the shared constants/helpers).
- FR-7.3 The different-class surcharge currently written as the literal `+ 100` in `handleSwitchCareer` must be lifted into a **named, Core-cited constant** (e.g. `CAREER_CHANGE_DIFFERENT_CLASS_SURCHARGE`) in `advancement.ts`, used by both the real flow and the advisor — subject to verifying the number against Core p.48 (OQ-3).

### FR-8 — Do not regress Advancement-page UX

- FR-8.1 Collapsible sections keep the collapse arrow consistently at the far right.
- FR-8.2 The existing `AdvancementPlanner` panel, Experience Points section, and **Career Progress** status section remain intact and behave as before.
- FR-8.3 The removed "What's Left This Level" section is **not** reintroduced, and no duplicate of it is added by the advisor.

### FR-9 — Breakdown tooltips on every calculated total

- FR-9.1 Every calculated/derived total the advisor displays (phase subtotals, grand total to goal, switch fee breakdown, budget `spent`, any timeline-derived aggregate) carries a breakdown tooltip via the shared `Tooltip` + `TooltipTriggerCell` components, in the additive `A + B + … = Total` style the planner uses.
- FR-9.2 The switch-fee tooltip breaks the fee into its cited components, e.g. `Advance-level fee 100 (ready, Core p.48) + Different-class surcharge 100 (Core p.48) = 200`.
- FR-9.3 Tooltips open on hover (desktop) and tap/long-press (touch), per the calculated-total-tooltips rule and the existing component behavior. Per-step single-lookup costs are exempt (as in the existing planner).

### FR-10 — Rulebook compliance & citations

- FR-10.1 Every rule the advisor rests on is cited in code comments to its rulebook source: advancement cost tables (Core pp.44–45), out-of-career doubling (Core p.46), completion thresholds (Core p.48), advance-level fee (Core p.48), career-change/switch fee incl. different-class surcharge (Core p.48 — verify), talent-at-level rule (Core p.47), species career eligibility (Core + the relevant species supplement in `docs/`).
- FR-10.2 Ambiguities are **flagged** (see Open Questions), not silently resolved, per the rules-compliance steering.

---

## Non-Functional Requirements

- NFR-1 **Offline / local-only.** No network, backend, or telemetry. No new runtime dependencies beyond those already in use.
- NFR-2 **Determinism.** `planProgression(character, goal)` with the same inputs always returns the same output (stable tie-breaks, no ambient time/randomness in the core path).
- NFR-3 **Additive.** Existing tests stay green unchanged. Extracting the switch-fee helper is behaviour-preserving (same inputs → same `switchCost`); existing switch-career behavior is unchanged.
- NFR-4 **Consistency with existing patterns.** Reuse `Card`, `SectionHeader`, `CollapsibleSection`, `Tooltip`, `TooltipTriggerCell`, the planner's styling conventions, and the assistant's pure-engine/clean-boundary pattern. Do not introduce a new paradigm.
- NFR-5 **Accessibility.** Status messaging uses `role="status"`; totals expose accessible labels with their breakdown, matching the planner.

---

## Acceptance Criteria

Each criterion is specific and testable. "Advisor" = the pure module output unless a component is named.

1. **Goal required.** With no goal selected, the advisor produces no path and the panel shows a neutral "pick a goal" prompt; the advisor never selects a goal itself.
2. **Eligible targets only.** The target-career list equals `getEligibleCareers(character.species)` minus the current career, grouped by class — identical membership to the existing Switch Career picker for the same species.
3. **Next-level reuse.** For goal = next level of the current career, the advisor's path and grand total are exactly those of `planNextCareerLevel(character)` (no recomputation, byte-equal totals).
4. **Switch path shape.** For goal = a different eligible career, the path is ordered: complete-current-level steps → switch fee → target level-1 build steps, and the steps' `inCareer` flags reflect in/out-of-career pricing for the *target* career.
5. **Switch-fee parity (property test).** For arbitrary valid characters and eligible target careers, the advisor's switch fee equals `(isReadyToAdvance(character) ? ADVANCE_LEVEL_FEE.ready : ADVANCE_LEVEL_FEE.notReady) + (targetScheme.class === character.class ? 0 : DIFFERENT_CLASS_SURCHARGE)` — i.e. exactly what `handleSwitchCareer` charges.
6. **Cost-parity (property test).** The advisor's projected grand total equals the sum of its per-step costs, and every per-step cost equals the `getAdvancementCost`/`ADVANCE_LEVEL_FEE`/switch-fee value the real control would charge for that step. (Mirrors the planner's existing cost-parity test.)
7. **Reachable goal raises each requirement exactly to threshold (property test).** For a reachable goal, each required characteristic/skill in the path is raised exactly to the relevant `CAREER_COMPLETION_THRESHOLDS` value — never above, never below.
8. **Ineligible goal reported unreachable (property test).** For a target career not eligible for the character's species, the advisor returns an unreachable result carrying the species-restriction reason, and emits no cost path.
9. **Affordability & timeline are deterministic functions of inputs (property test).** `canAfford`/`shortfall` follow `xpCur` vs grand total; the session estimate is a pure function of (shortfall-or-total, rate) with the settled OQ-6 formula.
10. **No-mutation guarantee (test).** Calling `planProgression` (and rendering the panel and exercising goal selection + budget input) leaves the input `Character` deeply unchanged (deep-equal before/after); no advance/XP/career-switch handler is invoked.
11. **Cost numbers are not hardcoded.** The different-class surcharge is referenced from the shared named constant; a search confirms the advisor contains no numeric cost literals outside the shared logic constants.
12. **Tooltips on every total (component test).** Every calculated total rendered by the panel (subtotals, grand total, switch-fee, budget spent, timeline aggregate) has an associated `TooltipTriggerCell`/`Tooltip` breakdown in `A + B + … = Total` form; per-step raw lookups do not.
13. **Read-only panel (component test).** The panel renders recommendations and tooltips, exposes no character-mutating control, and goal selection + budget entry update the displayed path without touching the character.
14. **UX not regressed (component test).** On the Advancement page, collapsible sections keep the far-right collapse arrow, the existing planner/XP/Career Progress sections remain, and no "What's Left This Level" section is present.
15. **Rulebook citations present.** Every rule-bearing code path carries a `// Core p.NN …` (or supplement) citation comment per FR-10.1; ambiguities are flagged rather than resolved silently.
16. **Verification gates pass clean** (acceptance gates for the final implementation):
    - `npx tsc --build --force --noEmit` — no type errors.
    - `npm run build` — succeeds.
    - `vitest --run` — all tests pass (new + existing).
    - `npx eslint .` — 0 errors and no new warnings.

---

## Out of Scope

- Any AI/LLM or network-backed recommendation (future-proofed by the clean boundary, but not implemented now).
- Mutating, spending, auto-advancing, or auto-switching — the advisor is strictly read-only.
- Changing the WFRP advancement, completion, fee, or eligibility *mechanics* themselves (the advisor consumes them; it does not redefine them). Extracting the inline switch-fee literal into a shared cited constant is a refactor, not a mechanic change.
- Redesigning the Advancement page layout beyond adding the advisor panel (or surfacing it in the assistant panel per OQ-7).
- Recommending spell/ritual learning, endeavours, or combat actions (those belong to other features, e.g. the Character Assistant).

---

## Open Questions / Ambiguities (to settle in design)

- **OQ-1 — Multi-hop paths.** Does v1 support chaining across multiple career levels and/or multiple career switches (e.g. current L2 → complete → L3 → complete → switch → new L1)? Recommendation to confirm: support **single-career multi-level** climbs and a **single switch**; defer multi-switch chains (they explode combinatorially and the "which intermediate career" choice is subjective per FR-3.2).
- **OQ-2 — "Reachable" definition.** Should "reachable" account purely for species eligibility (`isCareerEligible`), or also factor the different-class extra cost into a stricter reachability (e.g. flag "reachable but expensive")? Proposed: eligibility determines reachable/unreachable; the different-class surcharge is shown as a cost/advisory, not a reachability blocker.
- **OQ-3 — Different-class surcharge citation & value.** The inline `+ 100` has no Core citation in code. Design must **verify against Core p.48** that a career change to a *different class* costs an extra 100 XP (on top of the 100/200 advance-level fee), confirm the exact number, and only then lock the named constant. If the rulebook text is ambiguous, flag it rather than assuming the current literal is correct.
- **OQ-4 — Fee double-count on switch.** When composing "complete current level" (which in the planner includes an `advanceLevelCost`) with "pay switch fee," ensure the advance-level fee is counted **once**. Proposed: when the goal is a switch, take only the *requirement* steps from `planNextCareerLevel` and apply the switch fee as the single level-change charge (since switching to a new career's L1 is itself a career-level change). Confirm this matches how the real Switch Career flow charges (it charges the fee once in `handleSwitchCareer`).
- **OQ-5 — Carryover of existing advances into the target career.** When building the target career's level-1 requirements, how are the character's *existing* characteristic/skill advances treated (they carry over per Core, so some target requirements may already be partly/fully met)? Proposed: price each target requirement from the character's current advance count up to the target threshold using `getAdvancementCost` (so already-met requirements cost 0), exactly as the planner does for the current level — confirm against Core p.46/p.48.
- **OQ-6 — XP-timeline model.** What drives the session estimate: a fixed default XP/session, a user-entered rate, or a rate derived from the XP award log (`xpLog`)? And is the estimate over the *shortfall* (XP still needed) or the *full* grand total? Proposed: user-entered rate with a sensible default, estimate over the shortfall; the chosen formula must be deterministic (AC9).
- **OQ-7 — UI placement.** Does the advisor live as a sibling `Card` on the Advancement page (next to `AdvancementPlanner`, the lowest-risk, most discoverable spot given the feature is goal/career-centric) or inside the Character Assistant panel? Proposed: Advancement-page sibling card for v1, leaving an assistant entry point as a later, non-breaking addition.
- **OQ-8 — Exact goal model.** Confirm the `goal` descriptor shape the pure module accepts (e.g. `{ kind: 'nextLevel' } | { kind: 'careerLevel', career, level } | { kind: 'career', career }`, plus optional `budget` and `xpPerSession`). It must be plain/serializable to keep the boundary LLM-ready (FR-4.2).
- **OQ-9 — Wildcard/specialisation requirements.** Target-career requirements may include wildcard skills (`(Any)`) that the planner cannot auto-cost without a specialisation choice. Confirm these surface as advisories (reusing the planner's advisory mechanism) and are excluded from the "reachable → exactly-to-threshold" guarantee (AC7), rather than being assigned an invented cost.

## Assumptions

- The character-assistant feature's pattern (pure engine behind a serializable boundary, "recommend, route through existing flows, never mutate") is the intended model to mirror; the advisor is a distinct goal-driven surface rather than a reminder source.
- The L5 threshold (`25`) in `CAREER_COMPLETION_THRESHOLDS` is a pre-existing app convention (not strict Core) and the advisor simply reuses it, carrying the same caveat the planner does.
- Species eligibility as encoded in `career-eligibility.ts` (Core + species supplements in `docs/`) is authoritative for the target list; the advisor does not re-derive eligibility.
