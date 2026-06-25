import { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import styles from './EditableField.module.css';

interface EditableFieldProps {
  label: string;
  value: string | number;
  type?: 'text' | 'number';
  mode?: 'tap-to-edit' | 'always-editable';
  onSave: (value: string | number) => void;
  style?: CSSProperties;
}

export function EditableField({ label, value, type = 'text', mode = 'tap-to-edit', onSave, style }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const alwaysEditableRef = useRef<HTMLInputElement>(null);
  const skipBlurSaveRef = useRef(false);

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

  const handleAlwaysEditableBlur = () => {
    if (skipBlurSaveRef.current) {
      skipBlurSaveRef.current = false;
      return;
    }
    const numericValue = Number(draft) || 0;
    setDraft(String(numericValue));
    onSave(numericValue);
  };

  const handleAlwaysEditableKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      skipBlurSaveRef.current = true;
      const numericValue = Number(draft) || 0;
      setDraft(String(numericValue));
      onSave(numericValue);
      alwaysEditableRef.current?.blur();
    }
    if (e.key === 'Escape') {
      skipBlurSaveRef.current = true;
      setDraft(String(value));
      alwaysEditableRef.current?.blur();
    }
  };

  if (mode === 'always-editable') {
    return (
      <div className={styles.container} style={style}>
        <span className={styles.label}>{label}</span>
        <input
          ref={alwaysEditableRef}
          type="number"
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleAlwaysEditableBlur}
          onKeyDown={handleAlwaysEditableKeyDown}
          className={styles.alwaysEditableInput}
        />
      </div>
    );
  }

  return (
    <div className={styles.container} style={style}>
      <span className={styles.label}>{label}</span>
      {editing ? (
        <input
          ref={inputRef}
          type={type}
          inputMode={type === 'number' ? 'numeric' : undefined}
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
          className={`${styles.display} ${styles.underlineAffordance}`}
        >
          {value || '—'}
        </div>
      )}
    </div>
  );
}
