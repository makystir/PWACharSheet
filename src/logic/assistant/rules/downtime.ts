import type { Character } from '../../../types/character';
import { hasActiveEndeavours } from '../../endeavours';
import type { Suggestion, SuggestionContext } from '../types';

/**
 * Downtime-endeavour-opportunity suggestion (Character Assistant catalog §5).
 * COMPLEMENTS the existing `endeavours.ts` rule: `endeavourSuggestions` fires on
 * *active* (pending/in_progress) endeavours; this fires in the complementary
 * state — the character has downtime capacity but nothing in flight. Reusing
 * `hasActiveEndeavours` guarantees the two can never double-fire.
 *
 * Out-of-combat ONLY (by the `ctx.inCombat` gate). Reads `period.slots`/`entries`
 * only; it does not recompute slot counts.
 *
 * Core p.194-195 (Between Adventures — Endeavours): between adventures a
 * character can undertake Endeavours (Income, Training, Research, and more).
 */
export function downtimeSuggestions(
  character: Character,
  ctx: SuggestionContext,
): Suggestion[] { // Core p.194-195
  if (ctx.inCombat) return []; // downtime activity — out of combat only
  if (hasActiveEndeavours(character)) return []; // mutual exclusion with endeavour:active

  const periods = character.endeavours;
  const hasFreeSlots = periods.some(
    p => p.entries.filter(e => e.status !== 'completed').length < p.slots,
  );
  const noPeriods = periods.length === 0;

  if (!hasFreeSlots && !noPeriods) return [];

  return [
    {
      id: 'endeavour:available',
      title: noPeriods ? 'Start a downtime Endeavour' : 'You have open Endeavour slots',
      rationale: 'Between adventures you can spend Endeavours on Income, Training, Research, and more.',
      category: 'endeavour',
      urgency: 'info',
      action: { kind: 'navigate', page: 'endeavours' },
      citation: 'Core p.194-195: Endeavours (Between Adventures)',
    },
  ];
}
