// Feature: expanded-armour-system, Property 1: Quality and Flaw Indicator Completeness
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArmourMap } from '../ArmourMap';
import type { ArmourItem, ArmourPoints } from '../../../types/character';

/**
 * Property 1: Quality and Flaw Indicator Completeness
 *
 * **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3**
 *
 * For any armour item with one or more qualities or flaws in its `qualities` string,
 * and for any location that item covers, the rendered ArmourMap output SHALL contain
 * a visible indicator (icon, badge, or label) for each quality and flaw present on that item.
 */

// ─── Known Qualities and Flaws ───────────────────────────────────────────────

const KNOWN_QUALITIES = ['Impenetrable', 'Overcoat', 'Reinforced', 'Visor'] as const;
const KNOWN_FLAWS = ['Partial', 'Requires Kit', 'Weakpoints'] as const;
const ALL_QUALITY_FLAW_NAMES = [...KNOWN_QUALITIES, ...KNOWN_FLAWS];

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generate a non-empty subset of quality/flaw names (1 to all 7) */
const qualitySubset = fc.subarray(ALL_QUALITY_FLAW_NAMES, { minLength: 1, maxLength: ALL_QUALITY_FLAW_NAMES.length });

/** Generate a valid location string that maps to at least one location key */
const locationArbitrary = fc.constantFrom(
  'Head',
  'Arms',
  'Body',
  'Legs',
  'Arms, Body',
  'Arms, Body, Legs',
  'Head, Arms, Body, Legs',
);

/** Generate an armour item with random qualities from the known set */
const armourItemWithQualities: fc.Arbitrary<{ item: ArmourItem; qualities: string[] }> = fc.record({
  qualities: qualitySubset,
  location: locationArbitrary,
  ap: fc.integer({ min: 1, max: 5 }),
  name: fc.constantFrom('Test Helm', 'Test Plate', 'Test Mail', 'Test Brigandine', 'Test Kit'),
}).map(({ qualities, location, ap, name }) => ({
  item: {
    name,
    locations: location,
    enc: '1',
    ap,
    qualities: qualities.join(', '),
    worn: true,
    armourType: 'Plate' as const,
    currentAp: ap,
  },
  qualities,
}));

/** Helper: convert quality name to kebab-case data-testid suffix */
function toKebabCase(name: string): string {
  return name.replace(/\s+/g, '-').toLowerCase();
}

// ─── Default ArmourPoints ────────────────────────────────────────────────────

const defaultArmourPoints: ArmourPoints = {
  head: 0,
  lArm: 0,
  rArm: 0,
  body: 0,
  lLeg: 0,
  rLeg: 0,
  shield: 0,
};

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: expanded-armour-system', () => {
  describe('Property 1: Quality and Flaw Indicator Completeness', () => {
    it('each quality/flaw on an armour item produces a badge element when the item row is expanded', () => {
      fc.assert(
        fc.property(
          armourItemWithQualities,
          ({ item, qualities }) => {
            const { unmount } = render(
              <ArmourMap
                armourPoints={defaultArmourPoints}
                armourList={[item]}
              />
            );

            // Click on the armour item row to expand it and reveal quality badges
            const armourRow = screen.getByTestId('armour-item-0');
            const expandableElement = armourRow.querySelector('[aria-expanded]');
            if (expandableElement) {
              fireEvent.click(expandableElement);
            }

            // Verify each quality/flaw has a corresponding badge
            for (const qualityName of qualities) {
              const testId = `quality-badge-${toKebabCase(qualityName)}`;
              const badge = screen.queryByTestId(testId);
              expect(badge, `Expected badge for "${qualityName}" (testid: ${testId})`).not.toBeNull();
            }

            // Verify the number of badges matches the number of qualities on the item
            const badgeContainer = screen.queryByTestId('armour-badges-0');
            if (badgeContainer) {
              const badges = badgeContainer.querySelectorAll('[data-testid^="quality-badge-"]');
              expect(badges.length).toBe(qualities.length);
            }

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
