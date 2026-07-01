# Bugfix Requirements Document

## Introduction

The Characteristics table on CharacterPage displays a "Bonus" column that is mislabeled. The column header reads "Bonus" (with tooltip "Talent Bonus") but presents no indication that it only shows talent-granted bonuses (`c.b`), not the Characteristic Bonus (CB) — the tens digit of the Current value (e.g., a Strength of 35 yields SB 3). The Characteristic Bonus is a core WFRP mechanic used constantly for damage, tests, and encumbrance, yet it is never surfaced to the player in the Characteristics table. Players must mentally divide their Current value by 10 during play. The `getBonus()` function already computes this value internally but it is not displayed.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a player views the Characteristics table THEN the system displays a column headed "Bonus" with tooltip "Talent Bonus" that only shows the talent bonus value (`c.b`), misleading players into thinking it represents the Characteristic Bonus (tens digit of Current)

1.2 WHEN a player needs to reference their Characteristic Bonus (e.g., SB, TB, AgB) during play THEN the system does not display this value anywhere in the Characteristics table, forcing manual calculation

### Expected Behavior (Correct)

2.1 WHEN a player views the Characteristics table THEN the system SHALL clearly label the existing talent bonus column as "Talent Bonus" (not just "Bonus") to eliminate ambiguity

2.2 WHEN a player views the Characteristics table THEN the system SHALL display the Characteristic Bonus (floor of Current value ÷ 10) in a dedicated visible column labeled "CB" so players can reference it without manual calculation

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a player has talent bonuses on a characteristic THEN the system SHALL CONTINUE TO display the talent bonus value correctly (the `c.b` field)

3.2 WHEN the system internally computes values using `getBonus()` (wounds, encumbrance, damage, spell casting, corruption thresholds) THEN the system SHALL CONTINUE TO calculate those derived values identically

3.3 WHEN a player edits Initial or Advance values for a characteristic THEN the system SHALL CONTINUE TO update the Current value as the sum of Initial + Advance + Talent Bonus
