import styles from './MoveBreakdownContent.module.css';

export interface MoveBreakdownContentProps {
  /** Stored Movement value (M). */
  m: number;
  /** Stored Walk value (W). */
  w: number;
  /** Stored Run value (R). */
  r: number;
}

/**
 * Tooltip body for movement (Move / Walk / Run).
 *
 * Shows the stored move.{m,w,r} verbatim — it never overrides the recorded
 * values. The standard-derivation labels are source-stating: Walk is labelled
 * `= 2×M` ONLY when w === 2×m, and Run `= 4×M` ONLY when r === 4×m
 * (Core p.164: Walk = 2×Movement, Run = 4×Movement). When a value departs from
 * the standard derivation it is shown as recorded on the sheet with no formula,
 * so a GM-adjusted or house-ruled value is reported honestly.
 */
export function MoveBreakdownContent({ m, w, r }: MoveBreakdownContentProps) {
  const walkIsStandard = w === 2 * m;
  const runIsStandard = r === 4 * m;
  return (
    <div>
      <div className={styles.row}>
        <span className={styles.label}>Move:</span>
        <span className={styles.value}>{m}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>
          {walkIsStandard ? `Walk = 2×M (${w})` : `Walk (${w})`}
        </span>
        {!walkIsStandard && <span className={styles.note}>as recorded on the sheet</span>}
      </div>
      <div className={styles.row}>
        <span className={styles.label}>
          {runIsStandard ? `Run = 4×M (${r})` : `Run (${r})`}
        </span>
        {!runIsStandard && <span className={styles.note}>as recorded on the sheet</span>}
      </div>
    </div>
  );
}
