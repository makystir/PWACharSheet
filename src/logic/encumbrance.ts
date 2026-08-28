import type { Trapping } from '../types/character';

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

/**
 * Wearable trapping names — clothing and jewellery worn on the body.
 * Core p.293 "Worn Items": armour, clothing, and jewellery have their
 * Encumbrance dropped by 1 (min 0) when worn. Names are compared
 * case-insensitively against the trimmed trapping name.
 */
export const WEARABLE_TRAPPING_NAMES: readonly string[] = [
  'Boots',
  'Cloak',
  'Clothing',
  'Coat',
  'Hat',
  'Hood or Mask',
  'Silk Underwear',
  'Practical Robes',
  'Standard Robes',
  'Elaborate Robes',
];

/**
 * Returns true when the trapping name matches a defined clothing or jewellery
 * item (Core p.293 "Worn Items"). Comparison is case-insensitive and trimmed.
 */
export function isWearableTrapping(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return WEARABLE_TRAPPING_NAMES.some((n) => n.toLowerCase() === normalized);
}

/**
 * Per-item then quantity-multiplied effective encumbrance for one trapping.
 * Core p.293 "Worn Items": worn items have per-item Enc reduced by 1, minimum 0.
 * The reduction is applied per individual item, then multiplied by quantity.
 */
export function calculateTrappingEncumbrance(
  enc: string,
  quantity: number,
  worn: boolean | undefined,
): number {
  const baseEnc = parseFloat(enc) || 0;
  const qty = quantity || 1;
  const perItem = worn === true ? Math.max(0, baseEnc - 1) : baseEnc;
  return perItem * qty;
}

/**
 * Effective read-time worn state: stored-on-horse wins over worn (Req 6.3).
 * A trapping is only effectively worn when worn === true and it is not stored on horse.
 */
export function isEffectivelyWorn(t: Trapping): boolean {
  return t.worn === true && t.storedOnHorse !== true;
}

/**
 * Carried total: sum of effective enc for trappings NOT stored on horse (Req 4.5, 4.6).
 * Uses the effective (read-time) worn state so a both-flags-true item is treated as
 * stored on horse and thus excluded here.
 */
export function calculateCarriedTrappingEnc(trappings: Trapping[]): number {
  return trappings
    .filter((t) => t.storedOnHorse !== true)
    .reduce(
      (sum, t) => sum + calculateTrappingEncumbrance(t.enc, t.quantity, isEffectivelyWorn(t)),
      0,
    );
}

/**
 * Pack-animal total: sum of effective enc for trappings stored on horse.
 * Stored-on-horse items are never worn at read time, so worn is passed as false
 * (pack total uses base Enc), matching the mutual-exclusivity rule.
 */
export function calculateHorseTrappingEnc(trappings: Trapping[]): number {
  return trappings
    .filter((t) => t.storedOnHorse === true)
    .reduce((sum, t) => sum + calculateTrappingEncumbrance(t.enc, t.quantity, false), 0);
}
