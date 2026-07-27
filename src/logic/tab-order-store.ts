/**
 * Tab order persistence and reconciliation for reorderable sub-tabs.
 * Pure utility module — no React dependencies.
 * localStorage key format: tabOrder:<pageKey>
 */

const KEY_PREFIX = 'tabOrder:';

/**
 * Build the localStorage key for a given page key.
 */
function storageKey(pageKey: string): string {
  return `${KEY_PREFIX}${pageKey}`;
}

/**
 * Validate a raw localStorage value. Returns parsed string array or null.
 * Returns null if the value is not valid JSON, not an array, or contains
 * non-string or empty elements.
 */
export function validateStoredValue(raw: unknown): string[] | null {
  if (typeof raw !== 'string') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;

  for (const item of parsed) {
    if (typeof item !== 'string' || item.trim() === '') return null;
  }

  return parsed as string[];
}

/**
 * Read stored tab order for a page, returning null if absent or invalid.
 */
export function loadTabOrder(pageKey: string): string[] | null {
  try {
    const raw = localStorage.getItem(storageKey(pageKey));
    if (raw === null) return null;
    return validateStoredValue(raw);
  } catch {
    return null;
  }
}

/**
 * Write tab order to localStorage. Returns false if write fails.
 */
export function saveTabOrder(pageKey: string, order: string[]): boolean {
  try {
    localStorage.setItem(storageKey(pageKey), JSON.stringify(order));
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove stored tab order for a page (reset). Silently catches errors.
 */
export function removeTabOrder(pageKey: string): void {
  try {
    localStorage.removeItem(storageKey(pageKey));
  } catch {
    // Silently ignore removal failures
  }
}

/**
 * Reconcile a stored order against the current default tabs.
 * - Deduplicates stored (keeps first occurrence)
 * - Removes IDs not in defaults
 * - Appends new IDs (in defaults but not stored) in their default relative order
 * Returns the reconciled order.
 */
export function reconcileTabOrder(stored: string[], defaults: string[]): string[] {
  // 1. Deduplicate stored, keeping first occurrence
  const seen = new Set<string>();
  const deduplicated: string[] = [];
  for (const id of stored) {
    if (!seen.has(id)) {
      seen.add(id);
      deduplicated.push(id);
    }
  }

  // 2. Filter to only IDs present in defaults
  const defaultSet = new Set(defaults);
  const filtered = deduplicated.filter(id => defaultSet.has(id));

  // 3. Compute new IDs (in defaults but not in filtered), preserving default relative order
  const filteredSet = new Set(filtered);
  const newIds = defaults.filter(id => !filteredSet.has(id));

  // 4. Concatenate filtered stored + new IDs
  return [...filtered, ...newIds];
}
