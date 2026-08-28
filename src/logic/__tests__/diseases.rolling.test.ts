import { describe, it, expect } from 'vitest';
import {
  parseDiceExpression,
  rollDiceExpression,
  rollDiseaseTiming,
  setDiseaseTiming,
  getSymptomTest,
  getLingeringDifficulty,
  symptomRollsHitLocation,
  getSymptomTestBaseTarget,
  getToughnessBonus,
  type ActiveDisease,
  type DieRoller,
} from '../diseases';
import { BLANK_CHARACTER } from '../../types/character';

// Deterministic roller: always returns `value` for any die.
const fixed = (value: number): DieRoller => () => value;
// Sequence roller: returns successive values from an array (cycling).
function seq(values: number[]): DieRoller {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('parseDiceExpression', () => {
  it('parses NdX', () => {
    expect(parseDiceExpression('1d10 days')).toEqual({ count: 1, sides: 10, modifier: 0 });
  });
  it('parses NdX+M', () => {
    expect(parseDiceExpression('3d10+10 days')).toEqual({ count: 3, sides: 10, modifier: 10 });
  });
  it('parses NdX-M', () => {
    expect(parseDiceExpression('2d6-1')).toEqual({ count: 2, sides: 6, modifier: -1 });
  });
  it('returns null when there is no dice term (Instant)', () => {
    expect(parseDiceExpression('Instant')).toBeNull();
  });
});

describe('rollDiceExpression', () => {
  it('rolls the correct number of dice and sums with modifier', () => {
    // 3d10+10 with every die = 4 → 12 + 10 = 22
    const r = rollDiceExpression('3d10+10', fixed(4))!;
    expect(r.rolls).toEqual([4, 4, 4]);
    expect(r.modifier).toBe(10);
    expect(r.total).toBe(22);
    expect(r.notation).toBe('3d10+10');
  });

  it('never returns a total below 0', () => {
    // 1d10-10 with die=1 → 1 - 10 = -9 → clamped to 0
    const r = rollDiceExpression('1d10-10', fixed(1))!;
    expect(r.total).toBe(0);
  });

  it('returns null for a non-dice string', () => {
    expect(rollDiceExpression('Instant')).toBeNull();
  });
});

describe('rollDiseaseTiming', () => {
  it('rolls a days timing and reports the unit + breakdown', () => {
    // Galloping Trots incubation: 1d10 hours, die=7
    const r = rollDiseaseTiming('1d10 hours', fixed(7))!;
    expect(r.unit).toBe('hours');
    expect(r.dice.total).toBe(7);
    expect(r.display).toBe('7 hours');
    expect(r.breakdown).toBe('1d10 → [7] = 7 hours');
  });

  it('handles multi-die + modifier (Ratte Fever duration 3d10+10)', () => {
    const r = rollDiseaseTiming('3d10+10 days', seq([2, 6, 9]))!;
    expect(r.dice.rolls).toEqual([2, 6, 9]);
    expect(r.dice.total).toBe(27);
    expect(r.display).toBe('27 days');
    expect(r.breakdown).toBe('3d10+10 → [2, 6, 9]+10 = 27 days');
  });

  it('returns null for "Instant" (Blood Rot incubation)', () => {
    expect(rollDiseaseTiming('Instant', fixed(5))).toBeNull();
  });

  it('rolls the leading dice term even when a conditional note follows', () => {
    // Festering Wound incubation: "1d10 days (instant if developed...)"
    const r = rollDiseaseTiming('1d10 days (instant if developed from another symptom)', fixed(3))!;
    expect(r.dice.total).toBe(3);
    expect(r.unit).toBe('days');
  });
});

describe('setDiseaseTiming', () => {
  const base: ActiveDisease[] = [
    { id: 1, diseaseName: 'Galloping Trots', contracted: 1000, notes: '' },
  ];

  it('persists a rolled duration without mutating the input', () => {
    const result = setDiseaseTiming(base, 1, 'rolledDuration', { total: 5, unit: 'days', breakdown: '1d10 → [5] = 5 days' });
    expect(result[0].rolledDuration).toEqual({ total: 5, unit: 'days', breakdown: '1d10 → [5] = 5 days' });
    expect(base[0].rolledDuration).toBeUndefined();
  });

  it('is a no-op for an unknown id', () => {
    const result = setDiseaseTiming(base, 99, 'rolledIncubation', { total: 1, unit: 'days', breakdown: 'x' });
    expect(result[0].rolledIncubation).toBeUndefined();
  });
});

describe('getSymptomTest (Core p.187-188)', () => {
  it('Blight is a daily Endurance Test scaling with severity', () => {
    expect(getSymptomTest('Blight', null)).toMatchObject({ skill: 'Endurance', difficulty: 'Very Easy' });
    expect(getSymptomTest('Blight', 'Moderate')).toMatchObject({ difficulty: 'Easy' });
    expect(getSymptomTest('Blight', 'Severe')).toMatchObject({ difficulty: 'Average' });
  });

  it('Gangrene is a daily Average Endurance Test', () => {
    expect(getSymptomTest('Gangrene', null)).toMatchObject({ skill: 'Endurance', difficulty: 'Average' });
  });

  it('Lingering uses the severity tag as its difficulty', () => {
    expect(getSymptomTest('Lingering', 'Challenging')).toMatchObject({ skill: 'Endurance', difficulty: 'Challenging' });
    expect(getSymptomTest('Lingering', 'Easy')).toMatchObject({ difficulty: 'Easy' });
  });

  it('Wounded is a daily Easy Endurance Test', () => {
    expect(getSymptomTest('Wounded', null)).toMatchObject({ skill: 'Endurance', difficulty: 'Easy' });
  });

  it('Pox is a Cool Test', () => {
    expect(getSymptomTest('Pox', null)).toMatchObject({ skill: 'Cool' });
  });

  it('symptoms without a self-contained roll return null', () => {
    for (const s of ['Convulsions', 'Coughs and Sneezes', 'Fever', 'Flux', 'Malaise', 'Nausea']) {
      expect(getSymptomTest(s, null)).toBeNull();
    }
  });
});

describe('getLingeringDifficulty', () => {
  it('maps known severities and defaults to Average', () => {
    expect(getLingeringDifficulty('Easy')).toBe('Easy');
    expect(getLingeringDifficulty('Challenging')).toBe('Challenging');
    expect(getLingeringDifficulty(null)).toBe('Average');
  });
});

describe('symptomRollsHitLocation', () => {
  it('is true only for Gangrene', () => {
    expect(symptomRollsHitLocation('Gangrene')).toBe(true);
    expect(symptomRollsHitLocation('Pox')).toBe(false);
  });
});

describe('getSymptomTestBaseTarget / getToughnessBonus', () => {
  it('Endurance target = Toughness total + Endurance advances', () => {
    const char = structuredClone(BLANK_CHARACTER);
    char.chars.T.i = 35; char.chars.T.a = 5; // T total 40
    char.bSkills = [{ n: 'Endurance', c: 'T', a: 12 }];
    expect(getSymptomTestBaseTarget(char, 'Endurance')).toBe(52);
    expect(getToughnessBonus(char)).toBe(4);
  });

  it('Cool target = Willpower total + Cool advances; 0 advances if skill absent', () => {
    const char = structuredClone(BLANK_CHARACTER);
    char.chars.WP.i = 30; // WP total 30
    char.bSkills = [];
    char.aSkills = [];
    expect(getSymptomTestBaseTarget(char, 'Cool')).toBe(30);
  });
});
