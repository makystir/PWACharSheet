import { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import styles from './EditableField.module.css';

interface EditableFieldProps {
  label: string;
  value: string | number;
  type?: 'text' | 'number';
  onSave: (value: string | number) => void;
  style?: CSSProperties;
}

export function EditableField({ label, value, type = 'text', onSave, style }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const handleSave = () => {
    setEditing(false);
    const newValue = type === 'number' ? Number(draft) || 0 : draft;
    onSave(newValue);
  };

  return (
    <div className={styles.container} style={style}>
      <span className={styles.label}>{label}</span>
      {editing ? (
        <input
          ref={inputRef}
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') { setDraft(String(value)); setEditing(false); }
          }}
          className={styles.input}
        />
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setEditing(true)}
          onKeyDown={(e) => { if (e.key === 'Enter') setEditing(true); }}
          className={styles.display}
        >
          {value || '—'}
        </div>
      )}
    </div>
  );
}
