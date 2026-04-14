import { useState, type CSSProperties } from 'react';
import {
  type RollResult,
  type OpposedResult,
  calculateOpposedResult,
} from '../../logic/dice-roller';

interface RollResultDisplayProps {
  result: RollResult;
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

const dialogStyle: CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--card-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '24px',
  width: '90%',
  maxWidth: '360px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  alignItems: 'center',
};

const titleStyle: CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: '14px',
  fontWeight: 600,
  margin: 0,
  fontFamily: "'Cinzel', serif",
};

const rollValueStyle: CSSProperties = {
  fontSize: '48px',
  fontWeight: 700,
  fontFamily: "'Cinzel', serif",
  margin: 0,
  lineHeight: 1,
};

const targetStyle: CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: '13px',
};

const slStyle: CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
};

const passFailStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const criticalStyle: CSSProperties = {
  color: 'var(--accent-gold)',
  fontSize: '18px',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
};

const fumbleStyle: CSSProperties = {
  color: 'var(--danger)',
  fontSize: '18px',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
};

const outcomeStyle: CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: '14px',
  fontStyle: 'italic',
};

const separatorStyle: CSSProperties = {
  width: '100%',
  height: '1px',
  background: 'var(--border)',
  margin: 0,
};

const opposedSectionStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const opposedLabelStyle: CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: '12px',
};

const opposedInputStyle: CSSProperties = {
  width: '80px',
  padding: '6px 10px',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  textAlign: 'center',
};

const opposedResultStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
};

const dismissBtnStyle: CSSProperties = {
  padding: '8px 24px',
  background: 'var(--accent-gold)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  color: '#000',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 600,
  marginTop: '4px',
};

function formatSL(sl: number): string {
  return sl >= 0 ? `+${sl}` : `${sl}`;
}

function getWinnerLabel(winner: OpposedResult['winner']): string {
  if (winner === 'player') return 'You win!';
  if (winner === 'opponent') return 'Opponent wins!';
  return 'Tie!';
}

function getWinnerColor(winner: OpposedResult['winner']): string {
  if (winner === 'player') return 'var(--success)';
  if (winner === 'opponent') return 'var(--danger)';
  return 'var(--text-secondary)';
}

export function RollResultDisplay({ result, onClose }: RollResultDisplayProps) {
  const [opposedInput, setOpposedInput] = useState('');

  const opposedSL = opposedInput !== '' ? parseInt(opposedInput, 10) : null;
  const opposedResult =
    opposedSL !== null && !isNaN(opposedSL)
      ? calculateOpposedResult(result.sl, opposedSL)
      : null;

  const passColor = result.passed ? 'var(--success)' : 'var(--danger)';

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-label="Roll Result">
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div style={titleStyle}>{result.skillOrCharName}</div>

        {/* d100 roll value — large and prominent */}
        <div style={{ ...rollValueStyle, color: passColor }}>{result.roll}</div>

        {/* Target number */}
        <div style={targetStyle}>Target: {result.targetNumber}</div>

        {/* SL with +/- prefix and pass/fail indicator */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ ...slStyle, color: passColor }}>SL {formatSL(result.sl)}</span>
          <span style={{ ...passFailStyle, color: passColor }}>
            {result.passed ? 'Pass' : 'Fail'}
          </span>
        </div>

        {/* Critical indicator */}
        {result.isCritical && <div style={criticalStyle}>Critical</div>}

        {/* Fumble indicator */}
        {result.isFumble && <div style={fumbleStyle}>Fumble</div>}

        {/* Outcome description */}
        <div style={outcomeStyle}>{result.outcome}</div>

        {/* Opposed SL section */}
        <div style={separatorStyle} />
        <div style={opposedSectionStyle}>
          <div style={opposedLabelStyle}>Opposed Test (optional)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Opponent SL:</span>
            <input
              type="number"
              style={opposedInputStyle}
              value={opposedInput}
              onChange={(e) => setOpposedInput(e.target.value)}
              placeholder="SL"
              aria-label="Opponent SL"
            />
          </div>
          {opposedResult && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ ...opposedResultStyle, color: 'var(--text-primary)' }}>
                Net SL: {formatSL(opposedResult.netSL)}
              </span>
              <span
                style={{
                  ...opposedResultStyle,
                  color: getWinnerColor(opposedResult.winner),
                }}
              >
                {getWinnerLabel(opposedResult.winner)}
              </span>
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <button type="button" onClick={onClose} style={dismissBtnStyle}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
