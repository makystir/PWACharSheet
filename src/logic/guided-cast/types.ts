/**
 * Pure, React-free guided-spellcasting types for the "Guide my spell" overlay
 * (guided-spellcasting design §"Reducer state shape & transitions"). Plain,
 * JSON-serializable data only; no imports from React. The guide is a thin
 * orchestration layer over the existing src/logic/spell-casting.ts calculators —
 * it introduces NO new casting / channelling / overcast / miscast math, never
 * mutates the character, and never auto-advances.
 *
 * RAW procedure modelled (authoritative sources: docs/WarhammerFantasyRoleplay4e.md
 * and docs/windsofmagic.md; Errata overrides Core where they conflict):
 *   Casting Test — Core p.234; Channelling Test — Core p.237 + WoM §"Channelling
 *   Test"; Critical/Fumbled Casting — Core p.234-235 + WoM §"Critical Casting" /
 *   §"Fumbled Casting"; Overcasting — Core p.238 superseded by the WoM Overcast
 *   Table (p.23); Miscast Tables — Core p.234-235.
 */

import type { CastingResult } from '../spell-casting';

/** The six RAW steps, in order. Steps 4/5 are conditional (see reducer). */
export type CastStep =
  | 'select' // 1 — spell meta + casting target
  | 'route' // 2 — cast vs channel
  | 'resolve' // 3 — cast test result
  | 'overcast' // 4 — conditional: surplus SL > 0
  | 'miscast' // 5 — conditional: a miscast trigger fired
  | 'outcome'; // 6 — summary

/** Which Step-2 route the player picked (null before a choice). */
export type CastRoute = 'cast' | 'channel' | null;

/**
 * Transient, local-only flow state. Plain JSON-serializable data; no React,
 * no closures, no functions. `result` is the SAME CastingResult the panel
 * produced via resolveCastingResult — stored, never recomputed.
 */
export interface GuidedCastState {
  step: CastStep;
  /** Memorized spell name the flow is bound to; drives spell-change reset. */
  spellName: string | null;
  route: CastRoute;
  /** Existing CastingResult (or null before the cast is resolved). */
  result: CastingResult | null;
  /** True once the player completed the overcast allocation in the existing allocator. */
  overcastDone: boolean;
  /**
   * Raw allocations captured from the existing OvercastAllocator (column name →
   * SL spent), or null. Plain JSON data; resolved for display in Step 6 via the
   * EXISTING resolveOvercastAllocations/lookupOvercastEffect — never recomputed.
   */
  overcastAllocations: Record<string, number> | null;
  /** True once the player rolled a miscast in the existing path. */
  miscastDone: boolean;
}

/**
 * Every transition is driven by an explicit player EVENT (or a panel push of a
 * resolved result). There is no timer, no auto-advance.
 */
export type GuidedCastEvent =
  | { kind: 'start'; spellName: string } // open the flow for a spell (Step 1)
  | { kind: 'next' } // player: advance (skips inapplicable steps)
  | { kind: 'back' } // player: retreat (skips inapplicable steps)
  | { kind: 'goto'; step: CastStep } // player: jump via the stepper
  | { kind: 'chooseRoute'; route: CastRoute } // player: picked Cast or Channel (Step 2)
  | { kind: 'castResolved'; result: CastingResult } // panel reported a resolved cast
  | { kind: 'overcastResolved'; allocations: Record<string, number> } // allocator captured
  | { kind: 'miscastCompleted' } // player rolled the miscast
  | { kind: 'reset' }; // boundary: flow end / spell change

/** Static, rulebook-cited copy for a step. No runtime computation. */
export interface CastStepInfo {
  step: CastStep;
  title: string;
  /** Guidance prose (never gates). */
  body: string;
  /** Rulebook page citation string, rendered in the step header. */
  citation: string;
}

/**
 * Future-proof advisor seam. Synchronous-by-default with the SAME sync/async-union
 * contract as the assistant's SuggestionSource (src/logic/assistant/types.ts) and
 * the combat-turn TurnAdvisorSource, so a future LLM-backed advisor is a
 * NON-BREAKING swap of the default advisor object. v1 ships only the deterministic
 * sync default; it makes no network/LLM/telemetry call.
 */
export interface CastAdvisorSource {
  describe(
    step: CastStep,
    ctx: { isPetty: boolean; route: CastRoute },
  ): CastStepInfo | Promise<CastStepInfo>;
}
