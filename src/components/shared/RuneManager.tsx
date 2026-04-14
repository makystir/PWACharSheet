import { useState } from 'react';
import type { CSSProperties } from 'react';
import { getRuneById, getAvailableRunesForItem, validateRunePlacement } from '../../logic/runes';

interface RuneManagerProps {
  itemType: 'weapon' | 'armour';
  itemIndex: number;
  itemName: string;
  currentRunes: string[];
  knownRunes: string[];
  onAddRune: (runeId: string) => void;
  onRemoveRune: (runeIndex: number) => void;
  onClose: () => void;
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
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '20px',
  width: '90%',
  maxWidth: '420px',
  maxHeight: '80vh',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-heading)',
  color: 'var(--accent-gold)',
  fontSize: '16px',
  margin: 0,
};

const slotStyle: CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: '13px',
};

const sectionLabelStyle: CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  margin: 0,
};

const runeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px',
  background: 'var(--bg-tertiary)',
  borderRadius: 'var(--radius-sm)',
};

const runeNameStyle: CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: '13px',
};

const masterBadgeStyle: CSSProperties = {
  color: 'var(--accent-gold)',
  fontSize: '11px',
  marginLeft: '6px',
};

const removeBtnStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--danger)',
  cursor: 'pointer',
  fontSize: '14px',
  padding: '2px 6px',
};

const addBtnStyle: CSSProperties = {
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--success)',
  cursor: 'pointer',
  fontSize: '12px',
  padding: '4px 10px',
};

const closeBtnStyle: CSSProperties = {
  padding: '8px 16px',
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: '13px',
  alignSelf: 'flex-end',
};

const errorStyle: CSSProperties = {
  color: 'var(--danger)',
  fontSize: '12px',
  margin: 0,
};

const emptyStyle: CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '13px',
  fontStyle: 'italic',
};

const descStyle: CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '11px',
  margin: 0,
};

export function RuneManager({
  itemType,
  itemIndex: _itemIndex,
  itemName,
  currentRunes,
  knownRunes,
  onAddRune,
  onRemoveRune,
  onClose,
}: RuneManagerProps) {
  const [error, setError] = useState<string | null>(null);

  const availableRunes = getAvailableRunesForItem(itemType, currentRunes, knownRunes);
  const slotCount = currentRunes.length;
  const maxSlots = 3;

  const handleAdd = (runeId: string) => {
    const result = validateRunePlacement(runeId, currentRunes, itemType);
    if (!result.valid) {
      setError(result.error ?? 'Cannot add this rune.');
      return;
    }
    setError(null);
    onAddRune(runeId);
  };

  const handleRemove = (index: number) => {
    setError(null);
    onRemoveRune(index);
  };

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-label={`Rune Manager — ${itemName}`}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={titleStyle}>{itemName}</h3>
          <span style={slotStyle}>⚒ {slotCount}/{maxSlots} Rune Slots</span>
        </div>

        {/* Current Runes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <p style={sectionLabelStyle}>Inscribed Runes</p>
          {currentRunes.length === 0 && (
            <p style={emptyStyle}>No runes inscribed.</p>
          )}
          {currentRunes.map((runeId, idx) => {
            const rune = getRuneById(runeId);
            return (
              <div key={`${runeId}-${idx}`} style={runeRowStyle}>
                <div>
                  <span style={runeNameStyle}>{rune?.name ?? runeId}</span>
                  {rune?.isMaster && <span style={masterBadgeStyle}>★ Master</span>}
                  {rune && <p style={descStyle}>{rune.description}</p>}
                </div>
                <button
                  type="button"
                  style={removeBtnStyle}
                  onClick={() => handleRemove(idx)}
                  aria-label={`Remove ${rune?.name ?? runeId}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {error && <p style={errorStyle}>{error}</p>}

        {/* Available Runes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <p style={sectionLabelStyle}>Available Runes</p>
          {knownRunes.length === 0 && (
            <p style={emptyStyle}>No runes learned yet. Learn runes on the Advancement page.</p>
          )}
          {knownRunes.length > 0 && availableRunes.length === 0 && (
            <p style={emptyStyle}>No compatible runes available for this item.</p>
          )}
          {availableRunes.map((rune) => (
            <div key={rune.id} style={runeRowStyle}>
              <div>
                <span style={runeNameStyle}>{rune.name}</span>
                {rune.isMaster && <span style={masterBadgeStyle}>★ Master</span>}
                <p style={descStyle}>{rune.description}</p>
              </div>
              <button
                type="button"
                style={addBtnStyle}
                onClick={() => handleAdd(rune.id)}
                aria-label={`Add ${rune.name}`}
              >
                Add
              </button>
            </div>
          ))}
        </div>

        <button type="button" style={closeBtnStyle} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
