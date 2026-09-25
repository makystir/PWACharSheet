const STORAGE_PREFIX = 'wfrp-hint-dismissed-';
const AUTO_SUPPRESS_THRESHOLD = 3;

function getDismissCount(concept: string): number {
  try {
    const val = localStorage.getItem(`${STORAGE_PREFIX}${concept}`);
    if (val === 'true') return AUTO_SUPPRESS_THRESHOLD; // migrate old boolean format
    const count = parseInt(val ?? '0', 10);
    return Number.isFinite(count) ? count : 0;
  } catch {
    return 0;
  }
}

export function incrementDismissCount(concept: string): void {
  try {
    const current = getDismissCount(concept);
    localStorage.setItem(`${STORAGE_PREFIX}${concept}`, String(current + 1));
  } catch {
    // Graceful fallback — localStorage unavailable or quota exceeded
  }
}

/** Returns true if the tooltip has been dismissed >= AUTO_SUPPRESS_THRESHOLD times */
export function isSuppressed(concept: string): boolean {
  return getDismissCount(concept) >= AUTO_SUPPRESS_THRESHOLD;
}
