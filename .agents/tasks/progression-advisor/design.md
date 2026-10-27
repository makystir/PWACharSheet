# Progression Advisor — Technical Design

## Overview

The Progression Advisor adds a **read-only, goal-driven** surface to the Advancement page. Where the existing `AdvancementPlanner` answers "what does the *next level of my current career* cost," the advisor answers "I want to reach **this goal** — what is the ordered, costed path to get there, can I afford it, and roughly how many sessions will it take?" The player picks the goal; the advisor never picks it, never mutates the character, never spends XP, and never advances or switches a career. Every XP number it shows is produced by the *existing* logic (`planNextCareerLevel`, `getAdvancementCost`, `ADVANCE_LEVEL_FEE`, `CAREER_COMPLETION_THRESHOLDS`, a shared switch-fee helper, `getEligibleCareers`/`isCareerEligible`), so the advisor's numbers equal exactly what the real advance/switch controls charge. It invents no mechanics and hardcodes no costs.

The design has three parts:

1. **A pure, React-free, deterministic engine** — a new module `src/logic/progression-advisor.ts` exposing `planProgression(character, goal): ProgressionPlan` behind a `ProgressionAdvisorSource` interface. It composes the existing cost functions and returns new plain, JSON-serializable objects. This mirrors the character-assistant's `SuggestionSource` future-proofing so a later async/LLM-backed advisor is a non-breaking addition and the deterministic engine remains the permanent offline default.
2. **A tiny shared refactor in `src/logic/advancement.ts`** — lift the inline switch-fee math (currently in `AdvancementPage.handleSwitchCareer`) into a named, Core-cited helper + constant that both the real Switch Career flow and the advisor call, so their numbers can never drift.
3. **A read-only UI panel** `src/components/pages/ProgressionAdvisor.tsx`, a sibling `Card` on the Advancement page next to `AdvancementPlanner`, styled identically (collapsible via `storageKey`, far-right collapse chevron, breakdown tooltips via `Tooltip` + `TooltipTriggerCell`).

### Technology stack (locked once approved)

- TypeScript + React (function components + hooks), matching the codebase.
- Pure logic in `src/logic/`, no React imports, matching `advancement-planner.ts`.
- CSS Modules (`ProgressionAdvisor.module.css`), matching `AdvancementPlanner.module.css`.
- Shared UI primitives: `Card`, `SectionHeader` (with its `collapsible`/`collapsed`/`onToggleCollapse` props), `Tooltip`, `TooltipTriggerCell`, `HelpPopover`, `lucide-react` icons.
- Vitest + `fast-check` for engine property tests; `@testing-library/react` for component tests — matching `advancement-planner.test.ts` / `advancement-planner.property.test.ts`.
- No new runtime dependencies. No network/backend/AI/telemetry. Fully offline, local-only.

---

## Rulebook grounding and resolved ambiguities

All mechanics are verified against the rulebooks in `docs/` before being relied on. The relevant confirmations:

- **Advancement cost tables** — Core pp.44–45, implemented by `getAdvancementCost` (`CHAR_COST_TABLE`/`SKILL_COST_TABLE`, talent = `100 × (times+1)`). Reused; not re-derived.
- **Out-of-career doubling** — Core p.46; `getAdvancementCost(type, adv, false)` doubles. Reused.
- **Completion thresholds** — Core p.48 (`{1:5,2:10,3:15,4:20}`); L5=25 is a pre-existing app convention carried by `CAREER_COMPLETION_THRESHOLDS`. The advisor reuses the constant and carries the same caveat.
- **Advance-level fee** — Core p.48: 100 XP to change career level when complete, 200 XP if not (`ADVANCE_LEVEL_FEE`). Reused.
- **Talent-at-level rule** — Core p.47 ("Talents are only available when you are in the level of the Career that lists them"), via `getCurrentLevelTalents`. Reused.
- **Species career eligibility** — Core + species supplements in `docs/`, encoded in `career-eligibility.ts`. The advisor consumes `getEligibleCareers`/`isCareerEligible`; it does not re-derive eligibility.

**OQ-3 RESOLVED (different-class surcharge, Core p.48).** Verified in `docs/WarhammerFantasyRoleplay4e.md` §9 *Changing to a New Career*: *"If you have completed your current Career level, you can enter the first level of any Career from your Class for 100 XP, or for 200 XP if you have not completed your current Career level. If you want to enter the first level of a Career from a different Class, this cost an extra 100 XP."* The p.48 cost table lists **"Enter a different Class … +100 XP"**. The repo memory note also confirms same-class career changes cost only the base fee (Scout↔Hunter = 100, both Peasants). The inline `+ 100` literal in `handleSwitchCareer` is therefore **rulebook-correct**. This design lifts it into a named, cited constant `CAREER_CHANGE_DIFFERENT_CLASS_SURCHARGE = 100 // Core p.48` — a behaviour-preserving refactor, not a mechanic change. **No open ambiguity remains here.**

**OQ-1 RESOLVED (multi-hop scope).** v1 supports **single-career multi-level climbs** (current career L_n → L_target, chaining complete→advance-fee→build per intervening level) **and a single career switch** (to the first level of a different eligible career). It does **not** support multi-switch chains (switch → build → switch again). Reason: choosing intermediate careers is subjective (FR-3.2) and the search space explodes combinatorially. This is a **documented limitation**, surfaced in the UI as an advisory when a goal would require more than one switch (see §Goal model / Unreachable). This matches how `planNextCareerLevel` already scopes itself to one level transition.

**OQ-2 RESOLVED (reachability definition).** "Reachable" is determined by **species eligibility only** (`isCareerEligible(targetCareer, character.species)`), matching the membership of the real Switch Career picker. The different-class surcharge is a **cost/advisory**, never a reachability blocker (it is shown and folded into the grand total, with its own tooltip breakdown). An eligible-but-pricey target is "reachable."

**OQ-4 RESOLVED (fee double-count on switch).** The real `handleSwitchCareer` charges the switch fee **once** and does not charge the current level's advance-level fee. The advisor mirrors this: for a switch goal it takes only the **requirement steps** from `planNextCareerLevel` (`characteristics.steps`, `skills.steps`, `talent.steps`) — never `advanceLevelCost` — and applies the switch fee as the single level-change charge. The advance-level fee is thus counted exactly once (as the switch fee).

**OQ-5 RESOLVED (carryover of existing advances).** Characteristic/skill advances carry over between careers (Core p.46/p.48). The advisor prices each target-career requirement from the character's **current** advance count up to the target threshold via `getAdvancementCost`, exactly as the planner does for the current level — so already-met requirements cost 0. The build-target phase prices only the target career level's **own** requirements, which are in-career for the target *by definition*, so every target characteristic/skill requirement step prices in-career (not doubled). (There is deliberately **no** out-of-career branch in the build-target phase: the advisor never prices speculative advances outside the target level's list. Out-of-career pricing — Core p.46 — remains available in `getAdvancementCost` and is only exercised by other flows, not by the advisor's build-target phase.)

**OQ-6 RESOLVED (XP-timeline model).** The timeline is a **user-entered XP-per-session rate** with a sensible default of **`10`** (editable; `0`/blank hides the estimate). The estimate is over the **shortfall** (XP still needed), i.e. `sessions = ceil(shortfall / rate)` when `rate > 0 && shortfall > 0`, else `0` (`null` surfaced to the UI). It is a pure function of `(shortfall, rate)` with no ambient time, satisfying AC9. Rationale: shortfall answers the player's real question ("how long until I can afford what I'm short"); deriving a rate from `xpLog` is deferred (it couples the estimate to award history and is non-obvious). The estimate is labelled clearly as an approximation.

**The `10` default is a UI convenience, NOT a rulebook value (Finding 6).** WFRP XP awards are GM-discretionary with no fixed per-session formula (Core p.36). The constant carries a mandatory code comment: `// UI default only — not a rulebook value; XP awards are GM-discretionary (Core p.36).` This default lives in the UI component (where defaults for optional inputs belong), is passed explicitly into the pure engine, and is never treated by the engine as a mechanic.

**OQ-7 RESOLVED (UI placement).** The advisor is a **sibling `Card` on the Advancement page**, rendered immediately after `<AdvancementPlanner>` in `AdvancementPage`. Rationale: it is goal/career-centric, so it belongs where career data and the real advance/switch controls already live; this is the lowest-risk, most discoverable spot and reuses the planner's exact collapsible pattern with no new paradigm. Surfacing it inside the Character Assistant panel is left as a later, non-breaking addition (the engine's clean boundary makes that trivial). This is the **least-duplicative** option because it reuses the planner's styling/tooltip/collapse conventions wholesale and consumes `planNextCareerLevel` rather than re-implementing level costing; folding it *into* the planner panel would overload a component with a single, well-scoped responsibility.

**OQ-8 RESOLVED (goal model).** See §Goal model below.

**OQ-9 RESOLVED (wildcard/specialisation requirements).** Target-career requirements may include wildcard skills (`(Any)`/`(Any …)`) that cannot be auto-costed without a specialisation choice. These surface as **advisories** reusing the planner's existing advisory mechanism (`RequirementPlan.advisories`), are **excluded** from the "reachable → exactly-to-threshold" guarantee (AC7), and are assigned **no invented cost** — mirroring `ensureCareerSkillsExist`/`planNextCareerLevel` skipping wildcards. A goal that depends solely on unresolvable wildcards is still "reachable" (eligible) but carries an advisory that a specialisation must be chosen first.

---

## Module layout and files

### New files

```
src/logic/progression-advisor.ts            // pure engine: planProgression + types + source
src/logic/__tests__/progression-advisor.test.ts
src/logic/__tests__/progression-advisor.property.test.ts
src/components/pages/ProgressionAdvisor.tsx
src/components/pages/ProgressionAdvisor.module.css
src/components/pages/__tests__/ProgressionAdvisor.test.tsx
```

### Changed files

- **`src/logic/advancement.ts`** — add the cited constant + shared helper:
  ```ts
  // Core p.48 ("Changing to a New Career"): entering the first level of a Career
  // from a DIFFERENT Class costs an extra 100 XP on top of the advance-level fee.
  export const CAREER_CHANGE_DIFFERENT_CLASS_SURCHARGE = 100; // Core p.48

  /**
   * Total XP to change to the first level of `targetClass` (Core p.48).
   * = advance-level fee (100 ready / 200 not) + different-class surcharge (100).
   * Single source of truth for AdvancementPage.handleSwitchCareer AND the advisor
   * so the two can never drift (FR-4.4 / FR-7).
   */
  export function getCareerSwitchCost(ready: boolean, currentClass: string, targetClass: string): number {
    const base = ready ? ADVANCE_LEVEL_FEE.ready : ADVANCE_LEVEL_FEE.notReady;
    const sameClass = targetClass === currentClass;
    return base + (sameClass ? 0 : CAREER_CHANGE_DIFFERENT_CLASS_SURCHARGE);
  }
  ```
- **`src/components/pages/AdvancementPage.tsx`** — two behaviour-preserving edits:
  1. `handleSwitchCareer` replaces its inline `switchCost` expression with `const switchCost = getCareerSwitchCost(readyToProgress, character.class, newScheme.class);` (identical value; `readyToProgress = isReadyToAdvance(character)` is already in scope).
  2. Render `<ProgressionAdvisor character={character} storageKey="wfrp-collapse-progression-advisor" />` immediately after the existing `<AdvancementPlanner …>` block, gated by the same `scheme && careerLevelNum > 0` condition the planner uses (so it only shows once a career is chosen). It is **not** gated on `!isMaxLevel` (a max-level character can still target a switch).

No other source files change. Existing tests stay green unchanged (NFR-3).

---

## The goal model (OQ-8)

The pure module accepts a plain, serializable `goal` descriptor (keeps the boundary LLM-ready, FR-4.2):

```ts
export type ProgressionGoal =
  | { kind: 'none' }                                          // no goal chosen → neutral prompt
  | { kind: 'nextLevel' }                                     // next level of current career
  | { kind: 'careerLevel'; career: string; level: number }   // a specific level of a chosen/current career
  | { kind: 'career'; career: string };                      // first level of a different eligible career

/** Optional projection inputs, both serializable. */
export interface ProgressionOptions {
  budget?: number;        // free-form saved-XP projection (FR-1.3), reuses projectBudget semantics
  xpPerSession?: number;  // timeline rate (OQ-6); default applied in the UI, passed explicitly to keep the engine pure
}
```

- `{ kind: 'nextLevel' }` and `{ kind: 'careerLevel', career: currentCareer, level: currentLevel+1 }` are equivalent; both reduce to reusing `planNextCareerLevel` unchanged (FR-2.1, AC3).
- `{ kind: 'career', career }` is the single-switch case (FR-2.2).
- `{ kind: 'careerLevel', career: currentCareer, level }` with `level > currentLevel+1` is the single-career multi-level climb (FR-2.3).
- `{ kind: 'careerLevel', career: otherCareer, level > 1 }` requires a switch *and then* a multi-level climb inside a not-yet-entered career → this is **multi-hop beyond v1 scope** (OQ-1). The engine does **not** pretend this goal is reached: it plans the switch-to-L1 portion, but reports `reachable: true` with **`goalFullyPlanned: false`** and an advisory (`"v1 plans the switch to {career} level 1 only; climbing further inside a not-yet-entered career isn't supported yet."`). This keeps the pure-module contract honest for any consumer (including a future LLM source) — `reachable` means "eligible / a path was produced," and `goalFullyPlanned` means "the returned path actually reaches the stated goal" (Finding 2). The UI defaults a chosen foreign career's target level to **1** (FR-1.2), so in practice this edge is reached only if the player explicitly raises the level; when it is, the panel surfaces the advisory rather than silently implying the climb is costed.

For every goal the engine *can* fully plan (`none`, `nextLevel`, same-career `careerLevel` up to max, and `career` single-switch to L1), `goalFullyPlanned` is **true**. For an unreachable goal (`reachable:false`) `goalFullyPlanned` is also **false**. AC7's "exactly-to-threshold" guarantee is scoped to the levels the plan actually covers (i.e. where `goalFullyPlanned` is true for that phase's level), never to a level the plan stops short of.

**Reachability** (`reachable: boolean` + `reason` on the result):

- Current career or current-career level target → reachable iff `planNextCareerLevel(character).applicable` (handles max-level/unknown-career with the planner's neutral message).
- Foreign career target → reachable iff `isCareerEligible(career, character.species)`. If not, `reachable=false`, `reason = "{career} is not available to {species}"`, and **no cost path** is emitted (AC8), citing the species-restriction source.

The UI's **target-career list** is `getEligibleCareers(character.species)` minus `character.career`, grouped by class (via `getCareersByClass` over `CAREER_CLASS_LIST`) — identical membership to the existing Switch Career picker (AC2).

---

## The pure engine (`src/logic/progression-advisor.ts`)

### Output types

```ts
import type { PlannerStep } from './advancement-planner';

/** A named, cited fee step (switch fee / advance-level fee). Distinct from the
 *  per-advance PlannerStep so the UI can render its cited breakdown (FR-9.2). */
export interface FeeStep {
  kind: 'switchFee' | 'advanceLevelFee';
  label: string;                 // e.g. "Change career (different class)"
  cost: number;                  // from getCareerSwitchCost / ADVANCE_LEVEL_FEE
  /** Cited additive components for the tooltip, e.g.
   *  [{ label:'Advance-level fee (ready)', value:100, cite:'Core p.48' },
   *   { label:'Different-class surcharge', value:100, cite:'Core p.48' }] */
  components: { label: string; value: number; cite: string }[];
}

/** One ordered phase of the recommended path. */
export interface ProgressionPhase {
  id: 'complete-current' | 'switch' | 'build-target' | 'advance-level';
  title: string;                 // human-readable phase heading
  steps: PlannerStep[];          // per-advance steps (reused PlannerStep shape)
  fee?: FeeStep;                 // optional named fee for this phase
  subtotal: number;              // Σ steps[].cost + (fee?.cost ?? 0)
  advisories: string[];          // wildcard/specialisation notes, etc. (OQ-9)
}

export interface ProgressionPlan {
  goal: ProgressionGoal;
  /** eligible / a path was produced (species eligibility; OQ-2). */
  reachable: boolean;
  /** the returned path actually REACHES the stated goal. False for an
   *  unreachable goal AND for the in-scope-but-partial foreign-career level>1
   *  case (switch planned to L1 only; Finding 2 / OQ-1). True otherwise. */
  goalFullyPlanned: boolean;
  /** present when !reachable, or as an informational note (e.g. multi-hop limit) */
  reason?: string;
  phases: ProgressionPhase[];
  /** Σ phase subtotals; the single grand total to reach the goal */
  grandTotal: number;
  /** the full cheapest-first/phase-ordered per-step+fee list for display */
  orderedPath: (PlannerStep | FeeStep)[];
  xpCur: number;
  canAfford: boolean;            // xpCur >= grandTotal
  shortfall: number;             // max(0, grandTotal - xpCur)
  /** timeline (OQ-6); null when rate <= 0 or shortfall === 0 */
  sessionsToGoal: number | null;
  xpPerSession: number;          // echoed input (0 when unset)
  /** budget projection over orderedPath's PlannerStep+FeeStep costs, when budget > 0 */
  budget: ProgressionBudget | null;
  /** top-level advisories (eligibility notes, multi-hop limit, etc.) */
  advisories: string[];
}

export interface ProgressionBudget {
  budget: number;
  affordableCount: number;       // prefix of orderedPath covered
  spent: number;                 // Σ covered costs (calculated total → tooltip)
  firstUnaffordableLabel: string | null;
}
```

### Exported functions

```ts
/** Pure, deterministic, side-effect-free. Returns new plain objects; mutates nothing. */
export function planProgression(
  character: Character,
  goal: ProgressionGoal,
  options?: ProgressionOptions,
): ProgressionPlan;

/** Future-proofing boundary (mirrors character-assistant's SuggestionSource).
 *  Return type is sync-or-async so an LLM-backed source is a non-breaking add;
 *  the deterministic default is ALWAYS synchronous and the permanent offline fallback. */
export interface ProgressionAdvisorSource {
  plan(
    character: Character,
    goal: ProgressionGoal,
    options?: ProgressionOptions,
  ): ProgressionPlan | Promise<ProgressionPlan>;
}

export const deterministicProgressionSource: ProgressionAdvisorSource = {
  plan: (c, g, o) => planProgression(c, g, o),
};
```

The UI consumes `deterministicProgressionSource` and narrows with `Array`/`'then' in`-style guard only if a future async source is added; today the sync branch is the only path (same pattern documented in the character-assistant design).

### Algorithm per goal kind

**`none`** → `reachable:true, phases:[], grandTotal:0, orderedPath:[], advisories:['Pick a goal to see a recommended path.']`. The panel renders the neutral prompt (FR-1.4, AC1).

**`nextLevel` / current-career current→next level** → call `planNextCareerLevel(character)`. If `!applicable`, return an unreachable-style plan carrying the planner's neutral message. Otherwise map the plan **unchanged**:
- one `complete-current` phase from `characteristics/skills/talent` steps + advisories,
- one `advance-level` phase whose `fee` is `{ kind:'advanceLevelFee', cost: plan.advanceLevelCost, components:[{label:`Advance-level fee (${ready?'ready':'not ready'})`, value, cite:'Core p.48'}] }`,
- `grandTotal = plan.grandTotal` (byte-equal, AC3), `orderedPath = [...plan.orderedPath, advanceLevelFeeStep]`.

**`career` (single switch)** — compose three phases, costs from existing functions only (FR-2.2):
1. `complete-current`: the **requirement steps** from `planNextCareerLevel(character)` (`characteristics.steps` ++ `skills.steps` ++ `talent.steps`), ordered cheapest-first with the planner's stable tie-break; carry the planner's skill/talent advisories. **No** `advanceLevelCost` here (OQ-4).
2. `switch`: `fee = getCareerSwitchCost(isReadyToAdvance(character), character.class, targetScheme.class)` wrapped as a `FeeStep` with cited components (base fee + optional different-class surcharge). This equals `handleSwitchCareer`'s `switchCost` for the same inputs (AC5, cost-parity).
3. `build-target`: for the target career's **level 1** requirements, build per-advance `PlannerStep`s pricing each characteristic/skill from the character's **current** advance count up to the target threshold (`CAREER_COMPLETION_THRESHOLDS[1] = 5`) via `getAdvancementCost(type, a, true)` (in-career for the target, OQ-5), plus the target level's talent (`getCurrentLevelTalents(targetCareer, 1)`, cheapest/by-name, cost `getAdvancementCost('talent', 0, true)` if none owned). Wildcard skills that cannot be auto-costed → advisory, no cost (OQ-9). The build reuses the **same row-minimisation helpers** as the planner where practical; to avoid duplicating that logic, this phase is produced by a small internal `buildLevelRequirements(character, careerScheme, levelNum, threshold)` function **factored out of `planNextCareerLevel`'s existing per-requirement code** (see §Code-reuse boundary).

**`careerLevel` (current career, multi-level climb)** — chain, for each level L from current+1 to target: a `build`/`complete-current` requirement phase + an `advance-level` fee phase (`ADVANCE_LEVEL_FEE`). v1 computes the **first** transition exactly as `planNextCareerLevel(character)`; each subsequent transition is priced against an **explicitly-constructed in-memory projected character** so the numbers are deterministic and cost-parity-safe (Finding 1).

The projection is pinned down as follows — it is a pure, in-memory clone that is **never persisted** (reinforcing read-only):

1. Start from a deep clone of the real `Character` (or the prior iteration's projected clone).
2. Apply **every `PlannerStep` the prior level's plan selected** to the clone:
   - `characteristic` steps → set that characteristic's `.a` (advances) to the step's `toAdvances` (the final step for each characteristic carries it to `threshold`).
   - `skill` steps with a concrete `skillIndex` → set that physical row's `.a` to `toAdvances`.
   - `skill` steps with `skillIndex === null` (synthesised cost-from-0 career skill) → **add a new advanced-skill row** `{ n: step.name, a: threshold }` to the projected clone (mirroring what `ensureCareerSkillsExist` + `advanceSkill` would commit), so the next level sees it as an existing row at `threshold`.
   - `talent` steps → add the chosen talent (`{ n: step.name, … }`) to the projected clone's `talents` so the next level's talent predicate sees it as owned.
   Because `planLevelRequirements` already picks a single deterministic talent and a deterministic cheapest set of skill rows (planner tie-breaks), "which skills were raised / which talent was taken" is **fully determined** — there is no implementer choice left.
3. Set the clone's `career`/`careerLevel`/`class` unchanged (same career, climbing levels), and advance its notion of current level to L.
4. Resolve level L via `getCareerScheme(career)` and call `planLevelRequirements(projectedCharacter, career, L)` to price level L's requirements against the projected advance counts. Add that as the `build` phase, then an `advance-level` fee phase (`ADVANCE_LEVEL_FEE.ready` since the just-projected prior level is complete).

This gives a single, deterministic construction: `grandTotal(L+2 goal) = (L+1 plan requirement subtotals) + advance-level fee + (level L+2 plan computed against the projected character) + advance-level fee`. A dedicated unit test (T11) asserts this exact decomposition.

(If only next-level is ever selected in the UI for the current career, the multi-level branch is still implemented and tested but reached only when the player raises the target level.)

`grandTotal = Σ phase.subtotal`. `orderedPath` concatenates phases in id order (`complete-current` → `switch`/`advance-level` → `build-target`), per-advance steps within a phase kept cheapest-first for display (FR-3.1). `canAfford`/`shortfall` from `character.xpCur` vs `grandTotal` (reusing the planner's semantics). `sessionsToGoal` per OQ-6. `budget` via a thin `projectProgressionBudget(orderedPath, budget)` that walks the ordered `(PlannerStep|FeeStep)` list accumulating `cost` exactly like `projectBudget` (floors budget to a non-negative int).

### Determinism (NFR-2)

No `Date.now()`, no randomness. Tie-breaks reuse the planner's: cost-ascending, then `kind`, then `name`, then `fromAdvances`; talent choice by `localeCompare`. Timeline is pure in `(shortfall, rate)`. Same `(character, goal, options)` → same `ProgressionPlan` (AC9).

---

## Code-reuse boundary (no duplicated cost math)

The advisor must not re-derive any mechanic (FR-4.3, FR-7.2). Two reuse strategies:

- **Current-level costing**: call `planNextCareerLevel` directly and consume its `RequirementPlan`/`PlannerStep`/`advanceLevelCost`/`orderedPath`. For the switch case, consume only its requirement steps (OQ-4).
- **Target-level costing**: `planNextCareerLevel` currently hard-codes "the character's *current* career level." To cost a *target* career's level without copy-pasting the characteristic/skill/talent loops, extract the level-requirement computation into an exported internal helper in `advancement-planner.ts` with a **minimal, non-redundant** signature (Finding 3 — the helper derives everything else internally so a caller cannot pass inconsistent `careerLevel`/`threshold` values and reintroduce drift):
  ```ts
  /** Pure: price raising `character` to satisfy career `careerName`'s level
   *  `levelNum` requirements (in-career for that level). Resolves the CareerLevel
   *  via getCareerScheme and the threshold via CAREER_COMPLETION_THRESHOLDS
   *  INTERNALLY — the caller passes only the career name and level number, so the
   *  two cannot drift. Fail-closed (empty/met RequirementPlans) when the scheme or
   *  level is missing, mirroring planNextCareerLevel's inapplicable path.
   *  Used for the CURRENT level (by planNextCareerLevel) and for a TARGET career
   *  level (by the advisor). Returns the same RequirementPlan shapes; invents no cost. */
  export function planLevelRequirements(
    character: Character,
    careerName: string,
    levelNum: number,
  ): { characteristics: RequirementPlan; skills: RequirementPlan; talent: RequirementPlan };
  ```
  Internally it resolves `scheme = getCareerScheme(careerName)`, picks the Nth present level (`[level1..level5].filter(Boolean)[levelNum-1]`, same resolution `planNextCareerLevel` already uses), and derives `threshold = CAREER_COMPLETION_THRESHOLDS[levelNum] ?? 5`. `planNextCareerLevel` is refactored to compute its own `careerLevelNum`/applicability guards as today, then delegate the per-requirement loops to `planLevelRequirements(character, character.career, careerLevelNum)` (behaviour-preserving — its existing tests must stay green). The advisor calls it for the target career + level. This keeps **one** implementation of the per-requirement cost/row-selection logic. The refactor is in-scope and verified by the existing planner unit + property tests passing unchanged (NFR-3).

The **only** numeric cost literals the advisor references are the shared constants (`ADVANCE_LEVEL_FEE`, `CAREER_CHANGE_DIFFERENT_CLASS_SURCHARGE`, `CAREER_COMPLETION_THRESHOLDS`) — AC11.

---

## How opinionated (FR-3)

The advisor **recommends an order and a primary path** but never auto-selects a goal and never presents a subjective branch as a single mandate:

- **Rule-derived facts** (every cost, threshold, eligibility, fee) are cited and presented as fact.
- **Opinionated ordering** (complete current → switch → build target; cheapest-first within a phase) is labelled a *recommendation* in prose and encoded as the phase order.
- **Subjective branches** (which eligible career to pursue, when the player has *not* committed to one) surface as **options-with-rationale**: the panel can show a short candidate list, each with a rulebook-grounded one-liner (e.g. *"Shares your class → no different-class surcharge (Core p.48)"*, *"Different class → +100 XP surcharge (Core p.48)"*). This is represented in the return type via a separate, optional helper rather than overloading `ProgressionPlan`:
  ```ts
  export interface CareerOption {
    career: string;
    sameClass: boolean;
    switchFeeIfReady: number;    // getCareerSwitchCost(true, ...)
    rationale: string;           // cited, factual
  }
  /** Pure: eligible target careers as options-with-rationale; never ranks a "best". */
  export function describeCareerOptions(character: Character): CareerOption[];
  ```
  The engine **never** declares one option "best" and **never** auto-selects (FR-3.2).

  **When the options list renders (Finding 4 — the FR-3.2 "which career to pursue" state, defined concretely):** `describeCareerOptions(character)` renders **only when `goal.kind === 'none'`** — i.e. the player has not yet committed to a target. It appears as an advisory *"Not sure where to go? Eligible careers:"* list under the neutral "pick a goal" prompt, each row showing the career name and its cited one-liner rationale. Selecting a row sets `goal = { kind: 'career', career }`, which replaces the options list with that goal's costed path. Once any goal is committed (`goal.kind !== 'none'`), the options list is **not** shown (the player has already chosen). This is the single, unambiguous trigger; it is covered by component test C3.

---

## The UI panel (`ProgressionAdvisor.tsx`)

Read-only, styled to match `AdvancementPlanner`. Structure (mirrors the planner's component layout and tooltip wiring). **Collapse uses the planner's `SectionHeader` toggle pattern** (`collapsible`/`collapsed`/`onToggleCollapse` props inside a `headerRow` div, far-right chevron) — **not** the `CollapsibleSection` primitive named in NFR-4 — to stay byte-consistent with `AdvancementPlanner` (Finding 7; the far-right chevron comes from `SectionHeader`).

```
<Card>
  headerRow: <SectionHeader icon={Compass} title="Progression Advisor"
               collapsible collapsed onToggleCollapse />  // chevron far-right via SectionHeader
             <HelpPopover concept="career-advancement">   // reuse existing help concept
  {!collapsed && <>
    Goal selectors:
      - Target career button → opens a grouped-by-class Picker of getEligibleCareers minus current
        (plus a "Current career" default option)
      - Target level button → getCareerLevelOptions(targetCareer) titles; default L1 for foreign career
      - XP budget input (optional)         // reuses projectBudget-style parsing
      - XP/session input (default 10)      // timeline rate; UI default only — NOT a
        rulebook value (code comment: XP awards are GM-discretionary, Core p.36) — Finding 6
    If goal.kind==='none': neutral "Pick a goal" prompt (role="status")   // FR-1.4
      + describeCareerOptions(character) advisory list: "Eligible careers:" each
        with a cited rationale one-liner; selecting one sets goal={kind:'career',career}
        (Finding 4 — rendered ONLY in the none state, FR-3.2)
    Else if !reachable: reason message (role="status")                    // FR-2.8 / AC8
    Else:
      Phases (ordered): each phase heading + per-step list + optional FeeStep row
      Phase subtotals  → TooltipTriggerCell breakdown (A + B + … = subtotal)   // FR-9.1
      Switch-fee row   → TooltipTriggerCell: "Advance-level fee 100 (ready, Core p.48)
                         + Different-class surcharge 100 (Core p.48) = 200"     // FR-9.2
      Grand total      → TooltipTriggerCell: Σ phase subtotals                  // FR-9.1
      Affordability    → "You can afford it" / "Need N more XP" (role="status")
      Timeline         → "≈ {sessions} session(s) at {rate} XP/session (estimate)"
                         (shown only when sessionsToGoal !== null)
      Budget (if set)  → "Covers X of Y advances, spending {spent}" with spent → tooltip
      Advisories       → wildcard/multi-hop notes
      "Do it" affordance → NO mutation; a note/link directing the player to the real
                           controls below (Career Progress advance button / Switch Career),
                           consistent with the planner (FR-5.3)
  </>}
</Card>
```

Local state only: `collapsed` (persisted via `storageKey`, `wfrp-collapse-*` convention), `goal`, `budgetInput`, `rateInput`, `openTooltip`. The panel passes `(character, goal, { budget, xpPerSession })` into `deterministicProgressionSource.plan(...)` inside a `useMemo` keyed on those inputs. It renders tooltips exactly as the planner does (one `openTooltip` discriminated-union slot, `Tooltip` + `TooltipTriggerCell`). **No editable control mutates the character** (FR-6.1); goal/budget/rate are UI-local (FR-1.5). Per-step costs are single `getAdvancementCost`/fee lookups and are **exempt** from tooltips (FR-2.4, FR-9.3); every *calculated total* (phase subtotal, grand total, switch fee, budget spent) carries one.

Props: `{ character: Character; storageKey?: string }`. The panel computes its own plan (it does not receive a `plan` prop) because the goal lives in panel-local state, unlike `AdvancementPlanner` which receives the already-memoized next-level plan from the page. This keeps `AdvancementPage` unchanged except for rendering the panel.

---

## Error handling and validation

The engine is pure and total — it never throws; it returns a well-formed `ProgressionPlan` for every input. Per external input:

| Input | Rule | Behavior on invalid/edge |
|---|---|---|
| `goal.kind='career'` with ineligible career | `isCareerEligible` false | `reachable:false`, `reason` set, no cost path (recoverable; UI shows the reason). Logged? No (expected user state). |
| `goal.career` not in `CAREER_SCHEMES` | `getCareerScheme` undefined | `reachable:false`, `reason: "Unknown career"`; no path. |
| current career unknown / at max level (next-level goal) | `planNextCareerLevel.applicable` false | map planner's neutral inapplicable result into `reachable:false` + neutral reason. |
| `goal.level` out of 1..maxLevel for the career | clamp to `[1, maxLevel]` | plan the clamped level normally. |
| foreign career, `level > 1` (switch + climb) | not supported in v1 | `reachable:true`, **`goalFullyPlanned:false`**, plan the switch-to-L1 portion, emit the multi-hop advisory (Finding 2 / OQ-1 limit). |
| `options.budget` non-finite / ≤0 / non-integer | `Math.floor(Math.max(0, finite?x:0))` (same as `projectBudget`) | `budget:null` (UI hides projection). |
| `options.xpPerSession` non-finite / ≤0 | treat as 0 | `sessionsToGoal:null`, `xpPerSession:0` (UI hides timeline). |
| wildcard-only skill requirement | cannot auto-cost | advisory string, excluded from exactly-to-threshold guarantee (OQ-9); no invented cost. |

Invariants and their owning layer:
- **No mutation / no XP spend / no career change** — owned by the engine (returns new objects; reads only) *and* the panel (renders no mutating control). Enforced by the no-mutation test (AC10) and the read-only component test (AC13).
- **Cost parity** — owned by the shared `advancement.ts` functions/constants; the engine never recomputes. Enforced by the switch-fee and cost-parity property tests (AC5, AC6).
- **Eligibility membership** — owned by `career-eligibility.ts`; the engine/UI consume it. Enforced by AC2/AC8.

The UI validates the two numeric inputs by parsing (`Number`, `Number.isFinite`, `> 0`) before enabling the projection/timeline, exactly like the planner's budget input; invalid input simply hides the derived section (no error toast needed — these are optional projections).

---

## Testability

Engine is fully unit/property testable (pure, no React). The panel is component-testable with `@testing-library/react`. The shared refactor is covered by the existing planner tests staying green plus a dedicated parity test.

### Unit tests — `progression-advisor.test.ts`

Fixtures mirror `advancement-planner.test.ts` (Soldier/Recruit `makeTestCharacter`, plus a same-class and a different-class eligible target).

- **T1 next-level reuse (AC3):** for `planProgression(c, {kind:'nextLevel'})`, the per-advance steps and `grandTotal` **equal** `planNextCareerLevel(c)` (grandTotal and per-step costs equal); `orderedPath` equals the planner's `orderedPath` **plus** a single trailing `advanceLevelFee` `FeeStep` whose `cost === plan.advanceLevelCost` (the planner's `orderedPath` contains only per-advance `PlannerStep`s, so this is deliberately *not* byte-equal — Finding 5).
- **T2 switch path shape (AC4):** `{kind:'career', career: eligibleTarget}` → phases ordered `complete-current` (requirement steps only, **no** advanceLevelCost), `switch` (FeeStep), `build-target`; build steps' `inCareer` reflect target in/out-of-career pricing.
- **T3 switch fee parity, concrete (AC5):** for ready/not-ready × same-class/different-class, the `switch` FeeStep cost equals `getCareerSwitchCost(ready, class, targetClass)` equals the inline `handleSwitchCareer` formula.
- **T4 carryover (OQ-5):** a target requirement the character already meets (advances ≥ threshold) contributes 0 cost; a partially-met one is priced from current advances.
- **T5 wildcard advisory (OQ-9):** a target level with a `(Any)` skill emits an advisory, no invented cost, and does not break grandTotal = Σ subtotals.
- **T6 ineligible target (AC8):** a High-Elf-only career for a Human → `reachable:false`, reason mentions species, `phases:[]`, `grandTotal:0`.
- **T7 timeline (OQ-6/AC9):** `sessionsToGoal = ceil(shortfall/rate)` for `rate>0 && shortfall>0`; `null` when `rate<=0` or `shortfall===0`.
- **T8 affordability:** `canAfford`/`shortfall` track `xpCur` vs `grandTotal`.
- **T9 budget projection:** `projectProgressionBudget` matches walking the ordered path; floors budget; `spent ≤ min(budget, grandTotal)`.
- **T10 none goal (AC1):** `{kind:'none'}` → empty path, advisory prompt, grandTotal 0.
- **T11 multi-level climb (OQ-1, Finding 1):** current-career target level `currentLevel+2` chains build→fee→build→fee; `grandTotal === (L+1 requirement subtotals) + advanceLevelFee + (level L+2 plan computed against the explicitly-projected character per §Algorithm) + advanceLevelFee`, and `goalFullyPlanned === true`. The projected intermediate character is asserted to carry the prior level's selected advances (named char/skill rows at `toAdvances`, synthesised rows added at `threshold`, chosen talent owned) so the L+2 pricing is deterministic.
- **T13 foreign-career level>1 partial (Finding 2):** `{kind:'careerLevel', career: eligibleForeignTarget, level: 2}` → `reachable:true`, **`goalFullyPlanned:false`**, path contains only the switch-to-L1 phases, and an advisory names the v1 multi-hop limit; `grandTotal` equals the single-switch (`career`) plan's grandTotal for the same target.
- **T12 career options (FR-3.2):** `describeCareerOptions` returns eligible targets with correct `sameClass`/surcharge and never marks a "best"; membership = `getEligibleCareers minus current`.

### Property tests — `progression-advisor.property.test.ts` (fast-check)

Arbitraries: Soldier/Recruit with random advance counts + `xpCur` (reuse the `arbCharacter` shape), and a random eligible target career drawn from `getEligibleCareers(species)`.

- **P1 projected-total = sum of per-step costs (AC6):** `grandTotal === Σ (orderedPath step/fee).cost`, and every per-advance step cost `=== getAdvancementCost(step.kind, step.fromAdvances, step.inCareer)`, every fee `===` the shared constant/helper value.
- **P2 switch-fee parity (AC5):** for arbitrary characters and eligible targets, the switch FeeStep cost `=== getCareerSwitchCost(isReadyToAdvance(c), c.class, targetScheme.class)`.
- **P3 fully-planned goal → exactly-to-threshold (AC7, Finding 2):** for a goal with `goalFullyPlanned === true`, each required characteristic/skill in each phase is raised to exactly that phase's level `CAREER_COMPLETION_THRESHOLDS[level]` (never above/below), **excluding** wildcard-advisory skills (OQ-9). The guarantee is scoped to the levels the plan actually covers; the partial foreign-career-level>1 case (`goalFullyPlanned === false`) is excluded from this property.
- **P4 ineligible → unreachable (AC8):** for a target not in `getEligibleCareers(species)`, `reachable===false` and `phases.length===0`.
- **P5 determinism/affordability/timeline (AC9):** same inputs → deep-equal output; `canAfford`/`shortfall` follow `xpCur` vs `grandTotal`; `sessionsToGoal` is the pure OQ-6 function of `(shortfall, rate)`. Also asserts the `goalFullyPlanned` invariant: `true` for `none`/`nextLevel`/same-career `careerLevel`/single-switch `career`, `false` for unreachable goals and foreign-career `level>1`.
- **P6 no-mutation (AC10):** deep-clone the input character, call `planProgression` (across goal kinds + budget + rate), assert the input is `toEqual` its pre-call clone.

### Parity test for the refactor (NFR-3)

- **R1:** for a matrix of ready/not-ready × same/different class, `getCareerSwitchCost(...)` equals the original inline expression `(ready ? 100 : 200) + (sameClass ? 0 : 100)`. (Guards the extraction.)
- The existing `advancement-planner.test.ts` / `.property.test.ts` must pass **unchanged** after the `planLevelRequirements` extraction — this is the behaviour-preserving guarantee.

### Component tests — `ProgressionAdvisor.test.tsx`

- **C1 renders recommendations + tooltips (AC12):** given a goal, the panel renders phase subtotals, grand total, switch fee, and budget-spent, each with an associated `TooltipTriggerCell`; opening one shows the `A + B + … = Total` breakdown; per-step rows have no tooltip trigger.
- **C2 read-only / no mutation (AC13):** the panel exposes no advance/XP/career-switch control; goal selection + budget + rate entry update the displayed path; a spy on any passed character setter is never called (the panel receives only `character` + `storageKey`, no mutators — asserted structurally).
- **C3 goal selection + career-options trigger works (Finding 4):** in the `goal.kind==='none'` state the panel renders the `describeCareerOptions` advisory list (membership = eligible minus current, AC2); selecting an option sets `goal={kind:'career',career}` and replaces the options list with that goal's costed path; once a goal is committed the options list is no longer shown. Selecting a target career from the grouped picker and a level updates the rendered path; the eligible list excludes the current career (AC2).
- **C4 neutral/unreachable states:** no goal → prompt; ineligible target → reason message.
- **C5 UX not regressed (AC14):** rendering `AdvancementPage` shows the planner, Experience Points, and Career Progress sections intact, the advisor as a sibling card with a far-right collapse chevron, and **no** "What's Left This Level" section.

### Verification gates (AC16)

`npx tsc --build --force --noEmit`; `npm run build`; `vitest --run`; `npx eslint .` — all clean, new + existing.

---

## What this design explicitly does not do (Out of Scope)

No AI/LLM/network (future-proofed only). No mutation/spend/auto-advance/auto-switch. No change to advancement/completion/fee/eligibility *mechanics* (the surcharge extraction is a cited refactor). No Advancement-page redesign beyond adding the sibling panel. No spell/endeavour/combat recommendations. Multi-switch chains are deferred (documented OQ-1 limitation).

---

## Open items carried forward (flagged, not silently resolved)

- **OQ-1 multi-switch** — intentionally **deferred**; v1 supports single-career multi-level + single switch. Surfaced as an advisory when a goal would need a second switch. Recommended interpretation cited (Core p.48 scopes a career change to one transition). No rulebook ambiguity, only a scope choice.
- **Multi-level foreign-career targets** — a foreign career target at level > 1 plans only the switch-to-L1 portion (v1), reported honestly as `reachable:true` + `goalFullyPlanned:false` + an advisory (Finding 2). Revisit if players ask to plan climbs inside a not-yet-entered career.
- All other OQs (2–9) are **resolved above** with cited interpretations; none remain ambiguous against the rulebooks. The one mechanic that was uncited in code (the `+100` different-class surcharge) is now verified against Core p.48 and lifted into a cited constant.

---

## Responses to design review (iteration 2)

Review verdict was **CHANGES_REQUESTED** (0 HIGH, 4 MEDIUM, 3 NIT). All seven findings are **addressed**; no finding is backlogged or ignored. Each resolution stays within the original requirements (read-only, cost-parity, no invented mechanics) and was checked against the real source (`advancement-planner.ts`, `advancement.ts`, `AdvancementPage.tsx`, `careers.ts`).

- **Finding 1 (MEDIUM — multi-level climb projection underspecified) — ADDRESSED.** §Algorithm → `careerLevel` multi-level climb now pins down the in-memory projected-character construction step by step (apply each prior-level `PlannerStep`: named char/skill rows → `toAdvances`, synthesised `skillIndex===null` rows added at `threshold`, chosen talent added as owned; resolve level L via `getCareerScheme`; call `planLevelRequirements` against the projected clone). The projection is explicitly in-memory-only and never persisted. T11 now asserts the exact L+2 `grandTotal` decomposition and the projected character's contents.

- **Finding 2 (MEDIUM — foreign-career level>1 reported reachable while goal not reached) — ADDRESSED.** Chose option (b): added an explicit **`goalFullyPlanned: boolean`** to `ProgressionPlan`. `reachable` now means "eligible / a path was produced"; `goalFullyPlanned` means "the path reaches the stated goal." The foreign-career `level>1` case returns `reachable:true, goalFullyPlanned:false` + advisory. AC7 (P3) is rescoped to `goalFullyPlanned === true`. Error-handling table and new test T13 cover it; P5 asserts the `goalFullyPlanned` invariant.

- **Finding 3 (MEDIUM — redundant signature + wrong OQ-5 wording) — ADDRESSED.** `planLevelRequirements` signature reduced to `(character, careerName, levelNum)`; it derives the `CareerLevel` and `threshold` internally and fails closed, so a caller cannot pass inconsistent values. OQ-5 reworded: the build-target phase prices only the target level's own (in-career-by-definition) requirements; the misleading "out-of-career for target requirements" sentence is removed.

- **Finding 4 (MEDIUM — `describeCareerOptions` trigger unspecified) — ADDRESSED.** §How opinionated now defines the single trigger: the options list renders **only when `goal.kind==='none'`**, as an advisory under the neutral prompt; selecting a row sets `goal={kind:'career',career}` and the list disappears once a goal is committed. UI panel `none` branch and component test C3 updated.

- **Finding 5 (NIT — T1 "byte-equal" orderedPath) — ADDRESSED.** T1 reworded: per-advance steps and `grandTotal` equal the planner; `orderedPath` equals the planner's path **plus** a single trailing `advanceLevelFee` FeeStep with `cost === plan.advanceLevelCost`. "byte-equal" dropped for `orderedPath`.

- **Finding 6 (NIT — `10` XP/session default not flagged as non-rulebook) — ADDRESSED.** OQ-6 and the UI panel now require the code comment `// UI default only — not a rulebook value; XP awards are GM-discretionary (Core p.36).` The default lives in the UI, not the engine.

- **Finding 7 (NIT — `CollapsibleSection` vs `SectionHeader` collapse) — ADDRESSED.** §UI panel now states the collapse uses the planner's `SectionHeader` toggle pattern (far-right chevron), intentionally **not** `CollapsibleSection`, to stay byte-consistent with `AdvancementPlanner`.
