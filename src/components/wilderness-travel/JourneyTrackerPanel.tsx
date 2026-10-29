import { useState } from 'react';
import { Map as MapIcon, Plus, Minus } from 'lucide-react';
import type { Character } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { EmptyState } from '../shared/EmptyState';
import { Tooltip } from '../shared/Tooltip';
import { TooltipTriggerCell } from '../shared/TooltipTriggerCell';
import {
  deriveStageCount,
  journeyReducer,
} from '../../logic/wilderness-travel/journey-state';
import type { JourneyEvent } from '../../logic/wilderness-travel/types';
import { StageCard } from './StageCard';
import styles from './JourneyTrackerPanel.module.css';

interface JourneyTrackerPanelProps {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

type OpenTooltip = { kind: 'total' | 'recorded'; anchorEl: HTMLElement } | null;

/**
 * Toggle-gated Wilderness Travel journey tracker (Deft Steps "Pathfinding").
 * Player-driven: every change dispatches a pure JourneyEvent through
 * journeyReducer and persists via updateCharacter. Nothing auto-applies, nothing
 * is rolled — the structural rules (Navigate add/remove-Stage, both-endeavours
 * Fatigue test) are surfaced as transcribed, cited guidance only (Slice A).
 */
export function JourneyTrackerPanel({ character, updateCharacter }: JourneyTrackerPanelProps) {
  const journey = character.wildernessJourney ?? null;

  const [newMemberName, setNewMemberName] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [openTooltip, setOpenTooltip] = useState<OpenTooltip>(null);

  const closeTooltip = () => setOpenTooltip(null);
  const openTooltipFor = (kind: NonNullable<OpenTooltip>['kind']) => (anchorEl: HTMLElement) =>
    setOpenTooltip({ kind, anchorEl });

  /** Apply a pure journey event and persist the result. */
  const dispatch = (event: JourneyEvent) => {
    updateCharacter((char) => {
      const next = journeyReducer(char.wildernessJourney ?? null, event);
      if (next === null) {
        // deleteJourney (or create from null that no-ops) → drop the optional field.
        const rest = { ...char };
        delete rest.wildernessJourney;
        return rest;
      }
      return { ...char, wildernessJourney: next };
    });
  };

  // ─── Empty state: no journey yet ──────────────────────────────────────────
  if (!journey) {
    return (
      <Card>
        <SectionHeader icon={MapIcon} title="Wilderness Travel" />
        <EmptyState
          icon={MapIcon}
          heading="No active journey"
          description="Start a Stage-by-Stage journey to track Travel and Camp Endeavours through the wilds (Deft Steps, Pathfinding)."
          action={{
            label: 'Start a Journey',
            onClick: () => dispatch({ kind: 'createJourney', name: '', plannedStages: 0 }),
          }}
        />
      </Card>
    );
  }

  const counts = deriveStageCount(journey);

  const addMember = () => {
    if (!newMemberName.trim()) return;
    dispatch({ kind: 'addRosterMember', name: newMemberName });
    setNewMemberName('');
  };

  const adjust = (delta: 1 | -1) => {
    dispatch({ kind: 'adjustStageCount', delta, reason: adjustReason });
    setAdjustReason('');
  };

  const deleteJourney = () => {
    if (window.confirm('Delete this journey? This cannot be undone.')) {
      dispatch({ kind: 'deleteJourney' });
    }
  };

  return (
    <div className={styles.sectionGap}>
      {/* Journey meta */}
      <Card>
        <SectionHeader
          icon={MapIcon}
          title="Wilderness Travel"
          action={
            <button type="button" className={styles.dangerBtn} onClick={deleteJourney}>
              Delete Journey
            </button>
          }
        />
        <div className={styles.metaGrid}>
          <div>
            <label className={styles.fieldLabel} htmlFor="journey-name">Journey Name</label>
            <input
              id="journey-name"
              className={styles.inlineInput}
              value={journey.name}
              placeholder="e.g. The Drakwald Crossing"
              onChange={(e) => dispatch({ kind: 'setMeta', patch: { name: e.target.value } })}
            />
          </div>
          <div>
            <label className={styles.fieldLabel} htmlFor="journey-origin">Origin</label>
            <input
              id="journey-origin"
              className={styles.inlineInput}
              value={journey.origin ?? ''}
              onChange={(e) => dispatch({ kind: 'setMeta', patch: { origin: e.target.value } })}
            />
          </div>
          <div>
            <label className={styles.fieldLabel} htmlFor="journey-destination">Destination</label>
            <input
              id="journey-destination"
              className={styles.inlineInput}
              value={journey.destination ?? ''}
              onChange={(e) => dispatch({ kind: 'setMeta', patch: { destination: e.target.value } })}
            />
          </div>
          <div>
            <label className={styles.fieldLabel} htmlFor="journey-planned">Planned Stages</label>
            <input
              id="journey-planned"
              type="number"
              min={0}
              className={styles.inlineInput}
              value={journey.plannedStages}
              onChange={(e) =>
                dispatch({ kind: 'setMeta', patch: { plannedStages: Number(e.target.value) } })
              }
            />
          </div>
        </div>
      </Card>

      {/* Stage-count summary (calculated totals → breakdown tooltips) */}
      <Card>
        <SectionHeader icon={MapIcon} title="Stages" />
        <div className={styles.countRow}>
          <div className={styles.countItem}>
            <span className={styles.countLabel}>Total Stages</span>
            <TooltipTriggerCell
              tooltipId="journey-total-stages"
              className={styles.countValue}
              displayValue={counts.total}
              ariaLabel={`Total journey stages: ${counts.total}. Planned ${counts.planned} + Navigate adjustments ${counts.adjustmentsTotal >= 0 ? '+' : ''}${counts.adjustmentsTotal} = ${counts.total}. Show breakdown.`}
              isTooltipOpen={openTooltip?.kind === 'total'}
              onOpen={openTooltipFor('total')}
              onClose={closeTooltip}
            />
          </div>
          <div className={styles.countItem}>
            <span className={styles.countLabel}>Recorded Stages</span>
            <TooltipTriggerCell
              tooltipId="journey-recorded-stages"
              className={styles.countValue}
              displayValue={counts.recordedStages}
              ariaLabel={`Recorded stages: ${counts.recordedStages} (Stage cards added). Show breakdown.`}
              isTooltipOpen={openTooltip?.kind === 'recorded'}
              onOpen={openTooltipFor('recorded')}
              onClose={closeTooltip}
            />
          </div>
        </div>

        <p className={styles.guidance}>
          Total Stages is the GM&rsquo;s projected journey length (adjusted by Navigate outcomes).
          The Stage cards below are the days you&rsquo;ve recorded so far — the two can differ.
        </p>

        {/* Navigate add/remove-Stage controls (transcribed guidance, player-invoked) */}
        <p className={styles.guidance}>
          Navigate outcomes (Deft Steps, &ldquo;Navigation Endeavour Outcomes&rdquo;): on +3 SL or more the
          navigator finds a shortcut — reduce the total Stages by one. On −2 SL or worse the party is
          led astray — add a further Stage (and the GM generates a Travel Event). Apply these yourself:
        </p>
        <div className={styles.adjustControls}>
          <input
            className={styles.reasonInput}
            value={adjustReason}
            placeholder="Reason (e.g. Navigate +3 shortcut)"
            onChange={(e) => setAdjustReason(e.target.value)}
          />
          <button type="button" className={styles.primaryBtn} onClick={() => adjust(1)}>
            <Plus size={14} /> Add to Total (led astray)
          </button>
          <button type="button" className={styles.primaryBtn} onClick={() => adjust(-1)}>
            <Minus size={14} /> Reduce Total (shortcut)
          </button>
        </div>

        {journey.stageAdjustments.length > 0 && (
          <div className={styles.adjustmentList}>
            {journey.stageAdjustments.map((a) => (
              <div key={a.id} className={styles.adjustmentRow}>
                <span className={styles.adjustmentDelta}>{a.delta > 0 ? `+${a.delta}` : a.delta}</span>
                <span style={{ flex: 1 }}>{a.reason || '(no reason given)'}</span>
                <button
                  type="button"
                  className={styles.removeBtn}
                  aria-label="Remove adjustment"
                  onClick={() => dispatch({ kind: 'removeStageCountAdjustment', adjustmentId: a.id })}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Planning Endeavour */}
      <Card>
        <SectionHeader icon={MapIcon} title="Planning Endeavour" />
        <p className={styles.guidance}>
          Deft Steps, &ldquo;Planning Endeavour&rdquo;: before setting off, each member may take a
          Challenging (+0) Outdoor Survival or Research Test. Every SL can be traded for a reroll of a
          Travel Event or a Journey/Camp Endeavour Test during the journey. Record your notes and any
          banked SL here (reroll tracking is a later slice).
        </p>
        <div className={styles.metaGrid}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className={styles.fieldLabel} htmlFor="journey-planning">Planning notes</label>
            <textarea
              id="journey-planning"
              className={styles.textarea}
              value={journey.planningEndeavour}
              onChange={(e) =>
                dispatch({ kind: 'setMeta', patch: { planningEndeavour: e.target.value } })
              }
            />
          </div>
          <div>
            <label className={styles.fieldLabel} htmlFor="journey-planning-sl">Banked Planning SL</label>
            <input
              id="journey-planning-sl"
              type="number"
              min={0}
              className={styles.inlineInput}
              value={journey.planningSL ?? 0}
              onChange={(e) =>
                dispatch({ kind: 'setMeta', patch: { planningSL: Number(e.target.value) } })
              }
            />
          </div>
        </div>
      </Card>

      {/* Party roster */}
      <Card>
        <SectionHeader icon={MapIcon} title="Party Roster" />
        <div className={styles.rosterList}>
          {journey.roster.map((member) => (
            <div key={member.id} className={styles.rosterRow}>
              <input
                className={styles.inlineInput}
                value={member.name}
                aria-label="Party member name"
                onChange={(e) =>
                  dispatch({ kind: 'renameRosterMember', memberId: member.id, name: e.target.value })
                }
              />
              <button
                type="button"
                className={styles.removeBtn}
                aria-label={`Remove ${member.name || 'party member'}`}
                onClick={() => dispatch({ kind: 'removeRosterMember', memberId: member.id })}
              >
                ✕
              </button>
            </div>
          ))}
          {journey.roster.length === 0 && (
            <p className={styles.emptyRoster}>No party members yet.</p>
          )}
        </div>
        <div className={styles.addRosterRow}>
          <input
            className={styles.inlineInput}
            value={newMemberName}
            placeholder="Add a party member…"
            aria-label="New party member name"
            onChange={(e) => setNewMemberName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addMember();
              }
            }}
          />
          <button type="button" className={styles.primaryBtn} onClick={addMember} disabled={!newMemberName.trim()}>
            <Plus size={14} /> Add Member
          </button>
        </div>
      </Card>

      {/* Stage list */}
      <Card>
        <SectionHeader
          icon={MapIcon}
          title="Stage-by-Stage"
          action={
            <button type="button" className={styles.primaryBtn} onClick={() => dispatch({ kind: 'addStage' })}>
              <Plus size={14} /> Add Stage
            </button>
          }
        />
        {journey.stages.length === 0 && (
          <p className={styles.emptyRoster}>No Stages recorded yet. Add a Stage to begin the journey.</p>
        )}
        <div className={styles.stageList}>
          {journey.stages.map((stage) => (
            <StageCard key={stage.id} stage={stage} roster={journey.roster} dispatch={dispatch} />
          ))}
        </div>
      </Card>

      {/* Breakdown tooltips (single-open at a time) */}
      {openTooltip?.kind === 'total' && (
        <Tooltip
          id="journey-total-stages"
          anchorEl={openTooltip.anchorEl}
          title="Total Stages"
          onClose={closeTooltip}
        >
          <div className={styles.tooltipBreakdown}>
            <div className={styles.tooltipLine}>
              <span>Planned</span>
              <span>{counts.planned}</span>
            </div>
            {journey.stageAdjustments.length === 0 ? (
              <div className={styles.tooltipLine}>
                <span>Navigate adjustments</span>
                <span>0</span>
              </div>
            ) : (
              journey.stageAdjustments.map((a) => (
                <div key={a.id} className={styles.tooltipLine}>
                  <span>{a.reason || 'Navigate adjustment'}</span>
                  <span>{a.delta > 0 ? `+${a.delta}` : a.delta}</span>
                </div>
              ))
            )}
            <div className={styles.tooltipTotal}>
              <span>Total</span>
              <span>{counts.total}</span>
            </div>
            {counts.planned + counts.adjustmentsTotal < 0 && (
              <div className={styles.tooltipNote}>Clamped to 0 (adjustments exceed planned stages).</div>
            )}
          </div>
        </Tooltip>
      )}
      {openTooltip?.kind === 'recorded' && (
        <Tooltip
          id="journey-recorded-stages"
          anchorEl={openTooltip.anchorEl}
          title="Recorded Stages"
          onClose={closeTooltip}
        >
          <div className={styles.tooltipBreakdown}>
            <div className={styles.tooltipLine}>
              <span>Stage cards added</span>
              <span>{counts.recordedStages}</span>
            </div>
          </div>
        </Tooltip>
      )}
    </div>
  );
}

export default JourneyTrackerPanel;
