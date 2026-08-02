import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { CharacteristicKey, Talent } from '../../types/character';
import { TALENT_BONUS_MAP } from '../../data/talents';
import { getContributingTalent } from '../talents';

// ─── Constants ──────────────────────────────────────────────────────────────

const ALL_CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

const TALENT_BONUS_ENTRIES = Object.entries(TALENT_BONUS_MAP) as [string, { char: string; bonus: number }][];

// Build a lookup from charKey → talent name for convenience
const CHAR_TO_TALENT: Record<string, string> = {};
for (const [name, entry] of TALENT_BONUS_ENTRIES) {
  CHAR_TO_TALENT[entry.char] = name;
}

// ─── Generators ─────────────────────────────────────────────────────────────

const arbCharKey: fc.Arbitrary<CharacteristicKey> = fc.constantFrom(...ALL_CHAR_KEYS);

const arbTalent: fc.Arbitrary<Talent> = fc.record({
  n: fc.string({ minLength: 1, maxLength: 30 }),
  lvl: fc.integer({ min: 1, max: 5 }),
  desc: fc.string({ maxLength: 50 }),
});

const arbTalentArray: fc.Arbitrary<Talent[]> = fc.array(arbTalent, { minLength: 0, maxLength: 10 });

/** Generate a talent that matches a given charKey in TALENT_BONUS_MAP */
function arbMatchingTalent(charKey: CharacteristicKey): fc.Arbitrary<Talent> {
  const talentName = CHAR_TO_TALENT[charKey];
  return fc.record({
    n: fc.constant(talentName),
    lvl: fc.integer({ min: 1, max: 5 }),
    desc: fc.string({ maxLength: 50 }),
  });
}

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: characteristic-current-tooltip, getContributingTalent', () => {
  /**
   * **Validates: Requirements 1.6**
   *
   * Property 3: Contributing talent resolution — when a talent in
   * TALENT_BONUS_MAP for the given charKey exists in the talents array,
   * the function returns that talent's name.
   */
  it('Property 3a: returns correct talent name when matching talent is present', () => {
    fc.assert(
      fc.property(
        arbCharKey,
        arbTalentArray,
        fc.integer({ min: 1, max: 5 }),
        fc.string({ maxLength: 50 }),
        (charKey, otherTalents, lvl, desc) => {
          const expectedName = CHAR_TO_TALENT[charKey];
          const matchingTalent: Talent = { n: expectedName, lvl, desc };

          // Insert matching talent among other random talents
          const talents = [...otherTalents, matchingTalent];

          const result = getContributingTalent(talents, charKey);
          expect(result).toBe(expectedName);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.6**
   *
   * Property 3b: Contributing talent resolution — when no talent in the
   * array matches any TALENT_BONUS_MAP entry for the charKey, the function
   * returns null.
   */
  it('Property 3b: returns null when no matching talent is present', () => {
    fc.assert(
      fc.property(
        arbCharKey,
        arbTalentArray,
        (charKey, talents) => {
          const expectedTalentName = CHAR_TO_TALENT[charKey];

          // Filter out any talent that happens to match the expected name
          const filteredTalents = talents.filter(t => t.n !== expectedTalentName);

          const result = getContributingTalent(filteredTalents, charKey);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.6**
   *
   * Property 3c: Contributing talent resolution — when the talents array
   * is empty, the function always returns null regardless of charKey.
   */
  it('Property 3c: returns null when talents array is empty', () => {
    fc.assert(
      fc.property(
        arbCharKey,
        (charKey) => {
          const result = getContributingTalent([], charKey);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
