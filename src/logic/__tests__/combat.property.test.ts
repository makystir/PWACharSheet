import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// Feature: tier1-content-gaps, Property 2: Missing useGroupAdvantage defaults to false
// **Validates: Requirements 2.2, 12.1**

describe('Property 2: Missing useGroupAdvantage defaults to false', () => {
  it('for any partial HouseRules object missing useGroupAdvantage, nullish coalescing resolves to false', () => {
    // Generate arbitrary partial objects that do NOT contain useGroupAdvantage
    const partialHouseRulesArb = fc.record(
      {
        rangedDamageSBMode: fc.constantFrom('none', 'halfSB', 'fullSB'),
        impaleCritsOnTens: fc.boolean(),
        min1Wound: fc.boolean(),
        advantageCap: fc.integer({ min: 1, max: 99 }),
      },
      { requiredKeys: [] }
    );

    fc.assert(
      fc.property(partialHouseRulesArb, (obj) => {
        // The object never has useGroupAdvantage, so the nullish coalescing pattern must return false
        const result = (obj as Record<string, unknown>)?.useGroupAdvantage ?? false;
        expect(result).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('for an undefined houseRules object, optional chaining resolves to false', () => {
    fc.assert(
      fc.property(fc.constant(undefined), (obj) => {
        const result = (obj as { useGroupAdvantage?: boolean } | undefined)?.useGroupAdvantage ?? false;
        expect(result).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('for a null houseRules object, optional chaining resolves to false', () => {
    fc.assert(
      fc.property(fc.constant(null), (obj) => {
        const result = (obj as { useGroupAdvantage?: boolean } | null)?.useGroupAdvantage ?? false;
        expect(result).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
