import { useState } from 'react';
import { getRuneById, getAvailableRunesForItem, validateRunePlacement } from '../../logic/runes';
import styles from './RuneManager.module.css';

interface RuneManagerProps {
  itemType: 'weapon' | 'armour';
  itemIndex: number;
  itemName: string;
  currentRunes: string[];
  knownRunes: string[];
  onAddRune: (runeId: string) => void;
  onRemoveRune: (runeIndex: number) => void;
  onClose: () => void;
}

export function RuneManager({
  itemType,
  itemIndex: _itemIndex,
  itemName,
  currentRunes,
  knownRunes,
  onAddRune,
  onRemoveRune,
  onClose,
}: RuneManagerProps) {
  const [error, setError] = useState<string | null>(null);

  const availableRunes = getAvailableRunesForItem(itemType, currentRunes, knownRunes);
  const slotCount = currentRunes.length;
  const maxSlots = 3;

  const handleAdd = (runeId: string) => {
    const result = validateRunePlacement(runeId, currentRunes, itemType);
    if (!result.valid) {
      setError(result.error ?? 'Cannot add this rune.');
      return;
    }
    setError(null);
    onAddRune(runeId);
  };

  const handleRemove = (index: number) => {
    setError(null);
    onRemoveRune(index);
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-label={`Rune Manager — ${itemName}`}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{itemName}</h3>
          <span className={styles.slotCount}>⚒ {slotCount}/{maxSlots} Rune Slots</span>
        </div>

        {/* Current Runes */}
        <div className={styles.runeList}>
          <p className={styles.sectionLabel}>Inscribed Runes</p>
          {currentRunes.length === 0 && (
            <p className={styles.emptyText}>No runes inscribed.</p>
          )}
          {currentRunes.map((runeId, idx) => {
            const rune = getRuneById(runeId);
            return (
              <div key={`${runeId}-${idx}`} className={styles.runeRow}>
                <div>
                  <span className={styles.runeName}>{rune?.name ?? runeId}</span>
                  {rune?.isMaster && <span className={styles.masterBadge}>★ Master</span>}
                  {rune && <p className={styles.desc}>{rune.description}</p>}
                </div>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => handleRemove(idx)}
                  aria-label={`Remove ${rune?.name ?? runeId}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {error && <p className={styles.error}>{error}</p>}

        {/* Available Runes */}
        <div className={styles.runeList}>
          <p className={styles.sectionLabel}>Available Runes</p>
          {knownRunes.length === 0 && (
            <p className={styles.emptyText}>No runes learned yet. Learn runes on the Advancement page.</p>
          )}
          {knownRunes.length > 0 && availableRunes.length === 0 && (
            <p className={styles.emptyText}>No compatible runes available for this item.</p>
          )}
          {availableRunes.map((rune) => (
            <div key={rune.id} className={styles.runeRow}>
              <div>
                <span className={styles.runeName}>{rune.name}</span>
                {rune.isMaster && <span className={styles.masterBadge}>★ Master</span>}
                <p className={styles.desc}>{rune.description}</p>
              </div>
              <button
                type="button"
                className={styles.addBtn}
                onClick={() => handleAdd(rune.id)}
                aria-label={`Add ${rune.name}`}
              >
                Add
              </button>
            </div>
          ))}
        </div>

        <button type="button" className={styles.closeBtn} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
