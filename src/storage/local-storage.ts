/**
 * Low-level localStorage adapter with error handling.
 * Wraps all operations in try/catch to handle private browsing,
 * unavailable localStorage, and QuotaExceededError gracefully.
 */

export function getItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.error(`localStorage quota exceeded when writing key "${key}".`);
    }
    // In private browsing or unavailable localStorage, silently no-op
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // no-op if localStorage unavailable
  }
}
