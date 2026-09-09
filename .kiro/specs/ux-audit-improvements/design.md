# Design Document

## Overview

This design implements the 16 UX-audit requirements across three tiers. The app is mature, so the work is mostly **targeted additions and reorganisations of existing components** plus a few small pure-logic modules — not rewrites. Two cross-cutting decisions from requirements shape everything:

1. **Player's sheet, not a GM tracker.** The `Combat_Target` is an ad-hoc, in-combat-only descriptor (name/TB/AP) stored in `combatState`; it is cleared when combat ends. Attacks compute and log net wounds against it but never track an opponent's wounds. Damage is applied only to the player's own character.
2. **Logging depends on `unified-event-log`.** All new history (attack results, damage applied, initiative rolls) is written via that spec's `appendEvent`, and the history-review surface (Req 13) renders that spec's `TimelineView`. This spec must be implemented **after** `unified-event-log`.

All new/changed UI follows the `ui-layout` steering rule (readability, ≥44px touch targets, control budget); every displayed calculated total gets a breakdown tooltip per `calculated-total-tooltips`; every mechanic (initiative formula, net-wounds) cites the WFRP4e rulebook per `rules-compliance`.

### Design themes by tier

- **Tier 1** — reduce repeated combat friction (remembered target TB/AP, advanced-qualities collapse), add missing rolls (initiative), connect dead-ends (attack→log, damage→critical), and improve activation (onboarding card, install affordance).
- **Tier 2** — surface what's hidden (advancement checklist, active house rules, combat modes) and remove context switches (damage→critical hand-off), plus faster chip inputs.
- **Tier 3** — polish (actionable empty states, history review via the event log, shortcut discoverability, switcher clarity, nav labels).

## Architecture

New/changed surfaces grouped by area:

```
COMBAT
  logic/combat-target.ts (new, pure)      ── Combat_Target read/write on combatState
  logic/initiative.ts (extend)            ── rollInitiative(formula, char) pure
  logic/net-wounds.ts or reuse existing   ── net-wounds calc already in AttackFlow/TakeDamage
  components/combat/AttackFlow.tsx         ── reads/writes Combat_Target; net-wounds tooltip; logs event
  components/combat/TakeDamagePanel.tsx    ── Advanced_Qualities_Section; critical hand-off; logs event
  components/combat/InitiativeTracker.tsx  ── Roll Initiative control (PC + combatant)
  components/pages/CombatPage.tsx          ── mode surfacing; House_Rule_Indicator; chip controls
  components/combat/HouseRuleIndicator.tsx (new)

ADVANCEMENT
  components/pages/AdvancementPage.tsx     ── Advancement_Checklist (reuses existing completion logic)
  components/pages/AdvancementChecklist.tsx (new)

ONBOARDING / APP SHELL
  components/shared/GettingStartedCard.tsx (new)
  components/pages/CharacterPage.tsx        ── mounts GettingStartedCard for brand-new chars
  hooks/useInstallPrompt.ts (new)           ── beforeinstallprompt capture
  components/shared/InstallPromptControl.tsx (new)  ── Settings button + one-time hint
  components/pages/SettingsPage.tsx         ── install control + initiativeFormula house rule

DISCOVERABILITY / NAV
  components/command-palette/*              ── shortcuts entry (Req 14)
  components/shared/ShortcutsHelp.tsx (new) ── shortcut list
  components/layout/Navigation.tsx          ── label clarity (Req 16), switcher distinction (Req 15)

HISTORY (depends on unified-event-log)
  components/shared/TimelineView.tsx (from unified-event-log)  ── surfaced here with roll+combat filters
```

State ownership:
- **Combat_Target** lives in `combatState` (extended) so it persists while `inCombat` and is cleared by the existing `endCombat` path.
- **Initiative formula** lives in `houseRules` (configurable, Req 4.4).
- **Install availability** is transient UI state in `useInstallPrompt` (not persisted); the one-time hint dismissal is a `localStorage` flag.
- **Getting-Started dismissal** is per-character (a flag on the character or a `localStorage` key keyed by character id — decided below).

---
## Components and Interfaces

### TIER 1

#### 1. Combat_Target (`src/logic/combat-target.ts` + `combatState` extension)

Extend `CombatState`:

```ts
export interface CombatState {
  inCombat: boolean;
  initiative: number;
  currentRound: number;
  engaged: boolean;
  surprised: boolean;
  target?: { name: string; tb: number; ap: number }; // new — ad-hoc, cleared on endCombat
}
```

Pure helpers:

```ts
export function getCombatTarget(c: Character): { name: string; tb: number; ap: number };  // defaults {name:'', tb:0, ap:0}
export function setCombatTargetTB(c: Character, tb: number): Character;
export function setCombatTargetAP(c: Character, ap: number): Character;
export function setCombatTargetName(c: Character, name: string): Character;
export function clearCombatTarget(c: Character): Character; // sets combatState.target = undefined
```

- `AttackFlow` reads opponent TB/AP from `getCombatTarget` instead of local `useState(0)`, and writes edits back via `setCombatTargetTB/AP` (Req 1.2, 1.3). Its `handleNewAttack`/`handleSecondAttack` no longer reset TB/AP to 0 (Req 1.4).
- The existing `endCombat` in `CombatPage` (which already zeroes `inCombat`/round/advantage) additionally calls `clearCombatTarget` (Req 1.5).
- Defaults to 0 when unset (Req 1.6); never persisted as a roster (Req 1.7 — it lives only in `combatState.target`, which is transient combat state).

#### 2. Attack result net-wounds clarity + log (`AttackFlow.tsx`)

- Net wounds already computed in `AttackFlow` Step 4; add a **breakdown tooltip** on the net-wounds display using the shared `Tooltip` component (matching the calculated-total pattern used elsewhere), showing `weaponDamage + SL − targetTB − targetAP` (Req 2.1, 2.2).
- On producing a successful attack result, call `updateCharacter((c) => appendEvent(c, { category:'combat', type:'combat.attack', summary, payload }))` where summary includes weapon, outcome (hit/crit/miss/fumble), and net wounds (Req 2.3). Uses the `unified-event-log` `appendEvent`.
- AttackFlow still does **not** apply wounds to the sheet owner (Req 2.4) — unchanged.

#### 3. Take-Damage advanced-qualities collapse (`TakeDamagePanel.tsx`)

- Keep **Damage, SL, Location** in the always-visible region (Req 3.1).
- Move **Impale, Penetrating, Frontal Missile, Defended with Shield, To-Hit parity** into a collapsible `Advanced_Qualities_Section` (reuse the existing collapse pattern already in the panel header) (Req 3.2).
- When collapsed, computation uses the **current default values** of those toggles (parity Odd, Impale off, Penetrating off, etc.) so net wounds stay correct (Req 3.3). No behaviour change when untouched — the toggles keep their existing default state; collapsing only hides them.
- Conditional toggles (Frontal Missile w/ Bascinet, Defended-with-Shield w/ equipped shield) remain conditionally rendered inside the section (Req 3.4) — existing conditional logic preserved.
- On Apply Wounds, append a `combat` event summarising damage applied and resulting current wounds (Req 3.5).
- Net-wounds breakdown tooltip retained (Req 3.6) — already present as the inline breakdown; formalise as a `Tooltip`.

#### 4. Initiative rolling (`logic/initiative.ts` + `InitiativeTracker.tsx` + `houseRules`)

Add house rule:

```ts
export type InitiativeFormula = 'initiativePlusD10' | 'initiativeAgilityTest';
// HouseRules gains: initiativeFormula: InitiativeFormula;  // default 'initiativePlusD10'
```

Pure roll function (cites Core p.158 Initiative / p.165 combat order):

```ts
export interface InitiativeRollResult {
  value: number;
  die: number;          // the d10 (or test roll) result
  formula: InitiativeFormula;
  breakdown: string;    // e.g. "Initiative 42 → Ibonus 4 + d10(7) = 11" (formula-dependent)
}
export function rollInitiative(formula: InitiativeFormula, character: Character): InitiativeRollResult;
```

- `initiativePlusD10`: `Initiative bonus + 1d10` (common table convention). Uses `getBonus(Initiative total)` + `random d10`.
- `initiativeAgilityTest`: an Initiative/Agility-test-based value (SL-ordered) — precise mapping cited to the rulebook in the implementation; produces a comparable integer for ordering.
- `InitiativeTracker` gains a **"Roll Initiative" button** for the PC that fills the initiative input with `rollInitiative(...).value` (Req 4.1, 4.2), and an optional per-combatant roll when adding (Req 4.3). The rolled value is shown in the input **before commit** so the user can accept/change it (Req 4.7).
- The formula reads `character.houseRules.initiativeFormula` (Req 4.4) and required characteristics from the PC (Req 4.6). SettingsPage adds a selector for the formula (matching the existing house-rule selector pattern used for `rangedDamageSBMode`).
- On roll, append a `combat` event summarising the roll (die + formula + value) (Req 4.5).

#### 5. Getting-Started card (`GettingStartedCard.tsx` + `CharacterPage.tsx`)

- New dismissible card component using the app's `Card`/`EmptyState`-style presentation, non-modal (Req 5.4), UI-layout compliant (Req 5.6).
- **"Brand-new" definition (design decision):** a character with no XP spent and no career selected — concretely `xpSpent === 0 && career === ''` (a quick-start character). This avoids showing it to imported/advanced characters.
- Dismissal: a `localStorage` key `wfrp-getting-started-dismissed-<characterId>` (mirrors the existing per-key hint-dismissal pattern used by `HelpPopover`). Once dismissed, never shown again for that character (Req 5.3). Not shown for non-brand-new characters (Req 5.5).
- Content: concise text + links/buttons to (a) set characteristics/career (Advancement/Character), (b) roll a test (opens a roll), (c) run combat (Combat page) (Req 5.2).

#### 6. PWA install affordance (`useInstallPrompt.ts` + `InstallPromptControl.tsx` + `SettingsPage.tsx`)

```ts
// useInstallPrompt.ts
export function useInstallPrompt(): {
  canInstall: boolean;          // beforeinstallprompt captured AND not already installed
  promptInstall: () => Promise<void>;
};
```

- Listen for `beforeinstallprompt`, `preventDefault()`, stash the event; expose `canInstall` (Req 5.1→install: 6.1). Detect installed mode via `matchMedia('(display-mode: standalone)')` / `navigator.standalone`; when installed, `canInstall=false` (Req 6.6).
- `InstallPromptControl` renders on SettingsPage (Req 6.2) and calls `promptInstall` (Req 6.4). Hidden when `!canInstall` (Req 6.5, 6.6).
- One-time dismissible hint (outside Settings, e.g. a subtle banner near the app shell) shown when `canInstall` and not previously dismissed (`localStorage['wfrp-install-hint-dismissed']`); dismiss persists (Req 6.3, 6.7).

### TIER 2

#### 7. Advancement checklist (`AdvancementChecklist.tsx` + `AdvancementPage.tsx`)

- Reuses the **existing** completion computations already in `AdvancementPage` (`charsMet`, `skillsMet`, `talentsMet`, `charsProgress`, `skillsWithAdvances`, `completionThreshold`, `isMaxLevel`).
- Renders a compact checklist near the top: characteristic requirement (with which chars are below threshold), skill requirement (how many of the needed qualifying skills are met), talent requirement (met/outstanding) (Req 7.1–7.3).
- At max level, shows a "career at maximum level" state (Req 7.4). Recomputes on advance (derived from character props) (Req 7.5).

#### 8. Take-Damage → critical hand-off (`TakeDamagePanel.tsx` + existing critical flow)

- When applying damage reduces the PC to ≤0 wounds, surface a "Roll Critical Wound" control in the existing down/critical state (Req 8.1, 8.3). It invokes the existing `RollCriticalFlow`/`CriticalWoundsPanel` entry (via a callback prop `onRollCritical` that `CombatPage` wires to open that flow) without navigating away first (Req 8.2). The hand-off defers entirely to the existing critical-wound rules/tables (Req 8.4) — no new critical logic.

#### 9. Combat mode surfacing (`CombatPage.tsx`)

- On desktop width, keep the always-visible status dashboard AND make Attack/Defend/Status reachable without hiding it (e.g. show panels in a two-column arrangement or keep the segmented control while the dashboard stays visible) (Req 9.1). The existing segmented control is preserved on smaller viewports (Req 9.2).
- Mode switching must not reset entered values in other modes: the mode panels already persist collapse state per character; ensure component instances/state (e.g. `TakeDamagePanel` inputs, `AttackFlow` step) are not unmounted on mode switch, or their state is lifted so switching preserves it (Req 9.3). UI-layout compliant (Req 9.4).

#### 10. Chip controls (`AttackFlow.tsx` Difficulty, `TakeDamagePanel.tsx` Location)

- New reusable `Chip_Control` group (or reuse existing button styling) replacing the two native `<select>`s (Req 10.1, 10.2), indicating the selected value (Req 10.3), ≥44px touch targets (Req 10.4), preserving all options (Req 10.5). Keyboard operability preserved (radiogroup semantics); if a select proves materially more accessible for one, that one may remain a select (flagged in requirements).

#### 11. Active house-rule indicators (`HouseRuleIndicator.tsx` + combat surfaces)

- Read-only indicator listing combat-affecting house rules currently at non-default values: `rangedDamageSBMode !== 'none'`, `min1Wound === false`, `impaleCritsOnTens === true`, `advantageCap !== default`, `useCriticalDeflection === true` (Req 11.3).
- Rendered on the relevant combat surface only when ≥1 is non-default (Req 11.1, 11.4); read-only (Req 11.2) — links to Settings but does not toggle in place.

### TIER 3

#### 12. Actionable empty states (`AttackFlow.tsx` + other picker-backed sections)

- AttackFlow empty state directs to the add-weapon action (Req 12.1). Other picker-backed empty states reference the specific add action (Req 12.2), using the existing `EmptyState` component (Req 12.3).

#### 13. History review (surfaces `TimelineView` from `unified-event-log`)

- Add a surface (combat-relevant and/or character-relevant) that renders the `unified-event-log` `TimelineView`, defaulting/allowing filters to `roll` and `combat` categories (Req 13.1, 13.3). Sourced from `character.eventLog` (Req 13.2), no separate store (Req 13.4). Blocked if `unified-event-log` is absent (Req 13.5) — declared dependency.

#### 14. Shortcut discoverability (`ShortcutsHelp.tsx` + command palette)

- A discoverable shortcut list (page numbers 1–7, undo Ctrl/Cmd+Z, search) reachable via the command palette and/or a visible help affordance (Req 14.1, 14.2). The list is generated from the actual shortcut handlers (single source of truth) so it stays accurate (Req 14.3).

#### 15. Character switcher consolidation (`Navigation.tsx` + `CharacterManagementSheet`)

- Visually/textually distinguish **quick-switch** (the sidebar dropdown — switches active character, Req 15.2) from **full management** (the `CharacterManagementSheet` — create/rename/duplicate/delete, Req 15.3), e.g. label the sheet "Manage Characters" and the dropdown "Switch". No capability removed (Req 15.4).

#### 16. Navigation label clarity (`Navigation.tsx`)

- Relabel/clarify the estate section so its combined scope (estate, holdings, wealth, enterprises) is conveyed (Req 16.1); surface sub-tab presence (e.g. a caret or sub-label) (Req 16.2). Underlying `PageSection` routing keys and hash routes are unchanged (Req 16.3) — only display labels change.

---
## Data Models

| Field | Location | Type | Persistence | Notes |
|---|---|---|---|---|
| `combatState.target` | `combatState` | `{name,tb,ap}?` | per-character (transient combat) | cleared by `endCombat` |
| `houseRules.initiativeFormula` | `houseRules` | `InitiativeFormula` | per-character | default `'initiativePlusD10'` |
| install availability | `useInstallPrompt` | transient | none | derived from `beforeinstallprompt` + display-mode |
| getting-started dismissal | `localStorage` | flag | per-character key | `wfrp-getting-started-dismissed-<id>` |
| install-hint dismissal | `localStorage` | flag | global | `wfrp-install-hint-dismissed` |
| combat/roll/init events | `character.eventLog` | `LogEvent[]` | via unified-event-log | this spec writes; does not define the log |

Schema/version: adding `combatState.target?` and `houseRules.initiativeFormula` are backward-compatible via `deepMerge`/`BLANK_CHARACTER` defaults. The `_v` literal is already being bumped to 8 by `unified-event-log`; this spec relies on that bump (do not double-bump) and adds default values for the two new fields to `BLANK_CHARACTER`.

## Integration Points

- `src/types/character.ts` — `CombatState.target?`, `HouseRules.initiativeFormula`, `InitiativeFormula` type; `BLANK_CHARACTER` defaults.
- `src/logic/combat-target.ts` (new) — target helpers.
- `src/logic/initiative.ts` — add `rollInitiative` + `InitiativeRollResult`.
- `src/components/combat/AttackFlow.tsx` — target read/write, net-wounds tooltip, combat-attack event.
- `src/components/combat/TakeDamagePanel.tsx` — advanced-qualities collapse, apply-wounds event, critical hand-off callback, chip location control.
- `src/components/combat/InitiativeTracker.tsx` — roll controls + combat-init event.
- `src/components/combat/HouseRuleIndicator.tsx` (new) + `CombatPage.tsx` — indicator, mode surfacing, critical hand-off wiring, target clear on endCombat.
- `src/components/pages/AdvancementPage.tsx` + `AdvancementChecklist.tsx` (new) — checklist.
- `src/components/shared/GettingStartedCard.tsx` (new) + `CharacterPage.tsx` — onboarding.
- `src/hooks/useInstallPrompt.ts` (new), `src/components/shared/InstallPromptControl.tsx` (new), `SettingsPage.tsx` — install + initiative formula setting.
- `src/components/shared/ShortcutsHelp.tsx` (new) + command palette — shortcuts.
- `src/components/layout/Navigation.tsx` — labels + switcher clarity.
- `src/components/shared/TimelineView.tsx` (from unified-event-log) — surfaced for Req 13.

## Error Handling

- **Combat_Target** edits flow through `updateCharacter`→save; numeric TB/AP inputs clamp to ≥0 (matching existing input handling in AttackFlow/TakeDamage).
- **rollInitiative** is pure and deterministic given its die input; the RNG is injected/mocked in tests (as with `performRoll`). No throw path.
- **useInstallPrompt** guards for environments without `beforeinstallprompt` (many browsers) — `canInstall` simply stays false; no error surface.
- **Event logging** rides `appendEvent`'s existing quota/rotation handling (from unified-event-log); a failed save surfaces via the existing storage-error toast.
- **Critical hand-off** defers to the existing flow; if no critical is applicable, the control is not shown.

## Testing Strategy

Pure-logic property/unit tests (fast-check ≥100 iterations where a property applies):
- `combat-target.ts`: get defaults to `{'',0,0}`; setters are immutable and clamp; `clearCombatTarget` removes target; setters don't touch other combat fields.
- `initiative.rollInitiative`: `initiativePlusD10` = Ibonus + injected die; value/breakdown consistent; formula switch honoured; property over random Initiative + die.
- House-rule default: a character without `initiativeFormula` resolves to `'initiativePlusD10'` (backward compat).

Component/render tests:
- AttackFlow: opponent TB/AP persist across New Attack/Second Attack; net-wounds tooltip shows the breakdown; a `combat` event is appended on result (mock `appendEvent`).
- TakeDamagePanel: primary inputs visible, advanced toggles inside a collapsed section by default; collapsed computation equals prior default behaviour; apply-wounds appends a `combat` event; critical hand-off control appears at ≤0 and invokes `onRollCritical`.
- InitiativeTracker: Roll Initiative fills the input with the formula result before commit; per-combatant roll; event appended.
- Chip controls: all prior options present, selected state shown, radiogroup keyboard nav, touch-target size.
- AdvancementChecklist: reflects met/outstanding per existing completion logic; max-level state.
- GettingStartedCard: shown only for brand-new characters; dismissal persists per character; hidden otherwise; non-modal.
- InstallPromptControl/useInstallPrompt: `canInstall` gating; hidden when installed; hint dismissal persists.
- HouseRuleIndicator: shown only when ≥1 combat rule non-default; read-only; lists the right rules.
- Navigation: relabeled section; routing keys/hash unchanged; quick-switch vs manage distinction.
- History review: renders `TimelineView` sourced from `eventLog` with roll/combat filters.
- Shortcuts help: lists the actually-handled shortcuts.

Integration:
- endCombat clears `combatState.target`.
- Mode switching in CombatPage preserves entered values across Attack/Defend/Status.

Mobile:
- Add/extend `.mobile.test.tsx` coverage for chip controls, advanced-qualities collapse, and the install hint on small viewports, per existing mobile-test conventions.

## Design Decisions & Rationale

- **Combat_Target in `combatState`, not a new persisted store.** It is transient combat convenience data; `combatState` is already cleared on endCombat, giving the "cleared when combat ends" behaviour for free and honouring the "not a saved roster" requirement.
- **Initiative formula as a house rule (configurable).** Per the user's Q6 decision and the `rules-compliance` steering rule, initiative math must be justified against the rulebook and groups differ; a house-rule selector defaulting to `Initiative + 1d10` covers the common case while allowing the RAW test-based variant.
- **Advanced-qualities collapse instead of deriving toggles from a weapon.** Deriving per-hit qualities from an attacking weapon would require a shared attacker source of truth (pushing toward a GM tracker). Collapsing with safe defaults achieves the friction win within the player-sheet scope and preserves existing behaviour when untouched.
- **Reuse existing completion logic for the checklist.** The Advancement page already computes met/outstanding; the checklist is a presentation layer over it, avoiding divergence between the checklist and the actual progress gates.
- **Critical hand-off via callback, not embedded logic.** Keeps critical-wound rules in the single existing flow (rules-compliance) and avoids duplicating tables.
- **Install via `beforeinstallprompt`.** Standard PWA pattern; gracefully absent where the browser doesn't support it.
- **Getting-started dismissal keyed per character in localStorage.** Matches the existing `HelpPopover` dismissal pattern and avoids growing the character schema for a purely-UI concern.

## Dependencies & Sequencing

- **Hard dependency on `unified-event-log`** for Req 2.3, 3.5, 4.5 (combat/init events) and Req 13 (history review). Implement `unified-event-log` first; this spec's `appendEvent`/`TimelineView` usages assume it exists.
- Within this spec, Tier 1 combat items (Combat_Target, AttackFlow, TakeDamagePanel) are foundational for Tier 2 combat surfacing (Req 9) and the critical hand-off (Req 8); build them before those.

## Open Questions Deferred to Tasks/Implementation

- Exact desktop layout for combat mode surfacing (Req 9) — two-column vs. persistent-dashboard-with-tabs; decided during implementation against the `ui-layout` control budget.
- Whether the history-review surface (Req 13) is primarily on CombatPage, CharacterPage, or both — coordinate with the `unified-event-log` `TimelineView` mount point.
- Precise `initiativeAgilityTest` mapping to an orderable integer — to be pinned to a specific rulebook citation in implementation.
- Whether the getting-started "brand-new" test should also treat wizard-created (non-quick-start) characters as new — currently scoped to `xpSpent === 0 && career === ''`.
