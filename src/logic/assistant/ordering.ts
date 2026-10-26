import type { Suggestion, SuggestionCategory, SuggestionContext, SuggestionUrgency } from './types';

/**
 * Deterministic ordering & grouping (FR-3).
 *
 * - In combat: group order combat, encumbrance, corruption, advancement,
 *   endeavour — combat-first (FR-3.2).
 * - Out of combat: group order advancement, endeavour, corruption, encumbrance,
 *   combat — progression-first (FR-3.3).
 *
 * Within a group, sort by urgency (critical < recommended < info) then by `id`
 * lexically. Because the sort key is total and the inputs are plain data,
 * identical `(raw, context)` always yield the same ordered list (FR-3.4).
 */
const IN_COMBAT_GROUP_ORDER: SuggestionCategory[] = [
  'combat',
  'encumbrance',
  'corruption',
  'advancement',
  'endeavour',
];

const OUT_OF_COMBAT_GROUP_ORDER: SuggestionCategory[] = [
  'advancement',
  'endeavour',
  'corruption',
  'encumbrance',
  'combat',
];

const URGENCY_RANK: Record<SuggestionUrgency, number> = {
  critical: 0,
  recommended: 1,
  info: 2,
};

export function orderSuggestions(raw: Suggestion[], context: SuggestionContext): Suggestion[] {
  const groupOrder = context.inCombat ? IN_COMBAT_GROUP_ORDER : OUT_OF_COMBAT_GROUP_ORDER;
  const groupRank = (category: SuggestionCategory): number => {
    const idx = groupOrder.indexOf(category);
    // Unknown categories sort after all known groups, still deterministically.
    return idx === -1 ? groupOrder.length : idx;
  };

  return [...raw].sort((a, b) => {
    const groupDelta = groupRank(a.category) - groupRank(b.category);
    if (groupDelta !== 0) return groupDelta;
    const urgencyDelta = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (urgencyDelta !== 0) return urgencyDelta;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
