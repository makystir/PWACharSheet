import type { Character } from '../../types/character';
import type { Suggestion, SuggestionContext, SuggestionSource } from './types';
import { advancementSuggestions } from './rules/advancement';
import { endeavourSuggestions } from './rules/endeavours';
import { encumbranceSuggestions } from './rules/encumbrance';
import { corruptionSuggestions } from './rules/corruption';
import { reminderSuggestions } from './rules/reminders';
import { fortuneResolveSuggestions } from './rules/fortune-resolve';
import { diseaseSuggestions } from './rules/diseases';
import { criticalWoundSuggestions } from './rules/critical-wounds';
import { learnableSuggestions } from './rules/learnable';
import { downtimeSuggestions } from './rules/downtime';
import { downtimeRecommendationSuggestions } from './rules/downtime-recommendations';
import { fileBackupSuggestions } from './rules/file-backup';
import { orderSuggestions } from './ordering';

/**
 * Pure, deterministic, side-effect-free engine entry point (FR-5.1). Composes
 * the rule modules then orders the result. It never mutates the character,
 * writes storage, navigates, opens a dialog, or touches the network.
 */
export function getSuggestions(
  character: Character | undefined,
  context: SuggestionContext,
): Suggestion[] {
  if (!character) return []; // NFR-6: absent sheet -> [], never throws
  const raw = [
    ...advancementSuggestions(character),
    ...endeavourSuggestions(character),
    ...encumbranceSuggestions(character),
    ...corruptionSuggestions(character),
    ...reminderSuggestions(character, context),
    // Catalog expansion (five new modules). Single-arg modules are never
    // combat-suppressed (ordering governs placement); the two context-sensitive
    // modules return [] in combat.
    ...fortuneResolveSuggestions(character),
    ...diseaseSuggestions(character),
    ...criticalWoundSuggestions(character),
    ...learnableSuggestions(character, context), // suppressed in combat
    ...downtimeSuggestions(character, context), // out-of-combat only
    ...downtimeRecommendationSuggestions(character, context), // out-of-combat only; situation-aware
    // File-backup nudge: now/lastBackupAt come from the shell-built context so
    // the engine performs no storage read / Date.now() at eval time (Finding 4).
    ...fileBackupSuggestions(character, context, context.now, context.lastBackupAt ?? null),
  ];
  return orderSuggestions(raw, context); // FR-3.4 deterministic
}

/**
 * The deterministic default source — the permanent offline fallback (FR-7.3).
 * Always synchronous; sync callers narrow the `SuggestionSource` union with an
 * `Array.isArray` guard, whose sync branch is the only path taken today.
 */
export const deterministicSuggestionSource: SuggestionSource = {
  getSuggestions(character, context): Suggestion[] {
    return getSuggestions(character, context);
  },
};
