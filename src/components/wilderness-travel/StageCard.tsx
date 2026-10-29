import type { JourneyRosterMember, JourneyStage } from '../../types/character';
import type { JourneyEvent } from '../../logic/wilderness-travel/types';
import {
  CAMP_ENDEAVOUR_OPTIONS,
  TRAVEL_ENDEAVOUR_OPTIONS,
} from '../../logic/wilderness-travel/types';
import styles from './JourneyTrackerPanel.module.css';

interface StageCardProps {
  stage: JourneyStage;
  roster: JourneyRosterMember[];
  dispatch: (event: JourneyEvent) => void;
}

/**
 * A single Stage of the journey: one row per roster member with a Travel- and
 * Camp-endeavour selector plus per-member notes, a Stage-notes field, and a
 * remove-Stage control.
 *
 * The "both endeavours" reminder is transcribed, cited guidance — advisory only,
 * never auto-applied:
 * // Deft Steps, "Travel Endeavours and Camp Endeavours" (deftsteps.md): "If a
 * // character does both a travel endeavour and a camp endeavour, they must pass
 * // a Hard (-20) Endurance Test or gain a Fatigued Condition." Slice A does NOT
 * // roll the test or mutate character.conditions.
 */
export function StageCard({ stage, roster, dispatch }: StageCardProps) {
  const recordFor = (memberId: string) =>
    stage.records.find((r) => r.memberId === memberId);

  return (
    <div className={styles.stageCard}>
      <div className={styles.stageHeader}>
        <span className={styles.stageTitle}>Stage {stage.label}</span>
        <button
          type="button"
          className={styles.dangerBtn}
          onClick={() => dispatch({ kind: 'removeStage', stageId: stage.id })}
          aria-label={`Remove Stage ${stage.label}`}
        >
          Remove Stage
        </button>
      </div>

      {roster.length === 0 && (
        <p className={styles.emptyRoster}>Add party members above to record their endeavours.</p>
      )}

      {roster.map((member) => {
        const rec = recordFor(member.id);
        const travel = rec?.travelEndeavour ?? '';
        const camp = rec?.campEndeavour ?? '';
        const notes = rec?.notes ?? '';
        const bothChosen = travel !== '' && camp !== '';
        return (
          <div key={member.id} className={styles.memberRow}>
            <div className={styles.memberName}>{member.name || '(unnamed)'}</div>

            <div>
              <label className={styles.fieldLabel} htmlFor={`travel-${stage.id}-${member.id}`}>
                Travel Endeavour
              </label>
              <select
                id={`travel-${stage.id}-${member.id}`}
                className={styles.selectField}
                value={travel}
                onChange={(e) =>
                  dispatch({
                    kind: 'setStageEndeavour',
                    stageId: stage.id,
                    memberId: member.id,
                    slot: 'travel',
                    value: e.target.value,
                  })
                }
              >
                <option value="">— none —</option>
                {TRAVEL_ENDEAVOUR_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={styles.fieldLabel} htmlFor={`camp-${stage.id}-${member.id}`}>
                Camp Endeavour
              </label>
              <select
                id={`camp-${stage.id}-${member.id}`}
                className={styles.selectField}
                value={camp}
                onChange={(e) =>
                  dispatch({
                    kind: 'setStageEndeavour',
                    stageId: stage.id,
                    memberId: member.id,
                    slot: 'camp',
                    value: e.target.value,
                  })
                }
              >
                <option value="">— none —</option>
                {CAMP_ENDEAVOUR_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {bothChosen && (
              <div className={styles.reminder} role="note">
                Both endeavours chosen: Hard (−20) Endurance Test or gain Fatigued
                (Deft Steps, &ldquo;Travel Endeavours and Camp Endeavours&rdquo;). Advisory only —
                not applied automatically.
              </div>
            )}

            <div className={styles.memberNotesRow}>
              <label className={styles.fieldLabel} htmlFor={`notes-${stage.id}-${member.id}`}>
                Result / notes
              </label>
              <textarea
                id={`notes-${stage.id}-${member.id}`}
                className={styles.textarea}
                value={notes}
                placeholder="SL, outcome, GM ruling…"
                onChange={(e) =>
                  dispatch({
                    kind: 'setMemberNotes',
                    stageId: stage.id,
                    memberId: member.id,
                    notes: e.target.value,
                  })
                }
              />
            </div>
          </div>
        );
      })}

      <div className={styles.memberNotesRow} style={{ marginTop: 8 }}>
        <label className={styles.fieldLabel} htmlFor={`stage-notes-${stage.id}`}>
          Stage notes
        </label>
        <textarea
          id={`stage-notes-${stage.id}`}
          className={styles.textarea}
          value={stage.notes}
          placeholder="Weather, terrain, events this Stage…"
          onChange={(e) => dispatch({ kind: 'setStageNotes', stageId: stage.id, notes: e.target.value })}
        />
      </div>
    </div>
  );
}
