import type { Enterprise } from '../../types/character';
import type { EnterpriseEventResult } from '../../data/enterprise-events';
import { rollEnterpriseEvent } from '../../logic/enterprise-utils';
import styles from './EnterpriseEventRoller.module.css';

interface EnterpriseEventRollerProps {
  enterprise: Enterprise;
  onRoll: (result: EnterpriseEventResult) => void;
  lastResult: EnterpriseEventResult | null;
  onDismiss: () => void;
}

export function EnterpriseEventRoller({
  enterprise,
  onRoll,
  lastResult,
  onDismiss,
}: EnterpriseEventRollerProps) {
  function handleRoll() {
    const result = rollEnterpriseEvent(enterprise.type);
    onRoll(result);
  }

  return (
    <div className={styles.container}>
      <button type="button" className={styles.rollBtn} onClick={handleRoll}>
        Roll Event
      </button>

      {lastResult && (
        <div className={styles.resultCard} aria-live="polite">
          <div className={styles.resultHeader}>
            <span className={styles.rollValue}>Roll: {lastResult.roll}</span>
            <button
              type="button"
              className={styles.dismissBtn}
              onClick={onDismiss}
              aria-label="Dismiss event result"
            >
              Dismiss
            </button>
          </div>
          <div className={styles.eventTitle}>{lastResult.title}</div>
          <div className={styles.eventDescription}>{lastResult.description}</div>
        </div>
      )}
    </div>
  );
}
