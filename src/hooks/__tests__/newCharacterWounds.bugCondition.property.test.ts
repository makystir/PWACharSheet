import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character } from '../../types/character';
import { backfillCharacter } from '../useCharacter';
import { calculateTotalWounds } from '../../logic/calculators';

/**
 * Bug Condition Exploration Property Test
 *
 * Property 1: New Character wCur Stays Zero When Wound Max Is Positive
 *
 * This test encodes the EXPECTED (correct) behavior: after backfillCharacter(),
 * a new character with assigned characteristics and wCur === 0 should have
 * wCur set equal to calculateTotalWounds().
 *
 * On UNFIXED code, this test is EXPECTED TO FAIL because backfillCharacter()
 * calls syncWoundFields() which explicitly does NOT modify wCur.
 *
 * **Validates: Requirements 1.1, 2.1, 2.3**
 */

// ─── Generators ─────────────────────────────────────────────────────────────

/** Generate a characteristic value in the range [10, 99] ensuring a non-zero bonus */
const arbCharValue = fc.integer({ min: 10, max: 99 });

/** Generate a Hardy talent level (0-3) */
const arbHardyLevel = fc.integer({ min: 0, max: 3 });

/** Generate woundsUseSB flag (true for Human/Dwarf, false for Elf/Halfling) */
const arbWoundsUseSB = fc.boolean();

// ─── Helper ─────────────────────────────────────────────────────────────────

/**
 * Creates a fresh character with assigned characteristics, simulating
 * a newly created character that has had species/stats set but never
 * taken damage. wCur starts at 0 (from BLANK_CHARACTER).
 */
function createFreshCharacterWithStats(
  strength: number,
  toughness: number,
  willpower: number,
  woundsUseSB: boolean,
  hardyLevel: number
): Character {
  const char = structuredClone(BLANK_CHARACTER);

  // Assign characteristics (simulating species selection / manual entry)
  char.chars.S.i = strength;
  char.chars.T.i = toughness;
  char.chars.WP.i = willpower;

  // Set wound formula flag based on species type
  char.woundsUseSB = woundsUseSB;

  // Add Hardy talent if applicable
  if (hardyLevel > 0) {
    char.talents = [{ n: 'Hardy', lvl: hardyLevel, d: '' }];
  }

  // wCur remains at 0 — the initial value from BLANK_CHARACTER
  // This simulates the bug condition: stats assigned, wounds never initialized
  return char;
}

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Bugfix: new-character-wounds-default', () => {
  describe('Property 1: Bug Condition — New Character wCur Stays Zero When Wound Max Is Positive', () => {
    it('after backfillCharacter(), wCur should equal calculateTotalWounds() for fresh characters with woundsUseSB=true (Human/Dwarf)', () => {
      fc.assert(
        fc.property(
          arbCharValue, // S
          arbCharValue, // T
          arbCharValue, // WP
          arbHardyLevel,
          (s, t, wp, hardyLevel) => {
            const char = createFreshCharacterWithStats(s, t, wp, true, hardyLevel);

            const expectedWounds = calculateTotalWounds(char.chars, true, hardyLevel);
            // Pre-condition: wound max must be positive for bug to manifest
            fc.pre(expectedWounds > 0);

            // Run backfillCharacter (the function under test)
            const result = backfillCharacter(char);

            // Expected behavior: wCur should be set to wound maximum
            expect(result.wCur).toBe(expectedWounds);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('after backfillCharacter(), wCur should equal calculateTotalWounds() for fresh characters with woundsUseSB=false (Elf/Halfling)', () => {
      fc.assert(
        fc.property(
          arbCharValue, // S
          arbCharValue, // T
          arbCharValue, // WP
          arbHardyLevel,
          (s, t, wp, hardyLevel) => {
            const char = createFreshCharacterWithStats(s, t, wp, false, hardyLevel);

            const expectedWounds = calculateTotalWounds(char.chars, false, hardyLevel);
            fc.pre(expectedWounds > 0);

            const result = backfillCharacter(char);

            expect(result.wCur).toBe(expectedWounds);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('after backfillCharacter(), wCur should equal calculateTotalWounds() for all species/hardy combinations', () => {
      fc.assert(
        fc.property(
          arbCharValue,   // S
          arbCharValue,   // T
          arbCharValue,   // WP
          arbWoundsUseSB, // species type
          arbHardyLevel,  // Hardy talent level
          (s, t, wp, woundsUseSB, hardyLevel) => {
            const char = createFreshCharacterWithStats(s, t, wp, woundsUseSB, hardyLevel);

            const expectedWounds = calculateTotalWounds(char.chars, woundsUseSB, hardyLevel);
            fc.pre(expectedWounds > 0);

            const result = backfillCharacter(char);

            // The core property: a fresh character with positive wound max
            // should have wCur initialized to that maximum
            expect(result.wCur).toBe(expectedWounds);
          }
        ),
        { numRuns: 500 }
      );
    });
  });
});
