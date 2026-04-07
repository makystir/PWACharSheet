import { useState } from 'react';
import type { CSSProperties } from 'react';

interface PickerProps<T> {
  items: T[];
  getLabel: (item: T) => string;
  onSelect: (item: T) => void;
  onClose: () => void;
  title?: string;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--card-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '16px',
  width: '90%',
  maxWidth: '400px',
  maxHeight: '70vh',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const searchStyle: CSSProperties = {
  padding: '8px 12px',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  outline: 'none',
};

const listStyle: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const itemStyle: CSSProperties = {
  padding: '8px 12px',
  cursor: 'pointer',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
};

const closeStyle: CSSProperties = {
  padding: '8px',
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: '13px',
};

export function Picker<T>({ items, getLabel, onSelect, onClose, title }: PickerProps<T>) {
  const [search, setSearch] = useState('');

  const filtered = items.filter((item) =>
    getLabel(item).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-label={title || 'Picker'}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {title && (
          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--parchment)', margin: 0, fontSize: '16px' }}>
            {title}
          </h3>
        )}
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchStyle}
          autoFocus
        />
        <div style={listStyle}>
          {filtered.map((item, i) => (
            <button
              key={i}
              type="button"
              style={itemStyle}
              onClick={() => onSelect(item)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {getLabel(item)}
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              No items found
            </div>
          )}
        </div>
        <button type="button" onClick={onClose} style={closeStyle}>
          Close
        </button>
      </div>
    </div>
  );
}
