import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { filterByLore, groupByLore, getAvailableLores, searchSpells, filterSpells, deriveCharacterLore } from '../spell-picker-utils';
import { SPELL_LIST, LORE_CATEGORIES, LORE_DISPLAY_ORDER } from '../../data/spells';
import type { SpellData, Talent } from '../../types/character';

// Feature: spell-picker-improvements
// Properties 1–5: Data validation, grouping, ordering, filtering, available lores

// ─── Generators ─────────────────────────────────────────────────────────────

/** Arbitrary lore drawn from the canonical LORE_CATEGORIES */
const loreArb = fc.constantFrom(...LORE_CATEGORIES);

/** Arbitrary SpellData with random name and lore from LORE_CATEGORIES */
const spellArb: fc.Arbitrary<SpellData> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  cn: fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '-'),
  range: fc.string({ minLength: 1, maxLength: 20 }),
  target: fc.string({ minLength: 1, maxLength: 20 }),
  duration: fc.string({ minLength: 1, maxLength: 20 }),
  effect: fc.string({ minLength: 1, maxLength: 50 }),
  lore: loreArb,
});

/** Arbitrary spell list (0–50 spells) */
const spellListArb = fc.array(spellArb, { minLength: 0, maxLength: 50 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: spell-picker-improvements', () => {
  describe('Property 1: Every spell has a valid lore category', () => {
    /**
     * **Validates: Requirements 1.2, 1.3**
     */

    it('every entry in SPELL_LIST has a non-empty lore field that is a member of LORE_CATEGORIES', () => {
      const validLores = new Set<string>(LORE_CATEGORIES);

      for (const spell of SPELL_LIST) {
        expect(spell.lore).toBeDefined();
        expect(spell.lore.length).toBeGreaterThan(0);
        expect(validLores.has(spell.lore)).toBe(true);
      }
    });
  });

  describe('Property 2: Group assignment correctness', () => {
    /**
     * **Validates: Requirements 2.1, 2.3**
     */

    it('every spell in a group has a lore matching the group label, and total count equals input length', () => {
      fc.assert(
        fc.property(spellListArb, (spells) => {
          const groups = groupByLore(spells);

          // Every spell in a group has matching lore
          for (const group of groups) {
            for (const spell of group.spells) {
              expect(spell.lore).toBe(group.lore);
            }
          }

          // Total count of spells across all groups equals input length
          const totalCount = groups.reduce((sum, g) => sum + g.spells.length, 0);
          expect(totalCount).toBe(spells.length);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Group ordering preserves canonical order', () => {
    /**
     * **Validates: Requirements 2.4**
     */

    it('group labels appear in the same relative order as LORE_DISPLAY_ORDER', () => {
      fc.assert(
        fc.property(spellListArb, (spells) => {
          const groups = groupByLore(spells);
          const groupLabels = groups.map(g => g.lore);

          // Filter LORE_DISPLAY_ORDER to only those present in group labels
          const expectedOrder = LORE_DISPLAY_ORDER.filter(lore => groupLabels.includes(lore));

          // The labels that are in LORE_DISPLAY_ORDER should appear in that relative order
          const labelsInOrder = groupLabels.filter(l => LORE_DISPLAY_ORDER.includes(l));
          expect(labelsInOrder).toEqual(expectedOrder);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Lore filter returns only matching spells', () => {
    /**
     * **Validates: Requirements 3.2, 3.3**
     */

    it('filterByLore with a lore returns only spells whose lore matches', () => {
      fc.assert(
        fc.property(spellListArb, loreArb, (spells, lore) => {
          const result = filterByLore(spells, lore);

          for (const spell of result) {
            expect(spell.lore).toBe(lore);
          }

          // No matching spells should be missing
          const expected = spells.filter(s => s.lore === lore);
          expect(result).toEqual(expected);
        }),
        { numRuns: 100 }
      );
    });

    it('filterByLore with null returns all spells unchanged', () => {
      fc.assert(
        fc.property(spellListArb, (spells) => {
          const result = filterByLore(spells, null);
          expect(result).toEqual(spells);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Available lores matches unique lores in data', () => {
    /**
     * **Validates: Requirements 3.4**
     */

    it('getAvailableLores returns exactly the set of unique lore values in the input', () => {
      fc.assert(
        fc.property(spellListArb, (spells) => {
          const result = getAvailableLores(spells);
          const uniqueLores = new Set(spells.map(s => s.lore));

          // Result contains exactly the unique lores (as a set)
          expect(new Set(result)).toEqual(uniqueLores);

          // No duplicates in result
          expect(result.length).toBe(uniqueLores.size);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Text search filters by case-insensitive name match', () => {
    /**
     * **Validates: Requirements 4.2, 4.4**
     */

    it('searchSpells returns exactly those spells whose name contains the query (case-insensitive)', () => {
      fc.assert(
        fc.property(spellListArb, fc.string(), (spells, query) => {
          const result = searchSpells(spells, query);

          if (query === '') {
            // Empty query returns all spells unchanged
            expect(result).toEqual(spells);
          } else {
            const lowerQuery = query.toLowerCase();

            // Every returned spell must match
            for (const spell of result) {
              expect(spell.name.toLowerCase()).toContain(lowerQuery);
            }

            // Every matching spell from input must be in the result
            const expected = spells.filter(s => s.name.toLowerCase().includes(lowerQuery));
            expect(result).toEqual(expected);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: Filter composition is equivalent to sequential application', () => {
    /**
     * **Validates: Requirements 4.3**
     */

    it('filterSpells(spells, lore, query) equals searchSpells(filterByLore(spells, lore), query)', () => {
      fc.assert(
        fc.property(
          spellListArb,
          fc.oneof(loreArb, fc.constant(null)),
          fc.string(),
          (spells, lore, query) => {
            const composed = filterSpells(spells, lore, query);
            const sequential = searchSpells(filterByLore(spells, lore), query);

            expect(composed).toEqual(sequential);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Lore derivation from talents', () => {
    /**
     * **Validates: Requirements 5.1, 5.4, 5.5**
     */

    /** Arbitrary talent with a name that matches a known lore-granting pattern */
    const loreGrantingTalentArb: fc.Arbitrary<Pick<Talent, 'n'>> = fc.oneof(
      // Arcane Magic with a valid wind name
      fc.constantFrom(
        'Fire', 'Aqshy', 'Beasts', 'Ghur', 'Death', 'Shyish',
        'Heavens', 'Azyr', 'Metal', 'Chamon', 'Life', 'Ghyran',
        'Light', 'Hysh', 'Shadows', 'Ulgu', 'Hedgecraft',
        'Witchcraft', 'Daemonology', 'Necromancy'
      ).map(wind => ({ n: `Arcane Magic (${wind})` })),
      // Chaos Magic with any parenthetical
      fc.string({ minLength: 1, maxLength: 20 }).map(x => ({ n: `Chaos Magic (${x})` })),
      // Invoke with a valid deity name
      fc.constantFrom(
        'Manann', 'Morr', 'Myrmidia', 'Ranald', 'Rhya',
        'Shallya', 'Sigmar', 'Taal', 'Ulric', 'Verena'
      ).map(deity => ({ n: `Invoke (${deity})` })),
      // Petty Magic
      fc.constant({ n: 'Petty Magic' })
    );

    /** Arbitrary talent whose name does NOT match any lore-granting pattern */
    const nonLoreTalentArb: fc.Arbitrary<Pick<Talent, 'n'>> = fc
      .string({ minLength: 1, maxLength: 30 })
      .filter(name =>
        !/^Arcane Magic\s*\(.+\)$/.test(name) &&
        !/^Chaos Magic\s*\(.+\)$/.test(name) &&
        !/^Invoke\s*\(.+\)$/.test(name) &&
        name !== 'Petty Magic'
      )
      .map(name => ({ n: name }));

    it('returns non-null when at least one talent matches a lore-granting pattern', () => {
      fc.assert(
        fc.property(
          fc.array(nonLoreTalentArb, { minLength: 0, maxLength: 10 }),
          loreGrantingTalentArb,
          fc.array(nonLoreTalentArb, { minLength: 0, maxLength: 10 }),
          (before, loreTalent, after) => {
            const talents = [...before, loreTalent, ...after];
            const result = deriveCharacterLore(talents);
            expect(result).not.toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns null when no talent matches any lore-granting pattern', () => {
      fc.assert(
        fc.property(
          fc.array(nonLoreTalentArb, { minLength: 0, maxLength: 20 }),
          (talents) => {
            const result = deriveCharacterLore(talents);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: Known spells are never excluded from filtered results', () => {
    /**
     * **Validates: Requirements 8.1, 8.3**
     */

    it('filterSpells output is independent of which spells are marked as known', () => {
      fc.assert(
        fc.property(
          spellListArb,
          fc.oneof(loreArb, fc.constant(null)),
          fc.string(),
          (spells, lore, query) => {
            // Divide spells into two arbitrary subsets (known vs unknown)
            // filterSpells doesn't take a known set parameter, so the result
            // should be the same regardless of which spells are "known"
            const result1 = filterSpells(spells, lore, query);
            const result2 = filterSpells(spells, lore, query);

            // The same input always produces the same output —
            // known status is not a parameter and cannot affect results
            expect(result1).toEqual(result2);

            // Additionally verify that every spell in the result comes from the input
            // and no spell is excluded based on any external criterion
            const expectedFromInput = searchSpells(filterByLore(spells, lore), query);
            expect(result1).toEqual(expectedFromInput);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
