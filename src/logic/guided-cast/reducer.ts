import type { CastStep, GuidedCastEvent, GuidedCastState } from './types';

/**
 * The ordered RAW cast sequence. Steps 'overcast' and 'miscast' are included for
 * a stable ordinal index but are filtered out of the stepper and skipped by
 * next/back when their gating flag is false (see applicableSteps).
 *
 * // Core p.234 (Casting Test), p.237 (Channelling), p.238/WoM p.23 (Overcasting),
 * // p.234-235 (Miscast Tables): the fixed RAW procedure the guide reflects.
 */
export const STEP_SEQUENCE: readonly CastStep[] = [
  'select',
  'route',
  'resolve',
  'overcast',
  'miscast',
  'outcome',
] as const;

/** The transient starting state for a fresh flow. */
export const initialGuidedCastState: GuidedCastState = {
  step: 'select',
  spellName: null,
  route: null,
  result: null,
  overcastDone: false,
  overcastAllocations: null,
  miscastDone: false,
};

/**
 * Which steps are currently reachable. The conditional steps gate on flags the
 * existing resolveCastingResult already computed — the guide derives no mechanic,
 * it only reads booleans off the stored CastingResult.
 *
 * // Overcast iff the cast succeeded with surplus SL (WoM Overcast Table, p.23).
 * // Miscast iff a Minor/Major Miscast trigger fired (Core p.234-235).
 */
export function applicableSteps(state: GuidedCastState): CastStep[] {
  const r = state.result;
  const overcastOn = !!r && r.castSuccess && r.overcastSlots > 0;
  const miscastOn = !!r && (r.triggerMinorMiscast || r.triggerMajorMiscast);
  return STEP_SEQUENCE.filter(
    (s) => (s !== 'overcast' || overcastOn) && (s !== 'miscast' || miscastOn),
  );
}

/** Index of the current step within the APPLICABLE subset (guarded, never -1). */
export function applicableIndex(state: GuidedCastState): number {
  const steps = applicableSteps(state);
  const i = steps.indexOf(state.step);
  return i < 0 ? 0 : i; // step currently inapplicable → treat as start of subset
}

/**
 * Pure. Total. Deterministic. Never throws. Never mutates its `state` argument
 * (spread-copy only). Derives no mechanic — it only reads boolean flags off the
 * already-computed CastingResult.
 *
 * Transition rules (design §"Transition rules"):
 * - `start`: fresh flow bound to the spell (Step 'select').
 * - `next`/`back`: move within the APPLICABLE subset and clamp (no wrap).
 * - `goto`: jump only to an applicable step; else no-op.
 * - `chooseRoute`: set route only; never changes step.
 * - `castResolved`: store result, reset overcast/miscast flags + allocations, then
 *   clamp step to the nearest still-applicable step. Never auto-advances.
 * - `overcastResolved`: store allocations + set overcastDone; never changes step.
 * - `miscastCompleted`: set miscastDone only; never changes step.
 * - `reset`: return a fresh initialGuidedCastState.
 */
export function guidedCastReducer(
  state: GuidedCastState,
  event: GuidedCastEvent,
): GuidedCastState {
  switch (event.kind) {
    case 'start':
      return { ...initialGuidedCastState, step: 'select', spellName: event.spellName };
    case 'next': {
      const steps = applicableSteps(state);
      const i = applicableIndex(state);
      const nextStep = steps[Math.min(i + 1, steps.length - 1)];
      return nextStep === state.step ? state : { ...state, step: nextStep };
    }
    case 'back': {
      const steps = applicableSteps(state);
      const i = applicableIndex(state);
      const prevStep = steps[Math.max(i - 1, 0)];
      return prevStep === state.step ? state : { ...state, step: prevStep };
    }
    case 'goto': {
      if (!applicableSteps(state).includes(event.step)) return state;
      if (event.step === state.step) return state;
      return { ...state, step: event.step };
    }
    case 'chooseRoute':
      // Set the route; the UI decides whether to advance. Applies nothing.
      return state.route === event.route ? state : { ...state, route: event.route };
    case 'castResolved': {
      const nextState: GuidedCastState = {
        ...state,
        result: event.result,
        overcastDone: false,
        miscastDone: false,
        overcastAllocations: null,
      };
      const steps = applicableSteps(nextState);
      // Keep current step if still applicable; else clamp to the nearest prior
      // applicable step (never past the end) so the UI never points at a
      // filtered-out step.
      if (steps.includes(nextState.step)) return nextState;
      const fullIdx = STEP_SEQUENCE.indexOf(nextState.step);
      const fallback =
        [...steps].reverse().find((s) => STEP_SEQUENCE.indexOf(s) <= fullIdx) ?? steps[0];
      return { ...nextState, step: fallback };
    }
    case 'overcastResolved':
      return { ...state, overcastAllocations: event.allocations, overcastDone: true };
    case 'miscastCompleted':
      return state.miscastDone ? state : { ...state, miscastDone: true };
    case 'reset':
      return { ...initialGuidedCastState };
    default: {
      // Exhaustiveness guard: every event kind is handled above.
      return state;
    }
  }
}
