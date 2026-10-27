import styles from '../CastResultDisplay.module.css';

export type CriticalChoice = 'critical_wound' | 'total_power' | 'unstoppable_force';

interface CriticalChoiceButtonsProps {
  onCriticalChoice?: (choice: CriticalChoice) => void;
}

/**
 * Presentational cluster for the three Critical-Cast choices.
 * Winds of Magic §"Critical Casting": a Critical on a casting test lets the
 * caster pick Critical Wound, Total Power, or Unstoppable Force (see WoM p.23).
 *
 * Extracted verbatim from CastResultDisplay so both the result display and the
 * guided-cast overlay wire the SAME onCriticalChoice handler (no handler drift).
 */
export function CriticalChoiceButtons({ onCriticalChoice }: CriticalChoiceButtonsProps) {
  return (
    <div className={styles.choiceBtnRow}>
      <button
        type="button"
        className={styles.choiceBtn}
        onClick={() => onCriticalChoice?.('critical_wound')}
      >
        Critical Wound
      </button>
      <button
        type="button"
        className={styles.choiceBtn}
        onClick={() => onCriticalChoice?.('total_power')}
      >
        Total Power
      </button>
      <button
        type="button"
        className={styles.choiceBtn}
        onClick={() => onCriticalChoice?.('unstoppable_force')}
      >
        Unstoppable Force
      </button>
    </div>
  );
}
