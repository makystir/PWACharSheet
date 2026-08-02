# Design Document: Characteristic Current Tooltip

## Overview

This feature adds a breakdown tooltip to the "Current" column values in the Characteristics panel on the Character page (Identity tab). When a user hovers or clicks a Current value, a tooltip shows the calculation breakdown: Initial, Advances, and Talent Bonus (with contributing talent name when applicable).

The implementation leverages the existing shared `Tooltip` component (already used for skill/talent tooltips in CharacterPage) and extends the characteristics grid to support interactive Current value cells. The design prioritises reuse of existing infrastructure, accessibility compliance, and responsive touch support.

## Architecture

The feature integrates into the existing CharacterPage component structure:

```mermaid
graph TD
    A[CharacterPage] --> B[Characteristics Grid]
    B --> C[CharCurrentCell]
    C -->|click / hover / keyboard| D[Tooltip]
    D --> E[CharBreakdownContent]
    
    F[Character Data] -->|chars[key]| C
    G[TALENT_BONUS_MAP] -->|reverse lookup| E
    H[CHAR_FULL_NAMES] -->|title| D
```

### Key Design Decisions

1. **Reuse existing Tooltip component** — The shared `Tooltip` already handles portal rendering, positioning, focus management, Escape/outside-click dismissal, and ARIA attributes. No need to create a new tooltip mechanism.

2. **Separate state for characteristic tooltip** — Rather than overloading the existing `tooltip` state (used for skills/talents), a dedicated `charTooltip` state avoids conflicts when both tooltip types could theoretically be triggered in the same session.

3. **Helper function for contributing talent lookup** — A pure function `getContributingTalent(talents, charKey)` resolves which talent (if any) contributes to a given characteristic bonus, enabling easy property-based testing.

4. **Hover with delay handled via `onMouseEnter`/`onMouseLeave` with timeout** — 300ms hover delay for opening, 200ms leave delay for closing, matching the requirements. Timeouts are cleared on unmount and state changes.

## Components and Interfaces

### CharCurrentCell (new inline component or extracted)

Wraps each Current value cell to handle interaction logic:

```typescript
interface CharCurrentCellProps {
  charKey: CharacteristicKey;
  current: number;
  isTooltipOpen: boolean;
  onOpen: (key: CharacteristicKey, anchorEl: HTMLElement) => void;
  onClose: () => void;
}
```

Responsibilities:
- Renders the current value in a `<div>` with `tabIndex={0}`, `aria-describedby` (when tooltip is open), and `role="button"`
- Handles `onClick`, `onKeyDown` (Enter/Space), `onMouseEnter`, `onMouseLeave`
- Manages hover delay timers internally (300ms open, 200ms close)

### CharBreakdownContent (new component)

Renders the tooltip body content:

```typescript
interface CharBreakdownContentProps {
  charKey: CharacteristicKey;
  initial: number;
  advances: number;
  talentBonus: number;
  current: number;
  contributingTalentName: string | null;
}
```

Renders:
- "Initial: {i}"
- "Advances: {a}"
- "Talent Bonus: +{b} ({talentName})" — only when `b > 0`
- Separator line
- "Total: {current}"

### getContributingTalent (pure helper function)

```typescript
function getContributingTalent(
  talents: Talent[],
  charKey: CharacteristicKey
): string | null
```

Reverses the `TALENT_BONUS_MAP` lookup: given the character's talents array and a characteristic key, returns the talent name that contributes a bonus to that characteristic, or `null` if no bonus applies.

### Updated Tooltip usage in CharacterPage

The `charTooltip` state:

```typescript
const [charTooltip, setCharTooltip] = useState<{
  key: CharacteristicKey;
  anchorEl: HTMLElement;
} | null>(null);
```

When `charTooltip` is set, render the existing `<Tooltip>` component with `id="tooltip-char-{key}"`, title from `CHAR_FULL_NAMES[key]`, and `<CharBreakdownContent>` as children.

## Data Models

No new data models are required. The feature reads from existing structures:

| Field | Type | Source |
|-------|------|--------|
| `character.chars[key].i` | `number` | Initial characteristic value |
| `character.chars[key].a` | `number` | Advances |
| `character.chars[key].b` | `number` | Talent bonus (synced via `syncTalentBonuses`) |
| `character.talents` | `Talent[]` | Array of talents with `.n` (name) and `.lvl` |
| `TALENT_BONUS_MAP` | `Record<string, {char, bonus}>` | Static map from talent name to characteristic |
| `CHAR_FULL_NAMES` | `Record<CharacteristicKey, string>` | Full display names for tooltip title |

### Existing `CharacteristicValue` interface (unchanged):
```typescript
interface CharacteristicValue {
  i: number;  // Initial
  a: number;  // Advance
  b: number;  // Bonus (from talents)
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Breakdown total invariant

*For any* `CharacteristicValue` with fields `i`, `a`, and `b` (each non-negative integers), the breakdown tooltip SHALL display a Total that equals exactly `i + a + b`.

**Validates: Requirements 1.4**

### Property 2: Conditional talent row display

*For any* `CharacteristicValue`, the "Talent Bonus" row SHALL be present in the breakdown if and only if `b > 0`. When `b === 0`, the row is omitted; when `b > 0`, the row shows the bonus value and the contributing talent name.

**Validates: Requirements 1.5, 1.6**

### Property 3: Contributing talent resolution

*For any* character with a set of talents and *for any* characteristic key, `getContributingTalent(talents, charKey)` SHALL return the correct talent name when a talent in `TALENT_BONUS_MAP` matches that characteristic and exists in the character's talents array, or `null` otherwise.

**Validates: Requirements 1.6**

### Property 4: Tooltip metadata correctness

*For any* characteristic key in `['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel']`, the tooltip SHALL have `id` equal to `"tooltip-char-{key}"` and its title SHALL equal the full name from `CHAR_FULL_NAMES[key]`.

**Validates: Requirements 1.3, 3.1**

### Property 5: Aria-describedby linkage

*For any* characteristic key where the tooltip is open, the corresponding Current value cell SHALL have `aria-describedby` equal to `"tooltip-char-{key}"`. When the tooltip is closed, the attribute SHALL not be present.

**Validates: Requirements 3.2**

## Error Handling

This feature has minimal error paths since it reads from already-validated character data:

| Scenario | Handling |
|----------|----------|
| `character.chars[key]` is undefined | Defensive check — skip rendering tooltip (should never occur with valid data) |
| `TALENT_BONUS_MAP` reverse lookup finds no match | `getContributingTalent` returns `null`, tooltip omits talent name gracefully |
| Multiple talents contribute to same characteristic | Sum is already handled by `computeTalentBonuses`; tooltip shows primary talent name from `TALENT_BONUS_MAP` |
| Tooltip anchor element removed from DOM during hover delay | Clear timeout on unmount; check element existence before opening |
| Touch and mouse events firing together on hybrid devices | Use click as the primary trigger; cancel hover timeout on click to prevent double-open |

## Testing Strategy

### Unit Tests (example-based)

- Click on a Current cell opens the tooltip with correct breakdown content
- Hover for 300ms opens tooltip; hover for less than 300ms does not
- Mouse leave from both cell and tooltip closes after 200ms delay
- Clicking a different Current cell switches the tooltip
- Enter/Space key on focused cell opens tooltip
- Tooltip is dismissed by Escape key
- Tooltip is dismissed by clicking outside
- Tooltip receives focus on open
- Current cells all have `tabIndex={0}`
- Touch tap opens tooltip (simulated click)

### Property Tests (fast-check, minimum 100 iterations)

PBT is well-suited here because:
- The breakdown logic is a pure function of `CharacteristicValue` inputs
- The contributing talent lookup is a pure function of talent arrays and characteristic keys
- The input space (characteristic values 0–99, bonus 0–50+) is large
- Universal properties hold across all valid characteristic configurations

**Library**: `fast-check` (already in devDependencies)
**Runner**: `vitest` with `fc.assert(fc.property(...))` pattern (established in project)
**Iterations**: Minimum 100 per property (fast-check default)

Each property test will be tagged with a comment:
```
// Feature: characteristic-current-tooltip, Property {N}: {title}
```

Property tests will cover:
1. **Breakdown total invariant** — generate random `{i, a, b}` tuples, verify rendered Total = i + a + b
2. **Conditional talent row** — generate random `b` values, verify row presence matches `b > 0`
3. **Contributing talent resolution** — generate random talent arrays with known TALENT_BONUS_MAP entries, verify correct name resolution
4. **Tooltip metadata** — generate random characteristic keys, verify id pattern and title match
5. **Aria-describedby linkage** — generate random characteristic keys, render with tooltip open, verify attribute matches

### Integration Tests

- Full flow: click Current cell → tooltip shows breakdown → press Escape → tooltip gone
- Characteristic with talent bonus (e.g., Warrior Born +5 WS) shows correct talent name
- Characteristic without talent bonus omits the Talent Bonus row
