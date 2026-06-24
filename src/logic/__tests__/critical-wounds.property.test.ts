import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { lookupCriticalWound } from '../critical-wounds';
import type { HitLocation } from '../../components/combat/hitLocationTable';

const HIT_LOCATIONS: HitLocation[] = ['Head', 'Left Arm', 'Right Arm', 'Body', 'Left Leg', 'Right Leg'];

// Feature: critical-wound-tables, Property 3: Symmetric location mapping
// **Validates: Requirements 2.1, 2.2**

describe('Feature: critical-wound-tables, Property 3: Symmetric location mapping', () => {
  it('Left Arm and Right Arm return the same result', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (roll) => {
        expect(lookupCriticalWound('Left Arm', roll)).toEqual(lookupCriticalWound('Right Arm', roll));
      }),
      { numRuns: 100 }
    );
  });

  it('Left Leg and Right Leg return the same result', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (roll) => {
        expect(lookupCriticalWound('Left Leg', roll)).toEqual(lookupCriticalWound('Right Leg', roll));
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: critical-wound-tables, Property 4: Out-of-range rolls return undefined
// **Validates: Requirements 2.6**

describe('Feature: critical-wound-tables, Property 4: Out-of-range rolls return undefined', () => {
  const locationArb = fc.constantFrom(...HIT_LOCATIONS);

  it('rolls <= 0 return undefined', () => {
    fc.assert(
      fc.property(
        locationArb,
        fc.integer({ min: -1000, max: 0 }),
        (location, roll) => {
          expect(lookupCriticalWound(location, roll)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rolls > 100 return undefined', () => {
    fc.assert(
      fc.property(
        locationArb,
        fc.integer({ min: 101, max: 1000 }),
        (location, roll) => {
          expect(lookupCriticalWound(location, roll)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('non-integer floats in range return undefined', () => {
    fc.assert(
      fc.property(
        locationArb,
        fc.double({ min: 1.01, max: 99.99 }).filter(n => !Number.isInteger(n)),
        (location, roll) => {
          expect(lookupCriticalWound(location, roll)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});

import {
  HEAD_CRITICAL_TABLE,
  ARM_CRITICAL_TABLE,
  BODY_CRITICAL_TABLE,
  LEG_CRITICAL_TABLE,
} from '../../data/critical-wound-tables';

const ALL_TABLES = [HEAD_CRITICAL_TABLE, ARM_CRITICAL_TABLE, BODY_CRITICAL_TABLE, LEG_CRITICAL_TABLE];

// Feature: critical-wound-tables, Property 1: Entry structural validity
// **Validates: Requirements 1.2, 5.1**

describe('Feature: critical-wound-tables, Property 1: Entry structural validity', () => {
  it('all entries have valid min, max, name, effect, and severity fields', () => {
    const tableArb = fc.constantFrom(...ALL_TABLES);

    fc.assert(
      fc.property(tableArb, (table) => {
        const indexArb = fc.integer({ min: 0, max: table.length - 1 });
        fc.assert(
          fc.property(indexArb, (index) => {
            const entry = table[index];
            // min and max are positive integers with min <= max
            expect(Number.isInteger(entry.min)).toBe(true);
            expect(Number.isInteger(entry.max)).toBe(true);
            expect(entry.min).toBeGreaterThan(0);
            expect(entry.max).toBeGreaterThan(0);
            expect(entry.min).toBeLessThanOrEqual(entry.max);
            // name is non-empty
            expect(entry.name.length).toBeGreaterThan(0);
            // effect is non-empty
            expect(entry.effect.length).toBeGreaterThan(0);
            // severity is integer 1–5
            expect(Number.isInteger(entry.severity)).toBe(true);
            expect(entry.severity).toBeGreaterThanOrEqual(1);
            expect(entry.severity).toBeLessThanOrEqual(5);
          }),
          { numRuns: 100 }
        );
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: critical-wound-tables, Property 2: Lookup returns correct entry for all valid inputs
// **Validates: Requirements 1.3, 2.5**

describe('Feature: critical-wound-tables, Property 2: Lookup returns correct entry for all valid inputs', () => {
  it('lookup always returns a defined entry whose range contains the roll', () => {
    const locationArb = fc.constantFrom(...HIT_LOCATIONS);
    const rollArb = fc.integer({ min: 1, max: 100 });

    fc.assert(
      fc.property(locationArb, rollArb, (location, roll) => {
        const result = lookupCriticalWound(location, roll);
        expect(result).toBeDefined();
        expect(result!.min).toBeLessThanOrEqual(roll);
        expect(result!.max).toBeGreaterThanOrEqual(roll);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: critical-wound-tables, Property 5: Non-decreasing severity ordering
// **Validates: Requirements 5.4**

describe('Feature: critical-wound-tables, Property 5: Non-decreasing severity ordering', () => {
  it('severity values are non-decreasing for all consecutive entry pairs in each table', () => {
    for (const table of ALL_TABLES) {
      for (let i = 0; i < table.length - 1; i++) {
        expect(table[i].severity).toBeLessThanOrEqual(table[i + 1].severity);
      }
    }
  });
});
