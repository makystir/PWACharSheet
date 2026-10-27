import type { SpellItem } from '../../../types/character';
import { isPettySpell } from '../../../logic/spell-casting';
import styles from './guidedCastSteps.module.css';

export interface RouteStepProps {
  spell: SpellItem;
  /** Picks Cast: host dispatches chooseRoute('cast'), advances to 'resolve', opens the cast RollDialog. */
  onCast: () => void;
  /** Picks Channel: host dispatches chooseRoute('channel') and opens the channel RollDialog. */
  onChannel: () => void;
}

/**
 * Step 2 — cast now or channel first. The Channel option is hidden for Petty
 * spells (isPettySpell): Petty Magic has a Casting Number of 0 and there is
 * nothing to channel. Presentational only — the actual route dispatch + dialog
 * open are owned by the host (GuidedCastPanel), which keeps the reducer and the
 * RollDialog the single sources of truth.
 *
 * // Core p.234 (Casting Test vs CN); Core p.237 + WoM "Channelling Test" (channel to reduce CN).
 */
export function RouteStep({ spell, onCast, onChannel }: RouteStepProps) {
  const petty = isPettySpell(spell);

  return (
    <div className={styles.stepBody}>
      <div className={styles.actionRow}>
        <button type="button" className={styles.actionBtn} onClick={onCast}>
          Cast now
        </button>
        {!petty && (
          <button type="button" className={styles.secondaryBtn} onClick={onChannel}>
            Channel first
          </button>
        )}
      </div>
      {petty && (
        <p className={styles.note}>
          {/* App convention derived from isPettySpell: Petty spells (CN 0) cannot be channelled. */}
          This is a Petty spell (CN 0) — there is nothing to channel, so cast it directly.
        </p>
      )}
    </div>
  );
}
