import type { Consumable } from '../types/character';

/**
 * Decrement dose count, flooring at 0.
 */
export function decrementDose(consumable: Consumable): Consumable {
  return {
    ...consumable,
    currentDoses: Math.max(0, consumable.currentDoses - 1),
  };
}

/**
 * Increment dose count, capping at maxDoses.
 */
export function incrementDose(consumable: Consumable): Consumable {
  return {
    ...consumable,
    currentDoses: Math.min(consumable.maxDoses, consumable.currentDoses + 1),
  };
}
