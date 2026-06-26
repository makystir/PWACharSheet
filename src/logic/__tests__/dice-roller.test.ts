import { describe, it, expect } from 'vitest';
import {
  tensDigit,
  isDouble,
  getOutcome,
  resolveRoll,
  computeSkillTarget,
  computeCharacteristicTarget,
  applyDifficulty,
  calculateOpposedResult,
  resolveOpposedTest,
  performRoll,
  DIFFICULTY_MODIFIERS,
} from '../dice-roller';
import type { DifficultyLevel } from '../dice-roller';

// 1.1 tensDigit
describe('tensDigit', () => {
  it('returns 0 for single-digit values (1-9)', () => {
    expect(tensDigit(1)).toBe(0);
    expect(tensDigit(5)).toBe(0);
    expect(tensDigit(9)).toBe(0);
  });

  it('returns the tens digit for two-digit values', () => {
    expect(tensDigit(10)).toBe(1);
    expect(tensDigit(19)).toBe(1);
    expect(tensDigit(43)).toBe(4);
    expect(tensDigit(55)).toBe(5);
    expect(tensDigit(99)).toBe(9);
  });

  it('returns 10 for 100', () => {
    expect(tensDigit(100)).toBe(10);
  });

  it('returns 0 for 0', () => {
    expect(tensDigit(0)).toBe(0);
  });
});

// 1.2 isDouble
describe('isDouble', () => {
  it('returns true for all doubles', () => {
    for (const d of [11, 22, 33, 44, 55, 66, 77, 88, 99]) {
      expect(isDouble(d)).toBe(true);
    }
  });

  it('returns true for 100 (treated as 00)', () => {
    expect(isDouble(100)).toBe(true);
  });

  it('returns false for non-doubles', () => {
    for (const nd of [12, 21, 13, 50, 95, 37, 48, 61]) {
      expect(isDouble(nd)).toBe(false);
    }
  });
});

// 1.3 getOutcome
describe('getOutcome', () => {
  it('maps SL >= +6 to Astounding Success', () => {
    expect(getOutcome(6, false, false)).toBe('Astounding Success');
    expect(getOutcome(10, false, false)).toBe('Astounding Success');
  });

  it('maps SL +4 to +5 to Impressive Success', () => {
    expect(getOutcome(4, false, false)).toBe('Impressive Success');
    expect(getOutcome(5, false, false)).toBe('Impressive Success');
  });

  it('maps SL +2 to +3 to Success', () => {
    expect(getOutcome(2, false, false)).toBe('Success');
    expect(getOutcome(3, false, false)).toBe('Success');
  });

  it('maps SL 0 to +1 to Marginal Success', () => {
    expect(getOutcome(0, false, false)).toBe('Marginal Success');
    expect(getOutcome(1, false, false)).toBe('Marginal Success');
  });

  it('maps SL -1 to Marginal Failure', () => {
    expect(getOutcome(-1, false, false)).toBe('Marginal Failure');
  });

  it('maps SL -2 to -3 to Failure', () => {
    expect(getOutcome(-2, false, false)).toBe('Failure');
    expect(getOutcome(-3, false, false)).toBe('Failure');
  });

  it('maps SL -4 to -5 to Impressive Failure', () => {
    expect(getOutcome(-4, false, false)).toBe('Impressive Failure');
    expect(getOutcome(-5, false, false)).toBe('Impressive Failure');
  });

  it('maps SL <= -6 to Astounding Failure', () => {
    expect(getOutcome(-6, false, false)).toBe('Astounding Failure');
    expect(getOutcome(-10, false, false)).toBe('Astounding Failure');
  });

  it('Critical always returns Astounding Success', () => {
    expect(getOutcome(0, true, false)).toBe('Astounding Success');
    expect(getOutcome(-3, true, false)).toBe('Astounding Success');
  });

  it('Fumble always returns Astounding Failure', () => {
    expect(getOutcome(0, false, true)).toBe('Astounding Failure');
    expect(getOutcome(5, false, true)).toBe('Astounding Failure');
  });
});

// 1.4 resolveRoll
describe('resolveRoll', () => {
  it('roll equal to target is a success', () => {
    const r = resolveRoll(45, 45);
    expect(r.passed).toBe(true);
  });

  it('roll below target is a success', () => {
    const r = resolveRoll(30, 45);
    expect(r.passed).toBe(true);
  });

  it('roll above target is a failure', () => {
    const r = resolveRoll(46, 45);
    expect(r.passed).toBe(false);
  });

  it('calculates SL as tensDigit(target) - tensDigit(roll)', () => {
    // target 45, roll 30 → SL = 4 - 3 = 1
    expect(resolveRoll(30, 45).sl).toBe(1);
    // target 45, roll 12 → SL = 4 - 1 = 3
    expect(resolveRoll(12, 45).sl).toBe(3);
    // target 45, roll 80 → SL = 4 - 8 = -4
    expect(resolveRoll(80, 45).sl).toBe(-4);
  });

  it('clamps roll to [1, 100]', () => {
    const low = resolveRoll(0, 50);
    expect(low.passed).toBe(true); // clamped to 1, which is auto-success

    const high = resolveRoll(150, 50);
    expect(high.passed).toBe(false); // clamped to 100, which is auto-failure
  });

  it('detects Critical on successful double', () => {
    const r = resolveRoll(22, 50);
    expect(r.passed).toBe(true);
    expect(r.isCritical).toBe(true);
    expect(r.isFumble).toBe(false);
  });

  it('detects Fumble on failed double', () => {
    const r = resolveRoll(66, 50);
    expect(r.passed).toBe(false);
    expect(r.isFumble).toBe(true);
    expect(r.isCritical).toBe(false);
  });

  it('no Critical/Fumble on non-double', () => {
    const r = resolveRoll(23, 50);
    expect(r.isCritical).toBe(false);
    expect(r.isFumble).toBe(false);
  });

  // Auto-success
  it('rolls 1-5 are auto-success with SL >= +1', () => {
    for (const roll of [1, 2, 3, 4, 5]) {
      const r = resolveRoll(roll, 0); // target 0, normally would fail
      expect(r.passed).toBe(true);
      expect(r.isAutoSuccess).toBe(true);
      expect(r.sl).toBeGreaterThanOrEqual(1);
    }
  });

  it('auto-success preserves higher SL when naturally > 1', () => {
    // target 90, roll 5 → natural SL = 9 - 0 = 9, should keep 9
    const r = resolveRoll(5, 90);
    expect(r.passed).toBe(true);
    expect(r.sl).toBe(9);
  });

  // Auto-failure
  it('rolls 96-100 are auto-failure with SL <= -1', () => {
    for (const roll of [96, 97, 98, 99, 100]) {
      const r = resolveRoll(roll, 100); // target 100, normally would pass
      expect(r.passed).toBe(false);
      expect(r.isAutoFailure).toBe(true);
      expect(r.sl).toBeLessThanOrEqual(-1);
    }
  });

  it('auto-failure preserves lower SL when naturally < -1', () => {
    // target 10, roll 99 → natural SL = 1 - 9 = -8, should keep -8
    const r = resolveRoll(99, 10);
    expect(r.passed).toBe(false);
    expect(r.sl).toBe(-8);
  });

  it('100 is both auto-failure and a fumble (double 00)', () => {
    const r = resolveRoll(100, 100);
    expect(r.passed).toBe(false);
    expect(r.isAutoFailure).toBe(true);
    expect(r.isFumble).toBe(true);
    expect(r.outcome).toBe('Astounding Failure');
  });
});

// 1.5 computeSkillTarget
describe('computeSkillTarget', () => {
  it('sums characteristic components and skill advances', () => {
    expect(computeSkillTarget(30, 5, 0, 10)).toBe(45);
    expect(computeSkillTarget(40, 10, 5, 20)).toBe(75);
    expect(computeSkillTarget(0, 0, 0, 0)).toBe(0);
  });
});

// 1.6 computeCharacteristicTarget
describe('computeCharacteristicTarget', () => {
  it('sums initial, advances, and bonus', () => {
    expect(computeCharacteristicTarget(30, 5, 0)).toBe(35);
    expect(computeCharacteristicTarget(40, 10, 5)).toBe(55);
    expect(computeCharacteristicTarget(0, 0, 0)).toBe(0);
  });
});

// 1.7 applyDifficulty
describe('applyDifficulty', () => {
  it('applies all 7 difficulty modifiers correctly', () => {
    const base = 40;
    expect(applyDifficulty(base, 'Very Easy')).toBe(100);
    expect(applyDifficulty(base, 'Easy')).toBe(80);
    expect(applyDifficulty(base, 'Average')).toBe(60);
    expect(applyDifficulty(base, 'Challenging')).toBe(40);
    expect(applyDifficulty(base, 'Difficult')).toBe(30);
    expect(applyDifficulty(base, 'Hard')).toBe(20);
    expect(applyDifficulty(base, 'Very Hard')).toBe(10);
  });
});

// 1.8 calculateOpposedResult
describe('calculateOpposedResult', () => {
  it('player wins when netSL is positive', () => {
    const r = calculateOpposedResult(4, 2);
    expect(r.netSL).toBe(2);
    expect(r.winner).toBe('player');
  });

  it('opponent wins when netSL is negative', () => {
    const r = calculateOpposedResult(1, 5);
    expect(r.netSL).toBe(-4);
    expect(r.winner).toBe('opponent');
  });

  it('tie when netSL is zero and no target numbers provided', () => {
    const r = calculateOpposedResult(3, 3);
    expect(r.netSL).toBe(0);
    expect(r.winner).toBe('tie');
  });

  it('player wins tie-break when playerTarget > opponentTarget', () => {
    const r = calculateOpposedResult(3, 3, 55, 40);
    expect(r.netSL).toBe(0);
    expect(r.winner).toBe('player');
  });

  it('opponent wins tie-break when opponentTarget > playerTarget', () => {
    const r = calculateOpposedResult(3, 3, 30, 50);
    expect(r.netSL).toBe(0);
    expect(r.winner).toBe('opponent');
  });

  it('tie when netSL is zero and target numbers are equal', () => {
    const r = calculateOpposedResult(3, 3, 45, 45);
    expect(r.netSL).toBe(0);
    expect(r.winner).toBe('tie');
  });

  it('preserves input SL values', () => {
    const r = calculateOpposedResult(-2, 3);
    expect(r.playerSL).toBe(-2);
    expect(r.opponentSL).toBe(3);
    expect(r.netSL).toBe(-5);
    expect(r.winner).toBe('opponent');
  });
});

// 1.9 performRoll
describe('performRoll', () => {
  it('combines applyDifficulty + resolveRoll into a full RollResult', () => {
    const result = performRoll(40, 'Average', 'Melee (Basic)', 25);
    // target = 40 + 20 = 60
    expect(result.targetNumber).toBe(60);
    expect(result.baseTarget).toBe(40);
    expect(result.difficulty).toBe('Average');
    expect(result.roll).toBe(25);
    expect(result.passed).toBe(true);
    // SL = tensDigit(60) - tensDigit(25) = 6 - 2 = 4
    expect(result.sl).toBe(4);
    expect(result.skillOrCharName).toBe('Melee (Basic)');
    expect(result.outcome).toBe('Impressive Success');
    expect(typeof result.timestamp).toBe('number');
  });

  it('handles a failing roll', () => {
    const result = performRoll(30, 'Hard', 'Dodge', 75);
    // target = 30 + (-20) = 10
    expect(result.targetNumber).toBe(10);
    expect(result.passed).toBe(false);
    // SL = tensDigit(10) - tensDigit(75) = 1 - 7 = -6
    expect(result.sl).toBe(-6);
    expect(result.outcome).toBe('Astounding Failure');
  });

  it('handles Critical in full pipeline', () => {
    const result = performRoll(50, 'Challenging', 'Cool', 33);
    // target = 50, roll 33, passed (33 <= 50), double → Critical
    expect(result.passed).toBe(true);
    expect(result.isCritical).toBe(true);
    expect(result.outcome).toBe('Astounding Success');
  });
});

// 1.10 Exports
describe('exports', () => {
  it('DIFFICULTY_MODIFIERS has all 7 levels', () => {
    const levels: DifficultyLevel[] = [
      'Very Easy', 'Easy', 'Average', 'Challenging', 'Difficult', 'Hard', 'Very Hard',
    ];
    for (const level of levels) {
      expect(typeof DIFFICULTY_MODIFIERS[level]).toBe('number');
    }
  });
});

// 1.11 resolveOpposedTest
describe('resolveOpposedTest', () => {
  it('player wins when player has higher SL', () => {
    // Player: target 50, roll 20 → SL = 5 - 2 = 3
    // Opponent: target 40, roll 60 → SL = 4 - 6 = -2
    // Net SL = 3 - (-2) = 5 → player wins
    const result = resolveOpposedTest(50, 20, 40, 60);
    expect(result.playerSL).toBe(3);
    expect(result.opponentSL).toBe(-2);
    expect(result.netSL).toBe(5);
    expect(result.winner).toBe('player');
  });

  it('opponent wins when opponent has higher SL', () => {
    // Player: target 30, roll 70 → SL = 3 - 7 = -4
    // Opponent: target 60, roll 25 → SL = 6 - 2 = 4
    // Net SL = -4 - 4 = -8 → opponent wins
    const result = resolveOpposedTest(30, 70, 60, 25);
    expect(result.playerSL).toBe(-4);
    expect(result.opponentSL).toBe(4);
    expect(result.netSL).toBe(-8);
    expect(result.winner).toBe('opponent');
  });

  it('tie-breaker: higher roll wins when net SL is 0', () => {
    // Player: target 50, roll 45 → SL = 5 - 4 = 1
    // Opponent: target 40, roll 25 → SL = 4 - 2 = 2... not 0 net
    // Let's pick values that give same SL:
    // Player: target 40, roll 30 → SL = 4 - 3 = 1
    // Opponent: target 50, roll 40 → SL = 5 - 4 = 1
    // Net SL = 1 - 1 = 0, player roll 30 vs opponent roll 40 → opponent wins (higher roll)
    const result = resolveOpposedTest(40, 30, 50, 40);
    expect(result.netSL).toBe(0);
    expect(result.winner).toBe('opponent');
  });

  it('tie-breaker: player wins with higher roll when net SL is 0', () => {
    // Player: target 50, roll 40 → SL = 5 - 4 = 1
    // Opponent: target 40, roll 30 → SL = 4 - 3 = 1
    // Net SL = 1 - 1 = 0, player roll 40 vs opponent roll 30 → player wins
    const result = resolveOpposedTest(50, 40, 40, 30);
    expect(result.netSL).toBe(0);
    expect(result.winner).toBe('player');
  });

  it('result is tie when net SL is 0 and rolls are equal', () => {
    // Player: target 50, roll 35 → SL = 5 - 3 = 2
    // Opponent: target 40, roll 25 → SL = 4 - 2 = 2
    // Net SL = 2 - 2 = 0, rolls 35 vs 25 → not equal
    // Need same roll same SL:
    // Player: target 40, roll 35 → SL = 4 - 3 = 1
    // Opponent: target 40, roll 35 → SL = 4 - 3 = 1
    // Net SL = 0, rolls equal → tie
    const result = resolveOpposedTest(40, 35, 40, 35);
    expect(result.netSL).toBe(0);
    expect(result.playerRoll).toBe(35);
    expect(result.opponentRoll).toBe(35);
    expect(result.winner).toBe('tie');
  });

  it('returns correct roll values in result', () => {
    const result = resolveOpposedTest(50, 42, 45, 67);
    expect(result.playerRoll).toBe(42);
    expect(result.opponentRoll).toBe(67);
  });

  it('handles auto-success adjustments for SL calculation', () => {
    // Player rolls 3 (auto-success): target 10, roll 3 → natural SL = 1 - 0 = 1, auto gives min +1, stays 1
    // Opponent: target 40, roll 30 → SL = 4 - 3 = 1
    // Net SL = 1 - 1 = 0 → tie-breaker: roll 3 vs 30 → opponent wins
    const result = resolveOpposedTest(10, 3, 40, 30);
    expect(result.playerSL).toBeGreaterThanOrEqual(1);
    expect(result.netSL).toBe(result.playerSL - result.opponentSL);
  });

  it('handles auto-failure adjustments for SL calculation', () => {
    // Player rolls 99 (auto-failure): target 95, roll 99 → natural SL = 9 - 9 = 0, auto-fail gives max -1
    // Opponent: target 30, roll 50 → SL = 3 - 5 = -2
    // Net SL = -1 - (-2) = 1 → player wins
    const result = resolveOpposedTest(95, 99, 30, 50);
    expect(result.playerSL).toBe(-1);
    expect(result.opponentSL).toBe(-2);
    expect(result.netSL).toBe(1);
    expect(result.winner).toBe('player');
  });

  it('net SL always equals playerSL - opponentSL', () => {
    const result = resolveOpposedTest(60, 15, 35, 72);
    expect(result.netSL).toBe(result.playerSL - result.opponentSL);
  });
});
