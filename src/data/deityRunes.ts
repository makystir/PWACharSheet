export type AncestorGod = 'Grungni' | 'Valaya' | 'Grimnir' | 'Gazul' | 'Smednir' | 'Thungni' | 'Morgrim';

export const ANCESTOR_GODS: AncestorGod[] = [
  'Grungni', 'Valaya', 'Grimnir', 'Gazul', 'Smednir', 'Thungni', 'Morgrim'
];

export interface DeityRuneEntry {
  god: AncestorGod;
  runeIds: string[];
  highPriestBonus?: string;
}

export const DEITY_REGISTRY: DeityRuneEntry[] = [
  {
    god: 'Grungni',
    runeIds: [
      'rune-of-alarm',
      'rune-of-courage',
      'rune-of-enemy-detection',
      'rune-of-forging',
      'rune-of-fortitude',
      'rune-of-furnace',
      'rune-of-preservation',
      'rune-of-purification',
      'rune-of-verminkill',
      'rune-of-valiant',
      'rune-of-warding',
    ],
  },
  {
    god: 'Valaya',
    runeIds: [],
  },
  {
    god: 'Grimnir',
    runeIds: [],
  },
  {
    god: 'Gazul',
    runeIds: [],
  },
  {
    god: 'Smednir',
    runeIds: [
      'rune-of-cleaving',
      'rune-of-cutting',
      'rune-of-fire',
      'rune-of-forging',
      'rune-of-furnace',
      'rune-of-iron',
      'rune-of-truth',
      'rune-of-warding',
    ],
    highPriestBonus: 'master-rune-of-industry',
  },
  {
    god: 'Thungni',
    runeIds: [
      'rune-of-alarm',
      'rune-of-clear-sight',
      'rune-of-enemy-detection',
      'rune-of-luck',
      'rune-of-sanctuary',
      'rune-of-restoration',
      'rune-of-truth',
    ],
  },
  {
    god: 'Morgrim',
    runeIds: [
      'rune-of-accuracy',
      'rune-of-alarm',
      'rune-of-burning',
      'rune-of-clear-seeing',
      'rune-of-disguise',
      'rune-of-enemy-detection',
      'rune-of-farseeing',
      'rune-of-forging',
      'rune-of-furnace',
      'rune-of-immolation',
      'rune-of-penetrating',
      'rune-of-reloading',
      'rune-of-seeking',
    ],
    highPriestBonus: 'master-rune-of-defence',
  },
];
