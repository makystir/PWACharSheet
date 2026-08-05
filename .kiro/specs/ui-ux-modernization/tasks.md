# Implementation Plan: UI/UX Modernization

## Overview

Implement a comprehensive visual and interaction modernization of the WFRP4e Character Sheet PWA. The work is organized into seven phases: design system token extensions, new shared components, layout/navigation enhancements, combat page restructuring, micro-interactions, desktop layout optimizations, and integration wiring. All code uses React/TypeScript with CSS Modules, extending the existing architecture.

## Tasks

- [x] 1. Extend design system tokens and shared CSS
  - [x] 1.1 Add new CSS custom properties to `src/global.css`
    - Add spacing tokens: `--section-gap: 24px`, `--card-gap: 16px`
    - Add elevation tokens: `--elevation-0`, `--elevation-1`, `--elevation-2`
    - Add semantic combat colors: `--combat-damage`, `--combat-defense`, `--combat-healing`
    - Add `--accent-success` token with per-theme overrides meeting WCAG AA 4.5:1 against `--card-bg`
    - Add domain tint tokens: `--domain-combat`, `--domain-character`, `--domain-advancement`
    - Override all new tokens per `[data-theme]` block (dark, light, high-contrast, old-guy)
    - Set high-contrast theme domain tints to `transparent`
    - Increase `--text-muted` contrast to meet WCAG AA 4.5:1 ratio against `--card-bg` in all themes
    - _Requirements: 1.1, 1.2, 1.4, 6.1, 6.6, 7.5, 20.1, 20.5, 21.1, 21.3, 27.1, 27.4, 27.5, 28.1, 28.2_

  - [x] 1.2 Create `src/components/shared/styles/micro-interactions.module.css`
    - Define `animate-enter` keyframes (opacity 0 + translateY(8px) → opacity 1 + translateY(0), 150ms)
    - Define `wound-flash-red` keyframes (background pulse with `var(--danger)` at 30% opacity, 400ms)
    - Define `wound-flash-green` keyframes (background pulse with `var(--success)` at 30% opacity, 400ms)
    - Define `advantage-pulse` keyframes (scale 1 → 1.2 → 1, 300ms, with gold text flash)
    - Define `dice-roll` keyframes (cycling animation, 300ms)
    - All animations gated with `@media (prefers-reduced-motion: reduce)` override setting `animation: none`
    - Export CSS Module classes for each animation
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 15.1, 15.2, 15.3, 16.1, 16.2, 16.3, 25.1, 25.3_

  - [x] 1.3 Add font-weight utility classes to `src/components/shared/styles/shared.module.css`
    - Add `.dataValue` class with `font-weight: 600`
    - Add `.dataLabel` class with `font-weight: 400`
    - _Requirements: 28.1, 28.2, 28.3, 28.4_

- [x] 2. Implement new shared components
  - [x] 2.1 Create `SectionGroup` component (`src/components/shared/SectionGroup.tsx` + `SectionGroup.module.css`)
    - Render a `<section>` element with `var(--bg-secondary)` background
    - Apply `var(--radius-lg)` border-radius and `var(--card-gap)` padding
    - No borders — rely on background contrast for grouping
    - Accept `children` and optional `className` props
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 Create `ToggleSwitch` component (`src/components/shared/ToggleSwitch.tsx` + `ToggleSwitch.module.css`)
    - Render `<button role="switch" aria-checked={checked}>` with pill track (44×24px) and circular knob
    - Implement keyboard activation via Space and Enter keys
    - Apply 200ms color transition from `var(--bg-tertiary)` to `var(--accent-gold)`
    - Apply 200ms knob translateX transition
    - Gate animations behind `prefers-reduced-motion: reduce`
    - Meet 44px touch target minimum
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 17.1, 17.2, 17.3, 17.4_

  - [x] 2.3 Create `NumberStepper` component (`src/components/shared/NumberStepper.tsx` + `NumberStepper.module.css`)
    - Render only on mobile (≤767px) using `useMediaQuery` or media query
    - Wrap a number input with +/− buttons (44×44px touch targets)
    - Increment/decrement by 1, respect min/max constraints
    - Disable buttons at boundary values (reduced opacity, pointer-events none)
    - Style with `var(--bg-tertiary)` background and `var(--text-primary)` color
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x] 2.4 Create `StepIndicator` component (`src/components/combat/StepIndicator.tsx` + `StepIndicator.module.css`)
    - Render horizontal bar with connected segments, full width of container
    - Accept `steps: string[]` and `currentStep: number` (0-indexed)
    - Use `var(--accent-gold)` for current step, `var(--success)` for completed, `var(--text-muted)` at 50% for upcoming
    - Gate step transition animations behind `prefers-reduced-motion: reduce`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 2.5 Create `WhatsNewPanel` component (`src/components/shared/WhatsNewPanel.tsx` + `WhatsNewPanel.module.css`)
    - Accept `version`, `entries`, and `onDismiss` props
    - Render as modal-like overlay with changelog entries
    - 44px dismiss button
    - On dismiss, store version in `localStorage('ack-version')` with try/catch for private browsing
    - Show only when `localStorage.getItem('ack-version') !== currentVersion`
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [x] 2.6 Write unit tests for new shared components
    - Test ToggleSwitch: renders on/off states, Space/Enter activation, ARIA attributes, disabled state
    - Test NumberStepper: increment/decrement, min/max boundaries, mobile-only rendering
    - Test StepIndicator: current/completed/upcoming step rendering
    - Test WhatsNewPanel: shows on version mismatch, dismiss stores version, localStorage error handling
    - Test SectionGroup: renders children with correct CSS class
    - Create tests in `src/components/shared/__tests__/`
    - _Requirements: 2.1, 10.1, 11.1, 13.1, 19.1_

- [x] 3. Enhance Card component and input focus styles
  - [x] 3.1 Update `src/components/shared/Card.module.css` with elevation and hover styles
    - Set default `box-shadow: var(--elevation-1)`
    - Remove explicit border, rely on background contrast + shadow
    - Add hover state: `translateY(-2px)` + `box-shadow: 0 4px 12px var(--shadow)` with 150ms transition
    - Gate hover animation behind `@media (prefers-reduced-motion: no-preference)`
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 3.2 Add input focus animation styles to global CSS or shared module
    - Focus style: `box-shadow: 0 0 0 2px var(--accent-gold)` with 150ms transition
    - Focus scale: `transform: scale(1.02)` with 150ms transition
    - Gate scale transform behind `prefers-reduced-motion: reduce`
    - Ensure visibility across all theme variants
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 3.3 Write unit tests for Card elevation and input focus
    - Test Card hover classes exist and are theme-aware
    - Test input focus ring visibility
    - _Requirements: 6.4, 6.5, 12.1_

- [x] 4. Checkpoint - Design system and shared components complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Enhance Navigation component
  - [x] 5.1 Implement mobile scrollable tab bar in `src/components/layout/Navigation.tsx` + `.module.css`
    - Replace overflow popover with horizontal scroll row at ≤767px
    - Apply `overflow-x: auto` and `-webkit-overflow-scrolling: touch`
    - Maintain 44px height touch targets
    - Auto-scroll active item into view on mount via `scrollIntoView` (with feature detection)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 5.2 Implement desktop sidebar collapse in `src/components/layout/Navigation.tsx` + `.module.css`
    - Add collapse toggle button at ≥768px (44px touch target)
    - Collapsed state: 56px-wide icon-only mode with 200ms CSS transition
    - Show tooltip with page name on hover when collapsed
    - Persist collapsed state to `localStorage('nav-collapsed')` with try/catch
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 5.3 Implement navigation badge indicators in `src/components/layout/Navigation.tsx`
    - Render 8px gold badge dot on Advancement item when unspent XP > 0
    - Render 8px gold badge dot on Endeavours item when active endeavours exist
    - Position at top-right of icon, use `var(--accent-gold)`
    - Conditional render on truthy value (no error if data unavailable)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 5.4 Write tests for Navigation enhancements
    - Test mobile scroll rendering and auto-scroll behavior
    - Test collapse toggle, localStorage persistence, tooltip display
    - Test badge conditional rendering
    - Create in `src/components/layout/__tests__/`
    - _Requirements: 3.1, 4.1, 5.1_

- [x] 6. Enhance PageContainer and Typography
  - [x] 6.1 Update `src/components/layout/PageContainer.tsx` + `.module.css`
    - Apply `--section-gap` between child Section_Groups
    - Increase max-width to 1200px at ≥1400px viewport
    - Maintain 1000px max-width for 768px–1399px
    - Add `data-domain` attribute support for domain background tints
    - _Requirements: 1.3, 23.1, 23.2, 27.2, 27.3_

  - [x] 6.2 Update `src/components/shared/SubTabBar.module.css` typography
    - Switch font from `var(--font-heading)` to `var(--font-body)` for tab labels
    - _Requirements: 7.2_

  - [x] 6.3 Restrict Cinzel font usage and update SectionHeader
    - Ensure Cinzel is only used for app title, h1 page headings, and character name
    - Update `src/components/shared/SectionHeader.module.css`: Inter font-weight 600, font-size 16px
    - Set minimum body text font-size of 14px for table cells and form labels
    - _Requirements: 7.1, 7.3, 7.4_

  - [x] 6.4 Update Command Palette max-width
    - Increase `src/components/command-palette/CommandPalette.module.css` max-width to 800px at ≥1025px
    - _Requirements: 23.3_

- [x] 7. Enhance EmptyState component
  - [x] 7.1 Add contextual tips to `src/components/shared/EmptyState.tsx` + `.module.css`
    - Add `tip` prop for contextual guidance text
    - Render section-specific icons based on domain (weapons, spells, skills, etc.)
    - Style tip text with `var(--text-secondary)` at 13px
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

- [x] 8. Checkpoint - Layout, navigation, and typography complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Restructure Combat Page with progressive disclosure
  - [x] 9.1 Add segmented control and Combat_Mode state to `src/components/pages/CombatPage.tsx`
    - Add three-mode segmented control: Attack, Defend, Status
    - 44px touch target height on mobile
    - Persist selected mode in component state during session
    - Conditionally render AttackFlow (Attack), TakeDamagePanel+ArmourMap (Defend), full CombatDashboard (Status)
    - Apply `--domain-combat` background tint via `data-domain` attribute
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 9.2 Implement compact sticky CombatDashboard in `src/components/combat/CombatDashboard.tsx` + `.module.css`
    - Add `compact` prop for 56px sticky strip mode
    - Compact mode displays: current wounds, max wounds, advantage count, active conditions count
    - Use `position: sticky; top: 0; z-index: 10`
    - Render compact mode in Attack/Defend modes; full mode in Status mode
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 9.3 Add StepIndicator to `src/components/combat/AttackFlow.tsx`
    - Render StepIndicator at top with steps: ['Weapon', 'Roll', 'Damage', 'Result']
    - Connect `currentStep` to AttackFlow's internal step state
    - Apply `--combat-damage` tint on damage results section
    - _Requirements: 10.1, 20.2_

  - [x] 9.4 Enhance `src/components/combat/ArmourMap.tsx` with tappable hit locations
    - Add tappable region buttons for each hit location (Head, Left Arm, Right Arm, Body, Left Leg, Right Leg)
    - 44px touch targets, keyboard accessible
    - ARIA labels for each body location
    - Selected location highlighted with `var(--accent-gold)` border + 15% background tint
    - Communicate selection to TakeDamagePanel
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_

  - [x] 9.5 Write integration tests for combat page restructuring
    - Test mode switching renders correct sub-components
    - Test compact CombatDashboard displays correct data
    - Test StepIndicator sync with AttackFlow steps
    - Test hit location selection communicates to TakeDamagePanel
    - Create in `src/components/combat/__tests__/`
    - _Requirements: 8.1, 9.1, 10.1, 26.2_

- [x] 10. Implement micro-interactions and animations
  - [x] 10.1 Add wound counter flash to CombatDashboard
    - Detect wound count changes (decrease → red flash, increase → green flash)
    - Apply `wound-flash-red` or `wound-flash-green` animation from micro-interactions module
    - Ensure number remains readable during flash (requirement 15.4)
    - Gate behind `prefers-reduced-motion`
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 10.2 Add advantage counter pulse to CombatDashboard
    - Detect advantage value changes
    - Apply `advantage-pulse` animation (scale 1→1.2→1, 300ms) with gold text flash
    - Gate behind `prefers-reduced-motion`
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 10.3 Add dice roll animation to `src/components/shared/RollResultDisplay.tsx`
    - Show 300ms "rolling" animation (cycling number or spinning icon) before revealing result
    - Gate behind `prefers-reduced-motion` (show result immediately when reduced)
    - Do not block other UI interaction during animation
    - _Requirements: 25.1, 25.2, 25.3, 25.4_

  - [x] 10.4 Apply entrance animations to panels and cards
    - Add `animate-enter` class from micro-interactions module to newly rendered panels
    - 150ms fade-in + 8px slide-up
    - Gate behind `prefers-reduced-motion`
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 10.5 Apply `--accent-success` to successful roll results in RollResultDisplay
    - Use `--accent-success` color for positive roll outcomes
    - _Requirements: 21.2_

  - [x] 10.6 Write tests for micro-interactions
    - Test wound flash triggers on value change
    - Test advantage pulse triggers on change
    - Test dice roll animation sequence timing
    - Test `prefers-reduced-motion` suppresses all animations
    - _Requirements: 15.1, 16.1, 25.1_

- [x] 11. Checkpoint - Combat restructuring and animations complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement desktop layout enhancements
  - [x] 12.1 Add two-column grid to `src/components/pages/CharacterPage.tsx` + `.module.css`
    - At ≥1025px: CSS Grid with `grid-template-columns: 1fr 1fr` and 24px gap
    - Left column: Characteristics table, biographical/identity info
    - Right column: Skills, Talents, Gear sections
    - Below 1025px: single-column stacked layout
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

  - [x] 12.2 Add desktop two-column combat layout to `src/components/pages/CombatPage.tsx` + `.module.css`
    - At ≥1025px: fixed left column (320px, sticky) with CombatDashboard + Conditions
    - Scrollable right column with active Combat_Mode content
    - Below 1025px: single-column with sticky compact CombatDashboard
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5_

  - [x] 12.3 Write tests for desktop layouts
    - Test two-column breakpoint behavior (mock matchMedia)
    - Test sticky positioning of combat left column
    - Test CharacterPage column content distribution
    - _Requirements: 22.1, 24.1_

- [x] 13. Apply semantic color tinting to combat components
  - [x] 13.1 Apply domain tints to combat-related components
    - AttackFlow damage results: `--combat-damage` at 10% opacity
    - ArmourMap/TakeDamagePanel: `--combat-defense` at 10% opacity
    - CombatDashboard healing display: `--combat-healing` at 10% opacity
    - _Requirements: 20.2, 20.3, 20.4_

- [x] 14. Integration wiring and font-weight application
  - [x] 14.1 Apply font-weight 600 to key data values across components
    - Characteristic scores, skill totals, wound counts, advantage values, armour point values
    - Apply `.dataValue` class from shared module or inline font-weight
    - Ensure labels use font-weight 400
    - _Requirements: 7.6, 28.1, 28.2, 28.4_

  - [x] 14.2 Wire WhatsNewPanel into App component
    - Import and render WhatsNewPanel in `src/App.tsx`
    - Check localStorage version on mount, show panel on mismatch
    - Pass current version and changelog entries
    - _Requirements: 19.1, 19.4, 19.5_

  - [x] 14.3 Wire domain tints to PageContainer via page routing
    - Set `data-domain="combat"` on CombatPage
    - Set `data-domain="advancement"` on AdvancementPage
    - Set `data-domain="character"` on CharacterPage (neutral/transparent)
    - _Requirements: 27.2, 27.3_

  - [x] 14.4 Write accessibility tests
    - Test ToggleSwitch `role="switch"` and `aria-checked`
    - Test ArmourMap hit location buttons have ARIA labels
    - Test all touch targets meet 44px minimum
    - Test focus styles visible in all themes
    - Test `prefers-reduced-motion: reduce` suppresses animations
    - Test badge dot contrast meets WCAG AA
    - Test `--text-muted` contrast meets 4.5:1 against `--card-bg`
    - _Requirements: 4.5, 7.5, 11.7, 26.5_

- [x] 15. Final checkpoint - All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- No property-based tests — this feature is purely UI/UX with no algorithmic logic suitable for PBT
- Uses Vitest + @testing-library/react for unit and integration tests
- All new components follow existing patterns (CSS Module + TSX pairs in `src/components/shared/` or `src/components/combat/`)
- All animations respect `prefers-reduced-motion` media query
- All interactive elements meet 44px minimum touch targets
- localStorage operations wrapped in try/catch for private browsing compatibility
- CSS tokens are theme-aware with per-theme overrides in global.css

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5", "3.2", "6.2", "6.3"] },
    { "id": 2, "tasks": ["2.6", "3.1", "5.1", "5.2", "5.3", "6.1", "6.4", "7.1"] },
    { "id": 3, "tasks": ["3.3", "5.4", "9.1", "9.2", "12.1"] },
    { "id": 4, "tasks": ["9.3", "9.4", "10.1", "10.2", "10.3", "10.4", "10.5", "12.2"] },
    { "id": 5, "tasks": ["9.5", "10.6", "12.3", "13.1"] },
    { "id": 6, "tasks": ["14.1", "14.2", "14.3"] },
    { "id": 7, "tasks": ["14.4"] }
  ]
}
```
