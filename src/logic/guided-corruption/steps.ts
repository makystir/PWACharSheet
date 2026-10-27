import type { CorruptionAdvisorSource, CorruptionStep, CorruptionStepInfo } from './types';

/**
 * Static, rulebook-cited copy for each RAW corruption-resolution step. No runtime
 * computation, no invented TN/cost/threshold (rules-compliance steering rule).
 * Every citation was read directly in docs/WarhammerFantasyRoleplay4e.md (Core);
 * Errata overrides Core where they conflict.
 *
 * - Corrupting — Core p.183: "Should you ever gain more Corruption points than
 *   your Willpower Bonus plus your Toughness Bonus, immediately attempt a
 *   Challenging (+0) Endurance Test." On a pass you hold off corruption for now;
 *   on a fail your body or mind mutates.
 * - Pure Soul — Core p.142: you may gain extra Corruption points equal to your
 *   Pure Soul level before having to Test (it raises the trigger point, which the
 *   app models as getCorruptionThreshold(chars, pureSoul) = TB + WPB + Pure Soul).
 * - Dissolution of Body and Mind — Core p.183: first lose Corruption points equal
 *   to your Willpower Bonus, then roll percentile dice for a physical or mental
 *   mutation on the Physical (p.184) / Mental (p.185) Corruption Tables.
 *
 * // Core p.183: the rulebook trigger is worded "more than" WPB + TB, but the
 * // app fires at-or-over (>=) the threshold to match getCorruptionStatus's own
 * // 'danger' band (src/logic/corruption.ts). The Step-1 copy states this
 * // 'more than' vs '>=' difference so the player is never surprised (A-1/A-4).
 *
 * The guide CITES; it does not re-derive. No numbers are invented here — every
 * displayed total comes from src/logic/corruption.ts.
 */
export function describeCorruptionStep(
  step: CorruptionStep,
  ctx: { atOrOverThreshold: boolean },
): CorruptionStepInfo {
  switch (step) {
    case 'threshold':
      // Core p.183: trigger once Corruption exceeds WPB + TB. Core p.142 (Pure
      // Soul) raises the trigger by the talent's level. The app fires at-or-over
      // (>=) the threshold, which is a half-point stricter than the printed
      // "more than"; the copy makes that explicit (A-1/A-4).
      return {
        step: 'threshold',
        title: 'Corruption threshold',
        body: ctx.atOrOverThreshold
          ? 'Your Corruption has reached your threshold (Toughness Bonus + Willpower Bonus, ' +
            'plus any Pure Soul level), so a Corruption Test is due. Note the rulebook triggers ' +
            'when you gain MORE THAN that total; this app flags danger at or above it (>=), so it ' +
            'may prompt one point earlier than a strict reading. The breakdown is shown with the ' +
            'total \u2014 nothing is rolled or applied here.'
          : 'Compare your current Corruption to your threshold (Toughness Bonus + Willpower Bonus, ' +
            'plus any Pure Soul level). The rulebook requires a Test once you gain MORE THAN that ' +
            'total; this app flags danger at or above it (>=). You are below the danger band, so no ' +
            'Test is required yet. The breakdown is shown with the total.',
        citation: 'Core p.183 (Corrupting \u2014 Test when Corruption exceeds WPB + TB); Pure Soul Core p.142',
      };
    case 'resistance':
      // Core p.183: the resistance roll is a Challenging (+0) Endurance Test.
      // Pass → hold off for now (Test again next time you gain Corruption);
      // fail → body or mind mutates (go to Step 3).
      return {
        step: 'resistance',
        title: 'Resist the corruption',
        body:
          'Make a Challenging (+0) Endurance Test to resist. Use the one-tap button to open the ' +
          'roll dialog seeded with your base target and the Challenging (+0) Difficulty. A PASS ' +
          'means you hold off corruption for now \u2014 you will Test again the next time you gain ' +
          'Corruption points. A FAILURE means your body or mind is about to mutate; continue to the ' +
          'mutation step. The guide reads nothing from the roll and applies nothing itself.',
        citation: 'Core p.183 (Corrupting \u2014 Challenging (+0) Endurance Test to resist)',
      };
    case 'mutation':
      // Core p.183 (Dissolution of Body and Mind): on a failed resistance Test,
      // first lose Corruption points equal to WPB, then roll percentile dice to
      // determine a physical or mental mutation. The d100s stay on the existing
      // CorruptionCard roller (close-and-return hand-off) — the guide seeds no
      // RollDialog for them.
      return {
        step: 'mutation',
        title: 'Resolve the mutation',
        body:
          'Your resistance Test failed, so a mutation develops. First lose Corruption points equal ' +
          'to your Willpower Bonus, then roll percentile dice to see whether your body or your mind ' +
          'changes. Use the hand-off button to close this guide and roll on the existing Mutation ' +
          'Roller, then Add to Character \u2014 that control applies the Corruption loss and records ' +
          'the mutation. The type split and your mutation limits are shown for reference; the guide ' +
          'rolls and applies nothing.',
        citation: 'Core p.183 (Dissolution of Body and Mind \u2014 lose WPB Corruption, then roll percentile)',
      };
    default: {
      // Exhaustiveness guard: every CorruptionStep is handled above.
      return { step, title: '', body: '', citation: '' };
    }
  }
}

/**
 * The concrete, deterministic default advisor. The guide depends on this OBJECT
 * (typed CorruptionAdvisorSource), never on the bare describeCorruptionStep
 * function, so a later LLM-backed advisor is substituted by swapping the object.
 * v1 ships only the deterministic sync default; it makes no network/LLM/telemetry
 * call.
 */
export const defaultCorruptionAdvisor: CorruptionAdvisorSource = {
  describe: describeCorruptionStep,
};
