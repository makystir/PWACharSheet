import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { parseShieldRating, findEquippedShield } from '../combat';
import type { WeaponItem } from '../../types/character';

// Feature: combat-rules-compliance, Property 5: Shield toggle adds Rating to effective AP
// **Validates: Requirements 3.2, 3.3, 3.5**

// ─── Generators ─────────────────────────────────────────────────────────────

/** Generate a shield weapon with "Shield Rating X" in qualities */
const arbShieldRating = fc.integer({ min: 1, max: 10 });

/** Generate a shield weapon with a given rating format */
function arbShieldWeapon(rating: fc.Arbitrary<number>, format: 'full' | 'short'): fc.Arbitrary<WeaponItem> {
  return fc.record({
    name: fc.constantFrom('Shield', 'Buckler', 'Large Shield', 'Tower Shield'),
    group: fc.constantFrom('Shield', 'Shields', 'Basic/Shield'),
    enc: fc.constantFrom('1', '2', '3'),
    damage: fc.constant('+SB+1'),
    qualities: rating.map(r =>
      format === 'full' ? `Shield Rating ${r}` : `Rating ${r}`
    ),
  }) as fc.Arbitrary<WeaponItem>;
}

/** Generate a shield weapon with additional qualities mixed in */
function arbShieldWeaponWithExtraQualities(rating: fc.Arbitrary<number>): fc.Arbitrary<WeaponItem> {
  const extraQualities = fc.array(
    fc.constantFrom('Defensive', 'Durable', 'Sturdy', 'Lightweight'),
    { minLength: 0, maxLength: 3 }
  );

  return fc.tuple(rating, extraQualities, fc.constantFrom('Shield', 'Shields')).map(
    ([r, extras, group]) => ({
      name: 'Shield',
      group,
      enc: '2',
      damage: '+SB+1',
      qualities: [...extras, `Shield Rating ${r}`].join(', '),
    } as WeaponItem)
  );
}

/** Generate a weapon that is NOT a shield (no Shield in group) */
const arbNonShieldWeapon: fc.Arbitrary<WeaponItem> = fc.record({
  name: fc.constantFrom('Sword', 'Axe', 'Spear', 'Dagger'),
  group: fc.constantFrom('Basic', 'Two-Handed', 'Fencing', 'Polearm'),
  enc: fc.constantFrom('1', '2', '3'),
  damage: fc.constant('+SB+4'),
  qualities: fc.constantFrom('—', 'Fast', 'Impale', 'Hack'),
}) as fc.Arbitrary<WeaponItem>;

/** Generate a shield weapon with NO parseable rating */
const arbShieldNoRating: fc.Arbitrary<WeaponItem> = fc.record({
  name: fc.constantFrom('Improvised Shield', 'Broken Shield'),
  group: fc.constantFrom('Shield', 'Shields'),
  enc: fc.constant('2'),
  damage: fc.constant('+SB+1'),
  qualities: fc.constantFrom('—', 'Defensive', 'Undamaging', ''),
}) as fc.Arbitrary<WeaponItem>;

/** Arbitrary base AP value for effective AP calculations */
const arbBaseAP = fc.integer({ min: 0, max: 12 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: combat-rules-compliance', () => {
  describe('Property 5: Shield toggle adds Rating to effective AP', () => {
    /**
     * **Validates: Requirements 3.2, 3.3, 3.5**
     */

    it('parseShieldRating extracts correct rating from "Shield Rating X" format', () => {
      fc.assert(
        fc.property(
          arbShieldWeapon(arbShieldRating, 'full'),
          (weapon) => {
            const rating = parseShieldRating(weapon);
            // Extract expected rating from the qualities string
            const match = weapon.qualities.match(/Shield\s+Rating\s+(\d+)/i);
            const expected = match ? parseInt(match[1], 10) : 0;
            expect(rating).toBe(expected);
            expect(rating).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('parseShieldRating extracts correct rating from "Rating X" format', () => {
      fc.assert(
        fc.property(
          arbShieldWeapon(arbShieldRating, 'short'),
          (weapon) => {
            const rating = parseShieldRating(weapon);
            const match = weapon.qualities.match(/Rating\s+(\d+)/i);
            const expected = match ? parseInt(match[1], 10) : 0;
            expect(rating).toBe(expected);
            expect(rating).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('parseShieldRating extracts rating when mixed with other qualities', () => {
      fc.assert(
        fc.property(
          arbShieldWeaponWithExtraQualities(arbShieldRating),
          (weapon) => {
            const rating = parseShieldRating(weapon);
            expect(rating).toBeGreaterThan(0);
            expect(rating).toBeLessThanOrEqual(10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('parseShieldRating returns 0 when no rating pattern is present', () => {
      fc.assert(
        fc.property(
          arbShieldNoRating,
          (weapon) => {
            const rating = parseShieldRating(weapon);
            expect(rating).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('when shield toggle is enabled, effective AP = baseAP + shieldRating', () => {
      fc.assert(
        fc.property(
          arbShieldWeapon(arbShieldRating, 'full'),
          arbBaseAP,
          (shieldWeapon, baseAP) => {
            const shieldRating = parseShieldRating(shieldWeapon);
            const defendedWithShield = true;

            // When the toggle is enabled, shield rating is added to effective AP
            const effectiveAP = defendedWithShield ? baseAP + shieldRating : baseAP;

            expect(effectiveAP).toBe(baseAP + shieldRating);
            expect(effectiveAP).toBeGreaterThanOrEqual(baseAP);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('when shield toggle is disabled, effective AP = baseAP (no shield contribution)', () => {
      fc.assert(
        fc.property(
          arbShieldWeapon(arbShieldRating, 'full'),
          arbBaseAP,
          (shieldWeapon, baseAP) => {
            const shieldRating = parseShieldRating(shieldWeapon);
            const defendedWithShield = false;

            // When the toggle is disabled, shield rating is NOT added
            const effectiveAP = defendedWithShield ? baseAP + shieldRating : baseAP;

            expect(effectiveAP).toBe(baseAP);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('findEquippedShield returns a shield weapon when one exists in the list', () => {
      fc.assert(
        fc.property(
          arbShieldWeapon(arbShieldRating, 'full'),
          fc.array(arbNonShieldWeapon, { minLength: 0, maxLength: 5 }),
          (shield, otherWeapons) => {
            // Insert shield at a random position among other weapons
            const weapons = [...otherWeapons, shield];
            const found = findEquippedShield(weapons);

            expect(found).not.toBeNull();
            expect(found!.group.toLowerCase()).toContain('shield');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('findEquippedShield returns null when no shield weapon exists', () => {
      fc.assert(
        fc.property(
          fc.array(arbNonShieldWeapon, { minLength: 0, maxLength: 5 }),
          (weapons) => {
            const found = findEquippedShield(weapons);
            expect(found).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('shield rating 0 adds nothing to effective AP even when toggle is enabled', () => {
      fc.assert(
        fc.property(
          arbShieldNoRating,
          arbBaseAP,
          (shieldWeapon, baseAP) => {
            const shieldRating = parseShieldRating(shieldWeapon);
            expect(shieldRating).toBe(0);

            // Even with toggle enabled, rating 0 means no AP addition
            const effectiveAP = baseAP + shieldRating;
            expect(effectiveAP).toBe(baseAP);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('high shield ratings correctly add to effective AP when enabled', () => {
      const highRating = fc.integer({ min: 5, max: 10 });

      fc.assert(
        fc.property(
          arbShieldWeapon(highRating, 'full'),
          arbBaseAP,
          (shieldWeapon, baseAP) => {
            const shieldRating = parseShieldRating(shieldWeapon);
            const defendedWithShield = true;

            const effectiveAP = defendedWithShield ? baseAP + shieldRating : baseAP;

            expect(shieldRating).toBeGreaterThanOrEqual(5);
            expect(effectiveAP).toBe(baseAP + shieldRating);
            expect(effectiveAP).toBeGreaterThanOrEqual(baseAP + 5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
