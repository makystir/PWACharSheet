import { useState } from 'react';
import type { Character, GrudgeEntry, GrudgeType } from '../../types/character';
import {
  isGrudgePanelVisible,
  canAddPartyGrudge,
  validateGrudgeForm,
  createGrudgeEntry,
  satisfyGrudge,
  deleteGrudge,
  sortGrudges,
  getGrudgeXP,
} from '../../logic/grudges';
import type { GrudgeFormData, ValidationResult } from '../../logic/grudges';
import { Card } from './Card';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './GrudgePanel.module.css';

interface GrudgePanelProps {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

const EMPTY_FORM: GrudgeFormData = {
  offence: '',
  perpetrator: '',
  restitution: '',
  type: 'standard',
  isPartyGrudge: false,
};

export function GrudgePanel({ character, updateCharacter }: GrudgePanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GrudgeFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<ValidationResult['errors']>([]);
  const [limitMessage, setLimitMessage] = useState('');
  const [xpConfirmation, setXpConfirmation] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  if (!isGrudgePanelVisible(character)) {
    return null;
  }

  const grudges = character.grudges ?? [];
  const sorted = sortGrudges(grudges);

  const getFieldError = (field: string) =>
    errors.find((e) => e.field === field)?.message;

  const handleSubmit = () => {
    const result = validateGrudgeForm(form);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }

    if (form.isPartyGrudge && !canAddPartyGrudge(grudges)) {
      setLimitMessage('Maximum of 3 outstanding party grudges reached.');
      setErrors([]);
      return;
    }

    updateCharacter((char) => createGrudgeEntry(char, form));
    setForm(EMPTY_FORM);
    setErrors([]);
    setLimitMessage('');
    setShowForm(false);
  };

  const handleSatisfy = (grudge: GrudgeEntry) => {
    updateCharacter((char) => satisfyGrudge(char, grudge.id));
    const xp = getGrudgeXP(grudge.type);
    setXpConfirmation(`✓ Grudge satisfied — ${xp} XP earned`);
    setTimeout(() => setXpConfirmation(null), 4000);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      updateCharacter((char) => deleteGrudge(char, deleteTarget));
      setDeleteTarget(null);
    }
  };

  const handleCancel = () => {
    setForm(EMPTY_FORM);
    setErrors([]);
    setLimitMessage('');
    setShowForm(false);
  };

  return (
    <Card>
      <div className={styles.container}>
        {/* XP Reference Header */}
        <div className={styles.xpHeader}>
          <span className={styles.xpBadge}>
            Standard: <span className={styles.xpValue}>25 XP</span>
          </span>
          <span className={styles.xpBadge}>
            Blood: <span className={styles.xpValue}>50 XP</span>
          </span>
        </div>

        {/* Grudge List */}
        {sorted.length === 0 ? (
          <div className={styles.emptyState}>
            No grudges recorded. The Book of Grudges awaits.
          </div>
        ) : (
          <div className={styles.grudgeList}>
            {sorted.map((grudge) => (
              <div
                key={grudge.id}
                className={
                  grudge.status === 'satisfied'
                    ? styles.grudgeItemSatisfied
                    : styles.grudgeItem
                }
              >
                <div className={styles.grudgeItemHeader}>
                  <span className={styles.grudgeOffence}>{grudge.offence}</span>
                  {grudge.type === 'blood' && (
                    <span className={styles.bloodIndicator}>
                      <span className={styles.bloodIcon} aria-hidden="true">⚔</span>
                      Blood
                    </span>
                  )}
                  {grudge.isPartyGrudge && (
                    <span className={styles.partyBadge}>Party</span>
                  )}
                </div>
                <div className={styles.grudgeDetails}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Perpetrator:</span>
                    <span className={styles.detailValue}>{grudge.perpetrator}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Restitution:</span>
                    <span className={styles.detailValue}>{grudge.restitution}</span>
                  </div>
                </div>
                <div className={styles.grudgeActions}>
                  {grudge.status === 'outstanding' && (
                    <button
                      type="button"
                      className={styles.satisfyBtn}
                      onClick={() => handleSatisfy(grudge)}
                      aria-label={`Satisfy grudge: ${grudge.offence}`}
                    >
                      ✓ Satisfy
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => setDeleteTarget(grudge.id)}
                    aria-label={`Delete grudge: ${grudge.offence}`}
                  >
                    ✕ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* XP Confirmation */}
        {xpConfirmation && (
          <div className={styles.xpConfirmation}>{xpConfirmation}</div>
        )}

        {/* Add Grudge Form */}
        {showForm ? (
          <div className={styles.addForm}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Offence</label>
              <input
                type="text"
                className={getFieldError('offence') ? styles.formInputError : styles.formInput}
                placeholder="What wrong was done?"
                value={form.offence}
                onChange={(e) => setForm({ ...form, offence: e.target.value })}
              />
              {getFieldError('offence') && (
                <span className={styles.fieldError}>{getFieldError('offence')}</span>
              )}
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Perpetrator</label>
              <input
                type="text"
                className={getFieldError('perpetrator') ? styles.formInputError : styles.formInput}
                placeholder="Who did it?"
                value={form.perpetrator}
                onChange={(e) => setForm({ ...form, perpetrator: e.target.value })}
              />
              {getFieldError('perpetrator') && (
                <span className={styles.fieldError}>{getFieldError('perpetrator')}</span>
              )}
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Restitution</label>
              <input
                type="text"
                className={getFieldError('restitution') ? styles.formInputError : styles.formInput}
                placeholder="What is required?"
                value={form.restitution}
                onChange={(e) => setForm({ ...form, restitution: e.target.value })}
              />
              {getFieldError('restitution') && (
                <span className={styles.fieldError}>{getFieldError('restitution')}</span>
              )}
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Type</label>
              <div className={styles.typeSelector}>
                <button
                  type="button"
                  className={form.type === 'standard' ? styles.typeBtnActive : styles.typeBtn}
                  onClick={() => setForm({ ...form, type: 'standard' as GrudgeType })}
                >
                  Standard (25 XP)
                </button>
                <button
                  type="button"
                  className={form.type === 'blood' ? styles.typeBtnActive : styles.typeBtn}
                  onClick={() => setForm({ ...form, type: 'blood' as GrudgeType })}
                >
                  Blood (50 XP)
                </button>
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.isPartyGrudge}
                  onChange={(e) => setForm({ ...form, isPartyGrudge: e.target.checked })}
                />
                <span className={styles.checkboxLabel}>Party Grudge (shared by all Dwarfs in the party)</span>
              </label>
            </div>

            {limitMessage && (
              <div className={styles.limitWarning}>{limitMessage}</div>
            )}

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.submitBtn}
                onClick={handleSubmit}
              >
                Record Grudge
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
            + Add Grudge
          </button>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          message="Remove this grudge from the Book of Grudges? This cannot be undone."
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          confirmLabel="Delete"
          cancelLabel="Cancel"
        />
      )}
    </Card>
  );
}
