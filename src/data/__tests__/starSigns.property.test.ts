import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { STAR_SIGNS } from '../starSigns';

/**
 * Feature: archives-vol2-integration
 * Property 4: Star sign entries have valid modifier structure
 *
 * Validates: Requirements 10.2, 10.3
 *
 * For any star sign entry in STAR_SIGNS, if the entry type is 'characteristics' then it SHALL have
 * exactly 2 bonus entries of +2 and exactly 1 penalty entry of −3; if the entry type is 'talent'
 * then it SHALL have a non-empty talent name and exactly 1 penalty entry of −3.
 */
describe('Feature: archives-vol2-integration, Property 4: Star sign entries have valid modifier structure', () => {
  it('all star sign entries satisfy their type-specific structural invariants', () => {
    expect(STAR_SIGNS.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(
        fc.constantFrom(...STAR_SIGNS),
        (entry) => {
          // Every entry must have a non-empty name
          expect(entry.name.length).toBeGreaterThan(0);

          // Every entry must have a penalty of exactly -3
          expect(entry.penalty).toBeDefined();
          expect(entry.penalty.value).toBe(-3);

          if (entry.type === 'characteristics') {
            // Characteristics type: exactly 2 bonus entries, each with value +2
            expect(entry.bonuses).toBeDefined();
            expect(entry.bonuses!.length).toBe(2);
            expect(entry.bonuses![0].value).toBe(2);
            expect(entry.bonuses![1].value).toBe(2);
          } else if (entry.type === 'talent') {
            // Talent type: non-empty talent name, no bonuses required
            expect(entry.talent).toBeDefined();
            expect(entry.talent!.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
