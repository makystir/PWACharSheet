# Design Review — Guided Disease Progression & Guided Corruption / Mutation

Reviewer: design-review subagent (fresh read, no authoring context)
Design under review: `.agents/tasks/guided-disease-corruption/design.md`
Requirements: `.agents/tasks/guided-disease-corruption/requirements.md`
Verdict: **APPROVED** (0 HIGH, 0 MEDIUM, 0 rules-compliance findings; 3 NIT carried to build loop)

This design is a revision that already answered a prior review (CHANGES_REQUESTED: 0 HIGH, 3 MEDIUM, 6 NIT). I re-verified each prior finding's resolution against source rather than taking the design's word for it, and independently re-checked every WFRP citation and every code-level assumption.

---

## Summary of verification performed

I read the two scoped rulebook regions directly in `docs/WarhammerFantasyRoleplay4e.md` and quoted the controlling sentences (see Verified Assumptions). I also read the actual source for every seam the design leans on: `src/logic/diseases.ts`, `src/logic/corruption.ts`, `src/logic/reminders-target.ts`, `src/components/shared/DiseasePanel.tsx`, `src/components/shared/CorruptionCard.tsx`, `src/components/pages/character/NotesTab.tsx`, `src/components/shared/SpellCastingPanel.tsx`, `src/components/shared/GuidedCastTrigger.tsx`, `src/components/shared/RollDialog.tsx`, `src/logic/guided-cast/reducer.ts|steps.ts|types.ts`, `src/logic/assistant/rules/corruption.ts`, and the `TooltipTriggerCell` / `BreakdownTotal` precedent.

Every mechanic cited in the design is present and accurate at the stated page/line; every code assumption (panel props, existing roll paths, icons already imported, the yield-while-RollDialog-open pattern, the advisor sync-or-async contract, the tooltip components) is confirmed in the real source. No invented mechanic, no unverified difficulty/threshold, and no scope-rule violation was found.

---

## Findings

### NIT-1 — Pure Soul page citation differs between files (142 vs 182); design cites 142, assistant rule cites 182
Severity: NIT
Where: design.md "Citation verification" bullet "Pure Soul talent (p.142, source line 6811)"; and Decision 1b / FR-3.1 references.
Problem: The design cites Pure Soul at **p.142**. I verified the talent text at source line 6811 ("**Max:** Willpower Bonus … gain extra Corruption points equal to your level of Pure Soul before having to Test") and the index entry confirms **"Pure Soul 142"** (line 16823). So the design's page number is correct. However, the existing `src/logic/assistant/rules/corruption.ts` cites Pure Soul as **p.182** in its comments. This is a pre-existing inconsistency in the codebase, not introduced by this design, but because the guide sits next to that rule and the steering requires citing the source in comments, the implementer should use the verified **p.142** and may optionally note the discrepancy so the two files do not disagree.
Fix: In the guide's `steps.ts` Pure Soul comment, cite `// Core p.142: Pure Soul (Max WPB; raises corruption trigger point)`. Do not "fix" the assistant rule's p.182 in this task (out of scope; NON-REGRESSION), but a one-line code comment acknowledging the two page numbers would prevent a reviewer flagging drift later.

### NIT-2 — "Astounding Failure (–6)" wording is quoted from source but the SL ladder term should be surfaced consistently
Severity: NIT
Where: Decision 1a Step 3 / Lingering outcome copy; A-1-adjacent Lingering description.
Problem: The design quotes Lingering outcomes verbatim: Marginal Failure (0) → extend 1d10 days; Failure (–2) → Festering Wound; Astounding Failure (–6) → Blood Rot. I verified this verbatim at source (Lingering, "If this scores a Marginal Failure (0) … Failure (–2) … Astounding Failure (–6)"). The copy is accurate. The only nit: these SL-band thresholds are themselves rulebook data the guide displays as guidance; the design correctly keeps them guidance-only (not seeded), but the implementer should render them as static cited prose and must not derive or recompute any SL band in code.
Fix: Keep the three outcome strings as static copy with `// Core p.188: Lingering outcomes (SL bands verbatim)` and assert their presence in the Step-3 component test so the wording cannot silently drift.

### NIT-3 — Corruption Step 3 limit tooltip label "floor(total T 42 / 10)" risks implying a recomputation
Severity: NIT
Where: Decision 6 table rows for physical/mental mutation limit and Gangrene TB threshold (e.g. `TB 4 (floor(total T 42 / 10))`).
Problem: The tooltip breakdown strings embed the formula `floor(total T 42 / 10)`. The *total* must come from `getPhysicalMutationLimit` / `getMentalMutationLimit` / `getToughnessBonus` (the design says so), but the displayed "42" and the "floor(.../10)" string are a hand-built explanatory label. That is fine per the calculated-totals steering (it shows the components), but the risk is an implementer computing `Math.floor(total/10)` inline for the *label* and letting it drift from `getBonus`. 
Fix: Build the label from the same `getBonus(...)` result used for the total — e.g. `const tb = getToughnessBonus(character); const total = character.chars.T.i + character.chars.T.a + character.chars.T.b;` then render ``TB ${tb} (⌊${total}/10⌋)``. One `getBonus`/helper call feeds both the number and the label so they cannot diverge. Add a component-test assertion that the limit tooltip's displayed bonus equals `getPhysicalMutationLimit(character.chars)`.

---

## Rules-compliance assessment (no findings)

Every WFRP4e mechanic the design seeds or displays was verified DIRECTLY against `docs/WarhammerFantasyRoleplay4e.md` with the controlling sentence quoted (see Verified Assumptions). The seed-vs-guidance scope rule is correctly applied:

- **Seeded (characteristic / bare-skill tests only):** disease symptom Endurance/Cool tests (Blight, Buboes, Gangrene daily, Lingering, Wounded, Pox) and the Challenging (+0) Endurance corruption-resistance test. All resolve via `resolveSeededTarget` with a read-only base target + difficulty select. ✔ Matches the confirmed scope rule.
- **Routed to existing CorruptionCard roller, NOT RollDialog:** mutation type d100 and physical/mental d100 lookups. The design explicitly does not render a second roller and hands off via close-and-return. ✔
- **Routed to existing DiseasePanel control, NOT RollDialog:** Gangrene Hit-Location d100 (a table lookup, no skill/characteristic). ✔ Correctly excluded from seeding (Finding 6 resolution verified).
- **Guidance-only (GM-set / specialisation / SL-band):** Cool substitution for spiritual corruption (A-2), influence-strength/amount-gained (A-5), Lingering consequences, exotic/GM-authored diseases (A-4). ✔ None are seeded.

Errata: the design states no cited passage is overridden by errata for the in-scope mechanics. I did not find any in-scope errata conflict in the quoted passages; the symptom difficulties, corruption trigger, and mutation procedure are core-rulebook text with no contradicting errata surfaced. The one printed inconsistency (Wounded "Easy (+20)") is a core-text internal inconsistency, correctly deferred to the app's existing `getSymptomTest` value with a cited code comment (A-3) rather than inventing a difficulty — this is the right call and is NOT a rules-compliance violation.

## NO-AUTO invariant (no findings)
The design never auto-applies, auto-rolls, auto-advances, or auto-completes: reducers have no event that advances except explicit `next`/`goto`/`start`; the guide "reads nothing back" from roll results; mutation application and corruption-point changes stay on the player-driven `CorruptionCard` controls; the seeded `RollDialog` only records to shared history and closes. Reducer property test #8 ("no auto-advance") locks this in. ✔

## NON-REGRESSION (no findings)
Opt-in, off by default, dismissible; existing `DiseasePanel`/`CorruptionCard` byte-for-byte unchanged aside from one trigger each (one per disease row for diseases). The new `onRoll?` prop on `CorruptionCard` is optional, so existing callers/tests stay green — verified `CorruptionCard` currently takes only `{ character, update, updateCharacter }` and `NotesTab` threads no callback to it. One-aria-modal-at-a-time is enforced by the `rollDialogState == null` yield, verified identical to `SpellCastingPanel`. ✔

## Completeness (no findings)
State module/reducer shapes, fixed 3-step sequences (no `applicableSteps` filtering needed — justified), reset boundaries (close / disease-change / disease-removed / reopen), accessibility parity (portal, focus trap, heading focus, arrow nav, numbered stepper, live region), tooltip breakdowns for all six FR-6 totals with a single source of truth each, error/empty-state matrix (no seedable symptom, unrolled timing, unknown species, below-threshold, unregistered disease, disease removed mid-flow), and the reducer-property + reducer-unit + RTL component + verification-gate test plan are all specified concretely. ✔

---

## Verified Assumptions (checked directly against source)

1. **Corruption trigger** — Core p.183, source line 8668: *"Should you ever gain more Corruption points than your Willpower Bonus plus your Toughness Bonus, immediately attempt a Challenging (+0) Endurance Test. If passed … will have to Test again next time you gain Corruption Points. If you fail, then either your body or mind is about to mutate."* ✔ Matches design and `getCorruptionThreshold = TB + WPB + Pure Soul`.
2. **Mutation procedure + species split table** — Core p.183: *"First, lose Corruption points equal to your Willpower Bonus as you mutate. Next, roll percentile dice …"* with the Elf/Halfling/Human/Dwarf Body/Mind table. ✔ Matches `getCorruptionLossOnMutation` (= WPB) and `SPECIES_DISTRIBUTION`.
3. **Corruption Limits** — Core p.183: *"more mutations than your Toughness Bonus, or more mental corruptions than your Willpower Bonus, you have fallen to Chaos."* ✔ Matches `getPhysicalMutationLimit` (TB) / `getMentalMutationLimit` (WPB).
4. **Pure Soul** — Core p.142, source line 6811: *"**Max:** Willpower Bonus … You may gain extra Corruption points equal to your level of Pure Soul before having to Test to see if you become corrupt."* Index entry "Pure Soul 142" (line 16823). ✔ Page cite correct (see NIT-1 re: assistant rule's divergent p.182).
5. **Corrupting influence Endurance OR Cool** — Core p.182–183, source ~line 8627: *"attempt a Challenging (+0) Endurance Test, or Challenging (+0) Cool Test, as determined by the GM — usually physical influences are resisted with Endurance, spiritual corruption is resisted with Cool."* ✔ Supports A-2: Cool substitution is GM-set → guidance-only; the seedable mutation-trigger test at p.183 is specifically Endurance.
6. **Disease format** — Core p.186, lines 8791/8793: *"Incubation: How long before the victim demonstrates any symptoms."* / *"Duration: How long the symptoms of the disease last if untreated. At the end of the duration, the disease will come to an end."* ✔
7. **Blight** — Core p.187 (line 8932): *"Pass a Very Easy (+60) Endurance daily (normally when you sleep) or die … If Blight is marked as (Moderate), this Test is Easy (+40); if marked as (Severe), this Test is Average (+20)."* ✔ Matches `BLIGHT_TEST_BY_SEVERITY`.
8. **Buboes** — Core p.188 (line 8942): *"If your Buboes are lanced, make a Difficult (–10) Endurance Test once per day or [they] swell into place."* ✔ Matches `getSymptomTest('Buboes') → Difficult`.
9. **Gangrene** — Core p.188 (line ~8990): *"Roll percentile dice to determine a Hit Location … Each day, roll an Average (+20) Endurance Test … If you ever fail more times than you have Toughness Bonus, you completely lose all capability with the affected location."* ✔ Matches `Average`, `symptomRollsHitLocation`, and the "> TB" threshold.
10. **Lingering** — Core p.188 (line ~8994): *"After your disease reaches the end of its duration, attempt an Endurance Test with the Difficulty marked on the symptom … Marginal Failure (0) … extra 1d10 days … Failure (–2), develop a Festering Wound … Astounding Failure (–6) … develop Blood Rot."* ✔ Matches `getLingeringDifficulty` + Step-3 copy.
11. **Wounded** — Core p.188 (line ~9018): *"Every day, take an Easy (+20) Endurance Test or gain a Festering Wound if you do not already have one."* ✔ Confirms the A-3 printed inconsistency (Easy labeled +20 vs standard ladder +40); design correctly defers to `getSymptomTest('Wounded') → 'Easy'` with a cited comment.
12. **Pox** — Core p.188 (line ~9014): *"pass an Average (+20) Cool Test [to resist scratching]. When the Pox ends, attempt an Average (+20) Cool Test."* ✔ Matches `getSymptomTest('Pox') → Cool/Average`.
13. **Guidance-only symptoms** — Convulsions, Coughs and Sneezes, Fever, Flux, Malaise, Nausea all read as flat penalties / GM-triggered effects with no self-contained die roll (verified in source and in `symptoms.ts`); `getSymptomTest` returns `null` for them. ✔
14. **Finding 1 wiring** — `CorruptionCard` props are exactly `{ character, update, updateCharacter }` (no `onRoll`); `NotesTab` renders `<CorruptionCard character={character} update={update} updateCharacter={updateCharacter} />` with no roll callback, while `<DiseasePanel … onRoll={addRoll} />` already gets one. ✔ The proposed optional `onRoll` addition + `addRoll` threading is accurate and additive.
15. **Finding 2 roll path** — `DiseasePanel.handleSymptomTest` auto-rolls `Math.floor(Math.random()*100)+1` and calls `performRoll` then `onRoll?.(result)` directly (no `RollDialog`). ✔ The design's claim that the seeded `RollDialog` is a NEW, additive path (leaving the legacy auto-roll untouched) is correct.
16. **Finding 3/4 icons** — `CorruptionCard` imports `{ Skull, Bug }`; `DiseasePanel` imports `HeartPulse` (plus `ChevronDown/Right`, `Dices`). ✔ Choosing `Compass` (corruption trigger) and `Stethoscope` (disease trigger) avoids collisions as claimed.
17. **Finding 8 tooltip source** — `assistant/rules/corruption.ts` builds `lines: ['TB '+TB, 'WPB '+WPB, 'Pure Soul '+pureSoul]` as a local literal inside a `totals` entry (not an exported builder), using `getBonus`. ✔ The guide correctly plans its own identically-sourced helper rather than importing.
18. **RollDialog shape** — `RollDialog` renders a read-only "Base Target" value and a "Difficulty" `<select>` defaulting to `defaultDifficulty`; it has no skill/characteristic picker. ✔ Confirms the confirmed-scope premise.
19. **Yield pattern** — `SpellCastingPanel` renders `GuidedCastPanel` only when `rollDialogState == null` and the `RollDialog` otherwise, giving one top aria-modal. ✔ The design copies this exactly.
20. **Advisor contract** — `guided-cast/types.ts` `CastAdvisorSource.describe` returns `CastStepInfo | Promise<CastStepInfo>`; `defaultCastAdvisor = { describe: describeCastStep }`; panel narrows `instanceof Promise ? null : info`. ✔ The two new advisor interfaces mirror this.
21. **Reducer precedent** — `guidedCastReducer` is pure, clamps `next`/`back`, `goto` validates, `reset` returns a fresh initial state (`toEqual` not `toBe`), has a `default` guard; property tests assert frozen-state safety, determinism, membership, reset-to-initial. ✔ The two new reducers' specified behaviour and property-test list match.
22. **Tooltip components** — `Tooltip` and `TooltipTriggerCell` exist in `src/components/shared/`; `guidedCastSteps/BreakdownTotal.tsx` is the exact "labeled additive breakdown + single-open tooltip" precedent. ✔
23. **Helpers used by tooltips** — `getBonus` is exported from `calculators.ts` (`Math.floor(value/10)`). ✔

## Unverified / Wrong Assumptions

None. Every assumption the design makes that I could check against source or code was correct. I did not independently execute the four verification gates (`tsc`, `build`, `vitest`, `eslint`) — those run in the build loop — but no design-level blocker to them was identified.

---

## Verdict rationale

0 HIGH, 0 MEDIUM, 0 rules-compliance findings. The three NIT items (Pure Soul page-number consistency with the neighbouring rule, Lingering SL-band copy as static cited prose, and limit-tooltip label sourced from the same `getBonus` result) are minor and can be carried into the build loop without blocking. Per the mechanical rule (zero HIGH/MEDIUM and zero rules-compliance findings), the verdict is **APPROVED**.
