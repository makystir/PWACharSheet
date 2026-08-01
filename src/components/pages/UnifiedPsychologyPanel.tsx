import { useState } from 'react';
import type { PsychologyTrait, PsychologyType } from '../../types/character';
import {
  ALL_PSYCHOLOGY_TYPES,
  PSYCHOLOGY_REMINDERS,
  requiresTarget,
  requiresRating,
  validatePsychologyTrait,
  isPhobiaAlertActive,
} from '../../logic/psychology';
import styles from './UnifiedPsychologyPanel.module.css';

export interface UnifiedPsychologyPanelProps {
  psychologyTraits: PsychologyTrait[];
  brokenTally: number;
  wpValue: number;
  onAddTrait: (type: string, target: string, rating?: number) => void;
  onRemoveTrait: (id: string) => void;
  onIncrementBrokenTally: () => void;
}

function getTargetPlaceholder(type: PsychologyType): string {
  switch (type) {
    case 'Phobia': return 'e.g. Spiders, Heights, Fire';
    case 'Animosity': return 'e.g. Greenskins, Elves';
    case 'Hatred': return 'e.g. Undead, Skaven';
    case 'Prejudice': return 'e.g. Mutants, Foreigners';
    case 'Trauma': return 'Describe the traumatic experience';
    default: return '';
  }
}

export function UnifiedPsychologyPanel({
  psychologyTraits,
  brokenTally,
  wpValue,
  onAddTrait,
  onRemoveTrait,
  onIncrementBrokenTally,
}: UnifiedPsychologyPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<PsychologyType | ''>('');
  const [target, setTarget] = useState('');
  const [rating, setRating] = useState('');

  const alertActive = isPhobiaAlertActive(brokenTally, wpValue);

  const handleSubmit = () => {
    const ratingNum = rating ? Number(rating) : undefined;
    if (!validatePsychologyTrait(selectedType, target, ratingNum)) {
      return;
    }
    onAddTrait(selectedType, target.trim(), ratingNum);
    setSelectedType('');
    setTarget('');
    setRating('');
    setShowForm(false);
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
    <div className={styles.container} aria-label="Unified Psychology Panel">
      {/* Section 1: Summary Bar */}
      <div className={styles.summaryBar} role="group" aria-label="Psychology summary">
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Broken Tally</span>
          <div className={styles.tallyControls}>
            <span
              className={alertActive ? styles.summaryValueDanger : styles.summaryValue}
              aria-live="polite"
            >
              {brokenTally}
            </span>
            <button
              type="button"
              className={styles.incrementBtn}
              onClick={onIncrementBrokenTally}
              aria-label="Increment broken tally"
            >
              +1
            </button>
          </div>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Phobia Threshold (WP)</span>
          <span className={styles.summaryValue}>{wpValue}</span>
        </div>
      </div>

      {/* Section 2: Phobia Acquisition Alert */}
      {alertActive && (
        <div className={styles.alertBanner} role="alert" aria-live="assertive">
          <span className={styles.alertIcon}>⚠</span>
          <span>Broken Tally has reached WP — a Phobia has been acquired!</span>
        </div>
      )}

      {/* Section 3: Trait List */}
      {psychologyTraits.length === 0 ? (
        <div className={styles.emptyState}>
          No psychology traits recorded.
        </div>
      ) : (
        <div className={styles.traitList} role="list" aria-label="Psychology traits">
          {psychologyTraits.map((trait) => (
            <div key={trait.id} className={styles.traitItem} role="listitem">
              <div className={styles.traitHeader}>
                <span className={styles.traitType}>{trait.type}</span>
                {trait.target && (
                  <span className={styles.traitTarget}>({trait.target})</span>
                )}
                {trait.rating !== undefined && trait.rating > 0 && (
                  <span className={styles.traitRating}>Rating {trait.rating}</span>
                )}
              </div>
              <div className={styles.traitReminder}>
                {PSYCHOLOGY_REMINDERS[trait.type]}
              </div>
              <div className={styles.traitActions}>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => onRemoveTrait(trait.id)}
                  aria-label={`Remove ${trait.type} trait: ${trait.target || trait.type}`}
                >
                  ✕ Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Section 4: Add Trait Form (collapsible) */}
      {showForm ? (
        <div className={styles.addForm} aria-label="Add psychology trait form">
          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="unified-psych-type">Type</label>
            <select
              id="unified-psych-type"
              className={styles.formSelect}
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value as PsychologyType | '');
                setTarget('');
                setRating('');
              }}
            >
              <option value="">Select type…</option>
              {ALL_PSYCHOLOGY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {requiresTarget(selectedType) && selectedType !== '' && (
            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="unified-psych-target">
                {selectedType === 'Trauma' ? 'Description' : 'Target'}
              </label>
              <input
                id="unified-psych-target"
                type="text"
                className={styles.formInput}
                placeholder={getTargetPlaceholder(selectedType as PsychologyType)}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
          )}

          {requiresRating(selectedType) && selectedType !== '' && (
            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="unified-psych-rating">Rating</label>
              <input
                id="unified-psych-rating"
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
            <div className={styles.reminderPreview} aria-label="Rule reminder preview">
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
              aria-label="Add psychology trait"
            >
              Add Trait
            </button>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleCancel}
              aria-label="Cancel adding trait"
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
          aria-label="Add new psychology trait"
        >
          + Add Psychology Trait
        </button>
      )}
    </div>
  );
}
