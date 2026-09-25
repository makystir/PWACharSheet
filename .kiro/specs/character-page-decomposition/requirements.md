# Requirements Document

## Introduction

`src/components/pages/CharacterPage.tsx` is the largest component in the application (~2042 lines) and concentrates many independent concerns inline: a compact-mode summary, an expanded two-column desktop grid, and four sub-tabs (identity, abilities, gear, notes). It already delegates some logic to extracted units — `useCharacterEntities` (add/update/remove for advanced skills/talents/spells, trapping worn/stored/backpack flags, and the delete dispatcher), `CharacterBreakdownTooltips`, `SheetInfoButton`, and `characterConstants` (`CHAR_KEYS`/`CHAR_FULL_NAMES`) — but the majority of the markup and handler wiring still lives in the top-level file.

This feature is a **behavior-preserving maintainability refactor**. The goal is to decompose `CharacterPage.tsx` into smaller, focused, independently-testable child components and hooks **without changing any observable behavior**: rendered output, DOM structure, ARIA semantics, CSS module class usage, event behavior, accessibility, or the persisted `Character` shape must all remain identical. Every existing test — the CharacterPage tests specifically, and the full suite (~4700 tests) — must pass **without modification to any existing assertion**. Any required change to an existing test expectation signals a behavior change and must be surfaced rather than absorbed.

This is a pure structural refactor. It is expressly **not** a feature change, a visual redesign, a mechanics change, or a persistence-format change. Reduced re-render cost or bundle locality may follow naturally from smaller components, but performance improvement is a side effect, not a requirement.

## Glossary

- **CharacterPage**: The React component defined in `src/components/pages/CharacterPage.tsx` that renders a single character's sheet, including compact and expanded display modes and four sub-tabs.
- **Sub_Tab**: One of the four content areas selectable within CharacterPage — `identity`, `abilities`, `gear`, and `notes` — as typed by `CharSubTab` and enumerated by `VALID_SUBTABS`.
- **Compact_Mode**: The condensed display mode of CharacterPage (controlled by `useCompactMode`) that renders a summary of name, species/career, wounds, characteristics, and weapons instead of the full expanded grid.
- **Extraction_Seam**: A cohesive region of CharacterPage (a panel, section, sub-tab body, or handler group) that can be lifted into its own component or hook file as a self-contained unit.
- **Behavior_Preserving_Refactor**: A code change that alters internal structure only, producing byte-for-byte-equivalent observable behavior — identical rendered DOM, ARIA attributes, CSS module classes, event outcomes, and persisted data — such that all existing tests pass with their assertions unchanged.
- **Lifted_State**: State that must remain owned above an Extraction_Seam because more than one seam (or the shell) depends on it — for example the active Sub_Tab, tooltip singleton state, picker visibility flags, and `deleteTarget`. Lifted_State is passed down via props or existing hooks rather than duplicated inside extracted units.
- **Extracted_Unit**: A component or hook that results from decomposing an Extraction_Seam out of CharacterPage into its own file.
- **Update_API**: The typed single-field `update` function (`<P extends FieldPath<Character>>(field: P, value: FieldValue<Character, P>) => void`) and the `updateCharacter` mutator function, as declared on `CharacterPageProps`.
- **Calculated_Total**: Any summed or derived stat displayed in the UI (e.g. characteristic totals, wound maximum, encumbrance totals) that carries an explanatory breakdown tooltip per the project's calculated-totals rule.

## Requirements

### Requirement 1: Decompose CharacterPage into focused units

**User Story:** As a developer maintaining the app, I want CharacterPage broken into smaller focused components and hooks, so that each concern can be understood, changed, and tested in isolation.

#### Acceptance Criteria

1. THE Refactor SHALL reduce the line count of `src/components/pages/CharacterPage.tsx` such that the resulting top-level file is materially smaller than its pre-refactor size.
2. THE Refactor SHALL relocate each extracted concern into its own source file so that no single Extracted_Unit and the CharacterPage shell share one file.
3. THE Refactor SHALL produce Extracted_Units where each represents a single cohesive concern rather than multiple unrelated concerns.
4. WHERE an Extraction_Seam is extracted into an Extracted_Unit, THE Extracted_Unit SHALL be renderable or invokable in a test using only plain props or mocks, without dependency on any CharacterPage-shell-provided context or provider.
5. THE Refactor SHALL leave the CharacterPage shell responsible for composing the Extracted_Units and owning Lifted_State.

### Requirement 2: Candidate extraction seams

**User Story:** As a developer planning the decomposition, I want a concrete menu of candidate seams, so that the design phase can choose meaningful boundaries without rediscovering them.

#### Acceptance Criteria

1. THE Refactor SHALL treat the following regions of CharacterPage as candidate Extraction_Seams: (a) the Compact_Mode summary, (b) the Personal Details section including the generation panel and its age/height/hair/eyes/dwarf-alternate roll handlers, (c) the characteristics table together with the wound-maximum panel, (d) the identity Sub_Tab content, (e) the abilities Sub_Tab content covering skills, talents, and spells sections, (f) the gear Sub_Tab content covering the trappings grid, currency, drag-reorder, and long-press context menu, (g) the notes Sub_Tab content, and (h) the deposit/transfer handler `applyTransfer` as a hook.
2. THE Refactor SHALL extract at minimum the abilities Sub_Tab content (seam e) and the gear Sub_Tab content (seam f), and SHALL extract further seams as needed such that the outcome in Requirement 1 is achieved.
3. WHERE the design selects a candidate Extraction_Seam for extraction, THE Refactor SHALL extract that seam as a Behavior_Preserving_Refactor.
4. WHERE a candidate Extraction_Seam is not extracted, THE Refactor SHALL leave that seam behaving identically to its pre-refactor state.

### Requirement 3: Behavior and markup invariance

**User Story:** As a user of the character sheet, I want the sheet to look and behave exactly as before, so that a maintenance refactor is invisible to me.

#### Acceptance Criteria

1. THE Extracted_Units SHALL produce rendered DOM structure identical to the pre-refactor CharacterPage output for equivalent character input.
2. THE Extracted_Units SHALL preserve the ARIA roles, ARIA attributes, and accessible labels present in the pre-refactor output.
3. THE Extracted_Units SHALL preserve the CSS module class names applied to each rendered element.
4. WHEN a user interacts with a control in an Extracted_Unit, THE Extracted_Unit SHALL invoke the same effect and produce the same result as the pre-refactor control.
5. THE Refactor SHALL keep the persisted `Character` data shape unchanged.

### Requirement 4: Existing tests pass unmodified

**User Story:** As a developer reviewing the refactor, I want the entire existing test suite to pass without changing any assertion, so that green tests are proof the behavior did not change.

#### Acceptance Criteria

1. WHEN the full test suite is run after the Refactor, THE Test_Suite SHALL pass with every existing assertion unchanged.
2. THE Refactor SHALL NOT modify the expectations of any existing test file.
3. WHERE additional tests are warranted for an Extracted_Unit, THE Refactor SHALL add new test files rather than alter existing test expectations.
4. IF an existing test assertion must change for the Refactor to pass, THEN THE Refactor SHALL surface that change as a behavior-change red flag for review rather than silently applying it.

### Requirement 5: State ownership and re-render behavior

**User Story:** As a developer, I want shared state to stay lifted and singular, so that decomposition does not introduce duplicated state or altered re-render timing.

#### Acceptance Criteria

1. THE Refactor SHALL keep Lifted_State — including the active Sub_Tab, tooltip singleton state, picker visibility flags, and `deleteTarget` — owned by the CharacterPage shell.
2. THE Refactor SHALL pass Lifted_State and its setters into Extracted_Units via props or existing hooks.
3. THE Refactor SHALL follow the existing extraction pattern used by `useCharacterEntities`, in which setters are injected rather than re-declared inside the Extracted_Unit.
4. THE Refactor SHALL NOT duplicate any single piece of Lifted_State across more than one owner.
5. THE Refactor SHALL preserve the conditions under which re-renders occur such that observable behavior remains unchanged.

### Requirement 6: Preserve the typed update API and calculated-total tooltips

**User Story:** As a developer, I want the typed update surface and the breakdown tooltips to be preserved exactly, so that type safety and the calculated-total rule continue to hold after extraction.

#### Acceptance Criteria

1. THE Extracted_Units SHALL use the typed Update_API (`update` and `updateCharacter`) with the same signatures declared on `CharacterPageProps`.
2. THE Refactor SHALL NOT widen, weaken, or bypass the compile-time typing of the Update_API.
3. WHERE a Calculated_Total is displayed by an Extracted_Unit, THE Extracted_Unit SHALL render the same breakdown tooltip content and structure as the pre-refactor CharacterPage.
4. THE Extracted_Units SHALL continue to use the shared `Tooltip` component for Calculated_Total breakdowns.

### Requirement 7: Verification gates

**User Story:** As a developer, I want the refactor to pass all quality gates, so that I can merge it with confidence that nothing regressed.

#### Acceptance Criteria

1. WHEN the TypeScript type check is run after the Refactor, THE Type_Check SHALL report zero errors.
2. WHEN the linter is run after the Refactor, THE Linter SHALL report zero errors.
3. THE Refactor SHALL keep each Extracted_Unit component in its own file, and this structural requirement SHALL be treated as failed whenever an Extracted_Unit component is not in its own file, regardless of whether a `react-refresh/only-export-components` regression is observed.
4. WHEN the production build is run after the Refactor, THE Build SHALL complete without errors.
5. WHEN the full test suite is run after the Refactor, THE Test_Suite SHALL report all tests passing.

### Requirement 8: Non-goals and scope boundaries

**User Story:** As a reviewer, I want the scope constrained to structural change only, so that the refactor cannot smuggle in behavior, mechanics, or persistence changes.

#### Acceptance Criteria

1. THE Refactor SHALL NOT add, remove, or alter any user-facing feature or capability.
2. THE Refactor SHALL NOT change the visual design or layout of the rendered sheet.
3. THE Refactor SHALL NOT change any game-mechanics or rulebook-sourced logic.
4. THE Refactor SHALL NOT change the persisted `Character` shape or its serialization.
5. WHERE smaller components reduce re-render cost or improve bundle locality, THE Refactor SHALL treat that improvement as an incidental side effect rather than a required outcome.
