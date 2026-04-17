import { useState } from 'react';
import {
  performRoll,
  applyDifficulty,
  type DifficultyLevel,
  type RollResult,
} from '../../logic/dice-roller';
import styles from './RollDialog.module.css';

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
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-label="Roll Dialog">
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{skillOrCharName}</h2>

        <div>
          <div className={styles.label}>Base Target</div>
          <div className={styles.value}>{baseTarget}</div>
        </div>

        <div>
          <div className={styles.label}>Difficulty</div>
          <select
            className={styles.select}
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
          <div className={styles.label}>Modified Target</div>
          <div className={styles.modifiedTarget}>{modifiedTarget}</div>
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>
            Cancel
          </button>
          <button type="button" onClick={handleRoll} className={styles.rollBtn}>
            Roll
          </button>
        </div>
      </div>
    </div>
  );
}
