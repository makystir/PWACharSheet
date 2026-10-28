import type { Character } from '../../../types/character';
import type { Suggestion, SuggestionContext } from '../types';
import { getBackupReminder } from '../../../storage/backup-reminder';

/**
 * File-backup nudge (auto-backup design §6). When it has been a while since the
 * user made a FILE backup, surface a single Assistant suggestion whose one-tap
 * action triggers the EXISTING bulk file export.
 *
 * REUSES `backup-reminder.ts`'s time-tracking (`getBackupReminder`,
 * `BACKUP_STALE_DAYS`) — it does not fork or add a parallel timer. `now` and
 * `lastBackupAt` are threaded through `SuggestionContext` by the shell, so the
 * pure engine performs no storage read / `Date.now()` at eval time (Finding 4).
 * The function-level defaults exist ONLY for direct unit tests; the engine
 * always passes the `ctx.*` values.
 *
 * Reliability nudge, no WFRP game mechanic — no rulebook citation applies.
 */
export function fileBackupSuggestions(
  _character: Character,
  ctx: SuggestionContext,
  now: number = ctx.now ?? Date.now(),
  lastBackupAt: number | null = ctx.lastBackupAt ?? null,
): Suggestion[] {
  // Not during combat — avoid competing with combat suggestions / no spam.
  if (ctx.inCombat) return [];

  const reminder = getBackupReminder(lastBackupAt, now);
  if (!reminder.show) return []; // recent file backup ⇒ silent

  return [
    {
      id: 'backup:file-stale',
      title: 'Back up your characters to a file',
      rationale: reminder.never
        ? 'You have no saved file backup yet. Characters live in this browser only.'
        : `It has been ${reminder.daysSince} days since your last file backup.`,
      category: 'resource',
      urgency: 'info',
      action: { kind: 'backup-file' },
    },
  ];
}
