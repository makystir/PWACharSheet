import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateLearnedCants } from '../cants';
import { CANT_CATALOGUE } from '../../data/cants';
import type { CantEntry } from '../../data/cants';
import type { LearnedCant } from '../../types/character';

// Feature: alternative-channelling-cants, Property 17: Invalid entry filtering on load
// **Validates: Requirements 2.4, 2.5, 8.5**

/**
 * Generator for a valid LearnedCant entry (picks from the actual catalogue).
 */
const validLearnedCantArb: fc.Arbitrary<LearnedCant> = fc
  .constantFrom(...CANT_CATALOGUE)
  .map((cant: CantEntry) => ({ lore: cant.lore, cantName: cant.name }));

/**
 * Generator for an invalid LearnedCant entry.
 * Uses arbitrary strings that are guaranteed not to match any catalogue entry.
 * We prefix with "INVALID_" to ensure no collision with real catalogue names.
 */
const invalidLearnedCantArb: fc.Arbitrary<LearnedCant> = fc.record({
  lore: fc.string({ minLength: 1, maxLength: 20 }).map(s => `INVALID_Lore_${s}`),
  cantName: fc.string({ minLength: 1, maxLength: 20 }).map(s => `INVALID_Cant_${s}`),
});

/**
 * Generator for a mixed array of valid and invalid LearnedCant entries.
 * Each element is tagged so we can verify filtering correctness.
 */
const mixedLearnedCantsArb: fc.Arbitrary<{ entries: LearnedCant[]; validIndices: number[] }> = fc
  .array(
    fc.oneof(
      { weight: 1, arbitrary: validLearnedCantArb.map(lc => ({ entry: lc, isValid: true })) },
      { weight: 1, arbitrary: invalidLearnedCantArb.map(lc => ({ entry: lc, isValid: false })) }
    ),
    { minLength: 0, maxLength: 20 }
  )
  .map(tagged => {
    const entries = tagged.map(t => t.entry);
    const validIndices = tagged
      .map((t, i) => (t.isValid ? i : -1))
      .filter(i => i >= 0);
    return { entries, validIndices };
  });

describe('Property 17: Invalid entry filtering on load', () => {
  it('validateLearnedCants returns only valid entries in original order', () => {
    fc.assert(
      fc.property(mixedLearnedCantsArb, ({ entries, validIndices }) => {
        const result = validateLearnedCants(entries, [...CANT_CATALOGUE]);

        // Result should contain exactly the valid entries
        expect(result).toHaveLength(validIndices.length);

        // Each returned entry should correspond to the valid entries in original order
        for (let i = 0; i < result.length; i++) {
          const originalIndex = validIndices[i];
          expect(result[i]).toEqual(entries[originalIndex]);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('all returned entries exist in the catalogue', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(validLearnedCantArb, invalidLearnedCantArb),
          { minLength: 1, maxLength: 20 }
        ),
        (learnedCants: LearnedCant[]) => {
          const result = validateLearnedCants(learnedCants, [...CANT_CATALOGUE]);

          // Build valid key set for verification
          const validKeys = new Set(
            CANT_CATALOGUE.map(c => `${c.lore}|${c.name}`)
          );

          for (const lc of result) {
            expect(validKeys.has(`${lc.lore}|${lc.cantName}`)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('result length is always <= input length', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(validLearnedCantArb, invalidLearnedCantArb),
          { minLength: 0, maxLength: 30 }
        ),
        (learnedCants: LearnedCant[]) => {
          const result = validateLearnedCants(learnedCants, [...CANT_CATALOGUE]);
          expect(result.length).toBeLessThanOrEqual(learnedCants.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('purely valid arrays are returned unchanged', () => {
    fc.assert(
      fc.property(
        fc.array(validLearnedCantArb, { minLength: 0, maxLength: 10 }),
        (learnedCants: LearnedCant[]) => {
          const result = validateLearnedCants(learnedCants, [...CANT_CATALOGUE]);
          expect(result).toEqual(learnedCants);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('purely invalid arrays produce an empty result', () => {
    fc.assert(
      fc.property(
        fc.array(invalidLearnedCantArb, { minLength: 1, maxLength: 10 }),
        (learnedCants: LearnedCant[]) => {
          const result = validateLearnedCants(learnedCants, [...CANT_CATALOGUE]);
          expect(result).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
