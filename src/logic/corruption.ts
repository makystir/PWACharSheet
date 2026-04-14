import type { Character, CharacteristicKey, CharacteristicValue, MutationEntry } from '../types/character';
import { getBonus } from './calculators';
import { PHYSICAL_MUTATION_TABLE, MENTAL_MUTATION_TABLE } from '../data/mutation-tables';
import type { MutationTableEntry } from '../data/mutation-tables';

export type CorruptionStatus = 'normal' | 'warning' | 'danger';
export type SinRiskLevel = 'none' | 'mild' | 'moderate' | 'danger';

/**
 * Calculates the Corruption Threshold: TB + WPB + pureSoulLevel.
 * TB = floor(totalT / 10), WPB = floor(totalWP / 10).
 */
export function getCorruptionThreshold(
  chars: Record<CharacteristicKey, CharacteristicValue>,
  pureSoulLevel: number
): number {
  const TB = getBonus(chars.T.i + chars.T.a + chars.T.b);
  const WPB = getBonus(chars.WP.i + chars.WP.a + chars.WP.b);
  return TB + WPB + pureSoulLevel;
}

/**
 * Returns the corruption status based on current corruption points and threshold.
 * - corr < threshold * 0.5 → 'normal'
 * - corr >= threshold * 0.5 && corr < threshold → 'warning'
 * - corr >= threshold → 'danger'
 */
export function getCorruptionStatus(corr: number, threshold: number): CorruptionStatus {
  if (corr >= threshold) return 'danger';
  if (corr >= threshold * 0.5) return 'warning';
  return 'normal';
}

/**
 * Returns the sin risk level based on current sin points.
 * 0 → 'none'; 1–3 → 'mild'; 4–6 → 'moderate'; 7+ → 'danger'
 */
export function getSinRiskLevel(sin: number): SinRiskLevel {
  if (sin <= 0) return 'none';
  if (sin <= 3) return 'mild';
  if (sin <= 6) return 'moderate';
  return 'danger';
}

/**
 * Returns the units die values that trigger Wrath of the Gods.
 * For sin=3, returns [1, 2, 3]. For sin=0, returns [].
 */
export function getWrathRiskValues(sin: number): number[] {
  return Array.from({ length: sin }, (_, i) => i + 1);
}

/**
 * Extracts the Pure Soul talent level from a talents array.
 * Returns 0 if the talent is not found.
 */
export function getPureSoulLevel(talents: Array<{ n: string; lvl: number }>): number {
  const pureSoul = talents.find(t => t.n.toLowerCase() === 'pure soul');
  return pureSoul ? pureSoul.lvl : 0;
}

export type MutationType = 'physical' | 'mental';

export interface MutationTypeDistribution {
  physicalMax: number;  // d100 roll <= this = physical
  mentalMin: number;    // d100 roll >= this = mental
}

const SPECIES_DISTRIBUTION: Record<string, MutationTypeDistribution> = {
  'Human':      { physicalMax: 50, mentalMin: 51 },
  'Reiklander': { physicalMax: 50, mentalMin: 51 },
  'Dwarf':      { physicalMax: 5,  mentalMin: 6 },
  'Halfling':   { physicalMax: 10, mentalMin: 11 },
  'High Elf':   { physicalMax: 0,  mentalMin: 1 },
  'Wood Elf':   { physicalMax: 0,  mentalMin: 1 },
};

const DEFAULT_DISTRIBUTION: MutationTypeDistribution = { physicalMax: 50, mentalMin: 51 };

/**
 * Returns the mutation type distribution (physical/mental d100 split) for a species.
 * Unknown species default to Human distribution (50/50).
 */
export function getMutationTypeDistribution(species: string): MutationTypeDistribution {
  return SPECIES_DISTRIBUTION[species] ?? DEFAULT_DISTRIBUTION;
}

/**
 * Determines whether a d100 roll produces a physical or mental mutation for the given species.
 * If roll <= distribution.physicalMax → 'physical', else → 'mental'.
 * For Elves where physicalMax=0, all rolls are mental.
 */
export function determineMutationType(roll: number, species: string): MutationType {
  const dist = getMutationTypeDistribution(species);
  return roll <= dist.physicalMax ? 'physical' : 'mental';
}

/**
 * Looks up a mutation from the Physical or Mental Corruption Table by d100 roll.
 * Clamps the roll to [1, 100] before lookup.
 */
export function lookupMutation(roll: number, type: MutationType): MutationTableEntry {
  const clamped = Math.max(1, Math.min(100, roll));
  const table = type === 'physical' ? PHYSICAL_MUTATION_TABLE : MENTAL_MUTATION_TABLE;
  return table.find(entry => clamped >= entry.min && clamped <= entry.max)!;
}

/**
 * Returns the physical mutation limit: Toughness Bonus (floor(totalT / 10)).
 */
export function getPhysicalMutationLimit(
  chars: Record<CharacteristicKey, CharacteristicValue>
): number {
  return getBonus(chars.T.i + chars.T.a + chars.T.b);
}

/**
 * Returns the mental mutation limit: Willpower Bonus (floor(totalWP / 10)).
 */
export function getMentalMutationLimit(
  chars: Record<CharacteristicKey, CharacteristicValue>
): number {
  return getBonus(chars.WP.i + chars.WP.a + chars.WP.b);
}

/**
 * Returns the corruption points to subtract when a mutation is gained: WPB.
 */
export function getCorruptionLossOnMutation(
  chars: Record<CharacteristicKey, CharacteristicValue>
): number {
  return getBonus(chars.WP.i + chars.WP.a + chars.WP.b);
}

/**
 * Converts legacy `muts` string to structured `mutations` array.
 * - If mutations already exists and is non-empty, returns character unchanged (idempotent).
 * - If muts is a non-empty string (after trimming), creates one legacy entry.
 * - If muts is empty or whitespace-only, sets mutations to [].
 */
export function migrateCorruptionData(character: Character): Character {
  if (character.mutations && character.mutations.length > 0) {
    return character;
  }

  const mutsText = (character.muts ?? '').trim();

  const mutations: MutationEntry[] = mutsText.length > 0
    ? [{ id: 1, type: 'physical', name: 'Legacy', effect: mutsText }]
    : [];

  return { ...character, mutations };
}
