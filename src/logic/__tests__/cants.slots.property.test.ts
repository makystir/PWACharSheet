// Feature: alternative-channelling-cants, Property 4: Permitted Cant slots threshold
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getPermittedCantSlots } from '../cants';

/**
 * Property 4: Permitted Cant slots threshold
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.7**
 *
 * For any non-negative integer spell count from a colour magic Lore,
 * `getPermittedCantSlots(spellCount)` shall return:
 *   0 when spellCount is 0,
 *   1 when spellCount is 1–2,
 *   2 when spellCount is 3–5,
 *   3 when spellCount is 6 or greater.
 */

// ─── Generators ──────────────────────────────────────────────────────────────

/** Non-negative integer representing a spell count (0–100) */
const arbSpellCount: fc.Arbitrary<number> = fc.integer({ min: 0, max: 100 });

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Reference implementation of the expected threshold mapping */
function expectedSlots(spellCount: number): number {
  if (spellCount === 0) return 0;
  if (spellCount <= 2) return 1;
  if (spellCount <= 5) return 2;
  return 3;
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: alternative-channelling-cants', () => {
  describe('Property 4: Permitted Cant slots threshold', () => {
    it('maps any non-negative spell count to the correct slot tier (0→0, 1-2→1, 3-5→2, 6+→3)', () => {
      fc.assert(
        fc.property(
          arbSpellCount,
          (spellCount) => {
            const result = getPermittedCantSlots(spellCount);
            expect(result).toBe(expectedSlots(spellCount));
          }
        ),
        { numRuns: 100 },
      );
    });

    it('always returns a value in {0, 1, 2, 3}', () => {
      fc.assert(
        fc.property(
          arbSpellCount,
          (spellCount) => {
            const result = getPermittedCantSlots(spellCount);
            expect([0, 1, 2, 3]).toContain(result);
          }
        ),
        { numRuns: 100 },
      );
    });

    it('is monotonically non-decreasing as spell count increases', () => {
      fc.assert(
        fc.property(
          arbSpellCount,
          fc.integer({ min: 0, max: 100 }),
          (a, b) => {
            const lower = Math.min(a, b);
            const higher = Math.max(a, b);
            expect(getPermittedCantSlots(higher)).toBeGreaterThanOrEqual(
              getPermittedCantSlots(lower)
            );
          }
        ),
        { numRuns: 100 },
      );
    });
  });
});
