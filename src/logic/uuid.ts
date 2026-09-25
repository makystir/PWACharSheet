/**
 * Generate a UUID.
 *
 * Uses the platform `crypto.randomUUID()` when available, falling back to a
 * Math.random-based pseudo UUID v4 for environments without it. Single source of
 * truth for id generation across the app (rolls, event-log, endeavours, grudges,
 * character index, migration).
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
