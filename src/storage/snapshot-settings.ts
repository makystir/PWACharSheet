/**
 * Auto-backup enable/disable toggle persistence (auto-backup design §5/§7).
 *
 * A small localStorage flag mirroring the project's existing settings
 * persistence. Default is ON: the flag is absent/unset for new users and
 * auto-backup runs. Only the explicit string `'false'` disables it; an
 * unreadable store (private mode) degrades to enabled. Uses the shared
 * `local-storage.ts` wrappers so a private-mode failure degrades silently.
 *
 * Reliability feature, no WFRP game mechanics — no rulebook citation applies.
 */

import { getItem, setItem } from './local-storage';

export const AUTO_BACKUP_ENABLED_KEY = 'wfrp-auto-backup-enabled';

/** True unless the flag is explicitly set to `'false'`. Default ON. */
export function isAutoBackupEnabled(): boolean {
  return getItem(AUTO_BACKUP_ENABLED_KEY) !== 'false';
}

/** Persist the toggle. Write failures (private mode) degrade silently. */
export function setAutoBackupEnabled(enabled: boolean): void {
  setItem(AUTO_BACKUP_ENABLED_KEY, enabled ? 'true' : 'false');
}
