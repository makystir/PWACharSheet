import type { CBBreakdown } from '../../logic/breakdown-helpers';
import styles from './CBBreakdownContent.module.css';

export type CBBreakdownContentProps = CBBreakdown;

export function CBBreakdownContent({
  currentValue,
  bonus,
}: CBBreakdownContentProps) {
  return (
    <div>
      <div className={styles.row}>
        <span className={styles.label}>Current:</span>
        <span className={styles.value}>{currentValue}</span>
      </div>
      <hr className={styles.separator} />
      <div className={styles.totalRow}>
        <span>CB:</span>
        <span>{bonus}</span>
      </div>
    </div>
  );
}
