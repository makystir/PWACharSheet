import type { PsychologyType } from '../types/character';

export const PSYCHOLOGY_REMINDERS: Record<PsychologyType, string> = {
  Animosity: "Must pass Cool Test or verbally abuse/hinder target",
  Hatred: "Must pass Cool Test or attack target in melee; +1 SL on hit",
  Fear: "Must pass Cool Test or gain Broken condition",
  Terror: "Must pass Cool Test or gain Broken condition and a number of Fatigued conditions equal to Terror rating",
  Frenzy: "Must pass Cool Test to resist; +1 SL on melee, immune to psychology, cannot Flee or Disengage",
  Prejudice: "Must pass Cool Test or verbally abuse target; will not assist target willingly"
};

/**
 * Validate a psychology trait has all required fields.
 * - Type must be non-empty
 * - Fear/Terror: rating must be a positive number
 * - Animosity/Hatred/Prejudice: target must be a non-empty string
 * - Frenzy: no additional fields required beyond type
 */
export function validatePsychologyTrait(
  type: PsychologyType | '',
  target: string,
  rating?: number
): boolean {
  if (!type) {
    return false;
  }

  if (type === 'Fear' || type === 'Terror') {
    return rating !== undefined && rating > 0;
  }

  if (type === 'Animosity' || type === 'Hatred' || type === 'Prejudice') {
    return target.trim().length > 0;
  }

  // Frenzy: no additional fields required
  return true;
}
