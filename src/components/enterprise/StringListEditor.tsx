import { useState } from 'react';
import styles from './StringListEditor.module.css';

interface StringListEditorProps {
  label: string;
  items: string[];
  onChange: (updated: string[]) => void;
  maxItems: number;
  maxLength: number;
  placeholder?: string;
}

export function StringListEditor({
  label,
  items,
  onChange,
  maxItems,
  maxLength,
  placeholder,
}: StringListEditorProps) {
  // Track local edits per index so we don't persist on every keystroke
  const [localEdits, setLocalEdits] = useState<Record<number, string>>({});

  const handleChange = (index: number, value: string) => {
    setLocalEdits((prev) => ({ ...prev, [index]: value }));
  };

  const handleBlur = (index: number) => {
    const raw = localEdits[index];
    if (raw === undefined) return; // No local edit happened

    const truncated = raw.slice(0, maxLength);
    const updated = [...items];
    updated[index] = truncated;
    onChange(updated);

    // Clear local edit state for this index
    setLocalEdits((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleRemove = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
    // Clear any stale local edits
    setLocalEdits({});
  };

  const handleAdd = () => {
    if (items.length >= maxItems) return;
    onChange([...items, '']);
  };

  const useTextarea = maxLength > 200;
  const atLimit = items.length >= maxItems;

  return (
    <div className={styles.container}>
      <span className={styles.label}>{label}</span>
      <div className={styles.list}>
        {items.map((item, index) => {
          const value = localEdits[index] ?? item;
          const InputElement = useTextarea ? 'textarea' : 'input';
          return (
            <div key={index} className={styles.item}>
              <InputElement
                className={useTextarea ? styles.itemTextarea : styles.itemInput}
                value={value}
                onChange={(e) => handleChange(index, e.target.value)}
                onBlur={() => handleBlur(index)}
                placeholder={placeholder}
                maxLength={maxLength}
                {...(!useTextarea && { type: 'text' })}
              />
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => handleRemove(index)}
                aria-label={`Remove ${label} item ${index + 1}`}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className={styles.addBtn}
        onClick={handleAdd}
        disabled={atLimit}
      >
        + Add {label.replace(/s$/, '')}
      </button>
    </div>
  );
}
