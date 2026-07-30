import { useState } from 'react';
import type { PsychologyTrait } from '../../types/character';
import styles from './PsychologyTracker.module.css';

/** Psychology types relevant to the Archives Vol. II tracker */
const TRACKER_TYPES = ['Phobia', 'Animosity', 'Hatred', 'Trauma'] as const;
type TrackerType = typeof TRACKER_TYPES[number];

export interface PsychologyTrackerProps {
  psychologyTraits: PsychologyTrait[];
  brokenTally: number;
  wpValue: number;
  onAddTrait: (type: string, target: string, rating?: number) => void;
  onRemoveTrait: (id: string) => void;
  onIncrementBrokenTally: () => void;
}

function getTargetPlaceholder(type: TrackerType): string {
  switch (type) {
    case 'Phobia': return 'e.g. Spiders, Heights, Fire';
    case 'Animosity': return 'e.g. Greenskins, Elves';
    case 'Hatred': return 'e.g. Undead, Skaven';
    case 'Trauma': return 'Describe the traumatic experience';
  }
}

function requiresTarget(type: TrackerType | ''): boolean {
  return type === 'Phobia' || type === 'Animosity' || type === 'Hatred' || type === 'Trauma';
}

export function PsychologyTracker({
  psychologyTraits,
  brokenTally,
  wpValue,
  onAddTrait,
  onRemoveTrait,
  onIncrementBrokenTally,
}: PsychologyTrackerProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<TrackerType | ''>('');
  const [target, setTarget] = useState('');
  const [rating, setRating] = useState('');

  const thresholdReached = brokenTally >= wpValue;

  const handleSubmit = () => {
    if (!selectedType || !target.trim()) return;
    const ratingNum = rating ? Number(rating) : undefined;
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

  const isFormValid = selectedType !== '' && target.trim().length > 0;

  return (
    <div className={styles.container} aria-label="Psychology Tracker">
      {/* Summary: Broken Tally & Phobia Threshold */}
      <div className={styles.summaryBar} role="group" aria-label="Psychology summary">
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Broken Tally</span>
          <div className={styles.tallyControls}>
            <span
              className={thresholdReached ? styles.summaryValueDanger : styles.summaryValue}
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

      {/* Phobia Acquisition Alert */}
      {thresholdReached && (
        <div className={styles.alertBanner} role="alert" aria-live="assertive">
          <span className={styles.alertIcon}>⚠</span>
          <span>Broken Tally has reached WP — a Phobia has been acquired!</span>
        </div>
      )}

      {/* Trait List */}
      {psychologyTraits.length === 0 ? (
        <div className={styles.emptyState}>
          No psychology entries recorded.
        </div>
      ) : (
        <div className={styles.traitList} role="list" aria-label="Psychology traits">
          {psychologyTraits.map((trait) => (
            <div key={trait.id} className={styles.traitItem} role="listitem">
              <div className={styles.traitInfo}>
                <span className={styles.traitType}>{trait.type}</span>
                {trait.target && (
                  <span className={styles.traitTarget}>({trait.target})</span>
                )}
                {trait.rating !== undefined && trait.rating > 0 && (
                  <span className={styles.traitRating}>Rating {trait.rating}</span>
                )}
              </div>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => onRemoveTrait(trait.id)}
                aria-label={`Remove ${trait.type} entry: ${trait.target || ''}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Trait Form */}
      {showForm ? (
        <div className={styles.addForm} aria-label="Add psychology entry form">
          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="psych-tracker-type">Type</label>
            <select
              id="psych-tracker-type"
              className={styles.formSelect}
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value as TrackerType | '');
                setTarget('');
                setRating('');
              }}
            >
              <option value="">Select type…</option>
              {TRACKER_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {requiresTarget(selectedType) && selectedType !== '' && (
            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="psych-tracker-target">
                {selectedType === 'Trauma' ? 'Description' : 'Target'}
              </label>
              <input
                id="psych-tracker-target"
                type="text"
                className={styles.formInput}
                placeholder={getTargetPlaceholder(selectedType as TrackerType)}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
          )}

          {selectedType !== '' && (
            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="psych-tracker-rating">Rating (optional)</label>
              <input
                id="psych-tracker-rating"
                type="number"
                className={styles.formInput}
                placeholder="e.g. 2"
                min="1"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              />
            </div>
          )}

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={!isFormValid}
              aria-label="Add psychology entry"
            >
              Add Entry
            </button>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleCancel}
              aria-label="Cancel adding entry"
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
          aria-label="Add new psychology entry"
        >
          + Add Psychology Entry
        </button>
      )}
    </div>
  );
}
