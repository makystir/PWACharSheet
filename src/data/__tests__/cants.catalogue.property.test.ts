import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CANT_CATALOGUE, COLOUR_LORES } from '../cants';
import type { CantEntry } from '../cants';

// Feature: alternative-channelling-cants, Property 13: Catalogue structural integrity
// **Validates: Requirements 6.1, 6.2**

describe('Property 13: Catalogue structural integrity', () => {
  it('catalogue contains exactly 24 entries', () => {
    expect(CANT_CATALOGUE).toHaveLength(24);
  });

  it('each Lore has exactly 3 Cants', () => {
    for (const lore of COLOUR_LORES) {
      const entries = CANT_CATALOGUE.filter(c => c.lore === lore);
      expect(entries).toHaveLength(3);
    }
  });

  it('every entry has non-empty id, name, effect and slCost in {1,2,3}', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CANT_CATALOGUE),
        (cant: CantEntry) => {
          expect(cant.id).toBeTruthy();
          expect(cant.id.length).toBeGreaterThan(0);
          expect(cant.name).toBeTruthy();
          expect(cant.name.length).toBeGreaterThan(0);
          expect(cant.effect).toBeTruthy();
          expect(cant.effect.length).toBeGreaterThan(0);
          expect([1, 2, 3]).toContain(cant.slCost);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('every entry has a lore matching one of the 8 colour lore strings', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CANT_CATALOGUE),
        (cant: CantEntry) => {
          expect(COLOUR_LORES).toContain(cant.lore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('each Lore has exactly one 1-SL, one 2-SL, and one 3-SL Cant', () => {
    for (const lore of COLOUR_LORES) {
      const entries = CANT_CATALOGUE.filter(c => c.lore === lore);
      const costs = entries.map(c => c.slCost).sort();
      expect(costs).toEqual([1, 2, 3]);
    }
  });

  it('all ids are unique', () => {
    const ids = CANT_CATALOGUE.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
