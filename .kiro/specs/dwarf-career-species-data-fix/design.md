# Dwarf Career & Species Data Fix - Bugfix Design

## Overview

Two TypeScript data files (`src/data/careers.ts` and `src/data/species.ts`) contain incorrect string literal values for Dwarf-specific entries. The Runesmith and Runescribe careers have wrong statuses, skills, talents, and titles at various levels. All Dwarf subrace entries have incorrect talents (choices listed as fixed values, wrong unique talents, "Ancestral Grudge" erroneously added to all subraces) and incorrect skills. The fix is purely a data correction against the source of truth (`docs/dwarfguide.md`) — no logic, UI, or architecture changes are needed.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — when any of the affected Dwarf career or subrace entries are loaded, their skills, talents, status, or titles do not match `docs/dwarfguide.md`
- **Property (P)**: The desired behavior — every field in the affected entries exactly matches the source of truth document
- **Preservation**: All non-Dwarf species entries, non-Dwarf careers, other Dwarf careers (not Runesmith/Runescribe), base "Dwarf" species entry, and all numerical characteristics must remain unchanged
- **careers.ts**: The TypeScript file at `src/data/careers.ts` containing career progression data (skills, talents, status, titles per level)
- **species.ts**: The TypeScript file at `src/data/species.ts` containing species/subrace data (skills, talents, characteristics)
- **dwarfguide.md**: The source of truth document at `docs/dwarfguide.md` containing canonical Dwarf career and subrace definitions

## Bug Details

### Bug Condition

The bug manifests when any of the 13 affected data entries (2 careers × 4 levels + 11 Dwarf subraces - some overlap in issues) are read from the data files. The string arrays for skills, talents, statuses, and titles contain values that do not match the source of truth.

**Formal Specification:**
```
FUNCTION isBugCondition(entry)
  INPUT: entry of type CareerLevel | SpeciesData
  OUTPUT: boolean

  IF entry.careerName == "Runesmith" THEN
    RETURN entry.status != correctStatus(entry.level)
           OR entry.skills != correctSkills(entry.level)
           OR entry.talents != correctTalents(entry.level)
           OR entry.title != correctTitle(entry.level)
  END IF

  IF entry.careerName == "Runescribe" THEN
    RETURN entry.status != correctStatus(entry.level)
           OR entry.skills != correctSkills(entry.level)
           OR entry.talents != correctTalents(entry.level)
           OR entry.title != correctTitle(entry.level)
  END IF

  IF entry.speciesName STARTS_WITH "Dwarfs (" THEN
    RETURN entry.skills != correctSubraceSkills(entry.speciesName)
           OR entry.talents != correctSubraceTalents(entry.speciesName)
  END IF

  RETURN false
END FUNCTION
```

### Examples

- **Runesmith Level 1**: Currently shows status "Brass 4", should be "Silver 2". Currently shows talent "Craftsman (Smith)", should be "Detect Artefact".
- **Runesmith Level 3**: Currently titled "Master Runesmith", should be "Runemaster". Status "Gold 1" should be "Gold 2".
- **Runescribe Level 2**: Currently includes magical talents "Rune Magic" and "Runesmithing" — this is a non-magical career, correct talents are "Acute Sense (Touch)", "Bookish", "Lip Reading", "Long Memory".
- **Runescribe Level 4**: Currently titled "Runelord Scribe", should be "Loremaster". Includes "Master Rune Magic" — should not have any magical talents.
- **Dwarfs (Barak Varr)**: Currently has "Ancestral Grudge" and "Sea Legs" as fixed talents. Should have "Dealmaker or Strong-minded" as a choice talent and no "Ancestral Grudge".
- **Dwarfs (Karak Kadrin)**: Currently has "Fearless (Everything)" as talent. Should have "Iron Jaw or Read/Write" as a choice.
- **Dwarfs (Karaz-a-Karak)**: Currently shows skills including "Lore (History), Perception, Trade (Smith), Trade (Cook)". Should show "Leadership, Lore (Dwarfs), Lore (Geology), Lore (Metallurgy), Trade (Any One)".

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All non-Dwarf careers (Warrior, Wizard, Ranger, etc.) must retain their current correct data
- The base "Dwarf" species entry must remain unchanged (it already has correct "X or Y" format talents)
- All non-Dwarf species entries (Human, Halfling, Elf variants, Ogre) must remain unchanged
- Other Dwarf-specific careers (Dwarf Engineer, Dwarf Slayer, etc.) must remain unchanged
- All Dwarf subrace numerical values (characteristics, move, fate, resilience, extraPoints) must remain unchanged
- The structure/schema of the data objects must remain unchanged (same field names, same types)

**Scope:**
All entries that are NOT the Runesmith career, Runescribe career, or a Dwarf subrace entry (keys starting with "Dwarfs (") should be completely unaffected by this fix. This includes:
- All Human/Halfling/Elf/Ogre species data
- All non-Runesmith/Runescribe career data
- The base "Dwarf" species entry
- All numeric fields within affected entries (chars, move, fate, resilience, extraPoints)

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Manual Data Entry Errors**: The career data was entered by hand from an earlier or incorrect source, resulting in swapped/scrambled values between related careers (Runesmith got some Runescribe data patterns and vice versa)

2. **Accumulation Pattern Misapplied**: The careers.ts file uses an accumulated pattern (each level includes all previous levels' skills/talents) which doesn't match the source material's per-level format (each level lists only NEW skills/talents)

3. **Choice Format Lost**: The source material uses "X or Y" format for talent choices but the implementation broke these into separate individual entries, losing the choice mechanic

4. **Ancestral Grudge Over-applied**: "Ancestral Grudge" was likely copy-pasted across all subraces from Karaz-a-Karak (where it appears as a choice) without verifying which holds actually have it

## Correctness Properties

Property 1: Bug Condition - Career and Subrace Data Matches Source of Truth

_For any_ entry in careers.ts (Runesmith, Runescribe) or species.ts (all Dwarf subraces) where the bug condition holds (isBugCondition returns true), the fixed data SHALL exactly match the corresponding values specified in `docs/dwarfguide.md`, including correct statuses, titles, skills arrays, and talents arrays with proper "X or Y" choice format preserved.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15, 2.16, 2.17, 2.18, 2.19, 2.20, 2.21, 2.22, 2.23, 2.24, 2.25, 2.26, 2.27, 2.28, 2.29, 2.30**

Property 2: Preservation - Unrelated Data Unchanged

_For any_ entry in careers.ts or species.ts where the bug condition does NOT hold (isBugCondition returns false), the fixed data files SHALL produce exactly the same values as the original files, preserving all non-Dwarf career data, non-Dwarf species data, other Dwarf careers, the base Dwarf entry, and all numerical fields within affected entries.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/data/careers.ts`

**Entry**: `"Runesmith"`

**Specific Changes**:
1. **Level 1 ("Apprentice Runesmith")**: Change status from "Brass 4" to "Silver 2". Replace skills with `["Art (Sculpture or Engraving)", "Cool", "Consume Alcohol", "Endurance", "Evaluate", "Intuition", "Lore (Runes)", "Runesmithing", "Melee (Basic or Two-handed)", "Trade (Smith)"]`. Replace talents with `["Detect Artefact", "Magic Resistance", "Rune Magic (Rune of Striking)", "Strong Back"]`.

2. **Level 2 ("Runesmith")**: Change status from "Silver 3" to "Silver 5". Replace skills with `["Athletics", "Dodge", "Intimidate", "Lore (Geology or Metallurgy)", "Perception", "Stealth (Any One)"]`. Replace talents with `["Forgefire", "Magic Defiance", "Magical Sense", "Rune Magic (All Forms)"]`. Remove characteristics not at this level.

3. **Level 3**: Change title from "Master Runesmith" to "Runemaster". Change status from "Gold 1" to "Gold 2". Replace skills with `["Climb", "Navigation", "Pick Lock", "Set Trap"]`. Replace talents with `["Acute Sense (Touch)", "Long Memory", "Master Rune Magic (All Forms)", "Tireless"]`.

4. **Level 4 ("Runelord")**: Change status from "Gold 3" to "Gold 4". Replace skills with `["Leadership", "Lore (Any)"]`. Replace talents with `["Ancestral Grudge", "Iron Will", "Menacing", "Pure Soul"]`.

**Entry**: `"Runescribe"`

**Specific Changes**:
1. **Level 1**: Change title to "Apprentice Runescribe" (verify). Change status from "Brass 4" to "Brass 3". Replace characteristics with `["T", "Dex", "Int"]`. Replace skills with `["Art (Writing)", "Consume Alcohol", "Entertain (Singing or Storytelling)", "Evaluate", "Gamble", "Haggle", "Language (Any One)", "Lore (Any One)", "Research", "Stealth (Any One)"]`. Replace talents with `["Read/Write", "Speedreader", "Super Numerate", "Supportive"]`.

2. **Level 2 ("Runescribe")**: Change status from "Silver 2" to "Silver 2" (verify). Replace skills with `["Gossip", "Intuition", "Lore (Any One)", "Navigation", "Perception", "Trade (Any One)"]`. Replace talents with `["Acute Sense (Touch)", "Bookish", "Lip Reading", "Long Memory"]`. Remove all magical talents (Rune Magic, Runesmithing).

3. **Level 3**: Change title from "Master Runescribe" to "Lorekeeper". Change status from "Silver 4" to "Silver 5". Replace skills with `["Heal", "Lore (Any One)", "Outdoor Survival", "Track"]`. Replace talents with `["Ancestral Grudge", "Gregarious", "Linguistics", "Savant (Any One)"]`. Remove all magical talents.

4. **Level 4**: Change title from "Runelord Scribe" to "Loremaster". Change status from "Gold 2" to "Gold 2" (verify). Replace skills with `["Cool", "Lore (Any One)"]`. Replace talents with `["Blather", "Detect Artefact", "Public Speaker", "Tireless"]`. Remove all magical talents.

---

**File**: `src/data/species.ts`

**All Dwarf Subrace Entries** (11 entries):

**Specific Changes**:
1. **Dwarfs (Karaz-a-Karak)**: Replace skills with `["Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Language (Khazalid)", "Leadership", "Lore (Dwarfs)", "Lore (Geology)", "Lore (Metallurgy)", "Melee (Basic)", "Trade (Any One)"]`. Replace talents with `["Ancestral Grudge or Resolute", "Magic Resistance", "Night Vision", "Read/Write or Relentless", "Sturdy"]`.

2. **Dwarfs (Barak Varr)**: Replace skills with `["Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Haggle", "Language (Khazalid)", "Lore (Dwarfs)", "Melee (Basic)", "Navigation", "Sail", "Trade (Any One)"]`. Replace talents with `["Dealmaker or Strong-minded", "Magic Resistance", "Night Vision", "Read/Write or Resolute", "Sturdy"]`.

3. **Dwarfs (Karak Azul)**: Replace skills with `["Climb", "Consume Alcohol", "Cool", "Endurance", "Evaluate", "Haggle", "Intimidate", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Metallurgy)", "Melee (Basic)", "Trade (Any One)"]`. Replace talents with `["Hatred (Orcs and Goblins) or Resolute", "Magic Resistance", "Night Vision", "Read/Write or Relentless", "Sturdy"]`.

4. **Dwarfs (Karak Eight Peaks)**: Replace skills with `["Consume Alcohol", "Cool", "Endurance", "Evaluate", "Intuition", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Geology)", "Lore (Warfare)", "Melee (Basic)", "Set Traps", "Trade (Any One)"]`. Replace talents with `["Magic Resistance", "Night Vision", "Read/Write or Resolute", "Strong-minded or Tenacious", "Sturdy"]`.

5. **Dwarfs (Karak Kadrin)**: Replace skills with `["Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Gamble", "Intimidate", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Metallurgy)", "Melee (Basic)", "Trade (Any One)"]`. Replace talents with `["Iron Jaw or Read/Write", "Magic Resistance", "Night Vision", "Resolute or Strong-minded", "Sturdy"]`.

6. **Dwarfs (Zhufbar)**: Replace skills with `["Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Engineering)", "Lore (Geology)", "Lore (Metallurgy)", "Melee (Basic)", "Trade (Any One)"]`. Replace talents with `["Magic Resistance", "Night Vision", "Read/Write or Relentless", "Strong-minded or Tinker", "Sturdy"]`.

7. **Dwarfs (Karak Hirn/Black Mountains)**: Replace skills with `["Consume Alcohol", "Climb", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Haggle", "Language (Khazalid)", "Lore (Dwarfs)", "Melee (Basic)", "Play (Horn)", "Trade (Any One)"]`. Replace talents with `["Magic Resistance", "Night Vision", "Read/Write or Relentless", "Scale Sheer Surface or Strong-minded", "Sturdy"]`.

8. **Dwarfs (Karak Izor/The Vaults)**: Replace skills with `["Consume Alcohol", "Climb", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Geology)", "Melee (Basic)", "Outdoor Survival", "Trade (Any One)"]`. Replace talents with `["Enclosed Fighter or Resolute", "Magic Resistance", "Night Vision", "Read/Write or Relentless", "Sturdy"]`.

9. **Dwarfs (Karak Norn/Grey Mountains)**: Replace skills with `["Consume Alcohol", "Climb", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Language (Khazalid)", "Lore (Dwarfs)", "Melee (Basic)", "Perception", "Ranged (Crossbow)", "Trade (Any One)"]`. Replace talents with `["Magic Resistance", "Night Vision", "Read/Write or Relentless", "Resolute or Stone Soup", "Sturdy"]`.

10. **Dwarfs (Norse)**: Replace skills with `["Climb", "Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Language (Khazalid)", "Language (Norse)", "Lore (Dwarfs)", "Melee (Basic)", "Sail", "Trade (Any One)"]`. Replace talents with `["Carouser or Strong-minded", "Magic Resistance", "Night Vision", "Read/Write or Relentless", "Sturdy"]`.

11. **Dwarfs (Imperial)**: Replace skills with `["Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Intimidate", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Geology)", "Lore (Metallurgy)", "Melee (Basic)", "Trade (Any One)"]`. Replace talents with `["Magic Resistance", "Night Vision", "Read/Write or Relentless", "Resolute or Strong-minded", "Sturdy"]`.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that import the data files and compare field values against the source-of-truth values from `docs/dwarfguide.md`. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Runesmith Status Test**: Assert Runesmith Level 1 status === "Silver 2" (will fail on unfixed code, showing "Brass 4")
2. **Runesmith Title Test**: Assert Runesmith Level 3 title === "Runemaster" (will fail on unfixed code, showing "Master Runesmith")
3. **Runescribe No-Magic Test**: Assert Runescribe Level 2 talents does NOT include "Rune Magic" (will fail on unfixed code)
4. **Subrace Choice Format Test**: Assert Dwarfs (Barak Varr) talents includes "Dealmaker or Strong-minded" (will fail on unfixed code)
5. **Subrace No Ancestral Grudge Test**: Assert Dwarfs (Barak Varr) talents does NOT include standalone "Ancestral Grudge" (will fail on unfixed code)

**Expected Counterexamples**:
- Status values will differ from source of truth
- Titles at levels 3-4 will not match for both careers
- Magical talents appear in the non-magical Runescribe career
- "Ancestral Grudge" appears as standalone talent in subraces that shouldn't have it

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed data produces the expected values.

**Pseudocode:**
```
FOR ALL entry WHERE isBugCondition(entry) DO
  result := loadEntry_fixed(entry.key)
  ASSERT result.status == expectedStatus(entry)
  ASSERT result.title == expectedTitle(entry)
  ASSERT result.skills == expectedSkills(entry)
  ASSERT result.talents == expectedTalents(entry)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed data is identical to the original.

**Pseudocode:**
```
FOR ALL entry WHERE NOT isBugCondition(entry) DO
  ASSERT loadEntry_original(entry) == loadEntry_fixed(entry)
END FOR
```

**Testing Approach**: Snapshot comparison testing is recommended for preservation checking because:
- It captures the entire state of unaffected entries
- Any unintended change to an unrelated entry will immediately surface
- It provides strong guarantees that only the intended fields were modified

**Test Plan**: Capture the current values of all non-affected entries, then verify they remain identical after the fix is applied.

**Test Cases**:
1. **Non-Dwarf Career Preservation**: Verify all careers other than Runesmith/Runescribe retain their current data
2. **Base Dwarf Species Preservation**: Verify the "Dwarf" entry retains its current correct data
3. **Non-Dwarf Species Preservation**: Verify Human, Halfling, Elf, Ogre entries are unchanged
4. **Numeric Fields Preservation**: Verify all characteristics, move, fate, resilience, extraPoints values are unchanged for affected Dwarf subraces
5. **Other Dwarf Career Preservation**: Verify Dwarf Engineer, Dwarf Slayer, etc. retain their current data

### Unit Tests

- Test each career level's status, title, skills, and talents against expected values
- Test each Dwarf subrace's skills and talents against expected values
- Test that talent choice format ("X or Y") is preserved as single strings
- Test that no magical talents appear in Runescribe career at any level

### Property-Based Tests

- Generate random selections from all career entries and verify Runesmith/Runescribe match source of truth while others are unchanged
- Generate random selections from all species entries and verify Dwarf subraces match source of truth while others are unchanged
- Verify that all talent strings in Dwarf subraces containing " or " have exactly one " or " (valid choice format)

### Integration Tests

- Test that loading a character with Runesmith career displays correct progression data
- Test that loading a character with a Dwarf subrace displays correct talent choices
- Test that character creation flow presents talent choices correctly (not as fixed values)
