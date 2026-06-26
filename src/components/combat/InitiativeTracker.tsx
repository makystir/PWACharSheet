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
        {/* Combatant List */}
        {sorted.length === 0 ? (
          <div className={styles.emptyState}>
            No combatants in initiative order. Add combatants to track turns.
          </div>
        ) : (
          <>
            <div className={styles.combatantList}>
              {sorted.map((combatant, index) => (
                <div
                  key={combatant.id}
                  className={
                    index === activeIndex
                      ? styles.combatantItemActive
                      : styles.combatantItem
                  }
                >
                  <span className={styles.initiativeBadge}>
                    {combatant.initiative}
                  </span>
                  <span className={styles.combatantName}>
                    {combatant.name}
                  </span>
                  {index === activeIndex && (
                    <span className={styles.activeIndicator}>▶</span>
                  )}
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => handleRemove(combatant.id)}
                    aria-label={`Remove ${combatant.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className={styles.nextTurnBtn}
              onClick={handleNextTurn}
              disabled={sorted.length === 0}
            >
              Next Turn ▶
            </button>
          </>
        )}

        {/* Add Combatant Form */}
        <div className={styles.addForm}>
          <div className={styles.formFieldName}>
            <label className={styles.formLabel}>Name</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="e.g. Goblin #1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className={styles.formFieldInit}>
            <label className={styles.formLabel}>Init</label>
            <input
              type="number"
              className={styles.formInput}
              placeholder="e.g. 45"
              value={initiative}
              onChange={(e) => setInitiative(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button
            type="button"
            className={styles.addBtn}
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
