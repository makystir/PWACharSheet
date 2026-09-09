# Requirements Document

## Introduction

This feature implements the outcomes of a UX/UI audit of the WFRP4e character-sheet PWA. The app is already mature (undo/redo, searchable pickers, first-run help popovers, animated feedback, calculated-total tooltips, multi-character management, PWA/offline), so these requirements target **workflow gaps and repeated friction** rather than foundational fixes.

The audit produced 15 recommendations grouped into three priority tiers. This spec covers all 15, organised as:

- **Tier 1 (highest impact):** shared combat target + damage hand-off, initiative rolling, reduced Take-Damage friction, new-character onboarding, PWA install affordance.
- **Tier 2 (medium):** advancement "what's left" checklist, Take-Damage → critical hand-off, combat mode surfacing, chip controls for mid-combat values, active house-rule indicators.
- **Tier 3 (low):** actionable empty states, roll/combat history review, keyboard-shortcut discoverability, character-switcher consolidation, navigation label clarity.

Two decisions shape the whole spec:

- The app is a **player's character sheet**, not a GM combat tracker. Damage application therefore targets **the player's own character**; the "target" concept is an **ad-hoc, single, in-memory-per-combat** convenience for remembering an opponent's Toughness Bonus / Armour Points, not a persisted NPC roster.
- The **roll/combat history review** requirement (Tier 3) and any combat logging **depend on the `unified-event-log` spec**, which must be implemented first. This spec writes to and reads from the unified Event_Log rather than creating a new bespoke store.

All new or changed behaviour must comply with the workspace steering rules: game mechanics must follow the WFRP4e rulebooks (`rules-compliance`), any displayed calculated total must have a breakdown tooltip (`calculated-total-tooltips`), and any UI in `.tsx`/`.css` must follow the UI-layout rules (readability, touch targets, control budget).

## Glossary

- **Combat_Target**: A single, ad-hoc opponent descriptor used during an active combat, holding an optional name, a Toughness Bonus (TB), and Armour Points (AP). It is not a persisted roster and is cleared when combat ends.
- **Attack_Flow**: The existing multi-step attack wizard (`AttackFlow.tsx`): Weapon → Roll to Hit → Hit Location → Damage.
- **Take_Damage_Panel**: The existing defensive panel (`TakeDamagePanel.tsx`) that applies wounds to the player's own character.
- **Initiative_Tracker**: The existing combatant order tracker (`InitiativeTracker.tsx`).
- **Initiative_Formula**: The configurable rule used by the "Roll Initiative" control to produce an initiative value.
- **Advancement_Checklist**: A summary near the top of the Advancement page showing which career-completion requirements (characteristics, skills, talents) are still outstanding at the current career level.
- **House_Rule_Indicator**: A compact, read-only indicator on a combat surface showing which non-default house rules are currently active and affecting combat math.
- **Install_Prompt_Control**: A custom in-app affordance that surfaces the browser's PWA install prompt when available.
- **Getting_Started_Card**: A dismissible orientation card shown on the Character page for brand-new characters.
- **Timeline_View**: The unified Event_Log timeline UI provided by the `unified-event-log` feature; this spec surfaces and links to it, and writes combat/initiative events into the Event_Log.
- **Event_Log**: The per-character unified event stream defined by the `unified-event-log` spec.
- **Advanced_Qualities_Section**: A collapsible region of the Take_Damage_Panel containing the less-common per-hit toggles (Impale, Penetrating, Frontal Missile, Defended with Shield, To-Hit parity).
- **Chip_Control**: A tappable button-style control (matching the app's existing +/−/Full button style) used in place of a native `<select>` for frequently changed combat values.
- **Combat_Value**: A frequently changed mid-combat value, specifically Difficulty (in Attack_Flow) and Hit Location (in Take_Damage_Panel).

## Requirements

---
## TIER 1 — Highest Impact
---

### Requirement 1: Ad-hoc combat target with remembered TB/AP

**User Story:** As a player, I want the opponent's Toughness Bonus and Armour Points to be remembered during a fight, so that I do not re-type them on every attack.

#### Acceptance Criteria

1. WHILE a combat is active, THE application SHALL maintain a single Combat_Target holding an optional name, a Toughness Bonus, and Armour Points.
2. THE Attack_Flow SHALL read the opponent Toughness Bonus and Armour Points from the Combat_Target instead of resetting them to 0 on each new attack.
3. WHEN the user edits the opponent Toughness Bonus or Armour Points in the Attack_Flow, THE application SHALL update the Combat_Target with the entered values.
4. WHEN the user begins a new attack or a second attack within the same combat, THE Attack_Flow SHALL retain the Combat_Target's Toughness Bonus and Armour Points rather than resetting them to 0.
5. WHEN combat ends, THE application SHALL clear the Combat_Target.
6. WHERE no Combat_Target values have been entered, THE Attack_Flow SHALL default the opponent Toughness Bonus and Armour Points to 0.
7. THE Combat_Target SHALL be scoped to the active combat and SHALL NOT be persisted as a saved opponent roster.

### Requirement 2: Attack result net-wounds clarity and hand-off

**User Story:** As a player, I want the attack result to clearly present net wounds and let me record it, so that the attack and its outcome are connected rather than a dead-end calculation.

#### Acceptance Criteria

1. THE Attack_Flow SHALL display the computed net wounds for a successful attack against the Combat_Target.
2. THE Attack_Flow net-wounds display SHALL have a breakdown tooltip showing the calculation (weapon damage, success levels, minus target Toughness Bonus and Armour Points), per the calculated-total-tooltips steering rule.
3. WHEN an attack result is produced, THE application SHALL record it as a `combat` event in the Event_Log with a summary including the weapon, outcome, and net wounds.
4. THE Attack_Flow SHALL NOT apply wounds to the player's own character (attacks are made against opponents, not the sheet's owner).

### Requirement 3: Reduced Take-Damage friction via advanced-qualities section

**User Story:** As a player taking damage, I want the common inputs front and centre and the rare toggles tucked away, so that applying a typical hit is fast.

#### Acceptance Criteria

1. THE Take_Damage_Panel SHALL present the primary inputs — incoming Damage, Success Levels, and Hit Location — in the always-visible region of the panel.
2. THE Take_Damage_Panel SHALL group the less-common per-hit toggles (Impale, Penetrating, Frontal Missile, Defended with Shield, To-Hit parity) into a collapsible Advanced_Qualities_Section.
3. WHERE the Advanced_Qualities_Section is collapsed, THE Take_Damage_Panel SHALL still compute net wounds using safe default values for the hidden toggles that match the current default behaviour of those toggles.
4. WHERE a conditional toggle is not applicable to the current character (for example, Frontal Missile without a Bascinet, or Defended with Shield without an equipped shield), THE Advanced_Qualities_Section SHALL omit that toggle.
5. WHEN the user applies wounds, THE application SHALL record a `combat` event in the Event_Log summarising the damage applied and the resulting current wounds.
6. THE Take_Damage_Panel net-wounds display SHALL retain a breakdown tooltip showing the calculation, per the calculated-total-tooltips steering rule.

### Requirement 4: Initiative rolling

**User Story:** As a player, I want to roll initiative rather than type a number, so that starting combat is faster and correct.

#### Acceptance Criteria

1. THE Initiative_Tracker SHALL provide a "Roll Initiative" control for the player's own character.
2. WHEN the user activates "Roll Initiative" for the player's character, THE application SHALL compute an initiative value using the configured Initiative_Formula and populate the initiative input with the result.
3. THE Initiative_Tracker SHALL allow rolling an initiative value for an added combatant when the user chooses to, using the same configured Initiative_Formula.
4. THE Initiative_Formula SHALL be configurable via a house rule with at least the options `Initiative + 1d10` and an Initiative/Agility test-based value, defaulting to the app's stated default option.
5. WHEN an initiative value is rolled, THE application SHALL record a `combat` event in the Event_Log summarising the roll, including the die result and the formula used.
6. WHERE the configured Initiative_Formula requires a characteristic value, THE application SHALL read that characteristic from the player's character.
7. THE rolled initiative value SHALL be presented before it is committed to the tracker, so the user can accept or change it.

### Requirement 5: New-character orientation card

**User Story:** As a new player, I want a short, dismissible orientation on my first character, so that I understand how to start using the app's core features without a heavy tour.

#### Acceptance Criteria

1. WHERE the active character is brand-new, THE Character page SHALL display a dismissible Getting_Started_Card.
2. THE Getting_Started_Card SHALL orient the user to the core first actions (for example, setting characteristics/career, rolling a test, and running combat) using concise text and links to the relevant surfaces.
3. WHEN the user dismisses the Getting_Started_Card, THE application SHALL NOT show it again for that character.
4. THE Getting_Started_Card SHALL NOT block or modally interrupt the rest of the Character page.
5. WHERE the active character is not brand-new, THE Character page SHALL NOT display the Getting_Started_Card.
6. THE Getting_Started_Card SHALL comply with the UI-layout steering rule (readability, touch targets, and control budget).

### Requirement 6: PWA install affordance

**User Story:** As a user, I want an in-app way to install the app, so that I can use it offline at the table without hunting for a browser menu.

#### Acceptance Criteria

1. WHEN the browser dispatches its install-availability event, THE application SHALL capture it and enable the Install_Prompt_Control.
2. THE Install_Prompt_Control SHALL be presented on the Settings page.
3. THE application SHALL additionally present a one-time, dismissible install hint outside Settings when install becomes available.
4. WHEN the user activates the Install_Prompt_Control, THE application SHALL invoke the browser's install prompt.
5. WHERE install availability has not been signalled by the browser, THE application SHALL hide the Install_Prompt_Control and the install hint.
6. WHEN the app is already running as an installed PWA, THE application SHALL hide the Install_Prompt_Control and the install hint.
7. WHEN the user dismisses the one-time install hint, THE application SHALL NOT show that hint again.

---
## TIER 2 — Medium Impact
---

### Requirement 7: Advancement completion checklist

**User Story:** As a player spending XP, I want to see what I still need to complete my current career level, so that I know what to buy next.

#### Acceptance Criteria

1. THE Advancement page SHALL display an Advancement_Checklist near the top of the page for the current career and level.
2. THE Advancement_Checklist SHALL indicate whether the characteristic requirement, the skill requirement, and the talent requirement for the current level are met or outstanding, using the app's existing completion logic.
3. WHERE a requirement is outstanding, THE Advancement_Checklist SHALL identify what remains (for example, which characteristics or how many qualifying skills are below the level threshold).
4. WHEN the character reaches the maximum level of the current career, THE Advancement_Checklist SHALL indicate that the career is at its maximum level.
5. THE Advancement_Checklist SHALL update when the underlying character advances change.

### Requirement 8: Take-Damage to critical-wound hand-off

**User Story:** As a player who just dropped, I want to roll my critical wound from where I took the damage, so that I do not have to switch context to find the critical tools.

#### Acceptance Criteria

1. WHEN applying damage would reduce the player's character to 0 or fewer wounds, THE Take_Damage_Panel SHALL surface a control to roll or record a Critical Wound.
2. WHEN the user activates that control, THE application SHALL open the existing critical-wound flow (roll or manual add) without requiring the user to navigate away first.
3. WHERE the applied damage triggers a Critical Wound per the existing combat rules, THE Take_Damage_Panel SHALL make the hand-off control available in that state.
4. THE hand-off SHALL not itself invent critical-wound results; it SHALL defer to the existing critical-wound rules and tables.

### Requirement 9: Combat mode surfacing

**User Story:** As a player in combat, I want the mode I likely need to be easy to reach, so that I am not stuck in the wrong panel.

#### Acceptance Criteria

1. WHILE combat is active on a desktop-width viewport, THE Combat page SHALL make the Attack, Defend, and Status surfaces reachable without hiding the primary status dashboard.
2. THE Combat page SHALL preserve the existing segmented Attack/Defend/Status control on smaller viewports.
3. WHEN the user switches combat mode, THE Combat page SHALL retain the state of each mode's panels (mode switching SHALL NOT reset entered values in the other modes).
4. THE combat mode surfacing SHALL follow the UI-layout steering rule for control budget and touch targets.

### Requirement 10: Chip controls for frequently changed combat values

**User Story:** As a player changing values mid-combat, I want tappable chips instead of dropdowns, so that adjustments are quick and thumb-friendly.

#### Acceptance Criteria

1. THE Attack_Flow SHALL present Difficulty selection as Chip_Controls rather than a native select.
2. THE Take_Damage_Panel SHALL present Hit Location selection as Chip_Controls rather than a native select.
3. THE Chip_Controls SHALL indicate the currently selected Combat_Value.
4. THE Chip_Controls SHALL meet the minimum touch-target size on touch devices per the UI-layout steering rule.
5. THE Chip_Controls SHALL preserve all selectable options previously available in the corresponding select.

### Requirement 11: Active house-rule indicators

**User Story:** As a player, I want to see which variant rules are affecting my combat math, so that I am not surprised by non-default calculations.

#### Acceptance Criteria

1. WHERE a combat-affecting house rule is set to a non-default value, THE relevant combat surface SHALL display a House_Rule_Indicator naming the active rule.
2. THE House_Rule_Indicator SHALL be read-only and SHALL NOT change the rule from the combat surface.
3. THE House_Rule_Indicator SHALL cover at least the combat-affecting rules: ranged-damage SB mode, minimum-1-wound, Impale-crits-on-tens, advantage cap, and critical deflection.
4. WHERE all combat-affecting house rules are at their default values, THE combat surface SHALL NOT display a House_Rule_Indicator.

---
## TIER 3 — Low Impact / Polish
---

### Requirement 12: Actionable empty states

**User Story:** As a new player, I want empty sections to tell me the next action, so that I know how to proceed.

#### Acceptance Criteria

1. WHERE the Attack_Flow has no weapons available, THE Attack_Flow empty state SHALL direct the user to the action that adds a weapon.
2. WHERE a section supports adding items via a picker or add control, THAT section's empty state SHALL reference the specific next action rather than only stating that the section is empty.
3. THE actionable empty states SHALL use the app's existing empty-state component and styling.

### Requirement 13: Roll and combat history review

**User Story:** As a player or GM, I want to review recent rolls and combat events, so that I can reconstruct what happened this session.

#### Acceptance Criteria

1. THE application SHALL provide access to the Timeline_View from a combat-relevant and/or character-relevant surface.
2. THE roll and combat history shown SHALL be sourced from the Event_Log provided by the `unified-event-log` feature.
3. THE history review SHALL allow filtering to at least the `roll` and `combat` Categories.
4. THE history review SHALL NOT introduce a separate roll-history store; it SHALL depend on the Event_Log.
5. WHERE the `unified-event-log` feature is not present, THIS requirement SHALL be considered blocked (it is a declared dependency).

### Requirement 14: Keyboard-shortcut discoverability

**User Story:** As a keyboard user, I want to discover the app's shortcuts, so that I can navigate faster.

#### Acceptance Criteria

1. THE application SHALL provide a discoverable list of its keyboard shortcuts, including the page-switch number keys and the undo shortcut.
2. THE shortcut list SHALL be reachable without prior knowledge of a hidden key combination (for example, via the command palette or a visible help affordance).
3. THE shortcut list SHALL reflect the shortcuts actually handled by the application.

### Requirement 15: Character switcher consolidation

**User Story:** As a user managing characters, I want quick-switch and full management to be clearly distinguished, so that I am not confused by two similar controls.

#### Acceptance Criteria

1. THE application SHALL provide a quick-switch affordance and a full character-management affordance whose purposes are visually and textually distinguished.
2. THE quick-switch affordance SHALL switch the active character.
3. THE full management affordance SHALL provide create, rename, duplicate, and delete operations.
4. THE consolidation SHALL NOT remove any character-management capability that exists today.

### Requirement 16: Navigation label clarity

**User Story:** As a user, I want navigation labels to convey what each section contains, so that I can find features without trial and error.

#### Acceptance Criteria

1. THE navigation SHALL label the section that contains estate, holdings, wealth, and enterprises in a way that conveys its combined scope.
2. WHERE a navigation section contains multiple sub-tabs, THE navigation SHALL make the presence of those sub-tabs discoverable.
3. THE navigation label changes SHALL NOT change the underlying routing sections or break existing hash routes.

## Out of Scope / Flagged Ambiguities

- **Persisted opponent/NPC roster.** The Combat_Target is deliberately ad-hoc and cleared at end of combat. A saved multi-opponent tracker (with per-target wounds) is out of scope; if desired later it would be a separate feature.
- **Applying damage to opponents.** Because this is a player's character sheet, the Attack_Flow computes and logs net wounds against the Combat_Target but does not track or reduce an opponent's wounds. Tracking opponent wounds is out of scope.
- **Full guided onboarding tour.** Onboarding is limited to the dismissible Getting_Started_Card (Requirement 5). A multi-page coach-mark tour across pages is out of scope.
- **Getting_Started_Card details.** The exact card copy, the links it surfaces, and the precise definition of "brand-new character" (for example, a quick-start character with no advances and default characteristics) are design decisions for design.md.
- **Initiative_Formula rule set.** The configurable options are at least `Initiative + 1d10` and an Initiative/Agility test-based value; the precise default and whether additional group-specific variants are offered is a design decision, subject to the rules-compliance steering rule (formulas must be justified against the rulebook).
- **Dependency ordering.** Requirement 12 (and combat/initiative event logging in Requirements 2, 3, 4) depend on the `unified-event-log` feature being implemented first. If that feature is deferred, those logging behaviours and the history-review surface are blocked.
- **Chip control vs. accessibility.** Replacing native selects with Chip_Controls (Requirement 9) must preserve keyboard operability and labelling; if a native select proves materially more accessible for a given control, that control may remain a select — to be resolved in design.
