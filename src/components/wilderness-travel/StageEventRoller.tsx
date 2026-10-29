import { useState } from 'react';
import { Dices } from 'lucide-react';
import type { TerrainType } from '../../logic/wilderness-travel/journey-modifiers';
import {
  EVENT_TRIGGER_THRESHOLD,
  rollWildernessEvent,
  type WildernessEventResult,
} from '../../logic/wilderness-travel/journey-events';
import styles from './JourneyTrackerPanel.module.css';

interface StageEventRollerProps {
  /** The Stage's selected terrain (from Slice B); undefined if the player has not chosen one. */
  terrain: TerrainType | undefined;
}

/**
 * Slice C — optional "Roll event for this Stage" helper.
 *
 * Uses the Stage's selected terrain to pick the correct event table, rolls the
 * trigger 1d10 (8+ triggers, Deft Steps p.116), and — on a trigger — rolls the
 * event 1d10 and shows the resolved row text (resolving the Table-1 redirect for
 * Mountains/Deep forest/Wetland on a 1–5 result). Dice are sourced via the
 * project's RNG seam (Math.random by default).
 *
 * The result is TRANSIENT UI state only — nothing is persisted on the Stage, no
 * `_v` bump, and NO effect is auto-applied (adding stages, mutating conditions,
 * changing provisions are all GM-adjudicated). A caption states the GM decides.
 * If no terrain is selected, the helper prompts the player to pick terrain first
 * rather than rolling against a guessed table.
 */
export function StageEventRoller({ terrain }: StageEventRollerProps) {
  const [result, setResult] = useState<WildernessEventResult | null>(null);

  const roll = () => {
    if (!terrain) return;
    setResult(rollWildernessEvent(terrain));
  };

  return (
    <div className={styles.memberNotesRow} style={{ marginTop: 8 }}>
      <label className={styles.fieldLabel}>Wilderness Travel Event</label>

      {!terrain ? (
        <p className={styles.rollerNoEvent}>
          Select a terrain for this Stage above to roll an event (the terrain picks the correct
          event table &mdash; Deft Steps p.116&ndash;117).
        </p>
      ) : (
        <>
          <div className={styles.rollerRow}>
            <button type="button" className={styles.primaryBtn} onClick={roll}>
              <Dices size={14} /> Roll event for this Stage
            </button>
            <span className={styles.seedNote}>
              Rolls 1d10; {EVENT_TRIGGER_THRESHOLD}+ triggers an event on the{' '}
              {terrain} table.
            </span>
          </div>

          {result && (
            <div className={styles.rollerResult} role="status">
              <div className={styles.rollerDice}>
                Trigger 1d10: <strong>{result.triggerRoll}</strong>
                {result.triggered && result.eventRoll !== undefined && (
                  <>
                    {' '}&middot; Event 1d10: <strong>{result.eventRoll}</strong>
                  </>
                )}
                {result.redirected && result.redirectRoll !== undefined && (
                  <>
                    {' '}&middot; Table&nbsp;1 redirect 1d10: <strong>{result.redirectRoll}</strong>
                  </>
                )}
              </div>

              {!result.triggered ? (
                <p className={styles.rollerNoEvent}>
                  No event ({result.triggerRoll} is below {EVENT_TRIGGER_THRESHOLD}). The Stage
                  passes without an unexpected occurrence.
                </p>
              ) : (
                <>
                  <p className={styles.rollerOutcome}>
                    <strong>
                      {result.resolvedTable?.name}
                      {result.resolvedTable ? ` (Deft Steps p.${result.resolvedTable.page})` : ''}
                    </strong>
                    {result.redirected && (
                      <> &mdash; redirected from the {terrain} table (rolled {result.eventRoll}, 1&ndash;5).</>
                    )}
                  </p>
                  <p className={styles.rollerOutcome}>{result.resolvedRow?.result}</p>
                </>
              )}

              <span className={styles.rollerCaption}>
                Reference only &mdash; the GM adjudicates whether and how this event occurs. Nothing
                is applied to your character automatically (Deft Steps p.116).
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default StageEventRoller;
