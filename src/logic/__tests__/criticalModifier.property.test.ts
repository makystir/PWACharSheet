import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calculateCriticalModifier } from '../combat';

// Feature: combat-rules-compliance, Property 8: Critical wound modifier determined by excess vs TB

// ─── Generators ─────────────────────────────────────────────────────────────

/** Net wounds applied: 0-30 */
const arbNetWounds = fc.integer({ min: 0, max: 30 });

/** Character's current wounds: 0-20 */
const arbCurrentWounds = fc.integer({ min: 0, max: 20 });

/** Toughness Bonus: 0-10 */
const arbToughnessBonus = fc.integer({ min: 0, max: 10 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Property 8: Critical wound modifier determined by excess vs TB', () => {
  /**
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.5**
   *
   * When netWounds < currentWounds, no critical wound is triggered,
   * so the function returns null (no modifier notification).
   */
  it('returns null when netWounds < currentWounds (no critical wound)', () => {
    fc.assert(
      fc.property(
        arbNetWounds,
        arbCurrentWounds,
        arbToughnessBonus,
        (netWounds, currentWounds, toughnessBonus) => {
          fc.pre(netWounds < currentWounds);

          const result = calculateCriticalModifier(netWounds, currentWounds, toughnessBonus);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.5**
   *
   * When netWounds >= currentWounds AND excess damage < TB,
   * the modifier SHALL be -20.
   */
  it('returns modifier -20 when critical triggered and excess < TB', () => {
    fc.assert(
      fc.property(
        arbNetWounds,
        arbCurrentWounds,
        arbToughnessBonus,
        (netWounds, currentWounds, toughnessBonus) => {
          fc.pre(netWounds >= currentWounds);
          const excess = netWounds - currentWounds;
          fc.pre(excess < toughnessBonus);

          const result = calculateCriticalModifier(netWounds, currentWounds, toughnessBonus);

          expect(result).not.toBeNull();
          expect(result!.modifier).toBe(-20);
          expect(result!.excessDamage).toBe(excess);
          expect(result!.toughnessBonus).toBe(toughnessBonus);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.5**
   *
   * When netWounds >= currentWounds AND excess damage >= TB,
   * the modifier SHALL be 0.
   */
  it('returns modifier 0 when critical triggered and excess >= TB', () => {
    fc.assert(
      fc.property(
        arbNetWounds,
        arbCurrentWounds,
        arbToughnessBonus,
        (netWounds, currentWounds, toughnessBonus) => {
          fc.pre(netWounds >= currentWounds);
          const excess = netWounds - currentWounds;
          fc.pre(excess >= toughnessBonus);

          const result = calculateCriticalModifier(netWounds, currentWounds, toughnessBonus);

          expect(result).not.toBeNull();
          expect(result!.modifier).toBe(0);
          expect(result!.excessDamage).toBe(excess);
          expect(result!.toughnessBonus).toBe(toughnessBonus);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.5**
   *
   * When a critical wound is triggered, excessDamage always equals
   * netWounds - currentWounds.
   */
  it('excessDamage equals netWounds - currentWounds when critical triggers', () => {
    fc.assert(
      fc.property(
        arbNetWounds,
        arbCurrentWounds,
        arbToughnessBonus,
        (netWounds, currentWounds, toughnessBonus) => {
          fc.pre(netWounds >= currentWounds);

          const result = calculateCriticalModifier(netWounds, currentWounds, toughnessBonus);

          expect(result).not.toBeNull();
          expect(result!.excessDamage).toBe(netWounds - currentWounds);
        }
      ),
      { numRuns: 100 }
    );
  });
});
