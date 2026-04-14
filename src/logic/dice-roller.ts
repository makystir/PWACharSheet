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

/** Calculate opposed test result */
export function calculateOpposedResult(playerSL: number, opponentSL: number): OpposedResult {
  const netSL = playerSL - opponentSL;
  let winner: 'player' | 'opponent' | 'tie';
  if (netSL > 0) winner = 'player';
  else if (netSL < 0) winner = 'opponent';
  else winner = 'tie';
  return { playerSL, opponentSL, netSL, winner };
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
