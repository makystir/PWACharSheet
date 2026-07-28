# Requirements Document

## Introduction

A comprehensive UI/UX decluttering pass on the WFRP 4e character sheet PWA. The goal is to streamline the interface, reduce visual noise, and improve information hierarchy while retaining all current functionality. Controls and information are reorganized, collapsed, or hidden behind interactions where appropriate — nothing is removed.

## Glossary

- **App**: The WFRP 4e PWA character sheet application
- **Combat_Dashboard**: The sticky combat status panel showing wounds, conditions, advantage, round counter, engaged state, fortune/resolve, quick conditions, and initiative tracker
- **Character_Page**: The main character information page with sub-tabs (Identity, Abilities, Gear & Wealth, Notes)
- **Combat_Page**: The page containing the Combat_Dashboard plus attack flow, weapons, armour, spells, and related combat panels
- **Advancement_Page**: The page for XP tracking, career progress, characteristic/skill/talent advancement
- **Settings_Page**: The page for theme, house rules, quick actions, export/import, and utilities
- **Collapsible_Section**: An existing shared component that renders a header with a chevron toggle, persisting expand/collapse state to localStorage
- **Card**: A shared container component with background, border, border-radius, and shadow
- **Progressive_Disclosure**: A UX pattern where secondary information is hidden until the user explicitly requests it via interaction
- **Information_Density**: The amount of data visible per unit of screen space
- **Visual_Weight**: The perceived prominence of a UI element determined by size, color, borders, and contrast
- **Fortune_Resolve_Panel**: The shared panel displaying Fate/Fortune and Resilience/Resolve values with spend and burn actions
- **Sub_Tab_Bar**: The tab navigation component used within pages to separate content into switchable views

## Requirements

### Requirement 1: Combat Dashboard Density Improvement

**User Story:** As a player in active combat, I want the Combat_Dashboard to show only the most critical information at a glance, so that I can make tactical decisions without scanning through secondary controls.

#### Acceptance Criteria

1. WHILE combat is active, THE Combat_Dashboard SHALL display wounds, advantage, and active conditions in a compact primary row without requiring scrolling on viewports 375px wide or wider
2. WHEN combat is not active, THE Combat_Dashboard SHALL collapse the Actions group (advantage, round counter, engaged toggle) entirely, showing only the wounds section and condition badges
3. WHEN the user taps a quick-condition button that results in no state change (condition already at max), THE App SHALL provide no visual feedback beyond the disabled state already present
4. THE Combat_Dashboard SHALL reduce vertical spacing between the Status group and Actions group to a maximum of 8px on mobile viewports
5. WHILE combat is active, THE Combat_Dashboard SHALL render the Fortune/Resolve compact display inline within the status row rather than as a stacked secondary element

### Requirement 2: Combat Page Progressive Disclosure

**User Story:** As a player, I want combat sub-panels to only expand when relevant to my current situation, so that I see a clean overview rather than a wall of open panels.

#### Acceptance Criteria

1. WHEN combat starts, THE Combat_Page SHALL render Attack Flow, Quick Roll, and Take Damage sections in collapsed state by default, expanding only on user interaction
2. WHEN combat is not active, THE Combat_Page SHALL hide the Attack Flow, Quick Roll, Take Damage, Ammo Tracker, Critical Wounds, and Roll History sections entirely (current behavior retained)
3. THE Combat_Page SHALL persist the expanded/collapsed state of each Collapsible_Section per character using the existing localStorage mechanism
4. WHEN a Collapsible_Section header is tapped, THE App SHALL animate the expand/collapse transition with a 150ms ease-out CSS transition on max-height
5. THE Fortune_Resolve_Panel on the Combat_Page SHALL be wrapped in a Collapsible_Section with a default-collapsed state, since the Combat_Dashboard already shows a compact fortune/resolve display

### Requirement 3: Character Page Information Hierarchy

**User Story:** As a player viewing my character sheet, I want the most frequently referenced information (characteristics, core identity) to be visually prominent, with less-used details tucked away, so that I can find what I need quickly.

#### Acceptance Criteria

1. THE Character_Page identity tab SHALL display the Portrait and Personal Details card as the only always-visible section, with Deity Selector, Grudge Panel, Yenlui Panel, Magical Burnout, and Wound Maximum wrapped in individual Collapsible_Sections
2. WHEN the characteristics table is rendered, THE Character_Page SHALL display the Current value and CB columns with stronger Visual_Weight (bolder font, larger size) than the Initial and Advance input columns
3. THE Character_Page abilities tab SHALL render the skill tables with reduced row height (compact mode) using 6px vertical padding instead of the current default padding
4. WHEN more than 20 skills are displayed in the Advanced Skills table, THE Character_Page SHALL show a count badge in the section header indicating total count
5. THE Character_Page gear tab SHALL use a compact card-grid layout for trappings instead of a full-width list, showing name and encumbrance inline with quantity

### Requirement 4: Visual Noise Reduction

**User Story:** As a player using the app during a session, I want the interface to feel calm and uncluttered, so that I can focus on the content rather than the chrome.

#### Acceptance Criteria

1. THE Card component SHALL use a 1px border with 50% reduced opacity (from current full-opacity border) to create softer visual separation between sections
2. THE App SHALL reduce the box-shadow on Card components from the current `0 2px 8px` to `0 1px 3px` for a flatter visual appearance
3. THE SectionHeader component SHALL render icons at 14px size maximum and use a subdued color (--text-muted) rather than the primary text color
4. WHEN a section contains no data (empty state), THE App SHALL render the EmptyState component at 75% of its current font size and with reduced vertical padding (12px instead of 24px)
5. THE App SHALL apply a consistent 12px gap between adjacent Card components on mobile viewports (replacing any existing larger gaps)
6. THE App SHALL remove redundant horizontal rule (`<hr>`) elements used as section dividers within Card components, relying instead on consistent spacing

### Requirement 5: Settings Page Consolidation

**User Story:** As a player configuring the app, I want related settings grouped logically and secondary options hidden until needed, so that the settings page feels manageable rather than overwhelming.

#### Acceptance Criteria

1. THE Settings_Page SHALL group house rules into two collapsible sub-groups: "Combat Rules" (Ranged Damage SB, Impale Crits, Min 1 Wound, Advantage Cap, Group Advantage) and "Optional Mechanics" (Yenlui Balance, Grudge Book)
2. WHEN a house rule toggle is OFF, THE Settings_Page SHALL display the rule description in muted text color (--text-muted) to reduce visual prominence of inactive rules
3. THE Settings_Page Export/Import section SHALL consolidate "Copy to Clipboard" and "Download File" into a single "Export" dropdown button that reveals both options on tap
4. THE Settings_Page SHALL move the "Clear Sheet" button behind a collapsible "Danger Zone" section that is collapsed by default
5. THE Settings_Page Quick Actions section SHALL display configured actions as compact inline chips rather than full-width list items

### Requirement 6: Advancement Page Streamlining

**User Story:** As a player spending XP, I want the advancement interface to focus my attention on affordable, in-career options first, so that I can quickly advance without scanning irrelevant information.

#### Acceptance Criteria

1. THE Advancement_Page SHALL collapse the "Other Skills" (out-of-career) section by default, showing only career skills expanded initially
2. WHEN a characteristic or skill cannot be afforded (XP cost exceeds current XP), THE Advancement_Page SHALL render the advance button at 40% opacity with no hover effect, rather than the current disabled styling that still draws attention
3. THE Advancement_Page career progress checklist SHALL use a horizontal inline layout (flex-row with wrap) for characteristic badges rather than a stacked vertical layout
4. WHEN all career progress requirements are met, THE Advancement_Page SHALL visually de-emphasize the checklist section (reduce opacity to 60%) and prominently highlight only the "Advance Career Level" button
5. THE Advancement_Page XP tracking card SHALL display Current, Spent, and Total XP as large inline values (24px font) rather than editable fields, with an "Edit" button that reveals the input fields on demand

### Requirement 7: Responsive Space Optimization

**User Story:** As a player on a mobile device, I want the interface to make optimal use of the limited screen width, so that I can use the app comfortably without excessive horizontal scrolling.

#### Acceptance Criteria

1. WHILE viewport width is below 768px, THE App SHALL reduce horizontal padding on Card components from the current 16px to 12px
2. WHILE viewport width is below 768px, THE Combat_Dashboard SHALL render the wound progress bar at full width of the wounds section rather than a fixed width
3. WHILE viewport width is below 768px, THE Character_Page characteristics table SHALL hide the "T. Bonus" column by default, showing it only when the user taps a "Show Details" toggle
4. WHILE viewport width is above 1024px, THE Combat_Page SHALL render the Combat_Dashboard and the Weapons/Armour sections in a two-column layout (dashboard left, equipment right)
5. THE App SHALL ensure that no interactive button has a tap target smaller than 44×44px on mobile viewports, adding padding where the current visual size is smaller

### Requirement 8: Contextual Visibility and Smart Defaults

**User Story:** As a player, I want the app to show me only what is relevant to my current character and situation, so that species-specific or situational panels do not take up space unnecessarily.

#### Acceptance Criteria

1. WHEN a character has no spells and no spellcasting-related talents or skills, THE Combat_Page SHALL hide the Spell Casting Panel section header entirely (not just render an empty panel)
2. WHEN a character has no weapons equipped, THE Combat_Page SHALL display the Weapons section header with a compact "Add Weapon" prompt rather than an expanded empty card
3. WHEN a character has no ammo items, THE Combat_Page SHALL hide the Ammo Tracker section entirely rather than rendering a collapsed empty section
4. WHEN the Roll History contains zero entries, THE Combat_Page SHALL hide the Roll History section entirely rather than showing an empty collapsible
5. WHEN a character is not a Dwarf, THE Character_Page SHALL not render the Grudge Panel component at all (zero DOM output, not just visibility hidden)
6. WHEN a character is not an Elf or the Yenlui house rule is disabled, THE Character_Page SHALL not render the Yenlui Panel component at all (zero DOM output)

### Requirement 9: Interaction Consolidation

**User Story:** As a player, I want related actions grouped together in logical clusters, so that I spend less time hunting for buttons scattered across the interface.

#### Acceptance Criteria

1. THE Combat_Dashboard wound controls SHALL consolidate the −/+/Full buttons into a single compact button group with no gap between buttons (connected button bar pattern)
2. THE Combat_Dashboard advantage controls SHALL consolidate the −/+/Reset buttons into a single connected button bar matching the wound controls pattern
3. WHEN a condition badge is tapped on mobile, THE Combat_Dashboard SHALL show the condition effect text as a bottom-anchored tooltip sheet rather than inline expansion that shifts layout
4. THE Character_Page abilities tab SHALL consolidate "Add from Rulebook" and "Add Custom" buttons into a single "Add" button with a dropdown menu revealing both options
5. THE Advancement_Page skill advancement buttons (+1 and +5) SHALL render as a single segmented control rather than two separate buttons with a gap

### Requirement 10: Initiative Tracker Compaction

**User Story:** As a player managing turn order in combat, I want the initiative tracker to take minimal vertical space when not being actively edited, so that it does not push other combat information below the fold.

#### Acceptance Criteria

1. WHEN the initiative list has combatants, THE InitiativeTracker SHALL render combatant entries in a single-line horizontal scrollable row (chip layout) rather than a stacked vertical list
2. THE InitiativeTracker active combatant indicator SHALL use a highlighted border or background color on the chip rather than a separate ▶ character taking additional space
3. WHEN no combatants are present in the initiative list, THE InitiativeTracker SHALL render only the add-combatant form in a single compact row (name, initiative, add button inline) without the empty-state message paragraph
4. THE InitiativeTracker "Next Turn" button SHALL render inline with the combatant row rather than below it as a separate block element

### Requirement 11: Weapon and Armour Card Compaction

**User Story:** As a player referencing my equipment during combat, I want weapon and armour cards to show essential stats at a glance without excessive whitespace or secondary information, so that more items fit on screen simultaneously.

#### Acceptance Criteria

1. THE WeaponCards component SHALL render weapon name, damage, and range/reach in a single dense row, moving weapon group and qualities to a secondary line that appears only on hover or tap
2. THE WeaponCards component SHALL hide the "⚒ Add Runes" button by default when a weapon has zero runes, showing it only in an overflow menu or on card expansion
3. THE WeaponCards footnote ("Total = base damage + SB...") SHALL be hidden behind a help icon tooltip rather than displayed as persistent footer text
4. THE ArmourMap "Worn Armour" list items SHALL render name, AP, and locations on a single line, with qualities and rune information revealed on tap/hover
5. WHEN the armour list contains more than 4 items, THE ArmourMap SHALL cap the visible list at 3 items with a "Show all (N)" toggle button

### Requirement 12: Spell Casting Panel Declutter

**User Story:** As a spellcaster, I want the spell casting panel to focus on casting actions rather than reference information, so that I can quickly cast spells without visual overload.

#### Acceptance Criteria

1. THE SpellCastingPanel SHALL display spells in a compact list view by default (name + CN only) with full card details revealed on tap, rather than showing all fields for all spells simultaneously
2. THE SpellCastingPanel Magic Saturation selector SHALL be collapsed into a single-line display showing the current saturation level, with the full selector revealed on tap
3. WHEN a spell card is expanded, THE SpellCastingPanel SHALL highlight only the Cast and Channel action buttons, rendering spell metadata (range, target, duration) in muted secondary text
4. THE SpellCastingPanel "Manage Spells" toggle SHALL use a compact icon button rather than a full-width text button

### Requirement 13: Navigation and Tab Streamlining

**User Story:** As a player navigating between sections, I want tab bars and navigation to be as unobtrusive as possible, so that page content occupies the maximum available viewport.

#### Acceptance Criteria

1. WHILE viewport width is below 768px, THE Navigation bottom bar SHALL reduce its height from the current padding to 48px total height (including icons and labels)
2. THE Sub_Tab_Bar component SHALL hide the edit-mode pencil icon by default, showing it only in a long-press or context menu interaction to reduce permanent chrome
3. WHILE viewport width is below 768px, THE Sub_Tab_Bar SHALL render tab labels without icons, using text-only compact tabs to save vertical space
4. THE Navigation "More" overflow menu SHALL display items with reduced padding (8px vertical) and without icons to maximize the number of visible items

### Requirement 14: Duplicate Information Elimination

**User Story:** As a player, I want each piece of information displayed only once in my current view context, so that the interface does not feel repetitive.

#### Acceptance Criteria

1. WHEN the Combat_Page is active, THE Fortune_Resolve_Panel (full version) SHALL be hidden since the Combat_Dashboard already displays fortune and resolve values with spend functionality
2. THE Character_Page Roll History panel SHALL be hidden on the Identity, Gear, and Notes sub-tabs, rendering only on the Abilities sub-tab where dice rolling occurs
3. WHEN the Advancement_Page is showing the Career Progress section with career level and status, THE Career Selection card SHALL collapse the duplicate class/level/status fields into a single read-only summary line
4. THE Character_Page wound maximum Card SHALL not render when the Wound Formula information is already visible in the Combat_Dashboard (i.e., the character page should show it only on the identity tab for reference)

### Requirement 15: Empty State and Form Compaction

**User Story:** As a player, I want forms and empty states to take minimal space, so that they do not dominate the screen when I have few items.

#### Acceptance Criteria

1. THE ConsumablesPanel empty state text SHALL render in a single line with reduced font size (12px) and minimal padding (8px), replacing the current multi-line description
2. THE ConsumablesPanel add-consumable form SHALL use a single-row inline layout (name, doses, add button) for simple items, expanding to the full multi-field form only when the user taps "More options"
3. THE AmmoTracker empty state SHALL render as a compact single-line prompt ("No ammo tracked. +Add") rather than a paragraph
4. THE InitiativeTracker add-combatant form SHALL render with inputs at 32px height rather than the default input height, matching the compact combat aesthetic
5. WHEN the trappings table is empty, THE Character_Page Gear tab SHALL display a single-line "No gear yet — add trappings" prompt with an inline add button, rather than the full EmptyState component with icon and heading
