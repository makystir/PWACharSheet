import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ENTERPRISE_TEMPLATES, ENTERPRISE_TEMPLATE_MAP } from '../enterprises';
import { createEnterpriseFromTemplate } from '../../logic/enterprise-utils';
import { EnterpriseType } from '../../types/character';

// All valid enterprise types for generators
const ALL_ENTERPRISE_TYPES: EnterpriseType[] = ENTERPRISE_TEMPLATES.map(t => t.type);

describe('Feature: enterprise-tracker, Property 4: Enterprise creation from template produces correct defaults', () => {
  /**
   * Property 4: Enterprise creation from template produces correct defaults
   *
   * For any enterprise template type, creating a new enterprise from that
   * template SHALL produce an enterprise with:
   * - expansionLevel === 1
   * - debt of {gc: 0, ss: 0, d: 0}
   * - empty creditorName
   * - interestPayment equal to the template's base interest payment
   * - incomeSources containing exactly the template's level-1 active income sources
   * - trappings equal to the template's base trappings
   * - specialRules equal to the template's base special rules
   *
   * Validates: Requirements 5.2
   */
  it('creating an enterprise from any template produces correct defaults', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ENTERPRISE_TYPES),
        fc.string({ minLength: 1, maxLength: 100 }),
        (type, name) => {
          const template = ENTERPRISE_TEMPLATE_MAP[type];
          const enterprise = createEnterpriseFromTemplate(type, name);

          // expansionLevel must be 1
          expect(enterprise.expansionLevel).toBe(1);

          // debt must be zero
          expect(enterprise.debt).toEqual({ gc: 0, ss: 0, d: 0 });

          // creditorName must be empty
          expect(enterprise.creditorName).toBe('');

          // interestPayment must equal template's baseInterestPayment
          expect(enterprise.interestPayment).toEqual(template.baseInterestPayment);

          // incomeSources must contain exactly the template's level-1 active income sources
          const expectedSources = template.incomeSources.filter(s => s.activeAtBase);
          expect(enterprise.incomeSources).toHaveLength(expectedSources.length);
          for (let i = 0; i < expectedSources.length; i++) {
            expect(enterprise.incomeSources[i].description).toBe(expectedSources[i].description);
            expect(enterprise.incomeSources[i].earningSkill).toBe(expectedSources[i].earningSkill);
            expect(enterprise.incomeSources[i].effectiveStatus).toBe(expectedSources[i].effectiveStatus);
            // Each income source should have a unique id
            expect(enterprise.incomeSources[i].id).toBeTruthy();
          }

          // trappings must equal template's base trappings
          expect(enterprise.trappings).toEqual(template.trappings);

          // specialRules must equal template's base special rules
          expect(enterprise.specialRules).toEqual(template.specialRules);

          // Additional structural checks
          expect(enterprise.name).toBe(name);
          expect(enterprise.type).toBe(type);
          expect(enterprise.id).toBeTruthy();
          expect(enterprise.notes).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });
});
