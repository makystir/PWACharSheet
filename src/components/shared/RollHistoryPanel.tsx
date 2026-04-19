import { useState } from 'react';
import type { RollHistoryEntry } from '../../hooks/useRollHistory';
import styles from './RollHistoryPanel.module.css';

interface RollHistoryPanelProps {
  history: RollHistoryEntry[];
  onClear: () => void;
}

function formatSL(sl: number): string {
  return sl >= 0 ? `+${sl}` : `${sl}`;
}

export function RollHistoryPanel({ history, onClear }: RollHistoryPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.panel}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls="roll-history-body"
      >
        <span>Roll History ({history.length})</span>
        <span className={expanded ? styles.chevronExpanded : styles.chevron} aria-hidden="true">
          ▼
        </span>
      </button>

      {expanded && (
        <div id="roll-history-body" className={styles.body}>
          {history.length === 0 ? (
            <div className={styles.emptyMessage}>
              No rolls yet
            </div>
          ) : (
            <>
              {history.map((entry) => {
                const { result } = entry;
                const colorClass = result.passed ? styles.passColor : styles.failColor;
                return (
                  <div key={entry.id} className={styles.entry}>
                    <span className={styles.skillName}>{result.skillOrCharName}</span>
                    <span className={styles.rollValue}>{result.roll}</span>
                    <span className={styles.target}>/ {result.targetNumber}</span>
                    <span className={`${styles.sl} ${colorClass}`}>
                      {formatSL(result.sl)}
                    </span>
                    <span className={`${styles.icon} ${colorClass}`}>
                      {result.passed ? '✓' : '✗'}
                    </span>
                  </div>
                );
              })}
              <button type="button" className={styles.clearBtn} onClick={onClear}>
                Clear History
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
