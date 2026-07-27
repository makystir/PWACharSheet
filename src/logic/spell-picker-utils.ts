import type { SpellData, Talent } from '../types/character';
import { LORE_DISPLAY_ORDER } from '../data/spells';

/**
 * Mapping from Arcane Magic wind names (common and Reikspiel) to lore categories.
 */
const ARCANE_MAGIC_MAP: Record<string, string> = {
  'Fire': 'Lore of Fire',
  'Aqshy': 'Lore of Fire',
  'Beasts': 'Lore of Beasts',
  'Ghur': 'Lore of Beasts',
  'Death': 'Lore of Death',
  'Shyish': 'Lore of Death',
  'Heavens': 'Lore of Heavens',
  'Azyr': 'Lore of Heavens',
  'Metal': 'Lore of Metal',
  'Chamon': 'Lore of Metal',
  'Life': 'Lore of Life',
  'Ghyran': 'Lore of Life',
  'Light': 'Lore of Light',
  'Hysh': 'Lore of Light',
  'Shadows': 'Lore of Shadows',
  'Ulgu': 'Lore of Shadows',
  'Hedgecraft': 'Lore of Hedgecraft',
  'Witchcraft': 'Lore of Witchcraft',
  'Daemonology': 'Lore of Daemonology',
  'Necromancy': 'Lore of Necromancy',
};

/**
 * Mapping from Invoke deity names to miracle categories.
 */
const INVOKE_MAP: Record<string, string> = {
  'Manann': 'Miracles of Manann',
  'Morr': 'Miracles of Morr',
  'Myrmidia': 'Miracles of Myrmidia',
  'Ranald': 'Miracles of Ranald',
  'Rhya': 'Miracles of Rhya',
  'Shallya': 'Miracles of Shallya',
  'Sigmar': 'Miracles of Sigmar',
  'Taal': 'Miracles of Taal',
  'Ulric': 'Miracles of Ulric',
  'Verena': 'Miracles of Verena',
};

/**
 * Derive the character's primary lore from their talent list.
 * Prioritizes Arcane Magic / Chaos Magic / Invoke over Petty Magic.
 * Returns null if no lore-granting talent is found.
 */
export function deriveCharacterLore(talents: Pick<Talent, 'n'>[]): string | null {
  let hasPettyMagic = false;

  for (const talent of talents) {
    const name = talent.n;

    // Check Arcane Magic (X)
    const arcaneMatch = name.match(/^Arcane Magic\s*\((.+)\)$/);
    if (arcaneMatch) {
      const wind = arcaneMatch[1].trim();
      const lore = ARCANE_MAGIC_MAP[wind];
      if (lore) return lore;
    }

    // Check Chaos Magic (*)
    if (/^Chaos Magic\s*\(.+\)$/.test(name)) {
      return 'Chaos';
    }

    // Check Invoke (X)
    const invokeMatch = name.match(/^Invoke\s*\((.+)\)$/);
    if (invokeMatch) {
      const deity = invokeMatch[1].trim();
      const lore = INVOKE_MAP[deity];
      if (lore) return lore;
    }

    // Track Petty Magic (lower priority)
    if (name === 'Petty Magic') {
      hasPettyMagic = true;
    }
  }

  // Petty Magic only applies when no higher-priority talent was found
  if (hasPettyMagic) return 'Petty';

  return null;
}

/**
 * Filter spells by a lore category. Null means no filter (return all).
 */
export function filterByLore(spells: SpellData[], lore: string | null): SpellData[] {
  if (lore === null) return spells;
  return spells.filter(spell => spell.lore === lore);
}

/**
 * Filter spells by name using case-insensitive substring match.
 * Empty query returns all spells.
 */
export function searchSpells(spells: SpellData[], query: string): SpellData[] {
  if (!query) return spells;
  const lower = query.toLowerCase();
  return spells.filter(spell => spell.name.toLowerCase().includes(lower));
}

/**
 * Compose lore filter and text search. Equivalent to:
 * searchSpells(filterByLore(spells, lore), query)
 */
export function filterSpells(
  spells: SpellData[],
  lore: string | null,
  query: string
): SpellData[] {
  return searchSpells(filterByLore(spells, lore), query);
}

/**
 * Group spells by lore, preserving LORE_DISPLAY_ORDER.
 * Only includes groups that have at least one spell.
 */
export function groupByLore(spells: SpellData[]): { lore: string; spells: SpellData[] }[] {
  // Build a map of lore -> spells
  const map = new Map<string, SpellData[]>();
  for (const spell of spells) {
    const group = map.get(spell.lore);
    if (group) {
      group.push(spell);
    } else {
      map.set(spell.lore, [spell]);
    }
  }

  // Return groups in canonical order, only those present in data
  const result: { lore: string; spells: SpellData[] }[] = [];
  for (const lore of LORE_DISPLAY_ORDER) {
    const group = map.get(lore);
    if (group) {
      result.push({ lore, spells: group });
    }
  }

  // Include any lore not in LORE_DISPLAY_ORDER at the end (defensive)
  for (const [lore, group] of map) {
    if (!LORE_DISPLAY_ORDER.includes(lore)) {
      result.push({ lore, spells: group });
    }
  }

  return result;
}

/**
 * Get unique lore values present in the given spell list,
 * ordered according to LORE_DISPLAY_ORDER.
 */
export function getAvailableLores(spells: SpellData[]): string[] {
  const loreSet = new Set<string>();
  for (const spell of spells) {
    loreSet.add(spell.lore);
  }

  // Return in canonical order
  const result: string[] = [];
  for (const lore of LORE_DISPLAY_ORDER) {
    if (loreSet.has(lore)) {
      result.push(lore);
    }
  }

  // Include any lore not in LORE_DISPLAY_ORDER at the end (defensive)
  for (const lore of loreSet) {
    if (!LORE_DISPLAY_ORDER.includes(lore)) {
      result.push(lore);
    }
  }

  return result;
}
