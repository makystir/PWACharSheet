# Implementation Plan: UX Polish Improvements

## Overview

Implement 12 UX polish improvements for the WFRP4e PWA Character Sheet covering smooth animations, form validation, undo support, contextual help, long-press menus, compact/expanded mode, color contrast fixes, splash screen, and Old Guy Mode rendering improvements. All code uses React 19/TypeScript with CSS Modules, leveraging existing architecture. Property-based tests use fast-check and vitest.

## Tasks

- [x] 1. Refactor CollapsibleSection height animation
  - [x] 1.1 Replace max-height transition with CSS Grid animation in `src/components/shared/CollapsibleSection.module.css`
    - Replace `max-height: 2000px` transition with `display: grid; grid-template-rows: 0fr` (collapsed) and `grid-template-rows: 1fr` (expanded)
    - Add `transition: grid-template-rows 200ms ease` to the content wrapper
    - Add inner wrapper with `overflow: hidden` to prevent content visibility during transition
    - Add `@media (prefers-reduced-motion: reduce)` rule setting `transition-duration: 0s`
    - Preserve existing keyboard accessibility (Enter/Space to toggle, focus-visible outline)
    - Update the component TSX to use `data-expanded` attribute for styling
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Write unit tests for CollapsibleSection animation refactor
    - Test that `data-expanded="true"` applies `grid-template-rows: 1fr` class
    - Test that `data-expanded="false"` applies `grid-template-rows: 0fr` class
    - Test that inner wrapper has `overflow: hidden`
    - Test keyboard toggle (Enter/Space) still functions
    - Create in `src/components/shared/__tests__/CollapsibleSection.animation.test.tsx`
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 2. Implement page transition animations
  - [x] 2.1 Create `PageTransition` component (`src/components/shared/PageTransition.tsx` + `PageTransition.module.css`)
    - Accept `pageKey: string` and `children: ReactNode` props
    - On `pageKey` change, apply crossfade: outgoing content fades to `opacity: 0`, incoming fades to `opacity: 1`
    - Transition duration: 200ms ease
    - Use `useRef` to track previous page key and `requestAnimationFrame` for coordination
    - Cancel in-progress transitions on rapid navigation (immediately set incoming state)
    - Add `@media (prefers-reduced-motion: reduce)` rule setting duration to 0ms
    - Ensure no layout shift or scroll position jumps during transition
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.2 Wire `PageTransition` into `src/components/layout/PageContainer.tsx`
    - Wrap page content with `PageTransition` component
    - Pass current route/page identifier as `pageKey`
    - _Requirements: 2.1, 2.4_

  - [x] 2.3 Write unit tests for PageTransition
    - Test crossfade class application on page key change
    - Test cancellation behavior on rapid navigation
    - Test reduced-motion renders immediately without animation
    - Create in `src/components/shared/__tests__/PageTransition.test.tsx`
    - _Requirements: 2.1, 2.3, 2.5_

- [x] 3. Implement form validation error states in EditableField
  - [x] 3.1 Add validation logic and error UI to `src/components/shared/EditableField.tsx`
    - Add `required?: boolean` prop to the component interface
    - For `type="number"`: detect non-numeric input via `!Number.isFinite(Number(value))`, set error "Must be a number"
    - For `required=true`: on blur with empty trimmed value, set error "Required"
    - Render error state: red border using `--danger` color, inline error message below input
    - Clear error immediately on `onChange` when input becomes valid
    - Never call `onSave` with invalid values
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 3.2 Add accessibility attributes for validation errors in `EditableField`
    - Add `aria-invalid="true"` on input when in error state
    - Render error message in `<span>` with unique ID and `role="alert"`
    - Add `aria-describedby` on input referencing the error message span ID
    - _Requirements: 3.4_

  - [x] 3.3 Write property test: Non-numeric input detection (Property 1)
    - **Property 1: Non-numeric input detection**
    - **Validates: Requirements 3.1, 3.5**
    - Generate arbitrary strings that cannot be parsed as finite numbers
    - Assert error state is displayed and `onSave` is NOT called
    - Create in `src/components/shared/__tests__/EditableField.validation.property.test.tsx`

  - [x] 3.4 Write property test: Error clearance on valid input (Property 2)
    - **Property 2: Error clearance on valid input**
    - **Validates: Requirements 3.3**
    - Start with EditableField in error state, then provide valid input
    - Assert error state is removed immediately on the change event
    - Create in `src/components/shared/__tests__/EditableField.validation.property.test.tsx`

  - [x] 3.5 Write property test: Invalid values never saved to store (Property 10)
    - **Property 10: Invalid values never saved to store**
    - **Validates: Requirements 3.5**
    - Generate arbitrary invalid inputs (non-numeric for number fields, empty for required fields)
    - Assert `onSave` callback is never invoked for any invalid input
    - Create in `src/components/shared/__tests__/EditableField.validation.property.test.tsx`

- [x] 4. Implement undo support for edits
  - [x] 4.1 Create `useUndoStack` hook (`src/hooks/useUndoStack.ts`)
    - Implement `UndoEntry` interface with `field`, `previousValue`, `newValue`, `timestamp`
    - Expose `push`, `undo`, `canUndo`, and `clear` methods
    - Default max stack size of 10 entries (configurable via `maxSize` param)
    - Oldest entries evicted when stack exceeds `maxSize`
    - _Requirements: 4.1, 4.2_

  - [x] 4.2 Wire undo stack into character update flow
    - Wrap the `update` function in `useCharacter` at the `AppWithCharacter` level to push entries before applying
    - Add global `keydown` listener for Ctrl+Z / Cmd+Z (only fires when `document.activeElement` is not input/textarea/contenteditable)
    - On undo, call `update` with `previousValue` for the stored `field`
    - Show toast notification: "Reverted {fieldLabel} to {value}"
    - Clear undo stack on character switch (listen to `characterId` change)
    - If no undo history, take no action on Ctrl+Z
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.3 Write property test: Undo reverts most recent change (Property 3)
    - **Property 3: Undo reverts most recent change**
    - **Validates: Requirements 4.1**
    - Generate arbitrary sequences of field edits, perform undo
    - Assert the most recently changed field returns to its previous value
    - Create in `src/hooks/__tests__/useUndoStack.property.test.ts`

  - [x] 4.4 Write property test: Undo stack capacity invariant (Property 4)
    - **Property 4: Undo stack capacity invariant**
    - **Validates: Requirements 4.2**
    - Generate N edits (N > 10), assert stack contains exactly `min(N, maxSize)` entries
    - Performing undo `min(N, maxSize)` times reverts to the expected state
    - Create in `src/hooks/__tests__/useUndoStack.property.test.ts`

- [x] 5. Checkpoint - Core interactions complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement escape-to-revert hint in EditableField
  - [x] 6.1 Add escape-to-revert hint UI to `src/components/shared/EditableField.tsx`
    - After entering edit mode, show "Esc to revert" hint after 1-second delay via `setTimeout`
    - Render hint as `<span>` with muted styling below the input
    - Hide hint when field exits edit mode (save, blur, or escape)
    - Track escape usage in a module-level `Map<string, number>` (session counter)
    - Suppress hint after user has used Escape 3+ times in the current session
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 6.2 Write unit tests for escape-to-revert hint
    - Test hint appears after 1-second delay
    - Test hint disappears on exit
    - Test hint suppression after 3 escape uses
    - Create in `src/components/shared/__tests__/EditableField.escHint.test.tsx`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Implement consistent empty state usage
  - [x] 7.1 Audit and add EmptyState to all list sections
    - Add `EmptyState` component usage in: Talents, Trappings, Spells, Prayers, Weapons, Armour, Injuries, Diseases, Corruption, Mutations, Session Notes
    - Each EmptyState includes contextual icon (from `lucide-react`), heading, description, and action button where applicable
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 7.2 Write integration tests for empty states
    - Test that each listed section renders EmptyState when data is empty
    - Test that action buttons trigger the add flow
    - Create in `src/components/__tests__/EmptyStates.integration.test.tsx`
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 8. Implement contextual help tooltips
  - [x] 8.1 Add HelpPopover instances to complex features
    - Add `HelpPopover` (question mark icon) next to: Advantage tracking, Corruption/Mutation mechanics, Channelling, Overcast allocation, Fortune/Resolve spending
    - Each tooltip contains a brief explanation (max 2 sentences)
    - Use existing `HelpPopover` component with `localStorage` dismissal persistence
    - After 3 dismissals per tooltip, stop showing it automatically (icon still triggers it)
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 9. Implement long-press contextual menu for mobile
  - [x] 9.1 Create `useLongPress` hook (`src/hooks/useLongPress.ts`)
    - Return `onTouchStart`, `onTouchEnd`, `onTouchMove` handlers
    - Start 500ms timer on `touchstart`; clear on `touchend` (before threshold) or `touchmove` (>10px)
    - Fire `onLongPress` callback with original event when timer completes
    - Only register handlers if `'ontouchstart' in window` (no desktop registration)
    - _Requirements: 8.1, 8.4, 8.6_

  - [x] 9.2 Create `ContextualMenu` component (`src/components/shared/ContextualMenu.tsx` + `ContextualMenu.module.css`)
    - Accept `x`, `y`, `items[]`, and `onDismiss` props
    - Position with `position: fixed` at touch coordinates
    - Measure menu DOM element on mount, clamp to viewport bounds
    - Dismiss on click/tap outside, Escape key, or `popstate` event
    - Call `navigator.vibrate?.(10)` on mount for haptic feedback
    - Items include: Edit, Delete, Move (reorder)
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [x] 9.3 Wire long-press to trapping/weapon cards
    - Attach `useLongPress` handlers to trapping card and weapon card components
    - On long-press, show `ContextualMenu` with Edit, Delete, and Move options
    - Wire each menu action to existing edit/delete/reorder functionality
    - _Requirements: 8.1_

  - [x] 9.4 Write property test: Long-press threshold discrimination (Property 5)
    - **Property 5: Long-press threshold discrimination**
    - **Validates: Requirements 8.1, 8.4**
    - Generate arbitrary touch durations and movement distances
    - Assert menu appears if and only if duration >= 500ms AND movement <= 10px
    - Create in `src/hooks/__tests__/useLongPress.property.test.ts`

  - [x] 9.5 Write property test: Contextual menu viewport containment (Property 6)
    - **Property 6: Contextual menu viewport containment**
    - **Validates: Requirements 8.2**
    - Generate arbitrary (x, y) coordinates and menu dimensions
    - Assert final position is fully contained within viewport boundaries
    - Create in `src/components/shared/__tests__/ContextualMenu.property.test.tsx`

- [x] 10. Checkpoint - Touch interactions and contextual features complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement compact/expanded mode toggle
  - [x] 11.1 Create `useCompactMode` hook (`src/hooks/useCompactMode.ts`)
    - Return `mode: 'compact' | 'expanded'` and `toggle()` function
    - Persist to `localStorage` under key `wfrp-display-mode`
    - Default to `'expanded'`
    - Wrap localStorage access in try/catch for private browsing
    - _Requirements: 9.4_

  - [x] 11.2 Add compact/expanded toggle to Character page
    - Add a toggle button/switch in the Character page header area
    - In compact mode: display only character name, species, career, current/max wounds, key characteristics as single row, equipped weapons summary
    - In expanded mode: display all character details as currently shown
    - Animate mode transition using `grid-template-rows` technique (same as CollapsibleSection)
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

  - [x] 11.3 Write property test: Display mode persistence round-trip (Property 9)
    - **Property 9: Display mode persistence round-trip**
    - **Validates: Requirements 9.4**
    - Generate arbitrary mode values ("compact" or "expanded")
    - Write to localStorage, read back, assert same value
    - Create in `src/hooks/__tests__/useCompactMode.property.test.ts`

  - [x] 11.4 Write unit tests for compact mode
    - Test toggle switches between modes
    - Test compact mode renders only summary fields
    - Test expanded mode renders full details
    - Test localStorage persistence and restoration
    - Create in `src/components/pages/__tests__/CharacterPage.compactMode.test.tsx`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 12. Fix WCAG AA color contrast for muted text
  - [x] 12.1 Update `--text-muted` values in `src/global.css`
    - Dark theme: change `--text-muted` from `#908070` to `#a89880` (achieves ~5.0:1 against #121212, ~4.5:1 against #1e1e1e)
    - Old Guy theme: update `--text-muted` to `#a89880` for consistency
    - Audit and fix light theme and high-contrast theme `--text-muted` values for WCAG AA compliance
    - Audit all other text color variables (`--text-primary`, `--text-secondary`, `--parchment`) against their backgrounds
    - Fix any variable below 4.5:1 contrast ratio
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 12.2 Write property test: WCAG AA contrast for text-muted (Property 7)
    - **Property 7: WCAG AA contrast compliance for text-muted**
    - **Validates: Requirements 10.1, 10.2, 10.3**
    - For each theme, compute contrast ratio of `--text-muted` against `--bg-primary` and `--card-bg`
    - Assert all ratios >= 4.5:1
    - Create in `src/__tests__/contrast.property.test.ts`

  - [x] 12.3 Write property test: All text colors meet WCAG AA (Property 8)
    - **Property 8: All text colors meet WCAG AA contrast**
    - **Validates: Requirements 10.4**
    - For each text color variable in each theme, compute contrast ratio against typical backgrounds
    - Assert all ratios >= 4.5:1
    - Create in `src/__tests__/contrast.property.test.ts`

- [x] 13. Implement splash screen for initial app load
  - [x] 13.1 Add splash screen HTML/CSS to `index.html`
    - Add inline `<div id="splash">` with app icon (inline SVG), app name text, and pulse loader animation
    - Style with inline CSS using `var(--bg-primary)` and `var(--parchment)` with dark theme fallback values
    - Ensure no external resource dependencies (renders within 100ms of HTML parse)
    - Respect stored theme via existing `data-theme` attribute on `<html>`
    - Add `pointer-events: none` as fallback safety
    - _Requirements: 11.1, 11.2, 11.4, 11.5_

  - [x] 13.2 Add splash screen removal logic in `src/main.tsx`
    - After React mounts first meaningful content, fade out splash (`opacity: 0` transition 300ms)
    - Remove splash element from DOM after fade completes
    - Add 2-second fallback timeout to force-remove if transition fails
    - _Requirements: 11.3_

  - [x] 13.3 Write unit tests for splash screen removal
    - Test that splash element is removed after React mount
    - Test fallback timeout removes splash
    - Create in `src/__tests__/splash.test.ts`
    - _Requirements: 11.3_

- [x] 14. Replace zoom with transform scale in Old Guy Mode
  - [x] 14.1 Update Old Guy Mode CSS in `src/global.css`
    - Replace `zoom: 1.2` on `#root` with `transform: scale(1.2)` on a wrapper container
    - Apply `transform-origin: top left`
    - Set `width: calc(100% / 1.2)` (83.33%) to prevent horizontal overflow
    - Set `min-height: calc(100vh / 1.2)` for full viewport coverage
    - Ensure no subpixel rendering artifacts (GPU compositing for sharp text)
    - Verify touch targets remain >= 44px CSS pixels after scaling
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 14.2 Write unit tests for Old Guy Mode scaling
    - Test transform scale CSS is applied when old-guy theme is active
    - Test container dimensions are adjusted for scale factor
    - Test no unexpected scrollbars appear
    - Create in `src/__tests__/oldGuyMode.test.ts`
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 15. Final checkpoint - All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests use `fast-check` (already in devDependencies) with `vitest`
- Each property test runs a minimum of 100 iterations
- All new components follow existing patterns (CSS Module + TSX pairs)
- All animations respect `prefers-reduced-motion` media query
- All interactive elements meet 44px minimum touch targets
- localStorage operations wrapped in try/catch for private browsing compatibility
- No new runtime dependencies — uses existing React 19, CSS Modules, and lucide-react

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "12.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1", "4.1", "11.1", "13.1", "14.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "3.3", "3.4", "3.5", "4.2", "6.1", "11.2", "13.2", "14.2"] },
    { "id": 3, "tasks": ["2.3", "4.3", "4.4", "6.2", "7.1", "8.1", "9.1", "11.3", "11.4", "12.2", "12.3", "13.3"] },
    { "id": 4, "tasks": ["7.2", "9.2", "9.4"] },
    { "id": 5, "tasks": ["9.3", "9.5"] }
  ]
}
```
