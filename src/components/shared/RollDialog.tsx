import { useState } from 'react';
import {
  performRoll,
  applyDifficulty,
  resolveOpposedTest,
  type DifficultyLevel,
  type RollResult,
  type OpposedTestResult,
} from '../../logic/dice-roller';
import { triggerRollHaptic } from '../../logic/haptics';
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

function formatSL(sl: number): string {
  return sl >= 0 ? `+${sl}` : `${sl}`;
}

function getWinnerLabel(winner: OpposedTestResult['winner']): string {
  if (winner === 'player') return 'You win!';
  if (winner === 'opponent') return 'Opponent wins!';
  return 'Tie!';
}

export function RollDialog({
  skillOrCharName,
  baseTarget,
  defaultDifficulty = 'Challenging',
  onRoll,
  onClose,
}: RollDialogProps) {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(defaultDifficulty);
  const [opposedMode, setOpposedMode] = useState(false);
  const [opponentTarget, setOpponentTarget] = useState('');
  const [opposedResult, setOpposedResult] = useState<OpposedTestResult | null>(null);

  const modifiedTarget = applyDifficulty(baseTarget, difficulty);

  const handleRoll = () => {
    const rollValue = Math.floor(Math.random() * 100) + 1;
    const result = performRoll(baseTarget, difficulty, skillOrCharName, rollValue);
    triggerRollHaptic(result.isCritical, result.isFumble);

    if (opposedMode && opponentTarget !== '') {
      const oppTarget = parseInt(opponentTarget, 10);
      if (!isNaN(oppTarget) && oppTarget >= 1) {
        const opponentRollValue = Math.floor(Math.random() * 100) + 1;
        const opposed = resolveOpposedTest(
          result.targetNumber,
          result.roll,
          oppTarget,
          opponentRollValue
        );
        setOpposedResult(opposed);
        // Still report the player roll for history tracking
        onRoll(result);
        return;
      }
    }

    onRoll(result);
  };

  // When showing opposed result, render the result view instead of the form
  if (opposedResult) {
    return (
      <div className={styles.overlay} onClick={onClose} role="dialog" aria-label="Opposed Test Result">
        <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
          <h2 className={styles.title}>{skillOrCharName} — Opposed Test</h2>

          <div className={styles.opposedResultSection}>
            <div className={styles.opposedRow}>
              <span className={styles.opposedParty}>You</span>
              <span className={styles.opposedSl}>SL {formatSL(opposedResult.playerSL)}</span>
              <span className={styles.opposedRollValue}>({opposedResult.playerRoll})</span>
            </div>
            <div className={styles.opposedRow}>
              <span className={styles.opposedParty}>Opponent</span>
              <span className={styles.opposedSl}>SL {formatSL(opposedResult.opponentSL)}</span>
              <span className={styles.opposedRollValue}>({opposedResult.opponentRoll})</span>
            </div>

            <div className={styles.opposedSeparator} />

            <div className={styles.opposedNetRow}>
              <span className={styles.opposedNetLabel}>Net SL</span>
              <span className={styles.opposedNetValue}>{formatSL(opposedResult.netSL)}</span>
            </div>

            <div
              className={`${styles.opposedWinner} ${
                opposedResult.winner === 'player'
                  ? styles.winnerPlayer
                  : opposedResult.winner === 'opponent'
                    ? styles.winnerOpponent
                    : styles.winnerTie
              }`}
            >
              {getWinnerLabel(opposedResult.winner)}
            </div>
          </div>

          <button type="button" onClick={onClose} className={styles.rollBtn}>
            Dismiss
          </button>
        </div>
      </div>
    );
  }

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

        {/* Opposed Test Toggle */}
        <div className={styles.opposedToggleSection}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={opposedMode}
              onChange={(e) => {
                setOpposedMode(e.target.checked);
                if (!e.target.checked) setOpposedResult(null);
              }}
              className={styles.toggleCheckbox}
              aria-label="Opposed Test"
            />
            <span className={styles.toggleText}>Opposed Test</span>
          </label>

          {opposedMode && (
            <div className={styles.opponentTargetField}>
              <div className={styles.label}>Opponent Target Number</div>
              <input
                type="number"
                className={styles.opponentInput}
                value={opponentTarget}
                onChange={(e) => setOpponentTarget(e.target.value)}
                placeholder="Target"
                min={1}
                max={200}
                aria-label="Opponent Target Number"
              />
            </div>
          )}
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
