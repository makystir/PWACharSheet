import { describe, it, expect } from 'vitest';
import { buildRollSummary, toRollPayload } from '../roll-log';
import type { RollResult } from '../dice-roller';

/**
 * Pins the extracted roll-log serializers so their output format (previously
 * module-private in App.tsx) cannot silently drift after the extraction. Both
 * App.tsx's addRoll and the Wilderness Travel panel log through these.
 */

const result: RollResult = {
  skillOrCharName: 'Melee',
  roll: 42,
  targetNumber: 55,
  baseTarget: 55,
  difficulty: 'Challenging',
  sl: 1,
  passed: true,
  isCritical: false,
  isFumble: false,
  isAutoSuccess: false,
  isAutoFailure: false,
  outcome: 'Success',
  timestamp: 0,
};

describe('roll-log serializers', () => {
  it('buildRollSummary matches the canonical "name: roll/target (SL x, pass/fail)" format', () => {
    expect(buildRollSummary(result)).toBe('Melee: 42/55 (SL 1, pass)');
    expect(buildRollSummary({ ...result, passed: false, sl: -2 })).toBe('Melee: 42/55 (SL -2, fail)');
  });

  it('toRollPayload extracts exactly the RollEventPayload fields', () => {
    expect(toRollPayload(result)).toEqual({
      name: 'Melee',
      roll: 42,
      target: 55,
      sl: 1,
      passed: true,
      isCritical: false,
      isFumble: false,
    });
  });
});
