import { useState } from 'react';
import type { Character, Combatant } from '../../types/character';
import { sortByInitiative, nextTurn } from '../../logic/initiative';
import { Card } from '../shared/Card';
import styles from './InitiativeTracker.module.css';

interface InitiativeTrackerProps {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

export function InitiativeTracker({ character, updateCharacter }: InitiativeTrackerProps) {
  const [name, setName] = useState('');
  const [initiative, setInitiative] = useState('');

  const combatants = character.initiativeList ?? [];
  const activeIndex = character.activeInitiativeIndex ?? 0;
  const sorted = sortByInitiative(combatants);

  const isFormValid = () => {
    const initVal = parseInt(initiative, 10);
    return name.trim() !== '' && !isNaN(initVal);
  };

  const handleAdd = () => {
    if (!isFormValid()) return;

    const newCombatant: Combatant = {
      id: crypto.randomUUID(),
      name: name.trim(),
      initiative: parseInt(initiative, 10),
    };

    updateCharacter((char) => ({
      ...char,
      initiativeList: [...(char.initiativeList ?? []), newCombatant],
    }));

    setName('');
    setInitiative('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isFormValid()) {
      handleAdd();
    }
  };

  const handleRemove = (id: string) => {
    updateCharacter((char) => {
      const currentList = char.initiativeList ?? [];
      const currentSorted = sortByInitiative(currentList);
      const currentActive = char.activeInitiativeIndex ?? 0;

      const newList = currentList.filter((c) => c.id !== id);
      const newSorted = sortByInitiative(newList);

      // Adjust active index: if the removed combatant was before or at active index
      // in the sorted list, we may need to shift.
      let newActiveIndex = currentActive;
      if (newSorted.length === 0) {
        newActiveIndex = 0;
      } else {
        // Find the currently active combatant in the old sorted list
        const activeCombatant = currentSorted[currentActive];
        if (activeCombatant && activeCombatant.id === id) {
          // Active combatant was removed — keep same index but clamp
          newActiveIndex = Math.min(currentActive, newSorted.length - 1);
        } else if (activeCombatant) {
          // Find where the active combatant ended up in new sorted list
          const newIdx = newSorted.findIndex((c) => c.id === activeCombatant.id);
          newActiveIndex = newIdx >= 0 ? newIdx : 0;
        } else {
          newActiveIndex = 0;
        }
      }

      return {
        ...char,
        initiativeList: newList,
        activeInitiativeIndex: newActiveIndex,
      };
    });
  };

  const handleNextTurn = () => {
    updateCharacter((char) => {
      const list = char.initiativeList ?? [];
      const sortedList = sortByInitiative(list);
      const current = char.activeInitiativeIndex ?? 0;
      const next = nextTurn(current, sortedList.length);
      return {
        ...char,
        activeInitiativeIndex: next,
      };
    });
  };

  return (
    <Card>
      <div className={styles.container}>
        {/* Combatant Chip Row + Next Turn (inline) */}
        {sorted.length > 0 && (
          <div className={styles.chipRow}>
            {sorted.map((combatant, index) => (
              <div
                key={combatant.id}
                className={
                  index === activeIndex
                    ? styles.combatantChipActive
                    : styles.combatantChip
                }
              >
                <span className={styles.chipInitiative}>
                  {combatant.initiative}
                </span>
                <span className={styles.chipName}>
                  {combatant.name}
                </span>
                <button
                  type="button"
                  className={styles.chipRemoveBtn}
                  onClick={() => handleRemove(combatant.id)}
                  aria-label={`Remove ${combatant.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className={styles.nextTurnBtn}
              onClick={handleNextTurn}
            >
              Next ▶
            </button>
          </div>
        )}

        {/* Add Combatant Form */}
        <div className={sorted.length === 0 ? styles.addFormCompact : styles.addForm}>
          <div className={styles.formFieldName}>
            {sorted.length > 0 && <label className={styles.formLabel}>Name</label>}
            <input
              type="text"
              className={sorted.length === 0 ? styles.formInputCompact : styles.formInput}
              placeholder="e.g. Goblin #1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className={sorted.length === 0 ? styles.formFieldInitCompact : styles.formFieldInit}>
            {sorted.length > 0 && <label className={styles.formLabel}>Init</label>}
            <input
              type="number"
              className={sorted.length === 0 ? styles.formInputCompact : styles.formInput}
              placeholder="Init"
              value={initiative}
              onChange={(e) => setInitiative(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button
            type="button"
            className={sorted.length === 0 ? styles.addBtnCompact : styles.addBtn}
            onClick={handleAdd}
            disabled={!isFormValid()}
            aria-label="Add combatant"
          >
            +
          </button>
        </div>
      </div>
    </Card>
  );
}
