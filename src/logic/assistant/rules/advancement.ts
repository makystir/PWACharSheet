import type { Character } from '../../../types/character';
import { isReadyToAdvance } from '../../advancement';
import type { Suggestion } from '../types';

/**
 * Advancement-readiness suggestions (FR-8.1). Reuses the extracted
 * `isReadyToAdvance` predicate (single source of truth with AdvancementPage and
 * the nav badge) and `character.xpCur` — it never recomputes the mechanic.
 *
 * Core p.48 (Advancing a Career): a character who meets their current level's
 * requirements and has XP to spend may advance. The `xpCur > 0` gate mirrors
 * `showAdvancementBadge = xpCur > 0`.
 */
export function advancementSuggestions(character: Character): Suggestion[] { // Core p.48
  const xpCur = character.xpCur;
  if (xpCur <= 0) return []; // mirrors showAdvancementBadge (xpCur > 0)

  if (isReadyToAdvance(character)) {
    return [
      {
        id: 'advancement:ready',
        title: 'Ready to advance your career',
        rationale: 'You meet the requirements and have XP to spend.',
        category: 'advancement',
        urgency: 'recommended',
        action: { kind: 'navigate', page: 'advancement' },
        citation: 'Core p.48: Advancing a Career',
      },
    ];
  }

  return [
    {
      id: 'advancement:unspent-xp',
      title: `You have ${xpCur} unspent XP`,
      rationale: 'Spend it on characteristics, skills, or talents.',
      category: 'advancement',
      urgency: 'info',
      action: { kind: 'navigate', page: 'advancement' },
      citation: 'Core p.48: Advancing a Career',
      totals: [
        {
          label: 'XP',
          display: `${xpCur}`,
          lines: [`Unspent ${xpCur}`],
        },
      ],
    },
  ];
}
