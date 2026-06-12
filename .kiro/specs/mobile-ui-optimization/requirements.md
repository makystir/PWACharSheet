# Requirements Document

## Introduction

This feature optimizes the PWA Character Sheet for mobile phone use during tabletop gaming sessions. Players hold their phones at the table and need quick, reliable access to character data — especially during combat. The current layout works well on tablets and desktops but presents usability challenges on narrow mobile viewports (320px–428px). This specification addresses touch target sizing, information density, navigation ergonomics, typography, scroll behavior, combat-specific UX, and input handling for mobile devices.

## Glossary

- **Mobile_Viewport**: A screen width between 320px and 428px, typical of modern smartphones in portrait orientation
- **Touch_Target**: An interactive element (button, link, input) that a user taps with their finger; minimum recommended size is 44×44 CSS pixels per WCAG 2.5.5
- **Navigation_Bar**: The bottom-fixed horizontal navigation bar shown on mobile viewports, containing page section tabs
- **Combat_Dashboard**: The top-level combat status panel showing wounds, advantage, round counter, engaged state, conditions, and fortune/resolve
- **Attack_Flow**: The step-by-step guided panel for resolving weapon attacks during combat
- **Quick_Roll_Bar**: The horizontally scrollable bar of common skill buttons for rapid dice rolls during combat
- **Character_Page**: The main character data page with sub-tabs for Identity, Abilities, Gear, and Notes
- **Sub_Tab_Bar**: The horizontal tab bar within the Character_Page allowing navigation between sub-sections
- **Card_Component**: A reusable container component providing visual grouping with background, border, and padding
- **Editable_Field**: An inline-editable text or number field that toggles between display and input modes on tap
- **Picker_Modal**: A full-screen modal overlay used for selecting items (weapons, armour, spells, skills, talents) from lists
- **Collapse_Pattern**: A UI pattern where a section header is tappable to show or hide its content, reducing vertical space

## Requirements

### Requirement 1: Mobile Navigation Touch Targets

**User Story:** As a player using a phone at the table, I want navigation tabs that are easy to tap without accidentally hitting the wrong one, so that I can switch pages quickly during gameplay.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active, THE Navigation_Bar SHALL render each navigation tab with a minimum touch target height of 48 CSS pixels
2. WHILE the Mobile_Viewport is active, THE Navigation_Bar SHALL display icons at a minimum size of 22px to ensure visual legibility
3. WHILE the Mobile_Viewport is active, THE Navigation_Bar SHALL display labels at a minimum font size of 11px
4. WHILE the Mobile_Viewport is active, THE Navigation_Bar SHALL indicate the active page with a visible top border accent and distinct color differentiation from inactive tabs

### Requirement 2: Mobile Navigation Height and Spacing

**User Story:** As a player, I want the bottom navigation bar to not obscure content or feel cramped, so that I can comfortably navigate and still see important information.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active, THE Navigation_Bar SHALL use a fixed height of 64 CSS pixels to accommodate larger touch targets and labels
2. WHILE the Mobile_Viewport is active, THE PageContainer SHALL apply bottom padding equal to the Navigation_Bar height plus 8px safe area to prevent content from being hidden behind the navigation
3. WHILE the Mobile_Viewport is active, THE Navigation_Bar SHALL apply a safe-area-inset-bottom padding in addition to the 64px fixed height for devices with home gesture indicators

### Requirement 3: Character Page Sub-Tab Mobile Optimization

**User Story:** As a player, I want the character page sub-tabs to be easily tappable on my phone, so that I can quickly switch between Identity, Abilities, Gear, and Notes sections.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active, THE Sub_Tab_Bar SHALL render each tab with a minimum height of 44 CSS pixels
2. WHILE the Mobile_Viewport is active, THE Sub_Tab_Bar SHALL use a font size of at least 12px for tab labels
3. WHILE the Mobile_Viewport is active, THE Sub_Tab_Bar SHALL remain sticky at the top of the scrollable content area so that it is always accessible without scrolling back up
4. WHILE the Mobile_Viewport is active, THE Sub_Tab_Bar SHALL apply horizontal scroll behavior when tab labels would otherwise be truncated on viewports at or below 360px width

### Requirement 4: Card Component Mobile Padding

**User Story:** As a player viewing my character sheet on a phone, I want cards to use space efficiently without feeling too cramped or too wasteful, so that I can see more content while it remains readable.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active, THE Card_Component SHALL use 10px padding to maximize content area on narrow screens
2. WHILE the Mobile_Viewport is active, THE Card_Component SHALL use 8px gap between adjacent cards to maintain visual separation without excessive whitespace
3. WHILE the Mobile_Viewport is active, THE Card_Component SHALL use a border-radius of 6px to maintain visual consistency at the smaller padding

### Requirement 5: Table Layout Mobile Responsiveness

**User Story:** As a player, I want tables (characteristics, skills, talents) to be readable on my phone without excessive horizontal scrolling, so that I can quickly reference my character's stats.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active and a table has more than 4 columns, THE CharacterPage SHALL enable horizontal scroll on the table container and SHALL display a visible scroll indicator only when horizontal scrolling is enabled
2. WHILE the Mobile_Viewport is active, THE CharacterPage SHALL render table cells with a minimum font size of 13px for data values to ensure consistent readability across all interactive text elements
3. WHILE the Mobile_Viewport is active, THE CharacterPage SHALL render number input fields in tables at a minimum width of 44px and minimum height of 36px to provide adequate touch targets
4. WHILE the Mobile_Viewport is active, THE CharacterPage SHALL render dice roll buttons (🎲) at a minimum touch target size of 40×40 CSS pixels

### Requirement 6: Characteristics Table Mobile Layout

**User Story:** As a player, I want to see my characteristics clearly on mobile without squinting at tiny numbers, so that I can reference them quickly during rolls.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active, THE CharacterPage SHALL display characteristic abbreviations (WS, BS, etc.) at a minimum font size of 13px with bold weight
2. WHILE the Mobile_Viewport is active, THE CharacterPage SHALL display the current characteristic total value at a font size of at least 15px with high contrast color
3. WHILE the viewport width is below 360px, THE CharacterPage SHALL hide the Bonus column in the characteristics table to prevent overflow

### Requirement 7: Combat Dashboard Mobile Layout

**User Story:** As a player in active combat, I want the combat dashboard to show critical information prominently on my phone, so that I can track wounds, advantage, and conditions at a glance without scrolling.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active and combat is active, THE Combat_Dashboard SHALL display the wounds counter, advantage counter, and round counter in a single visible row without requiring horizontal scrolling
2. WHILE the Mobile_Viewport is active, THE Combat_Dashboard SHALL render wound adjustment buttons (+ and −) at a minimum touch target size of 44×44 CSS pixels with at least 8px gap between them to prevent accidental taps
3. WHILE the Mobile_Viewport is active, THE Combat_Dashboard SHALL display condition badges in a wrapping flow layout with each badge having a minimum height of 40px
4. WHILE the Mobile_Viewport is active, THE Combat_Dashboard SHALL display the wound count at a font size of at least 28px for immediate readability from a distance

### Requirement 8: Attack Flow Mobile Usability

**User Story:** As a player resolving an attack during combat, I want the attack flow steps to be easy to interact with on my phone, so that I can quickly select weapons, roll, and calculate damage without fumbling.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active, THE Attack_Flow SHALL display weapon selection buttons in a vertical stack layout when there are more than 2 weapons, with each button spanning full width
2. WHILE the Mobile_Viewport is active, THE Attack_Flow SHALL render the Roll button at a minimum height of 48px and full container width for easy thumb reach
3. WHILE the Mobile_Viewport is active, THE Attack_Flow SHALL display result boxes (success, failure, critical, fumble) at a minimum font size of 14px for the result header
4. WHILE the Mobile_Viewport is active, THE Attack_Flow SHALL use collapsible step sections so that completed steps collapse to conserve vertical space

### Requirement 9: Quick Roll Bar Mobile Touch Targets

**User Story:** As a player who needs to make a quick skill check during combat, I want the quick roll buttons to be easy to tap on my phone, so that I can roll without slowing down gameplay.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active, THE Quick_Roll_Bar SHALL render each skill button with a minimum height of 44px and minimum horizontal padding of 14px
2. WHILE the Mobile_Viewport is active, THE Quick_Roll_Bar SHALL support horizontal scrolling with momentum scrolling enabled and visible scroll affordance (gradient fade on edges)
3. WHILE the Mobile_Viewport is active, THE Quick_Roll_Bar SHALL display skill names at a minimum font size of 13px to match the consistent 13px minimum for all interactive text elements

### Requirement 10: Take Damage Panel Mobile Layout

**User Story:** As a player receiving damage during combat, I want to quickly input damage values and see the result on my phone, so that I can resolve hits without holding up the game.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active, THE TakeDamagePanel SHALL render the damage input field at a minimum size of 48×48 CSS pixels with a font size of at least 18px
2. WHILE the Mobile_Viewport is active, THE TakeDamagePanel SHALL render the hit location select dropdown at full container width with a minimum height of 44px
3. WHILE the Mobile_Viewport is active, THE TakeDamagePanel SHALL render the "Apply Wounds" button at full container width with a minimum height of 48px
4. WHILE the Mobile_Viewport is active, THE TakeDamagePanel SHALL display the net wounds result at a font size of at least 28px for immediate visibility

### Requirement 11: Weapon Cards Mobile Grid

**User Story:** As a player reviewing my weapons on my phone, I want weapon cards to be readable and their roll buttons easy to tap, so that I can use my weapons in combat quickly.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active, THE WeaponCards SHALL render in a single-column layout (one card per row) instead of the multi-column grid
2. WHILE the Mobile_Viewport is active, THE WeaponCards SHALL render the dice roll button at a minimum size of 48×48 CSS pixels positioned for easy thumb reach
3. WHILE the Mobile_Viewport is active, THE WeaponCards SHALL display the weapon name at a minimum font size of 14px and stat values at a minimum font size of 15px

### Requirement 12: Armour Map Mobile Layout

**User Story:** As a player checking my armour values during combat, I want the body location grid to be easy to tap on my phone, so that I can quickly see armour points for each hit location.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active, THE ArmourMap SHALL render body location cells at a minimum size of 56×56 CSS pixels to accommodate finger taps on the grid
2. WHILE the Mobile_Viewport is active, THE ArmourMap SHALL display armour point values at a font size of at least 20px within each location cell
3. WHILE the Mobile_Viewport is active, THE ArmourMap SHALL center the body grid horizontally and scale it to fill available width up to 320px maximum

### Requirement 13: Modal and Picker Mobile Optimization

**User Story:** As a player adding a weapon or spell from the picker list on my phone, I want the picker modal to be easy to browse and select from, so that I don't struggle with small tap targets in the list.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active, THE Picker_Modal SHALL expand to fill at least 95% of the viewport width and 85% of the viewport height
2. WHILE the Mobile_Viewport is active, THE Picker_Modal SHALL render each list item with a minimum height of 44px and a visible separator between items
3. WHILE the Mobile_Viewport is active, THE Picker_Modal SHALL render the search input at a minimum height of 44px with a font size of 16px to prevent iOS zoom on focus
4. WHILE the Mobile_Viewport is active, THE Picker_Modal SHALL position the close button in the top-right corner at a minimum size of 44×44 CSS pixels

### Requirement 14: Input Handling for Mobile

**User Story:** As a player editing character values on my phone, I want input fields to be appropriately sized and use the correct mobile keyboard type, so that data entry is fast and accurate.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active, THE Editable_Field SHALL render in editing mode with a minimum height of 40px and font size of 16px to prevent iOS automatic zoom
2. WHEN a number-type Editable_Field is tapped on mobile, THE Editable_Field SHALL present the numeric keyboard by using inputmode="numeric" attribute
3. WHILE the Mobile_Viewport is active, THE Editable_Field SHALL display the read-only value at a minimum font size of 14px
4. WHILE the Mobile_Viewport is active, THE Editable_Field SHALL provide a visible tap affordance (border or background change) only in its display state to indicate it is interactive, and SHALL hide the affordance when in editing mode

### Requirement 15: Typography Scaling for Mobile

**User Story:** As a player, I want text across the app to be readable on my phone without zooming, so that I can quickly scan my character sheet during play.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active, THE global stylesheet SHALL enforce a minimum body font size of 14px for content text
2. WHILE the Mobile_Viewport is active, THE global stylesheet SHALL enforce a minimum font size of 11px for labels and metadata text
3. WHILE the Mobile_Viewport is active, THE Card_Component section headers SHALL use a font size of at least 14px
4. THE global stylesheet SHALL define viewport-relative scaling for large display numbers (wound counts, advantage) using clamp() to ensure readability from 320px to 428px widths

### Requirement 16: Scroll Behavior and Nested Scroll Prevention

**User Story:** As a player scrolling through my character sheet on mobile, I want smooth, predictable scrolling without getting trapped in nested scroll areas, so that navigation feels natural.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active, THE PageContainer SHALL be the only vertical scroll container on the page (no nested vertical scrolling within cards or panels)
2. WHILE the Mobile_Viewport is active and horizontal scroll is required for tables, THE CharacterPage SHALL apply -webkit-overflow-scrolling: touch and overscroll-behavior: contain to prevent scroll chaining
3. WHILE the Mobile_Viewport is active, THE scroll-to-top button SHALL position itself above the Navigation_Bar with at least 8px clearance

### Requirement 17: Combat Mode Quick Access

**User Story:** As a player in active combat, I want the most important combat actions (roll, take damage, end turn) to be reachable with my thumb without stretching, so that I can stay in the flow of combat.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active and combat is active, THE CombatPage SHALL render the Start/End Combat button as a full-width button at the bottom of the visible content with a minimum height of 48px
2. WHILE the Mobile_Viewport is active and combat is active, THE Combat_Dashboard SHALL remain sticky at the top of the scroll area so that wounds and advantage are always visible
3. WHILE the Mobile_Viewport is active, THE CombatPage SHALL collapse non-essential panels (Ammo Tracker, Critical Wounds, Roll History) by default to reduce initial scroll depth

### Requirement 18: Editable Field Tap Target and Interaction

**User Story:** As a player tapping a field to edit it on my phone, I want a large enough tap area and clear feedback, so that I can reliably enter edit mode without frustration.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active, THE Editable_Field display state SHALL have a minimum tap target of 44px height
2. WHEN an Editable_Field enters edit mode on mobile, THE Editable_Field SHALL select all text content automatically so the player can immediately type a replacement value
3. WHEN an Editable_Field is in edit mode on mobile, THE Editable_Field SHALL dismiss the keyboard and save on blur or Enter key press

### Requirement 19: Fortune and Resolve Panel Mobile Layout

**User Story:** As a player spending Fortune or Resolve during gameplay on my phone, I want the spend buttons to be large enough to tap accurately, so that I don't accidentally spend points.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active, THE FortuneResolvePanel SHALL render spend and burn buttons with a minimum height of 40px and minimum width of 80px
2. WHILE the Mobile_Viewport is active, THE FortuneResolvePanel SHALL display the grid in a single-column stacked layout when viewport width is between 200px and 360px
3. WHILE the Mobile_Viewport is active, THE FortuneResolvePanel SHALL display current Fortune/Resolve values at a font size of at least 20px

### Requirement 20: Condition Management Mobile Usability

**User Story:** As a player managing conditions during combat on my phone, I want the condition picker to be easy to use and condition badges easy to remove, so that I can keep my status accurate.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active, THE ConditionPicker modal SHALL render condition buttons in a grid layout with a minimum of 2 columns, allowing more columns if buttons maintain a minimum size of 48px height and remain usable
2. WHILE the Mobile_Viewport is active, THE Combat_Dashboard condition badges SHALL render the remove (×) button at a minimum size of 44×44 CSS pixels with adequate spacing from adjacent badges
3. WHILE the Mobile_Viewport is active, THE ConditionPicker modal SHALL fill at least 95% viewport width and 80% viewport height for maximum readability

### Requirement 21: Grid Layout Collapse for Narrow Viewports

**User Story:** As a player viewing the Identity tab fields on a narrow phone, I want form fields to stack vertically rather than cramming into tiny columns, so that each field is readable and editable.

#### Acceptance Criteria

1. WHILE the viewport width is below 400px, THE CharacterPage gridAutoFill layout SHALL collapse to a single column (grid-template-columns: 1fr) for the Identity fields
2. WHILE the viewport width is below 400px, THE CharacterPage movementFortuneGrid SHALL collapse to a single column layout
3. WHILE the viewport width is below 400px, THE CharacterPage ambitionsGrid SHALL collapse to a single column layout
4. WHILE the viewport width is below 400px, THE CharacterPage wealthEncGrid SHALL collapse to a single column layout

### Requirement 22: Confirm Dialog Mobile Accessibility

**User Story:** As a player confirming a destructive action (delete weapon, end combat) on my phone, I want the confirm and cancel buttons to be large and clearly separated, so that I don't accidentally confirm a deletion.

#### Acceptance Criteria

1. WHILE the Mobile_Viewport is active, THE ConfirmDialog SHALL render action buttons at full container width in a vertical stack layout with a minimum height of 44px each
2. WHILE the Mobile_Viewport is active, THE ConfirmDialog SHALL display a minimum gap of 10px between the confirm and cancel buttons to prevent accidental taps
3. WHILE the Mobile_Viewport is active, THE ConfirmDialog SHALL use a font size of at least 15px for the message text
