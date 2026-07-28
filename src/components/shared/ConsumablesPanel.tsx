import { useState } from 'react';
import type { Character, Consumable } from '../../types/character';
import { incrementDose, decrementDose } from '../../logic/consumables';
import { Card } from './Card';
import styles from './ConsumablesPanel.module.css';

interface ConsumablesPanelProps {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

interface NewConsumableForm {
  name: string;
  maxDoses: string;
  effect: string;
}

const EMPTY_FORM: NewConsumableForm = {
  name: '',
  maxDoses: '',
  effect: '',
};

type FormMode = 'hidden' | 'inline' | 'expanded';

export function ConsumablesPanel({ character, updateCharacter }: ConsumablesPanelProps) {
  const [formMode, setFormMode] = useState<FormMode>('hidden');
  const [form, setForm] = useState<NewConsumableForm>(EMPTY_FORM);

  const consumables = character.consumables ?? [];

  const handleIncrement = (id: string) => {
    updateCharacter((char) => ({
      ...char,
      consumables: (char.consumables ?? []).map((c) =>
        c.id === id ? incrementDose(c) : c
      ),
    }));
  };

  const handleDecrement = (id: string) => {
    updateCharacter((char) => ({
      ...char,
      consumables: (char.consumables ?? []).map((c) =>
        c.id === id ? decrementDose(c) : c
      ),
    }));
  };

  const handleDelete = (id: string) => {
    updateCharacter((char) => ({
      ...char,
      consumables: (char.consumables ?? []).filter((c) => c.id !== id),
    }));
  };

  const isFormValid = () => {
    const maxDoses = parseInt(form.maxDoses, 10);
    return form.name.trim() !== '' && !isNaN(maxDoses) && maxDoses > 0;
  };

  const handleSubmit = () => {
    if (!isFormValid()) return;

    const maxDoses = parseInt(form.maxDoses, 10);
    const newConsumable: Consumable = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      currentDoses: maxDoses,
      maxDoses,
      effect: form.effect.trim(),
    };

    updateCharacter((char) => ({
      ...char,
      consumables: [...(char.consumables ?? []), newConsumable],
    }));

    setForm(EMPTY_FORM);
    setFormMode('hidden');
  };

  const handleCancel = () => {
    setForm(EMPTY_FORM);
    setFormMode('hidden');
  };

  return (
    <Card>
      <div className={styles.container}>
        {/* Consumables List */}
        {consumables.length === 0 ? (
          <div className={styles.emptyState}>
            No consumables tracked. Tap + to add.
          </div>
        ) : (
          <div className={styles.consumableList}>
            {consumables.map((item) => (
              <div
                key={item.id}
                className={
                  item.currentDoses === 0
                    ? styles.consumableItemDepleted
                    : styles.consumableItem
                }
              >
                <div className={styles.itemHeader}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span
                    className={
                      item.currentDoses === 0
                        ? styles.doseBadgeDepleted
                        : styles.doseBadge
                    }
                  >
                    {item.currentDoses}/{item.maxDoses}
                  </span>
                </div>
                {item.effect && (
                  <div className={styles.itemEffect}>{item.effect}</div>
                )}
                <div className={styles.itemActions}>
                  <button
                    type="button"
                    className={styles.decrementBtn}
                    onClick={() => handleDecrement(item.id)}
                    disabled={item.currentDoses === 0}
                    aria-label={`Use one dose of ${item.name}`}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className={styles.incrementBtn}
                    onClick={() => handleIncrement(item.id)}
                    disabled={item.currentDoses === item.maxDoses}
                    aria-label={`Restore one dose of ${item.name}`}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Consumable Form */}
        {formMode !== 'hidden' ? (
          <div className={styles.addForm}>
            <div className={styles.inlineRow}>
              <input
                type="text"
                className={styles.inlineInput}
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                aria-label="Consumable name"
              />
              <input
                type="number"
                className={styles.inlineDosesInput}
                placeholder="Doses"
                min="1"
                value={form.maxDoses}
                onChange={(e) => setForm({ ...form, maxDoses: e.target.value })}
                aria-label="Max doses"
              />
              <button
                type="button"
                className={styles.inlineAddBtn}
                onClick={handleSubmit}
                disabled={!isFormValid()}
                aria-label="Add consumable"
              >
                Add
              </button>
            </div>

            {formMode === 'expanded' && (
              <div className={styles.expandedFields}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Effect</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g. Heals 1d10 wounds"
                    value={form.effect}
                    onChange={(e) => setForm({ ...form, effect: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className={styles.formFooter}>
              {formMode === 'inline' ? (
                <button
                  type="button"
                  className={styles.moreOptionsBtn}
                  onClick={() => setFormMode('expanded')}
                >
                  More options
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.moreOptionsBtn}
                  onClick={() => setFormMode('inline')}
                >
                  Fewer options
                </button>
              )}
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={styles.addToggleBtn}
            onClick={() => setFormMode('inline')}
          >
            + Add Consumable
          </button>
        )}
      </div>
    </Card>
  );
}
