import styles from './WhatsNewPanel.module.css';
import { acknowledgeVersion } from './whatsNewStorage';

interface WhatsNewPanelProps {
  version: string;
  entries: { title: string; description: string }[];
  onDismiss: () => void;
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
