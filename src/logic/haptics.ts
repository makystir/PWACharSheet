/**
 * Haptic feedback utility using the Web Vibration API.
 * Feature-detects navigator.vibrate and skips silently if unsupported.
 */

/** Trigger haptic feedback based on roll result type. */
export function triggerRollHaptic(isCritical: boolean, isFumble: boolean): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }

  if (isFumble) {
    // Fumble: 100ms vibration (overrides standard)
    navigator.vibrate(100);
  } else if (isCritical) {
    // Critical: double-pulse pattern [50ms vibrate, 30ms pause, 50ms vibrate]
    navigator.vibrate([50, 30, 50]);
  } else {
    // Standard roll: 50ms vibration
    navigator.vibrate(50);
  }
}
