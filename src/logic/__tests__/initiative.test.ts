import { describe, it, expect } from 'vitest';
import { sortByInitiative, nextTurn } from '../initiative';

// ─── sortByInitiative ────────────────────────────────────────────────────────
// Validates: Requirements 19.3

describe('sortByInitiative', () => {
  it('sorts combatants in descending order by initiative', () => {
    const combatants = [
      { id: '1', name: 'Slow', initiative: 20 },
      { id: '2', name: 'Fast', initiative: 60 },
      { id: '3', name: 'Mid', initiative: 40 },
    ];
    const sorted = sortByInitiative(combatants);
    expect(sorted.map(c => c.name)).toEqual(['Fast', 'Mid', 'Slow']);
  });

  it('maintains insertion order for equal initiatives (stable sort)', () => {
    const combatants = [
      { id: '1', name: 'Alpha', initiative: 40 },
      { id: '2', name: 'Beta', initiative: 40 },
      { id: '3', name: 'Gamma', initiative: 40 },
    ];
    const sorted = sortByInitiative(combatants);
    expect(sorted.map(c => c.name)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('does not mutate the original array', () => {
    const combatants = [
      { id: '1', name: 'A', initiative: 10 },
      { id: '2', name: 'B', initiative: 50 },
    ];
    const original = [...combatants];
    sortByInitiative(combatants);
    expect(combatants).toEqual(original);
  });

  it('returns empty array for empty input', () => {
    expect(sortByInitiative([])).toEqual([]);
  });

  it('handles a single combatant', () => {
    const combatants = [{ id: '1', name: 'Solo', initiative: 30 }];
    expect(sortByInitiative(combatants)).toEqual([{ id: '1', name: 'Solo', initiative: 30 }]);
  });
});

// ─── nextTurn ────────────────────────────────────────────────────────────────
// Validates: Requirements 19.5

describe('nextTurn', () => {
  it('advances index by 1', () => {
    expect(nextTurn(0, 4)).toBe(1);
    expect(nextTurn(1, 4)).toBe(2);
    expect(nextTurn(2, 4)).toBe(3);
  });

  it('wraps to 0 after last combatant', () => {
    expect(nextTurn(3, 4)).toBe(0);
  });

  it('wraps correctly for single combatant', () => {
    expect(nextTurn(0, 1)).toBe(0);
  });

  it('returns 0 for zero total combatants', () => {
    expect(nextTurn(0, 0)).toBe(0);
  });

  it('returns 0 for negative total combatants', () => {
    expect(nextTurn(2, -1)).toBe(0);
  });
});
