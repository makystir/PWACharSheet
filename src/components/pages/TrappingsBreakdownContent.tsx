import type { TrappingEncBreakdown } from '../../logic/breakdown-helpers';
import styles from './TrappingsBreakdownContent.module.css';

export type TrappingsBreakdownContentProps = TrappingEncBreakdown;

/**
 * Renders the carried trappings encumbrance breakdown.
 * Each line shows the trapping name, a worn marker when worn, its base Enc,
 * quantity, and the effective (worn-reduced, quantity-multiplied) value.
 * Zero-value lines are shown (calculated-totals steering guideline 4).
 * Core p.293 "Worn Items": worn items have per-item Enc reduced by 1 (min 0).
 */
export function TrappingsBreakdownContent({ lines, total }: TrappingsBreakdownContentProps) {
  if (lines.length === 0) {
    return (
      <div>
        <span className={styles.emptyMessage}>No trappings carried</span>
      </div>
    );
  }

  return (
    <div>
      {lines.map((line, i) => (
        <div key={i} className={styles.row}>
          <span className={styles.label}>
            {line.name}
            {line.worn && <span className={styles.wornMarker}> 👕 worn</span>}
            {line.inBackpackIgnored && <span className={styles.wornMarker}> 🎒 in backpack</span>}
            <span className={styles.detail}>
              {' '}
              (Enc {line.baseEnc} × {line.quantity})
            </span>
          </span>
          <span className={styles.value}>{line.effective}</span>
        </div>
      ))}
      <hr className={styles.separator} />
      <div className={styles.totalRow}>
        <span>Total:</span>
        <span>{total}</span>
      </div>
    </div>
  );
}
