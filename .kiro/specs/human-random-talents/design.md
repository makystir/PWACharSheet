# Human/Halfling Random Talents Bugfix Design

## Overview

The Character Creation Wizard is missing random talents for Humans (3 random) and Halflings (2 random) that should be rolled from the WFRP 4e d100 Random Talent table during character creation. The fix adds a `randomTalentSlots` field to `SpeciesData`, introduces the Random Talent table as a data source, extends the wizard UI with roll/reroll controls for random talent slots, and integrates rolled results into the final character talent list. Species without random talent slots (Dwarfs, Elves) are unaffected.

## Glossary

- **Bug_Condition (C)**: The condition where a species has random talent slots defined in the rules but the system provides no way to roll or assign them — applies to Human/Reiklander (3 slots) and Halfling (2 slots)
- **Property (P)**: The desired behavior — random talents are rolled from the d100 table, displayed in the wizard, duplicates are rerollable, and all results are saved to the character
- **Preservation**: Existing behavior for species without random talents (Dwarfs, High Elves, Wood Elves), existing fixed talent handling (Doomed, Savvy or Suave, etc.), and all other wizard steps must remain unchanged
- **`SpeciesData`**: The interface in `src/types/character.ts` defining species attributes including `talents: string[]`
- **`randomTalentSlots`**: New optional field on `SpeciesData` indicating how many d100 random talents a species receives
- **`RANDOM_TALENT_TABLE`**: New data structure mapping d100 roll ranges to talent names (36 entries)
- **`getResolvedTalents()`**: Function in `CharacterWizard.tsx` that resolves species talent choices to final names
- **`rollD100()`**: Existing inline dice helper in the wizard that returns 1–100

## Bug Details

### Bug Condition

The bug manifests when creating a Human (Reiklander) or Halfling character. The `SPECIES_DATA` entries for these species only list their fixed talents and contain no indication that additional random talents are required. The wizard's Step 4 renders only the `speciesTalentList` from `speciesData.talents`, which has no random talent slots, so the player never gets the opportunity to roll for them.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { species: string }
  OUTPUT: boolean
  
  RETURN species IN ["Human / Reiklander", "Halfling"]
         AND rulebookRandomTalentCount(species) > 0
         AND speciesData.randomTalentSlots IS undefined OR 0
         AND wizardProvidesNoRollingMechanism(species)
END FUNCTION
```

### Examples

- **Human character creation**: Player selects "Human / Reiklander", reaches Step 4, sees only "Doomed" and "Savvy or Suave" — expected: also sees 3 random talent roll buttons with results like "Warrior Born", "Suave", "Sharp"
- **Halfling character creation**: Player selects "Halfling", reaches Step 4, sees only "Acute Sense (Taste)", "Night Vision", "Resistance (Chaos)", "Small" — expected: also sees 2 random talent roll buttons with results like "Nimble Fingered", "Small"
- **Duplicate rolled**: Player rolls "Night Vision" for a Halfling who already has it from fixed talents — expected: system flags duplicate and offers reroll; actual: scenario impossible since rolling doesn't exist
- **Dwarf character creation**: Player selects "Dwarf", reaches Step 4, sees fixed talents only — expected: no random talent section appears (unchanged)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Species without `randomTalentSlots` (Dwarfs, High Elves, Wood Elves, all Dwarf sub-species) must show no random talent UI and function exactly as before
- Fixed species talents ("Doomed", "Savvy or Suave" for Humans; "Acute Sense (Taste)", "Night Vision", etc. for Halflings) must continue to appear and be selectable/displayed as before
- The "Savvy or Suave" choice mechanism (`parseTalentOptions`, `speciesTalentChoices` state) must continue to work identically
- All other wizard steps (1–3, 5–6) must be completely unaffected
- Mouse/keyboard interactions with existing talent buttons must work identically
- The `applySpeciesData()` function in `src/logic/species.ts` and its behavior with `speciesTalents` must remain compatible
- Character save/load via localStorage must continue to work

**Scope:**
All inputs that do NOT involve species with `randomTalentSlots > 0` should be completely unaffected by this fix. This includes:
- All Dwarf variants (10+ entries in SPECIES_DATA)
- High Elf and Wood Elf
- Any future species added without `randomTalentSlots`
- All non-talent wizard steps for any species

## Hypothesized Root Cause

Based on the bug description, the root causes are:

1. **Missing Data Field**: `SpeciesData` interface has no `randomTalentSlots` field — there's no way for the system to know a species needs random talents
   - Human entry has `talents: ["Doomed", "Savvy or Suave"]` with no indication of 3 additional random slots
   - Halfling entry has `talents: ["Acute Sense (Taste)", "Night Vision", "Resistance (Chaos)", "Small"]` with no indication of 2 additional random slots

2. **Missing Random Talent Table**: No data file contains the d100 Random Talent table (36 entries with roll ranges mapping to talent names) — even if the wizard tried to roll, there's no lookup table

3. **Missing Wizard State**: `CharacterWizard.tsx` has no state for tracking rolled random talents — no `useState` for random talent results, no roll handler, no reroll logic

4. **Missing UI**: The `renderStep4()` function only iterates `speciesTalentList` and renders fixed/choice talents — there's no conditional section for random talent rolling

5. **Missing Finalization**: The `getResolvedTalents()` function only resolves from `speciesTalentList` — rolled random talents would not be included in the final character's talent array

## Correctness Properties

Property 1: Bug Condition - Random Talents Are Rolled and Saved

_For any_ character creation where the selected species has `randomTalentSlots > 0` (Human/Reiklander with 3, Halfling with 2), the wizard SHALL provide a rolling mechanism for each slot, resolve each roll to a valid talent from the Random Talent table, and include all rolled random talents in the character's final talent list alongside fixed species talents.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6**

Property 2: Preservation - Non-Random-Talent Species Unchanged

_For any_ character creation where the selected species does NOT have `randomTalentSlots > 0` (Dwarfs, High Elves, Wood Elves), the wizard SHALL produce exactly the same behavior as the original code, with no random talent UI displayed and no changes to existing talent assignment logic.

**Validates: Requirements 3.1, 3.2, 3.3, 3.6, 3.7**

Property 3: Preservation - Fixed Talents Unchanged for Random-Talent Species

_For any_ character creation where the selected species has random talent slots (Human, Halfling), the fixed species talents SHALL continue to be assigned exactly as before — "Doomed" and "Savvy or Suave" for Humans, "Acute Sense (Taste)", "Night Vision", "Resistance (Chaos)", "Small" for Halflings — in addition to the new random talents.

**Validates: Requirements 3.4, 3.5, 3.6**

Property 4: Bug Condition - Duplicate Detection and Reroll

_For any_ random talent roll that produces a talent the character already possesses (from fixed species talents or a previous random roll in the same session), the system SHALL flag the duplicate and allow the player to reroll that specific slot.

**Validates: Requirements 2.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/types/character.ts`

**Change**: Add optional `randomTalentSlots` field to `SpeciesData` interface

**Specific Changes**:
1. **Add field**: `randomTalentSlots?: number` to `SpeciesData` interface

---

**File**: `src/data/species.ts`

**Change**: Add `randomTalentSlots` to Human and Halfling entries

**Specific Changes**:
1. **Human / Reiklander**: Add `randomTalentSlots: 3`
2. **Halfling**: Add `randomTalentSlots: 2`

---

**File**: `src/data/randomTalents.ts` (new file)

**Change**: Create the d100 Random Talent table data

**Specific Changes**:
1. **Export interface**: `RandomTalentEntry` with `{ min: number, max: number, talent: string }`
2. **Export array**: `RANDOM_TALENT_TABLE` — 36 entries covering roll ranges 01–100
3. **Export function**: `rollRandomTalent(roll: number): string` — maps a d100 result to a talent name

---

**File**: `src/components/shared/CharacterWizard.tsx`

**Change**: Add random talent state, rolling logic, duplicate detection, reroll UI, and include results in finalization

**Specific Changes**:
1. **New state**: `const [randomTalents, setRandomTalents] = useState<(string | null)[]>([])` — tracks rolled talent for each slot
2. **Reset on species change**: When `species` changes, reset `randomTalents` to `Array(speciesData.randomTalentSlots ?? 0).fill(null)`
3. **Roll handler**: `handleRollRandomTalent(slotIndex: number)` — calls `rollD100()`, looks up result in `RANDOM_TALENT_TABLE`, sets state for that slot
4. **Duplicate detection**: Compare rolled talent against `getResolvedTalents()` results and other `randomTalents` entries — flag if already present
5. **Reroll button**: Conditional reroll button appears when duplicate is detected for a slot
6. **UI section**: In `renderStep4()`, after species talents card, conditionally render a "Random Talents" card when `speciesData.randomTalentSlots > 0` showing each slot with roll/reroll buttons and result display
7. **Finalization update**: In the character build step, append `randomTalents.filter(Boolean)` to the resolved talents before adding to `char.talents`

---

**File**: `src/logic/species.ts` (minor, optional)

**Change**: No change strictly required — `applySpeciesData` copies `data.talents` which remains the fixed talents array. Random talents are managed by the wizard state and added during finalization.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that inspect `SPECIES_DATA` entries and the wizard rendering for Human/Halfling to confirm the absence of random talent slots and rolling UI. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Missing randomTalentSlots field**: Assert `SPECIES_DATA["Human / Reiklander"].randomTalentSlots` exists and equals 3 (will fail on unfixed code)
2. **Missing randomTalentSlots for Halfling**: Assert `SPECIES_DATA["Halfling"].randomTalentSlots` exists and equals 2 (will fail on unfixed code)
3. **Missing Random Talent Table**: Assert import of `RANDOM_TALENT_TABLE` resolves and has 36 entries (will fail on unfixed code — file doesn't exist)
4. **No Roll UI rendered**: Render wizard Step 4 for Human, assert a "Roll Random Talent" button exists (will fail on unfixed code)

**Expected Counterexamples**:
- `SPECIES_DATA["Human / Reiklander"].randomTalentSlots` is `undefined`
- No `RANDOM_TALENT_TABLE` export exists in the codebase
- No "Random Talent" or "Roll" button appears in Step 4 for Human species

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL species WHERE SPECIES_DATA[species].randomTalentSlots > 0 DO
  FOR slotIndex IN 0..randomTalentSlots-1 DO
    roll := rollD100()
    talent := lookupRandomTalent(roll)
    ASSERT talent IS NOT empty
    ASSERT talent IN TALENT_DB.names OR RANDOM_TALENT_TABLE.talents
  END FOR
  ASSERT character.talents CONTAINS all rolled random talents
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL species WHERE (SPECIES_DATA[species].randomTalentSlots ?? 0) == 0 DO
  ASSERT renderStep4(species) produces identical output to original
  ASSERT getResolvedTalents(species) == original getResolvedTalents(species)
  ASSERT finalCharacter.talents == original finalCharacter.talents
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (all non-random species)
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for Dwarf/Elf species talent assignment, then write property-based tests capturing that behavior and verifying it remains identical after the fix.

**Test Cases**:
1. **Dwarf Talent Preservation**: Verify all Dwarf variants still receive only their fixed talents with no random talent UI
2. **Elf Talent Preservation**: Verify High Elf and Wood Elf still receive only their fixed talents (including "or" choices)
3. **Human Fixed Talent Preservation**: Verify "Doomed" and "Savvy or Suave" still appear and function for Human alongside the new random talents
4. **Halfling Fixed Talent Preservation**: Verify "Acute Sense (Taste)", "Night Vision", "Resistance (Chaos)", "Small" still appear for Halfling alongside new random talents

### Unit Tests

- Test `rollRandomTalent()` returns valid talent name for all roll values 1–100
- Test `RANDOM_TALENT_TABLE` covers the full range 1–100 with no gaps or overlaps
- Test duplicate detection correctly identifies when a rolled talent matches a fixed species talent
- Test duplicate detection correctly identifies when a rolled talent matches another random slot
- Test that `randomTalentSlots` is 3 for Human, 2 for Halfling, undefined/0 for all others
- Test wizard state resets random talents when species changes

### Property-Based Tests

- Generate random d100 values (1–100) and verify `rollRandomTalent()` always returns a non-empty string from the valid talent set
- Generate random species selections and verify only Human/Halfling trigger random talent UI (property: `hasRandomUI(species) ⟺ (species.randomTalentSlots ?? 0) > 0`)
- Generate random sequences of rolls for a species and verify the final character talent list contains exactly the fixed talents plus all non-null random talents
- Generate random species from the non-random set and verify `getResolvedTalents()` output matches the pre-fix behavior exactly

### Integration Tests

- Test full Human character creation flow: select Human → reach Step 4 → roll 3 random talents → complete wizard → verify character has Doomed + chosen(Savvy/Suave) + 3 random talents
- Test full Halfling character creation flow: select Halfling → reach Step 4 → roll 2 random talents → complete wizard → verify character has fixed 4 + 2 random talents
- Test duplicate reroll flow: mock `rollD100` to return a value that maps to "Night Vision" for a Halfling → verify duplicate flagged → reroll → verify new non-duplicate talent assigned
- Test species change resets random talents: select Human → roll talents → change to Dwarf → verify no random talent state remains → change back to Human → verify slots reset to unrolled
