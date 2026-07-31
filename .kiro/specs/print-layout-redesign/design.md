# Design Document: Print Layout Redesign

## Overview

This design covers a full rewrite of the `PrintLayout` React component to produce a richly themed, multi-page printed character sheet evoking the dark fantasy aesthetic of the Warhammer Old World. The new layout replaces the existing functional-but-plain print output with an immersive document styled to resemble a weathered parchment record bound in iron, using exclusively CSS decorative techniques (pseudo-elements, gradients, box-shadows, borders, Unicode glyphs).

The component consumes the existing `Character` interface unchanged and conditionally renders sections based on data presence and house-rule toggles. It targets A4 paper (with US Letter fallback) and uses CSS `@page`, `break-inside: avoid`, and explicit page-break boundaries to produce clean multi-page output.

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| CSS-only decoration (no image assets) | Keeps bundle size minimal, works offline, and avoids print-media image rendering issues |
| `@fontsource/cinzel` + `@fontsource/cinzel-decorative` + `@fontsource/im-fell-english` | Self-hosted fonts available via npm; no external network requests; evokes Germanic medieval feel |
| CSS Modules (`.module.css`) | Matches existing project convention; scoped class names avoid leaking into on-screen styles |
| Single component with helper render functions | Follows existing `PrintLayout.tsx` pattern; keeps print concerns co-located |
| Conditional rendering driven by data + `houseRules` flags | Avoids empty sections, minimises page count for simple characters |
| Mermaid-free architecture | Component is a leaf renderer with no state management or complex data flow |

## Architecture

The print layout is a pure presentational component with no side effects, no state, and no event handlers. It receives pre-computed character data via props and renders HTML/CSS optimised for `@media print`.

```
┌─────────────────────────────────────────────────────┐
│  App (screen)                                       │
│  ┌───────────────────────────────────────────────┐  │
│  │  PrintLayout (hidden on screen, visible on    │  │
│  │  print via @media print display rules)        │  │
│  │                                               │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────────────┐ │  │
│  │  │ Page 1  │ │ Page 2  │ │ Page 3+ (cond.) │ │  │
│  │  │ Identity│ │ Combat  │ │ Spells/Optional │ │  │
│  │  │ + Stats │ │ + Gear  │ │ Mechanics       │ │  │
│  │  └─────────┘ └─────────┘ └─────────────────┘ │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Component Tree

```
PrintLayout
├── PageWrapper (handles @page styling, borders, corner ornaments, footer)
│   ├── Page 1: Identity & Skills
│   │   ├── TitleBlock (character name, subtitle, heraldic glyph)
│   │   ├── PersonalDetails (name, species, career, status, physical)
│   │   ├── CharacteristicsTable (10-column horizontal layout)
│   │   ├── StatusRow (fate/fortune, resilience/resolve, movement, wounds, XP)
│   │   ├── SkillsGrid (basic skills in 2-col, advanced skills)
│   │   ├── TalentsTable
│   │   └── AmbitionsParty
│   ├── Page 2: Combat & Equipment
│   │   ├── ArmourSection (table + AP diagram)
│   │   ├── WeaponsTable
│   │   ├── AmmunitionTable (conditional)
│   │   ├── TrappingsTable
│   │   ├── WealthEncumbrance
│   │   ├── CorruptionMutations
│   │   └── ConditionsTable (conditional)
│   └── Page 3+: Optional Sections (conditional, auto-flowing)
│       ├── SpellsTable (conditional)
│       ├── CompanionsSection (conditional)
│       ├── CriticalWoundsTable (conditional)
│       ├── HirelingsSection (conditional)
│       ├── EnterprisesSection (conditional, house rule gated)
│       ├── GrudgeBookSection (conditional, house rule gated)
│       ├── PsychologyTraitsSection (conditional, house rule gated)
│       ├── RitualsTable (conditional)
│       ├── YenluiBalance (conditional, house rule gated)
│       └── EstateSection (conditional)
```

### Data Flow

```
Character (from IndexedDB)
    │
    ├── totalWounds (pre-computed by parent)
    ├── armourPoints (pre-computed by parent)
    │
    └── PrintLayout component (props: { character, totalWounds, armourPoints })
            │
            ├── Reads character.houseRules to gate optional sections
            ├── Reads arrays (.spells, .companions, .enterprises, etc.)
            │   to conditionally render or omit sections
            └── Computes encumbrance totals inline (matching existing logic)
```

## Components and Interfaces

### Props Interface

```typescript
interface PrintLayoutProps {
  character: Character;
  totalWounds: number;
  armourPoints: ArmourPoints;
}
```

This interface remains unchanged from the existing component — no breaking changes to the public API.

### Internal Helper Functions

| Function | Purpose |
|----------|---------|
| `renderPage1()` | Identity, characteristics, skills, talents, ambitions |
| `renderPage2()` | Combat stats, armour, weapons, ammunition, trappings, wealth |
| `renderOptionalSections()` | Conditionally rendered sections (spells, companions, enterprises, etc.) |
| `renderPageFooter(pageNum)` | Footer with character name + generation date |
| `shouldRenderSection(sectionKey)` | Determines visibility based on data + house rules |
| `renderSectionDivider()` | Ornamental horizontal rule between major sections |
| `renderCornerOrnaments()` | CSS pseudo-element corner decoration (rendered via class) |

### Section Visibility Logic

```typescript
type SectionKey =
  | 'spells' | 'companions' | 'mutations' | 'criticalWounds'
  | 'hirelings' | 'enterprises' | 'grudgeBook' | 'psychologyTraits'
  | 'rituals' | 'yenlui' | 'estate' | 'conditions' | 'ammunition';

function shouldRenderSection(character: Character, key: SectionKey): boolean {
  switch (key) {
    case 'spells': return character.spells.length > 0;
    case 'companions': return character.companions.length > 0;
    case 'mutations': return character.mutations.length > 0;
    case 'criticalWounds': return character.criticalWounds.length > 0;
    case 'hirelings': return character.hirelings.length > 0;
    case 'enterprises':
      return character.houseRules.useEnterprises && (character.enterprises?.length ?? 0) > 0;
    case 'grudgeBook':
      return character.houseRules.useGrudgeBook && (character.grudges?.length ?? 0) > 0;
    case 'psychologyTraits':
      return character.houseRules.usePsychologyTracker && (character.psychologyTraits?.length ?? 0) > 0;
    case 'rituals': return (character.rituals?.length ?? 0) > 0;
    case 'yenlui': return character.houseRules.useYenlui;
    case 'estate': return character.estate.name.length > 0;
    case 'conditions': return character.conditions.filter(c => c.level > 0).length > 0;
    case 'ammunition': return character.ammo.length > 0;
  }
}
```

### CSS Architecture

The CSS module is structured in layers:

1. **@page rules** — Paper size, margins
2. **Page container** — Outer border, corner ornaments, parchment background
3. **Section styling** — Consistent box treatment with ornamental headers
4. **Table styling** — Dense data tables with alternating row tinting
5. **Typography scale** — Font hierarchy from title → section heading → table header → body
6. **Decorative elements** — Corner ornaments, divider rules, heraldic glyphs
7. **Print utilities** — break-inside, page-break-after, visibility toggling

### Font Stack

| Role | Font | Weight | Fallback |
|------|------|--------|----------|
| Page title | Cinzel Decorative | 900 | Cinzel, serif |
| Section headings | Cinzel | 700 | Georgia, serif |
| Table headers | Cinzel | 600 (small-caps) | Georgia, serif |
| Body / data cells | IM Fell English | 400 | 'Times New Roman', serif |
| Numeric values | Cinzel | 700 | Georgia, serif |

### Decorative CSS Techniques

| Element | CSS Technique |
|---------|---------------|
| Parchment background | `background: linear-gradient(...)` with warm cream/tan tones and subtle `radial-gradient` aging spots |
| Page border | Double `border` (3px double) with inner `box-shadow` (inset) for depth |
| Corner ornaments | `::before` and `::after` pseudo-elements with Unicode glyphs (✦, ◆, ⚜) positioned absolutely |
| Section dividers | `border-image` with repeating gradient, or `::after` pseudo-element with decorative character row |
| Iron rivets | Small `border-radius: 50%` pseudo-elements at border intersections |
| Heraldic sigil | CSS-drawn shield shape using `clip-path` or Unicode heraldic glyph (⚔, 🛡, ☠) |
| Drop shadow on title | `text-shadow` with dark offset |
| Weathered edges | Subtle `box-shadow` with spread to simulate paper wear |

## Data Models

No new data models are introduced. The component consumes the existing `Character` interface from `src/types/character.ts` (version `_v: 7`) along with the existing `ArmourPoints` type.

### Key Data Structures Consumed

| Field | Type | Print Usage |
|-------|------|-------------|
| `character.chars` | `Record<CharacteristicKey, CharacteristicValue>` | Characteristics table (i, a, b → current) |
| `character.bSkills` / `aSkills` | `Skill[]` | Skills grids |
| `character.talents` | `Talent[]` | Talents table |
| `character.weapons` | `WeaponItem[]` | Weapons table |
| `character.armour` | `ArmourItem[]` | Armour table |
| `character.spells` | `SpellItem[]` | Spells section (conditional) |
| `character.companions` | `Companion[]` | Companions section (conditional) |
| `character.hirelings` | `Hireling[]` | Hirelings section (conditional) |
| `character.enterprises` | `Enterprise[]` (optional) | Enterprises section (conditional + house rule) |
| `character.grudges` | `GrudgeEntry[]` (optional) | Grudge book section (conditional + house rule) |
| `character.psychologyTraits` | `PsychologyTrait[]` (optional) | Psychology section (conditional + house rule) |
| `character.rituals` | `RitualItem[]` (optional) | Rituals section (conditional) |
| `character.yenluiState` | `YenluiState` (optional) | Yenlui indicator (conditional + house rule) |
| `character.criticalWounds` | `CriticalWound[]` | Critical wounds (conditional) |
| `character.mutations` | `MutationEntry[]` | Mutations table (conditional) |
| `character.estate` | `Estate` | Estate section (conditional on name) |
| `character.houseRules` | `HouseRules` | Gates optional sections |
| `armourPoints` | `ArmourPoints` | AP by location display |
| `totalWounds` | `number` | Wounds total |

### Computed Values (inline)

| Value | Computation |
|-------|-------------|
| Encumbrance (weapons) | `weapons.reduce(sum enc)` |
| Encumbrance (armour) | `armour.reduce(sum worn enc)` |
| Encumbrance (trappings) | `trappings.reduce(sum enc × qty)` |
| Max encumbrance | `calculateMaxEncumbrance(chars, strongBackLevel)` |
| SB, TB, WPB | `getBonus(char.i + char.a + char.b)` |
| Hardy wounds bonus | `hardyLevel × TB` |



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Conditional section omission

*For any* `Character` object and any optional section key, if the section's visibility condition is not met (empty data array, disabled house rule, or both), then the rendered output SHALL NOT contain a DOM element for that section.

Specifically:
- Empty spells → no "Spells" section
- Empty enterprises OR `useEnterprises === false` → no "Enterprises" section
- Empty grudges OR `useGrudgeBook === false` → no "Grudge Book" section
- `useYenlui === false` → no "Yenlui" section
- Empty companions → no "Companions" section
- Empty mutations → no "Mutations" section
- Empty criticalWounds → no "Critical Wounds" section
- Empty hirelings → no "Hirelings" section
- Empty rituals → no "Rituals" section
- `estate.name === ''` → no "Estate" section
- Empty psychologyTraits OR `usePsychologyTracker === false` → no "Psychology" section

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11**

### Property 2: Optional section data completeness

*For any* character with non-empty optional data arrays and the relevant house rule enabled, every item in that array SHALL have its required fields rendered in the output.

- For any psychology trait: type and target appear in rendered output; rating appears when defined
- For any enterprise: name, type, and expansion level appear
- For any grudge: offence, perpetrator, restitution, type, and status appear
- For any critical wound: location, description, effects, and severity appear
- For any ritual: name, CN, type, and description appear
- For any hireling: name, role, and status appear

**Validates: Requirements 1.2, 1.3, 1.4, 1.6, 1.7, 1.8**

### Property 3: Page footer contains character name

*For any* character with a non-empty name, every page wrapper element in the rendered output SHALL contain a footer element that includes the character's name.

**Validates: Requirements 4.6**

### Property 4: Section boxes prevent page breaks

*For any* rendered section box element in the print layout output, that element SHALL have the CSS class that applies `break-inside: avoid` and `page-break-inside: avoid`.

**Validates: Requirements 4.3**

## Error Handling

The PrintLayout component is a pure renderer with no I/O operations, network calls, or user interaction. Error conditions are limited to malformed or missing data in the `Character` object.

| Scenario | Handling Strategy |
|----------|-------------------|
| Optional arrays are `undefined` | Use nullish coalescing (`?? []`) before rendering. Already present as optional fields in the Character interface. |
| Empty string fields (name, career, etc.) | Render the field container but display fallback text ("Unnamed Character", "—") |
| Zero-value numerics (wounds, AP) | Render as `0` — these are valid game states |
| Extremely long text (spell effects, notes) | CSS `word-break: break-word` and `overflow-wrap: break-word` prevent overflow; text truncation is NOT applied since all data should print |
| Missing house rule flags | Default to `false` (matching `BLANK_CHARACTER` defaults), omitting gated sections |
| Large data sets (many spells, many trappings) | Allow natural page overflow; `break-inside: avoid` on individual table rows; browser handles pagination |

### Defensive Rendering Pattern

```typescript
// Example: safe optional section rendering
{(character.enterprises?.length ?? 0) > 0 && character.houseRules.useEnterprises && (
  <section className={styles.sectionBox} data-section="enterprises">
    {/* ... */}
  </section>
)}
```

## Testing Strategy

### Unit Tests (Example-Based)

Unit tests verify specific structural and styling requirements:

| Test | Validates |
|------|-----------|
| Full character renders all core sections | Req 1.1 |
| Yenlui displays correct state value for each of 3 states | Req 1.5 |
| Page wrapper has parchment background class | Req 2.1 |
| Section headings use decorative font class | Req 2.3, 3.5 |
| Corner ornament classes are present | Req 2.4 |
| Heraldic element exists per page | Req 2.7 |
| Skills grid has ≥ 2 columns | Req 6.1 |
| Characteristics table has all 10 headers | Req 6.2 |
| Weapons table has correct column headers | Req 6.5 |
| No interactive elements (button, input) in output | Req 7.2 |
| Tables have thead elements for browser header repetition | Req 4.4 |

### Property-Based Tests (fast-check)

Each property-based test generates random `Character` objects (using custom arbitraries that produce valid combinations of data and house rules) and verifies universal invariants.

**Library**: `fast-check` (already installed)
**Minimum iterations**: 100 per property
**Tag format**: `Feature: print-layout-redesign, Property {N}: {title}`

| Property Test | Covers |
|---------------|--------|
| Conditional section omission | Properties 1 (Req 5.1–5.11) |
| Optional section data completeness | Property 2 (Req 1.2–1.8) |
| Page footer contains character name | Property 3 (Req 4.6) |
| Section boxes have break-inside class | Property 4 (Req 4.3) |

### Test Generators (fast-check Arbitraries)

Key custom generators needed:

```typescript
// Arbitrary for a minimal valid Character with controlled optional fields
const arbCharacterWithSections = fc.record({
  spells: fc.array(arbSpellItem, { minLength: 0, maxLength: 5 }),
  companions: fc.array(arbCompanion, { minLength: 0, maxLength: 3 }),
  enterprises: fc.array(arbEnterprise, { minLength: 0, maxLength: 2 }),
  grudges: fc.array(arbGrudgeEntry, { minLength: 0, maxLength: 3 }),
  psychologyTraits: fc.array(arbPsychologyTrait, { minLength: 0, maxLength: 4 }),
  criticalWounds: fc.array(arbCriticalWound, { minLength: 0, maxLength: 3 }),
  rituals: fc.array(arbRitualItem, { minLength: 0, maxLength: 3 }),
  hirelings: fc.array(arbHireling, { minLength: 0, maxLength: 2 }),
  houseRules: arbHouseRules,
  // ... base character fields with sensible defaults
});
```

### Smoke Tests

| Test | Validates |
|------|-----------|
| CSS module contains `@page` rule with A4 size | Req 4.1 |
| CSS module contains `@page` rule or query for letter size | Req 4.5 |
| Print-layout wrapper is hidden outside print media | Req 7.1, 7.3 |

### Integration Tests

| Test | Validates |
|------|-----------|
| Print preview renders complete output (manual / Playwright) | Req 7.4 |
| Contrast ratio audit of CSS colour pairs | Req 3.3 |

