import { describe, it, expect } from 'vitest';
import { decrementConditionDurations } from '../condition-duration';
import type { Condition } from '../../types/character';

describe('decrementConditionDurations', () => {
  it('decrements positive integer durations by 1', () => {
    const conditions: Condition[] = [
      { name: 'Bleeding', level: 1, duration: '3' },
      { name: 'Stunned', level: 2, duration: '5' },
    ];

    const result = decrementConditionDurations(conditions);

    expect(result.conditions[0].duration).toBe('2');
    expect(result.conditions[1].duration).toBe('4');
    expect(result.expiredNames).toEqual([]);
  });

  it('reports expired names when duration reaches 0', () => {
    const conditions: Condition[] = [
      { name: 'Blinded', level: 1, duration: '1' },
      { name: 'Stunned', level: 1, duration: '3' },
    ];

    const result = decrementConditionDurations(conditions);

    expect(result.conditions[0].duration).toBe('0');
    expect(result.conditions[1].duration).toBe('2');
    expect(result.expiredNames).toEqual(['Blinded']);
  });

  it('leaves conditions with no duration unchanged', () => {
    const conditions: Condition[] = [
      { name: 'Prone', level: 1 },
      { name: 'Bleeding', level: 2 },
    ];

    const result = decrementConditionDurations(conditions);

    expect(result.conditions).toEqual(conditions);
    expect(result.expiredNames).toEqual([]);
  });

  it('leaves conditions with non-numeric duration unchanged', () => {
    const conditions: Condition[] = [
      { name: 'Poisoned', level: 1, duration: 'until rest' },
      { name: 'Ablaze', level: 1, duration: 'permanent' },
    ];

    const result = decrementConditionDurations(conditions);

    expect(result.conditions).toEqual(conditions);
    expect(result.expiredNames).toEqual([]);
  });

  it('leaves conditions with zero duration unchanged', () => {
    const conditions: Condition[] = [
      { name: 'Stunned', level: 1, duration: '0' },
    ];

    const result = decrementConditionDurations(conditions);

    expect(result.conditions[0].duration).toBe('0');
    expect(result.expiredNames).toEqual([]);
  });

  it('leaves conditions with negative duration unchanged', () => {
    const conditions: Condition[] = [
      { name: 'Broken', level: 1, duration: '-2' },
    ];

    const result = decrementConditionDurations(conditions);

    expect(result.conditions[0].duration).toBe('-2');
    expect(result.expiredNames).toEqual([]);
  });

  it('leaves conditions with empty string duration unchanged', () => {
    const conditions: Condition[] = [
      { name: 'Deafened', level: 1, duration: '' },
    ];

    const result = decrementConditionDurations(conditions);

    expect(result.conditions[0].duration).toBe('');
    expect(result.expiredNames).toEqual([]);
  });

  it('handles mixed conditions correctly', () => {
    const conditions: Condition[] = [
      { name: 'Bleeding', level: 2, duration: '1' },   // will expire
      { name: 'Prone', level: 1 },                     // no duration
      { name: 'Stunned', level: 1, duration: '4' },    // will decrement
      { name: 'Ablaze', level: 1, duration: 'fire' },  // non-numeric
      { name: 'Broken', level: 1, duration: '0' },     // zero, unchanged
    ];

    const result = decrementConditionDurations(conditions);

    expect(result.conditions[0].duration).toBe('0');
    expect(result.conditions[1].duration).toBeUndefined();
    expect(result.conditions[2].duration).toBe('3');
    expect(result.conditions[3].duration).toBe('fire');
    expect(result.conditions[4].duration).toBe('0');
    expect(result.expiredNames).toEqual(['Bleeding']);
  });

  it('returns empty arrays for empty input', () => {
    const result = decrementConditionDurations([]);

    expect(result.conditions).toEqual([]);
    expect(result.expiredNames).toEqual([]);
  });

  it('reports multiple expired names', () => {
    const conditions: Condition[] = [
      { name: 'Bleeding', level: 1, duration: '1' },
      { name: 'Stunned', level: 1, duration: '1' },
      { name: 'Blinded', level: 1, duration: '1' },
    ];

    const result = decrementConditionDurations(conditions);

    expect(result.expiredNames).toEqual(['Bleeding', 'Stunned', 'Blinded']);
    expect(result.conditions.every(c => c.duration === '0')).toBe(true);
  });

  it('leaves float-like duration strings unchanged', () => {
    const conditions: Condition[] = [
      { name: 'Poisoned', level: 1, duration: '2.5' },
    ];

    const result = decrementConditionDurations(conditions);

    expect(result.conditions[0].duration).toBe('2.5');
    expect(result.expiredNames).toEqual([]);
  });
});
