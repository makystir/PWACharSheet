import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Enterprise, EnterpriseType, EnterpriseIncomeSource, EnterpriseCurrency } from '../../../types/character';

// All valid enterprise types
const ALL_ENTERPRISE_TYPES: EnterpriseType[] = [
  'Courier Service',
  'Crafting Workshop',
  'Criminal Gang',
  'Holy Temple',
  'Knightly Order',
  'Tavern',
  'Market Parlour',
  'Noble Estate',
  'Performance Troupe',
  'Publishing House',
];

// --- Arbitrary generators ---

function arbitraryEnterpriseCurrency(): fc.Arbitrary<EnterpriseCurrency> {
  return fc.record({
    gc: fc.integer({ min: 0, max: 999 }),
    ss: fc.integer({ min: 0, max: 999 }),
    d: fc.integer({ min: 0, max: 999 }),
  });
}

function arbitraryEnterpriseType(): fc.Arbitrary<EnterpriseType> {
  return fc.constantFrom(...ALL_ENTERPRISE_TYPES);
}

function arbitraryIncomeSource(): fc.Arbitrary<EnterpriseIncomeSource> {
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 36 }),
    description: fc.string({ minLength: 0, maxLength: 200 }),
    earningSkill: fc.string({ minLength: 0, maxLength: 100 }),
    effectiveStatus: fc.string({ minLength: 0, maxLength: 50 }),
  });
}

function arbitraryEnterprise(): fc.Arbitrary<Enterprise> {
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 36 }),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    type: arbitraryEnterpriseType(),
    expansionLevel: fc.integer({ min: 1, max: 4 }),
    debt: arbitraryEnterpriseCurrency(),
    creditorName: fc.string({ minLength: 0, maxLength: 100 }),
    interestPayment: arbitraryEnterpriseCurrency(),
    incomeSources: fc.array(arbitraryIncomeSource(), { minLength: 0, maxLength: 20 }),
    trappings: fc.array(fc.string({ minLength: 0, maxLength: 200 }), { minLength: 0, maxLength: 50 }),
    specialRules: fc.array(fc.string({ minLength: 0, maxLength: 500 }), { minLength: 0, maxLength: 20 }),
    notes: fc.string({ minLength: 0, maxLength: 2000 }),
  });
}

describe('Feature: enterprise-tracker, Property 2: Enterprise data serialization round-trip', () => {
  /**
   * Property 2: Enterprise data serialization round-trip
   *
   * For any valid character object containing an `enterprises` array (with any
   * number of entries and any combination of field values within constraints)
   * and any value of `useEnterprises`, serializing (JSON.stringify) and then
   * deserializing (JSON.parse) the character SHALL produce an `enterprises`
   * array with identical field values for every enterprise, income source,
   * trapping, special rule, and notes field.
   *
   * Validates: Requirements 1.4, 10.3
   */
  it('serializing and deserializing preserves all enterprise data', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryEnterprise(), { minLength: 0, maxLength: 10 }),
        fc.boolean(),
        (enterprises, useEnterprises) => {
          const character = {
            houseRules: { useEnterprises },
            enterprises,
          };

          const serialized = JSON.stringify(character);
          const deserialized = JSON.parse(serialized);

          // The enterprises array must be identical after round-trip
          expect(deserialized.enterprises).toEqual(character.enterprises);

          // Verify each enterprise in detail
          for (let i = 0; i < enterprises.length; i++) {
            const original = enterprises[i];
            const restored = deserialized.enterprises[i];

            expect(restored.id).toBe(original.id);
            expect(restored.name).toBe(original.name);
            expect(restored.type).toBe(original.type);
            expect(restored.expansionLevel).toBe(original.expansionLevel);
            expect(restored.debt).toEqual(original.debt);
            expect(restored.creditorName).toBe(original.creditorName);
            expect(restored.interestPayment).toEqual(original.interestPayment);
            expect(restored.incomeSources).toEqual(original.incomeSources);
            expect(restored.trappings).toEqual(original.trappings);
            expect(restored.specialRules).toEqual(original.specialRules);
            expect(restored.notes).toBe(original.notes);
          }

          // useEnterprises must also survive the round-trip
          expect(deserialized.houseRules.useEnterprises).toBe(useEnterprises);
        }
      ),
      { numRuns: 100 }
    );
  });
});
