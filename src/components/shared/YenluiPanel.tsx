import type { Character, YenluiState } from '../../types/character';
import { isYenluiVisible, YENLUI_STATE_META, getYenluiTalentNotes } from '../../logic/yenlui';
import { Card } from './Card';
import styles from './YenluiPanel.module.css';

interface YenluiPanelProps {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

/** Icon + text indicators for each state, distinguishable without colour alone. */
const STATE_INDICATORS: Record<string, { icon: string; text: string }> = {
  light: { icon: '☀️', text: 'Light' },
  balanced: { icon: '⚖️', text: 'Balanced' },
  dark: { icon: '🌑', text: 'Dark' },
};

const UNSET_INDICATOR = { icon: '○', text: 'Unset' };

/** Toggle options for state selection */
const TOGGLE_OPTIONS: { value: YenluiState | undefined; label: string }[] = [
  { value: undefined, label: 'Unset' },
  { value: 'light', label: 'Light' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'dark', label: 'Dark' },
];

/**
 * Displays the current Yenlui spiritual balance state for Elven characters.
 * Only renders when useYenlui house rule is enabled AND character is an Elf.
 * Retains stored yenluiState value even when hidden.
 */
export function YenluiPanel({ character, updateCharacter }: YenluiPanelProps) {
  if (!isYenluiVisible(character)) {
    return null;
  }

  const currentState = character.yenluiState;
  const indicator = currentState ? STATE_INDICATORS[currentState] : UNSET_INDICATOR;
  const meta = currentState ? YENLUI_STATE_META[currentState] : undefined;

  return (
    <Card>
      <div className={styles.container}>
        <span className={styles.label}>Yenlui Balance</span>

        <div className={styles.stateDisplay}>
          <span className={styles.stateIcon} aria-hidden="true">
            {indicator.icon}
          </span>
          <span className={styles.stateLabel}>{indicator.text}</span>
        </div>

        {/* Show roleplaying description for active states only; omit for Unset */}
        {meta && (
          <p className={styles.description}>{meta.description}</p>
        )}

        {/* Warning indicator when state is Dark */}
        {currentState === 'dark' && (
          <div className={styles.warning} role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>Sword-dancing penalty: -30</span>
          </div>
        )}

        {/* State toggle controls */}
        <div className={styles.toggleGroup} role="group" aria-label="Yenlui state selection">
          {TOGGLE_OPTIONS.map((option) => {
            const isActive = currentState === option.value;
            return (
              <button
                key={option.label}
                type="button"
                className={`${styles.toggleBtn} ${isActive ? styles.toggleBtnActive : ''}`}
                aria-label={`Set Yenlui state to ${option.label}`}
                aria-pressed={isActive}
                onClick={() => {
                  if (!isActive) {
                    updateCharacter((char) => ({ ...char, yenluiState: option.value }));
                  }
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {/* Influencing Factors reference section */}
        <section className={styles.referenceSection}>
          <details className={styles.detailsGroup}>
            <summary className={styles.summary}>Dark Influences</summary>
            <ul className={styles.listItems}>
              <li>Acts of cruelty</li>
              <li>Extreme indulgence</li>
              <li>Gaining a Corruption point</li>
            </ul>
          </details>
          <details className={styles.detailsGroup}>
            <summary className={styles.summary}>Light Influences</summary>
            <ul className={styles.listItems}>
              <li>Exceptional kindness</li>
              <li>Abstaining from pleasure</li>
              <li>Meditation at Cadai shrine or with Wayshard</li>
            </ul>
          </details>
        </section>
        {/* Talent integration notes section */}
        {(() => {
          const talentNotes = getYenluiTalentNotes(character);
          if (talentNotes.length === 0) return null;
          return (
            <section className={styles.talentNotesSection}>
              <span className={styles.label}>Talent Interactions</span>
              <ul>
                {talentNotes.map((tn) => (
                  <li key={tn.talentName} className={styles.talentNoteItem}>
                    <span className={styles.talentNoteName}>{tn.talentName}</span>
                    <span className={styles.talentNoteText}>{tn.note}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })()}
      </div>
    </Card>
  );
}
