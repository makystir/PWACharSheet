import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { arbitraryCharacter, arbitraryArmourPoints } from './printLayoutGenerators';

describe('printLayoutGenerators', () => {
  it('arbitraryCharacter generates valid Character objects with _v: 7', () => {
    fc.assert(
      fc.property(arbitraryCharacter(), (character) => {
        expect(character._v).toBe(7);
        expect(character.chars).toBeDefined();
        expect(character.chars.WS).toBeDefined();
        expect(character.chars.WS.i).toBeGreaterThanOrEqual(0);
        expect(character.chars.WS.i).toBeLessThanOrEqual(99);
        expect(Array.isArray(character.weapons)).toBe(true);
        expect(Array.isArray(character.spells)).toBe(true);
        expect(Array.isArray(character.companions)).toBe(true);
        expect(Array.isArray(character.mutations)).toBe(true);
        expect(Array.isArray(character.ammo)).toBe(true);
        expect(Array.isArray(character.conditions)).toBe(true);
      }),
      { numRuns: 50 },
    );
  });

  it('arbitraryArmourPoints generates valid ArmourPoints objects', () => {
    fc.assert(
      fc.property(arbitraryArmourPoints, (ap) => {
        expect(ap.head).toBeGreaterThanOrEqual(0);
        expect(ap.body).toBeGreaterThanOrEqual(0);
        expect(ap.lArm).toBeGreaterThanOrEqual(0);
        expect(ap.rArm).toBeGreaterThanOrEqual(0);
        expect(ap.lLeg).toBeGreaterThanOrEqual(0);
        expect(ap.rLeg).toBeGreaterThanOrEqual(0);
        expect(ap.shield).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 50 },
    );
  });

  it('generated characters have collection arrays within size bounds (0-5)', () => {
    fc.assert(
      fc.property(arbitraryCharacter(), (character) => {
        expect(character.weapons.length).toBeLessThanOrEqual(5);
        expect(character.spells.length).toBeLessThanOrEqual(5);
        expect(character.companions.length).toBeLessThanOrEqual(5);
        expect(character.mutations.length).toBeLessThanOrEqual(5);
        expect(character.ammo.length).toBeLessThanOrEqual(5);
        expect(character.conditions.length).toBeLessThanOrEqual(5);
        expect(character.armour.length).toBeLessThanOrEqual(5);
        expect(character.trappings.length).toBeLessThanOrEqual(5);
      }),
      { numRuns: 50 },
    );
  });
});
