# Implementation Plan: Enterprise Tracker

## Overview

Implement an enterprise (business venture) ownership and management system for the WFRP 4e character sheet PWA. The feature is gated behind a `useEnterprises` house rule toggle, stored on the Character object, and rendered as a sub-tab on the existing Estate page. Implementation covers data model changes, static template data, UI components (list/detail/create/expand/events), and integration with the existing Settings and Estate pages.

## Tasks

- [x] 1. Data model and type definitions
  - [x] 1.1 Add Enterprise types and interfaces to the Character type system
    - Add `EnterpriseType`, `EnterpriseCurrency`, `EnterpriseIncomeSource`, `Enterprise` interfaces to `src/types/character.ts`
    - Add `useEnterprises: boolean` to the `HouseRules` interface
    - Add optional `enterprises?: Enterprise[]` field to the `Character` interface
    - Add `useEnterprises: false` to `BLANK_CHARACTER` houseRules defaults
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3_

  - [x] 1.2 Create enterprise template data file
    - Create `src/data/enterprises.ts` with `EnterpriseTemplate`, `EnterpriseExpansionLevel`, `EnterpriseTemplateIncomeSource` interfaces
    - Populate all 10 enterprise templates (Courier Service, Crafting Workshop, Criminal Gang, Holy Temple, Knightly Order, Tavern, Market Parlour, Noble Estate, Performance Troupe, Publishing House) with income sources, trappings, special rules, start-up costs, min owner contribution, base interest payment, and expansion levels 2–4
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 1.3 Create enterprise events table data file
    - Create `src/data/enterprise-events.ts` with `EnterpriseEvent` and `EnterpriseEventResult` interfaces
    - Populate the d100 events table with 30+ distinct event entries covering ranges 1–100 with no gaps/overlaps
    - Include placeholder markers for ranges 55–57 and 58–60 that reference per-template alternate events
    - _Requirements: 8.2, 8.3, 8.4_

  - [x] 1.4 Write property tests for enterprise template structural validity
    - **Property 3: Enterprise template data structural validity**
    - Create `src/data/__tests__/enterprise-templates.property.test.ts`
    - Verify each template has non-empty displayName, at least one income source with required fields, at least one trapping, non-negative costs, minOwnerContribution at 10% of start-up cost, and expansion definitions for levels 2–4
    - **Validates: Requirements 4.2, 4.3, 4.4**

  - [x] 1.5 Write property tests for enterprise creation from template
    - **Property 4: Enterprise creation from template produces correct defaults**
    - Add to `src/data/__tests__/enterprise-templates.property.test.ts`
    - Verify creating an enterprise from any template produces expansionLevel 1, zero debt, empty creditorName, correct interestPayment, and level-1 income sources/trappings/specialRules
    - **Validates: Requirements 5.2**

- [x] 2. Enterprise logic and utilities
  - [x] 2.1 Create enterprise utility functions
    - Create `src/logic/enterprise-utils.ts` with helper functions:
      - `createEnterpriseFromTemplate(type: EnterpriseType, name: string): Enterprise`
      - `expandEnterprise(enterprise: Enterprise, template: EnterpriseTemplate): Enterprise`
      - `rollEnterpriseEvent(enterpriseType: EnterpriseType): EnterpriseEventResult`
      - `parseMonetaryInput(value: string): number` (returns 0 for non-numeric)
      - `clampMonetary(value: number): number` (clamps to 0–999)
      - `hasOutstandingDebt(debt: EnterpriseCurrency): boolean`
    - _Requirements: 5.2, 6.10, 7.3, 7.4, 8.1_

  - [x] 2.2 Write property tests for defaults merging
    - **Property 1: Defaults merging for missing enterprise fields**
    - Create `src/components/enterprise/__tests__/enterprise-defaults.property.test.ts`
    - Test that partial character objects missing `useEnterprises`, `enterprises`, or enterprise sub-fields resolve to correct defaults
    - **Validates: Requirements 1.3, 3.4, 3.5**

  - [x] 2.3 Write property tests for serialization round-trip
    - **Property 2: Enterprise data serialization round-trip**
    - Create `src/components/enterprise/__tests__/enterprise-serialization.property.test.ts`
    - Generate arbitrary valid characters with enterprises and verify serialize→deserialize identity
    - **Validates: Requirements 1.4, 10.3**

  - [x] 2.4 Write property tests for CRUD operations
    - **Property 5: Empty or whitespace enterprise name rejection**
    - **Property 6: Enterprise field edit round-trip**
    - **Property 7: Non-numeric monetary input sanitization**
    - **Property 13: Toggle cycle data idempotence**
    - **Property 14: Delete removes exactly one enterprise**
    - Create `src/components/enterprise/__tests__/enterprise-crud.property.test.ts`
    - **Validates: Requirements 5.4, 6.1–6.8, 6.10, 10.1, 10.2, 10.4, 11.3**

  - [x] 2.5 Write property tests for expansion logic
    - **Property 8: Expansion state transition correctness**
    - **Property 9: Debt blocks expansion**
    - Create `src/components/enterprise/__tests__/enterprise-expansion.property.test.ts`
    - **Validates: Requirements 7.3, 7.4, 7.6**

  - [x] 2.6 Write property tests for event rolling
    - **Property 10: Event roll produces valid range**
    - **Property 11: Event lookup completeness**
    - **Property 12: Alternate event resolution by enterprise type**
    - Create `src/components/enterprise/__tests__/enterprise-events.property.test.ts`
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- [x] 3. Checkpoint - Core data layer validation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Settings page integration
  - [x] 4.1 Add Enterprises toggle to the Settings page Optional Mechanics section
    - Modify `src/components/pages/SettingsPage.tsx` to add an "Enterprises" toggle in the Optional Mechanics collapsible section
    - Label: "Enterprises", description: "Track business ventures and income sources (Archives Vol. III)"
    - Toggle updates `houseRules.useEnterprises` via `updateCharacter`
    - Display ON/OFF state with appropriate color styling for the description text
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 4.2 Write unit tests for Settings page enterprise toggle
    - Create `src/components/__tests__/SettingsPage.enterprises.test.tsx`
    - Test toggle rendering, label text, ON/OFF display, toggle click behavior, and immediate state update
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 5. Enterprise UI components
  - [x] 5.1 Create EnterpriseList component with summary cards and empty state
    - Create `src/components/enterprise/EnterpriseList.tsx` and `EnterpriseList.module.css`
    - Display a list of `EnterpriseSummaryCard` components showing name, type, expansion level, debt, creditor, and interest payment
    - Show empty state with "No enterprises yet" message and "Create Enterprise" action when array is empty
    - Manage selected enterprise index state for summary↔detail navigation
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [x] 5.2 Create EnterpriseSummaryCard component
    - Create `src/components/enterprise/EnterpriseSummaryCard.tsx` and `EnterpriseSummaryCard.module.css`
    - Compact card showing enterprise name, type, expansion level (1–4), debt (gc/ss/d), creditor name, and interest payment
    - Clickable to navigate to detail view
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 5.3 Create EnterpriseDetailView component
    - Create `src/components/enterprise/EnterpriseDetailView.tsx` and `EnterpriseDetailView.module.css`
    - Full detail view with editable fields: name, creditor name, debt (gc/ss/d), interest payment (gc/ss/d), notes
    - Include back navigation to summary view
    - Persist edits immediately on blur/Enter via `updateCharacter`
    - Validate monetary inputs: non-numeric → 0, clamp 0–999
    - Truncate text fields to max lengths
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.8, 6.9, 6.10, 12.4, 12.5_

  - [x] 5.4 Create IncomeSourceEditor component
    - Create `src/components/enterprise/IncomeSourceEditor.tsx` and `IncomeSourceEditor.module.css`
    - CRUD interface for income sources (description ≤200, earningSkill ≤100, effectiveStatus ≤50)
    - Add/edit/remove individual entries, max 20
    - Disable "add" button at limit
    - _Requirements: 6.5_

  - [x] 5.5 Create trappings and special rules editors in EnterpriseDetailView
    - Add trappings list editor (add/edit/remove, max 50 entries, each ≤200 chars)
    - Add special rules list editor (add/edit/remove, max 20 entries, each ≤500 chars)
    - Disable "add" buttons at respective limits
    - _Requirements: 6.6, 6.7_

  - [x] 5.6 Create EnterpriseCreateFlow component
    - Create `src/components/enterprise/EnterpriseCreateFlow.tsx` and `EnterpriseCreateFlow.module.css`
    - Template selection interface listing all 10 enterprise types by display name
    - Name input prompt (max 100 chars) after template selection
    - Reject empty/whitespace-only names
    - Cancel at any step discards pending enterprise
    - On confirm, call `createEnterpriseFromTemplate` and persist via `updateCharacter`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 5.7 Create ExpansionPanel component
    - Create `src/components/enterprise/ExpansionPanel.tsx` and `ExpansionPanel.module.css`
    - Show current expansion level, next level's cost/contribution/interest/benefits/new trappings/new income sources
    - Confirm expansion: increment level, add template items
    - Disable if debt > 0 with "Repay all debt before expanding" indication
    - Hide/disable at level 4 with "Maximum expansion reached" indicator
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 5.8 Create EnterpriseEventRoller component
    - Create `src/components/enterprise/EnterpriseEventRoller.tsx` and `EnterpriseEventRoller.module.css`
    - "Roll Event" button that generates d100 and displays result (numeric roll, event title, description)
    - Resolve alternate events (55–57, 58–60) using the viewed enterprise's template type
    - Persist last result in component state until new roll or dismiss
    - Dismiss control to clear displayed result
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 5.9 Add delete enterprise action with confirmation
    - Add delete button to EnterpriseDetailView or summary card
    - Show confirmation prompt including enterprise name before deletion
    - On confirm, remove enterprise from array via `updateCharacter`
    - On cancel, retain enterprise unchanged
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 6. Checkpoint - Component implementation validation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Estate page integration and conditional rendering
  - [x] 7.1 Add Enterprises sub-tab to EstatePage
    - Modify `src/components/pages/EstatePage.tsx` to conditionally add an "Enterprises" sub-tab when `character.houseRules.useEnterprises === true`
    - Render `EnterpriseList` component in the Enterprises sub-tab
    - Pass `character` and `updateCharacter` props through
    - Register the sub-tab in the estate page's tab ordering system
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 7.2 Write unit tests for conditional rendering and data preservation
    - Create `src/components/enterprise/__tests__/EnterpriseList.test.tsx`
    - Test that Enterprise tab renders when toggle is ON and is absent when OFF
    - Test that toggling OFF/ON preserves data
    - Test empty state rendering and navigation to detail view
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.4_

  - [x] 7.3 Write unit tests for create flow
    - Create `src/components/enterprise/__tests__/EnterpriseCreateFlow.test.tsx`
    - Test template selection, name validation, cancel behavior
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6_

  - [x] 7.4 Write unit tests for detail view, expansion, and events
    - Create `src/components/enterprise/__tests__/EnterpriseDetailView.test.tsx`
    - Test field edit persistence, expansion UI, event roller UI
    - Create `src/components/enterprise/__tests__/EnterpriseEventRoller.test.tsx`
    - Test roll display, dismiss, alternate event resolution
    - Create `src/components/enterprise/__tests__/EnterpriseDelete.test.tsx`
    - Test delete confirmation and cancellation
    - _Requirements: 6.9, 7.1, 7.2, 7.5, 7.6, 7.7, 8.5, 8.6, 11.1, 11.2, 11.4_

- [x] 8. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific UI rendering and interaction examples
- The project uses Vitest + fast-check for testing; React Testing Library for component tests
- All components follow existing patterns: CSS Modules, `updateCharacter` mutator, lazy loading for pages

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "1.4", "1.5"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "4.1"] },
    { "id": 4, "tasks": ["4.2", "5.1", "5.2", "5.6"] },
    { "id": 5, "tasks": ["5.3", "5.4", "5.5", "5.7", "5.8", "5.9"] },
    { "id": 6, "tasks": ["7.1"] },
    { "id": 7, "tasks": ["7.2", "7.3", "7.4"] }
  ]
}
```
