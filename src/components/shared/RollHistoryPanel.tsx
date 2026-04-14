import { useState, type CSSProperties } from 'react';
import type { RollHistoryEntry } from '../../hooks/useRollHistory';

interface RollHistoryPanelProps {
  history: RollHistoryEntry[];
  onClear: () => void;
}

const panelStyle: CSSProperties = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 'var(--radius-md)',
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  cursor: 'pointer',
  userSelect: 'none',
  background: 'none',
  border: 'none',
  width: '100%',
  color: 'var(--parchment)',
  fontFamily: "'Cinzel', serif",
  fontSize: '14px',
  fontWeight: 600,
};

const chevronStyle = (expanded: boolean): CSSProperties => ({
  color: 'var(--text-muted)',
  fontSize: '12px',
  transition: 'transform 0.15s ease',
  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
});

const bodyStyle: CSSProperties = {
  borderTop: '1px solid var(--card-border)',
  padding: '8px 16px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const entryStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 0',
  borderBottom: '1px solid var(--border)',
  fontSize: '13px',
};

const skillNameStyle: CSSProperties = {
  color: 'var(--text-primary)',
  fontWeight: 500,
  flex: '1 1 auto',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  marginRight: '8px',
};

const rollValueStyle: CSSProperties = {
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-body)',
  minWidth: '28px',
  textAlign: 'center',
};

const targetStyle: CSSProperties = {
  color: 'var(--text-muted)',
  minWidth: '40px',
  textAlign: 'center',
  fontSize: '12px',
};

const slStyle: CSSProperties = {
  fontWeight: 600,
  minWidth: '32px',
  textAlign: 'center',
};

const iconStyle: CSSProperties = {
  minWidth: '20px',
  textAlign: 'center',
  fontSize: '14px',
  fontWeight: 700,
};

const clearBtnStyle: CSSProperties = {
  padding: '6px 12px',
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: '12px',
  alignSelf: 'flex-end',
  marginTop: '4px',
};

function formatSL(sl: number): string {
  return sl >= 0 ? `+${sl}` : `${sl}`;
}

export function RollHistoryPanel({ history, onClear }: RollHistoryPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={panelStyle}>
      <button
        type="button"
        style={headerStyle}
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls="roll-history-body"
      >
        <span>Roll History ({history.length})</span>
        <span style={chevronStyle(expanded)} aria-hidden="true">
          ▼
        </span>
      </button>

      {expanded && (
        <div id="roll-history-body" style={bodyStyle}>
          {history.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '8px 0' }}>
              No rolls yet
            </div>
          ) : (
            <>
              {history.map((entry) => {
                const { result } = entry;
                const passColor = result.passed ? 'var(--success)' : 'var(--danger)';
                return (
                  <div key={entry.id} style={entryStyle}>
                    <span style={skillNameStyle}>{result.skillOrCharName}</span>
                    <span style={rollValueStyle}>{result.roll}</span>
                    <span style={targetStyle}>/ {result.targetNumber}</span>
                    <span style={{ ...slStyle, color: passColor }}>
                      {formatSL(result.sl)}
                    </span>
                    <span style={{ ...iconStyle, color: passColor }}>
                      {result.passed ? '✓' : '✗'}
                    </span>
                  </div>
                );
              })}
              <button type="button" style={clearBtnStyle} onClick={onClear}>
                Clear History
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
