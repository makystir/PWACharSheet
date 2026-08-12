import { useState, useRef, useEffect, useId, useCallback } from 'react';
import type { CSSProperties } from 'react';
import styles from './EditableField.module.css';

// Session-level counter for escape usage (not persisted)
const escapeUsageCounter: Map<string, number> = new Map();
const ESC_SUPPRESS_THRESHOLD = 3;

interface EditableFieldProps {
  label: string;
  value: string | number;
  type?: 'text' | 'number';
  mode?: 'tap-to-edit' | 'always-editable';
  required?: boolean;
  onSave: (value: string | number) => void;
  style?: CSSProperties;
}

function validateField(draft: string, type: 'text' | 'number', required: boolean): string | null {
  if (type === 'number' && draft.trim() !== '' && !Number.isFinite(Number(draft))) {
    return 'Must be a number';
  }
  if (required && draft.trim() === '') {
    return 'Required';
  }
  return null;
}

export function EditableField({ label, value, type = 'text', mode = 'tap-to-edit', required = false, onSave, style }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState<string | null>(null);
  const [showEscHint, setShowEscHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const alwaysEditableRef = useRef<HTMLInputElement>(null);
  const skipBlurSaveRef = useRef(false);
  const escHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorId = useId();

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Show "Esc to revert" hint after 1-second delay when entering edit mode
  useEffect(() => {
    if (editing) {
      const escCount = escapeUsageCounter.get('escape-count') ?? 0;
      if (escCount < ESC_SUPPRESS_THRESHOLD) {
        escHintTimerRef.current = setTimeout(() => {
          setShowEscHint(true);
        }, 1000);
      }
    } else {
      // Hide hint and clear timer when exiting edit mode
      setShowEscHint(false);
      if (escHintTimerRef.current) {
        clearTimeout(escHintTimerRef.current);
        escHintTimerRef.current = null;
      }
    }
    return () => {
      if (escHintTimerRef.current) {
        clearTimeout(escHintTimerRef.current);
        escHintTimerRef.current = null;
      }
    };
  }, [editing]);

  useEffect(() => {
    setDraft(String(value));
    setError(null);
  }, [value]);

  const handleChange = (newDraft: string) => {
    setDraft(newDraft);
    // Clear error immediately when input becomes valid
    if (error) {
      const validationError = validateField(newDraft, type, required);
      if (!validationError) {
        setError(null);
      }
    }
  };

  const trackEscapeUsage = useCallback(() => {
    const current = escapeUsageCounter.get('escape-count') ?? 0;
    escapeUsageCounter.set('escape-count', current + 1);
  }, []);

  const handleSave = () => {
    const validationError = validateField(draft, type, required);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setEditing(false);
    const newValue = type === 'number' ? Number(draft) || 0 : draft;
    onSave(newValue);
  };

  const handleAlwaysEditableBlur = () => {
    if (skipBlurSaveRef.current) {
      skipBlurSaveRef.current = false;
      return;
    }
    const validationError = validateField(draft, type, required);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    const numericValue = Number(draft) || 0;
    setDraft(String(numericValue));
    onSave(numericValue);
  };

  const handleAlwaysEditableKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const validationError = validateField(draft, type, required);
      if (validationError) {
        setError(validationError);
        return;
      }
      skipBlurSaveRef.current = true;
      setError(null);
      const numericValue = Number(draft) || 0;
      setDraft(String(numericValue));
      onSave(numericValue);
      alwaysEditableRef.current?.blur();
    }
    if (e.key === 'Escape') {
      skipBlurSaveRef.current = true;
      setDraft(String(value));
      setError(null);
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
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleAlwaysEditableBlur}
          onKeyDown={handleAlwaysEditableKeyDown}
          className={`${styles.alwaysEditableInput} ${error ? styles.inputError : ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        {error && (
          <span id={errorId} className={styles.errorMessage} role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container} style={style}>
      <span className={styles.label}>{label}</span>
      {editing ? (
        <>
          <input
            ref={inputRef}
            type={type}
            inputMode={type === 'number' ? 'numeric' : undefined}
            value={draft}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') { trackEscapeUsage(); setDraft(String(value)); setError(null); setEditing(false); }
            }}
            className={`${styles.input} ${error ? styles.inputError : ''}`}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
          {error && (
            <span id={errorId} className={styles.errorMessage} role="alert">
              {error}
            </span>
          )}
          {showEscHint && (
            <span className={styles.escHint}>Esc to revert</span>
          )}
        </>
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
