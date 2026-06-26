/** Difficulty levels per WFRP 4e Difficulty Table */
export type DifficultyLevel =
  | 'Very Easy'    // +60
  | 'Easy'         // +40
  | 'Average'      // +20
  | 'Challenging'  // +0
  | 'Difficult'    // -10
  | 'Hard'         // -20
  | 'Very Hard';   // -30

export const DIFFICULTY_MODIFIERS: Record<DifficultyLevel, number> = {
  'Very Easy': 60,
  'Easy': 40,
  'Average': 20,
  'Challenging': 0,
  'Difficult': -10,
  'Hard': -20,
  'Very Hard': -30,
};

/** Outcome descriptions from the WFRP 4e Outcomes Table */
export type OutcomeDescription =
  | 'Astounding Success'
  | 'Impressive Success'
  | 'Success'
  | 'Marginal Success'
  | 'Marginal Failure'
  | 'Failure'
  | 'Impressive Failure'
  | 'Astounding Failure';

export interface RollResult {
  roll: number;
  targetNumber: number;
  baseTarget: number;
  difficulty: DifficultyLevel;
  passed: boolean;
  sl: number;
  isCritical: boolean;
  isFumble: boolean;
  isAutoSuccess: boolean;
  isAutoFailure: boolean;
  outcome: OutcomeDescription;
  skillOrCharName: string;
  timestamp: number;
}

export interface OpposedResult {
  playerSL: number;
  opponentSL: number;
  netSL: number;
  winner: 'player' | 'opponent' | 'tie';
}

/** Get the tens digit of a number. 100 → 10, 5 → 0, 43 → 4 */
export function tensDigit(n: number): number {
  return Math.floor(n / 10);
}

/** Check if a d100 roll is a double (both digits same). 100 is treated as 00. */
export function isDouble(roll: number): boolean {
  const effective = roll === 100 ? 0 : roll;
  const ones = effective % 10;
  const tens = Math.floor(effective / 10) % 10;
  return ones === tens;
}

/** Map SL to outcome description per the WFRP 4e Outcomes Table */
export function getOutcome(sl: number, isCritical: boolean, isFumble: boolean): OutcomeDescription {
  if (isCritical) return 'Astounding Success';
  if (isFumble) return 'Astounding Failure';

  if (sl >= 6) return 'Astounding Success';
  if (sl >= 4) return 'Impressive Success';
  if (sl >= 2) return 'Success';
  if (sl >= 0) return 'Marginal Success';
  if (sl >= -1) return 'Marginal Failure';
  if (sl >= -3) return 'Failure';
  if (sl >= -5) return 'Impressive Failure';
  return 'Astounding Failure';
}

/**
 * Core roll resolution. Accepts an injected roll value (1-100) for testability.
 */
export function resolveRoll(roll: number, targetNumber: number): {
  passed: boolean;
  sl: number;
  isCritical: boolean;
  isFumble: boolean;
  isAutoSuccess: boolean;
  isAutoFailure: boolean;
  outcome: OutcomeDescription;
} {
  // Clamp roll to [1, 100]
  const clampedRoll = Math.min(100, Math.max(1, roll));

  const isAutoSuccess = clampedRoll >= 1 && clampedRoll <= 5;
  const isAutoFailure = clampedRoll >= 96 && clampedRoll <= 100;

  // Base pass/fail: roll ≤ target = pass
  let passed = clampedRoll <= targetNumber;

  // SL = tensDigit(target) - tensDigit(roll)
  let sl = tensDigit(targetNumber) - tensDigit(clampedRoll);

  // Auto-success overrides: always pass, minimum SL +1
  if (isAutoSuccess) {
    passed = true;
    if (sl < 1) sl = 1;
  }

  // Auto-failure overrides: always fail, maximum SL -1
  if (isAutoFailure) {
    passed = false;
    if (sl > -1) sl = -1;
  }

  const double = isDouble(clampedRoll);
  const isCritical = passed && double;
  const isFumble = !passed && double;

  const outcome = getOutcome(sl, isCritical, isFumble);

  return { passed, sl, isCritical, isFumble, isAutoSuccess, isAutoFailure, outcome };
}

/** Compute target number for a skill (characteristic total + skill advances) */
export function computeSkillTarget(
  charInitial: number,
  charAdvances: number,
  charBonus: number,
  skillAdvances: number,
): number {
  return charInitial + charAdvances + charBonus + skillAdvances;
}

/** Compute target number for a characteristic test */
export function computeCharacteristicTarget(
  initial: number,
  advances: number,
  bonus: number,
): number {
  return initial + advances + bonus;
}

/** Apply difficulty modifier to a base target */
export function applyDifficulty(baseTarget: number, difficulty: DifficultyLevel): number {
  return baseTarget + DIFFICULTY_MODIFIERS[difficulty];
}

/**
 * Calculate opposed test result from pre-computed SL values.
 * When netSL === 0, uses target numbers (higher tested skill wins) as tie-breaker.
 * If target numbers are not provided or are equal, result is 'tie'.
 * Roll values are NOT used as a tie-breaker.
 */
export function calculateOpposedResult(
  playerSL: number,
  opponentSL: number,
  playerTarget?: number,
  opponentTarget?: number,
): OpposedResult {
  const netSL = playerSL - opponentSL;
  let winner: 'player' | 'opponent' | 'tie';
  if (netSL > 0) {
    winner = 'player';
  } else if (netSL < 0) {
    winner = 'opponent';
  } else {
    // Tie-breaker: higher tested skill/characteristic wins when net SL = 0
    if (playerTarget !== undefined && opponentTarget !== undefined) {
      if (playerTarget > opponentTarget) {
        winner = 'player';
      } else if (opponentTarget > playerTarget) {
        winner = 'opponent';
      } else {
        winner = 'tie';
      }
    } else {
      winner = 'tie';
    }
  }
  return { playerSL, opponentSL, netSL, winner };
}

export interface OpposedTestResult {
  playerRoll: number;
  playerSL: number;
  opponentRoll: number;
  opponentSL: number;
  netSL: number;
  winner: 'player' | 'opponent' | 'tie';
}

/**
 * Resolve a full opposed test between player and opponent.
 * Computes SL for each side using resolveRoll (which handles auto-success/failure
 * adjustments on doubles ≤ 5 giving at least +1 SL, and doubles > 5 giving at most -1 SL).
 * Tie resolution: when net SL = 0, the side with the higher target number (tested skill) wins.
 * If both target numbers are equal and net SL = 0, result is a tie.
 */
export function resolveOpposedTest(
  playerTarget: number,
  playerRoll: number,
  opponentTarget: number,
  opponentRoll: number
): OpposedTestResult {
  const playerResolution = resolveRoll(playerRoll, playerTarget);
  const opponentResolution = resolveRoll(opponentRoll, opponentTarget);

  // Delegate winner determination to calculateOpposedResult
  const opposed = calculateOpposedResult(
    playerResolution.sl,
    opponentResolution.sl,
    playerTarget,
    opponentTarget
  );

  return {
    playerRoll: Math.min(100, Math.max(1, playerRoll)),
    playerSL: playerResolution.sl,
    opponentRoll: Math.min(100, Math.max(1, opponentRoll)),
    opponentSL: opponentResolution.sl,
    netSL: opposed.netSL,
    winner: opposed.winner,
  };
}

/** Full roll pipeline: compute target, apply difficulty, resolve roll */
export function performRoll(
  baseTarget: number,
  difficulty: DifficultyLevel,
  skillOrCharName: string,
  rollValue: number,
): RollResult {
  const targetNumber = applyDifficulty(baseTarget, difficulty);
  const resolution = resolveRoll(rollValue, targetNumber);

  return {
    roll: Math.min(100, Math.max(1, rollValue)),
    targetNumber,
    baseTarget,
    difficulty,
    ...resolution,
    skillOrCharName,
    timestamp: Date.now(),
  };
}
