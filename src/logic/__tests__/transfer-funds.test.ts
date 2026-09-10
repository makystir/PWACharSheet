import { describe, it, expect } from 'vitest';
import { transferFunds } from '../currency';
import type { CurrencyDelta } from '../currency';

// Feature: wealth-treasury-transfer — example/unit tests for transferFunds.
// Concrete cases complementing the property tests (see transfer-funds.property.test.ts):
// exact-balance transfer, single-denomination transfer, and zero-and-over precedence.

describe('transferFunds — example cases', () => {
  it('exact-balance transfer drives the source to zero and moves the whole amount', () => {
    const source: CurrencyDelta = { gc: 2, ss: 5, d: 10 };
    const destination: CurrencyDelta = { gc: 0, ss: 3, d: 1 };
    // amount equals the source exactly in every denomination.
    const amount: CurrencyDelta = { gc: 2, ss: 5, d: 10 };

    const result = transferFunds(source, destination, amount);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Source empties out completely.
      expect(result.source).toEqual({ gc: 0, ss: 0, d: 0 });
      // Destination gains exactly the amount, per denomination.
      expect(result.destination).toEqual({ gc: 2, ss: 8, d: 11 });
    }
    // Inputs are not mutated (purity).
    expect(source).toEqual({ gc: 2, ss: 5, d: 10 });
    expect(destination).toEqual({ gc: 0, ss: 3, d: 1 });
  });

  it('single-denomination transfer moves only that denomination, leaving others untouched', () => {
    const source: CurrencyDelta = { gc: 10, ss: 4, d: 7 };
    const destination: CurrencyDelta = { gc: 1, ss: 2, d: 3 };
    // Only silver shillings move; gc and d amounts are zero.
    const amount: CurrencyDelta = { gc: 0, ss: 3, d: 0 };

    const result = transferFunds(source, destination, amount);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Only SS changes on both pools; GC and D are unchanged (no conversion).
      expect(result.source).toEqual({ gc: 10, ss: 1, d: 7 });
      expect(result.destination).toEqual({ gc: 1, ss: 5, d: 3 });
    }
    expect(source).toEqual({ gc: 10, ss: 4, d: 7 });
    expect(destination).toEqual({ gc: 1, ss: 2, d: 3 });
  });

  it('zero-and-over precedence: a zero-total amount is rejected as zero-amount even when it would also overdraw', () => {
    // Source has plenty of GC but no SS and no D.
    const source: CurrencyDelta = { gc: 5, ss: 0, d: 0 };
    const destination: CurrencyDelta = { gc: 0, ss: 0, d: 0 };
    // Total is zero (2SS in - 2SS out nets to zero), yet the -2SS component
    // would overdraw a source that has 0 SS. The zero-check must win.
    const amount: CurrencyDelta = { gc: 0, ss: 2, d: -2 };

    // Sanity: this amount totals zero across denominations.
    expect(amount.gc + amount.ss + amount.d).toBe(0);

    const result = transferFunds(source, destination, amount);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Zero-check precedence: reason is 'zero-amount', not 'insufficient-funds'.
      expect(result.reason).toBe('zero-amount');
    }
    // Inputs unchanged on rejection.
    expect(source).toEqual({ gc: 5, ss: 0, d: 0 });
    expect(destination).toEqual({ gc: 0, ss: 0, d: 0 });
  });
});
