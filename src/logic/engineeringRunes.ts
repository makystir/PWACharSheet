import { RUNE_CATALOGUE } from '../data/runes';
import type { RuneDefinition } from '../data/runes';
import type { EngineeringItem } from '../types/character';
import type { RuneValidationResult } from './runes';

/**
 * Validates whether a rune can be placed on an engineering item (artillery weapon).
 *
 * Rules enforced:
 * 1. Rune ID must exist in RUNE_CATALOGUE
 * 2. Rune must be in the 'engineering' category
 * 3. Maximum 3 runes per item
 * 4. Maximum 1 master rune per item
 */
export function validateEngineeringPlacement(
  runeId: string,
  item: EngineeringItem
): RuneValidationResult {
  const rune = RUNE_CATALOGUE.find(r => r.id === runeId);
  if (!rune) {
    return { valid: false, error: 'Unknown rune.' };
  }

  if (rune.category !== 'engineering') {
    return { valid: false, error: 'Only engineering runes can be inscribed on artillery weapons.' };
  }

  if (item.runes.length >= 3) {
    return { valid: false, error: 'This item already has the maximum of 3 runes.' };
  }

  if (rune.isMaster) {
    const hasMaster = item.runes.some(id => {
      const existing = RUNE_CATALOGUE.find(r => r.id === id);
      return existing?.isMaster === true;
    });
    if (hasMaster) {
      return { valid: false, error: 'Only one Master Rune is allowed per item.' };
    }
  }

  return { valid: true };
}

/**
 * Returns all engineering runes that the character knows.
 */
export function getAvailableEngineeringRunes(knownRunes: string[]): RuneDefinition[] {
  return RUNE_CATALOGUE.filter(
    r => r.category === 'engineering' && knownRunes.includes(r.id)
  );
}

/**
 * Calculates the number of Rune of Forging charges for an engineering item.
 * Each inscription of the engineering Rune of Forging provides one charge.
 */
export function calculateForgingCharges(item: EngineeringItem): number {
  return item.runes.filter(id => id === 'engineering-rune-of-forging').length;
}

/**
 * Activates a Rune of Forging on an engineering item, decrementing available charges.
 * Returns success/failure and the updated charges record.
 */
export function activateRuneOfForging(
  item: EngineeringItem,
  forgingCharges: Record<string, number>
): { success: boolean; error?: string; updatedCharges: Record<string, number> } {
  const charges = forgingCharges[item.id] ?? calculateForgingCharges(item);

  if (charges <= 0) {
    return {
      success: false,
      error: 'All Runes of Forging on this item have been used this adventure.',
      updatedCharges: forgingCharges,
    };
  }

  return {
    success: true,
    updatedCharges: { ...forgingCharges, [item.id]: charges - 1 },
  };
}

/**
 * Resets forging charges for all engineering items at the start of a new adventure.
 * Returns a record mapping item IDs to their full charge counts.
 */
export function resetForgingCharges(items: EngineeringItem[]): Record<string, number> {
  const charges: Record<string, number> = {};
  for (const item of items) {
    charges[item.id] = calculateForgingCharges(item);
  }
  return charges;
}
