import type { CorruptionStep, CorruptionFlowEvent, CorruptionFlowState } from './types';

/**
 * The fixed, ordered RAW corruption-resolution sequence. Like the guided-disease
 * flow there are NO conditional steps — the guide always walks the threshold
 * check, the resistance Test, and the mutation resolution.
 *
 * // Core p.183 (Corrupting → Challenging Endurance Test → Dissolution of Body
 * // and Mind): the fixed RAW stages the guide reflects. The guide re-derives
 * // no mechanic — it only walks these three steps.
 */
export const STEP_SEQUENCE: readonly CorruptionStep[] = [
  'threshold',
  'resistance',
  'mutation',
] as const;

/** The transient starting state for a fresh flow. */
export const initialCorruptionFlowState: CorruptionFlowState = {
  step: 'threshold',
};

/**
 * Pure. Total. Deterministic. Never throws. Never mutates its `state` argument
 * (spread-copy only). Derives no mechanic.
 *
 * Transition rules:
 * - `start`: fresh flow (Step 'threshold').
 * - `next`/`back`: move within STEP_SEQUENCE and clamp (no wrap); return the
 *   SAME reference when already at the boundary (idempotent no-op).
 * - `goto`: jump to the named step (no-op, same reference, if already there).
 * - `reset`: return a fresh initialCorruptionFlowState (new reference).
 * - default: exhaustiveness guard returns state unchanged.
 */
export function guidedCorruptionReducer(
  state: CorruptionFlowState,
  event: CorruptionFlowEvent,
): CorruptionFlowState {
  switch (event.kind) {
    case 'start':
      return { ...initialCorruptionFlowState, step: 'threshold' };
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
      return { ...initialCorruptionFlowState };
    default: {
      // Exhaustiveness guard: every event kind is handled above.
      return state;
    }
  }
}
