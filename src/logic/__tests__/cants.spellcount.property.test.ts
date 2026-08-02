// Feature: alternative-channelling-cants, Property 6: Spell count excludes non-catalogue spells
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getSpellCountByLore } from '../cants';
import { COLOUR_LORES } from '../../data/cants';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, SpellData, SpellItem } from '../../types/character';

function makeCharacter(overrides: Partial<Character>): Character {
  return { ...BLANK_CHARACTER, ...overrides } as Character;
}

// Generator: a fake spell catalogue with unique spell names across colour Lores
const arbSpellCatalogue = fc.array(
  fc.record({
    name: fc.string({ minLength: 1, maxLength: 30 }),
    lore: fc.constantFrom(...COLOUR_LORES),
    cn: fc.constant('0'),
    range: fc.constant('Touch'),
    target: fc.constant('1'),
    duration: fc.constant('Instant'),
    effect: fc.constant('Test effect'),
  }),
  { minLength: 1, maxLength: 20 }
).map(spells => {
  // Ensure unique spell names in the catalogue
  const seen = new Set<string>();
  return spells.filter(s => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });
}).filter(arr => arr.length > 0);

// Generator: a catalogue that includes some non-colour-lore spells (e.g. Necromancy, Chaos)
const NON_COLOUR_LORES = ['Lore of Necromancy', 'Lore of Chaos', 'Lore of the Great Maw', 'Petty Magic'];

const arbMixedCatalogue = fc.tuple(
  arbSpellCatalogue,
  fc.array(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 30 }),
      lore: fc.constantFrom(...NON_COLOUR_LORES),
      cn: fc.constant('0'),
      range: fc.constant('Touch'),
      target: fc.constant('1'),
      duration: fc.constant('Instant'),
      effect: fc.constant('Test effect'),
    }),
    { minLength: 0, maxLength: 10 }
  )
).map(([colourSpells, nonColourSpells]) => {
  // Combine and ensure unique names across entire catalogue
  const seen = new Set<string>(colourSpells.map(s => s.name));
  const filteredNonColour = nonColourSpells.filter(s => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });
  return [...colourSpells, ...filteredNonColour];
});

// Generator: character spells that are a mix of catalogue-matching and non-matching names
function arbCharacterSpells(catalogue: SpellData[]) {
  const catalogueNames = catalogue.map(s => s.name);
  const arbCatalogueSpellName = fc.constantFrom(...catalogueNames);
  const arbCustomSpellName = fc.string({ minLength: 1, maxLength: 30 }).filter(
    n => !catalogueNames.includes(n)
  );

  const arbSpell = fc.oneof(
    { weight: 2, arbitrary: arbCatalogueSpellName },
    { weight: 1, arbitrary: arbCustomSpellName }
  ).map((name): SpellItem => ({
    name,
    cn: '0',
    range: 'Touch',
    target: '1',
    duration: 'Instant',
    effect: 'Test effect',
  }));

  return fc.array(arbSpell, { minLength: 0, maxLength: 20 });
}

/**
 * Validates: Requirements 3.5
 */
describe('Feature: alternative-channelling-cants, Property 6: Spell count excludes non-catalogue spells', () => {
  it('only spells whose name matches a colour-lore catalogue entry contribute to the count', () => {
    fc.assert(
      fc.property(
        arbMixedCatalogue.chain(catalogue =>
          arbCharacterSpells(catalogue).map(spells => ({ catalogue, spells }))
        ),
        ({ catalogue, spells }) => {
          const character = makeCharacter({ spells });
          const result = getSpellCountByLore(character, catalogue);

          // Build expected counts manually
          const colourLoreSet = new Set<string>(COLOUR_LORES);
          const spellNameToLore = new Map<string, string>();
          for (const spell of catalogue) {
            if (colourLoreSet.has(spell.lore)) {
              spellNameToLore.set(spell.name, spell.lore);
            }
          }

          const expected = new Map<string, number>();
          for (const spell of spells) {
            const lore = spellNameToLore.get(spell.name);
            if (lore) {
              expected.set(lore, (expected.get(lore) ?? 0) + 1);
            }
          }

          // Assert counts match for all colour Lores
          for (const lore of COLOUR_LORES) {
            const expectedCount = expected.get(lore) ?? 0;
            const actualCount = result.get(lore) ?? 0;
            expect(actualCount).toBe(expectedCount);
          }

          // Assert no non-colour Lores appear in the result
          for (const [key] of result) {
            expect(colourLoreSet.has(key)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('custom/homebrew spells not in the catalogue produce zero count', () => {
    fc.assert(
      fc.property(
        arbSpellCatalogue.chain(catalogue => {
          const catalogueNames = new Set(catalogue.map(s => s.name));
          // Generate only non-matching spell names
          const arbCustomSpell = fc.string({ minLength: 1, maxLength: 30 })
            .filter(n => !catalogueNames.has(n))
            .map((name): SpellItem => ({
              name,
              cn: '0',
              range: 'Touch',
              target: '1',
              duration: 'Instant',
              effect: 'Test effect',
            }));
          return fc.array(arbCustomSpell, { minLength: 1, maxLength: 15 }).map(spells => ({
            catalogue,
            spells,
          }));
        }),
        ({ catalogue, spells }) => {
          const character = makeCharacter({ spells });
          const result = getSpellCountByLore(character, catalogue);

          // No Lore should have any count since all spells are custom
          for (const lore of COLOUR_LORES) {
            const count = result.get(lore) ?? 0;
            expect(count).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('spells matching non-colour-lore catalogue entries do not contribute to any count', () => {
    fc.assert(
      fc.property(
        arbMixedCatalogue.chain(catalogue => {
          // Find non-colour spells in the catalogue
          const colourLoreSet = new Set<string>(COLOUR_LORES);
          const nonColourSpells = catalogue.filter(s => !colourLoreSet.has(s.lore));
          if (nonColourSpells.length === 0) return fc.constant(null);

          // Generate character spells that only reference non-colour catalogue entries
          const nonColourNames = nonColourSpells.map(s => s.name);
          const arbSpell = fc.constantFrom(...nonColourNames).map((name): SpellItem => ({
            name,
            cn: '0',
            range: 'Touch',
            target: '1',
            duration: 'Instant',
            effect: 'Test effect',
          }));
          return fc.array(arbSpell, { minLength: 1, maxLength: 10 }).map(spells => ({
            catalogue,
            spells,
          }));
        }).filter((v): v is { catalogue: SpellData[]; spells: SpellItem[] } => v !== null),
        ({ catalogue, spells }) => {
          const character = makeCharacter({ spells });
          const result = getSpellCountByLore(character, catalogue);

          // No colour Lore should have any count
          for (const lore of COLOUR_LORES) {
            const count = result.get(lore) ?? 0;
            expect(count).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
