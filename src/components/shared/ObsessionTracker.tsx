import type { Character } from '../../types/character';
import { getObsessionDisplayState } from '../../logic/obsessions';
import styles from './ObsessionTracker.module.css';

interface ObsessionTrackerProps {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

/**
 * Tracks a High Elf's active Obsession with free-text inputs for description
 * and related test types. Conditionally displays benefit/penalty indicators
 * based on the character's Yenlui state.
 *
 * Rendered within YenluiPanel when character is High Elf.
 */
export function ObsessionTracker({ character, updateCharacter }: ObsessionTrackerProps) {
  const obsession = character.obsession;
  const displayState = getObsessionDisplayState(character.yenluiState, obsession);

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const description = e.target.value;
    updateCharacter((char) => ({
      ...char,
      obsession: {
        description,
        relatedTests: char.obsession?.relatedTests ?? '',
      },
    }));
  };

  const handleRelatedTestsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const relatedTests = e.target.value;
    updateCharacter((char) => ({
      ...char,
      obsession: {
        description: char.obsession?.description ?? '',
        relatedTests,
      },
    }));
  };

  return (
    <div className={styles.container}>
      <span className={styles.label}>Obsession</span>

      <div className={styles.inputGroup}>
        <input
          type="text"
          className={styles.input}
          placeholder="Obsession description..."
          value={obsession?.description ?? ''}
          onChange={handleDescriptionChange}
          aria-label="Obsession description"
        />
        <input
          type="text"
          className={styles.input}
          placeholder="Related test types (e.g., Art, Lore)"
          value={obsession?.relatedTests ?? ''}
          onChange={handleRelatedTestsChange}
          aria-label="Related test types"
        />
      </div>

      {displayState.showBenefit && (
        <div className={styles.benefit} role="status">
          <span aria-hidden="true">✦</span>
          <span>{displayState.benefitText}</span>
        </div>
      )}

      {displayState.showPenalty && (
        <div className={styles.penalty} role="status">
          <span aria-hidden="true">⚠️</span>
          <span>{displayState.penaltyText}</span>
        </div>
      )}
    </div>
  );
}
