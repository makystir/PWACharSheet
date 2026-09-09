import { useState, useCallback } from 'react';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import styles from './InstallPromptControl.module.css';

/**
 * PWA install affordances (spec: ux-audit-improvements, Req 6).
 *
 * Two surfaces share the `useInstallPrompt` hook:
 *  - `InstallPromptControl`: an explicit install button rendered inside Settings.
 *    It renders nothing when the app cannot be installed (unsupported browser or
 *    already installed) so Settings never shows a dead control (Req 6.2, 6.5, 6.6).
 *  - `InstallHintBanner`: a subtle, one-time dismissible hint mounted in the app
 *    shell (outside Settings) that points users at the install option. Its
 *    dismissal is persisted in localStorage so it is shown at most once
 *    (Req 6.3, 6.6, 6.7).
 */

const HINT_DISMISSED_KEY = 'wfrp-install-hint-dismissed';

function isHintDismissed(): boolean {
  try {
    return localStorage.getItem(HINT_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function persistHintDismissal(): void {
  try {
    localStorage.setItem(HINT_DISMISSED_KEY, 'true');
  } catch {
    // Graceful fallback — localStorage unavailable or quota exceeded.
  }
}

/**
 * Explicit install button for the Settings page. Hidden entirely when the app
 * is not installable (Req 6.2, 6.5, 6.6).
 */
export function InstallPromptControl() {
  const { canInstall, promptInstall } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <button
      type="button"
      className={styles.installBtn}
      onClick={() => { void promptInstall(); }}
    >
      <Download size={16} aria-hidden="true" />
      <span>Install App</span>
    </button>
  );
}

/**
 * One-time, dismissible hint shown outside Settings when the app is installable
 * and the hint has not been dismissed before. Activating it triggers the browser
 * install prompt; dismissing it persists so it never returns (Req 6.3, 6.7).
 */
export function InstallHintBanner() {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => isHintDismissed());

  const dismiss = useCallback(() => {
    persistHintDismissal();
    setDismissed(true);
  }, []);

  const install = useCallback(() => {
    void promptInstall();
    // Once the user has acted on the prompt, the hint has served its purpose.
    persistHintDismissal();
    setDismissed(true);
  }, [promptInstall]);

  // Only ever shown when installable and not previously dismissed (Req 6.3, 6.6).
  if (!canInstall || dismissed) return null;

  return (
    <div className={styles.hint} role="status" aria-live="polite">
      <span className={styles.hintMessage}>
        Install this app for quick offline access.
      </span>
      <div className={styles.hintActions}>
        <button type="button" className={styles.hintInstallBtn} onClick={install}>
          <Download size={16} aria-hidden="true" />
          <span>Install</span>
        </button>
        <button
          type="button"
          className={styles.hintDismissBtn}
          onClick={dismiss}
          aria-label="Dismiss install hint"
          title="Dismiss"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
