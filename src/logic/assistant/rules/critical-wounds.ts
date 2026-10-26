import type { Character } from '../../../types/character';
import { getActiveCriticalWounds } from '../../critical-wounds';
import type { Suggestion } from '../types';

/**
 * Unhealed-critical-wounds suggestion (Character Assistant catalog §3). Reuses
 * the existing `getActiveCriticalWounds` helper (filters `!healed`) — it invents
 * no healing-time mechanic and no count/TB threshold.
 *
 * Core p.180-181 (Healing Critical Wounds): a Critical Wound is not healed until
 * the Conditions it inflicts are removed and its non-permanent modifiers are
 * resolved. The suggestion reminds of that requirement and routes to the panel;
 * it cannot compute heal-readiness (WFRP4e gives no fixed heal timer, and the
 * app tracks only `healed`/`healedAt`).
 *
 * Core p.172 (Death): escalate to `critical` only under the RAW Death-check
 * condition — the Unconscious Condition is present AND current Wounds are at or
 * below zero. No count-based or Toughness-Bonus-based escalation is used (not a
 * RAW trigger — rules-compliance).
 */
export function criticalWoundSuggestions(character: Character): Suggestion[] { // Core p.180-181 / p.172
  const active = getActiveCriticalWounds(character.criticalWounds);
  const n = active.length;
  if (n === 0) return [];

  // Core p.172 (Death): Unconscious at 0 or fewer Wounds is the RAW death-check condition.
  const unconsciousAtZero =
    character.conditions.some(c => c.name === 'Unconscious') && character.wCur <= 0;

  return [
    {
      id: 'health:critical-wounds',
      title: `${n} unhealed Critical Wound${n === 1 ? '' : 's'}`,
      rationale:
        'Critical Wounds do not count as healed until all Conditions they inflict are removed and all non-permanent modifiers are resolved — review healing requirements (Core p.180-181).',
      category: 'health',
      urgency: unconsciousAtZero ? 'critical' : 'recommended',
      action: { kind: 'navigate', page: 'combat' },
      citation: unconsciousAtZero
        ? 'Core p.172: Death'
        : 'Core p.180-181: Healing Critical Wounds',
    },
  ];
}
