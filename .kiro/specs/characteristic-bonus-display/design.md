# Characteristic Bonus Display Bugfix Design

## Overview

The Characteristics table in CharacterPage omits the Characteristic Bonus (CB) — the tens digit of the Current value — which is a core WFRP 4e mechanic used for damage, tests, encumbrance, and wound calculation. The existing "Bonus" column misleadingly only shows talent bonuses (`c.b`). This fix adds a dedicated "CB" column displaying `Math.floor(current / 10)` and renames the existing column header to "Talent Bonus" for clarity. The `getBonus()` function in `calculators.ts` already computes this value; it simply needs to be surfaced in the UI.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the display bug — the Characteristic Bonus (tens digit of Current) is never shown to the player in the Characteristics table
- **Property (P)**: The desired behavior — a visible "CB" column displaying `Math.floor(current / 10)` for each characteristic
- **Preservation**: Existing talent bonus display, internal `getBonus()` calculations for derived values (wounds, encumbrance, damage), and characteristic editing must remain unchanged
- **Characteristic Bonus (CB)**: The tens digit of a characteristic's Current value (e.g., Strength 35 → SB 3). Computed as `Math.floor(current / 10)`
- **Talent Bonus**: The `c.b` field on a CharacteristicValue — bonus points granted by talents that increase the characteristic total
- **Current**: The total value of a characteristic = Initial (`c.i`) + Advance (`c.a`) + Talent Bonus (`c.b`)
- **getBonus()**: The function in `src/logic/calculators.ts` that returns `Math.floor(value / 10)`
- **CharacteristicValue**: The type `{ i: number; a: number; b: number }` representing Initial, Advance, and talent Bonus

## Bug Details

### Bug Condition

The bug manifests when a player views the Characteristics table on CharacterPage. The table displays a column with header "Bonus" (tooltip: "Talent Bonus") that only shows the `c.b` talent bonus value. The Characteristic Bonus — `Math.floor((c.i + c.a + c.b) / 10)` — is never displayed anywhere in the table despite being one of the most referenced values during WFRP gameplay.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { view: 'CharacteristicsTable', characteristic: CharacteristicValue }
  OUTPUT: boolean
  
  LET current = input.characteristic.i + input.characteristic.a + input.characteristic.b
  LET cb = FLOOR(current / 10)
  
  RETURN input.view == 'CharacteristicsTable'
         AND cb >= 0
         AND characteristicBonusColumnNotDisplayed()
         AND columnHeaderReads('Bonus') INSTEAD OF 'Talent Bonus'
END FUNCTION
```

### Examples

- **Strength 35**: Current = 35, CB should display "3", but no CB column exists. The "Bonus" column shows "—" (talent bonus is 0)
- **Toughness 42 (with +2 talent bonus)**: Current = 40 + 0 + 2 = 42, CB should display "4". The "Bonus" column shows "2" (the talent bonus), which players misread as CB
- **Willpower 28**: Current = 28, CB should display "2", but no CB column exists. The "Bonus" column shows "—"
- **Initiative 10**: Current = 10, CB should display "1", but is not shown. Edge case: the minimum non-zero bonus

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The talent bonus value (`c.b`) must continue to display correctly in its column (now labeled "Talent Bonus")
- Internal calculations using `getBonus()` (wounds via `computeWoundMaximum`, encumbrance via `calculateMaxEncumbrance`, weapon damage via `calcWeaponDamage`, spell casting, corruption thresholds) must produce identical results
- Editing Initial or Advance values must continue to update Current as `c.i + c.a + c.b`
- The dice roll button and characteristic roll dialog must continue to function identically
- Mobile responsive behavior (hiding columns below 360px) must continue to work
- Print layout must remain unchanged (it already computes and displays SB/TB/WPB independently)

**Scope:**
All inputs that do NOT involve rendering the Characteristics table header or adding a CB column should be completely unaffected by this fix. This includes:
- Skill totals calculation (uses `charVal.i + charVal.a + charVal.b + skill.a`)
- Combat page bonus calculations
- Advancement page bonus display
- All non-UI code in `calculators.ts`, `corruption.ts`, `spell-casting.ts`

## Hypothesized Root Cause

Based on the bug description, the root cause is straightforward:

1. **Missing Column**: The Characteristics table `<thead>` only defines columns for Char, Initial, Advance, Current, Bonus (talent), and Roll. No column for the Characteristic Bonus (CB) was ever added to the table structure.

2. **Misleading Label**: The existing "Bonus" column header has `title="Talent Bonus"` but displays as "Bonus", which in WFRP context typically refers to the Characteristic Bonus (SB, TB, etc.), not talent bonuses. This is a labeling/UX design oversight.

3. **Available but Unused**: The `getBonus()` function already exists and is used throughout the codebase (CombatPage, WeaponCards, AttackFlow, PrintLayout, corruption, spell-casting) but was never wired into the CharacterPage Characteristics table.

4. **Historical Design Decision**: The `c.b` field stores talent-granted bonuses, and the original table design chose to display this field. The Characteristic Bonus (tens digit) was likely assumed to be obvious from the Current value, but this creates cognitive overhead during play.

## Correctness Properties

Property 1: Bug Condition - Characteristic Bonus Column Displays Correct Value

_For any_ characteristic in the Characteristics table where the Current value is `c.i + c.a + c.b`, the fixed CharacterPage SHALL display the Characteristic Bonus as `Math.floor(current / 10)` in a dedicated column labeled "CB", matching the result of the existing `getBonus()` function.

**Validates: Requirements 2.2**

Property 2: Bug Condition - Talent Bonus Column Clearly Labeled

_For any_ view of the Characteristics table, the fixed CharacterPage SHALL label the talent bonus column as "Talent Bonus" (with matching tooltip) instead of the ambiguous "Bonus" label.

**Validates: Requirements 2.1**

Property 3: Preservation - Talent Bonus Values Unchanged

_For any_ characteristic with a talent bonus (`c.b > 0`), the fixed CharacterPage SHALL continue to display the same talent bonus value in the renamed "Talent Bonus" column, producing identical output to the original code.

**Validates: Requirements 3.1**

Property 4: Preservation - Derived Calculations Unchanged

_For any_ calculation that uses `getBonus()` internally (wounds, encumbrance, weapon damage, corruption thresholds, spell casting), the fixed code SHALL produce exactly the same numeric results as the original code, since no changes are made to `calculators.ts` or any logic file.

**Validates: Requirements 3.2, 3.3**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/components/pages/CharacterPage.tsx`

**Section**: Characteristics table (inside the `<Card>` with `SectionHeader` title "Characteristics")

**Specific Changes**:

1. **Rename column header**: Change `<th>` from `title="Talent Bonus">Bonus</th>` to `title="Talent Bonus">T. Bonus</th>` to clearly indicate it shows talent bonuses

2. **Add CB column header**: Insert a new `<th className={styles.thCenter} title="Characteristic Bonus">CB</th>` after the Current column and before the Talent Bonus column

3. **Add CB cell in row**: Inside the `CHAR_KEYS.map()` render, after the Current `<td>`, add a new `<td>` that displays `Math.floor(current / 10)` or equivalently call the imported `getBonus(current)`

4. **Import getBonus**: Add `getBonus` to the import from `../../logic/calculators` (if not already imported in CharacterPage)

5. **Add CSS class for CB column**: Add a `.charCB` style in `CharacterPage.module.css` for the new column cell, following the same pattern as `.charCurrent` but with appropriate styling (e.g., bold, accent color to draw attention)

**File**: `src/components/pages/CharacterPage.module.css`

**Specific Changes**:

6. **Add `.charCB` class**: Style the CB column cell with appropriate font weight and color to indicate it's a derived/important value

7. **Update responsive rules**: Ensure the CB column displays correctly on mobile and consider hiding behavior below 360px alongside the talent bonus column

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that no CB column exists and that the "Bonus" header is misleadingly labeled.

**Test Plan**: Write component tests that render the CharacterPage Characteristics table and assert on column headers and cell content. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Missing CB Column Test**: Render table, assert a column with header "CB" exists (will fail on unfixed code)
2. **CB Value Correctness Test**: For a character with Strength Initial=30, Advance=5, Bonus=0, assert CB cell shows "3" (will fail on unfixed code)
3. **Talent Bonus Label Test**: Assert that the talent bonus column header text is "Talent Bonus" or "T. Bonus", not bare "Bonus" (will fail on unfixed code)
4. **CB Computed From Current Test**: For a character with T Initial=20, Advance=10, Bonus=2 (Current=32), assert CB shows "3" not "2" (will fail on unfixed code — column doesn't exist)

**Expected Counterexamples**:
- No element with text "CB" found in table header
- No cell displaying the tens-digit value for characteristics
- Column header reads "Bonus" rather than "Talent Bonus" or "T. Bonus"

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed component produces the expected behavior.

**Pseudocode:**
```
FOR ALL characteristic WHERE isBugCondition(characteristic) DO
  LET current = characteristic.i + characteristic.a + characteristic.b
  LET renderedCB = getCBCellValue(characteristic)
  ASSERT renderedCB == FLOOR(current / 10)
  ASSERT columnHeaderText('CB') exists
  ASSERT columnHeaderText contains 'Talent Bonus' OR 'T. Bonus' (not bare 'Bonus')
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL characteristic WHERE NOT isBugCondition(characteristic) DO
  ASSERT talentBonusDisplay_fixed(characteristic) == talentBonusDisplay_original(characteristic)
  ASSERT getBonus_fixed(current) == getBonus_original(current)
  ASSERT computeWoundMaximum_fixed(S, T, WP, hardy, useSB) == computeWoundMaximum_original(S, T, WP, hardy, useSB)
  ASSERT calculateMaxEncumbrance_fixed(chars, strongBack) == calculateMaxEncumbrance_original(chars, strongBack)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many characteristic value combinations automatically (Initial 0-99, Advance 0-99, Bonus 0-9)
- It catches edge cases where floor division might produce unexpected results
- It provides strong guarantees that talent bonus display and derived calculations are unchanged

**Test Plan**: Observe behavior on UNFIXED code first for talent bonus rendering and derived calculations, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Talent Bonus Value Preservation**: For any characteristic, verify the talent bonus cell still displays `c.b` (or "—" when 0)
2. **Wound Calculation Preservation**: For random S, T, WP values and Hardy levels, verify `computeWoundMaximum` returns identical results
3. **Encumbrance Preservation**: For random S, T values and Strong Back levels, verify `calculateMaxEncumbrance` returns identical results
4. **Current Value Preservation**: For any edits to Initial or Advance, verify Current still equals `i + a + b`

### Unit Tests

- Test that the CB column header renders with text "CB" and tooltip "Characteristic Bonus"
- Test that the talent bonus column header renders as "T. Bonus" with tooltip "Talent Bonus"
- Test CB cell shows correct value for known inputs (35→3, 42→4, 10→1, 9→0, 0→0, 99→9)
- Test that talent bonus cell continues to show `c.b` value or "—" when zero
- Test responsive behavior: CB column visibility at different breakpoints

### Property-Based Tests

- Generate random `CharacteristicValue` objects (`i: 0-99`, `a: 0-99`, `b: 0-9`) and verify CB equals `Math.floor((i+a+b) / 10)`
- Generate random characteristic sets and verify `getBonus(current)` matches rendered CB value
- Generate random characteristic configurations and verify talent bonus display is unchanged from pre-fix behavior
- Generate random inputs to `computeWoundMaximum` and `calculateMaxEncumbrance` and verify results match original implementation

### Integration Tests

- Test full CharacterPage render with a complete character and verify all 10 characteristics show correct CB values
- Test editing Initial/Advance values and verify CB updates reactively
- Test that adding talent bonuses updates Current and CB correctly (e.g., adding +1 to T changes Current and may change CB)
- Test print layout still shows SB/TB/WPB correctly (no regression from CharacterPage changes)
