// Feature: expanded-armour-system, Property 11: Stealth Penalty Display Logic
import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ArmourMap } from '../ArmourMap';
import type { ArmourItem, ArmourType, ArmourPoints } from '../../../types/character';

/**
 * Property 11: Stealth Penalty Display Logic
 *
 * **Validates: Requirements 9.1, 9.2**
 *
 * For any set of worn armour items, the stealth penalty note ("-10 Stealth")
 * SHALL be displayed if and only if at least one worn item has `armourType`
 * of `Chainmail` or `Plate`.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ZERO_AP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

const ALL_ARMOUR_TYPES: ArmourType[] = ['SoftKit', 'BoiledLeather', 'Chainmail', 'Brigandine', 'Plate'];
const STEALTH_PENALTY_TYPES: ArmourType[] = ['Chainmail', 'Plate'];
const NON_PENALTY_TYPES: ArmourType[] = ['SoftKit', 'BoiledLeather', 'Brigandine'];

const LOCATION_OPTIONS = ['Head', 'Body', 'Arms', 'Legs', 'Arms, Body', 'Body, Legs', 'Head, Body'];

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generate a random armour type from a given set */
const arbArmourType = (types: ArmourType[]) => fc.constantFrom(...types);

/** Generate a random location string */
const arbLocation = fc.constantFrom(...LOCATION_OPTIONS);

/** Generate a random armour item with a specific type and worn state */
function arbArmourItem(typeArb: fc.Arbitrary<ArmourType>, worn: boolean | fc.Arbitrary<boolean>): fc.Arbitrary<ArmourItem> {
  const wornArb = typeof worn === 'boolean' ? fc.constant(worn) : worn;
  return fc.record({
    name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
    locations: arbLocation,
    enc: fc.constantFrom('0', '1', '2', '3'),
    ap: fc.integer({ min: 1, max: 4 }),
    qualities: fc.constantFrom('—', 'Impenetrable', 'Overcoat', 'Partial'),
    armourType: typeArb,
    worn: wornArb,
    currentAp: fc.integer({ min: 1, max: 4 }),
  });
}

/** Generate a non-empty array of armour items with at least one worn Chainmail or Plate item */
const arbListWithStealthPenalty: fc.Arbitrary<ArmourItem[]> = fc.tuple(
  // At least one worn Chainmail/Plate item
  arbArmourItem(arbArmourType(STEALTH_PENALTY_TYPES), true),
  // Plus some other random items
  fc.array(arbArmourItem(arbArmourType(ALL_ARMOUR_TYPES), fc.boolean()), { minLength: 0, maxLength: 5 }),
).map(([penaltyItem, others]) => [penaltyItem, ...others]);

/** Generate an array of armour items where NO worn item has Chainmail or Plate */
const arbListWithoutStealthPenalty: fc.Arbitrary<ArmourItem[]> = fc.array(
  arbArmourItem(arbArmourType(NON_PENALTY_TYPES), fc.boolean()),
  { minLength: 1, maxLength: 6 },
);

/** Generate an array with Chainmail/Plate items, but all such items have worn: false */
const arbListWithUnwornPenaltyItems: fc.Arbitrary<ArmourItem[]> = fc.tuple(
  // At least one unworn Chainmail/Plate item
  arbArmourItem(arbArmourType(STEALTH_PENALTY_TYPES), false),
  // Other items that are non-penalty types (worn or not — doesn't matter)
  fc.array(arbArmourItem(arbArmourType(NON_PENALTY_TYPES), fc.boolean()), { minLength: 0, maxLength: 4 }),
).map(([unwornPenalty, others]) => [unwornPenalty, ...others]);

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: expanded-armour-system, Property 11: Stealth Penalty Display Logic', () => {
  it('stealth penalty badge IS present when at least one worn item has armourType Chainmail or Plate', () => {
    fc.assert(
      fc.property(
        arbListWithStealthPenalty,
        (armourList) => {
          const { unmount } = render(
            <ArmourMap armourPoints={ZERO_AP} armourList={armourList} />
          );
          expect(screen.getByTestId('stealth-penalty-badge')).toBeInTheDocument();
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('stealth penalty badge is NOT present when NO worn item has armourType Chainmail or Plate', () => {
    fc.assert(
      fc.property(
        arbListWithoutStealthPenalty,
        (armourList) => {
          const { unmount } = render(
            <ArmourMap armourPoints={ZERO_AP} armourList={armourList} />
          );
          expect(screen.queryByTestId('stealth-penalty-badge')).not.toBeInTheDocument();
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('items with worn: false that have Chainmail/Plate type should NOT trigger the badge', () => {
    fc.assert(
      fc.property(
        arbListWithUnwornPenaltyItems,
        (armourList) => {
          const { unmount } = render(
            <ArmourMap armourPoints={ZERO_AP} armourList={armourList} />
          );
          expect(screen.queryByTestId('stealth-penalty-badge')).not.toBeInTheDocument();
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
