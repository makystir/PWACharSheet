import type { APBreakdown } from '../../logic/breakdown-helpers';
import styles from './APBreakdownContent.module.css';

export type APBreakdownContentProps = APBreakdown;

export function APBreakdownContent({
  items,
  total,
}: APBreakdownContentProps) {
  // Armour combining follows Archives of the Empire III: only the pieces that
  // form the best legal stack (soft kit + base + overcoat/breastplate, or a
  // standalone plate piece) contribute. Non-contributing pieces are shown but
  // struck through.
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
            <span className={styles.label}>{item.name}:</span>
            <span className={styles.value}>{item.ap}</span>
          </div>
        ))
      )}
      {hasExcluded && (
        <div className={styles.layerNote}>
          Some pieces don't combine under these layering rules.
        </div>
      )}
      <hr className={styles.separator} />
      <div className={styles.totalRow}>
        <span>Total:</span>
        <span>{total}</span>
      </div>
      <div className={styles.rulesetNote}>Combining rules: Archives of the Empire III</div>
    </div>
  );
}
