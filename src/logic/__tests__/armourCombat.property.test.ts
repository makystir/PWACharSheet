// Feature: expanded-armour-system, Property 12: Partial Flaw Combat Bypass
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { resolveArmourCombatEffects } from '../armourCombat';
import type { ArmourItem } from '../../types/character';
import type { ArmourType } from '../../types/character';

/**
 * Property 12: Partial Flaw Combat Bypass
 *
 * **Validates: Requirements 11.1, 11.2**
 *
 * For any hit on a location protected only by armour with the Partial flaw,
 * when the to-hit roll is even OR a Critical Hit is scored, the Partial armour's
 * AP SHALL be ignored (effective AP contribution from that piece is 0).
 */

// ─── Generators ──────────────────────────────────────────────────────────────

const ARMOUR_TYPES: ArmourType[] = ['SoftKit', 'BoiledLeather', 'Chainmail', 'Brigandine', 'Plate'];

const arbArmourType: fc.Arbitrary<ArmourType> = fc.constantFrom(...ARMOUR_TYPES);

const arbAP: fc.Arbitrary<number> = fc.integer({ min: 1, max: 5 });

const arbCurrentAp: fc.Arbitrary<number | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.integer({ min: 1, max: 5 }),
);

/** Generate an armour item with the Partial flaw and varying AP/type */
function arbPartialArmourItem(ap: fc.Arbitrary<number>, armourType: fc.Arbitrary<ArmourType>): fc.Arbitrary<ArmourItem> {
  return fc.record({
    ap: ap,
    armourType: armourType,
    currentAp: arbCurrentAp,
  }).map(({ ap: apVal, armourType: type, currentAp }) => {
    // Ensure currentAp is within valid range if defined
    const effectiveCurrentAp = currentAp !== undefined ? Math.min(currentAp, apVal) : undefined;
    return {
      name: 'Test Partial Armour',
      locations: 'Body',
      enc: '1',
      ap: apVal,
      qualities: 'Partial',
      worn: true,
      armourType: type,
      currentAp: effectiveCurrentAp,
    };
  });
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: expanded-armour-system, Property 12: Partial Flaw Combat Bypass', () => {
  it('Partial flaw armour has effectiveAP=0 and partialBypassed=true when toHitRollEven=true', () => {
    fc.assert(
      fc.property(
        arbPartialArmourItem(arbAP, arbArmourType),
        (item) => {
          const result = resolveArmourCombatEffects({
            armourItems: [item],
            toHitRollEven: true,
            isCriticalHit: false,
            attackerHasImpale: false,
          });

          expect(result.effectiveAP).toBe(0);
          expect(result.partialBypassed).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Partial flaw armour has effectiveAP=0 and partialBypassed=true when isCriticalHit=true (even if toHitRollEven=false)', () => {
    fc.assert(
      fc.property(
        arbPartialArmourItem(arbAP, arbArmourType),
        (item) => {
          const result = resolveArmourCombatEffects({
            armourItems: [item],
            toHitRollEven: false,
            isCriticalHit: true,
            attackerHasImpale: false,
          });

          expect(result.effectiveAP).toBe(0);
          expect(result.partialBypassed).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Partial flaw armour retains AP and partialBypassed=false when toHitRollEven=false AND isCriticalHit=false', () => {
    fc.assert(
      fc.property(
        arbPartialArmourItem(arbAP, arbArmourType),
        (item) => {
          const result = resolveArmourCombatEffects({
            armourItems: [item],
            toHitRollEven: false,
            isCriticalHit: false,
            attackerHasImpale: false,
          });

          // The effective AP should be the item's current AP (or base AP if currentAp undefined)
          const expectedAP = item.currentAp ?? item.ap;
          expect(result.effectiveAP).toBe(expectedAP);
          expect(result.partialBypassed).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// Feature: expanded-armour-system, Property 13: Impenetrable Quality Critical Negation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Property 13: Impenetrable Quality Critical Negation
 *
 * **Validates: Requirements 12.1, 12.2**
 *
 * For any Critical Wound on a location protected by armour with the Impenetrable quality,
 * the Critical Wound SHALL be negated if and only if the to-hit roll is odd.
 */

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generate an armour item with the Impenetrable quality and varying AP/type */
function arbImpenetrableArmourItem(): fc.Arbitrary<ArmourItem> {
  return fc.record({
    ap: fc.integer({ min: 1, max: 5 }),
    armourType: fc.constantFrom<ArmourType>('SoftKit', 'BoiledLeather', 'Chainmail', 'Brigandine', 'Plate'),
    currentAp: fc.oneof(fc.constant(undefined), fc.integer({ min: 1, max: 5 })),
  }).map(({ ap, armourType, currentAp }) => {
    const effectiveCurrentAp = currentAp !== undefined ? Math.min(currentAp, ap) : undefined;
    return {
      name: 'Test Impenetrable Armour',
      locations: 'Body',
      enc: '1',
      ap,
      qualities: 'Impenetrable',
      worn: true,
      armourType,
      currentAp: effectiveCurrentAp,
    };
  });
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: expanded-armour-system, Property 13: Impenetrable Quality Critical Negation', () => {
  it('Impenetrable armour negates critical when isCriticalHit=true AND toHitRollEven=false (odd roll)', () => {
    fc.assert(
      fc.property(
        arbImpenetrableArmourItem(),
        (item) => {
          const result = resolveArmourCombatEffects({
            armourItems: [item],
            toHitRollEven: false, // odd roll
            isCriticalHit: true,
            attackerHasImpale: false,
          });

          expect(result.impenetrableNegatesCrit).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Impenetrable armour does NOT negate critical when isCriticalHit=true AND toHitRollEven=true (even roll)', () => {
    fc.assert(
      fc.property(
        arbImpenetrableArmourItem(),
        (item) => {
          const result = resolveArmourCombatEffects({
            armourItems: [item],
            toHitRollEven: true, // even roll
            isCriticalHit: true,
            attackerHasImpale: false,
          });

          expect(result.impenetrableNegatesCrit).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Impenetrable armour does NOT negate critical when isCriticalHit=false (regardless of roll parity)', () => {
    fc.assert(
      fc.property(
        arbImpenetrableArmourItem(),
        fc.boolean(),
        (item, toHitRollEven) => {
          const result = resolveArmourCombatEffects({
            armourItems: [item],
            toHitRollEven,
            isCriticalHit: false,
            attackerHasImpale: false,
          });

          expect(result.impenetrableNegatesCrit).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature: expanded-armour-system, Property 14: Weakpoints + Impale Ignores AP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Property 14: Weakpoints + Impale Ignores AP
 *
 * **Validates: Requirements 13.1**
 *
 * For any Critical Hit scored with a weapon possessing the Impale quality on a
 * location protected by armour with the Weakpoints flaw (not suppressed by
 * Reinforced Soft Kit), all AP from that armour piece SHALL be ignored.
 */

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generate a Plate armour item with the Weakpoints flaw and varying AP */
function arbWeakpointsArmourItem(): fc.Arbitrary<ArmourItem> {
  return fc.record({
    ap: fc.integer({ min: 1, max: 5 }),
    currentAp: fc.oneof(fc.constant(undefined), fc.integer({ min: 1, max: 5 })),
  }).map(({ ap, currentAp }) => {
    const effectiveCurrentAp = currentAp !== undefined ? Math.min(currentAp, ap) : undefined;
    return {
      name: 'Test Weakpoints Plate',
      locations: 'Body',
      enc: '2',
      ap,
      qualities: 'Impenetrable, Weakpoints',
      worn: true,
      armourType: 'Plate' as ArmourType,
      currentAp: effectiveCurrentAp,
    };
  });
}

/** Generate a Reinforced Soft Kit item to suppress Weakpoints */
function arbReinforcedSoftKit(): fc.Arbitrary<ArmourItem> {
  return fc.integer({ min: 0, max: 1 }).map((ap) => ({
    name: 'Reinforced Soft Kit',
    locations: 'Body',
    enc: '1',
    ap,
    qualities: 'Partial, Reinforced',
    worn: true,
    armourType: 'SoftKit' as ArmourType,
    currentAp: ap,
  }));
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: expanded-armour-system, Property 14: Weakpoints + Impale Ignores AP', () => {
  it('Weakpoints armour has effectiveAP=0 and weakpointsBypassed=true when isCriticalHit=true AND attackerHasImpale=true', () => {
    fc.assert(
      fc.property(
        arbWeakpointsArmourItem(),
        (item) => {
          const result = resolveArmourCombatEffects({
            armourItems: [item],
            toHitRollEven: false,
            isCriticalHit: true,
            attackerHasImpale: true,
          });

          expect(result.effectiveAP).toBe(0);
          expect(result.weakpointsBypassed).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Weakpoints armour retains AP and weakpointsBypassed=false when isCriticalHit=false OR attackerHasImpale=false', () => {
    fc.assert(
      fc.property(
        arbWeakpointsArmourItem(),
        fc.record({
          isCriticalHit: fc.boolean(),
          attackerHasImpale: fc.boolean(),
        }).filter(({ isCriticalHit, attackerHasImpale }) => !isCriticalHit || !attackerHasImpale),
        (item, { isCriticalHit, attackerHasImpale }) => {
          const result = resolveArmourCombatEffects({
            armourItems: [item],
            toHitRollEven: false, // odd roll so Partial doesn't trigger
            isCriticalHit,
            attackerHasImpale,
          });

          const expectedAP = item.currentAp ?? item.ap;
          expect(result.effectiveAP).toBe(expectedAP);
          expect(result.weakpointsBypassed).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Weakpoints is suppressed by Reinforced Soft Kit: weakpointsBypassed=false even with isCriticalHit=true AND attackerHasImpale=true', () => {
    fc.assert(
      fc.property(
        arbWeakpointsArmourItem(),
        arbReinforcedSoftKit(),
        (plateItem, softKitItem) => {
          const result = resolveArmourCombatEffects({
            armourItems: [plateItem, softKitItem],
            toHitRollEven: false, // odd roll so Partial on soft kit doesn't trigger
            isCriticalHit: true,
            attackerHasImpale: true,
          });

          // Weakpoints should NOT be bypassed because Reinforced Soft Kit suppresses it
          expect(result.weakpointsBypassed).toBe(false);
          // Plate AP should be preserved (not zeroed)
          const expectedPlateAP = plateItem.currentAp ?? plateItem.ap;
          expect(result.effectiveAP).toBeGreaterThanOrEqual(expectedPlateAP);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: expanded-armour-system, Property 6: Critical Deflection Reduces AP By Exactly 1
import { applyDeflection } from '../armourCombat';

/**
 * Property 6: Critical Deflection Reduces AP By Exactly 1
 *
 * **Validates: Requirements 6.5**
 *
 * For any armour piece with currentAp > 0 at a hit location, when Critical Deflection
 * is activated, the resulting currentAp SHALL be exactly previousCurrentAp - 1.
 */

// ─── Generators ──────────────────────────────────────────────────────────────

const DEFLECTION_ARMOUR_TYPES: ArmourType[] = ['SoftKit', 'BoiledLeather', 'Chainmail', 'Brigandine', 'Plate'];

const arbDeflectionArmourType: fc.Arbitrary<ArmourType> = fc.constantFrom(...DEFLECTION_ARMOUR_TYPES);

const arbArmourName: fc.Arbitrary<string> = fc.constantFrom(
  'Chainmail Coat', 'Breastplate', 'Leather Jack', 'Brigandine Jerkin',
  'Great Helm', 'Bascinet', 'Plate Leggings', 'Soft Kit',
);

const arbLocationStr: fc.Arbitrary<string> = fc.constantFrom(
  'Head', 'Body', 'Arms', 'Legs', 'Arms, Body', 'Body, Legs',
);

const arbQualitiesStr: fc.Arbitrary<string> = fc.constantFrom(
  '', '—', 'Impenetrable', 'Weakpoints', 'Partial', 'Impenetrable, Weakpoints',
  'Overcoat', 'Reinforced', 'Visor',
);

/** Generate a full armour item with currentAp in [1, ap] for positive-AP deflection tests */
function arbDeflectionItemPositiveAp(): fc.Arbitrary<ArmourItem> {
  return fc.record({
    ap: fc.integer({ min: 1, max: 10 }),
    armourType: arbDeflectionArmourType,
    name: arbArmourName,
    locations: arbLocationStr,
    qualities: arbQualitiesStr,
    worn: fc.boolean(),
  }).chain(({ ap, armourType, name, locations, qualities, worn }) =>
    fc.record({
      currentAp: fc.integer({ min: 1, max: ap }),
      enc: fc.constantFrom('0', '1', '2', '3'),
      runes: fc.oneof(fc.constant(undefined), fc.array(fc.string(), { minLength: 0, maxLength: 2 })),
    }).map(({ currentAp, enc, runes }) => ({
      name,
      locations,
      enc,
      ap,
      qualities,
      worn,
      armourType,
      currentAp,
      ...(runes !== undefined ? { runes } : {}),
    })),
  );
}

/** Generate a full armour item with currentAp = 0 for zero-AP deflection tests */
function arbDeflectionItemZeroAp(): fc.Arbitrary<ArmourItem> {
  return fc.record({
    ap: fc.integer({ min: 1, max: 10 }),
    armourType: arbDeflectionArmourType,
    name: arbArmourName,
    locations: arbLocationStr,
    qualities: arbQualitiesStr,
    worn: fc.boolean(),
    enc: fc.constantFrom('0', '1', '2', '3'),
    runes: fc.oneof(fc.constant(undefined), fc.array(fc.string(), { minLength: 0, maxLength: 2 })),
  }).map(({ ap, armourType, name, locations, qualities, worn, enc, runes }) => ({
    name,
    locations,
    enc,
    ap,
    qualities,
    worn,
    armourType,
    currentAp: 0,
    ...(runes !== undefined ? { runes } : {}),
  }));
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: expanded-armour-system, Property 6: Critical Deflection', () => {
  it('applyDeflection reduces currentAp by exactly 1 when currentAp > 0', () => {
    fc.assert(
      fc.property(
        arbDeflectionItemPositiveAp(),
        (item) => {
          const originalCurrentAp = item.currentAp!;
          const result = applyDeflection(item);

          expect(result.currentAp).toBe(originalCurrentAp - 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('applyDeflection clamps to 0 when currentAp is already 0', () => {
    fc.assert(
      fc.property(
        arbDeflectionItemZeroAp(),
        (item) => {
          const result = applyDeflection(item);

          expect(result.currentAp).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('applyDeflection preserves all other fields (name, locations, enc, ap, qualities, worn, armourType, runes)', () => {
    fc.assert(
      fc.property(
        arbDeflectionItemPositiveAp(),
        (item) => {
          const result = applyDeflection(item);

          expect(result.name).toBe(item.name);
          expect(result.locations).toBe(item.locations);
          expect(result.enc).toBe(item.enc);
          expect(result.ap).toBe(item.ap);
          expect(result.qualities).toBe(item.qualities);
          expect(result.worn).toBe(item.worn);
          expect(result.armourType).toBe(item.armourType);
          expect(result.runes).toEqual(item.runes);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// Feature: expanded-armour-system, Property 5: Damage Calculation Uses Current AP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Property 5: Damage Calculation Uses Current AP
 *
 * **Validates: Requirements 5.6**
 *
 * For any incoming damage value and for any armour configuration at a hit location,
 * the net wound calculation SHALL use the `currentAp` value (not the base `ap`) when
 * computing damage reduction. Specifically: the effective AP from `resolveArmourCombatEffects`
 * uses `currentAp` when available.
 */

describe('Feature: expanded-armour-system, Property 5: Damage Calculation Uses Current AP', () => {
  it('effectiveAP equals currentAp (not base ap) when currentAp is set and no special conditions triggered', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }), // base ap
        fc.integer({ min: 0, max: 9 }),   // will be clamped to < ap for damaged item
        fc.constantFrom<ArmourType>('SoftKit', 'BoiledLeather', 'Chainmail', 'Brigandine', 'Plate'),
        (ap, rawCurrentAp, armourType) => {
          // Ensure currentAp < ap so we know it's a damaged item
          const currentAp = Math.min(rawCurrentAp, ap - 1);

          const item: ArmourItem = {
            name: 'Test Armour',
            locations: 'Body',
            enc: '1',
            ap,
            qualities: '',
            worn: true,
            armourType,
            currentAp,
          };

          const result = resolveArmourCombatEffects({
            armourItems: [item],
            toHitRollEven: false,
            isCriticalHit: false,
            attackerHasImpale: false,
          });

          // The effective AP MUST equal currentAp, not the base ap
          expect(result.effectiveAP).toBe(currentAp);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('effectiveAP equals base ap when currentAp is undefined (fallback behaviour)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // base ap
        fc.constantFrom<ArmourType>('SoftKit', 'BoiledLeather', 'Chainmail', 'Brigandine', 'Plate'),
        (ap, armourType) => {
          const item: ArmourItem = {
            name: 'Test Armour',
            locations: 'Body',
            enc: '1',
            ap,
            qualities: '',
            worn: true,
            armourType,
            currentAp: undefined,
          };

          const result = resolveArmourCombatEffects({
            armourItems: [item],
            toHitRollEven: false,
            isCriticalHit: false,
            attackerHasImpale: false,
          });

          // When currentAp is undefined, effectiveAP should fall back to base ap
          expect(result.effectiveAP).toBe(ap);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('effectiveAP for multiple items equals the sum of their currentAp values', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            ap: fc.integer({ min: 1, max: 10 }),
            currentAp: fc.integer({ min: 0, max: 10 }),
            armourType: fc.constantFrom<ArmourType>('SoftKit', 'BoiledLeather', 'Chainmail', 'Brigandine', 'Plate'),
          }),
          { minLength: 2, maxLength: 5 },
        ),
        (items) => {
          const armourItems: ArmourItem[] = items.map(({ ap, currentAp, armourType }) => ({
            name: 'Test Armour',
            locations: 'Body',
            enc: '1',
            ap,
            qualities: '',
            worn: true,
            armourType,
            currentAp: Math.min(currentAp, ap), // clamp to valid range
          }));

          const result = resolveArmourCombatEffects({
            armourItems,
            toHitRollEven: false,
            isCriticalHit: false,
            attackerHasImpale: false,
          });

          // The effective AP should be the sum of all currentAp values
          const expectedAP = armourItems.reduce(
            (sum, item) => sum + (item.currentAp ?? item.ap),
            0,
          );
          expect(result.effectiveAP).toBe(expectedAP);
        },
      ),
      { numRuns: 100 },
    );
  });
});
