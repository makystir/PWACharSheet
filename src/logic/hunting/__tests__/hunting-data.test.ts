import { describe, it, expect } from 'vitest';
import {
  HUNTING_CONSIDERATIONS,
  A_FAST_BUCK,
  A_FAST_BUCK_FOOTNOTE,
  A_FAST_BUCK_ARTIFACT_NOTE,
  ANIMALS_AND_EQUIPMENT,
  HUNTERS_GARB_EFFECT,
  HUNTERS_GARB_EFFECT_SHORT,
  HOUND_TRAINING,
  HOUND_TRAITS,
  HAWK_TRAINING,
  HAWK_TRAITS,
} from '../hunting-data';

describe('Hunting Considerations — verbatim (Deft Steps p.124)', () => {
  it('pins all eight rows, printed terrain spellings, and difficulty bands', () => {
    expect(HUNTING_CONSIDERATIONS).toEqual([
      {
        game: 'Badger, Chicken, Grouse, Rabbit, Rat',
        terrain: ['Deep Forest', 'Hills', 'Light Woodland', 'Temperate Plains'],
        difficultyLabel: 'Challenging',
        difficultyModifier: 0,
      },
      {
        game: 'Beaver',
        terrain: ['Deep Forest', 'Light Woodland', 'Wetlands'],
        difficultyLabel: 'Challenging',
        difficultyModifier: 0,
      },
      {
        game: 'Mountain Goat',
        terrain: ['Hills', 'Mountains'],
        difficultyLabel: 'Difficult',
        difficultyModifier: -10,
      },
      {
        game: 'Wild Boar',
        terrain: ['Deep Forest', 'Light Woodland'],
        difficultyLabel: 'Difficult',
        difficultyModifier: -10,
      },
      {
        game: 'Wolf',
        terrain: ['Deep Forest', 'Hills', 'Light Woodland', 'Temperate Plains'],
        difficultyLabel: 'Difficult',
        difficultyModifier: -10,
      },
      {
        game: 'Bear',
        terrain: ['Any'],
        difficultyLabel: 'Hard',
        difficultyModifier: -20,
      },
      {
        game: 'Small Deer',
        terrain: ['Deep Forest', 'Hills', 'Light Woodland', 'Temperate Plains'],
        difficultyLabel: 'Hard',
        difficultyModifier: -20,
      },
      {
        game: 'Large Deer',
        terrain: ['Deep Forest', 'Hills', 'Light Woodland', 'Temperate Plains'],
        difficultyLabel: 'Very Hard',
        difficultyModifier: -30,
      },
    ]);
  });
});

describe('A Fast Buck — verbatim value table (Deft Steps p.131)', () => {
  it('pins all thirteen rows with the price column EXACTLY as printed', () => {
    expect(A_FAST_BUCK).toEqual([
      { item: 'Fish', daysOfFood: '1', otherUses: 'Oil', price: '3d' },
      { item: 'Rat', daysOfFood: '¼ *', otherUses: '—', price: '1d' },
      { item: 'Grouse', daysOfFood: '½', otherUses: 'Down', price: '3d' },
      { item: 'Chicken', daysOfFood: '1', otherUses: 'Down', price: '5d' },
      { item: 'Rabbit', daysOfFood: '1', otherUses: 'Hide, Charms', price: '6d' },
      { item: 'Beaver', daysOfFood: '1*', otherUses: 'Hide', price: '1/6' },
      { item: 'Badger', daysOfFood: '1*', otherUses: 'Hide', price: '1/2' },
      { item: 'Mountain Goat', daysOfFood: '15', otherUses: 'Horns, Hide', price: '5/-' },
      { item: 'Wild Boar', daysOfFood: '15', otherUses: 'Tusks', price: '4/-' },
      { item: 'Wolf', daysOfFood: '6*', otherUses: 'Hide', price: '15/-' },
      { item: 'Bear', daysOfFood: '20*', otherUses: 'Hide', price: '2GC' },
      { item: 'Small Deer', daysOfFood: '15', otherUses: 'Hide, Musk', price: '15/-' },
      { item: 'Large Deer', daysOfFood: '25', otherUses: 'Hide, Musk, Antlers', price: '1GC 10/-' },
    ]);
  });

  it('stores the Fish row Other-uses cell as the intended "Oil" (artifact handled)', () => {
    const fish = A_FAST_BUCK.find((r) => r.item === 'Fish');
    expect(fish?.otherUses).toBe('Oil');
  });

  it('pins the verbatim footnote', () => {
    expect(A_FAST_BUCK_FOOTNOTE).toContain('famine food');
    expect(A_FAST_BUCK_FOOTNOTE).toContain('no commercial value');
  });

  it('flags the "GAME Oil" transcription artifact so it cannot be silently dropped', () => {
    expect(A_FAST_BUCK_ARTIFACT_NOTE).toContain('GAME Oil');
  });
});

describe('Animals and Equipment — verbatim (Deft Steps p.132)', () => {
  it('pins all six rows', () => {
    expect(ANIMALS_AND_EQUIPMENT).toEqual([
      { item: "Hunter's Garb", cost: '15/-', enc: '2', availability: 'Rare' },
      { item: 'Hochland Lockhund', cost: '2GC', enc: '-', availability: 'Common' },
      { item: 'Nordlander Bamse', cost: '4GC', enc: '-', availability: 'Scarce' },
      { item: 'Grootscher Marsh Hound', cost: '5GC', enc: '-', availability: 'Scarce' },
      { item: 'Dove Hawk', cost: '10GC', enc: '1', availability: 'Rare' },
      { item: 'Arabyan Redhawk', cost: '25GC', enc: '1', availability: 'Exotic' },
    ]);
  });

  it("pins Hunter's Garb +2 SL effect text", () => {
    expect(HUNTERS_GARB_EFFECT).toContain('+2 SL');
    expect(HUNTERS_GARB_EFFECT).toContain('appropriate terrain');
    expect(HUNTERS_GARB_EFFECT_SHORT).toContain('+2 SL');
  });
});

describe('Hound & Hawk training difficulties — verbatim (Deft Steps p.133–134)', () => {
  it('pins hound training: 1 hour, Difficult (-10) Animal Training', () => {
    expect(HOUND_TRAINING).toEqual({
      firstTrait: 'Trained (Broken)',
      hours: 1,
      test: { label: 'Difficult', modifier: -10 },
    });
  });

  it('pins hawk training: 3 hours, Hard (-20) Animal Training', () => {
    expect(HAWK_TRAINING).toEqual({
      firstTrait: 'Trained (Broken)',
      hours: 3,
      test: { label: 'Hard', modifier: -20 },
    });
  });

  it('pins each hound trait training test (Point/Track = no test)', () => {
    const byName = Object.fromEntries(HOUND_TRAITS.map((t) => [t.name, t.trainingTest]));
    expect(byName.Dig).toEqual({ label: 'Average', modifier: 20 });
    expect(byName.Heel).toEqual({ label: 'Average', modifier: 20 });
    expect(byName.Hunt).toEqual({ label: 'Average', modifier: 20 });
    expect(byName.Round).toEqual({ label: 'Challenging', modifier: 0 });
    expect(byName.Point).toBeNull();
    expect(byName.Track).toBeNull();
  });

  it('pins each hawk trait training test (all no test listed)', () => {
    const byName = Object.fromEntries(HAWK_TRAITS.map((t) => [t.name, t.trainingTest]));
    expect(byName.Hunt).toBeNull();
    expect(byName.Circle).toBeNull();
    expect(byName.Return).toBeNull();
  });

  it('keeps hound Hunt and hawk Hunt resolution via Challenging (+0) Melee', () => {
    expect(HOUND_TRAITS.find((t) => t.name === 'Hunt')?.description).toContain('Challenging (+0) Melee Test');
    expect(HAWK_TRAITS.find((t) => t.name === 'Hunt')?.description).toContain('Challenging (+0) Melee Test');
  });

  it("keeps hawk Return as Charm Animal opposed by the hawk's WP", () => {
    expect(HAWK_TRAITS.find((t) => t.name === 'Return')?.description).toContain('Charm Animal Test opposed by the');
  });
});
