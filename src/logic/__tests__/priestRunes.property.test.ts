import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ANCESTOR_GODS, DEITY_REGISTRY } from '../../data/deityRunes';
import type { AncestorGod } from '../../data/deityRunes';
import { RUNE_CATALOGUE } from '../../data/runes';
import { getPriestAvailableRunes, getRestrictedRunes, getDeityChangeWarnings, shouldApplyDeityFilter, isHighPriestLevel, isPriestCareer } from '../priestRunes';
import { canLearnRune, getRuneById } from '../runes';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character } from '../../types/character';

// Feature: dwarf-runic-magic, Property 2: Registry Integrity
// **Validates: Requirements 2.9**

describe('Property 2: Registry Integrity', () => {
  const catalogueIds = new Set(RUNE_CATALOGUE.map(r => r.id));

  it('for any deity in DEITY_REGISTRY, every runeId in its access list exists in RUNE_CATALOGUE', () => {
    // Use fc.constantFrom to pick a deity entry, then verify all its rune IDs
    fc.assert(
      fc.property(
        fc.constantFrom(...DEITY_REGISTRY),
        (entry) => {
          for (const runeId of entry.runeIds) {
            expect(catalogueIds.has(runeId)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('for any deity with a highPriestBonus, the bonus rune ID exists in RUNE_CATALOGUE', () => {
    const deitiesWithBonus = DEITY_REGISTRY.filter(e => e.highPriestBonus != null);

    fc.assert(
      fc.property(
        fc.constantFrom(...deitiesWithBonus),
        (entry) => {
          expect(catalogueIds.has(entry.highPriestBonus!)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: dwarf-runic-magic, Property 4: No-Deity Fallback
// **Validates: Requirements 3.2**

describe('Property 4: No-Deity Fallback', () => {
  const allCatalogueIds = RUNE_CATALOGUE.map(r => r.id).sort();

  it('getPriestAvailableRunes with null deity returns ALL rune IDs from RUNE_CATALOGUE regardless of isHighPriest', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (isHighPriest) => {
          const result = getPriestAvailableRunes(null, isHighPriest);
          expect(result.sort()).toEqual(allCatalogueIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getPriestAvailableRunes with undefined deity returns ALL rune IDs from RUNE_CATALOGUE regardless of isHighPriest', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (isHighPriest) => {
          const result = getPriestAvailableRunes(undefined, isHighPriest);
          expect(result.sort()).toEqual(allCatalogueIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getRestrictedRunes with null deity returns empty array for any knownRunes', () => {
    const allRuneIds = RUNE_CATALOGUE.map(r => r.id);

    fc.assert(
      fc.property(
        fc.subarray(allRuneIds),
        (knownRunes) => {
          const result = getRestrictedRunes(knownRunes, null);
          expect(result).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: dwarf-runic-magic, Property 3: Deity-Based Rune Filtering
// **Validates: Requirements 3.1**

describe('Property 3: Deity-Based Rune Filtering', () => {
  it('getPriestAvailableRunes output matches registry exactly for any deity and isHighPriest combination', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ANCESTOR_GODS),
        fc.boolean(),
        (deity, isHighPriest) => {
          const result = getPriestAvailableRunes(deity, isHighPriest);
          const entry = DEITY_REGISTRY.find(e => e.god === deity)!;

          // Build the expected set of rune IDs
          const expectedIds = new Set(entry.runeIds);
          if (isHighPriest && entry.highPriestBonus) {
            expectedIds.add(entry.highPriestBonus);
          }

          const resultSet = new Set(result);

          // Verify: output contains exactly the deity's runeIds
          for (const runeId of entry.runeIds) {
            expect(resultSet.has(runeId)).toBe(true);
          }

          // Verify: if isHighPriest and highPriestBonus is defined, bonus is included
          if (isHighPriest && entry.highPriestBonus) {
            expect(resultSet.has(entry.highPriestBonus)).toBe(true);
          }

          // Verify: if not isHighPriest or no bonus defined, bonus is NOT included
          if (!isHighPriest && entry.highPriestBonus) {
            expect(resultSet.has(entry.highPriestBonus)).toBe(false);
          }

          // Verify: no extra rune IDs in the result (no extras beyond expected)
          for (const runeId of result) {
            expect(expectedIds.has(runeId)).toBe(true);
          }

          // Verify: exact size match (no duplicates or missing)
          expect(resultSet.size).toBe(expectedIds.size);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: dwarf-runic-magic, Property 7: Runesmith Unaffected by Deity Filter
// **Validates: Requirements 4.3**

describe('Property 7: Runesmith Unaffected by Deity Filter', () => {
  const RUNESMITH_TITLES = ['Apprentice Runesmith', 'Runesmith', 'Master Runesmith', 'Runelord'] as const;

  function makeRunesmith(overrides: Partial<Character>): Character {
    return { ...BLANK_CHARACTER, species: 'Dwarf', ...overrides };
  }

  it('shouldApplyDeityFilter returns false for all Runesmith career titles regardless of patronDeity', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...RUNESMITH_TITLES),
        fc.option(fc.constantFrom(...ANCESTOR_GODS), { nil: undefined }),
        (careerTitle, patronDeity) => {
          const character = makeRunesmith({
            career: careerTitle,
            careerLevel: careerTitle,
            patronDeity: patronDeity as AncestorGod | undefined,
          });
          expect(shouldApplyDeityFilter(character)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('shouldApplyDeityFilter returns false when career is "Runesmith" and careerLevel varies across all titles', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...RUNESMITH_TITLES),
        fc.option(fc.constantFrom(...ANCESTOR_GODS), { nil: undefined }),
        (careerLevel, patronDeity) => {
          const character = makeRunesmith({
            career: 'Runesmith',
            careerLevel,
            patronDeity: patronDeity as AncestorGod | undefined,
          });
          expect(shouldApplyDeityFilter(character)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('shouldApplyDeityFilter returns false for Runesmith even with patronDeity explicitly set to each god', () => {
    for (const god of ANCESTOR_GODS) {
      for (const title of RUNESMITH_TITLES) {
        const character = makeRunesmith({
          career: title,
          careerLevel: title,
          patronDeity: god,
        });
        expect(shouldApplyDeityFilter(character)).toBe(false);
      }
    }
  });
});


// Feature: dwarf-runic-magic, Property 6: High Priest Bonus Inclusion and Exclusion
// **Validates: Requirements 3.4, 3.5, 6.1, 6.2, 6.4**

describe('Property 6: High Priest Bonus Inclusion and Exclusion', () => {
  // All priest career level titles grouped by level number
  const PRIEST_CAREER_LEVELS: { level: number; title: string }[] = [
    { level: 1, title: 'Initiate of Gazul' },
    { level: 1, title: 'Initiate of Morgrim' },
    { level: 1, title: 'Initiate of Valaya' },
    { level: 2, title: 'Doom Priest' },
    { level: 2, title: 'Forge Priest' },
    { level: 2, title: 'Hearth Priest' },
    { level: 3, title: 'High Doom Priest' },
    { level: 3, title: 'High Forge Priest' },
    { level: 3, title: 'High Hearth Priest' },
    { level: 4, title: 'Arch Doom Priest' },
    { level: 4, title: 'Arch Forge Priest' },
    { level: 4, title: 'Arch Hearth Priest' },
  ];

  it('bonus rune is included if and only if level >= 3 and deity has a bonus defined', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ANCESTOR_GODS),
        fc.constantFrom(...PRIEST_CAREER_LEVELS),
        (deity, careerEntry) => {
          const { level, title: careerLevel } = careerEntry;

          // Determine if this is a high priest level using the implementation
          // We need a career name to pass; derive from the careerLevel title
          const career = careerLevel; // isPriestCareer accepts individual titles
          const isHighPriest = isHighPriestLevel(career, careerLevel);

          // Get available runes for this deity + high priest status
          const availableRunes = getPriestAvailableRunes(deity, isHighPriest);
          const availableSet = new Set(availableRunes);

          // Find the deity's registry entry
          const entry = DEITY_REGISTRY.find(e => e.god === deity)!;

          if (entry.highPriestBonus) {
            if (level >= 3) {
              // High priest (level 3/4): bonus MUST be included
              expect(availableSet.has(entry.highPriestBonus)).toBe(true);
            } else {
              // Not high priest (level 1/2): bonus MUST NOT be included
              expect(availableSet.has(entry.highPriestBonus)).toBe(false);
            }
          } else {
            // Deity has no highPriestBonus: no additional runes added regardless of level
            // Available runes should be exactly the deity's runeIds
            expect(availableRunes.sort()).toEqual([...entry.runeIds].sort());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isHighPriestLevel correctly identifies level 3+ priest career titles', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PRIEST_CAREER_LEVELS),
        (careerEntry) => {
          const { level, title } = careerEntry;
          const result = isHighPriestLevel(title, title);

          if (level >= 3) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: dwarf-runic-magic, Property 5: Rejection of Non-Permitted Runes
// **Validates: Requirements 3.3**

describe('Property 5: Rejection of Non-Permitted Runes', () => {
  /**
   * Helper: create a priest character with a given deity, appropriate talents, and sufficient XP.
   * Uses "Initiate of Gazul" (level 1 of Doom Priest) as a generic priest title.
   * Assigns both Rune Magic and Master Rune Magic talents so both standard and master runes
   * pass the talent prerequisite check — we want to isolate the deity restriction.
   */
  function makePriestCharacter(deity: AncestorGod): Character {
    return {
      ...BLANK_CHARACTER,
      species: 'Dwarf',
      career: 'Doom Priest',
      careerLevel: 'Doom Priest',
      patronDeity: deity,
      xpCur: 9999, // Sufficient XP to learn any rune
      talents: [
        { n: 'Rune Magic', a: 0 },
        { n: 'Master Rune Magic', a: 0 },
      ],
      knownRunes: [],
    };
  }

  /**
   * For a given deity, returns the set of all rune IDs from RUNE_CATALOGUE that are
   * NOT in the deity's access list (including high priest bonus).
   */
  function getNonPermittedRuneIds(deity: AncestorGod): string[] {
    const entry = DEITY_REGISTRY.find(e => e.god === deity)!;
    const accessSet = new Set(entry.runeIds);
    if (entry.highPriestBonus) {
      accessSet.add(entry.highPriestBonus);
    }
    return RUNE_CATALOGUE.map(r => r.id).filter(id => !accessSet.has(id));
  }

  it('canLearnRune returns canLearn: false for any (deity, runeId) pair where runeId is NOT in the deity access list', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ANCESTOR_GODS).chain((deity) => {
          const nonPermitted = getNonPermittedRuneIds(deity);
          // All deities have at least some non-permitted runes since the catalogue is large
          return fc.constantFrom(...nonPermitted).map(runeId => ({ deity, runeId }));
        }),
        ({ deity, runeId }) => {
          const character = makePriestCharacter(deity);
          const result = canLearnRune(runeId, character);

          // Must be rejected
          expect(result.canLearn).toBe(false);

          // Error must contain the rune's name
          const rune = RUNE_CATALOGUE.find(r => r.id === runeId)!;
          expect(result.error).toContain(rune.name);

          // Error must contain the deity's name
          expect(result.error).toContain(deity);
        }
      ),
      { numRuns: 200 }
    );
  });
});


// Feature: dwarf-runic-magic, Property 10: Restricted Rune Identification
// **Validates: Requirements 5.4, 5.5, 6.3**

describe('Property 10: Restricted Rune Identification', () => {
  const allRuneIds = RUNE_CATALOGUE.map(r => r.id);

  it('getRestrictedRunes returns exactly the known runes NOT in deity access list (accounting for high priest bonus)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ANCESTOR_GODS),
        fc.boolean(),
        fc.subarray(allRuneIds),
        (deity, isHighPriest, knownRunes) => {
          const restricted = getRestrictedRunes(knownRunes, deity, isHighPriest);

          // Build expected access set from the deity registry
          const entry = DEITY_REGISTRY.find(e => e.god === deity)!;
          const accessSet = new Set(entry.runeIds);
          if (isHighPriest && entry.highPriestBonus) {
            accessSet.add(entry.highPriestBonus);
          }

          // Expected restricted runes: known runes NOT in access set
          const expectedRestricted = knownRunes.filter(id => !accessSet.has(id));

          // Verify restricted set equals exactly those known runes not in the access set
          expect(restricted.sort()).toEqual(expectedRestricted.sort());
        }
      ),
      { numRuns: 200 }
    );
  });

  it('getDeityChangeWarnings produces warnings for exactly the known runes not in the new deity access list (including bonus)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ANCESTOR_GODS),
        fc.subarray(allRuneIds),
        (newDeity, knownRunes) => {
          const warnings = getDeityChangeWarnings(knownRunes, newDeity);

          // Build expected access set for the new deity (including high priest bonus)
          const entry = DEITY_REGISTRY.find(e => e.god === newDeity)!;
          const accessSet = new Set(entry.runeIds);
          if (entry.highPriestBonus) {
            accessSet.add(entry.highPriestBonus);
          }

          // Expected warnings: names of known runes that are NOT in the new deity's access set
          const expectedWarningNames: string[] = [];
          for (const runeId of knownRunes) {
            if (!accessSet.has(runeId)) {
              const rune = getRuneById(runeId);
              if (rune) {
                expectedWarningNames.push(rune.name);
              }
            }
          }

          // Verify warnings list matches exactly
          expect(warnings.sort()).toEqual(expectedWarningNames.sort());
        }
      ),
      { numRuns: 200 }
    );
  });
});


// Feature: dwarf-runic-magic, Property 9: Deity Selector Visibility
// **Validates: Requirements 5.1**

describe('Property 9: Deity Selector Visibility', () => {
  // Known species in the app
  const KNOWN_SPECIES = ['Human / Reiklander', 'Dwarf', 'Halfling', 'High Elf', 'Wood Elf'];

  // Known priest careers and their level titles
  const PRIEST_CAREERS = [
    'Doom Priest', 'Forge Priest', 'Hearth Priest',
    'Initiate of Gazul', 'Initiate of Morgrim', 'Initiate of Valaya',
    'High Doom Priest', 'High Forge Priest', 'High Hearth Priest',
    'Arch Doom Priest', 'Arch Forge Priest', 'Arch Hearth Priest',
  ];

  // Non-priest careers for testing
  const NON_PRIEST_CAREERS = [
    'Warrior', 'Wizard', 'Thief', 'Ranger', 'Runesmith', 'Master Runesmith',
    'Apprentice Runesmith', 'Runelord', 'Soldier', 'Knight', 'Noble',
  ];

  /**
   * Generator for species: mix of known species and arbitrary strings
   */
  const speciesArb = fc.oneof(
    fc.constantFrom(...KNOWN_SPECIES),
    fc.string({ minLength: 1, maxLength: 20 })
  );

  /**
   * Generator for career: mix of priest careers, non-priest careers, and arbitrary strings
   */
  const careerArb = fc.oneof(
    fc.constantFrom(...PRIEST_CAREERS),
    fc.constantFrom(...NON_PRIEST_CAREERS),
    fc.string({ minLength: 1, maxLength: 30 })
  );

  it('shouldApplyDeityFilter returns true iff species is Dwarf AND career is a priest career', () => {
    fc.assert(
      fc.property(
        speciesArb,
        careerArb,
        (species, career) => {
          const character: Character = {
            ...BLANK_CHARACTER,
            species,
            career,
            careerLevel: career, // Use career as careerLevel too for consistency
          };

          const result = shouldApplyDeityFilter(character);
          const expected = species === 'Dwarf' && isPriestCareer(career);

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('shouldApplyDeityFilter returns false for all non-Dwarf species regardless of career', () => {
    const nonDwarfSpecies = fc.oneof(
      fc.constantFrom(...KNOWN_SPECIES.filter(s => s !== 'Dwarf')),
      fc.string({ minLength: 1, maxLength: 20 }).filter(s => s !== 'Dwarf')
    );

    fc.assert(
      fc.property(
        nonDwarfSpecies,
        fc.constantFrom(...PRIEST_CAREERS),
        (species, career) => {
          const character: Character = {
            ...BLANK_CHARACTER,
            species,
            career,
            careerLevel: career,
          };

          expect(shouldApplyDeityFilter(character)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('shouldApplyDeityFilter returns false for Dwarf species with non-priest careers', () => {
    const nonPriestCareerArb = fc.oneof(
      fc.constantFrom(...NON_PRIEST_CAREERS),
      fc.string({ minLength: 1, maxLength: 30 }).filter(s => !isPriestCareer(s))
    );

    fc.assert(
      fc.property(
        nonPriestCareerArb,
        (career) => {
          const character: Character = {
            ...BLANK_CHARACTER,
            species: 'Dwarf',
            career,
            careerLevel: career,
          };

          expect(shouldApplyDeityFilter(character)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('shouldApplyDeityFilter returns true for Dwarf species with any priest career title', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PRIEST_CAREERS),
        (career) => {
          const character: Character = {
            ...BLANK_CHARACTER,
            species: 'Dwarf',
            career,
            careerLevel: career,
          };

          expect(shouldApplyDeityFilter(character)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
