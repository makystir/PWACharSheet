import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { SPECIES_DATA } from '../../data/species';
import { getSpeciesGroup, formatHeight, lookupEyeColour, lookupHairColour, getEyeColourOptions, getHairColourOptions, formatVariegatedEyes } from '../personal-details';
import type { SpeciesGroup } from '../../data/personal-details';
import { EYE_COLOUR_TABLE, HAIR_COLOUR_TABLE } from '../../data/personal-details';

// ═══════════════════════════════════════════════════════════════════════════════
// Feature: random-personal-details, Property 1: Species Group Mapping Correctness
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Expected mappings based on implementation ──────────────────────────────
// The species helpers in career-eligibility.ts define these rules:
// - isDwarfSpecies: species.toLowerCase().includes('dwarf')
// - isHighElfSpecies: species === 'High Elf' || species.startsWith('High Elves')
// - isWoodElfSpecies: species === 'Wood Elf'
// - isHalflingSpecies: species.toLowerCase().includes('halfling')
// - isHumanSpecies: species.toLowerCase().includes('human') || species.toLowerCase().includes('reiklander')
// - isOgreSpecies: species === 'Ogre'

// ─── Generators ─────────────────────────────────────────────────────────────

/** All species keys from SPECIES_DATA */
const allSpeciesKeys = Object.keys(SPECIES_DATA);

/** Arbitrary species key from SPECIES_DATA */
const arbSpeciesKey = fc.constantFrom(...allSpeciesKeys);

/** Species keys that contain "dwarf" (case-insensitive) */
const dwarfKeys = allSpeciesKeys.filter(k => k.toLowerCase().includes('dwarf'));
const arbDwarfKey = fc.constantFrom(...dwarfKeys);

/** Species keys that match High Elf rules */
const highElfKeys = allSpeciesKeys.filter(
  k => k === 'High Elf' || k.startsWith('High Elves')
);
const arbHighElfKey = fc.constantFrom(...highElfKeys);

/** Halfling keys */
const halflingKeys = allSpeciesKeys.filter(k => k.toLowerCase().includes('halfling'));
const arbHalflingKey = fc.constantFrom(...halflingKeys);

/** Human keys */
const humanKeys = allSpeciesKeys.filter(
  k => k.toLowerCase().includes('human') || k.toLowerCase().includes('reiklander')
);
const arbHumanKey = fc.constantFrom(...humanKeys);

/** Generate strings that should NOT match any species rule */
const speciesKeywords = ['dwarf', 'elf', 'halfling', 'human', 'reiklander', 'ogre', 'high elves'];
const arbUnknownString = fc.string({ minLength: 0, maxLength: 50 }).filter(s => {
  const lower = s.toLowerCase();
  return !speciesKeywords.some(kw => lower.includes(kw)) && s !== 'Wood Elf' && s !== 'Ogre';
});

/** Generate case variations of a known Dwarf species string */
const arbDwarfVariation = fc.constantFrom(...dwarfKeys).chain(key =>
  fc.constantFrom(key, key.toLowerCase(), key.toUpperCase(), `${key} variant`)
);

/** Generate case variations of Human/Reiklander species strings */
const arbHumanVariation = fc.constantFrom(
  'Human / Reiklander',
  'human',
  'HUMAN',
  'Human',
  'Some human kind',
  'Reiklander',
  'reiklander',
  'REIKLANDER'
);

/** Generate case variations of Halfling species strings */
const arbHalflingVariation = fc.constantFrom(
  'Halfling',
  'halfling',
  'HALFLING',
  'Halfling (Moot)',
  'A halfling variant'
);

// ─── Helper: determine expected group from species string ───────────────────

function expectedGroup(species: string): SpeciesGroup | undefined {
  // Order matters — matches getSpeciesGroup priority
  if (species === 'High Elf' || species.startsWith('High Elves')) return 'High_Elf';
  if (species === 'Wood Elf') return 'Wood_Elf';
  if (species.toLowerCase().includes('dwarf')) return 'Dwarf';
  if (species.toLowerCase().includes('halfling')) return 'Halfling';
  if (species.toLowerCase().includes('human') || species.toLowerCase().includes('reiklander')) return 'Human';
  if (species === 'Ogre') return 'Ogre';
  return undefined;
}

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: random-personal-details', () => {
  describe('Property 1: Species Group Mapping Correctness', () => {
    /**
     * **Validates: Requirements 1.2, 1.4, 1.7, 1.8**
     *
     * For any known species key from SPECIES_DATA, getSpeciesGroup returns the
     * correct SpeciesGroup based on the species detection rules.
     */
    it('maps all known SPECIES_DATA keys to their correct group', () => {
      fc.assert(
        fc.property(arbSpeciesKey, (species) => {
          const result = getSpeciesGroup(species);
          const expected = expectedGroup(species);
          expect(result).toBe(expected);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 1.2, 1.4**
     *
     * For any Dwarf species string (case-insensitive "dwarf" substring),
     * getSpeciesGroup returns 'Dwarf'.
     */
    it('maps dwarf species strings (case variations) to Dwarf', () => {
      fc.assert(
        fc.property(arbDwarfVariation, (species) => {
          const result = getSpeciesGroup(species);
          expect(result).toBe('Dwarf');
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 1.2, 1.4**
     *
     * For any High Elf species key, getSpeciesGroup returns 'High_Elf'.
     */
    it('maps High Elf species strings to High_Elf', () => {
      fc.assert(
        fc.property(arbHighElfKey, (species) => {
          const result = getSpeciesGroup(species);
          expect(result).toBe('High_Elf');
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 1.2, 1.4**
     *
     * For any Human/Reiklander species string (case-insensitive),
     * getSpeciesGroup returns 'Human'.
     */
    it('maps Human/Reiklander species strings (case variations) to Human', () => {
      fc.assert(
        fc.property(arbHumanVariation, (species) => {
          const result = getSpeciesGroup(species);
          expect(result).toBe('Human');
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 1.2, 1.4**
     *
     * For any Halfling species string (case-insensitive),
     * getSpeciesGroup returns 'Halfling'.
     */
    it('maps Halfling species strings (case variations) to Halfling', () => {
      fc.assert(
        fc.property(arbHalflingVariation, (species) => {
          const result = getSpeciesGroup(species);
          expect(result).toBe('Halfling');
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 1.7, 1.8**
     *
     * For any string that does not contain any species keywords and is not
     * an exact match for Wood Elf or Ogre, getSpeciesGroup returns undefined.
     */
    it('returns undefined for unknown species strings', () => {
      fc.assert(
        fc.property(arbUnknownString, (species) => {
          const result = getSpeciesGroup(species);
          expect(result).toBeUndefined();
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 1.2, 1.4**
     *
     * Wood Elf exact string maps to Wood_Elf, Ogre exact string maps to Ogre.
     */
    it('maps exact "Wood Elf" to Wood_Elf and exact "Ogre" to Ogre', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Wood Elf', 'Ogre'),
          (species) => {
            const result = getSpeciesGroup(species);
            const expected = species === 'Wood Elf' ? 'Wood_Elf' : 'Ogre';
            expect(result).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 1.7, 1.8**
     *
     * Edge cases: empty string returns undefined.
     */
    it('returns undefined for empty string', () => {
      fc.assert(
        fc.property(fc.constant(''), (species) => {
          const result = getSpeciesGroup(species);
          expect(result).toBeUndefined();
        }),
        { numRuns: 1 }
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Feature: random-personal-details, Property 3: Height Formatting Invariant
// ═══════════════════════════════════════════════════════════════════════════════

/** Arbitrary positive integer representing total inches (realistic height range) */
const arbTotalInches = fc.integer({ min: 1, max: 200 });

describe('Feature: random-personal-details, Property 3: Height Formatting Invariant', () => {
  /**
   * **Validates: Requirements 4.8, 4.9**
   *
   * Property 3: Height Formatting Invariant — for any positive integer
   * totalInches, formatHeight produces a string in the format X'Y" where
   * Y is always in the range 0–11 and X * 12 + Y === totalInches.
   */
  it('formatHeight produces valid X\'Y" format with Y in [0,11] and X*12+Y === totalInches', () => {
    fc.assert(
      fc.property(arbTotalInches, (totalInches) => {
        const result = formatHeight(totalInches);

        // Verify format matches pattern X'Y"
        const match = result.match(/^(\d+)'(\d+)"$/);
        expect(match).not.toBeNull();

        const feet = Number(match![1]);
        const inches = Number(match![2]);

        // Inches portion must be in range [0, 11]
        expect(inches).toBeGreaterThanOrEqual(0);
        expect(inches).toBeLessThanOrEqual(11);

        // Total must reconstruct correctly
        expect(feet * 12 + inches).toBe(totalInches);
      }),
      { numRuns: 100 }
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Feature: random-personal-details, Property 6: Variegated Eye Colour Formatting
// ═══════════════════════════════════════════════════════════════════════════════

/** Arbitrary non-empty string representing an eye colour */
const arbEyeColour = fc.string({ minLength: 1 });

describe('Feature: random-personal-details, Property 6: Variegated Eye Colour Formatting', () => {
  /**
   * **Validates: Requirements 7.2, 7.3, 7.5**
   *
   * Property 6: Variegated Eye Colour Formatting — for any two non-empty eye
   * colour strings, formatVariegatedEyes returns the single colour when both
   * strings are identical, or "{first} flecked with {second}" when they differ.
   */
  it('returns single colour when both inputs are identical', () => {
    fc.assert(
      fc.property(arbEyeColour, (colour) => {
        const result = formatVariegatedEyes(colour, colour);
        expect(result).toBe(colour);
      }),
      { numRuns: 100 }
    );
  });

  it('returns "{first} flecked with {second}" when inputs differ', () => {
    fc.assert(
      fc.property(
        arbEyeColour,
        arbEyeColour,
        (first, second) => {
          fc.pre(first !== second);
          const result = formatVariegatedEyes(first, second);
          expect(result).toBe(`${first} flecked with ${second}`);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// Feature: random-personal-details, Property 5: Colour Table Lookup Completeness
// ═══════════════════════════════════════════════════════════════════════════════

/** All 6 species groups */
const ALL_SPECIES_GROUPS: SpeciesGroup[] = ['Human', 'Dwarf', 'Halfling', 'High_Elf', 'Wood_Elf', 'Ogre'];

/** Arbitrary species group */
const arbSpeciesGroup = fc.constantFrom(...ALL_SPECIES_GROUPS);

/** Arbitrary valid 2d10 sum (range 2–20) */
const arb2d10Sum = fc.integer({ min: 2, max: 20 });

describe('Feature: random-personal-details, Property 5: Colour Table Lookup Completeness', () => {
  /**
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7**
   *
   * Property 5: Colour Table Lookup Completeness — for any species group and
   * any 2d10 sum (integer in range 2–20), lookupEyeColour and lookupHairColour
   * each return a non-empty string that is a member of the corresponding species
   * column in the colour table.
   */
  it('lookupEyeColour returns a non-empty string from the eye colour table for every species and roll', () => {
    fc.assert(
      fc.property(arbSpeciesGroup, arb2d10Sum, (group, roll) => {
        const result = lookupEyeColour(group, roll);

        // Must be a non-empty string
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);

        // Must be a value present in the eye colour table for this species
        const validValues = EYE_COLOUR_TABLE[group].map(entry => entry.value);
        expect(validValues).toContain(result);
      }),
      { numRuns: 100 }
    );
  });

  it('lookupHairColour returns a non-empty string from the hair colour table for every species and roll', () => {
    fc.assert(
      fc.property(arbSpeciesGroup, arb2d10Sum, (group, roll) => {
        const result = lookupHairColour(group, roll);

        // Must be a non-empty string
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);

        // Must be a value present in the hair colour table for this species
        const validValues = HAIR_COLOUR_TABLE[group].map(entry => entry.value);
        expect(validValues).toContain(result);
      }),
      { numRuns: 100 }
    );
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// Feature: random-personal-details, Property 7: Dropdown Options Deduplication
// ═══════════════════════════════════════════════════════════════════════════════

describe('Feature: random-personal-details, Property 7: Dropdown Options Deduplication', () => {
  /**
   * **Validates: Requirements 9.1, 9.2**
   *
   * For any species group, getEyeColourOptions returns an array with no
   * duplicate entries, where every entry appears in the eye colour table
   * for that species, and every unique value from the table appears in the array.
   */
  it('getEyeColourOptions returns deduplicated, complete options for any species group', () => {
    fc.assert(
      fc.property(arbSpeciesGroup, (group) => {
        const options = getEyeColourOptions(group);

        // No duplicates: Set size equals array length
        expect(new Set(options).size).toBe(options.length);

        // Every option appears as a value in the eye colour table for this species
        const tableValues = EYE_COLOUR_TABLE[group].map(entry => entry.value);
        for (const option of options) {
          expect(tableValues).toContain(option);
        }

        // Every unique value from the table appears in the options (completeness)
        const uniqueTableValues = [...new Set(tableValues)];
        for (const value of uniqueTableValues) {
          expect(options).toContain(value);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 9.1, 9.2**
   *
   * For any species group, getHairColourOptions returns an array with no
   * duplicate entries, where every entry appears in the hair colour table
   * for that species, and every unique value from the table appears in the array.
   */
  it('getHairColourOptions returns deduplicated, complete options for any species group', () => {
    fc.assert(
      fc.property(arbSpeciesGroup, (group) => {
        const options = getHairColourOptions(group);

        // No duplicates: Set size equals array length
        expect(new Set(options).size).toBe(options.length);

        // Every option appears as a value in the hair colour table for this species
        const tableValues = HAIR_COLOUR_TABLE[group].map(entry => entry.value);
        for (const option of options) {
          expect(tableValues).toContain(option);
        }

        // Every unique value from the table appears in the options (completeness)
        const uniqueTableValues = [...new Set(tableValues)];
        for (const value of uniqueTableValues) {
          expect(options).toContain(value);
        }
      }),
      { numRuns: 100 }
    );
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// Feature: random-personal-details, Property 8: Dwarf Alternate Table Regional Modifier
// ═══════════════════════════════════════════════════════════════════════════════

import { lookupDwarfAlternateTable, getDwarfRegionalModifier } from '../personal-details';
import { DWARF_ALTERNATE_TABLE } from '../../data/personal-details';

/** Arbitrary d100 value (1–100) */
const arbD100 = fc.integer({ min: 1, max: 100 });

/** Dwarf species variants with known regional modifiers */
const DWARF_VARIANTS = [
  'Dwarfs (Norse)',            // -5 modifier
  'Dwarfs (Karak Hirn/Black Mountains)',  // +5 modifier
  'Dwarfs (Karak Izor/The Vaults)',       // +5 modifier
  'Dwarfs (Karaz-a-Karak)',   // 0 modifier
  'Dwarfs (Barak Varr)',      // 0 modifier
  'Dwarfs (Karak Azul)',      // 0 modifier
  'Dwarfs (Karak Eight Peaks)', // 0 modifier
  'Dwarfs (Karak Kadrin)',    // 0 modifier
  'Dwarfs (Zhufbar)',         // 0 modifier
  'Dwarfs (Karak Norn/Grey Mountains)',   // 0 modifier
  'Dwarfs (Imperial)',        // 0 modifier
  'Dwarf',                    // 0 modifier
];

/** Arbitrary Dwarf variant */
const arbDwarfVariant = fc.constantFrom(...DWARF_VARIANTS);

/** Helper: find the row in DWARF_ALTERNATE_TABLE matching a given d100 value */
function findRow(roll: number) {
  return DWARF_ALTERNATE_TABLE.find(row => roll >= row.min && roll <= row.max)!;
}

describe('Feature: random-personal-details, Property 8: Dwarf Alternate Table Regional Modifier', () => {
  /**
   * **Validates: Requirements 10.2, 10.3, 10.4, 11.2**
   *
   * Property 8: For any d100 value (1–100) and any Dwarf species variant,
   * lookupDwarfAlternateTable applies the regional modifier (Norse: -5,
   * southern holds: +5, others: 0) to the lookup index for hair and eye
   * colour only (clamped to 1–100), while always using the unmodified d100
   * value for the distinguishing feature lookup.
   */
  it('applies regional modifier to hair/eye lookup but uses unmodified roll for feature', () => {
    fc.assert(
      fc.property(arbD100, arbDwarfVariant, (roll, variant) => {
        const result = lookupDwarfAlternateTable(roll, variant);
        const modifier = getDwarfRegionalModifier(variant);

        // Compute expected modified roll for hair/eye (clamped to [1, 100])
        const modifiedRoll = Math.max(1, Math.min(100, roll + modifier));

        // Find expected rows
        const expectedHairEyeRow = findRow(modifiedRoll);
        const expectedFeatureRow = findRow(roll);

        // Hair and eyes come from the modified roll row
        expect(result.hair).toBe(expectedHairEyeRow.hair);
        expect(result.eyes).toBe(expectedHairEyeRow.eyes);

        // Feature comes from the unmodified roll row
        expect(result.feature).toBe(expectedFeatureRow.feature);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 10.3, 10.4**
   *
   * The regional modifier is correct for each variant category:
   * Norse = -5, southern holds = +5, all others = 0.
   */
  it('getDwarfRegionalModifier returns correct modifier per variant', () => {
    fc.assert(
      fc.property(arbDwarfVariant, (variant) => {
        const modifier = getDwarfRegionalModifier(variant);
        const lower = variant.toLowerCase();

        if (lower.includes('norse')) {
          expect(modifier).toBe(-5);
        } else if (lower.includes('karak hirn') || lower.includes('black mountains') ||
                   lower.includes('karak izor') || lower.includes('the vaults')) {
          expect(modifier).toBe(5);
        } else {
          expect(modifier).toBe(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 10.3, 10.4**
   *
   * The modified roll is always clamped to [1, 100], meaning hair/eye
   * results always come from a valid table row regardless of modifier.
   */
  it('modified roll for hair/eye is always clamped to [1, 100]', () => {
    fc.assert(
      fc.property(arbD100, arbDwarfVariant, (roll, variant) => {
        const modifier = getDwarfRegionalModifier(variant);
        const modifiedRoll = Math.max(1, Math.min(100, roll + modifier));

        // The clamped modified roll must be within table bounds
        expect(modifiedRoll).toBeGreaterThanOrEqual(1);
        expect(modifiedRoll).toBeLessThanOrEqual(100);

        // And a corresponding row must exist
        const row = findRow(modifiedRoll);
        expect(row).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });
});
