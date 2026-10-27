# Requirements — Guided Disease Progression & Guided Corruption / Mutation

## Summary

Add two opt-in, off-by-default guided flows to the WFRP 4e character-sheet PWA: **Guided Disease Progression** (per active disease) and **Guided Corruption / Mutation**. Each is an assistant-style, step-by-step co-pilot that walks a player through the *existing* disease and corruption machinery as an ordered, rulebook-cited sequence. The flows **guide and suggest; the player decides and acts.** They never auto-apply, auto-roll, auto-advance, or auto-complete anything — every step is explicit and player-driven, and every action routes through the app's existing surfaces: the shared `RollDialog` (for characteristic/bare-skill tests), the existing mutation roller in `CorruptionCard`, and the existing controls in `DiseasePanel` / `CorruptionCard`.

These flows complete the "guided procedures" set alongside the shipped **Guided Combat Turn** (`src/logic/combat-turn/` + `GuidedTurnPanel`) and **Guided Spellcasting** (`src/logic/guided-cast/` + `GuidedCastPanel`). They are the deeper "walk me through resolving it" destination for the disease/corruption suggestions the Character Assistant already surfaces (`src/logic/assistant/rules/diseases.ts`, `corruption.ts`), and must **not** fork or duplicate those rules, nor the pure logic in `src/logic/diseases.ts` / `src/logic/corruption.ts` / `src/data/mutation-tables.ts`.

Scope is intentionally orchestration-only: no new disease/symptom/corruption/mutation math, no new tables, no new difficulties, odds, or thresholds. The flows arrange *existing* computed values and existing controls into a guided order with short, cited explanations.

### Confirmed scope decision (seed-roll rule)

The existing `RollDialog` has a **read-only** base target and only a **Difficulty** select — it has **no** skill/characteristic picker. Applying the lesson from the Downtime/Endeavour Assistant, a step may **seed a roll** only when the test resolves on a characteristic or a **bare (non-specialisation) skill** the app can resolve unambiguously via the existing `resolveSeededTarget` / `resolveReminderBaseTarget` seam.

- **Disease symptom tests** are Endurance or Cool tests, characteristic-backed via `getSymptomTestBaseTarget` → **safe to seed**.
- **Corruption resistance** is a Challenging (+0) Endurance test → **safe to seed**.
- **Mutation TYPE / result rolls** are d100 table lookups with no skill/characteristic → rolled via the **existing mutation roller in `CorruptionCard`**, NOT the `RollDialog`.
- Anything requiring a specialisation choice or a GM-set choice (e.g. difficulty/influence strength the GM sets) is **guidance-only**.

## Functional Requirements

### FR-1 — Opt-in, off-by-default, dismissible entry points

- FR-1.1 Each flow is reachable only through an explicit opt-in trigger, mirroring `GuidedTurnTrigger` / `GuidedCastTrigger` (text label on desktop, icon-only with `aria-label` on mobile). Nothing opens automatically.
- FR-1.2 The Guided Disease Progression trigger is rendered per active disease within the Diseases surface (Character → Notes tab); the Guided Corruption / Mutation trigger is rendered within the Corruption surface (Character → Notes tab).
- FR-1.3 Both flows are **off by default**: with the guide closed, `DiseasePanel` and `CorruptionCard` render and behave exactly as they do today (same DOM/semantics aside from the single new trigger element each).
- FR-1.4 Each flow is dismissible at any step (close button, `Esc`, and backdrop click), matching the existing guided panels.

### FR-2 — Guided Disease Progression steps (per active disease), in order

The flow operates on one selected `ActiveDisease` and presents the RAW procedure (Core p.186–188) as explicit steps. It reuses `src/logic/diseases.ts` helpers only.

- FR-2.1 **Step 1 — Overview.** Show the disease name, its resolved symptoms (`getDiseaseSymptoms`), and incubation/duration status (`getDiseaseProgress` compared against the rolled Duration persisted on the disease). Incubation/Duration rolls, if not yet rolled, use the **existing** `DiseasePanel` timing-roll control (`rollDiseaseTiming` → `setDiseaseTiming`); the guide surfaces that control, it does not re-roll. (Core p.186: Using Diseases — Incubation/Duration.)
- FR-2.2 **Step 2 — Per-symptom resolution.** For each symptom show its description/effect and, where `getSymptomTest(symptom.name, symptom.severity)` returns a test, surface it:
  - The base symptom **name** (not `displayName`) is passed to `getSymptomTest`, consistent with `DiseasePanel`.
  - When a test exists (Endurance/Cool + difficulty + cadence), a one-tap control **seeds the existing `RollDialog`** with the base target from `getSymptomTestBaseTarget(character, skill)` and the difficulty from the symptom test. (Core p.187–188: Disease Symptoms.)
  - Show the cadence verbatim from `getSymptomTest` (e.g. Blight → "Daily (or die)"; Gangrene → "Daily (fail > TB times = lose location)"), and for Gangrene show the **TB threshold** from `getToughnessBonus(character)`.
  - Gangrene's Hit Location roll (`symptomRollsHitLocation` true) is surfaced via the **existing** `DiseasePanel` Gangrene-location mechanism (`getHitLocation`), not re-implemented. (Core p.188: Gangrene.)
  - Symptoms whose `getSymptomTest` returns `null` (Convulsions, Coughs and Sneezes, Fever, Flux, Malaise, Nausea) are **guidance-only** — show the effect and a short note; seed no roll.
- FR-2.3 **Step 3 — Duration / outcome guidance.** Explain, as guidance only, what happens when the Duration is reached: the disease ends, and any `Lingering` symptom calls for an Endurance test (difficulty via `getLingeringDifficulty`) whose outcomes (extend duration / Festering Wound / Blood Rot) are described per RAW. The Lingering test itself, being Endurance, may be seeded; the GM-adjudicated consequences are guidance. (Core p.186–188.)
- FR-2.4 The player rolls via the seeded `RollDialog` and applies every outcome through the **existing** `DiseasePanel` controls (elapsed-day adjustment, notes, symptom roll display). The guide applies nothing and marks nothing complete.

### FR-3 — Guided Corruption / Mutation steps, in order

The flow reuses `src/logic/corruption.ts` helpers only and mirrors the existing corruption suggestion's rule framing (`src/logic/assistant/rules/corruption.ts`).

- FR-3.1 **Step 1 — Threshold check.** Show current corruption vs `getCorruptionThreshold(chars, pureSoulLevel)` (TB + WPB + Pure Soul, via `getPureSoulLevel`). Explain that gaining more Corruption points than the threshold triggers a **Challenging (+0) Endurance** test to resist corrupting, citing Core p.183 ("Dissolution of Body and Mind"). Note explicitly that the **app surfaces corruption danger at `>= threshold`** for UI consistency with `getCorruptionStatus`, while the rulebook wording is strictly "more than" the threshold (see Ambiguities A-4).
- FR-3.2 **Step 2 — Resistance test.** A one-tap control **seeds the existing `RollDialog`** for a Challenging (+0) Endurance test (base target via the existing `resolveSeededTarget` seam, difficulty `Challenging`). Explain, as guidance, that **failure = gaining a mutation**, **success = no mutation this time** (must test again next time corruption is gained). The guide does not interpret or apply the result.
- FR-3.3 **Step 3 — Mutation resolution (on failure, player-driven).** Guide the player to the **existing mutation roller in `CorruptionCard`**:
  - Determine mutation type by species (`getMutationTypeDistribution` / `determineMutationType`) → physical or mental, then `lookupMutation` on the d100. These d100 rolls go through the existing roller, **not** the `RollDialog`.
  - Show the mutation limits `getPhysicalMutationLimit` (= TB) and `getMentalMutationLimit` (= WPB), and the corruption-point loss on gaining a mutation `getCorruptionLossOnMutation` (= WPB).
  - The player adds the mutation via the **existing** `CorruptionCard` "Add to Character" control (which already decrements corruption by WPB). The guide adds nothing.

### FR-4 — No new logic; route through existing surfaces

- FR-4.1 No disease/symptom/corruption/mutation calculation is re-implemented. All numbers come from the named `diseases.ts` / `corruption.ts` helpers or the existing reminder-target seam.
- FR-4.2 Seedable tests use the existing `ReminderTest` shape and `resolveSeededTarget` / `resolveReminderBaseTarget` + `performRoll`; `performRoll` stays the single roll resolver. Mutation d100s use the existing `CorruptionCard` roller.
- FR-4.3 The existing Character Assistant disease/corruption rules are reused as the entry point, not forked. The guided flows are an additional destination.

### FR-5 — Pure reducer + overlay architecture (mirror existing guided flows)

- FR-5.1 Each flow's state is modelled as a **pure, React-free, JSON-serializable reducer** under `src/logic/` (mirroring `src/logic/guided-cast/` and `src/logic/combat-turn/`): plain data, explicit player events, no auto-advance, no character mutation.
- FR-5.2 Step copy comes from a **deterministic, synchronous default advisor** following the `SuggestionSource` / `CastAdvisorSource` sync-or-async-union contract, so a future LLM-backed advisor is a non-breaking swap. v1 ships only the sync default and makes **no** network/LLM/telemetry call.
- FR-5.3 The UI is a portal overlay/stepper mirroring `GuidedCastPanel` / `GuidedTurnPanel`: `role="dialog"` + `aria-modal`, focus trap, focus moved to the step heading on open and each step change, focus restored to the trigger on close, arrow-key next/back, numbered stepper with `aria-current="step"`, polite live region announcing the current step.

### FR-6 — Calculated-total tooltips (steering: calculated-totals)

Every calculated total the flows display gets a breakdown tooltip via `src/components/shared/Tooltip.tsx` (+ the `TooltipTriggerCell` pattern), using labeled additive breakdowns and the existing `resolveSeededTarget` `lines` where applicable:

- FR-6.1 Symptom-test base target (Endurance → `T` total + Endurance advances; Cool → `WP` total + Cool advances) — breakdown via the existing seam.
- FR-6.2 Corruption threshold `TB + WPB + Pure Soul`.
- FR-6.3 Physical mutation limit (`TB`) and mental mutation limit (`WPB`).
- FR-6.4 Corruption loss on mutation (`WPB`).
- FR-6.5 Gangrene TB threshold (`getToughnessBonus`), shown as the "fail > TB times" figure.
- FR-6.6 Any rolled Incubation/Duration total reuses the existing timing `breakdown` string as its tooltip (already provided by `rollDiseaseTiming`).

## Non-Functional Requirements

- NFR-1 Offline-first PWA preserved: local-only storage, **no** backend, network, LLM, or telemetry calls introduced.
- NFR-2 Additive change: existing tests stay green **unchanged**; the four gates stay clean.
- NFR-3 One ARIA modal at a time: the guide overlay and the `RollDialog` / mutation roller it opens follow the existing overlay-yielding pattern (the guide yields to the roll dialog rather than stacking two `aria-modal` dialogs), consistent with how `GuidedCastPanel` / `CombatPage` seed the reminder `RollDialog`.
- NFR-4 Accessibility parity with the existing guided panels (focus management, keyboard nav, live region, labelled controls).
- NFR-5 No regression of recent UX: reduced busyness, nav touch-end fix, collapse chevrons, Assistant panel, Guided Combat Turn, Guided Spellcasting, Downtime assistant.
- NFR-6 Pure reducers are deterministic and side-effect-free (fast-check property tests will assert this, matching `guided-cast`/`combat-turn` reducer tests).

## Acceptance Criteria (testable; EARS-style where natural)

**Entry points & opt-in**
1. When no guide is open, `DiseasePanel` and `CorruptionCard` render identical DOM/behaviour to today apart from one new opt-in trigger element each (asserted by existing panel tests staying green and a trigger-presence test).
2. When the user activates the disease trigger for a given active disease, then the Guided Disease Progression overlay opens bound to that disease; when activated for a different disease, it rebinds and resets to Step 1.
3. When the user activates the corruption trigger, then the Guided Corruption / Mutation overlay opens at Step 1.
4. When the user presses `Esc`, clicks the backdrop, or the close button, then the overlay closes and focus returns to the trigger that opened it.

**Disease flow steps (order & seed-vs-guidance)**
5. The disease flow presents exactly, in order: (1) Overview, (2) Per-symptom resolution, (3) Duration/outcome guidance.
6. For a symptom where `getSymptomTest` returns a test (Blight, Buboes-once-lanced, Gangrene, Lingering, Wounded, Pox), the flow exposes a one-tap control that opens the `RollDialog` seeded with `getSymptomTestBaseTarget` and the test's difficulty; the dialog's base target is read-only and its difficulty select defaults to the symptom-test difficulty.
7. For a symptom where `getSymptomTest` returns `null` (Convulsions, Coughs and Sneezes, Fever, Flux, Malaise, Nausea), the flow shows guidance only and seeds no roll.
8. For Gangrene, the flow shows the cadence "Daily (fail > TB times = lose location)" with the TB figure from `getToughnessBonus`, and surfaces the existing Gangrene Hit-Location control (no new location logic).
9. Step 3 describes Duration-reached outcomes per RAW (disease ends; Lingering → Endurance test with `getLingeringDifficulty`; outcomes extend duration / Festering Wound / Blood Rot) as guidance; the Lingering Endurance test, if surfaced, is seeded, its consequences are not applied by the guide.

**Corruption flow steps (order & seed-vs-guidance)**
10. The corruption flow presents exactly, in order: (1) Threshold check, (2) Resistance test, (3) Mutation resolution.
11. Step 1 shows `corr / threshold` with `threshold = getCorruptionThreshold(chars, getPureSoulLevel(talents))` and cites Core p.183.
12. Step 2 exposes a one-tap control that opens the `RollDialog` seeded for a Challenging (+0) Endurance test via the existing reminder-target seam; the guide does not interpret the pass/fail result.
13. Step 3 directs the player to the existing `CorruptionCard` mutation roller; mutation d100 type/result rolls go through that roller, never the `RollDialog`; the player adds the mutation via the existing "Add to Character" control.

**Calculated-total tooltips**
14. Each calculated total listed in FR-6 (symptom-test base target, corruption threshold, physical/mental mutation limits, corruption-loss-on-mutation, Gangrene TB threshold, rolled timing totals) is rendered with a `Tooltip` breakdown showing its additive components (e.g. `TB 4 + WPB 3 + Pure Soul 0 = 7`), on hover (desktop) and tap/long-press (touch).

**No-auto invariants & reducer purity**
15. The guide never mutates the character, never rolls, never advances a step, and never marks a step complete on its own; every state transition corresponds to an explicit player event (asserted by reducer property tests and panel component tests that confirm no character mutation and no auto-apply).
16. The pure reducers are deterministic, do not throw on frozen state, and `reset` from any state deep-equals the initial state (fast-check property tests, mirroring `guided-cast` reducer tests).

**State reset**
17. The flow state resets to its initial step on: flow end (close), selected disease change, and combat/turn `END`-equivalent boundary (flow dismissal), so a reopened guide never shows stale prior state.

**Modal & accessibility**
18. Only one `aria-modal` dialog is active at a time: when the guide opens the seeded `RollDialog` or the mutation roller, it yields rather than stacking two modals, consistent with existing seeded-roll behaviour.
19. The overlay provides focus trap, heading focus on open/step change, focus restore on close, arrow-key next/back, a numbered stepper with `aria-current="step"`, and a polite live region — parity with `GuidedCastPanel`.

**Non-regression & verification**
20. With both guides off, all pre-existing `DiseasePanel` and `CorruptionCard` tests pass unchanged.
21. The following commands are clean after implementation:
    - `npx tsc --build --force --noEmit`
    - `npm run build`
    - `vitest --run` (or the project's configured Vitest invocation)
    - `npx eslint .`

## Rulebook Ambiguities (flagged per steering rules-compliance)

These were found while verifying citations directly against `docs/WarhammerFantasyRoleplay4e.md`. Each is flagged rather than silently resolved.

- **A-1 — Corruption trigger: "more than" vs `>=`.** Core p.183 ("Dissolution of Body and Mind", verified at source line ~8668): "Should you ever gain **more** Corruption points than your Willpower Bonus plus your Toughness Bonus, immediately attempt a Challenging (+0) Endurance Test." This is strictly *greater than* the threshold. The app's `getCorruptionStatus` fires 'danger' at `corr >= threshold`, and the existing assistant corruption rule already documents and matches this `>=` behaviour for UI consistency. **Recommended v1 scope:** the guide follows the existing app behaviour (surface at `>=`) for consistency with the panel and assistant, and the Step 1 copy explicitly states the rulebook wording is "more than" so the player/GM can adjudicate the at-threshold case. Do not change `getCorruptionStatus`.
- **A-2 — Endurance vs Cool for corruption resistance.** Core p.183 (verified ~line 8627) allows the resistance test to be Endurance **or Cool** "as determined by the GM" for the *initial corrupting-influence* test (physical vs spiritual). The *mutation-trigger* test at p.183 is specifically **Endurance**. The app models the mutation-trigger test (Endurance). **Recommended v1 scope:** seed the Endurance mutation-trigger test only; mention the GM may substitute Cool for spiritual corrupting influences as guidance (not seeded), since the GM-set choice is outside the safe-seed rule.
- **A-3 — "Wounded" symptom difficulty label inconsistency.** The symptom text (Core p.188) reads "take an **Easy (+20) Endurance** Test", but on the standard WFRP difficulty ladder Easy = +40 and Average = +20, so the printed "(+20)" is internally inconsistent. The app's `getSymptomTest` returns difficulty `'Easy'`. **Recommended v1 scope:** defer to the app's existing `getSymptomTest` value (`'Easy'`) verbatim — the guide must not invent a different difficulty — and flag the printed-text inconsistency in a code comment citing p.188.
- **A-4 — Exotic / special diseases.** Nurgle's Rot and other exotic or GM-authored diseases are not registered in `DISEASE_REGISTRY` and may carry bespoke mechanics not expressible through `getSymptomTest`. **Recommended v1 scope:** support only the standard **registered** diseases in `DISEASE_REGISTRY`; for any disease whose symptoms resolve to no seedable test, present guidance-only. Defer exotic/GM-authored diseases with a citation note (Core p.186 "making your own diseases").
- **A-5 — Corruption from specific sources (strength of influence).** Core p.183 ties the *amount* of corruption gained to the SL needed to avoid a specific influence, which is GM-set. **Recommended v1 scope:** the guide does not model the influence-strength table or auto-add corruption points; it guides the resistance/mutation procedure only, and corruption-point changes remain player-driven via the existing `CorruptionCard` tracker.
- **A-6 — Mental vs physical mutation split for edge species.** `getMutationTypeDistribution` defaults unknown species to the Human 50/50 split and has explicit entries for Dwarf/Halfling/Elf. **Recommended v1 scope:** reuse `getMutationTypeDistribution` / `determineMutationType` exactly as `CorruptionCard` does; do not add species or alter the split. Flag that unusual/custom species fall back to Human distribution.

## Out of Scope

- Any new disease, symptom, corruption, or mutation mechanic, table, difficulty, odds, or threshold.
- Changing `getCorruptionStatus`, `getSymptomTest`, mutation tables, or any existing pure logic.
- Forking or duplicating the Character Assistant disease/corruption rules.
- Auto-applying outcomes, auto-rolling, auto-advancing, or auto-completing any step.
- Seeding a roll for any test requiring a specialisation pick or a GM-set choice (those stay guidance-only).
- Exotic/GM-authored diseases and the corruption influence-strength table (deferred; see A-4, A-5).
- Any backend, network, LLM, or telemetry integration.

## What the design phase must resolve

1. **File layout for the reducers** — confirm `src/logic/guided-disease/` and `src/logic/guided-corruption/` (one reducer each) mirroring `guided-cast`/`combat-turn`, their `types.ts` (state, events, step enums) and default synchronous advisor modules, and whether any step state is conditional/filtered (as `applicableSteps` is for cast).
2. **Overlay components & host wiring** — the panel/trigger component names and where they mount on the Notes tab; how each panel hosts the seeded `RollDialog` (reusing the `resolveReminderBaseTarget` + difficulty pattern from `CombatPage` / `GuidedCastPanel`) and how it yields to satisfy the one-aria-modal rule.
3. **Seed-vs-guidance decision table** — a per-symptom and per-corruption-step table fixing exactly which steps seed a roll and which are guidance-only, derived from `getSymptomTest`/the Endurance resistance test and the confirmed scope rule, so no ambiguity remains for the implementer.
4. **Mutation roller integration** — how Step 3 of the corruption flow surfaces/links to the existing `CorruptionCard` roller without duplicating its state, and whether the roller is reached in-overlay or by directing focus to the card.
5. **Tooltip breakdown sourcing** — confirm each FR-6 total reuses an existing breakdown source (`resolveSeededTarget.lines`, `rollDiseaseTiming.breakdown`) versus needing a new labeled-components string, keeping one source of truth per steering calculated-totals.
6. **Reset/boundary semantics** — the exact events that reset each reducer (close, disease change, dismissal) and how the host dispatches them.
7. **Error/empty-state handling** — behaviour when a disease has no seedable symptom, when Duration/Incubation is unrolled, when species is unknown (Human fallback), and when corruption is below threshold (guide still opens as informational, or trigger hidden) — concrete, per-case.
8. **Test plan** — reducer property tests (determinism, frozen-state safety, reset-to-initial), and component tests asserting no character mutation / no auto-apply / correct seed-vs-guidance / tooltip presence.
