import { useEffect, useRef } from 'react';
import type { EndOfTurnEffect, EndOfTurnResult } from '../../logic/end-of-turn';
import styles from './EndOfTurnReportModal.module.css';
import pressableStyles from '../../styles/micro-interactions.module.css';

export interface EndOfTurnReportModalProps {
  effects: EndOfTurnEffect[];
  result: EndOfTurnResult;
  onApply: () => void;
  onCancel: () => void;
}

/**
 * Modal displaying computed end-of-turn effects for user review before committing.
 * Groups effects into Damage, Reminders, and Auto-Removed sections.
 */
export function EndOfTurnReportModal({ effects, result, onApply, onCancel }: EndOfTurnReportModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus the modal on mount for accessibility
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const damageEffects = effects.filter(e => e.type === 'damage');
  const reminderEffects = effects.filter(e => e.type === 'reminder');
  const removeEffects = effects.filter(e => e.type === 'remove_condition');
  const hasEffects = effects.length > 0;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick} data-testid="end-of-turn-modal-overlay">
      <div
        ref={modalRef}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`End of Turn — Round ${result.roundAdvanced}`}
        tabIndex={-1}
      >
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>End of Turn — Round {result.roundAdvanced}</h2>
        </div>

        {!hasEffects && (
          <p className={styles.emptyMessage}>No end-of-turn effects</p>
        )}

        {/* Damage Effects */}
        {damageEffects.length > 0 && (
          <section className={styles.section} aria-label="Damage effects">
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon} aria-hidden="true">⚔️</span>
              Damage Effects
            </div>
            <ul className={styles.effectList}>
              {damageEffects.map((effect, idx) => (
                <li key={`damage-${idx}`} className={styles.effectDamage}>
                  {effect.description}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Reminders */}
        {reminderEffects.length > 0 && (
          <section className={styles.section} aria-label="Reminders">
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon} aria-hidden="true">📋</span>
              Reminders
            </div>
            <ul className={styles.effectList}>
              {reminderEffects.map((effect, idx) => (
                <li key={`reminder-${idx}`} className={styles.effectReminder}>
                  {effect.condition}: {effect.description}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Auto-Removed */}
        {removeEffects.length > 0 && (
          <section className={styles.section} aria-label="Auto-removed conditions">
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon} aria-hidden="true">🗑️</span>
              Auto-Removed
            </div>
            <ul className={styles.effectList}>
              {removeEffects.map((effect, idx) => (
                <li key={`remove-${idx}`} className={styles.effectRemove}>
                  {effect.condition}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Divider before buttons */}
        <hr className={styles.divider} />

        {/* Action Buttons */}
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={`${styles.cancelBtn} ${pressableStyles.pressable}`}
            onClick={onCancel}
            aria-label="Cancel end of turn"
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.applyBtn} ${pressableStyles.pressable}`}
            onClick={onApply}
            aria-label="Apply end of turn effects"
            data-testid="end-of-turn-apply-btn"
          >
            Apply ✓
          </button>
        </div>
      </div>
    </div>
  );
}
