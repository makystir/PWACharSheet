import type { Character, CharacteristicKey, SpeciesData } from '../types/character';
import { SPECIES_DATA } from '../data/species';

const ALL_CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

/**
 * Lookup species data by name. Returns undefined if not found.
 */
export function getSpeciesData(species: string): SpeciesData | undefined {
  return SPECIES_DATA[species];
}

/**
 * Apply species racial bonuses to a character.
 * Sets characteristic initial values, movement, fate, resilience,
 * extraPoints, woundsUseSB, speciesSkills, and speciesTalents.
 */
export function applySpeciesData(character: Character, species: string): Character {
  const data = SPECIES_DATA[species];
  if (!data) return { ...character };

  const newChars = { ...character.chars };
  for (const key of ALL_CHAR_KEYS) {
    newChars[key] = { ...newChars[key], i: data.chars[key] };
  }

  return {
    ...character,
    species,
    chars: newChars,
    move: { m: data.move, w: data.move * 2, r: data.move * 4 },
    fate: data.fate,
    resilience: data.resilience,
    speciesExtraPoints: data.extraPoints,
    woundsUseSB: data.woundsUseSB,
    speciesSkills: [...data.skills],
    speciesTalents: [...data.talents],
  };
}

/**
 * Clear species-related fields back to defaults.
 */
export function clearSpeciesData(character: Character): Character {
  const newChars = { ...character.chars };
  for (const key of ALL_CHAR_KEYS) {
    newChars[key] = { ...newChars[key], i: 0 };
  }

  return {
    ...character,
    species: '',
    chars: newChars,
    move: { m: 0, w: 0, r: 0 },
    fate: 0,
    resilience: 0,
    speciesExtraPoints: 0,
    woundsUseSB: false,
    speciesSkills: [],
    speciesTalents: [],
  };
}
