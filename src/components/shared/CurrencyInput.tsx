import { useState, type FormEvent } from 'react';
import { parseCurrencyInput, type CurrencyDelta } from '../../logic/currency';
import styles from './CurrencyInput.module.css';

export interface CurrencyInputProps {
  onSubmit: (deltas: CurrencyDelta) => void;
}

export function CurrencyInput({ onSubmit }: CurrencyInputProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmed = value.trim();
    if (!trimmed) {
      setError('Enter amounts like "+2GC -5SS +10D"');
      return;
    }

    const result = parseCurrencyInput(trimmed);
    if (result === null) {
      setError('Invalid format. Use amounts like "+2GC -5SS +10D"');
      return;
    }

    onSubmit(result);
    setValue('');
    setError(null);
  }

  function handleChange(input: string) {
    setValue(input);
    if (error) {
      setError(null);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.inputRow}>
        <input
          type="text"
          className={styles.input}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          maxLength={60}
          placeholder="e.g. +2GC -5SS +10D"
          aria-label="Currency adjustment"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'currency-input-error' : undefined}
        />
        <button type="submit" className={styles.submitButton}>
          Apply
        </button>
      </div>
      {error && (
        <p id="currency-input-error" className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
