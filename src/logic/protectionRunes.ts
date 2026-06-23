import { RUNE_CATALOGUE } from '../data/runes';
import type { RuneDefinition } from '../data/runes';
import type { ProtectionItem } from '../types/character';
import type { RuneValidationResult } from './runes';

/**
 * Validates whether a protection rune can be placed on a given Protection Item.
 *
 * Rules enforced:
 * 1. Rune ID must exist in RUNE_CATALOGUE
 * 2. Rune must be in the 'protection' category
 * 3. Item cannot already have 3 runes (max capacity)
 * 4. Only one Master Rune allowed per item
 */
export function validateProtectionPlacement(
  runeId: string,
  item: ProtectionItem
): RuneValidationResult {
  const rune = RUNE_CATALOGUE.find(r => r.id === runeId);

  if (!rune) {
    return { valid: false, error: 'Unknown rune.' };
  }

  if (rune.category !== 'protection') {
    return { valid: false, error: 'Only protection runes can be inscribed on this item.' };
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
 * Returns known runes filtered to category 'protection'.
 * Only returns runes whose IDs are in the knownRunes list and belong to the protection category.
 */
export function getAvailableProtectionRunes(
  knownRunes: string[]
): RuneDefinition[] {
  return RUNE_CATALOGUE.filter(
    r => r.category === 'protection' && knownRunes.includes(r.id)
  );
}
