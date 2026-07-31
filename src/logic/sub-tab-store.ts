/**
 * Persistence for last-selected sub-tab per page.
 * Uses localStorage to remember which sub-tab was active on each page.
 */

const KEY_PREFIX = 'lastSubTab:';

/**
 * Save the last-selected sub-tab for a given page.
 */
export function saveLastSubTab(pageKey: string, tabId: string): void {
  try {
    localStorage.setItem(`${KEY_PREFIX}${pageKey}`, tabId);
  } catch {
    // Silently ignore storage errors
  }
}

/**
 * Load the last-selected sub-tab for a given page.
 * Returns null if nothing stored or value is invalid.
 */
export function loadLastSubTab(pageKey: string): string | null {
  try {
    const value = localStorage.getItem(`${KEY_PREFIX}${pageKey}`);
    if (value && typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}
