# Implementation Plan: Spell Damage Clarity

## Overview

Enhance the spell damage display with clear formatting functions and UI updates. Pure formatting functions (`formatDamageBreakdown`, `formatCastDamageBreakdown`) are added to `src/logic/spell-casting.ts`, then wired into `SpellCastingPanel` (effect cell annotation + tooltip) and `CastResultDisplay` (breakdown in magic missile section). Property-based tests validate arithmetic correctness using fast-check.

## Tasks

- [x] 1. Implement formatting utility functions
  - [x] 1.1 Implement `formatDamageBreakdown` in `src/logic/spell-casting.ts`
    - Add the exported function that takes a `SpellItem`, `wpBonus`, and `tbBonus`
    - Use `isMagicMissile` to guard — return `null` for non-magic-missile spells
    - Parse effect text to detect "Dmg +N", "Dmg WPB", "Dmg TB" patterns
    - Return formatted string: "Dmg: N + SL", "Dmg: WPB(X) + SL", or "Dmg: TB(X) + SL"
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Implement `formatCastDamageBreakdown` in `src/logic/spell-casting.ts`
    - Add the exported function that takes `damageModifier`, `castingSL`, and optional `overcastBonus`
    - Return "M + SL(X) = T" when no overcast (T = M + X)
    - Return "M + SL(X) + Overcast(Y) = T" when overcast > 0 (T = M + X + Y)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 1.3 Write property test for `formatDamageBreakdown` (modifier resolution)
    - **Property 1: Damage formula formatting resolves correct modifier**
    - Generate arbitrary spell effect strings matching "Dmg +N", "Dmg WPB", "Dmg TB" patterns and random valid bonus values
    - Assert returned string matches "Dmg: <resolved_value> + SL" with correct resolved value
    - Test file: `src/logic/__tests__/spell-damage-clarity.property.test.ts`
    - **Validates: Requirements 1.2, 1.3, 1.4**

  - [x] 1.4 Write property test for `formatDamageBreakdown` (null for non-missiles)
    - **Property 2: Non-magic-missile spells produce no breakdown**
    - Generate arbitrary spell effect strings that do NOT contain "dmg", "damage", or "magic missile"
    - Assert `formatDamageBreakdown` returns `null`
    - Test file: `src/logic/__tests__/spell-damage-clarity.property.test.ts`
    - **Validates: Requirements 1.5**

  - [x] 1.5 Write property test for `formatCastDamageBreakdown` (without overcast)
    - **Property 3: Cast result breakdown arithmetic is correct (without overcast)**
    - Generate arbitrary damageModifier (0–20) and castingSL (0–10)
    - Assert output matches "M + SL(X) = T" where T = M + X
    - Test file: `src/logic/__tests__/spell-damage-clarity.property.test.ts`
    - **Validates: Requirements 2.2**

  - [x] 1.6 Write property test for `formatCastDamageBreakdown` (with overcast)
    - **Property 4: Cast result breakdown arithmetic is correct (with overcast)**
    - Generate arbitrary damageModifier (0–20), castingSL (0–10), and overcastBonus (1–7)
    - Assert output matches "M + SL(X) + Overcast(Y) = T" where T = M + X + Y
    - Test file: `src/logic/__tests__/spell-damage-clarity.property.test.ts`
    - **Validates: Requirements 2.3**

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Update SpellCastingPanel to show damage formula and tooltip
  - [x] 3.1 Add damage breakdown annotation to the Effect cell in `src/components/shared/SpellCastingPanel.tsx`
    - Import `formatDamageBreakdown` from `../../logic/spell-casting`
    - Compute `wpBonus` and `tbBonus` from `character.chars.WP` and `character.chars.T` using the existing bonus calculation (tens digit)
    - Call `formatDamageBreakdown(spell, wpBonus, tbBonus)` for each spell row
    - If result is non-null, render a secondary `<span>` or `<div>` below the effect text with the formula string
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 3.2 Add tooltip with info icon to the Effect column header in `src/components/shared/SpellCastingPanel.tsx`
    - Import `Info` icon from `lucide-react`
    - Add an info icon (`<Info>`) adjacent to the "Effect" text in the `<th>` element
    - Implement a CSS-based tooltip that appears on hover, focus, and tap
    - Set tooltip text: "Magic missile damage = listed modifier + Success Levels from your casting roll."
    - Use `aria-describedby` for accessibility and ensure the icon is keyboard-focusable (`tabIndex={0}`)
    - Add CSS styles in `SpellCastingPanel.module.css` for the tooltip (position, visibility, transitions)
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 3.3 Write unit tests for SpellCastingPanel tooltip and breakdown rendering
    - Test that info icon renders in the Effect column header
    - Test that tooltip text appears on focus/hover
    - Test that damage breakdown renders below effect text for magic missile spells
    - Test that no breakdown renders for non-magic-missile spells
    - Test file: `src/components/shared/__tests__/SpellCastingPanel.damage.test.tsx`
    - _Requirements: 1.1, 1.5, 3.1, 3.2, 3.3_

- [x] 4. Update CastResultDisplay to show damage breakdown
  - [x] 4.1 Replace plain damage display with formatted breakdown in `src/components/shared/CastResultDisplay.tsx`
    - Import `formatCastDamageBreakdown` and `parseDamageFromEffect` from `../../logic/spell-casting`
    - In the magic missile section (guarded by `isMagicMissile && castSuccess`), compute the damage modifier using `parseDamageFromEffect`
    - Compute WPB and TB from the `character` prop
    - Call `formatCastDamageBreakdown(damageModifier, slAchieved, overcastDamageBonus)` where overcastDamageBonus comes from overcast allocations if applicable
    - Replace the `Damage: {damage}` text with: "Damage: {formatted breakdown}"
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 4.2 Write unit tests for CastResultDisplay damage breakdown
    - Test that breakdown string renders instead of plain number for magic missile results
    - Test that overcast bonus is included in breakdown when allocated
    - Test file: `src/components/shared/__tests__/CastResultDisplay.damage.test.tsx`
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 5. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all implementation tasks use TypeScript/TSX
- `fast-check` is already in devDependencies; `vitest` is already configured
- CSS modules are used for all styling (no new external dependencies)
- `lucide-react` is already available for the info icon

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5", "1.6"] },
    { "id": 2, "tasks": ["3.1", "3.2", "4.1"] },
    { "id": 3, "tasks": ["3.3", "4.2"] }
  ]
}
```
