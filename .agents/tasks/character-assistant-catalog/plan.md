# Implementation Plan — Character Assistant: Catalog Expansion (Five New Rule Modules)

Source of truth: `.agents/tasks/character-assistant-catalog/design.md` (APPROVED; see `design-review.md`).
This is **additive** engine-only work: five new pure rule modules under `src/logic/assistant/rules/`, wired
into the pure engine, plus three forced in-scope edits to existing files (`SuggestionCategory` union,
`CATEGORY_LABELS`, `SuggestionItem.actionLabel`) and new/extended tests. No new UI surface, no network/LLM,
no mutation path. Every mechanic reuses an already-cited `src/logic/*` helper — no cost/threshold/heal math
is reinvented (rules-compliance). Each module carries a `// Core p.NNN` comment and a `citation` data string.

## Ground rules for every item
- Engine stays **pure, deterministic, side-effect-free, JSON-serializable** (NFR-1 / FR-5.1 / FR-7). Modules
  never mutate the character, write storage, navigate, or open a dialog.
- Suggestion `id`s MUST be derived from stable data (name-slugs), **never** from `disease.id` /
  `criticalWound.id` (insertion-order auto-increment), `disease.contracted` (timestamp), or array index — or
  the determinism property test can flake.
- Coalesce optional arrays (`character.diseases ?? []`, `character.rituals ?? []`, `character.knownRunes ?? []`)
  so a pre-feature save never throws (mirrors `reminders.ts` coalescing `psychologyTraits ?? []`).
- Follow the exact shape of the existing modules (`advancement.ts`, `corruption.ts`, `encumbrance.ts`,
  `endeavours.ts`, `reminders.ts`): a pure `fooSuggestions(character[, ctx]): Suggestion[]` returning `[]`
  when the trigger is not met.
- New per-module tests go in `src/logic/assistant/__tests__/` alongside `engine.test.ts`, importing the rule
  function directly (same pattern the existing file uses). Prefer `fast-check` properties for the
  "appears iff real trigger predicate holds" + "deterministic/serializable/side-effect-free" invariants,
  and concrete cases for id/category/urgency/citation/action shape.
- The existing `engine.test.ts` property suites (purity, determinism, serializability, `orderSuggestions`,
  `visibleSuggestions`) must stay green **UNCHANGED** — do not edit that file except where item 8 explicitly
  extends the ordering test for the two new categories (a pure addition; the existing assertions are
  untouched).

## Verified facts (from exploration — rely on these, do not re-derive)
- Commands: typecheck `tsc --build --noEmit`; build `tsc --build && vite build` (`npm run build`); tests
  `vitest run` (`npm test`). Node >= 20. `typescript` is aliased for eslint compat (see package.json note) —
  do not touch that aliasing.
- `SuggestionCategory` currently has exactly 5 members; `CATEGORY_LABELS` in `AssistantPanel.tsx` is a
  `Record<SuggestionCategory, string>` with 5 entries — adding members forces both edits or `tsc` fails.
- `ordering.ts` has `IN_COMBAT_GROUP_ORDER` and `OUT_OF_COMBAT_GROUP_ORDER`, each listing the 5 categories.
- `SuggestionItem.tsx` `actionLabel(action, isPrimary)` hardcodes `'View Corruption'` for
  `!isPrimary && page==='character' && subTab==='notes'`, else `'Go'`.
- `getSymptomTest(name, severity)` returns non-null for Blight/Buboes/Gangrene/Lingering/Wounded (Endurance)
  and Pox (Cool); null otherwise. Lethal cadences (verbatim): Blight `'Daily (or die)'`, Gangrene
  `'Daily (fail > TB times = lose location)'`. `getDiseaseSymptoms(name)` returns `ResolvedSymptom[]|undefined`
  with `{ name, severity, displayName }` — pass `s.name` + `s.severity` to `getSymptomTest`, never `displayName`.
- `getDiseaseProgress(d)` → `{ elapsed, durationTotal, durationUnit, durationReached }`. `addDisease` does NOT
  enforce distinct `diseaseName`; the id field is auto-increment, `contracted` is the timestamp.
- `getActiveCriticalWounds(wounds)` filters `!healed` (currently unused export — this feature activates it).
- `character.conditions` is `{ name, level }[]`; `'Unconscious'` is a real condition name; `character.wCur` is a number.
- `character.fortune/resolve/fate/resilience/xpCur` are plain numbers.
- Advancement helpers exist with these signatures: `getAdvancementCost(type, currentAdvances, inCareer)`
  (`('talent', lvl, true)` = `100*(lvl+1)`), `hasSpellcastingTalent`, `getSpellcastingTypes`,
  `countMemorizedByType` (→ `{petty,arcane,miracle,chaos}`), `getSpellLearningCost(type, known, bonus)`
  (miracle/chaos ignore `bonus`), `hasRuneMagicTalent`, `hasRitualMagicTalent`, `getCharacterLore`,
  `getCurrentLevelTalents(careerName, level)`. Current level derivation (mirror `isReadyToAdvance`):
  `allLevels = [scheme.level1..level5].filter(Boolean)`,
  `careerLevelNum = allLevels.findIndex(l => l.title === character.careerLevel) + 1`, guard `careerLevelNum > 0`
  (and a resolved `CAREER_SCHEMES[character.career]`) before trusting `getCurrentLevelTalents`.
- **Ritual filter correction (supersedes design NIT #1 wording):** the real predicate in `AdvancementPage.tsx`
  keys on `r.type` (NOT `r.lore`): a ritual is a candidate iff `!learnedRitualNames.has(r.name)` AND
  (`r.type === 'Any' || r.type === 'Any Lore'`, OR `r.type === 'Any Lore of the Eight Winds'` with any
  `Arcane Magic` talent, OR `characterLore && (r.type.includes(characterLore) || r.type.includes(\`Lore of ${characterLore}\`))`),
  then affordable iff `character.xpCur >= r.learningXP`. Reuse this predicate verbatim; do not invent a lore field.
- Spell cost bonus (mirror `handleLearnSpell`): compute both up front —
  `wpBonus = getBonus(WP total)`, `intBonus = getBonus(Int total)`; per type `bonus = type==='petty' ? wpBonus : intBonus`
  (miracle/chaos ignore it inside `getSpellLearningCost`). Pass `countMemorizedByType(character)[type]` as `known`.
- `resolveReminderBaseTarget` (skill branch) reads the characteristic from `skill.c`;
  `getSymptomTestBaseTarget(character, skill)` uses a hardcoded `T`/`WP` key + skill advances. They agree by
  construction for the shipped skill defs — item 9 asserts this parity so a future divergence is caught.
- No new suggestion displays a **calculated total** (all shown numbers are raw stored pools / array lengths),
  so **none sets `totals`** and no `SuggestionItem.tsx` tooltip wiring changes (calculated-totals steering
  satisfied — the breakdown path is only required for derived/summed stats, which these are not).

---

- [ ] 1. Extend the category type and labels (shared prerequisite for everything else).
      Add `'health'` and `'resource'` to the `SuggestionCategory` union in `src/logic/assistant/types.ts`
      (with the design's doc comments: health = diseases + unhealed criticals; resource = unspent
      Fortune/Resolve). Add the two matching entries to `CATEGORY_LABELS` in
      `src/components/assistant/AssistantPanel.tsx`: `health: 'Health'`, `resource: 'Fortune & Resolve'`.
      Files: `src/logic/assistant/types.ts`, `src/components/assistant/AssistantPanel.tsx`
      Verify: `npx tsc --build --noEmit` compiles with no errors (confirms the `Record<SuggestionCategory,…>`
      map is exhaustive and no other switch/record broke).

- [ ] 2. Update ordering to rank all seven categories in both contexts.
      Replace `IN_COMBAT_GROUP_ORDER` with
      `['combat','health','encumbrance','corruption','resource','advancement','endeavour']` and
      `OUT_OF_COMBAT_GROUP_ORDER` with
      `['advancement','endeavour','corruption','health','encumbrance','resource','combat']` in
      `src/logic/assistant/ordering.ts`. Update the leading doc comment to mention the two new groups. Do NOT
      change the within-group sort (urgency then `id` lexical) or the unknown-category fallback.
      Files: `src/logic/assistant/ordering.ts`
      Verify: `npx tsc --build --noEmit` clean; `npm test -- ordering` (or `vitest run` in item 10) — the
      existing `orderSuggestions` test still passes (its inputs use only the original 5 categories, whose
      relative order is unchanged).

- [ ] 3. Create `rules/fortune-resolve.ts` — unspent Fortune / Resolve (category `resource`).
      Pure `fortuneResolveSuggestions(character: Character): Suggestion[]` (single-arg — NO `ctx`, visible in
      and out of combat; placement is governed only by ordering). Trigger is a plain read:
      emit a Fortune suggestion when `character.fortune > 0` and a Resolve suggestion when
      `character.resolve > 0` (0, 1, or 2 suggestions). Use the exact ids/titles/rationales/citations/actions
      from design §1: `id` `'resource:fortune-available'` / `'resource:resolve-available'`, `urgency: 'info'`,
      `action: { kind: 'navigate', page: 'combat' }` (no `subTab`), citations `'Core p.169: Spending Fortune'`
      / `'Core p.170: Spending Resolve'`, no `totals`. Add a `// Core p.169 / p.170` comment.
      Files: `src/logic/assistant/rules/fortune-resolve.ts`,
      `src/logic/assistant/__tests__/fortune-resolve.test.ts`
      Verify: `npm test -- fortune-resolve` — new tests pass: fast-check over `fortune`/`resolve` in `[0,N]`
      asserts a Fortune/Resolve item appears **iff** that pool `> 0`, output is JSON round-trippable and
      function-free, and calling twice on a frozen clone yields equal output (purity/determinism).

- [ ] 4. Create `rules/diseases.ts` — active disease needing attention (category `health`).
      Pure `diseaseSuggestions(character: Character): Suggestion[]` (single-arg). Trigger
      `(character.diseases ?? []).length > 0`. Collapse active diseases to **distinct `diseaseName`**
      (order-preserving) and emit one suggestion per distinct name (Finding 1); when same-name records differ,
      use the **most-progressed** record (largest `elapsedDays`, first-in-array on tie) for the
      `durationReached` escalation. For each distinct disease, resolve symptoms via
      `getDiseaseSymptoms(diseaseName)` and find the first symptom with a non-null
      `getSymptomTest(s.name, s.severity)` (pass `s.name`, not `displayName`).
      - Roll-backed disease: primary `action` is a **seeded roll** reusing the reminder shape
        (`def: { kind:'skill', skillName: symptomTest.skill, fallbackChar: symptomTest.skill==='Endurance' ? 'T' : 'WP' }`,
        `difficulty: symptomTest.difficulty`, `rollName: \`${symptomTest.skill} (${diseaseName})\``);
        `secondaryAction: { kind:'navigate', page:'character', subTab:'notes' }`. `id`
        `'health:disease:<slug>'` (deterministic slug from `diseaseName`), title/rationale per §2.
      - Non-roll disease: navigate-only primary `{ kind:'navigate', page:'character', subTab:'notes' }`, no
        secondary, title `'${diseaseName}: review disease progress'`.
      - `urgency`: `'recommended'` by default (non-roll default `'info'`, or `'recommended'` if
        `durationReached`); escalate roll-backed to **`'critical'`** when
        `getDiseaseProgress(record).durationReached === true` OR the triggering symptom's `cadence` exactly
        equals `'Daily (or die)'` (Blight) or `'Daily (fail > TB times = lose location)'` (Gangrene) — exact
        string match, no fuzzy/substring matching.
      - Citations per §2 (`'Core p.187-188: Disease Symptoms'` / `'Core p.186: Using Diseases'` /
        `'Core p.186-188: Using Diseases'`). No `totals`. Add `// Core p.186-188` comments.
      Files: `src/logic/assistant/rules/diseases.ts`,
      `src/logic/assistant/__tests__/diseases.test.ts`
      Verify: `npm test -- assistant/__tests__/diseases` — tests cover: no diseases → `[]`; a roll-backed
      Endurance disease (e.g. Blight) → seeded Endurance roll primary + character/notes secondary + `critical`
      on lethal cadence; a **Cool/Pox** disease → `fallbackChar: 'WP'` path exercised; a non-roll disease
      (e.g. Fever) → navigate-only primary, no secondary; `durationReached` escalation; two same-name records
      → exactly one suggestion with a single stable `id`; determinism on a frozen clone; serializable output.
      (Build disease fixtures from real `DISEASE_REGISTRY` names so `getDiseaseSymptoms` resolves.)

- [ ] 5. Create `rules/critical-wounds.ts` — unhealed critical wounds (category `health`).
      Pure `criticalWoundSuggestions(character: Character): Suggestion[]` (single-arg). Trigger
      `getActiveCriticalWounds(character.criticalWounds).length > 0`. Emit ONE summary suggestion: `id`
      `'health:critical-wounds'`, title `'${n} unhealed Critical Wound${n===1?'':'s'}'`, rationale + citations
      per §3 (`'Core p.180-181: Healing Critical Wounds'` and `'Core p.172: Death'`),
      `action: { kind:'navigate', page:'combat' }`, no `totals`, `category:'health'`. `urgency: 'recommended'`
      normally; escalate to **`'critical'`** only under the RAW Death condition —
      `character.conditions.some(c => c.name === 'Unconscious') && character.wCur <= 0`. No count/TB threshold
      (not a RAW trigger — rules-compliance). Add `// Core p.180-181 / p.172` comments.
      Files: `src/logic/assistant/rules/critical-wounds.ts`,
      `src/logic/assistant/__tests__/critical-wounds.test.ts`
      Verify: `npm test -- critical-wounds` — tests: no active wounds (empty or all `healed`) → `[]`; one+
      active → single suggestion, `recommended`, navigate to combat; escalates to `critical` only when
      Unconscious present AND `wCur <= 0` (and NOT when only one of those holds, e.g. many wounds but conscious);
      title count matches `getActiveCriticalWounds().length`; deterministic/serializable.

- [ ] 6. Create `rules/learnable.ts` — learnable options you can afford (category `advancement`, out-of-combat only).
      `learnableSuggestions(character: Character, ctx: SuggestionContext): Suggestion[]`. Return `[]` when
      `ctx.inCombat === true`, then gate on `character.xpCur > 0`. Compute affordable categories by REUSING
      advancement helpers only (no cost math):
      - Spells: `hasSpellcastingTalent` → for each `getSpellcastingTypes(character)` type,
        `cost = getSpellLearningCost(type, countMemorizedByType(character)[type], type==='petty' ? wpBonus : intBonus)`
        with both bonuses computed up front; affordable iff `xpCur >= cost`.
      - Rituals: `hasRitualMagicTalent` + the ritual filter predicate verbatim (keyed on `r.type` + 
        `learnedRitualNames` by name — see "Ritual filter correction" above), affordable iff
        `xpCur >= r.learningXP`.
      - Talents: resolve `careerLevelNum` as `isReadyToAdvance` does; guard `careerLevelNum > 0` AND resolved
        career, else omit the talent portion. Candidates = `getCurrentLevelTalents(character.career, careerLevelNum)`;
        per candidate current `lvl` = name-matched `character.talents[].lvl` (match exact or grouping-suffix
        like `advancement.ts`) or 0; cost `getAdvancementCost('talent', lvl, true)`; talent portion fires iff
        `xpCur >= 100` and at least one candidate affordable. **Do NOT add a `lvl < TalentData.max` gate**
        (`max` is a characteristic-bonus string, not a numeric cap — resolving it would invent a mechanic).
      Emit ONE summary suggestion only when at least one category is affordable: `id` `'advancement:learnable'`,
      title `'You can afford to learn something new'`, rationale = compact prose listing affordable KINDS (not
      an enumeration), `urgency: 'info'`, `action: { kind:'navigate', page:'advancement' }`, citations per §4,
      no `totals`. Add `// Core p.44-45 / p.47` comments.
      Files: `src/logic/assistant/rules/learnable.ts`,
      `src/logic/assistant/__tests__/learnable.test.ts`
      Verify: `npm test -- learnable` — tests: `ctx.inCombat` → `[]` regardless of state (combat suppression);
      `xpCur === 0` → `[]`; a character with a spellcasting talent + enough XP → one `advancement:learnable`
      info suggestion with the affordable kind in the rationale; a character with XP but nothing eligible
      (no caster/ritual/resolvable career) → `[]`; unresolvable career/level → talent portion omitted (and `[]`
      if nothing else affordable); deterministic/serializable. Costs asserted via the helper outputs, never
      re-derived in the test.

- [ ] 7. Create `rules/downtime.ts` — downtime endeavour opportunity (category `endeavour`, out-of-combat only).
      `downtimeSuggestions(character: Character, ctx: SuggestionContext): Suggestion[]`. Return `[]` when
      `ctx.inCombat === true`. Fire in the state COMPLEMENTARY to `endeavourSuggestions`: require
      `!hasActiveEndeavours(character)` (shared guard → mutual exclusion with `endeavour:active`), AND capacity
      = either (a) some `DowntimePeriod` with free slots
      (`period.entries.filter(e => e.status !== 'completed').length < period.slots`) OR (b) no periods at all
      (`character.endeavours.length === 0`). Emit one suggestion: `id` `'endeavour:available'`,
      title `'You have open Endeavour slots'` for case (a) / `'Start a downtime Endeavour'` for case (b),
      rationale + citation per §5 (`'Core p.194-195: Endeavours (Between Adventures)'`), `urgency: 'info'`,
      `action: { kind:'navigate', page:'endeavours' }`, no `totals`. Reads `period.slots`/`entries` only — does
      not recompute slot counts. Add `// Core p.194-195` comment.
      Files: `src/logic/assistant/rules/downtime.ts`,
      `src/logic/assistant/__tests__/downtime.test.ts`
      Verify: `npm test -- assistant/__tests__/downtime` — tests: `ctx.inCombat` → `[]`; active endeavour
      present → `[]` (never double-fires with `endeavour:active`); no periods → case (b) title; a period with a
      free slot and no active entries → case (a) title; a full period with no free slots → `[]`;
      deterministic/serializable. Also assert `endeavourSuggestions` and `downtimeSuggestions` are never both
      non-empty for the same character (mutual exclusion).

- [ ] 8. Wire the five modules into the engine and extend the ordering test for the new categories.
      In `src/logic/assistant/engine.ts`, append the five new modules to `raw` after the existing five
      (exact composition in design §"Engine wiring"): `fortuneResolveSuggestions(character)`,
      `diseaseSuggestions(character)`, `criticalWoundSuggestions(character)` (single-arg),
      `learnableSuggestions(character, context)`, `downtimeSuggestions(character, context)` (two-arg). Do NOT
      add a `ctx`/`inCombat` parameter to the three single-arg modules. Keep `orderSuggestions(raw, context)`
      and `deterministicSuggestionSource` unchanged. Then extend ONLY the `orderSuggestions` describe-block in
      `src/logic/assistant/__tests__/engine.test.ts` with a NEW `it(...)` that includes `health` and `resource`
      items and asserts the full seven-category order for both contexts; leave every existing assertion in that
      file untouched.
      Files: `src/logic/assistant/engine.ts`, `src/logic/assistant/__tests__/engine.test.ts`
      Verify: `npm test -- assistant/__tests__/engine` — the existing purity/determinism/serializability and
      the original ordering tests still pass unchanged, and the new seven-category ordering case passes.

- [ ] 9. Add the integration tests: action labelling + roll base-target parity.
      In a new `src/logic/assistant/__tests__/catalog-integration.test.ts` (and the `SuggestionItem` edit lands
      in item 10): (a) parity — for an Endurance disease and a Cool (Pox) disease, assert
      `resolveReminderBaseTarget(seededDef, character)` equals `getSymptomTestBaseTarget(character, skill)` on
      `BLANK_CHARACTER`-derived fixtures, so a future change to either helper cannot silently diverge the
      seeded target; (b) route validity — assert each new module's emitted `action.page` (+ `subTab`) is a real
      `PageSection`/sub-tab (`combat` no subTab; `character`+`notes`; `advancement` no subTab; `endeavours`).
      Files: `src/logic/assistant/__tests__/catalog-integration.test.ts`
      Verify: `npm test -- catalog-integration` — parity holds for both Endurance and Cool, and every route
      asserted is valid.

- [ ] 10. Fix `SuggestionItem.actionLabel` to disambiguate the `character/notes` route, and cover it with a component test.
      In `src/components/assistant/SuggestionItem.tsx`, change `actionLabel(action, isPrimary)` →
      `actionLabel(action, category: SuggestionCategory)` and, for a `navigate` action with
      `page==='character' && subTab==='notes'`, return `'View Diseases'` when `category==='health'`,
      `'View Corruption'` when `category==='corruption'`, else `'Go'` (explicit mapping — NOT binary
      health-vs-else, so a future category degrades to `'Go'` not a false "View Corruption"). Update both call
      sites to `actionLabel(suggestion.action, suggestion.category)` and
      `actionLabel(suggestion.secondaryAction, suggestion.category)`, applying to primary AND secondary. Import
      `SuggestionCategory` type as needed. No other behaviour changes. Then add/extend a component test
      asserting: a `health` suggestion with a `character/notes` navigate labels **"View Diseases"** (both as
      primary on a non-roll disease and as secondary on a roll-backed disease), and a `corruption`
      `character/notes` navigate still labels **"View Corruption"**.
      Files: `src/components/assistant/SuggestionItem.tsx`,
      `src/components/assistant/__tests__/SuggestionItem.test.tsx` (create if absent, following
      `AssistantPanel.test.tsx` conventions)
      Verify: `npm test -- SuggestionItem` — label assertions pass; `npm test -- AssistantPanel` still green.

- [ ] 11. Full clean gate — all four must be clean before this task is done.
      Run each and resolve every error (fix root causes per fix-errors steering; do not suppress). The only
      permitted eslint suppression is the project's single sanctioned
      `// eslint-disable-next-line react-hooks/set-state-in-effect` mirroring
      `src/components/shared/Tooltip.tsx`, and only if genuinely needed (it should NOT be needed here — these
      are pure logic modules).
      Files: none new (verification only)
      Verify, all clean:
      - `npx tsc --build --force --noEmit` — 0 type errors.
      - `npm run build` — build succeeds.
      - `npx vitest --run` — all suites pass (new per-module, integration, component, and the UNCHANGED
        existing engine property suites).
      - `npx eslint .` — 0 errors and no new warnings.

## Notes / assumptions
- Design NIT #1 referenced a ritual `r.lore` field; the real field is `r.type` and the lore match is
  `r.type.includes(characterLore)` / `r.type.includes('Lore of '+characterLore)`. Item 6 uses the real
  predicate verbatim. This is a doc wording fix, not a mechanic change.
- OQ-2 (critical-wound heal-readiness) and OQ-3 (Critical Wounds panel is in-combat/Status-only) are accepted
  v1 limitations per the design: the critical-wounds suggestion is review-only and routes to `page:'combat'`;
  it does not compute heal-readiness and does not widen panel visibility (that would be out-of-scope UI).
- No suggestion sets `totals`, so the calculated-totals steering imposes no tooltip-wiring change; the existing
  `Tooltip` + `TooltipTriggerCell` path in `SuggestionItem.tsx` is untouched beyond the `actionLabel` fix.
