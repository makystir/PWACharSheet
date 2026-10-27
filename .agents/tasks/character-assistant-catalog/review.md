# Review — Character Assistant Catalog Expansion (five new rule modules)

Commits under review: `0f6b27b` ("feat: add five Character Assistant catalog rule modules") and
`fb03b7f` ("fix: add RAW '> Toughness Bonus' clause to critical-wound death escalation").
Verdict: **APPROVED** (no blocking findings; the prior pass's single blocker is resolved and verified).

## Scope checked

- Design: `.agents/tasks/character-assistant-catalog/design.md`
- Plan: `.agents/tasks/character-assistant-catalog/plan.md`
- Prior review: `review.md`/`review.json` at `0f6b27b` (one blocker — missing `> TB` clause).
- Changed source: `engine.ts`, `ordering.ts`, `types.ts`, `AssistantPanel.tsx`, `SuggestionItem.tsx`,
  the five new rule modules, and the per-module / integration / ordering / label test files.
- Rulebook spot-checks against `docs/WarhammerFantasyRoleplay4e.md` (p.169/170 Fortune/Resolve,
  p.172 Death, p.187-188 disease cadences) — see Finding resolution below.

## Verification evidence (read from commit messages, not re-run)

Both commits record all four gates clean:
- `npx tsc --build --force --noEmit` : exit 0
- `npm run build` : built successfully
- `npx vitest --run` : 493 files, 5367 tests passed
- `npx eslint .` : 0 errors, 3 pre-existing warnings (untouched files)

Evidence present and complete, so the suites were not re-run. Narrow citation spot-checks were performed
against the Core rulebook (permitted) to confirm the RAW-correctness claims the design makes about the
Death rule and the Fortune/Resolve/disease pages; all confirmed.

## Prior blocker — RESOLVED and verified

The `0f6b27b` review raised one BLOCKER: `critical-wounds.ts` escalated to `'critical'` on
`Unconscious AND wCur <= 0` while citing "Core p.172: Death", but omitted the RAW
`active Critical Wounds > Toughness Bonus` clause.

`fb03b7f` fixes this. `criticalWoundSuggestions` now gates the escalation on the full RAW condition:

```ts
const tb = getBonus(character.chars.T.i + character.chars.T.a + character.chars.T.b);
const deathCheck =
  character.conditions.some(c => c.name === 'Unconscious') && character.wCur <= 0 && n > tb;
```

I independently verified the rule text: `docs/WarhammerFantasyRoleplay4e.md` "Death" (in the `_page_172`
block) reads "…If you have more Critical Wounds than your Toughness Bonus, you succumb…". The `> TB`
comparison IS the RAW trigger, `getBonus` is the existing calculator (no new math), and "Core p.172: Death"
is an accurate citation (the heading sits between the `_page_172` markers). The escalation test now covers
`count == TB` (survives, `recommended`) vs `count > TB` (dies, `critical`). Blocker cleared.

## What is correct

**Module shape / wiring / boundary.** All five modules (`fortune-resolve`, `diseases`, `critical-wounds`,
`learnable`, `downtime`) are pure `(character[, ctx]) => Suggestion[]` functions matching the existing
module shape, each returning `[]` when its trigger is unmet and coalescing optional arrays
(`character.diseases ?? []`, `character.rituals ?? []`). They are composed into `engine.ts`'s flat `raw`
array after the original five and ordered by the unchanged `orderSuggestions`. The engine performs no
mutation, I/O, navigation, or dialog; `deterministicSuggestionSource` and the `SuggestionSource` boundary
are unchanged. Every emitted `action` is a serializable `navigate`/`roll` descriptor routing through the
existing dispatcher — nothing auto-applies, no new mutation path.

**Context-sensitivity contract.** Exactly the two intended modules take and branch on `ctx`
(`learnableSuggestions`, `downtimeSuggestions`, both `[]` when `inCombat`); the other three are
single-argument and never self-suppress, as the design mandates.

**Trigger predicates match real state.**
- Fortune/Resolve: plain `character.fortune > 0` / `character.resolve > 0` reads (the fortune-resolve.ts
  helpers are mutators, confirmed; a `> 0` read is the correct predicate). Emits up to two independent items.
- Diseases: `(character.diseases ?? [])`, symptoms via `getDiseaseSymptoms(diseaseName)`, test via
  `getSymptomTest(s.name, s.severity)` (base name + severity, NOT `displayName`), escalation via
  `getDiseaseProgress(record).durationReached` and exact lethal-cadence match. I confirmed in
  `src/logic/diseases.ts` that `getSymptomTest` returns non-null only for Blight/Buboes/Gangrene/Lingering/
  Wounded (Endurance) and Pox (Cool), and that the two lethal cadence strings in the module's
  `LETHAL_CADENCES` set (`'Daily (or die)'`, `'Daily (fail > TB times = lose location)'`) match verbatim.
  Same-name records are collapsed by distinct `diseaseName`, with the most-progressed record (largest
  `elapsedDays`) driving escalation — so no two emitted ids collide and a due test is never hidden behind a
  duplicate. `id` is a deterministic name-slug, never `disease.id`/`contracted`.
- Critical wounds: reuses `getActiveCriticalWounds(character.criticalWounds)` (previously-unused export,
  now activated); the summary count is a plain array length.
- Learnable: reuses `advancement.ts` helpers with signatures confirmed in source —
  `hasSpellcastingTalent`, `getSpellcastingTypes`, `countMemorizedByType`,
  `getSpellLearningCost(type, known, bonus)`, `hasRitualMagicTalent`, `getCharacterLore`,
  `getCurrentLevelTalents(careerName, level)`, `getAdvancementCost('talent', lvl, true)` (= `100*(lvl+1)`).
  No cost is recomputed. WPB/IntB bonus derivation mirrors `AdvancementPage.handleLearnSpell`; the ritual
  predicate keys on `r.type` + `learnedRitualNames` (matches AdvancementPage); the career/level guard
  (`careerLevelNum > 0` after `findIndex(...)+1`, plus a resolved `CAREER_SCHEMES[...]`) is present. The
  `TalentData.max` numeric gate is correctly omitted — it is a characteristic-bonus expression string, not
  a numeric cap, so resolving it would invent a mechanic (rules-compliance). Gating on affordability of the
  next in-career advance is rulebook-grounded (Core p.44-45, p.47).
- Downtime: `!hasActiveEndeavours(character)` (checks pending/in_progress — confirmed) guarantees mutual
  exclusion with `endeavour:active`; capacity derived from `period.slots`/`entries` only, not recomputed.

**Navigation targets are real.** `combat` (Fortune/Resolve, Critical Wounds — no `subTab`, since Combat
uses internal mode state), `character/notes` (Diseases), `advancement` (Learnable — no subTab),
`endeavours` (Downtime). The integration test asserts every emitted route against an allow-list
(`combat:`, `character:notes`, `advancement:`, `endeavours:`).

**New categories fully ranked.** `SuggestionCategory` gains `'health'` and `'resource'` in `types.ts`; both
appear in BOTH `IN_COMBAT_GROUP_ORDER` and `OUT_OF_COMBAT_GROUP_ORDER` (seven entries each, none unranked)
and in `CATEGORY_LABELS` (`Health`, `Fortune & Resolve`). The extended `orderSuggestions` test asserts the
full seven-category order in both contexts; the original ordering test's inputs (five original categories)
are untouched, so their relative order is unchanged.

**Purity / boundary.** The engine stays pure; the existing purity/determinism/serializability property
suites in `engine.test.ts` are unmodified (only an additive ordering `it(...)` was appended). Each new
module has a determinism-on-frozen-clone assertion and a no-functions/JSON-round-trip assertion.

**Rules-compliance / citations.** Every encoded mechanic is cited to a Core page in both a `// Core p.NNN`
comment and a `citation` data string, and reuses an existing logic helper rather than re-deriving math.
Spot-checked and confirmed: Fortune p.169 / Resolve p.170 (headings at/within the respective page markers),
Death p.172 (`> TB` clause verbatim), disease cadences p.187-188. Nothing invented; the one deliberate
deviation (omitting the talent `max` gate) avoids inventing a cap and is documented.

**Tooltip rule.** No new suggestion displays a calculated total — Fortune/Resolve pools, disease names, the
critical-wound count (an array length), and the learnable prose are all raw reads, not derived sums — so
none sets `totals` and no `SuggestionItem` tooltip wiring changed. Consistent with the calculated-totals
steering (the breakdown path is required only for summed/derived stats).

**SuggestionItem label disambiguation.** `actionLabel(action, category)` keys the shared `character/notes`
route off the owning suggestion's category (`health` → "View Diseases", `corruption` → "View Corruption",
else "Go"), applied to BOTH primary and secondary buttons. Covered by `SuggestionItem.test.tsx` (health
primary non-roll, health secondary roll-backed, corruption secondary).

**Tests.** Per-module suites cover appears-iff-trigger, urgency escalation (disease lethal cadence /
`durationReached`; criticals only under the full RAW death check), in-combat suppression of learnable,
downtime vs endeavour mutual exclusion, same-name disease collapse, the Cool/Pox WP fallback path,
determinism and serializability. The integration suite asserts seeded-roll base-target parity
(`resolveReminderBaseTarget` == `getSymptomTestBaseTarget` for both Endurance and Cool) and route validity.
Badge-count == rendered-item-count holds structurally: `AssistantPanel` renders every ordered item and the
badge derives from the same list; the catalog expansion did not alter that wiring.

## Blocking findings

None.

## Non-blocking observations (no action required)

- OQ-2 / OQ-3 (critical-wound heal-readiness is not computable; the Critical Wounds panel renders only in
  Combat Status mode) remain accepted v1 limitations per the design and do not affect correctness of the
  emitted suggestion — the suggestion is review-only and routes to `page: 'combat'`.
- Disease "due" timing has no in-session clock; escalation keys only on `durationReached` / lethal cadence,
  the shipped v1 decision, and is deterministically tested.
- `critical-wounds.ts` uses `wCur <= 0` where the rulebook says "0 Wounds". Since the model does not drive
  Wounds below 0 in normal play and `<= 0` is a safe superset of the RAW "0", this is a reasonable reading
  consistent with the design, not an invented mechanic.
