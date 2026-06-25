import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { CharacterSummary } from '../../../types/character';

// Feature: ux-improvements, Property 1: Character list sorted by last modified descending
// **Validates: Requirements 1.3**

/**
 * The sorting logic used by CharacterManagementSheet:
 * [...characters].sort((a, b) => b.lastModified - a.lastModified)
 *
 * We test this as a pure function without rendering the component.
 */
function sortCharactersByLastModified(characters: CharacterSummary[]): CharacterSummary[] {
  return [...characters].sort((a, b) => b.lastModified - a.lastModified);
}

/**
 * Arbitrary for generating a CharacterSummary with arbitrary lastModified timestamps.
 */
const characterSummaryArb: fc.Arbitrary<CharacterSummary> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  species: fc.constantFrom('Human', 'Dwarf', 'Elf', 'Halfling'),
  career: fc.constantFrom('Soldier', 'Wizard', 'Thief', 'Priest', 'Noble', 'Ranger'),
  careerLevel: fc.constantFrom('Level 1', 'Level 2', 'Level 3', 'Level 4'),
  lastModified: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
});

describe('Property 1: Character list sorted by last modified descending', () => {
  it('for any array of character summaries, the result is in descending order by lastModified', () => {
    fc.assert(
      fc.property(
        fc.array(characterSummaryArb, { minLength: 0, maxLength: 50 }),
        (characters) => {
          const sorted = sortCharactersByLastModified(characters);

          // Verify descending order: each element's lastModified >= next element's lastModified
          for (let i = 0; i < sorted.length - 1; i++) {
            expect(sorted[i].lastModified).toBeGreaterThanOrEqual(sorted[i + 1].lastModified);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sorting preserves all original elements (no items lost or added)', () => {
    fc.assert(
      fc.property(
        fc.array(characterSummaryArb, { minLength: 0, maxLength: 50 }),
        (characters) => {
          const sorted = sortCharactersByLastModified(characters);

          // Same length
          expect(sorted).toHaveLength(characters.length);

          // Same elements (by id) — every character in the input is in the output
          const inputIds = characters.map((c) => c.id).sort();
          const outputIds = sorted.map((c) => c.id).sort();
          expect(outputIds).toEqual(inputIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sorting is idempotent — sorting an already-sorted list produces the same result', () => {
    fc.assert(
      fc.property(
        fc.array(characterSummaryArb, { minLength: 0, maxLength: 50 }),
        (characters) => {
          const sorted = sortCharactersByLastModified(characters);
          const sortedAgain = sortCharactersByLastModified(sorted);

          expect(sortedAgain).toEqual(sorted);
        }
      ),
      { numRuns: 100 }
    );
  });
});
