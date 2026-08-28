# Implementation Plan: Worn Trappings Encumbrance

## Overview

This plan extends the existing WFRP4e "Worn Items" rule (Core p.293) from armour to wearable trappings. Work proceeds from the data model and shared pure logic in `src/logic/encumbrance.ts` outward to the wearable classifier, the breakdown helper, then the UI wiring in `CharacterPage.tsx` (Worn toggle, mutual exclusivity, totals, breakdown tooltip), and finally the `PrintLayout.tsx` consistency fix. Property-based tests (fast-check, 100+ iterations) validate the 8 correctness properties; unit/render tests cover UI presentation, accessibility, and backward compatibility. Each step builds on the previous one and ends wired into a consumer so no orphaned code remains.

## Tasks

- [x] 1. Extend the Trapping data model
  - [x] 1.1 Add the `worn` field to the Trapping interface
    - Add optional `worn?: boolean` to the `Trapping` interface in `src/types/character.ts`, with a comment citing Core p.293 Worn Items (per-item Enc reduced by 1, min 0)
    - Confirm no `BLANK_CHARACTER` change and no migration change are needed (optional field, `deepMerge` copies trapping arrays verbatim)
    - _Requirements: 1.1, 7.1_

- [x] 2. Implement shared trapping encumbrance logic in `src/logic/encumbrance.ts`
  - [x] 2.1 Add the wearable classifier
    - Add `WEARABLE_TRAPPING_NAMES` (Boots, Cloak, Clothing, Coat, Hat, Hood or Mask, Silk Underwear, Practical Robes, Standard Robes, Elaborate Robes) with a Core p.293 comment
    - Implement `isWearableTrapping(name)` as a case-insensitive, trimmed membership test
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 Write property test for the wearable classifier
    - **Property 6: Wearable classifier equals case-insensitive membership**
    - **Validates: Requirements 2.1, 2.2, 2.3**
    - Location `src/logic/__tests__/wearableClassifier.property.test.ts`; generate names from the wearable set and junk names with random re-casing; assert result equals case-insensitive membership and is case-invariant; ≥100 iterations; tag `// Feature: worn-trappings-encumbrance, Property 6: ...`

  - [x] 2.3 Implement per-item and aggregate encumbrance functions
    - Implement `calculateTrappingEncumbrance(enc, quantity, worn)` = `(worn === true ? max(0, base − 1) : base) × (quantity || 1)`, `base = parseFloat(enc) || 0`
    - Implement `isEffectivelyWorn(t)` = `t.worn === true && t.storedOnHorse !== true` (read-time exclusivity, Req 6.3)
    - Implement `calculateCarriedTrappingEnc(trappings)` (sum over `storedOnHorse !== true` using effective worn) and `calculateHorseTrappingEnc(trappings)` (sum over `storedOnHorse === true`, worn = false)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.3_

  - [x] 2.4 Write property test for the effective encumbrance formula
    - **Property 1: Effective encumbrance formula**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
    - Location `src/logic/__tests__/trappingEncumbrance.property.test.ts`; generate `{ enc, quantity, worn }` with `enc` including "0", numeric strings, and junk strings, `worn` in `{true,false,undefined}`; assert formula, non-negative per-item, worn base-0 → 0; ≥100 iterations; tagged comment

  - [x] 2.5 Write property test for the carried total over non-horse trappings
    - **Property 2: Carried total sums non-horse effective values**
    - **Validates: Requirements 4.5, 4.6**
    - Same file as 2.4; generate trapping lists with mixed `storedOnHorse`; assert equality to manual non-horse sum and invariance to adding/removing/toggling horse items; ≥100 iterations; tagged comment

  - [x] 2.6 Write property test for legacy equivalence when nothing is worn
    - **Property 8: Legacy equivalence when no trapping is worn**
    - **Validates: Requirements 7.2**
    - Same file as 2.4; generate trapping lists with all `worn` falsy; assert `calculateCarriedTrappingEnc` equals legacy `base × qty` non-horse sum; ≥100 iterations; tagged comment

- [x] 3. Checkpoint - core logic
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement the trappings breakdown helper in `src/logic/breakdown-helpers.ts`
  - [x] 4.1 Add `getTrappingEncBreakdown(trappings)`
    - Return carried-only line items `{ name, baseEnc, worn, quantity, effective }[]` and a `total`, reusing `calculateTrappingEncumbrance` and `calculateCarriedTrappingEnc`
    - Include zero-value lines (calculated-totals steering guideline 4)
    - _Requirements: 5.2, 5.3_

  - [x] 4.2 Write property test for the breakdown helper
    - **Property 4: Breakdown tooltip uses effective values and totals match**
    - **Validates: Requirements 5.2, 5.3**
    - Location `src/logic/__tests__/breakdown-helpers.trappingEnc.property.test.ts`; generate trapping lists; assert `getTrappingEncBreakdown(...).total === calculateCarriedTrappingEnc(...)` and each line `effective` equals `calculateTrappingEncumbrance` (not base × qty); ≥100 iterations; tagged comment

- [x] 5. Wire mutual exclusivity and the Worn toggle into `CharacterPage.tsx`
  - [x] 5.1 Add `setWorn(i, value)` and `setStoredOnHorse(i, value)` helpers enforcing mutual exclusivity
    - `setWorn` clears `storedOnHorse` when setting worn true; `setStoredOnHorse` clears `worn` when setting stored true (Req 6.1, 6.2)
    - Replace existing inline `update('trappings.${i}.storedOnHorse', ...)` calls with `setStoredOnHorse(i, ...)`
    - _Requirements: 3.1, 3.2, 6.1, 6.2_

  - [x] 5.2 Write property test for mutual exclusivity
    - **Property 5: Worn and stored-on-horse are mutually exclusive**
    - **Validates: Requirements 6.1, 6.2, 6.3**
    - Location `src/logic/__tests__/trappingWornExclusivity.property.test.ts`; assert `setWorn`/`setStoredOnHorse` reducers never leave both flags true, and `isEffectivelyWorn` is false when both true; ≥100 iterations; tagged comment

  - [x] 5.3 Render the Worn toggle for wearable trappings only
    - Render a checkbox mirroring the stored-on-horse control, gated by `isWearableTrapping(t.name)`, in both the edit form and the trapping card action row
    - Bind `checked={!!t.worn}` and `onChange` to `setWorn`; add an `aria-label` referencing the trapping name; add supporting styles
    - _Requirements: 2.4, 2.5, 8.1, 8.2, 8.3_

  - [x] 5.4 Write render tests for toggle visibility, behaviour, and accessibility
    - Wearable trapping → worn checkbox present; non-wearable → absent (Req 2.4, 2.5)
    - Clicking toggles `worn`; checking worn unchecks horse and vice-versa (Req 3.1, 3.2, 6.1, 6.2)
    - Control is a checkbox with an `aria-label` referencing the trapping and `checked` reflecting `worn` (Req 8.1, 8.2, 8.3)
    - _Requirements: 2.4, 2.5, 3.1, 3.2, 6.1, 6.2, 8.1, 8.2, 8.3_

- [x] 6. Use shared totals and add the breakdown tooltip in `CharacterPage.tsx`
  - [x] 6.1 Replace inline trapping sums with shared helpers
    - Compute `eT = calculateCarriedTrappingEnc(character.trappings)` and `eHorse = calculateHorseTrappingEnc(character.trappings)` for the encumbrance indicator and Wealth & Encumbrance breakdown
    - Ensure the carried total recalculates and re-renders after a worn toggle (Req 3.3)
    - _Requirements: 3.3, 4.5, 4.6_

  - [x] 6.2 Add the Trappings breakdown tooltip
    - Add a `TrappingsBreakdownContent` component rendering `getTrappingEncBreakdown` lines with the worn marker and effective (reduced) value, ending in a total
    - Make the "Trappings" row a `TooltipTriggerCell` using the shared `Tooltip` component; add `{ type: 'trappingEnc'; anchorEl }` to the `BreakdownTooltipState` union, following the existing encumbrance/coin-weight tooltip pattern
    - _Requirements: 5.2, 5.3_

  - [x] 6.3 Write render test for backward compatibility
    - Load a character whose trappings lack `worn`; assert the carried total equals the base-Enc computation (unchanged) (Req 7.1)
    - _Requirements: 7.1_

- [x] 7. Apply the consistency fix in `PrintLayout.tsx`
  - [x] 7.1 Use the shared carried-trappings helper in the printout
    - Replace the unfiltered inline sum with `eT = calculateCarriedTrappingEnc(ch.trappings)` so the printout applies the worn reduction, quantity multiplication, and stored-on-horse exclusion identically to the character page
    - _Requirements: 5.1, 5.4_

  - [x] 7.2 Write property test for character-page/print-layout equality
    - **Property 3: Character page total equals print layout total**
    - **Validates: Requirements 5.1, 5.4**
    - In `src/logic/__tests__/trappingEncumbrance.property.test.ts`; generate trapping lists; assert the CharacterPage-side value equals the PrintLayout-side value (both `calculateCarriedTrappingEnc`); ≥100 iterations; tagged comment

  - [x] 7.3 Write integration test for printed vs character-page total
    - Assert a sample character's printed trappings total equals the character-page total (example-level complement to Property 3)
    - _Requirements: 5.4_

- [x] 8. Add the worn save/load round-trip property test
  - [x] 8.1 Write property test for round-trip persistence
    - **Property 7: Worn value survives save/load round-trip**
    - **Validates: Requirements 1.2, 1.3, 1.5**
    - Location `src/logic/__tests__/trappingWornRoundtrip.property.test.ts`; generate trapping lists with `worn` in `{true,false,undefined}`; assert `JSON.parse(JSON.stringify(list))` preserves each `worn` value; ≥100 iterations; tagged comment
    - _Requirements: 1.2, 1.3, 1.5_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Run the full test suite and type-check (Req 1.1 confirmed by compilation); ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each task references specific requirements (granular clauses) for traceability.
- All new game logic cites Core p.293 "Worn Items" in code comments per the rules-compliance steering; the Bulky flaw is intentionally out of scope (per-item worn floor stays 0).
- Property-based tests use `fast-check`, run ≥100 iterations, and are tagged `// Feature: worn-trappings-encumbrance, Property N: ...`.
- The "Trappings" breakdown tooltip follows the calculated-totals steering rule using the shared `Tooltip` component.
- Each correctness property (1–8) maps to exactly one property-based test.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.3"] },
    { "id": 1, "tasks": ["2.2", "2.4", "2.5", "2.6", "4.1"] },
    { "id": 2, "tasks": ["4.2", "5.1"] },
    { "id": 3, "tasks": ["5.2", "5.3"] },
    { "id": 4, "tasks": ["5.4", "6.1"] },
    { "id": 5, "tasks": ["6.2", "7.1"] },
    { "id": 6, "tasks": ["6.3", "7.2", "7.3", "8.1"] }
  ]
}
```
