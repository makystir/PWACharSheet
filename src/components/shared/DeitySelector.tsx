import { useState } from 'react';
import type { Character } from '../../types/character';
import type { AncestorGod } from '../../data/deityRunes';
import { ANCESTOR_GODS } from '../../data/deityRunes';
import { isPriestCareer, getDeityChangeWarnings, isValidDeity } from '../../logic/priestRunes';
import { isDwarfSpecies } from '../../logic/career-eligibility';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './DeitySelector.module.css';

interface DeitySelectorProps {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

/**
 * Dropdown for selecting a Dwarf priest's patron Ancestor God.
 * Only renders when the character is a Dwarf with a priest career.
 * Retains the stored patronDeity value even when hidden.
 */
export function DeitySelector({ character, updateCharacter }: DeitySelectorProps) {
  const [pendingDeity, setPendingDeity] = useState<AncestorGod | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Only render for Dwarf priest characters
  if (!isDwarfSpecies(character.species) || !isPriestCareer(character.career)) {
    return null;
  }

  const currentDeity = character.patronDeity;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    // Empty value means placeholder selected — clear deity
    if (value === '') {
      updateCharacter((char) => ({ ...char, patronDeity: undefined }));
      return;
    }

    if (!isValidDeity(value)) return;

    const newDeity = value as AncestorGod;
    const knownRunes = character.knownRunes ?? [];

    // Check for warnings when changing deity with existing runes
    if (knownRunes.length > 0) {
      const warnings = getDeityChangeWarnings(knownRunes, newDeity);
      if (warnings.length > 0) {
        setPendingDeity(newDeity);
        setWarningMessage(
          `Changing to ${newDeity} will restrict the following known runes: ${warnings.join(', ')}. These runes will be retained but marked as restricted.`
        );
        return;
      }
    }

    // No warnings — persist immediately
    updateCharacter((char) => ({ ...char, patronDeity: newDeity }));
  };

  const handleConfirm = () => {
    if (pendingDeity) {
      updateCharacter((char) => ({ ...char, patronDeity: pendingDeity }));
    }
    setPendingDeity(null);
    setWarningMessage(null);
  };

  const handleCancel = () => {
    setPendingDeity(null);
    setWarningMessage(null);
  };

  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="deity-selector">
        Patron Ancestor God
      </label>
      <select
        id="deity-selector"
        className={styles.select}
        value={currentDeity ?? ''}
        onChange={handleChange}
        aria-label="Select Ancestor God"
      >
        <option value="" disabled>
          Select Ancestor God...
        </option>
        {ANCESTOR_GODS.map((god) => (
          <option key={god} value={god}>
            {god}
          </option>
        ))}
      </select>

      {warningMessage && (
        <ConfirmDialog
          message={warningMessage}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          confirmLabel="Change Deity"
          cancelLabel="Keep Current"
        />
      )}
    </div>
  );
}
