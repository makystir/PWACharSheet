# Design Document: Dwarf Priestly Runic Magic

## Overview

This feature adds deity-based rune filtering for Dwarf priest characters alongside the existing Runesmith system. Dwarf priests inscribe Runic Magic of limited power based on their patron Ancestor God. Each of the seven Ancestor Gods grants access to a specific subset of runes from the existing `RUNE_CATALOGUE`.

The design extends the current `Character` interface with a deity field, introduces a static `DEITY_REGISTRY` data module mapping each god to their permitted runes, and layers a priest-specific filter on top of the existing `canLearnRune` / `getAvailableRunesForItem` functions — without altering Runesmith behavior.

### Key Design Decisions

1. **Additive approach**: The priest system layers on top of the Runesmith system rather than replacing it. Both career paths share `knownRunes` and existing rune placement validation.
2. **Static registry**: Deity-to-rune mappings are compile-time constants (like `RUNE_CATALOGUE`), not dynamic data. This ensures correctness via type-checking and simplifies testing.
3. **Career-level detection via title matching**: High Priest status is derived from the character's `careerLevel` field (the title string) and career scheme data, consistent with how the app already tracks career progression.
4. **Non-destructive deity change**: Changing a deity or losing High Priest status never removes runes from `knownRunes`. Restricted runes are visually flagged but retained.

## Architecture

```mermaid
graph TD
    subgraph Data Layer
        RC[RUNE_CATALOGUE<br/>src/data/runes.ts]
        DR[DEITY_REGISTRY<br/>src/data/deityRunes.ts]
    end

    subgraph Logic Layer
        RF[priestRuneFilter<br/>src/logic/priestRunes.ts]
        RL[canLearnRune / learnRune<br/>src/logic/runes.ts]
        CL[getCareerLevelNumber<br/>src/logic/careers.ts]
    end

    subgraph UI Layer
        DS[DeitySelector<br/>src/components/shared/DeitySelector.tsx]
        RP[RunePanel<br/>(existing, modified)]
    end

    subgraph State
        CH[Character Interface<br/>src/types/character.ts]
    end

    DR --> RF
    RC --> RF
    RF --> RL
    CL --> RF
    CH --> RF
    RF --> RP
    DS --> CH
```

### Data Flow

1. User selects a deity via `DeitySelector` → stored in `character.patronDeity`.
2. When viewing available runes, `priestRuneFilter` checks if the character is a priest.
3. If priest: filters `RUNE_CATALOGUE` by the deity's access list from `DEITY_REGISTRY`, adds High Priest bonus if applicable.
4. If Runesmith (non-priest): no deity filtering applied.
5. `canLearnRune` calls the priest filter to restrict available runes before checking prerequisites.

## Components and Interfaces

### New Data Module: `src/data/deityRunes.ts`

```typescript
export type AncestorGod = 'Grungni' | 'Valaya' | 'Grimnir' | 'Gazul' | 'Smednir' | 'Thungni' | 'Morgrim';

export const ANCESTOR_GODS: AncestorGod[] = [
  'Grungni', 'Valaya', 'Grimnir', 'Gazul', 'Smednir', 'Thungni', 'Morgrim'
];

export interface DeityRuneEntry {
  god: AncestorGod;
  runeIds: string[];           // IDs from RUNE_CATALOGUE
  highPriestBonus?: string;    // Optional bonus Master Rune ID
}

export const DEITY_REGISTRY: DeityRuneEntry[];
```

### New Logic Module: `src/logic/priestRunes.ts`

```typescript
export interface PriestRuneFilterResult {
  availableRuneIds: string[];
  restrictedRuneIds: string[];  // Known runes not in deity list
}

// Core filter function
export function getPriestAvailableRunes(
  deity: AncestorGod | null | undefined,
  isHighPriest: boolean
): string[];

// Identify which known runes are restricted for current deity
export function getRestrictedRunes(
  knownRunes: string[],
  deity: AncestorGod | null | undefined
): string[];

// Check if a character is a priest (based on career)
export function isPriestCareer(career: string): boolean;

// Check if character is at High Priest level (career level 3 or 4)
export function isHighPriestLevel(career: string, careerLevel: string): boolean;

// Main entry: should deity filter be applied?
export function shouldApplyDeityFilter(character: Character): boolean;

// Validate deity assignment
export function isValidDeity(value: string): value is AncestorGod;

// Get deity change warnings
export function getDeityChangeWarnings(
  knownRunes: string[],
  newDeity: AncestorGod
): string[];  // Names of runes that will become restricted
```

### Modified: `src/logic/runes.ts`

The existing `canLearnRune` function is extended to call the priest filter:

```typescript
export function canLearnRune(runeId: string, character: Character): { canLearn: boolean; error?: string } {
  // ... existing checks (unknown rune, already known, talent prereqs, XP) ...
  
  // NEW: Priest deity restriction check
  if (shouldApplyDeityFilter(character)) {
    const availableRunes = getPriestAvailableRunes(
      character.patronDeity,
      isHighPriestLevel(character.career, character.careerLevel)
    );
    if (!availableRunes.includes(runeId)) {
      const rune = getRuneById(runeId);
      return { 
        canLearn: false, 
        error: `${rune?.name ?? runeId} is not permitted by the priesthood of ${character.patronDeity}.` 
      };
    }
  }
  
  return { canLearn: true };
}
```

### Modified: `src/types/character.ts`

```typescript
export interface Character {
  // ... existing fields ...
  patronDeity?: AncestorGod;  // NEW: Patron Ancestor God for priest characters
  knownRunes?: string[];      // Existing: shared with Runesmith
}
```

### New UI Component: `src/components/shared/DeitySelector.tsx`

A dropdown/select component that:
- Renders only when `isPriestCareer(character.career) && character.species === 'Dwarf'`
- Lists all 7 Ancestor Gods
- Shows placeholder "Select Ancestor God..." when no deity assigned
- Persists selection immediately to character state
- Shows warning when changing deity with restricted runes

### Modified: Rune Panel (existing)

- Calls `getRestrictedRunes()` to identify and visually flag runes not permitted by current deity
- Uses a distinct badge/icon (not colour alone) for accessibility

## Data Models

### DEITY_REGISTRY Static Data

| God | Rune Count | Rune IDs (from RUNE_CATALOGUE) | High Priest Bonus |
|-----|-----------|-------------------------------|-------------------|
| Grungni | 11 | rune-of-alarm, rune-of-courage, rune-of-enemy-detection, rune-of-forging, rune-of-fortitude, rune-of-furnace, rune-of-preservation, rune-of-purification, rune-of-verminkill, rune-of-valiant, rune-of-warding | None |
| Valaya | 0 | (empty) | None |
| Grimnir | 0 | (empty) | None |
| Gazul | 0 | (empty) | None |
| Smednir | 8 | rune-of-cleaving, rune-of-cutting, rune-of-fire, rune-of-forging, rune-of-furnace, rune-of-iron, rune-of-truth, rune-of-warding | master-rune-of-industry |
| Thungni | 7 | rune-of-alarm, rune-of-clear-sight, rune-of-enemy-detection, rune-of-luck, rune-of-sanctuary, rune-of-restoration, rune-of-truth | None |
| Morgrim | 13 | rune-of-accuracy, rune-of-alarm, rune-of-burning, rune-of-clear-seeing, rune-of-disguise, rune-of-enemy-detection, rune-of-farseeing, rune-of-forging, rune-of-furnace, rune-of-immolation, rune-of-penetrating, rune-of-reloading, rune-of-seeking | master-rune-of-defence |

Note: Many of these rune IDs do not yet exist in `RUNE_CATALOGUE`. They will need to be added as part of this feature's implementation. The existing `RUNE_CATALOGUE` contains Runesmith-focused weapon/armour/talisman runes. The priestly runes are a separate set that will be added to the same catalogue with appropriate category assignments.

### Character Interface Extension

```typescript
// Added to Character interface
patronDeity?: AncestorGod;  // undefined = no deity assigned
```

### Priest Career Detection

Priest careers are identified by matching career names against a known list:
- "Doom Priest" (and its levels: Initiate of Gazul, Doom Priest, High Doom Priest, Arch Doom Priest)
- "Forge Priest" (and its levels: Initiate of Morgrim, Forge Priest, High Forge Priest, Arch Forge Priest)
- "Hearth Priest" (and its levels: Initiate of Valaya, Hearth Priest, High Hearth Priest, Arch Hearth Priest)
- Any future career with the `Invoke` talent for a Dwarf deity

High Priest status (career level 3 or 4) is determined by checking if the character's `careerLevel` title matches a level 3 or level 4 entry in the priest career scheme from `CAREER_SCHEMES`.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Deity Assignment Validity

*For any* string input, calling the deity assignment function SHALL store the value if and only if it is one of the seven valid Ancestor God names. For any invalid input, the stored deity value SHALL remain unchanged from its previous state.

**Validates: Requirements 1.2, 1.4, 1.5**

### Property 2: Registry Integrity

*For any* deity in the DEITY_REGISTRY and *for any* rune ID in that deity's access list (including high priest bonus), the rune ID SHALL correspond to a valid entry in the RUNE_CATALOGUE.

**Validates: Requirements 2.9**

### Property 3: Deity-Based Rune Filtering

*For any* priest character with a valid patron deity, the set of available runes returned by the priest filter SHALL be exactly the set of rune IDs in the DEITY_REGISTRY for that deity (plus the high priest bonus if applicable), and SHALL contain no rune IDs outside that set.

**Validates: Requirements 3.1**

### Property 4: No-Deity Fallback

*For any* priest character with no patron deity assigned (null/undefined), the priest filter SHALL not restrict rune availability and SHALL return the full RUNE_CATALOGUE set of IDs.

**Validates: Requirements 3.2**

### Property 5: Rejection of Non-Permitted Runes

*For any* priest character with a valid patron deity and *for any* rune ID not in that deity's access list, the `canLearnRune` function SHALL return `canLearn: false` with an error message containing both the rune name and the deity name.

**Validates: Requirements 3.3**

### Property 6: High Priest Bonus Inclusion and Exclusion

*For any* priest character with a patron deity: if the deity has a defined High Priest Bonus, that bonus rune SHALL be included in available runes if and only if the character's career level is 3 or 4. For deities with no defined bonus, no additional runes SHALL be added regardless of career level.

**Validates: Requirements 3.4, 3.5, 6.1, 6.2, 6.4**

### Property 7: Runesmith Unaffected by Deity Filter

*For any* character whose career is a Runesmith career (not a priest career), the deity filter SHALL not be applied, and rune availability SHALL remain unchanged regardless of whether a `patronDeity` field exists on the character.

**Validates: Requirements 4.3**

### Property 8: Priest Rune Validation Matches Runesmith Rules

*For any* priest character and *for any* rune placement attempt, the existing validation rules SHALL apply unchanged: maximum 3 runes per item, maximum 1 Master Rune per item, weapon runes only on weapons, armour runes only on armour, talismanic runes on either, and per-rune maximum inscription limits. The talent prerequisites (Rune Magic for standard, Master Rune Magic for master) SHALL also apply identically.

**Validates: Requirements 4.4, 4.5**

### Property 9: Deity Selector Visibility

*For any* character, the deity selector SHALL be visible if and only if the character's species is 'Dwarf' AND the character's career is a recognized priest career.

**Validates: Requirements 5.1**

### Property 10: Restricted Rune Identification

*For any* priest character with a patron deity and *for any* rune in their `knownRunes`, the rune SHALL be identified as restricted if and only if it does not appear in the deity's access list (accounting for high priest bonus based on current career level). When a deity is changed, the warning SHALL list exactly the set of known runes not in the new deity's access list.

**Validates: Requirements 5.4, 5.5, 6.3**

## Error Handling

| Scenario | Handling |
|----------|----------|
| Invalid deity value assignment | Reject silently, retain previous value. Log warning to console in dev mode. |
| Rune ID in DEITY_REGISTRY not found in RUNE_CATALOGUE | Throw at module load time (fail-fast). This is a developer error caught during build/test. |
| Character with priest career but no deity assigned | Allow; fall back to full rune catalogue. Show prompt in UI encouraging deity selection. |
| Deity changed with restricted runes | Show warning modal listing affected rune names. Do not remove runes — retain and flag. |
| Career level reduced below High Priest | Retain bonus rune in `knownRunes`. Flag as restricted. Do not remove. |
| Dual Runesmith/Priest character | Apply union of both availability sets (Runesmith gets all runes anyway). |
| `RUNE_CATALOGUE` is empty or not loaded | Existing error handling applies — rune system degrades gracefully. |

## Testing Strategy

### Unit Tests (Example-Based)

- **Static data verification**: Verify each deity's rune list matches the exact runes specified in requirements (2.1–2.8).
- **Career detection**: Verify `isPriestCareer` correctly identifies known priest careers and rejects non-priest careers.
- **High priest level detection**: Verify level 3/4 detection for specific career titles.
- **Edge cases**: Dual Runesmith/Priest character gets union availability. Empty `knownRunes` produces no restricted runes.
- **UI integration**: DeitySelector renders when conditions met, hides otherwise. Warning modal shows correct rune names.

### Property-Based Tests (fast-check)

The following property tests use `fast-check` (already installed in the project) with minimum 100 iterations each:

| Property | Generator Strategy |
|----------|-------------------|
| Property 1: Deity Assignment | Generate random strings (both valid deity names and arbitrary strings). |
| Property 2: Registry Integrity | Iterate all deities × all their rune IDs. |
| Property 3: Deity Filtering | Generate from `fc.constantFrom(...ANCESTOR_GODS)`, verify filter output matches registry. |
| Property 4: No-Deity Fallback | Generate priest characters with `patronDeity: undefined`. |
| Property 5: Rejection | Generate `(deity, runeId)` pairs where `runeId ∉ DEITY_REGISTRY[deity].runeIds`. |
| Property 6: High Priest Bonus | Generate `(deity, careerLevel)` combinations, verify bonus inclusion/exclusion. |
| Property 7: Runesmith Unaffected | Generate Runesmith characters with random `patronDeity` values. |
| Property 8: Validation Rules | Generate priest rune placement attempts, verify same constraints apply. |
| Property 9: Selector Visibility | Generate characters with random species/career combinations. |
| Property 10: Restricted Rune ID | Generate priest characters with random `knownRunes` and deities, verify restricted set. |

Each property test is tagged with:
```
Feature: dwarf-runic-magic, Property {N}: {title}
```

### Integration Tests

- Full flow: assign deity → learn permitted rune → inscribe on item → verify.
- Full flow: assign deity → attempt to learn non-permitted rune → verify rejection.
- Deity change flow: assign deity → learn runes → change deity → verify warnings and visual flags.
