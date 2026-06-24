import { describe, it, expect } from 'vitest';
import {
  HEAD_CRITICAL_TABLE,
  ARM_CRITICAL_TABLE,
  BODY_CRITICAL_TABLE,
  LEG_CRITICAL_TABLE,
} from '../critical-wound-tables';
import type { CriticalWoundTableEntry } from '../critical-wound-tables';

/**
 * Validates: Requirements 1.2, 1.3, 5.1, 5.4
 * Structural validation tests for critical wound tables
 */

function assertCriticalTableStructure(table: CriticalWoundTableEntry[], tableName: string) {
  it(`has at least 10 entries`, () => {
    expect(table.length).toBeGreaterThanOrEqual(10);
  });

  it(`first entry starts at min=1`, () => {
    expect(table[0].min).toBe(1);
  });

  it(`last entry ends at max=100`, () => {
    expect(table[table.length - 1].max).toBe(100);
  });

  it(`has no gaps between consecutive entries`, () => {
    for (let i = 1; i < table.length; i++) {
      expect(
        table[i].min,
        `${tableName} entry ${i}: expected min=${table[i - 1].max + 1}, got min=${table[i].min}`
      ).toBe(table[i - 1].max + 1);
    }
  });

  it(`has severity values that are integers between 1 and 5`, () => {
    for (const entry of table) {
      expect(
        Number.isInteger(entry.severity),
        `${tableName} entry min=${entry.min}: severity ${entry.severity} is not an integer`
      ).toBe(true);
      expect(
        entry.severity,
        `${tableName} entry min=${entry.min}: severity ${entry.severity} out of range`
      ).toBeGreaterThanOrEqual(1);
      expect(
        entry.severity,
        `${tableName} entry min=${entry.min}: severity ${entry.severity} out of range`
      ).toBeLessThanOrEqual(5);
    }
  });

  it(`has non-decreasing severity values`, () => {
    for (let i = 1; i < table.length; i++) {
      expect(
        table[i].severity,
        `${tableName} entry ${i}: severity ${table[i].severity} is less than previous ${table[i - 1].severity}`
      ).toBeGreaterThanOrEqual(table[i - 1].severity);
    }
  });

  it(`every entry has non-empty name and effect strings`, () => {
    for (const entry of table) {
      expect(entry.name.trim().length, `Entry min=${entry.min} has empty name`).toBeGreaterThan(0);
      expect(entry.effect.trim().length, `Entry min=${entry.min} has empty effect`).toBeGreaterThan(0);
    }
  });
}

describe('Head Critical Table', () => {
  assertCriticalTableStructure(HEAD_CRITICAL_TABLE, 'Head');
});

describe('Arm Critical Table', () => {
  assertCriticalTableStructure(ARM_CRITICAL_TABLE, 'Arm');
});

describe('Body Critical Table', () => {
  assertCriticalTableStructure(BODY_CRITICAL_TABLE, 'Body');
});

describe('Leg Critical Table', () => {
  assertCriticalTableStructure(LEG_CRITICAL_TABLE, 'Leg');
});
