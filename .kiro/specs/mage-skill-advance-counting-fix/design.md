# Mage Skill Advance Counting Fix — Bugfix Design

## Overview

The `careerSkillMatches` function in `src/logic/advancement.ts` fails to recognize two skill naming patterns used in WFRP 4e career definitions: `(Any X)` (e.g., `"Channelling (Any Colour)"`) and `(X or Y)` (e.g., `"Art (Calligraphy or Engraving)"`). This causes the career completion check to undercount qualifying skills, blocking advancement even when the character has enough qualifying skills. The fix extends the existing pattern-matching logic in `careerSkillMatches` with two additional branches — one for `(Any X)` and one for `(X or Y)` — without altering the existing exact-match, `(Any)`, or ungrouped matching behavior.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — a career skill name uses the `(Any X)` or `(X or Y)` pattern and the character has a matching specialization, but `careerSkillMatches` returns `false`
- **Property (P)**: The desired behavior — `careerSkillMatches` returns `true` when the character skill is a valid specialization of the career skill pattern
- **Preservation**: Existing exact-match, `(Any)`, and ungrouped matching behavior that must remain unchanged by the fix
- **careerSkillMatches**: The function in `src/logic/advancement.ts` (line 292) that determines whether a character's skill satisfies a career skill requirement
- **Base name**: The skill name portion before the parenthesized specialization (e.g., `"Channelling"` in `"Channelling (Any Colour)"`)

## Bug Details

### Bug Condition

The bug manifests when a career skill uses either the `(Any X)` pattern (e.g., `"Channelling (Any Colour)"`) or the `(X or Y)` pattern (e.g., `"Art (Calligraphy or Engraving)"`) and the character has a matching specialization. The `careerSkillMatches` function falls through all existing branches and returns `false`.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { careerSkill: string, characterSkill: string }
  OUTPUT: boolean

  // Case 1: (Any X) pattern
  IF careerSkill contains "(" AND careerSkill contains "Any "
     AND careerSkill does NOT end with "(Any)"
     THEN
       base := substring of careerSkill before " (Any"
       RETURN characterSkill starts with base + " ("
              AND characterSkill != careerSkill

  // Case 2: (X or Y) pattern
  IF careerSkill contains "(" AND the parenthesized portion contains " or "
     THEN
       base := substring of careerSkill before " ("
       options := split the parenthesized content on " or "
       RETURN characterSkill IN [base + " (" + option + ")" for option in options]

  RETURN false
END FUNCTION
```

### Examples

- `"Channelling (Any Colour)"` with character skill `"Channelling (Aqshy)"` → should match, currently returns `false`
- `"Channelling (Any Colour)"` with character skill `"Channelling (Ghyran)"` → should match, currently returns `false`
- `"Art (Calligraphy or Engraving)"` with character skill `"Art (Calligraphy)"` → should match, currently returns `false`
- `"Art (Calligraphy or Engraving)"` with character skill `"Art (Engraving)"` → should match, currently returns `false`
- `"Stealth (Rural or Urban)"` with character skill `"Stealth (Urban)"` → should match, currently returns `false`
- `"Play (Drum or Fife)"` with character skill `"Play (Drum)"` → should match, currently returns `false`
- Edge case: `"Language (Any)"` with `"Language (Battle)"` → already works (existing `(Any)` branch)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Exact match: `"Melee (Basic)"` matches `"Melee (Basic)"` (identity check)
- `(Any)` pattern: `"Melee (Any)"` matches any `"Melee (...)"` specialization
- Ungrouped matching: career `"Stealth"` matches character `"Stealth (Urban)"`
- Non-matching: `"Melee (Basic)"` does NOT match `"Melee (Two-Handed)"`
- Non-matching: `"Melee (Any)"` does NOT match `"Ranged (Bow)"`

**Scope:**
All inputs that do NOT involve the `(Any X)` or `(X or Y)` patterns should be completely unaffected by this fix. This includes:
- Exact skill name comparisons
- `(Any)` wildcard matching (no qualifier after "Any")
- Ungrouped career skill matching specialized character skills
- Completely unrelated skill comparisons

## Hypothesized Root Cause

Based on the bug description, the root cause is straightforward:

1. **Missing `(Any X)` branch**: The function checks for `(Any)` (exact, no qualifier) but has no logic for `(Any X)` where X is a category qualifier like "Colour", "Arcane Lore", etc. Skills like `"Channelling (Any Colour)"` don't match the `includes('(Any)')` check because the string is `"(Any Colour)"` not `"(Any)"`.

2. **Missing `(X or Y)` branch**: The function has no logic to parse parenthesized content containing " or " and check if the character skill matches one of the listed options. Skills like `"Art (Calligraphy or Engraving)"` fall through to the ungrouped check, which fails because the career skill contains `(`.

3. **No other code paths affected**: Both `isCareerLevelComplete` and the `AdvancementPage.tsx` UI delegate to `careerSkillMatches`, so fixing this single function resolves the bug everywhere.

## Correctness Properties

Property 1: Bug Condition - (Any X) and (X or Y) Patterns Match Valid Specializations

_For any_ career skill using the `(Any X)` pattern and any character skill that shares the same base name with a parenthesized specialization, the fixed `careerSkillMatches` function SHALL return `true`. Similarly, _for any_ career skill using the `(X or Y)` pattern and any character skill that matches `base (option)` where option is one of the listed choices, the fixed function SHALL return `true`.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Existing Match Behavior Unchanged

_For any_ input where the bug condition does NOT hold (neither `(Any X)` nor `(X or Y)` pattern is involved), the fixed `careerSkillMatches` function SHALL produce the same result as the original function, preserving exact match, `(Any)` wildcard, ungrouped matching, and non-match behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

**File**: `src/logic/advancement.ts`

**Function**: `careerSkillMatches`

**Specific Changes**:

1. **Add `(Any X)` pattern branch** (after the existing `(Any)` check):
   - Detect: career skill contains `(Any ` (with trailing space, distinguishing from bare `(Any)`)
   - Extract base name: substring before ` (Any`
   - Match: character skill starts with `base + " ("`
   - This handles `"Channelling (Any Colour)"` matching `"Channelling (Aqshy)"`

2. **Add `(X or Y)` pattern branch** (after the `(Any X)` check):
   - Detect: career skill contains `(` and the parenthesized content contains ` or `
   - Extract base name: substring before ` (`
   - Extract options: content between `(` and `)`, split on ` or `
   - Match: character skill equals `base + " (" + option.trim() + ")"` for any option
   - This handles `"Art (Calligraphy or Engraving)"` matching `"Art (Calligraphy)"`

3. **Ordering**: Place the `(Any X)` check before the `(X or Y)` check, and both after the existing `(Any)` check but before the ungrouped check. This ensures the more specific `(Any)` pattern is checked first.

4. **No changes to other functions**: `isCareerLevelComplete` and `AdvancementPage.tsx` already delegate to `careerSkillMatches`.

5. **No changes to data files**: The career data in `src/data/careers.ts` already uses these patterns correctly.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that `careerSkillMatches` returns `false` for `(Any X)` and `(X or Y)` patterns.

**Test Plan**: Write unit tests calling `careerSkillMatches` with career skills from the Mage career data and matching character skills. Run on unfixed code to observe failures.

**Test Cases**:
1. **Any Colour Test**: `careerSkillMatches("Channelling (Any Colour)", "Channelling (Aqshy)")` → expects `true` (will fail on unfixed code)
2. **Any Arcane Lore Test**: `careerSkillMatches("Arcane Magic (Any Arcane Lore)", "Arcane Magic (Fire)")` → expects `true` (will fail on unfixed code)
3. **Or Pattern Test**: `careerSkillMatches("Art (Calligraphy or Engraving)", "Art (Calligraphy)")` → expects `true` (will fail on unfixed code)
4. **Or Pattern Second Option**: `careerSkillMatches("Play (Drum or Fife)", "Play (Fife)")` → expects `true` (will fail on unfixed code)

**Expected Counterexamples**:
- All four tests return `false` instead of `true`
- Root cause confirmed: no code path handles these patterns

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := careerSkillMatches_fixed(input.careerSkill, input.characterSkill)
  ASSERT result == true
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT careerSkillMatches_original(input.careerSkill, input.characterSkill)
       == careerSkillMatches_fixed(input.careerSkill, input.characterSkill)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many combinations of career skill names and character skill names
- It catches edge cases in string parsing that manual tests might miss
- It provides strong guarantees that existing behavior is unchanged

**Test Plan**: Capture the original function's behavior for non-buggy inputs (exact matches, `(Any)` patterns, ungrouped patterns, non-matches), then verify the fixed function produces identical results.

**Test Cases**:
1. **Exact Match Preservation**: Verify exact string equality matching continues to work for all skill names
2. **Any Wildcard Preservation**: Verify `"Melee (Any)"` still matches `"Melee (Basic)"` and doesn't match `"Ranged (Bow)"`
3. **Ungrouped Preservation**: Verify `"Stealth"` still matches `"Stealth (Urban)"` but not `"Athletics"`
4. **Non-Match Preservation**: Verify `"Melee (Basic)"` still doesn't match `"Melee (Two-Handed)"`

### Unit Tests

- Test `(Any X)` pattern with various base names and specializations
- Test `(X or Y)` pattern with two options, matching first and second option
- Test `(X or Y)` pattern with non-matching option (e.g., `"Art (Painting)"` vs `"Art (Calligraphy or Engraving)"`)
- Test `(Any X)` pattern with non-matching base name (e.g., `"Language (Aqshy)"` vs `"Channelling (Any Colour)"`)
- Test edge cases: extra whitespace in options, single-option parentheses without "or"

### Property-Based Tests

- Generate random base names and specializations, verify `(Any X)` pattern matches any specialization with the correct base
- Generate random pairs of options, verify `(X or Y)` pattern matches exactly those two options and no others
- Generate random non-buggy inputs (exact matches, `(Any)` patterns), verify the fixed function matches the original

### Integration Tests

- Test `isCareerLevelComplete` with a Mage character having `"Channelling (Aqshy)"` — should count toward career completion
- Test the full skill counting logic in `AdvancementPage.tsx` context with `(Any X)` and `(X or Y)` skills
- Test career level completion with a Soldier character having `"Play (Drum)"` matching `"Play (Drum or Fife)"`
