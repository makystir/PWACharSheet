/**
 * Condition badge color map for visual color-coding.
 * Each condition has a background color, text color, and hue for intensity scaling.
 * All color combinations maintain a minimum 4.5:1 contrast ratio (WCAG AA).
 */
export interface ConditionColor {
  /** Background color for the badge */
  bg: string;
  /** Text color for the badge */
  text: string;
  /** Hue value for potential HSL-based intensity variations */
  hue: number;
}

export const CONDITION_COLORS: Record<string, ConditionColor> = {
  Bleeding:    { bg: '#dc2626', text: '#fff', hue: 0 },
  Ablaze:      { bg: '#9a3412', text: '#fff', hue: 20 },
  Poisoned:    { bg: '#166534', text: '#fff', hue: 142 },
  Stunned:     { bg: '#ca8a04', text: '#000', hue: 45 },
  Surprised:   { bg: '#ca8a04', text: '#000', hue: 45 },
  Fatigued:    { bg: '#9a3412', text: '#fff', hue: 25 },
  Prone:       { bg: '#6b7280', text: '#fff', hue: 220 },
  Broken:      { bg: '#7c3aed', text: '#fff', hue: 263 },
  Blinded:     { bg: '#374151', text: '#fff', hue: 215 },
  Deafened:    { bg: '#374151', text: '#fff', hue: 215 },
  Entangled:   { bg: '#92400e', text: '#fff', hue: 30 },
  Unconscious: { bg: '#111827', text: '#fff', hue: 220 },
};

/** Fallback color for unknown conditions */
export const CONDITION_COLOR_FALLBACK: ConditionColor = {
  bg: '#6b7280',
  text: '#fff',
  hue: 220,
};

/**
 * Compute the opacity for a stackable condition badge based on its level.
 * Returns a value between a minimum base opacity and 1.0,
 * scaling proportionally to level/maxLevel.
 *
 * For non-stackable conditions or level <= 1, returns 1.0 (full opacity).
 *
 * @param level - Current level of the condition (1-based)
 * @param maxLevel - Maximum level the condition can reach
 * @param isStackable - Whether the condition is stackable
 * @returns opacity value between 0.5 and 1.0
 */
export function getConditionIntensity(
  level: number,
  maxLevel: number,
  isStackable: boolean
): number {
  if (!isStackable || level <= 1 || maxLevel <= 1) return 1.0;

  // Base opacity of 0.5 scaling up to 1.0 at max level
  const MIN_OPACITY = 0.5;
  const ratio = level / maxLevel;
  return MIN_OPACITY + ratio * (1.0 - MIN_OPACITY);
}
