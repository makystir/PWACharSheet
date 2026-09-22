import type { CharacteristicKey } from '../../types/character';
import { CHARACTERISTIC_KEYS } from '../../types/character';

/**
 * The ten WFRP characteristics in canonical sheet order. Re-exported from the
 * domain constant in types/character so UI code can keep importing `CHAR_KEYS`
 * from here while there remains a single source of truth.
 */
export const CHAR_KEYS = CHARACTERISTIC_KEYS;

/** Full display names for each characteristic, keyed by its short code. */
export const CHAR_FULL_NAMES: Record<CharacteristicKey, string> = {
  WS: 'Weapon Skill', BS: 'Ballistic Skill', S: 'Strength', T: 'Toughness',
  I: 'Initiative', Ag: 'Agility', Dex: 'Dexterity', Int: 'Intelligence',
  WP: 'Willpower', Fel: 'Fellowship',
};
