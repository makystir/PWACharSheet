# Implementation Plan: UI/UX Declutter

## Overview

A comprehensive UI/UX decluttering pass across the WFRP 4e character sheet PWA. Changes are organized by dependency: shared foundation components first (CSS tokens, Card, CollapsibleSection, EmptyState), then page-level restructuring (Combat, Character, Settings, Advancement), then panel-level compaction (Initiative, Weapons, Armour, Spells), then navigation/responsive, and finally duplicate elimination and empty state compaction. Each task builds incrementally so the app remains functional after every step.

## Tasks

- [x] 1. Shared component CSS and animation foundations
  - [x] 1.1 Update Card component styling for reduced visual weight
    - In `src/components/shared/Card.module.css`: reduce border opacity to 50% using `color-mix(in srgb, var(--card-border) 50%, transparent)`, flatten box-shadow to `0 1px 3px var(--shadow)`, add `gap: 12px` for adjacent cards, and add mobile override (`max-width: 767px`) reducing padding from 16px to 12px
    - _Requirements: 4.1, 4.2, 4.5, 7.1_

  - [x] 1.2 Update SectionHeader styling for subdued chrome
    - In `src/components/shared/SectionHeader.module.css`: set icon size to 14px max, apply `color: var(--text-muted)` to icons
    - Remove redundant `<hr>` elements used as section dividers within Card components (grep for `<hr` in relevant component files)
    - _Requirements: 4.3, 4.6_

  - [x] 1.3 Update EmptyState component for compact rendering
    - In `src/components/shared/EmptyState.module.css`: reduce font size to 75% of current, reduce vertical padding to 12px (from 24px)
    - Optionally add a `compact` prop to `EmptyState.tsx` to allow even more compact single-line rendering for specific contexts
    - _Requirements: 4.4, 15.1, 15.3, 15.5_

  - [x] 1.4 Add smooth collapse/expand animation to CollapsibleSection
    - In `src/components/shared/CollapsibleSection.tsx`: replace conditional rendering (`{expanded && children}`) with always-rendered div using `max-height` transition approach
    - In `src/components/shared/CollapsibleSection.module.css`: add `.contentCollapsed` (max-height: 0, overflow: hidden, transition: max-height 150ms ease-out) and `.contentExpanded` (max-height: 2000px, overflow: visible, padding-top: 12px, transition: max-height 150ms ease-out)
    - Add `aria-hidden={!expanded}` to content wrapper
    - _Requirements: 2.4_

- [x] 2. Checkpoint - Ensure shared components render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Combat Dashboard restructure
  - [x] 3.1 Implement compact primary row layout in CombatDashboard
    - In `src/components/combat/CombatDashboard.tsx` + `.module.css`: reorganize into primary row (wounds progress bar + advantage counter + active condition badges + Fortune/Resolve inline)
    - Reduce spacing between Status and Actions groups to max 8px on mobile
    - Make wound progress bar full-width on mobile (`width: 100%` when viewport < 768px)
    - _Requirements: 1.1, 1.4, 1.5, 7.2_

  - [x] 3.2 Implement combat-state gating for Actions group
    - In `src/components/combat/CombatDashboard.tsx`: conditionally render/collapse the Actions group (round counter, engaged toggle) only when `combatActive` is true; when false, show only wounds + conditions
    - _Requirements: 1.2_

  - [x] 3.3 Implement connected button bars for wound and advantage controls
    - In `src/components/combat/CombatDashboard.tsx` + `.module.css`: render −/+/Full wound buttons as connected button bar (no gaps, shared border-radius on ends only); same pattern for −/+/Reset advantage buttons
    - _Requirements: 9.1, 9.2_

  - [x] 3.4 Implement condition badge mobile tooltip
    - In `src/components/combat/CombatDashboard.tsx`: on mobile tap of a condition badge, show effect text in a bottom-anchored tooltip sheet (fixed position, Toast-like positioning) rather than inline expansion
    - _Requirements: 9.3_

- [x] 4. Combat Page progressive disclosure and layout
  - [x] 4.1 Wrap combat sub-panels in CollapsibleSection
    - In `src/components/pages/CombatPage.tsx`: wrap Attack Flow, Quick Roll, Take Damage, and Fortune/Resolve Panel in `CollapsibleSection` with `defaultExpanded={false}`
    - Ensure each section has a unique `storageKey` for localStorage persistence
    - _Requirements: 2.1, 2.3, 2.5_

  - [x] 4.2 Implement contextual visibility for combat sections
    - In `src/components/pages/CombatPage.tsx`: conditionally render (zero DOM) based on character state:
      - Hide SpellCastingPanel when `character.spells.length === 0 && !hasSpellcasterTalent`
      - Show compact "Add Weapon" prompt when `weapons.length === 0` instead of empty card
      - Hide Ammo Tracker when `ammoItems.length === 0`
      - Hide Roll History when `rollHistory.length === 0`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 4.3 Implement two-column desktop layout for Combat Page
    - In `src/components/pages/CombatPage.module.css`: add `.combatTwoColumn` grid layout (`grid-template-columns: 1fr 1fr; gap: 16px`) at `min-width: 1025px` breakpoint
    - In `CombatPage.tsx`: apply two-column class to wrap dashboard + equipment sections
    - _Requirements: 7.4_

  - [x] 4.4 Hide Fortune/Resolve full panel on Combat Page
    - In `src/components/pages/CombatPage.tsx`: hide the full `FortuneResolvePanel` component when Combat Dashboard is active (dashboard already shows compact fortune/resolve)
    - _Requirements: 14.1_

- [x] 5. Character Page hierarchy and contextual visibility
  - [x] 5.1 Restructure Character Page Identity tab with collapsible sections
    - In `src/components/pages/CharacterPage.tsx`: keep Portrait + Personal Details always visible; wrap Deity Selector, Grudge Panel, Yenlui Panel, Magical Burnout, and Wound Maximum in individual `CollapsibleSection` components with appropriate `storageKey` values
    - _Requirements: 3.1_

  - [x] 5.2 Implement species-based conditional rendering
    - In `src/components/pages/CharacterPage.tsx`:
      - Grudge Panel: render only when `character.species === 'Dwarf'` (zero DOM otherwise)
      - Yenlui Panel: render only when species is Elf variant AND `houseRules.yenluiBalance` enabled (zero DOM otherwise)
    - _Requirements: 8.5, 8.6_

  - [x] 5.3 Enhance Abilities tab styling and compaction
    - In `CharacterPage.tsx` / relevant CSS: apply stronger visual weight to Current value and CB columns (font-weight: 700, font-size: 18px); reduce skill table row padding to `6px 8px`
    - Add count badge in Advanced Skills section header when > 20 skills
    - Consolidate "Add from Rulebook" + "Add Custom" into single "Add" dropdown button
    - _Requirements: 3.2, 3.3, 3.4, 9.4_

  - [x] 5.4 Implement Gear tab compact card-grid layout
    - In `CharacterPage.tsx` / `CharacterPage.module.css`: convert trappings list to CSS Grid layout (`grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))`) showing name + encumbrance inline with quantity
    - _Requirements: 3.5_

  - [x] 5.5 Implement Roll History contextual visibility on Character Page
    - In `src/components/pages/CharacterPage.tsx`: render Roll History panel only on the Abilities sub-tab; hide on Identity, Gear, and Notes sub-tabs
    - Render Wound Maximum Card only on Identity tab
    - _Requirements: 14.2, 14.4_

- [x] 6. Checkpoint - Ensure Combat and Character pages work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Settings Page consolidation
  - [x] 7.1 Implement house rules grouping with collapsible sub-groups
    - In `src/components/pages/SettingsPage.tsx`: split house rules into two `CollapsibleSection` groups — "Combat Rules" (Ranged Damage SB, Impale Crits, Min 1 Wound, Advantage Cap, Group Advantage) and "Optional Mechanics" (Yenlui Balance, Grudge Book)
    - Apply `color: var(--text-muted)` to description text when toggle is OFF
    - _Requirements: 5.1, 5.2_

  - [x] 7.2 Consolidate Export section and create Danger Zone
    - In `src/components/pages/SettingsPage.tsx`: replace separate "Copy to Clipboard" and "Download File" buttons with single "Export" dropdown button; move "Clear Sheet" behind a collapsible "Danger Zone" section (default collapsed)
    - _Requirements: 5.3, 5.4_

  - [x] 7.3 Convert Quick Actions to compact chips
    - In `src/components/pages/SettingsPage.tsx` + `.module.css`: render configured quick actions as compact inline chips instead of full-width list items
    - _Requirements: 5.5_

- [x] 8. Advancement Page streamlining
  - [x] 8.1 Implement collapsed Other Skills and affordability styling
    - In `src/components/pages/AdvancementPage.tsx`: wrap "Other Skills" section in `CollapsibleSection` with `defaultExpanded={false}`
    - Style unaffordable advance buttons with `opacity: 0.4; pointer-events: none` (no hover effect)
    - _Requirements: 6.1, 6.2_

  - [x] 8.2 Implement career progress layout and XP card changes
    - In `src/components/pages/AdvancementPage.tsx` + `.module.css`: convert career progress checklist to horizontal flex-row with wrap for characteristic badges
    - When all requirements met: checklist at opacity 0.6, "Advance Career Level" button highlighted
    - XP card: display values as large text (24px), editable only via "Edit" toggle
    - Collapse duplicate class/level/status into summary line in Career Selection
    - _Requirements: 6.3, 6.4, 6.5, 14.3_

  - [x] 8.3 Implement skill advancement segmented control
    - In `src/components/pages/AdvancementPage.tsx` + `.module.css`: replace separate +1/+5 buttons with a single segmented control
    - _Requirements: 9.5_

- [x] 9. Initiative Tracker compaction
  - [x] 9.1 Convert InitiativeTracker to horizontal chip layout
    - In `src/components/combat/InitiativeTracker.tsx` + `.module.css`: replace vertical list with horizontal scrollable chip row (`display: flex; overflow-x: auto; gap: 6px`)
    - Active combatant uses highlighted border/background instead of ▶ character
    - "Next Turn" button rendered inline with combatant row
    - _Requirements: 10.1, 10.2, 10.4_

  - [x] 9.2 Implement compact add-combatant form
    - In `src/components/combat/InitiativeTracker.tsx` + `.module.css`: when no combatants, render only the add form in single compact row (name + initiative + button inline); inputs at 32px height; no empty-state paragraph
    - _Requirements: 10.3, 15.4_

- [x] 10. Weapon and Armour card compaction
  - [x] 10.1 Implement compact WeaponCards layout
    - In `src/components/combat/WeaponCards.tsx` + `.module.css`: render name + damage + range/reach in single dense row; weapon group + qualities on secondary line (hover/tap reveal)
    - Hide "⚒ Add Runes" when runes = 0 (show in overflow menu or on card expand)
    - Move footnote behind help icon tooltip (use existing `HelpPopover` component)
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 10.2 Implement compact ArmourMap list with overflow toggle
    - In `src/components/combat/ArmourMap.tsx` + `.module.css`: render name + AP + locations on single line; qualities/rune info on tap/hover
    - When > 4 items, cap visible list at 3 with "Show all (N)" toggle
    - _Requirements: 11.4, 11.5_

- [x] 11. Spell Casting Panel declutter
  - [x] 11.1 Implement compact spell list with tap-to-expand
    - In `src/components/shared/SpellCastingPanel.tsx` + `.module.css`: default view shows compact list (spell name + CN only); tap expands to full card details
    - Expanded spell: Cast/Channel buttons highlighted; metadata in `color: var(--text-muted); font-size: 13px`
    - _Requirements: 12.1, 12.3_

  - [x] 11.2 Compact Magic Saturation and Manage Spells controls
    - In `src/components/shared/SpellCastingPanel.tsx`: collapse Magic Saturation to single-line current value (full selector on tap); replace "Manage Spells" full-width button with compact icon button
    - _Requirements: 12.2, 12.4_

- [x] 12. Checkpoint - Ensure panel components work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Navigation and responsive optimization
  - [x] 13.1 Implement compact Navigation bottom bar
    - In `src/components/layout/Navigation.tsx` + `.module.css`: reduce bottom bar to 48px total height on mobile; reduce "More" overflow menu padding to 8px vertical, remove icons from menu items
    - _Requirements: 13.1, 13.4_

  - [x] 13.2 Implement compact SubTabBar for mobile
    - In `src/components/shared/SubTabBar.tsx` + `.module.css`: hide edit pencil icon by default (show via long-press/context menu); render text-only compact tabs on mobile (no icons below 768px)
    - _Requirements: 13.2, 13.3_

  - [x] 13.3 Implement responsive characteristics table toggle
    - In `src/components/pages/CharacterPage.tsx` + `.module.css`: on mobile (< 768px) hide "T. Bonus" column by default, add "Show Details" toggle to reveal it
    - _Requirements: 7.3_

  - [x] 13.4 Ensure minimum tap targets across all interactive elements
    - Audit interactive buttons across all modified components; add padding where current visual size is smaller than 44×44px on mobile viewports
    - _Requirements: 7.5_

- [x] 14. Empty state and form compaction
  - [x] 14.1 Compact ConsumablesPanel empty state and add form
    - In `src/components/shared/ConsumablesPanel.tsx` + `.module.css`: empty state as single-line, 12px font, 8px padding; add form uses single-row inline layout (name, doses, add button) with "More options" expansion
    - _Requirements: 15.1, 15.2_

  - [x] 14.2 Compact Gear tab empty state
    - In `src/components/pages/CharacterPage.tsx`: when trappings empty, show single-line "No gear yet — add trappings" prompt with inline add button instead of full EmptyState component
    - _Requirements: 15.5_

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Write unit tests for conditional rendering logic
  - [x] 16.1 Write tests for Combat Page contextual visibility
    - Verify SpellCastingPanel renders nothing when character has no spells/talents
    - Verify compact "Add Weapon" prompt when weapons empty
    - Verify AmmoTracker hidden when ammo items empty
    - Verify RollHistory hidden when history empty
    - Verify FortuneResolvePanel hidden when dashboard active
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 14.1_

  - [x] 16.2 Write tests for Character Page contextual visibility
    - Verify GrudgePanel renders nothing when species ≠ Dwarf
    - Verify YenluiPanel renders nothing when species ≠ Elf or house rule disabled
    - Verify RollHistoryPanel hidden on non-Abilities sub-tabs
    - Verify Wound Maximum Card only on Identity tab
    - _Requirements: 8.5, 8.6, 14.2, 14.4_

  - [x] 16.3 Write tests for CollapsibleSection animation and default states
    - Verify CollapsibleSection animation classes toggle correctly (contentExpanded/contentCollapsed)
    - Verify CombatDashboard Actions group hidden when combat not active
    - Verify AdvancementPage "Other Skills" starts collapsed
    - Verify SettingsPage "Danger Zone" starts collapsed
    - _Requirements: 2.4, 1.2, 6.1, 5.4_

  - [x] 16.4 Write tests for interaction consolidation
    - Verify connected button bar renders as single group (wound and advantage controls)
    - Verify Export dropdown opens on click
    - Verify "Add" dropdown menu on Character abilities tab
    - Verify "Show all" toggle in armour list expands items
    - Verify spell card expands on tap
    - _Requirements: 9.1, 9.2, 5.3, 9.4, 11.5, 12.1_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after major page changes
- The design explicitly uses TypeScript/React (TSX) with CSS Modules — all implementation follows existing patterns
- No new architectural patterns are introduced; all changes use existing shared components (CollapsibleSection, Card, EmptyState, HelpPopover)
- No property-based tests are included because the design has no Correctness Properties section — this is a UI/UX pass with no complex data transformations

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["3.1", "3.2", "3.3", "3.4"] },
    { "id": 2, "tasks": ["4.1", "4.2", "4.3", "4.4", "5.1", "5.2"] },
    { "id": 3, "tasks": ["5.3", "5.4", "5.5", "7.1", "7.2", "7.3"] },
    { "id": 4, "tasks": ["8.1", "8.2", "8.3", "9.1", "9.2"] },
    { "id": 5, "tasks": ["10.1", "10.2", "11.1", "11.2"] },
    { "id": 6, "tasks": ["13.1", "13.2", "13.3", "13.4"] },
    { "id": 7, "tasks": ["14.1", "14.2"] },
    { "id": 8, "tasks": ["16.1", "16.2", "16.3", "16.4"] }
  ]
}
```
