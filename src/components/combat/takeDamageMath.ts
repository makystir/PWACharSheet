// ─── Net wound calculation ───────────────────────────────────────────────────

/**
 * Calculate net wounds per WFRP 4e rules:
 * - net = max(0, incomingDamage − TB − AP)
 * - Minimum-1-wound rule (when min1Wound is true): if incomingDamage > 0 AND
 *   incomingDamage > TB + AP, at least 1 wound is dealt even if the math gives 0.
 * - If incomingDamage <= TB + AP, then 0 wounds.
 * - When min1Wound is false, the minimum-1 floor is skipped.
 */
export function calculateNetWounds(
  incomingDamage: number,
  toughnessBonus: number,
  ap: number,
  min1Wound: boolean = true,
): number {
  if (incomingDamage <= 0) return 0;
  const reduction = toughnessBonus + ap;
  const raw = Math.max(0, incomingDamage - reduction);
  // Minimum-1-wound rule: if damage exceeds TB+AP, at least 1 wound
  if (min1Wound && incomingDamage > reduction && raw < 1) return 1;
  return raw;
}
