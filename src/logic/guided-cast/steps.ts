import type { CastAdvisorSource, CastRoute, CastStep, CastStepInfo } from './types';

/**
 * Static, rulebook-cited copy for each RAW cast step. No runtime computation,
 * no invented TN/cost/rule (rules-compliance steering rule). Every citation was
 * read directly in docs/WarhammerFantasyRoleplay4e.md (Core) and
 * docs/windsofmagic.md (WoM); Errata overrides Core where they conflict.
 *
 * - Casting Test — Core p.234: make a Language (Magick) Test; SL ≥ CN casts.
 * - Channelling Test — Core p.237, revised by WoM §"Channelling Test".
 * - Critical Casting — Core p.234-235 + WoM §"Critical Casting".
 * - Fumbled Casting — Core p.234-235 + WoM §"Fumbled Casting".
 * - Overcasting — Core p.238 superseded by the WoM Overcast Table (p.23).
 * - Miscast Tables — Core p.234-235 (encoded in src/data/miscast-tables.ts).
 *
 * The guide CITES; it does not re-derive. No numbers are invented here — the
 * displayed totals come from src/logic/spell-casting.ts.
 */
export function describeCastStep(
  step: CastStep,
  ctx: { isPetty: boolean; route: CastRoute },
): CastStepInfo {
  switch (step) {
    case 'select':
      // Core p.234: Casting Test is a Language (Magick) Test; SL is compared to CN.
      return {
        step: 'select',
        title: 'Select your spell',
        body:
          'Check the spell you intend to cast: its Casting Number (CN), range, target, ' +
          'and effect. Your casting target is your Intelligence plus your Language (Magick) ' +
          'advances; the breakdown is shown with the total. Nothing is rolled or applied yet.',
        citation: 'Core p.234 (Casting Test — Language (Magick) Test vs CN)',
      };
    case 'route':
      // Core p.234 (cast now against CN) vs Core p.237 + WoM §"Channelling Test"
      // (build SL first). The Petty-no-channel clause below is an app convention
      // derived from isPettySpell, kept separate from the Core cite.
      return {
        step: 'route',
        title: 'Cast now or channel first?',
        body: ctx.isPetty
          ? 'This is a Petty spell (CN 0), so there is nothing to channel \u2014 cast it directly. ' +
            'Make the Casting Test and compare your SL to the CN.'
          : 'Choose how to proceed. Cast now makes the Casting Test immediately against the ' +
            'full CN. Channelling first is an Extended Test that lowers the effective CN by your ' +
            'accumulated SL before you cast \u2014 but channelled power may not be used to Overcast, ' +
            'and any extra power is lost once the spell is cast.',
        citation:
          'Core p.234 (Casting Test vs CN); Core p.237 + WoM \u00a7"Channelling Test" (channel to reduce CN)' +
          (ctx.isPetty ? '; app convention: Petty spells (CN 0) cannot be channelled' : ''),
      };
    case 'resolve':
      // Core p.234-235 + WoM §"Critical Casting"/§"Fumbled Casting": doubles on a
      // successful cast → Critical Cast (Minor Miscast unless Instinctive Diction,
      // plus a choice of Critical Cast / Total Power / Unstoppable Force); doubles
      // on a failed cast → Fumbled Cast (Minor Miscast).
      return {
        step: 'resolve',
        title: 'Resolve the Casting Test',
        body:
          'Open the roll dialog and make the Language (Magick) Test. If your SL meets or ' +
          'exceeds the CN, the spell is cast. Rolling a double on a success is a Critical Cast; ' +
          'rolling a double on a failure is a Fumbled Cast. The guide reads the result the ' +
          'existing control computes \u2014 it rolls and applies nothing itself.',
        citation:
          'Core p.234-235 + WoM \u00a7"Critical Casting"/\u00a7"Fumbled Casting" (doubles on success/failure)',
      };
    case 'overcast':
      // Core p.238 base rule superseded by the WoM Overcast Table (p.23): surplus
      // SL (SL − CN) is distributed across columns using the Fibonacci thresholds.
      return {
        step: 'overcast',
        title: 'Overcast with your surplus SL',
        body:
          'Your cast succeeded with surplus SL. You may spend that surplus across the overcast ' +
          'columns \u2014 extra targets, damage, range, area, or duration \u2014 using the Overcast ' +
          'Table. Each column may be accessed only once per casting, and channelled power may not ' +
          'be used to Overcast. The surplus shown is computed by the existing logic.',
        citation: 'Core p.238 superseded by WoM Overcast Table (p.23)',
      };
    case 'miscast':
      // Core p.234-235: roll on the Minor or Major Miscast Table as the triggers
      // dictate (encoded in src/data/miscast-tables.ts).
      return {
        step: 'miscast',
        title: 'Resolve the Miscast',
        body:
          'A Miscast was triggered. Roll on the appropriate Miscast Table and apply the result ' +
          'using the existing control. The guide points at the roll but does not roll or apply it ' +
          'for you.',
        citation: 'Core p.234-235 (Minor/Major Miscast Tables)',
      };
    case 'outcome':
      // Summary of what the existing logic already resolved; no new computation.
      return {
        step: 'outcome',
        title: 'Outcome',
        body:
          'Review the final outcome: whether the spell was cast, any damage and hit location for ' +
          'magic missiles, chosen overcast effects, and whether the spell is undispellable. These ' +
          'values come straight from the resolved result \u2014 nothing is recomputed here.',
        citation: 'Core p.234 (Casting Test outcome); WoM Overcast Table (p.23)',
      };
    default: {
      // Exhaustiveness guard: every CastStep is handled above.
      return { step, title: '', body: '', citation: '' };
    }
  }
}

/**
 * The concrete, deterministic default advisor. The guide depends on this OBJECT
 * (typed CastAdvisorSource), never on the bare describeCastStep function, so a
 * later LLM-backed advisor is substituted by swapping the object. v1 ships only
 * the deterministic sync default; it makes no network/LLM/telemetry call.
 */
export const defaultCastAdvisor: CastAdvisorSource = { describe: describeCastStep };
