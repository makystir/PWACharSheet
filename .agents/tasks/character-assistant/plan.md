# Character Assistant — Implementation Plan

Derived from the approved design (`design.md`, Revision 2) and `requirements.md`
in this folder. The plan is ordered by dependency; every item leaves the
codebase buildable. The feature is **additive** — existing tests must stay green
unchanged, and work lands on the current branch (no worktree).

## Verification gates (what "done" means)

Every item is verified with the project's real commands. The whole task is done
only when ALL of these are clean:

- `npx tsc --build --force --noEmit` — 0 type errors.
- `npm run build` — succeeds (`tsc --build && vite build`).
- `vitest --run` (a.k.a. `npm test`) — all tests pass, including the pre-existing
  suite unchanged.
- `npx eslint .` — 0 errors and no NEW warnings.

Lint rule: do not add `@ts-ignore`, broad `eslint-disable`, or skipped tests. The
single sanctioned `// eslint-disable-next-line react-hooks/set-state-in-effect`
pattern — exactly as used in `src/components/shared/Tooltip.tsx` and
`src/components/pages/CharacterPage.tsx` — may be reused ONLY for a genuine
external-system sync (e.g. repositioning a tooltip against a DOM anchor), never
to silence a real bug.

Rulebook compliance (rules-compliance steering): every suggestion that encodes a
rule carries a `// Core p.NNN` code comment AND the same string in
`Suggestion.citation`. Reminder-derived citations are reused verbatim from
`reminders.ts`. The flagged ambiguities (OQ-2 `>` vs `>=`; OQ-5 snooze duration /
storage key) are carried forward as explicit confirm-or-flag items — do NOT guess
silently (see items 15 and 16).

---

## Phase A — Behaviour-preserving extractions (shared sources of truth)

These come first because the engine consumes them. Each is a pure refactor: the
same inputs produce the same outputs, verified by the existing tests of the call
sites.

- [ ] 1. Extract advancement readiness into a pure helper.
      Add `isReadyToAdvance(character): boolean` to `src/logic/advancement.ts`,
      moving the `charsMet && skillsMet && talentsMet` computation from
      `AdvancementPage.tsx` (lines ~210–216) verbatim — reuse
      `careerSkillMatches`, `getCurrentLevelTalents`, and
      `CAREER_COMPLETION_THRESHOLDS`, all already in that module. Then switch
      `AdvancementPage.tsx` to call `isReadyToAdvance(character)` for
      `readyToProgress` while keeping its per-item `charsMet/skillsMet/talentsMet`
      locals for the checklist UI (unchanged display). Add `// Core p.48` comment.
      Files: `src/logic/advancement.ts`, `src/components/pages/AdvancementPage.tsx`.
      Verify: `vitest --run` — existing advancement/AdvancementPage tests pass with
      no change; `npx tsc --build --force --noEmit` clean.

- [ ] 2. Extract the active-endeavours predicate.
      Add `hasActiveEndeavours(character): boolean` to `src/logic/endeavours.ts`
      (create the module if endeavour helpers do not yet have a home; otherwise add
      to the existing one), implementing EXACTLY
      `character.endeavours.some(p => p.entries.some(e => e.status === 'pending' || e.status === 'in_progress'))`.
      Switch `App.tsx`'s `showEndeavoursBadge` prop to call it so the two cannot
      diverge.
      Files: `src/logic/endeavours.ts` (new or existing), `src/App.tsx`.
      Verify: `vitest --run` — existing suite green; the Navigation badge still
      shows under the same conditions (covered by existing App/Navigation tests).

- [ ] 3. Add the single carried-encumbrance reducer and converge call sites.
      Add `calculateCarriedEncumbrance(character): number` to
      `src/logic/encumbrance.ts` summing weapons (`parseFloat(w.enc)`), armour via
      `calculateArmourEncumbrance`, trappings via `calculateCarriedTrappingEnc`
      (honouring `houseRules.ignoreBackpackEnc`), and coins via
      `calculateCoinWeight` (import from `calculators.ts`). Refactor `GearTab.tsx`
      and `PrintLayout.tsx` to call it instead of their inline `eW+eA+eT+eCoin`.
      Add `// Core p.293` comment.
      Files: `src/logic/encumbrance.ts`, `src/components/pages/character/GearTab.tsx`
      (confirm path), `src/components/.../PrintLayout.tsx` (confirm path).
      Verify: `vitest --run` — existing encumbrance / GearTab / PrintLayout tests
      assert identical numbers and pass; add a focused unit test for the reducer.

- [ ] 4. Extract the reminder base-target resolver for sharing.
      Create `src/logic/reminders-target.ts` exporting
      `resolveReminderBaseTarget(character, def: ReminderTest): number`, moved
      verbatim from the private function in `CombatDashboard.tsx` (line ~125).
      Update `CombatDashboard.tsx` to import it; behaviour and output unchanged.
      Files: `src/logic/reminders-target.ts` (new),
      `src/components/combat/CombatDashboard.tsx`.
      Verify: `vitest --run` — existing CombatDashboard tests (reminder rolls) pass
      unchanged; add a small unit test covering `characteristic` and `skill`
      (with/without the named skill) resolution.

## Phase B — The pure engine (`src/logic/assistant/…`)

React-free, deterministic, side-effect-free. Depends on Phase A helpers and the
existing calculators — never recomputes a mechanic a second way.

- [ ] 5. Define the engine types.
      Create `src/logic/assistant/types.ts` with `SuggestionCategory`,
      `SuggestionUrgency`, `SuggestionAction` (discriminated union `navigate |
      roll` ONLY — `openSection` deferred), `Suggestion` (incl. optional
      `secondaryAction`, `citation`, `totals`), `SuggestionTotal`,
      `SuggestionContext` (`{ inCombat: boolean }`), and the `SuggestionSource`
      interface whose `getSuggestions` returns `Suggestion[] | Promise<Suggestion[]>`
      with the documented async-future-proofing comment (FR-7.2). Reuse
      `ReminderTest` from `reminders.ts` and `DifficultyLevel` from
      `dice-roller.ts` for the `roll` action's `test`.
      Files: `src/logic/assistant/types.ts`.
      Verify: `npx tsc --build --force --noEmit` clean.

- [ ] 6. Implement the five pure rule modules.
      Create `src/logic/assistant/rules/{advancement,endeavours,encumbrance,corruption,reminders}.ts`,
      each a pure `(character[, ctx]) => Suggestion[]`:
      - advancement (FR-8.1, `// Core p.48`): `xpCur>0 && isReadyToAdvance` →
        `recommended` "Ready to advance…" → `navigate: advancement`;
        `xpCur>0 && !ready` → `info` "You have N unspent XP" (+ XP `totals`);
        `xpCur===0` → none.
      - endeavours (FR-8.2): emit iff `hasActiveEndeavours` → `info` →
        `navigate: endeavours`.
      - encumbrance (FR-8.3, `// Core p.293`): read `strongBackLevel`/`sturdyLevel`
        exactly as `sheet-totals.ts` does (`talents.find(t=>t.n==='Strong Back'|'Sturdy')?.lvl ?? 0`),
        `max = calculateMaxEncumbrance(chars, sb, sturdy)`,
        `current = calculateCarriedEncumbrance(character)`; emit iff `current > max`
        → `critical` → `navigate: character/gear`; `totals` built from
        `getTrappingEncBreakdown` + weapon/armour/coin lines + `getEncumbranceBreakdown`;
        `citation = "Core p.293: Overburdened"`.
      - corruption (FR-8.4, `// Core p.183 + Pure Soul p.182`): `pureSoul =
        getPureSoulLevel(talents)`, `threshold = getCorruptionThreshold(chars,
        pureSoul)`; emit iff `corr > threshold` (strict `>` per item 15) →
        `critical` "Corruption Test due"; primary action seeded Endurance roll
        (`{ def: { kind:'skill', skillName:'Endurance', fallbackChar:'T' },
        difficulty:'Challenging', rollName:'Endurance (resist Corruption)' }`),
        secondary `navigate: character/notes`; `totals` lines `['TB n','WPB n','Pure Soul n']`;
        `citation = "Core p.183: Corrupting (+ Pure Soul talent, p.182)"`.
      - reminders (FR-8.5): import and call `deriveAllReminders` from
        `reminders.ts` (consume, never fork); map each `CombatReminder` →
        `Suggestion` with id `reminder:${r.id}`, `rationale = r.description`,
        `category:'combat'`, `urgency:'critical'`, action = `roll` with `r.test`
        when present else `navigate: combat`, `citation = r.citation` verbatim.
      Files: `src/logic/assistant/rules/*.ts`.
      Verify: `npx tsc --build --force --noEmit` clean (tests land in item 9).

- [ ] 7. Implement ordering and the dismiss/snooze pure filter.
      Create `src/logic/assistant/ordering.ts` (`orderSuggestions(raw, ctx)`):
      in-combat group order `combat, encumbrance, corruption, advancement,
      endeavour`; out-of-combat `advancement, endeavour, corruption, encumbrance,
      combat`; within a group sort by urgency (`critical<recommended<info`) then
      by `id` lexical (total, deterministic). Create
      `src/logic/assistant/visible.ts` (`visibleSuggestions(raw, dismissState,
      now)`) — pure: drop dismissed ids and snoozed-and-unexpired ids; NO writes.
      Files: `src/logic/assistant/ordering.ts`, `src/logic/assistant/visible.ts`.
      Verify: `npx tsc --build --force --noEmit` clean.

- [ ] 8. Implement the engine entry point and source.
      Create `src/logic/assistant/engine.ts` with `getSuggestions(character,
      context)` (returns `[]` when `!character`, composes the five rule modules,
      then `orderSuggestions`) and `deterministicSuggestionSource: SuggestionSource`
      (always-sync wrapper, the permanent offline fallback).
      Files: `src/logic/assistant/engine.ts`.
      Verify: `npx tsc --build --force --noEmit` clean.

- [ ] 9. Engine test suite (Vitest + fast-check).
      Create `src/logic/assistant/__tests__/` tests: determinism property;
      serializability property (`JSON.parse(JSON.stringify(s))` round-trips, no
      function values recursively); purity (deep-frozen character + spied
      `localStorage`/navigate/dialog setters, nothing touched/thrown); per-rule
      tests asserting the exact triggers against the REAL extracted predicates
      (not re-implementations), including corruption Pure-Soul-included strict `>`,
      overburdened `current > max` with p.293 citation + `gear` target, reminders
      equal `deriveAllReminders(...)` mapped (consumption, citation verbatim);
      ordering (combat-first in combat, progression-first out); `visible` filter
      drops dismissed/snoozed and performs no writes.
      Files: `src/logic/assistant/__tests__/*.test.ts`.
      Verify: `vitest --run src/logic/assistant` — all new tests pass.

## Phase C — Provider, dismiss store, and app-shell wiring

- [ ] 10. Provider + hook and the local dismiss/snooze store.
      Create `src/components/assistant/AssistantContext.tsx` mirroring
      `CommandPaletteContext.tsx` (`isOpen/open/close/toggle`). Create
      `src/components/assistant/dismissStore.ts` persisting `DismissRecord
      { dismissed: string[]; snoozedUntil: Record<string, number> }` to
      `localStorage` key `assistant-dismissals` (per item 16), with try/catch
      in-memory fallback mirroring `Navigation`'s storage handling, and methods
      `dismiss(id)`, `snooze(id, now)` (24h), `pruneDismissed(activeIds)`, and a
      read accessor. No network.
      Files: `src/components/assistant/AssistantContext.tsx`,
      `src/components/assistant/dismissStore.ts`,
      `src/components/assistant/__tests__/dismissStore.test.ts`.
      Verify: `vitest --run src/components/assistant` — dismissStore tests pass
      (incl. throwing-storage fallback).

- [ ] 11. Map action descriptors to real handlers.
      Create `src/components/assistant/useAssistantActions.ts` exposing
      `dispatchAction(action)` that switches on `kind`: `navigate` → the existing
      `navigate(page, subTab)`; `roll` → resolve `baseTarget` via
      `resolveReminderBaseTarget` (item 4) and set a NEW shell reminder-roll state
      carrying `difficulty`; `default` → compile-time `never` + `console.warn`. It
      never calls an advance/apply/mutation handler.
      Files: `src/components/assistant/useAssistantActions.ts`,
      `src/components/assistant/__tests__/useAssistantActions.test.tsx`.
      Verify: `vitest --run src/components/assistant` — a `roll` dispatch sets state
      with resolved baseTarget + the descriptor's difficulty; `navigate` calls the
      injected navigate.

- [ ] 12. Wire the shell in `App.tsx`.
      Wrap `AppContent` with `<AssistantProvider>` beside `<CommandPaletteProvider>`
      (inside `ErrorBoundary`). In `AppWithCharacter`: memoize
      `assistantContext = { inCombat: character.combatState.inCombat }`; memoize
      `rawSuggestions` from `deterministicSuggestionSource.getSuggestions` with the
      `Array.isArray(r) ? r : []` sync-narrowing; memoize `suggestions =
      visibleSuggestions(rawSuggestions, dismissState, Date.now())`; add a
      `useEffect` keyed on `rawSuggestions` that calls
      `dismissStore.pruneDismissed(new Set(rawSuggestions.map(s=>s.id)))` (write in
      effect, never render). Add a new reminder-roll state `{ name, baseTarget,
      difficulty }` and render a second `RollDialog` with
      `defaultDifficulty={reminderRollState.difficulty}` (leave the existing
      quick-roll `{ name, baseTarget }` state untouched). Pass `suggestions.length`
      + `open()` into `Navigation`, and render `<AssistantPanel suggestions …
      onAction={dispatchAction} onDismiss onSnooze />` once at the shell.
      Files: `src/App.tsx`.
      Verify: `npx tsc --build --force --noEmit` clean; `vitest --run` — existing
      App tests pass; `npm run build` succeeds.

## Phase D — Trigger and panel UI

- [ ] 13. Add the badge-bearing trigger to Navigation.
      Create `src/components/assistant/AssistantTrigger.tsx` (+ `.module.css`): a
      single button used in three contexts, styled like the Search/Shortcuts
      triggers. Render it in `Navigation.tsx` on the desktop expanded sidebar
      (labelled), desktop collapsed sidebar (icon-only `aria-label`/`title` via
      `navItemCollapsed`), and the mobile `mobileScrollRow` after Search/Shortcuts
      using BOTH `onClick` and `onTouchEnd={(e)=>{e.preventDefault(); open();}}`
      (preserving the touch-end fix; the trigger never calls `onPageChange`).
      Thread the badge count + `open` through `Navigation`'s props. Badge: when
      `>0` render a count with `aria-label={`Assistant, ${count} suggestions`}` on
      the button and the number in a `<span aria-hidden>`; when `0` show no count,
      trigger stays visible. Icon: `Sparkles` or `Lightbulb` from `lucide-react`.
      Do NOT change `badgeItems`/nav-item `badgeDot`.
      Files: `src/components/assistant/AssistantTrigger.tsx` + `.module.css`,
      `src/components/layout/Navigation.tsx`.
      Verify: `vitest --run` — new AssistantTrigger test asserts count rendering,
      accessible name incl. count, and a stubbed `touchEnd` calls `open` +
      `preventDefault`; existing Navigation tests pass.

- [ ] 14. Build the panel, suggestion item, and tooltips.
      Create `src/components/assistant/AssistantPanel.tsx` (+ `.module.css`): one
      component, two presentations via `useMediaQuery('(max-width: 767px)')`
      (`data-variant="drawer|sheet"`), `createPortal` to `document.body`, returns
      `null` when `!isOpen`; `role="dialog"` + `aria-modal="true"` +
      `aria-label="Character Assistant"`, focus trap, Escape + backdrop close,
      focus restore to trigger via the `previousFocusRef` + `requestAnimationFrame`
      pattern from `CommandPalette.tsx`; renders a heading per non-empty category.
      Create `src/components/assistant/SuggestionItem.tsx` (+ `.module.css`):
      title, rationale, primary action button, optional secondary action button
      (corruption "View Corruption"), citation display from `suggestion.citation`,
      dismiss + snooze buttons (all real `<button>`s). For any `suggestion.totals`,
      render through the shared `Tooltip` + `TooltipTriggerCell` with the total's
      `lines` as the breakdown (hover desktop / tap touch) — lines come from the
      engine, never recomputed in the UI.
      Files: `src/components/assistant/AssistantPanel.tsx` + `.module.css`,
      `src/components/assistant/SuggestionItem.tsx` + `.module.css`.
      Verify: `vitest --run src/components/assistant` — panel tests: closed renders
      nothing; open renders grouped items with title/rationale/action; a `navigate`
      click calls injected `navigate(page, subTab)`; a `roll` click opens the
      seeded `RollDialog` with the descriptor's difficulty; corruption shows BOTH
      primary roll and secondary navigate controls; NO action mutates a frozen
      character (spied handlers); Escape closes + focus returns; Tab is trapped;
      a total exposes a `TooltipTriggerCell` whose breakdown shows the lines.

## Phase E — Ambiguity confirmations and final gates

- [ ] 15. Confirm corruption trigger comparison (OQ-2).
      The design fires on the rulebook-literal strict `>` (`corr >
      getCorruptionThreshold`), differing from the app's `getCorruptionStatus`
      `>=` danger. Implement `>` as designed AND flag this 1-point edge to the user
      via `send_message` (do not silently pick the other interpretation). If the
      user chooses `>=`, switch the comparison and the rationale text to match.
      Files: `src/logic/assistant/rules/corruption.ts` (if changed) + its test.
      Verify: `vitest --run src/logic/assistant` — corruption test matches the
      chosen comparison and its rationale.

- [ ] 16. Confirm snooze duration and storage key (OQ-5).
      The design sets a fixed 24h snooze and key `assistant-dismissals`. Implement
      as designed AND flag to the user for confirmation (24h vs "until next
      session" vs chooser; key/shape). Adjust `dismissStore.ts` only if the user
      requests a change.
      Files: `src/components/assistant/dismissStore.ts` (if changed) + its test.
      Verify: `vitest --run src/components/assistant`.

- [ ] 17. Full-suite verification gate.
      Run the four gates end to end and fix anything they surface (fix-errors
      steering — including any pre-existing error the change reveals):
      `npx tsc --build --force --noEmit`, `npm run build`, `vitest --run`,
      `npx eslint .`. Confirm 0 eslint errors, no new warnings, no new
      suppressions beyond the single sanctioned set-state-in-effect pattern (only
      if genuinely needed), and that the pre-existing suite is unchanged and green.
      Files: none (verification only; targeted fixes if gates fail).
      Verify: all four commands clean.

---

## Assumptions / notes for the implementer

- `GearTab.tsx` and `PrintLayout.tsx` exact paths are to be confirmed by search
  during item 3 (they currently compute `eW+eA+eT+eCoin` inline). If either does
  not exist under the assumed path, converge only the real call sites.
- `src/logic/endeavours.ts` may not exist yet; create it for `hasActiveEndeavours`
  if there is no existing endeavour-helpers module.
- The `roll` action reuses the existing reminder `test` shape and the shared
  `RollDialog` (`defaultDifficulty` is already supported, verified in
  `RollDialog.tsx`). No new roll logic is introduced.
- Reminders double-surfacing (CombatReminders + panel) is intended (OQ-6); reminder
  suggestions count toward the badge while in combat.
