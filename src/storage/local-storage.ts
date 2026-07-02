/**
 * Low-level localStorage adapter with error handling.
 * Wraps all operations in try/catch to handle private browsing,
 * unavailable localStorage, and QuotaExceededError gracefully.
 */

export type StorageWriteResult =
  | { ok: true }
  | { ok: false; reason: 'quota-exceeded' | 'unavailable' };

export type StorageErrorReason = 'quota-exceeded' | 'unavailable';
export type StorageErrorListener = (reason: StorageErrorReason) => void;

const listeners: Set<StorageErrorListener> = new Set();

/** Subscribe to storage write errors. Returns an unsubscribe function. */
export function onStorageError(listener: StorageErrorListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notifyListeners(reason: StorageErrorReason): void {
  listeners.forEach((fn) => fn(reason));
}

export function getItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string): StorageWriteResult {
  try {
    localStorage.setItem(key, value);
    return { ok: true };
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.error(`localStorage quota exceeded when writing key "${key}".`);
      notifyListeners('quota-exceeded');
      return { ok: false, reason: 'quota-exceeded' };
    }
    // In private browsing or unavailable localStorage
    notifyListeners('unavailable');
    return { ok: false, reason: 'unavailable' };
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // no-op if localStorage unavailable
  }
}
