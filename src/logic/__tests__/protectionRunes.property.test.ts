import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { RUNE_CATALOGUE } from '../../data/runes';
import type { ProtectionItem } from '../../types/character';
import { validateProtectionPlacement } from '../protectionRunes';

// Feature: expanded-rune-categories

// --- Generators ---

const protectionRuneIds = RUNE_CATALOGUE
  .filter(r => r.category === 'protection')
  .map(r => r.id);

const nonMasterProtectionRuneIds = RUNE_CATALOGUE
  .filter(r => r.category === 'protection' && !r.isMaster)
  .map(r => r.id);

const masterProtectionRuneIds = RUNE_CATALOGUE
  .filter(r => r.category === 'protection' && r.isMaster)
  .map(r => r.id);

const nonProtectionRuneIds = RUNE_CATALOGUE
  .filter(r => r.category !== 'protection')
  .map(r => r.id);

const PROTECTION_ITEM_TYPES = ['banner', 'shrine', 'gatehouse', 'oathstone', 'icon', 'other'] as const;

/**
 * Generator for a random rune ID from the 'protection' category in the catalogue.
 */
function arbitraryRuneId(category: 'protection'): fc.Arbitrary<string> {
  const ids = RUNE_CATALOGUE.filter(r => r.category === category).map(r => r.id);
  return fc.constantFrom(...ids);
}

/**
 * Generator for a valid ProtectionItem with 0-3 protection rune IDs from the catalogue.
 * Only uses non-master runes in the existing runes array unless explicitly including a master.
 */
function arbitraryProtectionItem(): fc.Arbitrary<ProtectionItem> {
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    type: fc.constantFrom(...PROTECTION_ITEM_TYPES),
    location: fc.string({ minLength: 0, maxLength: 200 }),
    runes: fc.array(fc.constantFrom(...nonMasterProtectionRuneIds), { minLength: 0, maxLength: 3 }),
  });
}

/**
 * Generator for a ProtectionItem with exactly N runes (all non-master).
 */
function arbitraryProtectionItemWithRuneCount(count: number): fc.Arbitrary<ProtectionItem> {
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    type: fc.constantFrom(...PROTECTION_ITEM_TYPES),
    location: fc.string({ minLength: 0, maxLength: 200 }),
    runes: fc.array(fc.constantFrom(...nonMasterProtectionRuneIds), { minLength: count, maxLength: count }),
  });
}

/**
 * Generator for a ProtectionItem that already has a master rune inscribed.
 */
function arbitraryProtectionItemWithMaster(): fc.Arbitrary<ProtectionItem> {
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    type: fc.constantFrom(...PROTECTION_ITEM_TYPES),
    location: fc.string({ minLength: 0, maxLength: 200 }),
    runes: fc.tuple(
      fc.constantFrom(...masterProtectionRuneIds),
      fc.array(fc.constantFrom(...nonMasterProtectionRuneIds), { minLength: 0, maxLength: 1 })
    ).map(([master, rest]) => [master, ...rest]),
  });
}

// --- Property 5: Protection placement capacity and master-rune limit ---
// **Validates: Requirements 5.1, 5.2, 5.4, 5.6**

describe('Property 5: Protection placement capacity and master-rune limit', () => {
  it('allows placement when item has < 3 runes, rune is valid protection, and master-rune constraint is satisfied', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...nonMasterProtectionRuneIds),
        arbitraryProtectionItemWithRuneCount(0),
        (runeId, item) => {
          const result = validateProtectionPlacement(runeId, item);
          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('allows placement of non-master rune on item with 1 rune', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...nonMasterProtectionRuneIds),
        arbitraryProtectionItemWithRuneCount(1),
        (runeId, item) => {
          const result = validateProtectionPlacement(runeId, item);
          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('allows placement of non-master rune on item with 2 runes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...nonMasterProtectionRuneIds),
        arbitraryProtectionItemWithRuneCount(2),
        (runeId, item) => {
          const result = validateProtectionPlacement(runeId, item);
          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects placement when item already has 3 runes', () => {
    fc.assert(
      fc.property(
        arbitraryRuneId('protection'),
        arbitraryProtectionItemWithRuneCount(3),
        (runeId, item) => {
          const result = validateProtectionPlacement(runeId, item);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('This item already has the maximum of 3 runes.');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects a second master rune on an item that already has one', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...masterProtectionRuneIds),
        arbitraryProtectionItemWithMaster(),
        (runeId, item) => {
          // Ensure item has < 3 runes so we only test the master constraint
          fc.pre(item.runes.length < 3);
          const result = validateProtectionPlacement(runeId, item);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Only one Master Rune is allowed per item.');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('allows a master rune on an item that has no master rune and < 3 runes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...masterProtectionRuneIds),
        arbitraryProtectionItemWithRuneCount(0),
        (runeId, item) => {
          const result = validateProtectionPlacement(runeId, item);
          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects unknown rune IDs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !RUNE_CATALOGUE.some(r => r.id === s)),
        arbitraryProtectionItem(),
        (unknownRuneId, item) => {
          fc.pre(item.runes.length < 3);
          const result = validateProtectionPlacement(unknownRuneId, item);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Unknown rune.');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validates the biconditional: valid iff (< 3 runes AND (not master OR no existing master) AND exists in catalogue as protection)', () => {
    fc.assert(
      fc.property(
        arbitraryRuneId('protection'),
        arbitraryProtectionItem(),
        (runeId, item) => {
          const rune = RUNE_CATALOGUE.find(r => r.id === runeId)!;
          const result = validateProtectionPlacement(runeId, item);

          const hasCapacity = item.runes.length < 3;
          const hasMasterAlready = item.runes.some(id => {
            const existing = RUNE_CATALOGUE.find(r => r.id === id);
            return existing?.isMaster === true;
          });
          const masterConstraintOk = !rune.isMaster || !hasMasterAlready;

          const shouldBeValid = hasCapacity && masterConstraintOk;

          expect(result.valid).toBe(shouldBeValid);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Property 6: Protection item category exclusivity ---
// **Validates: Requirements 5.3, 5.5**

describe('Property 6: Protection item category exclusivity', () => {
  it('rejects any non-protection rune on a ProtectionItem', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...nonProtectionRuneIds),
        arbitraryProtectionItem(),
        (runeId, item) => {
          fc.pre(item.runes.length < 3);
          const result = validateProtectionPlacement(runeId, item);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Only protection runes can be inscribed on this item.');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('weapon category runes are rejected on ProtectionItems', () => {
    const weaponRuneIds = RUNE_CATALOGUE.filter(r => r.category === 'weapon').map(r => r.id);
    fc.assert(
      fc.property(
        fc.constantFrom(...weaponRuneIds),
        arbitraryProtectionItem(),
        (runeId, item) => {
          fc.pre(item.runes.length < 3);
          const result = validateProtectionPlacement(runeId, item);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Only protection runes can be inscribed on this item.');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('armour category runes are rejected on ProtectionItems', () => {
    const armourRuneIds = RUNE_CATALOGUE.filter(r => r.category === 'armour').map(r => r.id);
    fc.assert(
      fc.property(
        fc.constantFrom(...armourRuneIds),
        arbitraryProtectionItem(),
        (runeId, item) => {
          fc.pre(item.runes.length < 3);
          const result = validateProtectionPlacement(runeId, item);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Only protection runes can be inscribed on this item.');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('talisman category runes are rejected on ProtectionItems', () => {
    const talismanRuneIds = RUNE_CATALOGUE.filter(r => r.category === 'talisman').map(r => r.id);
    fc.assert(
      fc.property(
        fc.constantFrom(...talismanRuneIds),
        arbitraryProtectionItem(),
        (runeId, item) => {
          fc.pre(item.runes.length < 3);
          const result = validateProtectionPlacement(runeId, item);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Only protection runes can be inscribed on this item.');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('engineering category runes are rejected on ProtectionItems', () => {
    const engineeringRuneIds = RUNE_CATALOGUE.filter(r => r.category === 'engineering').map(r => r.id);
    fc.assert(
      fc.property(
        fc.constantFrom(...engineeringRuneIds),
        arbitraryProtectionItem(),
        (runeId, item) => {
          fc.pre(item.runes.length < 3);
          const result = validateProtectionPlacement(runeId, item);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Only protection runes can be inscribed on this item.');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('doom category runes are rejected on ProtectionItems', () => {
    const doomRuneIds = RUNE_CATALOGUE.filter(r => r.category === 'doom').map(r => r.id);
    fc.assert(
      fc.property(
        fc.constantFrom(...doomRuneIds),
        arbitraryProtectionItem(),
        (runeId, item) => {
          fc.pre(item.runes.length < 3);
          const result = validateProtectionPlacement(runeId, item);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Only protection runes can be inscribed on this item.');
        }
      ),
      { numRuns: 100 }
    );
  });
});
