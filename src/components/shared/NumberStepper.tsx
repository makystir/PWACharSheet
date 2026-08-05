import styles from './NumberStepper.module.css';

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
}

export function NumberStepper({ value, onChange, min, max, label }: NumberStepperProps) {
  const atMin = min !== undefined && value <= min;
  const atMax = max !== undefined && value >= max;

  const decrement = () => {
    if (min !== undefined) {
      onChange(Math.max(min, value - 1));
    } else {
      onChange(value - 1);
    }
  };

  const increment = () => {
    if (max !== undefined) {
      onChange(Math.min(max, value + 1));
    } else {
      onChange(value + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value, 10);
    if (isNaN(raw)) return;
    let clamped = raw;
    if (min !== undefined) clamped = Math.max(min, clamped);
    if (max !== undefined) clamped = Math.min(max, clamped);
    onChange(clamped);
  };

  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.button}
        onClick={decrement}
        disabled={atMin}
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <input
        type="number"
        className={styles.input}
        value={value}
        onChange={handleInputChange}
        min={min}
        max={max}
        aria-label={label}
      />
      <button
        type="button"
        className={styles.button}
        onClick={increment}
        disabled={atMax}
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  );
}
