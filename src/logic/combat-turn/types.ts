/**
 * Pure, React-free turn-state types for the Guided Combat Turn Walkthrough
 * (guided-combat-turn design §"Decision 5"). Plain, JSON-serializable data only;
 * no imports from React. The guide is a thin orchestration layer over this pure
 * reducer — it never mutates the character and never auto-advances.
 *
 * RAW turn structure modelled (authoritative source:
 * docs/WarhammerFantasyRoleplay4e.md):
 *   Core p.156-157 (Taking Your Turn): one Move + one Action, either order,
 *   either skippable. This is the sole hard structure the guide reflects, and it
 *   is explicitly NOT a gate (Core p.157: "You can also skip taking an Action or
 *   Move, though you won't get another opportunity until the next Round!").
 */

/** The four RAW steps, in order (Core p.156-157). */
export type TurnStep = 'start' | 'choose' | 'resolve' | 'end';

/** Which Step-2 category the player picked (framing for Step 3 only). */
export type TurnOption = 'attack' | 'cast' | 'defend' | 'skill' | null;

/** Transient per-turn state. Plain data; JSON-serializable; no closures. */
export interface TurnState {
  step: TurnStep;
  /** Guidance only — never gates (design Decision 3, AC-13). */
  moveUsed: boolean;
  /** Guidance only — never gates (design Decision 3, AC-13). */
  actionUsed: boolean;
  /** The Step-2 option the player chose; framing for Step 3 only. */
  chosenOption: TurnOption;
}

/**
 * Every transition is driven by an explicit player EVENT. There is no timer,
 * no auto-advance, and no event the UI dispatches without a user action
 * (AC-12). `reset` is dispatched by the turn/round/END-COMBAT effects in the
 * host (CombatPage), which own reset-boundary enforcement.
 */
export type TurnEvent =
  | { kind: 'next' } // player: advance one step
  | { kind: 'back' } // player: go back one step
  | { kind: 'goto'; step: TurnStep } // player: jump to a step
  | { kind: 'chooseOption'; option: TurnOption } // player: picked a Step-2 option
  | { kind: 'markMove'; used: boolean } // player: toggled "Move done"
  | { kind: 'markAction'; used: boolean } // player: toggled "Action done"
  | { kind: 'reset' }; // boundary: turn/round/END COMBAT

/** Static, rulebook-cited copy for a step. No runtime computation. */
export interface TurnStepInfo {
  step: TurnStep;
  title: string;
  /** Guidance prose (never gates). */
  body: string;
  /** Core page citation string, rendered in the step header. */
  citation: string;
}

/**
 * Future-proof advisor seam (FR-7). Synchronous-by-default with the SAME
 * sync/async-union contract as the assistant's SuggestionSource
 * (src/logic/assistant/types.ts), so a future LLM-backed advisor is a
 * NON-BREAKING swap of the default advisor object. v1 ships only the
 * deterministic sync default; it makes no network/LLM call.
 */
export interface TurnAdvisorSource {
  describe(
    step: TurnStep,
    ctx: { inCombat: boolean },
  ): TurnStepInfo | Promise<TurnStepInfo>;
}
