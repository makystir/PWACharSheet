import type { Combatant } from '../types/character';

/**
 * Sort combatants by initiative descending.
 * For equal initiatives, maintains insertion order (stable sort).
 */
export function sortByInitiative(combatants: Combatant[]): Combatant[] {
  return [...combatants].sort((a, b) => b.initiative - a.initiative);
}

/**
 * Advance active index to next combatant, wrapping at end.
 * Returns 0 if totalCombatants is 0 or negative.
 */
export function nextTurn(activeIndex: number, totalCombatants: number): number {
  if (totalCombatants <= 0) return 0;
  return (activeIndex + 1) % totalCombatants;
}
