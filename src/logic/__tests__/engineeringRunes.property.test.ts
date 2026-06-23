import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { RUNE_CATALOGUE } from '../../data/runes';
import type { EngineeringItem } from '../../types/character';
import {
  validateEngineeringPlacement,
  calculateForgingCharges,
  activateRuneOfForging,
  resetForgingCharges,
} from '../engineeringRunes';
import { validateRunePlacement } from '../runes';

// Feature: expanded-rune-categories

// ── Generators ──

const engineeringRuneIds = RUNE_CATALOGUE
  .filter(r => r.category === 'engineering' && !r.isMaster)
  .map(r => r.id);

const engineeringMasterRuneIds = RUNE_CATALOGUE
  .filter(r => r.category === 'engineering' && r.isMaster)
  .map(r => r.id);

const allEngineeringRuneIds = RUNE_CATALOGUE
  .filter(r => r.category === 'engineering')
  .map(r => r.id);

const nonEngineeringRuneIds = RUNE_CATALOGUE
  .filter(r => r.category !== 'engineering')
  .map(r => r.id);

const engineeringItemTypes: Array<'Grudge Thrower' | 'Bolt Thrower' | 'Blackpowder Cannon'> = [
  'Grudge Thrower',
  'Bolt Thrower',
  'Blackpowder Cannon',
];

/**
 * Generator for a valid EngineeringItem with 0-3 engineering rune IDs.
 */
function arbitraryEngineeringItem(): fc.Arbitrary<EngineeringItem> {
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    type: fc.constantFrom(...engineeringItemTypes),
    runes: fc.array(fc.constantFrom(...allEngineeringRuneIds), { minLength: 0, maxLength: 3 }),
  });
}

/**
 * Generator for an EngineeringItem with a specific number of runes.
 */
function arbitraryEngineeringItemWithRuneCount(count: number): fc.Arbitrary<EngineeringItem> {
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    type: fc.constantFrom(...engineeringItemTypes),
    runes: fc.array(fc.constantFrom(...allEngineeringRuneIds), { minLength: count, maxLength: count }),
  });
}

// ── Property 7: Engineering placement capacity and master-rune limit ──
// **Validates: Requirements 6.1, 6.2, 6.4**

describe('Property 7: Engineering placement capacity and master-rune limit', () => {
  it('accepts engineering rune on item with <3 runes and no master-rune conflict', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...engineeringRuneIds),
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          type: fc.constantFrom(...engineeringItemTypes),
          runes: fc.array(fc.constantFrom(...engineeringRuneIds), { minLength: 0, maxLength: 2 }),
        }),
        (runeId, item) => {
          const result = validateEngineeringPlacement(runeId, item);
          // Non-master rune on item with <3 non-master runes should always be valid
          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects any rune when item already has 3 runes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allEngineeringRuneIds),
        arbitraryEngineeringItemWithRuneCount(3),
        (runeId, item) => {
          const result = validateEngineeringPlacement(runeId, item);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('This item already has the maximum of 3 runes.');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects a second master rune when item already has one', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...engineeringMasterRuneIds),
        fc.constantFrom(...engineeringMasterRuneIds),
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          type: fc.constantFrom(...engineeringItemTypes),
        }),
        (existingMaster, newMaster, itemBase) => {
          const item: EngineeringItem = { ...itemBase, runes: [existingMaster] };
          const result = validateEngineeringPlacement(newMaster, item);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Only one Master Rune is allowed per item.');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accepts a master rune when item has <3 runes and no existing master', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...engineeringMasterRuneIds),
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          type: fc.constantFrom(...engineeringItemTypes),
          runes: fc.array(fc.constantFrom(...engineeringRuneIds), { minLength: 0, maxLength: 2 }),
        }),
        (masterRuneId, item) => {
          // Item has only non-master runes and <3 total
          const result = validateEngineeringPlacement(masterRuneId, item);
          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validates the full property: valid iff <3 runes AND (not master OR no existing master) AND category engineering', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allEngineeringRuneIds),
        arbitraryEngineeringItem(),
        (runeId, item) => {
          const rune = RUNE_CATALOGUE.find(r => r.id === runeId)!;
          const result = validateEngineeringPlacement(runeId, item);

          const hasCapacity = item.runes.length < 3;
          const hasMasterConflict = rune.isMaster && item.runes.some(id => {
            const existing = RUNE_CATALOGUE.find(r => r.id === id);
            return existing?.isMaster === true;
          });

          const shouldBeValid = hasCapacity && !hasMasterConflict;
          expect(result.valid).toBe(shouldBeValid);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 8: Engineering item category exclusivity ──
// **Validates: Requirements 6.3, 6.5**

describe('Property 8: Engineering item category exclusivity', () => {
  it('rejects any non-engineering rune on an EngineeringItem', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...nonEngineeringRuneIds),
        arbitraryEngineeringItem(),
        (runeId, item) => {
          const result = validateEngineeringPlacement(runeId, item);
          expect(result.valid).toBe(false);
          // Error should indicate only engineering runes are allowed
          expect(result.error).toBe('Only engineering runes can be inscribed on artillery weapons.');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects engineering runes on weapon/armour items via validateRunePlacement', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allEngineeringRuneIds),
        fc.constantFrom('weapon' as const, 'armour' as const),
        (runeId, itemType) => {
          const result = validateRunePlacement(runeId, [], itemType);
          // Engineering runes should be rejected on weapon/armour items
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 14: Rune of Forging charge calculation ──
// **Validates: Requirements 11.1, 11.4, 11.5**

describe('Property 14: Rune of Forging charge calculation', () => {
  it('calculateForgingCharges equals count of engineering-rune-of-forging in item.runes', () => {
    fc.assert(
      fc.property(
        arbitraryEngineeringItem(),
        (item) => {
          const expected = item.runes.filter(id => id === 'engineering-rune-of-forging').length;
          expect(calculateForgingCharges(item)).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('after resetForgingCharges, every item charges equals calculateForgingCharges', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryEngineeringItem(), { minLength: 0, maxLength: 10 }),
        (items) => {
          const charges = resetForgingCharges(items);
          for (const item of items) {
            expect(charges[item.id]).toBe(calculateForgingCharges(item));
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 15: Rune of Forging activation and depletion ──
// **Validates: Requirements 11.2, 11.3**

describe('Property 15: Rune of Forging activation and depletion', () => {
  it('activation succeeds and returns n-1 when charges > 0', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom(...engineeringItemTypes),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 3 }),
        (id, type, name, charges) => {
          const item: EngineeringItem = {
            id,
            name,
            type,
            runes: Array(charges).fill('engineering-rune-of-forging'),
          };
          const forgingCharges: Record<string, number> = { [id]: charges };
          const result = activateRuneOfForging(item, forgingCharges);

          expect(result.success).toBe(true);
          expect(result.error).toBeUndefined();
          expect(result.updatedCharges[id]).toBe(charges - 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('activation fails with specified message when charges are 0', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom(...engineeringItemTypes),
        fc.string({ minLength: 1, maxLength: 50 }),
        (id, type, name) => {
          const item: EngineeringItem = {
            id,
            name,
            type,
            runes: ['engineering-rune-of-accuracy'], // no forging runes
          };
          const forgingCharges: Record<string, number> = { [id]: 0 };
          const result = activateRuneOfForging(item, forgingCharges);

          expect(result.success).toBe(false);
          expect(result.error).toBe(
            'All Runes of Forging on this item have been used this adventure.'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('repeated activations deplete charges correctly', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom(...engineeringItemTypes),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 3 }),
        (id, type, name, initialCharges) => {
          const item: EngineeringItem = {
            id,
            name,
            type,
            runes: Array(initialCharges).fill('engineering-rune-of-forging'),
          };
          let forgingCharges: Record<string, number> = { [id]: initialCharges };

          // Activate until depleted
          for (let i = initialCharges; i > 0; i--) {
            const result = activateRuneOfForging(item, forgingCharges);
            expect(result.success).toBe(true);
            expect(result.updatedCharges[id]).toBe(i - 1);
            forgingCharges = result.updatedCharges;
          }

          // One more should fail
          const finalResult = activateRuneOfForging(item, forgingCharges);
          expect(finalResult.success).toBe(false);
          expect(finalResult.error).toBe(
            'All Runes of Forging on this item have been used this adventure.'
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
