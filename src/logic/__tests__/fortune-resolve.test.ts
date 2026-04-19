import { describe, it, expect } from 'vitest';
import {
  spendFortune,
  spendResolve,
  burnFate,
  burnResilience,
  sessionReset,
  validateFortuneResolve,
} from '../fortune-resolve';

// ─── Property 1: Spend decrements by exactly 1 ──────────────────────────────
// Validates: Requirements 2.2, 3.2

describe('spendFortune — Property 1: Spend decrements by exactly 1', () => {
  it('fortune 3 → 2', () => {
    expect(spendFortune(3, 3)).toBe(2);
  });

  it('fortune 2 → 1', () => {
    expect(spendFortune(3, 2)).toBe(1);
  });

  it('fortune 1 → 0', () => {
    expect(spendFortune(3, 1)).toBe(0);
  });

  it('decrements by exactly 1 for fortune values 1–7', () => {
    for (let f = 1; f <= 7; f++) {
      expect(spendFortune(7, f)).toBe(f - 1);
    }
  });
});

describe('spendResolve — Property 1: Spend decrements by exactly 1', () => {
  it('resolve 2 → 1', () => {
    expect(spendResolve(2, 2)).toBe(1);
  });

  it('resolve 1 → 0', () => {
    expect(spendResolve(2, 1)).toBe(0);
  });

  it('decrements by exactly 1 for resolve values 1–7', () => {
    for (let r = 1; r <= 7; r++) {
      expect(spendResolve(7, r)).toBe(r - 1);
    }
  });
});

// ─── Property 2: Spend at zero is prevented ─────────────────────────────────
// Validates: Requirements 2.3, 3.3

describe('spendFortune — Property 2: Spend at zero is prevented', () => {
  it('spendFortune(3, 0) returns null', () => {
    expect(spendFortune(3, 0)).toBeNull();
  });

  it('spendFortune(0, 0) returns null', () => {
    expect(spendFortune(0, 0)).toBeNull();
  });
});

describe('spendResolve — Property 2: Spend at zero is prevented', () => {
  it('spendResolve(2, 0) returns null', () => {
    expect(spendResolve(2, 0)).toBeNull();
  });

  it('spendResolve(0, 0) returns null', () => {
    expect(spendResolve(0, 0)).toBeNull();
  });
});


// ─── Property 3: Burn decrements base by exactly 1 ──────────────────────────
// Validates: Requirements 4.2, 5.2

describe('burnFate — Property 3: Burn decrements base by exactly 1', () => {
  it('burnFate(3, 2) returns { fate: 2, fortune: 2 }', () => {
    expect(burnFate(3, 2)).toEqual({ fate: 2, fortune: 2 });
  });

  it('burnFate(1, 0) returns { fate: 0, fortune: 0 }', () => {
    expect(burnFate(1, 0)).toEqual({ fate: 0, fortune: 0 });
  });

  it('decrements fate by exactly 1 for fate values 1–7', () => {
    for (let f = 1; f <= 7; f++) {
      const result = burnFate(f, 0);
      expect(result).not.toBeNull();
      expect(result!.fate).toBe(f - 1);
    }
  });
});

describe('burnResilience — Property 3: Burn decrements base by exactly 1', () => {
  it('burnResilience(2, 1) returns { resilience: 1, resolve: 1 }', () => {
    expect(burnResilience(2, 1)).toEqual({ resilience: 1, resolve: 1 });
  });

  it('burnResilience(1, 0) returns { resilience: 0, resolve: 0 }', () => {
    expect(burnResilience(1, 0)).toEqual({ resilience: 0, resolve: 0 });
  });

  it('decrements resilience by exactly 1 for resilience values 1–7', () => {
    for (let r = 1; r <= 7; r++) {
      const result = burnResilience(r, 0);
      expect(result).not.toBeNull();
      expect(result!.resilience).toBe(r - 1);
    }
  });
});

// ─── Property 4: Burn clamps spendable pool to new base ─────────────────────
// Validates: Requirements 4.3, 5.3, 7.5, 7.6

describe('burnFate — Property 4: Burn clamps spendable pool to new base', () => {
  it('burnFate(3, 3) clamps fortune from 3 to 2', () => {
    expect(burnFate(3, 3)).toEqual({ fate: 2, fortune: 2 });
  });

  it('burnFate(3, 1) leaves fortune unchanged at 1', () => {
    expect(burnFate(3, 1)).toEqual({ fate: 2, fortune: 1 });
  });

  it('burnFate(2, 2) clamps fortune from 2 to 1', () => {
    expect(burnFate(2, 2)).toEqual({ fate: 1, fortune: 1 });
  });

  it('burnFate(1, 1) clamps fortune from 1 to 0', () => {
    expect(burnFate(1, 1)).toEqual({ fate: 0, fortune: 0 });
  });
});

describe('burnResilience — Property 4: Burn clamps spendable pool to new base', () => {
  it('burnResilience(2, 2) clamps resolve from 2 to 1', () => {
    expect(burnResilience(2, 2)).toEqual({ resilience: 1, resolve: 1 });
  });

  it('burnResilience(2, 0) leaves resolve unchanged at 0', () => {
    expect(burnResilience(2, 0)).toEqual({ resilience: 1, resolve: 0 });
  });

  it('burnResilience(3, 3) clamps resolve from 3 to 2', () => {
    expect(burnResilience(3, 3)).toEqual({ resilience: 2, resolve: 2 });
  });

  it('burnResilience(1, 1) clamps resolve from 1 to 0', () => {
    expect(burnResilience(1, 1)).toEqual({ resilience: 0, resolve: 0 });
  });
});

// ─── Property 5: Burn at zero is prevented ──────────────────────────────────
// Validates: Requirements 4.4, 5.4

describe('burnFate — Property 5: Burn at zero is prevented', () => {
  it('burnFate(0, 0) returns null', () => {
    expect(burnFate(0, 0)).toBeNull();
  });
});

describe('burnResilience — Property 5: Burn at zero is prevented', () => {
  it('burnResilience(0, 0) returns null', () => {
    expect(burnResilience(0, 0)).toBeNull();
  });
});

// ─── Property 6: Session reset restores pools to base values ─────────────────
// Validates: Requirements 6.2, 6.3

describe('sessionReset — Property 6: Session reset restores pools to base values', () => {
  it('sessionReset(3, 2) returns { fortune: 3, resolve: 2 }', () => {
    expect(sessionReset(3, 2)).toEqual({ fortune: 3, resolve: 2 });
  });

  it('sessionReset(0, 0) returns { fortune: 0, resolve: 0 }', () => {
    expect(sessionReset(0, 0)).toEqual({ fortune: 0, resolve: 0 });
  });

  it('fortune always equals fate and resolve always equals resilience for values 0–7', () => {
    for (let fate = 0; fate <= 7; fate++) {
      for (let resilience = 0; resilience <= 7; resilience++) {
        const result = sessionReset(fate, resilience);
        expect(result.fortune).toBe(fate);
        expect(result.resolve).toBe(resilience);
      }
    }
  });
});

// ─── Property 7: Non-negativity invariant ────────────────────────────────────
// Validates: Requirements 7.1, 7.2, 7.3, 7.4

describe('Non-negativity invariant — Property 7', () => {
  it('all spend/burn/reset outputs are >= 0 for value combinations 0–5', () => {
    for (let fate = 0; fate <= 5; fate++) {
      for (let fortune = 0; fortune <= fate; fortune++) {
        for (let resilience = 0; resilience <= 5; resilience++) {
          for (let resolve = 0; resolve <= resilience; resolve++) {
            // spendFortune
            const sf = spendFortune(fate, fortune);
            if (sf !== null) expect(sf).toBeGreaterThanOrEqual(0);

            // spendResolve
            const sr = spendResolve(resilience, resolve);
            if (sr !== null) expect(sr).toBeGreaterThanOrEqual(0);

            // burnFate
            const bf = burnFate(fate, fortune);
            if (bf !== null) {
              expect(bf.fate).toBeGreaterThanOrEqual(0);
              expect(bf.fortune).toBeGreaterThanOrEqual(0);
            }

            // burnResilience
            const br = burnResilience(resilience, resolve);
            if (br !== null) {
              expect(br.resilience).toBeGreaterThanOrEqual(0);
              expect(br.resolve).toBeGreaterThanOrEqual(0);
            }

            // sessionReset
            const reset = sessionReset(fate, resilience);
            expect(reset.fortune).toBeGreaterThanOrEqual(0);
            expect(reset.resolve).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });
});

// ─── validateFortuneResolve ──────────────────────────────────────────────────
// Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6

describe('validateFortuneResolve', () => {
  it('returns true for valid state: fate=3, fortune=2, resilience=2, resolve=1', () => {
    expect(validateFortuneResolve(3, 2, 2, 1)).toBe(true);
  });

  it('returns true when pools equal base: fate=3, fortune=3, resilience=2, resolve=2', () => {
    expect(validateFortuneResolve(3, 3, 2, 2)).toBe(true);
  });

  it('returns true for all zeros', () => {
    expect(validateFortuneResolve(0, 0, 0, 0)).toBe(true);
  });

  it('returns false when fortune exceeds fate', () => {
    expect(validateFortuneResolve(2, 3, 2, 1)).toBe(false);
  });

  it('returns false when resolve exceeds resilience', () => {
    expect(validateFortuneResolve(3, 2, 1, 2)).toBe(false);
  });

  it('returns false when fate is negative', () => {
    expect(validateFortuneResolve(-1, 0, 2, 1)).toBe(false);
  });

  it('returns false when fortune is negative', () => {
    expect(validateFortuneResolve(3, -1, 2, 1)).toBe(false);
  });

  it('returns false when resilience is negative', () => {
    expect(validateFortuneResolve(3, 2, -1, 0)).toBe(false);
  });

  it('returns false when resolve is negative', () => {
    expect(validateFortuneResolve(3, 2, 2, -1)).toBe(false);
  });
});
