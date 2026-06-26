import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  validateTreasuryDelta,
  isValidLedgerAmount,
  applyLedgerEntry,
  applyCurrencyDelta,
} from '../currency';
import type { CurrencyDelta } from '../currency';

// Feature: ux-polish-and-functionality
// Properties 11, 17, 18: Treasury Delta, Ledger Amount Validation, Ledger Treasury Impact

// ─── Generators ─────────────────────────────────────────────────────────────

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

const arbPositiveAmount: fc.Arbitrary<CurrencyDelta> = fc.record({
  gc: fc.integer({ min: 0, max: 999999 }),
  ss: fc.integer({ min: 0, max: 999999 }),
  d: fc.integer({ min: 0, max: 999999 }),
}).filter((a) => a.gc + a.ss + a.d > 0);

const arbLedgerType: fc.Arbitrary<'income' | 'expense'> = fc.constantFrom('income', 'expense');

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-polish-and-functionality', () => {
  describe('Property 11: Treasury Delta Application', () => {
    /**
     * **Validates: Requirements 12.3**
     *
     * For any valid treasury balance and currency delta, if applying the delta
     * would result in any denomination going below 0, the operation is rejected;
     * otherwise, the resulting balance equals the original plus the delta.
     */

    it('rejects deltas that would produce a negative balance in any denomination', () => {
      fc.assert(
        fc.property(
          arbNonNegativeCurrency,
          arbArbitraryDelta,
          (current, delta) => {
            const wouldGoNegative =
              (current.gc + delta.gc) < 0 ||
              (current.ss + delta.ss) < 0 ||
              (current.d + delta.d) < 0;

            const isValid = validateTreasuryDelta(current, delta);

            if (wouldGoNegative) {
              expect(isValid).toBe(false);
            } else {
              expect(isValid).toBe(true);
            }
          }
        ),
        { numRuns: 200 }
      );
    });

    it('when delta is valid, applying it produces correct result per denomination', () => {
      fc.assert(
        fc.property(
          arbNonNegativeCurrency,
          arbArbitraryDelta,
          (current, delta) => {
            fc.pre(validateTreasuryDelta(current, delta));

            const result = applyCurrencyDelta(current, delta);

            expect(result.gc).toBe(current.gc + delta.gc);
            expect(result.ss).toBe(current.ss + delta.ss);
            expect(result.d).toBe(current.d + delta.d);
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe('Property 17: Ledger Amount Validation', () => {
    /**
     * **Validates: Requirements 21.3**
     *
     * Zero or negative amounts are rejected. Only strictly positive
     * total amounts (gc + ss + d > 0) are accepted.
     */

    it('rejects amounts where gc + ss + d is zero', () => {
      const zeroAmount: CurrencyDelta = { gc: 0, ss: 0, d: 0 };
      expect(isValidLedgerAmount(zeroAmount)).toBe(false);
    });

    it('rejects amounts where gc + ss + d is negative', () => {
      fc.assert(
        fc.property(
          fc.record({
            gc: fc.integer({ min: -999999, max: 0 }),
            ss: fc.integer({ min: -999999, max: 0 }),
            d: fc.integer({ min: -999999, max: 0 }),
          }).filter((a) => a.gc + a.ss + a.d < 0),
          (amount) => {
            expect(isValidLedgerAmount(amount)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('accepts amounts where gc + ss + d is strictly positive', () => {
      fc.assert(
        fc.property(
          arbPositiveAmount,
          (amount) => {
            expect(isValidLedgerAmount(amount)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for any amount, validation returns true iff total > 0', () => {
      fc.assert(
        fc.property(
          fc.record({
            gc: fc.integer({ min: -100, max: 100 }),
            ss: fc.integer({ min: -100, max: 100 }),
            d: fc.integer({ min: -100, max: 100 }),
          }),
          (amount) => {
            const total = amount.gc + amount.ss + amount.d;
            const valid = isValidLedgerAmount(amount);

            if (total > 0) {
              expect(valid).toBe(true);
            } else {
              expect(valid).toBe(false);
            }
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe('Property 18: Ledger Treasury Impact', () => {
    /**
     * **Validates: Requirements 21.5, 21.6**
     *
     * Income increases treasury by the entry amount.
     * Expense decreases treasury by the entry amount.
     */

    it('income entries increase treasury by the exact amount per denomination', () => {
      fc.assert(
        fc.property(
          arbNonNegativeCurrency,
          arbPositiveAmount,
          (treasury, amount) => {
            const result = applyLedgerEntry(treasury, amount, 'income');

            expect(result.gc).toBe(treasury.gc + amount.gc);
            expect(result.ss).toBe(treasury.ss + amount.ss);
            expect(result.d).toBe(treasury.d + amount.d);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('expense entries decrease treasury by the exact amount per denomination', () => {
      fc.assert(
        fc.property(
          arbNonNegativeCurrency,
          arbPositiveAmount,
          (treasury, amount) => {
            const result = applyLedgerEntry(treasury, amount, 'expense');

            expect(result.gc).toBe(treasury.gc - amount.gc);
            expect(result.ss).toBe(treasury.ss - amount.ss);
            expect(result.d).toBe(treasury.d - amount.d);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('income and expense are exact inverses of each other', () => {
      fc.assert(
        fc.property(
          arbNonNegativeCurrency,
          arbPositiveAmount,
          (treasury, amount) => {
            const afterIncome = applyLedgerEntry(treasury, amount, 'income');
            const afterExpense = applyLedgerEntry(afterIncome, amount, 'expense');

            // Applying income then expense of same amount returns to original
            expect(afterExpense.gc).toBe(treasury.gc);
            expect(afterExpense.ss).toBe(treasury.ss);
            expect(afterExpense.d).toBe(treasury.d);
          }
        ),
        { numRuns: 200 }
      );
    });
  });
});
