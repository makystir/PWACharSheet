import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ENTERPRISE_TEMPLATES, ENTERPRISE_TEMPLATE_MAP } from '../../../data/enterprises';
import { expandEnterprise, hasOutstandingDebt, createEnterpriseFromTemplate } from '../../../logic/enterprise-utils';
import type { EnterpriseType, EnterpriseCurrency } from '../../../types/character';

// ─── Generators ──────────────────────────────────────────────────────────────

const ALL_ENTERPRISE_TYPES: EnterpriseType[] = ENTERPRISE_TEMPLATES.map(t => t.type);

function arbitraryEnterpriseType(): fc.Arbitrary<EnterpriseType> {
  return fc.constantFrom(...ALL_ENTERPRISE_TYPES);
}

function arbitraryEnterpriseCurrency(): fc.Arbitrary<EnterpriseCurrency> {
  return fc.record({
    gc: fc.nat({ max: 999 }),
    ss: fc.nat({ max: 999 }),
    d: fc.nat({ max: 999 }),
  });
}

/** Generate an expansion level between 1 and 3 (eligible for expansion) */
function arbitraryExpandableLevel(): fc.Arbitrary<number> {
  return fc.integer({ min: 1, max: 3 });
}

/** Generate a debt with at least one positive component */
function arbitraryNonZeroDebt(): fc.Arbitrary<EnterpriseCurrency> {
  return arbitraryEnterpriseCurrency().filter(
    (debt) => debt.gc > 0 || debt.ss > 0 || debt.d > 0
  );
}

// ─── Property 8: Expansion state transition correctness ─────────────────────

describe('Feature: enterprise-tracker, Property 8: Expansion state transition correctness', () => {
  /**
   * Property 8: Expansion state transition correctness
   *
   * For any enterprise at expansion level L (where 1 ≤ L ≤ 3) with zero debt,
   * confirming expansion SHALL produce an enterprise with:
   * - expansionLevel === L + 1
   * - trappings array contains all items from before PLUS additional trappings from template for level L+1
   * - incomeSources array contains all items from before PLUS additional income sources from template for level L+1
   * - specialRules array contains all items from before PLUS additional special rules from template for level L+1
   *
   * Validates: Requirements 7.3, 7.4
   */
  it('expanding an enterprise correctly transitions to the next level with all new items added', () => {
    fc.assert(
      fc.property(
        arbitraryEnterpriseType(),
        arbitraryExpandableLevel(),
        (type, level) => {
          const template = ENTERPRISE_TEMPLATE_MAP[type];

          // Build an enterprise at the given level by expanding from level 1
          let enterprise = createEnterpriseFromTemplate(type, 'Test Enterprise');
          for (let l = 1; l < level; l++) {
            enterprise = expandEnterprise(enterprise, template);
          }

          // Snapshot state before expansion
          const prevTrappings = [...enterprise.trappings];
          const prevIncomeSources = [...enterprise.incomeSources];
          const prevSpecialRules = [...enterprise.specialRules];
          const prevLevel = enterprise.expansionLevel;

          expect(prevLevel).toBe(level);

          // Perform expansion
          const expanded = expandEnterprise(enterprise, template);

          // Get the expected additions from the template
          const nextLevelKey = `level${level + 1}` as keyof typeof template.expansions;
          const expansion = template.expansions[nextLevelKey];

          // expansionLevel must be L + 1
          expect(expanded.expansionLevel).toBe(level + 1);

          // trappings must contain all previous items plus additional trappings
          expect(expanded.trappings).toHaveLength(
            prevTrappings.length + expansion.additionalTrappings.length
          );
          // All previous trappings must still be present in order
          for (let i = 0; i < prevTrappings.length; i++) {
            expect(expanded.trappings[i]).toBe(prevTrappings[i]);
          }
          // New trappings must be appended
          for (let i = 0; i < expansion.additionalTrappings.length; i++) {
            expect(expanded.trappings[prevTrappings.length + i]).toBe(
              expansion.additionalTrappings[i]
            );
          }

          // incomeSources must contain all previous items plus additional income sources
          expect(expanded.incomeSources).toHaveLength(
            prevIncomeSources.length + expansion.additionalIncomeSources.length
          );
          // All previous income sources must still be present in order
          for (let i = 0; i < prevIncomeSources.length; i++) {
            expect(expanded.incomeSources[i].description).toBe(prevIncomeSources[i].description);
            expect(expanded.incomeSources[i].earningSkill).toBe(prevIncomeSources[i].earningSkill);
            expect(expanded.incomeSources[i].effectiveStatus).toBe(prevIncomeSources[i].effectiveStatus);
          }
          // New income sources must be appended with correct data
          for (let i = 0; i < expansion.additionalIncomeSources.length; i++) {
            const newSource = expanded.incomeSources[prevIncomeSources.length + i];
            expect(newSource.description).toBe(expansion.additionalIncomeSources[i].description);
            expect(newSource.earningSkill).toBe(expansion.additionalIncomeSources[i].earningSkill);
            expect(newSource.effectiveStatus).toBe(expansion.additionalIncomeSources[i].effectiveStatus);
            expect(newSource.id).toBeTruthy();
          }

          // specialRules must contain all previous items plus additional special rules
          expect(expanded.specialRules).toHaveLength(
            prevSpecialRules.length + expansion.additionalSpecialRules.length
          );
          // All previous special rules must still be present in order
          for (let i = 0; i < prevSpecialRules.length; i++) {
            expect(expanded.specialRules[i]).toBe(prevSpecialRules[i]);
          }
          // New special rules must be appended
          for (let i = 0; i < expansion.additionalSpecialRules.length; i++) {
            expect(expanded.specialRules[prevSpecialRules.length + i]).toBe(
              expansion.additionalSpecialRules[i]
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 9: Debt blocks expansion ──────────────────────────────────────

describe('Feature: enterprise-tracker, Property 9: Debt blocks expansion', () => {
  /**
   * Property 9: Debt blocks expansion
   *
   * For any enterprise with outstanding debt greater than zero
   * (where debt.gc > 0 || debt.ss > 0 || debt.d > 0),
   * the expansion action SHALL be disabled.
   * Test using `hasOutstandingDebt` from enterprise-utils.
   *
   * Validates: Requirements 7.6
   */
  it('hasOutstandingDebt returns true for any enterprise with non-zero debt', () => {
    fc.assert(
      fc.property(
        arbitraryNonZeroDebt(),
        (debt) => {
          expect(hasOutstandingDebt(debt)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('hasOutstandingDebt returns false for zero debt', () => {
    expect(hasOutstandingDebt({ gc: 0, ss: 0, d: 0 })).toBe(false);
  });
});
