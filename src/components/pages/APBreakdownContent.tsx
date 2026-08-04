import type { APBreakdown } from '../../logic/breakdown-helpers';
import styles from './APBreakdownContent.module.css';

export type APBreakdownContentProps = APBreakdown;

export function APBreakdownContent({
  items,
  total,
}: APBreakdownContentProps) {
  return (
    <div>
      {items.length === 0 ? (
        <div className={styles.emptyMessage}>No armour covers this location</div>
      ) : (
        items.map((item, index) => (
          <div key={index} className={styles.row}>
            <span className={styles.label}>{item.name}:</span>
            <span className={styles.value}>{item.ap}</span>
          </div>
        ))
      )}
      <hr className={styles.separator} />
      <div className={styles.totalRow}>
        <span>Total:</span>
        <span>{total}</span>
      </div>
    </div>
  );
}
