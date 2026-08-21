// Feature: armour-worn-toggle, Properties 1, 2, 5, 6
import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ArmourMap } from '../ArmourMap';
import type { ArmourItem, ArmourType, ArmourPoints } from '../../../types/character';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ZERO_AP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

const ALL_ARMOUR_TYPES: ArmourType[] = ['SoftKit', 'BoiledLeather', 'Chainmail', 'Brigandine', 'Plate'];
const STEALTH_PENALTY_TYPES: ArmourType[] = ['Chainmail', 'Plate'];
const NON_PENALTY_TYPES: ArmourType[] = ['SoftKit', 'BoiledLeather', 'Brigandine'];

type LocationKey = 'head' | 'lArm' | 'rArm' | 'body' | 'lLeg' | 'rLeg';
const ALL_LOCATION_KEYS: LocationKey[] = ['head', 'lArm', 'rArm', 'body', 'lLeg', 'rLeg'];

/** Maps location keys to location string patterns that coversLocation() will match */
const LOCATION_KEY_TO_STRING: Record<LocationKey, string> = {
  head: 'Head',
  lArm: 'L Arm',
  rArm: 'R Arm',
  body: 'Body',
  lLeg: 'L Leg',
  rLeg: 'R Leg',
};

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generate a worn state: true, false, or undefined */
const arbWornState: fc.Arbitrary<boolean | undefined> = fc.constantFrom(true, false, undefined);

/** Generate a non-empty armour name that won't accidentally match UI labels */
const arbArmourName: fc.Arbitrary<string> = fc.stringMatching(/^[A-Z][a-z]{3,12}$/);

/** Generate a random armour type */
const arbArmourType: fc.Arbitrary<ArmourType> = fc.constantFrom(...ALL_ARMOUR_TYPES);

/** Generate a random location key */
const arbLocationKey: fc.Arbitrary<LocationKey> = fc.constantFrom(...ALL_LOCATION_KEYS);

/** Generate a location string that covers a specific location key */
function locationStringFor(locKey: LocationKey): string {
  return LOCATION_KEY_TO_STRING[locKey];
}

/** Generate a location string that does NOT cover a specific location key */
function locationStringNotCovering(locKey: LocationKey): fc.Arbitrary<string> {
  const others = ALL_LOCATION_KEYS.filter(k => k !== locKey);
  // For arm/leg keys, we must also avoid "Arms"/"Legs" shorthand
  const filtered = others.filter(k => {
    if (locKey === 'lArm' || locKey === 'rArm') {
      // avoid other arm key too since "Arms" would match both
      return k !== 'lArm' && k !== 'rArm';
    }
    if (locKey === 'lLeg' || locKey === 'rLeg') {
      return k !== 'lLeg' && k !== 'rLeg';
    }
    return true;
  });
  // Pick one non-matching location
  if (filtered.length === 0) return fc.constant('Body');
  return fc.constantFrom(...filtered.map(k => LOCATION_KEY_TO_STRING[k]));
}

/** Generate a basic armour item with configurable worn state */
function arbArmourItem(opts?: {
  worn?: fc.Arbitrary<boolean | undefined>;
  armourType?: fc.Arbitrary<ArmourType>;
  locations?: fc.Arbitrary<string>;
  name?: fc.Arbitrary<string>;
}): fc.Arbitrary<ArmourItem> {
  return fc.record({
    name: opts?.name ?? arbArmourName,
    locations: opts?.locations ?? fc.constantFrom('Head', 'Body', 'Arms', 'Legs', 'L Arm', 'R Arm', 'L Leg', 'R Leg', 'Arms, Body', 'Body, Legs'),
    enc: fc.constantFrom('0', '1', '2', '3'),
    ap: fc.integer({ min: 1, max: 4 }),
    qualities: fc.constantFrom('—', 'Flexible'),
    armourType: opts?.armourType ?? arbArmourType,
    worn: opts?.worn ?? arbWornState,
  });
}

// ─── Property 1: Toggle inverts worn state ───────────────────────────────────

describe('Feature: armour-worn-toggle, Property 1: Toggle inverts worn state', () => {
  /**
   * **Validates: Requirements 1.2**
   *
   * For any armour item with any current worn state (true, false, or undefined),
   * activating the worn toggle SHALL produce the logical negation of the effective worn state.
   */
  it('toggle calls onUpdateArmour with negated effective worn state', () => {
    fc.assert(
      fc.property(
        arbArmourItem(),
        (item) => {
          const onUpdateArmour = vi.fn();
          const { unmount } = render(
            <ArmourMap
              armourPoints={ZERO_AP}
              armourList={[item]}
              onUpdateArmour={onUpdateArmour}
            />
          );

          const toggle = screen.getByTestId('armour-worn-toggle-0');
          fireEvent.click(toggle);

          const effectiveWorn = item.worn !== false;
          const expectedNewValue = !effectiveWorn;

          expect(onUpdateArmour).toHaveBeenCalledWith(0, 'worn', expectedNewValue);
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 2: Aria-label contains item name and worn state ────────────────

describe('Feature: armour-worn-toggle, Property 2: Aria-label contains item name and worn state', () => {
  /**
   * **Validates: Requirements 1.5**
   *
   * For any armour item with any name string and any worn state, the worn toggle's
   * aria-label SHALL contain both the item name and a worn/unworn text indicator.
   */
  it('aria-label contains item name and worn/unworn indicator', () => {
    fc.assert(
      fc.property(
        arbArmourItem(),
        (item) => {
          const onUpdateArmour = vi.fn();
          const { unmount } = render(
            <ArmourMap
              armourPoints={ZERO_AP}
              armourList={[item]}
              onUpdateArmour={onUpdateArmour}
            />
          );

          const toggle = screen.getByTestId('armour-worn-toggle-0');
          const ariaLabel = toggle.getAttribute('aria-label') ?? '';

          // Must contain the item name
          expect(ariaLabel).toContain(item.name);

          // Must contain a worn state indicator
          const expectedState = item.worn !== false ? 'worn' : 'unworn';
          expect(ariaLabel).toContain(expectedState);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 5: Contributing armour section filters by worn status ──────────

describe('Feature: armour-worn-toggle, Property 5: Contributing armour section filters by worn status', () => {
  /**
   * **Validates: Requirements 4.1**
   *
   * For any armour list and any selected body location, the contributing armour items
   * displayed SHALL include only items where `worn !== false` AND the item covers
   * the selected location.
   */
  it('contributing section shows only worn items covering the selected location', () => {
    fc.assert(
      fc.property(
        fc.array(arbArmourItem(), { minLength: 1, maxLength: 6 }),
        arbLocationKey,
        (armourList, selectedLocation) => {
          const { unmount, container } = render(
            <ArmourMap
              armourPoints={ZERO_AP}
              armourList={armourList}
              selectedLocation={selectedLocation}
            />
          );

          const view = within(container);
          const contributingSection = view.getByTestId('contributing-armour');

          // Compute expected contributing items
          const expectedContributing = armourList.filter(item => {
            if (item.worn === false) return false;
            // Replicate coversLocation logic
            const locStr = item.locations.toLowerCase();
            const label = LOCATION_KEY_TO_STRING[selectedLocation].toLowerCase();
            if (locStr.includes(label)) return true;
            if ((selectedLocation === 'lArm' || selectedLocation === 'rArm') && locStr.includes('arm')) return true;
            if ((selectedLocation === 'lLeg' || selectedLocation === 'rLeg') && locStr.includes('leg')) return true;
            if (locStr.includes('all')) return true;
            return false;
          });

          // Check that the number of contributing items matches
          if (expectedContributing.length === 0) {
            expect(contributingSection.textContent).toContain('No armour covers this location');
          } else {
            // Each expected item name should appear in the contributing section
            for (const item of expectedContributing) {
              expect(contributingSection.textContent).toContain(item.name);
            }
          }

          // Check that unworn items are NOT in the contributing section
          const unwornItems = armourList.filter(item => item.worn === false);
          for (const item of unwornItems) {
            // Only check items whose names wouldn't coincidentally match
            // a worn item's name (to avoid false negatives)
            const wornWithSameName = armourList.some(other =>
              other !== item && other.worn !== false && other.name === item.name
            );
            if (!wornWithSameName) {
              expect(contributingSection.textContent).not.toContain(item.name);
            }
          }

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Integration Test: All-unworn zero AP scenario (Requirement 4.3) ─────────

describe('Feature: armour-worn-toggle, Integration: All-unworn shows zero AP', () => {
  /**
   * **Validates: Requirements 4.3**
   *
   * When all armour items have worn: false, the body map should display 0 AP
   * for all locations and the contributing armour section should show no items.
   */
  it('displays 0 AP for all locations when all items are unworn', () => {
    const allUnwornArmour: ArmourItem[] = [
      { name: 'Full Plate Helm', locations: 'Head', enc: '2', ap: 5, qualities: '—', armourType: 'Plate', worn: false },
      { name: 'Chain Hauberk', locations: 'Body, Arms', enc: '3', ap: 3, qualities: 'Flexible', armourType: 'Chainmail', worn: false },
      { name: 'Leather Leggings', locations: 'Legs', enc: '1', ap: 1, qualities: 'Flexible', armourType: 'BoiledLeather', worn: false },
      { name: 'Brigandine Vest', locations: 'Body', enc: '2', ap: 3, qualities: '—', armourType: 'Brigandine', worn: false },
    ];

    // Since all items are unworn, the externally-computed AP should be all zeros
    const allZeroAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

    const { container } = render(
      <ArmourMap armourPoints={allZeroAP} armourList={allUnwornArmour} />
    );

    // Assert all body map locations display 0 AP
    const bodyMap = within(container).getByTestId('armour-body-map');
    for (const locKey of ALL_LOCATION_KEYS) {
      const locationButton = within(bodyMap).getByTestId(`location-${locKey}`);
      // The AP value is rendered inside a TooltipTriggerCell which displays armourPoints[loc.key]
      expect(locationButton).toHaveTextContent('0');
    }
  });

  it('shows no contributing items for any selected location when all are unworn', () => {
    const allUnwornArmour: ArmourItem[] = [
      { name: 'Full Plate Helm', locations: 'Head', enc: '2', ap: 5, qualities: '—', armourType: 'Plate', worn: false },
      { name: 'Chain Hauberk', locations: 'Body, Arms', enc: '3', ap: 3, qualities: 'Flexible', armourType: 'Chainmail', worn: false },
      { name: 'Leather Leggings', locations: 'Legs', enc: '1', ap: 1, qualities: 'Flexible', armourType: 'BoiledLeather', worn: false },
    ];

    const allZeroAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

    // Check each location — all should show "No armour covers this location"
    for (const locKey of ALL_LOCATION_KEYS) {
      const { unmount, container } = render(
        <ArmourMap armourPoints={allZeroAP} armourList={allUnwornArmour} selectedLocation={locKey} />
      );

      const contributingSection = within(container).getByTestId('contributing-armour');
      expect(contributingSection.textContent).toContain('No armour covers this location');

      // Verify none of the armour item names appear in the contributing section
      for (const item of allUnwornArmour) {
        expect(contributingSection.textContent).not.toContain(item.name);
      }

      unmount();
    }
  });

  it('does not show stealth penalty badge when all items are unworn', () => {
    const allUnwornArmour: ArmourItem[] = [
      { name: 'Chain Hauberk', locations: 'Body, Arms', enc: '3', ap: 3, qualities: '—', armourType: 'Chainmail', worn: false },
      { name: 'Plate Greaves', locations: 'Legs', enc: '2', ap: 5, qualities: '—', armourType: 'Plate', worn: false },
    ];

    const allZeroAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

    render(<ArmourMap armourPoints={allZeroAP} armourList={allUnwornArmour} />);

    expect(screen.queryByTestId('stealth-penalty-badge')).not.toBeInTheDocument();
  });
});

// ─── Property 6: Stealth penalty badge reflects worn heavy armour ────────────

describe('Feature: armour-worn-toggle, Property 6: Stealth penalty badge reflects worn heavy armour', () => {
  /**
   * **Validates: Requirements 4.2**
   *
   * For any armour list, the stealth penalty badge SHALL be visible if and only if
   * at least one item has `worn !== false` AND `armourType` is "Chainmail" or "Plate".
   */
  it('stealth badge visible iff at least one worn Chainmail or Plate item exists', () => {
    fc.assert(
      fc.property(
        fc.array(arbArmourItem(), { minLength: 1, maxLength: 6 }),
        (armourList) => {
          const { unmount } = render(
            <ArmourMap armourPoints={ZERO_AP} armourList={armourList} />
          );

          const hasWornHeavy = armourList.some(
            item => item.worn !== false && (item.armourType === 'Chainmail' || item.armourType === 'Plate')
          );

          const badge = screen.queryByTestId('stealth-penalty-badge');

          if (hasWornHeavy) {
            expect(badge).toBeInTheDocument();
          } else {
            expect(badge).not.toBeInTheDocument();
          }

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
