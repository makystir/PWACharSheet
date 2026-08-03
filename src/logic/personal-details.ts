import type { SpeciesGroup, HighElfAgeTier, ColourTableEntry } from '../data/personal-details';
import { AGE_FORMULAS, HEIGHT_FORMULAS, EYE_COLOUR_TABLE, HAIR_COLOUR_TABLE, DWARF_ALTERNATE_TABLE } from '../data/personal-details';
import {
  isHumanSpecies,
  isDwarfSpecies,
  isHalflingSpecies,
  isHighElfSpecies,
  isWoodElfSpecies,
  isOgreSpecies,
} from './career-eligibility';

/**
 * Map a species string to its SpeciesGroup. Returns undefined for unknown species.
 * Uses existing species detection helpers from career-eligibility.ts.
 */
export function getSpeciesGroup(species: string): SpeciesGroup | undefined {
  if (isHighElfSpecies(species)) return 'High_Elf';
  if (isWoodElfSpecies(species)) return 'Wood_Elf';
  if (isDwarfSpecies(species)) return 'Dwarf';
  if (isHalflingSpecies(species)) return 'Halfling';
  if (isHumanSpecies(species)) return 'Human';
  if (isOgreSpecies(species)) return 'Ogre';
  return undefined;
}

/**
 * Generate a random age given species group, d10 values, and optional High Elf tier.
 * Returns the computed age as a number.
 * @param group - The species group
 * @param dice - Array of d10 results (each 1-10), length must match formula diceCount
 * @param tier - Optional High Elf age tier (defaults to Time of Ending via AGE_FORMULAS)
 */
export function generateAge(
  group: SpeciesGroup,
  dice: number[],
  tier?: HighElfAgeTier
): number {
  let base: number;
  let diceCount: number;

  if (group === 'High_Elf' && tier) {
    base = tier.base;
    diceCount = tier.diceCount;
  } else {
    const formula = AGE_FORMULAS[group];
    base = formula.base;
    diceCount = formula.diceCount;
  }

  if (dice.length !== diceCount) {
    throw new Error(
      `Expected ${diceCount} dice for ${group}, but received ${dice.length}`
    );
  }

  const sum = dice.reduce((total, die) => {
    const clamped = Math.max(1, Math.min(10, die));
    return total + clamped;
  }, 0);

  return base + sum;
}

/**
 * Format a total inches value as feet'inches" string.
 * Ensures inches portion is always 0-11.
 */
export function formatHeight(totalInches: number): string {
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
}

/**
 * Determine whether a Human height roll triggers the bonus die.
 * Returns true if either die in the pair equals 10.
 */
export function humanHeightNeedsBonus(dice: [number, number]): boolean {
  return dice[0] === 10 || dice[1] === 10;
}

/**
 * Generate a random height string.
 * @param group - The species group
 * @param dice - Array of d10 results (each 1-10)
 * @param bonusDie - Optional bonus d10 for Human height rule (1-10 or undefined)
 * @returns Formatted height string like "5'7\""
 */
export function generateHeight(
  group: SpeciesGroup,
  dice: number[],
  bonusDie?: number
): string {
  const formula = HEIGHT_FORMULAS[group];

  if (dice.length !== formula.diceCount) {
    throw new Error(
      `Expected ${formula.diceCount} dice for ${group} height, but received ${dice.length}`
    );
  }

  const baseInches = formula.baseFeet * 12 + formula.baseInches;

  const diceSum = dice.reduce((total, die) => {
    const clamped = Math.max(1, Math.min(10, die));
    return total + clamped;
  }, 0);

  let bonus = 0;
  if (bonusDie !== undefined) {
    bonus = Math.max(1, Math.min(10, bonusDie));
  }

  return formatHeight(baseInches + diceSum + bonus);
}

/**
 * Shared helper: look up a colour value from a table for a given species group and 2d10 sum.
 * Clamps the roll to [2, 20] before lookup.
 */
function lookupColour(table: ColourTableEntry[], roll: number): string {
  const clamped = Math.max(2, Math.min(20, roll));
  const entry = table.find(e => clamped >= e.min && clamped <= e.max);
  return entry!.value;
}

/**
 * Look up eye colour from the table for a given species and 2d10 sum.
 */
export function lookupEyeColour(group: SpeciesGroup, roll: number): string {
  return lookupColour(EYE_COLOUR_TABLE[group], roll);
}

/**
 * Look up hair colour from the table for a given species and 2d10 sum.
 */
export function lookupHairColour(group: SpeciesGroup, roll: number): string {
  return lookupColour(HAIR_COLOUR_TABLE[group], roll);
}

/**
 * Get deduplicated dropdown options for eye colour by species group.
 * Returns unique values preserving table order (first occurrence wins).
 */
export function getEyeColourOptions(group: SpeciesGroup): string[] {
  const table = EYE_COLOUR_TABLE[group];
  const seen = new Set<string>();
  const options: string[] = [];
  for (const entry of table) {
    if (!seen.has(entry.value)) {
      seen.add(entry.value);
      options.push(entry.value);
    }
  }
  return options;
}

/**
 * Get deduplicated dropdown options for hair colour by species group.
 * Returns unique values preserving table order (first occurrence wins).
 */
export function getHairColourOptions(group: SpeciesGroup): string[] {
  const table = HAIR_COLOUR_TABLE[group];
  const seen = new Set<string>();
  const options: string[] = [];
  for (const entry of table) {
    if (!seen.has(entry.value)) {
      seen.add(entry.value);
      options.push(entry.value);
    }
  }
  return options;
}

/**
 * Combine two eye colours into variegated format.
 * Returns "{first} flecked with {second}" if different, or just the colour if same.
 */
export function formatVariegatedEyes(first: string, second: string): string {
  if (first === second) {
    return first;
  }
  return `${first} flecked with ${second}`;
}

/**
 * Get the regional modifier for a Dwarf species variant.
 * Norse = -5, southern holds (Karak Hirn/Black Mountains, Karak Izor/The Vaults) = +5, others = 0.
 */
export function getDwarfRegionalModifier(variant: string): number {
  const lower = variant.toLowerCase();
  if (lower.includes('norse')) {
    return -5;
  }
  if (
    lower.includes('karak hirn') ||
    lower.includes('black mountains') ||
    lower.includes('karak izor') ||
    lower.includes('the vaults')
  ) {
    return +5;
  }
  return 0;
}

/**
 * Look up all three values from the Dwarf alternate d100 table.
 * Applies regional modifier to hair/eye lookup only.
 * @param roll - 1d100 result (1-100)
 * @param variant - Species variant string (for detecting Norse/southern holds)
 */
export function lookupDwarfAlternateTable(
  roll: number,
  variant: string
): { hair: string; eyes: string; feature: string } {
  const modifier = getDwarfRegionalModifier(variant);

  // Modified roll for hair/eye lookup, clamped to [1, 100]
  const modifiedRoll = Math.max(1, Math.min(100, roll + modifier));

  // Unmodified roll for feature lookup, clamped to [1, 100]
  const featureRoll = Math.max(1, Math.min(100, roll));

  const hairEyeRow = DWARF_ALTERNATE_TABLE.find(
    row => modifiedRoll >= row.min && modifiedRoll <= row.max
  )!;

  const featureRow = DWARF_ALTERNATE_TABLE.find(
    row => featureRoll >= row.min && featureRoll <= row.max
  )!;

  return {
    hair: hairEyeRow.hair,
    eyes: hairEyeRow.eyes,
    feature: featureRow.feature,
  };
}
