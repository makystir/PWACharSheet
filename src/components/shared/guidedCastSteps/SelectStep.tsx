import type { Character, MagicSaturation, SpellItem } from '../../../types/character';
import { computeCastingTargetBreakdown } from '../../../logic/spell-casting';
import { BreakdownTotal } from './BreakdownTotal';
import styles from './guidedCastSteps.module.css';

export interface SelectStepProps {
  character: Character;
  spell: SpellItem;
  /** getArmourCastingPenalty(character) — shown as context only, never applied here. */
  armourPenalty: number;
  /** Resolved magic saturation (?? 'normal') — shown as context only. */
  saturation: MagicSaturation;
}

const SATURATION_MODIFIERS: Record<MagicSaturation, string> = {
  low: '\u22121 SL on Casting/Channelling tests',
  normal: 'No modifier',
  heavy: '+1 SL for dominant Lore',
  extreme: '+2 SL dominant Lore / +1 SL other Lores',
  corrupted: 'Special \u2014 consult GM',
};

/**
 * Step 1 — review the spell and your casting target. Presentational only:
 * nothing is rolled, computed, or applied. The casting-target total comes from
 * the EXISTING computeCastingTargetBreakdown, with a breakdown tooltip whose
 * additive lines (Int total + Language (Magick) advances) sum to the total
 * (calculated-totals steering rule).
 *
 * // Core p.234: Casting Test — Int total + Language (Magick) advances.
 */
export function SelectStep({ character, spell, armourPenalty, saturation }: SelectStepProps) {
  const { intTotal, advances, total } = computeCastingTargetBreakdown(character);

  return (
    <div className={styles.stepBody}>
      <dl className={styles.fieldList}>
        <dt>CN</dt>
        <dd>{spell.cn}</dd>
        <dt>Range</dt>
        <dd>{spell.range}</dd>
        <dt>Target</dt>
        <dd>{spell.target}</dd>
        <dt>Duration</dt>
        <dd>{spell.duration}</dd>
        <dt>Effect</dt>
        <dd>{spell.effect}</dd>
      </dl>

      <BreakdownTotal
        tooltipId="guided-cast-casting-target"
        label="Casting target"
        value={total}
        lines={[
          `Int total ${intTotal}`,
          `Language (Magick) advances ${advances}`,
          `= ${total}`,
        ]}
      />

      {armourPenalty > 0 && (
        <p className={styles.warnNote}>
          {/* WFRP Core p.236 / Winds of Magic "Repelling the Winds": highest-AP
              location imposes a per-AP SL penalty. Context only; applied by the
              existing roll flow, not here. */}
          Armour Penalty: {'\u2212'}
          {armourPenalty} SL on Casting/Channelling tests (highest AP location: {armourPenalty} AP).
        </p>
      )}

      {saturation !== 'normal' && (
        <p className={styles.note}>
          {/* Magic saturation modifier surfaced as context only (OQ-5); not
              auto-applied — the GM/player adjusts the roll difficulty. */}
          Magic Saturation: {SATURATION_MODIFIERS[saturation]}
        </p>
      )}
    </div>
  );
}
