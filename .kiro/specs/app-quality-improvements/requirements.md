# Requirements Document

## Introduction

This specification covers a comprehensive quality improvement pass for the WFRP 4e character sheet PWA. It addresses rules compliance gaps identified during audit (missing talents from Up In Arms and Dwarf Player's Guide, Fatigued→Unconscious automation, XP table documentation), UX improvements to combat and spell workflows (quick condition buttons, end-of-turn report modal, overcast damage preview, mobile spell layout, expandable effect cells, Obsessions system), and UI polish enhancements (skeleton loaders, empty states, micro-interaction feedback, combat dashboard visual grouping).

## Glossary

- **App**: The WFRP 4e character sheet Progressive Web Application built with React 19, TypeScript, and Vite
- **Talent_Database**: The `src/data/talents.ts` file containing all talent entries as `{ name: string, max: string, desc: string }` objects
- **Combat_Dashboard**: The sticky combat HUD component (`CombatDashboard.tsx`) displaying wounds, advantage, conditions, and round counter
- **Condition_Picker**: The full dialog for adding conditions to a character (`ConditionPicker.tsx`)
- **End_Of_Turn_Processor**: The logic module (`end-of-turn.ts`) that processes automated condition effects at round end
- **Overcast_Allocator**: The component (`OvercastAllocator.tsx`) for allocating SL to overcast categories (Range, AoE, Duration, Targets, Damage)
- **Spell_Table**: The table rendering spells with columns for Name, CN, Range, Target, Duration, and Effect
- **Skeleton_Loader**: A shimmer/placeholder UI element matching the expected page layout, displayed during lazy-load resolution
- **Yenlui_State**: The spiritual balance state for Elven characters: Light, Balanced, or Dark
- **Obsession**: A High Elf psychological trait (from High Elf Player's Guide) providing +2 SL benefits with penalties based on Yenlui state
- **Toughness_Bonus**: Floor of (Toughness characteristic value / 10), abbreviated TB
- **Page_Loader**: The Suspense wrapper component (`PageLoader.tsx`) used for lazy-loaded routes

## Requirements

### Requirement 1: Add Missing Combat Talents from Up In Arms

**User Story:** As a player using combat-focused careers from Up In Arms, I want all Up In Arms combat talents available in the talent database, so that I can add them to my character and reference their effects.

#### Acceptance Criteria

1. THE Talent_Database SHALL contain an entry for Beat Blade with max "WS Bonus" and a description matching the Up In Arms rules
2. THE Talent_Database SHALL contain an entry for Distract with max "I Bonus" and a description matching the Up In Arms rules
3. THE Talent_Database SHALL contain an entry for Reversal with max "WS Bonus" and a description matching the Up In Arms rules
4. THE Talent_Database SHALL contain an entry for Shieldsman with max "WS Bonus" and a description matching the Up In Arms rules
5. THE Talent_Database SHALL contain an entry for Strike to Injure with max "WS Bonus" and a description matching the Up In Arms rules
6. THE Talent_Database SHALL contain an entry for Drilled with max "WS Bonus" and an updated description reflecting the Up In Arms revision
7. THE Talent_Database SHALL contain entries for Flee!, Gunner, Rapid Reload, Relentless, Roughrider, and Crew Commander with appropriate max values and descriptions from Up In Arms

### Requirement 2: Add Missing Dwarf Guide Talents

**User Story:** As a Dwarf character player, I want all Dwarf Player's Guide talents available in the talent database, so that I can use Dwarf-specific talents like Rune Magic and Ancestral Grudge.

#### Acceptance Criteria

1. THE Talent_Database SHALL contain entries for Ancestral Grudge, Bludgeoner, Demolisher, Dragon Belcher, Entrenchment, Forgefire, Glorious Demise, Harpooner, Kingsguard, and Liquid Fortification with max values and descriptions matching the Dwarf Player's Guide
2. THE Talent_Database SHALL contain entries for Long Memory, Magic Defiance, Master Rune Magic, Maverick, Rune Magic, Short Fuse, Tireless, Underminer, and Whirlwind of Death with max values and descriptions matching the Dwarf Player's Guide
3. WHEN a new Dwarf talent entry is added, THE Talent_Database SHALL use the same object format as existing entries: `{ name: string, max: string, desc: string }`

### Requirement 3: Fatigued to Unconscious Automation

**User Story:** As a player managing conditions in combat, I want the app to automatically apply the Unconscious condition when Fatigued level reaches my Toughness Bonus, so that this Core Rulebook rule (p.167) is enforced without manual tracking.

#### Acceptance Criteria

1. WHEN a Fatigued condition level is incremented to a value equal to or greater than the character's Toughness_Bonus, THE App SHALL automatically apply the Unconscious condition to the character
2. WHEN the Fatigued condition level is already equal to or greater than the character's Toughness_Bonus and the character already has the Unconscious condition, THE App SHALL retain the Unconscious condition without duplicating it
3. WHEN the Fatigued condition level is reduced below the character's Toughness_Bonus, THE App SHALL retain the Unconscious condition (removal is manual per GM discretion)

### Requirement 4: Document Extended XP Table

**User Story:** As a player advancing a character beyond 50 characteristic advances, I want a visible note in the advancement UI explaining that XP costs above 50 advances are extrapolated, so that I understand which costs are RAW and which are calculated.

#### Acceptance Criteria

1. WHILE the advancement UI displays XP costs, THE App SHALL show an informational note stating that XP costs for advances 1–50 match the Core Rulebook table exactly
2. WHILE the advancement UI displays XP costs, THE App SHALL show an informational note stating that costs above 50 advances are extrapolated beyond the printed rulebook tables
3. THE App SHALL display this note in a non-intrusive manner (info icon or collapsible section) that does not obscure the primary advancement controls

### Requirement 5: Quick Condition Buttons on Combat Dashboard

**User Story:** As a player in active combat, I want single-tap buttons for the most common conditions (Bleeding, Stunned, Prone, Ablaze) directly on the combat dashboard, so that I can apply them without opening the full Condition Picker dialog.

#### Acceptance Criteria

1. WHILE the character is in combat, THE Combat_Dashboard SHALL display quick-add buttons for Bleeding, Stunned, Prone, and Ablaze conditions
2. WHEN a quick condition button is tapped, THE App SHALL apply that condition to the character using the same logic as the Condition_Picker (increment level if stackable, add if not present)
3. THE quick condition buttons SHALL be visually distinct from other dashboard controls and positioned near the existing condition badge area
4. WHEN a quick condition button is tapped for a stackable condition that is already at its maximum level, THE App SHALL not increment beyond the maximum level

### Requirement 6: End-of-Turn Report Modal

**User Story:** As a player, I want to see a summary of all end-of-turn effects before they are applied to my character, so that I understand how Bleeding, Ablaze, and other conditions affected my wounds.

#### Acceptance Criteria

1. WHEN the End Turn button is pressed, THE App SHALL display a modal summarizing all pending end-of-turn effects before applying them
2. THE modal SHALL list each damage effect with its calculation breakdown (e.g., "Bleeding 2: -2 wounds", "Ablaze 1: rolled 7 - 3 TB - 2 AP = 2 wounds")
3. THE modal SHALL list all reminder effects (e.g., "Stunned: Endurance Test required")
4. THE modal SHALL include an "Apply" button that commits the effects to the character state
5. THE modal SHALL include a "Cancel" button that discards the pending effects without modifying the character
6. WHEN the Apply button is pressed, THE App SHALL update the character's wounds, remove auto-removed conditions, and advance the round counter

### Requirement 7: Overcast Damage Preview

**User Story:** As a spellcaster allocating overcast SL to damage, I want to see a live damage preview that updates as I allocate SL, so that I can make informed allocation decisions before confirming.

#### Acceptance Criteria

1. WHILE the Overcast_Allocator is displayed and the damage category is available, THE Overcast_Allocator SHALL show a live damage preview value that updates on each allocation change
2. WHEN the user increments the damage allocation, THE damage preview SHALL increase by the per-slot damage bonus amount
3. WHEN the user decrements the damage allocation, THE damage preview SHALL decrease by the per-slot damage bonus amount
4. THE damage preview SHALL display the base spell damage and the modified total clearly (e.g., "Base: 8 → Modified: 12")

### Requirement 8: Mobile Spell Table Card Layout

**User Story:** As a mobile user, I want spells displayed as compact cards instead of a 6-column table on small screens, so that I can read spell information without horizontal scrolling.

#### Acceptance Criteria

1. WHILE the viewport width is less than 768px, THE Spell_Table SHALL render each spell as a card-based layout instead of a table row
2. THE card layout SHALL display the spell name and CN prominently at the top of each card
3. THE card layout SHALL display Range, Target, Duration, and Effect as secondary fields within the card
4. WHILE the viewport width is 768px or greater, THE Spell_Table SHALL render the standard 6-column table layout
5. THE card layout SHALL be accessible with appropriate ARIA roles and labels for screen readers

### Requirement 9: Expandable Effect Cells

**User Story:** As a player viewing spell or talent effects, I want to tap on truncated effect text to expand it and read the full content, so that I do not lose information to CSS truncation.

#### Acceptance Criteria

1. WHEN an Effect cell contains text that exceeds the display width, THE App SHALL truncate the text with an ellipsis indicator
2. WHEN a user taps or clicks a truncated Effect cell, THE App SHALL expand the cell to display the full effect text
3. WHEN a user taps or clicks an already-expanded Effect cell, THE App SHALL collapse it back to the truncated state
4. WHILE the viewport width is 1024px or greater, THE App SHALL increase the maximum width of Effect cells to reduce the need for expansion

### Requirement 10: Implement Obsessions System

**User Story:** As a High Elf character player, I want to track my active Obsession with its +2 SL benefits and Yenlui-state-dependent penalties, so that I can manage this High Elf Player's Guide mechanic in the app.

#### Acceptance Criteria

1. WHERE the character species is High Elf and the Yenlui house rule is enabled, THE App SHALL provide an Obsession tracker in the Yenlui panel area
2. THE Obsession tracker SHALL allow the user to enter a free-text description of their active obsession and the related Test types
3. WHILE the Yenlui_State is Light, THE Obsession tracker SHALL display the benefit note (+2 SL on related Tests) with no penalty indicator
4. WHILE the Yenlui_State is Balanced, THE Obsession tracker SHALL display the benefit note (+2 SL on related Tests) followed by a penalty warning indicating the benefit must be taken first then the penalty applies
5. WHILE the Yenlui_State is Dark, THE Obsession tracker SHALL display a penalty indicator showing that the penalty applies even without the benefit being used
6. THE App SHALL store the obsession data on the character model and persist it across sessions

### Requirement 11: Skeleton Loaders for Lazy-Loaded Pages

**User Story:** As a user navigating the app, I want to see page-shaped shimmer placeholders while lazy-loaded pages are fetching, so that I get a sense of the expected layout rather than seeing a generic spinner.

#### Acceptance Criteria

1. WHEN a lazy-loaded page is being fetched, THE Page_Loader SHALL display a skeleton placeholder that approximates the layout of the target page
2. THE skeleton placeholder SHALL use shimmer animation to indicate loading state
3. THE App SHALL provide distinct skeleton layouts for Combat, Advancement, and Settings pages at minimum
4. WHEN the page finishes loading, THE skeleton placeholder SHALL be replaced by the actual page content without layout shift
5. THE skeleton placeholders SHALL be accessible with appropriate `aria-label="Loading page content"` and `role="status"` attributes

### Requirement 12: Empty State Improvements

**User Story:** As a new user with an empty character sheet, I want to see helpful empty state messages with action buttons instead of bare "No X" text, so that I know how to add content.

#### Acceptance Criteria

1. WHEN a list panel (spells, weapons, talents, conditions) has no items, THE App SHALL display a descriptive empty state message with a call-to-action button
2. THE empty state message SHALL describe what the section is for and how to add items (e.g., "No spells memorized — tap Manage Spells to add some")
3. THE empty state SHALL include a button or link that navigates the user to the relevant add/manage workflow
4. THE empty state displays SHALL use a consistent visual pattern across all panels (icon + message + CTA button)

### Requirement 13: Micro-interaction Feedback

**User Story:** As a user interacting with buttons and controls, I want subtle tactile feedback (scale-on-press animations) on interactive elements, so that the app feels responsive to my input.

#### Acceptance Criteria

1. WHEN a user presses an interactive button (dice roll, action buttons, condition buttons), THE App SHALL apply a scale transform (approximately scale(0.96)) for the duration of the press
2. THE scale animation SHALL use a fast transition duration (150ms or less) to feel responsive
3. THE micro-interaction feedback SHALL not interfere with the button's click/tap event handling
4. THE micro-interaction feedback SHALL respect the user's prefers-reduced-motion media query and be disabled when reduced motion is preferred

### Requirement 14: Combat Dashboard Visual Grouping

**User Story:** As a player scanning the combat dashboard during combat, I want visual grouping that separates Status information (wounds, conditions) from Actions (advantage, round counter, engaged toggle), so that I can quickly locate the information I need.

#### Acceptance Criteria

1. THE Combat_Dashboard SHALL visually separate a "Status" group (wounds display and condition badges) from an "Actions" group (advantage counter, round counter, engaged toggle)
2. THE visual separation SHALL use subtle dividers or spacing changes that distinguish the groups without adding visual clutter
3. THE grouping SHALL be perceivable by screen readers through appropriate ARIA grouping (role="group" with aria-label)
4. WHILE the viewport width is less than 768px, THE Combat_Dashboard SHALL maintain the visual grouping in a stacked vertical layout
