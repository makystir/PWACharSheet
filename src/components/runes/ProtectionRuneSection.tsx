import { useState } from 'react';
import { getAvailableProtectionRunes, validateProtectionPlacement } from '../../logic/protectionRunes';
import { RUNE_CATALOGUE } from '../../data/runes';
import type { ProtectionItem } from '../../types/character';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import styles from './ProtectionRuneSection.module.css';

const PROTECTION_ITEM_TYPES = ['banner', 'shrine', 'gatehouse', 'oathstone', 'icon', 'other'] as const;
type ProtectionItemType = (typeof PROTECTION_ITEM_TYPES)[number];

const MAX_ITEMS = 20;

export interface ProtectionRuneSectionProps {
  knownRunes: string[];
  protectionItems: ProtectionItem[];
  onAddItem: (item: ProtectionItem) => void;
  onEditItem: (item: ProtectionItem) => void;
  onRemoveItem: (itemId: string) => void;
  onInscribeRune: (itemId: string, runeId: string) => void;
  onRemoveRune: (itemId: string, runeIndex: number) => void;
}

export default function ProtectionRuneSection({
  knownRunes,
  protectionItems,
  onAddItem,
  onEditItem,
  onRemoveItem,
  onInscribeRune,
  onRemoveRune,
}: ProtectionRuneSectionProps) {
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ProtectionItemType>('banner');
  const [nameError, setNameError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<ProtectionItemType>('banner');
  const [editLocation, setEditLocation] = useState('');
  const [editError, setEditError] = useState('');
  const [removingItem, setRemovingItem] = useState<ProtectionItem | null>(null);
  const [inscribeItemId, setInscribeItemId] = useState<string | null>(null);
  const [selectedRuneId, setSelectedRuneId] = useState('');

  const availableRunes = getAvailableProtectionRunes(knownRunes);
  const hasKnownProtectionRunes = availableRunes.length > 0;
  const hasItems = protectionItems.length > 0;

  // Empty state: no known protection runes AND no items
  if (!hasKnownProtectionRunes && !hasItems) {
    return (
      <div className={styles.section}>
        <p className={styles.emptyState}>
          No Protection Runes known and no Protection Items added. Learn a Protection Rune or add an item to get started.
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
    const item: ProtectionItem = {
      id: `prot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      type: newType,
      location: '',
      runes: [],
    };
    onAddItem(item);
    setNewName('');
    setNewType('banner');
  }

  function startEdit(item: ProtectionItem) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditType(item.type);
    setEditLocation(item.location);
    setEditError('');
  }

  function saveEdit(item: ProtectionItem) {
    const trimmed = editName.trim();
    if (!trimmed || trimmed.length > 100) {
      setEditError('Name is required and must be between 1 and 100 characters.');
      return;
    }
    if (editLocation.length > 200) {
      setEditError('Location must be 200 characters or fewer.');
      return;
    }
    setEditError('');
    onEditItem({
      ...item,
      name: trimmed,
      type: editType,
      location: editLocation,
    });
    setEditingId(null);
  }

  function handleInscribe(itemId: string) {
    if (!selectedRuneId) return;
    const item = protectionItems.find(i => i.id === itemId);
    if (!item) return;
    const result = validateProtectionPlacement(selectedRuneId, item);
    if (!result.valid) {
      // Validation handled by filtering available runes in dropdown, but show error just in case
      return;
    }
    onInscribeRune(itemId, selectedRuneId);
    setSelectedRuneId('');
    setInscribeItemId(null);
  }

  function getRuneName(runeId: string): string {
    const rune = RUNE_CATALOGUE.find(r => r.id === runeId);
    return rune?.name ?? '(Unknown Rune)';
  }

  function getAvailableRunesForItem(item: ProtectionItem): typeof availableRunes {
    // Filter runes that can be validly placed on this item
    return availableRunes.filter(rune => {
      const result = validateProtectionPlacement(rune.id, item);
      return result.valid;
    });
  }

  return (
    <div className={styles.section}>
      {/* Known Runes List */}
      {hasKnownProtectionRunes && (
        <>
          <h3 className={styles.sectionTitle}>Known Protection Runes</h3>
          <div className={styles.runeList}>
            {availableRunes.map(rune => (
              <div key={rune.id} className={styles.runeRow}>
                <span className={styles.runeName}>{rune.name}</span>
                <span className={styles.runeEffect}>
                  {rune.effects[0]?.description ?? rune.description}
                </span>
                <span className={styles.runeSls}>SLs: {rune.slsRequired ?? '—'}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Protection Items List */}
      <h3 className={styles.sectionTitle}>Protection Items</h3>

      {hasItems ? (
        <div className={styles.itemList}>
          {protectionItems.map(item => {
            const isEditing = editingId === item.id;
            const slotsRemaining = 3 - item.runes.length;
            const isInscribing = inscribeItemId === item.id;
            const runesForItem = getAvailableRunesForItem(item);

            return (
              <div key={item.id} className={styles.itemCard}>
                {isEditing ? (
                  <>
                    <div className={styles.editRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Name</label>
                        <input
                          className={styles.formInput}
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          maxLength={100}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Type</label>
                        <select
                          className={styles.formSelect}
                          value={editType}
                          onChange={e => setEditType(e.target.value as ProtectionItemType)}
                        >
                          {PROTECTION_ITEM_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Location</label>
                        <input
                          className={styles.formInput}
                          value={editLocation}
                          onChange={e => setEditLocation(e.target.value)}
                          maxLength={200}
                          placeholder="e.g. Main Gate"
                        />
                      </div>
                    </div>
                    {editError && <span className={styles.validationError}>{editError}</span>}
                    <div className={styles.itemActions}>
                      <button type="button" className={styles.btnPrimary} onClick={() => saveEdit(item)}>
                        Save
                      </button>
                      <button type="button" className={styles.btnSmall} onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.itemHeader}>
                      <span className={styles.itemName}>{item.name}</span>
                      <span className={styles.typeBadge}>{item.type}</span>
                      {item.location && (
                        <span className={styles.itemLocation}>{item.location}</span>
                      )}
                    </div>

                    <div className={styles.itemRunes}>
                      {item.runes.map((runeId, idx) => (
                        <span key={`${runeId}-${idx}`} className={styles.inscribedRune}>
                          {getRuneName(runeId)}
                          <button
                            type="button"
                            className={styles.removeRuneBtn}
                            onClick={() => onRemoveRune(item.id, idx)}
                            aria-label={`Remove ${getRuneName(runeId)}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <span className={styles.slotsRemaining}>
                        {slotsRemaining} slot{slotsRemaining !== 1 ? 's' : ''} remaining
                      </span>
                    </div>

                    {/* Inscribe Rune UI */}
                    {isInscribing ? (
                      <div className={styles.inscribeRow}>
                        <select
                          className={styles.formSelect}
                          value={selectedRuneId}
                          onChange={e => setSelectedRuneId(e.target.value)}
                        >
                          <option value="">Select a rune…</option>
                          {runesForItem.map(rune => (
                            <option key={rune.id} value={rune.id}>{rune.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className={styles.btnPrimary}
                          onClick={() => handleInscribe(item.id)}
                          disabled={!selectedRuneId}
                        >
                          Inscribe
                        </button>
                        <button
                          type="button"
                          className={styles.btnSmall}
                          onClick={() => { setInscribeItemId(null); setSelectedRuneId(''); }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      slotsRemaining > 0 && runesForItem.length > 0 && (
                        <button
                          type="button"
                          className={styles.btnSmall}
                          onClick={() => { setInscribeItemId(item.id); setSelectedRuneId(''); }}
                        >
                          + Inscribe Rune
                        </button>
                      )
                    )}

                    <div className={styles.itemActions}>
                      <button type="button" className={styles.btnSmall} onClick={() => startEdit(item)}>
                        Edit
                      </button>
                      <button type="button" className={styles.btnDanger} onClick={() => setRemovingItem(item)}>
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className={styles.emptyState}>No Protection Items added yet.</p>
      )}

      {/* Add Item Form */}
      {protectionItems.length >= MAX_ITEMS ? (
        <p className={styles.maxItemsNote}>Maximum of 20 items reached for this category.</p>
      ) : (
        <div className={styles.addForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Name</label>
            <input
              className={styles.formInput}
              value={newName}
              onChange={e => { setNewName(e.target.value); setNameError(''); }}
              maxLength={100}
              placeholder="Item name"
            />
            {nameError && <span className={styles.validationError}>{nameError}</span>}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Type</label>
            <select
              className={styles.formSelect}
              value={newType}
              onChange={e => setNewType(e.target.value as ProtectionItemType)}
            >
              {PROTECTION_ITEM_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <button type="button" className={styles.btnPrimary} onClick={handleAddItem}>
            Add Item
          </button>
        </div>
      )}

      {/* Removal Confirmation Dialog */}
      {removingItem && (
        <ConfirmDialog
          message={`Remove "${removingItem.name}"? ${removingItem.runes.length} inscribed rune(s) will be lost.`}
          confirmLabel="Remove"
          cancelLabel="Cancel"
          onConfirm={() => {
            onRemoveItem(removingItem.id);
            setRemovingItem(null);
          }}
          onCancel={() => setRemovingItem(null)}
        />
      )}
    </div>
  );
}
