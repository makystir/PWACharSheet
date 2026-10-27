import type { Character } from '../../../types/character';
import type { CastingResult, MiscastResult } from '../../../logic/spell-casting';
import { MiscastRollButtons } from '../castControls/MiscastRollButtons';
import { MiscastEscalation } from '../castControls/MiscastEscalation';
import styles from './guidedCastSteps.module.css';

export interface MiscastStepProps {
  character: Character;
  result: CastingResult;
  /** The panel's current miscastResult (null until the player rolls). */
  miscastResult: MiscastResult | null;
  /** Triggers the panel's existing Math.random() miscast roll (handleMiscastRoll). */
  onRollMiscast: (table: 'minor' | 'major') => void;
  /** Stores an acquired arcane mark on the character (panel handler). */
  onArcaneMarkAcquired: (mark: string) => void;
}

/**
 * Step 5 — resolve a triggered Miscast. The "why" is cited from the result
 * flags; the roll itself goes through the panel's EXISTING Math.random() miscast
 * handler (NOT the RollDialog — see design "Who rolls", OQ-6) via the extracted
 * MiscastRollButtons / MiscastEscalation so both hosts share one wiring.
 *
 * Reasons (Core p.234-235 unless noted):
 *  - Fumbled Cast  → Minor Miscast (Core p.234-235 / WoM "Fumbled Casting").
 *  - Critical Cast → Minor Miscast unless Instinctive Diction (WoM "Critical Casting").
 *  - Failed channelled cast → Minor Miscast (WoM "Channelling Test").
 */
export function MiscastStep({
  character,
  result,
  miscastResult,
  onRollMiscast,
  onArcaneMarkAcquired,
}: MiscastStepProps) {
  const why = result.isFumbledCast
    ? 'Fumbled Cast (double on a failed Casting Test) — roll a Minor Miscast.'
    : result.isCriticalCast
      ? 'Critical Cast (double on a successful Casting Test) — roll a Minor Miscast unless you have Instinctive Diction.'
      : 'Failed channelled cast — the stored power is lost and you must roll a Minor Miscast.';

  const citation = result.isFumbledCast
    ? 'Core p.234-235 / WoM "Fumbled Casting"'
    : result.isCriticalCast
      ? 'Core p.234-235 / WoM "Critical Casting"'
      : 'WoM "Channelling Test" (failed channelled cast)';

  return (
    <div className={styles.stepBody}>
      <p className={styles.outcomeLine}>{why}</p>
      <p className={styles.note}>{citation}</p>

      <MiscastRollButtons
        isFumbledCast={result.isFumbledCast}
        triggerMinorMiscast={result.triggerMinorMiscast}
        onMiscastRoll={onRollMiscast}
      />

      {miscastResult && (
        <MiscastEscalation
          miscastResult={miscastResult}
          character={character}
          onMiscastRoll={onRollMiscast}
          onArcaneMarkAcquired={onArcaneMarkAcquired}
        />
      )}
    </div>
  );
}
