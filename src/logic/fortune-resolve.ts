/** Result of a spend or burn operation */
export interface FortuneResolveResult {
  fortune: number;
  fate: number;
  resolve: number;
  resilience: number;
}

/** Reasons a player can spend Fortune */
export type FortuneSpendReason = 'Reroll' | 'Add +1 SL' | 'Special Ability';

/** Reasons a player can spend Resolve */
export type ResolveSpendReason = 'Immunity to Psychology' | 'Remove Conditions' | 'Special Ability';

/**
 * Spend 1 Fortune point. Returns new fortune value, or null if fortune is 0.
 */
export function spendFortune(_fate: number, fortune: number): number | null {
  if (fortune <= 0) return null;
  return fortune - 1;
}

/**
 * Spend 1 Resolve point. Returns new resolve value, or null if resolve is 0.
 */
export function spendResolve(_resilience: number, resolve: number): number | null {
  if (resolve <= 0) return null;
  return resolve - 1;
}

/**
 * Permanently burn 1 Fate. Returns null if fate is 0.
 * Clamps fortune to the new max (fate + luckLevel) if fortune exceeds it.
 */
export function burnFate(fate: number, fortune: number, luckLevel: number = 0): { fate: number; fortune: number } | null {
  if (fate <= 0) return null;
  const newFate = fate - 1;
  const newMax = newFate + luckLevel;
  return { fate: newFate, fortune: Math.min(fortune, newMax) };
}

/**
 * Permanently burn 1 Resilience. Returns null if resilience is 0.
 * Clamps resolve to the new resilience value if resolve exceeds it.
 */
export function burnResilience(resilience: number, resolve: number): { resilience: number; resolve: number } | null {
  if (resilience <= 0) return null;
  const newResilience = resilience - 1;
  return { resilience: newResilience, resolve: Math.min(resolve, newResilience) };
}

/**
 * Session reset: set fortune = fate + luckLevel, resolve = resilience.
 * The Luck talent (Core Rulebook p.138) increases max Fortune by 1 per level.
 */
export function sessionReset(fate: number, resilience: number, luckLevel: number = 0): { fortune: number; resolve: number } {
  return { fortune: fate + luckLevel, resolve: resilience };
}

/**
 * Validate that all values are >= 0 and spendable pools don't exceed base + Luck.
 * Fortune max = fate + luckLevel per the Luck talent (Core Rulebook p.138).
 */
export function validateFortuneResolve(
  fate: number,
  fortune: number,
  resilience: number,
  resolve: number,
  luckLevel: number = 0
): boolean {
  return fate >= 0 && fortune >= 0 && resilience >= 0 && resolve >= 0
    && fortune <= fate + luckLevel && resolve <= resilience;
}
