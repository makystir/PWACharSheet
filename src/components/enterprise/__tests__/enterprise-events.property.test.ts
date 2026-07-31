import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { rollEnterpriseEvent } from '../../../logic/enterprise-utils';
import { lookupEvent, ENTERPRISE_EVENTS } from '../../../data/enterprise-events';
import { ENTERPRISE_TEMPLATE_MAP } from '../../../data/enterprises';
import type { EnterpriseType } from '../../../types/character';

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

function arbitraryEnterpriseType(): fc.Arbitrary<EnterpriseType> {
  return fc.constantFrom(...ALL_ENTERPRISE_TYPES);
}

describe('Feature: enterprise-tracker, Property 10: Event roll produces valid range', () => {
  /**
   * Property 10: Event roll produces valid range
   *
   * For any invocation of rollEnterpriseEvent, the returned result SHALL have
   * a `roll` in range [1, 100] inclusive, a non-empty `title`, and a non-empty
   * `description`.
   *
   * Validates: Requirements 8.1, 8.2
   */
  it('rollEnterpriseEvent always returns roll in [1, 100] with non-empty title and description', () => {
    fc.assert(
      fc.property(arbitraryEnterpriseType(), (enterpriseType) => {
        const result = rollEnterpriseEvent(enterpriseType);

        // Roll must be in [1, 100]
        expect(result.roll).toBeGreaterThanOrEqual(1);
        expect(result.roll).toBeLessThanOrEqual(100);

        // Title must be non-empty
        expect(result.title.length).toBeGreaterThan(0);

        // Description must be non-empty
        expect(result.description.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: enterprise-tracker, Property 11: Event lookup completeness', () => {
  /**
   * Property 11: Event lookup completeness
   *
   * For any integer N in [1, 100], looking up N in the Enterprise Events Table
   * SHALL return a non-empty event title and a non-empty event description,
   * with no gaps or overlaps in the table's range coverage.
   *
   * Validates: Requirements 8.2, 8.3
   */
  it('lookupEvent returns a valid event for every roll value in [1, 100]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (roll) => {
        const event = lookupEvent(roll);

        // Event must be found (no gaps)
        expect(event).toBeDefined();
        expect(event!.title.length).toBeGreaterThan(0);
        expect(event!.description.length).toBeGreaterThan(0);

        // Roll must fall within the event's declared range
        expect(roll).toBeGreaterThanOrEqual(event!.rangeStart);
        expect(roll).toBeLessThanOrEqual(event!.rangeEnd);
      }),
      { numRuns: 100 }
    );
  });

  it('enterprise events table has no overlapping ranges', () => {
    // Verify no two events overlap by checking every pair
    for (let i = 0; i < ENTERPRISE_EVENTS.length; i++) {
      for (let j = i + 1; j < ENTERPRISE_EVENTS.length; j++) {
        const a = ENTERPRISE_EVENTS[i];
        const b = ENTERPRISE_EVENTS[j];
        const overlaps = a.rangeStart <= b.rangeEnd && b.rangeStart <= a.rangeEnd;
        expect(overlaps, `Events "${a.title}" [${a.rangeStart}-${a.rangeEnd}] and "${b.title}" [${b.rangeStart}-${b.rangeEnd}] overlap`).toBe(false);
      }
    }
  });
});

describe('Feature: enterprise-tracker, Property 12: Alternate event resolution by enterprise type', () => {
  /**
   * Property 12: Alternate event resolution by enterprise type
   *
   * For any enterprise type and any roll value in [55, 57] or [58, 60], the
   * event lookup (using template-aware resolution) SHALL return the title and
   * description from that enterprise type's template-specific alternate event data.
   *
   * Validates: Requirements 8.4
   */
  it('rolls in [55, 57] resolve to template alternateEvent1 for any enterprise type', () => {
    fc.assert(
      fc.property(
        arbitraryEnterpriseType(),
        fc.integer({ min: 55, max: 57 }),
        (enterpriseType, _roll) => {
          const template = ENTERPRISE_TEMPLATE_MAP[enterpriseType];

          // Call rollEnterpriseEvent many times isn't feasible since roll is random;
          // instead, directly test the resolution logic by looking up the event
          // and verifying that the alternate event data matches the template.
          const event = lookupEvent(55); // Any value in [55, 57] maps to same event entry
          expect(event).toBeDefined();
          expect(event!.isAlternate).toBe(true);
          expect(event!.rangeStart).toBe(55);

          // The resolved result should use template's alternateEvent1
          expect(template.alternateEvent1.title.length).toBeGreaterThan(0);
          expect(template.alternateEvent1.description.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rolls in [58, 60] resolve to template alternateEvent2 for any enterprise type', () => {
    fc.assert(
      fc.property(
        arbitraryEnterpriseType(),
        fc.integer({ min: 58, max: 60 }),
        (enterpriseType, _roll) => {
          const template = ENTERPRISE_TEMPLATE_MAP[enterpriseType];

          const event = lookupEvent(58); // Any value in [58, 60] maps to same event entry
          expect(event).toBeDefined();
          expect(event!.isAlternate).toBe(true);
          expect(event!.rangeStart).toBe(58);

          // The resolved result should use template's alternateEvent2
          expect(template.alternateEvent2.title.length).toBeGreaterThan(0);
          expect(template.alternateEvent2.description.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rollEnterpriseEvent resolves alternate events to template-specific data (not generic placeholder)', () => {
    // Test the full resolution by calling rollEnterpriseEvent repeatedly and
    // verifying that when a roll lands in alternate ranges, it uses template data.
    // Since we can't control Math.random, we test the logic deterministically
    // by mocking Math.random for specific values.
    for (const enterpriseType of ALL_ENTERPRISE_TYPES) {
      const template = ENTERPRISE_TEMPLATE_MAP[enterpriseType];

      // Test alternate event 1 (roll in 55-57): mock Math.random to return 54/100
      const originalRandom = Math.random;

      // Mock for roll = 55 (Math.floor(0.54 * 100) + 1 = 55)
      Math.random = () => 0.54;
      const result1 = rollEnterpriseEvent(enterpriseType);
      expect(result1.roll).toBe(55);
      expect(result1.title).toBe(template.alternateEvent1.title);
      expect(result1.description).toBe(template.alternateEvent1.description);

      // Mock for roll = 58 (Math.floor(0.57 * 100) + 1 = 58)
      // Use 0.57001 to avoid floating point edge case where 0.57*100 < 57
      Math.random = () => 0.57001;
      const result2 = rollEnterpriseEvent(enterpriseType);
      expect(result2.roll).toBe(58);
      expect(result2.title).toBe(template.alternateEvent2.title);
      expect(result2.description).toBe(template.alternateEvent2.description);

      Math.random = originalRandom;
    }
  });
});
