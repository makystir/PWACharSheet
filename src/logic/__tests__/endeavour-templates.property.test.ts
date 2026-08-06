import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { applyEndeavourTemplate } from '../endeavour-templates';

// Feature: quality-of-life-improvements, Property 11: Endeavour Template Notes Non-Empty
// **Validates: Requirements 8.3**

// Feature: quality-of-life-improvements, Property 12: Endeavour Template Cost Lookup
// **Validates: Requirements 8.4, 8.6**

describe('Property 11: Endeavour Template Notes Non-Empty', () => {
  const validTemplateTypes = ['Training', 'Income', 'Research', 'Crafting', 'Healing', 'Socialising'] as const;

  /** Generator for valid template types */
  const templateTypeArb = fc.constantFrom(...validTemplateTypes);

  /** Generator for statusTier: undefined, empty string, or valid tiers */
  const statusTierArb = fc.oneof(
    fc.constant(undefined),
    fc.constant(''),
    fc.constantFrom('Brass 1', 'Brass 2', 'Brass 3', 'Brass 4', 'Brass 5'),
    fc.constantFrom('Silver 1', 'Silver 2', 'Silver 3', 'Silver 4', 'Silver 5'),
    fc.constantFrom('Gold 1', 'Gold 2', 'Gold 3', 'Gold 4', 'Gold 5'),
  );

  it('applying any valid template type produces a non-empty notes string', () => {
    fc.assert(
      fc.property(templateTypeArb, statusTierArb, (templateType, statusTier) => {
        const result = applyEndeavourTemplate(templateType, statusTier);

        expect(result.notes.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});


// Feature: quality-of-life-improvements, Property 12: Endeavour Template Cost Lookup
// **Validates: Requirements 8.4, 8.6**

describe('Property 12: Endeavour Template Cost Lookup', () => {
  /** Template types that have an associated cost (non-null cost field) */
  const templatesWithCost = ['Training', 'Research', 'Crafting', 'Healing', 'Socialising'] as const;

  /** Generator for template types that have costs */
  const templateWithCostArb = fc.constantFrom(...templatesWithCost);

  /** Generator for valid status tier strings (Brass/Silver/Gold + tier number 1-5) */
  const validStatusTierArb = fc.constantFrom(
    'Brass 1', 'Brass 2', 'Brass 3', 'Brass 4', 'Brass 5',
    'Silver 1', 'Silver 2', 'Silver 3', 'Silver 4', 'Silver 5',
    'Gold 1', 'Gold 2', 'Gold 3', 'Gold 4', 'Gold 5',
  );

  it('template with cost and valid status tier produces a non-empty cost field', () => {
    fc.assert(
      fc.property(templateWithCostArb, validStatusTierArb, (templateType, statusTier) => {
        const result = applyEndeavourTemplate(templateType, statusTier);

        expect(result.cost.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('template with cost but no status tier produces an empty cost field', () => {
    /** Generator for absent status tier (undefined or empty string) */
    const absentTierArb = fc.constantFrom(undefined, '');

    fc.assert(
      fc.property(templateWithCostArb, absentTierArb, (templateType, statusTier) => {
        const result = applyEndeavourTemplate(templateType, statusTier);

        expect(result.cost).toBe('');
      }),
      { numRuns: 100 }
    );
  });
});
