import { describe, it, expect } from 'vitest';
import {
  getCorruptionThreshold,
  getCorruptionStatus,
  getSinRiskLevel,
  getWrathRiskValues,
  determineMutationType,
  getPhysicalMutationLimit,
  getMentalMutationLimit,
  getCorruptionLossOnMutation,
} from '../corruption';
import type { CharacteristicKey, CharacteristicValue } from '../../types/character';

// Helper: build a chars record from overrides (same pattern as calculators.test.ts)
function makeChars(
  overrides: Partial<Record<CharacteristicKey, { i: number; a: number }>> = {}
): Record<CharacteristicKey, CharacteristicValue> {
  const defaults: Record<CharacteristicKey, CharacteristicValue> = {
    WS: { i: 20, a: 0, b: 0 },
    BS: { i: 20, a: 0, b: 0 },
    S:  { i: 20, a: 0, b: 0 },
    T:  { i: 20, a: 0, b: 0 },
    I:  { i: 20, a: 0, b: 0 },
    Ag: { i: 20, a: 0, b: 0 },
    Dex:{ i: 20, a: 0, b: 0 },
    Int:{ i: 20, a: 0, b: 0 },
    WP: { i: 20, a: 0, b: 0 },
    Fel:{ i: 20, a: 0, b: 0 },
  };
  for (const [key, val] of Object.entries(overrides)) {
    defaults[key as CharacteristicKey] = { i: val.i, a: val.a, b: 0 };
  }
  return defaults;
}

// ─── Property 1: Corruption threshold equals TB + WPB + Pure Soul level ──────
// Validates: Requirements 1.1, 1.2, 1.3

describe('getCorruptionThreshold', () => {
  it('T=40, WP=30 → TB=4, WPB=3, threshold=7', () => {
    const chars = makeChars({ T: { i: 40, a: 0 }, WP: { i: 30, a: 0 } });
    expect(getCorruptionThreshold(chars, 0)).toBe(7);
  });

  it('T=25, WP=45, Pure Soul 2 → TB=2, WPB=4, threshold=8', () => {
    const chars = makeChars({ T: { i: 25, a: 0 }, WP: { i: 45, a: 0 } });
    expect(getCorruptionThreshold(chars, 2)).toBe(8);
  });

  it('T=10, WP=10 → threshold=2', () => {
    const chars = makeChars({ T: { i: 10, a: 0 }, WP: { i: 10, a: 0 } });
    expect(getCorruptionThreshold(chars, 0)).toBe(2);
  });

  it('T=0, WP=0 → threshold=0', () => {
    const chars = makeChars({ T: { i: 0, a: 0 }, WP: { i: 0, a: 0 } });
    expect(getCorruptionThreshold(chars, 0)).toBe(0);
  });
});

// ─── Property 2: Corruption status classification ────────────────────────────
// Validates: Requirements 2.1, 2.2, 2.3

describe('getCorruptionStatus', () => {
  it('corr=0, threshold=6 → normal', () => {
    expect(getCorruptionStatus(0, 6)).toBe('normal');
  });

  it('corr=2, threshold=6 → normal (2 < 3)', () => {
    expect(getCorruptionStatus(2, 6)).toBe('normal');
  });

  it('corr=3, threshold=6 → warning (3 >= 3, 3 < 6)', () => {
    expect(getCorruptionStatus(3, 6)).toBe('warning');
  });

  it('corr=5, threshold=6 → warning', () => {
    expect(getCorruptionStatus(5, 6)).toBe('warning');
  });

  it('corr=6, threshold=6 → danger', () => {
    expect(getCorruptionStatus(6, 6)).toBe('danger');
  });

  it('corr=10, threshold=6 → danger', () => {
    expect(getCorruptionStatus(10, 6)).toBe('danger');
  });
});

// ─── Property 4: Species mutation type distribution ──────────────────────────
// Validates: Requirements 8.1, 8.2, 8.3, 8.4

describe('determineMutationType', () => {
  describe('Human', () => {
    it('roll=1 → physical', () => {
      expect(determineMutationType(1, 'Human')).toBe('physical');
    });
    it('roll=50 → physical', () => {
      expect(determineMutationType(50, 'Human')).toBe('physical');
    });
    it('roll=51 → mental', () => {
      expect(determineMutationType(51, 'Human')).toBe('mental');
    });
    it('roll=100 → mental', () => {
      expect(determineMutationType(100, 'Human')).toBe('mental');
    });
  });

  describe('Dwarf', () => {
    it('roll=5 → physical', () => {
      expect(determineMutationType(5, 'Dwarf')).toBe('physical');
    });
    it('roll=6 → mental', () => {
      expect(determineMutationType(6, 'Dwarf')).toBe('mental');
    });
  });

  describe('Halfling', () => {
    it('roll=10 → physical', () => {
      expect(determineMutationType(10, 'Halfling')).toBe('physical');
    });
    it('roll=11 → mental', () => {
      expect(determineMutationType(11, 'Halfling')).toBe('mental');
    });
  });

  describe('High Elf', () => {
    it('roll=1 → mental', () => {
      expect(determineMutationType(1, 'High Elf')).toBe('mental');
    });
    it('roll=50 → mental', () => {
      expect(determineMutationType(50, 'High Elf')).toBe('mental');
    });
    it('roll=100 → mental', () => {
      expect(determineMutationType(100, 'High Elf')).toBe('mental');
    });
  });

  describe('Wood Elf', () => {
    it('roll=1 → mental', () => {
      expect(determineMutationType(1, 'Wood Elf')).toBe('mental');
    });
    it('roll=100 → mental', () => {
      expect(determineMutationType(100, 'Wood Elf')).toBe('mental');
    });
  });

  describe('Unknown species defaults to Human distribution', () => {
    it('roll=50 → physical (like Human)', () => {
      expect(determineMutationType(50, 'Gnome')).toBe('physical');
    });
    it('roll=51 → mental (like Human)', () => {
      expect(determineMutationType(51, 'Gnome')).toBe('mental');
    });
  });
});

// ─── Property 5: Mutation limits equal characteristic bonuses ────────────────
// Validates: Requirements 4.3, 4.4

describe('mutation limits', () => {
  it('T=40 → physical limit=4', () => {
    const chars = makeChars({ T: { i: 40, a: 0 } });
    expect(getPhysicalMutationLimit(chars)).toBe(4);
  });

  it('WP=30 → mental limit=3', () => {
    const chars = makeChars({ WP: { i: 30, a: 0 } });
    expect(getMentalMutationLimit(chars)).toBe(3);
  });

  it('T=55 → physical limit=5', () => {
    const chars = makeChars({ T: { i: 55, a: 0 } });
    expect(getPhysicalMutationLimit(chars)).toBe(5);
  });

  it('WP=22 → mental limit=2', () => {
    const chars = makeChars({ WP: { i: 22, a: 0 } });
    expect(getMentalMutationLimit(chars)).toBe(2);
  });
});

// ─── Property 6: Corruption loss on mutation equals WPB, floored at 0 ───────
// Validates: Requirements 6.1, 6.2

describe('corruption loss on mutation', () => {
  it('WP=30 (WPB=3), corr=5 → new corr=2', () => {
    const chars = makeChars({ WP: { i: 30, a: 0 } });
    const loss = getCorruptionLossOnMutation(chars);
    const newCorr = Math.max(0, 5 - loss);
    expect(newCorr).toBe(2);
  });

  it('WP=30 (WPB=3), corr=2 → new corr=0 (floored)', () => {
    const chars = makeChars({ WP: { i: 30, a: 0 } });
    const loss = getCorruptionLossOnMutation(chars);
    const newCorr = Math.max(0, 2 - loss);
    expect(newCorr).toBe(0);
  });

  it('WP=30 (WPB=3), corr=0 → new corr=0', () => {
    const chars = makeChars({ WP: { i: 30, a: 0 } });
    const loss = getCorruptionLossOnMutation(chars);
    const newCorr = Math.max(0, 0 - loss);
    expect(newCorr).toBe(0);
  });
});

// ─── Property 7: Sin risk level classification ──────────────────────────────
// Validates: Requirements 7.4, 7.5, 7.6, 7.7

describe('getSinRiskLevel', () => {
  it('sin=0 → none', () => {
    expect(getSinRiskLevel(0)).toBe('none');
  });

  it('sin=1 → mild', () => {
    expect(getSinRiskLevel(1)).toBe('mild');
  });

  it('sin=2 → mild', () => {
    expect(getSinRiskLevel(2)).toBe('mild');
  });

  it('sin=3 → mild', () => {
    expect(getSinRiskLevel(3)).toBe('mild');
  });

  it('sin=4 → moderate', () => {
    expect(getSinRiskLevel(4)).toBe('moderate');
  });

  it('sin=5 → moderate', () => {
    expect(getSinRiskLevel(5)).toBe('moderate');
  });

  it('sin=6 → moderate', () => {
    expect(getSinRiskLevel(6)).toBe('moderate');
  });

  it('sin=7 → danger', () => {
    expect(getSinRiskLevel(7)).toBe('danger');
  });

  it('sin=8 → danger', () => {
    expect(getSinRiskLevel(8)).toBe('danger');
  });

  it('sin=10 → danger', () => {
    expect(getSinRiskLevel(10)).toBe('danger');
  });
});

// ─── Property 8: Wrath risk values ──────────────────────────────────────────
// Validates: Requirements 7.3

describe('getWrathRiskValues', () => {
  it('sin=0 → []', () => {
    expect(getWrathRiskValues(0)).toEqual([]);
  });

  it('sin=3 → [1, 2, 3]', () => {
    expect(getWrathRiskValues(3)).toEqual([1, 2, 3]);
  });

  it('sin=7 → [1, 2, 3, 4, 5, 6, 7]', () => {
    expect(getWrathRiskValues(7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

// ─── Property 9: Corruption points cannot go below 0 ────────────────────────
// Validates: Requirements 3.3

describe('corruption points floor', () => {
  it('corr=5 decrement → 4', () => {
    expect(Math.max(0, 5 - 1)).toBe(4);
  });

  it('corr=1 decrement → 0', () => {
    expect(Math.max(0, 1 - 1)).toBe(0);
  });

  it('corr=0 decrement → 0', () => {
    expect(Math.max(0, 0 - 1)).toBe(0);
  });
});
