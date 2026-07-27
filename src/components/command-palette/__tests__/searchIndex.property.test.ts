import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { buildSearchIndex, searchEntities } from '../searchIndex';
import type { SearchableEntity, EntityType } from '../searchIndex';
import { SPELL_LIST } from '../../../data/spells';
import { TALENT_DB } from '../../../data/talents';
import { ADV_SKILL_DB } from '../../../data/advanced-skills';
import { CAREER_SCHEMES } from '../../../data/careers';
import { RUNE_CATALOGUE } from '../../../data/runes';
import { RITUAL_LIST } from '../../../data/rituals';
import { CONDITIONS } from '../../../data/conditions';
import { BLANK_CHARACTER } from '../../../types/character';

// Feature: command-palette-search
// Properties 1, 2, 3, 4: Search index completeness and fuzzy match guarantees

// ─── Shared Setup ────────────────────────────────────────────────────────────

const index = buildSearchIndex();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check if a specific entity appears somewhere in the grouped results.
 * Uses a large maxResults to test the match algorithm itself without the
 * default 50-result cap interfering with prefix/description/fuzzy tests.
 */
function resultsContainEntity(index: SearchableEntity[], query: string, entity: SearchableEntity): boolean {
  const results = searchEntities(index, query, index.length);
  for (const group of results.groups) {
    for (const entry of group.entries) {
      if (entry.entity.id === entity.id) {
        return true;
      }
    }
  }
  return false;
}

/** Extract 4+ character words from a text string */
function extractLongWords(text: string): string[] {
  // Match sequences of letters (at least 4 chars)
  const matches = text.match(/[a-zA-Z]{4,}/g);
  return matches ?? [];
}

// ─── Index Lookup Helpers ────────────────────────────────────────────────────

const indexByNameAndType = new Map<string, SearchableEntity>();
for (const entity of index) {
  indexByNameAndType.set(`${entity.type}::${entity.name}`, entity);
}

function findInIndex(name: string, type: EntityType): SearchableEntity | undefined {
  return indexByNameAndType.get(`${type}::${name}`);
}

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: command-palette-search', () => {
  describe('Property 1: Search index completeness', () => {
    /**
     * **Validates: Requirements 5.1, 10.1**
     *
     * For any entity present in any of the static data sources (SPELL_LIST, TALENT_DB,
     * ADV_SKILL_DB, basic skills, CAREER_SCHEMES, RUNE_CATALOGUE, RITUAL_LIST, CONDITIONS),
     * that entity SHALL appear in the built search index with a matching name and correct entity type.
     */

    it('every spell in SPELL_LIST appears in the index with type "spell"', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SPELL_LIST),
          (spell) => {
            const found = findInIndex(spell.name, 'spell');
            expect(found).toBeDefined();
            expect(found!.name).toBe(spell.name);
            expect(found!.type).toBe('spell');
          }
        ),
        { numRuns: Math.min(SPELL_LIST.length, 200) }
      );
    });

    it('every talent in TALENT_DB appears in the index with type "talent"', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...TALENT_DB),
          (talent) => {
            const found = findInIndex(talent.name, 'talent');
            expect(found).toBeDefined();
            expect(found!.name).toBe(talent.name);
            expect(found!.type).toBe('talent');
          }
        ),
        { numRuns: Math.min(TALENT_DB.length, 200) }
      );
    });

    it('every advanced skill in ADV_SKILL_DB appears in the index with type "skill"', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ADV_SKILL_DB),
          (skill) => {
            const found = findInIndex(skill.n, 'skill');
            expect(found).toBeDefined();
            expect(found!.name).toBe(skill.n);
            expect(found!.type).toBe('skill');
          }
        ),
        { numRuns: Math.min(ADV_SKILL_DB.length, 200) }
      );
    });

    it('every basic skill in BLANK_CHARACTER.bSkills appears in the index with type "skill"', () => {
      const basicSkills = BLANK_CHARACTER.bSkills.filter(s => s.n !== '');
      fc.assert(
        fc.property(
          fc.constantFrom(...basicSkills),
          (skill) => {
            const found = findInIndex(skill.n, 'skill');
            expect(found).toBeDefined();
            expect(found!.name).toBe(skill.n);
            expect(found!.type).toBe('skill');
          }
        ),
        { numRuns: Math.min(basicSkills.length, 200) }
      );
    });

    it('every career in CAREER_SCHEMES appears in the index with type "career"', () => {
      const careerNames = Object.keys(CAREER_SCHEMES);
      fc.assert(
        fc.property(
          fc.constantFrom(...careerNames),
          (careerName) => {
            const found = findInIndex(careerName, 'career');
            expect(found).toBeDefined();
            expect(found!.name).toBe(careerName);
            expect(found!.type).toBe('career');
          }
        ),
        { numRuns: Math.min(careerNames.length, 200) }
      );
    });

    it('every rune in RUNE_CATALOGUE appears in the index with type "rune"', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...RUNE_CATALOGUE),
          (rune) => {
            const found = findInIndex(rune.name, 'rune');
            expect(found).toBeDefined();
            expect(found!.name).toBe(rune.name);
            expect(found!.type).toBe('rune');
          }
        ),
        { numRuns: Math.min(RUNE_CATALOGUE.length, 200) }
      );
    });

    it('every ritual in RITUAL_LIST appears in the index with type "ritual"', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...RITUAL_LIST),
          (ritual) => {
            const found = findInIndex(ritual.name, 'ritual');
            expect(found).toBeDefined();
            expect(found!.name).toBe(ritual.name);
            expect(found!.type).toBe('ritual');
          }
        ),
        { numRuns: Math.min(RITUAL_LIST.length, 200) }
      );
    });

    it('every condition in CONDITIONS appears in the index with type "condition"', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...CONDITIONS),
          (condition) => {
            const found = findInIndex(condition.name, 'condition');
            expect(found).toBeDefined();
            expect(found!.name).toBe(condition.name);
            expect(found!.type).toBe('condition');
          }
        ),
        { numRuns: Math.min(CONDITIONS.length, 200) }
      );
    });
  });

  describe('Property 2: Name prefix match guarantee', () => {
    /**
     * **Validates: Requirements 5.2, 5.4**
     *
     * For any entity in the search index and any prefix of that entity's name
     * (length >= 1), searching with that prefix SHALL return that entity in the results.
     */

    it('any prefix of an entity name returns that entity in results', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...index),
          fc.integer({ min: 1, max: 100 }),
          (entity, prefixLen) => {
            // Clamp prefix length to the entity name length
            const actualLen = Math.min(prefixLen, entity.name.length);
            const prefix = entity.name.slice(0, actualLen);

            // Skip if prefix is empty after slicing (shouldn't happen with min=1)
            if (prefix.trim().length === 0) return;

            const found = resultsContainEntity(index, prefix, entity);
            expect(found).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Description search returns entity', () => {
    /**
     * **Validates: Requirements 5.3**
     *
     * For any entity in the search index whose description/effect field contains
     * a word of 4+ characters, searching for that word SHALL include that entity
     * in the results.
     */

    // Filter entities that have description content with 4+ char words
    const entitiesWithDescWords = index.filter(entity => {
      const descText = getDescriptionText(entity);
      return extractLongWords(descText).length > 0;
    });

    it('a 4+ char word from description returns the entity in results', () => {
      // Skip if no entities have description words (unlikely but safe)
      if (entitiesWithDescWords.length === 0) return;

      fc.assert(
        fc.property(
          fc.constantFrom(...entitiesWithDescWords),
          fc.nat(),
          (entity, wordIdx) => {
            const descText = getDescriptionText(entity);
            const words = extractLongWords(descText);
            if (words.length === 0) return;

            // Pick a random word using the generated index
            const word = words[wordIdx % words.length];

            const found = resultsContainEntity(index, word, entity);
            expect(found).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Fuzzy tolerance for character omission', () => {
    /**
     * **Validates: Requirements 5.5**
     *
     * For any entity in the search index whose name is longer than 3 characters,
     * searching with the name minus one arbitrary character SHALL still return
     * that entity in the results.
     */

    // Filter entities with names > 3 chars
    const entitiesWithLongNames = index.filter(entity => entity.name.length > 3);

    it('name minus one character still returns the entity in results', () => {
      if (entitiesWithLongNames.length === 0) return;

      fc.assert(
        fc.property(
          fc.constantFrom(...entitiesWithLongNames),
          fc.integer({ min: 0, max: 1000 }),
          (entity, charIdx) => {
            const name = entity.name;
            // Pick which character to remove (mod by name length)
            const removeIdx = charIdx % name.length;
            const nameMinusOne = name.slice(0, removeIdx) + name.slice(removeIdx + 1);

            // Skip if resulting string is empty or whitespace-only
            if (nameMinusOne.trim().length === 0) return;

            const found = resultsContainEntity(index, nameMinusOne, entity);
            expect(found).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Results grouped by correct entity type', () => {
    /**
     * **Validates: Requirements 6.1**
     *
     * For any search query that returns results containing multiple entity types,
     * every result in a given type group SHALL have an entity type matching that
     * group's type heading.
     */

    // Query generator: mix of realistic prefixes and random strings
    const queryArb = fc.oneof(
      fc.constantFrom(...index).map(e => e.name.slice(0, 3)),
      fc.string({ minLength: 1, maxLength: 10 })
    );

    it('every result in a group matches the group type', () => {
      fc.assert(
        fc.property(
          queryArb,
          (query) => {
            const results = searchEntities(index, query);
            for (const group of results.groups) {
              for (const entry of group.entries) {
                expect(entry.entity.type).toBe(group.type);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Results ranked in descending score order', () => {
    /**
     * **Validates: Requirements 6.2**
     *
     * For any search query producing results, within each type group the sequence
     * of match scores SHALL be monotonically non-increasing (each score >= the next).
     */

    const queryArb = fc.oneof(
      fc.constantFrom(...index).map(e => e.name.slice(0, 3)),
      fc.string({ minLength: 1, maxLength: 10 })
    );

    it('scores are monotonically non-increasing within each group', () => {
      fc.assert(
        fc.property(
          queryArb,
          (query) => {
            const results = searchEntities(index, query);
            for (const group of results.groups) {
              for (let i = 1; i < group.entries.length; i++) {
                expect(group.entries[i - 1].score).toBeGreaterThanOrEqual(group.entries[i].score);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: Result count cap', () => {
    /**
     * **Validates: Requirements 6.3**
     *
     * For any search query against the full index, the total number of returned
     * results SHALL be at most 50.
     */

    const queryArb = fc.oneof(
      fc.constantFrom(...index).map(e => e.name.slice(0, 3)),
      fc.string({ minLength: 1, maxLength: 10 })
    );

    it('total results never exceed 50', () => {
      fc.assert(
        fc.property(
          queryArb,
          (query) => {
            const results = searchEntities(index, query);

            // totalCount reported by the function should be <= 50
            expect(results.totalCount).toBeLessThanOrEqual(50);

            // Sum of all group entries should also be <= 50
            const sumEntries = results.groups.reduce((sum, g) => sum + g.entries.length, 0);
            expect(sumEntries).toBeLessThanOrEqual(50);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Extract description/effect text from an entity based on its type */
function getDescriptionText(entity: SearchableEntity): string {
  const data = entity.displayData;
  switch (data.type) {
    case 'spell':
      return data.effect;
    case 'talent':
      return data.desc;
    case 'skill':
      return data.description;
    case 'career':
      return data.class + ' ' + data.levels.map(l => l.title).join(' ');
    case 'rune':
      return data.description + ' ' + data.effects;
    case 'ritual':
      return data.description;
    case 'condition':
      return data.description + ' ' + data.effects;
    default:
      return '';
  }
}
