import type { Enterprise, EnterpriseCurrency, EnterpriseType, EnterpriseIncomeSource } from '../types/character';
import { ENTERPRISE_TEMPLATE_MAP, type EnterpriseTemplate } from '../data/enterprises';
import { type EnterpriseEventResult, lookupEvent } from '../data/enterprise-events';

/**
 * Creates a new Enterprise from a template type and a given name.
 * Sets up level-1 defaults: zero debt, base interest payment, base income sources/trappings/specialRules.
 */
export function createEnterpriseFromTemplate(type: EnterpriseType, name: string): Enterprise {
  const template = ENTERPRISE_TEMPLATE_MAP[type];

  const incomeSources: EnterpriseIncomeSource[] = template.incomeSources
    .filter((source) => source.activeAtBase)
    .map((source) => ({
      id: crypto.randomUUID(),
      description: source.description,
      earningSkill: source.earningSkill,
      effectiveStatus: source.effectiveStatus,
    }));

  return {
    id: crypto.randomUUID(),
    name,
    type,
    expansionLevel: 1,
    debt: { gc: 0, ss: 0, d: 0 },
    creditorName: '',
    interestPayment: { ...template.baseInterestPayment },
    incomeSources,
    trappings: [...template.trappings],
    specialRules: [...template.specialRules],
    notes: '',
  };
}

/**
 * Expands an enterprise to the next level using the given template.
 * Returns a new enterprise object (immutable). Does nothing if already at level 4.
 */
export function expandEnterprise(enterprise: Enterprise, template: EnterpriseTemplate): Enterprise {
  if (enterprise.expansionLevel >= 4) {
    return enterprise;
  }

  const newLevel = enterprise.expansionLevel + 1;
  const levelKey = `level${newLevel}` as keyof typeof template.expansions;
  const expansion = template.expansions[levelKey];

  const additionalIncomeSources: EnterpriseIncomeSource[] = expansion.additionalIncomeSources.map(
    (source) => ({
      id: crypto.randomUUID(),
      description: source.description,
      earningSkill: source.earningSkill,
      effectiveStatus: source.effectiveStatus,
    })
  );

  return {
    ...enterprise,
    expansionLevel: newLevel,
    interestPayment: { ...expansion.interestPayment },
    trappings: [...enterprise.trappings, ...expansion.additionalTrappings],
    incomeSources: [...enterprise.incomeSources, ...additionalIncomeSources],
    specialRules: [...enterprise.specialRules, ...expansion.additionalSpecialRules],
  };
}

/**
 * Rolls an enterprise event (1-100) and resolves alternate events using the enterprise template.
 */
export function rollEnterpriseEvent(enterpriseType: EnterpriseType): EnterpriseEventResult {
  const roll = Math.floor(Math.random() * 100) + 1;
  const event = lookupEvent(roll);

  if (!event) {
    return { roll, title: 'Unknown Event', description: 'No event found for this roll.' };
  }

  if (event.isAlternate) {
    const template = ENTERPRISE_TEMPLATE_MAP[enterpriseType];
    if (event.rangeStart === 55) {
      return { roll, title: template.alternateEvent1.title, description: template.alternateEvent1.description };
    } else {
      return { roll, title: template.alternateEvent2.title, description: template.alternateEvent2.description };
    }
  }

  return { roll, title: event.title, description: event.description };
}

/**
 * Parses a string as a non-negative integer for monetary fields.
 * Returns 0 if the input is not a valid non-negative integer.
 */
export function parseMonetaryInput(value: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 0) {
    return 0;
  }
  // Reject strings that aren't clean integers (e.g. "3.5", "12abc")
  if (String(parsed) !== value.trim()) {
    return 0;
  }
  return parsed;
}

/**
 * Clamps a monetary value to the range [0, 999].
 */
export function clampMonetary(value: number): number {
  return Math.max(0, Math.min(999, Math.floor(value)));
}

/**
 * Returns true if the enterprise has any outstanding debt (gc, ss, or d > 0).
 */
export function hasOutstandingDebt(debt: EnterpriseCurrency): boolean {
  return debt.gc > 0 || debt.ss > 0 || debt.d > 0;
}
