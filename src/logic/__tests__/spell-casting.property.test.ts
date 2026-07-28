import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeOvercastDamagePreview, OVERCAST_TABLE } from '../spell-casting';

// Feature: app-quality-improvements, Property 6: Overcast damage preview correctness
// **Validates: Requirements 7.2, 7.3, 7.4**

/**
 * Helper: independently compute the expected bonus from the OVERCAST_TABLE
 * by finding the highest row where damageAllocation >= row.sl.
 */
function expectedBonus(damageAllocation: number): number {
  if (damageAllocation <= 0) return 0;
  let bonus = 0;
  for (const row of OVERCAST_TABLE) {
    if (damageAllocation >= row.sl) {
      bonus = row.damage;
    } else {
      break;
    }
  }
  return bonus;
}

describe('Property 6: Overcast damage preview correctness', () => {
  it('total equals base + bonus from highest matching OVERCAST_TABLE row', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 20 }),
        (baseDamage, damageAllocation) => {
          const result = computeOvercastDamagePreview(baseDamage, damageAllocation);

          // result.base must equal the input baseDamage
          expect(result.base).toBe(baseDamage);

          // result.bonus must match the expected bonus from the table
          const expected = expectedBonus(damageAllocation);
          expect(result.bonus).toBe(expected);

          // result.total must equal base + bonus
          expect(result.total).toBe(result.base + result.bonus);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('result contains both base and total values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 20 }),
        (baseDamage, damageAllocation) => {
          const result = computeOvercastDamagePreview(baseDamage, damageAllocation);

          // The result object must have base, bonus, and total properties
          expect(result).toHaveProperty('base');
          expect(result).toHaveProperty('bonus');
          expect(result).toHaveProperty('total');

          // base and total must be numbers
          expect(typeof result.base).toBe('number');
          expect(typeof result.total).toBe('number');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('zero allocation produces zero bonus and total equals base', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (baseDamage) => {
          const result = computeOvercastDamagePreview(baseDamage, 0);

          expect(result.base).toBe(baseDamage);
          expect(result.bonus).toBe(0);
          expect(result.total).toBe(baseDamage);
        }
      ),
      { numRuns: 100 }
    );
  });
});
