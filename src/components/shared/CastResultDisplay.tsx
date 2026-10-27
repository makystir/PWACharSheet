import type { Character } from '../../types/character';
import {
  type CastingResult,
  type MiscastResult,
  computeOvercastOptions,
  formatCastDamageBreakdown,
  parseDamageFromEffect,
} from '../../logic/spell-casting';
import { OvercastAllocator } from './OvercastAllocator';
import { CriticalChoiceButtons } from './castControls/CriticalChoiceButtons';
import { MiscastRollButtons } from './castControls/MiscastRollButtons';
import { MiscastEscalation } from './castControls/MiscastEscalation';
import styles from './CastResultDisplay.module.css';

interface CastResultDisplayProps {
  castingResult: CastingResult;
  character: Character;
  miscastResult?: MiscastResult | null;
  onOvercastAllocated?: (allocations: Record<string, number>) => void;
  /** Capture callback for the guided-cast seam: when present, overcast allocations
   *  are forwarded here instead of (or alongside) the close-on-confirm path. */
  onOvercastResolved?: (allocations: Record<string, number>) => void;
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
  onOvercastResolved,
  onCriticalChoice,
  onMiscastRoll,
  onArcaneMarkAcquired,
  onClose,
}: CastResultDisplayProps) {
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
              <CriticalChoiceButtons onCriticalChoice={onCriticalChoice} />
            </div>
          </>
        )}

        {/* 5 & 6. Fumble + Minor-Miscast-from-critical sections */}
        <MiscastRollButtons
          isFumbledCast={isFumbledCast}
          triggerMinorMiscast={triggerMinorMiscast}
          onMiscastRoll={onMiscastRoll}
        />

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
        {overcastSlots > 0 && castSuccess && (onOvercastAllocated || onOvercastResolved) && (
          <>
            <div className={styles.separator} />
            <div className={styles.overcastWrapper}>
              <OvercastAllocator
                options={computeOvercastOptions(spell)}
                availableSlots={overcastSlots}
                baseDamage={isMagicMissile ? (() => {
                  const wpChar = character.chars.WP;
                  const wpBonus = Math.floor((wpChar.i + wpChar.a + wpChar.b) / 10);
                  const tChar = character.chars.T;
                  const tbBonus = Math.floor((tChar.i + tChar.a + tChar.b) / 10);
                  return parseDamageFromEffect(spell.effect, wpBonus, tbBonus) + slAchieved;
                })() : undefined}
                onAllocate={onOvercastResolved ?? onOvercastAllocated!}
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
          <MiscastEscalation
            miscastResult={miscastResult}
            character={character}
            onMiscastRoll={onMiscastRoll}
            onArcaneMarkAcquired={onArcaneMarkAcquired}
          />
        )}

        {/* 11. Dismiss button */}
        <button type="button" onClick={onClose} className={styles.dismissBtn}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
