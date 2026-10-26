import type { TurnOption } from '../../../logic/combat-turn/types';
import styles from './guidedTurnSteps.module.css';

export interface ResolveStepProps {
  /** The Step-2 option the player chose (framing only). */
  chosenOption: TurnOption;
  /** Guidance flag (never gates — AC-13). */
  actionUsed: boolean;
  onMarkAction: (used: boolean) => void;
}

const OPTION_LABEL: Record<Exclude<TurnOption, null>, string> = {
  attack: 'the Attack Flow',
  cast: 'the spellcasting panel',
  defend: 'the Take Damage panel',
  skill: 'the Quick Roll / weapon roll',
};

/**
 * Step 3 — resolve the chosen Action. Resolution happens ENTIRELY inside the
 * existing control (AttackFlow for an attack). The guide shows framing text and
 * a "Mark Action done" toggle; it reads nothing back from the control and
 * applies no wound/condition/advantage itself (AC-9).
 *
 * Core p.157-158 (Attacking).
 */
export function ResolveStep({ chosenOption, actionUsed, onMarkAction }: ResolveStepProps) {
  const target = chosenOption ? OPTION_LABEL[chosenOption] : 'the control you opened';
  return (
    <div className={styles.stepBody}>
      <p>
        Resolve your Action in {target}. The guide applies nothing — every change
        is made by that control.
      </p>
      <label className={styles.markRow}>
        <input
          type="checkbox"
          checked={actionUsed}
          onChange={(e) => onMarkAction(e.target.checked)}
          data-testid="guide-mark-action"
        />
        I&rsquo;ve resolved my Action
      </label>
    </div>
  );
}
