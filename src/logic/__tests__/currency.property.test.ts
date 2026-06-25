import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { parseCurrencyInput, applyCurrencyDelta } from '../currency';
import type { CurrencyDelta } from '../currency';

// Feature: ux-improvements, Property 5: Currency input parsing
// Feature: ux-improvements, Property 6: Currency delta application with clamping

// ─── Generators ─────────────────────────────────────────────────────────────

type Suffix = 'gc' | 'ss' | 'd';

interface Token {
  sign: '+' | '-' | '';
  amount: number;
  suffix: Suffix;
}

const arbSuffix: fc.Arbitrary<Suffix> = fc.constantFrom('gc', 'ss', 'd');

const arbSign: fc.Arbitrary<'+' | '-' | ''> = fc.constantFrom('+', '-', '');

const arbAmount = fc.integer({ min: 0, max: 999999 });

const arbToken: fc.Arbitrary<Token> = fc.record({
  sign: arbSign,
  amount: arbAmount,
  suffix: arbSuffix,
});

const arbTokenArray = fc.array(arbToken, { minLength: 1, maxLength: 8 });

/** Build an input string from an array of tokens with optional whitespace. */
function buildInputString(tokens: Token[], caseVariant: 'upper' | 'lower' | 'mixed'): string {
  return tokens.map(t => {
    let suffix: string;
    switch (caseVariant) {
      case 'upper':
        suffix = t.suffix.toUpperCase();
        break;
      case 'lower':
        suffix = t.suffix.toLowerCase();
        break;
      case 'mixed':
        // First char upper, rest lower (e.g., "Gc", "Ss")
        suffix = t.suffix.charAt(0).toUpperCase() + t.suffix.slice(1).toLowerCase();
        break;
    }
    return `${t.sign}${t.amount}${suffix}`;
  }).join(' ');
}

/** Compute the expected CurrencyDelta from an array of tokens. */
function expectedDelta(tokens: Token[]): CurrencyDelta {
  const delta: CurrencyDelta = { gc: 0, ss: 0, d: 0 };
  for (const token of tokens) {
    const signMultiplier = token.sign === '-' ? -1 : 1;
    const value = signMultiplier * token.amount;
    delta[token.suffix] += value;
  }
  return delta;
}

const arbCaseVariant: fc.Arbitrary<'upper' | 'lower' | 'mixed'> = fc.constantFrom('upper', 'lower', 'mixed');

const arbNonNegativeCurrency: fc.Arbitrary<CurrencyDelta> = fc.record({
  gc: fc.integer({ min: 0, max: 999999 }),
  ss: fc.integer({ min: 0, max: 999999 }),
  d: fc.integer({ min: 0, max: 999999 }),
});

const arbArbitraryDelta: fc.Arbitrary<CurrencyDelta> = fc.record({
  gc: fc.integer({ min: -999999, max: 999999 }),
  ss: fc.integer({ min: -999999, max: 999999 }),
  d: fc.integer({ min: -999999, max: 999999 }),
});

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-improvements', () => {
  describe('Property 5: Currency input parsing', () => {
    /**
     * **Validates: Requirements 5.2, 5.6, 5.7**
     */

    it('for any valid token array, the parser produces a CurrencyDelta equal to the algebraic sum per denomination', () => {
      fc.assert(
        fc.property(
          arbTokenArray,
          arbCaseVariant,
          (tokens, caseVariant) => {
            const input = buildInputString(tokens, caseVariant);
            const result = parseCurrencyInput(input);

            const expected = expectedDelta(tokens);

            expect(result).not.toBeNull();
            expect(result!.gc).toBe(expected.gc);
            expect(result!.ss).toBe(expected.ss);
            expect(result!.d).toBe(expected.d);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('correctly handles repeated denominations by summing them', () => {
      fc.assert(
        fc.property(
          arbSuffix,
          fc.array(fc.tuple(arbSign, arbAmount), { minLength: 2, maxLength: 6 }),
          arbCaseVariant,
          (suffix, signAmounts, caseVariant) => {
            // Create multiple tokens all with the same denomination
            const tokens: Token[] = signAmounts.map(([sign, amount]) => ({
              sign,
              amount,
              suffix,
            }));

            const input = buildInputString(tokens, caseVariant);
            const result = parseCurrencyInput(input);

            // Calculate expected sum for this denomination
            const expectedSum = signAmounts.reduce((sum, [sign, amount]) => {
              return sum + (sign === '-' ? -1 : 1) * amount;
            }, 0);

            expect(result).not.toBeNull();
            expect(result![suffix]).toBe(expectedSum);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns null when input contains no valid denomination tokens', () => {
      // Generate strings from chars that cannot form a valid token
      const arbInvalidInput = fc.array(
        fc.constantFrom('x', 'y', 'z', '!', '@', '#', ' ', '\t'),
        { minLength: 0, maxLength: 30 }
      ).map(chars => chars.join(''));

      fc.assert(
        fc.property(
          arbInvalidInput,
          (input) => {
            const result = parseCurrencyInput(input);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('correctly respects positive and negative signs', () => {
      fc.assert(
        fc.property(
          arbAmount.filter(a => a > 0),
          arbSuffix,
          arbCaseVariant,
          (amount, suffix, caseVariant) => {
            // Test positive (unsigned) token
            const positiveInput = buildInputString([{ sign: '', amount, suffix }], caseVariant);
            const positiveResult = parseCurrencyInput(positiveInput);
            expect(positiveResult).not.toBeNull();
            expect(positiveResult![suffix]).toBe(amount);

            // Test explicit positive token
            const explicitPosInput = buildInputString([{ sign: '+', amount, suffix }], caseVariant);
            const explicitPosResult = parseCurrencyInput(explicitPosInput);
            expect(explicitPosResult).not.toBeNull();
            expect(explicitPosResult![suffix]).toBe(amount);

            // Test negative token
            const negativeInput = buildInputString([{ sign: '-', amount, suffix }], caseVariant);
            const negativeResult = parseCurrencyInput(negativeInput);
            expect(negativeResult).not.toBeNull();
            expect(negativeResult![suffix]).toBe(-amount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Currency delta application with clamping', () => {
    /**
     * **Validates: Requirements 5.3, 5.4**
     */

    it('for any current values and delta, each result equals max(0, current + delta)', () => {
      fc.assert(
        fc.property(
          arbNonNegativeCurrency,
          arbArbitraryDelta,
          (current, delta) => {
            const result = applyCurrencyDelta(current, delta);

            expect(result.gc).toBe(Math.max(0, current.gc + delta.gc));
            expect(result.ss).toBe(Math.max(0, current.ss + delta.ss));
            expect(result.d).toBe(Math.max(0, current.d + delta.d));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('result never yields a negative value for any denomination', () => {
      fc.assert(
        fc.property(
          arbNonNegativeCurrency,
          arbArbitraryDelta,
          (current, delta) => {
            const result = applyCurrencyDelta(current, delta);

            expect(result.gc).toBeGreaterThanOrEqual(0);
            expect(result.ss).toBeGreaterThanOrEqual(0);
            expect(result.d).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('when delta is non-negative and current is non-negative, result equals current + delta', () => {
      const arbNonNegDelta: fc.Arbitrary<CurrencyDelta> = fc.record({
        gc: fc.integer({ min: 0, max: 999999 }),
        ss: fc.integer({ min: 0, max: 999999 }),
        d: fc.integer({ min: 0, max: 999999 }),
      });

      fc.assert(
        fc.property(
          arbNonNegativeCurrency,
          arbNonNegDelta,
          (current, delta) => {
            const result = applyCurrencyDelta(current, delta);

            // No clamping needed when both are non-negative
            expect(result.gc).toBe(current.gc + delta.gc);
            expect(result.ss).toBe(current.ss + delta.ss);
            expect(result.d).toBe(current.d + delta.d);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('when subtraction would go below 0, result is clamped to 0', () => {
      fc.assert(
        fc.property(
          arbNonNegativeCurrency,
          arbSuffix,
          (current, suffix) => {
            // Create a delta that would push this denomination below 0
            const largeNegative = -(current[suffix] + 1);
            const delta: CurrencyDelta = { gc: 0, ss: 0, d: 0 };
            delta[suffix] = largeNegative;

            const result = applyCurrencyDelta(current, delta);

            expect(result[suffix]).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
