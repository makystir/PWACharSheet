import type {
  JourneyStage,
  StageEndeavourRecord,
  WildernessJourney,
} from '../../types/character';
import { generateUUID } from '../uuid';
import {
  ADJUSTMENT_REASON_MAX,
  ENDEAVOUR_VALUE_MAX,
  JOURNEY_NAME_MAX,
  JOURNEY_PLACE_MAX,
  MEMBER_NOTES_MAX,
  PLANNING_NOTES_MAX,
  ROSTER_NAME_MAX,
  STAGE_NOTES_MAX,
  type JourneyEvent,
  type StageCountBreakdown,
} from './types';

/**
 * Pure journey-state reducer for the Wilderness Travel tracker (Deft Steps,
 * "Pathfinding"). React-free, JSON-serializable, pure/total/deterministic.
 * Never throws, never mutates its input (spread/map/filter only). Invalid events
 * are no-ops (return the input) — the safest recoverable behaviour for
 * player-driven state. It derives no mechanic and rolls nothing; the only
 * journey-structure rules reflected are transcribed and cited below, surfaced by
 * the UI as guidance, never auto-applied.
 *
 * Journey-structure rules reflected (all from docs/deftsteps.md, "Pathfinding"):
 *  - TRAVEL STAGES: a journey is an ordered list of Stages; the GM sets the
 *    starting count. ("TRAVEL STAGES")
 *  - Three Journey Endeavour forms — Planning, per-Stage per-member Travel, and
 *    per-Stage per-member Camp. ("JOURNEY ENDEAVOURS")
 *  - NAVIGATION ENDEAVOUR OUTCOMES: +3 or more → reduce total Stages by one;
 *    −0 to −2 and −3 or less → add a further Stage. The ±1 stageAdjustments model
 *    these player-invoked adjustments (the app reads no SL and auto-adjusts
 *    nothing).
 */

/** Coerce an external numeric input to a non-negative integer, or undefined if NaN/∞. */
function coerceNonNegInt(n: number): number | undefined {
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.floor(n));
}

/** Clamp a string to a max length (handles non-string defensively). */
function clamp(s: string, max: number): string {
  return String(s ?? '').slice(0, max);
}

/** Re-derive 1..n Stage labels from current order (no gaps). */
function relabel(stages: JourneyStage[]): JourneyStage[] {
  return stages.map((s, i) => {
    const label = String(i + 1);
    return s.label === label ? s : { ...s, label };
  });
}

/** A fresh, empty journey (used by createJourney). */
export function emptyJourney(name: string, plannedStages: number): WildernessJourney {
  return {
    name: clamp(name, JOURNEY_NAME_MAX),
    plannedStages: coerceNonNegInt(plannedStages) ?? 0,
    stageAdjustments: [],
    stages: [],
    roster: [],
    planningEndeavour: '',
  };
}

/**
 * Pure. Total. Deterministic. Never throws. Never mutates `journey`.
 * `journey` is null when none exists yet; only 'createJourney' is meaningful
 * then (any other event returns the input unchanged → null).
 */
export function journeyReducer(
  journey: WildernessJourney | null,
  event: JourneyEvent,
): WildernessJourney | null {
  switch (event.kind) {
    case 'createJourney': {
      // Never clobber an existing journey (the component gates replace/delete).
      if (journey) return journey;
      return emptyJourney(event.name, event.plannedStages);
    }

    case 'deleteJourney':
      return null;

    default:
      break;
  }

  // All remaining events require an existing journey.
  if (!journey) return journey;

  switch (event.kind) {
    case 'setMeta': {
      const patch = event.patch;
      const next: WildernessJourney = { ...journey };
      if (patch.name !== undefined) next.name = clamp(patch.name, JOURNEY_NAME_MAX);
      if (patch.origin !== undefined) next.origin = clamp(patch.origin, JOURNEY_PLACE_MAX);
      if (patch.destination !== undefined) next.destination = clamp(patch.destination, JOURNEY_PLACE_MAX);
      if (patch.planningEndeavour !== undefined) {
        next.planningEndeavour = clamp(patch.planningEndeavour, PLANNING_NOTES_MAX);
      }
      if (patch.plannedStages !== undefined) {
        // Guard non-finite/NaN first so it is a genuine no-op (leaves prior value).
        const coerced = coerceNonNegInt(patch.plannedStages);
        if (coerced !== undefined) next.plannedStages = coerced;
      }
      if (patch.planningSL !== undefined) {
        const coerced = coerceNonNegInt(patch.planningSL);
        if (coerced !== undefined) next.planningSL = coerced;
      }
      return next;
    }

    case 'addStage': {
      const stage: JourneyStage = {
        id: generateUUID(),
        label: String(journey.stages.length + 1),
        records: [],
        notes: '',
      };
      return { ...journey, stages: [...journey.stages, stage] };
    }

    case 'removeStage': {
      const filtered = journey.stages.filter((s) => s.id !== event.stageId);
      if (filtered.length === journey.stages.length) return journey; // not found → no-op
      return { ...journey, stages: relabel(filtered) };
    }

    case 'addRosterMember': {
      const member = { id: generateUUID(), name: clamp(event.name.trim(), ROSTER_NAME_MAX) };
      return { ...journey, roster: [...journey.roster, member] };
    }

    case 'renameRosterMember': {
      let changed = false;
      const roster = journey.roster.map((m) => {
        if (m.id !== event.memberId) return m;
        changed = true;
        return { ...m, name: clamp(event.name, ROSTER_NAME_MAX) };
      });
      return changed ? { ...journey, roster } : journey;
    }

    case 'removeRosterMember': {
      const roster = journey.roster.filter((m) => m.id !== event.memberId);
      if (roster.length === journey.roster.length) return journey; // not found → no-op
      // Prune orphaned endeavour records from every Stage (referential consistency).
      const stages = journey.stages.map((s) => {
        const records = s.records.filter((r) => r.memberId !== event.memberId);
        return records.length === s.records.length ? s : { ...s, records };
      });
      return { ...journey, roster, stages };
    }

    case 'setStageEndeavour': {
      const value = clamp(event.value, ENDEAVOUR_VALUE_MAX);
      let stageFound = false;
      const stages = journey.stages.map((s) => {
        if (s.id !== event.stageId) return s;
        stageFound = true;
        const existing = s.records.find((r) => r.memberId === event.memberId);
        const apply = (r: StageEndeavourRecord): StageEndeavourRecord =>
          event.slot === 'travel'
            ? { ...r, travelEndeavour: value }
            : { ...r, campEndeavour: value };
        if (existing) {
          return { ...s, records: s.records.map((r) => (r.memberId === event.memberId ? apply(r) : r)) };
        }
        const fresh: StageEndeavourRecord = {
          memberId: event.memberId,
          travelEndeavour: '',
          campEndeavour: '',
          notes: '',
        };
        return { ...s, records: [...s.records, apply(fresh)] };
      });
      return stageFound ? { ...journey, stages } : journey;
    }

    case 'setStageNotes': {
      let found = false;
      const stages = journey.stages.map((s) => {
        if (s.id !== event.stageId) return s;
        found = true;
        return { ...s, notes: clamp(event.notes, STAGE_NOTES_MAX) };
      });
      return found ? { ...journey, stages } : journey;
    }

    case 'setMemberNotes': {
      let stageFound = false;
      const stages = journey.stages.map((s) => {
        if (s.id !== event.stageId) return s;
        stageFound = true;
        const existing = s.records.find((r) => r.memberId === event.memberId);
        const notes = clamp(event.notes, MEMBER_NOTES_MAX);
        if (existing) {
          return {
            ...s,
            records: s.records.map((r) => (r.memberId === event.memberId ? { ...r, notes } : r)),
          };
        }
        const fresh: StageEndeavourRecord = {
          memberId: event.memberId,
          travelEndeavour: '',
          campEndeavour: '',
          notes,
        };
        return { ...s, records: [...s.records, fresh] };
      });
      return stageFound ? { ...journey, stages } : journey;
    }

    case 'adjustStageCount': {
      const adjustment = {
        id: generateUUID(),
        delta: event.delta,
        reason: clamp(event.reason, ADJUSTMENT_REASON_MAX),
      };
      return { ...journey, stageAdjustments: [...journey.stageAdjustments, adjustment] };
    }

    case 'removeStageCountAdjustment': {
      const stageAdjustments = journey.stageAdjustments.filter((a) => a.id !== event.adjustmentId);
      if (stageAdjustments.length === journey.stageAdjustments.length) return journey;
      return { ...journey, stageAdjustments };
    }

    default: {
      // Exhaustiveness guard: every event kind is handled above.
      return journey;
    }
  }
}

/**
 * Derive the running total Stage count shown in the UI (the breakdown-tooltip
 * source). total = max(0, plannedStages + Σ stageAdjustments.delta). Returns the
 * components so the tooltip can show the breakdown. Pure; never throws.
 *
 * // Deft Steps, "NAVIGATION ENDEAVOUR OUTCOMES": Navigate +3 reduces the total
 * // by one, −2 or worse adds one — modelled as the ±1 stageAdjustments summed
 * // here. The clamp (≥ 0) is a presentation safeguard.
 */
export function deriveStageCount(journey: WildernessJourney): StageCountBreakdown {
  const planned = coerceNonNegInt(journey.plannedStages) ?? 0;
  const adjustmentsTotal = journey.stageAdjustments.reduce((sum, a) => sum + (a.delta || 0), 0);
  const total = Math.max(0, planned + adjustmentsTotal);
  return {
    planned,
    adjustmentsTotal,
    recordedStages: journey.stages.length,
    total,
  };
}
