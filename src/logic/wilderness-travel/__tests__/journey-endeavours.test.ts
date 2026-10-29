import { describe, it, expect } from 'vitest';
import {
  JOURNEY_ENDEAVOURS,
  getJourneyEndeavour,
  type EndeavourPhase,
} from '../journey-endeavours';
import { GENERAL_ENDEAVOURS, CLASS_ENDEAVOURS } from '../../endeavours';

/**
 * Catalog unit tests. Verifies the 14 single-phase entries, the verbatim
 * difficulties, the seedable classification (§3.1), disjointness from the
 * downtime catalogs (the separation mandate), and non-empty citations.
 */

const byName = (name: string) => JOURNEY_ENDEAVOURS.find((e) => e.name === name);

describe('Journey Endeavour catalog — shape', () => {
  it('has exactly 14 single-phase entries (8 Travel + 6 distinct Camp)', () => {
    expect(JOURNEY_ENDEAVOURS).toHaveLength(14);
    const travel = JOURNEY_ENDEAVOURS.filter((e) => e.phase === 'travel').map((e) => e.name);
    const camp = JOURNEY_ENDEAVOURS.filter((e) => e.phase === 'camp').map((e) => e.name);
    expect(travel.sort()).toEqual(
      ['Forage', 'Haste', 'Hunt/Fish', 'Map', 'Navigate', 'Scout', 'Track', 'Water'].sort(),
    );
    expect(camp.sort()).toEqual(
      ['Cook', 'Journal', 'Make Camp', 'Recuperate', 'Trap', 'Watch'].sort(),
    );
  });

  it('Map and Navigate are travel-only; their Camp-slot use is the Double Endeavour (guidance text)', () => {
    // No second phase:'camp' entry for Map or Navigate.
    expect(JOURNEY_ENDEAVOURS.filter((e) => e.name === 'Map')).toHaveLength(1);
    expect(JOURNEY_ENDEAVOURS.filter((e) => e.name === 'Navigate')).toHaveLength(1);
    expect(byName('Map')!.phase).toBe<EndeavourPhase>('travel');
    expect(byName('Navigate')!.phase).toBe<EndeavourPhase>('travel');
    // Double Endeavour guidance is present in the effect text.
    expect(byName('Map')!.effect).toMatch(/Double Endeavour/i);
    expect(byName('Navigate')!.effect).toMatch(/Double Endeavour/i);
  });

  it('each display name maps to exactly one entry', () => {
    const names = JOURNEY_ENDEAVOURS.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('getJourneyEndeavour looks up by id or name, case-insensitively, and returns undefined for unknown', () => {
    expect(getJourneyEndeavour('navigate')!.id).toBe('navigate');
    expect(getJourneyEndeavour('Navigate')!.id).toBe('navigate');
    expect(getJourneyEndeavour('make-camp')!.name).toBe('Make Camp');
    expect(getJourneyEndeavour('Make Camp')!.id).toBe('make-camp');
    expect(getJourneyEndeavour('Other')).toBeUndefined();
    expect(getJourneyEndeavour('')).toBeUndefined();
  });
});

describe('Journey Endeavour catalog — verbatim difficulties (Deft Steps p.125/126)', () => {
  const expected: Record<string, 'Challenging' | 'Average'> = {
    Forage: 'Challenging',
    Haste: 'Challenging',
    'Hunt/Fish': 'Challenging',
    Navigate: 'Challenging',
    Scout: 'Challenging',
    Water: 'Challenging',
    'Make Camp': 'Challenging',
    Trap: 'Challenging',
    Recuperate: 'Challenging',
    Track: 'Average',
    Journal: 'Average',
    Cook: 'Average',
    Watch: 'Average',
    Map: 'Average',
  };
  it.each(Object.entries(expected))('%s has difficulty %s', (name, diff) => {
    expect(byName(name)!.difficulty).toBe(diff);
  });
});

describe('Journey Endeavour catalog — seedable classification (§3.1)', () => {
  it('Map, Journal, and Recuperate are guidance-only (no seed)', () => {
    expect(byName('Map')!.seed).toBeUndefined();
    expect(byName('Journal')!.seed).toBeUndefined();
    expect(byName('Recuperate')!.seed).toBeUndefined();
  });

  it('bare-skill endeavours seed the expected skill + fallback characteristic', () => {
    const cases: Array<[string, string, string]> = [
      ['Forage', 'Outdoor Survival', 'Int'],
      ['Haste', 'Endurance', 'T'],
      ['Hunt/Fish', 'Outdoor Survival', 'Int'],
      ['Navigate', 'Navigation', 'Int'],
      ['Scout', 'Perception', 'I'],
      ['Track', 'Tracking', 'I'],
      ['Water', 'Outdoor Survival', 'Int'],
      ['Cook', 'Outdoor Survival', 'Int'],
      ['Make Camp', 'Outdoor Survival', 'Int'],
      ['Trap', 'Set Trap', 'Dex'],
    ];
    for (const [name, skillName, fallbackChar] of cases) {
      const seed = byName(name)!.seed!;
      expect(seed.def.kind).toBe('skill');
      if (seed.def.kind === 'skill') {
        expect(seed.def.skillName).toBe(skillName);
        expect(seed.def.fallbackChar).toBe(fallbackChar);
      }
    }
  });

  it('Watch seeds a plain Willpower characteristic (conditional/situational)', () => {
    const seed = byName('Watch')!.seed!;
    expect(seed.def.kind).toBe('characteristic');
    if (seed.def.kind === 'characteristic') {
      expect(seed.def.char).toBe('WP');
    }
    expect(byName('Watch')!.seedNote).toMatch(/situational/i);
  });

  it('Cook seeds the bare Outdoor Survival option at Challenging (+0), not the Trade (Cook) specialisation', () => {
    expect(byName('Cook')!.seed!.difficulty).toBe('Challenging');
  });
});

describe('Journey Endeavour catalog — rules compliance', () => {
  it('every entry carries a non-empty "Deft Steps" citation', () => {
    for (const e of JOURNEY_ENDEAVOURS) {
      expect(e.citation).toMatch(/Deft Steps/);
      expect(e.seedNote.length).toBeGreaterThan(0);
      expect(e.test.length).toBeGreaterThan(0);
      expect(e.effect.length).toBeGreaterThan(0);
    }
  });

  it('is DISJOINT from the downtime catalogs (separation mandate)', () => {
    const journeyNames = new Set(JOURNEY_ENDEAVOURS.map((e) => e.name.toLowerCase()));
    const downtimeNames = new Set<string>([
      ...GENERAL_ENDEAVOURS.map((n) => n.toLowerCase()),
      ...Object.values(CLASS_ENDEAVOURS).flat().map((n) => n.toLowerCase()),
    ]);
    for (const n of journeyNames) {
      expect(downtimeNames.has(n)).toBe(false);
    }
  });
});
