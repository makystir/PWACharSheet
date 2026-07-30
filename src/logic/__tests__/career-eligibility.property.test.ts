import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { SPECIES_DATA } from '../../data/species';
import { getExcludedCareers } from '../career-eligibility';

// Feature: archives-vol2-integration, Property 7: Non-Ogre species excludes Ogre-only careers

// ─── Generators ─────────────────────────────────────────────────────────────

/** All species names from SPECIES_DATA that are not "Ogre" */
const nonOgreSpeciesNames = Object.keys(SPECIES_DATA).filter(name => name !== 'Ogre');

const arbNonOgreSpecies = fc.constantFrom(...nonOgreSpeciesNames);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: archives-vol2-integration', () => {
  describe('Property 7: Non-Ogre species excludes Ogre-only careers', () => {
    /**
     * **Validates: Requirements 13.2**
     *
     * For any species string that is not "Ogre" (selected from all species in
     * SPECIES_DATA), the career eligibility function SHALL exclude "Maneater",
     * "Rhinox Herder", and "Ogre Butcher" from the available careers list.
     */
    it('non-Ogre species always excludes Maneater, Rhinox Herder, and Ogre Butcher', () => {
      const ogreOnlyCareers = ['Maneater', 'Rhinox Herder', 'Ogre Butcher'];

      fc.assert(
        fc.property(
          arbNonOgreSpecies,
          (species) => {
            const excluded = getExcludedCareers(species);

            for (const career of ogreOnlyCareers) {
              expect(excluded).toContain(career);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
