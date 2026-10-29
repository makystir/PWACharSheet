import { describe, it, expect } from 'vitest';
import { mapHuntingTerrain, HUNTING_CONSIDERATIONS, type HuntingTerrain } from '..';
import { TERRAIN_TYPES, type TerrainType } from '../../wilderness-travel/journey-modifiers';

const ALL_HUNTING_TERRAINS: HuntingTerrain[] = [
  'Deep Forest',
  'Hills',
  'Light Woodland',
  'Temperate Plains',
  'Wetlands',
  'Mountains',
  'Any',
];

describe('mapHuntingTerrain — Deft Steps hunting terrain → canonical TerrainType', () => {
  it('maps every hunting terrain string to a non-empty array of valid TerrainTypes', () => {
    for (const t of ALL_HUNTING_TERRAINS) {
      const mapped = mapHuntingTerrain(t);
      expect(mapped.length).toBeGreaterThan(0);
      for (const tt of mapped) {
        expect(TERRAIN_TYPES).toContain(tt);
      }
    }
  });

  it('spot-checks the renamed spellings', () => {
    expect(mapHuntingTerrain('Deep Forest')).toEqual(['Deep forest']);
    expect(mapHuntingTerrain('Wetlands')).toEqual(['Wetland']);
    expect(mapHuntingTerrain('Hills')).toEqual(['Hills']);
    expect(mapHuntingTerrain('Light Woodland')).toEqual(['Light Woodland']);
    expect(mapHuntingTerrain('Temperate Plains')).toEqual(['Temperate Plains']);
    expect(mapHuntingTerrain('Mountains')).toEqual(['Mountains']);
  });

  it('maps "Any" to all six canonical terrains as a fresh copy (not the shared array)', () => {
    const mapped = mapHuntingTerrain('Any');
    expect([...mapped].sort()).toEqual([...TERRAIN_TYPES].sort());
    expect(mapped).not.toBe(TERRAIN_TYPES);
  });

  it('covers all six canonical TerrainTypes across the full hunting table', () => {
    const covered = new Set<TerrainType>();
    for (const row of HUNTING_CONSIDERATIONS) {
      for (const terrain of row.terrain) {
        for (const tt of mapHuntingTerrain(terrain)) covered.add(tt);
      }
    }
    expect([...covered].sort()).toEqual([...TERRAIN_TYPES].sort());
  });
});
