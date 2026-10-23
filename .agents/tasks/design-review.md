# Design Review — Advancement Planner (READ-ONLY)

Design reviewed: `.agents/tasks/advancement-planner-design.md`
Reviewer: design-review subagent (fresh read, no prior context)
Scope of review: the eight points in the review brief — read-only guarantee, cost reuse (no invented numbers), rulebook citation + flagged ambiguities, cheapest-path specificity + checklist parity, pure testable module boundary, calculated-total tooltips, test plan assertions (projected==real, no-mutation), additive/non-breaking.

This design is a **revision pass** that already folded in a prior review's 2 MEDIUM + 6 NIT findings (design §13/§14). I reviewed it fresh against source, so the findings below are only those I could still substantiate, not a re-statement of the resolved ones.

---

## Verdict inputs

Counting HIGH + MEDIUM below determines the mechanical verdict (see `design-review.json`).

---

## Verified Assumptions (read against source, confirmed correct)

- **V1 — `getAdvancementCost` is exported and is the sole pricing authority.** `src/logic/advancement.ts` exports `getAdvancementCost(type, currentAdvances, inCareer)`; `CHAR_COST_TABLE`/`CHAR_MAX_COST` (520), `SKILL_COST_TABLE`/`SKILL_MAX_COST` (440) are private and carry the `// Core pp.44-45` comment. Talents price as `100 * (currentAdvances + 1)`, doubled when `!inCareer`. Matches design §2/§3/§14. The planner reusing only this function satisfies the rules-compliance "no invented numbers" rule.
- **V2 — `calculateTierBoundaryCost` establishes the "sum `getAdvancementCost` per step" pattern.** Present and exported; the design's per-step summation to a threshold mirrors it. (Confirmed by import list in `AdvancementPage.tsx`.)
- **V3 — Threshold is advances-only in both the page and the predicate.** `AdvancementPage`: `completionThreshold = ({1:5,2:10,3:15,4:20,5:25})[careerLevelNum] ?? 5`; `charsProgress` uses `character.chars[k].a >= completionThreshold`; `skillsWithAdvances` filters on `s.a >= completionThreshold`; `skillsMet = skillsWithAdvances.length >= Math.min(8, careerSkills.length)`. `isCareerLevelComplete` uses `character.chars[charKey].a < threshold` and `skill.a >= threshold` against the private `CAREER_COMPLETION_THRESHOLDS = {1:5,2:10,3:15,4:20,5:25}`. The design's OQ-1 "advances only" resolution and checklist-parity claims are accurate.
- **V4 — The 100/200 level-change fee is an inline literal in two places.** `AdvancementPage`: `const advanceLevelCost = readyToProgress ? 100 : 200;` and, in `handleSwitchCareer`, `const switchCost = (readyToProgress ? 100 : 200) + (sameClass ? 0 : 100);`. It is **not** exported. The design's Finding-3 resolution (extract `ADVANCE_LEVEL_FEE = { ready: 100, notReady: 200 }` and refactor both literals) is grounded.
- **V5 — `readyToProgress = charsMet && skillsMet && talentsMet`.** Confirmed verbatim in `AdvancementPage`. The design's Finding-4 `advanceLevelCost` basis (three `met` flags, not `requirementsTotal === 0`) matches.
- **V6 — `careerSkillMatches` handles the grouping cases the design relies on.** Exact, `(Any)`, `(Any X)`, `(X or Y)`, and ungrouped→specialised are all implemented as described.
- **V7 — `ensureCareerSkillsExist` skips wildcard `(Any)` / `(Any ` skills.** Confirmed. The design's wildcard "exclude + advisory" (OQ-2) correctly mirrors the real flow's inability to synthesise a specialisation.
- **V8 — `getCurrentLevelTalents` returns talents *new* at the level** (difference vs previous level; level 1 returns all). Matches design §2/§3 and the Core p.47 citation.
- **V9 — `talentsOwned` owned-test.** `AdvancementPage`: `getCurrentLevelTalents(...).filter(tn => character.talents.some(t => t.n === tn || t.n.startsWith(tn + ' (') || tn.startsWith(t.n + ' (')))`. The design states the planner's owned test is "identical to `AdvancementPage.talentsOwned`" — accurate.
- **V10 — Tooltip component contract.** `Tooltip` props are exactly `{ anchorEl, title, children, onClose, id }`. `TooltipTriggerCell` renders `role="button"`, `tabIndex=0`, Enter/Space handling, hover (300ms open / 200ms close) + click, `onOpen(anchorEl)`/`onClose`, `aria-describedby` wired to `tooltipId`. Matches design §7.2/§14 and the NFR-5 accessibility claim.
- **V11 — Character type fields.** `xpCur`/`xpSpent`/`xpTotal`, `chars[k].{i,a,b}`, `bSkills`/`aSkills` entries `{n,c,a}`, `talents` entries `{n,lvl,desc}`, `advancementLog`, `advancementLogArchive`, optional `xpLog`/`eventLog` all exist in `src/types/character.ts`. The FR-6 no-mutation assertion is implementable as written.
- **V12 — Test conventions.** `src/logic/__tests__/advancement.test.ts` uses Vitest + a `makeTestCharacter(overrides)` helper over `structuredClone(BLANK_CHARACTER)`; the design's "reuse the `makeTestCharacter` pattern" and fast-check conventions are consistent with the repo.
- **V13 — READ-ONLY boundary is genuinely read-only.** `planNextCareerLevel(character)` / `projectBudget(plan, budget)` take data and return plain data (`NextLevelPlan`/`BudgetProjection`); the module imports no mutators and the component receives no `update`/`updateCharacter` on the planner path (design §7.1/§7.3/§9). No design path spends XP, writes a log, or advances. The commit verbs ("committing runs `ensureCareerSkillsExist` + `advanceSkill`") are descriptions of the *existing* real flow for parity, not planner actions. Point (1) of the brief is satisfied.

---

## Unverified / Wrong Assumptions

None. Every source-dependent claim the design labels "verified" (design §2, §14) was independently confirmed against `advancement.ts`, `AdvancementPage.tsx`, `AdvancementChecklist.tsx`, `Tooltip.tsx`, `TooltipTriggerCell.tsx`, `careers.ts`, and `character.ts`. No claim was found false or unsupported.

---

## Findings

### 1. NIT — `CHAR_FULL_NAMES` / `CHAR_KEYS` source for the component tooltip is unstated
Design §7.2 renders characteristic steps with `CHAR_FULL_NAMES[k]`. This symbol lives in `src/components/pages/characterConstants.ts` (imported by `AdvancementPage` and `AdvancementChecklist`), not in a shared logic module. The design references it without naming the import source, a minor gap for the implementer.
**Fix:** state in §7.2 that `AdvancementPlanner` imports `CHAR_FULL_NAMES` from `./characterConstants`, matching `AdvancementChecklist`.

### 2. NIT — Talent `timesTaken` for the cost line is derived by exact name, but "owned" uses prefix matching; the design does not spell out which rule prices the suggested talent
The real `handleAcquireTalent` computes `timesTaken` from `character.talents.find(t => t.n === talentName)?.lvl` (exact match), while the *owned* test for exclusion uses `startsWith` matching (V9). For an **unowned** current-level talent (the only candidates the planner prices), both agree that `timesTaken = 0 → 100 XP`, so there is no numeric divergence today. But the design states the cost rule only as "new talent → timesTaken = 0 → 100" without noting it mirrors the page's exact-name `timesTaken` derivation.
**Fix:** add one sentence to §6 "Talent": "the suggested talent's `timesTaken` is computed exactly as the page does (`character.talents.find(t => t.n === name)?.lvl ?? 0`); since only *unowned* current-level talents are candidates, `timesTaken` is always 0 (100 XP in-career)." This keeps the §10 "adds exactly one 100-XP talent" assertion unambiguous.

---

## Point-by-point coverage of the review brief

1. **Read-only** — satisfied (V13). No mutation/XP-spend/auto-advance path exists; FR-6 + the §10 read-only test (spy on `updateCharacter`/`update`, deep-equal snapshot) enforce it.
2. **XP costs reused, not invented** — satisfied (V1/V2). Only `getAdvancementCost` prices advances; the fee and thresholds are extracted into shared constants rather than retyped (V4). No invented number found → no HIGH raised.
3. **Rulebook citations + flagged ambiguities** — satisfied. Core pp.44–45 (costs), p.47 (talent availability), p.48 (completion thresholds + 100/200 fee) are cited; OQ-1…OQ-6 explicitly flag the open ambiguities (threshold = advances-only, wildcard handling, representative talent, fee inclusion, L5→25 extension, `min(8, …)`), none silently resolved.
4. **Cheapest-path precision + checklist parity** — satisfied. §6 specifies deterministic char steps, row-based greedy skill selection (dedup by physical row, `satisfiesPatterns`, highest-`.a` targeting, tie-breaks), capped subtotal on wildcard shortfall, and stable cheapest-first ordering. `skills.met` is defined as exactly the page predicate (V3) and asserted equal in §10.
5. **Pure, isolated-testable module** — satisfied. `advancement-planner.ts` exports pure functions returning plain data (V13); §10 unit + fast-check (P1–P5) test it with no React.
6. **Calculated-total tooltips** — satisfied. §7.2 gives every subtotal, the grand total, and cumulative/running totals (`spent`) a `TooltipTriggerCell` breakdown; raw per-step `getAdvancementCost` lookups are correctly exempt (not calculated totals).
7. **Test plan has projected==real and no-mutation** — satisfied. P4 asserts per-step `cost === getAdvancementCost(...)`; `AdvancementPage.readonly.test.tsx` asserts no `updateCharacter`/`update` call + unchanged character snapshot.
8. **Additive / existing tests green** — satisfied in intent. New files only; the two source edits (`export CAREER_COMPLETION_THRESHOLDS`, add `ADVANCE_LEVEL_FEE` + refactor two inline literals to use it) are behaviour-preserving. Verification commands (`tsc`, `build`, `vitest --run`, `eslint`) are listed.

---

## Summary

HIGH: 0
MEDIUM: 0
NIT: 2

No HIGH or MEDIUM findings. The design stands on its own: the read-only boundary is real, costs flow solely through `getAdvancementCost`, thresholds/fee are sourced from shared constants, the cheapest-path algorithm is specified down to tie-breaks and row-dedup, the pure module is isolated and property-testable, every calculated total carries a breakdown tooltip, and the test plan includes both the projected==real-cost and no-mutation assertions. The two NITs are documentation clarifications that do not block implementation.

Verdict: **APPROVED**.
