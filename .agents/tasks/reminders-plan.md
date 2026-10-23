# Implementation Plan — Proactive Combat & Psychology Reminders

Source of truth: the APPROVED design at `.agents/tasks/reminders-design.md` and the
WFRP4e rulebooks in `docs/` (Core `docs/WarhammerFantasyRoleplay4e.md`). This plan
sequences that design faithfully; it does not re-decide the architecture. Every
mechanic implemented must cite its Core page in a code comment (rules-compliance).

## Design decisions carried from the approved design (not re-decided here)
- One pure module `src/logic/reminders.ts` is the single source of truth for
  condition/psychology reminder text, test, difficulty, and citation. `end-of-turn.ts`
  consumes it so the two can never drift. (design §2, §3)
- `end-of-turn.ts` output stays **byte-identical**; the existing
  `src/logic/__tests__/end-of-turn.test.ts` runs **unchanged** as the acceptance bar
  for the refactor. (design §3, §7)
- UI surface: a compact `CombatReminders` section rendered **only** inside
  `CombatDashboardFull` (not the compact strip), during active combat, above End Turn.
  (design §4)
- One-tap-to-roll reuses the existing `RollDialog` → `RollResultDisplay` → `addRoll`
  flow and the existing `computeSkillTarget`/`computeCharacteristicTarget` math. No
  auto-apply, no auto-remove, no changes to `dice-roller.ts`/`RollDialog`/`RollResultDisplay`.
  (design §4, §5, §10)
- Psychology reminders use the **verbatim** `PSYCHOLOGY_REMINDERS[type]` strings from
  `src/logic/psychology.ts` as their `description` (no psychology prose re-authored).
  (design §1, §2)
- GM-set / circumstance-dependent difficulties (Broken, Ablaze, all psychology tests)
  are seeded as **Challenging (+0)** as an adjustable default the player overrides in
  the dialog — not an invented fixed TN; cite Core p.169/p.168/p.189 at each row.
  (design §1, §5, §9)

## Verify commands (ALL must be clean before this task is done)
Run from repo root `d:\Git\PWACharSheet`:
- `npx tsc --build --force --noEmit`
- `npm run build`
- `vitest --run`   (equivalently `npm run test`)
- `npx eslint .`
No `@ts-ignore`, `eslint-disable`, or skipped/`.skip` tests to silence errors
(fix-errors rule). The only sanctioned disable pattern in this area is the existing
`react-hooks/set-state-in-effect` one in `CombatDashboard.tsx`/`Tooltip.tsx`; the
reminder flow is event-driven and is not expected to need it.

---

# Implementation Plan

- [ ] 1. Create the pure reminders module `src/logic/reminders.ts` (the single source of truth).
      Export the types `ReminderTest`, `ReminderSource`, `CombatReminder` and the functions
      `deriveConditionReminders(conditions)`, `derivePsychologyReminders(traits, enabled)`,
      `deriveAllReminders({conditions, psychologyTraits, psychologyEnabled})`, and
      `conditionReminderText(conditionName)` exactly as specified in design §2. Import
      `CharacteristicKey`/`PsychologyTrait` from `../types/character`, `DifficultyLevel` from
      `./dice-roller`, and read `PSYCHOLOGY_REMINDERS` from `./psychology` for psychology
      `description` strings (verbatim — do not re-author). Build a module-private condition table
      keyed by condition name holding `{ description, test?, citation }` plus a
      `CONDITION_REMINDER_ORDER` array = `['Stunned','Poisoned','Broken','Blinded','Deafened']`
      (this reproduces the push order in `end-of-turn.ts` so the consumer's effect order is
      unchanged — verified against `processEndOfTurn`). The five `description` literals MUST be
      byte-identical to today's inline strings in `end-of-turn.ts`:
        - Stunned → `Endurance Test (Challenging +0) required to remove`
        - Poisoned → `Endurance Test to remove (each SL removes extra)`
        - Broken → `Cool Test to remove`
        - Blinded → `1 level removed every other round`
        - Deafened → `1 level removed every other round`
      Roll-backed condition tests and difficulties per design §1 (Stunned→Endurance skill,
      fallbackChar T; Poisoned→Endurance skill, fallbackChar T; Broken→Cool skill, fallbackChar
      WP; Ablaze→Athletics skill, fallbackChar Ag — all Challenging). Blinded/Deafened/Bleeding/
      Entangled → informational (no `test`). `deriveConditionReminders` iterates
      `CONDITION_REMINDER_ORDER` (not the input array) so output order is input-order-independent.
      `derivePsychologyReminders` returns `[]` when `enabled` is false; otherwise maps each
      `PsychologyType` to its §1 row (Fear/Terror→Cool, Frenzy→Willpower, Animosity/Hatred/
      Prejudice/Phobia→Cool, Trauma→informational), labels Fear/Terror with the rating (show
      `Rating ?` when `rating` is undefined), and uses `PSYCHOLOGY_REMINDERS[type]` as the
      `description`. Coalesce undefined `traits` to `[]`. Add a `// Core p.NNN:` citation comment
      at every mechanic (Stunned p.169, Poisoned p.169, Broken p.169, Ablaze p.168,
      Blinded/Deafened p.169, Entangled/Bleeding p.168–169, psychology p.189–191; char groupings
      Cool→WP / Endurance→T / Athletics→Ag per the Core skill list).
      Files: `src/logic/reminders.ts`
      Verify: `npx tsc --build --force --noEmit` passes (module compiles, no new errors).

- [ ] 2. Refactor `src/logic/end-of-turn.ts` to source its five reminder strings from
      `conditionReminderText(...)` while keeping every emitted `EndOfTurnEffect` byte-identical.
      Replace only the five inline reminder-string literals (Stunned, Poisoned, Broken, Blinded,
      Deafened) with `conditionReminderText('<Name>')!`; do NOT touch the damage effects
      (Bleeding/Ablaze/Poisoned), the Surprised `remove_condition` branch, `newWounds`,
      `removedConditions`, `roundAdvanced`, or the push order. Add a short `// Core p.169 (cited
      in reminders.ts)` comment at the refactored reminders. The non-null `!` is safe because
      those five names are compile-time present in the `reminders.ts` table (asserted by the
      unit test in step 5).
      Files: `src/logic/end-of-turn.ts`
      Verify: `vitest --run src/logic/__tests__/end-of-turn.test.ts` — the existing test file,
      UNCHANGED, passes (byte-identical output), and `npx tsc --build --force --noEmit` is clean.

- [ ] 3. Create the presentational `CombatReminders` component and its CSS module.
      Component is pure (no derivation, no roll resolution). Props per design §4:
      `{ reminders: CombatReminder[]; onRollReminder: (r: CombatReminder) => void }`. Render
      nothing (zero DOM) when `reminders.length === 0`. Otherwise render a titled "Reminders"
      section using the `AlertTriangle` lucide icon (already imported pattern in the dashboard);
      each reminder is a row showing `label` + `description`, an info button that opens the shared
      `Tooltip` (`src/components/shared/Tooltip.tsx`) with the reminder's `citation`, and — only
      when `reminder.test` is present — a Roll button with
      `aria-label={\`Roll ${reminder.test.rollName}\`}` that calls `onRollReminder(reminder)`.
      Reuse the dashboard's `pressable` micro-interaction class for the button. Follow existing
      CSS-module conventions. No calculated total is displayed in these rows, so no breakdown
      tooltip is required here (the only computed number — the roll base target — is shown by
      `RollDialog`, which renders its own breakdown; see step 6 and design §4 note).
      Files: `src/components/combat/CombatReminders.tsx`, `src/components/combat/CombatReminders.module.css`
      Verify: `npx tsc --build --force --noEmit` passes.

- [ ] 4. Wire reminder derivation + the one-tap roll flow into `CombatDashboardFull` and forward
      roll results from `CombatPage`. In `src/components/combat/CombatDashboard.tsx`
      (`CombatDashboardFull` only): add an optional `onRoll?: (r: RollResult) => void` prop to
      `CombatDashboardProps`; import `deriveAllReminders`/`deriveConditionReminders`, the shared
      `RollDialog`/`RollResultDisplay`, and `computeSkillTarget`/`computeCharacteristicTarget`/
      `RollResult`/`DifficultyLevel` from `dice-roller`. Render `<CombatReminders .../>` inside
      `CombatDashboardFull` only, gated on `inCombat`, positioned above the End Turn control.
      Derivation + roll flow per design §4 steps 0–4 and §5:
        - When `character` is **undefined**: derive condition reminders only via
          `deriveConditionReminders(conditions)`, then map every reminder to `{ ...r, test: undefined }`
          before passing to `CombatReminders` (so NO Roll button can render), and make
          `onRollReminder` early-return (no `RollDialog` opens without a sheet).
        - When `character` is **defined**: compute `reminders` with `useMemo` via
          `deriveAllReminders({ conditions, psychologyTraits: character.psychologyTraits ?? [],
          psychologyEnabled: character.houseRules?.usePsychologyTracker ?? false })`.
          `onRollReminder(reminder)` resolves the base target from `reminder.test.def` reusing the
          SAME pattern as `QuickRollBar.buildQuickSkills`/`CombatPage.openWeaponRoll`: for
          `kind:'skill'` find the skill by name in `[...character.bSkills, ...character.aSkills]`;
          if found compute `computeSkillTarget(charVal.i, charVal.a, charVal.b, skill.a)` with
          `charVal = character.chars[skill.c]`, else fall back to
          `computeCharacteristicTarget` on the reminder table's `fallbackChar`; for
          `kind:'characteristic'` use `computeCharacteristicTarget(char.i, char.a, char.b)`. Then
          open `RollDialog` with `skillOrCharName={test.rollName}`, `baseTarget`, and seed the
          difficulty via the existing `defaultDifficulty` prop (mirroring
          `CombatPage.openWeaponRoll`). On result, show `RollResultDisplay` and call `onRoll?.(result)`.
          Do NOT call `updateCharacter`/`onRemoveCondition`/wound/advantage mutators from this path
          (passivity invariant). In `src/components/pages/CombatPage.tsx`, pass
          `onRoll={(r) => addRoll?.(r)}` to the dashboard instance(s) (reminders only render in the
          full variant; the compact branch is unaffected).
      Files: `src/components/combat/CombatDashboard.tsx`, `src/components/pages/CombatPage.tsx`
      Verify: `npx tsc --build --force --noEmit` and `npm run build` both clean.

- [ ] 5. Unit tests for `reminders.ts` and the single-source refactor.
      In `src/logic/__tests__/reminders.test.ts` (vitest, mirroring
      `attack-consequences.test.ts`): assert `conditionReminderText` returns the exact expected
      literal for each of Stunned/Poisoned/Broken/Blinded/Deafened and `undefined` for
      Entangled/Fatigued/Prone/Surprised/Unconscious and an unknown name (this guards the `!` in
      step 2); `deriveConditionReminders` maps each roll-backed condition to the correct `test`
      (kind, difficulty, fallbackChar) and citation and marks Blinded/Deafened/Bleeding
      informational; `derivePsychologyReminders` returns `[]` when disabled, otherwise maps all
      eight types to their §1 row with Trauma informational and Fear/Terror labels including the
      rating; `deriveAllReminders` lists conditions first then psychology.
      Files: `src/logic/__tests__/reminders.test.ts`
      Verify: `vitest --run src/logic/__tests__/reminders.test.ts` — all new tests pass.

- [ ] 6. fast-check property tests for the pure derivation and the anti-drift guarantee.
      In `src/logic/__tests__/reminders.property.test.ts` (fast-check, mirroring
      `attack-consequences.property.test.ts`): (a) **exact-set** — for an arbitrary set of known
      condition names + psychology traits, the derived reminders are exactly the expected set
      (one per reminder-bearing condition/trait, correct `test` presence, difficulty, char/skill);
      (b) **order stability** — shuffling the input condition array does not change output order;
      (c) **end-of-turn parity** — for any condition set, filter `processEndOfTurn(...).effects`
      to `type === 'reminder'` and assert each `effect.description === conditionReminderText(effect.condition)`;
      (d) **reverse-direction** — for each name in `CONDITION_REMINDER_ORDER`,
      `conditionReminderText(name)` is defined and non-empty; and a source-level check that none
      of the five byte-identical reminder literals appear as inline string literals in
      `src/logic/end-of-turn.ts` (read the file text in the test and assert absence), proving each
      string lives only in `reminders.ts`.
      Files: `src/logic/__tests__/reminders.property.test.ts`
      Verify: `vitest --run src/logic/__tests__/reminders.property.test.ts` — all properties hold.

- [ ] 7. Component test for `CombatReminders`.
      In `src/components/__tests__/CombatReminders.test.tsx` (RTL + jsdom, mirroring
      `QuickRollBar.test.tsx`): renders nothing for an empty list (zero DOM); renders a Roll
      button only for reminders with a `test` and none for informational rows; clicking Roll calls
      `onRollReminder` with the right reminder; the info button opens the `Tooltip` showing the
      citation text.
      Files: `src/components/__tests__/CombatReminders.test.tsx`
      Verify: `vitest --run src/components/__tests__/CombatReminders.test.tsx` — all pass.

- [ ] 8. Integration test for dashboard wiring + one-tap roll (passivity + guards).
      In `src/components/combat/__tests__/CombatDashboard.reminders.test.tsx` (mirroring the
      existing `src/components/combat/__tests__/CombatDashboard.*.test.tsx` setup): with Stunned
      applied in combat, the full dashboard shows the Stunned reminder; tapping Roll opens
      `RollDialog` seeded with the Endurance test at Challenging difficulty; the result flows to an
      `onRoll` spy; assert NO condition/wound/advantage mutation occurs on the reminder roll
      (passivity invariant — e.g. `updateCharacter`/`onRemoveCondition` spies not called).
      With the Psychology Tracker house rule off no psychology reminders render even when traits
      exist; with it on they do. With `character` undefined and a condition applied in combat, the
      dashboard renders the condition reminder row(s) with NO Roll button and no psychology
      reminders, and invoking the reminder Roll path opens no `RollDialog` (early-return guard).
      Files: `src/components/combat/__tests__/CombatDashboard.reminders.test.tsx`
      Verify: `vitest --run src/components/combat/__tests__/CombatDashboard.reminders.test.tsx` —
      all pass; the existing `end-of-turn.test.ts` still passes unchanged (regression).

- [ ] 9. Breakdown-tooltip audit for any calculated total shown (calculated-totals rule).
      Confirm the reminder rows display no bare calculated total. The only computed number in this
      flow is the roll base target, shown inside `RollDialog`, which already renders its own
      breakdown — so no new tooltip is required. If, during implementation, any reminder row is
      made to display a computed target/number inline, add a `Tooltip`
      (`src/components/shared/Tooltip.tsx`) breakdown in the
      `Initial + Advances + Bonus (+ Skill) = Target` additive format with labeled sources,
      showing zero components, hover-on-desktop/tap-on-mobile. Do not leave any inline computed
      total without a tooltip.
      Files: (only if a computed total is introduced) `src/components/combat/CombatReminders.tsx`
      Verify: visual/code review confirms no bare calculated total in the reminders UI; if one was
      added it has a `Tooltip` breakdown. `npx eslint .` clean.

- [ ] 10. Full green gate — run every verify command and fix any error at root cause.
      Run all four, fix on sight (fix-errors rule; re-run flaky-looking failures once to confirm
      before treating as real), and leave nothing red.
      Verify (all must be clean):
      - `npx tsc --build --force --noEmit`
      - `npm run build`
      - `vitest --run`
      - `npx eslint .`

## Notes for the implementer
- Open questions in design §9 (Broken/Ablaze/psychology difficulty seeds, Broken-while-Engaged
  button-disable, Fear single-roll vs Extended, out-of-combat psychology, Terror wording vs RAW)
  are resolved in the design as implemented here: seed Challenging (+0) adjustable defaults, keep
  Broken's Roll enabled, surface a single Cool Test for Fear, show psychology only in combat, and
  reuse the app's `PSYCHOLOGY_REMINDERS.Terror` string verbatim. Do not re-author those; if a
  rulebook check during implementation contradicts a cited page, flag it rather than silently
  changing the mechanic (rules-compliance).
- Do not modify `dice-roller.ts`, `RollDialog.tsx`, `RollResultDisplay.tsx`, `psychology.ts`
  (read `PSYCHOLOGY_REMINDERS` only), `data/conditions.ts`, `Tooltip.tsx`, or
  `EndOfTurnReportModal.tsx` (design §8 "Unchanged").
