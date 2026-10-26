# Design Review — Character Assistant: Catalog Expansion (Five New Rule Modules)

Reviewed document: `.agents/tasks/character-assistant-catalog/design.md`
Review scope: design-only (no code exists yet; no build/test run). Every claim below was checked
against the live source rather than taken on the design's word.

## Verdict

**APPROVED.** Zero HIGH and zero MEDIUM findings. Two NITs are recorded for the implementer but do
not block.

This design has been through four prior review iterations and it shows: every character-model field
name, logic-helper signature, navigation target, category, and ordering claim it makes was confirmed
against the actual source. The two genuinely-open questions (OQ-2, OQ-3) are correctly flagged as open
and — verified below — do not change any emitted trigger or `urgency`, so they do not block v1.

---

## Findings

1. **NIT — Ritual affordability "reuse the same `RITUAL_LIST` filtering predicate" leaves the lore-match
   rule implicit.** §4 (`rules/learnable.ts`, Rituals bullet) says a ritual is affordable iff
   `xpCur >= ritual.learningXP` and it is "not already in `character.rituals`", and to "reuse the same
   `RITUAL_LIST` filtering predicate `AdvancementPage` uses." Verified in `AdvancementPage.tsx`
   (`availableRituals = RITUAL_LIST.filter(...)`) that the real predicate has a third branch the design
   does not restate: a ritual is excluded unless its lore is `"Any"`/`"Any Lore"` **or** matches
   `getCharacterLore(character)`, and the "already-learned" exclusion is keyed on `learnedRitualNames`
   (ritual **name**), not object identity. The design does mention `getCharacterLore` so the intent is
   present, but an implementer could ship a name-plus-XP-only filter and silently surface rituals of a
   lore the character cannot learn.
   **Fix:** state the predicate explicitly, e.g. "a ritual is a candidate iff
   `!learnedNames.has(r.name)` AND (`r.lore === 'Any' || r.lore === 'Any Lore' || r.lore === getCharacterLore(character)`), then affordable iff `xpCur >= r.learningXP`" — mirroring the
   `RITUAL_LIST.filter` branch in `AdvancementPage.tsx` lines ~1120-1123 verbatim.

2. **NIT — Per-type characteristic bonus for spell cost is specified by prose but the petty/arcane split
   should be pinned to a concrete expression.** §4 (Spells/miracles bullet) correctly states "WPB for
   petty, IntB for arcane; miracle/chaos ignore the bonus — pass IntB as `handleLearnSpell` does." Verified
   against `AdvancementPage.handleLearnSpell` (it computes only `intBonus = getBonus(Int…)` and relies on
   `getSpellLearningCost` ignoring the bonus for miracle/chaos). Because the Assistant iterates **all**
   `getSpellcastingTypes` in one pass (not one picker invocation per type like the page), the implementer
   must compute **both** `WPB` and `IntB` and select per type; `handleLearnSpell` only ever needed one.
   **Fix:** make the per-type selection explicit, e.g.
   `const bonus = type === 'petty' ? WPB : IntB; const cost = getSpellLearningCost(type, countMemorizedByType(character)[type], bonus);`
   with `WPB = getBonus(WP…)` and `IntB = getBonus(Int…)` both computed up front. (Behaviourally correct as
   written — this is purely a "don't copy the single-bonus shape of `handleLearnSpell`" clarification.)

---

## Verified Assumptions (checked against source)

Character model (`src/types/character.ts`):
- `fortune: number`, `fate: number`, `resolve: number`, `resilience: number` — all present as plain
  numbers. ✔
- `diseases?: ActiveDisease[]`, `knownRunes?: string[]`, `rituals?: RitualItem[]` — all optional, so the
  mandated `?? []` coalescing is required and correct. ✔
- `criticalWounds: CriticalWound[]` (non-optional); `CriticalWound` has `healed`/`healedAt` and **no**
  app heal-timer field — confirms OQ-2's "cannot compute ready-to-heal" framing. ✔
- `talents: Talent[]` with `Talent = { n, lvl, desc }`; `spells: SpellItem[]`; `xpCur: number`;
  `endeavours: DowntimePeriod[]` with `EndeavourEntry.status: 'pending'|'in_progress'|'completed'`. ✔
- `conditions: Condition[]` with `Condition = { name, level, duration?, source? }`; `wCur: number`. The
  OQ-5 escalation (`conditions.some(c => c.name === 'Unconscious') && wCur <= 0`) reads only real fields.
  ✔ The `'Unconscious'` condition name is confirmed present (`src/logic/conditions.ts`). ✔

Diseases (`src/logic/diseases.ts`):
- `getDiseaseProgress(disease)` → `{ elapsed, durationTotal, durationUnit, durationReached }`. ✔
- `getSymptomTest(symptomName, severity)` returns non-null for exactly **Blight, Buboes, Gangrene,
  Lingering, Wounded** (Endurance) and **Pox** (Cool); null for Convulsions, Coughs and Sneezes, Fever,
  Flux, Malaise, Nausea — matching §2's explicit six-symptom list. ✔
- Lethal cadence strings are verbatim: Blight `'Daily (or die)'`, Gangrene
  `'Daily (fail > TB times = lose location)'`. ✔
- `getSymptomTestBaseTarget(character, skill)` uses hardcoded `T`/`WP` keys + the matching skill's
  advances. `resolveReminderBaseTarget` (skill branch, `src/logic/reminders-target.ts`) reads the
  characteristic from `skill.c`. They agree by construction but read different sources — exactly as the
  design states, justifying the mandated parity integration test. ✔
- `ResolvedSymptom` = `SymptomEntry & { severity, displayName }`, and `getDiseaseSymptoms` parses the
  severity tag — so §2's "pass `s.name`, not `s.displayName`" is the correct call. ✔
- `addDisease` assigns `Math.max(...ids)+1` (auto-increment) with **no** `diseaseName` uniqueness; the
  real timestamp is the separate `contracted` field — confirming Finding-1's same-name collapse need and
  the "don't key id on `disease.id`" rule. ✔

Critical wounds (`src/logic/critical-wounds.ts`):
- `getActiveCriticalWounds(wounds)` filters `!healed` and is an otherwise-unused export (the design's
  intent to "activate" it is accurate). ✔

Advancement (`src/logic/advancement.ts`):
- `hasSpellcastingTalent`, `getSpellcastingTypes`, `countMemorizedByType`, `getSpellLearningCost`,
  `hasRuneMagicTalent`, `hasRitualMagicTalent`, `getCharacterLore` all exist with the cited behaviour. ✔
- `getAdvancementCost('talent', lvl, true)` = `100 * (lvl + 1)` — so `('talent', 0, true)` = 100, as §4
  states; the module never re-derives this. ✔
- `getCurrentLevelTalents(careerName: string, level: number): string[]` — takes the career **name** and
  numeric level, returns `[]` for an unknown scheme/level, exactly as §4 describes. ✔
- `isReadyToAdvance` derives `careerLevelNum = allLevels.findIndex(l => l.title === character.careerLevel) + 1`
  and early-returns on `careerLevelNum <= 0` / unknown scheme — the exact guard §4 says to mirror. ✔
- `getSpellLearningCost` clamps `bonus = Math.max(characteristicBonus, 1)` and the miracle/chaos branches
  do not use `bonus` — confirms "miracle/chaos are bonus-independent." ✔

Assistant engine/types/ordering:
- `SuggestionCategory` currently has exactly five members; `CATEGORY_LABELS` in `AssistantPanel.tsx` is a
  `Record<SuggestionCategory, string>` with five entries — so adding `'health'`/`'resource'` forces both
  the union edit and two label entries or `tsc` fails, exactly as the design claims (in-scope, not new
  UI). ✔
- `ordering.ts` `IN_COMBAT_GROUP_ORDER` / `OUT_OF_COMBAT_GROUP_ORDER` each currently list the five
  categories; the design's replacements list all seven (health + resource inserted), leaving none
  unranked. Within-group sort is urgency then `id` lexical — so `'advancement:learnable'` <
  `'advancement:unspent-xp'` (learnable sorts above unspent-xp), confirming iteration-3's corrected
  ordering prose. ✔
- `engine.ts` composes the five existing modules then `orderSuggestions`; the additive append of the five
  new modules (with `context` passed only to `learnable`/`downtime`) is consistent with the existing shape.
  ✔
- `reminderSuggestions(character, _ctx)` genuinely ignores its context arg — confirming the context note
  in the wiring section. ✔
- `SuggestionAction` navigate = `{ kind:'navigate'; page: PageSection; subTab? }`; roll =
  `{ kind:'roll'; test:{ def: ReminderTest; difficulty; rollName } }`. `ReminderTest` skill variant is
  `{ kind:'skill'; skillName; fallbackChar }` — the design's seeded disease roll shape is valid. ✔

Navigation targets:
- `PageSection = 'character'|'combat'|'retinue'|'estate'|'endeavours'|'advancement'|'settings'`
  (`navItems.ts`). All five modules route to real pages. ✔
- `FortuneResolvePanel` renders in **both** `CombatPage.tsx` (behind `!inCombat || combatMode === 'status'`)
  and `CharacteristicsSection.tsx` (Character `identity` sub-tab) — the design's two-location note and
  the deliberate choice of `page:'combat'` (no subTab, since CombatPage has no URL sub-tab) is accurate.
  ✔
- `DiseasePanel` lives in `NotesTab.tsx` (Character `notes` sub-tab); `VALID_SUBTABS` includes `'notes'`
  and `'identity'`. Target `{ page:'character', subTab:'notes' }` is valid. ✔
- `CriticalWoundsPanel` renders only under `inCombat && combatMode === 'status'` in `CombatPage.tsx` —
  confirming OQ-3's visibility limitation verbatim. ✔
- `AdvancementPage` is rendered with `{...pageProps}` and accepts no `subTab` — `{ page:'advancement' }`
  with no subTab is correct. ✔

Reuse / no-reinvented-math:
- Corruption (`rules/corruption.ts`) already uses the exact seeded-roll + `character/notes` secondary
  pattern the disease module copies, and its secondary relies on the current `actionLabel` "View
  Corruption" (secondary-only) branch — confirming Finding-1's mislabel analysis and the required
  `actionLabel` edit (`actionLabel(action, isPrimary)` hardcodes `'View Corruption'` for
  `!isPrimary && page==='character' && subTab==='notes'`; a primary falls through to `'Go'`). ✔
- `endeavourSuggestions` fires on `hasActiveEndeavours` with id `'endeavour:active'`; the new
  `downtimeSuggestions` gates on `!hasActiveEndeavours` with id `'endeavour:available'` — mutually
  exclusive by construction. ✔
- `fortune-resolve.ts` exports only spend/burn/reset/validate value-transforms — there is no read
  predicate to reuse, so the design's direct `character.fortune > 0 || character.resolve > 0` read is the
  correct choice (mirrors the engine reading `xpCur`), not a math-reinvention. ✔

## Unverified / Wrong Assumptions

None. Every substantive claim in the design was verified against the live source. The two open questions
the design leaves open (OQ-2 critical-wound heal framing; OQ-3 Critical Wounds panel out-of-combat
visibility) were checked and confirmed to be genuine rulebook/UI-visibility ambiguities that do **not**
alter any emitted trigger or `urgency`:

- OQ-2: `CriticalWound` has no heal-timer field (only `healed`/`healedAt`), so "review-only, no computed
  heal-readiness" is forced by the data model, not a design shortcut. ✔ (correctly flagged open)
- OQ-3: `CriticalWoundsPanel` is gated to `inCombat && combatMode === 'status'`; widening it would be a UI
  change (out of scope). The design ships navigate-to-combat and documents the limitation. ✔ (correctly
  flagged open)

## Rulebook-compliance / scope notes (not findings)

- Every encoded mechanic routes through an existing, already-cited logic helper (disease tests via
  `getSymptomTest`, spell/talent costs via `advancement.ts`, corruption-style seeded rolls via
  `resolveReminderBaseTarget`). No new cost/threshold/heal math is introduced. The one place the design
  **declines** to implement a reviewer-suggested gate (`lvl < TalentData.max`) is correct per the
  rules-compliance steering: `TalentData.max` is a characteristic-bonus **string** (verified in intent;
  the type is `max: string` in `character.ts`), not a numeric cap, and no helper resolves it — adding that
  would invent a mechanic. Omitting it and flagging it as backlog is the right call.
- Scope is honoured: additive engine-only logic, no new UI surface, intact `SuggestionSource` boundary,
  no new mutation path, no guided combat-turn walkthrough. The three forced in-scope edits
  (`SuggestionCategory` union, `CATEGORY_LABELS`, `SuggestionItem.actionLabel`) are all type/label/string
  fixes to existing surfaces, correctly justified.
- Tooltip (calculated-totals) rule: the design's decision that none of the five suggestions displays a
  **calculated total** (all shown numbers are raw stored pools / array lengths, not derived sums) is
  consistent with the `Suggestion.totals` contract and the existing corruption/encumbrance precedent. No
  tooltip wiring change is needed, and the design says so correctly.
