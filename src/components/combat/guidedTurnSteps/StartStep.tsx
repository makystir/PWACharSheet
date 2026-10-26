import type { CombatReminder } from '../../../logic/reminders';
import { CombatReminders } from '../CombatReminders';
import styles from './guidedTurnSteps.module.css';

export interface StartStepProps {
  /** Reminders derived by the host via deriveAllReminders (same items, order). */
  reminders: CombatReminder[];
  /** Opens the shared RollDialog seeded with the reminder's test (host-owned). */
  onGuideRollReminder: (reminder: CombatReminder) => void;
}

/**
 * Step 1 — start of turn, checks due. Renders the SAME reminders the dashboard
 * shows by reusing the existing presentational CombatReminders component (no new
 * derivation, no new roll logic). Roll-backed reminders get a Roll button that
 * delegates to the host's seeded RollDialog; informational reminders render as
 * text + citation. This step computes and applies nothing.
 *
 * Core p.167-169 (Master Condition List): end-of-turn/round condition timing is
 * surfaced here as "checks due".
 */
export function StartStep({ reminders, onGuideRollReminder }: StartStepProps) {
  return (
    <div className={styles.stepBody}>
      {reminders.length === 0 ? (
        <p className={styles.empty} data-testid="guide-start-empty">
          No checks due right now.
        </p>
      ) : (
        <CombatReminders reminders={reminders} onRollReminder={onGuideRollReminder} />
      )}
    </div>
  );
}
