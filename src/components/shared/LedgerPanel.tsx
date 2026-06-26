import { useState } from 'react';
import type { Character, LedgerEntry } from '../../types/character';
import { applyLedgerEntry } from '../../logic/currency';
import { Card } from './Card';
import styles from './LedgerPanel.module.css';

interface LedgerPanelProps {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

interface NewEntryForm {
  description: string;
  gc: string;
  ss: string;
  d: string;
  type: 'income' | 'expense';
}

const EMPTY_FORM: NewEntryForm = {
  description: '',
  gc: '',
  ss: '',
  d: '',
  type: 'income',
};

function formatAmount(amount: { gc: number; ss: number; d: number }): string {
  const parts: string[] = [];
  if (amount.gc > 0) parts.push(`${amount.gc} GC`);
  if (amount.ss > 0) parts.push(`${amount.ss} SS`);
  if (amount.d > 0) parts.push(`${amount.d} D`);
  return parts.length > 0 ? parts.join(' / ') : '0';
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function LedgerPanel({ character, updateCharacter }: LedgerPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewEntryForm>(EMPTY_FORM);
  const [validationError, setValidationError] = useState('');

  const ledger = character.estate.ledger ?? [];

  // Display newest first
  const sortedLedger = [...ledger].sort((a, b) => b.timestamp - a.timestamp);

  const getTotalAmount = (): number => {
    const gc = parseInt(form.gc, 10) || 0;
    const ss = parseInt(form.ss, 10) || 0;
    const d = parseInt(form.d, 10) || 0;
    return gc + ss + d;
  };

  const isFormValid = (): boolean => {
    return form.description.trim() !== '' && getTotalAmount() > 0;
  };

  const handleSubmit = () => {
    const gc = parseInt(form.gc, 10) || 0;
    const ss = parseInt(form.ss, 10) || 0;
    const d = parseInt(form.d, 10) || 0;
    const total = gc + ss + d;

    if (total <= 0) {
      setValidationError('Amount must be greater than zero.');
      return;
    }

    if (form.description.trim() === '') {
      setValidationError('Description is required.');
      return;
    }

    const newEntry: LedgerEntry = {
      timestamp: Date.now(),
      type: form.type,
      description: form.description.trim(),
      amount: { gc, ss, d },
    };

    updateCharacter((char) => {
      const currentTreasury = {
        gc: char.estate.treasury.gc || 0,
        ss: char.estate.treasury.ss || 0,
        d: char.estate.treasury.d || 0,
      };
      const newTreasury = applyLedgerEntry(currentTreasury, newEntry.amount, newEntry.type as 'income' | 'expense');

      return {
        ...char,
        estate: {
          ...char.estate,
          ledger: [...(char.estate.ledger ?? []), newEntry],
          treasury: newTreasury,
        },
      };
    });

    setForm(EMPTY_FORM);
    setValidationError('');
    setShowForm(false);
  };

  const handleDelete = (timestamp: number) => {
    updateCharacter((char) => ({
      ...char,
      estate: {
        ...char.estate,
        ledger: (char.estate.ledger ?? []).filter(
          (entry) => entry.timestamp !== timestamp
        ),
      },
    }));
  };

  const handleCancel = () => {
    setForm(EMPTY_FORM);
    setValidationError('');
    setShowForm(false);
  };

  return (
    <Card>
      <div className={styles.container}>
        {/* Ledger List */}
        {sortedLedger.length === 0 ? (
          <div className={styles.emptyState}>
            No transactions recorded. Add income or expense entries to track your finances.
          </div>
        ) : (
          <div className={styles.ledgerList}>
            {sortedLedger.map((entry) => (
              <div key={entry.timestamp} className={styles.ledgerEntry}>
                <div className={styles.entryHeader}>
                  <span className={styles.entryDescription}>
                    {entry.description}
                  </span>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(entry.timestamp)}
                    aria-label={`Delete entry: ${entry.description}`}
                  >
                    ✕
                  </button>
                </div>
                <div className={styles.entryDetails}>
                  <span className={styles.entryTimestamp}>
                    {formatTimestamp(entry.timestamp)}
                  </span>
                  <span className={styles.entryAmount}>
                    {formatAmount(entry.amount)}
                  </span>
                  <span
                    className={
                      entry.type === 'income'
                        ? styles.entryTypeIncome
                        : styles.entryTypeExpense
                    }
                  >
                    {entry.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Entry Form */}
        {showForm ? (
          <div className={styles.addForm}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Description</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="e.g. Sold loot from dungeon"
                value={form.description}
                onChange={(e) => {
                  setForm({ ...form, description: e.target.value });
                  setValidationError('');
                }}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Amount</label>
              <div className={styles.currencyRow}>
                <div className={styles.currencyField}>
                  <span className={styles.currencyLabel}>GC</span>
                  <input
                    type="number"
                    className={styles.currencyInput}
                    placeholder="0"
                    min="0"
                    value={form.gc}
                    onChange={(e) => {
                      setForm({ ...form, gc: e.target.value });
                      setValidationError('');
                    }}
                  />
                </div>
                <div className={styles.currencyField}>
                  <span className={styles.currencyLabel}>SS</span>
                  <input
                    type="number"
                    className={styles.currencyInput}
                    placeholder="0"
                    min="0"
                    value={form.ss}
                    onChange={(e) => {
                      setForm({ ...form, ss: e.target.value });
                      setValidationError('');
                    }}
                  />
                </div>
                <div className={styles.currencyField}>
                  <span className={styles.currencyLabel}>D</span>
                  <input
                    type="number"
                    className={styles.currencyInput}
                    placeholder="0"
                    min="0"
                    value={form.d}
                    onChange={(e) => {
                      setForm({ ...form, d: e.target.value });
                      setValidationError('');
                    }}
                  />
                </div>
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Type</label>
              <div className={styles.typeToggle}>
                <button
                  type="button"
                  className={
                    form.type === 'income'
                      ? styles.typeBtnActiveIncome
                      : styles.typeBtn
                  }
                  onClick={() => setForm({ ...form, type: 'income' })}
                >
                  Income
                </button>
                <button
                  type="button"
                  className={
                    form.type === 'expense'
                      ? styles.typeBtnActiveExpense
                      : styles.typeBtn
                  }
                  onClick={() => setForm({ ...form, type: 'expense' })}
                >
                  Expense
                </button>
              </div>
            </div>

            {validationError && (
              <div className={styles.validationMsg}>{validationError}</div>
            )}

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={!isFormValid()}
              >
                Add Entry
              </button>
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
            onClick={() => setShowForm(true)}
          >
            + Add Transaction
          </button>
        )}
      </div>
    </Card>
  );
}
