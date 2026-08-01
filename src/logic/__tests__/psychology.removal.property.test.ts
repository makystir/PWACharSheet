// Feature: unified-psychology-panel, Property 2: Trait removal preserves other traits

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { removePsychologyTrait } from '../psychology';
import type { PsychologyType, PsychologyTrait } from '../../types/character';

// ─── Generators ─────────────────────────────────────────────────────────────

const allPsychologyTypes: PsychologyType[] = [
  'Animosity', 'Hatred', 'Fear', 'Terror', 'Frenzy', 'Prejudice', 'Phobia', 'Trauma'
];

const arbPsychologyType: fc.Arbitrary<PsychologyType> = fc.constantFrom(...allPsychologyTypes);

const arbTrait: fc.Arbitrary<PsychologyTrait> = fc.record({
  id: fc.uuid(),
  type: arbPsychologyType,
  target: fc.string({ minLength: 0, maxLength: 30 }),
  rating: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
});

const arbTraitArray: fc.Arbitrary<PsychologyTrait[]> = fc.array(arbTrait, { minLength: 0, maxLength: 20 });

const arbNonEmptyTraitArray: fc.Arbitrary<PsychologyTrait[]> = fc.array(arbTrait, { minLength: 1, maxLength: 20 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: unified-psychology-panel', () => {
  describe('Property 2: Trait removal preserves other traits', () => {
    /**
     * **Validates: Requirements 2.5**
     *
     * For any array of PsychologyTrait objects and any id present in that array,
     * calling removePsychologyTrait(traits, id) SHALL produce an array that:
     * - Does not contain any trait with that id
     * - Contains all traits from the original array whose id differs from the removed one
     * - Preserves relative order of remaining traits
     */

    it('removed ID is absent from the result', () => {
      fc.assert(
        fc.property(
          arbNonEmptyTraitArray,
          (traits) => {
            // Pick a random id from the array
            const index = Math.floor(Math.random() * traits.length);
            const targetId = traits[index].id;
            const result = removePsychologyTrait(traits, targetId);

            expect(result.every(t => t.id !== targetId)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('all other traits are preserved in their original order', () => {
      fc.assert(
        fc.property(
          arbNonEmptyTraitArray,
          (traits) => {
            const index = Math.floor(Math.random() * traits.length);
            const targetId = traits[index].id;
            const result = removePsychologyTrait(traits, targetId);

            const expected = traits.filter(t => t.id !== targetId);
            expect(result).toEqual(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('result length equals original length minus count of removed id occurrences', () => {
      fc.assert(
        fc.property(
          arbNonEmptyTraitArray,
          (traits) => {
            const index = Math.floor(Math.random() * traits.length);
            const targetId = traits[index].id;
            const result = removePsychologyTrait(traits, targetId);

            const removedCount = traits.filter(t => t.id === targetId).length;
            expect(result.length).toBe(traits.length - removedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('removing a non-existent id returns the original array unchanged', () => {
      fc.assert(
        fc.property(
          arbTraitArray,
          fc.uuid(),
          (traits, randomId) => {
            // Ensure randomId is not in the array
            const safeId = traits.some(t => t.id === randomId)
              ? randomId + '-nonexistent'
              : randomId;
            const result = removePsychologyTrait(traits, safeId);

            expect(result).toEqual(traits);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('relative order of remaining traits is preserved for any valid id', () => {
      fc.assert(
        fc.property(
          arbNonEmptyTraitArray.filter(traits => traits.length >= 2),
          (traits) => {
            const index = Math.floor(Math.random() * traits.length);
            const targetId = traits[index].id;
            const result = removePsychologyTrait(traits, targetId);

            // Verify ordering: for any two indices i < j in result,
            // their positions in the original array must also satisfy orig_i < orig_j
            for (let i = 0; i < result.length - 1; i++) {
              const origIndexCurr = traits.indexOf(result[i]);
              const origIndexNext = traits.indexOf(result[i + 1]);
              expect(origIndexCurr).toBeLessThan(origIndexNext);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
