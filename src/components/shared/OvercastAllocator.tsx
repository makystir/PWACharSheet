import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { OvercastOption } from '../../logic/spell-casting';

interface OvercastAllocatorProps {
  options: OvercastOption[];
  availableSlots: number;
  onAllocate: (allocations: Record<string, number>) => void;
}

const headerStyle: CSSProperties = {
  color: 'var(--accent-gold)',
  fontSize: '13px',
  fontWeight: 700,
  fontFamily: "'Cinzel', serif",
  margin: 0,
  textAlign: 'center',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '4px 0',
};

const labelStyle: CSSProperties = {
  fontSize: '12px',
  color: 'var(--text-primary)',
  fontWeight: 600,
  minWidth: '80px',
};

const disabledLabelStyle: CSSProperties = {
  ...labelStyle,
  color: 'var(--text-muted)',
};

const baseValueStyle: CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-secondary)',
  marginLeft: '4px',
};

const controlsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const stepBtn: CSSProperties = {
  width: '24px',
  height: '24px',
  padding: 0,
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 700,
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const stepBtnDisabled: CSSProperties = {
  ...stepBtn,
  opacity: 0.3,
  cursor: 'default',
};

const countStyle: CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: 'var(--text-primary)',
  minWidth: '16px',
  textAlign: 'center',
};

const totalStyle: CSSProperties = {
  fontSize: '12px',
  color: 'var(--text-secondary)',
  textAlign: 'center',
  marginTop: '4px',
};

const confirmBtn: CSSProperties = {
  padding: '6px 16px',
  background: 'var(--accent-gold)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  color: '#000',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 600,
  marginTop: '4px',
  alignSelf: 'center',
};

const naStyle: CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  fontStyle: 'italic',
};

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={headerStyle}>
        Overcasting ({availableSlots} slot{availableSlots !== 1 ? 's' : ''})
      </div>

      {options.map((opt) => (
        <div key={opt.category} style={rowStyle}>
          {opt.enabled ? (
            <>
              <div>
                <span style={labelStyle}>{opt.label}</span>
                <span style={baseValueStyle}>({opt.baseValue})</span>
              </div>
              <div style={controlsStyle}>
                <button
                  type="button"
                  style={(allocations[opt.category] ?? 0) <= 0 ? stepBtnDisabled : stepBtn}
                  disabled={(allocations[opt.category] ?? 0) <= 0}
                  onClick={() => decrement(opt.category)}
                  aria-label={`Decrease ${opt.label}`}
                >
                  −
                </button>
                <span style={countStyle}>{allocations[opt.category] ?? 0}</span>
                <button
                  type="button"
                  style={totalAllocated >= availableSlots ? stepBtnDisabled : stepBtn}
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
              <span style={disabledLabelStyle}>{opt.label}: </span>
              <span style={naStyle}>N/A ({opt.baseValue})</span>
            </div>
          )}
        </div>
      ))}

      <div style={totalStyle}>
        Allocated: {totalAllocated} / {availableSlots}
      </div>

      <button
        type="button"
        style={confirmBtn}
        onClick={() => onAllocate(allocations)}
      >
        Confirm
      </button>
    </div>
  );
}
