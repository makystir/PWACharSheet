import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getCantsForLore } from '../cants';
import { CANT_CATALOGUE, COLOUR_LORES } from '../../data/cants';
import type { CantEntry } from '../../data/cants';

// Feature: alternative-channelling-cants, Property 14: Catalogue lookup correctness
// **Validates: Requirements 6.11**

describe('Property 14: Catalogue lookup correctness', () => {
  it('for any valid {lore, cantName} pair, getCantsForLore returns a matching entry with correct id, slCost, and effect', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CANT_CATALOGUE),
        (cant: CantEntry) => {
          const result = getCantsForLore(cant.lore, [...CANT_CATALOGUE]);

          // The result should contain the picked Cant
          const match = result.find(c => c.name === cant.name);
          expect(match).toBeDefined();
          expect(match!.id).toBe(cant.id);
          expect(match!.slCost).toBe(cant.slCost);
          expect(match!.effect).toBe(cant.effect);
          expect(match!.lore).toBe(cant.lore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('exactly 3 entries are returned for any valid Lore', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...COLOUR_LORES),
        (lore: string) => {
          const result = getCantsForLore(lore, [...CANT_CATALOGUE]);
          expect(result).toHaveLength(3);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('entries for a non-existent Lore return empty array', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).filter(
          s => !(COLOUR_LORES as readonly string[]).includes(s)
        ),
        (fakeLore: string) => {
          const result = getCantsForLore(fakeLore, [...CANT_CATALOGUE]);
          expect(result).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all returned entries belong to the queried Lore', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...COLOUR_LORES),
        (lore: string) => {
          const result = getCantsForLore(lore, [...CANT_CATALOGUE]);
          for (const entry of result) {
            expect(entry.lore).toBe(lore);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('each returned entry has a unique id within the Lore group', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...COLOUR_LORES),
        (lore: string) => {
          const result = getCantsForLore(lore, [...CANT_CATALOGUE]);
          const ids = result.map(c => c.id);
          expect(new Set(ids).size).toBe(ids.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
