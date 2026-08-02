// Feature: alternative-channelling-cants, Property 10: Cant categorization correctness
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeCantState, getPermittedCantSlots } from '../cants';
import { CANT_CATALOGUE, COLOUR_LORES } from '../../data/cants';
import type { CantEntry } from '../../data/cants';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, SpellData, SpellItem, LearnedCant } from '../../types/character';

/**
 * Validates: Requirements 5.2, 5.3
 *
 * Property 10: For any Cant in a Lore the character has access to (spellCount >= 1),
 * the Cant shall be categorized as:
 *   - "learned" if it appears in learnedCants
 *   - "available" if it does not appear in learnedCants but the character's learned Cant
 *     count for that Lore is below the permitted maximum
 *   - "locked" if the character's learned Cant count for that Lore equals the permitted
 *     maximum and the Cant is not learned
 */

function makeCharacter(overrides: Partial<Character>): Character {
  return { ...BLANK_CHARACTER, ...overrides } as Character;
}

// Build a fake spell catalogue with spells distributed across Lores
// Each Lore gets between 1 and 8 spells
const arbSpellCatalogue: fc.Arbitrary<SpellData[]> = fc.tuple(
  ...COLOUR_LORES.map(lore =>
    fc.integer({ min: 1, max: 8 }).map(count =>
      Array.from({ length: count }, (_, i) => ({
        name: `${lore}-spell-${i}`,
        lore,
        cn: '0',
        range: 'Touch',
        target: '1',
        duration: 'Instant',
        effect: 'Test effect',
      }))
    )
  )
).map(arrays => arrays.flat());

// Generator: a character with spells from the catalogue (establishing Lore access)
// and learnedCants from the Cant catalogue
function arbCharacterWithCants(spellCatalogue: SpellData[]) {
  // For each Lore, pick a random number of spells (0 to all available)
  const spellsByLore = new Map<string, SpellData[]>();
  for (const lore of COLOUR_LORES) {
    const loreSpells = spellCatalogue.filter(s => s.lore === lore);
    spellsByLore.set(lore, loreSpells);
  }

  // Generate which spells the character knows (subset of catalogue)
  const arbSpells: fc.Arbitrary<SpellItem[]> = fc.tuple(
    ...COLOUR_LORES.map(lore => {
      const available = spellsByLore.get(lore) ?? [];
      return fc.subarray(available, { minLength: 0, maxLength: available.length });
    })
  ).map(arrays =>
    arrays.flat().map(s => ({
      name: s.name,
      cn: s.cn,
      range: s.range,
      target: s.target,
      duration: s.duration,
      effect: s.effect,
    }))
  );

  // Generate learnedCants - pick a subset of valid Cants from the catalogue
  // Only pick Cants from Lores the character has access to
  const arbLearnedCants: fc.Arbitrary<{ spells: SpellItem[]; learnedCants: LearnedCant[] }> =
    arbSpells.chain(spells => {
      // Determine which Lores the character has access to
      const spellCountByLore = new Map<string, number>();
      for (const spell of spells) {
        const catalogueEntry = spellCatalogue.find(s => s.name === spell.name);
        if (catalogueEntry && (COLOUR_LORES as readonly string[]).includes(catalogueEntry.lore)) {
          spellCountByLore.set(catalogueEntry.lore, (spellCountByLore.get(catalogueEntry.lore) ?? 0) + 1);
        }
      }

      // For each Lore with access, pick a random subset of Cants to learn (0 to 3)
      const accessibleLores = COLOUR_LORES.filter(l => (spellCountByLore.get(l) ?? 0) >= 1);
      if (accessibleLores.length === 0) {
        return fc.constant({ spells, learnedCants: [] as LearnedCant[] });
      }

      const cantsByLore = new Map<string, CantEntry[]>();
      for (const lore of accessibleLores) {
        cantsByLore.set(lore, CANT_CATALOGUE.filter(c => c.lore === lore));
      }

      // Pick a subset of Cants from accessible Lores
      const allAccessibleCants = accessibleLores.flatMap(l => cantsByLore.get(l) ?? []);
      return fc.subarray(allAccessibleCants, { minLength: 0, maxLength: allAccessibleCants.length })
        .map(cants => ({
          spells,
          learnedCants: cants.map(c => ({ lore: c.lore, cantName: c.name })),
        }));
    });

  return arbLearnedCants;
}

describe('Feature: alternative-channelling-cants, Property 10: Cant categorization correctness', () => {
  it('each Cant in an accessible Lore is categorized exactly as learned, available, or locked', () => {
    fc.assert(
      fc.property(
        arbSpellCatalogue.chain(catalogue =>
          arbCharacterWithCants(catalogue).map(charData => ({ catalogue, ...charData }))
        ),
        ({ catalogue, spells, learnedCants }) => {
          const character = makeCharacter({ spells, learnedCants });
          const state = computeCantState(character, [...CANT_CATALOGUE], catalogue);

          for (const group of state.loreGroups) {
            const lore = group.lore;
            // All Cants for this Lore from the catalogue
            const allCantsForLore = CANT_CATALOGUE.filter(c => c.lore === lore);

            // The character's learned Cants for this Lore
            const learnedForLore = learnedCants.filter(lc => lc.lore === lore);
            const learnedNames = new Set(learnedForLore.map(lc => lc.cantName));
            const permittedSlots = group.permittedSlots;

            for (const cant of allCantsForLore) {
              const isInLearned = group.learnedCants.some(c => c.name === cant.name);
              const isInAvailable = group.availableCants.some(c => c.name === cant.name);
              const isInLocked = group.lockedCants.some(c => c.name === cant.name);

              // Every Cant must appear in exactly one category
              const categories = [isInLearned, isInAvailable, isInLocked].filter(Boolean).length;
              expect(categories).toBe(1);

              if (learnedNames.has(cant.name)) {
                // Cant is learned by the character → should be in "learned"
                expect(isInLearned).toBe(true);
              } else if (learnedForLore.length < permittedSlots) {
                // Cant not learned AND slots available → should be "available"
                expect(isInAvailable).toBe(true);
              } else {
                // Cant not learned AND no slots left → should be "locked"
                expect(isInLocked).toBe(true);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('every Cant from the catalogue for an accessible Lore appears in exactly one category', () => {
    fc.assert(
      fc.property(
        arbSpellCatalogue.chain(catalogue =>
          arbCharacterWithCants(catalogue).map(charData => ({ catalogue, ...charData }))
        ),
        ({ catalogue, spells, learnedCants }) => {
          const character = makeCharacter({ spells, learnedCants });
          const state = computeCantState(character, [...CANT_CATALOGUE], catalogue);

          for (const group of state.loreGroups) {
            const allCantsForLore = CANT_CATALOGUE.filter(c => c.lore === group.lore);
            const allCategorized = [
              ...group.learnedCants,
              ...group.availableCants,
              ...group.lockedCants,
            ];

            // Total categorized should equal total Cants for that Lore
            expect(allCategorized.length).toBe(allCantsForLore.length);

            // No duplicates across categories
            const categorizedNames = allCategorized.map(c => c.name);
            const uniqueNames = new Set(categorizedNames);
            expect(uniqueNames.size).toBe(categorizedNames.length);

            // Every catalogue Cant for this Lore is present
            for (const cant of allCantsForLore) {
              expect(uniqueNames.has(cant.name)).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('no Cant appears in more than one category within a Lore group', () => {
    fc.assert(
      fc.property(
        arbSpellCatalogue.chain(catalogue =>
          arbCharacterWithCants(catalogue).map(charData => ({ catalogue, ...charData }))
        ),
        ({ catalogue, spells, learnedCants }) => {
          const character = makeCharacter({ spells, learnedCants });
          const state = computeCantState(character, [...CANT_CATALOGUE], catalogue);

          for (const group of state.loreGroups) {
            const learnedSet = new Set(group.learnedCants.map(c => c.name));
            const availableSet = new Set(group.availableCants.map(c => c.name));
            const lockedSet = new Set(group.lockedCants.map(c => c.name));

            // No overlap between any two categories
            for (const name of learnedSet) {
              expect(availableSet.has(name)).toBe(false);
              expect(lockedSet.has(name)).toBe(false);
            }
            for (const name of availableSet) {
              expect(lockedSet.has(name)).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('learned Cants in the output correspond to character learnedCants entries', () => {
    fc.assert(
      fc.property(
        arbSpellCatalogue.chain(catalogue =>
          arbCharacterWithCants(catalogue).map(charData => ({ catalogue, ...charData }))
        ),
        ({ catalogue, spells, learnedCants }) => {
          const character = makeCharacter({ spells, learnedCants });
          const state = computeCantState(character, [...CANT_CATALOGUE], catalogue);

          for (const group of state.loreGroups) {
            const characterLearnedForLore = learnedCants.filter(lc => lc.lore === group.lore);
            const characterLearnedNames = new Set(characterLearnedForLore.map(lc => lc.cantName));

            // Every Cant in the "learned" category must be in the character's learnedCants
            for (const cant of group.learnedCants) {
              expect(characterLearnedNames.has(cant.name)).toBe(true);
            }

            // Every Cant in "available" or "locked" must NOT be in learnedCants
            for (const cant of group.availableCants) {
              expect(characterLearnedNames.has(cant.name)).toBe(false);
            }
            for (const cant of group.lockedCants) {
              expect(characterLearnedNames.has(cant.name)).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
