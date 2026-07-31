import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { migrateArmourItem } from '../armourMigration';
import type { ArmourItem } from '../../types/character';

// ─── Generators ──────────────────────────────────────────────────────────────

const KNOWN_NAMES = [
  'Chainmail Coat', 'Chainmail Chausses', 'Chainmail Coif', 'Chainmail Shirt',
  'Leather Jack', 'Leather Jerkin', 'Leather Leggings', 'Leather Skullcap',
  'Soft Kit', 'Reinforced Soft Kit', 'Padding', 'Aventail',
  'Brigandine Jack', 'Brigandine Jerkin',
  'Bracers', 'Breastplate', 'Open Helm', 'Plate Leggings',
  'Great Helm', 'Bascinet', 'Armet', 'Sallet',
];

const LOCATION_STRINGS = ['Head', 'Arms', 'Body', 'Legs', 'Arms, Body', 'Arms, Body, Legs'] as const;
const ENC_VALUES = ['0', '1', '2', '3', '4'] as const;
const QUALITY_STRINGS = [
  '—', 'Impenetrable', 'Partial', 'Visor', 'Overcoat', 'Reinforced',
  'Impenetrable, Visor, Weakpoints', 'Impenetrable, Weakpoints',
  'Partial, Reinforced', 'Impenetrable, Overcoat, Weakpoints',
  'Impenetrable, Requires Kit, Weakpoints',
] as const;

/** Generate a name from known names or a random string */
const arbName: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom(...KNOWN_NAMES),
  fc.string({ minLength: 1, maxLength: 20 }),
);

/** Generate a base armour item without currentAp or visorOpen */
const arbBaseArmourItem: fc.Arbitrary<ArmourItem> = fc.record({
  name: arbName,
  locations: fc.constantFrom(...LOCATION_STRINGS),
  enc: fc.constantFrom(...ENC_VALUES),
  ap: fc.integer({ min: 1, max: 5 }),
  qualities: fc.constantFrom(...QUALITY_STRINGS),
  worn: fc.boolean(),
  runes: fc.oneof(
    fc.constant(undefined as unknown as string[]),
    fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 3 }),
  ),
});

/** Generate an armour item without currentAp (simulating legacy data) */
const arbItemWithoutCurrentAp: fc.Arbitrary<ArmourItem> = arbBaseArmourItem.map(item => {
  const { currentAp: _, ...rest } = item as ArmourItem & { currentAp?: number };
  return rest;
});

/** Generate an armour item with Visor quality but no visorOpen field */
const arbVisorItemWithoutVisorOpen: fc.Arbitrary<ArmourItem> = fc.record({
  name: fc.constantFrom('Bascinet', 'Armet', 'Sallet'),
  locations: fc.constant('Head'),
  enc: fc.constantFrom('1', '2', '3'),
  ap: fc.integer({ min: 1, max: 5 }),
  qualities: fc.constantFrom('Visor', 'Impenetrable, Visor, Weakpoints'),
  worn: fc.boolean(),
  runes: fc.oneof(
    fc.constant(undefined as unknown as string[]),
    fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 3 }),
  ),
});

/** Generate a fully populated armour item (all fields set) */
const arbFullArmourItem: fc.Arbitrary<ArmourItem> = fc.record({
  name: arbName,
  locations: fc.constantFrom(...LOCATION_STRINGS),
  enc: fc.constantFrom(...ENC_VALUES),
  ap: fc.integer({ min: 1, max: 5 }),
  qualities: fc.constantFrom(...QUALITY_STRINGS),
  worn: fc.boolean(),
  runes: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 3 }),
});

/** Generate an armour item with currentAp > ap (out of range high) */
const arbItemWithHighCurrentAp: fc.Arbitrary<ArmourItem> = fc.record({
  name: arbName,
  locations: fc.constantFrom(...LOCATION_STRINGS),
  enc: fc.constantFrom(...ENC_VALUES),
  ap: fc.integer({ min: 1, max: 5 }),
  qualities: fc.constantFrom(...QUALITY_STRINGS),
  worn: fc.boolean(),
}).chain(item =>
  fc.integer({ min: item.ap + 1, max: item.ap + 10 }).map(currentAp => ({
    ...item,
    currentAp,
  })),
);

/** Generate an armour item with currentAp < 0 (out of range low) */
const arbItemWithNegativeCurrentAp: fc.Arbitrary<ArmourItem> = fc.record({
  name: arbName,
  locations: fc.constantFrom(...LOCATION_STRINGS),
  enc: fc.constantFrom(...ENC_VALUES),
  ap: fc.integer({ min: 1, max: 5 }),
  qualities: fc.constantFrom(...QUALITY_STRINGS),
  worn: fc.boolean(),
  currentAp: fc.integer({ min: -100, max: -1 }),
});

// ─── Property 15: Data Migration Integrity ───────────────────────────────────
// Feature: expanded-armour-system, Property 15: Data Migration Integrity

describe('Feature: expanded-armour-system', () => {
  describe('Property 15: Data Migration Integrity', () => {
    /**
     * **Validates: Requirements 14.1, 14.2, 14.4**
     */

    it('for any armour item without currentAp, migration sets currentAp === ap', () => {
      fc.assert(
        fc.property(
          arbItemWithoutCurrentAp,
          (item) => {
            const migrated = migrateArmourItem(item);
            expect(migrated.currentAp).toBe(item.ap);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('for any armour item with Visor quality without visorOpen, migration sets visorOpen === false', () => {
      fc.assert(
        fc.property(
          arbVisorItemWithoutVisorOpen,
          (item) => {
            const migrated = migrateArmourItem(item);
            expect(migrated.visorOpen).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('for any armour item with all fields set, migration preserves name, locations, enc, ap, qualities, worn, and runes', () => {
      fc.assert(
        fc.property(
          arbFullArmourItem,
          (item) => {
            const migrated = migrateArmourItem(item);

            // Name may be renamed via ARMOUR_NAME_MAP, but if NOT in the map it stays the same
            // We test the non-renamed fields are preserved regardless
            expect(migrated.locations).toBe(item.locations);
            expect(migrated.enc).toBe(item.enc);
            expect(migrated.ap).toBe(item.ap);
            expect(migrated.qualities).toBe(item.qualities);
            expect(migrated.worn).toBe(item.worn);
            expect(migrated.runes).toEqual(item.runes);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('migration is idempotent: migrating an already-migrated item produces the same result', () => {
      fc.assert(
        fc.property(
          arbBaseArmourItem,
          (item) => {
            const first = migrateArmourItem(item);
            const second = migrateArmourItem(first);
            expect(second).toEqual(first);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('for any armour item where currentAp > ap, after migration currentAp === ap (clamped)', () => {
      fc.assert(
        fc.property(
          arbItemWithHighCurrentAp,
          (item) => {
            const migrated = migrateArmourItem(item);
            expect(migrated.currentAp).toBe(item.ap);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('for any armour item where currentAp < 0, after migration currentAp === 0 (clamped)', () => {
      fc.assert(
        fc.property(
          arbItemWithNegativeCurrentAp,
          (item) => {
            const migrated = migrateArmourItem(item);
            expect(migrated.currentAp).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
