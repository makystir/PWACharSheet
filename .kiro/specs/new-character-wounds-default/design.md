# New Character Wounds Default Bugfix Design

## Overview

New characters created via `createCharacter()` inherit `wCur: 0` from `BLANK_CHARACTER`, causing them to immediately display as "Down" in the Combat Dashboard (red `0/{max}` counter and "⚠ Down!" banner) before any damage has been taken. The fix ensures that when a character is first created or when characteristics are first assigned (giving a non-zero wound maximum), `wCur` is automatically set to the computed wound maximum so the character starts at full health.

## Glossary

- **Bug_Condition (C)**: The condition where a character has `wCur === 0` while the computed wound maximum is greater than 0, AND `wCur` has never been intentionally reduced by the user (i.e., the character has not taken damage)
- **Property (P)**: Newly created characters should start with `wCur` equal to their computed wound maximum, displaying as full health
- **Preservation**: Characters that have taken damage (wCur explicitly reduced) must retain their current wound value; `syncWoundFields` must continue to leave `wCur` untouched for in-play characters
- **BLANK_CHARACTER**: The default character template in `src/types/character.ts` that initializes all fields, including `wCur: 0`
- **createCharacter()**: Function in `src/storage/character-manager.ts` that creates a new character by cloning `BLANK_CHARACTER`
- **syncWoundFields()**: Function in `src/logic/calculators.ts` that recomputes wound component fields (wSB, wTB2, wWPB, wHardy) without modifying `wCur`
- **calculateTotalWounds()**: Function in `src/logic/calculators.ts` that computes the wound maximum from characteristics and Hardy talent
- **backfillCharacter()**: Function in `src/hooks/useCharacter.ts` that patches missing fields when a character is loaded from storage

## Bug Details

### Bug Condition

The bug manifests when a new character is created via `createCharacter()`. The function clones `BLANK_CHARACTER` which has `wCur: 0`. Since characteristics also start at 0, the wound maximum is initially 0 as well, so the state is technically consistent at creation time. However, once characteristics are assigned (species selection or manual entry), the wound maximum becomes positive (e.g., 12) while `wCur` remains at 0. This causes the Combat Dashboard to show the character as "Down" because `wCur <= 0` triggers the critical threshold and the "⚠ Down!" banner.

**Formal Specification:**
```
FUNCTION isBugCondition(character)
  INPUT: character of type Character
  OUTPUT: boolean
  
  woundMax := calculateTotalWounds(character.chars, character.woundsUseSB, hardyLevel)
  
  RETURN character.wCur === 0
         AND woundMax > 0
         AND character has never taken damage (wCur was never explicitly reduced by user)
END FUNCTION
```

### Examples

- **New Human character**: User creates "Gregor", assigns S:30, T:35, WP:25. Wound max = 3 + 2×3 + 2 = 11. Display shows red `0/11` and "⚠ Down!" — should show green `11/11`
- **New Elf character**: User creates "Aelindra", assigns T:30, WP:35. Wound max (no SB) = 2×3 + 3 = 9. Display shows red `0/9` and "⚠ Down!" — should show green `9/9`
- **Character with Hardy talent**: User creates character, assigns T:40, adds Hardy(1). Wound max includes Hardy bonus = 2×4 + WPB + 4. Display incorrectly shows 0 wounds
- **Edge case — all characteristics 0**: New character with no characteristics assigned. Wound max = 0, `wCur` = 0. No bug visible because `0/0` is the correct display for an incomplete character

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Characters that have taken damage (wCur explicitly reduced below wound maximum) must retain their current `wCur` value
- Characters loaded from storage with `wCur > 0` must preserve that stored value
- `syncWoundFields` must continue to leave `wCur` unchanged for in-play characters
- When wound maximum changes due to characteristic advancement on an in-play character, `wCur` must NOT auto-sync to the new maximum
- Characters where `wCur` reaches 0 through actual damage must still display the "⚠ Down!" banner

**Scope:**
All inputs that do NOT involve the initial `wCur === 0` state on a fresh or newly-configured character should be completely unaffected by this fix. This includes:
- Manual wound adjustments (increment/decrement buttons in Combat Dashboard)
- Damage taken via TakeDamagePanel
- Loading existing characters from localStorage
- Characteristic advancement on characters already in play
- The `syncWoundFields` function's behavior with respect to wound component fields

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **BLANK_CHARACTER initializes wCur to 0**: The template sets `wCur: 0` which is correct for an empty character template, but no mechanism exists to auto-initialize `wCur` when characteristics are first assigned.

2. **createCharacter() does not compute wound maximum**: The function simply clones `BLANK_CHARACTER` and sets the name. It doesn't calculate what `wCur` should be based on the character's actual characteristics (which are also 0 at creation time, so this alone wouldn't fix it).

3. **No auto-initialization in the sync lifecycle**: When characteristics are first set (making wound max > 0), `syncWoundFields` deliberately does NOT modify `wCur`. There is no separate mechanism that detects "wCur is still at its default of 0 while wound max is now positive" and initializes it.

4. **The actual fix point**: The most appropriate fix is in the `useCharacter` hook or `backfillCharacter`, where the wound fields are synced after characteristics change. When `wCur === 0` and `totalWounds > 0` and the character hasn't taken damage, `wCur` should be set to `totalWounds`.

## Correctness Properties

Property 1: Bug Condition - New Character Starts at Full Wounds

_For any_ character where characteristics have been assigned (wound maximum > 0) and `wCur` has never been explicitly modified from its initial value of 0, the system SHALL set `wCur` equal to the computed wound maximum so the character displays as fully healthy.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Damaged Characters Retain Wound State

_For any_ character where `wCur` has been explicitly modified (damage taken, healing applied, or manually adjusted), the system SHALL preserve the current `wCur` value unchanged, regardless of whether wound maximum changes due to characteristic advancement.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/hooks/useCharacter.ts`

**Function**: `backfillCharacter` and the wound sync `useEffect`

**Specific Changes**:

1. **Add auto-initialization logic in `backfillCharacter`**: After `syncWoundFields` is called and wound components are computed, check if `wCur === 0` and the computed wound maximum is greater than 0. If the character appears to have never taken damage (fresh from `BLANK_CHARACTER`), set `wCur` to the wound maximum.

2. **Add auto-initialization in the `useEffect` that syncs wound fields**: When characteristics change and the wound maximum transitions from 0 to a positive value while `wCur` is still 0, set `wCur` to the new wound maximum. This handles the case where a user first assigns characteristics after creation.

3. **Determine "never damaged" heuristic**: Since we cannot add a new field without migration concerns, use the heuristic that `wCur === 0 AND woundMax > 0` implies the character has never had wounds initialized. This is safe because in normal gameplay, `wCur === 0` means "Down" which only happens after explicit damage — but for a new character it means "never initialized."

4. **Preserve existing behavior for loaded characters**: Characters loaded from storage with `wCur > 0` skip the auto-initialization path entirely. Characters loaded with `wCur === 0` that have non-zero characteristics will be backfilled to full wounds (which is correct since a truly "Down" character would have been saved that way intentionally, but this edge case should be considered).

5. **Alternative: Track initialization state**: Consider adding a `_woundsInitialized` boolean flag to the character type that is set to `true` once `wCur` has been explicitly set. This would provide a more reliable heuristic than checking `wCur === 0`, but requires a schema migration. The simpler heuristic (`wCur === 0 AND woundMax > 0`) is preferred as it handles the common case correctly without migration.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that create a new character, assign characteristics resulting in a positive wound maximum, and assert that `wCur` equals the wound maximum. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **New Human Character Test**: Create character, set S:30/T:35/WP:25, verify `wCur` equals wound max (will fail on unfixed code — `wCur` stays 0)
2. **New Elf Character Test**: Create character with `woundsUseSB: false`, set T:30/WP:35, verify `wCur` equals wound max (will fail on unfixed code)
3. **Characteristics Assigned After Creation**: Create character, then update characteristics from 0 to positive values, verify `wCur` updates (will fail on unfixed code)
4. **Character with Hardy Talent**: Create character with Hardy(1) and T:40, verify `wCur` includes Hardy bonus (will fail on unfixed code)

**Expected Counterexamples**:
- `wCur` remains 0 after characteristics are assigned, while wound maximum is positive
- Possible causes: no auto-initialization logic exists in `createCharacter`, `backfillCharacter`, or the wound sync lifecycle

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL character WHERE isBugCondition(character) DO
  result := initializeWounds(character)
  ASSERT result.wCur === calculateTotalWounds(result.chars, result.woundsUseSB, hardyLevel)
  ASSERT result.wCur > 0
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL character WHERE NOT isBugCondition(character) DO
  ASSERT initializeWounds(character).wCur === character.wCur
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for characters with `wCur > 0` (already in play), then write property-based tests capturing that behavior.

**Test Cases**:
1. **Damaged Character Preservation**: Verify that a character with `wCur` between 1 and woundMax-1 retains their `wCur` value after the fix logic runs
2. **Down Character Preservation**: Verify that a character at `wCur === 0` who has been explicitly damaged (simulated via direct assignment) is not auto-healed
3. **Loaded Character Preservation**: Verify characters loaded from storage with existing `wCur > 0` are not modified
4. **Advancement Preservation**: Verify that changing characteristics on an in-play character (wCur > 0) does not auto-sync wCur to new maximum

### Unit Tests

- Test `createCharacter` followed by characteristic assignment results in `wCur === woundMax`
- Test `backfillCharacter` auto-initializes `wCur` when `wCur === 0` and wound max > 0
- Test `backfillCharacter` does NOT modify `wCur` when `wCur > 0`
- Test edge case: all characteristics 0 → `wCur` remains 0 (wound max is 0)
- Test the "⚠ Down!" banner does not appear for freshly created characters with assigned stats

### Property-Based Tests

- Generate random characteristic values (S, T, WP in [0, 99]) and verify that a fresh character always gets `wCur === calculateTotalWounds(...)` when wound max > 0
- Generate random characters with `wCur` in [1, woundMax] and verify the fix logic preserves their `wCur` value unchanged
- Generate random characteristic changes on characters with `wCur > 0` and verify `wCur` is never auto-modified

### Integration Tests

- Test full character creation flow: create → assign species → verify wound display is green/full
- Test character creation then immediate navigation to Combat Dashboard shows healthy status
- Test that taking damage after fix still correctly reduces `wCur` and shows "Down" at 0
