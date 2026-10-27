# Downtime / Endeavour Assistant — Technical Design

## Overview

This feature turns the shipped endeavour tracker into a guided downtime
experience without forking any existing logic. It adds **one new pure rule
module** to the Character Assistant engine
(`src/logic/assistant/rules/downtime-recommendations.ts`) that reads
already-tracked character state and emits `Suggestion[]` recommending
*already-catalogued* endeavours, each rulebook-cited, and — for the small set of
endeavours the Core rulebook resolves with a **bare-skill or plain-characteristic
Test the app can resolve unambiguously from the sheet** — carrying a
`{ kind: 'roll' }` descriptor that seeds the **existing** `RollDialog` through the
**existing** `resolveReminderBaseTarget` + `useAssistantActions` seam. Nothing is
auto-rolled, auto-applied, or auto-completed; the player resolves outcomes through
the existing Endeavours-page controls (`cycleStatus`, the entry inputs).

The design is **entirely additive**. No existing rule module, mutator, type, UI
component, ordering table, or test changes behaviour. The only edits to shipped
files are (a) registering the new module in `engine.ts` (one import + one spread)
and (b) a **value-preserving refactor** of `reminders-target.ts` that extracts a
`resolveSeededTarget` helper and reduces `resolveReminderBaseTarget` to its
`.total` (every existing caller's return value is byte-identical).

### Governing constraint discovered this pass (drives the seeded-roll set)

Verified directly in `src/components/shared/RollDialog.tsx`: the roll dialog shows
the **base target read-only** (`<div className={styles.value}>{baseTarget}</div>`)
and the ONLY in-dialog adjustments are the **Difficulty** `<select>` and an
**Opposed Test** toggle. **There is no skill/characteristic picker and no editable
base target.** Consequence: the assistant may seed a roll **only** when the RAW
test resolves on a **bare (non-specialised) skill row** or a **plain
characteristic** the app can resolve unambiguously from the sheet. Any endeavour
whose RAW test is **specialisation-dependent** (`Melee (X)`, `Ranged (X)`,
`Lore (X)`, `Animal Training (X)`) or **player-chosen** ("Career Skill") CANNOT be
reliably seeded — the app cannot know which specialisation applies and the dialog
cannot ask — so seeding would present a wrong base target with no in-dialog
recourse. Those endeavours are therefore **guidance-only** (navigate, no roll
button), with the test explained in the rationale so the player rolls it via the
normal controls.

**Steering compliance up front:**
- **rules-compliance:** every recommendation and every seeded Test is grounded in
  `docs/WarhammerFantasyRoleplay4e.md` (Chapter 6 *Between Adventures →
  Endeavours*), **re-verified against the source this pass** (quoted below), and
  cited as DATA (`Suggestion.citation`). The module file carries a `// Core p.NNN`
  comment on every rule, mirroring `diseases.ts` / `reminders.ts`. No mechanic,
  cost, test, or difficulty is invented. Any test/page that could not be verified
  from source is reclassified to guidance-only rather than shipped. Ambiguities
  are flagged (OQ section), never silently resolved.
- **calculated-total-tooltips:** the one calculated total this feature surfaces —
  a seeded Test's base target — ships as a `SuggestionTotal { label, display,
  lines }`, which `SuggestionItem` already renders through `TooltipTriggerCell` +
  `Tooltip`. Breakdown `total` and `lines` come from a **single branch of one
  helper** so they cannot drift.
- **offline-first / local-only:** no backend, network, telemetry, or LLM. The
  `SuggestionSource` sync-or-async boundary is left byte-identical and the
  deterministic default stays synchronous.

---

## Technology stack (locked)

Same stack as the rest of the assistant subsystem — no new dependency:

- **Language/build:** TypeScript (strict), Vite, `tsc --build`.
- **Engine:** the existing pure-functional rule-module pattern under
  `src/logic/assistant/` (`getSuggestions` composes modules, `orderSuggestions`
  sorts). React-free, deterministic, serializable.
- **UI:** the existing `SuggestionItem` / `AssistantPanel` and the shared
  `Tooltip` + `TooltipTriggerCell`. No new component is required.
- **Roll seam:** the existing `ReminderTest` shape, `resolveReminderBaseTarget`,
  `useAssistantActions`, and `RollDialog` (`defaultDifficulty`). No new roll
  resolver.
- **Testing:** Vitest + `@testing-library/react` + fast-check, matching
  `engine.test.ts`, `downtime.test.ts`, `catalog-integration.test.ts`,
  `useAssistantActions.test.tsx`.

---

## Decision 1 — Placement: extend the assistant engine, NOT a new page panel

**Chosen: a single new assistant rule module (engine-side), surfaced through the
existing Assistant panel. No inline Endeavours-page recommendations panel, no
edits to `rules/endeavours.ts` or `rules/downtime.ts`.**

Three options were considered:

1. **Enrich the existing `endeavours.ts` + `downtime.ts` rules in place.**
   Rejected: those modules are deliberately minimal, their ids
   (`endeavour:active`, `endeavour:available`) and behaviour are asserted verbatim
   by `downtime.test.ts` / `engine.test.ts`, and the mutual-exclusion contract
   between them is a tested invariant. Widening them risks changing shipped
   ids/behaviour and breaks AC-3.
2. **A new inline recommendations panel on `EndeavoursPage.tsx`.** Rejected as the
   primary surface: it would duplicate the suggestion-rendering, dismiss/snooze,
   citation, and tooltip plumbing `SuggestionItem` already owns, creating a
   *second* home for the same recommendations — the duplication the task forbids —
   and would not honour the established "action surface lives in the Assistant
   panel" decision.
3. **A new sibling rule module registered in the engine, rendered by the existing
   panel.** **Chosen.** Least-duplicative: it reuses the entire `Suggestion` →
   `orderSuggestions` → `SuggestionItem` pipeline (ordering, urgency, citations,
   totals/tooltips, dismiss/snooze, the `roll`/`navigate` seam) with zero new UI.
   It sits beside the existing `endeavour:available`/`endeavour:active` rules as a
   third, complementary source and composes through the same `getSuggestions`
   entry point.

**New module:** `src/logic/assistant/rules/downtime-recommendations.ts`, exporting
`downtimeRecommendationSuggestions(character, context): Suggestion[]`.

This keeps a **single source of truth** (the engine) and means a later LLM advisor
augments exactly one boundary (Decision 5). The Endeavours page is unchanged; the
player still acts there via the existing controls (Decision 4).

---

## Decision 3 (settled first because it governs the module's shape) — Mutual exclusion / no double-fire

The engine will host **three** endeavour-category rule modules. All three read the
SAME predicate, `hasActiveEndeavours(character)` (from `src/logic/endeavours.ts`),
keying off one source of truth:

| Module | id(s) | Fires when |
|---|---|---|
| `rules/endeavours.ts` (`endeavourSuggestions`) | `endeavour:active` | out-of-combat-agnostic; `hasActiveEndeavours === true` |
| `rules/downtime.ts` (`downtimeSuggestions`) | `endeavour:available` | `!inCombat` **and** `hasActiveEndeavours === false` **and** (free slots exist OR no periods) |
| `rules/downtime-recommendations.ts` (NEW) | `endeavour:rec:*` (see below) | `!inCombat` **and** `hasActiveEndeavours === false` |

**Gating rule (DECIDED — was OQ-5):** the new module fires in the **same
no-active-endeavours, out-of-combat state** as `downtime.ts` and **complements**
it (both appear together) rather than suppressing it. `downtime.ts` answers *"you
have capacity to start an endeavour"* (a slot-availability nudge, at most **one**
`endeavour:available` item); the new module answers *"here are the specific
endeavours that fit your situation"* (content). Different information, not
duplicates. Suppressing `downtime.ts` was rejected because it would require
editing `downtime.ts` (violating AC-3) and would hide the slot cue when the
situational triggers are silent. Panel noise is controlled by (i) urgency
ordering, (ii) a deterministic per-module emission ceiling (below), and (iii)
dismiss/snooze already provided by `SuggestionItem`.

**Why this cannot double-fire incorrectly:**
- New module vs `endeavours.ts`: mutually exclusive by construction —
  `endeavour:active` requires `hasActiveEndeavours === true`; the new module
  early-returns `[]` when `hasActiveEndeavours === true` (the exact guard
  `downtime.ts` uses and `downtime.test.ts` asserts).
- New module vs `downtime.ts`: shares the no-active state deliberately, but **every
  id it emits is namespaced `endeavour:rec:<slug>`**, distinct from
  `endeavour:available`/`endeavour:active`, so no id collides.
- **No existing id, category, ordering entry, or module behaviour is touched**
  (FR-4.2). The new module's category is `'endeavour'`, so `orderSuggestions`
  places all three in the existing `endeavour` group with no new ordering logic.

**Semantic (same-endeavour) dedupe — explicit invariant (Finding 3).** Beyond id
uniqueness, the module guarantees **no two emitted suggestions name the same
endeavour**. The triggers partition by endeavour-name set:

- T1→T3 emit only the General/Template names **Healing, Income, Banking, Training**.
- T4 emits only `CLASS_ENDEAVOURS[class]` names.

These two name-sets are **verified disjoint** against the shipped catalog: no value
in `CLASS_ENDEAVOURS` equals `Healing`, `Income`, `Banking`, or `Training`
(confirmed in `src/logic/endeavours.ts` this pass). The module encodes this as a
guard: **T4 skips any class-endeavour name already emitted by T1–T3** (a
`Set<string>` of emitted endeavour names, checked before each class push). Today
the guard never triggers (the sets are disjoint), but it makes the invariant
explicit and future-proof if a class list ever gains a General name. Decision 6
adds a test asserting the emitted **endeavour names** (not just ids) are distinct.

**Id scheme (stable, serializable, slug-based like `diseases.ts`):**
`endeavour:rec:healing`, `endeavour:rec:income`, `endeavour:rec:banking`,
`endeavour:rec:training`, `endeavour:rec:class:<slug>`. Slugs use a local
`slugify` (lowercase, non-alphanumeric → `-`), the shape `diseases.ts` already
uses.

**Emission limits (noise control).** The ceiling is the **sum of the per-trigger
maxima**:

| Trigger | Max ids | ids |
|---|---|---|
| T1 Wounded | 1 | `endeavour:rec:healing` |
| T2 Low coin | 2 | `endeavour:rec:income`, `endeavour:rec:banking` |
| T3 Unspent XP | 1 | `endeavour:rec:training` |
| T4 Class surfacing | 2 | `endeavour:rec:class:<slug>` ×≤2 |
| **Hard ceiling** | **6** | 1 + 2 + 1 + 2 |

The module emits **at most 6** suggestions. Class surfacing is capped at **2**,
applied deterministically in **catalog order** (the order names appear in
`CLASS_ENDEAVOURS[class]`); triggers emit in fixed order T1→T2→T3→T4, so output is
stable. **Decision 6 asserts `length <= 6`.** No trimming below the per-trigger
maxima is performed, so there is no trim-order ambiguity.

Combined with `downtime.ts` in the shared no-active state: **at most 6
recommendations plus at most one `endeavour:available`** — which **may be absent**
when all slots are full (`downtime.ts` returns `[]` for `!hasFreeSlots &&
!noPeriods`). So the endeavour-category total in the no-active panel is **≤7** (an
upper bound, not always +1) (Finding 8).

---

## Decision 2 — Per-endeavour Test table (re-verified against the rulebook this pass)

Verified by reading `docs/WarhammerFantasyRoleplay4e.md`, Chapter 6 *Between
Adventures → Endeavours*. Page numbers are taken from the book's own index
(quoted below each row) and the section text was read directly. Only endeavours
whose RAW resolution is a **self-contained Test on a bare skill or a plain
characteristic that resolves unambiguously from the sheet** get a seeded `roll`.
Everything else is **guidance-only** (a `navigate` to the Endeavours page, no roll
button), per FR-3.4 and the governing constraint above.

### Verified source quotes (rules-compliance evidence)

- **Study a Mark** — index: *"Study a Mark 201"*. Text (p.201): *"Attempt a
  **Challenging (+0) Perception** Test, though the difficulty may be modified for
  especially easy or difficult marks."*
- **The Latest News** — index: *"(The) Latest News 201"*. Text (p.201): *"Attempt
  a **Challenging (+0) Gossip** Test."*
- **Foment Dissent** — index: *"Foment Dissent 200"*. Text (p.200): *"you must
  first attempt an **Average (+20) Gossip** Test … If you succeed, attempt a
  **Charm** Test with the Difficulty determined by how unpopular the target may
  be."* (stage 2 Charm is GM-set.)
- **Combat Training** — index: *"Combat Training 200"*. Text (p.200): *"attempt a
  **Challenging (+0)** Test using **either a Melee or Ranged Skill**."*
- **Research Lore** — index: *"Study a Mark 201"* section is preceded by Research
  Lore (p.200). Text: *"Attempt an **Average (+20) Lore** Test, using the
  **appropriate Lore Specialisation** … If you do not have the correct Lore
  Specialisation and are literate … a **Difficult (–10) Intelligence** Test."*
- **Reputation** — Text (p.200): header *"Academics, Burghers, Courtiers"*;
  *"requires a **Challenging (+0) Career Skill** Test."*
- **Off-class penalty** — Text (p.200, *Class Endeavours* intro): *"if you don't
  currently belong to the Classes specified … any Tests you take are **one
  Difficulty Level harder**."*
- **Income → Banking link** — Text (p.198 side, General): *"If you want to keep
  some of your hard-won coin … undertake the **Banking Endeavour on page 196**. If
  you want money at the beginning of the next adventure … undertake the **Income
  Endeavour on page 198**."*
- **Changing Career** — index: *"Changing Career 48, 196"* (XP/story, no Test).
- **Commission** — index: *"Commission 197"* (spend funds + time, no Test).
- **Income** — index: *"Income 198"* (flat status-based earnings, no Test).

### Endeavours the module recommends (the trigger set)

| Endeavour | Catalog source | Test-driven? | Exact seeded Test | Difficulty | Citation / reason |
|---|---|---|---|---|---|
| **Healing** | `ENDEAVOUR_TEMPLATES` "Healing" | **No** (guidance) | — | — | Core p.196–198: recovery/physician narrative; no single characteristic/skill Test for the *Healing endeavour* itself. Rest-based healing and the physician's Heal Test are owned by the existing health rules (`diseases.ts`, critical-wound guidance), NOT re-seeded here. Navigate-only. |
| **Income** | `ENDEAVOUR_TEMPLATES` "Income" + `GENERAL_ENDEAVOURS` "Income" | **No** (guidance) | — | — | Core **p.198**: flat status-based earnings; no Test. The *Earning skill* variant (Core p.52) is a separate mechanic, not the base Income endeavour. Navigate-only. |
| **Banking** | `GENERAL_ENDEAVOURS` "Banking" | **No** (guidance) | — | — | Core **p.196**: 1d10 interest + 1d100 outcome — a money mechanic, not a characteristic/skill Test. Navigate-only. |
| **Training** | `ENDEAVOUR_TEMPLATES` "Training" + `GENERAL_ENDEAVOURS` "Training" | **No** (guidance) | — | — | Core **p.198**: spend XP + money to a tutor to buy an Advance as if in-career; no pass/fail Test for a *skill/characteristic* Advance (only the Talent path, Unusual Learning, has a Test). Navigate-only. |
| **Combat Training** (Core p.200 header: Rangers, Warriors; catalog also under Soldiers) | `CLASS_ENDEAVOURS` | **No** (guidance) | — | — | **RAW is "either a Melee OR Ranged Skill" and both are specialisation-only on the sheet** (`Melee (Basic/Cavalry/…)`, `Ranged (Bow/…)` — no bare `Melee`/`Ranged`). The app cannot know which specialisation/weapon applies and `RollDialog` cannot ask, so **guidance-only** (navigate). Rationale states the RAW test (`Challenging (+0)`, Core p.200) so the player rolls their chosen specialisation via the normal controls. Catalog-membership note: `CLASS_ENDEAVOURS` lists Combat Training under Rangers, Warriors **and** Soldiers (`endeavours.ts`); the Core p.200 header lists only Rangers, Warriors. |
| **Research Lore** (Core p.200 header: Academics) | `CLASS_ENDEAVOURS` | **No** (guidance) | — | — | RAW is `Average (+20) Lore` **using the appropriate Lore Specialisation** (`Lore (…)` only on the sheet — no bare `Lore`), with an untrained-literate `Difficult (–10) Intelligence` branch. Specialisation-dependent + branching → **guidance-only** (navigate). Rationale states both RAW branches (Core p.200) so the player rolls the right one. |
| **Reputation** (Core p.200 header: Academics, Burghers, Courtiers; catalog also Nobles) | `CLASS_ENDEAVOURS` | **No** (guidance) | — | — | RAW is `Challenging (+0)` **Career Skill** — a player-dependent skill (could be WS/BS/Fel/…); the app cannot resolve it and `RollDialog` cannot ask. **Guidance-only** (navigate). Rationale states the RAW test and cost (Core p.200) so the player rolls their actual Career Skill. Class provenance: Core p.200 header = Academics/Burghers/Courtiers; `CLASS_ENDEAVOURS` *additionally* lists it under Nobles/Courtiers (verified `endeavours.ts`) — surfacing it for a Noble is an honest catalog-membership fact, not a Core-header claim. |
| **Study a Mark** (Core p.201: Rogues) | `CLASS_ENDEAVOURS` | **Yes** | `skill` **Perception** (fallbackChar `I`) | `Challenging (+0)` | Core **p.201** (quote above). `Perception` is a **bare** basic skill (`BLANK_CHARACTER.bSkills`, c:`I`) → the skill seed resolves correctly, advances reflected. |
| **The Latest News / Latest News** (Core p.201: Rangers, Riverfolk) | `CLASS_ENDEAVOURS` ("Latest News") | **Yes** | `skill` **Gossip** (fallbackChar `Fel`) | `Challenging (+0)` | Core **p.201** (quote above). `Gossip` is a **bare** basic skill (c:`Fel`) → resolves correctly. |
| **Foment Dissent** (Core p.200: Burghers, Peasants) | `CLASS_ENDEAVOURS` | **Yes** (stage 1 only) | `skill` **Gossip** (fallbackChar `Fel`) | `Average (+20)` | Core **p.200** (quote above): stage 1 `Average (+20) Gossip`. Stage 2 is a GM-set `Charm` Test → the rationale notes stage 2 is GM-set; the seed is stage 1 only. `Gossip` is bare → resolves correctly. |

**Seeded set = exactly three:** Study a Mark (Perception), The Latest News
(Gossip), Foment Dissent stage 1 (Gossip). Each is a **bare, non-specialised
basic skill** verified present in `BLANK_CHARACTER.bSkills`, so
`resolveReminderBaseTarget`'s `find(s => s.n === skillName)` hits the real row and
reflects advances. Everything else is guidance-only.

### Why Combat Training / Research Lore / Reputation / Animal Training are guidance-only (resolves Findings 1, 4, 5, 7)

`resolveReminderBaseTarget` (verified in `src/logic/reminders-target.ts`) resolves
a `{ kind:'skill'; skillName; fallbackChar }` seed by
`[...bSkills, ...aSkills].find(s => s.n === skillName)`; on a miss it silently
falls back to the bare `fallbackChar` characteristic, **dropping every
specialisation advance**. `RollDialog` cannot correct this (read-only base target,
no skill picker). So for any endeavour whose RAW skill is **specialisation-only or
player-chosen**, neither a skill seed (wrong — misses the row) nor a characteristic
seed (wrong — silently drops the player's specialisation advances, and the dialog
can't fix the number) is honest. The rules-honest choice is **guidance-only**:

| Core skill named by the endeavour | Stored on the sheet as | Decision |
|---|---|---|
| Melee / Ranged (Combat Training) | specialisations only (`Melee (Basic)` …, `Ranged (Bow)` …) — no bare row | **guidance-only** |
| Lore (Research Lore) | specialisations only (`Lore (Warfare)` …) — no bare row | **guidance-only** |
| "Career Skill" (Reputation) | not a sheet skill name (player-dependent) | **guidance-only** |
| Animal Training | specialisations only (`Animal Training (Demigryph/Dog/Horse/Pegasus/Pigeon)`, verified `src/data/advanced-skills.ts`) — **no bare `Animal Training` row** | **guidance-only** (not in trigger set; audit-corrected — Finding 1) |
| **Perception, Gossip** | **bare basic rows exist** (`BLANK_CHARACTER.bSkills`) | **seed as skill** |

> **Rejected alternative:** seeding these as a characteristic test (e.g. Combat
> Training → WS) so a number appears. Rejected because the dialog's base target is
> read-only: a trained/off-default character's seeded number would be wrong with
> no in-dialog recourse, and the earlier rationale promise "pick your
> specialisation in the dialog" describes a capability `RollDialog` does not have.
> Guidance-only is the only rules-honest option.

### Catalogued endeavours NOT in the trigger set (audit for completeness)

The module does not *recommend* these from tracked state; the audit records their
classification so no future implementer invents a seed:

- **Animal Training** — RAW `Average (+20) Animal Training` (Core p.196), but
  `Animal Training` exists **only as specialisations** on the sheet (no bare row),
  so if ever emitted it MUST be guidance-only, not a skill seed (would miss and
  silently fall back to bare Int — Finding 1). Guidance-only.
- **Consult an Expert** — stage 1 `Challenging (+0) Gossip` (Core p.196); stage 2
  `Charm`/GM-set. Mixed/indirect → guidance-only.
- **Crafting** — Extended `Trade` Test, difficulty by Availability, GM-set SL
  (Core p.197). Specialisation + extended + GM-set → guidance-only.
- **Invent!** — `Trade (Engineer)` Test, GM-set difficulty (Core p.198) →
  guidance-only.
- **Unusual Learning** — `Hard (–20)` Test on the GM-chosen "most relevant"
  characteristic/skill (+10 per prior failure), Core p.198. GM-set → guidance-only.
- **Changing Career, Commission, Custom Gear, Money to Burn, Duties &
  Responsibilities** — no Test (XP/funds/time/narrative), Core p.48/195–197 →
  guidance-only.
- **Up In Arms / unverifiable class endeavours in `CLASS_ENDEAVOURS`** — Drill,
  Challenge, Seek Patronage, Establish Contacts, Tournament (Warriors/Soldiers/
  Nobles), Preach Sermon, Pray for Guidance, Treat Patients, Research Remedy,
  Study Arcane Lore, Brew Potion, Perform, Compose, Serve Master, Gather Rumours —
  their exact Tests are **not verifiable** from the inlined Core text, so per
  rules-compliance they get **no seeded roll** (guidance-only). See OQ-7.

**FLAGGED AMBIGUITIES (do not silently resolve):**
- Combat Training's RAW "**either Melee or Ranged**" is a RAW player choice the
  app cannot make → resolved as guidance-only rather than silently narrowing to
  one branch (was a prior silent narrowing; now flagged + reclassified — Finding
  7b).
- Reputation "Career Skill" is player-dependent → guidance-only, not a seeded
  concrete skill.
- Research Lore's specialisation + untrained-literate branch → guidance-only; both
  branches stated in the rationale, neither auto-selected.
- Foment Dissent stage 2 (Charm, GM-set), Consult an Expert stage 2, Invent,
  Unusual Learning, Crafting SL → not seeded.
- Off-class Class-Endeavour penalty (one Difficulty harder, Core p.200) → **not
  applied to any number** (the three seeded endeavours are only ever offered under
  T4 for the matching class; the penalty note is added to the rationale, OQ-3).

---

## Decision 2 triggers — situation → endeavour mapping (grounded in tracked state)

Each trigger reads only already-tracked fields and recommends only catalogued
endeavours. Subjective picks are presented as options-with-rationale.

**T1 — Wounded / injured → Healing (guidance only).**
Predicate: `character.wCur < character.W` **OR** any active critical wound
(`getActiveCriticalWounds(character.criticalWounds).length > 0`) **OR** any active
disease (`(character.diseases ?? []).length > 0`).

> **Note (Finding 7 of the prior review):** `getActiveCriticalWounds` is currently
> a **dormant export** in `src/logic/critical-wounds.ts` (its doc comment: "not
> currently wired into the UI … kept exported deliberately"). **T1 becomes its
> first caller** — a benign activation, no behaviour change elsewhere.

Emits `endeavour:rec:healing` naming `ENDEAVOUR_TEMPLATES` "Healing", urgency
`recommended`, `navigate` → `endeavours`. **No roll.** It does not reuse or
duplicate the `diseases.ts`/`critical-wounds.ts` ids or roll affordances; it points
specifically at the downtime Healing endeavour.

**Rationale composition (Finding 9) — deterministic single string.** All
applicable clauses are joined with `"; "` in **fixed order (wounds, criticals,
diseases)**, so the output is a pure function of state:
`"You are at {wCur}/{W} Wounds"`, `"you have {n} unhealed Critical Wound(s)"`,
`"you have an active disease"`. Example (all three): `"You are at 3/12 Wounds; you
have 1 unhealed Critical Wound(s); you have an active disease"`. Citation: Core
p.196–198 (Between Adventures recovery).

**T2 — Low coin → Income (+ Banking option), guidance only.**
Predicate (DECIDED — was OQ-4): `wGC === 0 && wSS === 0` — the character holds no
gold and no silver (brass `wD` ignored, below the status thresholds Income/Earning
operate on). Core defines no numeric "low" threshold, so the only rules-honest,
deterministic, tracked-data trigger is "effectively out of spendable coin",
keeping Income **situational** (not a standing item that fires on every solvent
character). Emits `endeavour:rec:income` naming "Income" (navigate → `endeavours`),
and `endeavour:rec:banking` naming "Banking" (option-with-rationale: "preserve coin
across the Between-Adventures reset"). Both guidance-only. The Income↔Banking
pairing is cited to Income's own text (Core p.198, which names Banking on p.196 —
quoted above). Rationale echoes observed coin (see the tooltip rule below).

**T3 — Unspent XP → Training (+ Unusual Learning mention), guidance only.**
Predicate: `character.xpCur > 0`. Emits `endeavour:rec:training` naming "Training"
(navigate → `endeavours`), rationale "You have {xpCur} unspent XP — train an
out-of-career Advance as if in-career (Core p.198)." This nudge points only at the
*downtime Training endeavour* and uses a **distinct id** (`endeavour:rec:training`)
and **distinct category** from `learnable.ts`'s `advancement:learnable`
(category `advancement`), so it does not duplicate the Advancement-page purchase
nudge. Unusual Learning is mentioned in the rationale (guidance only; GM-set test,
OQ-6). Citation: Core p.198.

**T4 — Class-specific surfacing → `CLASS_ENDEAVOURS[class]` as options.**
Predicate: `character.class` non-empty and a key in `CLASS_ENDEAVOURS`. Emits up to
2 `endeavour:rec:class:<slug>` suggestions in catalog order, **skipping any name
already emitted by T1–T3** (the semantic-dedupe guard; disjoint today). For a class
endeavour in the **seeded set** (Study a Mark, Latest News, Foment Dissent) the
suggestion carries a seeded `roll` (Decision 4) **plus** a `secondaryAction`
navigate to `endeavours`; otherwise it is navigate-only. If `character.class` is
empty/unmatched, **no** class recommendation is emitted (mirrors
`buildPickerItems`). Citation: per-endeavour Core page from the table; the off-class
"one Difficulty harder" note (Core p.200) is added to the rationale when the
character's class is not one listed for that endeavour.

All triggers run inside the `!inCombat && !hasActiveEndeavours` gate (Decision 3).
FR-2.5 holds by construction: every emitted title names a member of
`GENERAL_ENDEAVOURS ∪ CLASS_ENDEAVOURS[class] ∪ ENDEAVOUR_TEMPLATES` — asserted by
the fast-check property (Decision 6).

---

## Decision 4 — Seeded-roll seam reuse (no parallel mutators)

A Test-driven recommendation sets its `action` to the EXISTING `SuggestionAction`
roll descriptor. All three seeds are **skill** seeds on **bare** skills:

```ts
// Study a Mark — Perception is a BARE skill row, so advances resolve:
action: {
  kind: 'roll',
  test: {
    def: { kind: 'skill', skillName: 'Perception', fallbackChar: 'I' }, // ReminderTest
    difficulty: 'Challenging',
    rollName: 'Study a Mark (Perception)',
  },
},
secondaryAction: { kind: 'navigate', page: 'endeavours' },

// The Latest News / Foment Dissent (stage 1) — Gossip is a BARE skill row:
action: {
  kind: 'roll',
  test: {
    def: { kind: 'skill', skillName: 'Gossip', fallbackChar: 'Fel' },
    difficulty: 'Challenging', // Latest News; 'Average' for Foment Dissent stage 1
    rollName: 'The Latest News (Gossip)',
  },
},
secondaryAction: { kind: 'navigate', page: 'endeavours' },
```

No characteristic seeds are emitted. Because all three seeds target bare skill rows
that exist in `BLANK_CHARACTER.bSkills`, `resolveReminderBaseTarget` resolves the
real row and reflects advances — no phantom fallback. This reuses the `ReminderTest`
shape verbatim, so **no new roll logic** is introduced. The path is already wired
and tested:

1. `SuggestionItem` renders the primary button labelled `test.rollName` and calls
   `onAction(action)`.
2. `onAction` is the existing `useAssistantActions` dispatcher. Its `roll` branch
   calls `resolveReminderBaseTarget(character, action.test.def)` → `baseTarget`,
   then `openReminderRoll({ name, baseTarget, difficulty })`.
3. In `App.tsx`, `openReminderRoll` renders the shared `RollDialog` with
   `skillOrCharName`, `baseTarget`, and `defaultDifficulty` — identical to
   `CombatDashboard.handleRollReminder` / `CombatPage.onGuideRollReminder`.
4. The player rolls; `handleReminderRollResult` records the result via `addRoll`.
   The `RollResult` and WFRP outcome text are shown by the existing roll flow.

**No auto-apply, no auto-complete (FR-3.3):** the dispatcher only *seeds and opens*
the dialog. It never mutates the character, changes any `EndeavourEntry.status`,
applies money/XP/wounds, or advances a skill — already asserted by
`useAssistantActions.test.tsx` ("never mutates the character") and re-asserted here
(Decision 6). After rolling, the player applies the outcome through the **existing
Endeavours-page controls only**: the status button (`cycleStatus` via
`updateEndeavourEntry`), the cost/notes inputs, and the money/XP fields on their own
pages. There is **no parallel mutator**.

**Confirmed navigation targets.** `catalog-integration.test.ts` enforces that every
emitted `navigate` route is one of `combat:`, `character:notes`, `advancement:`,
`endeavours:`. All navigate actions here use `{ kind:'navigate', page:'endeavours' }`
(route `endeavours:`), a real `PageSection` with the `#endeavours` hash route and in
the valid set. No sub-tab (the Endeavours page has none).

**Difficulty defaulting (FR-3.5).** The three seeded difficulties are RAW-fixed
(`Challenging`/`Average`), not GM-set. The dialog's Difficulty select lets the
player adjust for circumstance (including the off-class −1 level when applicable).
No invented fixed TN.

---

## Decision 5 — Future-proofing seam

The recommendation logic is a **pure function** `downtimeRecommendationSuggestions
(character, context): Suggestion[]`, same signature family as every other rule
module, composed inside `getSuggestions`. The `SuggestionSource` boundary in
`types.ts` is left **unchanged** — its return type stays `Suggestion[] |
Promise<Suggestion[]>`, and `deterministicSuggestionSource` remains synchronous (the
permanent offline fallback). A later LLM-backed advisor is therefore a non-breaking
augmentation: an *alternative* `SuggestionSource` that returns the `Promise` branch,
consumed by the same panel via the existing `Array.isArray` narrowing in `App.tsx`.
No network/LLM now (NFR-1). Because recommendations are plain, serializable
`Suggestion` data, an async source could later merge/reorder them with no UI rewrite.

---

## Module boundary, types, and file-level plan

### New files

**`src/logic/assistant/rules/downtime-recommendations.ts`** (the rule module)

```ts
import type { Character } from '../../../types/character';
import type { Suggestion, SuggestionContext } from '../types';
import { hasActiveEndeavours, CLASS_ENDEAVOURS } from '../../endeavours';
import { getActiveCriticalWounds } from '../../critical-wounds'; // activates a dormant export
import { resolveSeededTarget } from '../../reminders-target';    // total + breakdown (one source)
import type { ReminderTest } from '../../reminders';
import type { DifficultyLevel } from '../../dice-roller';
// pure helpers only; no React, storage, navigation, or network.

export function downtimeRecommendationSuggestions(
  character: Character,
  ctx: SuggestionContext,
): Suggestion[] { // Core p.195-201 (Between Adventures — Endeavours)
  if (ctx.inCombat) return [];                   // FR-1.3 out-of-combat only
  if (hasActiveEndeavours(character)) return []; // Decision 3 mutual exclusion
  // T1..T4 build suggestions; T4 skips names already emitted (semantic dedupe);
  // class surfacing capped at 2; hard ceiling 6; return.
}
```

Internals:
- A private const `SEEDABLE_CLASS_ENDEAVOURS: Record<string, { def: ReminderTest;
  difficulty: DifficultyLevel; citation: string; rollName: string }>` keyed by the
  endeavour name as it appears in `CLASS_ENDEAVOURS`, containing **exactly** the
  three bare-skill seeds (`'Study a Mark'` → Perception; `'Latest News'` → Gossip;
  `'Foment Dissent'` → Gossip). Each row carries a `// Core p.NNN` comment with the
  quoted RAW test. Any class endeavour **not** in this table is surfaced
  navigate-only.
- A `slugify` local helper (same shape as `diseases.ts`) for stable ids.
- A `Set<string>` tracking emitted endeavour names, so T4 can skip a name T1–T3
  already emitted (semantic dedupe guard, Finding 3).
- The seeded `Base Target` total comes from the shared `resolveSeededTarget
  (character, def)` — the module does **not** recompute it; it wraps `{ total,
  lines }` into a `SuggestionTotal`.

**Test files (new):**
- `src/logic/assistant/__tests__/downtime-recommendations.test.ts` — unit +
  fast-check (Decision 6 properties AC-5/7/8/9/11).
- `src/components/assistant/__tests__/SuggestionItem.downtime.test.tsx` — the
  seeded-total tooltip render and the "no roll button for guidance-only
  endeavours" render (AC-6/7/10). May fold into an existing `SuggestionItem` test
  file if one exists; otherwise a sibling.

### Edited files (minimal, additive)

**`src/logic/assistant/engine.ts`** — one import + one spread inside
`getSuggestions`, beside the other catalog-expansion modules:

```ts
import { downtimeRecommendationSuggestions } from './rules/downtime-recommendations';
// ...
    ...downtimeRecommendationSuggestions(character, context), // out-of-combat only
```

No other change. `orderSuggestions` and the `SuggestionSource` boundary are
untouched; category `'endeavour'` already exists in both ordering tables.

**`src/logic/reminders-target.ts`** — a **value-preserving refactor** (Finding 2 /
6): extract `resolveSeededTarget(character, def): { total, lines }` and reduce
`resolveReminderBaseTarget` to `resolveSeededTarget(...).total`. The exported
`resolveReminderBaseTarget` signature and return value are **byte-identical** for
every existing caller (`useAssistantActions`, `CombatDashboard`), so
`useAssistantActions.test.tsx`, `catalog-integration.test.ts`, and the combat tests
stay green unchanged; `resolveSeededTarget` is purely additive. **This is the one
mandated implementation — there is NO alternative-placement escape hatch** (the
prior draft's "may instead live in a new seeded-target.ts that calls
resolveReminderBaseTarget for the total and reads fields separately for the lines"
is **REJECTED**, because two paths can drift — total and lines MUST come from the
same branch of one function; Finding 6).

No change to `rules/endeavours.ts`, `rules/downtime.ts`, `types.ts`, `ordering.ts`,
`useAssistantActions.ts`, `SuggestionItem.tsx`, `App.tsx`, `EndeavoursPage.tsx`,
`RollDialog.tsx`, or any catalog/mutator file.

---

## Calculated-total tooltips (FR-5 / steering: calculated-total-tooltips)

The only calculated total this feature surfaces is a **seeded Test's base target**
(the three bare-skill seeds). One helper produces the total **and** its breakdown by
the **same branch logic** as `resolveReminderBaseTarget`, so `display` and the
summed `lines` cannot diverge.

**New shared helper (co-located with the resolver so the two cannot drift):**

```ts
// src/logic/reminders-target.ts  (Core p.117 skill→characteristic mapping)
export function resolveSeededTarget(
  character: Character,
  def: ReminderTest,
): { total: number; lines: string[] } {
  if (def.kind === 'characteristic') {
    const c = character.chars[def.char];
    const total = computeCharacteristicTarget(c.i, c.a, c.b);
    return { total, lines: [`${def.char} ${total} (Initial ${c.i} + Advances ${c.a} + Bonus ${c.b})`] };
  }
  const skill = [...character.bSkills, ...character.aSkills].find((s) => s.n === def.skillName);
  if (skill) {
    // Finding 2: derive the LABEL characteristic the SAME safe way as the value —
    // never read the free-form skill.c directly for display. Fall back to the
    // known fallbackChar when skill.c is not a real characteristic key.
    const charKey: CharacteristicKey =
      (skill.c as CharacteristicKey) in character.chars
        ? (skill.c as CharacteristicKey)
        : def.fallbackChar;
    const cv = character.chars[charKey];
    const charSubtotal = computeCharacteristicTarget(cv.i, cv.a, cv.b);
    const total = computeSkillTarget(cv.i, cv.a, cv.b, skill.a);
    return {
      total,
      lines: [
        `${charKey} ${charSubtotal} (Initial ${cv.i} + Advances ${cv.a} + Bonus ${cv.b})`,
        `${def.skillName} Advances +${skill.a}`,
        `= ${total}`,
      ],
    };
  }
  const c = character.chars[def.fallbackChar];
  const total = computeCharacteristicTarget(c.i, c.a, c.b);
  return {
    total,
    lines: [
      `${def.fallbackChar} ${total} (Initial ${c.i} + Advances ${c.a} + Bonus ${c.b})`,
      `${def.skillName} untrained — characteristic only`,
    ],
  };
}

export function resolveReminderBaseTarget(character: Character, def: ReminderTest): number {
  return resolveSeededTarget(character, def).total;
}
```

The `charKey in character.chars` guard (Finding 2) ensures the breakdown label
always names a **real** characteristic even for a malformed/empty `skill.c` (the
repo has rows like `Melee ()` / `Stealth ()`), matching the shipped resolver's
deliberate avoidance of a raw free-form `skill.c` read. The value and the label use
the same `charKey`, so they cannot diverge.

The engine wraps the helper output:

```ts
const { total, lines } = resolveSeededTarget(character, def);
totals: [{ label: 'Base Target', display: String(total), lines }]
```

`display === String(total)` and the breakdown explains *that* number (FR-5.2).
`SuggestionItem` already renders `suggestion.totals` through `TooltipTriggerCell` +
`Tooltip`, so **no UI change** is needed.

**Guidance-only recommendations carry no `totals`** (no calculated total is shown).
This includes Combat Training, Research Lore, Reputation, Healing, Income, Banking,
Training.

**Coin figure in the Income rationale — explicit rule (Finding 10).** The Income/
low-coin rationale **echoes the three tracked coin fields verbatim with no
arithmetic between them** (e.g. `"You hold 0 GC, 0 SS, 4 d"`). There is no derived
total, so there is no breakdown to show and no tooltip is required. If a
converted/summed coin figure were ever displayed it would ship as a
`SuggestionTotal` with `lines`, per the steering rule.

---

## Error handling and validation (per operation)

The module is pure and total; it cannot throw on well-typed input.

- **Absent character** — handled upstream: `getSuggestions` returns `[]` for
  `undefined`. The module is never called with `undefined`.
- **`character.class` empty / not a `CLASS_ENDEAVOURS` key** — no class
  recommendation (recoverable, silent; mirrors `buildPickerItems`). Not logged.
- **`character.diseases` / `criticalWounds` missing/empty** — coalesced with `?? []`
  / `getActiveCriticalWounds`; contributes nothing to T1. Recoverable, silent.
- **Frozen input** — no mutation performed; tolerant of `Object.freeze` (NFR-2).
- **Class endeavour not in `SEEDABLE_CLASS_ENDEAVOURS`** — falls through to
  navigate-only (no seed). Safe default; prevents inventing a test.
- **Malformed `skill.c` on a seeded skill row** — the `charKey in character.chars`
  guard falls back to `fallbackChar` for both value and label (Finding 2); never
  throws, never prints a bogus characteristic.
- **Unknown `SuggestionAction` kind at dispatch** — handled by
  `useAssistantActions`'s exhaustiveness `default`. Not reachable here (module emits
  only `roll`/`navigate`).

No I/O, so no network/storage failure modes. No `try/catch` is introduced (nothing
throws; fix-errors rule: no broad swallow).

### Input validation (each external input)

Sole external input is `(character, context)`:
- `context.inCombat`: boolean, required; `true` ⇒ `[]`.
- `character.wCur` / `W`: numbers, compared directly (NaN-safe: `wCur < W` is
  `false` on NaN → no spurious T1).
- `character.xpCur`: number; `> 0` triggers T3.
- `character.wGC` / `wSS` / `wD`: numbers; T2 predicate `wGC === 0 && wSS === 0`.
- `character.class`: string; looked up in `CLASS_ENDEAVOURS`.
- `character.diseases`: optional array; coalesced.

All are already-tracked, strongly-typed fields; no free-form parsing (endeavour
names come from the typed catalogs, not user input).

---

## Invariant ownership

- **"Recommended endeavour ∈ catalog"** — owned by the module (names read only from
  `GENERAL_ENDEAVOURS` / `CLASS_ENDEAVOURS` / `ENDEAVOUR_TEMPLATES`); enforced by
  the fast-check property (AC-5).
- **Mutual exclusion / no double-fire (ids AND endeavour names)** — owned jointly by
  the three modules via the shared `hasActiveEndeavours` predicate, distinct id
  namespaces, and the T4 semantic-dedupe guard (Decision 3); enforced by the
  property test (AC-8).
- **No mutation on action** — owned by `useAssistantActions` (dispatch layer);
  re-asserted (AC-6).
- **Status/outcome application** — owned by the Endeavours-page mutators only; the
  assistant has no write path (NFR-5).
- **Seeded total ≡ breakdown sum ≡ resolver** — owned by the single
  `resolveSeededTarget` helper (Finding 6); enforced by the parity test (AC-10).

---

## Decision 6 — Test plan

**fast-check properties** (`downtime-recommendations.test.ts`), over arbitrary
tracked state (wounds, coin, xp, class drawn from `Object.keys(CLASS_ENDEAVOURS)` ∪
junk strings, inCombat):

- **P1 (pure/deterministic/serializable):** identical `(character, context)` →
  deep-equal output; `getSuggestions(structuredClone(c), ctx)` equals the original
  (reuse the engine determinism harness); `assertNoFunctions` on every emitted
  suggestion (AC-9). Tolerant of `Object.freeze`.
- **P2 (catalog-only):** for arbitrary state, every emitted recommendation's named
  endeavour ∈ `GENERAL_ENDEAVOURS ∪ CLASS_ENDEAVOURS[class] ∪ ENDEAVOUR_TEMPLATES`
  (AC-5).
- **P3 (Recover predicate iff):** `endeavour:rec:healing` appears **iff** `wCur < W`
  OR an active critical wound OR an active disease (and `!inCombat &&
  !hasActiveEndeavours`) (AC-5).
- **P4 (mutual exclusion):** the module is empty whenever `endeavourSuggestions`
  (`endeavour:active`) is non-empty; no emitted id equals `endeavour:active` /
  `endeavour:available`; and the **emitted endeavour NAMES are distinct** (not just
  ids — Finding 3) (AC-8).
- **P5 (citations):** every emitted recommendation and every roll seed carries a
  non-empty `citation` (AC-11).

**Unit tests:**
- T1/T2/T3/T4 each fire on their predicate and emit the right endeavour name, id,
  category `'endeavour'`, and action kind.
- The three seeded endeavours (Study a Mark, Latest News, Foment Dissent) carry a
  `roll` action whose seeded `Base Target` total equals
  `resolveReminderBaseTarget(character, action.test.def)` **and** whose breakdown
  `lines` sum to that total — i.e. `lines`-sum === `display` ===
  `resolveReminderBaseTarget(...)` (Finding 6) — and whose `difficulty` matches the
  verified table (`Challenging`/`Challenging`/`Average`) (AC-6).
- **Bare-skill correctness:** on a character with trained `Perception` / `Gossip`
  (e.g. +10 advances), the seed's base target **differs from the bare
  characteristic**, proving the skill row resolves and advances are reflected (not a
  silent fallback).
- **Malformed `skill.c` label safety (Finding 2):** a skill row with empty/garbage
  `c` still yields a well-formed breakdown line naming `fallbackChar` (no bogus
  characteristic label, no throw).
- **Guidance-only endeavours → no roll (AC-7):** Healing, Income, Banking, Training,
  **Combat Training, Research Lore, Reputation** each emit a `navigate` action and
  **no** `roll` action / no roll `secondaryAction`.
- **Semantic dedupe (Finding 3):** assert emitted endeavour NAMES are distinct for a
  class whose list could in principle overlap; assert the T4 guard skips a T1–T3
  name (constructed test fixture).
- Emission cap: `suggestions.length <= 6`; class surfacing capped at 2 (a class with
  >2 endeavours, e.g. Warriors, surfaces exactly 2 in catalog order).
- Navigate routes are only `endeavours:` (re-assert locally or via the existing
  `catalog-integration.test.ts` valid-route set, which already contains it).

**Component tests** (`SuggestionItem.downtime.test.tsx`):
- A seeded suggestion carrying a `Base Target` `SuggestionTotal` renders a breakdown
  tooltip via `TooltipTriggerCell`, and the breakdown lines equal the
  engine-provided `total.lines` (not recomputed) (AC-10).
- Invoking the roll affordance (mocked `onAction`) does **not** mutate the character
  or any `EndeavourEntry.status` on open or roll (AC-6) — reuse the
  `useAssistantActions.test.tsx` "never mutates" assertion against a snapshot.
- A guidance-only recommendation renders **no** roll button (only "Go") (AC-7).

**Existing tests stay green UNCHANGED.** `engine.test.ts`, `downtime.test.ts`,
`catalog-integration.test.ts`, `useAssistantActions.test.tsx`, and the endeavours
logic tests are **not edited**. The `reminders-target.ts` refactor is
value-preserving, so `useAssistantActions.test.tsx` and the combat tests that
consume `resolveReminderBaseTarget` remain green with no edit.

**Verification commands (AC-1..AC-4):** `npx tsc --build --force --noEmit`,
`npm run build`, `vitest --run`, `npx eslint .` — all clean; no new
suppression/`@ts-ignore`/`eslint-disable` added.

---

## Resolved decisions (were open questions)

- **OQ-1 → DECIDED (roll-button set).** Exactly three seeded Tests: Study a Mark
  (`Perception`), The Latest News (`Gossip`), Foment Dissent stage 1 (`Gossip`) —
  all **bare** basic skills verified on the sheet, all RAW-verified against Core
  p.200–201 this pass. Everything else is guidance-only. Combat Training, Research
  Lore, Reputation, Animal Training are guidance-only because their RAW tests are
  specialisation-dependent or player-dependent and `RollDialog` cannot ask which
  applies.
- **OQ-2 → DECIDED (seed shapes & fallbacks).** Skill seeds use `fallbackChar` per
  Core p.117 (Perception→I, Gossip→Fel). No characteristic seeds are emitted.
- **OQ-4 → DECIDED (low-coin threshold).** `wGC === 0 && wSS === 0` (T2). Income is a
  situational nudge, not a standing item.
- **OQ-5 → DECIDED (overlap with `downtime.ts`).** The new module fires **alongside**
  `endeavour:available` in the same no-active state; `downtime.ts` is not suppressed.
  Combined endeavour-category upper bound ≤7 (≤6 recs + at most one
  `endeavour:available`, which may be absent when all slots are full).

## Open questions (genuine rulebook ambiguities — flagged, not guessed)

- **OQ-3 — off-class Class-Endeavour penalty.** Core p.200: a non-member takes the
  Test *one Difficulty Level harder*. **Default:** the three seeded difficulties are
  seeded at their **base** RAW value; the rationale adds "−1 Difficulty Level if this
  is not your Class (Core p.200); adjust in the dialog" when the character's class is
  not listed for the endeavour. Not pre-applied (would invent a modified TN). The
  player applies it via the Difficulty select. **Confirm** whether the seed should
  instead pre-apply the shift.
- **OQ-6 — Unusual Learning / Research Lore "most relevant" skill.** Core leaves the
  skill/characteristic to GM choice / specialisation. Kept **guidance-only**.
  **Confirm** this stays guidance-only.
- **OQ-7 — Up In Arms / unverified Class Endeavours.** Drill, Challenge, Seek
  Patronage, Establish Contacts, Tournament, Preach Sermon, Pray for Guidance, Treat
  Patients, Research Remedy, Study Arcane Lore, Brew Potion, Perform, Compose, Serve
  Master, Gather Rumours — exact Tests **not verifiable** from the inlined Core text,
  so **guidance-only** (no seeded roll). They still **surface** navigate-only under
  T4 so a class player sees them. **Confirm** which (if any) gain a seeded Test once
  the source is available.

---

## Out of scope (unchanged from requirements)

Inventing endeavours/effects/costs/difficulties; auto-applying money/XP/wounds or
auto-completing entries; any parallel mutator; any **new roll resolver** (the
`resolveSeededTarget` extraction is a value-preserving refactor, not a new formula);
any network/backend/telemetry/LLM; rebuilding/forking the Endeavours page, the
catalog, or the engine ordering; changing `endeavours.ts`/`downtime.ts` behaviour;
any change to `RollDialog`.

---

## Responses to design-review findings (this revision pass)

Review: `design-review.md` / `design-review.json` — verdict CHANGES_REQUESTED
(2 HIGH: 4, 5; 5 MEDIUM: 1, 2, 3, 6, 7; 3 NIT: 8, 9, 10). All **addressed**; none
backlogged. The parent-session scope directive (reclassify every
specialisation/player-dependent test to guidance-only; keep seeded rolls only for
bare-skill/plain-characteristic tests) is baked in and supersedes the earlier
"seed as characteristic" approach.

- **Finding 4 (HIGH) — Combat Training/Research Lore promise an in-dialog
  specialisation pick `RollDialog` lacks.** **Addressed.** Verified `RollDialog`
  shows a read-only base target and only a Difficulty select. Combat Training and
  Research Lore are now **guidance-only** (navigate, no roll button); no in-dialog
  pick is promised. The rationale states the RAW test so the player rolls their own
  specialisation via normal controls.
- **Finding 5 (HIGH) — Reputation seeds a bare Fel test for a player-dependent
  "Career Skill".** **Addressed.** Reputation is now **guidance-only** (navigate, no
  roll button, no total), consistent with the design's own rule that player-dependent
  tests are not seeded. The rationale states the RAW test + cost (Core p.200).
- **Finding 1 (MEDIUM) — Animal Training mis-classified as a bare skill.**
  **Addressed.** Verified `src/data/advanced-skills.ts`: Animal Training exists only
  as specialisations, no bare row. The audit now states it is specialisation-only and
  **guidance-only** (if ever emitted it must not be a skill seed). Moved into the
  specialisation-only group of the skill-reality table.
- **Finding 2 (MEDIUM) — breakdown lines reintroduce the free-form `skill.c` read.**
  **Addressed.** The skill branch derives the label characteristic safely:
  `charKey = (skill.c in character.chars ? skill.c : def.fallbackChar)`, used for
  both value and label. Unit test added asserting a garbage-`c` row yields a
  well-formed line naming `fallbackChar`.
- **Finding 3 (MEDIUM) — no explicit same-endeavour (name) dedupe across triggers.**
  **Addressed.** Decision 3 adds the invariant (T1–T3 names are disjoint from T4's,
  verified) plus a T4 `Set<string>` guard skipping any already-emitted name, backed
  by a test asserting emitted endeavour **names** are distinct.
- **Finding 6 (MEDIUM) — alternative placement reintroduces total/lines drift.**
  **Addressed.** The alternative-placement escape hatch is **REJECTED/removed**; one
  mandated `resolveSeededTarget` returns `{ total, lines }` from one branch, with
  `resolveReminderBaseTarget` delegating to `.total`. Parity test added:
  `lines`-sum === `total` === `resolveReminderBaseTarget(character, def)`.
- **Finding 7 (MEDIUM) — citations unverifiable; Combat Training "Melee or Ranged"
  silently narrowed.** **Addressed.** (a) Each kept citation/test is **re-verified
  against `docs/WarhammerFantasyRoleplay4e.md` this pass** and the RAW sentence is
  quoted in Decision 2 ("Verified source quotes"); page numbers taken from the book's
  index (Study a Mark 201, Latest News 201, Foment Dissent 200, Reputation/Research
  Lore/Combat Training 200, Income 198, Banking 196, Changing Career 48/196,
  Commission 197). (b) The "Melee or Ranged" either/or is now a **flagged decision**
  resolved to guidance-only, not a silent narrowing.
- **Finding 8 (NIT) — "≤7 combined" prose could read as always +1.** **Addressed.**
  Reworded to "≤6 recommendations plus **at most one** `endeavour:available` (which
  may be absent when all slots are full)".
- **Finding 9 (NIT) — T1 rationale composition ambiguous.** **Addressed.** Specified:
  join all applicable clauses with "; " in fixed order (wounds, criticals, diseases);
  worked example given.
- **Finding 10 (NIT) — "coin total not a calculated total" left implicit.**
  **Addressed.** Stated as an explicit rule: the rationale echoes the three tracked
  coin fields verbatim with no arithmetic between them, so there is no derived total;
  any converted/summed figure would ship as a `SuggestionTotal`.
