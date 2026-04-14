import { useState, type CSSProperties } from 'react';
import {
  performRoll,
  applyDifficulty,
  type DifficultyLevel,
  type RollResult,
} from '../../logic/dice-roller';

interface RollDialogProps {
  skillOrCharName: string;
  baseTarget: number;
  defaultDifficulty?: DifficultyLevel;
  onRoll: (result: RollResult) => void;
  onClose: () => void;
}

const DIFFICULTY_LABELS: { level: DifficultyLevel; label: string }[] = [
  { level: 'Very Easy', label: 'Very Easy (+60)' },
  { level: 'Easy', label: 'Easy (+40)' },
  { level: 'Average', label: 'Average (+20)' },
  { level: 'Challenging', label: 'Challenging (+0)' },
  { level: 'Difficult', label: 'Difficult (-10)' },
  { level: 'Hard', label: 'Hard (-20)' },
  { level: 'Very Hard', label: 'Very Hard (-30)' },
];

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
};

const titleStyle: CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: '16px',
  fontWeight: 600,
  margin: 0,
  fontFamily: "'Cinzel', serif",
};

const labelStyle: CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: '13px',
  marginBottom: '4px',
};

const valueStyle: CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: '14px',
  fontWeight: 600,
};

const selectStyle: CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  cursor: 'pointer',
};

const modifiedTargetStyle: CSSProperties = {
  color: 'var(--accent-gold)',
  fontSize: '20px',
  fontWeight: 700,
  textAlign: 'center',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  justifyContent: 'flex-end',
};

const cancelBtnStyle: CSSProperties = {
  padding: '8px 16px',
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: '13px',
};

const rollBtnStyle: CSSProperties = {
  padding: '8px 16px',
  background: 'var(--accent-gold)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  color: '#000',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 600,
};

export function RollDialog({
  skillOrCharName,
  baseTarget,
  defaultDifficulty = 'Challenging',
  onRoll,
  onClose,
}: RollDialogProps) {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(defaultDifficulty);

  const modifiedTarget = applyDifficulty(baseTarget, difficulty);

  const handleRoll = () => {
    const rollValue = Math.floor(Math.random() * 100) + 1;
    const result = performRoll(baseTarget, difficulty, skillOrCharName, rollValue);
    onRoll(result);
  };

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-label="Roll Dialog">
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={titleStyle}>{skillOrCharName}</h2>

        <div>
          <div style={labelStyle}>Base Target</div>
          <div style={valueStyle}>{baseTarget}</div>
        </div>

        <div>
          <div style={labelStyle}>Difficulty</div>
          <select
            style={selectStyle}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
            aria-label="Difficulty"
          >
            {DIFFICULTY_LABELS.map(({ level, label }) => (
              <option key={level} value={level}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={labelStyle}>Modified Target</div>
          <div style={modifiedTargetStyle}>{modifiedTarget}</div>
        </div>

        <div style={actionsStyle}>
          <button type="button" onClick={onClose} style={cancelBtnStyle}>
            Cancel
          </button>
          <button type="button" onClick={handleRoll} style={rollBtnStyle}>
            Roll
          </button>
        </div>
      </div>
    </div>
  );
}
