import { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';

interface EditableFieldProps {
  label: string;
  value: string | number;
  type?: 'text' | 'number';
  onSave: (value: string | number) => void;
  style?: CSSProperties;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const labelStyle: CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const displayStyle: CSSProperties = {
  padding: '4px 6px',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  minHeight: '28px',
  color: 'var(--text-primary)',
  border: '1px solid transparent',
  transition: 'border-color 0.1s',
};

const inputStyle: CSSProperties = {
  padding: '4px 6px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--accent-gold)',
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  fontSize: 'inherit',
  outline: 'none',
  minHeight: '28px',
};

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
    <div style={{ ...containerStyle, ...style }}>
      <span style={labelStyle}>{label}</span>
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
          style={inputStyle}
        />
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setEditing(true)}
          onKeyDown={(e) => { if (e.key === 'Enter') setEditing(true); }}
          style={displayStyle}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
        >
          {value || '—'}
        </div>
      )}
    </div>
  );
}
