/**
 * Pure, React-free guided-disease-progression types for the "Guide me through
 * this disease" overlay (guided-disease-corruption FEAT-001). Plain,
 * JSON-serializable data only; no imports from React. The guide is a thin
 * orchestration layer over the existing src/logic/diseases.ts calculators — it
 * introduces NO new disease / symptom-test / timing math, never mutates the
 * character, and never auto-advances. Every displayed number comes from the
 * existing pure logic; the guide only CITES the rules.
 *
 * RAW procedure modelled (authoritative source: docs/WarhammerFantasyRoleplay4e.md;
 * Errata overrides Core where they conflict):
 *   Disease entry fields (Contraction / Incubation / Duration) — Core p.186;
 *   the twelve Symptoms and their recurring Tests — Core p.187-188;
 *   Lingering end-of-duration outcomes (extend 1d10 days / Festering Wound /
 *   Blood Rot) — Core p.188.
 */

/** The three fixed RAW steps, in order (no conditional/filtered steps). */
export type DiseaseStep =
  | 'overview' // 1 — Incubation/Duration timing summary
  | 'symptoms' // 2 — per-symptom resolution
  | 'duration'; // 3 — duration end / Lingering outcome guidance

/**
 * Transient, local-only flow state. Plain JSON-serializable data; no React,
 * no closures, no functions. `diseaseId` binds the flow to a single active
 * disease row (the ActiveDisease.id the host rendered).
 */
export interface DiseaseFlowState {
  step: DiseaseStep;
  /** The ActiveDisease.id the flow is bound to, or null before `start`. */
  diseaseId: number | null;
}

/**
 * Every transition is driven by an explicit player EVENT. There is no timer and
 * no auto-advance. Only `start` sets diseaseId; only `reset` clears it.
 */
export type DiseaseFlowEvent =
  | { kind: 'start'; diseaseId: number } // open the flow for a disease (Step 1)
  | { kind: 'next' } // player: advance (clamps at the last step)
  | { kind: 'back' } // player: retreat (clamps at the first step)
  | { kind: 'goto'; step: DiseaseStep } // player: jump via the stepper
  | { kind: 'reset' }; // boundary: flow end / disease change

/** Static, rulebook-cited copy for a step. No runtime computation. */
export interface DiseaseStepInfo {
  step: DiseaseStep;
  title: string;
  /** Guidance prose (never gates). */
  body: string;
  /** Rulebook page citation string, rendered in the step header. */
  citation: string;
}

/**
 * Future-proof advisor seam. Synchronous-by-default with the SAME sync/async-union
 * contract as the guided-cast CastAdvisorSource (src/logic/guided-cast/types.ts),
 * so a future LLM-backed advisor is a NON-BREAKING swap of the default advisor
 * object. v1 ships only the deterministic sync default; it makes no
 * network/LLM/telemetry call.
 */
export interface DiseaseAdvisorSource {
  describe(
    step: DiseaseStep,
    ctx: { hasSeedableSymptom: boolean; durationReached: boolean },
  ): DiseaseStepInfo | Promise<DiseaseStepInfo>;
}
