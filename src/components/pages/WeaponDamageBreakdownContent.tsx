import styles from './WeaponDamageBreakdownContent.module.css';

export interface WeaponDamageBreakdownContentProps {
  /** The numeric damage total from calcWeaponDamage, or null when not derivable. */
  num: number | null;
  /** The space-joined component breakdown string from calcWeaponDamage. */
  breakdown: string;
  /** The weapon's raw damage string, shown verbatim when num === null. */
  rawDamage: string;
}

/**
 * Tooltip body for a weapon's derived damage total.
 *
 * Renders the {num, breakdown} pair from weapons.ts calcWeaponDamage: the
 * breakdown is shown verbatim (the component composes the trailing `= {num}`;
 * calcWeaponDamage never emits it). When num === null the damage is not
 * derivable (empty / '—'), so the raw damage string is shown with no derived
 * arithmetic. Core p.149–151: weapon Damage = SB/½SB + flat + talent/rune bonuses.
 */
export function WeaponDamageBreakdownContent({
  num,
  breakdown,
  rawDamage,
}: WeaponDamageBreakdownContentProps) {
  if (num === null) {
    return (
      <div>
        <div className={styles.row}>
          <span className={styles.label}>Damage:</span>
          <span className={styles.value}>{rawDamage || '—'}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.formula}>
        {breakdown ? `${breakdown} = ${num}` : `${num}`}
      </div>
    </div>
  );
}
