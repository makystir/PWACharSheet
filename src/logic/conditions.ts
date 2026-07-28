import type { Condition } from '../types/character';

export interface ConditionAutomationResult {
  conditions: Condition[];
  applied: string[];   // Names of conditions that were auto-applied
}

/**
 * Evaluate Fatigued→Unconscious threshold rule (Core Rulebook p.167).
 *
 * - If Fatigued level >= TB and Unconscious not present, add Unconscious at level 1.
 * - If already unconscious, return unchanged (no duplicate).
 * - If Fatigued < TB, retain Unconscious (no removal — GM discretion per RAW).
 * - If toughnessBonus <= 0, treat as TB=1.
 * - If conditions is null/undefined, return empty result.
 */
export function evaluateFatiguedThreshold(
  conditions: Condition[] | null | undefined,
  toughnessBonus: number
): ConditionAutomationResult {
  if (!conditions) {
    return { conditions: [], applied: [] };
  }

  const effectiveTB = toughnessBonus <= 0 ? 1 : toughnessBonus;
  const fatigued = conditions.find(c => c.name === 'Fatigued');
  const hasUnconscious = conditions.some(c => c.name === 'Unconscious');

  if (fatigued && fatigued.level >= effectiveTB && !hasUnconscious) {
    return {
      conditions: [...conditions, { name: 'Unconscious', level: 1 }],
      applied: ['Unconscious'],
    };
  }

  return { conditions, applied: [] };
}
