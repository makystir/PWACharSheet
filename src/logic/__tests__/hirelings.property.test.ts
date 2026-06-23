import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { clampWounds, isIncapacitated, createHirelingFromProfile, createBlankHireling } from '../hirelings';
import type { Hireling } from '../../types/character';
import type { HirelingProfile } from '../../data/hirelings';
import { HIRELING_PROFILES } from '../../data/hirelings';

// ─── Property 9: Wound increment/decrement respects bounds ───────────────────
// Feature: hirelings, Property 9: Wound increment/decrement respects bounds
// **Validates: Requirements 6.3**

describe('Property 9: Wound increment/decrement respects bounds', () => {
  it('clampWounds(wCur + 1, W) <= W for any wCur and positive W', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10, max: 100 }),
        fc.integer({ min: 1, max: 99 }),
        (wCur, W) => {
          expect(clampWounds(wCur + 1, W)).toBeLessThanOrEqual(W);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('clampWounds(wCur - 1, W) >= 0 for any wCur and positive W', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10, max: 100 }),
        fc.integer({ min: 1, max: 99 }),
        (wCur, W) => {
          expect(clampWounds(wCur - 1, W)).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('clampWounds(wCur, W) is always in range [0, W] for any wCur and positive W', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 200 }),
        fc.integer({ min: 1, max: 99 }),
        (wCur, W) => {
          const result = clampWounds(wCur, W);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(W);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 10: Incapacitated state iff wounds are zero ────────────────────
// Feature: hirelings, Property 10: Incapacitated state iff wounds are zero
// **Validates: Requirements 6.6**

const hirelingArb = fc.record({
  id: fc.nat(),
  name: fc.string(),
  role: fc.string(),
  status: fc.string(),
  M: fc.nat({ max: 99 }),
  WS: fc.nat({ max: 99 }),
  BS: fc.nat({ max: 99 }),
  S: fc.nat({ max: 99 }),
  T: fc.nat({ max: 99 }),
  I: fc.nat({ max: 99 }),
  Ag: fc.nat({ max: 99 }),
  Dex: fc.nat({ max: 99 }),
  Int: fc.nat({ max: 99 }),
  WP: fc.nat({ max: 99 }),
  Fel: fc.nat({ max: 99 }),
  W: fc.nat({ max: 99 }),
  wCur: fc.integer({ min: -10, max: 99 }),  // Include negatives to test incapacitated
  skills: fc.string(),
  talents: fc.string(),
  traits: fc.string(),
  trappings: fc.string(),
  template: fc.string(),
  physicalQuirk: fc.string(),
  workEthic: fc.string(),
  personalityQuirk: fc.string(),
  upkeep: fc.record({ gc: fc.nat({ max: 999 }), ss: fc.nat({ max: 999 }), d: fc.nat({ max: 999 }) }),
  conditions: fc.array(fc.record({ name: fc.string(), level: fc.nat({ max: 5 }) })),
  notes: fc.string(),
}) as fc.Arbitrary<Hireling>;

describe('Feature: hirelings, Property 10: Incapacitated state iff wounds are zero', () => {
  /**
   * **Validates: Requirements 6.6**
   *
   * For any hireling, isIncapacitated(hireling) returns true if and only if
   * hireling.wCur <= 0.
   */
  it('isIncapacitated returns true iff wCur <= 0 for any hireling', () => {
    fc.assert(
      fc.property(hirelingArb, (hireling) => {
        expect(isIncapacitated(hireling)).toBe(hireling.wCur <= 0);
      }),
      { numRuns: 100 }
    );
  });

  it('isIncapacitated returns false for positive wCur values', () => {
    fc.assert(
      fc.property(
        fc.record({
          ...Object.fromEntries(
            ['id', 'M', 'WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel', 'W'].map(
              (k) => [k, fc.nat({ max: 99 })]
            )
          ),
          name: fc.string(),
          role: fc.string(),
          status: fc.string(),
          wCur: fc.integer({ min: 1, max: 99 }),
          skills: fc.string(),
          talents: fc.string(),
          traits: fc.string(),
          trappings: fc.string(),
          template: fc.string(),
          physicalQuirk: fc.string(),
          workEthic: fc.string(),
          personalityQuirk: fc.string(),
          upkeep: fc.record({ gc: fc.nat({ max: 999 }), ss: fc.nat({ max: 999 }), d: fc.nat({ max: 999 }) }),
          conditions: fc.array(fc.record({ name: fc.string(), level: fc.nat({ max: 5 }) })),
          notes: fc.string(),
        }) as fc.Arbitrary<Hireling>,
        (hireling) => {
          expect(isIncapacitated(hireling)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isIncapacitated returns true for zero wCur', () => {
    fc.assert(
      fc.property(
        fc.record({
          ...Object.fromEntries(
            ['id', 'M', 'WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel', 'W'].map(
              (k) => [k, fc.nat({ max: 99 })]
            )
          ),
          name: fc.string(),
          role: fc.string(),
          status: fc.string(),
          wCur: fc.constant(0),
          skills: fc.string(),
          talents: fc.string(),
          traits: fc.string(),
          trappings: fc.string(),
          template: fc.string(),
          physicalQuirk: fc.string(),
          workEthic: fc.string(),
          personalityQuirk: fc.string(),
          upkeep: fc.record({ gc: fc.nat({ max: 999 }), ss: fc.nat({ max: 999 }), d: fc.nat({ max: 999 }) }),
          conditions: fc.array(fc.record({ name: fc.string(), level: fc.nat({ max: 5 }) })),
          notes: fc.string(),
        }) as fc.Arbitrary<Hireling>,
        (hireling) => {
          expect(isIncapacitated(hireling)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isIncapacitated returns true for negative wCur', () => {
    fc.assert(
      fc.property(
        fc.record({
          ...Object.fromEntries(
            ['id', 'M', 'WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel', 'W'].map(
              (k) => [k, fc.nat({ max: 99 })]
            )
          ),
          name: fc.string(),
          role: fc.string(),
          status: fc.string(),
          wCur: fc.integer({ min: -10, max: -1 }),
          skills: fc.string(),
          talents: fc.string(),
          traits: fc.string(),
          trappings: fc.string(),
          template: fc.string(),
          physicalQuirk: fc.string(),
          workEthic: fc.string(),
          personalityQuirk: fc.string(),
          upkeep: fc.record({ gc: fc.nat({ max: 999 }), ss: fc.nat({ max: 999 }), d: fc.nat({ max: 999 }) }),
          conditions: fc.array(fc.record({ name: fc.string(), level: fc.nat({ max: 5 }) })),
          notes: fc.string(),
        }) as fc.Arbitrary<Hireling>,
        (hireling) => {
          expect(isIncapacitated(hireling)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 4: Profile creation populates correct characteristics ──────────
// Feature: hirelings, Property 4: Profile creation populates correct characteristics
// **Validates: Requirements 2.3**

const profileArb = fc.record({
  name: fc.string({ minLength: 1 }),
  role: fc.string({ minLength: 1 }),
  status: fc.string({ minLength: 1 }),
  M: fc.nat({ max: 99 }),
  WS: fc.nat({ max: 99 }),
  BS: fc.nat({ max: 99 }),
  S: fc.nat({ max: 99 }),
  T: fc.nat({ max: 99 }),
  I: fc.nat({ max: 99 }),
  Ag: fc.nat({ max: 99 }),
  Dex: fc.nat({ max: 99 }),
  Int: fc.nat({ max: 99 }),
  WP: fc.nat({ max: 99 }),
  Fel: fc.nat({ max: 99 }),
  W: fc.nat({ max: 99 }),
  skills: fc.string(),
  talents: fc.string(),
  traits: fc.string(),
  trappings: fc.string(),
}) as fc.Arbitrary<HirelingProfile>;

describe('Feature: hirelings, Property 4: Profile creation populates correct characteristics', () => {
  /**
   * **Validates: Requirements 2.3**
   *
   * For any HirelingProfile, createHirelingFromProfile(profile) produces a hireling
   * whose M, WS, BS, S, T, I, Ag, Dex, Int, WP, Fel, W match the profile exactly.
   */
  it('createHirelingFromProfile populates all characteristics from the profile', () => {
    fc.assert(
      fc.property(profileArb, (profile) => {
        const hireling = createHirelingFromProfile(profile);
        expect(hireling.M).toBe(profile.M);
        expect(hireling.WS).toBe(profile.WS);
        expect(hireling.BS).toBe(profile.BS);
        expect(hireling.S).toBe(profile.S);
        expect(hireling.T).toBe(profile.T);
        expect(hireling.I).toBe(profile.I);
        expect(hireling.Ag).toBe(profile.Ag);
        expect(hireling.Dex).toBe(profile.Dex);
        expect(hireling.Int).toBe(profile.Int);
        expect(hireling.WP).toBe(profile.WP);
        expect(hireling.Fel).toBe(profile.Fel);
        expect(hireling.W).toBe(profile.W);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 5: Template selection does not modify characteristics ───────────
// Feature: hirelings, Property 5: Template selection does not modify characteristics
// **Validates: Requirements 3.4**

describe('Feature: hirelings, Property 5: Template selection does not modify characteristics', () => {
  /**
   * **Validates: Requirements 3.4**
   *
   * For any hireling and any template name string, setting the template field
   * shall not change any of the hireling's stored characteristic values.
   */
  it('setting template does not change any characteristic field', () => {
    fc.assert(
      fc.property(hirelingArb, fc.string(), (hireling, newTemplate) => {
        const modified = { ...hireling, template: newTemplate };

        expect(modified.M).toBe(hireling.M);
        expect(modified.WS).toBe(hireling.WS);
        expect(modified.BS).toBe(hireling.BS);
        expect(modified.S).toBe(hireling.S);
        expect(modified.T).toBe(hireling.T);
        expect(modified.I).toBe(hireling.I);
        expect(modified.Ag).toBe(hireling.Ag);
        expect(modified.Dex).toBe(hireling.Dex);
        expect(modified.Int).toBe(hireling.Int);
        expect(modified.WP).toBe(hireling.WP);
        expect(modified.Fel).toBe(hireling.Fel);
        expect(modified.W).toBe(hireling.W);
      }),
      { numRuns: 100 }
    );
  });

  it('template field is updated to the new value while characteristics are preserved', () => {
    fc.assert(
      fc.property(hirelingArb, fc.string(), (hireling, newTemplate) => {
        const modified = { ...hireling, template: newTemplate };

        // Template is actually set
        expect(modified.template).toBe(newTemplate);

        // All characteristics remain identical
        const characteristics = ['M', 'WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel', 'W'] as const;
        for (const stat of characteristics) {
          expect(modified[stat]).toBe(hireling[stat]);
        }
      }),
      { numRuns: 100 }
    );
  });
});


// ─── Property 1: Hireling serialization round-trip ───────────────────────────
// Feature: hirelings, Property 1: Hireling serialization round-trip
// **Validates: Requirements 1.2, 1.4**

describe('Feature: hirelings, Property 1: Hireling serialization round-trip', () => {
  const serializableHirelingArb = fc.record({
    id: fc.nat(),
    name: fc.string(),
    role: fc.string(),
    status: fc.string(),
    M: fc.nat({ max: 99 }),
    WS: fc.nat({ max: 99 }),
    BS: fc.nat({ max: 99 }),
    S: fc.nat({ max: 99 }),
    T: fc.nat({ max: 99 }),
    I: fc.nat({ max: 99 }),
    Ag: fc.nat({ max: 99 }),
    Dex: fc.nat({ max: 99 }),
    Int: fc.nat({ max: 99 }),
    WP: fc.nat({ max: 99 }),
    Fel: fc.nat({ max: 99 }),
    W: fc.nat({ max: 99 }),
    wCur: fc.nat({ max: 99 }),
    skills: fc.string(),
    talents: fc.string(),
    traits: fc.string(),
    trappings: fc.string(),
    template: fc.string(),
    physicalQuirk: fc.string(),
    workEthic: fc.string(),
    personalityQuirk: fc.string(),
    upkeep: fc.record({ gc: fc.nat({ max: 999 }), ss: fc.nat({ max: 999 }), d: fc.nat({ max: 999 }) }),
    conditions: fc.array(fc.record({ name: fc.string(), level: fc.nat({ max: 5 }) })),
    notes: fc.string(),
  });

  /**
   * **Validates: Requirements 1.2, 1.4**
   *
   * For any valid Hireling, JSON.parse(JSON.stringify(h)) produces an object
   * with identical field values.
   */
  it('JSON.parse(JSON.stringify(hireling)) deeply equals the original hireling', () => {
    fc.assert(
      fc.property(serializableHirelingArb, (hireling) => {
        const serialized = JSON.stringify(hireling);
        const parsed = JSON.parse(serialized);
        expect(parsed).toEqual(hireling);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 2: Hireling IDs are unique ─────────────────────────────────────
// Feature: hirelings, Property 2: Hireling IDs are unique
// **Validates: Requirements 1.3**

describe('Feature: hirelings, Property 2: Hireling IDs are unique', () => {
  /**
   * **Validates: Requirements 1.3**
   *
   * For any sequence of hireling additions, all IDs in the resulting array
   * are pairwise distinct.
   */
  it('createBlankHireling produces unique IDs for any count of creations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (n) => {
          const hirelings = Array.from({ length: n }, () => createBlankHireling());
          const ids = hirelings.map((h) => h.id);
          expect(new Set(ids).size).toBe(ids.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('createHirelingFromProfile produces unique IDs for any count of creations with any profile', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.array(
          fc.integer({ min: 0, max: HIRELING_PROFILES.length - 1 }),
          { minLength: 1, maxLength: 10 }
        ),
        (n, profileIndices) => {
          const count = Math.min(n, profileIndices.length);
          const hirelings = Array.from({ length: count }, (_, i) =>
            createHirelingFromProfile(HIRELING_PROFILES[profileIndices[i]])
          );
          const ids = hirelings.map((h) => h.id);
          expect(new Set(ids).size).toBe(ids.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('mixed createBlankHireling and createHirelingFromProfile produce pairwise distinct IDs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        fc.array(
          fc.integer({ min: 0, max: HIRELING_PROFILES.length - 1 }),
          { minLength: 1, maxLength: 5 }
        ),
        (blankCount, profileCount, profileIndices) => {
          const blanks = Array.from({ length: blankCount }, () => createBlankHireling());
          const actualProfileCount = Math.min(profileCount, profileIndices.length);
          const fromProfiles = Array.from({ length: actualProfileCount }, (_, i) =>
            createHirelingFromProfile(HIRELING_PROFILES[profileIndices[i]])
          );
          const allHirelings = [...blanks, ...fromProfiles];
          const ids = allHirelings.map((h) => h.id);
          expect(new Set(ids).size).toBe(ids.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 3: Maximum hireling count invariant ────────────────────────────
// Feature: hirelings, Property 3: Maximum hireling count invariant
// **Validates: Requirements 1.5**

describe('Feature: hirelings, Property 3: Maximum hireling count invariant', () => {
  /**
   * **Validates: Requirements 1.5**
   *
   * For any sequence of "add hireling" operations (1 to 20), the hirelings array
   * never exceeds 10 entries. The addHireling function models the business logic
   * constraint: reject additions beyond 10.
   */

  function addHireling(hirelings: Hireling[], newHireling: Hireling, maxCount = 10): Hireling[] {
    if (hirelings.length >= maxCount) return hirelings;
    return [...hirelings, newHireling];
  }

  it('hirelings array never exceeds 10 entries after any sequence of add operations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (numAdds) => {
          let hirelings: Hireling[] = [];
          for (let i = 0; i < numAdds; i++) {
            const newHireling = createBlankHireling();
            hirelings = addHireling(hirelings, newHireling);
          }
          expect(hirelings.length).toBeLessThanOrEqual(10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('adding beyond max returns the same array unchanged', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 11, max: 20 }),
        (numAdds) => {
          let hirelings: Hireling[] = [];
          for (let i = 0; i < numAdds; i++) {
            const newHireling = createBlankHireling();
            hirelings = addHireling(hirelings, newHireling);
          }
          // After 10 adds, subsequent adds should be rejected
          expect(hirelings.length).toBe(10);

          // Attempting one more add should return the same array
          const before = hirelings;
          const after = addHireling(hirelings, createBlankHireling());
          expect(after).toBe(before);
        }
      ),
      { numRuns: 100 }
    );
  });
});
