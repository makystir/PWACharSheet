import type { CoinWeightBreakdown } from '../../logic/breakdown-helpers';
import styles from './CoinWeightBreakdownContent.module.css';

export type CoinWeightBreakdownContentProps = CoinWeightBreakdown;

export function CoinWeightBreakdownContent({
  gc,
  ss,
  d,
  total,
  isEmpty,
}: CoinWeightBreakdownContentProps) {
  if (isEmpty) {
    return (
      <div>
        <span className={styles.emptyMessage}>No coins carried</span>
      </div>
    );
  }

  const sum = gc + ss + d;

  return (
    <div>
      <div className={styles.row}>
        <span className={styles.label}>GC:</span>
        <span className={styles.value}>{gc}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>SS:</span>
        <span className={styles.value}>{ss}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>D:</span>
        <span className={styles.value}>{d}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Sum:</span>
        <span className={styles.value}>{sum}</span>
      </div>
      <div className={styles.dividerRow}>÷ 200</div>
      <hr className={styles.separator} />
      <div className={styles.totalRow}>
        <span>Weight:</span>
        <span>{total}</span>
      </div>
    </div>
  );
}
