import type { EncumbranceLevel } from '../../logic/encumbrance';
import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  current: number;
  max: number;
  level: EncumbranceLevel;
  label: string;
  ariaLabel: string;
}

const fillClassByLevel: Record<EncumbranceLevel, string> = {
  neutral: styles.fillNeutral,
  warning: styles.fillWarning,
  danger: styles.fillDanger,
  critical: styles.fillCritical,
};

export function ProgressBar({ current, max, level, label, ariaLabel }: ProgressBarProps) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 100;

  return (
    <div className={styles.container}>
      <div className={styles.labelRow}>
        <span>{label}</span>
        {level === 'critical' && (
          <span className={styles.overEncumbered}>Over-encumbered</span>
        )}
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={fillClassByLevel[level]}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
