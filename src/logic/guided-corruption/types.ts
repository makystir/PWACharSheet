/**
 * Pure, React-free guided-corruption / mutation types for the "Guide me through
 * corruption" overlay (guided-disease-corruption FEAT-002). Plain,
 * JSON-serializable data only; no imports from React. The guide is a thin
 * orchestration layer over the existing src/logic/corruption.ts calculators — it
 * introduces NO new threshold / mutation / corruption-loss math, never mutates
 * the character, and never auto-advances. Every displayed number comes from the
 * existing pure logic; the guide only CITES the rules.
 *
 * RAW procedure modelled (authoritative source: docs/WarhammerFantasyRoleplay4e.md;
 * Errata overrides Core where they conflict):
 *   Corrupting — Core p.183: once Corruption exceeds WPB + TB, attempt a
 *   Challenging (+0) Endurance Test; a mutation is rolled only on a failure.
 *   Dissolution of Body and Mind — Core p.183: first lose Corruption points
 *   equal to your Willpower Bonus, then roll percentile dice for a physical or
 *   mental mutation.
 *   Pure Soul talent — Core p.142: you may gain extra Corruption points equal to
 *   your Pure Soul level before having to Test (raises the trigger point).
 */

/** The three fixed RAW steps, in order (no conditional/filtered steps). */
export type CorruptionStep =
  | 'threshold' // 1 — corruption vs threshold check
  | 'resistance' // 2 — Challenging (+0) Endurance Test
  | 'mutation'; // 3 — mutation resolution hand-off

/**
 * Transient, local-only flow state. Plain JSON-serializable data; no React,
 * no closures, no functions. Unlike the disease flow there is no bound id — a
 * character has a single Corruption track, so the flow needs only its step.
 */
export interface CorruptionFlowState {
  step: CorruptionStep;
}

/**
 * Every transition is driven by an explicit player EVENT. There is no timer and
 * no auto-advance.
 */
export type CorruptionFlowEvent =
  | { kind: 'start' } // open the flow (Step 1)
  | { kind: 'next' } // player: advance (clamps at the last step)
  | { kind: 'back' } // player: retreat (clamps at the first step)
  | { kind: 'goto'; step: CorruptionStep } // player: jump via the stepper
  | { kind: 'reset' }; // boundary: flow end

/** Static, rulebook-cited copy for a step. No runtime computation. */
export interface CorruptionStepInfo {
  step: CorruptionStep;
  title: string;
  /** Guidance prose (never gates). */
  body: string;
  /** Rulebook page citation string, rendered in the step header. */
  citation: string;
}

/**
 * Future-proof advisor seam. Synchronous-by-default with the SAME sync/async-union
 * contract as the guided-cast CastAdvisorSource (src/logic/guided-cast/types.ts)
 * and the guided-disease DiseaseAdvisorSource, so a future LLM-backed advisor is
 * a NON-BREAKING swap of the default advisor object. v1 ships only the
 * deterministic sync default; it makes no network/LLM/telemetry call.
 */
export interface CorruptionAdvisorSource {
  describe(
    step: CorruptionStep,
    ctx: { atOrOverThreshold: boolean },
  ): CorruptionStepInfo | Promise<CorruptionStepInfo>;
}
