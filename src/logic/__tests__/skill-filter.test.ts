import { describe, it, expect } from 'vitest';
import { filterSkills } from '../skill-filter';

const sampleSkills = [
  { n: 'Athletics', a: 5 },
  { n: 'Charm', a: 0 },
  { n: 'Cool', a: 3 },
  { n: 'Dodge', a: 10 },
  { n: 'Melee (Basic)', a: 0 },
  { n: 'Perception', a: 2 },
  { n: 'Stealth (Urban)', a: 0 },
  { n: 'Lore (Medicine)', a: 1 },
];

// ─── Text filter (case-insensitive substring) ────────────────────────────────
// Validates: Requirements 22.2

describe('filterSkills — text search filter', () => {
  it('returns all skills when searchText is empty', () => {
    const result = filterSkills(sampleSkills, { searchText: '', trainedOnly: false });
    expect(result).toEqual(sampleSkills);
  });

  it('filters by exact name match (case-insensitive)', () => {
    const result = filterSkills(sampleSkills, { searchText: 'cool', trainedOnly: false });
    expect(result).toEqual([{ n: 'Cool', a: 3 }]);
  });

  it('filters by substring match', () => {
    const result = filterSkills(sampleSkills, { searchText: 'le', trainedOnly: false });
    // 'le' appears in Ath-le-tics, Me-le-e (Basic)
    expect(result).toEqual([
      { n: 'Athletics', a: 5 },
      { n: 'Melee (Basic)', a: 0 },
    ]);
  });

  it('is case-insensitive', () => {
    const result = filterSkills(sampleSkills, { searchText: 'DODGE', trainedOnly: false });
    expect(result).toEqual([{ n: 'Dodge', a: 10 }]);
  });

  it('returns empty array when no skills match search text', () => {
    const result = filterSkills(sampleSkills, { searchText: 'xyz', trainedOnly: false });
    expect(result).toEqual([]);
  });

  it('matches parenthesized specializations', () => {
    const result = filterSkills(sampleSkills, { searchText: 'basic', trainedOnly: false });
    expect(result).toEqual([{ n: 'Melee (Basic)', a: 0 }]);
  });
});

// ─── Trained-only toggle (advances > 0) ─────────────────────────────────────
// Validates: Requirements 22.3

describe('filterSkills — trained-only toggle', () => {
  it('returns only skills with advances > 0 when trainedOnly is true', () => {
    const result = filterSkills(sampleSkills, { searchText: '', trainedOnly: true });
    expect(result).toEqual([
      { n: 'Athletics', a: 5 },
      { n: 'Cool', a: 3 },
      { n: 'Dodge', a: 10 },
      { n: 'Perception', a: 2 },
      { n: 'Lore (Medicine)', a: 1 },
    ]);
  });

  it('excludes skills with exactly 0 advances', () => {
    const result = filterSkills(sampleSkills, { searchText: '', trainedOnly: true });
    const names = result.map((s) => s.n);
    expect(names).not.toContain('Charm');
    expect(names).not.toContain('Melee (Basic)');
    expect(names).not.toContain('Stealth (Urban)');
  });

  it('returns all skills when trainedOnly is false', () => {
    const result = filterSkills(sampleSkills, { searchText: '', trainedOnly: false });
    expect(result).toEqual(sampleSkills);
  });
});

// ─── Combined filters (intersection) ────────────────────────────────────────
// Validates: Requirements 22.4, 22.5

describe('filterSkills — combined text + trained-only (intersection)', () => {
  it('applies both filters as intersection', () => {
    const result = filterSkills(sampleSkills, { searchText: 'l', trainedOnly: true });
    // Skills containing 'l' AND trained: Athletics(5), Cool(3), Lore (Medicine)(1)
    expect(result).toEqual([
      { n: 'Athletics', a: 5 },
      { n: 'Cool', a: 3 },
      { n: 'Lore (Medicine)', a: 1 },
    ]);
  });

  it('returns empty when text matches but no trained skills match', () => {
    const result = filterSkills(sampleSkills, { searchText: 'stealth', trainedOnly: true });
    expect(result).toEqual([]);
  });

  it('returns empty when trained matches but no text matches', () => {
    const result = filterSkills(sampleSkills, { searchText: 'xyz', trainedOnly: true });
    expect(result).toEqual([]);
  });
});

// ─── Edge cases ──────────────────────────────────────────────────────────────

describe('filterSkills — edge cases', () => {
  it('handles empty skills array', () => {
    const result = filterSkills([], { searchText: 'test', trainedOnly: true });
    expect(result).toEqual([]);
  });

  it('does not mutate the original array', () => {
    const original = [...sampleSkills];
    filterSkills(sampleSkills, { searchText: 'cool', trainedOnly: true });
    expect(sampleSkills).toEqual(original);
  });
});
