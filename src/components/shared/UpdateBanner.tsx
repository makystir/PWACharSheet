import { useSWUpdate } from '../../hooks/useSWUpdate';
import styles from './UpdateBanner.module.css';

/**
 * Non-modal banner displayed at the bottom of the viewport when a new
 * service worker version is waiting to activate. Provides reload/dismiss
 * actions and surfaces error state with retry affordance.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 4.6
 */
export function UpdateBanner() {
  const { updateAvailable, applying, error, applyUpdate, dismiss } = useSWUpdate();

  if (!updateAvailable) return null;

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      {error ? (
        <>
          <span className={styles.error}>{error}</span>
          <div className={styles.actions}>
            <button
              className={styles.primaryBtn}
              onClick={applyUpdate}
              disabled={applying}
              type="button"
            >
              Try Again
            </button>
            <button
              className={styles.secondaryBtn}
              onClick={dismiss}
              disabled={applying}
              type="button"
            >
              Dismiss
            </button>
          </div>
        </>
      ) : (
        <>
          <span className={styles.message}>A new version is available</span>
          <div className={styles.actions}>
            <button
              className={styles.primaryBtn}
              onClick={applyUpdate}
              disabled={applying}
              type="button"
            >
              {applying ? 'Updating…' : 'Reload'}
            </button>
            <button
              className={styles.secondaryBtn}
              onClick={dismiss}
              disabled={applying}
              type="button"
            >
              Dismiss
            </button>
          </div>
        </>
      )}
    </div>
  );
}
