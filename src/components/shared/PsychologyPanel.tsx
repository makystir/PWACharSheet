import { useState } from 'react';
import type { Character, PsychologyTrait, PsychologyType } from '../../types/character';
import { validatePsychologyTrait, PSYCHOLOGY_REMINDERS } from '../../logic/psychology';
import { Card } from './Card';
import styles from './PsychologyPanel.module.css';

interface PsychologyPanelProps {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

const PSYCHOLOGY_TYPES: PsychologyType[] = [
  'Animosity', 'Hatred', 'Fear', 'Terror', 'Frenzy', 'Prejudice'
];

function requiresTarget(type: PsychologyType | ''): boolean {
  return type === 'Animosity' || type === 'Hatred' || type === 'Prejudice';
}

function requiresRating(type: PsychologyType | ''): boolean {
  return type === 'Fear' || type === 'Terror';
}

export function PsychologyPanel({ character, updateCharacter }: PsychologyPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<PsychologyType | ''>('');
  const [target, setTarget] = useState('');
  const [rating, setRating] = useState('');

  const traits = character.psychologyTraits ?? [];

  const handleSubmit = () => {
    const ratingNum = rating ? Number(rating) : undefined;
    if (!validatePsychologyTrait(selectedType, target, ratingNum)) {
      return;
    }

    const newTrait: PsychologyTrait = {
      id: crypto.randomUUID(),
      type: selectedType as PsychologyType,
      target: target.trim(),
      rating: ratingNum,
    };

    updateCharacter((char) => ({
      ...char,
      psychologyTraits: [...(char.psychologyTraits ?? []), newTrait],
    }));

    setSelectedType('');
    setTarget('');
    setRating('');
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    updateCharacter((char) => ({
      ...char,
      psychologyTraits: (char.psychologyTraits ?? []).filter((t) => t.id !== id),
    }));
  };

  const handleCancel = () => {
    setSelectedType('');
    setTarget('');
    setRating('');
    setShowForm(false);
  };

  const isFormValid = validatePsychologyTrait(
    selectedType,
    target,
    rating ? Number(rating) : undefined
  );

  return (
    <Card>
      <div className={styles.container}>
        {/* Trait List */}
        {traits.length === 0 ? (
          <div className={styles.emptyState}>
            No psychology traits recorded.
          </div>
        ) : (
          <div className={styles.traitList}>
            {traits.map((trait) => (
              <div key={trait.id} className={styles.traitItem}>
                <div className={styles.traitHeader}>
                  <span className={styles.traitType}>{trait.type}</span>
                  {requiresTarget(trait.type) && trait.target && (
                    <span className={styles.traitTarget}>({trait.target})</span>
                  )}
                  {requiresRating(trait.type) && trait.rating !== undefined && (
                    <span className={styles.traitRating}>Rating {trait.rating}</span>
                  )}
                </div>
                <div className={styles.traitReminder}>
                  {PSYCHOLOGY_REMINDERS[trait.type]}
                </div>
                <div className={styles.traitActions}>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(trait.id)}
                    aria-label={`Remove ${trait.type} trait`}
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Trait Form */}
        {showForm ? (
          <div className={styles.addForm}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Type</label>
              <select
                className={styles.formSelect}
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value as PsychologyType | '');
                  setTarget('');
                  setRating('');
                }}
              >
                <option value="">Select type…</option>
                {PSYCHOLOGY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {requiresTarget(selectedType) && (
              <div className={styles.formField}>
                <label className={styles.formLabel}>Target</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g. Greenskins, Undead"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </div>
            )}

            {requiresRating(selectedType) && (
              <div className={styles.formField}>
                <label className={styles.formLabel}>Rating</label>
                <input
                  type="number"
                  className={styles.formInput}
                  placeholder="e.g. 2"
                  min="1"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                />
              </div>
            )}

            {selectedType && (
              <div className={styles.reminderPreview}>
                <span className={styles.reminderLabel}>Reminder:</span>{' '}
                {PSYCHOLOGY_REMINDERS[selectedType as PsychologyType]}
              </div>
            )}

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={!isFormValid}
              >
                Add Trait
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
            + Add Psychology Trait
          </button>
        )}
      </div>
    </Card>
  );
}
