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
