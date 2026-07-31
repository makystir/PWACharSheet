# Implementation Plan: Print Layout Redesign

## Overview

Full rewrite of the `PrintLayout` component and its CSS module to produce a richly themed, multi-page printed character sheet evoking the Warhammer Old World aesthetic. The implementation installs decorative fonts, rewrites the CSS module with parchment/ornamental styling, restructures the component with conditional section rendering and page footers, and adds property-based tests for structural invariants.

## Tasks

- [ ] 1. Install font dependencies and set up imports
  - [ ] 1.1 Install @fontsource/cinzel, @fontsource/cinzel-decorative, and @fontsource/im-fell-english packages
    - Run `npm install @fontsource/cinzel @fontsource/cinzel-decorative @fontsource/im-fell-english`
    - Add font CSS imports to the top of `src/components/layout/PrintLayout.tsx`
    - _Requirements: 2.3, 3.4, 3.5_

- [ ] 2. Rewrite the CSS module with Old World theming
  - [ ] 2.1 Create the base print CSS module with @page rules and page container styles
    - Replace `src/components/layout/PrintLayout.module.css` entirely
    - Define `@page` rules for A4 (210mm × 297mm) with 15mm margins
    - Add `@page` size declaration for US Letter (216mm × 279mm) as alternative
    - Define `.printWrapper` class hidden on screen (`display: none`) and visible on print (`display: block`)
    - Define `.pageSheet` class with parchment background gradient (warm cream/tan tones with radial-gradient aging spots)
    - Add double-rule page border (3px double) with inner box-shadow for depth
    - Add `.cornerOrnament` using `::before`/`::after` pseudo-elements with Unicode glyphs (✦, ◆, ⚜) positioned absolutely
    - _Requirements: 2.1, 2.2, 2.4, 4.1, 4.5, 7.1, 7.3_

  - [ ] 2.2 Add section, typography, and decorative styles to the CSS module
    - Define `.sectionBox` class with `break-inside: avoid` and `page-break-inside: avoid`
    - Define `.sectionHeading` using Cinzel font-family at 700 weight
    - Define `.pageTitle` using Cinzel Decorative at 900 weight with text-shadow
    - Define body/data cell styles using IM Fell English at 400 weight
    - Define `.numericValue` with Cinzel bold (700) for characteristic scores, skill totals, AP values
    - Apply dark muted colour palette (deep browns `#3b2a1a`, aged golds `#8b7535`, parchment cream `#f4edd3`, iron greys `#4a4a4a`)
    - Ensure minimum contrast ratio of 4.5:1 between text and background colours
    - Define `.sectionDivider` with ornamental `border-image` or `::after` pseudo-element with decorative character row
    - Define `.heraldic` class using CSS clip-path or Unicode heraldic glyph (⚔, 🛡, ☠) — at least one per page
    - Define `.pageFooter` style for character name + generation date footer
    - Define table styles with alternating row tinting and `thead` for browser header repetition
    - Define multi-column grid for basic skills (minimum 2 columns via CSS grid)
    - _Requirements: 2.3, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 4.3, 4.4, 4.6, 6.1_

- [ ] 3. Rewrite the PrintLayout component — Page 1 (Identity & Skills)
  - [ ] 3.1 Implement the component shell, props interface, helper functions, and Page 1 structure
    - Rewrite `src/components/layout/PrintLayout.tsx` with the same `PrintLayoutProps` interface (no breaking API changes)
    - Import fonts at the top of the file
    - Implement `shouldRenderSection(character, key)` helper with all 13 section keys as per design
    - Implement `renderPageFooter(pageNum)` displaying character name and generation date
    - Render Page 1: TitleBlock (character name with heraldic glyph, subtitle), PersonalDetails table (name, species, class, career, career level, career path, status, age, height, hair, eyes), CharacteristicsTable (10-column horizontal layout with initial/advances/current stacked), StatusRow (fate/fortune, resilience/resolve, movement M/Walk/Run, wounds breakdown with SB/TB×2/WPB/Hardy/total, XP current/spent/total), SkillsGrid (basic skills in 2-column grid, advanced skills), TalentsTable (name, times taken, description), AmbitionsParty section
    - Apply corner ornaments, page border, parchment background, and footer to Page 1
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.7, 3.4, 4.6, 6.1, 6.2, 6.4, 6.6_

- [ ] 4. Rewrite the PrintLayout component — Page 2 (Combat & Equipment)
  - [ ] 4.1 Implement Page 2 with armour, weapons, trappings, wealth, and encumbrance sections
    - Render ArmourSection: armour table + compact AP by location (all six hit locations + shield in a single row)
    - Render WeaponsTable with columns: name, group, encumbrance, range/reach, damage, qualities
    - Conditionally render AmmunitionTable (when ammo array is non-empty)
    - Render TrappingsTable
    - Render WealthEncumbrance row (GC/SS/D + weapons/armour/trappings/max/total encumbrance)
    - Render Corruption/Sin section
    - Conditionally render Conditions table (when any condition has level > 0)
    - Apply decorative dividers between major sections
    - Apply corner ornaments, page border, parchment background, and footer to Page 2
    - Use `break-inside: avoid` on each section box
    - _Requirements: 1.1, 2.5, 4.2, 4.3, 6.3, 6.5_

- [ ] 5. Rewrite the PrintLayout component — Page 3+ (Optional Sections)
  - [ ] 5.1 Implement conditional optional sections with house-rule gating
    - Conditionally render Spells/Prayers section (only when `spells.length > 0`)
    - Conditionally render Companions section (only when `companions.length > 0`)
    - Conditionally render Critical Wounds table showing location, description, effects, severity (only when `criticalWounds.length > 0`)
    - Conditionally render Hirelings section showing name, role, status, characteristics, skills summary (only when `hirelings.length > 0`)
    - Conditionally render Enterprises section showing name, type, expansion level, debt, income, special rules (only when `houseRules.useEnterprises && enterprises.length > 0`)
    - Conditionally render Grudge Book section showing offence, perpetrator, restitution, type, status (only when `houseRules.useGrudgeBook && grudges.length > 0`)
    - Conditionally render Psychology Traits section showing type, target, rating (only when `houseRules.usePsychologyTracker && psychologyTraits.length > 0`)
    - Conditionally render Rituals table showing name, CN, type, description (only when `rituals.length > 0`)
    - Conditionally render Yenlui Balance showing current state (only when `houseRules.useYenlui`)
    - Conditionally render Estate section (only when `estate.name.length > 0`)
    - Conditionally render Mutations table (only when `mutations.length > 0`)
    - Apply `data-section` attributes to each section for test querying
    - Apply page break rules for multi-page overflow and footer on each page
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11_

- [ ] 6. Ensure print media isolation
  - [ ] 6.1 Verify print-only visibility and hide interactive elements
    - Ensure the `.printWrapper` class uses `display: none` by default and `@media print { display: block }`
    - Ensure no `<button>`, `<input>`, `<select>`, or `<textarea>` elements appear in the PrintLayout output
    - Ensure the PrintLayout wrapper is the sole visible content in print context (via `@media print` rules on the app shell hiding other content)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 7. Checkpoint — Verify build and basic rendering
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Update test generators and write property-based tests
  - [ ] 8.1 Extend printLayoutGenerators.ts with arbitraries for new optional section types
    - Add `arbitraryEnterprise` generator (name, type, expansionLevel, debt, incomeSources, specialRules)
    - Add `arbitraryGrudgeEntry` generator (offence, perpetrator, restitution, type, status)
    - Add `arbitraryPsychologyTrait` generator (type, target, rating)
    - Add `arbitraryCriticalWound` generator (location, description, effects, severity)
    - Add `arbitraryRitualItem` generator (name, cn, type, description)
    - Add `arbitraryHireling` generator (name, role, status, characteristics, skills)
    - Add `arbitraryHouseRules` generator (useEnterprises, useGrudgeBook, usePsychologyTracker, useYenlui booleans)
    - Add `arbitraryEstate` generator (name, location, treasury, monthlyIncome)
    - Update `arbitraryCharacter()` to include all new optional fields and houseRules
    - _Requirements: 5.1–5.11, 1.2–1.8_

  - [ ]* 8.2 Write property test: Conditional section omission (Property 1)
    - **Property 1: Conditional section omission**
    - Generate random characters with varied combinations of empty/non-empty arrays and enabled/disabled house rules
    - Assert: when visibility condition is NOT met, the `[data-section]` element for that section does NOT exist in rendered output
    - Cover all 11 conditional section rules from requirements 5.1–5.11
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11**

  - [ ]* 8.3 Write property test: Optional section data completeness (Property 2)
    - **Property 2: Optional section data completeness**
    - Generate characters with non-empty optional arrays and house rules enabled
    - Assert: for each item in the array, all required fields appear in the rendered text content
    - Covers psychology traits (type, target, rating), enterprises (name, type, expansion level), grudges (offence, perpetrator, restitution, type, status), critical wounds (location, description, effects, severity), rituals (name, CN, type, description), hirelings (name, role, status)
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.6, 1.7, 1.8**

  - [ ]* 8.4 Write property test: Page footer contains character name (Property 3)
    - **Property 3: Page footer contains character name**
    - Generate characters with non-empty names
    - Assert: every `.pageFooter` element in the rendered output contains the character's name
    - **Validates: Requirements 4.6**

  - [ ]* 8.5 Write property test: Section boxes prevent page breaks (Property 4)
    - **Property 4: Section boxes prevent page breaks**
    - Generate arbitrary characters and render the layout
    - Assert: every `.sectionBox` element has the CSS class that applies `break-inside: avoid`
    - **Validates: Requirements 4.3**

- [ ] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `printLayoutGenerators.ts` and `PrintLayout.property.test.tsx` will be updated/replaced with expanded generators and new property tests
- The component maintains the same `PrintLayoutProps` interface — no breaking changes to consuming code

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["3.1", "6.1"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["5.1"] },
    { "id": 6, "tasks": ["8.1"] },
    { "id": 7, "tasks": ["8.2", "8.3", "8.4", "8.5"] }
  ]
}
```
