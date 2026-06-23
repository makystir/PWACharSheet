import { useState } from 'react';
import styles from './EngineeringRuneSection.module.css';
import { getAvailableEngineeringRunes, validateEngineeringPlacement, calculateForgingCharges } from '../../logic/engineeringRunes';
import { getRuneById } from '../../logic/runes';
import type { EngineeringItem } from '../../types/character';

const ENGINEERING_ITEM_TYPES = ['Grudge Thrower', 'Bolt Thrower', 'Blackpowder Cannon'] as const;
const MAX_ITEMS = 20;

export interface EngineeringRuneSectionProps {
  knownRunes: string[];
  engineeringItems: EngineeringItem[];
  forgingCharges: Record<string, number>;
  onAddItem: (item: EngineeringItem) => void;
  onRemoveItem: (itemId: string) => void;
  onInscribeRune: (itemId: string, runeId: string) => void;
  onRemoveRune: (itemId: string, runeIndex: number) => void;
  onActivateForging: (itemId: string) => void;
  onResetCharges: () => void;
}

export default function EngineeringRuneSection({
  knownRunes,
  engineeringItems,
  forgingCharges,
  onAddItem,
  onRemoveItem,
  onInscribeRune,
  onRemoveRune,
  onActivateForging,
  onResetCharges,
}: EngineeringRuneSectionProps) {
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<EngineeringItem['type']>('Grudge Thrower');
  const [nameError, setNameError] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [inscribeSelections, setInscribeSelections] = useState<Record<string, string>>({});

  const availableRunes = getAvailableEngineeringRunes(knownRunes);
  const hasKnownRunes = availableRunes.length > 0;
  const hasItems = engineeringItems.length > 0;

  // Empty state
  if (!hasKnownRunes && !hasItems) {
    return (
      <div className={styles.section}>
        <p className={styles.emptyState}>
          No Engineering Runes known and no artillery items added. Learn Engineering Runes
          via the Rune Magic (Engineering Runes) talent, then add artillery items here.
        </p>
      </div>
    );
  }

  function handleAddItem() {
    const trimmed = newName.trim();
    if (!trimmed || trimmed.length > 100) {
      setNameError('Name is required and must be between 1 and 100 characters.');
      return;
    }
    setNameError('');
    const item: EngineeringItem = {
      id: `eng-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      type: newType,
      runes: [],
    };
    onAddItem(item);
    setNewName('');
  }

  function handleInscribe(itemId: string) {
    const runeId = inscribeSelections[itemId];
    if (!runeId) return;
    const item = engineeringItems.find(i => i.id === itemId);
    if (!item) return;
    const result = validateEngineeringPlacement(runeId, item);
    if (result.valid) {
      onInscribeRune(itemId, runeId);
      setInscribeSelections(prev => ({ ...prev, [itemId]: '' }));
    }
  }

  function getItemForgingTotal(item: EngineeringItem): number {
    return calculateForgingCharges(item);
  }

  function getItemForgingRemaining(item: EngineeringItem): number {
    return forgingCharges[item.id] ?? calculateForgingCharges(item);
  }

  return (
    <div className={styles.section}>
      {/* Known Engineering Runes */}
      {hasKnownRunes && (
        <div>
          <h3 className={styles.sectionTitle}>Known Engineering Runes</h3>
          <div className={styles.runeList}>
            {availableRunes.map(rune => (
              <div key={rune.id} className={styles.runeCard}>
                <div className={styles.runeName}>{rune.name}</div>
                <div className={styles.runeDetails}>
                  <span>{rune.effects.map(e => e.description ?? e.quality ?? `+${e.value}`).join(', ')}</span>
                  {rune.slsRequired != null && (
                    <span className={styles.slBadge}>SLs: {rune.slsRequired}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engineering Items */}
      <div>
        <h3 className={styles.sectionTitle}>Artillery Items</h3>

        {hasItems ? (
          <div className={styles.itemsList}>
            {engineeringItems.map(item => {
              const forgingTotal = getItemForgingTotal(item);
              const forgingRemaining = getItemForgingRemaining(item);
              const selectedRune = inscribeSelections[item.id] || '';

              return (
                <div key={item.id} className={styles.itemCard}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemName}>{item.name}</span>
                    <span className={styles.typeBadge}>{item.type}</span>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => setConfirmRemoveId(item.id)}
                      aria-label={`Remove ${item.name}`}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Confirmation dialog */}
                  {confirmRemoveId === item.id && (
                    <div className={styles.confirmRow}>
                      <span>Remove {item.name}?</span>
                      <button
                        type="button"
                        className={styles.confirmBtn}
                        onClick={() => { onRemoveItem(item.id); setConfirmRemoveId(null); }}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={() => setConfirmRemoveId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Inscribed runes */}
                  {item.runes.length > 0 && (
                    <div className={styles.itemRunes}>
                      {item.runes.map((runeId, idx) => {
                        const rune = getRuneById(runeId);
                        return (
                          <span key={`${runeId}-${idx}`} className={styles.runeTag}>
                            {rune?.name ?? '(Unknown Rune)'}
                            <button
                              type="button"
                              className={styles.removeRuneBtn}
                              onClick={() => onRemoveRune(item.id, idx)}
                              aria-label={`Remove rune ${rune?.name ?? runeId}`}
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Rune of Forging charge counter */}
                  {forgingTotal > 0 && (
                    <div className={styles.chargeRow}>
                      <span className={styles.chargeLabel}>Forging:</span>
                      <span className={styles.chargeCount}>{forgingRemaining}/{forgingTotal}</span>
                      <button
                        type="button"
                        className={styles.useBtn}
                        disabled={forgingRemaining <= 0}
                        onClick={() => onActivateForging(item.id)}
                      >
                        Use
                      </button>
                    </div>
                  )}

                  {/* Inscribe rune control */}
                  {hasKnownRunes && item.runes.length < 3 && (
                    <div className={styles.inscribeRow}>
                      <select
                        className={styles.inscribeSelect}
                        value={selectedRune}
                        onChange={e => setInscribeSelections(prev => ({ ...prev, [item.id]: e.target.value }))}
                        aria-label={`Select rune for ${item.name}`}
                      >
                        <option value="">— Select rune —</option>
                        {availableRunes
                          .filter(r => validateEngineeringPlacement(r.id, item).valid)
                          .map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                      </select>
                      <button
                        type="button"
                        className={styles.inscribeBtn}
                        disabled={!selectedRune}
                        onClick={() => handleInscribe(item.id)}
                      >
                        Inscribe
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyState}>No artillery items added yet.</p>
        )}
      </div>

      {/* Reset all charges button */}
      {engineeringItems.some(item => calculateForgingCharges(item) > 0) && (
        <button
          type="button"
          className={styles.resetBtn}
          onClick={onResetCharges}
        >
          Reset All Charges (New Adventure)
        </button>
      )}

      {/* Add item form */}
      {engineeringItems.length >= MAX_ITEMS ? (
        <p className={styles.limitMessage}>Maximum of 20 items reached.</p>
      ) : (
        <div className={styles.addForm}>
          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="eng-item-name">Name</label>
            <input
              id="eng-item-name"
              type="text"
              className={styles.nameInput}
              value={newName}
              onChange={e => { setNewName(e.target.value); setNameError(''); }}
              placeholder="Artillery name"
              maxLength={100}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="eng-item-type">Type</label>
            <select
              id="eng-item-type"
              className={styles.typeSelect}
              value={newType}
              onChange={e => setNewType(e.target.value as EngineeringItem['type'])}
            >
              {ENGINEERING_ITEM_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className={styles.addBtn}
            onClick={handleAddItem}
          >
            Add Item
          </button>
          {nameError && <span className={styles.validationError}>{nameError}</span>}
        </div>
      )}
    </div>
  );
}
