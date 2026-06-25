/**
 * Panel state persistence for collapsible combat page sections.
 * Each character has independent panel collapsed/expanded states.
 * localStorage key format: wfrp-panelState-{charId}
 */

const KEY_PREFIX = 'wfrp-panelState-';

/**
 * Build the localStorage key for a given character ID.
 */
function storageKey(charId: string): string {
  return `${KEY_PREFIX}${charId}`;
}

/**
 * Save panel collapsed/expanded states for a character.
 * Silently swallows errors if localStorage is unavailable or quota is exceeded.
 */
export function savePanelState(charId: string, states: Record<string, boolean>): void {
  try {
    localStorage.setItem(storageKey(charId), JSON.stringify(states));
  } catch {
    // Write failures are silently swallowed
  }
}

/**
 * Load panel collapsed/expanded states for a character.
 * Returns an empty object if no saved state exists or if localStorage is unavailable.
 */
export function loadPanelState(charId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(storageKey(charId));
    if (raw === null) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, boolean>;
    }
    return {};
  } catch {
    // Read failures return empty object
    return {};
  }
}
