import type { APBreakdown } from '../../logic/breakdown-helpers';
import styles from './APBreakdownContent.module.css';

export type APBreakdownContentProps = APBreakdown;

export function APBreakdownContent({
  items,
  total,
}: APBreakdownContentProps) {
  // Per WFRP4e (Core p.293, Flexible), only the highest non-flexible layer and
  // the highest flexible layer combine, so some covering pieces may not count.
  const hasExcluded = items.some((item) => !item.contributes);

  return (
    <div>
      {items.length === 0 ? (
        <div className={styles.emptyMessage}>No armour covers this location</div>
      ) : (
        items.map((item, index) => (
          <div
            key={index}
            className={item.contributes ? styles.row : `${styles.row} ${styles.rowExcluded}`}
          >
            <span className={styles.label}>
              {item.name}
              {item.flexible ? ' (Flexible)' : ''}:
            </span>
            <span className={styles.value}>{item.ap}</span>
          </div>
        ))
      )}
      {hasExcluded && (
        <div className={styles.layerNote}>
          Only the highest non-flexible and highest flexible layer combine.
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
