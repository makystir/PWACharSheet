import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Character } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';
import { rollInitiative } from '../initiative';
import { getBonus } from '../calculators';

// Feature: ux-audit-improvements, Property 2: Initiative roll equals formula of
// characteristic and die (Validates: Requirements 4.2, 4.4, 4.6).
//
// rollInitiative(formula, character, dieFn?) is documented in src/logic/initiative.ts.
// For the app-default 'initiativePlusD10' formula (WFRP4e Core p.156 "Roll For
// Initiative!"), the orderable value MUST equal getBonus(Initiative total) + die,
// where the Initiative total is read from the passed character's I characteristic
// (i.i + i.a + i.b). The die function is injected so the roll is deterministic.

// ─── Generators ──────────────────────────────────────────────────────────────

/** Component parts of the Initiative (I) characteristic: initial, advances, bonus. */
const arbInitiativeParts = fc.record({
  i: fc.integer({ min: 0, max: 100 }),
  a: fc.integer({ min: 0, max: 50 }),
  b: fc.integer({ min: -10, max: 10 }),
});

/** A deterministic d10 result in the valid 1..10 range. */
const arbDie = fc.integer({ min: 1, max: 10 });

/** Build a fresh Character whose Initiative characteristic is set to the parts. */
function makeCharacter(parts: { i: number; a: number; b: number }): Character {
  const c = structuredClone(BLANK_CHARACTER);
  c.chars.I = { i: parts.i, a: parts.a, b: parts.b };
  return c;
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: ux-audit-improvements, Property 2: Initiative roll formula', () => {
  /**
   * **Validates: Requirements 4.2, 4.6**
   *
   * For the default 'initiativePlusD10' formula, the rolled value equals
   * getBonus(Initiative total) + die, reading the Initiative characteristic from
   * the passed character. The injected die also surfaces unchanged in `die`.
   */
  it("initiativePlusD10 value equals Ibonus + die (Initiative read from character)", () => {
    fc.assert(
      fc.property(arbInitiativeParts, arbDie, (parts, die) => {
        const character = makeCharacter(parts);
        const total = parts.i + parts.a + parts.b;
        const expectedBonus = getBonus(total);

        const result = rollInitiative('initiativePlusD10', character, () => die);

        expect(result.formula).toBe('initiativePlusD10');
        expect(result.die).toBe(die);
        expect(result.value).toBe(expectedBonus + die);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirement 4.6**
   *
   * The Initiative characteristic is genuinely read from the character: mutating
   * only the character's I characteristic (with the same injected die) changes the
   * computed value in lockstep with getBonus(total).
   */
  it('reads the Initiative characteristic from the character', () => {
    fc.assert(
      fc.property(arbInitiativeParts, arbInitiativeParts, arbDie, (partsA, partsB, die) => {
        const totalA = partsA.i + partsA.a + partsA.b;
        const totalB = partsB.i + partsB.a + partsB.b;

        const valueA = rollInitiative('initiativePlusD10', makeCharacter(partsA), () => die).value;
        const valueB = rollInitiative('initiativePlusD10', makeCharacter(partsB), () => die).value;

        // Same die, so the value difference is exactly the Initiative-bonus difference.
        expect(valueA - valueB).toBe(getBonus(totalA) - getBonus(totalB));
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirement 4.4**
   *
   * Switching the configured Initiative_Formula changes the computation: for the
   * same character and same injected die, the 'initiativeAgilityTest' variant is a
   * test-based (SL-driven) orderable value that is not simply Ibonus + die, so the
   * two formulas are not interchangeable. We assert the formula tag is honoured and
   * that the results diverge for at least some inputs.
   */
  it('formula switch changes the computation', () => {
    // The two formulas must at least differ on some inputs (they compute different
    // things per Core p.156). Search across the input space for a divergence.
    const foundDivergence = fc.check(
      fc.property(arbInitiativeParts, arbDie, (parts, die) => {
        const character = makeCharacter(parts);
        const plusD10 = rollInitiative('initiativePlusD10', character, () => die);
        const agilityTest = rollInitiative('initiativeAgilityTest', character, () => die);

        // Each result reports its own formula.
        expect(plusD10.formula).toBe('initiativePlusD10');
        expect(agilityTest.formula).toBe('initiativeAgilityTest');

        // Property fails (i.e. counterexample found) when the two values differ.
        return plusD10.value === agilityTest.value;
      }),
      { numRuns: 200 },
    );

    // fc.check returns failed=true when it found an input where the values differ,
    // proving the formula switch changes the computation for some input.
    expect(foundDivergence.failed).toBe(true);
  });
});
