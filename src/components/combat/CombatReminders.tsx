import { useState } from 'react';
import { AlertTriangle, Dice6, Info } from 'lucide-react';
import type { CombatReminder } from '../../logic/reminders';
import { Tooltip } from '../shared/Tooltip';
import styles from './CombatReminders.module.css';
import pressableStyles from '../../styles/micro-interactions.module.css';

/**
 * Presentational reminders strip (reminders-design §4). Pure: it performs no
 * derivation and no roll resolution — the parent derives the list and owns the
 * roll dialog. Renders zero DOM when the list is empty (consistent with the
 * dashboard's other "zero DOM when disabled" gates).
 *
 * Each reminder shows its label + rule description, an info button that opens
 * the shared Tooltip with the rulebook citation, and — only when a `test` is
 * present — a Roll button that asks the parent to run the one-tap roll. There is
 * no calculated total displayed in these rows (the roll base target is shown by
 * RollDialog, which renders its own breakdown), so no breakdown tooltip is
 * required here (design §4 note; calculated-total-tooltips rule).
 */

export interface CombatRemindersProps {
  reminders: CombatReminder[];
  /** Opens the shared RollDialog seeded with this reminder's test. */
  onRollReminder: (reminder: CombatReminder) => void;
}

export function CombatReminders({ reminders, onRollReminder }: CombatRemindersProps) {
  const [citation, setCitation] = useState<{ reminder: CombatReminder; anchorEl: HTMLElement } | null>(null);

  if (reminders.length === 0) return null;

  return (
    <section className={styles.reminders} aria-label="Reminders" data-testid="combat-reminders">
      <div className={styles.header}>
        <AlertTriangle size={14} aria-hidden="true" />
        <span className={styles.title}>Reminders</span>
      </div>
      <ul className={styles.list}>
        {reminders.map((reminder) => (
          <li key={reminder.id} className={styles.row} data-testid={`reminder-${reminder.id}`}>
            <div className={styles.text}>
              <span className={styles.label}>{reminder.label}</span>
              <span className={styles.description}>{reminder.description}</span>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.infoBtn} ${pressableStyles.pressable}`}
                aria-label={`Rule for ${reminder.label}`}
                aria-describedby={citation?.reminder.id === reminder.id ? `reminder-citation-${reminder.id}` : undefined}
                onClick={(e) => {
                  if (citation?.reminder.id === reminder.id) {
                    setCitation(null);
                    return;
                  }
                  setCitation({ reminder, anchorEl: e.currentTarget });
                }}
              >
                <Info size={14} aria-hidden="true" />
              </button>
              {reminder.test && (
                <button
                  type="button"
                  className={`${styles.rollBtn} ${pressableStyles.pressable}`}
                  aria-label={`Roll ${reminder.test.rollName}`}
                  onClick={() => onRollReminder(reminder)}
                >
                  <Dice6 size={14} aria-hidden="true" />
                  <span>Roll</span>
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {citation && (
        <Tooltip
          anchorEl={citation.anchorEl}
          title={citation.reminder.label}
          onClose={() => setCitation(null)}
          id={`reminder-citation-${citation.reminder.id}`}
        >
          {citation.reminder.citation}
        </Tooltip>
      )}
    </section>
  );
}
