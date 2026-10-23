import type { WoundMaxResult } from '../../logic/calculators';
import styles from './WoundsBreakdownContent.module.css';

export interface WoundsBreakdownContentProps {
  /** The wound maximum breakdown produced by deriveSheetTotals (never recomputed here). */
  wounds: WoundMaxResult;
}

/**
 * Tooltip body for the wound maximum total.
 *
 * Renders a GIVEN WoundMaxResult (from calculators.ts calculateWoundsCore via
 * deriveSheetTotals) — it does NOT re-call computeWoundMaximum. The lines map
 * directly onto the stored breakdown fields (sb / tb / wpb / hardy / total)
 * so the displayed sum always matches the applied total.
 *
 * Core p.36–37: Wounds = SB + 2×TB + WPB (×species multiplier), + Hardy×TB.
 */
export function WoundsBreakdownContent({ wounds }: WoundsBreakdownContentProps) {
  const { sb, tb, wpb, hardy, total } = wounds;
  return (
    <div>
      <div className={styles.row}>
        <span className={styles.label}>SB:</span>
        <span className={styles.value}>{sb}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>TB×2:</span>
        <span className={styles.value}>{tb}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>WPB:</span>
        <span className={styles.value}>{wpb}</span>
      </div>
      {hardy > 0 && (
        <div className={styles.row}>
          <span className={styles.label}>Hardy:</span>
          <span className={styles.value}>+{hardy}</span>
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
