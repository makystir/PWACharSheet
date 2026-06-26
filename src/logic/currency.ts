/**
 * Currency parsing and delta application logic for the combined currency input.
 * Supports Gold Crowns (GC), Silver Shillings (SS), and Brass Pennies (D).
 */

export interface CurrencyDelta {
  gc: number;
  ss: number;
  d: number;
}

/**
 * Token regex: optional sign (+ or -), integer (0–999999), case-insensitive suffix (GC, SS, D).
 * Whitespace between parts is allowed.
 */
const TOKEN_REGEX = /([+-])?\s*(\d{1,6})\s*(gc|ss|d)/gi;

/**
 * Parse a currency input string into denomination deltas.
 * Tokens: optional sign (+ or -), integer (0–999999), case-insensitive suffix (GC, SS, D).
 * Multiple tokens for the same denomination are summed.
 * Returns null if no valid tokens found.
 */
export function parseCurrencyInput(input: string): CurrencyDelta | null {
  const delta: CurrencyDelta = { gc: 0, ss: 0, d: 0 };
  let foundAny = false;

  let match: RegExpExecArray | null;
  // Reset lastIndex since we reuse the regex
  TOKEN_REGEX.lastIndex = 0;

  while ((match = TOKEN_REGEX.exec(input)) !== null) {
    const sign = match[1] === '-' ? -1 : 1;
    const value = Math.min(parseInt(match[2], 10), 999999);
    const suffix = match[3].toLowerCase();

    const amount = sign * value;

    switch (suffix) {
      case 'gc':
        delta.gc += amount;
        break;
      case 'ss':
        delta.ss += amount;
        break;
      case 'd':
        delta.d += amount;
        break;
    }

    foundAny = true;
  }

  return foundAny ? delta : null;
}

/**
 * Apply currency deltas to current values, clamping each to minimum 0.
 */
export function applyCurrencyDelta(current: CurrencyDelta, delta: CurrencyDelta): CurrencyDelta {
  return {
    gc: Math.max(0, current.gc + delta.gc),
    ss: Math.max(0, current.ss + delta.ss),
    d: Math.max(0, current.d + delta.d),
  };
}

/**
 * Validate that applying a delta to the current treasury would not produce
 * a negative balance in any denomination. Returns true if the delta is safe
 * to apply, false if it would result in any denomination going below 0.
 */
export function validateTreasuryDelta(current: CurrencyDelta, delta: CurrencyDelta): boolean {
  return (
    (current.gc + delta.gc) >= 0 &&
    (current.ss + delta.ss) >= 0 &&
    (current.d + delta.d) >= 0
  );
}

/**
 * Validate that a ledger entry amount is positive (greater than zero).
 * Returns true only when the total of all denominations is strictly positive.
 */
export function isValidLedgerAmount(amount: CurrencyDelta): boolean {
  return (amount.gc + amount.ss + amount.d) > 0;
}

/**
 * Apply a ledger entry to the treasury balance.
 * Income entries add to the treasury; expense entries subtract from it.
 * Returns the new treasury balance.
 */
export function applyLedgerEntry(
  treasury: CurrencyDelta,
  amount: CurrencyDelta,
  type: 'income' | 'expense'
): CurrencyDelta {
  const sign = type === 'income' ? 1 : -1;
  return {
    gc: treasury.gc + sign * amount.gc,
    ss: treasury.ss + sign * amount.ss,
    d: treasury.d + sign * amount.d,
  };
}
