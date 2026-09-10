import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { transferFunds } from '../currency';
import type { CurrencyDelta, TransferResult } from '../currency';

// Feature: wealth-treasury-transfer
// Property-based tests for the pure `transferFunds` helper (src/logic/currency.ts).
// Each property maps 1:1 to a correctness property in the design document.

// ─── Generators ─────────────────────────────────────────────────────────────

/** A non-negative pool balance (source or destination). */
const arbBalance: fc.Arbitrary<CurrencyDelta> = fc.record({
  gc: fc.integer({ min: 0, max: 999999 }),
  ss: fc.integer({ min: 0, max: 999999 }),
  d: fc.integer({ min: 0, max: 999999 }),
});

/** A strictly-positive amount (total across denominations > 0). */
const arbPositiveAmount: fc.Arbitrary<CurrencyDelta> = fc
  .record({
    gc: fc.integer({ min: 0, max: 999999 }),
    ss: fc.integer({ min: 0, max: 999999 }),
    d: fc.integer({ min: 0, max: 999999 }),
  })
  .filter((a) => a.gc + a.ss + a.d > 0);

/** An amount whose total is exactly zero across all denominations. */
const arbZeroAmount: fc.Arbitrary<CurrencyDelta> = fc.constant({ gc: 0, ss: 0, d: 0 });

/**
 * A source balance paired with a coverable, non-zero amount. We generate the
 * amount first, then derive a source that fully covers it in every denomination
 * (source = amount + slack). This constrains generation to the coverable input
 * space rather than discarding via fc.pre.
 */
const arbCoverableSourceAndAmount: fc.Arbitrary<{
  source: CurrencyDelta;
  amount: CurrencyDelta;
}> = fc
  .record({
    amount: arbPositiveAmount,
    slack: fc.record({
      gc: fc.integer({ min: 0, max: 999999 }),
      ss: fc.integer({ min: 0, max: 999999 }),
      d: fc.integer({ min: 0, max: 999999 }),
    }),
  })
  .map(({ amount, slack }) => ({
    amount,
    source: {
      gc: amount.gc + slack.gc,
      ss: amount.ss + slack.ss,
      d: amount.d + slack.d,
    },
  }));

/** Deep clone of a CurrencyDelta so we can assert inputs weren't mutated. */
const clone = (c: CurrencyDelta): CurrencyDelta => ({ gc: c.gc, ss: c.ss, d: c.d });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: wealth-treasury-transfer', () => {
  // Feature: wealth-treasury-transfer, Property 1: successful transfer subtracts from source, adds to destination, conserves per-denomination total (both directions)
  describe('Property 1: successful transfer conserves per-denomination total', () => {
    /**
     * **Validates: Requirements 1.2, 2.2**
     *
     * For any source, destination, and coverable non-zero amount, transferFunds
     * returns ok:true where source − amount is the new source and
     * destination + amount is the new destination; the per-denomination sum
     * source + destination is unchanged. A withdrawal is just
     * transferFunds(treasury, wealth, amount), so this covers both directions.
     */
    it('subtracts from source, adds to destination, and conserves total per denomination', () => {
      fc.assert(
        fc.property(arbBalance, arbCoverableSourceAndAmount, (destination, { source, amount }) => {
          const result = transferFunds(source, destination, amount);

          expect(result.ok).toBe(true);
          if (!result.ok) return;

          // Source subtracts the amount per denomination.
          expect(result.source.gc).toBe(source.gc - amount.gc);
          expect(result.source.ss).toBe(source.ss - amount.ss);
          expect(result.source.d).toBe(source.d - amount.d);

          // Destination adds the amount per denomination.
          expect(result.destination.gc).toBe(destination.gc + amount.gc);
          expect(result.destination.ss).toBe(destination.ss + amount.ss);
          expect(result.destination.d).toBe(destination.d + amount.d);

          // Total coin per denomination is conserved across both pools.
          expect(result.source.gc + result.destination.gc).toBe(source.gc + destination.gc);
          expect(result.source.ss + result.destination.ss).toBe(source.ss + destination.ss);
          expect(result.source.d + result.destination.d).toBe(source.d + destination.d);
        }),
        { numRuns: 200 }
      );
    });
  });

  // Feature: wealth-treasury-transfer, Property 2: each denomination moves independently; no cross-denomination conversion
  describe('Property 2: denominations move independently (no conversion)', () => {
    /**
     * **Validates: Requirements 4.1, 4.2**
     *
     * Each denomination (GC, SS, D) of both resulting balances changes by
     * exactly the amount specified for that denomination and by nothing derived
     * from the other denominations — no coin is converted between denominations.
     */
    it('changes each denomination by exactly its own amount, independent of the others', () => {
      fc.assert(
        fc.property(arbBalance, arbCoverableSourceAndAmount, (destination, { source, amount }) => {
          const result = transferFunds(source, destination, amount);

          expect(result.ok).toBe(true);
          if (!result.ok) return;

          // Each denomination's net movement equals exactly its own amount.
          expect(source.gc - result.source.gc).toBe(amount.gc);
          expect(source.ss - result.source.ss).toBe(amount.ss);
          expect(source.d - result.source.d).toBe(amount.d);

          expect(result.destination.gc - destination.gc).toBe(amount.gc);
          expect(result.destination.ss - destination.ss).toBe(amount.ss);
          expect(result.destination.d - destination.d).toBe(amount.d);

          // No cross-denomination coupling: perturbing one denomination's amount
          // changes only that denomination in the result. Zero out gc and re-run.
          const amountNoGc: CurrencyDelta = { gc: 0, ss: amount.ss, d: amount.d };
          const perturbed = transferFunds(source, destination, amountNoGc);
          if (perturbed.ok) {
            // SS and D outcomes are unaffected by removing the GC amount.
            expect(perturbed.source.ss).toBe(result.source.ss);
            expect(perturbed.source.d).toBe(result.source.d);
            expect(perturbed.destination.ss).toBe(result.destination.ss);
            expect(perturbed.destination.d).toBe(result.destination.d);
            // Only GC changed (it now moves nothing).
            expect(perturbed.source.gc).toBe(source.gc);
            expect(perturbed.destination.gc).toBe(destination.gc);
          }
        }),
        { numRuns: 200 }
      );
    });
  });

  // Feature: wealth-treasury-transfer, Property 3: insufficient funds → ok:false reason 'insufficient-funds', inputs unchanged
  describe('Property 3: insufficient funds rejected, inputs unchanged', () => {
    /**
     * **Validates: Requirements 1.4, 2.4**
     *
     * For any amount that exceeds the source in at least one denomination,
     * transferFunds returns ok:false reason 'insufficient-funds' and does not
     * mutate the source or destination arguments.
     */
    it('rejects an amount that overdraws the source in at least one denomination', () => {
      // Generate a non-negative source and a positive amount, keeping only cases
      // where the amount overdraws the source somewhere (total still positive, so
      // the zero-check passes and the coverage check is what fails).
      const arbOverdraw = fc
        .record({ source: arbBalance, amount: arbPositiveAmount })
        .filter(
          ({ source, amount }) =>
            amount.gc > source.gc || amount.ss > source.ss || amount.d > source.d
        );

      fc.assert(
        fc.property(arbBalance, arbOverdraw, (destination, { source, amount }) => {
          const sourceBefore = clone(source);
          const destBefore = clone(destination);

          const result: TransferResult = transferFunds(source, destination, amount);

          expect(result.ok).toBe(false);
          if (result.ok) return;
          expect(result.reason).toBe('insufficient-funds');

          // Inputs are not mutated.
          expect(source).toEqual(sourceBefore);
          expect(destination).toEqual(destBefore);
        }),
        { numRuns: 200 }
      );
    });
  });

  // Feature: wealth-treasury-transfer, Property 4: zero-total amount → ok:false reason 'zero-amount', inputs unchanged
  describe('Property 4: zero amount rejected, inputs unchanged', () => {
    /**
     * **Validates: Requirements 6.4**
     *
     * For any source and destination and any amount that totals zero across all
     * denominations, transferFunds returns ok:false reason 'zero-amount' and
     * does not mutate its arguments.
     */
    it('rejects a zero-total amount and leaves inputs unchanged', () => {
      fc.assert(
        fc.property(arbBalance, arbBalance, arbZeroAmount, (source, destination, amount) => {
          const sourceBefore = clone(source);
          const destBefore = clone(destination);

          const result: TransferResult = transferFunds(source, destination, amount);

          expect(result.ok).toBe(false);
          if (result.ok) return;
          expect(result.reason).toBe('zero-amount');

          // Inputs are not mutated.
          expect(source).toEqual(sourceBefore);
          expect(destination).toEqual(destBefore);
        }),
        { numRuns: 100 }
      );
    });
  });

  // Feature: wealth-treasury-transfer, Property 5: deposit then withdraw the same amount restores both pools (round-trip identity)
  describe('Property 5: deposit then withdraw is an identity (round-trip)', () => {
    /**
     * **Validates: Requirements 1.2, 2.2, 4.1**
     *
     * For any personal wealth and treasury balances and any amount the wealth can
     * cover, depositing the amount (wealth → treasury) and then withdrawing the
     * same amount (treasury → wealth) restores both pools to their originals.
     */
    it('restores both pools after a deposit followed by a matching withdrawal', () => {
      fc.assert(
        fc.property(arbBalance, arbCoverableSourceAndAmount, (treasury, { source: wealth, amount }) => {
          // Deposit: wealth → treasury.
          const deposit = transferFunds(wealth, treasury, amount);
          expect(deposit.ok).toBe(true);
          if (!deposit.ok) return;

          const wealthAfterDeposit = deposit.source;
          const treasuryAfterDeposit = deposit.destination;

          // Withdraw the same amount: treasury → wealth.
          const withdraw = transferFunds(treasuryAfterDeposit, wealthAfterDeposit, amount);
          expect(withdraw.ok).toBe(true);
          if (!withdraw.ok) return;

          const treasuryFinal = withdraw.source;
          const wealthFinal = withdraw.destination;

          // Both pools return to their original per-denomination balances.
          expect(wealthFinal).toEqual(wealth);
          expect(treasuryFinal).toEqual(treasury);
        }),
        { numRuns: 200 }
      );
    });
  });
});
