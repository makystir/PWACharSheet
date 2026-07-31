# Species Data Accuracy Audit Bugfix Design

## Overview

The `src/data/species.ts` file contains incorrect species data for Halfling (wrong skill), base High Elf (wrong skill), and Sea Elf (missing talent). These inaccuracies were identified during an audit against official WFRP 4e source documents. Additionally, six source reference documents are located in the project root instead of the `docs/` directory. The fix involves correcting the three data entries and relocating the source files to maintain project organization.

## Glossary

- **Bug_Condition (C)**: The condition that triggers incorrect species data — when a Halfling, base High Elf, or Sea Elf character is created and the system provides incorrect skills/talents
- **Property (P)**: The desired behavior — species data entries match their official WFRP 4e source documents exactly
- **Preservation**: All other species entries (Human, Dwarf subraces, Wood Elf, Ogre, High Elf subraces) must remain unchanged by the fix
- **SPECIES_DATA**: The exported Record in `src/data/species.ts` that defines all species characteristics, skills, and talents
- **Core Rulebook**: Warhammer Fantasy Roleplay 4th Edition core rulebook, page 33, defining base species skills/talents
- **High Elf Player's Guide**: Source document defining High Elf subrace data including Sea Elf talents (p.57)

## Bug Details

### Bug Condition

The bug manifests when a user selects Halfling, base High Elf, or Sea Elf during character creation. The `SPECIES_DATA` object contains incorrect skill/talent values that do not match the official source documents.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { speciesKey: string, fieldType: "skill" | "talent" }
  OUTPUT: boolean

  RETURN (input.speciesKey == "Halfling" AND input.fieldType == "skill"
          AND "Gossip" IN SPECIES_DATA["Halfling"].skills)
         OR (input.speciesKey == "High Elf" AND input.fieldType == "skill"
          AND "Research" IN SPECIES_DATA["High Elf"].skills)
         OR (input.speciesKey == "High Elves (Sea Elf)" AND input.fieldType == "talent"
          AND "Uncouth Uranai" NOT IN SPECIES_DATA["High Elves (Sea Elf)"].talents)
END FUNCTION
```

### Examples

- **Halfling skill error**: User creates Halfling character → system shows "Gossip" in species skills → expected "Trade (Cook)" per core rulebook p.33
- **High Elf skill error**: User creates High Elf character → system shows "Research" in species skills → expected "Swim" per core rulebook p.33
- **Sea Elf missing talent**: User creates Sea Elf character → system shows 5 talents → expected 6 talents including "Uncouth Uranai" per High Elf Player's Guide p.57
- **Source file location**: Developer looks in `docs/` for `WarhammerFantasyRoleplay4e.md` → file is in project root instead

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Human/Reiklander species skills and talents must remain exactly as currently defined
- All Dwarf subrace entries (already corrected in prior spec) must remain unchanged
- Wood Elf species skills and talents must remain unchanged
- Ogre species skills, talents, and characteristics must remain unchanged
- All High Elf subrace entries (Caledor, Ellyrion, Avelorn, Saphery, Eataine, Tiranoc, Nagarythe, Chrace, Cothique, Yvresse) must remain unchanged
- Halfling characteristics, move, fate, resilience, extraPoints, woundsUseSB, and randomTalentSlots must remain unchanged
- High Elf characteristics, move, fate, resilience, extraPoints, and woundsUseSB must remain unchanged
- Sea Elf characteristics, move, fate, resilience, extraPoints, woundsUseSB, and skills must remain unchanged
- Existing character sheets loaded from storage must display correctly without data loss

**Scope:**
All inputs that do NOT involve the three corrected data entries should be completely unaffected by this fix. This includes:
- Character creation with any species other than Halfling, base High Elf, or Sea Elf
- All non-corrected fields of the Halfling, High Elf, and Sea Elf entries
- Application rendering, state management, and persistence logic
- Any functionality that reads from `docs/` directory (files will be moved there, not removed)

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Halfling "Gossip" error**: The skill was likely transcribed from an incorrect source or confused with the Human/Reiklander skill list (which correctly includes "Gossip"). The core rulebook p.33 specifies "Trade (Cook)" for Halflings.

2. **High Elf "Research" error**: The skill "Research" was likely confused with the Saphery subrace skill list (which correctly includes "Research"). The base High Elf entry should have "Swim" per the core rulebook p.33.

3. **Sea Elf missing "Uncouth Uranai" talent**: The talent was likely omitted during initial data entry from the High Elf Player's Guide. The Sea Elf entry currently has 5 talents but should have 6.

4. **Source files in root directory**: The source markdown files were likely added to the project root before the `docs/` directory convention was established. Other source documents (dwarfguide.md, highelfguide.md, Errata.pdf) are already correctly placed in `docs/`.

## Correctness Properties

Property 1: Bug Condition - Species Data Matches Source Documents

_For any_ species entry where the bug condition holds (Halfling skills contain "Gossip", High Elf skills contain "Research", or Sea Elf talents lack "Uncouth Uranai"), the fixed SPECIES_DATA SHALL contain the correct values: "Trade (Cook)" for Halfling, "Swim" for High Elf, and "Uncouth Uranai" included in Sea Elf talents, matching the official source documents.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Unchanged Species Data Integrity

_For any_ species entry where the bug condition does NOT hold (all species other than the three corrected entries, and all non-corrected fields of those entries), the fixed SPECIES_DATA SHALL produce exactly the same values as the original data, preserving all existing species characteristics, skills, talents, and metadata.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/data/species.ts`

**Object**: `SPECIES_DATA`

**Specific Changes**:
1. **Halfling skill correction**: In the `"Halfling"` entry's `skills` array, replace `"Gossip"` with `"Trade (Cook)"`
   - Current: `["Charm", "Consume Alcohol", "Dodge", "Gamble", "Gossip", "Haggle", ...]`
   - Fixed: `["Charm", "Consume Alcohol", "Dodge", "Gamble", "Haggle", "Intuition", "Language (Mootish)", "Lore (Reikland)", "Perception", "Sleight of Hand", "Stealth (Any)", "Trade (Cook)"]`

2. **High Elf skill correction**: In the `"High Elf"` entry's `skills` array, replace `"Research"` with `"Swim"`
   - Current: `["Cool", "Entertain (Sing)", "Evaluate", "Language (Eltharin)", "Leadership", "Melee (Basic)", "Navigation", "Perception", "Play (Any)", "Ranged (Bow)", "Research", "Sail"]`
   - Fixed: `["Cool", "Entertain (Sing)", "Evaluate", "Language (Eltharin)", "Leadership", "Melee (Basic)", "Navigation", "Perception", "Play (Any)", "Ranged (Bow)", "Sail", "Swim"]`

3. **Sea Elf talent addition**: In the `"High Elves (Sea Elf)"` entry's `talents` array, add `"Uncouth Uranai"`
   - Current: `["Acute Sense (Sight)", "Night Vision", "Old Salt or Strong Swimmer", "Orientation or Sixth Sense", "Read/Write"]`
   - Fixed: `["Acute Sense (Sight)", "Night Vision", "Old Salt or Strong Swimmer", "Orientation or Sixth Sense", "Read/Write", "Uncouth Uranai"]`

**File relocations** (root → `docs/`):
4. **Move source documents**: Relocate the following files from the project root to the `docs/` directory:
   - `Up_In_Arms.md` → `docs/Up_In_Arms.md`
   - `WarhammerFantasyRoleplay4e.md` → `docs/WarhammerFantasyRoleplay4e.md`
   - `windsofmagic.md` → `docs/windsofmagic.md`
   - `archivesoftheempire.md` → `docs/archivesoftheempire.md`
   - `archivesoftheempire2.md` → `docs/archivesoftheempire2.md`
   - `archivesoftheempire3.md` → `docs/archivesoftheempire3.md`

5. **Verify no broken references**: Ensure no imports, scripts, or configuration files reference the old root-level paths of the moved documents.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that assert the correct skill/talent values for Halfling, High Elf, and Sea Elf entries. Run these tests on the UNFIXED code to observe failures and confirm the data discrepancies.

**Test Cases**:
1. **Halfling Skill Test**: Assert that `SPECIES_DATA["Halfling"].skills` contains "Trade (Cook)" and does NOT contain "Gossip" (will fail on unfixed code)
2. **High Elf Skill Test**: Assert that `SPECIES_DATA["High Elf"].skills` contains "Swim" and does NOT contain "Research" (will fail on unfixed code)
3. **Sea Elf Talent Test**: Assert that `SPECIES_DATA["High Elves (Sea Elf)"].talents` contains "Uncouth Uranai" (will fail on unfixed code)
4. **Sea Elf Talent Count Test**: Assert that Sea Elf talents array has 6 entries (will fail on unfixed code — currently has 5)

**Expected Counterexamples**:
- Halfling skills array contains "Gossip" instead of "Trade (Cook)"
- High Elf skills array contains "Research" instead of "Swim"
- Sea Elf talents array is missing "Uncouth Uranai" and has only 5 entries

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL speciesKey WHERE isBugCondition(speciesKey) DO
  result := SPECIES_DATA_FIXED[speciesKey]
  ASSERT expectedSkillsAndTalents(result, officialSourceData)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL speciesKey WHERE NOT isBugCondition(speciesKey) DO
  ASSERT SPECIES_DATA_ORIGINAL[speciesKey] == SPECIES_DATA_FIXED[speciesKey]
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It can generate random species selections and verify all non-affected entries remain identical
- It catches accidental modifications to unrelated entries that manual tests might miss
- It provides strong guarantees that the fix is surgical and does not introduce regressions

**Test Plan**: Snapshot the UNFIXED data for all non-affected species, then write property-based tests verifying the fixed data matches the snapshot for every non-affected entry.

**Test Cases**:
1. **Human Preservation**: Verify Human/Reiklander skills and talents remain identical after fix
2. **Dwarf Preservation**: Verify all Dwarf subrace entries remain identical after fix
3. **Wood Elf Preservation**: Verify Wood Elf skills and talents remain identical after fix
4. **Ogre Preservation**: Verify Ogre skills, talents, and characteristics remain identical after fix
5. **High Elf Subrace Preservation**: Verify all 10 High Elf subrace entries remain identical after fix
6. **Halfling Metadata Preservation**: Verify Halfling chars, move, fate, resilience, extraPoints, woundsUseSB, randomTalentSlots, and talents remain unchanged
7. **Sea Elf Metadata Preservation**: Verify Sea Elf chars, move, fate, resilience, extraPoints, woundsUseSB, and skills remain unchanged

### Unit Tests

- Test that Halfling skills array contains "Trade (Cook)" and not "Gossip"
- Test that High Elf skills array contains "Swim" and not "Research"
- Test that Sea Elf talents array contains "Uncouth Uranai"
- Test that Sea Elf talents array has exactly 6 entries
- Test that each affected entry has exactly 12 skills (Halfling, High Elf) and 6 talents (Sea Elf)
- Test that source documents exist in `docs/` and not in project root

### Property-Based Tests

- Generate random species keys from SPECIES_OPTIONS and verify non-affected entries match expected snapshot
- Generate random field access patterns (chars, skills, talents, move, fate, etc.) and verify preservation for unmodified species
- Verify that all skills arrays contain only valid WFRP 4e skill names (no typos introduced)

### Integration Tests

- Test that character creation flow with Halfling produces correct skill selections
- Test that character creation flow with High Elf produces correct skill selections
- Test that character creation flow with Sea Elf produces correct talent selections
- Test that loading a previously saved character sheet with old data does not cause errors
