import { describe, it, expect } from 'vitest';
import {
  resolveArmourCombatEffects,
  canDeflectCritical,
  applyDeflection,
} from '../armourCombat';
import type { ArmourItem } from '../../types/character';

function makeItem(overrides: Partial<ArmourItem> = {}): ArmourItem {
  return {
    name: 'Test Armour',
    locations: 'Body',
    enc: '1',
    ap: 3,
    qualities: '—',
    worn: true,
    armourType: 'Plate',
    ...overrides,
  };
}

describe('resolveArmourCombatEffects', () => {
  describe('Partial flaw', () => {
    it('bypasses AP when to-hit roll is even', () => {
      const item = makeItem({ qualities: 'Partial', ap: 3 });
      const result = resolveArmourCombatEffects({
        armourItems: [item],
        toHitRollEven: true,
        isCriticalHit: false,
        attackerHasImpale: false,
      });
      expect(result.effectiveAP).toBe(0);
      expect(result.partialBypassed).toBe(true);
      expect(result.notes).toContain('Partial: AP ignored (to-hit roll even)');
    });

    it('bypasses AP when critical hit is scored', () => {
      const item = makeItem({ qualities: 'Partial', ap: 3 });
      const result = resolveArmourCombatEffects({
        armourItems: [item],
        toHitRollEven: false,
        isCriticalHit: true,
        attackerHasImpale: false,
      });
      expect(result.effectiveAP).toBe(0);
      expect(result.partialBypassed).toBe(true);
      expect(result.notes).toContain('Partial: AP ignored (Critical Hit)');
    });

    it('does NOT bypass AP when roll is odd and no critical', () => {
      const item = makeItem({ qualities: 'Partial', ap: 3 });
      const result = resolveArmourCombatEffects({
        armourItems: [item],
        toHitRollEven: false,
        isCriticalHit: false,
        attackerHasImpale: false,
      });
      expect(result.effectiveAP).toBe(3);
      expect(result.partialBypassed).toBe(false);
    });

    it('applies Partial via open visor', () => {
      const item = makeItem({
        name: 'Bascinet',
        qualities: 'Impenetrable, Visor, Weakpoints',
        ap: 3,
        visorOpen: true,
      });
      const result = resolveArmourCombatEffects({
        armourItems: [item],
        toHitRollEven: true,
        isCriticalHit: false,
        attackerHasImpale: false,
      });
      expect(result.effectiveAP).toBe(0);
      expect(result.partialBypassed).toBe(true);
    });
  });

  describe('Impenetrable quality', () => {
    it('negates critical wound when roll is odd', () => {
      const item = makeItem({ qualities: 'Impenetrable', ap: 3 });
      const result = resolveArmourCombatEffects({
        armourItems: [item],
        toHitRollEven: false,
        isCriticalHit: true,
        attackerHasImpale: false,
      });
      expect(result.impenetrableNegatesCrit).toBe(true);
      expect(result.effectiveAP).toBe(3);
      expect(result.notes).toContain('Impenetrable: Critical Wound negated (to-hit roll odd)');
    });

    it('does NOT negate critical wound when roll is even', () => {
      const item = makeItem({ qualities: 'Impenetrable', ap: 3 });
      const result = resolveArmourCombatEffects({
        armourItems: [item],
        toHitRollEven: true,
        isCriticalHit: true,
        attackerHasImpale: false,
      });
      expect(result.impenetrableNegatesCrit).toBe(false);
    });

    it('does NOT trigger when no critical hit', () => {
      const item = makeItem({ qualities: 'Impenetrable', ap: 3 });
      const result = resolveArmourCombatEffects({
        armourItems: [item],
        toHitRollEven: false,
        isCriticalHit: false,
        attackerHasImpale: false,
      });
      expect(result.impenetrableNegatesCrit).toBe(false);
    });
  });

  describe('Weakpoints + Impale', () => {
    it('ignores all AP when critical hit + Impale', () => {
      const item = makeItem({ qualities: 'Impenetrable, Weakpoints', ap: 3, armourType: 'Plate' });
      const result = resolveArmourCombatEffects({
        armourItems: [item],
        toHitRollEven: false,
        isCriticalHit: true,
        attackerHasImpale: true,
      });
      expect(result.effectiveAP).toBe(0);
      expect(result.weakpointsBypassed).toBe(true);
      expect(result.notes).toContain('Weakpoints: All AP ignored (Impale + Critical Hit)');
    });

    it('does NOT trigger without Impale', () => {
      const item = makeItem({ qualities: 'Impenetrable, Weakpoints', ap: 3, armourType: 'Plate' });
      const result = resolveArmourCombatEffects({
        armourItems: [item],
        toHitRollEven: false,
        isCriticalHit: true,
        attackerHasImpale: false,
      });
      expect(result.effectiveAP).toBe(3);
      expect(result.weakpointsBypassed).toBe(false);
    });

    it('does NOT trigger without critical hit', () => {
      const item = makeItem({ qualities: 'Impenetrable, Weakpoints', ap: 3, armourType: 'Plate' });
      const result = resolveArmourCombatEffects({
        armourItems: [item],
        toHitRollEven: false,
        isCriticalHit: false,
        attackerHasImpale: true,
      });
      expect(result.effectiveAP).toBe(3);
      expect(result.weakpointsBypassed).toBe(false);
    });

    it('is suppressed when Reinforced Soft Kit is present', () => {
      const plate = makeItem({
        name: 'Breastplate',
        qualities: 'Impenetrable, Weakpoints',
        ap: 3,
        armourType: 'Plate',
      });
      const softKit = makeItem({
        name: 'Reinforced Soft Kit',
        qualities: 'Partial, Reinforced',
        ap: 1,
        armourType: 'SoftKit',
      });
      const result = resolveArmourCombatEffects({
        armourItems: [softKit, plate],
        toHitRollEven: false,
        isCriticalHit: true,
        attackerHasImpale: true,
      });
      // Weakpoints is suppressed, so plate AP remains
      expect(result.weakpointsBypassed).toBe(false);
      // Soft kit AP is also intact (no Partial trigger because roll is odd, no crit bypass since it's critical but we need even OR crit)
      // Wait - Partial triggers on Critical Hit too! The soft kit has Partial.
      // So soft kit contribution = 0 (Partial bypassed due to critical hit)
      // Plate contribution = 3 (Weakpoints suppressed)
      expect(result.effectiveAP).toBe(3);
    });
  });

  describe('Bascinet frontal missile bonus', () => {
    it('adds +1 AP when visor closed and frontal missile', () => {
      const item = makeItem({
        name: 'Bascinet',
        qualities: 'Impenetrable, Visor, Weakpoints',
        ap: 3,
        armourType: 'Plate',
        visorOpen: false,
      });
      const result = resolveArmourCombatEffects({
        armourItems: [item],
        toHitRollEven: false,
        isCriticalHit: false,
        attackerHasImpale: false,
        isMissileFrontal: true,
      });
      expect(result.effectiveAP).toBe(4);
      expect(result.notes).toContain('Bascinet: +1 AP (frontal missile)');
    });

    it('does NOT add bonus when visor is open', () => {
      const item = makeItem({
        name: 'Bascinet',
        qualities: 'Impenetrable, Visor, Weakpoints',
        ap: 3,
        armourType: 'Plate',
        visorOpen: true,
      });
      const result = resolveArmourCombatEffects({
        armourItems: [item],
        toHitRollEven: false,
        isCriticalHit: false,
        attackerHasImpale: false,
        isMissileFrontal: true,
      });
      // Visor open means Partial applies — but roll is odd and no crit, so Partial doesn't trigger
      expect(result.effectiveAP).toBe(3);
    });

    it('does NOT add bonus without frontal missile flag', () => {
      const item = makeItem({
        name: 'Bascinet',
        qualities: 'Impenetrable, Visor, Weakpoints',
        ap: 3,
        armourType: 'Plate',
        visorOpen: false,
      });
      const result = resolveArmourCombatEffects({
        armourItems: [item],
        toHitRollEven: false,
        isCriticalHit: false,
        attackerHasImpale: false,
        isMissileFrontal: false,
      });
      expect(result.effectiveAP).toBe(3);
    });
  });

  describe('multiple items and combined effects', () => {
    it('sums AP from multiple items', () => {
      const chainmail = makeItem({ name: 'Chainmail Coat', qualities: '—', ap: 2, armourType: 'Chainmail' });
      const softKit = makeItem({ name: 'Soft Kit', qualities: '—', ap: 0, armourType: 'SoftKit' });
      const result = resolveArmourCombatEffects({
        armourItems: [softKit, chainmail],
        toHitRollEven: false,
        isCriticalHit: false,
        attackerHasImpale: false,
      });
      expect(result.effectiveAP).toBe(2);
    });

    it('uses currentAp when set', () => {
      const item = makeItem({ ap: 3, currentAp: 1 });
      const result = resolveArmourCombatEffects({
        armourItems: [item],
        toHitRollEven: false,
        isCriticalHit: false,
        attackerHasImpale: false,
      });
      expect(result.effectiveAP).toBe(1);
    });
  });
});

describe('canDeflectCritical', () => {
  it('returns true when house rule is enabled and armour has AP > 0', () => {
    const item = makeItem({ ap: 3, currentAp: 2 });
    expect(canDeflectCritical([item], 'body', true)).toBe(true);
  });

  it('returns false when house rule is disabled', () => {
    const item = makeItem({ ap: 3, currentAp: 2 });
    expect(canDeflectCritical([item], 'body', false)).toBe(false);
  });

  it('returns false when all armour has 0 AP', () => {
    const item = makeItem({ ap: 3, currentAp: 0 });
    expect(canDeflectCritical([item], 'body', true)).toBe(false);
  });

  it('returns true when currentAp is undefined (defaults to ap)', () => {
    const item = makeItem({ ap: 3, currentAp: undefined });
    expect(canDeflectCritical([item], 'body', true)).toBe(true);
  });

  it('returns false for empty armour list', () => {
    expect(canDeflectCritical([], 'body', true)).toBe(false);
  });
});

describe('applyDeflection', () => {
  it('reduces currentAp by 1', () => {
    const item = makeItem({ ap: 3, currentAp: 2 });
    const result = applyDeflection(item);
    expect(result.currentAp).toBe(1);
  });

  it('uses ap when currentAp is undefined', () => {
    const item = makeItem({ ap: 3, currentAp: undefined });
    const result = applyDeflection(item);
    expect(result.currentAp).toBe(2);
  });

  it('clamps to 0 minimum', () => {
    const item = makeItem({ ap: 3, currentAp: 0 });
    const result = applyDeflection(item);
    expect(result.currentAp).toBe(0);
  });

  it('returns a new object (immutable)', () => {
    const item = makeItem({ ap: 3, currentAp: 2 });
    const result = applyDeflection(item);
    expect(result).not.toBe(item);
    expect(item.currentAp).toBe(2); // Original unchanged
  });

  it('preserves all other fields', () => {
    const item = makeItem({
      name: 'Breastplate',
      locations: 'Body',
      enc: '3',
      ap: 3,
      currentAp: 2,
      qualities: 'Impenetrable, Weakpoints',
      worn: true,
      armourType: 'Plate',
    });
    const result = applyDeflection(item);
    expect(result.name).toBe('Breastplate');
    expect(result.locations).toBe('Body');
    expect(result.enc).toBe('3');
    expect(result.ap).toBe(3);
    expect(result.qualities).toBe('Impenetrable, Weakpoints');
    expect(result.worn).toBe(true);
    expect(result.armourType).toBe('Plate');
  });
});
