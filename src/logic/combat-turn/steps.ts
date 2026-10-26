import type { TurnAdvisorSource, TurnStep, TurnStepInfo } from './types';

/**
 * Static, rulebook-cited copy for each RAW turn step. No runtime computation,
 * no invented TN/cost/rule (rules-compliance steering rule, AC-15). Every
 * citation below was read directly in docs/WarhammerFantasyRoleplay4e.md:
 *
 * - Core p.156-157 (Taking Your Turn): one Move + one Action, either order,
 *   either skippable ("You can also skip taking an Action or Move, though you
 *   won't get another opportunity until the next Round!").
 * - Core p.156-157 (Move): a Move needing a Skill Test (Climb/Athletics) also
 *   uses your Action; Charge into close combat grants +1 Advantage (see p.164).
 *   Rendered "Core p.156-157 (Advantage p.164)" to match the book's own
 *   cross-reference (the +1 sits in the Move subsection; its Advantage effect is
 *   defined on p.164).
 * - Core p.157 (Action, On The Defensive, Free Actions, default Challenging):
 *   the Action "is only limited by your imagination"; On The Defensive gives +20
 *   to defensive Tests with a chosen Skill until the start of your next Turn;
 *   Free Actions are GM-adjudicated; "During combat, all Difficulty is assumed
 *   to be Challenging (+0)".
 * - Core p.157-158 (Attacking): resolving an attack Action.
 * - Core p.164 (Advantage / Moving / Disengage): Advantage adds +10 to
 *   appropriate combat Tests; taking damage / suffering a Condition / losing an
 *   Opposed Test loses all Advantage; Disengage uses Advantage.
 * - Core p.167-169 (Master Condition List): end-of-turn condition timing
 *   (Bleeding/Ablaze/Poisoned damage, Stunned Endurance Test, etc.).
 */
export function describeStep(
  step: TurnStep,
  _ctx: { inCombat: boolean },
): TurnStepInfo {
  switch (step) {
    case 'start':
      // Core p.167-169: end-of-round/turn condition timing is surfaced here as
      // "checks due" — the guide renders the existing deriveAllReminders items
      // and computes nothing of its own.
      return {
        step: 'start',
        title: 'Start of turn — checks due',
        body:
          'Before you act, resolve any psychology or condition checks that are due. ' +
          'The guide lists the same reminders the dashboard shows — roll or clear what you like, or skip. ' +
          'During combat, all Difficulty is assumed to be Challenging (+0).',
        citation: 'Core p.157 (Challenging default); Core p.167-169 (Master Condition List — condition timing)',
      };
    case 'choose':
      // Core p.156-157: one Move + one Action, either order, either skippable.
      return {
        step: 'choose',
        title: 'Choose your Move and/or Action',
        body:
          'On your Turn you have one Move and one Action, in any order. You can skip either, ' +
          'but you won\u2019t get another until the next Round. Pick what to do: attack, cast/pray, ' +
          'defend, or use a Skill. A Move needing a Skill Test (Climb/Athletics) also uses your Action. ' +
          'You could Charge into close combat for +1 Advantage, go On The Defensive for +20 to a chosen ' +
          'defensive Skill, or Disengage using Advantage.',
        citation:
          'Core p.156-157 (Taking Your Turn — one Move + one Action, either skippable); ' +
          'Core p.157 (On The Defensive); Core p.156-157 (Advantage p.164) (Charge +1 Advantage); ' +
          'Core p.164 (Advantage, Disengage)',
      };
    case 'resolve':
      // Core p.157-158: resolution happens entirely inside the existing control
      // (AttackFlow for an attack). The guide reads nothing back and applies
      // nothing.
      return {
        step: 'resolve',
        title: 'Resolve your Action',
        body:
          'Resolve the Action in the existing control \u2014 for an attack, complete weapon, to-hit, ' +
          'hit location, damage, and consequences inside the Attack Flow. The guide applies nothing ' +
          'itself; every change is made by the control you just opened. Mark your Action done when you finish.',
        citation: 'Core p.157-158 (Attacking)',
      };
    case 'end':
      // Core p.167-169: end-of-turn condition effects are computed by the
      // existing End Turn + EndOfTurnReportModal. The guide only points at the
      // real dashboard End Turn button; it recomputes nothing.
      return {
        step: 'end',
        title: 'End of turn',
        body:
          'End-of-turn effects may apply (Bleeding, Ablaze, Poisoned, Stunned, and more). ' +
          'Press the dashboard\u2019s End Turn button \u2014 that is the only way these are applied. ' +
          'Review the end-of-turn report, then confirm to apply or cancel for no change, and advance the round/initiative.',
        citation: 'Core p.167-169 (Master Condition List — end-of-turn condition timing)',
      };
    default: {
      // Exhaustiveness guard: every TurnStep is handled above.
      return {
        step,
        title: '',
        body: '',
        citation: '',
      };
    }
  }
}

/**
 * The concrete, deterministic default advisor. The guide depends on this OBJECT
 * (typed TurnAdvisorSource), never on the bare `describeStep` function, so a
 * later LLM-backed advisor is substituted by swapping the object — a
 * non-breaking change that honours the sync/async-union contract (FR-7, AC-18).
 */
export const defaultTurnAdvisor: TurnAdvisorSource = { describe: describeStep };
