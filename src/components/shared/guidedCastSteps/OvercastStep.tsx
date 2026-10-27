import type { Character } from '../../../types/character';
import {
  computeOvercastBudgetBreakdown,
  computeOvercastDamagePreview,
  computeOvercastOptions,
  parseDamageFromEffect,
  type CastingResult,
} from '../../../logic/spell-casting';
import { OvercastAllocator } from '../OvercastAllocator';
import { BreakdownTotal } from './BreakdownTotal';
import styles from './guidedCastSteps.module.css';

export interface OvercastStepProps {
  character: Character;
  /** The resolved cast — availableSlots is read off result.overcastSlots on EVERY render. */
  result: CastingResult;
  /** Forwarded to the host (onOvercastResolved); host dispatches overcastResolved. */
  onOvercastResolved: (allocations: Record<string, number>) => void;
}

/** Fibonacci SL thresholds from OVERCAST_TABLE (WoM Overcast Table, p.23). */
const OVERCAST_THRESHOLDS = '1 / 2 / 3 / 5 / 8 / 13 / 21';

/**
 * Step 4 — spend surplus SL via the EXISTING OvercastAllocator, hosted in-body
 * (the guide, not CastResultDisplay, is the single aria-modal while open). The
 * overcast budget comes from computeOvercastBudgetBreakdown with a tooltip whose
 * additive lines sum to the budget — the Total-Power tens contribution is shown
 * as its own line so the sum holds in the Total-Power case too (calculated-
 * totals steering). availableSlots is read from result.overcastSlots on every
 * render (never snapshotted) so a Total-Power re-resolve updates it live.
 *
 * // Core p.238 superseded by the WoM Overcast Table (p.23). Each column may be
 * // accessed only once per casting; channelled power may not Overcast.
 */
export function OvercastStep({ character, result, onOvercastResolved }: OvercastStepProps) {
  const { slAchieved, totalPowerTens, cn, overcastSlots } = computeOvercastBudgetBreakdown(result);

  // Base damage for the magic-missile damage preview, matching CastResultDisplay:
  // parseDamageFromEffect(effect) + SL achieved.
  const wpChar = character.chars.WP;
  const wpBonus = Math.floor((wpChar.i + wpChar.a + wpChar.b) / 10);
  const tChar = character.chars.T;
  const tbBonus = Math.floor((tChar.i + tChar.a + tChar.b) / 10);
  const baseDamage = result.isMagicMissile
    ? parseDamageFromEffect(result.spell.effect, wpBonus, tbBonus) + slAchieved
    : undefined;

  // Damage preview (max column spend = full budget) for the breakdown tooltip.
  const damagePreview =
    baseDamage != null ? computeOvercastDamagePreview(baseDamage, overcastSlots) : null;

  return (
    <div className={styles.stepBody}>
      <BreakdownTotal
        tooltipId="guided-cast-overcast-budget"
        label="Overcast budget (surplus SL)"
        value={overcastSlots}
        lines={[
          `SL achieved ${slAchieved}`,
          `Total Power bonus +${totalPowerTens}`,
          `CN \u2212${cn}`,
          `= ${overcastSlots} surplus SL`,
        ]}
      />

      <p className={styles.thresholds}>Overcast Table thresholds (SL): {OVERCAST_THRESHOLDS}</p>

      {damagePreview != null && (
        <BreakdownTotal
          tooltipId="guided-cast-overcast-damage-preview"
          label="Overcast damage (max column spend)"
          value={damagePreview.total}
          lines={[
            `Base damage ${damagePreview.base}`,
            `Overcast bonus +${damagePreview.bonus}`,
            `= ${damagePreview.total}`,
          ]}
        />
      )}

      <OvercastAllocator
        options={computeOvercastOptions(result.spell)}
        availableSlots={overcastSlots}
        baseDamage={baseDamage}
        onAllocate={onOvercastResolved}
      />
    </div>
  );
}
