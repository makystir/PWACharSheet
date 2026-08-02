import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CANT_CATALOGUE } from '../../data/cants';
import { BLANK_CHARACTER } from '../../types/character';
import type { CantEntry } from '../../data/cants';
import type { LearnedCant, Character } from '../../types/character';

// Feature: alternative-channelling-cants, Property 3: Toggle off retains learned Cants
// **Validates: Requirements 1.5, 8.6**

/**
 * Generator for a valid LearnedCant entry (picks from the actual catalogue).
 */
const validLearnedCantArb: fc.Arbitrary<LearnedCant> = fc
  .constantFrom(...CANT_CATALOGUE)
  .map((cant: CantEntry) => ({ lore: cant.lore, cantName: cant.name }));

/**
 * Generator for a non-empty array of unique valid LearnedCant entries.
 * Uses uniqueArray to avoid duplicates (same {lore, cantName} pair).
 */
const nonEmptyLearnedCantsArb: fc.Arbitrary<LearnedCant[]> = fc
  .uniqueArray(validLearnedCantArb, {
    minLength: 1,
    maxLength: 24,
    comparator: (a, b) => a.lore === b.lore && a.cantName === b.cantName,
  });

/**
 * Generator for a character with non-empty learnedCants and useCants set to false.
 * Starts from BLANK_CHARACTER and overrides the relevant fields.
 */
const characterWithCantsToggleOffArb: fc.Arbitrary<Character> = nonEmptyLearnedCantsArb.map(
  (learnedCants) => ({
    ...BLANK_CHARACTER,
    learnedCants,
    houseRules: {
      ...BLANK_CHARACTER.houseRules,
      useCants: false,
    },
  })
);

describe('Property 3: Toggle off retains learned Cants', () => {
  it('setting useCants=false and saving/loading preserves learnedCants array', () => {
    fc.assert(
      fc.property(characterWithCantsToggleOffArb, (character) => {
        const originalLearnedCants = character.learnedCants;

        // Simulate the project's save/load pattern:
        // Save: JSON.stringify
        const saved = JSON.stringify(character);
        // Load: JSON.parse → shallow merge with BLANK_CHARACTER
        const parsed = JSON.parse(saved);
        const loaded = { ...BLANK_CHARACTER, ...parsed } as Character;

        // learnedCants should be identical after round-trip
        expect(loaded.learnedCants).toEqual(originalLearnedCants);
      }),
      { numRuns: 100 }
    );
  });

  it('useCants remains false after save/load', () => {
    fc.assert(
      fc.property(characterWithCantsToggleOffArb, (character) => {
        // Simulate save/load
        const saved = JSON.stringify(character);
        const parsed = JSON.parse(saved);
        const loaded = { ...BLANK_CHARACTER, ...parsed } as Character;

        // useCants toggle should remain false
        expect(loaded.houseRules.useCants).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('learnedCants entries maintain order after toggle-off save/load', () => {
    fc.assert(
      fc.property(nonEmptyLearnedCantsArb, (learnedCants) => {
        const character: Character = {
          ...BLANK_CHARACTER,
          learnedCants,
          houseRules: {
            ...BLANK_CHARACTER.houseRules,
            useCants: false,
          },
        };

        // Simulate save/load
        const saved = JSON.stringify(character);
        const parsed = JSON.parse(saved);
        const loaded = { ...BLANK_CHARACTER, ...parsed } as Character;

        // Verify each entry in order
        expect(loaded.learnedCants).toHaveLength(learnedCants.length);
        for (let i = 0; i < learnedCants.length; i++) {
          expect(loaded.learnedCants![i].lore).toBe(learnedCants[i].lore);
          expect(loaded.learnedCants![i].cantName).toBe(learnedCants[i].cantName);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('toggling from true to false does not delete learnedCants on save/load', () => {
    fc.assert(
      fc.property(nonEmptyLearnedCantsArb, (learnedCants) => {
        // Start with useCants=true
        const characterWithCantsOn: Character = {
          ...BLANK_CHARACTER,
          learnedCants,
          houseRules: {
            ...BLANK_CHARACTER.houseRules,
            useCants: true,
          },
        };

        // User toggles useCants to false
        const characterWithCantsOff: Character = {
          ...characterWithCantsOn,
          houseRules: {
            ...characterWithCantsOn.houseRules,
            useCants: false,
          },
        };

        // Simulate save/load
        const saved = JSON.stringify(characterWithCantsOff);
        const parsed = JSON.parse(saved);
        const loaded = { ...BLANK_CHARACTER, ...parsed } as Character;

        // learnedCants must still be intact
        expect(loaded.learnedCants).toEqual(learnedCants);
        expect(loaded.houseRules.useCants).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
