import type { Condition } from '../types/character';

export interface DecrementResult {
  conditions: Condition[];
  expiredNames: string[]; // conditions whose duration hit 0
}

/**
 * Decrement duration of all conditions with positive integer durations.
 *
 * - Parses `duration` as an integer for each condition.
 * - If the parsed value is a positive integer (> 0), decrements by 1.
 * - If the duration reaches 0 after decrement, the condition name is added to `expiredNames`.
 * - Conditions with no duration, non-numeric duration, or zero/negative duration are passed through unchanged.
 */
export function decrementConditionDurations(conditions: Condition[]): DecrementResult {
  const expiredNames: string[] = [];

  const updatedConditions = conditions.map(condition => {
    if (condition.duration === undefined || condition.duration === '') {
      return condition;
    }

    const parsed = parseInt(condition.duration, 10);

    // Non-numeric or not a clean integer string — leave unchanged
    if (isNaN(parsed) || String(parsed) !== condition.duration.trim()) {
      return condition;
    }

    // Only decrement positive integers
    if (parsed <= 0) {
      return condition;
    }

    const newDuration = parsed - 1;

    if (newDuration === 0) {
      expiredNames.push(condition.name);
    }

    return { ...condition, duration: String(newDuration) };
  });

  return { conditions: updatedConditions, expiredNames };
}
