import { useState } from 'react';
import type { CriticalWound } from '../../types/character';
import type { HitLocation } from './hitLocationTable';
import type { CriticalWoundTableEntry } from '../../data/critical-wound-tables';
import { lookupCriticalWound } from '../../logic/critical-wounds';
import styles from './RollCriticalFlow.module.css';

const HIT_LOCATIONS: HitLocation[] = ['Head', 'Left Arm', 'Right Arm', 'Body', 'Left Leg', 'Right Leg'];

export interface RollCriticalFlowProps {
  preselectedLocation?: HitLocation;
  onConfirm: (wound: Omit<CriticalWound, 'id' | 'timestamp'>) => void;
  onCancel: () => void;
}

export function RollCriticalFlow({ preselectedLocation, onConfirm, onCancel }: RollCriticalFlowProps) {
  const [location, setLocation] = useState<HitLocation>(preselectedLocation ?? 'Head');
  const [rollInput, setRollInput] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<CriticalWoundTableEntry | null>(null);

  function validateRoll(value: string): { valid: boolean; roll?: number; error?: string } {
    if (value.trim() === '') {
      return { valid: false, error: '' };
    }
    const num = Number(value);
    if (!Number.isInteger(num)) {
      return { valid: false, error: 'Enter a whole number between 1 and 100' };
    }
    if (num < 1 || num > 100) {
      return { valid: false, error: 'Roll must be between 1 and 100' };
    }
    return { valid: true, roll: num };
  }

  function performLookup(roll: number) {
    const entry = lookupCriticalWound(location, roll);
    if (entry) {
      setPreview(entry);
      setError('');
    } else {
      setError('No matching wound entry found');
    }
  }

  function handleLookUp() {
    const result = validateRoll(rollInput);
    if (result.valid && result.roll !== undefined) {
      performLookup(result.roll);
    }
  }

  function handleRoll() {
    const roll = Math.floor(Math.random() * 100) + 1;
    setRollInput(String(roll));
    setError('');
    performLookup(roll);
  }

  function handleRollInputChange(value: string) {
    setRollInput(value);
    setPreview(null);
    const result = validateRoll(value);
    setError(result.error ?? '');
  }

  function handleConfirm() {
    if (!preview) return;
    onConfirm({
      location,
      description: preview.name,
      effects: preview.effect,
      severity: preview.severity,
      duration: '',
      healed: false,
    });
  }

  const validation = validateRoll(rollInput);
  const lookupDisabled = !validation.valid;

  if (preview) {
    return (
      <div className={styles.container}>
        <div className={styles.previewCard}>
          <div className={styles.previewHeader}>
            <span className={styles.previewName}>{preview.name}</span>
            <span className={styles.previewSeverity}>Severity {preview.severity}</span>
          </div>
          <div className={styles.previewEffect}>{preview.effect}</div>
          <div className={styles.previewLocation}>{location} — Roll: {rollInput}</div>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={handleConfirm}
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            Confirm
          </button>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.inputRow}>
        <label className={styles.label}>
          Location
          <select
            className={styles.select}
            value={location}
            onChange={(e) => setLocation(e.target.value as HitLocation)}
          >
            {HIT_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </label>
        <label className={styles.label}>
          d100 Roll
          <input
            type="number"
            className={styles.rollInput}
            min={1}
            max={100}
            value={rollInput}
            onChange={(e) => handleRollInputChange(e.target.value)}
            placeholder="1–100"
          />
        </label>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.rollBtn}
          onClick={handleRoll}
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          Roll
        </button>
        <button
          type="button"
          className={styles.lookupBtn}
          onClick={handleLookUp}
          disabled={lookupDisabled}
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          Look Up
        </button>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={onCancel}
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
