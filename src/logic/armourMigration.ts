import type { ArmourItem } from '../types/character';
import { ARMOURS } from '../data/armour';

/**
 * Maps old core-rulebook armour names to Archives of the Empire Vol. III names.
 */
export const ARMOUR_NAME_MAP: Record<string, string> = {
  'Mail Coat': 'Chainmail Coat',
  'Mail Chausses': 'Chainmail Chausses',
  'Mail Coif': 'Chainmail Coif',
  'Mail Shirt': 'Chainmail Shirt',
  'Plate Breastplate': 'Breastplate',
  'Plate Bracers': 'Bracers',
  'Helm': 'Great Helm',
  'Boiled Leather Breastplate': 'Leather Jerkin',
};

/**
 * Migrate a single armour item to the expanded format.
 * - Renames old core-rulebook names to Archives Vol. III names
 * - Sets currentAp default to item.ap if missing
 * - Clamps invalid currentAp values to [0, ap]
 * - Sets visorOpen to false for items with Visor quality if missing
 * - Infers armourType from the ARMOURS database if missing
 * - Preserves all existing fields
 */
export function migrateArmourItem(item: ArmourItem): ArmourItem {
  const migrated: ArmourItem = { ...item };

  // Rename old core-rulebook names
  if (migrated.name in ARMOUR_NAME_MAP) {
    migrated.name = ARMOUR_NAME_MAP[migrated.name];
  }

  // Default currentAp to ap if missing
  if (migrated.currentAp === undefined || migrated.currentAp === null) {
    migrated.currentAp = migrated.ap;
  } else {
    // Clamp invalid currentAp values to [0, ap]
    if (migrated.currentAp < 0) {
      migrated.currentAp = 0;
    }
    if (migrated.currentAp > migrated.ap) {
      migrated.currentAp = migrated.ap;
    }
  }

  // Set visorOpen for items with Visor quality if missing
  if (
    migrated.qualities &&
    migrated.qualities.includes('Visor') &&
    migrated.visorOpen === undefined
  ) {
    migrated.visorOpen = false;
  }

  // Infer armourType from ARMOURS database if missing
  if (migrated.armourType === undefined) {
    const match = ARMOURS.find((a) => a.name === migrated.name);
    if (match) {
      migrated.armourType = match.armourType;
    }
  }

  return migrated;
}

/**
 * Migrate all armour items on a character to the expanded format.
 * Applies migrateArmourItem to each item in the array.
 */
export function migrateCharacterArmour(armour: ArmourItem[]): ArmourItem[] {
  return armour.map(migrateArmourItem);
}
