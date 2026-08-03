export type SpeciesGroup = 'Human' | 'Dwarf' | 'Halfling' | 'High_Elf' | 'Wood_Elf' | 'Ogre';

export interface ColourTableEntry {
  min: number;  // minimum 2d10 sum for this row
  max: number;  // maximum 2d10 sum for this row
  value: string;
}

export type ColourTable = Record<SpeciesGroup, ColourTableEntry[]>;

export const EYE_COLOUR_TABLE: ColourTable = {
  Human: [
    { min: 2, max: 2, value: 'Free Choice' },
    { min: 3, max: 3, value: 'Green' },
    { min: 4, max: 4, value: 'Pale Blue' },
    { min: 5, max: 7, value: 'Blue' },
    { min: 8, max: 11, value: 'Pale Grey' },
    { min: 12, max: 14, value: 'Grey' },
    { min: 15, max: 17, value: 'Brown' },
    { min: 18, max: 18, value: 'Hazel' },
    { min: 19, max: 19, value: 'Dark Brown' },
    { min: 20, max: 20, value: 'Black' },
  ],
  Dwarf: [
    { min: 2, max: 2, value: 'Coal' },
    { min: 3, max: 3, value: 'Lead' },
    { min: 4, max: 4, value: 'Steel' },
    { min: 5, max: 7, value: 'Blue' },
    { min: 8, max: 11, value: 'Earth Brown' },
    { min: 12, max: 14, value: 'Dark Brown' },
    { min: 15, max: 17, value: 'Hazel' },
    { min: 18, max: 18, value: 'Green' },
    { min: 19, max: 19, value: 'Copper' },
    { min: 20, max: 20, value: 'Gold' },
  ],
  Halfling: [
    { min: 2, max: 2, value: 'Light Grey' },
    { min: 3, max: 3, value: 'Grey' },
    { min: 4, max: 4, value: 'Pale Blue' },
    { min: 5, max: 7, value: 'Blue' },
    { min: 8, max: 11, value: 'Green' },
    { min: 12, max: 14, value: 'Hazel' },
    { min: 15, max: 17, value: 'Brown' },
    { min: 18, max: 18, value: 'Copper' },
    { min: 19, max: 19, value: 'Dark Brown' },
    { min: 20, max: 20, value: 'Dark Brown' },
  ],
  High_Elf: [
    { min: 2, max: 2, value: 'Jet' },
    { min: 3, max: 3, value: 'Amethyst' },
    { min: 4, max: 4, value: 'Aquamarine' },
    { min: 5, max: 7, value: 'Sapphire' },
    { min: 8, max: 11, value: 'Turquoise' },
    { min: 12, max: 14, value: 'Emerald' },
    { min: 15, max: 17, value: 'Amber' },
    { min: 18, max: 18, value: 'Copper' },
    { min: 19, max: 19, value: 'Citrine' },
    { min: 20, max: 20, value: 'Gold' },
  ],
  Wood_Elf: [
    { min: 2, max: 2, value: 'Ivory' },
    { min: 3, max: 3, value: 'Charcoal' },
    { min: 4, max: 4, value: 'Ivy Green' },
    { min: 5, max: 7, value: 'Mossy Green' },
    { min: 8, max: 11, value: 'Chestnut' },
    { min: 12, max: 14, value: 'Chestnut' },
    { min: 15, max: 17, value: 'Dark Brown' },
    { min: 18, max: 18, value: 'Tan' },
    { min: 19, max: 19, value: 'Sandy Brown' },
    { min: 20, max: 20, value: 'Violet' },
  ],
  Ogre: [
    { min: 2, max: 2, value: 'Grey' },
    { min: 3, max: 3, value: 'Green' },
    { min: 4, max: 4, value: 'Amber' },
    { min: 5, max: 7, value: 'Hazel' },
    { min: 8, max: 11, value: 'Brown' },
    { min: 12, max: 14, value: 'Dark Brown' },
    { min: 15, max: 17, value: 'Sienna' },
    { min: 18, max: 18, value: 'Black' },
    { min: 19, max: 19, value: 'Purple Black' },
    { min: 20, max: 20, value: 'Blue Black' },
  ],
};

export const HAIR_COLOUR_TABLE: ColourTable = {
  Human: [
    { min: 2, max: 2, value: 'White Blond' },
    { min: 3, max: 3, value: 'Golden Blond' },
    { min: 4, max: 4, value: 'Red Blond' },
    { min: 5, max: 7, value: 'Golden Brown' },
    { min: 8, max: 11, value: 'Light Brown' },
    { min: 12, max: 14, value: 'Dark Brown' },
    { min: 15, max: 17, value: 'Black' },
    { min: 18, max: 18, value: 'Auburn' },
    { min: 19, max: 19, value: 'Red' },
    { min: 20, max: 20, value: 'Grey' },
  ],
  Dwarf: [
    { min: 2, max: 2, value: 'White' },
    { min: 3, max: 3, value: 'Grey' },
    { min: 4, max: 4, value: 'Pale Blond' },
    { min: 5, max: 7, value: 'Golden' },
    { min: 8, max: 11, value: 'Copper' },
    { min: 12, max: 14, value: 'Bronze' },
    { min: 15, max: 17, value: 'Brown' },
    { min: 18, max: 18, value: 'Dark Brown' },
    { min: 19, max: 19, value: 'Reddish Brown' },
    { min: 20, max: 20, value: 'Black' },
  ],
  Halfling: [
    { min: 2, max: 2, value: 'Grey' },
    { min: 3, max: 3, value: 'Flaxen' },
    { min: 4, max: 4, value: 'Russet' },
    { min: 5, max: 7, value: 'Honey' },
    { min: 8, max: 11, value: 'Chestnut' },
    { min: 12, max: 14, value: 'Ginger' },
    { min: 15, max: 17, value: 'Mustard' },
    { min: 18, max: 18, value: 'Almond' },
    { min: 19, max: 19, value: 'Chocolate' },
    { min: 20, max: 20, value: 'Liquorice' },
  ],
  High_Elf: [
    { min: 2, max: 2, value: 'Silver' },
    { min: 3, max: 3, value: 'White' },
    { min: 4, max: 4, value: 'Pale Blond' },
    { min: 5, max: 7, value: 'Blond' },
    { min: 8, max: 11, value: 'Yellow Blond' },
    { min: 12, max: 14, value: 'Copper Blond' },
    { min: 15, max: 17, value: 'Red Blond' },
    { min: 18, max: 18, value: 'Auburn' },
    { min: 19, max: 19, value: 'Red' },
    { min: 20, max: 20, value: 'Black' },
  ],
  Wood_Elf: [
    { min: 2, max: 2, value: 'Birch Silver' },
    { min: 3, max: 3, value: 'Ash Blond' },
    { min: 4, max: 4, value: 'Rose Gold' },
    { min: 5, max: 7, value: 'Honey Blond' },
    { min: 8, max: 11, value: 'Brown' },
    { min: 12, max: 14, value: 'Mahogany Brown' },
    { min: 15, max: 17, value: 'Dark Brown' },
    { min: 18, max: 18, value: 'Sienna' },
    { min: 19, max: 19, value: 'Ebony' },
    { min: 20, max: 20, value: 'Blue-Black' },
  ],
  Ogre: [
    { min: 2, max: 2, value: 'Brown' },
    { min: 3, max: 3, value: 'Red Brown' },
    { min: 4, max: 4, value: 'Terracotta' },
    { min: 5, max: 7, value: 'Sienna' },
    { min: 8, max: 11, value: 'Burgundy' },
    { min: 12, max: 14, value: 'Dark Brown' },
    { min: 15, max: 17, value: 'Black' },
    { min: 18, max: 18, value: 'Charcoal' },
    { min: 19, max: 19, value: 'Jet Black' },
    { min: 20, max: 20, value: 'Blue Black' },
  ],
};

export interface DwarfAlternateRow {
  min: number;
  max: number;
  hair: string;
  eyes: string;
  feature: string;
}

export const DWARF_ALTERNATE_TABLE: DwarfAlternateRow[] = [
  { min: 1, max: 5, hair: 'Pale Blond', eyes: 'Green', feature: 'Large Nose' },
  { min: 6, max: 10, hair: 'Pale Blond', eyes: 'Blue', feature: 'Flat Nose' },
  { min: 11, max: 15, hair: 'Golden', eyes: 'Blue', feature: 'Hook Nose' },
  { min: 16, max: 20, hair: 'Golden', eyes: 'Blue', feature: 'Scar on Face' },
  { min: 21, max: 25, hair: 'Golden', eyes: 'Blue', feature: 'One Eye' },
  { min: 26, max: 30, hair: 'Strawberry Blond', eyes: 'Lead', feature: 'Attractive Face' },
  { min: 31, max: 35, hair: 'Copper', eyes: 'Steel', feature: 'Attractive Eyes' },
  { min: 36, max: 40, hair: 'Copper', eyes: 'Gold', feature: 'Sneer' },
  { min: 41, max: 45, hair: 'Copper', eyes: 'Hazel', feature: 'Haughty Expression' },
  { min: 46, max: 50, hair: 'Bronze', eyes: 'Hazel', feature: 'Broken Teeth' },
  { min: 51, max: 55, hair: 'Bronze', eyes: 'Hazel', feature: 'Charming Smile' },
  { min: 56, max: 60, hair: 'Bronze', eyes: 'Copper', feature: 'Stooping' },
  { min: 61, max: 65, hair: 'Auburn', eyes: 'Earth Brown', feature: 'Barrel-Chested' },
  { min: 66, max: 70, hair: 'Light Brown', eyes: 'Earth Brown', feature: 'Limp' },
  { min: 71, max: 75, hair: 'Chestnut Brown', eyes: 'Earth Brown', feature: 'Scarred Skin' },
  { min: 76, max: 80, hair: 'Reddish Brown', eyes: 'Dark Brown', feature: 'Stutter' },
  { min: 81, max: 85, hair: 'Dark Brown', eyes: 'Dark Brown', feature: 'Loud Voice' },
  { min: 86, max: 90, hair: 'Dark Brown', eyes: 'Dark Brown', feature: 'Very Clear Voice' },
  { min: 91, max: 95, hair: 'Black', eyes: 'Dark Brown', feature: 'Big Ears' },
  { min: 96, max: 100, hair: 'Black', eyes: 'Coal', feature: 'Big Belly' },
];

export const DWARF_DISTINGUISHING_FEATURES: string[] = [
  'Large Nose',
  'Flat Nose',
  'Hook Nose',
  'Scar on Face',
  'One Eye',
  'Attractive Face',
  'Attractive Eyes',
  'Sneer',
  'Haughty Expression',
  'Broken Teeth',
  'Charming Smile',
  'Stooping',
  'Barrel-Chested',
  'Limp',
  'Scarred Skin',
  'Stutter',
  'Loud Voice',
  'Very Clear Voice',
  'Big Ears',
  'Big Belly',
];

export interface HighElfAgeTier {
  label: string;
  base: number;
  diceCount: number;
}

export const HIGH_ELF_AGE_TIERS: HighElfAgeTier[] = [
  { label: 'Time of Ending', base: 30, diceCount: 10 },
  { label: 'Time of Steel', base: 120, diceCount: 9 },
  { label: 'Time of Incursion', base: 200, diceCount: 15 },
  { label: 'Time of Voyages', base: 320, diceCount: 30 },
  { label: 'Time of the Sage', base: 580, diceCount: 30 },
];

export interface AgeFormula {
  base: number;
  diceCount: number;
}

export const AGE_FORMULAS: Record<SpeciesGroup, AgeFormula> = {
  Human: { base: 15, diceCount: 1 },
  Dwarf: { base: 15, diceCount: 10 },
  Halfling: { base: 15, diceCount: 5 },
  High_Elf: { base: 30, diceCount: 10 },
  Wood_Elf: { base: 30, diceCount: 10 },
  Ogre: { base: 15, diceCount: 5 },
};

export interface HeightFormula {
  baseFeet: number;
  baseInches: number;
  diceCount: number;
}

export const HEIGHT_FORMULAS: Record<SpeciesGroup, HeightFormula> = {
  Human: { baseFeet: 4, baseInches: 9, diceCount: 2 },
  Dwarf: { baseFeet: 4, baseInches: 3, diceCount: 1 },
  Halfling: { baseFeet: 3, baseInches: 1, diceCount: 1 },
  High_Elf: { baseFeet: 5, baseInches: 11, diceCount: 1 },
  Wood_Elf: { baseFeet: 5, baseInches: 11, diceCount: 1 },
  Ogre: { baseFeet: 7, baseInches: 7, diceCount: 1 },
};
