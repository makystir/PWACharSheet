# Advancement Planner — Requirements & Technical Design

Status: Draft for review
Scope: READ-ONLY planning/projection view on the Advancement page.
Rulebook authority: WFRP4e Core Rulebook (`docs/WarhammerFantasyRoleplay4e.md`); Errata overrides; supplements extend (per `rules-compliance` steering).

---

## 1. Summary

Players currently see *what is left* to complete their current career level (the "What's Left This Level" checklist rendered by `AdvancementChecklist.tsx`) and can spend XP through the existing per-characteristic / per-skill / talent advance controls on `AdvancementPage.tsx`. What they cannot see is **"how much XP does completing this level actually cost, and what is the cheapest set of advances that gets me there?"** They must mentally price each unmet requirement using the tiered XP tables.

This feature adds a **read-only Advancement Planner**: a projection that, for the character's current state, computes the cheapest set of individual advances that satisfies every unmet Advance-Career-Level requirement for the next career level, prices each advance with the **real** cost functions in `src/logic/advancement.ts`, sums a running total, and reports **"you can afford X / you need Y more XP."** Every calculated total gets a breakdown tooltip. The planner never mutates the character, never spends XP, and never advances anything — committing remains exclusively through the existing advance buttons.

The planner is delivered as a **pure logic module** (`src/logic/advancement-planner.ts`) plus a **presentation component** (`src/components/pages/AdvancementPlanner.tsx`) wired into `AdvancementPage`. It **augments the existing Career Progress checklist with cost-to-complete** rather than duplicating the completion logic.

---

## 2. Grounding in existing code (verified, not assumed)

The following were read to ground this design:

- **`src/logic/advancement.ts`** — authoritative cost + completion logic that the planner MUST reuse:
  - `CHAR_COST_TABLE` / `CHAR_MAX_COST` and `SKILL_COST_TABLE` / `SKILL_MAX_COST` — private tables (not exported). *(Comment cites Core pp.44-45.)*
  - `getAdvancementCost(type, currentAdvances, inCareer): number` — **exported.** Returns the XP cost of the *next single advance* given the current advance count; doubles when `inCareer === false`. Talents cost `100 × (currentAdvances + 1)`, doubled out-of-career.
  - `calculateBulkAdvancement(type, currentAdvances, availableXP, inCareer, maxBulk)` — greedy "how many can I buy" helper.
  - `calculateTierBoundaryCost(type, currentAdvances, inCareer)` — sums per-advance costs up to the next tier boundary (5/10/15/20/25). Confirms the canonical **"sum `getAdvancementCost` over each step"** pattern the planner will reuse.
  - `careerSkillMatches(careerSkillName, characterSkillName)` — grouped/wildcard skill matching ("(Any)", "(Any X)", "(X or Y)", ungrouped→specialised). The planner MUST use this to decide which character skill satisfies a career skill.
  - `getCurrentLevelTalents(careerName, level)` — talents *new* at the current level (Core p.47: talents only available at the level that lists them).
  - `isCareerLevelComplete(character, careerName, level)` — the completion predicate.
  - `CAREER_COMPLETION_THRESHOLDS` (private): `{1:5, 2:10, 3:15, 4:20, 5:25}`.
- **`src/components/pages/AdvancementPage.tsx`** — computes, for the *current* level:
  - `completionThreshold` = `{1:5,2:10,3:15,4:20,5:25}[careerLevelNum] ?? 5`.
  - `charsProgress = careerChars.map(k => ({ name:k, advances: character.chars[k].a, met: character.chars[k].a >= completionThreshold }))` → **threshold is measured against ADVANCES ONLY (`chars[k].a`), not initial+advances.** This matches `isCareerLevelComplete` (`character.chars[charKey].a < threshold`). The planner will use the identical definition so its numbers agree with the checklist.
  - `skillsWithAdvances = careerSkills.filter(sn => allSkills.some(s => careerSkillMatches(sn, s.n) && s.a >= completionThreshold))`.
  - `skillsMet = skillsWithAdvances.length >= Math.min(8, careerSkills.length)`.
  - `talentsOwned` / `talentsMet` via `getCurrentLevelTalents`.
  - In-career detection for pricing: `careerChars.includes(key)` (chars), `careerSkills.some(cs => careerSkillMatches(cs, skill.n))` (skills), career-talent match (talents). The planner reuses these exact predicates.
- **`src/components/pages/AdvancementChecklist.tsx`** — pure presentation; all met/unmet state is computed in `AdvancementPage` and passed as props. The planner follows this same "logic in page/module, rendering in component" split.
- **`src/components/shared/Tooltip.tsx`** + **`TooltipTriggerCell.tsx`** — the breakdown-tooltip pattern (single `openTooltip` state discriminated by `kind`, `TooltipTriggerCell` renders the value and drives open/close, `Tooltip` renders the portal). The planner reuses both verbatim.
- **`src/logic/careers.ts`** / **`career-eligibility.ts`** — `getCareerScheme`, level lookup; eligibility is **not** needed because the planner only targets the *next level of the current career* (and an optional budget), never a career switch.
- **`src/types/character.ts`** — confirmed field names: `xpCur` / `xpSpent` / `xpTotal`; `chars[k].{i,a,b}`; `bSkills`/`aSkills` entries `{n,c,a}`; `talents` entries `{n,lvl,desc}`.
- **Test conventions** — `src/logic/__tests__/advancement.test.ts` (Vitest), and `*.property.test.ts` files use `import fc from 'fast-check'` with `fc.assert(fc.property(...))`.

---

## 3. Rulebook citations

- **Core p.48 — "Completing a Career":** *"To complete a Career, you must have the number of Advances listed below in all your Career level's Characteristics and in eight of your Career level's available Skills. You must also have at least 1 Talent from your current Career level. Skills and Talents you have gained from advancement prior to entering your current Career count towards this."* Table: Level 1 → 5, 2 → 10, 3 → 15, 4 → 20 Advances. *(App extends L5 → 25 for 5-level careers; this is the app's existing convention in `CAREER_COMPLETION_THRESHOLDS` — see Open Question OQ-5.)*
- **Core pp.44-45 — Advancement cost tables:** characteristic and skill tiered XP costs; **"the cost of an Advance is based on how many Advances you have already purchased"** (tiered by current advance count). Encoded in `CHAR_COST_TABLE` / `SKILL_COST_TABLE`.
- **Core p.45 — out-of-career doubling:** advancing a non-career characteristic/skill/talent **costs double**. Encoded in `getAdvancementCost`'s `inCareer ? base : base*2`.
- **Core p.47 — talent availability:** *"Talents are only available when you are in the level of the Career that lists them."* Encoded in `getCurrentLevelTalents`.
- **Talent cost** (Core p.45): `100 × (times taken + 1)`. Encoded in `getAdvancementCost('talent', ...)`.

The planner **invents no numbers.** Every cost comes from `getAdvancementCost`. Every threshold comes from the app's existing `completionThreshold`/`CAREER_COMPLETION_THRESHOLDS`.

---

## 4. Functional Requirements

**FR-1 Cost-to-complete the current→next level.** For the character's current career level, the planner computes the total XP required to satisfy every **unmet** Advance-Career-Level requirement and reach the "Ready to advance" state:
- **Characteristics:** for each career characteristic whose advances `< threshold`, the cheapest advances are *exactly* the steps from current advances up to `threshold` (characteristic advances can only be bought one tier step at a time; there is no cheaper substitute — see §6). Cost = `Σ getAdvancementCost('characteristic', a, inCareer)` for `a` in `[current … threshold-1]`.
- **Skills:** the requirement is "**≥ 8** (or `min(8, careerSkills.length)`) career skills each at `threshold`+ advances." The planner must pick the **cheapest set of career skills** to bring up to threshold to reach that count (see §6 for the selection algorithm), counting skills already at threshold toward the count at zero cost.
- **Talent:** if `talentsMet` is false, add the cost of acquiring the **cheapest** eligible current-level career talent not yet owned (`getAdvancementCost('talent', timesTaken, inCareer=true)`; a brand-new talent → `timesTaken = 0` → 100 XP). See OQ-3.
- A **running grand total** = chars + skills + talent costs.

**FR-2 Affordability summary.** The planner displays a clear summary: **"You can afford it"** when `xpCur ≥ grandTotal`, otherwise **"You need N more XP"** where `N = grandTotal − xpCur`. The summary and every sub-total carry a breakdown tooltip.

**FR-3 Cheapest ordered path.** Given a target (default: next career level; optionally a user-entered XP budget), the planner produces an **ordered list of individual advances** (each a `{kind, name, fromAdvances, toAdvances, inCareer, cost}` step) that constitutes the cheapest path, each priced with the real in-career/out-of-career cost rule. Ordering: cheapest-next-step first (stable), so partial budgets buy the most progress (see §6, "Path ordering").

**FR-4 Optional XP-budget input.** In addition to the next-level target, the planner offers an optional free-form numeric **budget** input. When set, the planner shows, from the cheapest path, **how far the budget reaches** (which steps are covered, cumulative cost, and the first step it cannot afford). The budget never changes the character; it is local component state. **Recommendation: include it** (low cost, high player value — answers "if I save up N XP, what do I get?"). See §8.

**FR-5 Augment, do not duplicate.** The planner extends the existing Career Progress / "What's Left This Level" presentation with cost-to-complete figures rather than re-deriving completion state. It consumes the **same** computed values already produced in `AdvancementPage` (`charsProgress`, `skillsWithAdvances`, `careerSkills`, `completionThreshold`, `talentsMet`, `careerChars`, etc.).

**FR-6 Read-only guarantee.** Opening, interacting with, or toggling the planner performs **no** `updateCharacter`/`update` call, changes no XP field, and appends nothing to `advancementLog`/`eventLog`.

**FR-7 Max-level / no-career handling.** When the character is at max level of the career, or has no career selected, the planner renders a neutral "nothing to plan" state (mirroring the checklist's `isMaxLevel` branch) and shows no costs.

---

## 5. Non-Functional Requirements

- **NFR-1 Cost parity:** the planner's projected cost for any advance MUST equal what the real advance button charges (both call `getAdvancementCost`). A dedicated test asserts this (§10).
- **NFR-2 Purity/testability:** all planner math lives in `advancement-planner.ts` as pure functions of `(Character)` (+ optional budget), returning plain data — unit- and property-testable in isolation with no React.
- **NFR-3 Additive only:** no existing exported signature changes; existing tests stay green unchanged.
- **NFR-4 Tooltips:** every calculated total in the new UI uses `Tooltip` + `TooltipTriggerCell` with an additive breakdown (`calculated-total-tooltips` steering).
- **NFR-5 Accessibility:** tooltip triggers are keyboard-focusable and tap-friendly via the existing `TooltipTriggerCell` (hover on desktop, tap on touch). Summary uses `role="status"` like the checklist's max-level banner.

---

## 6. The "cheapest path" definition (precise)

All costs via `getAdvancementCost`; all thresholds via the app's `completionThreshold`. "Advances" means `chars[k].a` / `skill.a` (advances only), matching the existing checklist and `isCareerLevelComplete`.

**Threshold definition (settled):** A characteristic/skill counts toward completion when its **advance count** (`.a`) is `≥ threshold`. This is advances-only, confirmed in both `AdvancementPage` (`character.chars[k].a >= completionThreshold`) and `isCareerLevelComplete`. The planner uses the identical definition so it **agrees with the existing checklist by construction** (OQ-1 resolved in favour of matching the app).

**Characteristics (deterministic, no choice).** For each career characteristic `k` with `chars[k].a = a0 < threshold`, the only way to reach threshold is to buy each successive advance; tiered pricing is monotonic non-decreasing, so there is no cheaper alternative. Cost:
```
charCost(k) = Σ_{a=a0}^{threshold-1} getAdvancementCost('characteristic', a, inCareer_k)
inCareer_k = careerChars.includes(k)
```
Each step becomes a path item `{kind:'characteristic', name:k, fromAdvances:a, toAdvances:a+1, inCareer_k, cost}`.

**Skills (a genuine, row-based minimisation).** The requirement is a **count** (`need = min(8, careerSkills.length)`) of career-skill *patterns* satisfied at threshold, not all of them. The checklist (`AdvancementPage.skillsWithAdvances`) counts a career-skill pattern `sn` as satisfied when `allSkills.some(s => careerSkillMatches(sn, s.n) && s.a >= threshold)`. The subtlety that Findings 1 and 2 exposed is that pattern-based selection is unsafe: **one physical character row can satisfy two different career patterns** (e.g. the career lists both `Melee (Basic)` and `Melee (Any)`, and the single `Melee (Basic)` row satisfies both). Pricing or advancing "per pattern" would then double-count that one row, producing a cost the real single-row advance buttons can never realise and breaking projected==real cost. The planner therefore plans over **distinct character rows**, never over patterns.

Definition of `skills.met` (checklist parity, settled per Finding 5): `skills.met` is computed as **exactly the checklist predicate** on the *current* character — `skillsWithAdvances.length >= need`, where `skillsWithAdvances = careerSkills.filter(sn => allSkills.some(s => careerSkillMatches(sn, s.n) && s.a >= threshold))` — and nothing else. It must equal the page's `skillsMet` for the same character (asserted by a §10 test). The planner's auto-selection ability never feeds back into `skills.met`.

Row-based selection algorithm (settled per Findings 1 & 2):

1. **Already-met patterns.** Compute `metPatterns = careerSkills.filter(sn => allSkills.some(s => careerSkillMatches(sn, s.n) && s.a >= threshold))` exactly as the checklist does. `alreadyMet = metPatterns.length`. `remainingNeeded = max(0, need − alreadyMet)`.

2. **Candidate rows (distinct, deduplicated).** Build the set of candidate character rows the planner may raise. A candidate is a concrete (non-wildcard) target the planner can price and that the real `advanceSkill(skillIndex, …)` flow could commit:
   - For each career-skill pattern not yet satisfied, find its matching character rows via `careerSkillMatches`. A row is identified by `{kind: 'skill', name, isBasic, skillIndex, a}` (the `skillIndex` the real flow needs — see §7.1). For a pattern matched by ≥1 existing row, pick the **single row with the highest `.a`** (cheapest to finish; closest to threshold), tie-breaking by **lowest array index** for determinism. Record that row's `.a` as `fromAdvances`.
   - For a **concrete** career-skill pattern (no `(Any)` / `(Any X)` wildcard) with **no** matching row, synthesise a cost-from-0 candidate row (`fromAdvances = 0`, no `skillIndex` yet — committing runs `ensureCareerSkillsExist` then `advanceSkill`, mirroring the real flow).
   - **Wildcard-only** patterns (`(Any)` / `(Any X)`) with no concrete matching row are **excluded** from candidates (the planner cannot invent a specialisation — mirrors `ensureCareerSkillsExist` skipping them) and are surfaced in `skills.advisories` (see OQ-2).
   - **Deduplicate by physical row**: a single row may satisfy several patterns. Each distinct `(isBasic, skillIndex)` row (and each distinct synthesised concrete skill name) appears **at most once** in the candidate set. For each candidate, record `satisfiesPatterns` — the set of currently-unmet patterns it would satisfy once raised to threshold.

3. **Cost-to-threshold per candidate.** For each candidate row with current advances `a0`:
   `rowCost = Σ_{a=a0}^{threshold-1} getAdvancementCost('skill', a, inCareer=true)` (all career skills are in-career by definition; `a0 >= threshold` cannot occur here because such rows are already counted in `metPatterns`). Emits one `PlannerStep` per `a` in `[a0 … threshold-1]`, all referencing **the same row** (same `name`/`skillIndex`), so per-step costs provably sum to `rowCost`.

4. **Greedy selection that never double-counts a row.** Sort candidates ascending by `rowCost` (tie-break lowest `skillIndex`, then name). Walk the sorted list, selecting a candidate only if it still satisfies ≥1 *not-yet-covered* pattern; on selection, mark all patterns in its `satisfiesPatterns` as covered and decrement `remainingNeeded` by the number of newly-covered patterns (one raised row may satisfy several patterns at once). Stop when `remainingNeeded <= 0` or candidates are exhausted. Because each pattern is covered by exactly one selected row and each row is selected at most once, no physical row is priced or advanced twice.

5. **Subtotal.** `skills.subtotal = Σ selectedRows[].rowCost`, which equals the sum of all emitted skill `PlannerStep.cost` by construction (step 3). When candidates are exhausted before `remainingNeeded` reaches 0 (e.g. the only way to finish needs a wildcard specialisation choice), the subtotal is **capped to the concrete rows selected**, `skills.met` stays whatever the checklist predicate says (step "Definition" above), and the shortfall is surfaced as an advisory ("additional specialisation choice required") rather than invented cost.

Optimality: with the per-row formulation each candidate's cost is independent of the others (advancing one row never changes another's price), and we minimise the sum of a subset of rows that together cover `remainingNeeded` patterns. Where rows satisfy disjoint single patterns this reduces to "pick the smallest `remainingNeeded` costs" (classic optimal). Where a single row covers multiple patterns the greedy step prefers it (it discharges more of `remainingNeeded` for one cost), which is never worse. The P5 property test brute-forces optimality on small random sets including overlapping-pattern cases.

Edge cases for skills:
- **Row missing entirely:** concrete career skill with no matching row → synthesised cost-from-0 candidate (step 2). Committing runs `ensureCareerSkillsExist` + `advanceSkill`, matching the real flow.
- **Multiple rows match one pattern:** target the single highest-`.a` row (tie-break lowest index); the subtotal and every emitted `PlannerStep` reference that same row, so per-step costs sum to the subtotal (Finding 2).
- **One row satisfies multiple patterns:** counted once as a candidate; its `satisfiesPatterns` discharges several patterns in one selection; never priced twice (Finding 1).
- **Wildcard-only pattern, no concrete row:** excluded from candidates, surfaced as an advisory; never auto-priced (OQ-2).

**Talent.** If `talentsMet` is false: candidate talents = `getCurrentLevelTalents(career, level)` not already owned (owned test identical to `AdvancementPage.talentsOwned`). Cost of each = `getAdvancementCost('talent', timesTaken, inCareer=true)` (new talent → 0 timesTaken → 100). Pick the cheapest (all new current-level talents are 100, so any; tie-break by name). The planner lists the chosen talent as a suggestion but flags that the *specific* talent is the player's choice (OQ-3).

**Grand total** = sum of all selected per-step costs (chars + selected skills + talent). This is the FR-1 "cost-to-complete."

**Path ordering (FR-3).** The full ordered path is the concatenation of all selected per-step items, sorted by **individual step cost ascending**, stable by (kind, name, fromAdvances) for determinism. Rationale: with a partial budget, buying cheapest-first maximises the number of completed steps, and because each requirement is independent, cheapest-first never strands a requirement. (Characteristic/skill steps for one item are still internally ordered low→high advance because a higher step's price depends on buying the lower one first — enforced by the stable tie-break on `fromAdvances`.)

**Note — this is cost-to-*complete-the-level-requirements*, not cost-to-*press-Advance*.** Pressing "Advance Career Level" additionally costs 100 XP (ready) or 200 XP (not ready), charged by `handleAdvanceLevel` in `AdvancementPage` (`advanceLevelCost = readyToProgress ? 100 : 200`). The planner shows this as a **separate, clearly-labelled line** ("Advance Career Level: 100 XP when ready / 200 XP now"), so the "total to actually reach the next level" is honest. These numbers are the app's existing values (Core p.48: 100 XP to change level when completed, 200 if not).

**Single source for the 100/200 fee (settled per Finding 3).** The fee is currently an inline literal in `AdvancementPage` (`advanceLevelCost = readyToProgress ? 100 : 200`, and the same literal in `handleSwitchCareer`), not exported. To keep one source of truth (rules-compliance), **extract a shared constant** `ADVANCE_LEVEL_FEE = { ready: 100, notReady: 200 }` in `advancement.ts` (with a `// Core p.48` comment), import it in both the planner and `AdvancementPage` (refactoring the page's inline literal to use it). This is additive (a new export + one page edit that preserves behaviour) and consistent with the `CAREER_COMPLETION_THRESHOLDS` export decision in §7.1.

**`advanceLevelCost` basis (settled per Finding 4).** The planner computes `advanceLevelCost = (characteristics.met && skills.met && talent.met) ? ADVANCE_LEVEL_FEE.ready : ADVANCE_LEVEL_FEE.notReady`. The three `met` flags are the authoritative inputs — **not** `requirementsTotal === 0` (which would wrongly exclude the wildcard-skill advisory cases where `skills.met` is false but concrete subtotal is 0). These three flags MUST equal the page's `charsMet` / `skillsMet` / `talentsMet` for the same character (asserted in §10).

---

## 7. Architecture & files

### 7.1 New pure module — `src/logic/advancement-planner.ts`

Exports (all pure, no React, no mutation):

```ts
export interface PlannerStep {
  kind: 'characteristic' | 'skill' | 'talent';
  name: string;              // char key, skill name, or talent name
  fromAdvances: number;      // talents: times-taken before
  toAdvances: number;
  inCareer: boolean;
  cost: number;              // from getAdvancementCost
  // Skill steps identify the concrete character row the real advanceSkill(skillIndex,…)
  // flow would commit, so the plan maps 1:1 onto a single physical row (Findings 1 & 2).
  // isBasic/skillIndex are present for existing rows; a synthesised cost-from-0 row
  // (concrete career skill with no matching row) has skillIndex === null until
  // ensureCareerSkillsExist would create it on commit.
  isBasic?: boolean;
  skillIndex?: number | null;
}

export interface RequirementPlan {
  kind: 'characteristics' | 'skills' | 'talent';
  steps: PlannerStep[];      // the chosen cheapest steps for this requirement
  subtotal: number;          // Σ steps[].cost
  met: boolean;              // requirement already satisfied (subtotal 0)
  advisories: string[];      // e.g. wildcard skills needing a manual choice
}

export interface NextLevelPlan {
  applicable: boolean;       // false when max-level / no career
  threshold: number;
  characteristics: RequirementPlan;
  skills: RequirementPlan;
  talent: RequirementPlan;
  requirementsTotal: number;      // chars + skills + talent subtotals
  // ADVANCE_LEVEL_FEE.ready (100) when characteristics.met && skills.met && talent.met, else notReady (200)
  advanceLevelCost: number;
  grandTotal: number;             // requirementsTotal + advanceLevelCost
  xpCur: number;
  canAfford: boolean;             // xpCur >= grandTotal
  shortfall: number;              // max(0, grandTotal - xpCur)
  orderedPath: PlannerStep[];     // FR-3 cheapest-first
}

export interface BudgetProjection {
  budget: number;
  affordableSteps: PlannerStep[]; // prefix of orderedPath the budget covers
  spent: number;
  firstUnaffordable: PlannerStep | null;
}

export function planNextCareerLevel(character: Character): NextLevelPlan;
export function projectBudget(plan: NextLevelPlan, budget: number): BudgetProjection;
```

`planNextCareerLevel` internally re-derives the same values the page computes, by calling the **same** helpers: `getCareerScheme`, level resolution, the shared `CAREER_COMPLETION_THRESHOLDS` constant (see below), `careerSkillMatches`, `getCurrentLevelTalents`, `getAdvancementCost`. It reads only `character` and returns data.

**Threshold constant (settled per Finding 7):** `CAREER_COMPLETION_THRESHOLDS = {1:5,2:10,3:15,4:20,5:25}` is currently a **private const** in `advancement.ts`. To keep a single source of truth (rules-compliance + fix-errors "root cause, no duplication"), **export the existing constant** from `advancement.ts` (additive — no behaviour change) and import it in the planner. Do **not** duplicate the `{1:5,…}` map in the planner. Optionally refactor `AdvancementPage`'s inline `({1:5,2:10,3:15,4:20,5:25})[careerLevelNum] ?? 5` to use the same import (a consistency win; not required for the planner). The planner applies the identical `?? 5` fallback so an unexpected level number prices exactly as the page does (OQ-5).

**Advance-level fee constant (settled per Finding 3):** export a new `ADVANCE_LEVEL_FEE = { ready: 100, notReady: 200 }` from `advancement.ts` (with a `// Core p.48` comment) and import it in both the planner and `AdvancementPage`, replacing the page's two inline `readyToProgress ? 100 : 200` literals. The planner never re-types `100`/`200`.

**In-career predicates:** the planner computes `careerChars`/`careerSkills`/`careerTalents` from the resolved `CareerLevel`, exactly as the page does, and applies `careerChars.includes(k)` / `careerSkillMatches` / current-level-talent match. Chars/skills/talents required for completion are by definition in-career, so their steps price at the in-career (non-doubled) rate — matching what the real buttons charge when advancing a career item.

### 7.2 New component — `src/components/pages/AdvancementPlanner.tsx` (+ `.module.css`)

Pure presentation. Props are the computed `NextLevelPlan` plus `career`/`careerLevel` labels and the budget UI state handlers, mirroring `AdvancementChecklist`'s "all state passed in" contract. It:
- Renders a `Card` + `SectionHeader` (icon e.g. `TrendingUp`/`Target` from `lucide-react`) titled "Plan: Next Career Level".
- Shows three requirement rows (Characteristics / Skills / Talent), each with a `TooltipTriggerCell` showing the **subtotal XP** and a `Tooltip` breakdown listing each step (`CHAR_FULL_NAMES[k]`/skill/talent → `from → to` advances, in/out-career, step cost) ending in `… = subtotal`.
- Shows a **grand-total** `TooltipTriggerCell` with a breakdown tooltip: `Characteristics A + Skills B + Talent C + Advance-level D = Grand total`.
- Shows the **affordability summary** (`role="status"`): "You can afford it (have `xpCur`, need `grandTotal`)" or "Need `shortfall` more XP".
- Shows the **ordered cheapest path** list. **Per-step `cost` is a single `getAdvancementCost` lookup, not a sum, so it needs no tooltip** (settled per Finding 6). **Any cumulative / running total** — a running sum shown alongside the path, and `BudgetProjection.spent` — **is a calculated total and gets a `TooltipTriggerCell` breakdown** (`step₁ + step₂ + … = spent`), per the `calculated-total-tooltips` steering rule.
- Renders the optional **budget input** and, when set, the `BudgetProjection` (covered steps + first unaffordable). `spent` carries a breakdown tooltip as above; the per-step costs in the covered list do not.
- Reuses the gold=in-career / grey=out-of-career styling classes already in `AdvancementPage.module.css` conventions (new module mirrors them).
- A `HelpPopover` (concept e.g. `advancement-planner` or reuse `career-advancement`) explaining the planner is a read-only projection.

### 7.3 Integration point — `src/components/pages/AdvancementPage.tsx`

- Compute `const plan = useMemo(() => planNextCareerLevel(character), [character])`.
- Render `<AdvancementPlanner plan={plan} career={character.career} careerLevel={character.careerLevel} ... />` **immediately below** the existing `AdvancementChecklist` (so "what's left" is followed by "what it costs"). Gate on `scheme && careerLevelNum > 0 && !isMaxLevel`, matching the checklist gating.
- Budget input value lives in local `useState` in `AdvancementPage` (or inside `AdvancementPlanner`); it is **never** persisted to the character. **Recommendation: keep budget state inside `AdvancementPlanner`** to keep `AdvancementPage` lean and because nothing else needs it.
- No changes to any handler that spends XP. The planner is purely additive JSX + one memo.

### Decision: new panel vs. expanding the checklist
**Chosen: a new sibling `AdvancementPlanner` panel directly under the existing checklist**, consuming the same computed inputs — *not* folding costs into `AdvancementChecklist`. Reasoning: `AdvancementChecklist` is a stable, tested, presentation-only component whose contract is "met/unmet state." Costs are a distinct concern (pricing, ordering, budget, path). A sibling keeps each component single-purpose and avoids widening the checklist's prop surface and tests, while still *augmenting* (not duplicating) because the planner derives from the same `planNextCareerLevel`/page values rather than re-implementing completion. This satisfies FR-5 "least-duplicative" better than cramming pricing into the checklist's met/unmet rows.

---

## 8. Design decisions settled

1. **New panel, not checklist expansion** — see §7.3 decision. Least-duplicative while keeping components single-purpose.
2. **Cheapest path** — fully specified in §6. Deterministic for chars (no choice), greedy-optimal for skills over **distinct physical rows** (not patterns), where a single row can discharge several overlapping career patterns at once and is never priced twice, cheapest-of-current-level for talent. All costs from `getAdvancementCost`; thresholds from the shared constant.
3. **Threshold = advances only** — matches the app's existing checklist/`isCareerLevelComplete` exactly (resolves OQ-1).
4. **Include the optional XP-budget input (FR-4)** — recommended and included. Low implementation cost, directly answers a common player question, and is trivially read-only.
5. **Advance-level fee shown separately** — the 100/200 XP level-change fee is included in `grandTotal` but itemised, so "cost to complete requirements" and "cost to actually reach next level" are both honest (Core p.48).
6. **Reuse `getAdvancementCost` only** — no cost numbers in the planner module or component.
7. **Single source for thresholds and the level-change fee** — export the existing `CAREER_COMPLETION_THRESHOLDS` and a new `ADVANCE_LEVEL_FEE = { ready: 100, notReady: 200 }` from `advancement.ts`; the planner and `AdvancementPage` both import them. No `{1:5,…}` or `100/200` literal is duplicated in the planner (Findings 3 & 7).
8. **Skill planning is row-based, `skills.met` is the checklist predicate** — plan over distinct character rows, target the highest-`.a` matching row per pattern, dedup so one row satisfies many patterns once; `skills.met` equals `AdvancementPage.skillsMet` by construction, independent of auto-selectability (Findings 1, 2, 5).
9. **Budget floored to a non-negative integer** before projection; non-finite/≤0 hides the projection (Finding 8).
10. **Tooltips: raw per-step costs are exempt, cumulative/running totals are not** — `spent` and any running path total get a breakdown tooltip (Finding 6).

---

## 9. Error handling & validation

Each operation that can fail, and its concrete behaviour:

- **No career / unknown career (`getCareerScheme` returns undefined):** `planNextCareerLevel` returns `{ applicable: false, ... }` with zeroed totals and empty requirement plans. Component renders the neutral "nothing to plan" state. Not logged (normal state, not an error).
- **Max level (`careerLevelNum >= allLevels.length`):** same `applicable: false` result. Component shows a max-level note. Not logged.
- **Career skill with no matching character row:** treated as `current advances = 0`; priced from 0. Recoverable/expected — no error.
- **Wildcard-only career skill (`(Any)` / `(Any X)`):** cannot be auto-selected (no specialisation known). Excluded from the cheapest-skill candidate set and surfaced in `skills.advisories` as "`<skill>` needs a chosen specialisation before it can be planned/advanced." Not fatal; the planner still plans using concrete rows. (Mirrors `ensureCareerSkillsExist` skipping wildcards — see OQ-2.) **`skills.met` is computed independently of auto-selectability (settled per Finding 5):** it is exactly the checklist predicate `skillsWithAdvances.length >= min(8, careerSkills.length)` on the current character, so it always equals the page's `skillsMet`. When concrete candidate rows cannot reach `remainingNeeded` (the gap can only be closed by a wildcard specialisation choice), `skills.met` stays whatever that predicate reports, the planned skill subtotal is **capped to the concrete rows selected** (never padding in invented wildcard cost), and the shortfall shows as an advisory. A §10 test asserts `plan.skills.met === page.skillsMet`.
- **Budget input validation (FR-4, settled per Finding 8):** the raw input is parsed and normalised as `budget = Math.floor(Math.max(0, Number(raw)))`. Non-finite (`NaN`/`Infinity`), empty, or `<= 0` → treated as "no budget" (projection hidden); no throw. The flooring makes XP integral, so a decimal entry like `3.5` becomes `3` (XP is always integer in this app) rather than producing a confusing "spent 40 of 40.5". A budget larger than `grandTotal` → all steps covered, `firstUnaffordable = null`. No persistence, so no save-path failure is possible. `projectBudget` receives the already-floored integer.
- **Threshold lookup miss (`completionThreshold` undefined for an unexpected level number):** fall back to `5` exactly as `AdvancementPage` does (`?? 5`), keeping parity. Flagged via OQ-5 for review but not a runtime error.
- **Empty career-skill list (`careerSkills.length === 0`):** `need = min(8,0) = 0`; skills requirement is trivially met with subtotal 0.

Invariants and ownership:
- **"Planner never mutates"** is owned by the **module boundary**: `advancement-planner.ts` imports nothing that mutates and returns only new plain objects; it never receives `update`/`updateCharacter`. Enforced by a test (§10, read-only test) and by not passing mutators into the component's planner path.
- **"Costs equal real costs"** is owned by **`getAdvancementCost`** as the single pricing authority; the planner must not compute any cost arithmetic itself beyond summing `getAdvancementCost` results.

---

## 10. Test plan

New test files (additive; existing tests untouched):

`src/logic/__tests__/advancement-planner.test.ts` (Vitest unit):
- **Characteristic cost-to-threshold** equals the manual sum of `getAdvancementCost('characteristic', a, true)` over the range, for a Soldier-like fixture (reuse the `makeTestCharacter` pattern from `advancement.test.ts`).
- **Skill selection picks the cheapest `remainingNeeded` rows** and counts already-at-threshold patterns at zero cost; verify the chosen rows (by `skillIndex`/name) and subtotal.
- **Overlapping specific+(Any) career (Finding 1):** a fixture whose career lists both a specific pattern (e.g. `Melee (Basic)`) and a wildcard (`Melee (Any)`) matched by one physical row. Assert the planner selects that row **once**, its `satisfiesPatterns` discharges both patterns, and the skill subtotal equals that one row's cost-to-threshold (never double-priced), so `skills.subtotal` is realisable by the real single-row advance button.
- **Highest-`.a` row targeted + per-step sum (Finding 2):** a pattern matched by two rows with different `.a`; assert the planner targets the higher-`.a` row (tie-break lowest index), that the emitted `PlannerStep`s all carry that row's `skillIndex`/name, and that `Σ step.cost === skills.subtotal`.
- **`skills.met` equals the page predicate (Finding 5):** for fixtures including a wildcard-only unmet pattern, assert `plan.skills.met === (skillsWithAdvances.length >= min(8, careerSkills.length))` computed the same way as `AdvancementPage`, and that when concrete rows cannot close the gap the subtotal is capped to concrete rows with a wildcard advisory present.
- **Talent** adds exactly one 100-XP in-career talent when `talentsMet` is false, zero when already met.
- **`grandTotal` = chars + skills + talent + advanceLevelCost**, and `advanceLevelCost === (characteristics.met && skills.met && talent.met) ? ADVANCE_LEVEL_FEE.ready : ADVANCE_LEVEL_FEE.notReady` (Finding 4). Also assert the planner's three `met` flags equal the page's `charsMet`/`skillsMet`/`talentsMet` for the same fixture.
- **`canAfford`/`shortfall`** correct around the boundary `xpCur == grandTotal`.
- **`applicable:false`** for no-career and max-level fixtures.
- **Agreement with the checklist:** when `isCareerLevelComplete(character, career, level)` is true, `plan.requirementsTotal === 0` and all `met` flags true (ties the planner to the existing completion predicate).
- **`projectBudget`** returns the correct covered prefix and first-unaffordable step for several budgets (0, between two steps, ≥ grandTotal).

`src/logic/__tests__/advancement-planner.property.test.ts` (fast-check, `import fc from 'fast-check'`):
- **P1 Non-negative & finite:** for arbitrary characters (arbitrary advance counts 0..threshold, arbitrary `xpCur`), every subtotal and `grandTotal` are finite and `>= 0`.
- **P2 Monotone budget:** `projectBudget(plan, b).spent` is non-decreasing in `b`, and `spent <= min(b, grandTotal)`.
- **P3 Cheapest-first ordering + row integrity:** `orderedPath` costs are non-decreasing (stable), its summed cost equals `requirementsTotal`, and every skill step references a single physical row — each selected skill row contributes a contiguous `fromAdvances … threshold-1` run of steps all sharing the same `skillIndex`/name, and no physical row appears under two different patterns' selections (Findings 1 & 2). Per-step costs for each selected row sum to that row's subtotal contribution.
- **P4 Cost parity (NFR-1):** for a random `(type, currentAdvances, inCareer)`, the planner's per-step `cost` equals `getAdvancementCost(type, currentAdvances, inCareer)` — i.e. the planner never diverges from the authority.
- **P5 Skill-selection optimality (row-based):** for random row cost sets — **including rows that satisfy multiple overlapping patterns** — the selected rows' total ≤ any other row set that covers `remainingNeeded` patterns (brute-force check on small sets). This validates the corrected row-based formulation where a single row may discharge several patterns.

`src/components/pages/__tests__/AdvancementPlanner.test.tsx` (component, React Testing Library — match existing component-test setup):
- Renders requirement subtotals and grand total; each total has an associated tooltip trigger (`role="button"` with the breakdown `aria-label`), and opening it shows the additive `A + B + … = Total` breakdown.
- Affordability summary text flips between "can afford" and "need N more XP" per prop.
- Max-level / no-career → neutral state, no cost figures.
- Budget input: entering a number renders the `BudgetProjection`; clearing it hides the projection.

`src/components/pages/__tests__/AdvancementPage.readonly.test.tsx` (read-only guarantee, FR-6):
- Render `AdvancementPage` with a spy `updateCharacter`/`update`. Open the planner, interact with its tooltips and budget input. **Assert `updateCharacter` and `update` are never called**, and a deep-equal snapshot of the `character` prop is unchanged (no XP/advance/log mutation).

Verification commands (must all end clean):
```
npx tsc --build --force --noEmit
npm run build
vitest --run
npx eslint .
```

---

## 11. Out of scope / non-goals

- **Committing advances.** The planner never advances, spends, or auto-buys. All commits stay on the existing buttons/flows.
- **Career switching / cross-career planning.** Target is the next level of the *current* career (plus optional budget). Switching careers, skipping levels, and eligibility are out of scope (handled elsewhere).
- **Spells / rituals / runes / sword-dancing / deity learning costs.** The next-level completion requirements are chars/skills/talent only (Core p.48); magical learning is not part of level completion and is excluded from the plan.
- **Persisting planner state.** Budget and open/closed state are ephemeral UI state; nothing is written to `Character`.
- **Changing existing cost/threshold logic.** Purely additive; `getAdvancementCost`, `isCareerLevelComplete`, and the checklist are unchanged (except the additive export of `CAREER_COMPLETION_THRESHOLDS`).

---

## 12. Open questions / rulebook ambiguities (for reviewer)

- **OQ-1 (resolved, confirm):** "Threshold" is counted as **advances only** (`.a`), matching the app's existing checklist and `isCareerLevelComplete`. Confirm we want planner↔checklist agreement (yes) rather than initial+advances (the rulebook phrase "number of Advances … in all your Career level's Characteristics" supports advances-only, so the app is RAW-correct).
- **OQ-2:** Wildcard career skills (`(Any)` / `(Any X)`) cannot be auto-planned without a specialisation choice. Current plan: **exclude + advisory**. Alternative: let the player pick a specialisation in the planner UI. Recommend exclude+advisory for v1 (read-only, no character choice stored). Confirm.
- **OQ-3:** For the talent requirement, the planner suggests the cheapest *unowned current-level* talent (all are 100 XP) but the real choice is the player's. Confirm it's acceptable to show a representative 100 XP line labelled "any current-level career talent" rather than naming one.
- **OQ-4:** Should `grandTotal` include the **100/200 XP Advance-Career-Level fee** by default, or show it as an optional add-on? Current plan: **include but itemise**. Confirm.
- **OQ-5:** The app uses **L5 → 25 advances** in `CAREER_COMPLETION_THRESHOLDS`, extending the Core p.48 table (which lists only L1–L4) for 5-level careers (High Elf elite careers). This is a pre-existing app convention, not an invented planner mechanic, but flag it: is 25 the agreed L5 threshold? (Planner simply reuses the existing constant, so it stays consistent with the rest of the app either way.)
- **OQ-6:** "8 skills" uses `min(8, careerSkills.length)` (existing app behaviour) for careers listing fewer than 8 skills. Confirm this matches intended play (it matches the current checklist).

---

## 13. Review / verification note

This revision pass resolved the design review in `.agents/tasks/design-review.json`
(reviewDoc `design-review.md`) for **this** feature: verdict CHANGES_REQUESTED, 2
MEDIUM + 6 NIT findings. Every finding is addressed in the sections above and
summarised in §14. The two MEDIUM items reshaped the skill-planning algorithm from
per-pattern to per-row (§6); the NITs tightened constant sourcing (§6/§7.1),
the `advanceLevelCost`/`skills.met` definitions (§6/§9), budget flooring (§9), and
tooltip scope (§7.2). No read-only/cost-authority contract changed.

Verified directly against source (not assumed):

- **Cost authority (NFR-1 / rules-compliance).** `getAdvancementCost(type, currentAdvances, inCareer)` is exported from `src/logic/advancement.ts` and is the only pricing source; `CHAR_COST_TABLE`/`SKILL_COST_TABLE` remain private with their Core pp.44–45 comment, and talents price as `100 × (currentAdvances + 1)`, doubled out-of-career. The planner invents no numbers. `calculateTierBoundaryCost` confirms the canonical "sum `getAdvancementCost` over each step" pattern the planner reuses.
- **Threshold / eligibility parity.** `AdvancementPage` computes `completionThreshold = ({1:5,2:10,3:15,4:20,5:25})[careerLevelNum] ?? 5` and measures against **advances only** (`character.chars[k].a`, `skill.a`), with `skillsMet = skillsWithAdvances.length >= Math.min(8, careerSkills.length)` and `talentsMet` via `getCurrentLevelTalents`. `isCareerLevelComplete` uses the identical `.a >= threshold` definition and the same private `CAREER_COMPLETION_THRESHOLDS = {1:5,2:10,3:15,4:20,5:25}` (to be exported, §7.1). The planner's `skills.met` is this same `skillsWithAdvances.length >= min(8, careerSkills.length)` predicate, so it equals the page's `skillsMet` by construction; its skill *cost/plan* is computed over distinct physical rows so no row is priced twice (§6, Findings 1 & 2). The `advanceLevelCost = readyToProgress ? 100 : 200` fee in `AdvancementPage`/`handleAdvanceLevel` is to be extracted into the exported `ADVANCE_LEVEL_FEE` constant (§7.1) and driven off the three `met` flags.
- **Augment-not-duplicate.** `AdvancementChecklist` is pure presentation fed entirely by props computed in `AdvancementPage`; the sibling-panel decision (§7.3) consumes the same computed values rather than re-deriving completion.
- **Tooltip contract.** `Tooltip` requires `{ anchorEl, title, children, onClose, id }` (click/anchor-controlled portal); `TooltipTriggerCell` renders the value with `role="button"`, is keyboard-focusable (`tabIndex=0`, Enter/Space) and hover/tap-capable, and drives `onOpen(anchorEl)`/`onClose` while the parent owns open state — matching §7.2, NFR-5, and the §10 component-test assertions.
- **Read-only guarantee (FR-6).** Type fields `xpCur`/`xpSpent`/`xpTotal`, `advancementLog`, `advancementLogArchive`, and optional `eventLog` all exist in `src/types/character.ts`, so the "no mutation / no XP spend / no log append" assertion in §10 is implementable as written.

All open rulebook ambiguities remain explicitly flagged in §12 (OQ-1…OQ-6); none were silently resolved. In particular, the two MEDIUM findings were algorithm/specification defects, not rulebook ambiguities, so resolving them did not close any OQ.

---

## 14. Responses to review findings (`design-review.json`)

- **Finding 1 — MEDIUM — Double-counting one row against two patterns — ADDRESSED.** §6 now plans over **distinct character rows**, not career-skill patterns. Each row records `satisfiesPatterns`; the greedy selection covers patterns via rows, deduplicates by physical `(isBasic, skillIndex)` / synthesised concrete name, and never selects a row twice. `remainingNeeded` decrements by the count of newly-covered patterns per selected row. New §10 unit test uses an overlapping specific+`(Any)` career; P3/P5 updated.
- **Finding 2 — MEDIUM — "Highest `.a`" proxy ambiguity — ADDRESSED.** §6 states: for a pattern matched by ≥1 row, target the single highest-`.a` row (tie-break lowest index), record `fromAdvances = that row's .a`, and use that **same** row for both the subtotal and every emitted `PlannerStep`, so per-step costs sum to the subtotal. `PlannerStep` now carries `isBasic`/`skillIndex` to identify the concrete row for the real flow (§7.1). Added to the P3 invariant and a dedicated §10 test.
- **Finding 3 — NIT — Fee should not be a bare literal — ADDRESSED.** §6/§7.1 now export a shared `ADVANCE_LEVEL_FEE = { ready: 100, notReady: 200 }` (`// Core p.48`) from `advancement.ts`, imported by both the planner and `AdvancementPage` (replacing its inline literals). §8 item 7 records the decision.
- **Finding 4 — NIT — `readyToProgress` basis stated two ways — ADDRESSED.** §6 and §7.1 now state a single definition: `advanceLevelCost = (characteristics.met && skills.met && talent.met) ? ADVANCE_LEVEL_FEE.ready : ADVANCE_LEVEL_FEE.notReady`, explicitly **not** `requirementsTotal === 0`, and that the three flags equal the page's `charsMet`/`skillsMet`/`talentsMet`. §10 asserts the equality.
- **Finding 5 — NIT — Wildcard exclusion could desync `skills.met` — ADDRESSED.** §6/§9 define `skills.met` as exactly the checklist predicate on the current character, independent of auto-selectability; when concrete rows can't close the gap, `skills.met` follows the predicate, subtotal is capped to concrete rows, and a wildcard advisory is surfaced. §10 asserts `plan.skills.met === page.skillsMet`.
- **Finding 6 — NIT — Cumulative totals need tooltips — ADDRESSED.** §7.2 states per-step `cost` is a raw lookup (no tooltip) but any cumulative/running total, including `BudgetProjection.spent`, gets a `TooltipTriggerCell` breakdown. §8 item 10 records it.
- **Finding 7 — NIT — "exported-or-duplicated" wording — ADDRESSED.** §7.1 now flatly commits to exporting the existing `CAREER_COMPLETION_THRESHOLDS` and importing it; the "or-duplicated" phrasing is removed, with an optional (non-required) page refactor noted.
- **Finding 8 — NIT — Budget decimal parsing — ADDRESSED.** §9 now floors the budget: `Math.floor(Math.max(0, Number(raw)))`; non-finite/≤0 hides the projection. §8 item 9 records it.
