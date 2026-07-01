# Bugfix Requirements Document

## Introduction

New characters incorrectly appear as "Down" immediately upon creation. The `BLANK_CHARACTER` template sets `wCur: 0`, which means a freshly created character displays a red `0/12` wound counter and a "⚠ Down!" banner in the Combat Dashboard before any damage has been taken. The fix should ensure that newly created characters start at full wounds rather than zero.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a new character is created via `createCharacter()` THEN the system sets `wCur` to 0 (from `BLANK_CHARACTER`) regardless of the computed wound maximum

1.2 WHEN a character has `wCur === 0` and computed wound maximum is greater than 0 THEN the system displays a "⚠ Down!" alert banner in the Combat Dashboard

1.3 WHEN a character has `wCur === 0` and computed wound maximum is greater than 0 THEN the system displays wounds as red `0/{max}` indicating a critical/down state

### Expected Behavior (Correct)

2.1 WHEN a new character is created via `createCharacter()` THEN the system SHALL set `wCur` equal to the computed wound maximum so the character starts at full health

2.2 WHEN a character has `wCur` equal to the computed wound maximum THEN the system SHALL NOT display the "⚠ Down!" alert banner

2.3 WHEN characteristics are first assigned to a character (species selection or manual entry) and `wCur` has never been modified from its initial value of 0 THEN the system SHALL automatically set `wCur` to the newly computed wound maximum

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a character has taken damage (wCur has been explicitly reduced below wound maximum) THEN the system SHALL CONTINUE TO display the current wound value without auto-resetting to maximum

3.2 WHEN a character's wCur reaches 0 through actual damage taken during play THEN the system SHALL CONTINUE TO display the "⚠ Down!" alert banner

3.3 WHEN `syncWoundFields` recalculates wound component fields (wSB, wTB2, wWPB, wHardy) THEN the system SHALL CONTINUE TO leave `wCur` unchanged for characters that have already been in play

3.4 WHEN a character is loaded from storage with an existing `wCur` value greater than 0 THEN the system SHALL CONTINUE TO preserve that stored `wCur` value

3.5 WHEN wound maximum changes due to characteristic advancement on an in-play character THEN the system SHALL CONTINUE TO leave `wCur` at its current value (not auto-sync to new maximum)
