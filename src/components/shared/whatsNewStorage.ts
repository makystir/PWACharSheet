const STORAGE_KEY = 'ack-version';

/** Check whether the panel should be shown (version not yet acknowledged). */
export function shouldShowWhatsNew(currentVersion: string): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== currentVersion;
  } catch {
    // localStorage unavailable (private browsing) — show every time
    return true;
  }
}

/** Acknowledge the current version so the panel won't show again until next update. */
export function acknowledgeVersion(version: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, version);
  } catch {
    // localStorage unavailable (private browsing) — silently fail
  }
}
