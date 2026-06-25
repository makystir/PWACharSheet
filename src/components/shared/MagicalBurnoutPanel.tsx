import { useState } from 'react';
import type { Character } from '../../types/character';
import {
  hasHighMagic,
  isBurnoutActive,
  getBurnoutDaysRemaining,
  isDoubles,
  applyBurnout,
  clearBurnout,
} from '../../logic/magicalBurnout';
import { Card } from './Card';
import styles from './MagicalBurnoutPanel.module.css';

interface MagicalBurnoutPanelProps {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

/**
 * Displays Magical Burnout status for High Magic users.
 * Only renders when character has the High Magic talent.
 * Shows current burnout state, allows applying burnout from a d100 roll,
 * and clearing via Fortune/Fate.
 */
export function MagicalBurnoutPanel({ character, updateCharacter }: MagicalBurnoutPanelProps) {
  const [rollInput, setRollInput] = useState('');

  if (!hasHighMagic(character)) {
    return null;
  }

  const burnout = character.magicalBurnout;
  const active = isBurnoutActive(burnout);
  const daysRemaining = getBurnoutDaysRemaining(burnout);

  const handleClear = () => {
    updateCharacter((c) => clearBurnout(c));
  };

  const handleApplyBurnout = () => {
    const roll = parseInt(rollInput, 10);
    if (isNaN(roll) || roll < 1 || roll > 100) return;
    const permanent = isDoubles(roll);
    updateCharacter((c) => applyBurnout(c, permanent ? 'permanent' : roll));
    setRollInput('');
  };

  return (
    <Card>
      <div className={styles.container}>
        <span className={styles.label}>Magical Burnout</span>

        {!active && (
          <>
            <div className={styles.statusOk}>
              <span className={styles.icon} aria-hidden="true">✨</span>
              <span>No burnout — casting unimpaired</span>
            </div>

            {/* Apply burnout from a d100 roll */}
            <div className={styles.applyRow}>
              <input
                type="number"
                min="1"
                max="100"
                placeholder="d100 roll"
                value={rollInput}
                onChange={(e) => setRollInput(e.target.value)}
                className={styles.rollInput}
                aria-label="Burnout d100 roll result"
              />
              <button
                type="button"
                className={styles.applyBtn}
                onClick={handleApplyBurnout}
                disabled={!rollInput}
                aria-label="Apply Magical Burnout"
              >
                Apply Burnout
              </button>
            </div>
            <p className={styles.hint}>
              Enter d100 result if burnout triggered (overcast SL &gt; WPB). Doubles = permanent.
            </p>
          </>
        )}

        {active && burnout?.type === 'permanent' && (
          <div className={styles.statusPermanent} role="alert">
            <span className={styles.icon} aria-hidden="true">💀</span>
            <div>
              <strong>Permanent Burnout</strong>
              <p className={styles.desc}>All spellcasting is prevented. Spend a Fate point to negate.</p>
            </div>
          </div>
        )}

        {active && burnout?.type === 'temporary' && (
          <div className={styles.statusTemporary} role="alert">
            <span className={styles.icon} aria-hidden="true">⏳</span>
            <div>
              <strong>Temporary Burnout</strong>
              <p className={styles.desc}>
                No spellcasting for <strong>{daysRemaining}</strong> day{daysRemaining !== 1 ? 's' : ''}.
                Spend a Fortune point to negate.
              </p>
            </div>
          </div>
        )}

        {active && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={handleClear}
            aria-label="Clear Magical Burnout"
          >
            Clear Burnout (Fortune/Fate spent)
          </button>
        )}
      </div>
    </Card>
  );
}
