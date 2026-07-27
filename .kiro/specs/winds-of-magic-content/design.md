# Design Document

## Overview

This design describes how to integrate the Winds of Magic supplement into the existing app architecture. The integration follows the established pattern: static data additions to existing data modules, logic updates to the spell-casting system, and targeted UI additions for new features (rituals, saturation, arcane marks).

## Architecture

The integration touches these layers:

```
src/data/          → Static data (spells, talents, careers, trappings, miscast tables)
src/types/         → Type extensions (Character interface, new interfaces)
src/logic/         → Business logic (spell-casting, advancement)
src/components/    → UI (Advancement page, SpellCasting panel)
```

## Design Decisions

### 1. Spell Data Structure (Unchanged)

Spells continue to use the existing `SpellData` interface:
```typescript
{ name: string; cn: string; range: string; target: string; duration: string; effect: string }
```

No lore categorization field is added to `SpellData` itself — the spell picker already works by filtering on CN (petty = 0, others > 0). Lore-specific filtering can be inferred from the character's talents (e.g., Arcane Magic (Fire) means they can learn Fire lore spells). If lore filtering is needed in the picker, a comment-based grouping in `spells.ts` is sufficient (matching the existing pattern).

### 2. Career Data Structure (Unchanged)

New careers use the existing `CareerScheme` interface. WoM careers have 10 starting skills per level (vs. 8 in Core), but the data structure already supports variable-length skill arrays — no schema change needed.

### 3. Miscast Tables (Replace)

The WoM miscast tables supersede the Core tables. The existing `miscast-tables.ts` data will be replaced wholesale with the new 20-entry Minor and 20-entry Major tables. The existing `MiscastTableEntry` interface (`{ range: string; label: string; effect: string }`) remains unchanged.

### 4. Overcast Table (New Data + Logic)

A new data constant `OVERCAST_TABLE` will be added to `spell-casting.ts` (or a new `overcast-table.ts`). The logic change is in how surplus SL is resolved — the current implementation already tracks `overcastSlots` in `CastingResult`, but the allocation rules need to match the Fibonacci-like progression.

### 5. Channelling Rules (Logic Update)

The existing `ChannellingResult` interface and `resolveChannellingResult` function in `spell-casting.ts` need updates:
- Add WP Bonus SL on critical channelling (doubles + success)
- Track whether Aethyric Attunement prevents the miscast
- Handle fumbled channelling (doubles + failure) → lose all SL + miscast

### 6. Armour Penalty (New Calculation)

A new function `getArmourCastingPenalty(character: Character): number` will compute the penalty based on the highest AP location. This feeds into the casting target display. Exemptions check for Arcane Magic (Metal) + metal armour or Arcane Magic (Beasts) + leather armour.

### 7. Ritual Magic (New Feature)

**Character Type Extension:**
```typescript
interface RitualItem {
  name: string;
  cn: number;
  type: string;      // Lore restrictions, e.g., "Lore of Beasts" or "Any"
  learningXP: number;
  ingredients: string;
  conditions: string;
  description: string;
}
```

Add `rituals: RitualItem[]` to the Character interface. The advancement page gets a "Learn Ritual" section (similar to spell learning) that deducts the `learningXP` cost. Ritual data lives in a new `src/data/rituals.ts` file.

### 8. Environmental Saturation (Session State)

Add `magicSaturation: 'low' | 'normal' | 'heavy' | 'extreme' | 'corrupted'` to the existing `SessionState` interface. Default: `'normal'`. The SpellCastingPanel displays the current level with a dropdown to change it (GM-facing). The modifier is shown as a note next to the casting target.

### 9. Arcane Marks (New Data + UI)

Arcane Marks tables live in a new `src/data/arcane-marks.ts` file with structure:
```typescript
Record<string, { roll: number; description: string }[]>
// keyed by Lore name, each an array of 10 entries
```

Marks are stored on the character as string entries in an `arcaneMarks: string[]` field. When miscast result 86-90 occurs, the UI prompts rolling on the appropriate table and records the result.

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/data/spells.ts` | Extend | Add ~140 new lore spells + 8 arcane utility spells |
| `src/data/careers.ts` | Extend | Add 12 new careers |
| `src/data/talents.ts` | Extend | Add ~10 new talents |
| `src/data/advanced-skills.ts` | Extend | Add Augury, Psychometry |
| `src/data/miscast-tables.ts` | Replace | New Minor (20) + Major (20) tables from WoM |
| `src/data/trappings.ts` | Extend | Add wizard robes, staves, power stones, scrolls |
| `src/data/rituals.ts` | **New** | Ritual definitions (~13 rituals) |
| `src/data/arcane-marks.ts` | **New** | 8 Arcane Marks tables (10 entries each) |
| `src/types/character.ts` | Extend | Add RitualItem, rituals[], arcaneMarks[], magicSaturation |
| `src/logic/spell-casting.ts` | Modify | Overcast table, channelling rules, armour penalty |
| `src/logic/advancement.ts` | Extend | Ritual learning XP function |
| `src/components/pages/AdvancementPage.tsx` | Extend | Ritual learning section |
| `src/components/shared/SpellCastingPanel.tsx` | Extend | Saturation display/toggle |

## Risks and Mitigations

- **Data volume:** ~140 spells is significant but follows the same pattern as existing entries. Use bulk copy with careful formatting.
- **Miscast table replacement:** May break existing tests that assert specific table content. Update tests alongside data.
- **Overcast logic complexity:** The Fibonacci-like table is straightforward to implement as a lookup array. Current overcast UI can be extended incrementally.
- **Backward compatibility:** New Character fields must have defaults in BLANK_CHARACTER to avoid breaking existing saves. Use empty arrays and 'normal' for saturation.
