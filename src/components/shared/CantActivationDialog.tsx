import { useState } from 'react';
import type { CantEntry } from '../../data/cants';
import styles from './CantActivationDialog.module.css';

interface CantActivationDialogProps {
  cant: CantEntry;
  availableSL: number;
  wpBonus: number;
  onConfirm: (slSpent: number) => void;
  onCancel: () => void;
}

/**
 * A modal dialog for variable-SL Cants where the user can choose
 * how much SL to spend (between the Cant's minimum cost and the
 * lesser of available SL or WP Bonus).
 *
 * Only rendered for Cants with `variableSL: true`.
 */
export function CantActivationDialog({
  cant,
  availableSL,
  wpBonus,
  onConfirm,
  onCancel,
}: CantActivationDialogProps) {
  const min = cant.slCost;
  const max = Math.min(availableSL, wpBonus);
  const [slSpent, setSlSpent] = useState(min);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value, 10);
    if (Number.isNaN(raw)) return;
    // Clamp the value to valid bounds
    const clamped = Math.max(min, Math.min(max, raw));
    setSlSpent(clamped);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(slSpent);
  };

  return (
    <div className={styles.overlay} onClick={onCancel} role="dialog" aria-label={`Activate ${cant.name}`}>
      <form className={styles.dialog} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 className={styles.title}>{cant.name}</h3>
        <p className={styles.effect}>{cant.effect}</p>

        <div className={styles.context}>
          <span>Available SL: {availableSL}</span>
          <span>Willpower Bonus: {wpBonus}</span>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="cant-sl-input">
            SL to spend:
          </label>
          <input
            id="cant-sl-input"
            type="number"
            className={styles.slInput}
            min={min}
            max={max}
            value={slSpent}
            onChange={handleChange}
            aria-label={`SL to spend, minimum ${min}, maximum ${max}`}
          />
          <span className={styles.inputLabel}>({min}–{max})</span>
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={onCancel} className={styles.cancelBtn}>
            Cancel
          </button>
          <button type="submit" className={styles.confirmBtn} disabled={max < min}>
            Activate
          </button>
        </div>
      </form>
    </div>
  );
}
