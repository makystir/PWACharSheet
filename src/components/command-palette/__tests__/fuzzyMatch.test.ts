import { describe, it, expect } from 'vitest';
import { fuzzyMatch } from '../fuzzyMatch';

describe('fuzzyMatch', () => {
  describe('basic matching', () => {
    it('returns null for empty query', () => {
      expect(fuzzyMatch('', 'fireball')).toBeNull();
    });

    it('returns null for whitespace-only query', () => {
      expect(fuzzyMatch('   ', 'fireball')).toBeNull();
    });

    it('returns null when no subsequence match exists', () => {
      expect(fuzzyMatch('xyz', 'fireball')).toBeNull();
    });

    it('matches exact text', () => {
      const result = fuzzyMatch('fireball', 'fireball');
      expect(result).not.toBeNull();
      expect(result!.score).toBeGreaterThan(0);
    });

    it('matches prefix of text', () => {
      const result = fuzzyMatch('fire', 'fireball');
      expect(result).not.toBeNull();
      expect(result!.score).toBeGreaterThan(0);
    });

    it('matches subsequence characters in order', () => {
      const result = fuzzyMatch('fbl', 'fireball');
      expect(result).not.toBeNull();
    });

    it('returns null when characters are out of order', () => {
      expect(fuzzyMatch('ife', 'fireball')).toBeNull();
    });
  });

  describe('scoring', () => {
    it('scores prefix matches higher than non-prefix', () => {
      const prefix = fuzzyMatch('fire', 'fireball');
      const nonPrefix = fuzzyMatch('ball', 'fireball');
      expect(prefix!.score).toBeGreaterThan(nonPrefix!.score);
    });

    it('scores word-boundary matches higher', () => {
      const wordBoundary = fuzzyMatch('of', 'lore of fire');
      const midWord = fuzzyMatch('of', 'scoffed');
      expect(wordBoundary!.score).toBeGreaterThan(midWord!.score);
    });

    it('scores consecutive matches higher than spread matches', () => {
      const consecutive = fuzzyMatch('fire', 'fireball magic');
      const spread = fuzzyMatch('fbmc', 'fireball magic');
      expect(consecutive!.score).toBeGreaterThan(spread!.score);
    });
  });

  describe('multi-token queries', () => {
    it('matches multi-word query across text', () => {
      const result = fuzzyMatch('lor fire', 'lore of fire');
      expect(result).not.toBeNull();
      expect(result!.score).toBeGreaterThan(0);
    });

    it('returns null if any token fails to match', () => {
      expect(fuzzyMatch('lor xyz', 'lore of fire')).toBeNull();
    });
  });

  describe('highlight ranges', () => {
    it('returns correct ranges for prefix match', () => {
      const result = fuzzyMatch('fire', 'fireball');
      expect(result).not.toBeNull();
      expect(result!.ranges).toEqual([[0, 3]]);
    });

    it('returns multiple ranges for non-consecutive matches', () => {
      const result = fuzzyMatch('fl', 'fireball');
      expect(result).not.toBeNull();
      // 'f' at index 0, 'l' at index 6 or 7
      expect(result!.ranges.length).toBeGreaterThanOrEqual(2);
    });

    it('merges consecutive positions into a single range', () => {
      const result = fuzzyMatch('ball', 'fireball');
      expect(result).not.toBeNull();
      expect(result!.ranges).toEqual([[4, 7]]);
    });
  });

  describe('edge cases', () => {
    it('truncates queries longer than 200 characters', () => {
      const longQuery = 'a'.repeat(250);
      const longText = 'a'.repeat(300);
      const result = fuzzyMatch(longQuery, longText);
      // Should still work - just truncated to 200 chars
      expect(result).not.toBeNull();
    });

    it('handles single character query', () => {
      const result = fuzzyMatch('f', 'fireball');
      expect(result).not.toBeNull();
      expect(result!.ranges).toEqual([[0, 0]]);
    });

    it('handles query longer than text (no match)', () => {
      expect(fuzzyMatch('fireball extended', 'fire')).toBeNull();
    });

    it('handles character omission (fieball matches fireball)', () => {
      // "fieball" = fireball minus the 'r' 
      const result = fuzzyMatch('fieball', 'fireball');
      expect(result).not.toBeNull();
    });
  });
});
