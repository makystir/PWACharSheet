import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { DISEASE_REGISTRY } from '../../data/diseases';
import { SYMPTOM_CATALOGUE } from '../../data/symptoms';
import { parseSymptomReference } from '../../logic/diseases';

// Pre-compute symptom name set for lookups
const SYMPTOM_NAMES = new Set(SYMPTOM_CATALOGUE.map(s => s.name));

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: disease-system', () => {
  /**
   * Property 1: Data completeness invariant
   * All disease fields are non-empty strings, symptoms array length ≥ 1;
   * all symptom fields are non-empty strings.
   * Validates: Requirements 1.4, 1.5, 2.4
   */
  it('Property 1: Data completeness invariant', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...DISEASE_REGISTRY),
        (disease) => {
          expect(disease.name.length).toBeGreaterThan(0);
          expect(disease.contraction.length).toBeGreaterThan(0);
          expect(disease.incubation.length).toBeGreaterThan(0);
          expect(disease.duration.length).toBeGreaterThan(0);
          expect(disease.symptoms.length).toBeGreaterThanOrEqual(1);
          for (const symptomName of disease.symptoms) {
            expect(symptomName.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );

    fc.assert(
      fc.property(
        fc.constantFrom(...SYMPTOM_CATALOGUE),
        (symptom) => {
          expect(symptom.name.length).toBeGreaterThan(0);
          expect(symptom.description.length).toBeGreaterThan(0);
          expect(symptom.effects.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Symptom reference round-trip resolution
   * Every disease symptom reference (its base name, ignoring any severity tag)
   * resolves to a valid symptom entry.
   * Validates: Requirements 1.3, 9.1
   */
  it('Property 2: Symptom reference round-trip resolution', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...DISEASE_REGISTRY),
        (disease) => {
          for (const symptomRef of disease.symptoms) {
            const { baseName } = parseSymptomReference(symptomRef);
            expect(SYMPTOM_NAMES.has(baseName)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: No duplicate names in registries
   * No duplicate names in Disease Registry or Symptom Catalogue.
   * Validates: Requirements 9.2, 9.3
   */
  it('Property 5: No duplicate names in registries', () => {
    // Disease Registry — all names are unique
    const diseaseNames = DISEASE_REGISTRY.map(d => d.name);
    const uniqueDiseaseNames = new Set(diseaseNames);
    expect(uniqueDiseaseNames.size).toBe(diseaseNames.length);

    // Symptom Catalogue — all names are unique
    const symptomNames = SYMPTOM_CATALOGUE.map(s => s.name);
    const uniqueSymptomNames = new Set(symptomNames);
    expect(uniqueSymptomNames.size).toBe(symptomNames.length);

    // Property-based: picking any two distinct indices yields distinct names
    if (DISEASE_REGISTRY.length > 1) {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: DISEASE_REGISTRY.length - 1 }),
          fc.integer({ min: 0, max: DISEASE_REGISTRY.length - 1 }),
          (i, j) => {
            fc.pre(i !== j);
            expect(DISEASE_REGISTRY[i].name).not.toBe(DISEASE_REGISTRY[j].name);
          }
        ),
        { numRuns: 100 }
      );
    }

    if (SYMPTOM_CATALOGUE.length > 1) {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: SYMPTOM_CATALOGUE.length - 1 }),
          fc.integer({ min: 0, max: SYMPTOM_CATALOGUE.length - 1 }),
          (i, j) => {
            fc.pre(i !== j);
            expect(SYMPTOM_CATALOGUE[i].name).not.toBe(SYMPTOM_CATALOGUE[j].name);
          }
        ),
        { numRuns: 100 }
      );
    }
  });
});
