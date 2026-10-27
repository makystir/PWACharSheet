import type { CastingResult } from '../../../logic/spell-casting';
import { CriticalChoiceButtons, type CriticalChoice } from '../castControls/CriticalChoiceButtons';
import { BreakdownTotal } from './BreakdownTotal';
import styles from './guidedCastSteps.module.css';

export interface ResolveStepProps {
  /** The resolved cast, or null before the roll has happened. */
  result: CastingResult | null;
  /** Opens (re-opens) the existing cast RollDialog via the host handle. */
  onOpenCast: () => void;
  /** Delegates the Critical-Cast choice to the host handle (chooseCritical). */
  onChooseCritical: (choice: CriticalChoice) => void;
}

function formatSL(sl: number): string {
  return sl >= 0 ? `+${sl}` : `${sl}`;
}

/**
 * Step 3 — resolve the Casting Test. Before the roll, an "Open Cast roll" button
 * hands off to the EXISTING RollDialog (the guide renders no dice). After the
 * panel pushes the resolved CastingResult, the SL achieved and SL-vs-CN are read
 * VERBATIM off the result with breakdown tooltips (calculated-totals steering).
 *
 * The Critical-Cast choices render gated on result.isCriticalCast ALONE (NOT
 * castSuccess), mirroring CastResultDisplay's own gate, and delegate to the
 * host's chooseCritical handler (no forked logic).
 *
 * // Core p.234-235 + WoM "Critical Casting"/"Fumbled Casting" (doubles on success/failure).
 */
export function ResolveStep({ result, onOpenCast, onChooseCritical }: ResolveStepProps) {
  return (
    <div className={styles.stepBody}>
      <div className={styles.actionRow}>
        <button type="button" className={styles.actionBtn} onClick={onOpenCast}>
          {result ? 'Re-open Cast roll' : 'Open Cast roll'}
        </button>
      </div>

      {result && (
        <>
          <BreakdownTotal
            tooltipId="guided-cast-sl-achieved"
            label="SL achieved"
            value={formatSL(result.slAchieved)}
            lines={[
              `Roll ${result.rollResult.roll}`,
              `Target ${result.rollResult.targetNumber}`,
              `= SL ${formatSL(result.slAchieved)}`,
            ]}
          />
          <BreakdownTotal
            tooltipId="guided-cast-sl-vs-cn"
            label="SL vs CN"
            value={`${formatSL(result.slAchieved)} vs ${result.cn}`}
            lines={[
              `SL achieved ${formatSL(result.slAchieved)}`,
              `CN ${result.cn}`,
              result.castSuccess ? '= Cast succeeds' : '= Failed to reach CN',
            ]}
          />

          <p className={result.castSuccess ? styles.passColor : styles.failColor}>
            {result.isFullyChannelled
              ? 'Channelled Cast — Success!'
              : result.castSuccess
                ? `SL ${formatSL(result.slAchieved)} vs CN ${result.cn} — Cast!`
                : `SL ${formatSL(result.slAchieved)} vs CN ${result.cn} — Failed to reach CN`}
          </p>

          {result.isCriticalCast && (
            <div>
              <div className={styles.sectionLabel}>Critical Cast — choose one</div>
              <CriticalChoiceButtons onCriticalChoice={onChooseCritical} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
