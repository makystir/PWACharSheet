import { useState } from 'react';
import { Info } from 'lucide-react';
import { Tooltip } from '../../shared/Tooltip';
import type { TurnOption } from '../../../logic/combat-turn/types';
import styles from './guidedTurnSteps.module.css';

export interface ChooseStepProps {
  /** Pick a Step-2 option; routes to the matching existing control (host). */
  onChoose: (option: Exclude<TurnOption, null>) => void;
  /** True when the host's SpellCastingPanel would render (hasSpellcasting). */
  hasSpellcasting: boolean;
  /** Current guidance flags (never gate — AC-13). */
  moveUsed: boolean;
  actionUsed: boolean;
  onMarkMove: (used: boolean) => void;
}

/**
 * Step 2 — choose your Move and/or Action (Core p.156-157). Option chips route
 * to the existing control via the host hand-off callbacks; the guide gates
 * nothing. Charge / On The Defensive / Disengage are shown as named, cited,
 * guidance-only text (deferred per the design — not tracked or auto-applied).
 *
 * The Cast option is disabled with an explanatory tooltip when hasSpellcasting
 * is false (it tracks exactly when the Status-mode SpellCastingPanel renders).
 */
export function ChooseStep({
  onChoose,
  hasSpellcasting,
  moveUsed,
  actionUsed,
  onMarkMove,
}: ChooseStepProps) {
  const [castTip, setCastTip] = useState<HTMLElement | null>(null);

  return (
    <div className={styles.stepBody}>
      <div className={styles.optionGrid} role="group" aria-label="Action options">
        <button
          type="button"
          className={styles.optionChip}
          onClick={() => onChoose('attack')}
          data-testid="guide-option-attack"
        >
          Attack
          {/* Core p.157-158 (Attacking) */}
          <span className={styles.optionHint}>Resolve in the Attack Flow</span>
        </button>

        <span className={styles.castWrap}>
          <button
            type="button"
            className={styles.optionChip}
            onClick={() => onChoose('cast')}
            disabled={!hasSpellcasting}
            data-testid="guide-option-cast"
            aria-describedby={castTip ? 'guide-cast-disabled-tip' : undefined}
          >
            Cast / Pray
            <span className={styles.optionHint}>Open the spellcasting panel</span>
          </button>
          {!hasSpellcasting && (
            <>
              <button
                type="button"
                className={styles.infoBtn}
                aria-label="Why is Cast / Pray unavailable?"
                onClick={(e) =>
                  setCastTip((prev) => (prev ? null : e.currentTarget))
                }
              >
                <Info size={14} aria-hidden="true" />
              </button>
              {castTip && (
                <Tooltip
                  anchorEl={castTip}
                  title="Cast / Pray unavailable"
                  id="guide-cast-disabled-tip"
                  onClose={() => setCastTip(null)}
                >
                  This character has no spells, no casting/prayer talent, and no
                  Channelling or Language (Magick) skill, so the spellcasting
                  panel does not apply.
                </Tooltip>
              )}
            </>
          )}
        </span>

        <button
          type="button"
          className={styles.optionChip}
          onClick={() => onChoose('defend')}
          data-testid="guide-option-defend"
        >
          Defend / other
          <span className={styles.optionHint}>Take Damage &amp; Armour</span>
        </button>

        <button
          type="button"
          className={styles.optionChip}
          onClick={() => onChoose('skill')}
          data-testid="guide-option-skill"
        >
          Use a Skill
          <span className={styles.optionHint}>Quick Roll / weapon roll</span>
        </button>
      </div>

      {/* Guidance-only options — named and cited, never auto-applied (deferred). */}
      <ul className={styles.guidanceList} aria-label="Other options">
        <li>
          {/* Core p.156-157 (Advantage p.164): Charge into close combat for +1 Advantage. */}
          <strong>Charge</strong> into close combat for +1 Advantage — apply it
          yourself on the dashboard. <span className={styles.cite}>Core p.156-157 (Advantage p.164)</span>
        </li>
        <li>
          {/* Core p.157: On The Defensive. */}
          <strong>On The Defensive</strong>: as your Action, choose a Skill for +20
          to defensive Tests until your next Turn. <span className={styles.cite}>Core p.157</span>
        </li>
        <li>
          {/* Core p.164: Disengage uses Advantage. */}
          <strong>Disengage</strong> from combat using Advantage. <span className={styles.cite}>Core p.164</span>
        </li>
      </ul>

      {/* Soft Move tracking — guidance only, gates nothing (AC-13). */}
      <label className={styles.markRow}>
        <input
          type="checkbox"
          checked={moveUsed}
          onChange={(e) => onMarkMove(e.target.checked)}
          data-testid="guide-mark-move"
        />
        I&rsquo;ve used my Move this turn
      </label>
      {moveUsed && actionUsed && (
        <p className={styles.advisory} data-testid="guide-move-action-advisory">
          You&rsquo;ve marked both your Move and Action used — RAW gives one of each
          per Turn. <span className={styles.cite}>Core p.156-157</span>
        </p>
      )}
    </div>
  );
}
