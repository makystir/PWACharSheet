import { useState } from 'react';
import type { Character } from '../../../types/character';
import type { MiscastResult } from '../../../logic/spell-casting';
import { getCharacterLore } from '../../../logic/advancement';
import { getArcaneMarksTable, type ArcaneMarkEntry } from '../../../data/arcane-marks';
import styles from '../CastResultDisplay.module.css';

interface MiscastEscalationProps {
  miscastResult: MiscastResult;
  character: Character;
  onMiscastRoll?: (table: 'minor' | 'major') => void;
  onArcaneMarkAcquired?: (mark: string) => void;
}

/**
 * Presentational cluster for a resolved miscast and its follow-up escalations:
 *  - cascading_chaos     → roll a Major Miscast
 *  - multiplying_misfortune → roll 2 Minor Miscasts
 *  - marked_by_magic     → roll a d10 on the caster's Lore Arcane Marks table
 * Miscast tables: Core p.234-235. Arcane Marks keyed by the caster's Lore.
 *
 * Extracted verbatim from CastResultDisplay (including the local arcane-mark
 * d10 Math.random() roll and the getCharacterLore/getArcaneMarksTable wiring)
 * so both hosts share one implementation — no handler drift.
 */
export function MiscastEscalation({
  miscastResult,
  character,
  onMiscastRoll,
  onArcaneMarkAcquired,
}: MiscastEscalationProps) {
  const [arcaneMarkResult, setArcaneMarkResult] = useState<ArcaneMarkEntry | null>(null);

  return (
    <>
      <div className={styles.separator} />
      <div className={styles.miscastResult}>
        <div className={styles.miscastName}>{miscastResult.entry.name}</div>
        <div className={styles.miscastEffect}>{miscastResult.entry.effect}</div>
        {miscastResult.entry.special === 'cascading_chaos' && (
          <button
            type="button"
            className={styles.miscastBtnMargin}
            onClick={() => onMiscastRoll?.('major')}
          >
            Roll Major Miscast
          </button>
        )}
        {miscastResult.entry.special === 'multiplying_misfortune' && (
          <button
            type="button"
            className={styles.miscastBtnMargin}
            onClick={() => onMiscastRoll?.('minor')}
          >
            Roll 2 Minor Miscasts
          </button>
        )}
        {miscastResult.entry.special === 'marked_by_magic' && (() => {
          const lore = getCharacterLore(character);
          const table = lore ? getArcaneMarksTable(lore) : null;
          return table ? (
            <>
              {!arcaneMarkResult ? (
                <button
                  type="button"
                  className={styles.miscastBtnMargin}
                  onClick={() => {
                    const roll = Math.floor(Math.random() * 10) + 1;
                    const entry = table.find((e) => e.roll === roll) ?? null;
                    if (entry) {
                      setArcaneMarkResult(entry);
                    }
                  }}
                >
                  Roll Arcane Mark ({lore})
                </button>
              ) : (
                <div className={styles.miscastEffect}>
                  <strong>Arcane Mark (d10: {arcaneMarkResult.roll}):</strong>{' '}
                  {arcaneMarkResult.description}
                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className={styles.miscastBtnMargin}
                      onClick={() => onArcaneMarkAcquired?.(arcaneMarkResult.description)}
                    >
                      Store Mark on Character
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <button
              type="button"
              className={styles.miscastBtnMargin}
              onClick={() => onMiscastRoll?.('major')}
            >
              No Arcane Marks table — Roll Major Miscast
            </button>
          );
        })()}
      </div>
    </>
  );
}
