import { useState } from 'react';
import {
  type RollResult,
  type OpposedResult,
  calculateOpposedResult,
} from '../../logic/dice-roller';
import styles from './RollResultDisplay.module.css';

interface RollResultDisplayProps {
  result: RollResult;
  onClose: () => void;
}

function formatSL(sl: number): string {
  return sl >= 0 ? `+${sl}` : `${sl}`;
}

function getWinnerLabel(winner: OpposedResult['winner']): string {
  if (winner === 'player') return 'You win!';
  if (winner === 'opponent') return 'Opponent wins!';
  return 'Tie!';
}

function getWinnerClass(winner: OpposedResult['winner']): string {
  if (winner === 'player') return styles.winnerPlayer;
  if (winner === 'opponent') return styles.winnerOpponent;
  return styles.winnerTie;
}

export function RollResultDisplay({ result, onClose }: RollResultDisplayProps) {
  const [opposedInput, setOpposedInput] = useState('');

  const opposedSL = opposedInput !== '' ? parseInt(opposedInput, 10) : null;
  const opposedResult =
    opposedSL !== null && !isNaN(opposedSL)
      ? calculateOpposedResult(result.sl, opposedSL)
      : null;

  const colorClass = result.passed ? styles.passColor : styles.failColor;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-label="Roll Result">
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>{result.skillOrCharName}</div>

        {/* d100 roll value — large and prominent */}
        <div className={`${styles.rollValue} ${colorClass}`}>{result.roll}</div>

        {/* Target number */}
        <div className={styles.target}>Target: {result.targetNumber}</div>

        {/* SL with +/- prefix and pass/fail indicator */}
        <div className={styles.flexRow}>
          <span className={`${styles.sl} ${colorClass}`}>SL {formatSL(result.sl)}</span>
          <span className={`${styles.passFail} ${colorClass}`}>
            {result.passed ? 'Pass' : 'Fail'}
          </span>
        </div>

        {/* Critical indicator */}
        {result.isCritical && <div className={styles.critical}>Critical</div>}

        {/* Fumble indicator */}
        {result.isFumble && <div className={styles.fumble}>Fumble</div>}

        {/* Outcome description */}
        <div className={styles.outcome}>{result.outcome}</div>

        {/* Opposed SL section */}
        <div className={styles.separator} />
        <div className={styles.opposedSection}>
          <div className={styles.opposedLabel}>Opposed Test (optional)</div>
          <div className={styles.flexRowSmallGap}>
            <span className={styles.opponentSlLabel}>Opponent SL:</span>
            <input
              type="number"
              className={styles.opposedInput}
              value={opposedInput}
              onChange={(e) => setOpposedInput(e.target.value)}
              placeholder="SL"
              aria-label="Opponent SL"
            />
          </div>
          {opposedResult && (
            <div className={styles.flexRow}>
              <span className={styles.opposedResult}>
                Net SL: {formatSL(opposedResult.netSL)}
              </span>
              <span
                className={`${styles.opposedResult} ${getWinnerClass(opposedResult.winner)}`}
              >
                {getWinnerLabel(opposedResult.winner)}
              </span>
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <button type="button" onClick={onClose} className={styles.dismissBtn}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
