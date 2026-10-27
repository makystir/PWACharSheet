import type { DiseaseAdvisorSource, DiseaseStep, DiseaseStepInfo } from './types';

/**
 * Static, rulebook-cited copy for each RAW disease-progression step. No runtime
 * computation, no invented TN/cost/threshold (rules-compliance steering rule).
 * Every citation was read directly in docs/WarhammerFantasyRoleplay4e.md (Core);
 * Errata overrides Core where they conflict.
 *
 * - Disease entry fields — Core p.186: Contraction, Incubation ("how long before
 *   the victim demonstrates any symptoms"), and Duration ("how long the symptoms
 *   last if untreated; at the end of the duration the disease comes to an end").
 * - Symptoms and their recurring Tests — Core p.187-188 (the twelve-symptom list).
 * - Lingering end-of-duration outcomes — Core p.188: a Marginal Failure (0)
 *   extends the duration 1d10 days; a Failure (-2) develops a Festering Wound;
 *   an Astounding Failure (-6) develops Blood Rot.
 *
 * The guide CITES; it does not re-derive. No numbers are invented here — every
 * displayed total comes from src/logic/diseases.ts.
 */
export function describeDiseaseStep(
  step: DiseaseStep,
  ctx: { hasSeedableSymptom: boolean; durationReached: boolean },
): DiseaseStepInfo {
  switch (step) {
    case 'overview':
      // Core p.186: Incubation is how long before symptoms show; Duration is how
      // long the symptoms last untreated, after which the disease ends.
      return {
        step: 'overview',
        title: 'Disease overview',
        body:
          'Review how this disease was contracted and its Incubation and Duration. ' +
          'Incubation is how long before the symptoms show; Duration is how long they ' +
          'last untreated, after which the disease ends. Where a timing contains dice, ' +
          'roll it on the existing Incubation/Duration control on the disease row — the ' +
          'guide shows the rolled totals but rolls nothing here.',
        citation: 'Core p.186 (Disease entry — Contraction / Incubation / Duration)',
      };
    case 'symptoms':
      // Core p.187-188: each symptom explains its own effect and any recurring
      // Test. Which symptoms carry a self-contained Endurance/Cool Test is
      // decided by getSymptomTest — the guide never re-derives it.
      // Core p.188: the printed Wounded Test reads "Easy (+20)", which conflicts
      // with the standard Easy = +40 Difficulty; the app defers to
      // getSymptomTest (difficulty 'Easy') rather than inventing a +20 modifier (A-3).
      return {
        step: 'symptoms',
        title: 'Resolve the symptoms',
        body: ctx.hasSeedableSymptom
          ? 'Work through each symptom below. Where a symptom calls for a recurring Test, ' +
            'use its one-tap button to open the roll dialog seeded with your base target and ' +
            'the symptom\u2019s Difficulty. Gangrene instead directs you to roll a Hit Location ' +
            'on the existing disease control. Symptoms with no self-contained roll show guidance only.'
          : 'Work through each symptom below. None of this disease\u2019s symptoms carry a ' +
            'self-contained Test, so each shows its effect and cadence as guidance only. ' +
            'The guide rolls and applies nothing.',
        citation: 'Core p.187-188 (Symptoms — recurring Endurance/Cool Tests per symptom)',
      };
    case 'duration':
      // Core p.188 (Lingering): after the duration ends, attempt the Endurance
      // Test at the marked Difficulty. Marginal Failure (0) → +1d10 days;
      // Failure (-2) → Festering Wound; Astounding Failure (-6) → Blood Rot.
      return {
        step: 'duration',
        title: 'Duration & outcome',
        body: ctx.durationReached
          ? 'The Duration has been reached, so the disease ends now. If it has a Lingering ' +
            'symptom, make the end-of-duration Endurance Test below: a Marginal Failure extends ' +
            'the disease by 1d10 days, a Failure develops a Festering Wound, and an Astounding ' +
            'Failure develops Blood Rot. Resolve those consequences on their own disease rows.'
          : 'When the tracked Duration is reached the disease ends. If it has a Lingering ' +
            'symptom, you will then make an end-of-duration Endurance Test: a Marginal Failure ' +
            'extends the disease by 1d10 days, a Failure develops a Festering Wound, and an ' +
            'Astounding Failure develops Blood Rot. Advance the elapsed days on the disease row ' +
            'until the Duration is reached.',
        citation: 'Core p.188 (Lingering — end-of-duration Endurance Test and its consequences)',
      };
    default: {
      // Exhaustiveness guard: every DiseaseStep is handled above.
      return { step, title: '', body: '', citation: '' };
    }
  }
}

/**
 * The concrete, deterministic default advisor. The guide depends on this OBJECT
 * (typed DiseaseAdvisorSource), never on the bare describeDiseaseStep function,
 * so a later LLM-backed advisor is substituted by swapping the object. v1 ships
 * only the deterministic sync default; it makes no network/LLM/telemetry call.
 */
export const defaultDiseaseAdvisor: DiseaseAdvisorSource = { describe: describeDiseaseStep };
