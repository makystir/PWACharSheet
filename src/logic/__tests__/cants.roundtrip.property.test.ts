import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CANT_CATALOGUE } from '../../data/cants';
import type { CantEntry } from '../../data/cants';
import type { LearnedCant } from '../../types/character';

// Feature: alternative-channelling-cants, Property 16: learnedCants serialization round-trip
// **Validates: Requirements 8.1, 8.3, 8.4**

/**
 * Generator for a valid learnedCants array:
 * - Each entry is derived from the catalogue (lore + cantName)
 * - No duplicate entries
 * - Length ≤ 24 (catalogue has exactly 24 entries, so any subset is valid)
 */
const validLearnedCantsArb: fc.Arbitrary<LearnedCant[]> = fc
  .shuffledSubarray([...CANT_CATALOGUE], { minLength: 0, maxLength: 24 })
  .map((cants: CantEntry[]) =>
    cants.map(cant => ({ lore: cant.lore, cantName: cant.name }))
  );

describe('Property 16: learnedCants serialization round-trip', () => {
  it('serialising to JSON and deserialising produces identical entries in same order', () => {
    fc.assert(
      fc.property(validLearnedCantsArb, (learnedCants: LearnedCant[]) => {
        // Serialize to JSON
        const serialized = JSON.stringify(learnedCants);

        // Deserialize from JSON
        const deserialized: LearnedCant[] = JSON.parse(serialized);

        // Assert identical entries in same order
        expect(deserialized).toEqual(learnedCants);
        expect(deserialized).toHaveLength(learnedCants.length);

        // Verify each entry matches exactly
        for (let i = 0; i < learnedCants.length; i++) {
          expect(deserialized[i].lore).toBe(learnedCants[i].lore);
          expect(deserialized[i].cantName).toBe(learnedCants[i].cantName);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('round-trip preserves array length', () => {
    fc.assert(
      fc.property(validLearnedCantsArb, (learnedCants: LearnedCant[]) => {
        const deserialized: LearnedCant[] = JSON.parse(JSON.stringify(learnedCants));
        expect(deserialized).toHaveLength(learnedCants.length);
      }),
      { numRuns: 100 }
    );
  });

  it('round-trip preserves entry ordering (no reordering on deserialization)', () => {
    fc.assert(
      fc.property(validLearnedCantsArb, (learnedCants: LearnedCant[]) => {
        const deserialized: LearnedCant[] = JSON.parse(JSON.stringify(learnedCants));

        // Order must be preserved — check sequential equality
        for (let i = 0; i < learnedCants.length; i++) {
          expect(deserialized[i]).toStrictEqual(learnedCants[i]);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('generated arrays have no duplicates and length ≤ 24', () => {
    fc.assert(
      fc.property(validLearnedCantsArb, (learnedCants: LearnedCant[]) => {
        // Verify length constraint
        expect(learnedCants.length).toBeLessThanOrEqual(24);

        // Verify no duplicates
        const keys = learnedCants.map(lc => `${lc.lore}|${lc.cantName}`);
        const uniqueKeys = new Set(keys);
        expect(uniqueKeys.size).toBe(learnedCants.length);
      }),
      { numRuns: 100 }
    );
  });

  it('all entries in generated arrays reference valid catalogue entries', () => {
    fc.assert(
      fc.property(validLearnedCantsArb, (learnedCants: LearnedCant[]) => {
        const validKeys = new Set(
          CANT_CATALOGUE.map(c => `${c.lore}|${c.name}`)
        );

        for (const lc of learnedCants) {
          expect(validKeys.has(`${lc.lore}|${lc.cantName}`)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});
