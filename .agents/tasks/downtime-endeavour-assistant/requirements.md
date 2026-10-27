# Downtime / Endeavour Assistant — Requirements

## Summary

Elevate the shipped endeavour tracking into a guided, recommendation-driven
downtime experience. The feature does two things, both strictly additive:

1. **Situation-aware endeavour recommendations** — a pure module that, from data
   the app already tracks (current wounds, active diseases/critical wounds,
   coin, unspent XP, class), recommends which *already-catalogued* endeavours
   fit the character's current situation, each with a rulebook citation and a
   plain-language "why".
2. **Guided resolve for test-driven endeavours** — for endeavours the rulebook
   resolves with a characteristic/skill **Test**, a one-tap affordance that
   **seeds and opens the EXISTING roll dialog** for the correct test. The player
   rolls and decides; nothing is auto-applied or auto-completed.

This extends the Character Assistant engine (`src/logic/assistant/`) and
complements the Endeavours page (`src/components/pages/EndeavoursPage.tsx`). It
reuses the canonical endeavour catalog and helpers in `src/logic/endeavours.ts`
and `src/logic/endeavour-templates.ts`, and the reminder-roll seed path
(`resolveReminderBaseTarget` in `src/logic/reminders-target.ts`, the
`{ kind: 'roll'; test }` `SuggestionAction`, and `useAssistantActions`).

**Core principle (project-owner directive, matches the established pattern):**
the assistant RECOMMENDS and GUIDES; the player DECIDES and acts. Nothing is
ever auto-applied, auto-rolled, or auto-completed. Every recommendation rests
only on data the app already tracks, and every rule is rulebook-cited.

### Grounding in the existing codebase (read before implementing)

- `src/logic/endeavours.ts` — `hasActiveEndeavours`, `GENERAL_ENDEAVOURS`,
  `CLASS_ENDEAVOURS` (keyed by class), `DowntimePeriod`/`EndeavourEntry` types +
  `EntryStatus` (`'pending' | 'in_progress' | 'completed'`),
  `createDowntimePeriod`/`addDowntimePeriod`/`addEndeavourEntry`/
  `updateEndeavourEntry`/`cycleStatus`, `parseStatusTier`/`getDefaultSlots`,
  `buildPickerItems`, `getCostSummary`. This is the **canonical catalog** and
  the only source of endeavour names.
- `src/logic/endeavour-templates.ts` — `ENDEAVOUR_TEMPLATES` (the 6 standard
  templates: Training, Income, Research, Crafting, Healing, Socialising) +
  `applyEndeavourTemplate` (auto-fills notes/cost by status tier).
- `src/logic/assistant/engine.ts` — pure `getSuggestions` composing rule
  modules, then `orderSuggestions`. The new module registers here.
- `src/logic/assistant/types.ts` — `Suggestion`, `SuggestionAction`
  (`navigate` | `roll`), `SuggestionCategory`, `SuggestionUrgency`,
  `SuggestionContext { inCombat }`, `SuggestionTotal`, and the `SuggestionSource`
  sync-or-async boundary (future LLM seam — keep intact, stay sync).
- `src/logic/assistant/rules/endeavours.ts` — fires on **active**
  (pending/in_progress) endeavours (`endeavour:active`).
- `src/logic/assistant/rules/downtime.ts` — fires out-of-combat when there is
  downtime capacity but **nothing in flight** (`endeavour:available`); already
  uses `hasActiveEndeavours` for mutual exclusion.
- `src/logic/reminders.ts` (`ReminderTest`), `src/logic/reminders-target.ts`
  (`resolveReminderBaseTarget`) — the exact seed path a `{ kind: 'roll' }`
  suggestion uses (see `rules/diseases.ts` for a worked precedent that seeds a
  skill Test with `fallbackChar`).
- `src/components/assistant/SuggestionItem.tsx` — already renders
  `suggestion.totals` through `TooltipTriggerCell` + `Tooltip`; any calculated
  total ships as a `SuggestionTotal` with `lines` and needs no UI change.
- Character fields the recommendations read (all already tracked):
  `wCur` (current wounds), `W` (max wounds), `diseases?`, `criticalWounds`,
  `wGC`/`wSS`/`wD` (gold/silver/brass coin), `xpCur`, `class`, `status`,
  `species`, `endeavours`.

---

## Functional Requirements

### FR-1 — New pure recommendation module (situation-aware)

- **FR-1.1** Add one new pure, deterministic, side-effect-free rule module under
  `src/logic/assistant/rules/` (working name `downtime-recommendations.ts`) that
  takes `(character, context)` and returns `Suggestion[]`, consistent with the
  existing rule-module signatures and the `SuggestionSource` sync contract. It
  MUST NOT mutate the character, read/write storage, navigate, open dialogs, or
  touch the network.
- **FR-1.2** It is registered in `getSuggestions` (`engine.ts`) so its output is
  composed and then ordered by the existing `orderSuggestions`. No new ordering
  logic is introduced.
- **FR-1.3** It is **out-of-combat only**: returns `[]` when
  `context.inCombat === true` (downtime is not a combat activity), matching
  `downtime.ts`/`learnable.ts`.
- **FR-1.4** Every recommendation it emits names an endeavour that **actually
  exists** in `GENERAL_ENDEAVOURS`, `CLASS_ENDEAVOURS[character.class]`, or
  `ENDEAVOUR_TEMPLATES`. It MUST NOT invent endeavour types, effects, costs, or
  difficulties.
- **FR-1.5** Each recommendation carries: a stable `id`, a `title` naming the
  endeavour, a `rationale` stating the situational trigger ("why"), a `category`
  of `'endeavour'`, an `urgency`, a `citation` string (Core page / supplement),
  and an `action`. Citations are carried as DATA across the serializable
  boundary (no recomputation in the UI).
- **FR-1.6** Recommendations are JSON-serializable plain data — no functions, DOM
  nodes, or class instances in any field (same constraint the engine tests
  already enforce).

### FR-2 — Situational triggers (each grounded in tracked data + catalog)

Each trigger below fires only from data the app already tracks and recommends
only catalogued endeavours. When a trigger's exact endeavour choice is
situational/subjective, it is presented as an **option with rationale**, never a
single forced prescription.

- **FR-2.1 Wounded → recovery.** When `wCur < W` (or active `criticalWounds` /
  active `diseases` exist), recommend the **Healing** template endeavour
  (`ENDEAVOUR_TEMPLATES` "Healing"). Rationale cites the tracked wound/critical/
  disease state. (The existing `diseases.ts` and `critical-wounds.ts` health
  rules continue to own the *roll-to-recover* and death-check nudges; this
  recommendation points at the *downtime Healing endeavour* specifically and
  must not duplicate those health suggestions' ids or roll affordances.)
- **FR-2.2 Low coin → income.** When the character's coin is low/zero (read from
  `wGC`/`wSS`/`wD`), recommend the **Income** endeavour (and surface **Banking**
  as the related option for preserving coin, since Core explicitly pairs them).
  "Low" is a tracked-data threshold the design must define explicitly (see
  OQ-4); the rationale states the observed coin total.
- **FR-2.3 Unspent XP → training/learning.** When `xpCur > 0`, recommend the
  **Training** endeavour (and, where relevant, **Unusual Learning**). This nudge
  must not duplicate the existing `learnable.ts` advancement suggestion
  (`advancement:learnable`); it points specifically at the *downtime endeavour*,
  not the Advancement page purchase. Mutual non-duplication is verified by
  distinct ids and category (`endeavour` vs `advancement`).
- **FR-2.4 Class-specific surfacing.** Surface the endeavours in
  `CLASS_ENDEAVOURS[character.class]` as options-with-rationale for the
  character's class, so class players see their class endeavours without opening
  the picker. If `character.class` is empty or unmatched, emit no class
  recommendation (mirrors `buildPickerItems` behaviour — no invented class).
- **FR-2.5** No trigger emits a recommendation whose endeavour is absent from the
  catalog; no trigger invents an effect, cost, or difficulty.

### FR-3 — Guided resolve for test-driven endeavours

- **FR-3.1** For an endeavour whose RAW resolution is a characteristic/skill
  **Test**, the recommendation's `action` (or `secondaryAction`) is a
  `{ kind: 'roll'; test: { def, difficulty, rollName } }` descriptor that
  **reuses the `ReminderTest` shape** so no new roll logic is introduced. The UI
  resolves `def` → base target via `resolveReminderBaseTarget` and passes
  `difficulty` to `RollDialog.defaultDifficulty`, exactly as
  `useAssistantActions` and `CombatDashboard.handleRollReminder` already do.
- **FR-3.2** A test-driven roll descriptor uses only a RAW-verified
  characteristic/skill + difficulty taken from the rulebook text (see the
  Test-driven table in §"Rulebook grounding" and OQ-1/OQ-2). It MUST NOT invent
  a test or a difficulty.
- **FR-3.3** The `roll` action only **seeds and opens** the existing roll dialog.
  It MUST NOT: roll automatically, apply money/XP/wounds/effects, advance a
  skill, or change any `EndeavourEntry.status`. After the player rolls, the
  assistant shows the result (via the existing roll flow) and the rulebook
  outcome text; the player updates the entry through existing controls
  (`cycleStatus` / the Endeavours page), through no parallel mutator.
- **FR-3.4** For endeavours whose RAW resolution is **narrative/time-based with
  no self-contained Test** (e.g. Changing Career, Commission, Banking as a flat
  d10/d100 money mechanic, Income as flat status-based earnings), the
  recommendation offers **guidance text only** (a `navigate` action to the
  Endeavours page) and **no roll button**. This mirrors the informational-only
  pattern in `reminders.ts` (no `test`) and `diseases.ts` (navigate-only).
- **FR-3.5** When an endeavour's RAW difficulty is GM-set or circumstance-
  dependent, the seed uses the established neutral default `Challenging (+0)`
  (as `reminders.ts` does for Broken/Ablaze/psychology), with the rationale/
  citation noting it is adjustable in the dialog — never an invented fixed TN.

### FR-4 — Mutual exclusion / no double-fire

- **FR-4.1** The new module reuses `hasActiveEndeavours(character)` so it cannot
  double-fire with `endeavours.ts` (`endeavour:active`, which fires when active
  endeavours exist) nor with `downtime.ts` (`endeavour:available`, which fires
  when there is capacity but nothing in flight). The design must state the
  precise gating that keeps the three modules mutually non-overlapping (see
  OQ-5) and every emitted `id` must be distinct from `endeavour:active` and
  `endeavour:available`.
- **FR-4.2** Existing suggestion ids, categories, ordering, and the two existing
  endeavour rules' behaviour remain unchanged.

### FR-5 — Calculated-total tooltips

- **FR-5.1** Any calculated total this feature displays in the UI (notably a
  seeded test's base target, and any coin total shown in a rationale) is carried
  as a `SuggestionTotal { label, display, lines }` so `SuggestionItem` renders
  its breakdown through the existing `TooltipTriggerCell` + `Tooltip`. The
  breakdown `lines` are produced in the engine (reusing existing breakdown
  helpers / the `resolveReminderBaseTarget` components), never recomputed in the
  UI.
- **FR-5.2** A seeded base target shown to the player carries a breakdown of its
  components (e.g. `Initial + Advances + (skill) Advances = Target`), consistent
  with the calculated-total-tooltips steering rule.

### FR-6 — Future-proofing seam preserved

- **FR-6.1** The recommendation logic stays a pure module behind the existing
  clean boundary; the `SuggestionSource` sync-or-async contract is left intact
  and the deterministic default remains synchronous, so a later LLM-backed
  advisor is a non-breaking augmentation. No network/LLM is added now.

---

## Non-Functional Requirements

- **NFR-1 Offline-first / local-only.** No backend, network, telemetry, or LLM.
  The feature reads only the in-memory character and `SuggestionContext`.
- **NFR-2 Purity & determinism.** The engine stays pure and deterministic:
  identical `(character, context)` → identical output; no mutation; tolerant of
  frozen inputs (the engine purity tests already assert this).
- **NFR-3 Serializability.** All emitted `Suggestion` data is JSON-serializable.
- **NFR-4 Style consistency.** UI additions reuse the existing Assistant panel
  (`SuggestionItem`) and Endeavours page styling/components; no new styling
  framework or parallel UI.
- **NFR-5 Single source of truth.** Endeavour names come only from
  `endeavours.ts` / `endeavour-templates.ts`; roll seeding goes only through
  `resolveReminderBaseTarget` + the existing `roll` action; status changes go
  only through existing endeavour mutators. No forked endeavour logic, no
  parallel mutators.

---

## Acceptance Criteria

Verification commands (all must be clean):

1. **AC-1** `npx tsc --build --force --noEmit` reports no errors.
2. **AC-2** `npm run build` succeeds.
3. **AC-3** `vitest --run` passes, including all pre-existing tests
   (endeavours; assistant engine purity/determinism/serializability; the two
   existing endeavour rules) **unchanged and green**.
4. **AC-4** `npx eslint .` reports 0 errors and no new warnings. The only
   sanctioned `react-hooks/set-state-in-effect` disable is the one already in
   `src/components/shared/Tooltip.tsx`, reused only if genuinely needed. No other
   `eslint-disable`, `@ts-ignore`, or suppression is added.

Behavioural criteria (new unit + fast-check + component tests):

5. **AC-5 (recommendations reflect tracked state, catalog-only).** Given a
   character with `wCur < W`, the module recommends the **Healing** endeavour;
   given `xpCur > 0`, it recommends **Training**; given low coin, it recommends
   **Income**/**Banking**; given a class in `CLASS_ENDEAVOURS`, it surfaces that
   class's endeavours. A fast-check property asserts that **every** emitted
   recommendation's named endeavour is a member of
   `GENERAL_ENDEAVOURS ∪ CLASS_ENDEAVOURS[class] ∪ ENDEAVOUR_TEMPLATES` for
   arbitrary tracked state (never a string outside the catalog).
6. **AC-6 (guided resolve seeds the existing dialog; no auto-apply).** For a
   test-driven endeavour, the suggestion's `roll` action seeds the shared
   `RollDialog` via `resolveReminderBaseTarget(character, action.test.def)` with
   the RAW-correct characteristic/skill and difficulty (asserted equal to the
   shared resolver's output, in the style of `catalog-integration.test.ts` and
   `useAssistantActions.test.tsx`). A test asserts invoking the action does NOT
   mutate the character, does NOT change any `EndeavourEntry.status`, and does
   NOT apply money/XP/effects.
7. **AC-7 (narrative endeavours → guidance only).** For a narrative/time-based
   endeavour (e.g. Changing Career, Commission, Income, Banking), the suggestion
   has a `navigate` action and **no** `roll` action (no roll button rendered).
8. **AC-8 (no double-fire).** Property/unit tests assert the new module and
   `endeavours.ts` + `downtime.ts` never emit overlapping/duplicate ids for the
   same character state, and that the three are mutually exclusive per the gating
   in FR-4.1. Existing `endeavour:active` / `endeavour:available` behaviour is
   unchanged.
9. **AC-9 (determinism & serializability).** The new module's output is
   identical across repeated/cloned calls and contains no functions (covered by
   extending/holding the existing engine property tests green).
10. **AC-10 (calculated-total tooltip).** A component test asserts that a
    suggestion carrying a seeded base-target total renders a breakdown tooltip
    through `TooltipTriggerCell` (the existing `SuggestionItem` totals path), and
    that the breakdown lines come from the engine, not recomputed in the UI.
11. **AC-11 (rulebook citations).** Every recommendation and every roll seed
    carries a citation string naming the Core page (or supplement) it derives
    from; no rule lacks a citation. Test-driven seeds cite the specific endeavour
    text that names the Test.

---

## Rulebook grounding (authoritative: `docs/WarhammerFantasyRoleplay4e.md`)

Between Adventures / Endeavours: Core **p.194–200** (General Endeavours begin
p.196/198; Class Endeavours p.200). Verified against the rulebook text:

**Test-driven General/Class endeavours (offer a seeded roll):**

| Endeavour | RAW Test | Difficulty (RAW) | Source |
|---|---|---|---|
| Animal Training | Animal Training | Average (+20) | Core p.196 |
| Consult an Expert (locate) | Gossip | Challenging (+0) (varies by settlement) | Core p.196 |
| Consult an Expert (convince) | Charm | Simple (or GM-set) | Core p.196 |
| Crafting | Trade (Extended) | by Availability (Common +20 / Scarce +0 / Rare −10 / Exotic −30) | Core p.197 |
| Invent (Plan) | Trade (Engineer) | GM-set | Core p.197 |
| Unusual Learning | Characteristic/Skill most relevant (GM-set) | Hard (−20), +10 per prior failure | Core p.198 |
| Combat Training | Melee **or** Ranged | Challenging (+0) | Core p.200 |
| Foment Dissent (stage 1) | Gossip | Average (+20) | Core p.200 |
| Foment Dissent (stage 2) | Charm | GM-set | Core p.200 |
| The Latest News | Gossip | Challenging (+0) | Core p.200 |
| Reputation | Career Skill | Challenging (+0) | Core p.200 |
| Research Lore | Lore (specialisation) | Average (+20); or Difficult (−10) Intelligence if untrained+literate | Core p.200 |
| Study a Mark | Perception | Challenging (+0) | Core p.200 |

**Narrative / flat-mechanic endeavours (guidance only, NO roll button):**
Banking (choose/roll 1d10 interest, 1d100 outcome — not a characteristic/skill
Test), Changing Career (XP/story, no Test), Commission (spend funds + time, no
Test), Income (flat status-based earnings, p.198 — the "Earning" *skill* variant
is a separate Earning mechanic, not the base Income endeavour), Custom Gear,
Money to Burn/Duties. — Core p.195–198.

**Template endeavours** (`endeavour-templates.ts`): Healing, Training, Income,
Research, Crafting, Socialising — see template notes. Healing/Research map onto
the Core recovery/Research-Lore guidance; Training's XP+1d10 brass cost is
p.198.

> The Class Endeavours difficulty rule (Core p.200): a character **not** in the
> listed Class takes any such Test at **one Difficulty Level harder**. Whether
> the seed applies that shift automatically is flagged as **OQ-3** (do not
> silently invent a modified TN).

---

## Open questions / rulebook ambiguities (flagged, not guessed)

- **OQ-1 — Which endeavours get a roll button.** The Test-driven table above is
  the proposed mapping read from Core p.196–200. **Confirm** this list and the
  exact test/difficulty for each before implementation; several (Consult an
  Expert "convince", Invent, Foment Dissent stage 2, Reputation's "Career
  Skill") have GM-set or indirect tests.
- **OQ-2 — Skill → characteristic fallback for seeds.** `resolveReminderBaseTarget`
  needs a `fallbackChar` per seeded skill. Proposed: Animal Training→Int,
  Gossip→Fel, Charm→Fel, Trade→Dex, Perception→I, Lore→Int, Melee→WS, Ranged→BS,
  Career Skill/Research→per the character's actual skill. **Confirm** these
  fallbacks (they must match the Core skill→characteristic list, p.117).
- **OQ-3 — Off-class Class-Endeavour penalty.** Core p.200 says a non-member
  takes the Test one Difficulty Level harder. Should the seed pre-apply that
  shift, or seed the base difficulty and note the penalty in the rationale for
  the player to apply in the dialog? (Default assumption, adjustable:
  seed base + note it, consistent with the GM-set `Challenging (+0)` convention —
  confirm.)
- **OQ-4 — "Low coin" threshold.** The app tracks `wGC`/`wSS`/`wD`, but Core
  defines no numeric "low" threshold for triggering an Income recommendation.
  Proposed assumption: trigger when total convertible coin is at/near zero (e.g.
  0 GC and 0 SS, or a small configurable floor). **Confirm** the threshold, or
  make Income a *standing* downtime option rather than a coin-gated one.
- **OQ-5 — Overlap gating with `downtime.ts`.** `downtime.ts` already fires when
  there is capacity but nothing in flight. Decide whether the new situational
  recommendations should (a) fire alongside `endeavour:available` (richer, but
  more items at once), or (b) supersede/replace it when situational triggers
  exist. Default assumption: the new module fires in the **same no-active-
  endeavours state** and complements `downtime.ts` without duplicating its id,
  but the design must specify whether both appear together or one suppresses the
  other to control panel noise. **Confirm** desired behaviour.
- **OQ-6 — Unusual Learning / Research "most relevant" skill.** Core leaves the
  skill/characteristic to GM choice. If seeded, it must default to a neutral
  characteristic test (e.g. the relevant characteristic at `Challenging (+0)`)
  with a note, rather than an invented skill. **Confirm** or mark these as
  guidance-only.

---

## Out of scope

- Inventing any new endeavour, effect, cost, or test difficulty.
- Auto-applying money/XP/wounds/effects or auto-completing/auto-advancing any
  endeavour entry; any parallel mutator outside the existing endeavour controls.
- Any new roll resolver — seeding reuses `resolveReminderBaseTarget` +
  `performRoll` / `RollDialog` only.
- Any network, backend, telemetry, or LLM integration (future seam only).
- Rebuilding or forking the Endeavours page, the endeavour catalog, or the
  assistant engine ordering/categories.
- Changing the behaviour of the existing `endeavours.ts` / `downtime.ts` rules.
