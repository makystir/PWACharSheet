import type { EncumbranceBreakdown } from '../../logic/breakdown-helpers';
import styles from './EncumbranceBreakdownContent.module.css';

export type EncumbranceBreakdownContentProps = EncumbranceBreakdown;

export function EncumbranceBreakdownContent({
  sb,
  tb,
  strongBackLevel,
  sturdyLevel,
  total,
}: EncumbranceBreakdownContentProps) {
  return (
    <div>
      <div className={styles.row}>
        <span className={styles.label}>SB:</span>
        <span className={styles.value}>{sb}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>TB:</span>
        <span className={styles.value}>{tb}</span>
      </div>
      {strongBackLevel > 0 && (
        <div className={styles.row}>
          <span className={styles.label}>Strong Back:</span>
          <span className={styles.value}>+{strongBackLevel}</span>
        </div>
      )}
      {sturdyLevel > 0 && (
        <div className={styles.row}>
          <span className={styles.label}>Sturdy:</span>
          <span className={styles.value}>+{sturdyLevel * 2}</span>
        </div>
      )}
      <hr className={styles.separator} />
      <div className={styles.totalRow}>
        <span>Total:</span>
        <span>{total}</span>
      </div>
    </div>
  );
}
