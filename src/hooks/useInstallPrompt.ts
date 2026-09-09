import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * The `beforeinstallprompt` event, which is not part of the standard DOM lib
 * typings. Only Chromium-based browsers dispatch it.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

/**
 * Detect whether the app is already running as an installed PWA.
 * Uses `display-mode: standalone` (Chromium/most browsers) and the
 * non-standard `navigator.standalone` (iOS Safari). Requirement 6.6.
 */
function isRunningInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
  } catch {
    // matchMedia unavailable or threw — fall through to navigator check
  }
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { standalone?: boolean }) : undefined;
  return nav?.standalone === true;
}

/**
 * Hook that captures the browser's PWA install-availability event and exposes
 * an in-app install affordance.
 *
 * - Listens for `beforeinstallprompt`, calls `preventDefault()`, and stashes the
 *   event so we can trigger the prompt on demand (Requirement 6.1).
 * - `canInstall` is true only when the event has been captured AND the app is not
 *   already installed. Environments without `beforeinstallprompt` (e.g. Firefox,
 *   iOS Safari) simply leave `canInstall` false with no errors (Requirements 6.1, 6.5, 6.6).
 * - `promptInstall()` invokes the stashed browser prompt (Requirement 6.4). After the
 *   prompt resolves the event is single-use, so it is cleared and `canInstall` returns to false.
 * - Cleans up its event listeners on unmount.
 */
export function useInstallPrompt(): {
  canInstall: boolean;
  promptInstall: () => Promise<void>;
} {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the browser's default mini-infobar / automatic prompt so we can
      // surface our own affordance instead.
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      // Only offer installation if the app isn't already installed.
      setCanInstall(!isRunningInstalled());
    };

    const handleAppInstalled = () => {
      // Once installed, drop the stashed event and hide the affordance.
      deferredPromptRef.current = null;
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const deferredPrompt = deferredPromptRef.current;
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      // The captured event can only be used once; discard it regardless of outcome.
      await deferredPrompt.userChoice;
    } catch {
      // A failed/aborted prompt is non-fatal; there is no error surface to raise.
    } finally {
      deferredPromptRef.current = null;
      setCanInstall(false);
    }
  }, []);

  return { canInstall, promptInstall };
}
