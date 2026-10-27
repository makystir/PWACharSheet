# Design Review — Downtime / Endeavour Assistant

Reviewed: `.agents/tasks/downtime-endeavour-assistant/design.md`
Against: `.agents/tasks/downtime-endeavour-assistant/requirements.md`
Codebase root: `d:\Git\PWACharSheet`

This is a fresh, source-verified review. Every load-bearing claim in the design
was checked against the actual code and the Core rulebook text in
`docs/WarhammerFantasyRoleplay4e.md`. The design is a second-pass revision that
already resolved an earlier review's HIGH/MEDIUM findings; this pass re-verifies
those resolutions from the source rather than trusting the design's own account.

---

## Verdict summary

- HIGH: 0
- MEDIUM: 0
- NIT: 4

Mechanical verdict: **APPROVED** (zero HIGH, zero MEDIUM).

The design is unusually thorough and internally consistent. All rulebook
mechanics are RAW-verified, the seam reuse is correct, mutual exclusion is
concrete, and the one shipped-file refactor is genuinely value-preserving. The
four findings below are precision/clarity issues that do not change any
mechanic, interface, or test outcome.

---

## Findings

### 1. NIT — Reputation / Research Lore page citation disagrees with the Core index (p.200 vs p.201)

**Where:** Decision 2 "Verified source quotes" and the per-endeavour table cite
Reputation and Research Lore as "Core **p.200**". The Finding-7 response
parenthetical also groups "Reputation/Research Lore/Combat Training 200".

**Problem:** The Core index (`docs/WarhammerFantasyRoleplay4e.md`) lists
`Reputation 201` and `Research Lore 201` (verified: index rows "Reputation 201",
"Research Lore 201"). Combat Training is `200`, Foment Dissent is `200`, Latest
News is `201`, Study a Mark is `201`, Income `198`, Banking `196` — those are
correct. Only Reputation and Research Lore are off by one page. Both are
**guidance-only** (no seeded roll) and the RAW text quoted for each is correct,
so no mechanic is affected — this is a citation-accuracy slip under the
rules-compliance "cite the source" rule.

**Fix:** Change the two citations to `Core p.201` for Reputation and Research
Lore (and correct the Finding-7 parenthetical to "Reputation/Research Lore 201,
Combat Training/Foment Dissent 200").

---

### 2. NIT — T2 "low coin" ignores brass (`wD`) while the rationale prints it

**Where:** Decision 2 triggers, T2; OQ-4 resolution (`wGC === 0 && wSS === 0`).

**Problem:** The predicate deliberately ignores `wD` (brass), but the rationale
echoes all three fields (e.g. `"You hold 0 GC, 0 SS, 4 d"`). A character holding
only brass (say 200 d) still fires the "low coin → Income" nudge while the
rationale displays a non-trivial brass figure, which can read as
self-contradictory to a player. The design reasons that brass is below the
status thresholds Income/Earning operate on, which is defensible, and the
threshold is explicitly flagged as an OQ-4 decision — so this is not a blocker.

**Fix (clarity only):** Either (a) add one clause to the rationale when
`wD > 0`, e.g. `"(brass holdings do not count toward spendable status coin)"`,
or (b) note in the code comment that `wD` is intentionally excluded from the
trigger so the printed brass figure is informational, not contradictory. No
mechanic change required.

---

### 3. NIT — FR-2.3 "Unusual Learning where relevant" is satisfied only via rationale prose

**Where:** Decision 2 triggers, T3; FR-2.3.

**Problem:** FR-2.3 asks for Training "(and, where relevant, **Unusual
Learning**)". The design emits a single `endeavour:rec:training` and mentions
Unusual Learning only inside the Training rationale string. This is a legitimate
reading of "where relevant" (Unusual Learning's test is GM-set, so it is
correctly kept guidance-only), but a reader expecting a distinct
recommendation/affordance for Unusual Learning will not find one.

**Fix:** State explicitly in T3 that Unusual Learning is surfaced as a
rationale mention only (not a separate `Suggestion`), and why (GM-set test →
guidance-only, OQ-6). No new emission is needed.

---

### 4. NIT — `resolveSeededTarget` snippet omits imports needed to type-check in isolation

**Where:** "Calculated-total tooltips" section, the `resolveSeededTarget` code
block in `reminders-target.ts`.

**Problem:** The snippet uses `CharacteristicKey`, `Character`, `ReminderTest`,
`computeSkillTarget`, and `computeCharacteristicTarget`. The existing file
already imports all of these (verified in `src/logic/reminders-target.ts`), so
the refactor will compile — but the snippet as written in the design reads as if
`CharacteristicKey` and `Character` might be newly needed. This is purely a
documentation completeness note so the implementer does not add duplicate
imports or miss that they already exist.

**Fix:** Add a one-line note that all referenced types/helpers are already
imported in the current `reminders-target.ts`, so the refactor adds no new
imports.

---

## Verified Assumptions (checked against source)

1. **`RollDialog` base target is read-only; only Difficulty select + Opposed
   toggle are in-dialog.** VERIFIED in `src/components/shared/RollDialog.tsx`:
   `<div className={styles.value}>{baseTarget}</div>` (read-only), a Difficulty
   `<select>`, and an Opposed Test checkbox. No skill/characteristic picker, no
   editable base target. The governing constraint that drives the
   seeded-vs-guidance split is correct.

2. **Seeded set = three bare basic skills.** VERIFIED in
   `src/types/character.ts` `BLANK_CHARACTER.bSkills`: `{ n: 'Perception', c:
   'I' }` and `{ n: 'Gossip', c: 'Fel' }` are bare rows (no specialisation).
   Study a Mark→Perception and Latest News/Foment Dissent→Gossip resolve against
   real rows and reflect advances.

3. **RAW tests for the seeded three.** VERIFIED directly in the Core text:
   Study a Mark = "Challenging (+0) Perception"; The Latest News = "Challenging
   (+0) Gossip"; Foment Dissent stage 1 = "Average (+20) Gossip" (stage 2 Charm
   GM-set). Difficulty literals `Challenging`/`Average` are valid
   `DifficultyLevel` members (RollDialog `DIFFICULTY_LABELS`).

4. **Guidance-only classifications are RAW-justified.** VERIFIED: Combat
   Training = "Challenging (+0) ... either a Melee or Ranged Skill" (both
   specialisation-only on the sheet; player choice); Research Lore = "Average
   (+20) Lore ... appropriate Lore Specialisation" + "Difficult (–10)
   Intelligence" untrained-literate branch; Reputation = "Challenging (+0)
   Career Skill" (player-dependent); Animal Training = "Average (+20) Animal
   Training" and `src/data/advanced-skills.ts` holds only
   `Animal Training (Demigryph|Dog|Horse|Pegasus|Pigeon)` — no bare row; Banking
   = 1d10/1d100 money mechanic; Income = flat status-based; Training = XP+1d10
   brass, no pass/fail skill test; Unusual Learning = "Hard (-20)" GM-chosen
   skill/char. None is seeded; each guidance classification is correct.

5. **No invented mechanics / every recommendation + seed is cited.** VERIFIED:
   every endeavour named (Healing, Income, Banking, Training + the class set) is
   drawn from `ENDEAVOUR_TEMPLATES` / `GENERAL_ENDEAVOURS` /
   `CLASS_ENDEAVOURS` (confirmed in `endeavour-templates.ts` and
   `endeavours.ts`). The per-endeavour Test table's "Test-driven? / exact test /
   citation-or-reason" column is complete for the trigger set and the
   non-trigger audit; no cost, difficulty, or effect is fabricated.

6. **Genuine ambiguities flagged, not silently resolved.** VERIFIED: off-class
   "one Difficulty Level harder" (Core p.200, index-confirmed) → OQ-3, not
   pre-applied; "Melee OR Ranged" player choice → guidance-only (flagged);
   Research Lore specialisation/untrained branch → guidance-only; Unusual
   Learning / Foment Dissent stage 2 / Consult-an-Expert stage 2 → not seeded;
   Up-In-Arms/unverifiable class endeavours → OQ-7 guidance-only.

7. **Recommendation module only names catalogued endeavours, grounded in tracked
   data.** VERIFIED: T1–T4 read only `wCur`/`W`/`criticalWounds`/`diseases?`
   (T1), `wGC`/`wSS`/`wD` (T2), `xpCur` (T3), `class` (T4) — all present on
   `Character` (`src/types/character.ts`). Emitted names are template/general
   (T1–T3) or `CLASS_ENDEAVOURS[class]` (T4). The fast-check P2 property
   (membership in the catalog union) is well-founded.

8. **Mutual exclusion / no double-fire is concrete.** VERIFIED: `downtime.ts`
   gates on `!inCombat && !hasActiveEndeavours && (hasFreeSlots || noPeriods)`
   and returns `[]` on `!hasFreeSlots && !noPeriods`; `endeavours.ts` emits
   `endeavour:active`. The new module reuses the identical `hasActiveEndeavours`
   predicate, early-returns `[]` when active endeavours exist (exclusive with
   `endeavour:active`), and namespaces every id `endeavour:rec:*` (no collision
   with `endeavour:available`/`endeavour:active`). The semantic (name-level)
   dedupe guard is backed by the verified disjointness of General/template names
   vs `CLASS_ENDEAVOURS` values. The "≤6 recs + at most one
   `endeavour:available` (may be absent)" bound matches `downtime.ts` behaviour.

9. **Seeded-roll seam reuses the existing path; nothing auto-applies.** VERIFIED:
   `src/components/assistant/useAssistantActions.ts` roll branch calls
   `resolveReminderBaseTarget(character, action.test.def)` then
   `openReminderRoll({ name: action.test.rollName, baseTarget, difficulty })` —
   exactly the flow Decision 4 describes. The `{ kind:'roll'; test:{ def,
   difficulty, rollName } }` descriptor matches `SuggestionAction` in
   `types.ts`, and `ReminderTest` matches `reminders.ts`. The dispatcher only
   seeds+opens; status/money/XP changes stay in the Endeavours-page mutators.

10. **`resolveSeededTarget` refactor is value-preserving.** VERIFIED by
    comparing against the current `resolveReminderBaseTarget`: for a found skill
    with a valid `skill.c`, both use `skill.c`; for an invalid/empty `skill.c`,
    the current code's `character.chars[badKey] ?? character.chars[fallback]`
    and the new `(skill.c in character.chars) ? skill.c : fallbackChar` both
    resolve to `fallbackChar`. `computeSkillTarget = i+a+b+skillAdvances` and the
    breakdown `charSubtotal (i+a+b) + skill.a` sum to the same total. Every
    existing caller's returned number is byte-identical, so
    `useAssistantActions.test.tsx`, `catalog-integration.test.ts`, and the combat
    tests stay green unchanged.

11. **Calculated-total tooltip path.** VERIFIED: `SuggestionItem.tsx` renders
    `suggestion.totals` via `TooltipTriggerCell` + `Tooltip` with
    `total.lines`; `SuggestionTotal { label, display, lines }` exists in
    `types.ts`. Shipping the base target as `{ label:'Base Target', display:
    String(total), lines }` from the single `resolveSeededTarget` branch needs
    no UI change and cannot drift from the value. Guidance-only recs carry no
    `totals`, correctly.

12. **Navigate routes are real.** VERIFIED: `endeavours` is a valid
    `PageSection` (`src/components/layout/navItems.ts`), and
    `catalog-integration.test.ts` `assertValidRoute` accepts `endeavours:`
    (route set `['combat:','character:notes','advancement:','endeavours:']`).
    When the new module is registered, that existing test will validate its
    navigate actions and stay green.

13. **`getActiveCriticalWounds` is a dormant export.** VERIFIED in
    `src/logic/critical-wounds.ts` (doc comment: "not currently wired into the
    UI … Kept exported deliberately"). T1 becoming its first caller is a benign
    activation, not a behaviour change.

14. **Engine registration is one import + one spread.** VERIFIED against
    `engine.ts`, whose `getSuggestions` already composes modules with the exact
    `...moduleName(character, context)` shape; category `'endeavour'` already
    exists in `types.ts` so `orderSuggestions` needs no change.

15. **`SuggestionSource` sync boundary preserved; offline-first.** VERIFIED:
    `types.ts` keeps `Suggestion[] | Promise<Suggestion[]>`; the design leaves it
    untouched and keeps the deterministic default synchronous. No
    network/telemetry/LLM is added.

---

## Unverified / Wrong Assumptions

- **Reputation / Research Lore page numbers (Finding 1):** the design's
  "p.200" for these two is **wrong** per the Core index (both are p.201). RAW
  text is correct; only the page digit is off. NIT because both are
  guidance-only and no mechanic depends on it.

- **No other wrong assumptions found.** Every other page citation
  (Combat Training 200, Foment Dissent 200, Latest News 201, Study a Mark 201,
  Income 198, Banking 196, Commission 197, Changing Career 48/196) matches the
  Core index and section text.

- **Not independently verifiable from the inlined source:** the Up-In-Arms /
  additional class-endeavour tests (Drill, Challenge, Seek Patronage, Establish
  Contacts, Tournament, Preach Sermon, Pray for Guidance, Treat Patients,
  Research Remedy, Study Arcane Lore, Brew Potion, Perform, Compose, Serve
  Master, Gather Rumours). The design correctly does **not** seed these and
  flags them as guidance-only pending source confirmation (OQ-7) — the
  rules-compliant outcome, so this is not a finding.
