# Review — Character Assistant Catalog Expansion (five new rule modules)

Commit under review: `0f6b27b` — "feat: add five Character Assistant catalog rule modules".
Verdict: **CHANGES_REQUESTED** (one blocking rules-compliance finding).

## Scope checked

- Design: `.agents/tasks/character-assistant-catalog/design.md`
- Plan: `.agents/tasks/character-assistant-catalog/plan.md`
- Changed source: `engine.ts`, `ordering.ts`, `types.ts`, `AssistantPanel.tsx`, `SuggestionItem.tsx`,
  five new rule modules, and the per-module / integration / label test files.
- Spot-checked rulebook citations against `docs/WarhammerFantasyRoleplay4e.md` and `docs/Up_In_Arms.md`
  (Core p.169/170 Fortune/Resolve, p.172 Death, p.187-188 disease cadences).

## Verification evidence (read from commit message, not re-run)

The commit records all four gates clean:
- `npx tsc --build --force --noEmit` : exit 0
- `npm run build` : built successfully
- `npx vitest --run` : 493 files, 5367 tests passed
- `npx eslint .` : 0 errors, 3 pre-existing warnings (untouched files)

Evidence is present and complete, so the suites were not re-run. One targeted citation spot-check was
performed (permitted) because the design made an explicit RAW-correctness claim about the Death rule; see
Finding 1.

## What is correct

**Module shape / wiring / boundary.** All five modules (`fortune-resolve`, `diseases`, `critical-wounds`,
`learnable`, `downtime`) are pure `(character[, ctx]) => Suggestion[]` functions matching the existing
module shape, each returning `[]` when its trigger is unmet, coalescing optional arrays
(`character.diseases ?? []`, `character.rituals ?? []`). They are composed into `engine.ts`'s flat `raw`
array and ordered by the unchanged `orderSuggestions`. The engine performs no mutation, I/O, navigation, or
dialog; `deterministicSuggestionSource` is unchanged; the `SuggestionSource` boundary is intact. Every
emitted `action` is a serializable `navigate`/`roll` descriptor routing through the existing dispatcher —
nothing auto-applies.

**Context-sensitivity contract.** Exactly the two intended modules take and branch on `ctx`
(`learnableSuggestions`, `downtimeSuggestions`, both return `[]` when `inCombat`); the other three are
single-argument and never self-suppress, as the design mandates.

**Trigger predicates match real state.**
- Fortune/Resolve: plain `character.fortune > 0` / `character.resolve > 0` reads (helpers are mutators).
- Diseases: `(character.diseases ?? [])`, per-symptom `getSymptomTest(s.name, s.severity)` (base name +
  severity, not `displayName`), `getDiseaseProgress(record).durationReached`. Same-name records are
  collapsed by distinct `diseaseName` so no two emitted ids collide; the most-progressed record drives the
  escalation. Verified `ActiveDisease.elapsedDays`, `ResolvedSymptom.{name,severity,displayName}`, and the
  lethal cadence strings (`'Daily (or die)'`, `'Daily (fail > TB times = lose location)'`) verbatim in
  `src/logic/diseases.ts` and `src/data/diseases.ts` (Blood Rot→Blight, Itching Pox→Pox confirmed).
- Critical wounds: reuses `getActiveCriticalWounds(character.criticalWounds)`.
- Learnable: reuses `advancement.ts` eligibility + cost helpers (`hasSpellcastingTalent`,
  `getSpellcastingTypes`, `countMemorizedByType`, `getSpellLearningCost`, `hasRitualMagicTalent`,
  `getCharacterLore`, `getCurrentLevelTalents`, `getAdvancementCost`) with signatures confirmed; no cost is
  recomputed. Bonus derivation (WPB petty / IntB else) mirrors `AdvancementPage.handleLearnSpell`; the
  ritual eligibility predicate matches AdvancementPage; the career/level guard (`careerLevelNum > 0` after
  the `findIndex(...) + 1` derivation) is present and the `TalentData.max` numeric gate is correctly
  omitted (it is a bonus-expression string, not a numeric cap).
- Downtime: `!hasActiveEndeavours(character)` guard guarantees mutual exclusion with `endeavour:active`;
  capacity from `period.slots`/`entries` only.

**Navigation targets are real.** `combat` (Fortune/Resolve, Critical Wounds — no `subTab`, since Combat
uses internal mode state), `character/notes` (Diseases — `VALID_SUBTABS` includes `'notes'`, DiseasePanel
renders in NotesTab), `advancement` (Learnable — no subTab), `endeavours` (Downtime). All confirmed against
`CharacterPage.tsx` and the integration test's route allow-list.

**New categories fully ranked.** `SuggestionCategory` gains `'health'` and `'resource'` in `types.ts`; both
appear in BOTH `IN_COMBAT_GROUP_ORDER` and `OUT_OF_COMBAT_GROUP_ORDER` (seven entries each, no unranked
category) and in `CATEGORY_LABELS` (`Health`, `Fortune & Resolve`). The extended ordering test asserts the
full seven-category order in both contexts.

**Tooltip rule.** No new suggestion displays a calculated total (Fortune/Resolve pools, disease names,
critical count, learnable prose are all raw reads, not derived sums), so none sets `totals` and no
`SuggestionItem` tooltip wiring change is needed — consistent with the calculated-totals steering.

**SuggestionItem label disambiguation.** `actionLabel` is correctly re-keyed on the owning suggestion's
`category` for the shared `character/notes` route (`health` → "View Diseases", `corruption` → "View
Corruption", else "Go"), applied to both primary and secondary buttons. Covered by `SuggestionItem.test.tsx`.

**Tests.** Each module has a unit/property suite covering appears-iff-trigger, determinism on a frozen
clone, and serializability (no functions, JSON round-trip). Mutual exclusion (downtime vs endeavour) and
base-target parity (`resolveReminderBaseTarget` == `getSymptomTestBaseTarget`) are asserted. The existing
engine purity/determinism/serializability suites are untouched (only the additive ordering test was added).
Badge-count == rendered-item-count holds structurally: `AssistantPanel` renders every item in
`suggestions`, and the trigger badge derives from the same filtered list length — the catalog expansion did
not alter that wiring.

## Blocking findings

### Finding 1 (BLOCKER — rules-compliance): critical-wounds death escalation omits the RAW `> Toughness Bonus` clause and mis-cites Core p.172

`src/logic/assistant/rules/critical-wounds.ts` escalates urgency to `'critical'` under:

```ts
const unconsciousAtZero =
  character.conditions.some(c => c.name === 'Unconscious') && character.wCur <= 0;
```

and attaches the citation `'Core p.172: Death'`, with a comment asserting this is "the RAW Death-check
condition." The design (§3 / OQ-5) justifies dropping the Critical-count-vs-Toughness-Bonus comparison on
the stated grounds that "we must not invent a threshold, and 'more Criticals than TB' is not a RAW trigger."

That justification is factually wrong. The cited page defines the Death check as (verbatim,
`docs/WarhammerFantasyRoleplay4e.md`, "Death", in the `_page_172` block):

> "If you take the Unconscious Condition and have 0 Wounds, compare the total number of Critical Wounds you
> currently suffer with your Toughness Bonus. **If you have more Critical Wounds than your Toughness Bonus**,
> you succumb to your horrific wounds and will die at the end of the round unless ... someone heals one of
> your Critical Wounds."

The Up In Arms alternative-injury rules (`docs/Up_In_Arms.md`, "death") state the identical trigger: "If
this number is greater than their Toughness Bonus, they succumb to their injuries and perish...". So the
`> Toughness Bonus` comparison IS the RAW death trigger in both authoritative sources — it is not an
invented threshold. The errata could not be read (PDF), but two rulebooks agree and nothing suggests an
override.

Consequence: a character who is Unconscious at 0 Wounds but carries ≤ TB Critical Wounds (RAW: falls
unconscious, does **not** die) is flagged `'critical'` with the label/citation "Core p.172: Death". The
module both (a) encodes a mechanic that diverges from the rule it cites, and (b) carries an inaccurate
citation for the escalation — a direct rules-compliance violation (the steering requires every encoded
mechanic to be cited accurately and not invented, with errata/RAW respected). The escalation is a UI
urgency signal (no game-state mutation, nothing auto-applies), so the blast radius is limited to incorrect
emphasis + a wrong citation, but the task's review focus names rules-compliance citation accuracy
explicitly, and the design's stated rationale for the omission is contradicted by the cited page.

Correction: gate the `'critical'` escalation on the full RAW condition —
`Unconscious present AND wCur <= 0 AND getActiveCriticalWounds(...).length > TB`, where
`TB = getBonus(character.chars.T.i + character.chars.T.a + character.chars.T.b)` (the same `getBonus` helper
already used across `calculators.ts`; no new math). Keep `'recommended'` otherwise. This restores
agreement with the `'Core p.172: Death'` citation and uses only existing helpers, inventing nothing. If the
owner instead wants to keep the simpler Unconscious-at-0 escalation as a deliberate UX choice, the citation
must be changed so it no longer claims to encode the p.172 Death check (e.g. drop to p.180-181 healing-
review framing), and the design's "not a RAW trigger" rationale corrected — but the straightforward fix is
to add the `> TB` clause.

## Non-blocking observations (not findings; no action required)

- OQ-2 / OQ-3 (critical-wound heal-readiness not computable; Critical Wounds panel visible only in Combat
  Status mode) remain accepted v1 limitations per the design and do not affect correctness of the emitted
  suggestion.
- Disease "due" timing has no in-session clock; escalation keys only on `durationReached` / lethal cadence,
  which is the shipped v1 decision and is deterministically tested.
