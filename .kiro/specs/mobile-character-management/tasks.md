# Implementation Plan: Mobile Character Management

## Overview

Implement a mobile-friendly character management interface for the WFRP 4e PWA. This adds a CharacterNameHeader (mobile-only) at the top of PageContainer and a CharacterManagementSheet (bottom sheet overlay) providing character switching, creation, renaming, duplication, and deletion. All data operations flow through the existing `useCharacterManager` hook. Styling uses CSS Modules, accessibility follows ARIA dialog patterns with focus trapping, and animations use CSS transitions.

## Tasks

- [x] 1. Create utility hooks for the bottom sheet
  - [x] 1.1 Create `useFocusTrap` hook
    - Create `src/hooks/useFocusTrap.ts`
    - Implement focus trapping logic: intercept Tab/Shift+Tab, wrap focus between first and last focusable elements
    - On activation, move focus to the first focusable element in the container
    - Accept a `containerRef` and `isActive` boolean parameter
    - _Requirements: 9.1, 9.2_

  - [x] 1.2 Create `useBodyScrollLock` hook
    - Create `src/hooks/useBodyScrollLock.ts`
    - Set `document.body.style.overflow = 'hidden'` when locked
    - Restore previous overflow value on cleanup/unmount
    - _Requirements: 2.5_

  - [x] 1.3 Write unit tests for `useFocusTrap`
    - Test Tab from last element wraps to first
    - Test Shift+Tab from first element wraps to last
    - Test focus moves to first element on activation
    - **Property 5: Focus trap wraps at sheet boundaries**
    - **Validates: Requirements 9.1**
    - _Requirements: 9.1, 9.2_

  - [x] 1.4 Write unit tests for `useBodyScrollLock`
    - Test body overflow set to hidden when locked
    - Test body overflow restored when unlocked
    - Test cleanup on unmount
    - _Requirements: 2.5_

- [x] 2. Implement the CharacterNameHeader component
  - [x] 2.1 Create `CharacterNameHeader` component and CSS Module
    - Create `src/components/shared/CharacterNameHeader.tsx` and `CharacterNameHeader.module.css`
    - Render a `<button>` with `role="button"` and `aria-label="Character management"`
    - Display character name truncated via CSS `text-overflow: ellipsis` with max-width for ~30 characters
    - Show ChevronDown icon from lucide-react as tappable affordance
    - Display "Unnamed Character" fallback when name is empty or whitespace-only
    - Minimum height 44px via CSS
    - Hidden on desktop via `@media (min-width: 768px) { display: none }`
    - Call `onOpen` prop when tapped
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 2.2 Write property tests for CharacterNameHeader
    - **Property 1: Empty or whitespace-only names display fallback text**
    - **Validates: Requirements 1.7**
    - Generate random whitespace strings → verify "Unnamed Character" displayed
    - Generate random non-whitespace strings → verify actual name displayed

  - [x] 2.3 Write unit tests for CharacterNameHeader
    - Test renders name with truncation class and chevron icon
    - Test calls onOpen when clicked
    - Test aria-label is "Character management"
    - Test hidden on desktop viewport (media query applied)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement the CharacterManagementSheet component
  - [x] 4.1 Create the CharacterManagementSheet shell with portal, backdrop, and animation
    - Create `src/components/shared/CharacterManagementSheet.tsx` and `CharacterManagementSheet.module.css`
    - Render via `createPortal` to `document.body`
    - Implement open/close slide-up animation with CSS transitions and backdrop fade
    - Sheet fills 60–90% viewport height
    - Include drag handle indicator at top
    - Set `role="dialog"` and `aria-label="Character management"`
    - Close on backdrop tap, swipe-down on drag handle, or Escape key
    - Return focus to `triggerRef` on close
    - Use `useFocusTrap` and `useBodyScrollLock` hooks
    - Include ARIA live region (`aria-live="polite"`) for action announcements
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 9.1, 9.2, 9.3, 9.4, 9.6_

  - [x] 4.2 Implement CharacterCard and CharacterList within the sheet
    - Render Character_List with `role="list"` sorted by `lastModified` descending
    - Each CharacterCard renders with `role="listitem"`, character name as a tappable button (full width minus action area, min-height 44px), career as secondary text
    - Active character highlighted with accent-gold border and text color
    - Action buttons (rename, duplicate, delete) each 44×44px minimum with accessible names including action type and character name
    - Delete button styled with danger color
    - Display "No characters saved" message when list is empty
    - Character_Card min-height 56px
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.3, 6.1, 7.1, 8.1, 9.5_

  - [x] 4.3 Write property tests for CharacterList sort order
    - **Property 2: Character list is sorted by most recently modified first**
    - **Validates: Requirements 3.1**
    - Generate random arrays of CharacterSummary with varying lastModified timestamps
    - Verify rendered order matches strictly descending lastModified

  - [x] 4.4 Write property tests for accessible action button names
    - **Property 6: Action button accessible names include action type and character name**
    - **Validates: Requirements 9.5**
    - Generate random character names (including special characters)
    - Verify each action button label contains the action word and the character name

- [x] 5. Implement character actions within the sheet
  - [x] 5.1 Implement character switch action
    - Tapping a non-active CharacterCard name calls `onSwitchCharacter` and closes the sheet
    - Tapping the active CharacterCard name closes the sheet without switching
    - If switch fails (target not found), show error message in sheet, remain open
    - Announce switch result via ARIA live region
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 9.6_

  - [x] 5.2 Implement inline rename action
    - Tapping rename button enters inline edit mode: replace name with text input pre-filled with current name, auto-focused
    - Input has `maxLength={50}` and `font-size: 16px` (prevents iOS zoom)
    - Enter key or confirm button with trimmed 1–50 char value → save trimmed name, exit edit mode
    - Blur with valid trimmed value → save trimmed name, exit edit mode
    - Blur with empty/whitespace value → cancel rename, restore original name
    - Escape key → cancel rename, restore original name
    - Announce rename result via ARIA live region
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 9.6_

  - [x] 5.3 Write property tests for rename validation
    - **Property 3: Rename validation accepts trimmed values of 1–50 characters**
    - **Validates: Requirements 6.3, 6.4, 6.6**
    - Generate random strings of varying lengths including whitespace
    - Verify trimmed 1–50 chars → saved as trimmed; empty/whitespace → cancelled

  - [x] 5.4 Implement duplicate action
    - Tapping duplicate button invokes `onDuplicateCharacter`, new character name = original + " (Copy)"
    - Refresh list and scroll newly created card into view
    - If duplicate fails, display error message, leave list unchanged
    - Announce duplication result via ARIA live region
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 9.6_

  - [x] 5.5 Write property tests for duplicate naming
    - **Property 4: Duplicate character name is original name with " (Copy)" appended**
    - **Validates: Requirements 7.2**
    - Generate random character names
    - Verify new name = original + " (Copy)"

  - [x] 5.6 Implement delete action with confirmation
    - Tapping delete button opens ConfirmDialog with character name in message
    - Confirm → delete character, refresh list, sheet stays open
    - If deleted character was active and others remain → switch to first in updated list
    - If deleted character was active and none remain → close sheet, show welcome screen
    - Cancel → close dialog, list unchanged
    - Move focus to next card after deletion (next card, or previous if last, or New Character button if none remain)
    - Announce deletion result via ARIA live region
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.6, 9.7_

  - [x] 5.7 Write property tests for focus after deletion
    - **Property 7: Focus moves to correct element after card deletion**
    - **Validates: Requirements 9.7**
    - Generate lists of varying length, delete at varying positions
    - Verify focus lands on correct element per position rules

  - [x] 5.8 Implement "New Character" button
    - Render below Character_List (or in place of list when empty), full width, min-height 48px
    - Styled with accent-gold border and text color
    - Tapping closes sheet, opens CharacterWizard
    - If wizard cancelled, reopen sheet with list unchanged
    - Announce creation result via ARIA live region
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 9.6_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integrate components into existing layout
  - [x] 7.1 Wire CharacterNameHeader into PageContainer
    - Add CharacterNameHeader as the first child inside PageContainer
    - Pass current character name from `useCharacterManager` context
    - Connect `onOpen` to open the CharacterManagementSheet
    - Store a ref to the header button for focus return
    - _Requirements: 1.1, 1.3_

  - [x] 7.2 Wire CharacterManagementSheet into the app
    - Render CharacterManagementSheet at the app level (sibling to PageContainer)
    - Pass `characters`, `activeId`, and all action callbacks from `useCharacterManager`
    - Pass `triggerRef` for focus return on close
    - Handle the create flow: close sheet → open wizard → on cancel reopen sheet
    - _Requirements: 2.1, 4.1, 5.2, 5.3_

  - [x] 7.3 Write integration tests for character management flows
    - Test full flow: open sheet → switch character → verify page updates
    - Test full flow: open sheet → create via wizard → verify new character in list
    - Test full flow: open sheet → delete active character → verify switch to next
    - _Requirements: 4.1, 5.2, 8.4_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All components use CSS Modules consistent with the existing project
- The `useCharacterManager` hook provides all data operations — no new storage layer needed
- `fast-check` is already in devDependencies for property-based tests
- Testing framework: vitest with @testing-library/react

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1"] },
    { "id": 1, "tasks": ["1.3", "1.4", "2.2", "2.3"] },
    { "id": 2, "tasks": ["4.1"] },
    { "id": 3, "tasks": ["4.2"] },
    { "id": 4, "tasks": ["4.3", "4.4", "5.1", "5.2", "5.4", "5.6", "5.8"] },
    { "id": 5, "tasks": ["5.3", "5.5", "5.7"] },
    { "id": 6, "tasks": ["7.1", "7.2"] },
    { "id": 7, "tasks": ["7.3"] }
  ]
}
```
