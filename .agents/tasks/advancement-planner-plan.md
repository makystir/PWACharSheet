# Advancement Planner — Implementation Plan

READ-ONLY WFRP4e advancement planner. Source of truth: the approved design at
`.agents/tasks/advancement-planner-design.md`. This plan sequences that design; it
does not re-decide architecture. Build/test commands come from `package.json`
(`tsc --build`, `vite build`, `vitest run`, `eslint`). All cost numbers come
exclusively from `getAdvancementCost` in `src/logic/advancement.ts` — the planner
invents none (rules-compliance steering). Every calculated total in the new UI
gets a `Tooltip` + `TooltipTriggerCell` breakdown (calculated-total-tooltips
steering).

Verification uses the exact commands the design §10 requires:
```
npx tsc --build --force --noEmit
npm run build
vitest --run      # (project script equivalent: npm test)
npx eslint .
```
Note on test running: this repo's package script is `vitest run`; `vitest --run`
(design §10) is the same CLI invocation and is accepted. During development,
target a file with `npx vitest run <path>` for speed, then run the full suite.

Ordering is by dependency: the shared constants and pure module come first (so
they can be unit/property-tested in isolation), then the component, then the page
integration, then the remaining tests, then a final clean-verification pass. Each
item leaves the codebase buildable.

---

- [ ] 1. Export the two shared constants from `src/logic/advancement.ts` with no behaviour change.
      Change the existing private `const CAREER_COMPLETION_THRESHOLDS: Record<number, number> = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 }`
      to `export const CAREER_COMPLETION_THRESHOLDS` (keep the value and its `// Core p.48` provenance
      comment intact — design §7.1, Finding 7). Add a new `export const ADVANCE_LEVEL_FEE = { ready: 100, notReady: 200 } as const;`
      immediately below it with a `// Core p.48: 100 XP to change career level when completed, 200 if not` comment
      (design §6 Finding 3). Do NOT change `isCareerLevelComplete`'s use of the constant.
      Files: `src/logic/advancement.ts`
      Verify: `npx vitest run src/logic/__tests__/advancement.test.ts` — existing advancement tests still pass (additive export, no logic change).

- [ ] 2. Create the pure planner module `src/logic/advancement-planner.ts` with the exported types and functions from design §7.1.
      Define and export the interfaces `PlannerStep`, `RequirementPlan`, `NextLevelPlan`, `BudgetProjection`
      exactly as in §7.1, and the functions `planNextCareerLevel(character: Character): NextLevelPlan` and
      `projectBudget(plan: NextLevelPlan, budget: number): BudgetProjection`. Implement per design §6 / §9:
      • Resolve career via `getCareerScheme` and the same level list/`careerLevelNum` logic as `AdvancementPage`
        (`allLevels` from level1..level5 filtered Boolean; `careerLevelNum = indexOf(careerLevel.title)+1`).
        Return `{ applicable: false, ... }` (zeroed totals, empty requirement plans) for no career, unknown
        career, or max level (`careerLevelNum >= allLevels.length`) — design §9, FR-7.
      • `threshold = CAREER_COMPLETION_THRESHOLDS[careerLevelNum] ?? 5` (import the constant from step 1; apply
        the identical `?? 5` fallback as the page — design §7.1, OQ-5). Never hardcode `{1:5,...}`.
      • Characteristics (§6 "Characteristics"): for each `k` in `careerLevel.characteristics` with
        `character.chars[k].a = a0 < threshold`, emit one `PlannerStep` per `a` in `[a0 … threshold-1]` with
        `kind:'characteristic'`, `inCareer: careerChars.includes(k)` (true for completion chars),
        `cost = getAdvancementCost('characteristic', a, inCareer)`. `subtotal = Σ step.cost`;
        `met = subtotal === 0`.
      • Skills — ROW-BASED selection (§6 "Skills", Findings 1,2,5). Compute `need = min(8, careerSkills.length)`.
        `metPatterns = careerSkills.filter(sn => allSkills.some(s => careerSkillMatches(sn,s.n) && s.a >= threshold))`
        exactly as the page (`allSkills = [...bSkills, ...aSkills]`). `skills.met = metPatterns.length >= need`
        (this is the checklist predicate — it MUST NOT depend on auto-selectability). Build candidate DISTINCT
        physical rows: for each currently-unmet pattern, find matching rows via `careerSkillMatches`; pick the
        single highest-`.a` row (tie-break lowest array index) and identify it by `{isBasic, skillIndex, name, a0}`;
        for a concrete (non-wildcard) pattern with no matching row synthesise a cost-from-0 row
        (`skillIndex: null`, `a0: 0`); EXCLUDE wildcard-only (`(Any)` / `(Any X)`) patterns with no concrete row
        and push an advisory string. Deduplicate by physical `(isBasic, skillIndex)` / synthesised name; record
        each candidate's `satisfiesPatterns`. Per candidate, `rowCost = Σ_{a=a0}^{threshold-1}
        getAdvancementCost('skill', a, true)` and emit one `PlannerStep` per `a` all carrying that row's
        `isBasic`/`skillIndex`/`name`. Greedy-select ascending by `rowCost` (tie-break lowest `skillIndex`, then
        name), selecting a candidate only if it still covers ≥1 uncovered pattern, marking all its
        `satisfiesPatterns` covered, until `remainingNeeded = max(0, need - metPatterns.length)` reaches 0 or
        candidates exhausted. `skills.subtotal = Σ selected rowCost` (capped to concrete rows; never pad invented
        wildcard cost). When candidates exhaust before covering `remainingNeeded`, add the
        "additional specialisation choice required" advisory and leave `skills.met` as the predicate reported.
      • Talent (§6 "Talent"): `talentsOwned` computed identically to the page using `getCurrentLevelTalents`;
        `talent.met = talentsOwned.length >= 1`. If not met, pick the cheapest unowned current-level talent
        (all new → `getAdvancementCost('talent', 0, true) = 100`; tie-break by name), emit one talent step.
      • `requirementsTotal = characteristics.subtotal + skills.subtotal + talent.subtotal`.
        `advanceLevelCost = (characteristics.met && skills.met && talent.met) ? ADVANCE_LEVEL_FEE.ready
        : ADVANCE_LEVEL_FEE.notReady` (design §6 Finding 4 — driven by the three met flags, NOT
        `requirementsTotal === 0`). `grandTotal = requirementsTotal + advanceLevelCost`.
        `xpCur = character.xpCur`; `canAfford = xpCur >= grandTotal`; `shortfall = max(0, grandTotal - xpCur)`.
      • `orderedPath` = all selected per-step items sorted by `cost` ascending, stable by
        `(kind, name, fromAdvances)` so each row's steps stay low→high (design §6 "Path ordering").
      • `projectBudget(plan, budget)`: normalise `b = Math.floor(Math.max(0, Number(budget)))`; non-finite/≤0 →
        caller hides it, but the function still returns a valid `{budget:b, affordableSteps:[], spent:0,
        firstUnaffordable: plan.orderedPath[0] ?? null}`. Walk `orderedPath` accumulating `cost` while
        `spent + cost <= b`; collect covered prefix into `affordableSteps`, set `spent`, and
        `firstUnaffordable` = first step not covered (or `null` if all covered).
      Pure: import only non-mutating helpers (`getCareerScheme`, `careerSkillMatches`, `getCurrentLevelTalents`,
      `getAdvancementCost`, `CAREER_COMPLETION_THRESHOLDS`, `ADVANCE_LEVEL_FEE`); never import/accept
      `update`/`updateCharacter`; return only new plain objects (design §9 invariants). Cite rulebook pages in
      comments where a rule is applied (Core p.44-45 costs via `getAdvancementCost`; Core p.48 thresholds/fee).
      Files: `src/logic/advancement-planner.ts`
      Verify: `npx tsc --build --force --noEmit` compiles; module imports resolve. (Behavioural verification in step 4.)

- [ ] 3. Create the presentation component `src/components/pages/AdvancementPlanner.tsx` (+ `AdvancementPlanner.module.css`).
      Pure presentation mirroring `AdvancementChecklist`'s "all state passed in" contract (design §7.2). Props:
      the computed `NextLevelPlan` plus `career`/`careerLevel` labels. Keep the optional XP-budget value in local
      `useState` INSIDE this component (design §7.3 recommendation); compute the `BudgetProjection` via
      `projectBudget` with a `useMemo` on `[plan, budget]`. Render inside a `Card` + `SectionHeader`
      (icon `TrendingUp` or `Target` from `lucide-react`) titled "Plan: Next Career Level". Use the single
      `openTooltip` discriminated-state pattern from `AdvancementChecklist` with `TooltipTriggerCell` + `Tooltip`.
      Render:
      • When `!plan.applicable`: a neutral `role="status"` "nothing to plan" / max-level note; no cost figures (FR-7).
      • Three requirement rows (Characteristics / Skills / Talent), each a `TooltipTriggerCell` showing that
        requirement's `subtotal` XP with a `Tooltip` breakdown listing each `PlannerStep`
        (`CHAR_FULL_NAMES[k]` / skill name / talent name → `from → to` advances, in/out-career, step cost)
        ending in `… = subtotal`. Show skill `advisories` as notes.
      • A grand-total `TooltipTriggerCell` with breakdown
        `Characteristics A + Skills B + Talent C + Advance-level D = Grand total` (label the advance-level line
        with its ready/not-ready basis).
      • Affordability summary with `role="status"`: "You can afford it (have {xpCur}, need {grandTotal})" when
        `canAfford`, else "Need {shortfall} more XP".
      • The ordered cheapest path list from `orderedPath`. Per-step `cost` is a single `getAdvancementCost`
        lookup → NO tooltip (design §7.2/§8 Finding 6). Any running/cumulative total shown alongside the path,
        and `BudgetProjection.spent`, IS a calculated total → wrap in a `TooltipTriggerCell` with a
        `step₁ + step₂ + … = spent` breakdown.
      • The optional budget `<input type="number">` (aria-labelled). When the parsed budget is finite and > 0,
        render the `BudgetProjection` (covered steps + first-unaffordable step); otherwise hide the projection.
      • A `HelpPopover` explaining the planner is a read-only projection (reuse concept `career-advancement` or a
        new `advancement-planner` concept if `getHelpContent` supports it; prefer reusing to avoid adding help
        content unless trivial).
      Reuse gold=in-career / grey=out-of-career styling conventions from `AdvancementPage.module.css` in the new
      CSS module. If — and only if — a genuine setState-in-effect need arises (e.g. resyncing budget state to a
      changed prop), reuse the sanctioned `// eslint-disable-next-line react-hooks/set-state-in-effect` pattern
      exactly as `Tooltip.tsx` does, with the same justifying comment; otherwise do not add any eslint-disable.
      Files: `src/components/pages/AdvancementPlanner.tsx`, `src/components/pages/AdvancementPlanner.module.css`
      Verify: `npx tsc --build --force --noEmit` compiles. (Behavioural verification in step 6.)

- [ ] 4. Add the pure-module unit tests `src/logic/__tests__/advancement-planner.test.ts` (Vitest).
      Reuse the `makeTestCharacter` fixture pattern from `src/logic/__tests__/advancement.test.ts` (Soldier/Recruit,
      `chars` with `{i,a,b}`, `bSkills`/`aSkills`). Cover every case in design §10 "advancement-planner.test.ts":
      characteristic cost-to-threshold equals the manual `Σ getAdvancementCost('characteristic', a, true)`;
      skill selection picks the cheapest `remainingNeeded` rows and counts already-met patterns at zero;
      overlapping specific+`(Any)` career selects the shared row once and never double-prices (Finding 1);
      highest-`.a` row targeted with `Σ step.cost === skills.subtotal` (Finding 2);
      `plan.skills.met` equals the page predicate `skillsWithAdvances.length >= min(8, careerSkills.length)`
      including a wildcard-only unmet case with a capped subtotal + advisory (Finding 5);
      talent adds exactly one 100-XP in-career talent when unmet / zero when met;
      `grandTotal = chars + skills + talent + advanceLevelCost` and
      `advanceLevelCost === (chars.met && skills.met && talent.met) ? 100 : 200`, and the three `met` flags equal
      the page's `charsMet`/`skillsMet`/`talentsMet` for the same fixture (compute the page values inline the same
      way `AdvancementPage` does); `canAfford`/`shortfall` correct around `xpCur == grandTotal`;
      `applicable:false` for no-career and max-level fixtures; agreement with `isCareerLevelComplete`
      (complete → `requirementsTotal === 0` and all met flags true); `projectBudget` correct covered prefix and
      first-unaffordable for budgets 0, between-two-steps, and ≥ grandTotal.
      Files: `src/logic/__tests__/advancement-planner.test.ts`
      Verify: `npx vitest run src/logic/__tests__/advancement-planner.test.ts` — all new unit tests pass.

- [ ] 5. Add the fast-check property tests `src/logic/__tests__/advancement-planner.property.test.ts`.
      Use `import fc from 'fast-check'` and `fc.assert(fc.property(...))` per repo convention. Implement P1–P5 from
      design §10: P1 all subtotals/`grandTotal` finite and `>= 0` for arbitrary advance counts (0..threshold) and
      arbitrary `xpCur`; P2 `projectBudget(plan,b).spent` non-decreasing in `b` and `spent <= min(b, grandTotal)`;
      P3 `orderedPath` costs non-decreasing, summed cost == `requirementsTotal`, each selected skill row
      contributes a contiguous `fromAdvances…threshold-1` run all sharing one `skillIndex`/`name`, and no physical
      row appears under two patterns' selections; P4 cost parity — for random `(type, currentAdvances, inCareer)`
      every emitted step `cost === getAdvancementCost(type, currentAdvances, inCareer)` (the planner never diverges
      from the authority — NFR-1); P5 skill-selection optimality — for small random row cost sets including
      overlapping multi-pattern rows, the selected rows' total ≤ any other covering set (brute force).
      Files: `src/logic/__tests__/advancement-planner.property.test.ts`
      Verify: `npx vitest run src/logic/__tests__/advancement-planner.property.test.ts` — all properties hold.

- [ ] 6. Add the component tests `src/components/__tests__/pages/AdvancementPlanner.test.tsx` (React Testing Library).
      Model on `src/components/__tests__/pages/AdvancementPage.tooltip.test.tsx` setup (localStorage HelpPopover
      suppression, Soldier fixture, `structuredClone(BLANK_CHARACTER)`). Build the `NextLevelPlan` prop by calling
      `planNextCareerLevel` on a fixture (keeps component tests consistent with the real module). Assert: requirement
      subtotals and grand total each render a `role="button"` tooltip trigger whose `aria-label` describes the
      breakdown, and opening it (click) shows the additive `A + B + … = Total` text; affordability summary text
      flips between "can afford" and "need N more XP" per plan; `applicable:false` fixture renders the neutral state
      with no cost figures; entering a number in the budget input renders the `BudgetProjection` and clearing it
      hides the projection; the `spent` running total carries a breakdown tooltip while per-step path costs do not.
      Files: `src/components/__tests__/pages/AdvancementPlanner.test.tsx`
      Verify: `npx vitest run src/components/__tests__/pages/AdvancementPlanner.test.tsx` — all component tests pass.

- [ ] 7. Integrate the planner into `src/components/pages/AdvancementPage.tsx` (additive JSX + one memo; optional literal refactor).
      Add `import { planNextCareerLevel } from '../../logic/advancement-planner';` and
      `import { AdvancementPlanner } from './AdvancementPlanner';`. Add
      `const plan = useMemo(() => planNextCareerLevel(character), [character]);`. Render
      `<AdvancementPlanner plan={plan} career={character.career} careerLevel={character.careerLevel} />`
      IMMEDIATELY BELOW the existing `<AdvancementChecklist ... />`, gated on the same
      `scheme && careerLevelNum > 0 && !isMaxLevel` condition as the checklist (design §7.3). Refactor the page's
      two inline `readyToProgress ? 100 : 200` literals (`advanceLevelCost` and the `switchCost` base in
      `handleSwitchCareer`) to use `ADVANCE_LEVEL_FEE.ready`/`.notReady` imported from `advancement.ts`, and replace
      the inline `({1:5,2:10,3:15,4:20,5:25})[careerLevelNum] ?? 5` with `CAREER_COMPLETION_THRESHOLDS[careerLevelNum] ?? 5`
      imported from `advancement.ts` — all behaviour-preserving (design §6 Findings 3 & 7, §7.1). Touch NO handler
      that spends XP; add no `update`/`updateCharacter` call on any planner path (FR-6).
      Files: `src/components/pages/AdvancementPage.tsx`
      Verify: `npx vitest run src/components/__tests__/AdvancementPage.validation.test.tsx src/components/__tests__/AdvancementPage.archive.test.tsx src/components/__tests__/pages/AdvancementPage.tooltip.test.tsx` — existing AdvancementPage tests still pass (behaviour unchanged by the refactor + additive render).

- [ ] 8. Add the read-only guarantee test `src/components/__tests__/pages/AdvancementPage.readonly.test.tsx` (FR-6).
      Render `AdvancementPage` with `vi.fn()` spies for `update` and `updateCharacter` and a deep clone of the
      character fixture. Interact with the planner only: open its tooltips, type into and clear the budget input.
      Assert `update` and `updateCharacter` are NEVER called during those interactions, and a deep-equal
      comparison of the character fixture before vs after is unchanged (no XP/advances/log mutation). Use
      `structuredClone` to snapshot the pre-interaction character (design §10 "AdvancementPage.readonly.test.tsx").
      Files: `src/components/__tests__/pages/AdvancementPage.readonly.test.tsx`
      Verify: `npx vitest run src/components/__tests__/pages/AdvancementPage.readonly.test.tsx` — the read-only test passes.

- [ ] 9. Final clean verification pass (design §10 — all must end clean).
      Run, in order, and fix any failure at its root cause (fix-errors steering — do not suppress): type-check,
      production build, full test suite, lint. For lint, confirm 0 errors and NO new warnings beyond the
      pre-existing baseline; the only sanctioned `eslint-disable` is the `react-hooks/set-state-in-effect` pattern
      mirroring `Tooltip.tsx`, used only if step 3 genuinely needed it. Clean up any temporary files.
      Files: (none — verification only)
      Verify: `npx tsc --build --force --noEmit` (no errors) && `npm run build` (succeeds) && `npx vitest run`
      (all suites green) && `npx eslint .` (0 errors, no new warnings).

---

## Assumptions / notes for the implementer

- The design is APPROVED and all open questions (OQ-1…OQ-6) are resolved in the design's favour; implement as
  specified and do not re-litigate them. If any skill-matching edge case surfaces that the design's §6 algorithm
  does not cover, flag it rather than inventing behaviour (rules-compliance).
- `vitest --run` (design §10) and this repo's `vitest run` / `npm test` are the same invocation; either is acceptable
  for the final pass.
- The planner module is the pure boundary: all math is unit- and property-testable without React (steps 4–5), and
  the component/page tests (steps 6, 8) prove the read-only guarantee and tooltip contract. Keep all cost arithmetic
  as sums of `getAdvancementCost` results — no cost literals anywhere in the new module or component.
