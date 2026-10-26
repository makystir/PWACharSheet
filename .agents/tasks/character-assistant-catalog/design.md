# Character Assistant — Catalog Expansion (Five New Rule Modules)

## Overview

This is an **additive** extension of the shipped Character Assistant. It adds five new deterministic
suggestion rule modules to `src/logic/assistant/rules/` and wires them into the existing pure engine
(`src/logic/assistant/engine.ts`). There is **no new UI surface**, **no backend/network/LLM**, and the
engine stays pure, deterministic, side-effect-free, and JSON-serializable (NFR-1 / FR-5.1 / FR-7). Every
suggestion routes its `action` through the existing `useAssistantActions` dispatcher — a `navigate`
descriptor to a real `PageSection` (+ optional `subTab`), or a `roll` descriptor that SEEDS the shared
`RollDialog` exactly as the existing reminder path does. Nothing auto-applies and nothing mutates the
character.

Each new module is a pure function `fooSuggestions(character: Character[, ctx]): Suggestion[]` that
follows the exact shape of the existing modules (`advancement.ts`, `corruption.ts`, `encumbrance.ts`,
`endeavours.ts`, `reminders.ts`): it reads character state and REUSES the relevant `src/logic/*` module
(never recomputing cost/threshold math), emits plain `Suggestion` objects with a `// Core p.NNN` comment
plus a `citation` string carried as data, and returns `[]` when its trigger is not met.

The new modules read already-computed state from existing logic modules:

- **Fortune/Resolve** — reads `character.fortune` / `character.resolve` directly (the spend helpers in
  `fortune-resolve.ts` are mutators, not predicates, so the trigger is a plain `> 0` read; see §1).
- **Diseases** — reads `character.diseases` and calls `getDiseaseProgress`, `getSymptomTest`,
  `getSymptomTestBaseTarget` from `diseases.ts`.
- **Critical wounds** — calls `getActiveCriticalWounds(character.criticalWounds)` from `critical-wounds.ts`.
- **Learnable options** — reuses `advancement.ts` eligibility + cost helpers (`hasSpellcastingTalent`,
  `getSpellcastingTypes`, `countMemorizedByType`, `getSpellLearningCost`, `hasRuneMagicTalent`,
  `hasRitualMagicTalent`, `getCharacterLore`) and never re-derives a cost.
- **Downtime endeavour** — reuses `hasActiveEndeavours` from `endeavours.ts` plus a plain read of
  `character.endeavours` to detect "capacity with no active work".

## Technology stack (locked)

TypeScript, the existing React 18 + Vite PWA, Vitest + fast-check for the engine's purity/determinism/
serializability property tests. No new runtime dependency is introduced. The new modules are plain
TypeScript functions in `src/logic/assistant/rules/`.

---

## Confirmed character-model field names (verified against `src/types/character.ts`)

| Concept                 | Exact field / source                                                                 |
|-------------------------|---------------------------------------------------------------------------------------|
| Fortune pool            | `character.fortune: number` (max = `character.fate` + Luck level)                     |
| Fate                    | `character.fate: number`                                                              |
| Resolve pool            | `character.resolve: number` (max = `character.resilience`)                            |
| Resilience              | `character.resilience: number`                                                        |
| Active diseases         | `character.diseases?: ActiveDisease[]` (optional; may be `undefined` on old saves)   |
| Disease progress        | `getDiseaseProgress(disease): DiseaseProgress` → `{ elapsed, durationTotal, durationUnit, durationReached }` |
| Disease symptom test    | `getSymptomTest(symptomName, severity): SymptomTest \| null` → `{ skill: 'Endurance'\|'Cool', difficulty, cadence }` |
| Symptom base target     | `getSymptomTestBaseTarget(character, skill): number`                                  |
| Critical wounds         | `character.criticalWounds: CriticalWound[]`; `getActiveCriticalWounds(wounds)` filters `!healed` |
| Spell learning state    | `character.spells: SpellItem[]`; `countMemorizedByType(character)`; talent gates via `hasSpellcastingTalent` / `getSpellcastingTypes` |
| Rune learning state     | `character.knownRunes?: string[]`; talent gate `hasRuneMagicTalent(character)`        |
| Ritual learning state   | `character.rituals?: RitualItem[]`; talent gate `hasRitualMagicTalent(character)`     |
| Talent learning state   | `character.talents: Talent[]` (`{ n, lvl, desc }`); XP cost via `getAdvancementCost('talent', lvl, inCareer)` |
| Spendable XP            | `character.xpCur: number`                                                             |
| Endeavour periods       | `character.endeavours: DowntimePeriod[]` (`{ id, label, slots, entries, ... }`); entry status `'pending'\|'in_progress'\|'completed'` |

Note: `diseases`, `knownRunes`, and `rituals` are optional on `Character`. Every new module must coalesce
(`character.diseases ?? []`, etc.) so it never throws on a pre-feature save (mirrors
`reminders.ts` coalescing `psychologyTraits ?? []` — NFR-6).

---

## Confirmed navigation targets (verified against `App.tsx`, `CombatPage.tsx`, `CharacterPage.tsx`, `AdvancementPage.tsx`, `navItems.ts`)

`PageSection = 'character' | 'combat' | 'retinue' | 'estate' | 'endeavours' | 'advancement' | 'settings'`.
The dispatcher calls `navigate(page, subTab)`; `subTab` is only honoured by pages that accept it.

- **Fortune & Resolve panel** — rendered in **two** places (verified): on the **Combat** page inside the
  "Fortune & Resolve" `CollapsibleSection`, shown when `!inCombat || combatMode === 'status'`
  (`CombatPage.tsx`), **and also** on the **Character** page's characteristics sub-tab
  (`CharacteristicsSection.tsx`, which renders `<FortuneResolvePanel .../>` directly). `CombatPage` does
  **not** accept a `subTab` prop (it uses internal `combatMode` state, not URL routing). **Target:
  `{ kind: 'navigate', page: 'combat' }`** with **no `subTab`**. **Why Combat and not Character/identity
  (Finding 2):** Combat is chosen as the panel's primary combat-adjacent home, where spending
  Fortune/Resolve is most actionable, and the section is always on screen out of combat (and reachable in
  Status mode in combat). The Character characteristics sub-tab is a valid alternative target
  (`page: 'character', subTab: 'identity'`) that is **deliberately not used** — routing a resource nudge to
  the combat surface keeps it next to the rolls it modifies. There is no deep-link into Combat's Status
  mode, so passing a `subTab` to Combat would be a no-op — do not fabricate one.
- **Diseases panel** — `DiseasePanel` lives on the **Character** page, **`notes`** sub-tab
  (`NotesTab.tsx`). `CharacterPage` accepts `subTab` and `VALID_SUBTABS` includes `'notes'`. **Target:
  `{ kind: 'navigate', page: 'character', subTab: 'notes' }`** (identical pattern to corruption's
  secondary action).
- **Critical Wounds panel** — `CriticalWoundsPanel` lives on the **Combat** page and only renders in
  `inCombat && combatMode === 'status'`. Same routing caveat as Fortune/Resolve: no `subTab` into Status.
  **Target: `{ kind: 'navigate', page: 'combat' }`** with no `subTab`. (See OQ-3 on the in-combat-only
  visibility of this panel.)
- **Advancement learning section** — the "Learn Spells & Prayers", "Learn Rituals", and Rune Learning
  panels live on the **Advancement** page. `AdvancementPage` is rendered with `{...pageProps}` only and
  does **not** accept a `subTab` prop. **Target: `{ kind: 'navigate', page: 'advancement' }`** with no
  `subTab` (identical to the existing `advancement:ready` / `advancement:unspent-xp` actions).

---

## SuggestionCategory and ordering (`ordering.ts`)

The task asks whether new `SuggestionCategory` values are needed. Decision:

- **Fortune/Resolve** and **Learnable options** and **Critical wounds** and **Diseases** → **introduce
  two new categories**: `'health'` (diseases + critical wounds — both are injury/condition review) and
  `'resource'` (Fortune/Resolve — a spendable-pool nudge). **Learnable options** reuses the existing
  `'advancement'` category (it is an advancement action and navigates to the Advancement page).
  **Downtime endeavour** reuses the existing `'endeavour'` category.

Rationale for two new categories rather than cramming into existing ones: diseases/criticals are
mechanically distinct from corruption (different panel, different tests) and from encumbrance; grouping
them under `'health'` gives the panel a coherent "injuries & ailments" section. Fortune/Resolve is a
resource-management nudge, not advancement or combat, so `'resource'` keeps it from mis-sorting into a
combat or advancement block. Keeping learnable-options under `'advancement'` avoids a third new category
for something that is literally an advancement activity.

`SuggestionCategory` becomes:

```ts
export type SuggestionCategory =
  | 'combat'
  | 'advancement'
  | 'endeavour'
  | 'encumbrance'
  | 'corruption'
  | 'health'      // NEW: diseases + unhealed critical wounds
  | 'resource';   // NEW: unspent Fortune / Resolve
```

**Both** group-order arrays in `ordering.ts` MUST list every category so none is unranked (the current
`groupRank` falls back to `groupOrder.length` for unknowns, but the task requires explicit placement).

- **In combat** (`IN_COMBAT_GROUP_ORDER`) — combat-first; health ranks high (injuries matter mid-fight),
  resource sits just under combat (spend Fortune/Resolve now), progression last:
  `['combat', 'health', 'encumbrance', 'corruption', 'resource', 'advancement', 'endeavour']`
  - **Caveat (cross-ref OQ-3):** `health` is ranked second in combat because a due disease test or an
    unhealed-critical reminder is genuinely urgent mid-fight. Note, however, that the **critical-wounds**
    suggestion's navigate target (the Critical Wounds panel) is only visible in `inCombat && combatMode
    === 'status'` (OQ-3), so following that suggestion from the Attack/Defend mode lands on the Combat
    page without the panel on screen. The high rank reflects *importance*, not guaranteed panel
    visibility; OQ-3 tracks the visibility limitation and its v1 acceptance. The disease suggestion (the
    other `health` member) routes to character/notes, which has no such mode gate.
- **Out of combat** (`OUT_OF_COMBAT_GROUP_ORDER`) — progression-first; health/resource are downtime
  review items ranked after advancement/endeavour:
  `['advancement', 'endeavour', 'corruption', 'health', 'encumbrance', 'resource', 'combat']`

The existing `CATEGORY_LABELS` map in `AssistantPanel.tsx` is `Record<SuggestionCategory, string>`, so it
MUST gain `health: 'Health'` and `resource: 'Fortune & Resolve'` or `tsc` fails (this is a required,
in-scope edit, not new UI — just two label entries). The `groupByCategory` logic is category-agnostic and
needs no change.

**Existing-test safety:** the `orderSuggestions` unit test passes only the five original categories and
asserts their relative order via `.map(s => s.category)`. Inserting new categories into the order arrays
does not change the relative order of the original five, and the new categories never appear in that test's
input — so the test stays green **unchanged**. The determinism and serializability property tests only
assert structural invariants (stable output, no functions), which the new modules preserve. No existing
engine test is modified.

---

## Rule module specifications

### 1. `rules/fortune-resolve.ts` — unspent Fortune / Resolve available

- **File / export:** `fortuneResolveSuggestions(character: Character): Suggestion[]`.
- **Trigger predicate:** `character.fortune > 0 || character.resolve > 0`. Reads the model fields
  directly; the `fortune-resolve.ts` helpers are spend/burn mutators (not read predicates), so there is
  no helper to call here — this is a plain state read, consistent with how the engine reads `xpCur`.
- **Emits (up to two independent suggestions, one per pool that is non-empty)** so a player with only
  Fortune doesn't see a Resolve nudge:
  - **Fortune** (when `fortune > 0`):
    - `id`: `'resource:fortune-available'`
    - `title`: `You have ${fortune} Fortune available`
    - `rationale`: `Spend Fortune to reroll a failed Test or add +1 SL.` (Core p.169 "Spending Fortune")
    - `category`: `'resource'`
    - `urgency`: `'info'`
    - `citation`: `'Core p.169: Spending Fortune'`
    - `action`: `{ kind: 'navigate', page: 'combat' }`
    - `totals`: NONE — see "Calculated totals" below.
  - **Resolve** (when `resolve > 0`):
    - `id`: `'resource:resolve-available'`
    - `title`: `You have ${resolve} Resolve available`
    - `rationale`: `Spend Resolve for immunity to Psychology until end of next round, or to remove Conditions.` (Core p.170 "Spending Resolve")
    - `category`: `'resource'`
    - `urgency`: `'info'`
    - `citation`: `'Core p.170: Spending Resolve'`
    - `action`: `{ kind: 'navigate', page: 'combat' }`
- **Visibility:** **both** in and out of combat. Fortune/Resolve are most actionable in combat but valid
  any time; `'info'` urgency keeps them low. Placement per the order arrays above.
- **Rulebook grounding:** Core p.169 "Fate & Fortune" / "Spending Fortune" (Reroll / +1 SL / act out of
  Initiative order); p.170 "Resilience and Resolve" / "Spending Resolve" (immunity to Psychology / ignore
  Critical Wound modifiers / remove a Condition). No mechanic invented — these only point the player at the
  existing spend UI. (Page numbers verified: the Fate & Resilience block follows the Master Condition List
  at Core p.168-171, carrying `_page_169`/`_page_170` markers.)

### 2. `rules/diseases.ts` — active disease needing attention

- **File / export:** `diseaseSuggestions(character: Character): Suggestion[]`.
- **Trigger predicate:** `(character.diseases ?? []).length > 0`. For each active disease, resolve its
  symptoms via `getDiseaseSymptoms(disease.diseaseName)` (returns `ResolvedSymptom[] | undefined`, each
  element `{ name, severity, displayName, ... }`). For each `ResolvedSymptom s`, call
  **`getSymptomTest(s.name, s.severity)`** — pass **`s.name`** (the base symptom name) and
  **`s.severity`**, NOT `s.displayName`. `displayName` embeds the severity suffix (e.g. `"Flux (Severe)"`)
  and will never match the `switch` inside `getSymptomTest`, silently returning `null` and mislabelling
  every disease as non-roll. A disease "needs a roll" when at least one of its symptoms returns a non-null
  `SymptomTest`.
  - **Roll-backed symptom set (made explicit — Finding 3):** `getSymptomTest` returns a non-null
    `SymptomTest` for **six** symptoms (verified verbatim in `src/logic/diseases.ts`): **Blight, Buboes,
    Gangrene, Lingering, Wounded** (all test **Endurance**, so `fallbackChar = 'T'`) and **Pox** (tests
    **Cool**, so `fallbackChar = 'WP'`). All other symptoms — **Convulsions, Coughs and Sneezes, Fever,
    Flux, Malaise, Nausea** — return `null` and are treated as non-roll (flat penalties / GM-triggered
    effects). The `fallbackChar` ternary (`skill === 'Endurance' ? 'T' : 'WP'`) already covers the Pox
    Cool case; the per-module unit test MUST include at least one **Cool/Pox** disease example (e.g. a
    disease carrying the Pox symptom) so the `WP` fallback path is exercised, not only the Endurance path.
    Do not under-handle Buboes/Lingering/Wounded/Pox: the "first non-null symptom" selection applies to all
    six, not just the two lethal ones (Blight/Gangrene).
- **Emission strategy (noise control):** emit **one suggestion per _distinct_ active disease name** (not
  per symptom, and not per record) to avoid flooding. For a disease that has at least one roll-backed
  symptom, prefer a **seeded roll** for the first such symptom; otherwise a **navigate** to the Diseases
  panel.
  - **Same-name collapse (Finding 1 — REQUIRED):** `addDisease` (`src/logic/diseases.ts`) imposes **no
    uniqueness on `diseaseName`** — a character can hold two active records of the same disease (e.g. two
    "Packchord Fever" records). Because each suggestion's `id` is derived from `diseaseName` alone
    (`'health:disease:<slug>'`), two same-name records would otherwise produce **two suggestions with an
    identical `id`**, breaking React list keys (`data-testid={suggestion-${id}}` and the list `key`), any
    future dismiss/snooze keyed on `id`, and the determinism/de-dupe property-test assumption.
    **Chosen fix: option (a) — collapse active diseases by _distinct_ `diseaseName` before emitting**, so
    the module iterates `[...new Set((character.diseases ?? []).map(d => d.diseaseName))]` (or an
    order-preserving distinct) and emits exactly one suggestion per distinct name. Option (b) — appending a
    per-name occurrence index to the id — is rejected as unnecessary complexity: the suggestion's
    rationale/test is **name-derived, not record-derived** (identical same-name records produce identical
    copy), so a second suggestion for the same name would be pure noise. Collapsing by name is both the
    simpler fix and the one that matches the "one per disease, noise control" intent. When same-name
    records differ in progress, the collapsed suggestion uses the **most-progressed** record for the
    `durationReached` escalation (pick the record with the largest `elapsedDays`, falling back to the first
    in array order on a tie) so a due test is never hidden behind a less-progressed duplicate.
  - **Roll-backed disease** (first symptom whose `getSymptomTest(...)` is non-null):
    - `id`: `'health:disease:<diseaseName-slug>'` (stable, namespaced; derive a deterministic slug from
      `diseaseName` so ordering by `id` is stable — do NOT key the `id` on `disease.id`. Correction
      (Finding 1): `disease.id` is **not** timestamp-based — `addDisease` assigns an **auto-incrementing**
      `Math.max(...ids)+1`; the real timestamp lives in the separate `contracted` field. Either way
      `disease.id` is history/insertion-order-dependent and so non-deterministic across saves, which is
      why the `id` must be derived from the stable `diseaseName` slug, not from `disease.id`).
    - `title`: `${diseaseName}: ${symptomTest.skill} Test (${symptomTest.cadence})`
    - `rationale`: the symptom's rule note, e.g. `A ${difficulty} ${skill} Test is due (${cadence}).`
    - `category`: `'health'`
    - `urgency` (**SHIPPED v1 rule — OQ-1 resolved, see below**): `'recommended'` by default; escalate to
      **`'critical'`** when `getDiseaseProgress(disease).durationReached === true` **OR** the triggering
      symptom has a **lethal cadence**, matched by the exact `SymptomTest.cadence` string returned by
      `getSymptomTest` — Blight's `'Daily (or die)'` or Gangrene's `'Daily (fail > TB times = lose
      location)'` (verified verbatim in `src/logic/diseases.ts`). Match these cadence strings exactly; do
      not fuzzy-match on substrings like "die" or "Daily". Rationale: a due/lethal test warrants acting
      now; a tracked-but-not-yet-due disease is a softer `recommended`.
    - `citation`: `'Core p.187-188: Disease Symptoms'` (+ `'Core p.186: Using Diseases'` where progress is
      the driver).
    - `action` (**seeded roll**, reusing the reminder test shape exactly as `reminders.ts` /
      `corruption.ts` do):
      ```ts
      {
        kind: 'roll',
        test: {
          def: { kind: 'skill', skillName: symptomTest.skill, fallbackChar: symptomTest.skill === 'Endurance' ? 'T' : 'WP' },
          difficulty: symptomTest.difficulty,
          rollName: `${symptomTest.skill} (${diseaseName})`,
        },
      }
      ```
      The dispatcher resolves `def -> baseTarget` through `resolveReminderBaseTarget`. For the standard
      `Endurance`/`Cool` skill definitions (linked to `T`/`WP`) this yields the **same base target** as
      `getSymptomTestBaseTarget(character, skill)`. Note the two read the characteristic from **different
      sources**: `getSymptomTestBaseTarget` uses a hardcoded key (`T` for Endurance, `WP` for Cool) plus
      the skill's advances, whereas `resolveReminderBaseTarget` (skill branch) reads the characteristic
      from the skill's own `skill.c` field. They agree by construction for the shipped `BLANK_CHARACTER`
      skill defs but could diverge on an edited/corrupt `skill.c`, so the mandated integration parity test
      (Testability §) MUST assert the agreement to catch any future divergence. No new roll math is
      introduced here.
    - **Primary/secondary assignment (made explicit):** for a roll-backed disease the seeded roll is the
      **primary** `action`; `secondaryAction` is `{ kind: 'navigate', page: 'character', subTab: 'notes' }`
      (view the Diseases panel). The primary button therefore reads the roll's `rollName`
      (`"${skill} (${diseaseName})"`); the **secondary** button must read **"View Diseases"** — see the
      required `SuggestionItem.tsx` edit below (Finding 1). Do **not** leave the secondary as the existing
      hardcoded "View Corruption".
  - **Non-roll disease** (no symptom yields a `SymptomTest`, e.g. Fever/Flux/Malaise which have flat
    effects): emit a navigate-only suggestion whose primary action opens the Diseases panel:
    - `id`: `'health:disease:<slug>'`, `title`: `${diseaseName}: review disease progress`,
      `urgency`: `'info'` (or `'recommended'` if `durationReached`), `category`: `'health'`,
      `action`: `{ kind: 'navigate', page: 'character', subTab: 'notes' }` (**primary; no secondary**),
      `citation`: `'Core p.186-188: Using Diseases'`.
    - **Button label (made explicit):** the primary button must read **"View Diseases"**, not a bare
      "Go". This is delivered by the same `SuggestionItem.tsx` `actionLabel` change (Finding 1), which must
      apply to the **primary** character/notes navigate as well (the old code only special-cased the
      secondary, so without the fix this primary button would read "Go").
- **Visibility:** **both** — a disease test can come due mid-session. Low/medium urgency keeps it from
  dominating combat.
- **Rulebook grounding:** Core p.185-186 "Using Diseases" (Incubation/Duration), p.187-188 symptom tests.
  All test skill/difficulty/cadence come straight from `getSymptomTest` (already rulebook-cited in
  `diseases.ts`); this module invents nothing and only surfaces what that module computed.
- **OQ-1 — RESOLVED (shipped v1 decision, confirmed by the project owner):** exactly when a symptom test
  is "due" has no single RAW trigger (the app has no in-session per-day symptom clock; `getDiseaseProgress`
  only reports whether the rolled **Duration** has elapsed). **Shipped rule:** the trigger to surface the
  roll is "the disease has at least one roll-backed symptom" (`getSymptomTest` returns non-null); escalate
  to `'critical'` only when `getDiseaseProgress(disease).durationReached === true` OR the triggering
  symptom has a lethal cadence, matched against the exact `SymptomTest.cadence` strings Blight
  `'Daily (or die)'` / Gangrene `'Daily (fail > TB times = lose location)'`. Otherwise `'recommended'`.
  This is the v1 behaviour; the "surface every active disease at `'recommended'`" alternative is backlog,
  not shipped. Grounded in Core p.186-188 (all test skill/difficulty/cadence come from `getSymptomTest`,
  already rulebook-cited; nothing invented).

### 3. `rules/critical-wounds.ts` — unhealed critical wounds

- **File / export:** `criticalWoundSuggestions(character: Character): Suggestion[]`.
- **Trigger predicate:** `getActiveCriticalWounds(character.criticalWounds).length > 0` (reuses the
  existing `critical-wounds.ts` helper — the design intentionally activates its so-far-unused export).
- **Emission (single summary suggestion — noise control):**
  - `id`: `'health:critical-wounds'`
  - `title`: `${n} unhealed Critical Wound${n === 1 ? '' : 's'}` where `n = active.length`
  - `rationale`: `Critical Wounds do not count as healed until all Conditions they inflict are removed and all non-permanent modifiers are resolved — review healing requirements (Core p.180-181).`
  - `category`: `'health'`
  - `urgency` (**SHIPPED v1 rule — OQ-5 resolved to the RAW-exact trigger; NO invented threshold**):
    `'recommended'` normally (a plain "you have N unhealed Critical Wounds — review them"). Escalate to
    **`'critical'`** **only** under the actual RAW Death-check condition (Core p.172 "Death"): the
    character has the **Unconscious** Condition present AND current Wounds are at or below zero, i.e.
    `character.conditions.some(c => c.name === 'Unconscious') && character.wCur <= 0`. Both fields are
    plain reads (`conditions: { name, level }[]` and `wCur: number`, verified in
    `src/types/character.ts`); no count-based or Toughness-Bonus-based escalation is used. The earlier
    TB-vs-count heuristic is **removed** — per the rules-compliance steering we must not invent a
    threshold, and "more Criticals than TB" is not a RAW trigger. (Carrying N Critical Wounds is itself
    only `recommended`; death in WFRP4e keys on being Unconscious at 0 Wounds, not on the Critical count.)
  - `citation`: `'Core p.180-181: Healing Critical Wounds'` (healing-review rationale) and
    `'Core p.172: Death'` (the Unconscious-at-0-Wounds escalation).
  - `action`: `{ kind: 'navigate', page: 'combat' }` (Critical Wounds panel, Status mode).
  - `totals`: NONE (the "N wounds" count is a plain array length, not a derived/summed stat — see
    "Calculated totals").
- **Visibility:** **both** — reviewing unhealed criticals matters in and out of combat. The panel itself
  is in-combat-only (see OQ-3), but the suggestion's job is to point there and remind of healing rules.
- **Rulebook grounding:** Core p.180-181 "Healing Critical Wounds" / "Healing Hands" (p.178-180 injury
  healing); Core p.172 "Death" for the RAW-exact escalation (Unconscious Condition present AND `wCur <= 0`).
  No healing-time mechanic is fabricated and no count/TB threshold is invented.
  (Page numbers verified against `docs/WarhammerFantasyRoleplay4e.md`: the "Death" heading falls between
  the `_page_172` markers; the "Healing Critical Wounds" heading is the last Injury subsection, sitting
  between the `_page_178` and `_page_181` markers, and the rulebook **index** lists "Healing Critical
  Wounds 181" — so the content straddles the p.180/181 boundary and is cited as `p.180-181` to match the
  index. Earlier drafts cited a bare p.173/p.180/p.181 — corrected to the range here.)
- **OPEN QUESTION (OQ-2):** WFRP4e does not give critical wounds a fixed numeric "heals in N days" value
  that the app tracks — healing is Condition/modifier-resolution + GM-adjudicated rest, and
  `CriticalWound` has no app-tracked heal timer (only `healed`/`healedAt`). So the suggestion can only
  *remind of the requirement* and route to the panel; it cannot compute a "ready to heal" state. Confirm
  this framing (review-only, no computed heal-readiness) is acceptable.

### 4. `rules/learnable.ts` — learnable options you can afford

- **File / export:** `learnableSuggestions(character: Character, ctx: SuggestionContext): Suggestion[]`
  (two-argument — it branches on `ctx.inCombat`; see the context-sensitivity contract under Engine wiring).
- **Trigger + cost reuse (NO reinvented math):** gate on `character.xpCur > 0`, then test eligibility and
  affordability strictly through `advancement.ts` helpers:
  - **Spells/miracles:** `hasSpellcastingTalent(character)` → `getSpellcastingTypes(character)` → for each
    type, `countMemorizedByType(character)[type]` gives the current count and
    `getSpellLearningCost(type, count, bonus)` gives the next cost. The `bonus` is **WPB for petty, IntB
    for arcane**; for **miracle/chaos** `getSpellLearningCost` ignores the bonus entirely (miracle cost =
    `100 × known`, chaos cost = always 100), so the value passed is irrelevant for those two types — pass
    `IntB` exactly as `AdvancementPage.handleLearnSpell` does (`charBonus = type === 'petty' ? WPB : IntB`),
    which is bonus-independent for miracle/chaos. Affordable iff `xpCur >= cost`.
  - **Rituals:** `hasRitualMagicTalent(character)` + `getCharacterLore(character)`; a ritual is affordable
    iff `xpCur >= ritual.learningXP` and it is not already in `character.rituals`. (Reuse the same
    `RITUAL_LIST` filtering predicate `AdvancementPage` uses.)
  - **Talents (fully specified — OQ-4 resolved to "keep, generic nudge only"):** the Assistant must not
    reinvent *which* talent a character may select (that is GM/career-gated), so module 4 emits only a
    generic "you have XP for an eligible talent" cue. The predicate is defined precisely:
    - **Candidate set:** the current career level's talent list,
      `getCurrentLevelTalents(character.career, careerLevelNum)` (signature is
      `getCurrentLevelTalents(careerName: string, level: number): string[]` — verified in
      `src/logic/advancement.ts`; it takes the career **name** and numeric **level**, not the character).
      `careerLevelNum` is the character's current numeric career level. Note `character.careerLevel` is a
      **string title**, not a number — derive the index exactly as `advancement.ts` does:
      `allLevels.findIndex(l => l.title === character.careerLevel) + 1` (where `allLevels` is the career's
      ordered level list from `CAREER_SCHEMES[character.career]`). Reuse that derivation (or a shared helper
      if one is factored out); do **not** invent a new level lookup. This is the same value `advancement.ts`
      passes when it calls `getCurrentLevelTalents` for its own current-level gating (Core p.47 "Talents are
      only available when you are in the level of the Career that lists them"). No other talents are
      candidates.
      - **Unresolvable career/level guard (Finding 6 — made intentional):** when the career/level cannot be
        resolved — `careerLevelNum <= 0` (the `findIndex(...) + 1` derivation yields `0` when
        `character.careerLevel` matches no level title) **or** `character.career` is unset/unknown (so
        `CAREER_SCHEMES[character.career]` misses) — the candidate set is **empty** and the **talent
        portion is omitted** entirely. This mirrors `isReadyToAdvance`'s `careerLevelNum <= 0` early guard
        in `advancement.ts`. The module MUST check `careerLevelNum > 0` (and a resolved career) before
        relying on `getCurrentLevelTalents` rather than depend on the incidental fact that
        `getCurrentLevelTalents` happens to return `[]` for a `level${0}` scheme miss — the empty-candidate
        path is thus intentional, not accidental. Spell/ritual affordability is independent of this guard
        and still evaluates normally.
    - **Per-candidate current `lvl`:** for each candidate talent name, its current level is the matching
      `character.talents[].lvl` (name-matched the same way `advancement.ts` matches — exact name or the
      `n (…)`/` (…)` grouping-suffix match), or `0` if the character does not yet have that talent.
    - **Cost (no reinvented math):** the next-advance cost of a candidate is
      `getAdvancementCost('talent', lvl, true)` — `inCareer = true` because current-level career talents
      are always in-career (Core p.47), and `lvl` is the candidate's current level (so a not-yet-owned
      talent costs `getAdvancementCost('talent', 0, true)` = 100). The module never recomputes the
      `100 × (lvl+1)` formula itself.
    - **Trigger:** emit the talent portion of the summary iff `xpCur >= 100` **and** at least one candidate
      is affordable, i.e. `xpCur >= getAdvancementCost('talent', lvl, true)` for that candidate. This is a
      pure read of existing helpers + the shipped career-talent list; no selection logic is reinvented,
      only affordability of an already-eligible advance is checked.
    - **Deliberate deviation from the review's literal fix (with reason — DO NOT add a numeric max gate):**
      Finding 3's recommended wording was "purchasable iff current `lvl` < `TalentData.max`". That gate is
      **omitted** because `TalentData.max` in the shipped data (`src/data/talents.ts`) is a **characteristic-
      bonus expression string** (e.g. `"BS Bonus"`, `"I Bonus"`, `"None"`), not a numeric cap, and
      `advancement.ts` does **not** anywhere resolve that string into a numeric talent ceiling. Resolving it
      (e.g. `lvl < getBonus(BS)`) would be **new, invented talent-cap logic** — exactly what the
      rules-compliance steering forbids. For a generic "you have XP for a talent" nudge, gating on
      affordability of the next in-career advance is sufficient and fully rulebook-grounded (Core p.44-45
      cost table, Core p.47 current-level gating). If a future revision wants to suppress the nudge for an
      already-maxed talent, that requires a separate, verified talent-cap helper first — flagged as backlog,
      not implemented here. (This is the one place where the review's literal suggestion is **not** taken;
      the deviation stays inside the original brief because it avoids inventing a mechanic.)
- **Emission (strong noise control — ONE summary suggestion, never one per option):**
  - `id`: `'advancement:learnable'`
  - `title`: `You can afford to learn something new`
  - `rationale`: a compact summary of which kinds are affordable, e.g.
    `You have XP for: a Petty spell, a Ritual, and an eligible Talent.` — built from the set of affordable
    categories, not an enumeration of every spell/ritual.
  - `category`: `'advancement'`
  - `urgency`: `'info'`. **Ordering within the `advancement` group (corrected — see review Finding 1):**
    `orderSuggestions` sorts a group by urgency (critical→recommended→info) then by `id` lexically
    ascending. `advancement:learnable` therefore sorts **below** `advancement:ready` (which is
    `recommended`, so it always precedes any `info` item) and, among the `info` items, **lexically before**
    `advancement:unspent-xp` (`'advancement:learnable'` < `'advancement:unspent-xp'`). Both placements are
    acceptable and intended; **no id gymnastics are used** to force "learnable last". The earlier draft's
    claim that learnable "sits below `advancement:unspent-xp`" was factually inverted and is retracted —
    learnable sorts *above* `unspent-xp`, which is fine (it is a soft nudge that reads before the raw
    unspent-XP reminder but after the actionable ready-to-advance one). Note the two never render together
    in the ready state anyway: `advancementSuggestions` returns **either** `advancement:ready`
    (`recommended`, early-return) **or** `advancement:unspent-xp` (`info`), never both.
  - `citation`: `'Core p.44-45: Spell/Talent XP Costs'` plus `'Core p.142/p.140: Petty/Arcane/Invoke'`
    where spell learning drives it; cite `'Core p.48'` only for career-talent context. (Match the
    `// Core p.NNN` comments already present in `advancement.ts`.)
  - `action`: `{ kind: 'navigate', page: 'advancement' }`.
  - `totals`: NONE (the summary is prose, not a single derived number — see "Calculated totals").
- **Visibility:** **out of combat ONLY** — learning is a downtime/advancement activity and would be noise
  mid-fight. The module itself can be pure/unconditional, but the engine passes `context` and the module
  returns `[]` when `context.inCombat` is true (same pattern the ordering already assumes; spell it out in
  the module signature as `learnableSuggestions(character, ctx)` so the suppression is explicit and
  testable). **This is one of the two combat-suppressed modules** (the other is `downtimeSuggestions`, §5);
  the three remaining new modules are never suppressed (see the context-sensitivity contract under Engine
  wiring).
- **Rulebook grounding:** all costs come from `advancement.ts` (Core p.44-45 cost tables; p.140/142 spell
  costs) — the module calls the existing cost functions and compares to `xpCur`; it never computes a cost.

### 5. `rules/downtime.ts` — downtime endeavour opportunity (out of combat)

- **File / export:** `downtimeSuggestions(character: Character, ctx: SuggestionContext): Suggestion[]`.
- **Complement to the existing `endeavours.ts` rule:** `endeavourSuggestions` fires on *active*
  (pending/in_progress) endeavours. This module fires in the **complementary** state — the character has
  downtime capacity but nothing in flight.
- **Trigger predicate (derived strictly from existing state, no invented mechanic):**
  - `ctx.inCombat === false` (out of combat only), AND
  - `!hasActiveEndeavours(character)` (reuse the `endeavours.ts` predicate — guarantees this never
    double-fires with `endeavour:active`), AND
  - there is *capacity*: either (a) there is at least one `DowntimePeriod` with free slots
    (`period.entries.filter(e => e.status !== 'completed').length < period.slots`), OR (b) there are no
    downtime periods at all (`character.endeavours.length === 0`) — i.e. the player can start one.
  - **Decision between (a)/(b):** emit for **either**, but with different copy (below). This keeps the rule
    grounded in real state (`slots`, `entries`, period count) rather than inventing a "downtime is now"
    signal.
- **Emission (single suggestion):**
  - `id`: `'endeavour:available'`
  - `title`: periods-with-free-slots → `You have open Endeavour slots`; no periods →
    `Start a downtime Endeavour`
  - `rationale`: `Between adventures you can spend Endeavours on Income, Training, Research, and more.`
  - `category`: `'endeavour'`
  - `urgency`: `'info'`
  - `citation`: `'Core p.194-195: Endeavours (Between Adventures)'`
  - `action`: `{ kind: 'navigate', page: 'endeavours' }`
- **Visibility:** **out of combat ONLY** (by the `ctx.inCombat` gate).
- **Rulebook grounding:** Core Chapter 6 "Between Adventures", Endeavours p.194-195 (General Endeavours
  p.196). (Verified against `docs/WarhammerFantasyRoleplay4e.md`: the ToC lists "Endeavours" at p.195 /
  "General Endeavours" at p.196; the overview rule — "max one Endeavour per week, max three in total" —
  sits just before the `_page_194` marker, so the chapter opener straddles p.194-195. Cited as the range
  to avoid implying a single-page precision the source does not give.) The number
  of slots is the app's existing status-tier model (`getDefaultSlots`, brass/silver/gold = 1/2/3) already
  in `endeavours.ts` — this module only reads `period.slots`/`entries`, it does not recompute slot counts.

---

## Engine wiring (`engine.ts`)

`getSuggestions(character, context)` composes the new modules into the `raw` array alongside the existing
five, then orders as today. The two context-sensitive modules receive `context`:

```ts
const raw = [
  ...advancementSuggestions(character),
  ...endeavourSuggestions(character),
  ...encumbranceSuggestions(character),
  ...corruptionSuggestions(character),
  ...reminderSuggestions(character, context),
  // NEW
  ...fortuneResolveSuggestions(character),
  ...diseaseSuggestions(character),
  ...criticalWoundSuggestions(character),
  ...learnableSuggestions(character, context),   // suppressed in combat
  ...downtimeSuggestions(character, context),     // out-of-combat only
];
return orderSuggestions(raw, context);
```

Order of composition does not affect output (ordering is a total sort on category→urgency→id), but listing
the new modules after the originals keeps the diff additive and readable. The `deterministicSuggestionSource`
wrapper is unchanged.

**Context-sensitivity contract (explicit — do not deviate):** only **two** of the five new modules receive
and branch on `context`:

- `learnableSuggestions(character, context)` — returns `[]` when `context.inCombat === true`.
- `downtimeSuggestions(character, context)` — returns `[]` when `context.inCombat === true`.

Note on the **existing** `reminderSuggestions(character, context)` in the composition snippet above: it
takes `context` for signature compatibility but **currently ignores it** (its signature is
`reminderSuggestions(character, _ctx)` — it derives reminders from conditions/psychology only, verified in
`reminders.ts`). It is **not** one of the two context-branching new modules; the snippet passes `context`
only to keep the call shape uniform.

The other **three** new modules are **single-argument** and must **never** self-suppress on combat state:

- `fortuneResolveSuggestions(character)` — no `context` parameter.
- `diseaseSuggestions(character)` — no `context` parameter.
- `criticalWoundSuggestions(character)` — no `context` parameter.

These three are visible in **both** in-combat and out-of-combat; their in-vs-out placement is governed
**entirely** by the ordering layer (`IN_COMBAT_GROUP_ORDER` / `OUT_OF_COMBAT_GROUP_ORDER`), **not** by any
gate inside the module. A coder must **not** add a `ctx`/`inCombat` parameter or early-return to these
three — doing so would hide a disease test or unhealed-critical reminder exactly when it is most relevant
(mid-fight) and would contradict the ordering design. The module signatures in §1/§2/§3 are therefore
`(character: Character): Suggestion[]` with no second argument, and §4/§5 are
`(character: Character, ctx: SuggestionContext): Suggestion[]`.

---

## Calculated totals / tooltip rule (calculated-totals steering)

The `Suggestion.totals` field drives the breakdown-tooltip wiring in `SuggestionItem.tsx`
(`Tooltip` + `TooltipTriggerCell`). The steering rule requires a breakdown tooltip wherever a **calculated
total** (a summed/derived stat) is displayed.

**Decision: none of the five new suggestions displays a calculated total, so none sets `totals`.** The
numbers these suggestions show are all **raw model counts, not derived sums**:

- Fortune/Resolve: `character.fortune` / `character.resolve` are stored pool values, not computed from
  components in the UI. (Their *maxima* are derived — `fate + Luck`, `resilience` — but the suggestion
  displays the *current pool*, a single stored number, not a max or a sum.)
- Diseases: the title shows a disease name + test descriptor; no total.
- Critical wounds: `N unhealed` is an array length, not a derived/summed stat.
- Learnable: a prose summary, no number displayed as a total.
- Downtime: no number displayed.

This mirrors the existing `corruption`/`encumbrance` modules, which set `totals` **because** they show a
genuine derived value (`corr / threshold`, `current / max`) with a component breakdown. If a future
revision chooses to display, say, `fortune / (fate + Luck)` as a derived max, that WOULD require a
`totals` entry with lines `["Fate N", "Luck L", "= Max M"]` rendered through the existing SuggestionItem
tooltip wiring — but v1 deliberately shows only the raw pool to stay out of that obligation. **No `totals`
wiring change is needed in `SuggestionItem.tsx`** (the breakdown-tooltip path is untouched). A **separate**,
unrelated `SuggestionItem.tsx` edit *is* required for action-button labelling — see below.

---

## Required `SuggestionItem.tsx` edit — `actionLabel` disambiguation (Finding 1/2)

The existing `actionLabel()` hardcodes the only `character` + `notes` navigate case to the literal string
`'View Corruption'`, and only for the **secondary** button (`!isPrimary`); a **primary** navigate falls
through to `'Go'`:

```ts
function actionLabel(action: SuggestionAction, isPrimary: boolean): string {
  if (action.kind === 'roll') return action.test.rollName;
  if (!isPrimary && action.page === 'character' && action.subTab === 'notes') {
    return 'View Corruption';
  }
  return 'Go';
}
```

Because the disease suggestions reuse the **identical** route (`page: 'character', subTab: 'notes'`) for
both a roll-backed disease's *secondary* button and a non-roll disease's *primary* button, this helper
would (a) mislabel the disease secondary as "View Corruption", and (b) render the non-roll disease primary
as a bare "Go". Both are visible, incorrect UI strings — so the earlier draft's claim of "no
`SuggestionItem.tsx` change" is **wrong** and is retracted here.

**Required change (in scope — a labelling fix, not a new UI surface):** key the `character/notes` navigate
label off the owning suggestion's `category` and apply it to **both** primary and secondary buttons. Thread
the owning `Suggestion` (or just its `category`) into `actionLabel`, which already receives the action at
both call sites inside `SuggestionItem`:

```ts
function actionLabel(action: SuggestionAction, category: SuggestionCategory): string {
  if (action.kind === 'roll') return action.test.rollName;
  if (action.kind === 'navigate' && action.page === 'character' && action.subTab === 'notes') {
    // Several panels live under character/notes; disambiguate by owning category.
    // Explicit mapping (Finding 5): do NOT use a binary health-vs-else, which would
    // mislabel any FUTURE non-health category routing to character/notes as "View Corruption".
    if (category === 'health') return 'View Diseases';
    if (category === 'corruption') return 'View Corruption';
    return 'Go';
  }
  return 'Go';
}
```

Call sites become `actionLabel(suggestion.action, suggestion.category)` and
`actionLabel(suggestion.secondaryAction, suggestion.category)`. This preserves corruption's existing
"View Corruption" (`category: 'corruption'`), adds "View Diseases" for `category: 'health'` disease
suggestions, degrades safely to **"Go"** for any other (future) category that might route to
character/notes rather than falsely claiming "View Corruption", and drops the now-unnecessary `isPrimary`
parameter. No corruption behaviour changes; the only new strings are "View Diseases" on the
disease suggestions. This edit must be covered by the integration/unit tests (assert a `health` +
`character/notes` action labels "View Diseases" and a `corruption` one still labels "View Corruption").

---

## Error handling (per operation)

The modules are pure and read-only; the failure modes are malformed/absent input, not I/O:

- **Absent character** — handled upstream: `getSuggestions` returns `[]` for `undefined` before any module
  runs (NFR-6). Modules are never called with `undefined`.
- **Optional arrays undefined** (`diseases`, `knownRunes`, `rituals`) — each module coalesces to `[]`
  (`character.diseases ?? []`) so iteration never throws. Recoverable; result is simply "no suggestion".
  Not logged (absence is normal).
- **Unresolved disease/symptom name** — `getDiseaseSymptoms` already defensively filters unresolved
  symptom refs and returns `undefined` for an unknown disease; the module treats `undefined`/empty as
  "no roll-backed symptom" and falls back to the navigate-only disease suggestion. Recoverable, not logged.
- **`getSymptomTest` returns `null`** — treated as "non-roll disease" → navigate-only. Expected, not an
  error.
- **Unknown `SuggestionAction.kind` at dispatch** — already handled by `useAssistantActions`' exhaustive
  `default` (warn + no-op, never a crash). The new modules only emit `navigate`/`roll`, both understood.
- **Roll seed resolution** — `resolveReminderBaseTarget` reads the sheet defensively (falls back to
  `fallbackChar` when the named skill is absent, and `character.chars[charKey] ?? character.chars[fallback]`
  for a bad characteristic key). The disease roll always supplies a valid `fallbackChar` (`'T'` or `'WP'`),
  so a missing Endurance/Cool skill degrades to the bare characteristic — the same contract the existing
  reminder/corruption rolls rely on. No new failure path.

Because the engine is pure and side-effect-free, there is no logging layer inside it; any diagnostics stay
in the UI dispatcher (unchanged).

## Input validation (external inputs)

The only "external input" is the `Character` object (already validated/migrated by the store) and the
`SuggestionContext.inCombat` boolean (owned by the caller). Per module:

- Numeric reads (`fortune`, `resolve`, `xpCur`, counts) are used only in `> 0` / comparison predicates;
  a `NaN`/negative from a corrupt save fails the predicate and yields no suggestion (safe default).
- `context.inCombat` is a required boolean; the two gated modules branch on it directly.
- No user free-text reaches these modules; disease/symptom names are matched against the fixed catalogues
  in `diseases.ts`.

## Invariant ownership

- **Determinism** — owned by `ordering.ts` (total sort) plus the modules' use of a **deterministic `id`**
  (name-slug, never an insertion-order id like `disease.id`/`criticalWound.id` nor a timestamp like
  `disease.contracted`). This is the key new invariant: **suggestion `id`s must not embed
  auto-increment/insertion-order ids, timestamps, or array indices**, or the determinism property test
  could flake. Enforced at the module layer. **Intra-name uniqueness (Finding 1):** because `addDisease`
  does not enforce distinct `diseaseName`, the disease module additionally collapses active diseases by
  distinct name before emitting (one suggestion per distinct `diseaseName`), so no two emitted suggestions
  can share a `'health:disease:<slug>'` id. Enforced at the disease-module layer.
- **Serializability** — owned by the module layer: every `action`/`totals` value is plain data (the
  `roll` test reuses the already-serializable `ReminderTest` shape). The existing serializability property
  test covers the composed output and will cover the new items once they can trigger under its arbitraries
  (extending that arbitrary is optional and additive, not required for the test to stay green).
- **No double-fire between `endeavour:active` and `endeavour:available`** — owned by `downtime.ts` via the
  shared `hasActiveEndeavours` guard (the two are mutually exclusive by construction).
- **Category completeness in ordering** — owned by `ordering.ts`: both arrays list all seven categories.

## Testability

- **Unit-testable (pure, no React):** each module in isolation — trigger on/off, correct `id`/`category`/
  `urgency`/`citation`/`action`, `urgency` escalation (disease `durationReached`/lethal cadence; criticals
  escalate only when the Unconscious Condition is present AND `wCur <= 0`), the in-combat suppression of
  `learnableSuggestions`, and the `endeavour:active` vs
  `endeavour:available` mutual exclusion. New per-module test files alongside the existing
  `__tests__/engine.test.ts` (which imports `advancementSuggestions` directly — same pattern).
- **Property-testable:** determinism (same input → same ordered output, incl. stable `id`s) and
  serializability (no functions in any emitted `action`/`totals`) — the existing property suites already
  assert these over the composed engine and remain valid.
- **Integration-testable:** the navigate targets resolve to real routes/sub-tabs (verified above); a light
  integration test can assert each action's `page`/`subTab` is one the corresponding page actually honours.
  Two additional assertions are required: (1) **action labelling** — a `health` suggestion with a
  `character/notes` navigate labels **"View Diseases"** and a `corruption` one still labels "View
  Corruption" (covers the Finding-1 `actionLabel` edit on both primary and secondary buttons); (2) **roll
  base-target parity** — for an Endurance and a Cool disease symptom, the value `resolveReminderBaseTarget`
  returns for the seeded `def` **equals** `getSymptomTestBaseTarget(character, skill)`, so a future change
  to either helper cannot silently diverge the seeded target (the design relies on this agreement).
- **Hard-to-test corners** (flagged): the "disease test is due" timing (OQ-1, now a shipped decision) has
  no deterministic in-session clock to assert against, so its test can only cover the
  `durationReached`/lethal-cadence escalation, not a true "due today" moment. This is acceptable: the
  shipped v1 rule deliberately keys escalation on `durationReached`/lethal cadence (both deterministically
  testable) rather than a per-day clock.

---

## Non-goals (honored)

- No guided combat-turn walkthrough.
- No new UI surface. Three small, in-scope edits to existing files are required and forced by correctness:
  the `SuggestionCategory` union and the `CATEGORY_LABELS` map (both forced by `tsc`), plus the
  `SuggestionItem.tsx` `actionLabel` disambiguation (forced by the disease secondary/primary label
  correctness — Finding 1/2). None of these adds a new component, panel, route, or interaction — they are
  type/label/string fixes to surfaces that already exist.
- Nothing auto-applies; every action routes through the existing `navigate`/seeded-roll dispatcher with no
  new mutation path.
- Additive only; existing engine purity/determinism/serializability property tests stay green **unchanged**.

---

## OPEN QUESTIONS (flagged, not guessed)

Status after iteration 3: **OQ-1, OQ-4, and OQ-5 are RESOLVED** as shipped v1 decisions (OQ-1/OQ-5
confirmed by the project owner in response to the review). **OQ-2 and OQ-3 remain genuinely open** — they
are review-only/visibility framing questions that do not change any emitted `urgency` or trigger, so they
do not block implementation of v1 (both have a recommended default: review-only framing for OQ-2, and the
accept-the-v1-limitation option (a) for OQ-3).

- **OQ-1 (disease test "due") — RESOLVED, shipped v1 (confirmed by the project owner):** RAW gives symptom
  test *cadences* ("Daily (or die)") but the app tracks only rolled Duration/elapsed days, with no per-day
  symptom-test clock. **Shipped rule:** trigger the roll when the disease has a roll-backed symptom
  (`getSymptomTest` returns non-null); escalate to `'critical'` only on
  `getDiseaseProgress().durationReached === true` OR a lethal-cadence symptom — matched against the exact
  cadence strings Blight `'Daily (or die)'` / Gangrene `'Daily (fail > TB times = lose location)'`.
  Otherwise `'recommended'`. The "surface all active diseases at `recommended`" alternative is backlog, not
  shipped. Core p.186-188; no mechanic invented.
- **OQ-2 (critical-wound healing time):** WFRP4e has no fixed numeric heal timer for a Critical Wound, and
  `CriticalWound` stores no app heal-countdown — only `healed`/`healedAt`. The suggestion can remind of the
  healing *requirement* (Conditions/modifiers resolved) and route to the panel, but cannot compute
  "ready to heal". Confirm review-only framing is acceptable.
- **OQ-3 (Critical Wounds panel visibility):** `CriticalWoundsPanel` renders only when
  `inCombat && combatMode === 'status'`. A player with unhealed criticals but not in combat who follows the
  suggestion lands on the Combat page without the panel visible. Options: (a) accept v1 limitation (ship as
  navigate-to-combat and document it); (b) a separate follow-up to surface a read-only criticals summary
  out of combat. Recommend (a) for this additive task; flag (b) as backlog. Do not widen panel visibility
  here (that would be a UI change, out of scope).
- **OQ-4 (talent learnability) — RESOLVED (no longer open):** which specific talent a character "can
  learn" is GM/career-gated and not fully derivable without reinventing selection rules. **Decision:** keep
  talent in module 4 but surface only a generic "you have XP for an eligible talent" cue, with the fully
  specified predicate in §4 (candidate set = `getCurrentLevelTalents`, cost via
  `getAdvancementCost('talent', lvl, true)`, trigger iff `xpCur >= 100` and some candidate is affordable).
  No selection logic is reinvented. This resolves the earlier "keep vs scope-out"
  ambiguity — the concrete rule and the open question no longer both ship. (Recorded here only so the
  history of the decision is visible; it is not an outstanding question.)
- **OQ-5 (critical-wound urgency cue) — RESOLVED, shipped v1 (confirmed by the project owner):** the
  earlier TB-vs-count heuristic is **removed** — per the rules-compliance steering we must not invent a
  threshold, and "more Criticals than TB" is not a RAW trigger. **Shipped rule:** the suggestion fires at
  `'recommended'` whenever `getActiveCriticalWounds()` is non-empty ("you have N unhealed Critical Wounds —
  review them"), and escalates to `'critical'` ONLY under the actual RAW Core p.172 "Death" condition — the
  **Unconscious** Condition is present AND current Wounds `<= 0`
  (`character.conditions.some(c => c.name === 'Unconscious') && character.wCur <= 0`). Cite Core p.172 for
  the escalation and p.180-181 for the healing-review rationale. No count/TB-based invented escalation.

---

## Responses to design review (iteration 2)

Review: `design-review.json` (verdict CHANGES_REQUESTED) + `design-review.md`. Each finding addressed:

- **Finding 1 (HIGH — disease secondary mislabeled "View Corruption"):** ADDRESSED. Retracted the "no
  `SuggestionItem.tsx` change needed" claim. Added a dedicated "Required `SuggestionItem.tsx` edit" section
  specifying that `actionLabel` must take the owning suggestion's `category` and return "View Diseases" for
  `category: 'health'` on a `character/notes` navigate (else "View Corruption"), applied to **both** primary
  and secondary buttons (the `isPrimary` gate is dropped). Verified against the actual `SuggestionItem.tsx`
  source (the hardcoded `'View Corruption'` on `!isPrimary` was confirmed). Non-goals updated to list three
  in-scope existing-file edits instead of two.

- **Finding 2 (MEDIUM — primary/secondary unspecified; bare "Go"):** ADDRESSED. §2 now states explicitly:
  roll-backed disease → seeded roll is **primary**, navigate to character/notes is **secondary** (label
  "View Diseases"); non-roll disease → navigate to character/notes is **primary, no secondary** (label
  "View Diseases", not a bare "Go"). The label fix is delivered by the Finding 1 `actionLabel` change,
  which now covers the primary navigate case too.

- **Finding 3 (MEDIUM — talent rule both concrete and open):** ADDRESSED. Picked the recommended path:
  talent stays in module 4 as a generic nudge only, with a fully specified predicate (candidate set =
  `getCurrentLevelTalents(character.career, careerLevelNum)`; per-candidate current `lvl` via name-matched
  `talents[].lvl` or 0; cost `getAdvancementCost('talent', lvl, true)`; trigger iff `xpCur >= 100` and some
  candidate affordable). OQ-4 rewritten as RESOLVED so the concrete rule and the open question no longer
  both ship. Helper existence (`getCurrentLevelTalents(careerName, level)`, `getAdvancementCost`) and the
  real signatures re-verified in `src/logic/advancement.ts`. **Partial deviation from Finding 3's literal
  wording:** the recommended `lvl < TalentData.max` gate is intentionally omitted because `TalentData.max`
  is a characteristic-bonus expression **string** (verified in `src/data/talents.ts`), not a numeric cap,
  and no existing helper resolves it to a number — adding that resolution would invent talent-cap mechanics
  (rules-compliance violation). Affordability-only gating is used instead, with the reason documented in §4
  and the max-gate flagged as backlog.

- **Finding 4 (MEDIUM — which modules are context-sensitive):** ADDRESSED. Added an explicit
  "Context-sensitivity contract" to Engine wiring: only `learnableSuggestions` and `downtimeSuggestions`
  take `context` and branch on `ctx.inCombat`; `fortuneResolveSuggestions`, `diseaseSuggestions`, and
  `criticalWoundSuggestions` are single-argument and must never self-suppress (ordering alone governs
  placement). §4's signature line and the "one suggestion suppressed in combat" prose corrected to match.

- **Finding 5 (NIT — "0 for miracle/chaos" bonus claim):** ADDRESSED. Reworded §4: bonus = WPB (petty) /
  IntB (arcane); miracle/chaos ignore the bonus inside `getSpellLearningCost`, so pass IntB as
  `handleLearnSpell` does. Verified against `AdvancementPage.handleLearnSpell` (`charBonus = type === 'petty'
  ? wpBonus : intBonus`).

- **Finding 6 (NIT — healing citation page):** ADDRESSED. Changed all three §3 citations/grounding from a
  bare `Core p.180` to `Core p.180-181: Healing Critical Wounds`, matching the rulebook index entry
  ("Healing Critical Wounds 181"). Verified the heading in `docs/WarhammerFantasyRoleplay4e.md` sits between
  the `_page_178` and `_page_181` markers and the index lists 181 — so the content straddles p.180-181.

- **Finding 7 (NIT — health rank vs OQ-3):** ADDRESSED. Added a caveat under `IN_COMBAT_GROUP_ORDER` cross-
  referencing OQ-3: `health` ranks second for importance, but the critical-wounds target panel is
  in-combat-Status-only, so the high rank reflects importance, not guaranteed panel visibility.

- **Testability note (parity of `resolveReminderBaseTarget` vs `getSymptomTestBaseTarget`, non-blocking):**
  acknowledged. The integration test should assert that a seeded Endurance/Cool disease roll's base target
  equals `getSymptomTestBaseTarget`, so a future change to either helper cannot silently diverge. Added to
  the testability expectations via the Finding-1 label test and this parity assertion.

## Responses to design review (iteration 3)

Review: `design-review.json` (verdict CHANGES_REQUESTED) + `design-review.md`. The two MEDIUM findings and
two NITs are all addressed below. The project owner also sent explicit decisions on the two open questions,
baked in here as shipped v1 rules.

- **Finding 1 (MEDIUM — `advancement:learnable` ordering claim inverted):** ADDRESSED. Verified against
  `ordering.ts`: within a group the sort is urgency then `id` lexical ascending, and
  `'advancement:learnable'` < `'advancement:unspent-xp'`, so learnable sorts **above** `unspent-xp`, not
  below. §4's ordering prose rewritten to state this correctly: learnable is `info`, sorts below
  `advancement:ready` (recommended) and lexically **before** `advancement:unspent-xp` among `info` items —
  no id gymnastics, and both placements are acceptable/intended. Also noted that `advancementSuggestions`
  returns `ready` **or** `unspent-xp`, never both.

- **Finding 2 (MEDIUM — OQ-1 and OQ-5 left open but govern emitted urgency):** ADDRESSED per the project
  owner's explicit decisions. **OQ-5:** use the **RAW-exact** rule only — `'recommended'` whenever
  `getActiveCriticalWounds()` is non-empty; escalate to `'critical'` ONLY when the Unconscious Condition is
  present AND `wCur <= 0` (Core p.172). The TB-vs-count heuristic is **removed** (no invented threshold).
  Cite Core p.172 (escalation) + p.180-181 (healing review). Verified `character.conditions: { name, level
  }[]` and `character.wCur: number` and the `'Unconscious'` condition name in `src/types/character.ts` /
  `src/logic/conditions.ts`. **OQ-1:** ships the reviewer-recommended rule — trigger on a roll-backed
  symptom; escalate to `'critical'` only on `getDiseaseProgress().durationReached` OR a lethal cadence,
  matched against the exact strings Blight `'Daily (or die)'` / Gangrene
  `'Daily (fail > TB times = lose location)'` (verified verbatim in `src/logic/diseases.ts`). Both OQ-1 and
  OQ-5 are now written as shipped v1 decisions in §2/§3 and in the OPEN QUESTIONS status note, not as open
  questions. OQ-2/OQ-3 remain genuinely open (they are review-only/visibility framing and do not affect any
  emitted urgency or trigger).

- **Finding 3 (NIT — `getSymptomTest` must receive the base name, not displayName):** ADDRESSED. §2 trigger
  predicate now states explicitly: for each `ResolvedSymptom s` from `getDiseaseSymptoms`, call
  `getSymptomTest(s.name, s.severity)` — pass `s.name` (base name) and `s.severity`, NOT `s.displayName`
  (which embeds the severity suffix and never matches the `switch`, silently returning `null`). Verified
  the `ResolvedSymptom` shape (`{ name, severity, displayName }`) in `src/logic/diseases.ts`.

- **Finding 4 (NIT — base-target parity is by-construction, not an identity):** ADDRESSED. §2's roll-seed
  note reworded: for the standard `Endurance`/`Cool` skill definitions (linked to `T`/`WP`) the two
  resolvers yield the same base target, but they read the characteristic from **different sources**
  (`getSymptomTestBaseTarget` uses a hardcoded key; `resolveReminderBaseTarget` reads `skill.c`), so the
  mandated integration parity test must assert the agreement to catch future divergence. No code change.

## Responses to design review (iteration 4)

Review: `design-review.json` (verdict CHANGES_REQUESTED) + `design-review.md` (iteration 4). One MEDIUM and
five NIT findings; all addressed below. Each claim was re-verified against the live source
(`src/logic/diseases.ts`, `src/logic/advancement.ts`, `src/components/shared/FortuneResolvePanel.tsx`,
`src/components/pages/character/CharacteristicsSection.tsx`, `src/components/pages/CombatPage.tsx`,
`src/logic/assistant/rules/reminders.ts`, `src/components/assistant/SuggestionItem.tsx`) before editing.

- **Finding 1 (MEDIUM — duplicate active diseases collide on the derived `id`):** ADDRESSED. Verified in
  `src/logic/diseases.ts` that `addDisease` assigns an auto-incrementing `Math.max(...ids)+1` and enforces
  **no uniqueness on `diseaseName`**, so two same-name records would emit two suggestions with an identical
  `'health:disease:<slug>'` id. §2's emission strategy now mandates **option (a): collapse active diseases
  by _distinct_ `diseaseName`** before emitting (one suggestion per distinct name), with the
  most-progressed same-name record driving the `durationReached` escalation. Option (b) (per-name
  occurrence index) was considered and rejected as unnecessary noise since the copy is name-derived. The
  incorrect "`disease.id` is timestamp-based" claim is **corrected**: `disease.id` is an auto-increment
  (the timestamp is the separate `contracted` field); the "don't key on `disease.id`" conclusion still
  holds because an auto-increment id is insertion-order-dependent and non-deterministic across saves. The
  "Invariant ownership (determinism)" section was updated to add the intra-name uniqueness invariant and to
  correct the timestamp wording.

- **Finding 2 (NIT — Fortune/Resolve panel also lives on the Character page):** ADDRESSED. Verified
  `FortuneResolvePanel` renders in **both** `CombatPage.tsx` (behind `!inCombat || combatMode === 'status'`)
  and `CharacteristicsSection.tsx` (Character page, characteristics/identity sub-tab). The Fortune &
  Resolve nav-target bullet now acknowledges the second location and states why **Combat** is chosen (the
  combat-adjacent home where the pools are most actionable; always on screen out of combat) and that
  `page: 'character', subTab: 'identity'` is a valid alternative deliberately not used. Target unchanged:
  `{ kind: 'navigate', page: 'combat' }`, no `subTab`.

- **Finding 3 (NIT — roll-backed symptom set larger than the two lethal symptoms):** ADDRESSED. §2 now
  lists the full roll-backed set explicitly — **Blight, Buboes, Gangrene, Lingering, Wounded** (Endurance,
  `fallbackChar = 'T'`) and **Pox** (Cool, `fallbackChar = 'WP'`) — and names the six non-roll symptoms
  (Convulsions, Coughs and Sneezes, Fever, Flux, Malaise, Nausea). Verified against the `getSymptomTest`
  `switch` in `src/logic/diseases.ts`. The §Testability per-module unit test is required to include a
  **Cool/Pox** example so the `WP` fallback path is exercised.

- **Finding 4 (NIT — `reminderSuggestions` ignores its context argument):** ADDRESSED. Added a note to the
  Engine-wiring context-sensitivity contract: `reminderSuggestions(character, _ctx)` accepts `context` for
  signature compatibility but **ignores it** (it derives reminders from conditions/psychology only,
  verified in `reminders.ts`) and is **not** one of the two context-branching new modules; the snippet
  passes `context` only to keep the call shape uniform.

- **Finding 5 (NIT — `actionLabel` else-branch mislabels future non-health category):** ADDRESSED. The
  Required `SuggestionItem.tsx` edit now specifies an **explicit three-way mapping** — `health` →
  "View Diseases", `corruption` → "View Corruption", **else → "Go"** — instead of the binary health-vs-else
  that would have mislabelled any future non-health category routing to character/notes as
  "View Corruption". Verified the current helper hardcodes "View Corruption" only on the `!isPrimary`
  character/notes branch in `SuggestionItem.tsx`.

- **Finding 6 (NIT — talent affordability relies incidentally on `careerLevelNum = 0` being safe):**
  ADDRESSED. §4 now states the guard explicitly: when the career/level is unresolvable (`careerLevelNum <=
  0` or unknown career), the candidate set is **empty** and the talent portion is **omitted**, and the
  module MUST check `careerLevelNum > 0` (and a resolved career) before relying on `getCurrentLevelTalents`
  — mirroring the `careerLevelNum <= 0` guard in `isReadyToAdvance` (verified in `src/logic/advancement.ts`,
  `careerLevelNum = allLevels.findIndex(l => l.title === character.careerLevel) + 1`). The empty-candidate
  path is intentional, not accidental. Spell/ritual affordability is independent of this guard.

- **OQ-2 / OQ-3:** remain genuinely open (review-only heal framing; critical-wounds panel out-of-combat
  visibility). Neither affects any emitted trigger or urgency; both have a recommended default and are
  flagged, not silently resolved. No change this iteration.
