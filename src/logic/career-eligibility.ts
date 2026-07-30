/**
 * Career eligibility rules by species.
 *
 * This module centralises the logic that determines which careers are available
 * to a given species. It is consumed by both the CharacterWizard (creation) and
 * the AdvancementPage (career switching at runtime).
 *
 * Sources:
 * - WFRP 4e Core Rulebook: Human careers, College Wizards (Human-only)
 * - Dwarf Players Guide: Dwarf-only careers (Brewer, Doom Priest, Forge Priest,
 *   Hearth Priest, Hammerer, Ironbreaker DPG, Karak Ranger DPG, Runescribe,
 *   Runesmith, Thane, Engineer Guild/Outcast/Sky Pilot, Lawyer Reckoner,
 *   Soldier variants Axefighter/Quarreller/Thunderer, Handgunner Thunderer)
 * - High Elf Player's Guide: High Elf-only careers (Sea Guard, Swordmaster,
 *   Shadow Warrior, Merchant Adventurer, Aestheticist, Mage, Smith-Priest of Vaul,
 *   Storm Weaver, Loremaster of Hoeth)
 * - Up In Arms: Empire military careers (generally Human-only but adaptable)
 */

import { CAREER_SCHEMES } from '../data/careers';
import { getCareersByClass } from './careers';

// ─── Species detection helpers ───────────────────────────────────────────────

export function isDwarfSpecies(species: string): boolean {
  return species.toLowerCase().includes('dwarf');
}

export function isHighElfSpecies(species: string): boolean {
  return species === 'High Elf' || species.startsWith('High Elves');
}

export function isWoodElfSpecies(species: string): boolean {
  return species === 'Wood Elf';
}

export function isElfSpecies(species: string): boolean {
  return species.toLowerCase().includes('elf');
}

export function isHalflingSpecies(species: string): boolean {
  return species.toLowerCase().includes('halfling');
}

export function isHumanSpecies(species: string): boolean {
  return species.toLowerCase().includes('human') || species.toLowerCase().includes('reiklander');
}

export function isOgreSpecies(species: string): boolean {
  return species === 'Ogre';
}

// ─── Career restriction lists ────────────────────────────────────────────────

/** Careers only available to Dwarf characters */
const DWARF_ONLY_CAREERS = [
  'Slayer',
  'Ironbreaker',
  'Ironbreaker (DPG)',
  'Karak Ranger',
  'Karak Ranger (DPG)',
  'Brewer',
  'Doom Priest',
  'Forge Priest',
  'Hearth Priest',
  'Hammerer',
  'Runescribe',
  'Runesmith',
  'Thane',
  'Engineer (Guild)',
  'Engineer (Outcast)',
  'Engineer (Sky Pilot)',
  'Lawyer (Reckoner)',
  'Soldier (Axefighter)',
  'Soldier (Quarreller)',
  'Soldier (Thunderer)',
  'Handgunner (Thunderer)',
];

/** Careers only available to High Elf characters */
const HIGH_ELF_ONLY_CAREERS = [
  'Sea Guard',
  'Swordmaster',
  'Shadow Warrior',
  'Merchant Adventurer',
  'Aestheticist',
  'Mage',
  'Smith-Priest of Vaul',
  'Storm Weaver',
  'Loremaster of Hoeth',
];

/** Careers only available to Halfling characters */
const HALFLING_ONLY_CAREERS = [
  'Badger Rider',
];

/** Careers only available to Ogre characters */
const OGRE_ONLY_CAREERS = [
  'Maneater',
  'Rhinox Herder',
  'Ogre Butcher',
];

/** Human-only Imperial College Wizard careers (require Human Petty Magic → College path) */
const COLLEGE_WIZARD_CAREERS = [
  'Hierophant',
  'Alchemist (Gold)',
  'Druid',
  'Astromancer',
  'Shadowmancer',
  'Spiriter',
  'Pyromancer',
  'Shaman (Amber)',
];

/** Human-only supporting magical careers */
const HUMAN_ONLY_SUPPORTING_CAREERS = [
  'Magister Vigilant',
  'Mundane Alchemist',
  'Scryer',
];

/** Warrior of Tzeentch — excluded from normal character creation entirely */
const ALWAYS_EXCLUDED = [
  'Warrior of Tzeentch',
];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns the list of career names that should be EXCLUDED for the given species.
 * This works for any species string (handles variant Dwarf/Elf kingdom sub-species).
 */
export function getExcludedCareers(species: string): string[] {
  const excluded = [...ALWAYS_EXCLUDED];

  const isDwarf = isDwarfSpecies(species);
  const isHighElf = isHighElfSpecies(species);
  const isWoodElf = isWoodElfSpecies(species);
  const isElf = isElfSpecies(species);
  const isHalfling = isHalflingSpecies(species);
  const isHuman = isHumanSpecies(species);
  const isOgre = isOgreSpecies(species);

  // Exclude Dwarf-only careers for non-Dwarfs
  if (!isDwarf) {
    excluded.push(...DWARF_ONLY_CAREERS);
  }

  // Exclude High Elf-only careers for non-High Elves
  if (!isHighElf) {
    excluded.push(...HIGH_ELF_ONLY_CAREERS);
  }

  // Exclude Halfling-only careers for non-Halflings
  if (!isHalfling) {
    excluded.push(...HALFLING_ONLY_CAREERS);
  }

  // Exclude Ogre-only careers for non-Ogres
  if (!isOgre) {
    excluded.push(...OGRE_ONLY_CAREERS);
  }

  // Exclude College Wizard + Human-only supporting careers for non-Humans
  // (High Elves have their own magic path via Mage career; Wood Elves don't use Colleges)
  if (!isHuman) {
    excluded.push(...COLLEGE_WIZARD_CAREERS);
    excluded.push(...HUMAN_ONLY_SUPPORTING_CAREERS);
  }

  // Dwarfs and Halflings cannot be spellcasters via any arcane path
  // (Dwarfs use Rune Magic instead; Halflings have no magical tradition)
  // This is already handled by College Wizard exclusion above.

  // Elves shouldn't have access to Empire-specific military paths like Beadle
  if (isElf && !isHuman) {
    excluded.push('Beadle');
  }

  return excluded;
}

/**
 * Returns career names available for a given species, optionally filtered by class.
 * If className is provided, only careers of that class are returned.
 * If className is empty/undefined, all eligible careers are returned.
 */
export function getEligibleCareers(species: string, className?: string): string[] {
  const excluded = new Set(getExcludedCareers(species));

  let careers: string[];
  if (className) {
    careers = getCareersByClass(className);
  } else {
    careers = Object.keys(CAREER_SCHEMES);
  }

  return careers.filter(c => !excluded.has(c));
}

/**
 * Check if a specific career is available to a given species.
 */
export function isCareerEligible(career: string, species: string): boolean {
  const excluded = getExcludedCareers(species);
  return !excluded.includes(career);
}
