/**
 * WFRP 4e d100 Random Talent Table
 *
 * Used during character creation for species that receive random talents
 * (Human / Reiklander: 3 random, Halfling: 2 random).
 */

export interface RandomTalentEntry {
  min: number;
  max: number;
  talent: string;
}

/**
 * 36 entries covering the full d100 range (1–100) with no gaps or overlaps.
 * Entries 1–96 each span 3 values; entries 97–100 each span 1 value.
 */
export const RANDOM_TALENT_TABLE: RandomTalentEntry[] = [
  { min: 1, max: 3, talent: 'Acute Sense (any)' },
  { min: 4, max: 6, talent: 'Ambidextrous' },
  { min: 7, max: 9, talent: 'Animal Affinity' },
  { min: 10, max: 12, talent: 'Artistic' },
  { min: 13, max: 15, talent: 'Attractive' },
  { min: 16, max: 18, talent: 'Coolheaded' },
  { min: 19, max: 21, talent: 'Crafty' },
  { min: 22, max: 24, talent: 'Fleet Footed' },
  { min: 25, max: 27, talent: 'Hardy' },
  { min: 28, max: 30, talent: 'Lightning Reflexes' },
  { min: 31, max: 33, talent: 'Linguistics' },
  { min: 34, max: 36, talent: 'Luck' },
  { min: 37, max: 39, talent: 'Marksman' },
  { min: 40, max: 42, talent: 'Mimic' },
  { min: 43, max: 45, talent: 'Night Vision' },
  { min: 46, max: 48, talent: 'Nimble Fingered' },
  { min: 49, max: 51, talent: 'Noble Blood' },
  { min: 52, max: 54, talent: 'Orientation' },
  { min: 55, max: 57, talent: 'Perfect Pitch' },
  { min: 58, max: 60, talent: 'Pure Soul' },
  { min: 61, max: 63, talent: 'Read/Write' },
  { min: 64, max: 66, talent: 'Resistance (any)' },
  { min: 67, max: 69, talent: 'Savvy' },
  { min: 70, max: 72, talent: 'Sharp' },
  { min: 73, max: 75, talent: 'Sixth Sense' },
  { min: 76, max: 78, talent: 'Strong Legs' },
  { min: 79, max: 81, talent: 'Sturdy' },
  { min: 82, max: 84, talent: 'Suave' },
  { min: 85, max: 87, talent: 'Super Numerate' },
  { min: 88, max: 90, talent: 'Very Resilient' },
  { min: 91, max: 93, talent: 'Very Strong' },
  { min: 94, max: 96, talent: 'Warrior Born' },
  { min: 97, max: 97, talent: 'Witch!' },
  { min: 98, max: 98, talent: 'Strong-minded' },
  { min: 99, max: 99, talent: 'Fearless' },
  { min: 100, max: 100, talent: 'Second Sight' },
];

/**
 * Maps a d100 roll result (1–100) to a talent name from the Random Talent table.
 * @throws Error if roll is outside the valid range 1–100.
 */
export function rollRandomTalent(roll: number): string {
  if (roll < 1 || roll > 100) {
    throw new Error(`Invalid d100 roll: ${roll}. Must be between 1 and 100.`);
  }

  const entry = RANDOM_TALENT_TABLE.find(e => roll >= e.min && roll <= e.max);
  if (!entry) {
    throw new Error(`No talent entry found for roll ${roll}. Table may have gaps.`);
  }

  return entry.talent;
}
