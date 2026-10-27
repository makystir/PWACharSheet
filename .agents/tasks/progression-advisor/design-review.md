# Progression Advisor — Design Review (iteration 3)

Reviewer: fresh-context design reviewer. Scope: `design.md` vs `requirements.md`, judged for
ambiguity, gaps, feasibility, scope creep, and (critically) **unverified assumptions** against the
real source. Every rules/code claim below was checked against the actual files, not taken on the
design's word.

## Verdict summary

- HIGH: 0
- MEDIUM: 0
- NIT: 3

No HIGH or MEDIUM findings → **APPROVED**. The three NITs are pseudocode/wording inaccuracies that
do not block implementation; they are listed so the coder matches the existing component contracts
exactly.

---

## Verified assumptions (checked against source)

1. **Switch-fee formula is reproduced correctly.** `AdvancementPage.tsx` `handleSwitchCareer`
   (lines ~255–256) computes `const sameClass = newScheme.class === character.class;` and
   `const switchCost = (readyToProgress ? ADVANCE_LEVEL_FEE.ready : ADVANCE_LEVEL_FEE.notReady) + (sameClass ? 0 : 100);`
   — **exactly** what the design quotes. The proposed `getCareerSwitchCost(ready, currentClass, targetClass)`
   returns `base + (sameClass ? 0 : 100)`, byte-identical. Extraction is behaviour-preserving. ✔
2. **Different-class +100 surcharge is rulebook-backed (OQ-3).** `docs/WarhammerFantasyRoleplay4e.md`
   §"Changing to a New Career" (line 1953): *"If you want to enter the first level of a Career from a
   different Class, this cost an extra 100 XP."* The p.48 cost table (line 1966) lists
   *"Enter a different Class | +100 XP"*. The design's citation and value are correct; lifting the
   literal into `CAREER_CHANGE_DIFFERENT_CLASS_SURCHARGE = 100 // Core p.48` is a faithful refactor. ✔
3. **Cost functions reused, not reinvented.** `getAdvancementCost` (`CHAR_COST_TABLE`/`SKILL_COST_TABLE`,
   `talent = 100 × (times+1)`, `inCareer ? base : base*2`), `ADVANCE_LEVEL_FEE = {ready:100, notReady:200}`,
   `CAREER_COMPLETION_THRESHOLDS = {1:5,2:10,3:15,4:20,5:25}` all exist in `advancement.ts` as cited.
   The design references only these shared constants for cost math — no invented/hardcoded numbers. ✔
4. **`planNextCareerLevel` reuse is real and accurate.** `advancement-planner.ts` exports
   `NextLevelPlan` with `orderedPath` (per-advance `PlannerStep`s only — **no** fee step),
   `advanceLevelCost`, `grandTotal`, `canAfford`, `shortfall`, and `RequirementPlan.advisories`.
   The design's T1 note (orderedPath = planner path **plus** a trailing fee step, not byte-equal)
   correctly reflects that the planner's `orderedPath` contains no fee. ✔
5. **`projectBudget` floors a non-negative integer** (`Math.floor(Math.max(0, finite?x:0))`) — matches
   the design's `projectProgressionBudget` description. ✔
6. **Max-level / inapplicable handling exists.** `planNextCareerLevel` returns `inapplicablePlan`
   when the scheme is missing, the title doesn't resolve, or `careerLevelNum >= allLevels.length`
   (at/above max). The design's `nextLevel` reachability (`reachable iff plan.applicable`) is sound. ✔
7. **Eligibility + grouping functions exist as cited.** `getEligibleCareers(species, className?)` and
   `isCareerEligible(career, species)` in `career-eligibility.ts`; `getCareersByClass`,
   `getCareerScheme`, `getCareerLevelOptions` in `careers.ts`; `CAREER_CLASS_LIST` in `data/careers.ts`.
   The real Switch Career picker uses `getEligibleCareers(character.species).filter(c => c !== character.career)`
   — identical to the design's target-list membership (AC2). ✔
8. **UI primitives exist with the claimed contract.** `SectionHeader` accepts
   `collapsible`/`collapsed`/`onToggleCollapse` and renders a far-right chevron (`margin-left:auto`);
   `Tooltip`, `TooltipTriggerCell`, `HelpPopover` exist; `AdvancementPlanner` uses the
   `SectionHeader` collapse pattern (not `CollapsibleSection`) — so Finding 7's byte-consistency claim
   is correct. ✔
9. **GM-discretionary XP (OQ-6 timeline default).** `advancement.ts` `awardXp` and
   `types/character.ts` both cite Core p.36: XP awards have no fixed RAW formula. The design correctly
   treats the `10` XP/session default as a **UI convenience, not a mechanic**, with a mandatory comment.
   `xpLog?: XpAwardEntry[]` exists, so the "defer deriving a rate from xpLog" rationale is grounded. ✔
10. **Read-only / no-mutation is enforceable.** All advancement mutators (`advanceCharacteristic`,
    `advanceSkill`, `handleSwitchCareer`) return new objects and are the *only* XP-spending paths; the
    advisor calls none of them. The planned deep-equal no-mutation test (AC10/P6) and read-only
    component test (AC13/C2) are feasible as described. ✔

## Unverified / wrong assumptions

None material. Two cosmetic pseudocode mismatches are captured as NITs below; neither reflects a
wrong understanding of a mechanic or a cost.

---

## Findings

### NIT-1 — `HelpPopover` pseudocode omits required `children`
Location: §"The UI panel" code sketch — `<HelpPopover concept="career-advancement">`.
`HelpPopoverProps` declares `children: string` as **required**, and every real call site passes text,
e.g. `AdvancementPlanner.tsx`: `<HelpPopover concept="career-advancement">{getHelpContent('career-advancement')}</HelpPopover>`.
The sketch as written would not compile.
Fix: match the planner exactly —
`<HelpPopover concept="career-advancement">{getHelpContent('career-advancement')}</HelpPopover>`
(import `getHelpContent` from `../../logic/help-content`). The `career-advancement` concept exists in
`help-content.ts`, so no new help content is needed.

### NIT-2 — "level titles (`getCareerLevelOptions`)" is imprecise
Location: §"The goal model" / §"The UI panel" (target-level selector).
`getCareerLevelOptions(careerName)` returns `CareerLevel[]` (objects), not title strings. The UI must
read `.title` off each entry for the picker labels and resolve the selected level to its index.
Fix: state the selector maps `getCareerLevelOptions(targetCareer).map(l => l.title)` for labels and
tracks the 1-based level number for `goal.level`. Behaviourally trivial, but worth pinning so the
coder doesn't pass a `CareerLevel` object where a `number`/string is expected.

### NIT-3 — Projected-character `careerLevel` field is described as mutated but is never read
Location: §"The pure engine" → `careerLevel` multi-level climb, projection step 3
("Set the clone's `career`/`careerLevel`/`class` … advance its notion of current level to L").
The new `planLevelRequirements(character, careerName, levelNum)` helper resolves the level **by
`levelNum`** (Nth present level) and the threshold internally — it never reads the projected clone's
`careerLevel` title. So mutating `careerLevel` on the clone is dead work and could mislead the coder
into thinking title-resolution is in play (the current `planNextCareerLevel` resolves by title, but
the extracted helper deliberately does not).
Fix: clarify that for the projection only the **advance counts** (chars `.a`, skill rows, talents)
matter; `planLevelRequirements` is called with the explicit `levelNum`, so the clone's
`career`/`careerLevel`/`class` need not be touched (and touching them has no effect on costing).

---

## Coverage check against the requested focus areas

- **COST-PARITY** — Satisfied. The advisor consumes `getAdvancementCost`, `ADVANCE_LEVEL_FEE`,
  `CAREER_COMPLETION_THRESHOLDS`, and the new shared `getCareerSwitchCost` only. No hardcoded cost
  numbers. Cited pages (p.44–48) verified against `docs/`. The `planLevelRequirements` extraction
  keeps **one** implementation of per-requirement costing (planner delegates to it; existing planner
  tests must stay green — NFR-3/R1 guard this). ✔
- **READ-ONLY** — Satisfied. Engine returns new plain objects, mutates nothing; panel exposes no
  mutating control and routes "do it" to the existing controls. No-mutation test (AC10/P6) +
  read-only component test (AC13/C2) planned. ✔
- **REUSE not rebuild** — Satisfied. Builds on `planNextCareerLevel`/`projectBudget`/eligibility and
  the inline switch logic (now shared). The only new logic is composition/projection, not re-derived
  mechanics. ✔
- **RULEBOOK AMBIGUITIES** — Satisfied. Multi-switch chains are an explicit, cited scope limitation
  (single-career multi-level + single switch); foreign-career level>1 is honestly reported via
  `goalFullyPlanned:false` + advisory rather than silently guessed. Different-class cost is cited and
  verified. ✔
- **COMPLETENESS** — Goal model (serializable discriminated union), reachability (species eligibility),
  XP-timeline model (user rate over shortfall, `null` when rate≤0/shortfall=0), UI placement
  (sibling Card after the planner, far-right chevron, no reintroduced "What's Left This Level"),
  opinionated-ordering-with-options-and-rationale (`describeCareerOptions`, rendered only in the
  `none` state), the pure `ProgressionAdvisorSource` boundary for future LLM augmentation, and a
  concrete test plan (fast-check property tests P1–P6, cost-parity P1/P2, no-mutation P6/AC10,
  component tests C1–C5) are all present and specified. ✔
- **calculated-total-tooltips** — Satisfied. Every calculated total (phase subtotals, grand total,
  switch fee with cited components, budget `spent`, timeline aggregate) carries a
  `Tooltip`/`TooltipTriggerCell` breakdown in `A + B + … = Total` form; per-step single lookups are
  exempt, matching the planner and the steering rule. ✔

---

## Conclusion

The design is internally consistent, grounded in the real source, cites rulebook pages that actually
back its claims, reuses the existing cost/eligibility logic without reinventing any mechanic, and
honestly scopes the one genuine rulebook-adjacent ambiguity (multi-hop) rather than guessing. The
three NITs are pseudocode/wording nits with trivial, mechanical fixes.

**Verdict: APPROVED** (0 HIGH, 0 MEDIUM, 3 NIT).
