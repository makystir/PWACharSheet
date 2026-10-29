import styles from '../SettingsPage.module.css';
import type { OptionalMechanic } from './optionalMechanics';

/**
 * Presentational toggle-row for a single Optional Mechanic. Renders exactly the
 * markup the Settings page used to hand-write per toggle (same CSS-module
 * classes, muted-when-off description, ON-only "Find it on:" row, ON/OFF button
 * text). Stateless and prop-driven: the parent owns `character`/`update` and
 * passes the current value plus an `onToggle` callback.
 *
 * It imports the SAME `SettingsPage.module.css` so the hashed class names match
 * the rest of the House Rules section byte-for-byte.
 */

interface OptionalMechanicToggleProps {
  entry: OptionalMechanic;
  value: boolean;
  onToggle: () => void;
}

export function OptionalMechanicToggle({ entry, value, onToggle }: OptionalMechanicToggleProps) {
  return (
    <div className={styles.ruleItem}>
      <div className={styles.toggleRow}>
        <div className={styles.toggleInfo}>
          <div className={styles.ruleLabel}>{entry.label}</div>
          <div
            className={styles.ruleDesc}
            style={!value ? { color: 'var(--text-muted)' } : undefined}
          >
            {entry.description}
          </div>
          {value && <div className={styles.ruleLocation}>Find it on: {entry.location}</div>}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={value ? styles.toggleBtnOn : styles.toggleBtnOff}
        >
          {value ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}
