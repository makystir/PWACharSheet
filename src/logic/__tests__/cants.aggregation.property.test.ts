// Feature: alternative-channelling-cants, Property 15: SL aggregation per Wind
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getAggregatedSLByWind } from '../cants';
import { COLOUR_LORES } from '../../data/cants';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, ChannellingProgress, SpellData } from '../../types/character';

function makeCharacter(overrides: Partial<Character>): Character {
  return { ...BLANK_CHARACTER, ...overrides } as Character;
}

// Generator: a fake spell catalogue with spells distributed across multiple Lores
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

// Generator: channellingProgress entries referencing spells from the catalogue (and possibly unknown spells)
function arbChannellingProgress(catalogue: SpellData[]) {
  const catalogueNames = catalogue.map(s => s.name);
  const arbKnownSpellName = fc.constantFrom(...catalogueNames);
  const arbUnknownSpellName = fc.string({ minLength: 1, maxLength: 30 }).filter(
    n => !catalogueNames.includes(n)
  );
  const arbSpellName = fc.oneof(
    { weight: 3, arbitrary: arbKnownSpellName },
    { weight: 1, arbitrary: arbUnknownSpellName }
  );

  return fc.array(
    fc.record({
      spellName: arbSpellName,
      accumulatedSL: fc.integer({ min: 0, max: 30 }),
    }),
    { minLength: 0, maxLength: 15 }
  );
}

/**
 * Validates: Requirements 7.1, 7.5
 */
describe('Feature: alternative-channelling-cants, Property 15: SL aggregation per Wind', () => {
  it('aggregated SL per Wind equals sum of accumulatedSL for entries whose spell maps to that Wind', () => {
    fc.assert(
      fc.property(
        arbSpellCatalogue.chain(catalogue =>
          arbChannellingProgress(catalogue).map(progress => ({ catalogue, progress }))
        ),
        ({ catalogue, progress }) => {
          const character = makeCharacter({ channellingProgress: progress });
          const result = getAggregatedSLByWind(character, catalogue);

          // Build expected aggregation manually
          const colourLoreSet = new Set<string>(COLOUR_LORES);
          const spellNameToLore = new Map<string, string>();
          for (const spell of catalogue) {
            if (colourLoreSet.has(spell.lore)) {
              spellNameToLore.set(spell.name, spell.lore);
            }
          }

          const expected = new Map<string, number>();
          for (const entry of progress) {
            const lore = spellNameToLore.get(entry.spellName);
            if (lore) {
              expected.set(lore, (expected.get(lore) ?? 0) + entry.accumulatedSL);
            }
          }

          // Assert each Wind's aggregation matches expected
          for (const lore of COLOUR_LORES) {
            const expectedSL = expected.get(lore) ?? 0;
            const actualSL = result.get(lore) ?? 0;
            expect(actualSL).toBe(expectedSL);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('each Wind aggregation is independent: modifying entries for one Wind does not affect another', () => {
    fc.assert(
      fc.property(
        arbSpellCatalogue.chain(catalogue => {
          // Need at least 2 different lores in the catalogue
          const loresPresent = [...new Set(catalogue.map(s => s.lore))];
          if (loresPresent.length < 2) {
            return fc.constant(null);
          }
          return arbChannellingProgress(catalogue).chain(progress => {
            return fc.record({
              catalogue: fc.constant(catalogue),
              progress: fc.constant(progress),
              targetLore: fc.constantFrom(...loresPresent),
              extraSL: fc.integer({ min: 1, max: 20 }),
            });
          });
        }).filter((v): v is { catalogue: SpellData[]; progress: ChannellingProgress[]; targetLore: string; extraSL: number } => v !== null),
        ({ catalogue, progress, targetLore, extraSL }) => {
          const character = makeCharacter({ channellingProgress: progress });
          const baseResult = getAggregatedSLByWind(character, catalogue);

          // Find a spell from the target lore in the catalogue
          const targetSpell = catalogue.find(s => s.lore === targetLore);
          if (!targetSpell) return; // skip if no spell for that lore

          // Add an extra entry for the target Wind
          const modifiedProgress: ChannellingProgress[] = [
            ...progress,
            { spellName: targetSpell.name, accumulatedSL: extraSL },
          ];
          const modifiedCharacter = makeCharacter({ channellingProgress: modifiedProgress });
          const modifiedResult = getAggregatedSLByWind(modifiedCharacter, catalogue);

          // The target Wind should increase by extraSL
          const baseSL = baseResult.get(targetLore) ?? 0;
          const modifiedSL = modifiedResult.get(targetLore) ?? 0;
          expect(modifiedSL).toBe(baseSL + extraSL);

          // All other Winds should remain unchanged
          for (const lore of COLOUR_LORES) {
            if (lore === targetLore) continue;
            const baseOther = baseResult.get(lore) ?? 0;
            const modifiedOther = modifiedResult.get(lore) ?? 0;
            expect(modifiedOther).toBe(baseOther);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('entries referencing spells not in the catalogue are excluded from aggregation', () => {
    fc.assert(
      fc.property(
        arbSpellCatalogue.chain(catalogue => {
          const catalogueNames = new Set(catalogue.map(s => s.name));
          // Generate progress entries with only unknown spell names
          const arbUnknownEntry = fc.record({
            spellName: fc.string({ minLength: 1, maxLength: 30 }).filter(n => !catalogueNames.has(n)),
            accumulatedSL: fc.integer({ min: 1, max: 30 }),
          });
          return fc.array(arbUnknownEntry, { minLength: 1, maxLength: 10 }).map(progress => ({
            catalogue,
            progress,
          }));
        }),
        ({ catalogue, progress }) => {
          const character = makeCharacter({ channellingProgress: progress });
          const result = getAggregatedSLByWind(character, catalogue);

          // All Winds should have 0 aggregated SL since no entries match catalogue
          for (const lore of COLOUR_LORES) {
            const sl = result.get(lore) ?? 0;
            expect(sl).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
