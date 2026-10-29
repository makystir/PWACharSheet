import type { RollResult } from './dice-roller';
import type { RollEventPayload } from '../types/character';

/**
 * Shared, canonical roll-log serializers.
 *
 * These two helpers were extracted verbatim (bodies unchanged) from the
 * module-private copies in `src/App.tsx` so that the Wilderness Travel panel's
 * seeded roll and `App.tsx`'s `addRoll` log rolls through ONE implementation and
 * can never drift. `App.tsx` now imports them from here; the existing roll-log
 * format and `addRoll` behaviour are byte-for-byte unchanged.
 *
 * (A second, separate `buildRollSummary` exists in `src/storage/migration.ts`
 * for one-time legacy import; it is intentionally left as-is — it is not on the
 * live roll path — and is a documented follow-up to consolidate.)
 */

/**
 * Build a concise, human-readable summary for a roll event.
 * e.g. "Melee: 42/55 (SL +1, pass)"
 */
export function buildRollSummary(result: RollResult): string {
  return `${result.skillOrCharName}: ${result.roll}/${result.targetNumber} (SL ${result.sl}, ${result.passed ? 'pass' : 'fail'})`;
}

/** Extract the `RollEventPayload` fields from a completed `RollResult`. (Req 4.2) */
export function toRollPayload(result: RollResult): RollEventPayload {
  return {
    name: result.skillOrCharName,
    roll: result.roll,
    target: result.targetNumber,
    sl: result.sl,
    passed: result.passed,
    isCritical: result.isCritical,
    isFumble: result.isFumble,
  };
}
