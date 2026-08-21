# Requirements Document

## Introduction

When "Start Combat" is activated, the Combat Page switches to a two-column desktop layout with a left sidebar (CombatDashboard: wounds, round counter, advantage, fortune/resolve, engaged toggle, conditions, movement) and a right content area (Attack Flow, Quick Roll, Weapons on the Attack tab; Take Damage, Armour on the Defend tab). The current layout has significant visual issues: the left column (fixed at 320px) is too narrow to contain all its content, causing components to be clipped or overflow beneath the right panel. The "Engaged" badge, Walk/Run values, and condition badges are cut off. The right panel overlaps the left sidebar content. The Status tab shows only the sidebar content with an empty right area, feeling unbalanced.

This spec addresses a layout reorganization that eliminates the problematic sticky sidebar entirely. Instead, the Combat Dashboard becomes a full-width header/banner above the tab content, and the tab content uses the full page width. This approach avoids the need for internal scrolling in any panel and prevents column overlap issues.

## Glossary

- **Combat_Page**: The top-level page component (`CombatPage.tsx`) that renders combat UI.
- **Combat_Dashboard**: The component (`CombatDashboard.tsx`) displaying wounds, advantage, round counter, engaged state, fortune/resolve, conditions, movement, and end-turn button.
- **Tab_Content_Area**: The full-width area below the Combat_Dashboard that renders tab-specific panels (Attack Flow, Take Damage, Weapons, Armour, etc.).
- **Attack_Tab**: The combat mode tab displaying attack-oriented panels (Attack Flow, Quick Roll, Weapons).
- **Defend_Tab**: The combat mode tab displaying defence-oriented panels (Take Damage, Armour).
- **Status_Tab**: The combat mode tab displaying status information (Fortune/Resolve, Spells, Ammo, Critical Wounds, Roll History).
- **Segmented_Control**: The Attack/Defend/Status tab switcher visible during active combat.
- **Desktop_Viewport**: A viewport with min-width of 1025px.

## Requirements

### Requirement 1: Eliminate Two-Column Sidebar Layout

**User Story:** As a player, I want the combat layout to never have content overlapping or clipping, so that all information is readable without internal scrolling or panel collision.

#### Acceptance Criteria

1. WHILE combat is active on Desktop_Viewport, THE Combat_Page SHALL NOT use a two-column grid layout with a sticky sidebar.
2. WHILE combat is active on Desktop_Viewport, THE Combat_Page SHALL render all content in a single-column vertical flow: Segmented_Control, then Combat_Dashboard, then Tab_Content_Area.
3. THE Combat_Page SHALL not require internal scrolling within any panel or section to view its content.

### Requirement 2: Combat Dashboard as Full-Width Header

**User Story:** As a player, I want the combat dashboard to display as a full-width section at the top of the combat area, so that all stats are visible without being constrained to a narrow sidebar.

#### Acceptance Criteria

1. WHILE combat is active on Desktop_Viewport, THE Combat_Dashboard SHALL render at full content width (not constrained to a fixed pixel column width).
2. WHILE combat is active on Desktop_Viewport, THE Combat_Dashboard SHALL arrange its subsections (wounds, advantage, round counter, engaged toggle, fortune/resolve, movement) in a horizontal flow layout that wraps naturally when content requires it.
3. THE Combat_Dashboard SHALL display all elements (wounds, advantage, conditions, round counter, engaged toggle, movement values, fortune/resolve, end-turn button) fully visible without truncation or clipping.
4. THE Combat_Dashboard condition badges SHALL wrap to new lines when they exceed the available width without being clipped or hidden.

### Requirement 3: Tab Content Area Full-Width Rendering

**User Story:** As a player, I want the Attack, Defend, and Status tab panels to use the full page width, so that content is spacious and clearly organised.

#### Acceptance Criteria

1. WHILE combat is active, THE Tab_Content_Area SHALL occupy the full available width of the Combat_Page below the Combat_Dashboard.
2. WHILE in the Attack_Tab, THE Tab_Content_Area SHALL render Attack Flow, Quick Roll, and Weapons panels in a vertical stack with consistent spacing.
3. WHILE in the Defend_Tab, THE Tab_Content_Area SHALL render Take Damage and Armour panels in a vertical stack with consistent spacing.
4. WHILE in the Status_Tab, THE Tab_Content_Area SHALL render Fortune/Resolve, Spells, Ammo, Critical Wounds, and Roll History panels at full width in a vertical stack.

### Requirement 4: No Content Overlap

**User Story:** As a player, I want no panel or section to overlap, be clipped by, or be hidden behind any other panel, so that the interface is always readable.

#### Acceptance Criteria

1. THE Combat_Page SHALL not have any child element that visually overlaps another sibling element when combat is active.
2. THE Combat_Page SHALL not apply `overflow: hidden` on any container that would clip visible content.
3. THE Combat_Dashboard SHALL not have any of its child elements extend beyond its own boundaries into adjacent sections.

### Requirement 5: Mobile and Tablet Layout Preservation

**User Story:** As a player using a mobile or tablet device, I want the combat layout to remain single-column with the compact sticky dashboard, so that existing mobile behaviour is not regressed.

#### Acceptance Criteria

1. WHILE on viewports narrower than 1025px, THE Combat_Page SHALL render all combat content in a single-column vertical layout.
2. WHILE on viewports narrower than 1025px and combat is active in Attack_Tab or Defend_Tab, THE Combat_Page SHALL display the compact sticky Combat_Dashboard strip at the top.
3. WHILE on viewports narrower than 1025px, THE layout SHALL remain unchanged from the current mobile/tablet behaviour.

### Requirement 6: Desktop Dashboard Compact Density

**User Story:** As a player on desktop, I want the full-width dashboard to be compact and information-dense rather than excessively tall, so that the tab content below remains immediately visible without excessive scrolling of the page.

#### Acceptance Criteria

1. WHILE combat is active on Desktop_Viewport, THE Combat_Dashboard SHALL use a multi-row horizontal layout that distributes subsections (wounds, advantage, round, engaged, fortune/resolve, movement) across the available width to minimize total dashboard height.
2. WHILE combat is active on Desktop_Viewport, THE Combat_Dashboard height SHALL not exceed approximately 250px (excluding conditions that vary based on active condition count).
3. THE Combat_Dashboard SHALL use compact spacing (reduced padding and gaps) on Desktop_Viewport to keep the dashboard visually tight without sacrificing readability.

### Requirement 7: Segmented Control Sticky Positioning

**User Story:** As a player, I want the Attack/Defend/Status tab switcher to remain accessible while scrolling through long tab content, so that I can switch modes without scrolling back to the top.

#### Acceptance Criteria

1. WHILE combat is active on Desktop_Viewport, THE Segmented_Control SHALL have sticky positioning at the top of the viewport as the page scrolls.
2. THE Segmented_Control sticky positioning SHALL have a z-index sufficient to remain above all other page content.
3. THE Combat_Dashboard SHALL NOT be sticky on desktop viewports, allowing it to scroll away with the page while the Segmented_Control remains accessible.

### Requirement 8: Visual Separation Between Sections

**User Story:** As a player, I want clear visual boundaries between the dashboard and the tab content panels, so that the interface feels organised rather than chaotic.

#### Acceptance Criteria

1. THE Combat_Dashboard SHALL have a visible bottom border or spacing that clearly separates it from the Tab_Content_Area below.
2. EACH panel within the Tab_Content_Area SHALL have consistent vertical spacing (gap) between itself and adjacent panels.
3. THE Segmented_Control SHALL have clear visual separation from the Combat_Dashboard below it (spacing or border).
