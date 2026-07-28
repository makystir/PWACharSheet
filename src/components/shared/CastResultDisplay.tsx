import { useState } from 'react';
import type { Character } from '../../types/character';
import {
  type CastingResult,
  type MiscastResult,
  computeOvercastOptions,
  formatCastDamageBreakdown,
  parseDamageFromEffect,
} from '../../logic/spell-casting';
import { getCharacterLore } from '../../logic/advancement';
import { getArcaneMarksTable, type ArcaneMarkEntry } from '../../data/arcane-marks';
import { OvercastAllocator } from './OvercastAllocator';
import styles from './CastResultDisplay.module.css';

interface CastResultDisplayProps {
  castingResult: CastingResult;
  character: Character;
  miscastResult?: MiscastResult | null;
  onOvercastAllocated?: (allocations: Record<string, number>) => void;
  onCriticalChoice?: (choice: 'critical_wound' | 'total_power' | 'unstoppable_force') => void;
  onMiscastRoll?: (table: 'minor' | 'major') => void;
  onArcaneMarkAcquired?: (mark: string) => void;
  onClose: () => void;
}

function formatSL(sl: number): string {
  return sl >= 0 ? `+${sl}` : `${sl}`;
}

export function CastResultDisplay({
  castingResult,
  character,
  miscastResult,
  onOvercastAllocated,
  onCriticalChoice,
  onMiscastRoll,
  onArcaneMarkAcquired,
  onClose,
}: CastResultDisplayProps) {
  const [arcaneMarkResult, setArcaneMarkResult] = useState<ArcaneMarkEntry | null>(null);

  const {
    rollResult,
    spell,
    cn,
    slAchieved,
    castSuccess,
    overcastSlots,
    isCriticalCast,
    isFumbledCast,
    triggerMinorMiscast,
    isMagicMissile,
    hitLocation,
    damage,
    isFullyChannelled,
    isUndispellable,
  } = castingResult;

  const passColorClass = castSuccess ? styles.passColor : styles.failColor;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-label="Cast Result">
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* 1. Header — Spell name */}
        <div className={styles.header}>{spell.name}</div>

        {/* 2. Roll info — d100 value, target, SL */}
        <div className={`${styles.rollValue} ${passColorClass}`}>{rollResult.roll}</div>
        <div className={styles.target}>Target: {rollResult.targetNumber}</div>
        <div className={`${styles.sl} ${passColorClass}`}>SL {formatSL(slAchieved)}</div>

        {/* 3. CN comparison */}
        <div className={styles.separator} />
        {isFullyChannelled ? (
          <div className={`${styles.cnComparison} ${styles.passColor}`}>
            Channelled Cast — Success!
          </div>
        ) : castSuccess ? (
          <div className={`${styles.cnComparison} ${styles.passColor}`}>
            SL {formatSL(slAchieved)} vs CN {cn} — Cast!
          </div>
        ) : (
          <div className={`${styles.cnComparison} ${styles.failColor}`}>
            SL {formatSL(slAchieved)} vs CN {cn} — Failed to reach CN
          </div>
        )}

        {/* 4. Critical Cast section */}
        {isCriticalCast && (
          <>
            <div className={styles.separator} />
            <div className={styles.section}>
              <div className={styles.criticalLabel}>Critical Cast</div>
              <div className={styles.choiceBtnRow}>
                <button
                  type="button"
                  className={styles.choiceBtn}
                  onClick={() => onCriticalChoice?.('critical_wound')}
                >
                  Critical Wound
                </button>
                <button
                  type="button"
                  className={styles.choiceBtn}
                  onClick={() => onCriticalChoice?.('total_power')}
                >
                  Total Power
                </button>
                <button
                  type="button"
                  className={styles.choiceBtn}
                  onClick={() => onCriticalChoice?.('unstoppable_force')}
                >
                  Unstoppable Force
                </button>
              </div>
            </div>
          </>
        )}

        {/* 5. Fumble section */}
        {isFumbledCast && (
          <>
            <div className={styles.separator} />
            <div className={styles.section}>
              <div className={styles.fumbleLabel}>Fumble</div>
              <button
                type="button"
                className={styles.miscastBtn}
                onClick={() => onMiscastRoll?.('minor')}
              >
                Roll Minor Miscast
              </button>
            </div>
          </>
        )}

        {/* 6. Minor Miscast prompt (from critical, not fumble) */}
        {triggerMinorMiscast && !isFumbledCast && (
          <>
            <div className={styles.separator} />
            <div className={styles.section}>
              <div className={styles.minorMiscastLabel}>
                Minor Miscast triggered
              </div>
              <button
                type="button"
                className={styles.miscastBtn}
                onClick={() => onMiscastRoll?.('minor')}
              >
                Roll Minor Miscast
              </button>
            </div>
          </>
        )}

        {/* 7. Undispellable indicator */}
        {isUndispellable && (
          <>
            <div className={styles.separator} />
            <div className={styles.goldText}>
              UNSTOPPABLE FORCE — Cannot be dispelled
            </div>
          </>
        )}

        {/* 8. Overcast section */}
        {overcastSlots > 0 && castSuccess && onOvercastAllocated && (
          <>
            <div className={styles.separator} />
            <div className={styles.overcastWrapper}>
              <OvercastAllocator
                options={computeOvercastOptions(spell)}
                availableSlots={overcastSlots}
                onAllocate={onOvercastAllocated}
              />
            </div>
          </>
        )}

        {/* 9. Magic missile section */}
        {isMagicMissile && castSuccess && (
          <>
            <div className={styles.separator} />
            <div className={styles.section}>
              <div className={styles.hitLocation}>
                Hit: {hitLocation}
              </div>
              <div className={styles.damageLabel}>
                Damage: {(() => {
                  const wpChar = character.chars.WP;
                  const wpBonus = Math.floor((wpChar.i + wpChar.a + wpChar.b) / 10);
                  const tChar = character.chars.T;
                  const tbBonus = Math.floor((tChar.i + tChar.a + tChar.b) / 10);
                  const damageModifier = parseDamageFromEffect(spell.effect, wpBonus, tbBonus);
                  const baseDamage = damageModifier + slAchieved;
                  const overcastDamageBonus = damage != null && damage > baseDamage ? damage - baseDamage : 0;
                  return formatCastDamageBreakdown(damageModifier, slAchieved, overcastDamageBonus > 0 ? overcastDamageBonus : undefined);
                })()}
              </div>
            </div>
          </>
        )}

        {/* 10. Miscast result */}
        {miscastResult && (
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
        )}

        {/* 11. Dismiss button */}
        <button type="button" onClick={onClose} className={styles.dismissBtn}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
