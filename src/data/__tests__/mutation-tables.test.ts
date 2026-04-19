import { describe, it, expect } from 'vitest';
import {
  PHYSICAL_MUTATION_TABLE,
  MENTAL_MUTATION_TABLE,
} from '../mutation-tables';
import type { MutationTableEntry } from '../mutation-tables';

/**
 * Validates: Requirements 5.3, 5.4
 * Property 3: Mutation table lookup covers full d100 range
 */

function assertTableCoversD100(table: MutationTableEntry[], tableName: string) {
  it(`has exactly 20 entries`, () => {
    expect(table).toHaveLength(20);
  });

  it(`first entry starts at min=1`, () => {
    expect(table[0].min).toBe(1);
  });

  it(`last entry ends at max=100`, () => {
    expect(table[table.length - 1].max).toBe(100);
  });

  it(`has no gaps between entries`, () => {
    for (let i = 1; i < table.length; i++) {
      expect(
        table[i].min,
        `${tableName} entry ${i}: expected min=${table[i - 1].max + 1}, got min=${table[i].min}`
      ).toBe(table[i - 1].max + 1);
    }
  });

  it(`every entry has non-empty name and effect strings`, () => {
    for (const entry of table) {
      expect(entry.name.trim().length, `Entry min=${entry.min} has empty name`).toBeGreaterThan(0);
      expect(entry.effect.trim().length, `Entry min=${entry.min} has empty effect`).toBeGreaterThan(0);
    }
  });
}

describe('Physical Mutation Table', () => {
  assertTableCoversD100(PHYSICAL_MUTATION_TABLE, 'Physical');
});

describe('Mental Mutation Table', () => {
  assertTableCoversD100(MENTAL_MUTATION_TABLE, 'Mental');
});
