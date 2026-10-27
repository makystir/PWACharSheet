# Technical Design — Guided Disease Progression & Guided Corruption / Mutation

## Overview

This adds two opt-in, off-by-default guided flows to the Notes tab: **Guided Disease Progression** (per active disease) and **Guided Corruption / Mutation**. Each is a portal overlay stepper that walks the player through the *existing* disease/corruption machinery as an ordered, rulebook-cited sequence, mirroring the shipped **Guided Combat Turn** (`src/logic/combat-turn/` + `GuidedTurnPanel`) and **Guided Spellcasting** (`src/logic/guided-cast/` + `GuidedCastPanel`). The guides *suggest*; the player *decides and acts*. They never roll, never mutate the character, never auto-advance, and never mark a step complete on their own. Every action routes through an existing surface: the shared `RollDialog` (Endurance/Cool tests), the existing mutation roller in `CorruptionCard` (d100 table lookups), and the existing `DiseasePanel` controls (timing rolls, elapsed-day adjustment, Gangrene location, notes).

The design is **strictly additive**. No change to `getCorruptionStatus`, `getSymptomTest`, mutation tables, `resolveSeededTarget`, or any other existing pure logic. The only new default-render DOM in the existing panels is one opt-in trigger element each.

The technology stack is **locked** to the repo's existing stack: TypeScript + React 18 + Vite, Vitest + fast-check for tests, CSS Modules, `lucide-react` icons, `createPortal` overlays. No new runtime dependency is introduced. No backend, network, LLM, or telemetry call is added (NFR-1).

### Citation verification (read directly from `docs/WarhammerFantasyRoleplay4e.md`)

Every mechanic below was confirmed against source (rules-compliance steering). Errata was consulted; none of the cited passages is overridden by the Errata for the mechanics in scope.

- **Corruption trigger (p.183, source line 8668):** *"Should you ever gain more Corruption points than your Willpower Bonus plus your Toughness Bonus, immediately attempt a **Challenging (+0) Endurance** Test. If passed, you have managed to hold off your corruption for now but will have to Test again next time you gain Corruption Points. If you fail, then either your body or mind is about to mutate."*
- **Mutation procedure (p.183, "Dissolution of Body and Mind", source line ~8672):** *"First, lose Corruption points equal to your Willpower Bonus as you mutate. Next, roll percentile dice and refer to the following table to determine whether it's your body or your mind…"* then *"Now roll on either the **Physical Corruption Table** (page 184) or the **Mental Corruption Table** (page 185)…"* The printed d100 split table (Elf / Halfling / Human / Dwarf) matches `SPECIES_DISTRIBUTION` in `corruption.ts`.
- **Corruption Limits (p.183):** *"Should you survive long enough to gain more mutations than your Toughness Bonus, or more mental corruptions than your Willpower Bonus, you have fallen to Chaos…"* → physical limit = TB, mental limit = WPB (matches `getPhysicalMutationLimit` / `getMentalMutationLimit`).
- **Pure Soul talent (p.142, source line 6811):** *"You may gain extra Corruption points equal to your level of Pure Soul before having to Test to see if you become corrupt."* Max = WPB. This raises the trigger point, modelled as `getCorruptionThreshold(chars, pureSoul) = TB + WPB + Pure Soul`.
- **Disease format (p.186):** *"**Incubation:** How long before the victim demonstrates any symptoms."* / *"**Duration:** How long the symptoms of the disease last if untreated. At the end of the duration, the disease will come to an end."*
- **Blight (p.187):** *"Pass a **Very Easy (+60) Endurance** daily (normally when you sleep) or die… If Blight is marked as (Moderate), this Test is **Easy (+40)**; if marked as (Severe), this Test is **Average (+20)**."* (matches `BLIGHT_TEST_BY_SEVERITY`).
- **Buboes (p.187):** *"If your Buboes are lanced, make a **Difficult (–10) Endurance** Test once per day or more swell into place."* (matches `getSymptomTest('Buboes')` → `Difficult`).
- **Gangrene (p.188):** *"Roll percentile dice to determine a Hit Location… Each day, roll an **Average (+20) Endurance** Test. If you pass, you hold off the Gangrene; if you fail, it grows worse. If you ever fail more times than you have Toughness Bonus, you completely lose all capability with the affected location…"* (matches `Average`, `symptomRollsHitLocation`, and the "> TB" threshold).
- **Lingering (p.188):** *"After your disease reaches the end of its duration, attempt an **Endurance** Test with the Difficulty marked on the symptom… If this scores a Marginal Failure (0), the duration extends for an extra 1d10 days. If it scores a Failure (–2), develop a Festering Wound. On an Astounding Failure (–6), you instead develop Blood Rot."* (matches `getLingeringDifficulty` + the Step-3 outcome copy).
- **Wounded (p.188):** *"Every day, take an **Easy (+20) Endurance** Test or gain a Festering Wound if you do not already have one."* **The printed text labels Easy as "(+20)", which conflicts with the standard ladder (Easy = +40, Average = +20).** The app's `getSymptomTest('Wounded')` returns `'Easy'`; the guide defers to that value verbatim (see A-3).
- **Pox (p.188):** *"…pass an **Average (+20) Cool** Test [to resist scratching]. When the Pox ends, attempt an **Average (+20) Cool** Test…"* (matches `getSymptomTest('Pox')` → Cool / Average).

All cited mechanics are reflected by the existing `diseases.ts` / `corruption.ts` helpers; the guides re-derive nothing.

---

## Decision 1 — RAW procedures and the per-step seed-vs-guidance table

The confirmed scope rule: a step may **seed a `RollDialog`** only when the test resolves on a characteristic or a **bare (non-specialisation) skill** the app resolves unambiguously via `resolveSeededTarget` (`ReminderTest` → base target + breakdown `lines`). Mutation d100s go through the **existing `CorruptionCard` roller**. Specialisation/GM-set choices are **guidance-only**.

### 1a. Disease flow (Core p.186–188)

| Flow step | Content | Seeded roll? | Source of test | Citation |
|---|---|---|---|---|
| **Step 1 — Overview** | Disease name, resolved symptoms (`getDiseaseSymptoms`), incubation/duration status (`getDiseaseProgress` vs rolled Duration). Renders a **read-only timing summary** and, when Incubation/Duration is unrolled, instructs the player to use the disease row's **existing** `DiseasePanel` Roll control. The guide **never mounts a second `TimingRoll`** — it points at the existing one. | **No** (timing rolls are dice-expression rolls done by the existing `rollDiseaseTiming` control, not the `RollDialog`) | — | Core p.186 (Incubation/Duration) |
| **Step 2 — Per-symptom resolution** | For each symptom: description + effect + cadence. Where `getSymptomTest(symptom.name, symptom.severity)` is non-null, a one-tap control seeds `RollDialog`. | **Seeded iff `getSymptomTest` ≠ null** | `getSymptomTestBaseTarget` + `getSymptomTest().difficulty` | Core p.187–188 |
| **Step 3 — Duration / outcome guidance** | Duration-reached ⇒ disease ends; `Lingering` ⇒ Endurance test (`getLingeringDifficulty`); outcomes (extend 1d10 days / Festering Wound / Blood Rot) described as guidance. | **Lingering Endurance test may be seeded**; consequences are guidance-only | `getSymptomTestBaseTarget('Endurance')` + `getLingeringDifficulty(severity)` | Core p.186–188 |

Per-symptom detail (keyed on `getSymptomTest` — the single source of truth, never re-derived):

| Symptom | `getSymptomTest` result | Guide behaviour |
|---|---|---|
| Blight | Endurance, difficulty by severity (`Very Easy`/`Easy`/`Average`), "Daily (or die)" | **Seed** |
| Buboes | Endurance, `Difficult`, "Daily once lanced (or buboes return)" | **Seed** |
| Gangrene | Endurance, `Average`, "Daily (fail > TB times = lose location)" | **Seed** the daily Endurance test; show TB threshold; the Hit-Location d100 is **not** seeded — hand off to the existing `DiseasePanel` control (see "Gangrene Hit-Location hand-off" in Decision 3) |
| Lingering | Endurance, `getLingeringDifficulty(severity)`, "When duration ends" | **Seed** (consequences guidance) |
| Wounded | Endurance, `Easy`, "Daily (or gain a Festering Wound)" | **Seed** |
| Pox | Cool, `Average`, "To resist scratching; again when the Pox ends" | **Seed** |
| Convulsions, Coughs and Sneezes, Fever, Flux, Malaise, Nausea | `null` | **Guidance-only** — show effect + short note, seed nothing |

The guide passes the **base symptom name** (`symptom.name`, not `displayName`) to `getSymptomTest`, consistent with `DiseasePanel` and `assistant/rules/diseases.ts`.

### 1b. Corruption flow (Core p.183)

| Flow step | Content | Seeded roll? | Source of test | Citation |
|---|---|---|---|---|
| **Step 1 — Threshold check** | `corr / getCorruptionThreshold(chars, getPureSoulLevel(talents))`. Explains gaining more than the threshold triggers a Challenging (+0) Endurance test. Notes the app surfaces danger at `>= threshold` while the book says "more than" (A-4). | **No** (informational) | — | Core p.183 (+ Pure Soul p.142) |
| **Step 2 — Resistance test** | One-tap control seeds `RollDialog` for a Challenging (+0) Endurance test. Guidance: fail = mutation, pass = no mutation (test again next corruption gain). | **Seed** (Challenging +0 Endurance) | `resolveSeededTarget(character, { kind: 'skill', skillName: 'Endurance', fallbackChar: 'T' })` + `Challenging` | Core p.183 |
| **Step 3 — Mutation resolution** | Directs player to the **existing `CorruptionCard` roller**: type by species (`getMutationTypeDistribution`/`determineMutationType`), then `lookupMutation(d100)`. Shows limits (TB / WPB) and WPB loss. Player adds via existing "Add to Character". | **No** `RollDialog` — d100s via the existing roller only | `CorruptionCard` roller | Core p.183 (Dissolution) + Corruption Limits |

GM-set substitutions (Cool for spiritual corrupting influence, A-2; influence-strength table, A-5) are **guidance-only** mentions, not seeded.

---

## Decision 2 — Two sibling overlays (not one shared parameterised stepper)

**Chosen: two sibling overlays**, each with its own pure reducer, advisor, trigger, and panel — mirroring how Guided Combat Turn and Guided Spellcasting are two independent sibling flows (they do **not** share a stepper component).

Rationale: the two procedures differ in binding (disease flow binds to a specific `ActiveDisease`; corruption flow binds to the whole character), in step content (symptom iteration vs mutation-type roll), and in which existing surface each hands off to. A shared parameterised stepper would need a union of both shapes and conditional branching on every step, producing more coupling than the ~3-step reducers save. The precedent in the repo is explicitly two siblings, each a thin orchestration layer over its own pure reducer. The two panels **do** share the same *structural* conventions (portal, focus trap, stepper, live region) by copying the `GuidedCastPanel` scaffold — consistency comes from the shared pattern, not a shared component.

Both flows coexist with and do **not** modify `DiseasePanel` / `CorruptionCard` default behaviour. With the guide off, those panels render exactly as today aside from the new trigger element(s): **`CorruptionCard` gains exactly one trigger**, while **`DiseasePanel` gains one trigger per rendered active-disease row** (FR-1.2 — the disease trigger is per-disease). The AC-1 presence test must assert the corruption trigger count is exactly 1 and the disease trigger count equals the number of rendered disease rows (not a hard-coded 1) — see the test plan (Review Finding 9). Everything else in both panels is byte-for-byte unchanged (AC-20).

### File layout (mirrors `guided-cast` / `combat-turn`)

```
src/logic/guided-disease/
  types.ts        # DiseaseStep, DiseaseFlowState, DiseaseFlowEvent, DiseaseAdvisorSource
  reducer.ts      # STEP_SEQUENCE, initialDiseaseFlowState, guidedDiseaseReducer
  steps.ts        # describeDiseaseStep + defaultDiseaseAdvisor
  __tests__/reducer.property.test.ts
  __tests__/reducer.test.ts

src/logic/guided-corruption/
  types.ts        # CorruptionStep, CorruptionFlowState, CorruptionFlowEvent, CorruptionAdvisorSource
  reducer.ts      # STEP_SEQUENCE, initialCorruptionFlowState, guidedCorruptionReducer
  steps.ts        # describeCorruptionStep + defaultCorruptionAdvisor
  __tests__/reducer.property.test.ts
  __tests__/reducer.test.ts

src/components/shared/
  GuidedDiseaseTrigger.tsx (+ .module.css)
  GuidedDiseasePanel.tsx   (+ .module.css)
  GuidedCorruptionTrigger.tsx (+ .module.css)
  GuidedCorruptionPanel.tsx   (+ .module.css)
  __tests__/GuidedDiseasePanel.*.test.tsx
  __tests__/GuidedCorruptionPanel.*.test.tsx
  __tests__/GuidedDiseaseTrigger.test.tsx
  __tests__/GuidedCorruptionTrigger.test.tsx
```

Panel `.module.css` files reuse the `GuidedCastPanel.module.css` class structure (backdrop/panel/header/stepper/body/footer/srOnly) copied verbatim to keep a11y/layout parity; no shared-CSS extraction is attempted in v1 (keeps the change additive and low-risk).

---

## Decision 3 — Opt-in affordance placement and hand-off

### Where the triggers live

- **`GuidedDiseaseTrigger`** renders **per active disease** inside `DiseasePanel`'s expanded disease detail block (`styles.diseaseDetails`), placed next to the disease header actions. It is the only new default-render element the panel adds *per disease row*. `onOpen(diseaseId)` is called with the disease's `id`. A native `<button>`, text label "Guide me through this" on desktop, icon-only on mobile with `aria-label="Guide me through this disease"` and `data-testid="guided-disease-trigger"`. **Icon: `Stethoscope`** (lucide). This is deliberately *not* `HeartPulse`, which `DiseasePanel` already uses for its `SectionHeader`/`EmptyState` icon (verified: `DiseasePanel.tsx` imports `HeartPulse`); using a distinct glyph keeps the trigger legible as a guide affordance rather than a duplicate section icon (Review Finding 3/4).
- **`GuidedCorruptionTrigger`** renders once inside `CorruptionCard` near the Corruption Tracker section. `onOpen()`. Label "Guide me through this" on desktop, icon-only on mobile with `aria-label="Guide me through corruption"` and `data-testid="guided-corruption-trigger"`. **Icon: `Compass`** (lucide). This is deliberately *not* `Skull` or `Bug`, both already used inside `CorruptionCard` (verified: `CorruptionCard.tsx` imports `{ Skull, Bug }`, `Skull` for the `SectionHeader` and `Bug` for mutation `EmptyState`s); a second `Skull` button inside the same card would be ambiguous and undercut the "one clearly new opt-in element" intent of FR-1.3/AC-1 (Review Finding 3).

The trigger's `onClick` calls `e.stopPropagation()` before `onOpen` (as `GuidedCastTrigger` does) so expanding/collapsing the disease row is not toggled by the trigger.

### Host wiring (where the state and the seeded RollDialog live)

Both panels and their reducers are **hosted by their existing panels** (`DiseasePanel`, `CorruptionCard`), not lifted into `NotesTab`. This keeps the change local and lets each panel own both the opt-in flag, the `useReducer`, and the seeded `RollDialog` instance — the same ownership model `SpellCastingPanel` uses for `GuidedCastPanel`. `NotesTab` is unchanged.

Each host panel adds:

```ts
const [guideState, dispatchGuide] = useReducer(guidedDiseaseReducer, initialDiseaseFlowState);
const [guideDiseaseId, setGuideDiseaseId] = useState<number | null>(null);
const [rollDialogState, setRollDialogState] = useState<SeededRoll | null>(null);
```

where `SeededRoll = { name: string; baseTarget: number; difficulty: DifficultyLevel }` (identical shape to the reminder-roll state in `useAssistantActions`).

Seeding a test (Step 2 symptom test, Step 3 Lingering test, corruption Step 2) does, in a click handler:

```ts
const { total } = resolveSeededTarget(character, def); // def: ReminderTest
setRollDialogState({ name, baseTarget: total, difficulty });
```

and renders `RollDialog` with `defaultDifficulty={rollDialogState.difficulty}`. The `RollDialog`'s base target is read-only and its difficulty select defaults to the seeded difficulty (AC-6, AC-12). On roll, `onRoll={(r) => { onRoll?.(r); setRollDialogState(null); }}` records the result to the shared roll history (see the prop-threading note below) and closes the dialog. The guide **reads nothing back** from the roll result and applies nothing — the player interprets the outcome and acts via existing controls.

> **This seeded `RollDialog` is a NEW roll path in each host panel, not a reuse of the existing symptom control (Review Finding 2).** `DiseasePanel`'s existing `handleSymptomTest` does **not** use `RollDialog` — it auto-generates a d100 (`Math.floor(Math.random()*100)+1`) and calls `performRoll` directly, then `onRoll?.(result)` (verified in `DiseasePanel.tsx`). The guide deliberately routes through the shared `RollDialog` instead (per the confirmed scope rule: a read-only base target seeded from `resolveSeededTarget` + a difficulty select, so the player presses Roll). Implementation therefore **adds** to each host panel: the `rollDialogState` state, a `resolveSeededTarget` import, a `RollDialog` import, and the seeded-roll render/handlers described above. The panel's existing auto-roll symptom control (`handleSymptomTest`) is left **unchanged** and remains exactly what the non-guided `DiseasePanel` shows (NON-REGRESSION, AC-20). The guide's seeded roll and the panel's legacy auto-roll are two independent paths that both terminate in `onRoll?.(result)` → shared history.

> **Roll-history prop threading (Review Finding 1).** `DiseasePanel` already receives `onRoll={addRoll}` from `NotesTab` (verified: `NotesTab.tsx` renders `<DiseasePanel … onRoll={addRoll} />`), so the disease flow's seeded roll reaches shared history with no new wiring. **`CorruptionCard` currently has no roll-history prop** — its props are `{ character, update, updateCharacter }` only, and `NotesTab` threads no callback to it (verified: `CorruptionCard.tsx` + `NotesTab.tsx`). To record the corruption resistance roll, this design **adds an optional `onRoll?: (r: RollResult) => void` prop to `CorruptionCard`** and threads `onRoll={addRoll}` from `NotesTab` (parity with `DiseasePanel`). The prop is optional, so existing `CorruptionCard` tests and callers stay green unchanged (NFR-2). Chosen over the alternative of not recording the corruption roll, because parity with the disease flow (the Endurance result appears in shared history) is the less surprising behaviour and the wiring is a one-line additive change.

> **Disease symptom base target:** `getSymptomTestBaseTarget(character, skill)` and `resolveSeededTarget(character, { kind: 'skill', skillName: skill, fallbackChar })` are already proven equal by `catalog-integration.test.ts`. The guide uses `resolveSeededTarget` so the tooltip `lines` come from the one source of truth (Decision 6); a lightweight assertion in the component test re-confirms equality against `getSymptomTestBaseTarget`.

### One aria-modal at a time (NFR-3, AC-18)

Each guide panel **yields** while its seeded `RollDialog` is open, exactly as `SpellCastingPanel` does:

```tsx
{guideActive && guideDisease && rollDialogState == null && (
  <GuidedDiseasePanel … />
)}
{rollDialogState && (
  <RollDialog … onClose={() => setRollDialogState(null)} />
)}
```

Because the guide panel is not rendered while `rollDialogState != null`, only one `role="dialog" aria-modal` exists at a time. When the dialog closes, `rollDialogState` returns to `null` and the guide panel re-mounts at the same step (step state lives in the reducer, which the dialog never touches). This re-mount re-runs the panel's "focus the step heading" effect, restoring focus into the guide.

### Corruption Step 3 → mutation roller hand-off

The existing `CorruptionCard` mutation roller is **in-card state** (`rollResult` + "Add to Character"), not a modal. Step 3 does **not** duplicate it. The guide's Step 3 is **guidance + a hand-off button**: "Roll the mutation in the Corruption panel". Activating it `onClose()`s the guide (returning focus to the trigger) and the player uses the card's existing Roll Physical / Roll Mental / Add to Character controls. This avoids two sources of roller state and keeps the d100 rolls on the existing roller (AC-13). The guide never renders a second roller and never calls `handleRoll`/`handleAddRolledMutation`.

Rationale for close-and-return rather than embedding: the roller mutates the character on "Add to Character" (decrements corruption by WPB). Embedding it in the overlay would put a character-mutating control inside the guide, violating the "guide applies nothing" invariant. Directing focus to the card keeps the mutation on the player-driven existing surface.

### Gangrene Hit-Location hand-off (Review Finding 6)

Gangrene's Hit-Location roll (`symptomRollsHitLocation` true) is a **d100 table lookup** (`getHitLocation`), so — consistent with the scope rule and with the mutation d100s — it is **never seeded into `RollDialog`**. It lives inside `DiseasePanel`'s expanded disease row (`handleGangreneLocation`), the same panel that hosts the guide. The guide's Step 2 Gangrene entry therefore: (a) shows the cadence "Daily (fail > TB times = lose location)" with the `getToughnessBonus` figure and its breakdown tooltip; (b) shows a short guidance note; and (c) **does not render or seed a location roll**. The hand-off mirrors the corruption Step-3 decision: the guide exposes a hand-off button ("Roll the Hit Location in the disease row") that `onClose()`s the guide (restoring focus to the trigger), after which the player uses the row's existing Gangrene-location control. The guide never calls `handleGangreneLocation` and renders no second location control. Choosing close-and-return over an inline pointer keeps a single consistent hand-off pattern across both overlays and avoids two location-roll surfaces.

---

## Decision 4 — Pure, property-testable reducers

Each reducer is a **pure, React-free, JSON-serializable** function, byte-for-byte in the style of `guidedCastReducer`: total, deterministic, never throws on frozen state, spread-copy only, no character mutation, no auto-advance, `reset` returns the initial state.

### `guided-disease/types.ts`

```ts
export type DiseaseStep = 'overview' | 'symptoms' | 'duration';

export interface DiseaseFlowState {
  step: DiseaseStep;
  /** The ActiveDisease.id this flow is bound to; drives disease-change reset. */
  diseaseId: number | null;
}

export type DiseaseFlowEvent =
  | { kind: 'start'; diseaseId: number } // open bound to a disease (Step 1)
  | { kind: 'next' }
  | { kind: 'back' }
  | { kind: 'goto'; step: DiseaseStep }
  | { kind: 'reset' };

export interface DiseaseStepInfo { step: DiseaseStep; title: string; body: string; citation: string; }
export interface DiseaseAdvisorSource {
  describe(step: DiseaseStep, ctx: { hasSeedableSymptom: boolean; durationReached: boolean }):
    DiseaseStepInfo | Promise<DiseaseStepInfo>;
}
```

### `guided-corruption/types.ts`

```ts
export type CorruptionStep = 'threshold' | 'resistance' | 'mutation';

export interface CorruptionFlowState {
  step: CorruptionStep;
}

export type CorruptionFlowEvent =
  | { kind: 'start' } // open at Step 1
  | { kind: 'next' }
  | { kind: 'back' }
  | { kind: 'goto'; step: CorruptionStep }
  | { kind: 'reset' };

export interface CorruptionStepInfo { step: CorruptionStep; title: string; body: string; citation: string; }
export interface CorruptionAdvisorSource {
  describe(step: CorruptionStep, ctx: { atOrOverThreshold: boolean }):
    CorruptionStepInfo | Promise<CorruptionStepInfo>;
}
```

### Applicability / conditional steps

Neither flow needs `guided-cast`'s `applicableSteps` filtering: both have a **fixed 3-step sequence always present**. The seed-vs-guidance distinction is a *property of the step's content* (whether a seed button is shown), not of step *reachability*. Step 2 of the disease flow is always shown even when no symptom is seedable (it then shows guidance-only text for each symptom — covers the "disease with no seedable symptom" empty state, Decision 7). Step 3 of the corruption flow is always shown (it is a guidance + hand-off step). Keeping the sequence fixed makes the reducers simpler than `guided-cast` and keeps navigation trivially total.

Reducer transition rules (both reducers):
- `start`: fresh initial state (disease flow additionally binds `diseaseId`); step = first.
- `next`/`back`: move within `STEP_SEQUENCE`, clamp at ends (no wrap), idempotent at boundary.
- `goto`: jump to the named step (always valid since all steps are applicable); no-op if same.
- `reset`: return the module's `initial…State` constant.
- Exhaustiveness `default` guard returning `state` (mirrors `guidedCastReducer`).

Disease-change detection lives in the host (Decision 6), dispatched as `reset` / `start` — the reducer stays pure.

### Advisor / source boundary (future-proof, offline)

Both `…AdvisorSource` interfaces use the **sync-or-async-union** contract (`DiseaseStepInfo | Promise<DiseaseStepInfo>`) identical to `CastAdvisorSource` / `TurnAdvisorSource` / the assistant's `SuggestionSource`. v1 ships **only** the deterministic synchronous default (`defaultDiseaseAdvisor` / `defaultCorruptionAdvisor`), and the panels consume the object (typed as the source interface), never the bare `describe…` function — so a future LLM-backed advisor is a non-breaking object swap. No `await`, no network, no LLM, no telemetry ships (NFR-1, FR-5.2). Panels narrow the return with `info instanceof Promise ? null : info`, exactly as `GuidedCastPanel` does.

Step copy in `steps.ts` is static, rulebook-cited prose with the verbatim citations gathered above. No TN/cost/threshold is invented in copy (rules-compliance). The dynamic numbers (base targets, thresholds, limits, cadences) come from the `diseases.ts`/`corruption.ts` helpers rendered in the panel body, never from the advisor.

---

## Decision 5 — Transient local state, reset boundaries, accessibility

### Transient state & reset boundaries

Flow state is transient React state (`useReducer` + a couple of `useState` flags), never persisted to the character. It resets on:

| Boundary | Dispatch | Host owner |
|---|---|---|
| Flow end (close button / `Esc` / backdrop) | `{ kind: 'reset' }` + close + restore focus | panel `onClose` |
| Selected disease change (opening the trigger for a **different** disease id) | `{ kind: 'start', diseaseId }` (rebinds + resets to Step 1, AC-2) | `DiseasePanel` trigger handler |
| Disease removed while guide open on it | `{ kind: 'reset' }` + close | `DiseasePanel.handleRemoveDisease` |
| Corruption guide reopen | `{ kind: 'start' }` (resets to Step 1, AC-3) | `CorruptionCard` trigger handler |

> **AC-17 "combat/turn `END`-equivalent boundary" wording (Review Finding 7).** These flows have **no combat-turn coupling** — the "`END`-equivalent" phrasing in AC-17 is a carryover from the Guided Combat Turn flow. Here it means simply **flow dismissal** (close button / `Esc` / backdrop), which the reset table above already maps to `{ kind: 'reset' }`. There is no turn hook to look for; the implementer should treat "`END`-equivalent" as "the guide is dismissed".

The host closes the guide and dispatches `reset` in one handler so a reopened guide never shows stale state (AC-17). Because the reducer's `reset` deep-equals the initial state (asserted by property test), reopening is clean.

The disease flow's `start` carries the `diseaseId`; opening for a different disease dispatches a new `start`, which the reducer treats as a fresh flow bound to the new id (resets step to `overview`). The host also tracks `guideDiseaseId` so the panel binds `getDiseaseSymptoms` / `getDiseaseProgress` to the live record.

### Accessibility (parity with `GuidedCastPanel`, FR-5.3 / NFR-4)

Both panels copy the `GuidedCastPanel` scaffold: `createPortal` to `document.body`; `role="dialog" aria-modal="true"` with an `aria-label`; focus trap on `Tab`/`Shift+Tab`; `previousFocusRef` captured on mount and restored on close; focus moved to the step `<h2 tabIndex={-1} aria-current="step">` on open and each step change (`requestAnimationFrame`); `ArrowRight`/`ArrowLeft` → `next`/`back`; `Esc` → close; backdrop click → close; numbered `<ol>` stepper with `aria-current="step"` on the active item and per-step `goto` buttons; a polite `aria-live` region announcing `Step N of M: <title>`. Mobile vs desktop variant via `useMediaQuery('(max-width: 767px)')` (`sheet` vs `drawer`), same as the cast panel.

---

## Decision 6 — Calculated-total tooltips (steering: calculated-totals)

Every calculated total the panels display is rendered through `Tooltip` + `TooltipTriggerCell` with a labeled additive breakdown. Tooltip open/close state is managed per-panel via a single `openTooltipId` state + anchor element (the `SuggestionItem` / `AdvancementPlanner` pattern). Each total reuses an existing breakdown source so there is one source of truth per total (no new labeled-components string unless noted):

| Total | Where | Breakdown source | Rendered lines |
|---|---|---|---|
| **Symptom-test base target** (FR-6.1) | Disease Step 2, each seedable symptom | `resolveSeededTarget(character, def).lines` | e.g. `T 38 (Initial 30 + Advances 5 + Bonus 3)`, `Endurance Advances +10`, `= 48` (Cool symptoms use `WP`) |
| **Lingering base target** (FR-6.1) | Disease Step 3 | `resolveSeededTarget` (Endurance) `.lines` | same shape as above |
| **Corruption threshold** (FR-6.2) | Corruption Step 1 | small pure helper in the panel module building `['TB ' + getBonus(T), 'WPB ' + getBonus(WP), 'Pure Soul ' + getPureSoulLevel(talents)]`; the total stays `getCorruptionThreshold(chars, pureSoul)` | `TB 4 + WPB 3 + Pure Soul 0 = 7` |
| **Physical mutation limit = TB** (FR-6.3) | Corruption Step 3 | `getPhysicalMutationLimit` + its TB components | `TB 4 (floor(total T 42 / 10))` |
| **Mental mutation limit = WPB** (FR-6.3) | Corruption Step 3 | `getMentalMutationLimit` + its WPB components | `WPB 3 (floor(total WP 35 / 10))` |
| **Corruption loss on mutation = WPB** (FR-6.4) | Corruption Step 3 | `getCorruptionLossOnMutation` (= WPB) | `WPB 3 (floor(total WP 35 / 10))` |
| **Gangrene TB threshold** (FR-6.5) | Disease Step 2 (Gangrene) | `getToughnessBonus(character)` | `TB 4 (floor(total T 42 / 10)) — fail > 4 times = lose location` |
| **Rolled Incubation/Duration total** (FR-6.6) | Disease Step 1 | `RolledTiming.breakdown` (already produced by `rollDiseaseTiming`) | the existing `breakdown` string, e.g. `3d10+10 → [4, 6, 2]+10 = 22 days` |

The threshold/limit breakdown strings (FR-6.2–6.5) are built in a small pure helper in the panel module whose component numbers come from the existing helpers only — `getBonus(T)`, `getBonus(WP)` (via `calculators.ts`, exactly as `assistant/rules/corruption.ts` does its own `lines` locally) and `getPureSoulLevel(talents)` — never recomputed inline. (The `assistant/rules/corruption.ts` `lines` array `["TB x", "WPB y", "Pure Soul z"]` is a local literal inside its suggestion, not an exported reusable builder, so the guide builds its own identically-sourced helper rather than importing from the rule — Review Finding 8.) The threshold *total* remains `getCorruptionThreshold(chars, pureSoul)`; the mutation-limit totals remain `getPhysicalMutationLimit`/`getMentalMutationLimit`/`getCorruptionLossOnMutation`. No number is recomputed by hand. Tooltips open on hover (300 ms) on desktop and on tap/Enter/Space on touch, inherited from `TooltipTriggerCell`.

---

## Decision 7 — Error / empty-state handling (concrete, per case)

| Case | Behaviour |
|---|---|
| Disease has **no seedable symptom** (all `getSymptomTest` null, e.g. a disease of only Fever/Malaise) | Step 2 renders each symptom's effect + a guidance note; **no seed buttons**. Flow still opens and all 3 steps are present (step sequence is fixed). |
| **Duration/Incubation unrolled** | Step 1 shows the raw timing string (e.g. "3d10+10 days") and surfaces the existing `DiseasePanel` timing-roll control; `getDiseaseProgress` reports `durationTotal: null`, `durationReached: false`; Step 3 copy says the end-of-duration test applies "once Duration is rolled and reached". No guide-side rolling. |
| **Unknown/custom species** (corruption) | `getMutationTypeDistribution` falls back to Human 50/50; Step 3 shows that split and a note "unusual/custom species fall back to the Human distribution" (A-6). No new species added. |
| **Corruption below threshold** | The corruption trigger is **always shown** and the guide opens as **informational** (Step 1 shows `corr / threshold` with current status; copy explains the test is due only when corruption exceeds the threshold). Rationale: hiding the trigger below threshold would make the educational walkthrough unreachable exactly when a player wants to learn the procedure pre-emptively; the guide applies nothing regardless, so showing it is safe. |
| **Disease not in registry** (`findDisease` undefined) | `getDiseaseSymptoms` returns `undefined`; the trigger is only rendered for records whose `diseaseName` resolves, so the guide never opens on an unresolved disease (A-4: exotic/GM-authored diseases deferred). |
| **Disease removed while guide open** | Host closes + `reset` (Decision 5). |

---

## Decision 8 — Test plan

### Reducer property tests (fast-check; mirror `guided-cast/__tests__/reducer.property.test.ts`)

For **each** reducer:
1. `step` is always a member of `STEP_SEQUENCE` after any event sequence (≤ 40 random events from `initial…State`).
2. After `next`/`back`/`goto`, step is in-sequence and clamped (no wrap; idempotent at ends).
3. `next` from last step and `back` from first step are idempotent (`===` identity, no new object).
4. `reset` from any arbitrary state deep-equals `initial…State`.
5. Determinism: reducing the same `(state, event)` twice yields deep-equal results.
6. Frozen-state safety: `guided…Reducer(Object.freeze({...s}), e)` never throws and does not mutate the input.
7. Disease reducer: `start` with a `diseaseId` binds that id and sets step `overview`; no event ever changes `diseaseId` except `start` (and `reset` clears it).
8. **No auto-advance:** there is no event that advances a step except the explicit `next`/`goto`/`start`; property asserts `back`, `reset`, and (disease) a re-`start` to the same id never land past Step 1 implicitly.

### Reducer unit tests (mirror `reducer.test.ts`)

- `start` → first step (+ bound id for disease).
- `next`/`back` walk the exact RAW order (`overview → symptoms → duration`; `threshold → resistance → mutation`).
- `goto` jumps to any step; `reset` returns initial.

### Component / integration tests (RTL; mirror `GuidedCastPanel.*.test.tsx`)

**Opt-in off by default (AC-1, AC-20):**
- `DiseasePanel` / `CorruptionCard` render with no overlay in the DOM; existing panel tests pass unchanged. Trigger-presence test (Review Finding 9): `CorruptionCard` renders **exactly one** `guided-corruption-trigger`; `DiseasePanel` renders **one `guided-disease-trigger` per rendered active-disease row** — the assertion counts triggers and compares to the number of disease rows (e.g. render a character with 2 active diseases → expect 2 disease triggers), not a hard-coded 1.

**Open / bind / reset (AC-2, AC-3, AC-4, AC-17):**
- Activating the disease trigger opens the overlay bound to that disease at Step 1; activating for a different disease rebinds and resets to Step 1.
- Activating the corruption trigger opens at Step 1.
- `Esc` / backdrop / close button close the overlay and return focus to the trigger.

**Steps in RAW order (AC-5, AC-10):**
- Disease: Step 1 Overview → Step 2 Symptoms → Step 3 Duration, in that order via Next/stepper.
- Corruption: Step 1 Threshold → Step 2 Resistance → Step 3 Mutation.

**Seed-vs-guidance (AC-6, AC-7, AC-8, AC-9, AC-12, AC-13):**
- For a disease with a seedable symptom (e.g. a Blight/Gangrene carrier), Step 2 exposes a one-tap control that opens `RollDialog` with a read-only base target equal to `getSymptomTestBaseTarget` and a difficulty select defaulting to the symptom's difficulty; **opening and rolling mutate nothing on the character** (assert `updateCharacter` not called with a character change on open/roll).
- For a symptom whose `getSymptomTest` is null, no seed button; guidance text only.
- Gangrene shows cadence "Daily (fail > TB times = lose location)" with the `getToughnessBonus` figure and surfaces the existing Gangrene Hit-Location control.
- Step 3 Lingering test seeds a `RollDialog`; its consequences are copy only.
- Corruption Step 2 opens `RollDialog` seeded Challenging (+0) Endurance; the guide does not read the result. With an `onRoll` spy passed to `CorruptionCard`, rolling in the dialog calls `onRoll` with the result (asserts the Finding-1 history wiring) and mutates no character field. Corruption Step 3 routes to the existing `CorruptionCard` roller (assert no `RollDialog` opens for the d100 and the hand-off button closes the guide); the player adds via existing "Add to Character".
- Gangrene's Hit-Location hand-off (Finding 6): the Gangrene step renders no location control and seeds no `RollDialog` for the location; the hand-off button closes the guide (so the player reaches the existing `DiseasePanel` location control).

**Tooltips (AC-14):**
- Each FR-6 total renders a `TooltipTriggerCell`; opening it shows a `Tooltip` with the additive breakdown (assert e.g. the corruption-threshold tooltip contains `TB`, `WPB`, `Pure Soul` lines; the symptom base-target tooltip contains the `resolveSeededTarget` lines).

**No-auto invariants (AC-15):**
- Mounting the panel, pressing Next/Back, opening a seeded roll, and rolling never call `updateCharacter` with a mutation and never auto-advance or mark complete.

**Modal (AC-18, AC-19):**
- While the seeded `RollDialog` is open, exactly one `role="dialog" aria-modal` is in the DOM (the guide panel is not rendered). After the dialog closes, the guide re-renders and focus returns to the step heading.
- Focus trap, heading focus on open/step change, arrow-key nav, numbered stepper with `aria-current="step"`, and a polite live region are asserted (parity with cast panel tests).

### Verification gates (AC-21)

After implementation, these must be clean:
- `npx tsc --build --force --noEmit`
- `npm run build`
- `vitest --run`
- `npx eslint .`

Testability notes: the reducers are trivially unit/property testable in isolation (pure). The panels are integration-tested with RTL against the real `diseases.ts`/`corruption.ts` helpers and the real `RollDialog` (seeding is deterministic given a fixed character). The hand-off to the `CorruptionCard` roller is tested at the `CorruptionCard` level (the guide only emits a close + focus directive), avoiding a brittle cross-component render.

---

## Rulebook ambiguities carried from requirements (flagged, not resolved silently)

- **A-1 / A-4 (corruption trigger "more than" vs `>=`):** the guide follows the app's existing `getCorruptionStatus` (`>= threshold`) for UI consistency with the panel and assistant, and Step 1 copy states the rulebook wording is strictly "more than" (verified at source line 8668) so the player/GM adjudicates the at-threshold case. `getCorruptionStatus` is **not** changed.
- **A-2 (Endurance vs Cool for corruption resistance):** the seedable mutation-trigger test at p.183 is **Endurance** (verified); the guide seeds Endurance only and mentions as guidance that the GM may substitute Cool for spiritual corrupting influences (GM-set ⇒ outside the safe-seed rule).
- **A-3 (Wounded "(+20)" vs Easy=+40):** the printed text at p.188 does label Easy as "(+20)" (verified), which is internally inconsistent with the standard ladder. The guide defers to `getSymptomTest('Wounded')` → `'Easy'` verbatim and the implementation carries a `// Core p.188: printed "(+20)" conflicts with Easy=+40; deferring to getSymptomTest` comment. No new difficulty is invented.
- **A-5 (corruption influence-strength / amount gained):** GM-set; the guide does not model the influence table or auto-add corruption points. Corruption-point changes stay player-driven via the existing `CorruptionCard` tracker.
- **A-6 (mental vs physical split for edge species):** reuse `getMutationTypeDistribution`/`determineMutationType` exactly as `CorruptionCard` does; unusual/custom species fall back to the Human distribution, surfaced as a note. No species added.
- **Exotic / Nurgle's Rot / GM-authored diseases (A-4):** out of scope for v1. The disease flow supports only registered `DISEASE_REGISTRY` diseases; a disease that resolves to no seedable test is presented guidance-only. Exotic cases deferred with the Core p.186 "making your own diseases" citation.

## Out of scope (unchanged from requirements)

New mechanics/tables/difficulties; changing `getCorruptionStatus`/`getSymptomTest`/mutation tables/`resolveSeededTarget`; forking the assistant rules; auto-apply/auto-roll/auto-advance/auto-complete; seeding a roll for any specialisation/GM-set test; the corruption influence-strength table; any backend/network/LLM/telemetry.

---

## Responses to design review (`design-review.json`, verdict CHANGES_REQUESTED: 0 HIGH, 3 MEDIUM, 6 NIT)

All 9 findings were addressed in this revision. No rules-compliance finding was raised; every WFRP citation remains verified verbatim against `docs/WarhammerFantasyRoleplay4e.md`.

- **Finding 1 (MEDIUM — corruption resistance roll has nowhere to record history).** ADDRESSED. Decision 3 now adds an optional `onRoll?: (r: RollResult) => void` prop to `CorruptionCard` and threads `onRoll={addRoll}` from `NotesTab` (parity with `DiseasePanel`). The prop is optional, keeping existing tests/callers green (NFR-2). The corruption Step-2 test now asserts `onRoll` fires on roll. Chose option (a) over "not recorded" for parity with the disease flow.
- **Finding 2 (MEDIUM — "reuses existing DiseasePanel roll path" inaccurate).** ADDRESSED. Decision 3 now states plainly that the seeded `RollDialog` is a **new** path added to each host panel (new `rollDialogState`, `resolveSeededTarget`/`RollDialog` imports), that `DiseasePanel.handleSymptomTest` auto-rolls a d100 via `performRoll` and is left **unchanged**, and that both paths terminate in `onRoll?.(result)` → shared history (NON-REGRESSION).
- **Finding 3 (MEDIUM — corruption trigger icon collides with `Skull`).** ADDRESSED. The `GuidedCorruptionTrigger` icon is now **`Compass`** (distinct from `CorruptionCard`'s existing `Skull` section icon and `Bug` empty-state icon), verified against `CorruptionCard.tsx` imports.
- **Finding 4 (NIT — disease trigger icon ambiguous "HeartPulse / Stethoscope").** ADDRESSED. Fixed to **`Stethoscope`** only, distinct from `DiseasePanel`'s `HeartPulse` section icon (verified against `DiseasePanel.tsx`).
- **Finding 5 (NIT — Step 1 must not mount a second TimingRoll).** ADDRESSED. Decision 1a Step 1 now states the guide renders a read-only timing summary and points the player at the disease row's existing Roll control, never mounting a second `TimingRoll`.
- **Finding 6 (NIT — Gangrene Hit-Location hand-off underspecified).** ADDRESSED. Decision 3 adds a dedicated "Gangrene Hit-Location hand-off" subsection: the location d100 is never seeded; the guide shows guidance + the TB threshold and exposes a close-and-return hand-off button mirroring the corruption Step-3 pattern. The per-symptom table row and a component test were updated.
- **Finding 7 (NIT — AC-17 "END-equivalent" carryover wording).** ADDRESSED. Decision 5 adds a note that there is no combat coupling; "`END`-equivalent" simply means flow dismissal (close/`reset`), already mapped in the reset table.
- **Finding 8 (NIT — corruption-threshold tooltip "reuse assistant lines" unverified).** ADDRESSED. Verified that `assistant/rules/corruption.ts` builds its `['TB x','WPB y','Pure Soul z']` array as a **local literal**, not an exported builder. Decision 6 now specifies a small local helper that sources components from `getBonus(T)`, `getBonus(WP)` and `getPureSoulLevel(talents)` (same sources the rule uses), with the total from `getCorruptionThreshold`; the "reuse the rule's lines" clause was dropped.
- **Finding 9 (NIT — per-disease multiplicity in AC-1).** ADDRESSED. Decision 2 and the trigger-presence test now specify: `CorruptionCard` → exactly one trigger; `DiseasePanel` → one trigger per rendered active-disease row (assert count equals number of rows, not a hard-coded 1).
