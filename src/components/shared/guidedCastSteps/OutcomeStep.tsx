import type { Character } from '../../../types/character';
import {
  formatCastDamageBreakdown,
  parseDamageFromEffect,
  resolveOvercastAllocations,
  type CastingResult,
} from '../../../logic/spell-casting';
import { BreakdownTotal } from './BreakdownTotal';
import styles from './guidedCastSteps.module.css';

export interface OutcomeStepProps {
  character: Character;
  result: CastingResult;
  /** Raw overcast allocations captured in Step 4, or null if none were made. */
  overcastAllocations: Record<string, number> | null;
}

function formatSL(sl: number): string {
  return sl >= 0 ? `+${sl}` : `${sl}`;
}

/**
 * Step 6 — final outcome summary. Every value is read off the resolved
 * CastingResult the panel produced; nothing is recomputed. Magic-missile damage
 * uses the EXISTING formatCastDamageBreakdown with a breakdown tooltip, and the
 * chosen overcast effects are resolved via the EXISTING resolveOvercastAllocations
 * (omitted entirely when no allocations were made).
 *
 * // Core p.234 (Casting Test outcome); WoM "Critical Casting" (Unstoppable
 * // Force → undispellable); WoM Overcast Table (p.23) for overcast effects.
 */
export function OutcomeStep({ character, result, overcastAllocations }: OutcomeStepProps) {
  const {
    spell,
    cn,
    slAchieved,
    castSuccess,
    isCriticalCast,
    isFumbledCast,
    isMagicMissile,
    hitLocation,
    damage,
    isUndispellable,
  } = result;

  // Magic-missile damage breakdown (matches CastResultDisplay): modifier + SL
  // (+ overcast bonus if the stored damage exceeds the base).
  const wpChar = character.chars.WP;
  const wpBonus = Math.floor((wpChar.i + wpChar.a + wpChar.b) / 10);
  const tChar = character.chars.T;
  const tbBonus = Math.floor((tChar.i + tChar.a + tChar.b) / 10);
  const damageModifier = parseDamageFromEffect(spell.effect, wpBonus, tbBonus);
  const baseDamage = damageModifier + slAchieved;
  const overcastDamageBonus = damage != null && damage > baseDamage ? damage - baseDamage : 0;
  const damageTotal = damageModifier + slAchieved + overcastDamageBonus;

  // Resolved overcast effects for display (existing resolver; no new math).
  const resolvedOvercast =
    overcastAllocations != null
      ? resolveOvercastAllocations(result.surplusSL, overcastAllocations)
      : null;

  return (
    <div className={styles.stepBody}>
      <p className={`${styles.outcomeLine} ${castSuccess ? styles.passColor : styles.failColor}`}>
        {castSuccess ? `${spell.name} — Cast!` : `${spell.name} — Failed`}
      </p>

      <BreakdownTotal
        tooltipId="guided-cast-outcome-sl-vs-cn"
        label="SL vs CN"
        value={`${formatSL(slAchieved)} vs ${cn}`}
        lines={[
          `SL achieved ${formatSL(slAchieved)}`,
          `CN ${cn}`,
          castSuccess ? '= Success' : '= Failed to reach CN',
        ]}
      />

      {isCriticalCast && <p className={styles.goldText}>Critical Cast</p>}
      {isFumbledCast && <p className={styles.failColor}>Fumbled Cast</p>}
      {isUndispellable && (
        <p className={styles.goldText}>Unstoppable Force — cannot be dispelled</p>
      )}

      {isMagicMissile && castSuccess && (
        <>
          <p className={styles.outcomeLine}>Hit: {hitLocation}</p>
          <BreakdownTotal
            tooltipId="guided-cast-outcome-damage"
            label="Damage"
            value={damageTotal}
            lines={[
              `Modifier ${damageModifier}`,
              `SL ${slAchieved}`,
              `Overcast +${overcastDamageBonus}`,
              `= ${formatCastDamageBreakdown(
                damageModifier,
                slAchieved,
                overcastDamageBonus > 0 ? overcastDamageBonus : undefined,
              )}`,
            ]}
          />
        </>
      )}

      {resolvedOvercast != null && resolvedOvercast.columnEffects.length > 0 && (
        <div>
          <div className={styles.sectionLabel}>Overcast effects</div>
          <ul className={styles.effectList}>
            {resolvedOvercast.columnEffects.map((eff) => (
              <li key={eff.category}>
                {eff.category}: {eff.effect} ({eff.slSpent} SL)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
