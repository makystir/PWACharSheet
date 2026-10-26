import type { Character } from '../../../types/character';
import { hasActiveEndeavours } from '../../endeavours';
import type { Suggestion } from '../types';

/**
 * Endeavours-needing-a-result suggestions (FR-8.2). Reuses the extracted
 * `hasActiveEndeavours` predicate — byte-identical to the Endeavours nav badge
 * — so the two can never diverge.
 */
export function endeavourSuggestions(character: Character): Suggestion[] {
  if (!hasActiveEndeavours(character)) return [];

  const count = character.endeavours.reduce(
    (n, p) => n + p.entries.filter(e => e.status === 'pending' || e.status === 'in_progress').length,
    0,
  );

  return [
    {
      id: 'endeavour:active',
      title: `Resolve ${count} endeavour${count === 1 ? '' : 's'}`,
      rationale: 'You have downtime endeavours that are still pending or in progress.',
      category: 'endeavour',
      urgency: 'info',
      action: { kind: 'navigate', page: 'endeavours' },
    },
  ];
}
