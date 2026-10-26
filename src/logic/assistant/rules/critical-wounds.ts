import type { Character } from '../../../types/character';
import { getBonus } from '../../calculators';
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
 * Core p.172 (Death): escalate to `critical` only under the full RAW Death-check
 * condition — the Unconscious Condition is present AND current Wounds are at or
 * below zero AND the number of active Critical Wounds exceeds the Toughness Bonus.
 * Per Core p.172 "Death" (and the identical wording in Up In Arms "death"), a
 * character Unconscious at 0 Wounds only succumbs when their Critical Wound count
 * is GREATER than their Toughness Bonus; at or below TB they merely fall
 * unconscious. The `> TB` comparison is the RAW trigger, not an invented
 * threshold. TB reuses the existing `getBonus` helper (no new math).
 */
export function criticalWoundSuggestions(character: Character): Suggestion[] { // Core p.180-181 / p.172
  const active = getActiveCriticalWounds(character.criticalWounds);
  const n = active.length;
  if (n === 0) return [];

  // Core p.172 (Death): Unconscious at 0 or fewer Wounds with MORE Critical Wounds
  // than the Toughness Bonus is the RAW death-check condition.
  const tb = getBonus(character.chars.T.i + character.chars.T.a + character.chars.T.b);
  const deathCheck =
    character.conditions.some(c => c.name === 'Unconscious') && character.wCur <= 0 && n > tb;

  return [
    {
      id: 'health:critical-wounds',
      title: `${n} unhealed Critical Wound${n === 1 ? '' : 's'}`,
      rationale:
        'Critical Wounds do not count as healed until all Conditions they inflict are removed and all non-permanent modifiers are resolved — review healing requirements (Core p.180-181).',
      category: 'health',
      urgency: deathCheck ? 'critical' : 'recommended',
      action: { kind: 'navigate', page: 'combat' },
      citation: deathCheck
        ? 'Core p.172: Death'
        : 'Core p.180-181: Healing Critical Wounds',
    },
  ];
}
