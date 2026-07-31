export type ArmourQuality = 'Impenetrable' | 'Overcoat' | 'Reinforced' | 'Visor';
export type ArmourFlaw = 'Partial' | 'Requires Kit' | 'Weakpoints';
export type ArmourType = 'SoftKit' | 'BoiledLeather' | 'Chainmail' | 'Brigandine' | 'Plate';

export interface QualityDefinition {
  name: ArmourQuality | ArmourFlaw;
  type: 'quality' | 'flaw';
  description: string;
  combatEffect?: string;
}

export const QUALITY_DEFINITIONS: QualityDefinition[] = [
  {
    name: 'Impenetrable',
    type: 'quality',
    description:
      'Armour negates Critical Wounds when the to-hit roll is odd.',
    combatEffect: 'Critical Wound ignored if to-hit roll is odd.',
  },
  {
    name: 'Overcoat',
    type: 'quality',
    description:
      'Can be layered over Boiled Leather or Chainmail.',
  },
  {
    name: 'Reinforced',
    type: 'quality',
    description:
      'When worn under Plate, suppresses the Weakpoints flaw.',
    combatEffect: 'Suppresses Weakpoints on Plate armour worn over this piece.',
  },
  {
    name: 'Visor',
    type: 'quality',
    description:
      'Helmet can be opened or closed. Open: applies Partial flaw, -10 Perception, loses special ability. Closed: full protection.',
    combatEffect:
      'Open: Partial flaw applies, -10 Perception. Closed: full protection.',
  },
  {
    name: 'Partial',
    type: 'flaw',
    description:
      'Armour is bypassed when to-hit roll is even or a Critical Hit is scored.',
    combatEffect: 'AP ignored if to-hit roll is even or Critical Hit scored.',
  },
  {
    name: 'Requires Kit',
    type: 'flaw',
    description:
      'A Soft Kit must be worn underneath for comfort and attachment.',
  },
  {
    name: 'Weakpoints',
    type: 'flaw',
    description:
      'If hit by Impale weapon on a Critical Hit, all APs from this piece are ignored.',
    combatEffect:
      'All APs ignored if hit by Impale weapon on a Critical Hit.',
  },
];
