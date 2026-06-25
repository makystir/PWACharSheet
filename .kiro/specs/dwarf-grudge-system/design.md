# Design Document: Dwarf Grudge Book System

## Overview

The Dwarf Grudge Book System adds a panel to the Character page that allows Dwarf characters to track grudges — recording offences, perpetrators, and restitution requirements. It supports two grudge types (Standard at 25 XP and Blood at 50 XP), personal and party grudges (max 3 outstanding party grudges), and tracks outstanding/satisfied status.

The system follows the same architectural pattern as the Yenlui Balance panel: a house rule toggle gates visibility, species detection determines eligibility, and data persists on the `Character` interface regardless of visibility state.

### Key Design Decisions

1. **Visibility as a pure predicate** — Panel visibility is determined by `useGrudgeBook && isDwarf(species)`, following the `isYenluiVisible()` pattern from `src/logic/yenlui.ts`. A new `isDwarf()` helper performs case-insensitive substring matching.
2. **No data clearing on hide** — Toggling the house rule off or changing species never clears stored grudges. This prevents accidental data loss and mirrors the Yenlui panel behavior.
3. **Logic separated from UI** — All grudge business rules (validation, party limit enforcement, species detection) live in a dedicated `src/logic/grudges.ts` module as pure functions, making them testable without rendering.
4. **Immutable update pattern** — All mutations return new `Character` objects via the existing `updateCharacter` mutator pattern, consistent with the rest of the codebase.
5. **Party grudge limit is per-character** — The 3-outstanding-party-grudge limit is enforced locally on the character's own grudge array. Cross-character synchronization is out of scope.

## Architecture

```mermaid
graph TD
    subgraph UI Layer
        SP[SettingsPage] -->|toggle| HR[houseRules.useGrudgeBook]
        CP[CharacterPage - Identity Tab] --> GP[GrudgePanel]
        GP --> AF[Add Grudge Form]
        GP --> GL[Grudge List]
        GP --> XR[XP Reference Header]
    end

    subgraph Logic Layer
        GL_LOGIC[src/logic/grudges.ts]
        GL_LOGIC -->|isDwarf| SPECIES
        GL_LOGIC -->|isGrudgePanelVisible| VISIBILITY
        GL_LOGIC -->|canAddPartyGrudge| LIMIT
        GL_LOGIC -->|createGrudgeEntry| CREATE
        GL_LOGIC -->|satisfyGrudge| SATISFY
        GL_LOGIC -->|deleteGrudge| DELETE
        GL_LOGIC -->|validateGrudgeForm| VALIDATE
    end

    subgraph Data Layer
        CHAR[Character interface]
        CHAR -->|grudges?: GrudgeEntry[]| GRUDGES
        CHAR -->|houseRules.useGrudgeBook| TOGGLE
        LS[localStorage via character-manager]
    end

    GP --> GL_LOGIC
    GL_LOGIC --> CHAR
    CHAR --> LS
```

### File Structure

```
src/
├── types/character.ts          # GrudgeEntry interface, updated HouseRules & Character
├── logic/grudges.ts            # Pure business logic functions
├── logic/__tests__/
│   ├── grudges.test.ts         # Unit tests
│   └── grudges.property.test.ts # Property-based tests
├── components/shared/
│   ├── GrudgePanel.tsx         # Main panel component
│   └── GrudgePanel.module.css  # Styles
└── components/pages/
    ├── CharacterPage.tsx       # Import & render GrudgePanel
    └── SettingsPage.tsx        # Add useGrudgeBook toggle
```

## Components and Interfaces

### GrudgePanel Component

**Location:** `src/components/shared/GrudgePanel.tsx`

```typescript
interface GrudgePanelProps {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}
```

**Responsibilities:**
- Renders the grudge list (outstanding first, then satisfied)
- Provides "Add Grudge" form with validation
- Shows XP reference in header area
- Handles satisfy and delete actions with confirmation dialogs
- Shows empty state when no grudges exist
- Visually distinguishes Blood vs Standard (icon + label, not colour alone)
- Marks party grudges with a "Party" badge

**Conditional Rendering:**
The component returns `null` when `isGrudgePanelVisible(character)` is `false`. This keeps the visibility logic in the logic layer.

### Logic Module

**Location:** `src/logic/grudges.ts`

```typescript
// Species detection
export function isDwarf(species: string): boolean;

// Visibility predicate
export function isGrudgePanelVisible(character: Character): boolean;

// Party grudge limit check
export function canAddPartyGrudge(grudges: GrudgeEntry[]): boolean;

// Form validation
export function validateGrudgeForm(form: GrudgeFormData): ValidationResult;

// CRUD operations (return new Character)
export function createGrudgeEntry(character: Character, form: GrudgeFormData): Character;
export function satisfyGrudge(character: Character, grudgeId: string): Character;
export function deleteGrudge(character: Character, grudgeId: string): Character;

// Sorting helper
export function sortGrudges(grudges: GrudgeEntry[]): GrudgeEntry[];

// XP lookup
export function getGrudgeXP(type: GrudgeType): number;
```

### Settings Page Integration

A new toggle is added to the House Rules section of `SettingsPage.tsx`:
- Label: "Grudge Book (Dwarf)"
- Description: "Track Dwarf grudges for XP (Dwarf Player's Guide)"
- ON/OFF button pattern matching existing toggles

## Data Models

### GrudgeEntry Interface

```typescript
export type GrudgeType = 'standard' | 'blood';
export type GrudgeStatus = 'outstanding' | 'satisfied';

export interface GrudgeEntry {
  id: string;              // crypto.randomUUID() or fallback
  offence: string;         // Description of the wrong
  perpetrator: string;     // Who did it
  restitution: string;     // What's required
  type: GrudgeType;        // Standard (25 XP) or Blood (50 XP)
  status: GrudgeStatus;    // Outstanding or Satisfied
  isPartyGrudge: boolean;  // Shared by party
  dateRecorded: string;    // ISO date string (YYYY-MM-DD)
  dateSatisfied?: string;  // ISO date string, set when satisfied
}
```

### Updated HouseRules Interface

```typescript
export interface HouseRules {
  // ... existing fields
  useGrudgeBook: boolean;  // defaults to false
}
```

### Updated Character Interface

```typescript
export interface Character {
  // ... existing fields
  grudges?: GrudgeEntry[];  // optional, defaults to []
}
```

### Form Data Type (internal to component)

```typescript
interface GrudgeFormData {
  offence: string;
  perpetrator: string;
  restitution: string;
  type: GrudgeType;
  isPartyGrudge: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
}
```

### Default Values

- `BLANK_CHARACTER.houseRules.useGrudgeBook` → `false`
- `BLANK_CHARACTER.grudges` → `undefined` (not included; handled via `character.grudges ?? []`)
- New grudge `status` → `'outstanding'`
- New grudge `type` default → `'standard'`

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Grudge serialization round-trip

*For any* valid `GrudgeEntry` array, serializing the character to JSON and deserializing it back SHALL produce an identical grudge array with all field values preserved.

**Validates: Requirements 1.4, 1.5**

### Property 2: Panel visibility predicate

*For any* character, `isGrudgePanelVisible` SHALL return `true` if and only if `houseRules.useGrudgeBook` is `true` AND the species string contains "dwarf" (case-insensitive).

**Validates: Requirements 2.4, 2.5, 3.1, 3.2**

### Property 3: Data preservation on visibility change

*For any* character with a non-empty grudges array, changing `useGrudgeBook` to `false` or changing the species to a non-Dwarf value SHALL NOT modify the stored `grudges` array.

**Validates: Requirements 2.6, 3.3**

### Property 4: Dwarf species detection

*For any* string, `isDwarf` SHALL return `true` if and only if the string contains the substring "dwarf" (case-insensitive).

**Validates: Requirements 3.5**

### Property 5: Grudge creation produces valid entry

*For any* valid form data (non-empty offence, perpetrator, restitution, and valid type), `createGrudgeEntry` SHALL append a new entry with status `'outstanding'`, a non-empty unique id, and today's date as `dateRecorded`.

**Validates: Requirements 4.3**

### Property 6: Validation rejects incomplete forms

*For any* form data where at least one required field (offence, perpetrator, or restitution) is empty or whitespace-only, `validateGrudgeForm` SHALL return `{ valid: false }` with errors identifying the empty field(s).

**Validates: Requirements 4.4**

### Property 7: Party grudge limit enforcement

*For any* grudge array, `canAddPartyGrudge` SHALL return `true` if and only if the number of entries with `isPartyGrudge === true` AND `status === 'outstanding'` is less than 3.

**Validates: Requirements 4.5, 9.1, 9.2, 9.4**

### Property 8: Sort order — outstanding before satisfied

*For any* array of grudge entries, `sortGrudges` SHALL return a list where every outstanding grudge appears before every satisfied grudge.

**Validates: Requirements 5.6**

### Property 9: Satisfy sets status and date

*For any* outstanding grudge entry, calling `satisfyGrudge` with its id SHALL change its status to `'satisfied'` and set `dateSatisfied` to today's date, while leaving all other fields unchanged.

**Validates: Requirements 6.2**

### Property 10: Satisfy does not modify XP

*For any* character, calling `satisfyGrudge` SHALL NOT change the character's `xpCur`, `xpSpent`, or `xpTotal` fields.

**Validates: Requirements 6.6**

### Property 11: Satisfy is irreversible

*For any* grudge entry that already has status `'satisfied'`, the `satisfyGrudge` function SHALL be a no-op — the entry remains unchanged.

**Validates: Requirements 6.5**

### Property 12: Delete removes exactly one entry

*For any* grudge array containing a target entry, calling `deleteGrudge` with that entry's id SHALL produce an array with length reduced by 1, where the target entry is absent and all other entries remain unchanged.

**Validates: Requirements 7.3**


## Error Handling

| Scenario | Handling |
|----------|----------|
| `grudges` field missing from stored character (legacy data) | `loadCharacter` deep-merges with `BLANK_CHARACTER`; `grudges` defaults to `undefined`. Panel uses `character.grudges ?? []`. |
| Invalid `type` value in stored grudge (corrupted data) | Render as-is; validation only enforces on creation. Type guards in logic layer treat unknown values as `'standard'`. |
| `crypto.randomUUID()` unavailable | Fallback UUID generator (same pattern as `character-manager.ts`). |
| localStorage quota exceeded | Existing `setItem()` in `local-storage.ts` handles `QuotaExceededError` gracefully with console warning. |
| Form submitted with whitespace-only fields | `validateGrudgeForm` trims fields before checking emptiness; returns validation errors. |
| Attempt to satisfy an already-satisfied grudge | `satisfyGrudge` is a no-op — returns character unchanged. |
| Attempt to delete a grudge with non-existent ID | `deleteGrudge` filters by ID; if not found, returns character unchanged (no error thrown). |
| Party grudge limit exceeded due to race condition | Unlikely in single-user PWA. `createGrudgeEntry` re-checks `canAddPartyGrudge` at creation time as a guard. |
| Species string is empty or undefined | `isDwarf('')` returns `false`; panel remains hidden. |

## Testing Strategy

### Unit Tests (`src/logic/__tests__/grudges.test.ts`)

- `isDwarf` — example-based tests for known species strings ("Dwarf", "Dwarf (Karaz-a-Karak)", "Human", "High Elf", "")
- `isGrudgePanelVisible` — tests for combinations of species + toggle
- `getGrudgeXP` — returns 25 for standard, 50 for blood
- `validateGrudgeForm` — specific examples: all fields valid, one empty, all empty, whitespace-only
- `createGrudgeEntry` — verify correct defaults and ID generation
- `satisfyGrudge` — verify status change, date set, no-op on already satisfied
- `deleteGrudge` — verify removal, no-op on missing ID
- `canAddPartyGrudge` — boundary cases: 0, 1, 2, 3 outstanding party grudges
- `sortGrudges` — mixed arrays of outstanding/satisfied

### Property-Based Tests (`src/logic/__tests__/grudges.property.test.ts`)

- Library: **fast-check** (already in devDependencies)
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: dwarf-grudge-system, Property {N}: {title}`
- Properties 1–12 implemented as described in the Correctness Properties section

**Generators needed:**
- `arbGrudgeType`: `fc.constantFrom('standard', 'blood')`
- `arbGrudgeStatus`: `fc.constantFrom('outstanding', 'satisfied')`
- `arbGrudgeEntry`: composite generator producing valid `GrudgeEntry` objects
- `arbGrudgeArray`: `fc.array(arbGrudgeEntry, { maxLength: 20 })`
- `arbGrudgeFormData`: composite generator for valid/invalid form data
- `arbDwarfSpecies`: species strings containing "Dwarf" in various positions/cases
- `arbNonDwarfSpecies`: species strings NOT containing "dwarf"
- `arbCharacterWithGrudges`: character objects with random grudge arrays

### Component Tests

- Render `GrudgePanel` with various character states (empty, with grudges, non-dwarf, toggle off)
- Verify form validation prevents submission with empty fields
- Verify ConfirmDialog appears on delete
- Verify XP reference text in header
- Verify touch target sizes meet 44×44 minimum at mobile viewport

### Integration Considerations

- No external services — all data is local (localStorage)
- No network requests — purely client-side
- Character-manager's `loadCharacter` handles deep-merge, ensuring forward compatibility
