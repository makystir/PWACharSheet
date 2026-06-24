import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { findDisease, findSymptom, getDiseaseSymptoms, addDisease, removeDisease, updateDiseaseNotes } from '../diseases';
import type { ActiveDisease } from '../diseases';
import { DISEASE_REGISTRY } from '../../data/diseases';
import { SYMPTOM_CATALOGUE } from '../../data/symptoms';
import { BLANK_CHARACTER } from '../../types/character';

// Pre-compute valid name sets for filtering
const VALID_DISEASE_NAMES = new Set(DISEASE_REGISTRY.map(d => d.name));
const VALID_SYMPTOM_NAMES = new Set(SYMPTOM_CATALOGUE.map(s => s.name));

// Generators for active disease management tests
const arbitraryActiveDisease: fc.Arbitrary<ActiveDisease> = fc.record({
  id: fc.nat(),
  diseaseName: fc.constantFrom(...DISEASE_REGISTRY.map(d => d.name)),
  contracted: fc.nat(),
  notes: fc.string(),
});

const arbitraryDiseasesArray: fc.Arbitrary<ActiveDisease[]> = fc
  .array(arbitraryActiveDisease, { minLength: 0, maxLength: 10 })
  .map(arr => arr.map((d, i) => ({ ...d, id: i + 1 })));

describe('Feature: disease-system', () => {
  /**
   * Property 3: Lookup returns correct entry for valid names
   * findDisease and findSymptom return exact entries for all registry names.
   * Validates: Requirements 3.1, 3.3
   */
  it('Property 3: Lookup returns correct entry for valid names', () => {
    // findDisease returns the exact entry for any disease in the registry
    fc.assert(
      fc.property(
        fc.constantFrom(...DISEASE_REGISTRY),
        (entry) => {
          const result = findDisease(entry.name);
          expect(result).toBe(entry);
        }
      ),
      { numRuns: 100 }
    );

    // findSymptom returns the exact entry for any symptom in the catalogue
    fc.assert(
      fc.property(
        fc.constantFrom(...SYMPTOM_CATALOGUE),
        (entry) => {
          const result = findSymptom(entry.name);
          expect(result).toBe(entry);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Lookup returns undefined for invalid names
   * All three lookup functions return undefined for names not in registries.
   * Validates: Requirements 3.2, 3.4, 3.6
   */
  it('Property 4: Lookup returns undefined for invalid names', () => {
    // findDisease returns undefined for strings not matching any disease name
    fc.assert(
      fc.property(
        fc.string(),
        (str) => {
          fc.pre(!VALID_DISEASE_NAMES.has(str));
          expect(findDisease(str)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );

    // findSymptom returns undefined for strings not matching any symptom name
    fc.assert(
      fc.property(
        fc.string(),
        (str) => {
          fc.pre(!VALID_SYMPTOM_NAMES.has(str));
          expect(findSymptom(str)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );

    // getDiseaseSymptoms returns undefined for strings not matching any disease name
    fc.assert(
      fc.property(
        fc.string(),
        (str) => {
          fc.pre(!VALID_DISEASE_NAMES.has(str));
          expect(getDiseaseSymptoms(str)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: Add disease produces correctly structured record
   * Validates ID generation, fields, and append behavior.
   * Validates: Requirements 4.1
   */
  it('Property 6: Add disease produces correctly structured record', () => {
    fc.assert(
      fc.property(
        arbitraryDiseasesArray,
        fc.constantFrom(...DISEASE_REGISTRY.map(d => d.name)),
        (diseases, diseaseName) => {
          const result = addDisease(diseases, diseaseName);

          // Result length is input length + 1
          expect(result.length).toBe(diseases.length + 1);

          // The new entry is the last element
          const newEntry = result[result.length - 1];

          // ID is max(existing) + 1 or 1 if empty
          const expectedId = diseases.length === 0
            ? 1
            : Math.max(...diseases.map(d => d.id)) + 1;
          expect(newEntry.id).toBe(expectedId);

          // Fields are correctly set
          expect(newEntry.diseaseName).toBe(diseaseName);
          expect(newEntry.contracted).toBeGreaterThan(0);
          expect(newEntry.notes).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7: Remove disease correctness
   * Validates removal by existing ID and no-op for missing ID.
   * Validates: Requirements 4.2, 4.3, 4.5
   */
  it('Property 7: Remove disease correctness', () => {
    // Removing an existing ID produces an array without that entry
    fc.assert(
      fc.property(
        arbitraryDiseasesArray.filter(arr => arr.length > 0),
        (diseases) => {
          // Pick a random existing entry's ID
          const targetIndex = Math.floor(Math.random() * diseases.length);
          const targetId = diseases[targetIndex].id;

          const result = removeDisease(diseases, targetId);

          // Result length is input length - 1
          expect(result.length).toBe(diseases.length - 1);

          // Result does not contain the removed ID
          expect(result.find(d => d.id === targetId)).toBeUndefined();

          // Remaining entries preserve relative order
          const expectedRemaining = diseases.filter(d => d.id !== targetId);
          expect(result).toEqual(expectedRemaining);
        }
      ),
      { numRuns: 100 }
    );

    // Removing a non-existent ID returns array deep-equal to input
    fc.assert(
      fc.property(
        arbitraryDiseasesArray,
        fc.nat(),
        (diseases, rawId) => {
          const existingIds = new Set(diseases.map(d => d.id));
          // Ensure the ID does not exist in the array
          const missingId = rawId + (diseases.length > 0 ? Math.max(...diseases.map(d => d.id)) + 1 : 1);
          fc.pre(!existingIds.has(missingId));

          const result = removeDisease(diseases, missingId);
          expect(result).toEqual(diseases);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8: Immutability of add and remove operations
   * Original array unchanged after operations.
   * Validates: Requirements 4.4, 4.5
   */
  it('Property 8: Immutability of add and remove operations', () => {
    // addDisease does not mutate the original array
    fc.assert(
      fc.property(
        arbitraryDiseasesArray,
        fc.constantFrom(...DISEASE_REGISTRY.map(d => d.name)),
        (diseases, diseaseName) => {
          const originalSnapshot = JSON.parse(JSON.stringify(diseases));

          addDisease(diseases, diseaseName);

          expect(diseases).toEqual(originalSnapshot);
          expect(diseases.length).toBe(originalSnapshot.length);
        }
      ),
      { numRuns: 100 }
    );

    // removeDisease does not mutate the original array
    fc.assert(
      fc.property(
        arbitraryDiseasesArray.filter(arr => arr.length > 0),
        (diseases) => {
          const originalSnapshot = JSON.parse(JSON.stringify(diseases));
          const targetId = diseases[0].id;

          removeDisease(diseases, targetId);

          expect(diseases).toEqual(originalSnapshot);
          expect(diseases.length).toBe(originalSnapshot.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: Notes update persistence
   * Correct notes field updated, other entries unchanged.
   * Validates: Requirements 8.1
   */
  it('Property 9: Notes update persistence', () => {
    fc.assert(
      fc.property(
        arbitraryDiseasesArray.filter(arr => arr.length > 0),
        fc.string(),
        (diseases, newNotes) => {
          // Pick an existing entry to update
          const targetIndex = Math.floor(Math.random() * diseases.length);
          const targetId = diseases[targetIndex].id;

          const result = updateDiseaseNotes(diseases, targetId, newNotes);

          // The matching entry has the new notes
          const updatedEntry = result.find(d => d.id === targetId);
          expect(updatedEntry).toBeDefined();
          expect(updatedEntry!.notes).toBe(newNotes);

          // All other entries remain unchanged
          for (const entry of result) {
            if (entry.id !== targetId) {
              const original = diseases.find(d => d.id === entry.id);
              expect(entry).toEqual(original);
            }
          }

          // Array length unchanged
          expect(result.length).toBe(diseases.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: Migration backfill preserves existing data
   * Characters without `diseases` field get `[]` and all other fields remain unchanged.
   * Validates: Requirements 5.3
   */
  it('Property 10: Migration backfill preserves existing data', () => {
    // Generator: a partial character object with known fields set but WITHOUT diseases
    const arbitraryCharacterFields = fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      species: fc.constantFrom('Human', 'Dwarf', 'Halfling', 'High Elf', 'Wood Elf'),
      career: fc.string({ minLength: 1, maxLength: 30 }),
      careerLevel: fc.string({ minLength: 0, maxLength: 30 }),
      xpCur: fc.nat({ max: 10000 }),
      xpSpent: fc.nat({ max: 10000 }),
      xpTotal: fc.nat({ max: 20000 }),
      fate: fc.nat({ max: 10 }),
      fortune: fc.nat({ max: 10 }),
      resilience: fc.nat({ max: 10 }),
      resolve: fc.nat({ max: 10 }),
      corr: fc.nat({ max: 100 }),
      sin: fc.nat({ max: 100 }),
      advantage: fc.nat({ max: 20 }),
    });

    fc.assert(
      fc.property(
        arbitraryCharacterFields,
        (fields) => {
          // Simulate loading a saved character without 'diseases' field
          // This mimics: { ...structuredClone(BLANK_CHARACTER), ...parsed }
          const savedData = { ...fields, _v: 7 as const } as Record<string, unknown>;
          // Ensure diseases is NOT in the saved data
          delete savedData.diseases;

          const merged = { ...structuredClone(BLANK_CHARACTER), ...savedData };

          // After merge, diseases should be [] (from BLANK_CHARACTER since savedData lacks it)
          expect(merged.diseases).toEqual([]);

          // All provided fields should be preserved unchanged
          for (const key of Object.keys(fields)) {
            expect(merged[key as keyof typeof merged]).toEqual(fields[key as keyof typeof fields]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
