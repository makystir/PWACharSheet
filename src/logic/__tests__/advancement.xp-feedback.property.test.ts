import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatXpFeedback, calculateTierBoundaryCost, getAdvancementCost, applyBulkAdvancement } from '../advancement';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, CharacteristicKey, CharacteristicValue } from '../../types/character';

// Feature: quality-of-life-improvements, Property 1: XP Feedback Decision Correctness

// ─── Generators ─────────────────────────────────────────────────────────────

/** Arbitrary positive integer representing an advancement cost. */
const arbCost = fc.integer({ min: 1, max: 10000 });

/** Arbitrary non-negative integer representing available XP. */
const arbAvailable = fc.integer({ min: 0, max: 10000 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: quality-of-life-improvements', () => {
  describe('Property 1: XP Feedback Decision Correctness', () => {
    /**
     * **Validates: Requirements 1.1, 1.3**
     */

    it('when available < cost, the feedback message contains both cost and available values as substrings', () => {
      fc.assert(
        fc.property(
          arbCost,
          arbAvailable,
          (cost, available) => {
            fc.pre(available < cost);

            const message = formatXpFeedback(cost, available);

            expect(message).toContain(String(cost));
            expect(message).toContain(String(available));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('the feedback message always contains both the cost and available values', () => {
      fc.assert(
        fc.property(
          arbCost,
          arbAvailable,
          (cost, available) => {
            const message = formatXpFeedback(cost, available);

            expect(message).toContain(String(cost));
            expect(message).toContain(String(available));
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// Feature: quality-of-life-improvements, Property 6: Bulk Advancement Cumulative Cost Equals Sum of Individual Costs

// ─── Generators ─────────────────────────────────────────────────────────────

/** Arbitrary skill type: 'skill' or 'characteristic'. */
const arbType = fc.constantFrom('skill' as const, 'characteristic' as const);

/** Arbitrary current advances count (0–24). */
const arbCurrentAdvances = fc.integer({ min: 0, max: 24 });

/** Arbitrary career status. */
const arbInCareer = fc.boolean();

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Property 6: Bulk Advancement Cumulative Cost Equals Sum of Individual Costs', () => {
  /**
   * **Validates: Requirements 5.2**
   */

  it('cumulative cost from calculateTierBoundaryCost equals sum of individual getAdvancementCost calls', () => {
    fc.assert(
      fc.property(
        arbType,
        arbCurrentAdvances,
        arbInCareer,
        (type, currentAdvances, inCareer) => {
          const { targetAdvances, totalCost } = calculateTierBoundaryCost(type, currentAdvances, inCareer);

          // Sum individual costs from currentAdvances to targetAdvances - 1
          let expectedCost = 0;
          for (let adv = currentAdvances; adv < targetAdvances; adv++) {
            expectedCost += getAdvancementCost(type, adv, inCareer);
          }

          expect(totalCost).toBe(expectedCost);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: quality-of-life-improvements, Property 7: Bulk Advancement Atomicity

// ─── Generators ─────────────────────────────────────────────────────────────

const ALL_CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

/** Arbitrary skill with random name and advances between 0–24. */
const arbSkill = fc.record({
  n: fc.string({ minLength: 1, maxLength: 20 }),
  c: fc.constantFrom('WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'),
  a: fc.integer({ min: 0, max: 24 }),
});

/** Build a test character with at least one basic skill and high XP to guarantee success. */
const arbCharacterForBulk = fc.record({
  bSkills: fc.array(arbSkill, { minLength: 1, maxLength: 10 }),
  inCareer: fc.boolean(),
}).map(({ bSkills, inCareer }) => {
  const chars = Object.fromEntries(
    ALL_CHAR_KEYS.map(key => [key, { i: 20, a: 0 }])
  ) as Record<CharacteristicKey, CharacteristicValue>;

  const character: Character = {
    ...structuredClone(BLANK_CHARACTER),
    name: 'BulkTest',
    species: 'Human / Reiklander',
    class: 'Warriors',
    career: 'Soldier',
    careerLevel: 'Recruit',
    careerPath: '',
    status: 'Silver 1',
    chars,
    xpCur: 10000,
    xpSpent: 0,
    xpTotal: 10000,
    bSkills,
    aSkills: [],
  };

  // Pick the first skill index (always valid since minLength: 1)
  const skillIndex = 0;
  const isBasic = true;

  return { character, skillIndex, isBasic, inCareer };
});

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Property 7: Bulk Advancement Atomicity', () => {
  /**
   * **Validates: Requirements 5.3, 5.5**
   */

  it('after successful bulk advancement: skill reaches tier boundary, XP reduced by exact cost, correct log entry count', () => {
    fc.assert(
      fc.property(
        arbCharacterForBulk,
        ({ character, skillIndex, isBasic, inCareer }) => {
          const startAdvances = character.bSkills[skillIndex].a;

          // Calculate what the expected outcome should be
          const { targetAdvances, totalCost } = calculateTierBoundaryCost('skill', startAdvances, inCareer);

          // Skip cases where skill is already at or beyond max tier boundary (nothing to advance)
          fc.pre(targetAdvances > startAdvances);
          // Ensure XP is sufficient (should always be true with 10000 XP but be explicit)
          fc.pre(character.xpCur >= totalCost);

          const result = applyBulkAdvancement(character, skillIndex, isBasic, inCareer);

          // Result should be a success (has 'character' and 'entries' fields)
          expect(result).toHaveProperty('character');
          expect(result).toHaveProperty('entries');

          const success = result as { character: Character; entries: unknown[] };

          // Invariant 1: skill's advance count equals the next tier boundary
          const updatedSkill = success.character.bSkills[skillIndex];
          expect(updatedSkill.a).toBe(targetAdvances);

          // Invariant 2: XP is reduced by exactly the cumulative cost
          expect(success.character.xpCur).toBe(character.xpCur - totalCost);

          // Invariant 3: exactly (targetBoundary - startAdvances) log entries are created
          const expectedEntryCount = targetAdvances - startAdvances;
          expect(success.entries.length).toBe(expectedEntryCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
