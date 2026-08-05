# Requirements Document

## Introduction

Comprehensive UI/UX modernization of the WFRP4e Character Sheet PWA. This spec covers visual hierarchy improvements, navigation refinements, card surface hierarchy, typography updates, combat page UX flow enhancements, form input modernization, micro-interactions, empty states, color/contrast polish, and desktop layout optimizations. All changes must respect existing theme support (dark, light, high-contrast, old-guy) and maintain WCAG AA accessibility compliance (44px touch targets, prefers-reduced-motion, sufficient contrast ratios).

## Glossary

- **App**: The WFRP4e Character Sheet Progressive Web Application
- **Design_System**: The set of CSS custom properties, shared CSS modules, and reusable components (Card, SectionHeader, SubTabBar, EmptyState) that define the visual language
- **Theme_Engine**: The CSS custom property system that supports dark, light, high-contrast, and old-guy theme variants via `[data-theme]` selectors
- **Navigation_Bar**: The desktop sidebar (220px) and mobile bottom bar (48px) component that provides page-level routing
- **Card**: The reusable surface component (`Card.module.css`) providing background, border, and shadow for content grouping
- **Section_Group**: A new visual grouping concept using subtle background regions to cluster related cards
- **SubTabBar**: The existing tab-based sub-navigation component used within pages
- **Combat_Mode**: A new progressive disclosure concept dividing combat UI into Attack, Defend, and Status views
- **AttackFlow**: The existing multi-step attack resolution component with 4 sequential steps
- **CombatDashboard**: The existing combat summary panel showing wounds, advantage, conditions, and round count
- **ArmourMap**: The existing body-location-based armour display component
- **TakeDamagePanel**: The existing incoming damage calculation panel
- **PageContainer**: The layout wrapper providing max-width, padding, and scroll behavior for page content
- **Command_Palette**: The existing keyboard-triggered search/action overlay component
- **Empty_State**: The existing `EmptyState` component providing placeholder UI for sections with no data
- **Elevation_Level**: A visual depth tier defined by background color and box-shadow intensity
- **Micro_Interaction**: A small CSS animation or transition providing visual feedback on state changes
- **Step_Indicator**: A visual progress element showing the current position within a multi-step flow

## Requirements

### Requirement 1: Vertical Rhythm and Section Spacing

**User Story:** As a player, I want clear visual separation between content sections, so that I can quickly scan and locate information on the page.

#### Acceptance Criteria

1. THE Design_System SHALL define a `--section-gap` CSS custom property with a value of 24px for spacing between Card components within a page
2. THE Design_System SHALL define a `--card-gap` CSS custom property with a value of 16px for spacing between items within a Section_Group
3. WHEN a page renders multiple Section_Groups, THE PageContainer SHALL apply the `--section-gap` spacing between each Section_Group
4. THE Design_System SHALL support theme-aware spacing values so that the old-guy theme may scale spacing proportionally with its zoom factor

### Requirement 2: Section Group Visual Regions

**User Story:** As a player, I want logically related sections grouped visually, so that I can understand the information architecture at a glance.

#### Acceptance Criteria

1. THE Design_System SHALL define a Section_Group component that renders a subtle background region using `var(--bg-secondary)` behind grouped content
2. THE Section_Group SHALL apply `var(--radius-lg)` border-radius and `var(--card-gap)` internal padding
3. THE Section_Group SHALL NOT add borders, relying solely on background contrast for visual grouping
4. WHEN rendered in the high-contrast theme, THE Section_Group SHALL maintain a minimum 3:1 contrast ratio between the group background and the page background

### Requirement 3: Mobile Navigation Scrollable Tab Bar

**User Story:** As a mobile user, I want to see all navigation pages in a horizontally scrollable bar, so that I can access any page with a single swipe without opening a popover.

#### Acceptance Criteria

1. WHEN the viewport width is 767px or less, THE Navigation_Bar SHALL render all page links in a single horizontally scrollable row
2. THE Navigation_Bar SHALL remove the existing overflow popover ("More" menu) on mobile viewports
3. THE Navigation_Bar SHALL enable horizontal scroll with CSS `overflow-x: auto` and `-webkit-overflow-scrolling: touch`
4. THE Navigation_Bar SHALL maintain a minimum 44px height for each navigation item touch target
5. WHEN the active page is not visible in the viewport, THE Navigation_Bar SHALL scroll the active item into view on mount

### Requirement 4: Navigation Badge Indicators

**User Story:** As a player, I want visual indicators on navigation items when there are actionable states, so that I know where my attention is needed.

#### Acceptance Criteria

1. WHEN the character has unspent XP greater than zero, THE Navigation_Bar SHALL display a badge dot indicator on the Advancement navigation item
2. WHEN the character has active endeavours in progress, THE Navigation_Bar SHALL display a badge dot indicator on the Endeavours navigation item
3. THE badge dot SHALL be 8px diameter, positioned at the top-right corner of the navigation icon
4. THE badge dot SHALL use `var(--accent-gold)` as its background color
5. THE badge dot SHALL meet WCAG AA contrast requirements against the Navigation_Bar background in all theme variants

### Requirement 5: Desktop Sidebar Collapsible State

**User Story:** As a desktop user, I want to collapse the sidebar to icon-only mode, so that I have more horizontal space for content.

#### Acceptance Criteria

1. WHEN the viewport width is 768px or greater, THE Navigation_Bar SHALL display a collapse toggle button
2. WHEN the user activates the collapse toggle, THE Navigation_Bar SHALL transition to a 56px-wide icon-only mode with a 200ms CSS transition
3. WHILE the Navigation_Bar is in collapsed state, THE Navigation_Bar SHALL display only icons for each navigation item without text labels
4. WHILE the Navigation_Bar is in collapsed state, THE Navigation_Bar SHALL display a tooltip with the page name on hover over each icon
5. THE Navigation_Bar SHALL persist the collapsed/expanded state to localStorage so it survives page reloads
6. THE collapse toggle button SHALL meet the 44px minimum touch target size

### Requirement 6: Card Elevation Hierarchy

**User Story:** As a player, I want visual depth cues on content surfaces, so that I can distinguish primary content from secondary panels and interactive elements.

#### Acceptance Criteria

1. THE Design_System SHALL define three Elevation_Levels: `--elevation-1` (primary cards: `0 2px 8px var(--shadow)`), `--elevation-2` (secondary panels: `0 1px 3px var(--shadow)`), and `--elevation-0` (flush/flat: no shadow)
2. THE Card component SHALL use `--elevation-1` as its default box-shadow
3. THE Card component SHALL use `var(--card-bg)` background and remove explicit border styling, relying on background contrast and shadow for depth
4. WHEN a user hovers over an interactive Card, THE Card SHALL apply a translateY(-2px) transform and increase shadow to `0 4px 12px var(--shadow)` with a 150ms transition
5. WHILE the prefers-reduced-motion media query is set to reduce, THE Card SHALL NOT apply hover transform animations
6. THE Design_System SHALL maintain these elevation visuals consistently across all four theme variants

### Requirement 7: Typography Hierarchy Refinement

**User Story:** As a player, I want clear typographic hierarchy with appropriate font usage, so that headings, labels, and body text are easily distinguishable.

#### Acceptance Criteria

1. THE Design_System SHALL restrict Cinzel font usage to: the app title in Navigation_Bar, page-level headings (h1), and the character name display
2. THE SubTabBar component SHALL use Inter (var(--font-body)) for tab labels instead of Cinzel
3. THE SectionHeader component SHALL use Inter (var(--font-body)) with font-weight 600 and font-size 16px for section titles
4. THE Design_System SHALL set a minimum body text font-size of 14px for table cells and form labels (replacing the current 13px minimum)
5. THE Design_System SHALL increase `--text-muted` contrast to meet WCAG AA 4.5:1 ratio against `--card-bg` in all theme variants
6. THE Design_System SHALL apply font-weight 600 (semibold) to key data values (characteristic scores, wound counts, skill totals) and font-weight 400 (regular) to their associated labels

### Requirement 8: Combat Page Progressive Disclosure

**User Story:** As a player in combat, I want to focus on one combat activity at a time, so that the interface is not overwhelming during tense encounters.

#### Acceptance Criteria

1. WHILE combat is active, THE CombatPage SHALL present three Combat_Modes: Attack, Defend, and Status
2. THE CombatPage SHALL render a segmented control allowing the user to switch between Combat_Modes
3. WHEN the Attack mode is selected, THE CombatPage SHALL display the AttackFlow component and weapon selection
4. WHEN the Defend mode is selected, THE CombatPage SHALL display the TakeDamagePanel and ArmourMap components
5. WHEN the Status mode is selected, THE CombatPage SHALL display the CombatDashboard, conditions list, and wound tracker
6. THE segmented control SHALL meet 44px minimum touch target height on mobile
7. THE CombatPage SHALL persist the last selected Combat_Mode in component state during the combat session

### Requirement 9: Sticky Combat Dashboard

**User Story:** As a player in combat, I want to always see my key combat stats, so that I can make informed decisions without scrolling.

#### Acceptance Criteria

1. WHILE combat is active, THE CombatDashboard SHALL render in a compact sticky header format pinned to the top of the combat content area
2. THE compact CombatDashboard SHALL display: current wounds, maximum wounds, advantage count, and active condition count
3. THE compact CombatDashboard SHALL occupy no more than 56px vertical height
4. WHEN the Status Combat_Mode is selected, THE CombatDashboard SHALL render in its full expanded format instead of the compact sticky version
5. THE compact CombatDashboard SHALL use `position: sticky` with `top: 0` and `z-index: 10`

### Requirement 10: AttackFlow Step Progress Indicator

**User Story:** As a player, I want to see my progress through attack resolution steps, so that I know where I am in the flow and what comes next.

#### Acceptance Criteria

1. THE AttackFlow component SHALL display a Step_Indicator showing steps 1 through 4 (Weapon → Roll → Damage → Result)
2. THE Step_Indicator SHALL visually distinguish the current step, completed steps, and upcoming steps using color and opacity
3. THE Step_Indicator SHALL use `var(--accent-gold)` for the current step, `var(--success)` for completed steps, and `var(--text-muted)` at 50% opacity for upcoming steps
4. THE Step_Indicator SHALL render as a horizontal bar with connected segments, occupying full width of the AttackFlow container
5. WHILE the prefers-reduced-motion media query is set to reduce, THE Step_Indicator SHALL NOT animate transitions between steps

### Requirement 11: Custom Toggle Switches

**User Story:** As a player, I want clear visual toggle controls for binary combat options, so that I can quickly see and change on/off states.

#### Acceptance Criteria

1. THE Design_System SHALL provide a Toggle_Switch component for binary on/off states replacing checkbox inputs in combat forms
2. THE Toggle_Switch SHALL render as a 44px wide × 24px tall pill-shaped track with a circular knob
3. WHEN the Toggle_Switch is in the off state, THE Toggle_Switch SHALL display a `var(--bg-tertiary)` track color
4. WHEN the Toggle_Switch is in the on state, THE Toggle_Switch SHALL display a `var(--accent-gold)` track color with a 200ms color transition
5. THE Toggle_Switch SHALL meet 44px minimum touch target size on mobile
6. THE Toggle_Switch SHALL support keyboard activation via Space and Enter keys
7. THE Toggle_Switch SHALL communicate its state to assistive technology via `role="switch"` and `aria-checked`
8. WHILE the prefers-reduced-motion media query is set to reduce, THE Toggle_Switch SHALL NOT animate the knob position transition

### Requirement 12: Input Focus Animations

**User Story:** As a player, I want subtle visual feedback when I interact with form inputs, so that I can clearly see which field is active.

#### Acceptance Criteria

1. WHEN a text input or number input receives focus, THE input SHALL display a 2px border glow using `box-shadow: 0 0 0 2px var(--accent-gold)` with a 150ms transition
2. WHEN a text input or number input receives focus, THE input SHALL apply a subtle scale transform of 1.02 with a 150ms transition
3. WHILE the prefers-reduced-motion media query is set to reduce, THE input SHALL NOT apply the scale transform on focus
4. THE focus style SHALL be visible in all four theme variants with sufficient contrast

### Requirement 13: Mobile Number Stepper Buttons

**User Story:** As a mobile player, I want plus/minus stepper buttons for number inputs, so that I can adjust values quickly with taps instead of typing.

#### Acceptance Criteria

1. WHEN the viewport width is 767px or less, THE Design_System SHALL render stepper buttons (+ and −) adjacent to number input fields used in combat forms
2. THE stepper buttons SHALL meet 44px × 44px minimum touch target size
3. WHEN the user taps the + button, THE input value SHALL increment by 1
4. WHEN the user taps the − button, THE input value SHALL decrement by 1
5. THE stepper buttons SHALL respect the input's min and max attribute constraints
6. THE stepper buttons SHALL be visually styled with `var(--bg-tertiary)` background and `var(--text-primary)` color

### Requirement 14: Entrance Animations for Panels

**User Story:** As a player, I want smooth visual transitions when new content appears, so that changes feel polished and I can track what has changed.

#### Acceptance Criteria

1. WHEN a new panel or card is rendered into the DOM, THE panel SHALL apply a fade-in combined with a 8px slide-up animation over 150ms duration
2. THE entrance animation SHALL use CSS `@keyframes` with `opacity: 0, transform: translateY(8px)` as the start state
3. WHILE the prefers-reduced-motion media query is set to reduce, THE panel SHALL NOT apply entrance animations and SHALL render immediately
4. THE Design_System SHALL provide an `animate-enter` CSS class in a shared module for consistent reuse across components

### Requirement 15: Wound Counter Flash Animation

**User Story:** As a player, I want immediate visual feedback when my wound count changes, so that I notice health changes even in peripheral vision.

#### Acceptance Criteria

1. WHEN the wound count decreases (damage taken), THE wound display SHALL flash with a red background pulse (`var(--danger)` at 30% opacity) lasting 400ms
2. WHEN the wound count increases (healing), THE wound display SHALL flash with a green background pulse (`var(--success)` at 30% opacity) lasting 400ms
3. WHILE the prefers-reduced-motion media query is set to reduce, THE wound display SHALL NOT apply flash animations
4. THE flash animation SHALL not obscure the wound number readability during the animation

### Requirement 16: Advantage Counter Pulse Animation

**User Story:** As a player, I want animated feedback when my advantage changes, so that I notice this important tactical value updating.

#### Acceptance Criteria

1. WHEN the advantage count changes, THE advantage display SHALL apply a scale pulse animation (scale 1 → 1.2 → 1) over 300ms
2. THE pulse animation SHALL use `var(--accent-gold)` as a brief text color flash during the pulse
3. WHILE the prefers-reduced-motion media query is set to reduce, THE advantage display SHALL NOT apply the pulse animation

### Requirement 17: Toggle Switch Color Transitions

**User Story:** As a player, I want smooth color transitions on toggle controls, so that state changes feel responsive and polished.

#### Acceptance Criteria

1. WHEN a Toggle_Switch transitions from off to on, THE track color SHALL animate from `var(--bg-tertiary)` to `var(--accent-gold)` over 200ms using a CSS transition
2. WHEN a Toggle_Switch transitions from on to off, THE track color SHALL animate from `var(--accent-gold)` to `var(--bg-tertiary)` over 200ms
3. THE knob position SHALL animate with a 200ms `transform: translateX()` transition
4. WHILE the prefers-reduced-motion media query is set to reduce, THE Toggle_Switch SHALL change state instantly without animation

### Requirement 18: Empty State Contextual Tips

**User Story:** As a new player, I want helpful guidance when sections are empty, so that I know how to populate them with data.

#### Acceptance Criteria

1. WHEN a section has no data, THE Empty_State component SHALL display a contextual tip describing how to add content to that section
2. THE contextual tip SHALL be specific to the section context (weapons, spells, skills, retinue members, etc.)
3. THE Empty_State component SHALL display an icon relevant to the empty section's domain
4. THE contextual tip text SHALL use `var(--text-secondary)` color and 13px font-size for readability without visual dominance

### Requirement 19: What's New Changelog Panel

**User Story:** As a returning player, I want to see what changed after an app update, so that I can discover new features and improvements.

#### Acceptance Criteria

1. WHEN the app version has changed since the user's last visit, THE App SHALL display a "What's New" panel on first load
2. THE "What's New" panel SHALL display a summary of changes for the current version
3. THE "What's New" panel SHALL include a dismiss button that meets 44px minimum touch target size
4. WHEN the user dismisses the panel, THE App SHALL store the acknowledged version in localStorage
5. THE "What's New" panel SHALL NOT display again until the next version update

### Requirement 20: Semantic Color Tinting in Combat

**User Story:** As a player in combat, I want color cues that indicate the nature of combat actions, so that I can quickly distinguish attacks from defense from healing.

#### Acceptance Criteria

1. THE Design_System SHALL define semantic color tokens: `--combat-damage` (red tint from `var(--danger)`), `--combat-defense` (blue/gold tint from `var(--accent-gold)`), and `--combat-healing` (green tint from `var(--success)`)
2. WHEN displaying incoming damage results, THE AttackFlow SHALL apply a subtle `--combat-damage` background tint at 10% opacity
3. WHEN displaying defense or armour information, THE ArmourMap and TakeDamagePanel SHALL apply a subtle `--combat-defense` background tint at 10% opacity
4. WHEN displaying healing or wound recovery, THE CombatDashboard SHALL apply a subtle `--combat-healing` background tint at 10% opacity
5. THE semantic color tokens SHALL adapt appropriately across all four theme variants

### Requirement 21: Secondary Accent Color for Success States

**User Story:** As a player, I want a distinct color for positive outcomes, so that I can immediately recognize successful rolls and beneficial effects.

#### Acceptance Criteria

1. THE Design_System SHALL define a `--accent-success` color token distinct from `--success`, optimized for highlighting positive roll outcomes
2. WHEN a skill test or attack roll succeeds, THE roll result display SHALL use `--accent-success` for the result text or background
3. THE `--accent-success` token SHALL meet WCAG AA 4.5:1 contrast ratio against `--card-bg` in all theme variants

### Requirement 22: Desktop Two-Column Character Page Layout

**User Story:** As a desktop player, I want a two-column layout on the Character page, so that I can see more information without scrolling.

#### Acceptance Criteria

1. WHEN the viewport width is 1025px or greater, THE CharacterPage SHALL render in a two-column grid layout
2. THE left column SHALL contain the Characteristics table and biographical/identity information
3. THE right column SHALL contain Skills, Talents, and Gear sections
4. WHEN the viewport width is less than 1025px, THE CharacterPage SHALL revert to a single-column stacked layout
5. THE two-column layout SHALL use CSS Grid with `grid-template-columns: 1fr 1fr` and a 24px column gap

### Requirement 23: Desktop Maximum Width Increase

**User Story:** As a desktop player, I want wider content areas, so that information-dense pages have room to breathe.

#### Acceptance Criteria

1. THE PageContainer SHALL increase its max-width from 1000px to 1200px for viewports 1400px and wider
2. THE PageContainer SHALL maintain 1000px max-width for viewports between 768px and 1399px
3. THE Command_Palette overlay SHALL increase its max-width from 640px to 800px on viewports 1025px and wider

### Requirement 24: Desktop Combat Page Fixed-Scrollable Layout

**User Story:** As a desktop player in combat, I want the dashboard and conditions always visible while scrolling through attack/defense panels, so that I maintain situational awareness.

#### Acceptance Criteria

1. WHEN the viewport width is 1025px or greater AND combat is active, THE CombatPage SHALL render a two-column layout with a fixed left column and scrollable right column
2. THE fixed left column SHALL contain the CombatDashboard and Conditions panel with `position: sticky` and `top: 0`
3. THE scrollable right column SHALL contain the active Combat_Mode content (Attack, Defend, or Status panels)
4. THE fixed column SHALL occupy approximately 320px width and the scrollable column SHALL fill remaining space
5. WHEN the viewport width is less than 1025px, THE CombatPage SHALL revert to the single-column stacked layout with sticky compact CombatDashboard

### Requirement 25: Dice Roll Animation

**User Story:** As a player, I want a brief rolling animation before dice results appear, so that the experience feels tactile and engaging.

#### Acceptance Criteria

1. WHEN a dice roll is triggered, THE roll result display SHALL show a brief "rolling" animation for 300ms before revealing the result
2. THE rolling animation SHALL display a cycling number or spinning icon to indicate randomization in progress
3. WHILE the prefers-reduced-motion media query is set to reduce, THE roll result SHALL display immediately without the rolling animation
4. THE rolling animation SHALL NOT block user interaction with other UI elements during playback

### Requirement 26: Hit Location Tappable Selection

**User Story:** As a player, I want to select hit locations by tapping body regions or pill buttons, so that location selection is faster and more intuitive than a dropdown.

#### Acceptance Criteria

1. THE ArmourMap component SHALL provide tappable region buttons for each hit location (Head, Left Arm, Right Arm, Body, Left Leg, Right Leg)
2. WHEN the user taps a hit location region, THE ArmourMap SHALL select that location and communicate it to the TakeDamagePanel
3. THE tappable regions SHALL meet 44px minimum touch target size on mobile
4. THE selected hit location SHALL be visually highlighted using `var(--accent-gold)` border and 15% opacity background tint
5. THE tappable regions SHALL be keyboard accessible and include appropriate ARIA labels for each body location

### Requirement 27: Domain-Based Background Tints

**User Story:** As a player, I want subtle visual cues that indicate which domain I'm in, so that page context is reinforced by ambient color.

#### Acceptance Criteria

1. THE Design_System SHALL define domain background tint tokens: `--domain-combat` (warm red-amber at 3% opacity), `--domain-character` (neutral, no tint), `--domain-advancement` (cool blue-silver at 3% opacity)
2. WHEN the CombatPage is active, THE PageContainer background SHALL apply the `--domain-combat` tint
3. WHEN the AdvancementPage is active, THE PageContainer background SHALL apply the `--domain-advancement` tint
4. THE domain tints SHALL be defined per theme variant to ensure they remain subtle and do not reduce content readability
5. WHILE the high-contrast theme is active, THE domain tints SHALL NOT be applied to preserve maximum contrast

### Requirement 28: Font Weight Variation for Data Values

**User Story:** As a player, I want key numeric values to stand out from their labels, so that I can quickly read important stats at a glance.

#### Acceptance Criteria

1. THE Design_System SHALL apply font-weight 600 to characteristic scores, skill totals, wound counts, advantage values, and armour point values
2. THE Design_System SHALL apply font-weight 400 to labels, descriptors, and category headers associated with those values
3. THE font-weight variation SHALL be defined via CSS classes in the shared styles module for consistent reuse
4. THE font-weight contrast SHALL be visually apparent in all four theme variants
