import { useState } from 'react';
import type { OvercastOption } from '../../logic/spell-casting';
import styles from './OvercastAllocator.module.css';

interface OvercastAllocatorProps {
  options: OvercastOption[];
  availableSlots: number;
  onAllocate: (allocations: Record<string, number>) => void;
}

export function OvercastAllocator({ options, availableSlots, onAllocate }: OvercastAllocatorProps) {
  const initialAllocations: Record<string, number> = {};
  for (const opt of options) {
    if (opt.enabled) {
      initialAllocations[opt.category] = 0;
    }
  }

  const [allocations, setAllocations] = useState<Record<string, number>>(initialAllocations);

  const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + v, 0);

  const increment = (category: string) => {
    if (totalAllocated >= availableSlots) return;
    setAllocations((prev) => ({ ...prev, [category]: (prev[category] ?? 0) + 1 }));
  };

  const decrement = (category: string) => {
    if ((allocations[category] ?? 0) <= 0) return;
    setAllocations((prev) => ({ ...prev, [category]: (prev[category] ?? 0) - 1 }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        Overcasting ({availableSlots} slot{availableSlots !== 1 ? 's' : ''})
      </div>

      {options.map((opt) => (
        <div key={opt.category} className={styles.row}>
          {opt.enabled ? (
            <>
              <div>
                <span className={styles.label}>{opt.label}</span>
                <span className={styles.baseValue}>({opt.baseValue})</span>
              </div>
              <div className={styles.controls}>
                <button
                  type="button"
                  className={(allocations[opt.category] ?? 0) <= 0 ? styles.stepBtnDisabled : styles.stepBtn}
                  disabled={(allocations[opt.category] ?? 0) <= 0}
                  onClick={() => decrement(opt.category)}
                  aria-label={`Decrease ${opt.label}`}
                >
                  −
                </button>
                <span className={styles.count}>{allocations[opt.category] ?? 0}</span>
                <button
                  type="button"
                  className={totalAllocated >= availableSlots ? styles.stepBtnDisabled : styles.stepBtn}
                  disabled={totalAllocated >= availableSlots}
                  onClick={() => increment(opt.category)}
                  aria-label={`Increase ${opt.label}`}
                >
                  +
                </button>
              </div>
            </>
          ) : (
            <div>
              <span className={styles.disabledLabel}>{opt.label}: </span>
              <span className={styles.naText}>N/A ({opt.baseValue})</span>
            </div>
          )}
        </div>
      ))}

      <div className={styles.total}>
        Allocated: {totalAllocated} / {availableSlots}
      </div>

      <button
        type="button"
        className={styles.confirmBtn}
        onClick={() => onAllocate(allocations)}
      >
        Confirm
      </button>
    </div>
  );
}
