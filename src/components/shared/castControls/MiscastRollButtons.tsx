import styles from '../CastResultDisplay.module.css';

interface MiscastRollButtonsProps {
  isFumbledCast: boolean;
  triggerMinorMiscast: boolean;
  onMiscastRoll?: (table: 'minor' | 'major') => void;
}

/**
 * Presentational cluster for the two routes into a Minor Miscast:
 *  - a Fumbled casting test (Core p.234-235 / WoM §"Fumbled Casting")
 *  - a Critical-triggered Minor Miscast that is NOT also a fumble
 *    (Winds of Magic §"Critical Casting").
 *
 * Extracted verbatim from CastResultDisplay (same separators, labels, and the
 * onMiscastRoll('minor') handler) so both hosts share one wiring — no drift.
 */
export function MiscastRollButtons({
  isFumbledCast,
  triggerMinorMiscast,
  onMiscastRoll,
}: MiscastRollButtonsProps) {
  return (
    <>
      {/* Fumble section */}
      {isFumbledCast && (
        <>
          <div className={styles.separator} />
          <div className={styles.section}>
            <div className={styles.fumbleLabel}>Fumble</div>
            <button
              type="button"
              className={styles.miscastBtn}
              onClick={() => onMiscastRoll?.('minor')}
            >
              Roll Minor Miscast
            </button>
          </div>
        </>
      )}

      {/* Minor Miscast prompt (from critical, not fumble) */}
      {triggerMinorMiscast && !isFumbledCast && (
        <>
          <div className={styles.separator} />
          <div className={styles.section}>
            <div className={styles.minorMiscastLabel}>
              Minor Miscast triggered
            </div>
            <button
              type="button"
              className={styles.miscastBtn}
              onClick={() => onMiscastRoll?.('minor')}
            >
              Roll Minor Miscast
            </button>
          </div>
        </>
      )}
    </>
  );
}
