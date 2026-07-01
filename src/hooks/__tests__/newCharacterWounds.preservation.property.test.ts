import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character } from '../../types/character';
import { backfillCharacter } from '../useCharacter';
import { syncWoundFields, calculateTotalWounds } from '../../logic/calculators';

/**
 * Preservation Property Tests
 *
 * Property 2: Damaged Characters Retain Their wCur Value
 *
 * These tests verify that characters with wCur > 0 (already in play,
 * partially damaged, or healed) retain their wCur value after
 * backfillCharacter() and syncWoundFields() run.
 *
 * These tests must PASS on UNFIXED code — they confirm the existing
 * preservation behavior is correct and will continue to pass after the fix,
 * preventing regressions.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */

// ─── Generators ─────────────────────────────────────────────────────────────

/** Generate a characteristic value in [10, 99] ensuring non-zero bonus */
const arbCharValue = fc.integer({ min: 10, max: 99 });

/** Generate a Hardy talent level (0-3) */
const arbHardyLevel = fc.integer({ min: 0, max: 3 });

/** Generate woundsUseSB flag */
const arbWoundsUseSB = fc.boolean();

/** Generate characteristic advance values [0, 30] simulating advancement */
const arbAdvance = fc.integer({ min: 0, max: 30 });

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Creates a character with positive wCur (simulating an in-play character
 * that has already been initialized and may have taken some damage).
 * wCur is set to a value in [1, woundMax].
 */
function createInPlayCharacter(
  strength: number,
  toughness: number,
  willpower: number,
  woundsUseSB: boolean,
  hardyLevel: number,
  wCurFraction: number // fraction in [0, 1) — used to place wCur in [1, woundMax]
): Character {
  const char = structuredClone(BLANK_CHARACTER);

  char.chars.S.i = strength;
  char.chars.T.i = toughness;
  char.chars.WP.i = willpower;
  char.woundsUseSB = woundsUseSB;

  if (hardyLevel > 0) {
    char.talents = [{ n: 'Hardy', lvl: hardyLevel, d: '' }];
  }

  // Calculate wound max so we can set wCur within valid range
  const woundMax = calculateTotalWounds(char.chars, woundsUseSB, hardyLevel);

  // Set wCur to a value in [1, woundMax] using the fraction
  char.wCur = Math.max(1, Math.floor(wCurFraction * woundMax) + 1);
  // Clamp to woundMax
  if (char.wCur > woundMax) {
    char.wCur = woundMax;
  }

  return char;
}

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Bugfix: new-character-wounds-default', () => {
  describe('Property 2: Preservation — Damaged Characters Retain Their wCur Value', () => {
    it('backfillCharacter() preserves wCur for characters with wCur > 0', () => {
      fc.assert(
        fc.property(
          arbCharValue,   // S
          arbCharValue,   // T
          arbCharValue,   // WP
          arbWoundsUseSB,
          arbHardyLevel,
          fc.double({ min: 0, max: 0.99, noNaN: true }),  // wCur fraction
          (s, t, wp, woundsUseSB, hardyLevel, wCurFraction) => {
            const char = createInPlayCharacter(s, t, wp, woundsUseSB, hardyLevel, wCurFraction);
            const originalWCur = char.wCur;

            // Pre-condition: wCur must be positive (in-play character)
            fc.pre(originalWCur > 0);

            // Run backfillCharacter (which calls syncWoundFields internally)
            const result = backfillCharacter(char);

            // Preservation: wCur must NOT be modified
            expect(result.wCur).toBe(originalWCur);
          }
        ),
        { numRuns: 500 }
      );
    });

    it('syncWoundFields() preserves wCur for characters with wCur > 0', () => {
      fc.assert(
        fc.property(
          arbCharValue,   // S
          arbCharValue,   // T
          arbCharValue,   // WP
          arbWoundsUseSB,
          arbHardyLevel,
          fc.double({ min: 0, max: 0.99, noNaN: true }),  // wCur fraction
          (s, t, wp, woundsUseSB, hardyLevel, wCurFraction) => {
            const char = createInPlayCharacter(s, t, wp, woundsUseSB, hardyLevel, wCurFraction);
            const originalWCur = char.wCur;

            fc.pre(originalWCur > 0);

            // Run syncWoundFields directly
            const result = syncWoundFields(char, hardyLevel);

            // Preservation: wCur must NOT be modified
            expect(result.wCur).toBe(originalWCur);
          }
        ),
        { numRuns: 500 }
      );
    });

    it('syncWoundFields() preserves wCur when characteristics change (simulating advancement)', () => {
      fc.assert(
        fc.property(
          arbCharValue,   // initial S
          arbCharValue,   // initial T
          arbCharValue,   // initial WP
          arbAdvance,     // S advance
          arbAdvance,     // T advance
          arbAdvance,     // WP advance
          arbWoundsUseSB,
          arbHardyLevel,
          fc.double({ min: 0, max: 0.99, noNaN: true }),  // wCur fraction
          (s, t, wp, sAdv, tAdv, wpAdv, woundsUseSB, hardyLevel, wCurFraction) => {
            // Create initial in-play character
            const char = createInPlayCharacter(s, t, wp, woundsUseSB, hardyLevel, wCurFraction);
            const originalWCur = char.wCur;

            fc.pre(originalWCur > 0);

            // Simulate characteristic advancement
            char.chars.S.a = sAdv;
            char.chars.T.a = tAdv;
            char.chars.WP.a = wpAdv;

            // Run syncWoundFields after advancement
            const result = syncWoundFields(char, hardyLevel);

            // Preservation: wCur must NOT auto-sync to new wound maximum
            expect(result.wCur).toBe(originalWCur);
          }
        ),
        { numRuns: 500 }
      );
    });

    it('backfillCharacter() preserves wCur when characteristics change (simulating advancement)', () => {
      fc.assert(
        fc.property(
          arbCharValue,   // initial S
          arbCharValue,   // initial T
          arbCharValue,   // initial WP
          arbAdvance,     // S advance
          arbAdvance,     // T advance
          arbAdvance,     // WP advance
          arbWoundsUseSB,
          arbHardyLevel,
          fc.double({ min: 0, max: 0.99, noNaN: true }),  // wCur fraction
          (s, t, wp, sAdv, tAdv, wpAdv, woundsUseSB, hardyLevel, wCurFraction) => {
            // Create in-play character with advancement already applied
            const char = createInPlayCharacter(s, t, wp, woundsUseSB, hardyLevel, wCurFraction);
            const originalWCur = char.wCur;

            fc.pre(originalWCur > 0);

            // Simulate characteristic advancement
            char.chars.S.a = sAdv;
            char.chars.T.a = tAdv;
            char.chars.WP.a = wpAdv;

            // Run backfillCharacter (simulating loading from storage after advancement)
            const result = backfillCharacter(char);

            // Preservation: wCur must NOT be modified
            expect(result.wCur).toBe(originalWCur);
          }
        ),
        { numRuns: 500 }
      );
    });
  });
});
