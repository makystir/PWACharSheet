import { useState } from 'react';
import { lookupDwarfAlternateTable } from '../../logic/personal-details';
import { DWARF_ALTERNATE_TABLE, DWARF_DISTINGUISHING_FEATURES } from '../../data/personal-details';
import styles from './DwarfAlternateRoll.module.css';

interface DwarfAlternateRollProps {
  variant: string;
  onHairUpdate: (hair: string) => void;
  onEyesUpdate: (eyes: string) => void;
  onFeatureUpdate?: (feature: string) => void;
  disabled?: boolean;
}

export function DwarfAlternateRoll({
  variant,
  onHairUpdate,
  onEyesUpdate,
  onFeatureUpdate,
  disabled = false,
}: DwarfAlternateRollProps) {
  const [pendingFeature, setPendingFeature] = useState<string | null>(null);

  const handleRoll = () => {
    if (disabled) return;

    const roll = Math.floor(Math.random() * 100) + 1;
    const result = lookupDwarfAlternateTable(roll, variant);

    onHairUpdate(result.hair);
    onEyesUpdate(result.eyes);
    setPendingFeature(result.feature);
  };

  const handleConfirm = () => {
    if (pendingFeature && onFeatureUpdate) {
      onFeatureUpdate(pendingFeature);
    }
    setPendingFeature(null);
  };

  const handleDismiss = () => {
    setPendingFeature(null);
  };

  const handleFeatureRoll = () => {
    if (disabled || !onFeatureUpdate) return;

    const roll = Math.floor(Math.random() * 100) + 1;
    const row = DWARF_ALTERNATE_TABLE.find(
      r => roll >= r.min && roll <= r.max
    )!;
    onFeatureUpdate(row.feature);
  };

  const handleFeatureSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (disabled || !onFeatureUpdate) return;
    const value = e.target.value;
    if (value) {
      onFeatureUpdate(value);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.rollRow}>
        <button
          type="button"
          className={`${styles.rollButton}${disabled ? ` ${styles.disabled}` : ''}`}
          onClick={handleRoll}
          aria-disabled={disabled ? 'true' : undefined}
          aria-label="Alternate Table Roll"
        >
          🎲 Alternate Table Roll
        </button>
      </div>

      {pendingFeature && (
        <div className={styles.featureConfirm}>
          <span className={styles.featureLabel}>
            Feature: {pendingFeature}
          </span>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={handleConfirm}
            aria-label="Confirm feature"
          >
            ✓
          </button>
          <button
            type="button"
            className={styles.dismissButton}
            onClick={handleDismiss}
            aria-label="Dismiss feature"
          >
            ✗
          </button>
        </div>
      )}

      <div className={styles.featureRow}>
        <button
          type="button"
          className={`${styles.rollButton}${disabled ? ` ${styles.disabled}` : ''}`}
          onClick={handleFeatureRoll}
          aria-disabled={disabled ? 'true' : undefined}
          aria-label="Roll Feature"
        >
          🎲 Roll Feature
        </button>
        <select
          className={`${styles.featureSelect}${disabled ? ` ${styles.disabled}` : ''}`}
          value=""
          onChange={handleFeatureSelect}
          disabled={disabled}
          aria-label="Select distinguishing feature"
        >
          <option value="" disabled>
            Select Feature…
          </option>
          {DWARF_DISTINGUISHING_FEATURES.map((feature) => (
            <option key={feature} value={feature}>
              {feature}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
