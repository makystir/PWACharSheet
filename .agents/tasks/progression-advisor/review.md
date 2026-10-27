# Progression Advisor — Implementation Review

**Verdict: APPROVED** — no blocking findings.

Reviewed commit `2233d14` ("feat: add read-only Progression Advisor to Advancement page") against the approved `requirements.md`, `design.md`, and `plan.md`. Verification evidence in `plan.md` was read; targeted spot-checks were run because the tree changed after the plan was written (see Verification).

## Scope of change

```
src/logic/advancement.ts                 +22   (shared switch-fee constant + helper)
src/logic/advancement-planner.ts         +94/-22 (planLevelRequirements extraction)
src/logic/progression-advisor.ts         +670  (pure engine)
src/components/pages/ProgressionAdvisor.tsx      +461 (read-only UI panel)
src/components/pages/ProgressionAdvisor.module.css +325
src/components/pages/AdvancementPage.tsx  +18/-… (helper reuse + panel wiring)
src/logic/__tests__/progression-advisor.test.ts          +383 (14 tests)
src/logic/__tests__/progression-advisor.property.test.ts +204 (6 tests)
src/components/pages/__tests__/ProgressionAdvisor.test.tsx +183 (11 tests)
```
Additive. No existing production file beyond `AdvancementPage.tsx` and the two refactored logic modules is touched.

## Cost-parity & no invented mechanics (rules-compliance) — PASS

- **All costs route through existing logic.** `progression-advisor.ts` imports only `getCareerSwitchCost`, `CAREER_CHANGE_DIFFERENT_CLASS_SURCHARGE`, `ADVANCE_LEVEL_FEE`, `CAREER_COMPLETION_THRESHOLDS` from `advancement.ts`, and `planNextCareerLevel` / `planLevelRequirements` from `advancement-planner.ts`. Per-advance costs are produced inside `planLevelRequirements`/`planNextCareerLevel` via `getAdvancementCost`; the engine never calls a cost table itself.
- **No hardcoded/duplicated/invented cost number.** A targeted search for numeric cost literals in `progression-advisor.ts` returned no matches. The only numeric literals are the `?? 5` threshold fallback (mirrors the planner's existing convention) and `Math.max(…, 1)` clamps — neither is a cost. The `10` XP/session default lives in the UI component with the required `// UI default only — not a rulebook value; XP awards are GM-discretionary (Core p.36)` comment, and is passed explicitly into the pure engine (never treated as a mechanic).
- **Cited Core pages verified against the rulebook.** `docs/WarhammerFantasyRoleplay4e.md` §"Changing to a New Career" (p.48) reads: *"…enter the first level of any Career from your Class for 100 XP, or for 200 XP if you have not completed your current Career level. If you want to enter the first level of a Career from a different Class, this cost an extra 100 XP."* The p.48 cost table lists *"Enter a different Class | +100 XP"* and *"Leave a Complete Career | 100 XP / Leave an Incomplete Career | 200 XP."* This backs `CAREER_CHANGE_DIFFERENT_CLASS_SURCHARGE = 100`, `ADVANCE_LEVEL_FEE = {ready:100, notReady:200}`, and the talent rule (p.47 "Talents are only available when you are in the level of the Career that lists them"). The extracted `getCareerSwitchCost(ready, currentClass, targetClass)` returns `(ready?100:200) + (sameClass?0:100)` — rulebook-correct and identical to the former inline literal.
- **Cost-parity test exists and is genuine.** Property test **P1** asserts `grandTotal === Σ orderedPath.cost` and, for every per-advance step, `step.cost === getAdvancementCost(step.kind, step.fromAdvances, step.inCareer)` — i.e. it compares advisor output to the real cost function, not to a copied constant. **P2** asserts the switch fee `=== getCareerSwitchCost(isReadyToAdvance(c), c.class, targetScheme.class)`. Unit **T1** asserts next-level per-step costs + grandTotal equal `planNextCareerLevel`; **R1** asserts `getCareerSwitchCost` equals the original inline expression across ready×class.

## Read-only / no-mutation — PASS

- The engine returns new plain objects. `projectCharacter` operates on a `structuredClone` of the input and is explicitly used only for in-memory pricing of a subsequent climb level; it is never persisted.
- The panel receives only `{ character, storageKey }` — no setters/mutators. Its "do it" affordance is a text note routing the player to the real Career Progress / Switch Career controls (FR-5.3). No advance/XP/career-switch control is rendered.
- **No-mutation test is meaningful.** Property test **P6** deep-clones the input, calls `planProgression` across all goal kinds (incl. `none`, foreign level>1, ineligible) with budget + rate, and asserts `char` `toEqual` the pre-call clone. Component **C2** asserts no mutating control is present and that goal/budget/rate changes update only the displayed path.

## Reuse not rebuild — PASS

- `planNextCareerLevel` is reused unchanged for the next-level goal (mapped into phases) and for the switch goal's "complete current" requirement steps.
- The target-level costing is served by a clean extraction, `planLevelRequirements(character, careerName, levelNum)`, lifted out of `planNextCareerLevel`. The diff shows the per-requirement bodies moved verbatim; `planNextCareerLevel` now delegates to it and keeps its own applicability guards. Finding 3's minimal signature is honored — the helper derives `CareerLevel` and `threshold` internally, so a caller cannot pass inconsistent values.
- The switch fee is a shared helper used by both `handleSwitchCareer` and the advisor (single source of truth). `AdvancementPage.handleSwitchCareer` now calls `getCareerSwitchCost(...)` in place of the inline literal — behaviour-preserving.
- Behaviour-preservation of the refactor is guarded by the existing `advancement-planner` unit + property tests staying green (plan evidence) and R1.

## UI — PASS

- Collapsible sibling `Card` with `SectionHeader` (`collapsible`/`collapsed`/`onToggleCollapse`) in a `headerRow` div + `HelpPopover concept="career-advancement"` (concept confirmed present in `help-content.ts`) — byte-consistent with `AdvancementPlanner`; the far-right chevron comes from `SectionHeader` (Finding 7). Collapse persists via `storageKey` using a lazy `useState` initialiser (no `set-state-in-effect`, no eslint-disable).
- **Every calculated total has a breakdown tooltip** via `TooltipTriggerCell` + `Tooltip` in `A + B + … = Total` form: phase subtotals, grand total, each fee (switch/advance, with cited components), and budget `spent`. Per-step single-lookup costs correctly have **no** tooltip (FR-9.3). The switch-fee tooltip renders the cited components ("Different-class surcharge … Core p.48"). Verified by component **C1**.
- Wired into `AdvancementPage` immediately after `<AdvancementPlanner>`, gated on `scheme && careerLevelNum > 0` only (not `!isMaxLevel`), matching the design.
- No "What's Left This Level" reintroduced; Career Progress / Experience Points / planner intact — verified by component **C5** and a repo-wide search (the only match is the negative assertion in the test).

## Unreachable goals & subjective branches — PASS

- Ineligible/unknown target → `reachable:false`, `goalFullyPlanned:false`, a species/"not a known career" `reason`, empty `phases`, `grandTotal 0` (unit **T6**, property **P4**). The reason cites the species restriction via `isCareerEligible`.
- Foreign-career level>1 is honestly reported `reachable:true, goalFullyPlanned:false` with the multi-hop advisory, grandTotal equal to the single-switch plan (unit **T13**, property **P5**).
- `describeCareerOptions` presents eligible targets as options-with-rationale, never ranks a "best", and is rendered by the UI **only** in the `none` state (Finding 4). Selecting a row sets `goal={kind:'career',career}` and replaces the list (component **C3**). Unit **T12** asserts membership = eligible minus current, correct `sameClass`/surcharge, and no "best".

## Tests — PASS

All required test categories are present and meaningful: fast-check property tests (P1–P6 incl. cost-parity, switch-fee parity, exactly-to-threshold, ineligible→unreachable, determinism, no-mutation), cost-parity (P1/T1/R1), no-mutation (P6/C2), and component tests (C1–C5). The change is additive.

One minor observation (non-blocking, not a finding): P3 asserts each `complete-current` step's `toAdvances <= threshold` rather than asserting the final per-row step `=== threshold`. The strict exactly-to-threshold guarantee (AC7) is structurally enforced by `planLevelRequirements` (characteristic loops run `a0 … threshold-1`; skill rows run to `threshold`) and is further exercised by unit **T4** (carryover: a met requirement contributes 0; a partial is priced `2→5`). The guarantee is adequately covered; P3 could be tightened in a future pass but does not leave AC7 unverified.

## Verification

`plan.md` records: unit (14), property (6), component (11), existing planner/advancement/readonly tests unchanged, full suite green after fixing one aria-label collision, lint clean with no eslint-disable, and AC11 satisfied. It also flagged a cross-workflow blocker: project-wide `tsc`/`build`/`eslint` failing on the *uncommitted* guided-combat-turn changes.

That blocker no longer applies: the guided-combat work is now committed (`65d1a0b`) and the working tree contains only task-doc edits. Because the tree changed after the plan was written, I ran narrow spot-checks (justified, specific doubt):

- `npx tsc --build --force --noEmit` on the full committed tree → **exit 0, clean** (AC16 typecheck now passes project-wide; the earlier cross-workflow failure is resolved).
- `npx vitest run` on the three progression-advisor test files → **31 passed (3 files)**, confirming the recorded unit/property/component evidence in the current tree.
- Repo-wide search for hardcoded cost literals in the engine → none (AC11).
- Help concept `career-advancement` confirmed present.

The pre-existing Vite "configLoader native" warning is unrelated to this change.

## Conclusion

The implementation meets the approved requirements and design. Costs come exclusively from the existing cost functions with verified Core p.44–48 grounding; the feature is read-only with a meaningful no-mutation guarantee; it reuses `advancement-planner.ts` via a clean `planLevelRequirements` extraction rather than forking it; the UI is a consistent collapsible sibling panel with breakdown tooltips on every calculated total and no reintroduced duplication; unreachable goals and subjective branches are handled per spec; and tests are present, meaningful, and green. No blocking findings.
