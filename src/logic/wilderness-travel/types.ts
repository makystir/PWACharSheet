/**
 * Pure, React-free types for the optional Wilderness Travel journey tracker
 * (Deft Steps, Light Fingers — "Pathfinding" chapter, docs/deftsteps.md).
 *
 * Plain, JSON-serializable data only; no React imports. The reducer is a thin
 * player-driven state machine over the persisted `WildernessJourney` that lives
 * on the character — it introduces NO new mechanic, rolls no dice, applies no
 * test, and never mutates the character outside the normal updateCharacter path
 * (Slice A). The journey-structure rules it reflects are transcribed from the
 * book and cited in reducer.ts; nothing is invented.
 */

import type { WildernessJourney } from '../../types/character';
import type { StageWeather, TerrainType } from './journey-modifiers';

/**
 * Travel Endeavour options.
 * // Deft Steps, "JOURNEY ENDEAVOURS" table (deftsteps.md): the Travel column
 * // lists Forage, Haste, Hunt/Fish, Map, Navigate, Scout, Track, Water.
 * 'Other' is an app-only escape hatch so a player is never blocked; the
 * per-endeavour test/difficulty/effect catalog is Slice B (not encoded here).
 */
export const TRAVEL_ENDEAVOUR_OPTIONS = [
  'Forage', 'Haste', 'Hunt/Fish', 'Map', 'Navigate', 'Scout', 'Track', 'Water', 'Other',
] as const;

/**
 * Camp Endeavour options.
 * // Deft Steps, "JOURNEY ENDEAVOURS" table (deftsteps.md): the Camp column
 * // lists Cook, Journal, Make Camp, Map, Navigate, Recuperate, Trap, Watch.
 * Note Map and Navigate appear in BOTH the Travel and Camp columns in the book.
 */
export const CAMP_ENDEAVOUR_OPTIONS = [
  'Cook', 'Journal', 'Make Camp', 'Map', 'Navigate', 'Recuperate', 'Trap', 'Watch', 'Other',
] as const;

export type TravelEndeavourOption = typeof TRAVEL_ENDEAVOUR_OPTIONS[number];
export type CampEndeavourOption = typeof CAMP_ENDEAVOUR_OPTIONS[number];

// Field-length limits (validated at the reducer boundary so the UI cannot
// persist out-of-range data). See design §9.
export const JOURNEY_NAME_MAX = 100;
export const JOURNEY_PLACE_MAX = 100;
export const ROSTER_NAME_MAX = 100;
export const ENDEAVOUR_VALUE_MAX = 50;
export const MEMBER_NOTES_MAX = 500;
export const STAGE_NOTES_MAX = 1000;
export const PLANNING_NOTES_MAX = 1000;
export const ADJUSTMENT_REASON_MAX = 200;

/**
 * Every transition is an explicit player event. No timer, no auto-advance,
 * no dice, no auto-applied outcome.
 */
export type JourneyEvent =
  | { kind: 'createJourney'; name: string; plannedStages: number }
  | {
      kind: 'setMeta';
      patch: Partial<
        Pick<
          WildernessJourney,
          'name' | 'origin' | 'destination' | 'plannedStages' | 'planningEndeavour' | 'planningSL'
        >
      >;
    }
  | { kind: 'addStage' } // append a new Stage (advance the journey)
  | { kind: 'removeStage'; stageId: string }
  | { kind: 'addRosterMember'; name: string }
  | { kind: 'renameRosterMember'; memberId: string; name: string }
  | { kind: 'removeRosterMember'; memberId: string }
  | { kind: 'setStageEndeavour'; stageId: string; memberId: string; slot: 'travel' | 'camp'; value: string }
  | { kind: 'setStageNotes'; stageId: string; notes: string }
  | { kind: 'setMemberNotes'; stageId: string; memberId: string; notes: string }
  | { kind: 'adjustStageCount'; delta: 1 | -1; reason: string } // Navigate outcome
  | { kind: 'removeStageCountAdjustment'; adjustmentId: string }
  // Slice B: per-member banked Planning SL (Deft Steps p.115). Each SL = one reroll.
  | { kind: 'setMemberPlanningSL'; memberId: string; planningSL: number }
  // Slice B: per-Stage terrain selection (Deft Steps p.124 Terrain Table).
  | { kind: 'setStageTerrain'; stageId: string; terrain: TerrainType | undefined }
  // Slice B: per-Stage weather selection (Deft Steps p.114 Weather Table).
  | { kind: 'setStageWeather'; stageId: string; weather: StageWeather }
  // Slice B: party-level tents flag (Deft Steps p.114 Tents → Make Camp Average).
  | { kind: 'setJourneyTents'; hasTents: boolean }
  | { kind: 'deleteJourney' };

/** The derived running Stage count plus its breakdown components (for the tooltip). */
export interface StageCountBreakdown {
  /** journey.plannedStages (coerced ≥ 0 at write time). */
  planned: number;
  /** Σ of all stageAdjustments.delta. */
  adjustmentsTotal: number;
  /** journey.stages.length — informational "recorded" count, independent of total. */
  recordedStages: number;
  /** max(0, planned + adjustmentsTotal). */
  total: number;
}
