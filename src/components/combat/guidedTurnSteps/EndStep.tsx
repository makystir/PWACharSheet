import { ArrowRight } from 'lucide-react';
import styles from './guidedTurnSteps.module.css';

export interface EndStepProps {
  /** Reveals + focuses the EXISTING dashboard End Turn button (host). */
  onGuideRevealEndTurn: () => void;
}

/**
 * Step 4 — end of turn. The guide renders NO End Turn button of its own. It only
 * reveals and focuses the EXISTING dashboard End Turn button
 * (data-testid="end-turn-btn"); the player presses the real button, which runs
 * processEndOfTurn and shows EndOfTurnReportModal exactly as it does today. The
 * guide recomputes none of these numbers (AC-10, AC-11).
 *
 * Core p.167-169 (Master Condition List): end-of-turn condition timing.
 */
export function EndStep({ onGuideRevealEndTurn }: EndStepProps) {
  return (
    <div className={styles.stepBody}>
      <p>
        End-of-turn effects may apply (Bleeding, Ablaze, Poisoned, Stunned, and
        more). Pressing the dashboard&rsquo;s End Turn button is the only way they
        are applied — review the report, then confirm or cancel, and advance the
        round/initiative.
      </p>
      <button
        type="button"
        className={styles.primaryBtn}
        onClick={onGuideRevealEndTurn}
        data-testid="guide-goto-end-turn"
      >
        <ArrowRight size={16} aria-hidden="true" />
        Go to End Turn
      </button>
    </div>
  );
}
