import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { deepMerge } from '../../storage/migration';
import { BLANK_CHARACTER } from '../../types/character';

// ─── Property 11: Migration defaults missing hirelings to empty array ────────
// Feature: hirelings, Property 11: Migration defaults missing hirelings to empty array
// **Validates: Requirements 9.1, 9.4**

describe('Feature: hirelings, Property 11: Migration defaults missing hirelings to empty array', () => {
  /**
   * **Validates: Requirements 9.1, 9.4**
   *
   * For any character object that does not contain a `hirelings` field,
   * after deep-merging with BLANK_CHARACTER as target, the result shall
   * have `hirelings` as an empty array `[]`.
   */

  // Generator for arbitrary character-like objects WITHOUT a `hirelings` field
  const characterWithoutHirelingsArb = fc.record({
    _v: fc.constant(6),
    name: fc.string(),
    species: fc.string(),
    career: fc.string(),
    careerLevel: fc.string(),
    status: fc.string(),
    age: fc.string(),
    wCur: fc.nat({ max: 99 }),
    fate: fc.nat({ max: 10 }),
    fortune: fc.nat({ max: 10 }),
    resilience: fc.nat({ max: 10 }),
    resolve: fc.nat({ max: 10 }),
    xpCur: fc.nat({ max: 10000 }),
    xpSpent: fc.nat({ max: 10000 }),
    xpTotal: fc.nat({ max: 10000 }),
  });

  it('deep merging a character without hirelings field yields hirelings as []', () => {
    fc.assert(
      fc.property(characterWithoutHirelingsArb, (charData) => {
        const result = deepMerge(
          structuredClone(BLANK_CHARACTER),
          charData as Record<string, unknown>,
        );
        expect(result.hirelings).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });

  it('arbitrary objects with extra fields but no hirelings still yield hirelings as []', () => {
    fc.assert(
      fc.property(
        fc.record({
          _v: fc.integer({ min: 1, max: 6 }),
          name: fc.string(),
          species: fc.string(),
          companions: fc.array(fc.record({ name: fc.string(), species: fc.string() })),
          weapons: fc.array(fc.record({ name: fc.string(), group: fc.string() })),
          talents: fc.array(fc.record({ n: fc.string(), a: fc.nat({ max: 5 }) })),
          psych: fc.string(),
          muts: fc.string(),
          corr: fc.nat({ max: 100 }),
          sin: fc.nat({ max: 100 }),
        }),
        (charData) => {
          // Ensure hirelings is NOT on the source object
          const source = charData as Record<string, unknown>;
          delete source['hirelings'];

          const result = deepMerge(
            structuredClone(BLANK_CHARACTER),
            source,
          );
          expect(result.hirelings).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('characters that already have a hirelings array preserve it after merge', () => {
    const hirelingArb = fc.record({
      id: fc.nat(),
      name: fc.string({ minLength: 1 }),
      role: fc.string(),
      status: fc.string(),
      M: fc.nat({ max: 99 }),
      WS: fc.nat({ max: 99 }),
      BS: fc.nat({ max: 99 }),
      S: fc.nat({ max: 99 }),
      T: fc.nat({ max: 99 }),
      I: fc.nat({ max: 99 }),
      Ag: fc.nat({ max: 99 }),
      Dex: fc.nat({ max: 99 }),
      Int: fc.nat({ max: 99 }),
      WP: fc.nat({ max: 99 }),
      Fel: fc.nat({ max: 99 }),
      W: fc.nat({ max: 99 }),
      wCur: fc.nat({ max: 99 }),
      skills: fc.string(),
      talents: fc.string(),
      traits: fc.string(),
      trappings: fc.string(),
      template: fc.string(),
      physicalQuirk: fc.string(),
      workEthic: fc.string(),
      personalityQuirk: fc.string(),
      upkeep: fc.record({ gc: fc.nat({ max: 999 }), ss: fc.nat({ max: 999 }), d: fc.nat({ max: 999 }) }),
      conditions: fc.array(fc.record({ name: fc.string(), level: fc.nat({ max: 5 }) })),
      notes: fc.string(),
    });

    fc.assert(
      fc.property(
        fc.record({
          _v: fc.constant(7),
          name: fc.string(),
          hirelings: fc.array(hirelingArb, { minLength: 1, maxLength: 5 }),
        }),
        (charData) => {
          const source = charData as Record<string, unknown>;
          const result = deepMerge(
            structuredClone(BLANK_CHARACTER),
            source,
          );
          // Source hirelings array should be preserved (deepMerge uses source array when both are arrays)
          expect(result.hirelings).toEqual(charData.hirelings);
        }
      ),
      { numRuns: 100 }
    );
  });
});
