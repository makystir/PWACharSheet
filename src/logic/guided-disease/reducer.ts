import type { DiseaseStep, DiseaseFlowEvent, DiseaseFlowState } from './types';

/**
 * The fixed, ordered RAW disease-progression sequence. Unlike the guided-cast
 * flow there are NO conditional steps — a disease always has an Overview, a
 * per-symptom resolution pass, and a duration/outcome stage.
 *
 * // Core p.186 (Incubation/Duration), p.187-188 (Symptoms), p.188 (Lingering
 * // outcomes): the fixed RAW stages the guide reflects. The guide re-derives
 * // no mechanic — it only walks these three steps.
 */
export const STEP_SEQUENCE: readonly DiseaseStep[] = ['overview', 'symptoms', 'duration'] as const;

/** The transient starting state for a fresh flow (unbound). */
export const initialDiseaseFlowState: DiseaseFlowState = {
  step: 'overview',
  diseaseId: null,
};

/**
 * Pure. Total. Deterministic. Never throws. Never mutates its `state` argument
 * (spread-copy only). Derives no mechanic.
 *
 * Transition rules:
 * - `start`: fresh flow bound to the disease (Step 'overview').
 * - `next`/`back`: move within STEP_SEQUENCE and clamp (no wrap); return the
 *   SAME reference when already at the boundary (idempotent no-op).
 * - `goto`: jump to the named step (no-op, same reference, if already there).
 * - `reset`: return a fresh initialDiseaseFlowState (new reference).
 * - default: exhaustiveness guard returns state unchanged.
 */
export function guidedDiseaseReducer(
  state: DiseaseFlowState,
  event: DiseaseFlowEvent,
): DiseaseFlowState {
  switch (event.kind) {
    case 'start':
      return { ...initialDiseaseFlowState, step: 'overview', diseaseId: event.diseaseId };
    case 'next': {
      const i = STEP_SEQUENCE.indexOf(state.step);
      const nextStep = STEP_SEQUENCE[Math.min(i + 1, STEP_SEQUENCE.length - 1)];
      return nextStep === state.step ? state : { ...state, step: nextStep };
    }
    case 'back': {
      const i = STEP_SEQUENCE.indexOf(state.step);
      const prevStep = STEP_SEQUENCE[Math.max(i - 1, 0)];
      return prevStep === state.step ? state : { ...state, step: prevStep };
    }
    case 'goto':
      return event.step === state.step ? state : { ...state, step: event.step };
    case 'reset':
      return { ...initialDiseaseFlowState };
    default: {
      // Exhaustiveness guard: every event kind is handled above.
      return state;
    }
  }
}
