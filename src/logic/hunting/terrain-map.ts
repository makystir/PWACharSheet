/**
 * Pure terrain-name bridge from the Deft Steps Hunting Considerations table's
 * VERBATIM printed terrain strings to the canonical TerrainType enum used by the
 * Wilderness Travel journey model. No new terrain enum is introduced and the
 * book's printed spellings are never silently renamed — the verbatim strings
 * live in hunting-data.ts, and this is the single authoritative mapping.
 *
 * Deft Steps p.124: Hunting Considerations terrain column (docs/deftsteps.md
 * ~L4875). The canonical enum (journey-modifiers.ts) is EXACTLY:
 *   'Light Woodland' | 'Hills' | 'Deep forest' | 'Temperate Plains'
 *   | 'Wetland' | 'Mountains'
 * Note the lowercase `f` in 'Deep forest' and the singular 'Wetland'.
 */

import { TERRAIN_TYPES, type TerrainType } from '../wilderness-travel/journey-modifiers';
import type { HuntingTerrain } from './hunting-data';

/**
 * Maps a verbatim Deft Steps hunting-table terrain string to the canonical
 * TerrainType(s). "Any" → a fresh copy of all six terrains (never the shared
 * readonly array, so a caller cannot mutate the source). Total over the
 * HuntingTerrain union; an un-migrated future string fails loudly via the
 * exhaustive `never` default rather than returning undefined.
 */
export function mapHuntingTerrain(t: HuntingTerrain): TerrainType[] {
  switch (t) {
    case 'Deep Forest':
      return ['Deep forest'];
    case 'Wetlands':
      return ['Wetland'];
    case 'Hills':
      return ['Hills'];
    case 'Light Woodland':
      return ['Light Woodland'];
    case 'Temperate Plains':
      return ['Temperate Plains'];
    case 'Mountains':
      return ['Mountains'];
    case 'Any':
      return [...TERRAIN_TYPES];
    default: {
      const exhaustive: never = t;
      throw new Error(`Unmapped hunting terrain: ${String(exhaustive)}`);
    }
  }
}
