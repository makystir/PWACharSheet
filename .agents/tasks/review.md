# Review — Read-Only Advancement Planner

Verdict: **APPROVED** — no blocking findings.

Scope reviewed: the commit `e0a2839` implementing the READ-ONLY advancement
planner against the approved design (`advancement-planner-design.md`) and plan
(`advancement-planner-plan.md`). Nine files: the new pure module, component,
CSS, four test files, plus additive edits to `advancement.ts` and
`AdvancementPage.tsx`.

## Verification evidence (read, not re-run)

The commit message records all four required commands and their results:

- `npx tsc --build --force --noEmit` → exit 0
- `npm run build` → exit 0 (built OK)
- `npx vitest run` → 472 files / 5220 tests passed
- `npx eslint .` → 0 errors, 3 pre-existing react-refresh warnings (none in new/changed files)

Evidence is present and complete; per instructions I did not re-run the suites.
No specific doubt arose that warranted a spot-check.

## 1. READ-ONLY integrity (FR-6) — PASS

- `advancement-planner.ts` imports only non-mutating helpers (`getCareerScheme`,
  `careerSkillMatches`, `getCurrentLevelTalents`, `getAdvancementCost`, and the
  two constants). It never imports `update`/`updateCharacter`, accepts no
  mutator, and both exported functions return freshly-built plain objects.
  `projectBudget` only reads `plan.orderedPath`.
- `AdvancementPlanner.tsx` is pure presentation. Its only local state is the
  budget string and the open-tooltip discriminator; neither touches the
  character. No `update`/`updateCharacter` is passed in or called.
- `AdvancementPage.tsx` integration is additive: `const plan = useMemo(() =>
  planNextCareerLevel(character), [character])` plus a gated `<AdvancementPlanner>`
  render. No XP-spending handler was touched.
- The read-only guarantee is enforced by a dedicated test
  (`AdvancementPage.readonly.test.tsx`): it renders the real `AdvancementPage`
  with `vi.fn()` spies, opens every planner tooltip, types and clears the budget,
  opens the `spent` tooltip, then asserts `update`/`updateCharacter` were never
  called and `expect(char).toEqual(before)` on a `structuredClone` snapshot.
  This is meaningful and exercises the live integration, not just the module.

## 2. Cost correctness — PASS

- Every cost in the module is a call to `getAdvancementCost(...)` or a sum of
  such calls (`charSteps`, `makeCandidate`, talent step). A grep of the module
  for every table value and the 100/200 fee found matches **only inside
  comments** — no hardcoded cost literal appears in executable code.
- The level-change fee is the exported `ADVANCE_LEVEL_FEE` constant (single
  source of truth), driven by the three `met` flags exactly as the design's
  Finding 4 requires — not `requirementsTotal === 0`.
- Parity with the real advance buttons: skill steps carry `isBasic`/`skillIndex`
  so the plan maps 1:1 onto the physical row the real `advanceSkill` flow would
  commit, and all career items price in-career (non-doubled) just as the real
  buttons do for career advances. Property test **P4** asserts for every emitted
  step `cost === getAdvancementCost(step.kind, step.fromAdvances, step.inCareer)`,
  pinning the planner to the authority (NFR-1).

## 3. Mechanics compliance — PASS

- Thresholds come from the exported `CAREER_COMPLETION_THRESHOLDS` with the same
  `?? 5` fallback the page uses; no `{1:5,…}` map is duplicated in the planner.
- `skills.met` is computed as **exactly** the page predicate
  (`metPatterns.length >= min(8, careerSkills.length)`), independent of
  auto-selectability (design Finding 5). A unit test asserts
  `plan.skills.met === pageSkillsMet(...)`, and another asserts the three `met`
  flags equal the page's `charsMet`/`skillsMet`/`talentsMet` computed inline the
  same way `AdvancementPage` does.
- Agreement with `isCareerLevelComplete`: a dedicated test builds a complete
  Recruit and asserts `requirementsTotal === 0`, all `met` flags true, and
  `advanceLevelCost === ADVANCE_LEVEL_FEE.ready`.
- Threshold measured against advances only (`.a`), matching `isCareerLevelComplete`
  and the checklist (verified in `AdvancementPage.tsx` lines computing
  `charsProgress`/`skillsWithAdvances`).
- Code comments cite the correct rulebook pages (Core pp.44-45 costs; Core p.48
  thresholds and level fee; Core p.47 talent availability). The L5→25 extension
  is flagged as a pre-existing app convention (OQ-5), not silently invented.
- Wildcard-only career patterns (`(Any)`/`(Any X)`) with no concrete row are
  excluded from candidates and surfaced as advisories rather than being priced —
  no invented specialisation cost (OQ-2).

## 4. Tooltips (calculated-total-tooltips steering) — PASS

- Each requirement subtotal, the grand total, and the budget `spent` running
  total render through `TooltipTriggerCell` (which emits `role="button"`,
  `tabIndex=0`, keyboard- and tap-accessible) with an additive `A + B + … = Total`
  breakdown in both the `aria-label` and the opened `Tooltip` body.
- Per-step path costs are single `getAdvancementCost` lookups (not sums) and are
  correctly exempt (design Finding 6). A component test asserts exactly the four
  total triggers exist and that the path per-step costs are plain text.

## 5. Tests — PASS

- Unit (`advancement-planner.test.ts`): characteristic sum-to-threshold,
  cheapest-row skill selection, overlapping specific+`(Any)` priced once
  (Finding 1), highest-`.a` row targeted with per-step sum == subtotal
  (Finding 2), `skills.met` == page predicate incl. wildcard case (Finding 5),
  talent one-100-XP/zero, `grandTotal` composition and fee basis, met-flag parity
  with the page, `canAfford`/`shortfall` around the boundary, `applicable:false`
  for no-career/max-level/unknown-career, agreement with `isCareerLevelComplete`,
  and `projectBudget` for budgets 0 / between-two / ≥ total / decimal / NaN.
- Property (`advancement-planner.property.test.ts`): P1 finite & non-negative,
  P2 monotone budget bounded by `min(b, pathTotal)`, P3 ordering + contiguous
  single-row runs + no row under two patterns, P4 cost parity, P5 brute-force
  skill-selection optimality (guarded to fully-solved cases).
- Component (`AdvancementPlanner.test.tsx`): total triggers + breakdown text,
  affordability flip, neutral `applicable:false` state with no cost figures,
  budget show/hide, and the per-step-vs-running-total tooltip split.
- Read-only (`AdvancementPage.readonly.test.tsx`): the no-mutation guarantee as
  described in §1.
- Fixtures were cross-checked against real career data in `src/data/careers.ts`:
  Soldier is a 4-level career (Recruit/Soldier/Sergeant/Officer); Recruit chars
  WS/T/WP and its 8 skills + Marksman talent match; L2 lists both `Melee (Any)`
  and `Melee (Basic)` and `Ranged (Any)`, supporting the overlapping-pattern and
  wildcard-advisory tests; Officer (L4) is max, so `applicable:false` there is
  correct.

## 6. Additivity — PASS

- Only two existing files changed. `advancement.ts` adds the two `export`s with
  Core p.48 provenance comments and no logic change (confirmed by diff).
  `AdvancementPage.tsx` adds the import/memo/gated render and refactors the two
  inline `100/200` fee literals and the inline `{1:5,…}` threshold map to the
  shared constants — behaviour-preserving.
- No existing test file was modified. The recorded suite (5220 tests) is green,
  satisfying "existing tests remain green and unchanged."

## Non-blocking observations (not findings; no action required)

- In `AdvancementPlanner.tsx`, `feeBasis` is derived via
  `advanceLevelCost === 100 ? 'ready' : 'not ready'`. This is a display-only
  label, not a cost calculation; the actual projected cost flows from
  `plan.advanceLevelCost` (which comes from `ADVANCE_LEVEL_FEE`). The literal
  `100` here is only a label discriminator and is harmless, though it could read
  `=== ADVANCE_LEVEL_FEE.ready` for symmetry. Not blocking.
- `handleSwitchCareer`'s cross-class `+ (sameClass ? 0 : 100)` surcharge literal
  remains inline. This is pre-existing, outside the planner's scope (the plan
  only called for extracting the base ready/not-ready fee), and unrelated to the
  planner's correctness. Not blocking.
