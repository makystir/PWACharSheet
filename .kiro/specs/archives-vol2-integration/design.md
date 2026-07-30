# Design Document: Archives of the Empire Vol. II Integration

## Overview

This feature integrates content from "Archives of the Empire: Volume II" into the WFRP 4e character sheet PWA. It adds the Ogre as a playable species with a unique doubled wound formula, three Ogre-only careers, Ogre-specific equipment, the Lore of the Great Maw spell lore, a star signs reference table, and a psychology tracker UI component.

The design follows existing patterns in the codebase: static data files in `src/data/`, logic modules in `src/logic/`, type definitions in `src/types/character.ts`, and React components in `src/components/`.

## Architecture

The feature is primarily a data-layer extension with two logic changes and one new UI component:

```mermaid
graph TD
    A[src/types/character.ts] -->|SpeciesData + woundMultiplier| B[src/data/species.ts]
    A -->|CareerScheme + speciesRestriction| C[src/data/careers.ts]
    A -->|WeaponData| D[src/data/weapons.ts]
    A -->|ArmourData| E[src/data/armour.ts]
    A -->|SpellData| F[src/data/spells.ts]
    G[src/data/starSigns.ts] -->|NEW| H[Star Signs Data]
    I[src/logic/calculators.ts] -->|wound multiplier support| B
    J[src/logic/career-eligibility.ts] -->|OGRE_ONLY_CAREERS| C
    K[src/components/identity/PsychologyTracker.tsx] -->|NEW| L[Psychology Tracker UI]
    K --> A
end
```

**Key architectural decisions:**

1. **Wound multiplier as a data field, not a species name check.** The `SpeciesData` interface gains an optional `woundMultiplier?: number` field. The calculator reads this value (defaulting to 1) rather than checking `species === "Ogre"`. This keeps the system extensible for future species with non-standard wound formulas.

2. **Career species restriction via the existing eligibility module.** The `career-eligibility.ts` module already has the pattern of species-restricted career lists (DWARF_ONLY_CAREERS, HIGH_ELF_ONLY_CAREERS, etc.). We add an `OGRE_ONLY_CAREERS` list following the same pattern.

3. **Star signs as a new standalone data file.** Star signs are a reference table used during character creation, not tied to any existing data structure. A new `src/data/starSigns.ts` file keeps this cleanly separated.

4. **Psychology tracker extends the existing `psychologyTraits` field.** The Character interface already has `psychologyTraits?: PsychologyTrait[]`. The new UI component renders and manages this array, adding a `brokenTally` field to the Character type.

## Components and Interfaces

### Type Extensions (`src/types/character.ts`)

```typescript
// Extended SpeciesData — add optional woundMultiplier
export interface SpeciesData {
  chars: Record<CharacteristicKey, number>;
  move: number;
  fate: number;
  resilience: number;
  extraPoints: number;
  woundsUseSB: boolean;
  skills: string[];
  talents: string[];
  randomTalentSlots?: number;
  woundMultiplier?: number;  // NEW: defaults to 1 if not specified
}

// Extended Character — add brokenTally
export interface Character {
  // ... existing fields ...
  brokenTally?: number;  // NEW: count of times character gained Broken from Terror
}
```

### Star Sign Data Model (`src/data/starSigns.ts`)

```typescript
export interface StarSignEntry {
  name: string;
  type: 'characteristics' | 'talent';
  bonuses?: { char: CharacteristicKey; value: number }[];  // For type 'characteristics': two +2 entries
  penalty: { char: CharacteristicKey; value: number };     // Always one -3 entry
  talent?: string;  // For type 'talent': the talent granted
}

export const STAR_SIGNS: StarSignEntry[] = [/* 20 entries */];
```

### Career Scheme Extension

The existing `CareerScheme` interface does not need modification. Career species restrictions are handled entirely in `career-eligibility.ts` via a new `OGRE_ONLY_CAREERS` list, matching the existing pattern for Dwarf-only, High-Elf-only, and Halfling-only careers.

### Wound Calculator Update (`src/logic/calculators.ts`)

The `calculateWoundsCore` function gains a `multiplier` parameter:

```typescript
function calculateWoundsCore(
  strength: number,
  toughness: number,
  willpower: number,
  hardyLevel: number,
  woundsUseSB: boolean,
  multiplier: number = 1  // NEW parameter
): { total: number; sb: number; tb: number; wpb: number; hardy: number } {
  const sbRaw = Math.floor(strength / 10);
  const tbRaw = Math.floor(toughness / 10);
  const wpbRaw = Math.floor(willpower / 10);

  const sb = woundsUseSB ? sbRaw : 0;
  const tb = 2 * tbRaw;
  const wpb = wpbRaw;
  const base = (sb + tb + wpb) * multiplier;  // Multiplier applied to base
  const hardy = hardyLevel * tbRaw;           // Hardy applied AFTER multiplier
  const total = base + hardy;

  return { total, sb, tb, wpb, hardy };
}
```

### Psychology Tracker Component (`src/components/identity/PsychologyTracker.tsx`)

A new React component that:
- Renders the list of `psychologyTraits` from the character
- Displays `brokenTally` count and WP-based phobia threshold
- Provides add/remove controls for psychology entries
- Shows an alert when `brokenTally >= WP characteristic value`

### Career Eligibility Update (`src/logic/career-eligibility.ts`)

```typescript
// Add species detection helper
export function isOgreSpecies(species: string): boolean {
  return species === 'Ogre';
}

// Add Ogre-only career list
const OGRE_ONLY_CAREERS = [
  'Maneater',
  'Rhinox Herder',
  'Ogre Butcher',
];

// Update getExcludedCareers to exclude Ogre careers for non-Ogres
```

## Data Models

### Ogre Species Entry

```typescript
"Ogre": {
  chars: { WS: 20, BS: 10, S: 35, T: 35, I: 0, Ag: 15, Dex: 10, Int: 10, WP: 20, Fel: 10 },
  move: 6,
  fate: 0,
  resilience: 3,
  extraPoints: 1,
  woundsUseSB: true,
  woundMultiplier: 2,
  skills: ["Athletics", "Consume Alcohol", "Endurance", "Entertain (Storytelling)",
           "Intimidate", "Language (Grumbarth)", "Lore (Ogres)", "Melee (Basic)",
           "Melee (Brawling)", "Navigation", "Outdoor Survival", "Track"],
  talents: ["Dirty Fighting", "Large", "Resistance (Chaos)",
            "Resistance (Poison (Ingested))", "Very Resilient or Very Strong", "Vice (Food)"],
}
```

### Ogre Weapons

| Name | Group | Enc | Range/Reach | Damage | Qualities |
|------|-------|-----|-------------|--------|-----------|
| Ogre Club | Basic | 2 | Average | +SB+4 | — (note: non-Ogres treat as Improvised) |
| Ironfist | Basic | 2 | Short | +SB+3 | Shield 1, Defensive |
| Great Ogre Club | Two-Handed | 4 | Long | +SB+6 | Impact, Tiring |
| Great Throwing Spear | Throwing | 2 | SBx3 | +SB+4 | Impale |
| Leadbelcher Gun | Blackpowder | 8 | 50 | +10 | Dangerous, Reload 5 |
| Ogre Pistol | Blackpowder | 3 | 20 | +8 | Dangerous, Pistol, Reload 3 |
| Harpoon Launcher | Engineering | 4 | 30 | +SB+5 | Impale, Reload 2 |
| Chain Trap | Entangling | 2 | SBx2 | — | Entangle |

### Ogre Ammunition

| Name | Range | Damage | Qualities |
|------|-------|--------|-----------|
| Leadbelcher Shot (12) | Half Weapon | — | Blast 3 |
| Leadbelcher Ball (1) | — | +4 | Penetrating, Impale, Impact |

### Ogre Armour

| Name | Locations | Enc | AP | Qualities |
|------|-----------|-----|----|-----------|
| Ogre Gutplate | Body | — | 3 | Impenetrable |

### Lore of the Great Maw Spells

7 spells added to `SPELL_LIST` with `lore: "Lore of the Great Maw"`:
- Bonecrusher (CN 5), Bullgorger (CN 5), Braingobbler (CN 5), Taste Death (CN 2), Trollguts (CN 7), The Maw (CN 11), Feast of the Fallen (CN 9)

### Career Data (3 careers)

Each career follows the existing `CareerScheme` format with 4 levels:
- **Maneater** (Warriors): Fresh Meat → Maneater → Maneater Crusher → Maneater Captain
- **Rhinox Herder** (Rangers): Rhinox Rustler → Rhinox Herder → Rhinox Breaker → Rhinox Master
- **Ogre Butcher** (Academics): Slopscooper → Ogre Butcher → Mawsage → Slaughtermaster

### Star Signs Data

20 entries, each either:
- Type `'characteristics'`: two characteristics at +2, one at −3
- Type `'talent'`: one talent, one characteristic at −3

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Wound formula with multiplier produces correct result

*For any* valid strength (0–99), toughness (0–99), willpower (0–99), Hardy level (0–5), and wound multiplier (1 or 2), the wound calculator SHALL produce a total equal to `(SB + 2×TB + WPB) × multiplier + Hardy × TB`, where SB = floor(S/10), TB = floor(T/10), WPB = floor(WP/10).

**Validates: Requirements 2.1, 2.2**

### Property 2: Default wound multiplier preserves standard formula

*For any* species in SPECIES_DATA that does not define a `woundMultiplier` field, the wound calculation SHALL produce the same result as the standard formula with multiplier = 1, i.e., no doubling occurs.

**Validates: Requirements 2.4**

### Property 3: Lore of the Great Maw spells have complete data

*For any* spell in SPELL_LIST with `lore === "Lore of the Great Maw"`, the spell entry SHALL have non-empty `name`, `cn`, `range`, `target`, `duration`, `effect`, and `lore` fields, and the `cn` field SHALL be a valid positive integer string.

**Validates: Requirements 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8**

### Property 4: Star sign entries have valid modifier structure

*For any* star sign entry in STAR_SIGNS, if the entry type is `'characteristics'` then it SHALL have exactly 2 bonus entries of +2 and exactly 1 penalty entry of −3; if the entry type is `'talent'` then it SHALL have a non-empty talent name and exactly 1 penalty entry of −3.

**Validates: Requirements 10.2, 10.3**

### Property 5: Removing a psychology entry decreases list length

*For any* non-empty list of PsychologyTrait entries and any valid index within that list, removing the entry at that index SHALL result in a list that is shorter by exactly 1 and does not contain the removed entry's id.

**Validates: Requirements 12.5**

### Property 6: Broken tally threshold alert triggers correctly

*For any* WP characteristic value (1–99) and any brokenTally value (0–99), the phobia acquisition alert SHALL be active if and only if `brokenTally >= WP`.

**Validates: Requirements 12.7**

### Property 7: Non-Ogre species excludes Ogre-only careers

*For any* species string that is not "Ogre" (selected from all species in SPECIES_DATA), the career eligibility function SHALL exclude "Maneater", "Rhinox Herder", and "Ogre Butcher" from the available careers list.

**Validates: Requirements 13.2**

## Error Handling

| Scenario | Handling |
|----------|----------|
| `woundMultiplier` undefined in species data | Default to 1 — no doubling |
| Negative or zero wound result | Clamp to 0 (existing `Math.max(0, total)`) |
| Unknown psychology type submitted | Reject via `validatePsychologyTrait` (existing validation) |
| Career selected that is species-restricted | `getExcludedCareers` prevents it from appearing in the picker; if somehow set, career eligibility check flags it |
| Star sign data accessed before loaded | Data is statically imported — always available |
| `brokenTally` undefined | Treat as 0 in comparisons and display |

## Testing Strategy

### Property-Based Tests (fast-check, minimum 100 iterations each)

The project uses **Vitest** with **fast-check** for property-based testing. Each property test references its design document property.

| Property | Test File | What it verifies |
|----------|-----------|-----------------|
| Property 1 | `src/logic/__tests__/calculators.property.test.ts` | Wound formula with multiplier |
| Property 2 | `src/logic/__tests__/calculators.property.test.ts` | Default multiplier = 1 |
| Property 3 | `src/data/__tests__/spells.property.test.ts` | Great Maw spell completeness |
| Property 4 | `src/data/__tests__/starSigns.property.test.ts` | Star sign structure validity |
| Property 5 | `src/logic/__tests__/psychology.property.test.ts` | Psychology entry removal |
| Property 6 | `src/logic/__tests__/psychology.property.test.ts` | Broken tally threshold |
| Property 7 | `src/logic/__tests__/career-eligibility.property.test.ts` | Ogre career exclusion |

Tag format: `Feature: archives-vol2-integration, Property {N}: {title}`

### Unit Tests (example-based)

| Area | Test File | Coverage |
|------|-----------|----------|
| Ogre species data | `src/data/__tests__/species.test.ts` | All Requirement 1 acceptance criteria |
| Ogre career data | `src/data/__tests__/careers.test.ts` | Requirements 3, 4, 5 career structures |
| Ogre weapons | `src/data/__tests__/weapons.test.ts` | Requirements 6, 7 weapon entries |
| Ogre armour | `src/data/__tests__/armour.test.ts` | Requirement 8 armour entry |
| Great Maw spells | `src/data/__tests__/spells.test.ts` | Requirement 9 individual spell values |
| Star signs count | `src/data/__tests__/starSigns.test.ts` | Requirement 10.1 (20 entries) |
| Psychology tracker | `src/components/identity/__tests__/PsychologyTracker.test.tsx` | Requirements 11, 12 UI behavior |
| Career eligibility | `src/logic/__tests__/career-eligibility.test.ts` | Requirements 13.1, 13.3 |

### Test Configuration

- Property-based tests: `{ numRuns: 100 }` per property
- Unit tests: standard Vitest assertions
- Run with: `vitest --run`
