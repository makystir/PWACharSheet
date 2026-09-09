# Implementation Plan: UX Audit Improvements

## Overview

This plan implements the 16 UX-audit requirements across three tiers. It is sequenced logic-first (pure `combat-target` and `initiative` helpers), then Tier 1 combat wiring (remembered target, attack logging, advanced-qualities collapse, initiative rolling), then the onboarding and PWA-install shell additions, then Tier 2 (advancement checklist, critical hand-off, combat-mode surfacing, chip controls, house-rule indicators), and finally Tier 3 polish (empty states, history review, shortcut help, switcher/nav clarity).

**Hard dependency:** the `unified-event-log` spec MUST be implemented first. Tasks that log events use its `appendEvent`, and the history-review task renders its `TimelineView`. Those tasks are marked with `(dep: unified-event-log)`.

Schema note: the `Character._v` literal is bumped to 8 by the `unified-event-log` spec; this spec relies on that bump and only adds default values for its two new fields (`combatState.target?`, `houseRules.initiativeFormula`). Do NOT double-bump the version.

All new game logic cites the WFRP4e rulebook in comments (`rules-compliance`); every displayed calculated total gets a breakdown tooltip via the shared `Tooltip` component (`calculated-total-tooltips`); all new UI follows the `ui-layout` steering rule (readability, ≥44px touch targets, control budget). Property-based tests use `fast-check` (≥100 iterations) and are tagged `// Feature: ux-audit-improvements, Property N: ...`.

## Tasks

- [x] 1. Extend the data model for combat target and initiative formula
  - [x] 1.1 Add `combatState.target` and `houseRules.initiativeFormula`
    - Add optional `target?: { name: string; tb: number; ap: number }` to `CombatState` and `InitiativeFormula` type (`'initiativePlusD10' | 'initiativeAgilityTest'`) + `initiativeFormula: InitiativeFormula` to `HouseRules` in `src/types/character.ts`
    - Add `BLANK_CHARACTER` defaults: no `target` (undefined), `houseRules.initiativeFormula: 'initiativePlusD10'`; confirm `deepMerge` backfills `initiativeFormula` for older saves
    - _Requirements: 1.1, 4.4_

- [x] 2. Implement pure combat-target logic in `src/logic/combat-target.ts`
  - [x] 2.1 Implement target get/set/clear helpers
    - `getCombatTarget(c)` → `{name,tb,ap}` defaulting `{'',0,0}`; `setCombatTargetName/TB/AP(c, v)` immutable with TB/AP clamped to ≥0; `clearCombatTarget(c)` sets `combatState.target = undefined`
    - Ensure setters do not modify other `combatState` fields
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7_

  - [x] 2.2 Write property test for combat-target helpers
    - **Property 1: Combat-target helpers are immutable, clamped, and isolated**
    - **Validates: Requirements 1.2, 1.3, 1.6, 1.7**
    - Location `src/logic/__tests__/combat-target.property.test.ts`; generate random TB/AP (incl. negatives) and names; assert setters clamp to ≥0, do not mutate input, leave other `combatState` fields unchanged, and `getCombatTarget` defaults correctly; ≥100 iterations; tagged comment

- [x] 3. Implement initiative rolling in `src/logic/initiative.ts`
  - [x] 3.1 Add `rollInitiative` and `InitiativeRollResult`
    - Implement `rollInitiative(formula, character, dieFn?)` returning `{ value, die, formula, breakdown }`; `initiativePlusD10` = `getBonus(Initiative total) + d10`; `initiativeAgilityTest` = rulebook test-based orderable value; inject the die function for testability (default random d10)
    - Cite the rulebook (Core initiative/combat-order pages) in comments
    - _Requirements: 4.2, 4.4, 4.6_

  - [x] 3.2 Write property test for initiative rolling
    - **Property 2: Initiative roll equals formula of characteristic and die**
    - **Validates: Requirements 4.2, 4.4, 4.6**
    - Location `src/logic/__tests__/initiative.rollInitiative.property.test.ts`; generate Initiative values and injected die results; assert `initiativePlusD10` value equals `Ibonus + die` and reads Initiative from the character; assert formula switch changes the computation; ≥100 iterations; tagged comment

- [x] 4. Checkpoint - core combat/initiative logic
  - Run the new logic tests and type-check; ensure all pass; ask the user if questions arise.

- [x] 5. Wire the Combat_Target into `AttackFlow.tsx` (Tier 1, Req 1, 2)
  - [x] 5.1 Read/write opponent TB/AP from the Combat_Target
    - Replace AttackFlow's local `opponentTB`/`opponentAP` state with reads from `getCombatTarget(character)` and writes via `setCombatTargetTB/AP` (through `updateCharacter`); stop resetting TB/AP to 0 in `handleNewAttack`/`handleSecondAttack`
    - Wire `endCombat` in `CombatPage` to also call `clearCombatTarget`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 5.2 Add the net-wounds breakdown tooltip
    - Wrap the Step 4 net-wounds display with the shared `Tooltip` showing `weaponDamage + SL − targetTB − targetAP` per the calculated-total-tooltips steering rule
    - _Requirements: 2.1, 2.2_

  - [x] 5.3 Log the attack result to the event log (dep: unified-event-log)
    - On a produced attack result, `updateCharacter((c) => appendEvent(c, { category:'combat', type:'combat.attack', summary, payload }))` with summary incl. weapon, outcome, net wounds; confirm AttackFlow still does not apply wounds to the sheet owner
    - _Requirements: 2.3, 2.4_

  - [x] 5.4 Write render tests for AttackFlow target + logging
    - Opponent TB/AP persist across New Attack and Second Attack (no reset to 0); net-wounds tooltip renders the breakdown; a `combat.attack` event is appended on result (mock `appendEvent`); endCombat clears the target
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3_

- [x] 6. Reduce Take-Damage friction in `TakeDamagePanel.tsx` (Tier 1, Req 3)
  - [x] 6.1 Add the Advanced_Qualities_Section
    - Keep Damage, SL, Location always visible; move Impale, Penetrating, Frontal Missile, Defended with Shield, and To-Hit parity into a collapsible section (reuse the panel's existing collapse pattern); preserve conditional rendering (Bascinet/shield)
    - Ensure collapsed computation uses the current default toggle values so net wounds are unchanged when untouched
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 6.2 Log applied damage and retain the net-wounds tooltip (dep: unified-event-log)
    - On Apply Wounds, `appendEvent` a `combat` event summarising damage applied and resulting current wounds; formalise the inline net-wounds breakdown as a shared `Tooltip`
    - _Requirements: 3.5, 3.6_

  - [x] 6.3 Write render tests for the advanced-qualities collapse
    - Primary inputs visible; advanced toggles inside a section collapsed by default; collapsed net-wounds equals prior default behaviour; inapplicable toggles omitted; apply-wounds appends a `combat` event
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 7. Add initiative rolling UI (Tier 1, Req 4)
  - [x] 7.1 Add Roll Initiative controls to `InitiativeTracker.tsx`
    - Add a "Roll Initiative" button for the PC that fills the initiative input with `rollInitiative(character.houseRules.initiativeFormula, character).value` before commit; add an optional per-combatant roll when adding a combatant
    - On roll, `appendEvent` a `combat` event summarising die + formula + value (dep: unified-event-log)
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.7_

  - [x] 7.2 Add the initiative-formula setting to `SettingsPage.tsx`
    - Add a house-rule selector for `initiativeFormula` (matching the existing `rangedDamageSBMode` selector pattern), writing `houseRules.initiativeFormula`
    - _Requirements: 4.4_

  - [x] 7.3 Write tests for initiative UI
    - Roll Initiative fills the input with the formula result before commit (value not yet committed to the list); per-combatant roll works; a `combat` event is appended; the Settings selector updates `houseRules.initiativeFormula`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_

- [x] 8. Checkpoint - Tier 1 combat
  - Run combat/initiative tests and type-check; ensure all pass; ask the user if questions arise.

- [x] 9. New-character onboarding card (Tier 1, Req 5)
  - [x] 9.1 Implement `GettingStartedCard.tsx` and mount it in `CharacterPage.tsx`
    - New dismissible, non-modal card with concise orientation text and links to set characteristics/career, roll a test, and open Combat; UI-layout compliant
    - Show only for a brand-new character (`xpSpent === 0 && career === ''`); persist dismissal via `localStorage['wfrp-getting-started-dismissed-<characterId>']`; never show again once dismissed or when not brand-new
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 9.2 Write render tests for the onboarding card
    - Shown for a brand-new character; hidden for advanced/imported characters; dismissal persists per character; does not modally block the page
    - _Requirements: 5.1, 5.3, 5.4, 5.5_

- [x] 10. PWA install affordance (Tier 1, Req 6)
  - [x] 10.1 Implement `useInstallPrompt.ts`
    - Capture `beforeinstallprompt` (preventDefault + stash), expose `canInstall` (false when unsupported or already installed via `display-mode: standalone`/`navigator.standalone`) and `promptInstall()`
    - _Requirements: 6.1, 6.4, 6.5, 6.6_

  - [x] 10.2 Add `InstallPromptControl.tsx` to Settings + one-time hint
    - Render the install button on `SettingsPage` (hidden when `!canInstall`); add a one-time dismissible hint outside Settings shown when `canInstall` and not previously dismissed (`localStorage['wfrp-install-hint-dismissed']`); dismissal persists
    - _Requirements: 6.2, 6.3, 6.5, 6.6, 6.7_

  - [x] 10.3 Write tests for install affordance
    - `canInstall` gating (event captured → true; installed → false; unsupported → false); control hidden when not installable; hint shows once and dismissal persists; activating the control calls `promptInstall`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 11. Advancement completion checklist (Tier 2, Req 7)
  - [x] 11.1 Implement `AdvancementChecklist.tsx` and mount near the top of `AdvancementPage.tsx`
    - Reuse the existing completion computations (`charsMet`, `skillsMet`, `talentsMet`, `charsProgress`, `skillsWithAdvances`, `completionThreshold`, `isMaxLevel`); show met/outstanding per requirement, identifying which characteristics/how many skills remain; show a max-level state
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 11.2 Write render tests for the checklist
    - Reflects met/outstanding consistent with the existing completion logic across sample characters; shows the max-level state at max level; updates when advances change
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 12. Take-Damage → critical-wound hand-off (Tier 2, Req 8)
  - [x] 12.1 Add a critical hand-off control to `TakeDamagePanel.tsx`
    - When applying damage reduces the PC to ≤0 (existing down/critical state), show a "Roll Critical Wound" control that invokes an `onRollCritical` callback; wire `CombatPage` to open the existing `RollCriticalFlow`/`CriticalWoundsPanel` without navigating away; defer entirely to existing critical rules
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 12.2 Write tests for the hand-off
    - Control appears only at ≤0 wounds / critical state and invokes `onRollCritical`; no new critical logic is introduced
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 13. Combat mode surfacing (Tier 2, Req 9)
  - [x] 13.1 Improve desktop combat layout and preserve mode state
    - On desktop width, keep the status dashboard visible while Attack/Defend/Status remain reachable (two-column or persistent-dashboard-with-tabs); preserve the segmented control on smaller viewports; ensure switching modes does not unmount/reset the other modes' entered values (lift state or keep instances mounted)
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 13.2 Write tests for mode surfacing
    - Desktop: dashboard stays visible with modes reachable; mobile: segmented control preserved; switching modes preserves entered values (e.g. AttackFlow step / TakeDamage inputs); touch targets meet the UI-layout rule
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 14. Chip controls for combat values (Tier 2, Req 10)
  - [x] 14.1 Replace the Difficulty and Hit-Location selects with chip controls
    - Introduce a reusable chip-group (or reuse existing button styling) for AttackFlow Difficulty and TakeDamagePanel Location; indicate the selected value; preserve all options; radiogroup keyboard semantics; ≥44px touch targets
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 14.2 Write tests for chip controls (incl. mobile)
    - All prior options present and selectable; selected state indicated; keyboard operable; touch-target size on small viewports (`.mobile.test.tsx`)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 15. Active house-rule indicators (Tier 2, Req 11)
  - [x] 15.1 Implement `HouseRuleIndicator.tsx` and render on combat surfaces
    - Read-only indicator listing combat-affecting rules at non-default values (`rangedDamageSBMode !== 'none'`, `min1Wound === false`, `impaleCritsOnTens === true`, `advantageCap !== default`, `useCriticalDeflection === true`); shown only when ≥1 is non-default; links to Settings but does not toggle in place
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 15.2 Write tests for the indicator
    - Hidden when all defaults; shown listing the correct active rules when non-default; read-only
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 16. Checkpoint - Tier 2
  - Run the suite and type-check; ensure all pass; ask the user if questions arise.

- [x] 17. Actionable empty states (Tier 3, Req 12)
  - [x] 17.1 Make picker-backed empty states action-oriented
    - Update the AttackFlow empty state to direct to the add-weapon action; update other picker-backed section empty states to reference their specific add action, using the existing `EmptyState` component
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 17.2 Write tests for empty-state copy/actions
    - AttackFlow empty state references adding a weapon; at least one other picker-backed empty state references its add action
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 18. History review surface (Tier 3, Req 13) (dep: unified-event-log)
  - [x] 18.1 Surface `TimelineView` with roll+combat filters
    - Add a surface (combat- and/or character-relevant) rendering the `unified-event-log` `TimelineView` sourced from `character.eventLog`, defaulting/allowing filters to `roll` and `combat`; do not create a separate roll store
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 18.2 Write tests for the history surface
    - Renders events from `eventLog`; filter to `roll` and `combat` works; no separate store introduced
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 19. Keyboard-shortcut discoverability (Tier 3, Req 14)
  - [x] 19.1 Implement `ShortcutsHelp.tsx` and expose it via the command palette
    - Generate the shortcut list from the actual handlers (page numbers 1–7, undo Ctrl/Cmd+Z, search) as a single source of truth; make it reachable via the command palette and/or a visible help affordance
    - _Requirements: 14.1, 14.2, 14.3_

  - [x] 19.2 Write tests for the shortcut list
    - Lists the actually-handled shortcuts; reachable without prior knowledge of a hidden combination
    - _Requirements: 14.1, 14.2, 14.3_

- [x] 20. Character switcher consolidation (Tier 3, Req 15)
  - [x] 20.1 Distinguish quick-switch from full management
    - Visually/textually differentiate the sidebar quick-switch (switch active character) from the `CharacterManagementSheet` (create/rename/duplicate/delete), e.g. label the sheet "Manage Characters"; remove no existing capability
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 20.2 Write tests for switcher clarity
    - Quick-switch switches the active character; management affordance exposes create/rename/duplicate/delete; labels are distinct; no capability removed
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [x] 21. Navigation label clarity (Tier 3, Req 16)
  - [x] 21.1 Clarify the estate section label and sub-tab discoverability
    - Relabel the estate/holdings/wealth/enterprises section to convey its combined scope and indicate sub-tab presence; keep `PageSection` routing keys and hash routes unchanged
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 21.2 Write tests for nav labels
    - Section label conveys combined scope; sub-tab presence discoverable; routing keys/hash routes unchanged
    - _Requirements: 16.1, 16.2, 16.3_

- [x] 22. Final checkpoint - Ensure all tests pass
  - Run the full test suite, `tsc --noEmit`, and `npm run build`; ensure all pass; ask the user if questions arise.

## Notes

- **Dependency:** `unified-event-log` must be implemented first. Tasks 5.3, 6.2, 7.1, and 18 use its `appendEvent`/`TimelineView` and are marked `(dep: unified-event-log)`.
- The `Character._v` bump to 8 is owned by `unified-event-log`; this spec only adds `BLANK_CHARACTER` defaults for `combatState.target?` and `houseRules.initiativeFormula` (backward-compat via `deepMerge`). Do not double-bump.
- Player-sheet scope: `Combat_Target` is ad-hoc and cleared on endCombat; the app never tracks an opponent's wounds. Applying damage targets the player's own character only.
- Initiative math and net-wounds math cite the WFRP4e rulebook in comments (`rules-compliance`); the initiative formula is a configurable house rule (default `Initiative + 1d10`).
- Every displayed calculated total (attack net wounds, take-damage net wounds, initiative result breakdown) uses the shared `Tooltip` per the calculated-total-tooltips steering rule.
- All new UI follows the `ui-layout` steering rule; chip controls, advanced-qualities collapse, and the install hint get mobile-viewport test coverage per existing `.mobile.test.tsx` conventions.
- Property-based tests use `fast-check` (≥100 iterations), tagged `// Feature: ux-audit-improvements, Property N: ...`.
- Reuse existing components where noted: `Tooltip`, `EmptyState`, `ConfirmDialog`, `Card`, `CollapsibleSection`, the existing critical-wound flow, and the command palette — no parallel implementations.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2"] },
    { "id": 3, "tasks": ["5.1", "6.1", "7.1", "9.1", "10.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.2", "7.2", "10.2", "11.1", "15.1"] },
    { "id": 5, "tasks": ["5.4", "6.3", "7.3", "9.2", "10.3", "11.2", "12.1", "15.2"] },
    { "id": 6, "tasks": ["12.2", "13.1", "14.1", "16", "17.1", "19.1", "20.1", "21.1"] },
    { "id": 7, "tasks": ["13.2", "14.2", "17.2", "18.1", "19.2", "20.2", "21.2"] },
    { "id": 8, "tasks": ["18.2"] }
  ]
}
```
