import styles from './WhatsNewPanel.module.css';

interface WhatsNewPanelProps {
  version: string;
  entries: { title: string; description: string }[];
  onDismiss: () => void;
}

const STORAGE_KEY = 'ack-version';

/** Check whether the panel should be shown (version not yet acknowledged). */
export function shouldShowWhatsNew(currentVersion: string): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== currentVersion;
  } catch {
    // localStorage unavailable (private browsing) — show every time
    return true;
  }
}

/** Acknowledge the current version so the panel won't show again until next update. */
function acknowledgeVersion(version: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, version);
  } catch {
    // localStorage unavailable (private browsing) — silently fail
  }
}

export function WhatsNewPanel({ version, entries, onDismiss }: WhatsNewPanelProps) {
  const handleDismiss = () => {
    acknowledgeVersion(version);
    onDismiss();
  };

  return (
    <div className={styles.overlay} onClick={handleDismiss} role="dialog" aria-label="What's New">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            What&apos;s New
            <span className={styles.version}>v{version}</span>
          </h2>
          <button
            type="button"
            className={styles.dismissBtn}
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>

        <div className={styles.entries}>
          {entries.map((entry, index) => (
            <div key={index} className={styles.entry}>
              <h3 className={styles.entryTitle}>{entry.title}</h3>
              <p className={styles.entryDescription}>{entry.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
