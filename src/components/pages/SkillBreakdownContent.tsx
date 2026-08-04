import type { SkillBreakdown } from '../../logic/breakdown-helpers';
import styles from './SkillBreakdownContent.module.css';

export type SkillBreakdownContentProps = SkillBreakdown;

export function SkillBreakdownContent({
  charName,
  charValue,
  advances,
  total,
}: SkillBreakdownContentProps) {
  return (
    <div>
      <div className={styles.row}>
        <span className={styles.label}>{charName}:</span>
        <span className={styles.value}>{charValue}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Advances:</span>
        <span className={styles.value}>{advances}</span>
      </div>
      <hr className={styles.separator} />
      <div className={styles.totalRow}>
        <span>Total:</span>
        <span>{total}</span>
      </div>
    </div>
  );
}
