# Implementation Plan — Guided Disease Progression & Guided Corruption / Mutation

This plan implements the approved design (`design.md`) and requirements (`requirements.md`) as an ordered,
dependency-sequenced task list. Every change is **strictly additive**: no existing pure logic
(`getCorruptionStatus`, `getSymptomTest`, mutation tables, `resolveSeededTarget`, `diseases.ts`,
`corruption.ts`) is modified, so all pre-existing tests stay green unchanged (NFR-2, AC-20).

Architecture (design Decision 2): **two sibling flows**, each a pure React-free reducer under
`src/logic/` + a portal overlay + an opt-in trigger, hosted by its existing panel
(`DiseasePanel`, `CorruptionCard`) — mirroring `src/logic/guided-cast/` + `GuidedCastPanel` as hosted by
`SpellCastingPanel`. The guides **suggest**; the player **decides and acts**. They never roll, never mutate
the character, never auto-advance, never auto-complete.

All reference patterns were read from the live codebase:
- Reducer/types/steps precedent: `src/logic/guided-cast/{types,reducer,steps}.ts` and
  `src/logic/guided-cast/__tests__/{reducer.test.ts,reducer.property.test.ts}`.
- Panel/trigger precedent: `src/components/shared/{GuidedCastPanel,GuidedCastTrigger}.tsx` (+ `.module.css`).
- Host-wiring + seeded-RollDialog + yield precedent: `src/components/shared/SpellCastingPanel.tsx`.
- Seam reused for seeded targets + tooltip lines: `resolveSeededTarget` in `src/logic/reminders-target.ts`
  (`ReminderTest` shape in `src/logic/reminders.ts`).
- Tooltip pattern: `src/components/shared/{Tooltip,TooltipTriggerCell}.tsx`.
- Logic orchestrated (NOT forked): `src/logic/diseases.ts`, `src/logic/corruption.ts`,
  `src/components/combat/hitLocationTable.ts` (`getHitLocation`, via the existing `DiseasePanel` control),
  and the `CorruptionCard` in-card mutation roller.

Project facts (from `package.json`): build `npm run build` (runs `tsc --build` + `vite build`);
tests `vitest --run` (alias `npm test`); typecheck `npx tsc --build --force --noEmit`; lint `npx eslint .`.
TypeScript 7.0.2 via alias; React 19; Vitest + fast-check; `@testing-library/react`; jsdom.

WFRP4e citations were verified verbatim against `docs/WarhammerFantasyRoleplay4e.md` (rules-compliance
steering): corruption trigger at source line 8667 (Core p.183); disease symptom tests at Core p.186–188;
Pure Soul at Core p.142. Every new mechanic-bearing line gets a `// Core p.XXX: …` comment (rules-compliance
rule 5). No mechanic is invented (rule 1); the printed Wounded "(+20)" inconsistency is deferred to
`getSymptomTest` verbatim with a cited comment (A-3).

---

## Phase A — Pure guided-disease reducer module

- [ ] 1. Create the guided-disease types module.
      Define `DiseaseStep = 'overview' | 'symptoms' | 'duration'`; `DiseaseFlowState { step; diseaseId: number | null }`;
      `DiseaseFlowEvent = start{diseaseId} | next | back | goto{step} | reset`; `DiseaseStepInfo { step; title; body; citation }`;
      and `DiseaseAdvisorSource.describe(step, ctx:{ hasSeedableSymptom; durationReached }): DiseaseStepInfo | Promise<DiseaseStepInfo>`
      (sync-or-async union, mirroring `CastAdvisorSource`). React-free, JSON-serializable only. Header comment cites
      Core p.186–188 and states the guide re-derives no mechanic.
      Files: `src/logic/guided-disease/types.ts`
      Verify: `npx tsc --build --force --noEmit` clean (no runtime behaviour yet).

- [ ] 2. Create the guided-disease reducer.
      Export `STEP_SEQUENCE = ['overview','symptoms','duration']`, `initialDiseaseFlowState = { step:'overview', diseaseId:null }`,
      and `guidedDiseaseReducer(state, event)`: pure, total, spread-copy only, never throws on frozen state.
      Transitions: `start` → `{...initial, step:'overview', diseaseId}`; `next`/`back` clamp within `STEP_SEQUENCE`
      (no wrap, idempotent at ends, return same reference when unchanged); `goto` jumps to the named step (no-op if same);
      `reset` → `{...initialDiseaseFlowState}`; `default` exhaustiveness guard returns `state`. No `applicableSteps`
      filtering (fixed 3-step sequence, design Decision 4). No auto-advance.
      Files: `src/logic/guided-disease/reducer.ts`
      Verify: `npx tsc --build --force --noEmit` clean.

- [ ] 3. Create the guided-disease default advisor + step copy.
      Export `describeDiseaseStep(step, ctx)` returning static rulebook-cited prose for each step (Overview / Per-symptom
      resolution / Duration-outcome guidance) with verbatim `// Core p.186–188` citations, and
      `export const defaultDiseaseAdvisor: DiseaseAdvisorSource = { describe: describeDiseaseStep }`.
      No invented TN/cost/threshold in copy (rules-compliance). Dynamic numbers come from the panel body, never the advisor.
      Files: `src/logic/guided-disease/steps.ts`
      Verify: `npx tsc --build --force --noEmit` clean.

- [ ] 4. Add guided-disease reducer unit + property tests.
      Unit (`reducer.test.ts`, mirror `guided-cast/__tests__/reducer.test.ts`): `start` → `overview` + bound `diseaseId`;
      `next`/`back` walk exact order `overview → symptoms → duration` and clamp/idempotent at ends;
      `goto` jumps to any step; `reset` returns a fresh (not same-reference) `initialDiseaseFlowState`.
      Property (`reducer.property.test.ts`, mirror `guided-cast/__tests__/reducer.property.test.ts` with fast-check):
      (a) step always ∈ `STEP_SEQUENCE` after ≤40 random events; (b) `next`/`back`/`goto` keep step in-sequence and clamped;
      (c) `next` from last / `back` from first are reference-identical no-ops; (d) `reset` from any arbitrary state deep-equals
      `initialDiseaseFlowState`; (e) determinism (same `(state,event)` twice → deep-equal); (f) frozen-state safety
      (`Object.freeze` input never throws, not mutated); (g) only `start` sets `diseaseId`, `reset` clears it, no other event
      changes it; (h) no-auto-advance (no event lands past step 1 implicitly).
      Files: `src/logic/guided-disease/__tests__/reducer.test.ts`, `src/logic/guided-disease/__tests__/reducer.property.test.ts`
      Verify: `vitest --run src/logic/guided-disease` — all new reducer tests pass.

## Phase B — Pure guided-corruption reducer module

- [ ] 5. Create the guided-corruption types module.
      Define `CorruptionStep = 'threshold' | 'resistance' | 'mutation'`; `CorruptionFlowState { step }`;
      `CorruptionFlowEvent = start | next | back | goto{step} | reset`; `CorruptionStepInfo { step; title; body; citation }`;
      and `CorruptionAdvisorSource.describe(step, ctx:{ atOrOverThreshold }): CorruptionStepInfo | Promise<CorruptionStepInfo>`.
      React-free, JSON-serializable. Header comment cites Core p.183 (+ Pure Soul p.142).
      Files: `src/logic/guided-corruption/types.ts`
      Verify: `npx tsc --build --force --noEmit` clean.

- [ ] 6. Create the guided-corruption reducer.
      Export `STEP_SEQUENCE = ['threshold','resistance','mutation']`, `initialCorruptionFlowState = { step:'threshold' }`,
      `guidedCorruptionReducer(state, event)`: same purity/totality/clamp rules as the disease reducer; `start` →
      `{ step:'threshold' }`; `reset` → fresh initial; `default` guard. Fixed 3-step sequence, no filtering.
      Files: `src/logic/guided-corruption/reducer.ts`
      Verify: `npx tsc --build --force --noEmit` clean.

- [ ] 7. Create the guided-corruption default advisor + step copy.
      Export `describeCorruptionStep(step, ctx)` with static cited prose (Threshold check / Resistance test / Mutation
      resolution), `// Core p.183` citations, and the "more than vs `>=`" note in Step-1 copy (A-1/A-4). Export
      `defaultCorruptionAdvisor: CorruptionAdvisorSource = { describe: describeCorruptionStep }`.
      Files: `src/logic/guided-corruption/steps.ts`
      Verify: `npx tsc --build --force --noEmit` clean.

- [ ] 8. Add guided-corruption reducer unit + property tests.
      Same shape as task 4, adapted to the 3 steps `threshold → resistance → mutation` (no `diseaseId`).
      Files: `src/logic/guided-corruption/__tests__/reducer.test.ts`, `src/logic/guided-corruption/__tests__/reducer.property.test.ts`
      Verify: `vitest --run src/logic/guided-corruption` — all pass.

## Phase C — Shared overlay + trigger components

- [ ] 9. Create `GuidedDiseaseTrigger` + `GuidedDiseasePanel` (and their `.module.css`).
      **Trigger** (mirror `GuidedCastTrigger`): native `<button>`, `Stethoscope` icon (lucide — deliberately NOT
      `HeartPulse`, which `DiseasePanel` already uses), text "Guide me through this" on desktop / icon-only on mobile
      via `useMediaQuery('(max-width: 767px)')`, `aria-label="Guide me through this disease"`,
      `data-testid="guided-disease-trigger"`, `onClick` calls `e.stopPropagation()` then `onOpen(diseaseId)`.
      **Panel** (copy the `GuidedCastPanel` scaffold verbatim): `createPortal` to `document.body`,
      `role="dialog" aria-modal` with `aria-label`, focus trap on Tab/Shift+Tab, `previousFocusRef` capture + restore
      on close, focus to the step `<h2 tabIndex={-1} aria-current="step">` on open/step-change (`requestAnimationFrame`),
      ArrowRight/ArrowLeft → next/back, Esc + backdrop → close, numbered `<ol>` stepper with per-step `goto` + `aria-current`,
      polite `aria-live` region, `sheet`/`drawer` variant via `useMediaQuery`. Consumes `defaultDiseaseAdvisor` as the source
      object and narrows `info instanceof Promise ? null : info`. Renders per-step bodies:
      Step 1 Overview (read-only timing summary from `getDiseaseProgress` + `RolledTiming.breakdown`; points at the existing
      `DiseasePanel` timing-roll control, mounts NO second `TimingRoll`); Step 2 per-symptom (for each resolved symptom from
      `getDiseaseSymptoms`, show description/effect/cadence; when `getSymptomTest(symptom.name, symptom.severity)` is non-null,
      render a one-tap "seed roll" button that calls an `onSeedRoll({ name, def, difficulty })` prop; Gangrene shows the
      `getToughnessBonus` threshold + a close-and-return hand-off button for the Hit-Location roll and seeds nothing for it);
      Step 3 Duration/outcome (Lingering Endurance test seedable via `onSeedRoll`; consequences guidance-only). `module.css`
      copies the `GuidedCastPanel.module.css` class structure verbatim (backdrop/panel/header/stepper/body/footer/srOnly).
      The panel performs no math and mutates nothing.
      Files: `src/components/shared/GuidedDiseaseTrigger.tsx`, `src/components/shared/GuidedDiseaseTrigger.module.css`,
      `src/components/shared/GuidedDiseasePanel.tsx`, `src/components/shared/GuidedDiseasePanel.module.css`
      Verify: `npx tsc --build --force --noEmit` clean; `npm run build` compiles.

- [ ] 10. Create `GuidedCorruptionTrigger` + `GuidedCorruptionPanel` (and their `.module.css`).
      **Trigger**: `Compass` icon (lucide — deliberately NOT `Skull`/`Bug`, both already used in `CorruptionCard`),
      "Guide me through this" / icon-only, `aria-label="Guide me through corruption"`,
      `data-testid="guided-corruption-trigger"`, `onClick` → `e.stopPropagation()` then `onOpen()`.
      **Panel**: same scaffold as task 9, consuming `defaultCorruptionAdvisor`. Bodies:
      Step 1 Threshold (`corr / getCorruptionThreshold(chars, getPureSoulLevel(talents))`; "more than vs `>=`" note);
      Step 2 Resistance (one-tap `onSeedRoll` for a Challenging (+0) Endurance test seeded via
      `resolveSeededTarget(character, { kind:'skill', skillName:'Endurance', fallbackChar:'T' })`);
      Step 3 Mutation (guidance + a hand-off button that calls `onClose()` so the player uses the existing `CorruptionCard`
      roller; shows type distribution via `getMutationTypeDistribution`, limits `getPhysicalMutationLimit`/`getMentalMutationLimit`,
      and WPB loss `getCorruptionLossOnMutation`; seeds no `RollDialog` for the d100s). No math, no mutation.
      Files: `src/components/shared/GuidedCorruptionTrigger.tsx`, `src/components/shared/GuidedCorruptionTrigger.module.css`,
      `src/components/shared/GuidedCorruptionPanel.tsx`, `src/components/shared/GuidedCorruptionPanel.module.css`
      Verify: `npx tsc --build --force --noEmit` clean; `npm run build` compiles.

- [ ] 11. Add calculated-total tooltips to both panels (steering: calculated-totals; FR-6, AC-14).
      In each panel, manage `openTooltipId` + anchor state (the `TooltipTriggerCell` + `Tooltip` pattern) and render every
      calculated total through `TooltipTriggerCell` with an additive labeled breakdown, one source of truth per total:
      symptom-test base target → `resolveSeededTarget(...).lines`; Lingering base target → same; corruption threshold →
      small local helper building `['TB '+getBonus(T), 'WPB '+getBonus(WP), 'Pure Soul '+getPureSoulLevel(talents)]` with the
      total from `getCorruptionThreshold`; physical/mental mutation limits (`getPhysicalMutationLimit`/`getMentalMutationLimit`)
      and corruption-loss-on-mutation (`getCorruptionLossOnMutation`) with TB/WPB component lines; Gangrene TB threshold
      (`getToughnessBonus`); rolled Incubation/Duration total reuses `RolledTiming.breakdown`. Numbers are never recomputed by
      hand. (Implement inside tasks 9/10 or as a focused follow-up pass; keep it in the same panels.)
      Files: `src/components/shared/GuidedDiseasePanel.tsx`, `src/components/shared/GuidedCorruptionPanel.tsx`
      Verify: `npx tsc --build --force --noEmit` clean; `npm run build` compiles.

## Phase D — Host wiring (DiseasePanel, CorruptionCard, NotesTab)

- [ ] 12. Host the disease guide inside `DiseasePanel` (additive only).
      Add `useReducer(guidedDiseaseReducer, initialDiseaseFlowState)`, `guideDiseaseId: number | null`, and
      `rollDialogState: { name; baseTarget; difficulty } | null` state. Render one `GuidedDiseaseTrigger` per active-disease
      row (inside `styles.diseaseDetails`), `onOpen={(id) => { setGuideDiseaseId(id); dispatchGuide({ kind:'start', diseaseId:id }); }}`;
      opening for a different id dispatches a new `start` (rebind + reset to Step 1, AC-2). Render `GuidedDiseasePanel` only
      when a disease is bound AND `rollDialogState == null` (yield for one-aria-modal, NFR-3/AC-18). Its `onSeedRoll` does
      `const { total } = resolveSeededTarget(character, def); setRollDialogState({ name, baseTarget: total, difficulty })`
      and renders the shared `RollDialog` with `defaultDifficulty`; `onRoll={(r) => { onRoll?.(r); setRollDialogState(null); }}`
      (shared history via the existing `onRoll` prop — already threaded from `NotesTab`). This seeded path is NEW and does NOT
      touch the existing `handleSymptomTest` auto-roll control, which stays byte-for-byte unchanged (AC-20). In
      `handleRemoveDisease`, if the removed id is the bound guide id, dispatch `reset` + clear `guideDiseaseId` + close
      (Decision 5). Guide panel close dispatches `reset`, clears `guideDiseaseId`, restores focus to the trigger.
      Files: `src/components/shared/DiseasePanel.tsx`
      Verify: `npx tsc --build --force --noEmit` clean; `vitest --run src/components/__tests__` (existing `DiseasePanel`-touching tests) pass unchanged.

- [ ] 13. Host the corruption guide inside `CorruptionCard` (additive only) and add optional `onRoll` prop.
      Add `onRoll?: (r: RollResult) => void` to `CorruptionCardProps` (optional ⇒ existing callers/tests stay green, NFR-2).
      Add the same `useReducer(guidedCorruptionReducer, …)` + `rollDialogState` state. Render exactly one
      `GuidedCorruptionTrigger` near the Corruption Tracker section, `onOpen={() => dispatchGuide({ kind:'start' })}` plus a
      `guideOpen` flag. Render `GuidedCorruptionPanel` only when open AND `rollDialogState == null`. Step-2 `onSeedRoll` seeds a
      Challenging (+0) Endurance `RollDialog` via `resolveSeededTarget`; `onRoll={(r) => { onRoll?.(r); setRollDialogState(null); }}`.
      Step-3 hand-off button closes the guide (player uses the existing in-card roller + "Add to Character"; the guide renders
      no second roller, never calls `handleRoll`/`handleAddRolledMutation`). Close dispatches `reset` + restores focus. The
      existing roller, tracker, and mutation lists are unchanged.
      Files: `src/components/shared/CorruptionCard.tsx`
      Verify: `npx tsc --build --force --noEmit` clean; `vitest --run src/components/__tests__/CorruptionCard.test.tsx` passes unchanged.

- [ ] 14. Thread `onRoll={addRoll}` into `CorruptionCard` from `NotesTab` (Finding 1 parity with `DiseasePanel`).
      Change the `<CorruptionCard … />` render to also pass `onRoll={addRoll}`. `DiseasePanel` already receives
      `onRoll={addRoll}`, so no change there. `NotesTab` is otherwise unchanged.
      Files: `src/components/pages/character/NotesTab.tsx`
      Verify: `npx tsc --build --force --noEmit` clean; `vitest --run src/components/pages/character/__tests__/NotesTab.test.tsx` passes.

## Phase E — Component / integration tests

- [ ] 15. Add `GuidedDiseaseTrigger` + `GuidedCorruptionTrigger` tests.
      Mirror `GuidedCastTrigger.test.tsx`: renders the native button with the correct `data-testid`/`aria-label`,
      `onClick` calls `onOpen` and `stopPropagation` does not toggle the parent row.
      Files: `src/components/shared/__tests__/GuidedDiseaseTrigger.test.tsx`,
      `src/components/shared/__tests__/GuidedCorruptionTrigger.test.tsx`
      Verify: `vitest --run src/components/shared/__tests__/GuidedDiseaseTrigger.test.tsx src/components/shared/__tests__/GuidedCorruptionTrigger.test.tsx` pass.

- [ ] 16. Add `GuidedDiseasePanel` steps + integration tests (RTL, mirror `GuidedCastPanel.*.test.tsx`).
      Cover: opt-in off by default (render `DiseasePanel` → no overlay; existing tests green) and trigger multiplicity
      (a character with 2 active diseases renders exactly 2 `guided-disease-trigger`s — count equals rows, not hard-coded 1,
      Finding 9); open/bind/reset (AC-2) — opening for a disease opens at Step 1; opening a different disease rebinds + resets;
      Esc/backdrop/close return focus to the trigger (AC-4); steps in RAW order `overview → symptoms → duration` (AC-5);
      seed-vs-guidance (AC-6/7/8/9) — a seedable symptom (e.g. Blight/Gangrene) exposes a one-tap control opening `RollDialog`
      with a read-only base target equal to `getSymptomTestBaseTarget` and difficulty defaulting to the symptom difficulty, and
      opening/rolling mutates nothing (assert `updateCharacter` not called with a character change); a `null`-test symptom
      (e.g. Fever) shows guidance only, no seed button; Gangrene shows "Daily (fail > TB times = lose location)" with the
      `getToughnessBonus` figure, renders no location control, seeds no location roll, and its hand-off closes the guide
      (Finding 6); Step-3 Lingering seeds a `RollDialog`, consequences are copy; tooltips (AC-14) — the symptom base-target
      `TooltipTriggerCell` opens a `Tooltip` containing the `resolveSeededTarget` lines; modal (AC-18/19) — while the seeded
      `RollDialog` is open exactly one `role="dialog" aria-modal` exists, focus returns to the step heading after it closes,
      and focus trap / heading focus / arrow nav / numbered stepper `aria-current` / polite live region hold.
      Files: `src/components/shared/__tests__/GuidedDiseasePanel.steps.test.tsx`,
      `src/components/shared/__tests__/GuidedDiseasePanel.integration.test.tsx`
      Verify: `vitest --run src/components/shared/__tests__/GuidedDiseasePanel.steps.test.tsx src/components/shared/__tests__/GuidedDiseasePanel.integration.test.tsx` pass.

- [ ] 17. Add `GuidedCorruptionPanel` steps + integration tests.
      Cover: `CorruptionCard` renders exactly one `guided-corruption-trigger`; opens at Step 1 (AC-3); order
      `threshold → resistance → mutation` (AC-10); Step 1 shows `corr / getCorruptionThreshold(chars, getPureSoulLevel(talents))`
      and cites Core p.183 (AC-11); Step 2 opens a `RollDialog` seeded Challenging (+0) Endurance via the reminder seam, the
      guide does not read the result, and with an `onRoll` spy passed to `CorruptionCard` rolling fires `onRoll` with the result
      while mutating no character field (Finding 1, AC-12); Step 3 opens no `RollDialog` for the d100 and its hand-off button
      closes the guide (AC-13); tooltips (AC-14) — the corruption-threshold `Tooltip` contains `TB`/`WPB`/`Pure Soul` lines, and
      the mutation-limit/loss tooltips show their components; no-auto invariants (AC-15) — mount, Next/Back, open a seeded roll,
      and roll never call `updateCharacter` with a mutation and never auto-advance; modal + a11y parity (AC-18/19).
      Files: `src/components/shared/__tests__/GuidedCorruptionPanel.steps.test.tsx`,
      `src/components/shared/__tests__/GuidedCorruptionPanel.integration.test.tsx`
      Verify: `vitest --run src/components/shared/__tests__/GuidedCorruptionPanel.steps.test.tsx src/components/shared/__tests__/GuidedCorruptionPanel.integration.test.tsx` pass.

## Phase F — Full verification gates (AC-21)

- [ ] 18. Run the four gates clean and fix any regression they surface.
      Run in order and resolve every error/new warning before done (fix-errors steering): typecheck, build, full test suite,
      lint. Any mechanic-touching fix must stay rulebook-compliant (verify against `docs/WarhammerFantasyRoleplay4e.md`,
      cite in comments) and must not alter existing pure logic. Clean up any temp files.
      Files: (whole repo)
      Verify (all must be clean):
      - `npx tsc --build --force --noEmit`
      - `npm run build`
      - `vitest --run`
      - `npx eslint .` (0 errors, no new warnings)

---

## Flagged ambiguities (carried from requirements/design; not silently resolved)

- **A-1 / A-4** Corruption trigger "more than" (Core p.183, line 8667) vs the app's `>= threshold`
  (`getCorruptionStatus`). The guide follows the app's `>=` for UI consistency and states the rulebook "more than" wording
  in Step-1 copy so the player/GM adjudicates the at-threshold case. `getCorruptionStatus` is NOT changed.
- **A-2** Endurance vs Cool for corruption resistance. The seedable mutation-trigger test (Core p.183) is Endurance; the guide
  seeds Endurance only and mentions the GM may substitute Cool for spiritual influences as guidance (GM-set ⇒ not seeded).
- **A-3** Wounded "(+20)" vs Easy=+40. The guide defers to `getSymptomTest('Wounded') → 'Easy'` verbatim and carries a
  `// Core p.188: printed "(+20)" conflicts with Easy=+40; deferring to getSymptomTest` comment. No new difficulty invented.
- **A-5** Corruption influence-strength / amount gained is GM-set; the guide models neither and auto-adds no corruption points.
- **A-6** Edge-species mutation split reuses `getMutationTypeDistribution`/`determineMutationType` exactly; unusual/custom
  species fall back to Human 50/50, surfaced as a note. No species added.
- **Exotic / GM-authored diseases** out of scope for v1: the flow supports only registered `DISEASE_REGISTRY` diseases; a
  disease resolving to no seedable test is presented guidance-only.

No remaining ambiguity blocks implementation; each item above is grounded in code that was read during exploration.
