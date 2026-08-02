import type { Character, ChannellingProgress, SpellData } from '../types/character';
import type { CantEntry, ColourLore } from '../data/cants';
import { COLOUR_LORES, WIND_DISPLAY_NAMES } from '../data/cants';
import type { LearnedCant } from '../types/character';

/**
 * Derived state for a single Lore group in the Cant panel.
 */
export interface CantLoreGroup {
  lore: ColourLore;
  windDisplayName: string;
  spellCount: number;
  permittedSlots: number;
  learnedCants: CantEntry[];
  availableCants: CantEntry[];
  lockedCants: CantEntry[];
  aggregatedSL: number;
  canActivate: boolean;
}

/**
 * Full derived state for the CantPanel component.
 */
export interface CantPanelState {
  loreGroups: CantLoreGroup[];
  hasOverLimitViolation: boolean;
  violationMessages: string[];
}

/**
 * Count how many spells a character has for each colour magic Lore.
 * Only spells whose name exactly matches an entry in the spell catalogue
 * for a colour magic Lore are counted. Custom/homebrew spells are excluded.
 */
export function getSpellCountByLore(
  character: Character,
  spellCatalogue: SpellData[]
): Map<string, number> {
  const counts = new Map<string, number>();

  // Build a lookup: spell name → lore (only for colour magic lores)
  const colourLoreSet = new Set<string>(COLOUR_LORES);
  const spellNameToLore = new Map<string, string>();
  for (const spell of spellCatalogue) {
    if (colourLoreSet.has(spell.lore)) {
      spellNameToLore.set(spell.name, spell.lore);
    }
  }

  // Count character spells that match catalogue entries
  for (const spell of character.spells) {
    const lore = spellNameToLore.get(spell.name);
    if (lore) {
      counts.set(lore, (counts.get(lore) ?? 0) + 1);
    }
  }

  return counts;
}

/**
 * Determine how many Cant slots a character gets based on their spell count
 * for a given Lore.
 *
 * Thresholds:
 *   0 spells → 0 slots
 *   1-2 spells → 1 slot
 *   3-5 spells → 2 slots
 *   6+ spells → 3 slots
 */
export function getPermittedCantSlots(spellCount: number): number {
  if (spellCount <= 0) return 0;
  if (spellCount <= 2) return 1;
  if (spellCount <= 5) return 2;
  return 3;
}

/**
 * Aggregate the total accumulated SL per Wind (colour Lore) from
 * the character's channelling progress entries.
 *
 * Each channellingProgress entry references a spell by name. We look up
 * that spell in the catalogue to determine its Lore (Wind). Entries
 * referencing spells not in the catalogue are excluded.
 *
 * Each Wind's aggregation is independent of other Winds.
 */
export function getAggregatedSLByWind(
  character: Character,
  spellCatalogue: SpellData[]
): Map<string, number> {
  const aggregated = new Map<string, number>();

  // Build a lookup: spell name → lore (only colour magic)
  const colourLoreSet = new Set<string>(COLOUR_LORES);
  const spellNameToLore = new Map<string, string>();
  for (const spell of spellCatalogue) {
    if (colourLoreSet.has(spell.lore)) {
      spellNameToLore.set(spell.name, spell.lore);
    }
  }

  for (const entry of character.channellingProgress) {
    const lore = spellNameToLore.get(entry.spellName);
    if (lore) {
      aggregated.set(lore, (aggregated.get(lore) ?? 0) + entry.accumulatedSL);
    }
  }

  return aggregated;
}

/**
 * Compute the permitted SL expenditure range for a variable-SL Cant.
 *
 * Returns { min: cant.slCost, max: Math.min(availableSL, wpBonus) }.
 * If max < min (shouldn't happen if activation is gated properly),
 * the function still returns consistent bounds as computed.
 */
export function getVariableSLRange(
  cant: CantEntry,
  availableSL: number,
  wpBonus: number
): { min: number; max: number } {
  return {
    min: cant.slCost,
    max: Math.min(availableSL, wpBonus),
  };
}

/**
 * Determine whether a Cant can be activated given current state.
 *
 * Returns true if and only if:
 *   1. The aggregated SL for the Cant's Wind ≥ the Cant's SL cost
 *   2. No other Cant has been activated this round
 */
export function canActivateCant(
  cant: CantEntry,
  aggregatedSL: number,
  alreadyActivatedThisRound: boolean
): boolean {
  return aggregatedSL >= cant.slCost && !alreadyActivatedThisRound;
}

/**
 * Deduct SL cost from channelling progress entries for a given Wind.
 *
 * Strategy: deduct from the entry with the highest accumulated SL first.
 * If the highest entry doesn't have enough SL to cover the full cost,
 * split across multiple entries (descending by SL).
 *
 * Returns a new channellingProgress array (immutable update).
 * Entries from other Winds are unchanged.
 */
export function deductSLFromProgress(
  channellingProgress: ChannellingProgress[],
  lore: string,
  slCost: number,
  spellCatalogue: SpellData[]
): ChannellingProgress[] {
  // Build spell name → lore lookup (colour only)
  const colourLoreSet = new Set<string>(COLOUR_LORES);
  const spellNameToLore = new Map<string, string>();
  for (const spell of spellCatalogue) {
    if (colourLoreSet.has(spell.lore)) {
      spellNameToLore.set(spell.name, spell.lore);
    }
  }

  // Separate entries into "this Wind" and "other"
  const thisWindEntries: { index: number; entry: ChannellingProgress }[] = [];
  for (let i = 0; i < channellingProgress.length; i++) {
    const entryLore = spellNameToLore.get(channellingProgress[i].spellName);
    if (entryLore === lore) {
      thisWindEntries.push({ index: i, entry: { ...channellingProgress[i] } });
    }
  }

  // Sort by accumulatedSL descending (deduct from highest first)
  thisWindEntries.sort((a, b) => b.entry.accumulatedSL - a.entry.accumulatedSL);

  // Deduct
  let remaining = slCost;
  for (const item of thisWindEntries) {
    if (remaining <= 0) break;
    const deduction = Math.min(item.entry.accumulatedSL, remaining);
    item.entry.accumulatedSL -= deduction;
    remaining -= deduction;
  }

  // Reconstruct the full array with updated entries
  const result = [...channellingProgress];
  for (const item of thisWindEntries) {
    result[item.index] = item.entry;
  }

  return result;
}

/**
 * Filter a learnedCants array to only include entries that reference
 * valid entries in the Cant catalogue. Invalid entries are silently discarded.
 * Original order is preserved.
 */
export function validateLearnedCants(
  learnedCants: LearnedCant[],
  cantCatalogue: CantEntry[]
): LearnedCant[] {
  // Build a set of valid "lore|cantName" keys
  const validKeys = new Set<string>();
  for (const cant of cantCatalogue) {
    validKeys.add(`${cant.lore}|${cant.name}`);
  }

  return learnedCants.filter(lc => validKeys.has(`${lc.lore}|${lc.cantName}`));
}

/**
 * Get all Cant entries for a given Lore from the catalogue.
 */
export function getCantsForLore(lore: string, cantCatalogue: CantEntry[]): CantEntry[] {
  return cantCatalogue.filter(c => c.lore === lore);
}

/**
 * Compute the full CantPanel state from a character, the Cant catalogue,
 * and the spell catalogue.
 *
 * This derives:
 *   - Which Lore groups to display (only those with ≥1 matching spell)
 *   - Spell counts and permitted slots per Lore
 *   - Learned/available/locked categorization for each Cant
 *   - Aggregated SL per Wind
 *   - Whether activation is possible (SL > 0, not yet activated this round)
 *   - Over-limit violation detection
 *
 * Note: `alreadyActivatedThisRound` is component state, not persisted.
 * This function assumes it is false (UI passes the flag separately).
 */
export function computeCantState(
  character: Character,
  cantCatalogue: CantEntry[],
  spellCatalogue: SpellData[]
): CantPanelState {
  const spellCounts = getSpellCountByLore(character, spellCatalogue);
  const aggregatedSLMap = getAggregatedSLByWind(character, spellCatalogue);
  const validLearnedCants = validateLearnedCants(character.learnedCants ?? [], cantCatalogue);

  const violationMessages: string[] = [];
  const loreGroups: CantLoreGroup[] = [];

  // Process only Lores where the character has at least 1 spell
  for (const lore of COLOUR_LORES) {
    const spellCount = spellCounts.get(lore) ?? 0;
    if (spellCount === 0) continue;

    const permittedSlots = getPermittedCantSlots(spellCount);
    const allCantsForLore = getCantsForLore(lore, cantCatalogue);
    const aggregatedSL = aggregatedSLMap.get(lore) ?? 0;

    // Determine which Cants the character has learned for this Lore
    const learnedForLore = validLearnedCants.filter(lc => lc.lore === lore);
    const learnedNames = new Set(learnedForLore.map(lc => lc.cantName));

    // Categorize Cants
    const learned: CantEntry[] = [];
    const available: CantEntry[] = [];
    const locked: CantEntry[] = [];

    for (const cant of allCantsForLore) {
      if (learnedNames.has(cant.name)) {
        learned.push(cant);
      } else if (learnedForLore.length < permittedSlots) {
        available.push(cant);
      } else {
        locked.push(cant);
      }
    }

    // Check for over-limit violation
    if (learnedForLore.length > permittedSlots) {
      violationMessages.push(
        `${WIND_DISPLAY_NAMES[lore]}: ${learnedForLore.length} Cants learned but only ${permittedSlots} permitted (${spellCount} spell${spellCount !== 1 ? 's' : ''} from this Lore).`
      );
    }

    loreGroups.push({
      lore,
      windDisplayName: WIND_DISPLAY_NAMES[lore],
      spellCount,
      permittedSlots,
      learnedCants: learned,
      availableCants: available,
      lockedCants: locked,
      aggregatedSL,
      canActivate: aggregatedSL > 0,
    });
  }

  // Sort by Wind display name alphabetically
  loreGroups.sort((a, b) => a.windDisplayName.localeCompare(b.windDisplayName));

  return {
    loreGroups,
    hasOverLimitViolation: violationMessages.length > 0,
    violationMessages,
  };
}
