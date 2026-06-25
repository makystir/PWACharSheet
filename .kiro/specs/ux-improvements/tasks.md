# Implementation Plan: UX Improvements

## Overview

This plan implements a comprehensive UX improvement pass across the WFRP 4e character sheet PWA. Tasks are organized by dependency order: foundational hooks and pure logic first, then shared components, then page-level integration, and finally cleanup and wiring. All code uses the existing TypeScript + React 19 + CSS Modules + Vite stack with no new runtime dependencies.

## Tasks

- [x] 1. Implement foundational hooks and pure logic modules
  - [x] 1.1 Create `useMediaQuery` hook in `src/hooks/useMediaQuery.ts`
    - Implement matchMedia-based reactive viewport detection
    - Return boolean that updates on media query change events
    - Include ≤100ms debounce for rapid resize events
    - Clean up listener on unmount
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 1.2 Create `useHashRoute` hook in `src/hooks/useHashRoute.ts` with pure logic in `src/logic/hash-route.ts`
    - Implement `parseHash(hash: string)` and `formatHash(page, subTab?)` pure functions
    - Hook parses hash on mount and on `hashchange` event
    - Validates page against known PageSection values, falls back to 'character'
    - Validates sub-tab against page defaults, falls back to page default sub-tab
    - Uses `history.replaceState` to avoid polluting back-button history
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [x] 1.3 Create currency parsing logic in `src/logic/currency.ts`
    - Implement `parseCurrencyInput(input: string): CurrencyDelta | null`
    - Implement `applyCurrencyDelta(current, delta): CurrencyDelta`
    - Parse tokens: optional sign, integer 0–999999, case-insensitive suffix (GC, SS, D)
    - Sum repeated denominations, clamp results to minimum 0
    - _Requirements: 5.2, 5.3, 5.4, 5.6, 5.7_

  - [x] 1.4 Create undo logic in `src/logic/undo.ts`
    - Implement pure functions for list item removal and restoration at index
    - `removeAtIndex(list, index)` and `restoreAtIndex(list, item, index)`
    - _Requirements: 4.1, 4.2_

  - [x] 1.5 Create panel state logic in `src/logic/panel-state.ts`
    - Implement `savePanelState(charId, states)` and `loadPanelState(charId): Record<string, boolean>`
    - localStorage key format: `wfrp-panelState-{charId}`
    - Graceful fallback on localStorage failure
    - _Requirements: 9.2_

  - [x] 1.6 Create help content registry in `src/logic/help-content.ts`
    - Define help entries for: Status tier, slot calculation, career advancement, Yenlui balance
    - Each entry ≤280 characters
    - Implement `getHelpContent(conceptId): string`
    - _Requirements: 6.1, 6.2_

  - [x] 1.7 Write property tests for hash-route logic
    - **Property 11: Hash routing round-trip**
    - **Validates: Requirements 14.1, 14.2**
    - Test file: `src/logic/__tests__/hash-route.property.test.ts`

  - [x] 1.8 Write property tests for currency logic
    - **Property 5: Currency input parsing**
    - **Property 6: Currency delta application with clamping**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.6, 5.7**
    - Test file: `src/logic/__tests__/currency.property.test.ts`

  - [x] 1.9 Write property tests for undo logic
    - **Property 4: Undo restores item at original index**
    - **Validates: Requirements 4.2**
    - Test file: `src/logic/__tests__/undo.property.test.ts`

  - [x] 1.10 Write property tests for panel state logic
    - **Property 9: Combat panel state persistence round-trip**
    - **Validates: Requirements 9.2**
    - Test file: `src/logic/__tests__/panel-state.property.test.ts`

  - [x] 1.11 Write property test for help content length constraint
    - **Property 7: Help content length constraint**
    - **Validates: Requirements 6.2**
    - Test file: `src/logic/__tests__/help-content.property.test.ts`

- [x] 2. Implement shared components
  - [x] 2.1 Create `SubTabBar` component at `src/components/shared/SubTabBar.tsx` with `SubTabBar.module.css`
    - Accept `tabs`, `activeTab`, `onTabChange` props
    - Active state with accent gold background and bottom border, uppercase labels
    - Sticky positioning on mobile, 44px minimum height per tab button
    - _Requirements: 13.1, 13.2, 13.4, 13.5_

  - [x] 2.2 Create `EmptyState` component at `src/components/shared/EmptyState.tsx` with `EmptyState.module.css`
    - Accept `icon` (LucideIcon), `heading`, optional `description`, optional `action`
    - Centre content with flexbox, `role="status"` on root
    - Use only CSS custom properties for theming, no hard-coded colours
    - _Requirements: 17.1, 17.2, 17.4, 17.5, 17.6_

  - [x] 2.3 Create `CurrencyInput` component at `src/components/shared/CurrencyInput.tsx` with `CurrencyInput.module.css`
    - Accept `onSubmit` callback receiving parsed `CurrencyDelta`
    - Delegate parsing to `src/logic/currency.ts`
    - Show inline validation message on invalid input
    - Max 60 character input
    - _Requirements: 5.1, 5.2, 5.5_

  - [x] 2.4 Create `HelpPopover` component at `src/components/shared/HelpPopover.tsx` with `HelpPopover.module.css`
    - Info icon button with accessible label "Help: [concept name]"
    - 44×44px minimum touch target
    - Popover positioned adjacent without obscuring related field
    - Dismissable via toggle, outside tap, or Escape key
    - Persist dismissal in localStorage keyed by hint identifier
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

  - [x] 2.5 Create `CollapsibleSection` component at `src/components/shared/CollapsibleSection.tsx` with `CollapsibleSection.module.css`
    - Accept `title`, `storageKey`, `defaultExpanded`, `children`
    - Clickable header with chevron indicator
    - Persist state to localStorage, graceful fallback on failure
    - _Requirements: 9.1, 9.2, 9.5_

  - [x] 2.6 Enhance `Toast` component with optional action button support
    - Add optional `action` prop: `{ label: string; onAction: () => void }`
    - Render action button with 44×44px touch target, accent-gold colour
    - Tapping action invokes callback, dismisses toast, cancels timer
    - Add `aria-live="assertive"` when action is present
    - Backward-compatible: no action prop = existing behaviour
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x] 2.7 Enhance `Picker` component with grouped items support
    - Add optional `getGroup` prop for grouping function
    - Render group headers with `role="group"` and `aria-label`
    - Preserve first-seen group order
    - Search filters across groups, hides empty group headers
    - No `getGroup` = existing flat list behaviour
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x] 2.8 Enhance `EditableField` with dual mode (always-editable for numeric)
    - Add `mode` prop: `'tap-to-edit' | 'always-editable'` (default: `'tap-to-edit'`)
    - `always-editable` renders native `<input type="number">` without tap-to-activate
    - On blur: invoke `onSave` with numeric value; coerce non-numeric/empty to 0
    - Preserve Enter (commit) and Escape (revert) keyboard support
    - Text fields retain tap-to-edit with visible underline affordance
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.9 Write property test for SubTabBar callback correctness
    - **Property 10: SubTabBar invokes callback with correct tab id**
    - **Validates: Requirements 13.2**
    - Test file: `src/components/shared/__tests__/SubTabBar.property.test.tsx`

  - [x] 2.10 Write property tests for Picker grouping
    - **Property 12: Picker group ordering preserves first-seen order**
    - **Property 13: Picker search filters correctly across groups**
    - **Validates: Requirements 15.1, 15.3**
    - Test file: `src/components/shared/__tests__/Picker.grouping.property.test.tsx`

  - [x] 2.11 Write property tests for EditableField numeric handling
    - **Property 2: Numeric EditableField saves correctly on blur**
    - **Property 3: EditableField keyboard commit and revert**
    - **Validates: Requirements 3.3, 3.4, 3.5**
    - Test file: `src/components/shared/__tests__/EditableField.property.test.tsx`

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement `useUndoToast` hook and integrate undo for destructive actions
  - [x] 4.1 Create `useUndoToast` hook in `src/hooks/useUndoToast.ts`
    - Manage undo pending state with 5-second timer
    - `show(message, item, index, restore)` starts timer, stores pending
    - `undo()` restores item and dismisses
    - `dismiss()` permanently discards
    - New deletion supersedes previous pending (discard old item, reset timer)
    - Cleanup timer on unmount
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 4.2 Integrate undo toast into EndeavoursPage for period and entry deletions
    - Replace ConfirmDialog with undo toast for single-item deletions only
    - Multi-item deletions (period with entries) keep ConfirmDialog
    - Restore item at original index on undo
    - _Requirements: 4.1, 4.2, 4.5_

  - [x] 4.3 Integrate undo toast into CombatPage for weapon/armour deletions
    - Single weapon or armour piece deletion uses undo toast
    - _Requirements: 4.1, 4.2_

  - [x] 4.4 Integrate undo toast into RetinuePage for companion/hireling deletions
    - Single companion or hireling deletion uses undo toast
    - _Requirements: 4.1, 4.2_

- [x] 5. Implement navigation and routing improvements
  - [x] 5.1 Integrate `useHashRoute` into App.tsx replacing `useState<PageSection>`
    - Replace `page`/`setPage` state with `useHashRoute` hook
    - Update all `onPageChange` callbacks to use `navigate`
    - Ensure sub-tab state passes through to pages
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [x] 5.2 Implement navigation overflow menu in `Navigation.tsx`
    - Mobile: show Character, Combat, Retinue, Settings + "More" button
    - "More" groups: Estate, Endeavours, Advancement
    - Overflow popover positioned above nav bar, 44×44px touch targets
    - Active overflow page shows its icon on the More button with active styling
    - Close on outside tap or selection
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 5.3 Replace all `window.innerWidth` checks with `useMediaQuery` hook
    - Update Navigation, CombatPage, Period Header components
    - Ensure reactive layout changes without page refresh
    - _Requirements: 10.6_

- [x] 6. Implement mobile character switching improvements
  - [x] 6.1 Enhance character name header in `PageContainer` for mobile
    - 44×44px minimum tap target
    - Downward chevron icon to the right of character name
    - Only shown on mobile (via `useMediaQuery`)
    - _Requirements: 1.1, 1.2_

  - [x] 6.2 Sort characters by lastModified descending in CharacterManagementSheet
    - Sort character list by `lastModified` date descending
    - Ensure close-on-backdrop-tap and swipe-to-dismiss (>50px drag) work
    - Return focus to character name header on close
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [x] 6.3 Write property test for character sort order
    - **Property 1: Character list sorted by last modified descending**
    - **Validates: Requirements 1.3**
    - Test file: `src/components/shared/__tests__/CharacterManagementSheet.property.test.ts`

- [x] 7. Implement page-level features
  - [x] 7.1 Integrate `CollapsibleSection` into CombatPage panels
    - Wrap each panel (Attack Flow, Quick Roll Bar, Take Damage, Weapons, Armour Map, Ammo Tracker, Critical Wounds, Roll History) in CollapsibleSection
    - Combat Dashboard always expanded, no collapse toggle
    - Default collapsed on mobile (no saved state): Ammo Tracker, Critical Wounds, Roll History
    - Storage key scoped to active character ID
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 7.2 Integrate `SubTabBar` into CharacterPage, EstatePage, and RetinuePage
    - Replace local sub-tab markup with shared SubTabBar
    - Remove local sub-tab CSS classes
    - Wire `onTabChange` to hash route sub-tab navigation
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 7.3 Implement Period Header layout improvement on EndeavoursPage
    - Mobile (<768px): two-row layout (primary: label, slot badge, delete; secondary: date, session, slots)
    - Desktop (≥768px): single horizontal row
    - Label truncated with ellipsis, no horizontal overflow, 4–12px vertical spacing between rows
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 7.4 Implement contextual move buttons for endeavour entries
    - Desktop: opacity 0 + pointer-events none by default, revealed on row :hover or :focus-within
    - Mobile: always visible
    - Buttons remain in DOM and tab order at all viewport widths
    - 150ms opacity CSS transition, no layout shift
    - Adjacent elements expand to fill space when buttons hidden
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [x] 7.5 Implement `CurrencyInput` integration on CharacterPage (gear/wealth sub-tab)
    - Add combined currency input component
    - Wire `onSubmit` to update character's wGC, wSS, wD fields
    - _Requirements: 5.1, 5.3, 5.6_

  - [x] 7.6 Integrate `EmptyState` component into pages with empty lists
    - EndeavoursPage: empty periods list
    - RetinuePage: empty hirelings/companions lists
    - EstatePage: empty holdings list
    - CharacterPage (gear sub-tab): empty gear list
    - _Requirements: 17.3_

  - [x] 7.7 Implement contextual help system integration
    - Add HelpPopover next to Status tier, slot calculation, career advancement, Yenlui balance
    - Add first-use banner on Endeavours page with localStorage dismissal
    - Add slots field info tooltip showing formula
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 19.4_

  - [x] 7.8 Implement status cycling discoverability on EndeavoursPage
    - First-entry tooltip explaining status cycle (dismissable, persisted)
    - Status legend above entries in each period card
    - Title attribute on status button showing current/next state
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 7.9 Implement smart slot auto-calculation for new periods
    - Auto-calculate slots from Status field on period creation
    - Parse "Gold N" → 3, "Silver N" → 2, "Brass N" → 1
    - Default to 1 with statusWarning on unrecognized status
    - Editable slots field for manual override
    - _Requirements: 19.1, 19.2, 19.3_

  - [x] 7.10 Implement session auto-increment for new periods
    - New period sessionNumber = max(existing sessionNumbers) + 1
    - "Last session: N" label in page header when sessions exist
    - Empty when no sessions set
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

  - [x] 7.11 Write property tests for slot calculation and session logic
    - **Property 14: Slot calculation from status tier**
    - **Property 15: Session number auto-increment**
    - **Property 16: Last session label displays maximum session number**
    - **Validates: Requirements 19.1, 19.2, 20.1, 20.3**
    - Test file: `src/logic/__tests__/endeavours.property.test.ts`

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Quick Actions and final integrations
  - [x] 9.1 Create `QuickActionBar` component at `src/components/shared/QuickActionBar.tsx` with `QuickActionBar.module.css`
    - Fixed position above bottom nav bar, only on mobile
    - Render configured quick actions (max 6)
    - Tap opens roll dialog pre-populated with skill name and target number
    - Hidden when no actions configured
    - _Requirements: 21.1, 21.2, 21.4, 21.5_

  - [x] 9.2 Add Quick Actions configuration UI on Settings page
    - Allow users to configure which skills appear (max 6)
    - Persist to localStorage key `wfrp-quickActions`
    - _Requirements: 21.3_

  - [x] 9.3 Integrate QuickActionBar into App.tsx
    - Render on all pages when mobile and actions configured
    - Wire onTrigger to open roll dialog
    - _Requirements: 21.1, 21.2_

  - [x] 9.4 Write property test for quick actions list cap
    - **Property 17: Quick actions list capped at maximum**
    - **Validates: Requirements 21.3**
    - Test file: `src/logic/__tests__/quick-actions.property.test.ts`

- [x] 10. Code quality cleanup
  - [x] 10.1 Remove dead CSS files (App.css, index.css)
    - Remove `src/App.css` (unused Vite scaffold styles)
    - Remove `index.css` if its custom properties duplicate those in `global.css`
    - Verify no imports reference these files
    - Verify all pages render correctly with only `global.css` as global stylesheet
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 10.2 Remove unused props from EndeavoursPage and EstatePage
    - Remove `totalWounds`, `armourPoints`, `maxEncumbrance`, `coinWeight` from EndeavoursPage props interface and function body
    - Remove same from EstatePage props interface and function body
    - Update call sites in App.tsx (stop passing unused props)
    - Verify TypeScript compiles without errors
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 11. Final integration and wiring
  - [x] 11.1 Wire Picker grouping into existing Picker usages where appropriate
    - Add `getGroup` to skill pickers, item pickers where categories exist
    - _Requirements: 15.1, 15.4_

  - [x] 11.2 Wire EditableField `mode="always-editable"` for numeric fields
    - Update wounds, advantage, currency, slot count fields to use always-editable mode
    - _Requirements: 3.1_

  - [x] 11.3 Ensure all responsive components use `useMediaQuery` hook consistently
    - Audit remaining inline viewport checks
    - Replace any remaining `window.innerWidth` checks
    - _Requirements: 10.6_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties defined in the design document
- Unit tests validate specific examples and edge cases
- All logic modules in `src/logic/` are pure functions for easy testing
- The `fast-check` library (already in devDependencies) is used for all property-based tests
- No new runtime dependencies are introduced; only existing React 19 + CSS Modules patterns are used

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "1.4", "1.5", "1.6"] },
    { "id": 1, "tasks": ["1.2", "1.7", "1.8", "1.9", "1.10", "1.11"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8"] },
    { "id": 3, "tasks": ["2.9", "2.10", "2.11", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4", "5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "6.1", "6.2"] },
    { "id": 6, "tasks": ["6.3", "7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8"] },
    { "id": 7, "tasks": ["7.9", "7.10", "7.11"] },
    { "id": 8, "tasks": ["9.1", "9.2"] },
    { "id": 9, "tasks": ["9.3", "9.4", "10.1", "10.2"] },
    { "id": 10, "tasks": ["11.1", "11.2", "11.3"] }
  ]
}
```
