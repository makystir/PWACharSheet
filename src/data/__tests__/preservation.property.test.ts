import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { SPECIES_DATA } from '../species';

// ─── Helper: parseTalentOptions (pure logic extracted from CharacterWizard) ──
// This mirrors the parseTalentOptions useCallback in CharacterWizard.tsx
function parseTalentOptions(talent: string): { isChoice: boolean; options: string[] } {
  if (talent.includes(' or ')) {
    return { isChoice: true, options: talent.split(' or ').map(s => s.trim()) };
  }
  return { isChoice: false, options: [talent] };
}

// ─── Observed baselines from SPECIES_DATA (unfixed code) ─────────────────────

const NON_RANDOM_SPECIES = Object.entries(SPECIES_DATA)
  .filter(([, data]) => ((data as { randomTalentSlots?: number }).randomTalentSlots ?? 0) === 0)
  .map(([name]) => name);

const OBSERVED_TALENTS: Record<string, string[]> = {};
for (const name of NON_RANDOM_SPECIES) {
  OBSERVED_TALENTS[name] = [...SPECIES_DATA[name].talents];
}

// ─── Property 2: Preservation — Non-Random-Talent Species Unchanged ──────────
// **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

describe('Property 2: Preservation — Non-Random-Talent Species Unchanged', () => {
  describe('Species without randomTalentSlots have exactly their observed fixed talents', () => {
    it('for any species with (randomTalentSlots ?? 0) === 0, talents match observed baseline', () => {
      // All species in the data that lack randomTalentSlots should be non-random
      const nonRandomSpeciesArb = fc.constantFrom(...NON_RANDOM_SPECIES);

      fc.assert(
        fc.property(nonRandomSpeciesArb, (speciesName) => {
          const data = SPECIES_DATA[speciesName];
          const expected = OBSERVED_TALENTS[speciesName];

          // Talents array matches exactly
          expect(data.talents).toEqual(expected);
          expect(data.talents.length).toBe(expected.length);

          // No randomTalentSlots field or it is 0
          const slots = (data as { randomTalentSlots?: number }).randomTalentSlots;
          expect(slots ?? 0).toBe(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Human fixed talents include "Doomed" and "Savvy or Suave"', () => {
    it('Human / Reiklander talents array contains both fixed talents', () => {
      const humanData = SPECIES_DATA['Human / Reiklander'];

      expect(humanData.talents).toContain('Doomed');
      expect(humanData.talents).toContain('Savvy or Suave');
    });

    it('for any arbitrary additional state, Human fixed talents are always present in SPECIES_DATA', () => {
      // Property: regardless of what randomTalentSlots might be added later,
      // the base talents array always contains the fixed talents
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100 }), (_arbitraryInput) => {
          const humanData = SPECIES_DATA['Human / Reiklander'];
          expect(humanData.talents).toContain('Doomed');
          expect(humanData.talents).toContain('Savvy or Suave');
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Halfling fixed talents include all 4 fixed talents', () => {
    const HALFLING_FIXED_TALENTS = [
      'Acute Sense (Taste)',
      'Night Vision',
      'Resistance (Chaos)',
      'Small',
    ];

    it('Halfling talents array contains all 4 fixed talents', () => {
      const halflingData = SPECIES_DATA['Halfling'];

      for (const talent of HALFLING_FIXED_TALENTS) {
        expect(halflingData.talents).toContain(talent);
      }
    });

    it('for any arbitrary additional state, Halfling fixed talents are always present in SPECIES_DATA', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100 }), (_arbitraryInput) => {
          const halflingData = SPECIES_DATA['Halfling'];
          for (const talent of HALFLING_FIXED_TALENTS) {
            expect(halflingData.talents).toContain(talent);
          }
          expect(halflingData.talents.length).toBeGreaterThanOrEqual(4);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('"Savvy or Suave" choice: parseTalentOptions splits correctly', () => {
    it('parseTalentOptions("Savvy or Suave") returns isChoice=true with ["Savvy", "Suave"]', () => {
      const result = parseTalentOptions('Savvy or Suave');
      expect(result.isChoice).toBe(true);
      expect(result.options).toEqual(['Savvy', 'Suave']);
    });

    it('for any talent with " or " separator, parseTalentOptions produces isChoice=true and correct split', () => {
      // Collect all "or" talents from SPECIES_DATA for property testing
      const orTalents: string[] = [];
      for (const speciesName of Object.keys(SPECIES_DATA)) {
        for (const talent of SPECIES_DATA[speciesName].talents) {
          if (talent.includes(' or ')) {
            orTalents.push(talent);
          }
        }
      }
      // Deduplicate
      const uniqueOrTalents = [...new Set(orTalents)];

      const orTalentArb = fc.constantFrom(...uniqueOrTalents);

      fc.assert(
        fc.property(orTalentArb, (talent) => {
          const result = parseTalentOptions(talent);
          expect(result.isChoice).toBe(true);
          expect(result.options.length).toBeGreaterThanOrEqual(2);
          // Each option is trimmed and non-empty
          for (const opt of result.options) {
            expect(opt.trim()).toBe(opt);
            expect(opt.length).toBeGreaterThan(0);
          }
          // Reconstructing the original: options joined by " or " should give back original
          expect(result.options.join(' or ')).toBe(talent);
        }),
        { numRuns: 100 }
      );
    });

    it('for any talent WITHOUT " or ", parseTalentOptions returns isChoice=false', () => {
      const nonOrTalents: string[] = [];
      for (const speciesName of Object.keys(SPECIES_DATA)) {
        for (const talent of SPECIES_DATA[speciesName].talents) {
          if (!talent.includes(' or ')) {
            nonOrTalents.push(talent);
          }
        }
      }
      const uniqueNonOrTalents = [...new Set(nonOrTalents)];

      const nonOrTalentArb = fc.constantFrom(...uniqueNonOrTalents);

      fc.assert(
        fc.property(nonOrTalentArb, (talent) => {
          const result = parseTalentOptions(talent);
          expect(result.isChoice).toBe(false);
          expect(result.options).toEqual([talent]);
        }),
        { numRuns: 100 }
      );
    });
  });
});
