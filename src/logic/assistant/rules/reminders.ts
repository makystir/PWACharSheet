import type { Character } from '../../../types/character';
import { deriveAllReminders, type CombatReminder } from '../../reminders';
import type { SuggestionContext } from '../types';
import type { Suggestion } from '../types';

/**
 * Surfaces the existing combat & psychology reminders (FR-8.5) by CONSUMING
 * `deriveAllReminders` from reminders.ts. The reminder module is never forked
 * or modified: this adapter only maps each CombatReminder to a Suggestion,
 * carrying the reminder's `description` as the rationale and its `citation`
 * VERBATIM (Core p.NNN strings authored in reminders.ts). No mechanic is
 * re-authored here.
 */
function reminderToSuggestion(r: CombatReminder): Suggestion {
  return {
    id: `reminder:${r.id}`, // namespaced so it can't collide
    title: r.label,
    rationale: r.description, // reminder prose (verbatim)
    category: 'combat',
    urgency: 'critical',
    action: r.test
      ? { kind: 'roll', test: r.test } // REUSES the reminder test shape (FR-6.4)
      : { kind: 'navigate', page: 'combat' }, // informational reminders -> go to combat
    citation: r.citation, // carried as DATA, verbatim (FR-10.3)
  };
}

export function reminderSuggestions(character: Character, _ctx: SuggestionContext): Suggestion[] {
  return deriveAllReminders({
    conditions: character.conditions,
    psychologyTraits: character.psychologyTraits ?? [],
    psychologyEnabled: character.houseRules?.usePsychologyTracker ?? false,
  }).map(reminderToSuggestion);
}
