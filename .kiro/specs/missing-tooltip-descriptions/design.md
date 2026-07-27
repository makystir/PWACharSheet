# Missing Tooltip Descriptions Bugfix Design

## Overview

Several skills and talents in the WFRP 4e character sheet app fail to show tooltip descriptions because their names are either absent from the lookup databases (`SKILL_DESCRIPTIONS`, `TALENT_DB`) or use a variant spelling that doesn't match the canonical entry. The fix adds missing entries to the data files and introduces a name-variant resolution layer in the tooltip lookup so that career-referenced names resolve to their canonical `TALENT_DB` entry.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — a skill or talent name is looked up for a tooltip but no matching entry exists in the respective database (`SKILL_DESCRIPTIONS` or `TALENT_DB`)
- **Property (P)**: The desired behavior — every skill in `ADV_SKILL_DB` and every talent referenced in career data resolves to a tooltip with description text
- **Preservation**: Existing tooltip behavior for all previously-working skills, talents, grouped skills, and custom character-level talent descriptions must remain unchanged
- **SKILL_DESCRIPTIONS**: `Record<string, string>` in `src/data/skill-descriptions.ts` mapping skill names to tooltip text
- **ADV_SKILL_DB**: Array of `{n, c}` objects in `src/data/advanced-skills.ts` listing advanced skills with their linked characteristic
- **TALENT_DB**: Array of `{name, max, desc}` objects in `src/data/talents.ts`
- **getSkillDescription()**: Function in `src/data/skill-descriptions.ts` that tries exact match then prefix match
- **resolveTalentTooltip()**: Function in `src/logic/tooltip-content.ts` that looks up talent by exact name, falls back to character description
- **Name Variant**: A career data reference that uses different spelling/hyphenation/spacing than the canonical `TALENT_DB` entry (e.g., "Warleader" vs "War Leader")

## Bug Details

### Bug Condition

The bug manifests in three scenarios: (1) a skill present in `ADV_SKILL_DB` has no entry in `SKILL_DESCRIPTIONS`, so `getSkillDescription()` returns `''` and `resolveSkillTooltip()` returns `null`; (2) a talent referenced in career data has no entry in `TALENT_DB`, so `resolveTalentTooltip()` returns `null`; (3) a talent name variant used in career data doesn't exactly match the canonical `TALENT_DB` entry name, so the `find()` call returns `undefined`.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { kind: 'skill' | 'talent', name: string, characterDesc?: string }
  OUTPUT: boolean

  IF input.kind == 'skill' THEN
    RETURN input.name IN ['Augury', 'Psychometry', 'Runesmithing']
           AND SKILL_DESCRIPTIONS[input.name] == undefined
           AND getSkillDescription(input.name) == ''

  IF input.kind == 'talent' THEN
    LET exactMatch = TALENT_DB.find(t => t.name == input.name)
    LET isNameVariant = input.name IN KNOWN_VARIANT_NAMES
    LET isMissingTalent = input.name IN KNOWN_MISSING_TALENTS
    RETURN (exactMatch == undefined)
           AND (isNameVariant OR isMissingTalent)
           AND (input.characterDesc == undefined OR input.characterDesc == '')
END FUNCTION
```

### Examples

- **Augury skill tooltip**: User hovers over "Augury" — expected: tooltip with description and "Int" characteristic. Actual: no tooltip appears.
- **Pharmacist talent tooltip**: User views "Pharmacist" talent from career — expected: tooltip with description and max. Actual: no tooltip appears.
- **"Warleader" variant**: Career data references "Warleader" — expected: resolves to "War Leader" entry and shows tooltip. Actual: exact match fails, no tooltip appears.
- **"Cat Fall" variant**: Career data references "Cat Fall" — expected: resolves to "Catfall" entry and shows tooltip. Actual: no tooltip.
- **"Public-Speaking" variant**: Career references "Public-Speaking" — expected: resolves to "Public Speaking" entry. Actual: no tooltip.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Mouse/tap tooltips for all previously-working skills (Animal Care, Channelling, Heal, Evaluate, etc.) must continue displaying correct descriptions
- Tooltips for all previously-working talents (Accurate Shot, Hardy, Combat Master, War Leader, etc.) must continue displaying correct descriptions with max values
- Custom talents not in `TALENT_DB` that have a character-level description must continue falling back to the character-provided description
- Grouped skill tooltip resolution via prefix matching (e.g., "Melee (Cavalry)" → "Melee ()") must continue working
- The `getSkillDescription()` prefix-match fallback for grouped skills must remain intact

**Scope:**
All inputs that do NOT involve the specifically missing or variant-named skills/talents should be completely unaffected by this fix. This includes:
- Any skill already present in `SKILL_DESCRIPTIONS`
- Any talent already present in `TALENT_DB` by exact name
- Custom talents with character-level descriptions
- All grouped skills using prefix matching

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Missing SKILL_DESCRIPTIONS Entries**: Augury, Psychometry, and Runesmithing were added to `ADV_SKILL_DB` (so they appear in skill lists) but corresponding description strings were never added to `SKILL_DESCRIPTIONS` in `src/data/skill-descriptions.ts`.

2. **Missing TALENT_DB Entries**: Talents like Pharmacist, Numerate, Numismatics, Cat-tongued, Supportive, Flagellant, Sharp-eyed, and Stealthy are referenced in career data but were never added to `TALENT_DB` in `src/data/talents.ts`. These are genuine data gaps — the talents exist in the WFRP 4e source books but weren't transcribed.

3. **No Alias Resolution in Tooltip Lookup**: `resolveTalentTooltip()` uses `TALENT_DB.find(t => t.name === talentName)` which is an exact string match. When career data uses variant spellings (e.g., "Warleader" instead of "War Leader", "Cat Fall" instead of "Catfall"), the lookup fails. There is no alias/variant mapping in the production tooltip code — the alias map only exists as a test workaround in `static-data.test.ts`.

4. **No Normalized Lookup Strategy**: Unlike `getSkillDescription()` which has a prefix-match fallback for grouped skills, `resolveTalentTooltip()` has no fuzzy or normalized matching strategy at all.

## Correctness Properties

Property 1: Bug Condition - Missing Skills and Talents Resolve to Tooltips

_For any_ skill name in `ADV_SKILL_DB` or talent name referenced in career data, the fixed tooltip system SHALL return a non-null `TooltipContent` object with a non-empty description string, regardless of whether the name is a direct entry, a newly-added entry, or a variant name that maps to a canonical entry.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Existing Tooltip Behavior Unchanged

_For any_ skill or talent name that was previously resolving to a tooltip correctly (existing `SKILL_DESCRIPTIONS` entries, existing `TALENT_DB` entries, custom character-level descriptions, grouped skill prefix matches), the fixed tooltip system SHALL produce exactly the same `TooltipContent` result as the original system, preserving all description text, characteristic/max values, and fallback behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/data/skill-descriptions.ts`

**Change**: Add missing skill description entries

**Specific Changes**:
1. **Add Augury entry**: Add `'Augury': 'Interpret signs, omens, and portents to divine the future. (Int, Advanced)'` to `SKILL_DESCRIPTIONS`
2. **Add Psychometry entry**: Add `'Psychometry': 'Read psychic impressions left on objects by strong emotions or magic. (Int, Advanced)'` to `SKILL_DESCRIPTIONS`
3. **Add Runesmithing entry**: Add `'Runesmithing': 'Inscribe magical runes onto weapons, armour, and talismans. (Dex, Advanced)'` to `SKILL_DESCRIPTIONS`

---

**File**: `src/data/talents.ts`

**Change**: Add missing talent entries to `TALENT_DB`

**Specific Changes**:
4. **Add genuinely missing talents**: Add entries for Pharmacist, Numerate, Numismatics, Cat-tongued, Supportive, Flagellant, Sharp-eyed, and Stealthy with appropriate `name`, `max`, and `desc` fields based on WFRP 4e rules

---

**File**: `src/data/talents.ts` (or new file `src/data/talent-aliases.ts`)

**Change**: Create a talent alias map for production use

**Specific Changes**:
5. **Add TALENT_ALIASES constant**: Create a `Record<string, string>` mapping variant names to canonical `TALENT_DB` names:
   ```
   'Warleader' → 'War Leader'
   'Public Speaker' → 'Public Speaking'
   'Public-Speaking' → 'Public Speaking'
   'Cat Fall' → 'Catfall'
   'Detect Artifact' → 'Detect Artefact'
   'Stouthearted' → 'Stout-hearted'
   'Strongminded' → 'Strong-minded'
   'Trick Rider' → 'Trick Riding'
   'Trick-Riding' → 'Trick Riding'
   'Wellprepared' → 'Well-prepared'
   ```

---

**File**: `src/logic/tooltip-content.ts`

**Function**: `resolveTalentTooltip()`

**Specific Changes**:
6. **Add alias resolution before lookup**: Before the `TALENT_DB.find()` call, resolve the talent name through the alias map:
   ```typescript
   const canonicalName = TALENT_ALIASES[talentName] ?? talentName;
   const dbEntry = TALENT_DB.find((t) => t.name === canonicalName);
   ```

---

**File**: `src/data/__tests__/static-data.test.ts`

**Specific Changes**:
7. **Remove workarounds**: Remove entries from `knownMissing` set and `knownAliases` map as they get resolved by actual data additions and production alias resolution

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that call `resolveSkillTooltip()` and `resolveTalentTooltip()` with the affected names and assert they return non-null results. Run these tests on the UNFIXED code to observe failures and confirm the root cause.

**Test Cases**:
1. **Missing Skill Test**: Call `resolveSkillTooltip('Augury', 'Int')` — expect non-null (will fail on unfixed code)
2. **Missing Talent Test**: Call `resolveTalentTooltip('Pharmacist', '')` — expect non-null (will fail on unfixed code)
3. **Name Variant Test**: Call `resolveTalentTooltip('Warleader', '')` — expect non-null (will fail on unfixed code)
4. **All Variants Test**: Loop through all known aliases and assert each resolves (will fail on unfixed code)

**Expected Counterexamples**:
- `resolveSkillTooltip('Augury', 'Int')` returns `null`
- `resolveTalentTooltip('Pharmacist', '')` returns `null`
- `resolveTalentTooltip('Warleader', '')` returns `null`
- Root cause confirmed: missing data entries and no alias resolution

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  IF input.kind == 'skill' THEN
    result := resolveSkillTooltip_fixed(input.name, characteristic)
    ASSERT result != null
    ASSERT result.sections[0].text != ''
  IF input.kind == 'talent' THEN
    result := resolveTalentTooltip_fixed(input.name, '')
    ASSERT result != null
    ASSERT result.sections[0].text != ''
    ASSERT result.sections[1].text != ''  // max field
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT resolveSkillTooltip_original(input) = resolveSkillTooltip_fixed(input)
  ASSERT resolveTalentTooltip_original(input) = resolveTalentTooltip_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the full set of existing skills and talents
- It catches edge cases where new alias logic might accidentally shadow an existing entry
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for all existing skills/talents (capture expected tooltips), then write property-based tests verifying the fixed code produces identical results for those inputs.

**Test Cases**:
1. **Existing Skill Preservation**: For every key in current `SKILL_DESCRIPTIONS`, verify `resolveSkillTooltip()` returns the same content after fix
2. **Existing Talent Preservation**: For every entry in current `TALENT_DB`, verify `resolveTalentTooltip(entry.name, '')` returns the same content after fix
3. **Grouped Skill Preservation**: Verify prefix-match behavior for "Melee (Cavalry)", "Language (Khazalid)" etc. remains unchanged
4. **Custom Talent Fallback Preservation**: Verify `resolveTalentTooltip('CustomTalent', 'My description')` still returns the character description

### Unit Tests

- Test `resolveSkillTooltip()` returns correct content for Augury, Psychometry, Runesmithing
- Test `resolveTalentTooltip()` returns correct content for each newly-added talent
- Test alias resolution for every variant name mapping
- Test that aliases don't interfere when the exact name already exists in `TALENT_DB`
- Test edge cases: empty string talent name, undefined character description

### Property-Based Tests

- Generate random selections from `ADV_SKILL_DB` and verify each has a non-empty tooltip description
- Generate random selections from career talent lists and verify each resolves to a tooltip (after alias resolution)
- Generate random selections from existing `TALENT_DB` entries and verify tooltips remain identical before and after fix
- Test that alias resolution is idempotent (applying alias to an already-canonical name returns the same name)

### Integration Tests

- Test full tooltip render path: career panel shows talent → hover → tooltip popover displays description
- Test that skill tooltips on the character sheet display correctly for all advanced skills
- Test that the advancement page correctly shows tooltips for career skills/talents including those that were previously missing
