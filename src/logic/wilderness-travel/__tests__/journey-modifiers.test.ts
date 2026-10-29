import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  TERRAIN_TABLE,
  TERRAIN_TYPES,
  TEMPERATURE_OPTIONS,
  PRECIPITATION_OPTIONS,
  VISIBILITY_OPTIONS,
  computeEndeavourNetSL,
  type ModifierTarget,
  type StageWeather,
  type TerrainType,
} from '../journey-modifiers';
import { getJourneyEndeavour } from '../journey-endeavours';

/** Pull a real catalog entry's modifier target so tests exercise live metadata. */
function target(name: string): ModifierTarget {
  const e = getJourneyEndeavour(name);
  if (!e) throw new Error(`no catalog entry ${name}`);
  return e;
}

describe('TERRAIN_TABLE — verbatim grid (Deft Steps p.124)', () => {
  it('matches the transcribed cell-for-cell fixture, including split Hunt/Fish', () => {
    expect(TERRAIN_TABLE).toEqual({
      'Light Woodland': { Navigation: 0, Water: 0, Foraging: 1, Hunt: 1, Fish: 0, MakeCamp: 2, Watch: 0 },
      Hills: { Navigation: 0, Water: -1, Foraging: -1, Hunt: 0, Fish: 0, MakeCamp: 0, Watch: 1 },
      'Deep forest': { Navigation: -2, Water: -1, Foraging: 1, Hunt: -1, Fish: 0, MakeCamp: 1, Watch: -1 },
      'Temperate Plains': { Navigation: 1, Water: 0, Foraging: 0, Hunt: 1, Fish: 0, MakeCamp: -1, Watch: 1 },
      Wetland: { Navigation: 0, Water: 2, Foraging: -1, Hunt: 0, Fish: 1, MakeCamp: -1, Watch: 1 },
      Mountains: { Navigation: 0, Water: 0, Foraging: -2, Hunt: -1, Fish: -2, MakeCamp: -1, Watch: 0 },
    });
  });
});

describe('computeEndeavourNetSL — worked examples (Deft Steps p.114/p.124)', () => {
  it('Navigate in Mountains + Thick Fog → net −3 (terrain 0 + visibility −3)', () => {
    const r = computeEndeavourNetSL(target('Navigate'), 'Mountains', { visibility: 'Thick Fog' });
    expect(r.net).toBe(-3);
    expect(r.components).toEqual([{ label: 'Weather (Visibility Thick Fog)', value: -3 }]);
  });

  it('Navigate in Deep forest + Mist → net −3 (terrain −2 + visibility −1)', () => {
    const r = computeEndeavourNetSL(target('Navigate'), 'Deep forest', { visibility: 'Mist' });
    expect(r.net).toBe(-3);
    expect(r.components).toEqual([
      { label: 'Terrain (Deep forest Navigation)', value: -2 },
      { label: 'Weather (Visibility Mist)', value: -1 },
    ]);
  });

  it('Navigate in Temperate Plains + Fog → net −1 (terrain +1 + Fog −2) — cited-but-unrollable Fog tier', () => {
    const r = computeEndeavourNetSL(target('Navigate'), 'Temperate Plains', { visibility: 'Fog' });
    expect(r.net).toBe(-1);
    expect(r.components).toEqual([
      { label: 'Terrain (Temperate Plains Navigation)', value: 1 },
      { label: 'Weather (Visibility Fog)', value: -2 },
    ]);
  });

  it('Forage in Mountains → net −2 (terrain only)', () => {
    const r = computeEndeavourNetSL(target('Forage'), 'Mountains', undefined);
    expect(r.net).toBe(-2);
    expect(r.components).toEqual([{ label: 'Terrain (Mountains Foraging)', value: -2 }]);
  });

  it('Haste in Very Heavy precipitation → net −1 via the "other Tests" rule (Endurance isn\'t Athletics/Climb/Ranged)', () => {
    const r = computeEndeavourNetSL(target('Haste'), undefined, { precipitation: 'Very Heavy' });
    expect(r.net).toBe(-1);
    expect(r.components).toEqual([{ label: 'Weather (Very Heavy precipitation, other Tests)', value: -1 }]);
  });

  it('Trap under Bitter → net 0 with a Bitter-gloves advisory (not summed)', () => {
    const r = computeEndeavourNetSL(target('Trap'), undefined, { temperature: 'Bitter' });
    expect(r.net).toBe(0);
    expect(r.components).toEqual([]);
    expect(r.advisory.some((a) => /gloves/i.test(a))).toBe(true);
  });

  it('no terrain/weather selected → net 0, no components, no advisory', () => {
    const r = computeEndeavourNetSL(target('Navigate'), undefined, undefined);
    expect(r).toEqual({ net: 0, components: [], advisory: [] });
  });
});

describe('computeEndeavourNetSL — properties', () => {
  const arbTerrain = fc.option(fc.constantFrom<TerrainType>(...TERRAIN_TYPES), { nil: undefined });
  const arbWeather: fc.Arbitrary<StageWeather | undefined> = fc.option(
    fc.record({
      temperature: fc.option(fc.constantFrom(...TEMPERATURE_OPTIONS), { nil: undefined }),
      precipitation: fc.option(fc.constantFrom(...PRECIPITATION_OPTIONS), { nil: undefined }),
      visibility: fc.option(fc.constantFrom(...VISIBILITY_OPTIONS), { nil: undefined }),
    }),
    { nil: undefined },
  );
  const arbTarget = fc.constantFrom(
    'Forage', 'Haste', 'Hunt/Fish', 'Navigate', 'Map', 'Scout', 'Track', 'Water',
    'Cook', 'Journal', 'Make Camp', 'Recuperate', 'Trap', 'Watch',
  ).map(target);

  it('net always equals Σ components.value', () => {
    fc.assert(
      fc.property(arbTarget, arbTerrain, arbWeather, (t, terrain, weather) => {
        const r = computeEndeavourNetSL(t, terrain, weather);
        expect(r.net).toBe(r.components.reduce((s, c) => s + c.value, 0));
      }),
    );
  });

  it('never throws and never mutates its arguments (frozen inputs)', () => {
    fc.assert(
      fc.property(arbTarget, arbTerrain, arbWeather, (t, terrain, weather) => {
        const frozenT = Object.freeze({ ...t });
        const frozenW = weather ? Object.freeze({ ...weather }) : weather;
        expect(() => computeEndeavourNetSL(frozenT, terrain, frozenW)).not.toThrow();
      }),
    );
  });

  it('is total over garbage terrain/weather (out-of-enum → 0, no throw)', () => {
    const r = computeEndeavourNetSL(
      target('Navigate'),
      'Nowhere' as unknown as TerrainType,
      { visibility: 'Hazy' as unknown as StageWeather['visibility'] },
    );
    expect(r.net).toBe(0);
  });
});
