export type EncumbranceLevel = 'neutral' | 'warning' | 'danger' | 'critical';

/**
 * Classify encumbrance severity based on current/max ratio.
 *
 * Thresholds:
 * - "neutral":  ratio < 0.5
 * - "warning":  0.5 ≤ ratio < 0.75
 * - "danger":   0.75 ≤ ratio < 1.0
 * - "critical": ratio ≥ 1.0
 *
 * Edge case: if max is 0, returns "critical" (cannot carry anything).
 */
export function getEncumbranceLevel(current: number, max: number): EncumbranceLevel {
  if (max <= 0) return 'critical';

  const ratio = current / max;

  if (ratio >= 1.0) return 'critical';
  if (ratio >= 0.75) return 'danger';
  if (ratio >= 0.5) return 'warning';
  return 'neutral';
}

/**
 * Format encumbrance display string containing both numeric values.
 * Example output: "12 / 18"
 */
export function formatEncumbrance(current: number, max: number): string {
  return `${current} / ${max}`;
}

/**
 * Calculates effective encumbrance for a single armour item.
 * Per WFRP4e Core p.293: worn items have Enc reduced by 1, minimum 0.
 * Unworn items contribute their full Enc value.
 */
export function calculateArmourEncumbrance(enc: string, worn: boolean | undefined): number {
  const baseEnc = parseFloat(enc) || 0;
  if (worn === false) return baseEnc;
  return Math.max(0, baseEnc - 1);
}
