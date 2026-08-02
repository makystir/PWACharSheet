import type { CharacteristicKey } from '../../types/character';
import styles from './CharBreakdownContent.module.css';

export interface CharBreakdownContentProps {
  charKey: CharacteristicKey;
  initial: number;
  advances: number;
  talentBonus: number;
  current: number;
  contributingTalentName: string | null;
}

export function CharBreakdownContent({
  initial,
  advances,
  talentBonus,
  current,
  contributingTalentName,
}: CharBreakdownContentProps) {
  return (
    <div>
      <div className={styles.row}>
        <span className={styles.label}>Initial:</span>
        <span className={styles.value}>{initial}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Advances:</span>
        <span className={styles.value}>{advances}</span>
      </div>
      {talentBonus > 0 && (
        <div className={styles.row}>
          <span className={styles.label}>Talent Bonus:</span>
          <span className={styles.value}>+{talentBonus}{contributingTalentName ? ` (${contributingTalentName})` : ''}</span>
        </div>
      )}
      <hr className={styles.separator} />
      <div className={styles.totalRow}>
        <span>Total:</span>
        <span>{current}</span>
      </div>
    </div>
  );
}
