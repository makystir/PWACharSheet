import type { TurnEvent, TurnState, TurnStep } from './types';

/**
 * The ordered RAW turn sequence (Core p.156-157). The only hard structure the
 * guide reflects; advancing/retreating never auto-applies anything and the
 * player can jump freely (guidance, not a gate — AC-13).
 */
export const STEP_SEQUENCE: readonly TurnStep[] = [
  'start',
  'choose',
  'resolve',
  'end',
] as const;

/** The transient starting state for a fresh turn. */
export const initialTurnState: TurnState = {
  step: 'start',
  moveUsed: false,
  actionUsed: false,
  chosenOption: null,
};

function stepIndex(step: TurnStep): number {
  return STEP_SEQUENCE.indexOf(step);
}

/**
 * Pure. Total. Deterministic. Never throws. Never mutates its `state` argument.
 *
 * Transition rules (design Decision 5):
 * - `next`:   advance one step, clamp at 'end' (no wrap, idempotent at last).
 * - `back`:   retreat one step, clamp at 'start' (idempotent at first).
 * - `goto`:   jump to any valid step; out-of-range target is ignored (no-op).
 * - `chooseOption`: set `chosenOption`; NEVER sets `actionUsed` (the player
 *             marks that explicitly — the guide never infers a mutation
 *             happened). It advances 'choose' -> 'resolve' ONLY because the
 *             player tapped the option (still an explicit player event, AC-12).
 * - `markMove` / `markAction`: set the flag only; never change `step`.
 * - `reset`:  return a fresh `initialTurnState`.
 */
export function turnReducer(state: TurnState, event: TurnEvent): TurnState {
  switch (event.kind) {
    case 'next': {
      const idx = stepIndex(state.step);
      const nextIdx = Math.min(idx + 1, STEP_SEQUENCE.length - 1);
      if (nextIdx === idx) return state;
      return { ...state, step: STEP_SEQUENCE[nextIdx] };
    }
    case 'back': {
      const idx = stepIndex(state.step);
      const prevIdx = Math.max(idx - 1, 0);
      if (prevIdx === idx) return state;
      return { ...state, step: STEP_SEQUENCE[prevIdx] };
    }
    case 'goto': {
      if (!STEP_SEQUENCE.includes(event.step)) return state;
      if (event.step === state.step) return state;
      return { ...state, step: event.step };
    }
    case 'chooseOption': {
      // Set the chosen option and advance to the resolve step because the
      // player tapped it. Never sets actionUsed — a chosen option is not a
      // resolved (mutated) action.
      return { ...state, chosenOption: event.option, step: 'resolve' };
    }
    case 'markMove':
      return { ...state, moveUsed: event.used };
    case 'markAction':
      return { ...state, actionUsed: event.used };
    case 'reset':
      return { ...initialTurnState };
    default: {
      // Exhaustiveness guard: every event kind is handled above.
      return state;
    }
  }
}
