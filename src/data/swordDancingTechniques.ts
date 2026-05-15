import type { SwordDancingTechnique } from '../types/character';

export const SWORD_DANCING_TECHNIQUES: SwordDancingTechnique[] = [
  {
    id: 'ritual-of-cleansing',
    name: 'Ritual of Cleansing',
    sl: 1,
    order: 1,
    description:
      'Adjusts Yenlui state through a meditative sequence of thirty intricate forms. May shift Yenlui towards Light at sunrise or towards Dark at sunset.',
  },
  {
    id: 'flight-of-the-phoenix',
    name: 'Flight of the Phoenix',
    sl: 1,
    order: 2,
    description:
      'A devastating thrown sword attack with the Penetrating quality dealing weapon Damage at SB + WPB yards range. Each +1 SL increases range and Damage by 1. Cannot be used while Engaged.',
  },
  {
    id: 'path-of-the-sun',
    name: 'Path of the Sun',
    sl: 1,
    order: 3,
    description:
      'Grants +1 War Leader talent for WPB Rounds. Each +1 SL allows taking War Leader again or adds an extra Round to the duration.',
  },
  {
    id: 'path-of-frost',
    name: 'Path of Frost',
    sl: 1,
    order: 4,
    description:
      'Successful strikes ignore 1 AP for WSB Rounds. Critical Wound table rolls are increased by +10 for the duration for each +1 SL on the Sword-dancing Test.',
  },
  {
    id: 'path-of-the-storm',
    name: 'Path of the Storm',
    sl: 1,
    order: 5,
    description:
      'Allows opposing all missile attacks with Melee (Two-handed) for IB Rounds. Duration increased by 1 Round for each +1 SL on the Sword-dancing Test.',
  },
  {
    id: 'path-of-the-rain',
    name: 'Path of the Rain',
    sl: 2,
    order: 6,
    description:
      'Grants +1 SL to Dodge Tests for AgB Rounds. Each +1 SL on the Sword-dancing Test gives an additional +1 SL to Dodge Tests and adds an extra Round to the duration.',
  },
  {
    id: 'shadows-of-loec',
    name: 'Shadows of Loec',
    sl: 2,
    order: 7,
    description:
      'Character moves SL × Movement yards appearing blurred and insubstantial (minimum 5 yards). Enemies previously Engaged must pass a Challenging (+0) Initiative Test or gain the Surprised Condition.',
  },
  {
    id: 'path-of-the-hawk',
    name: 'Path of the Hawk',
    sl: 3,
    order: 8,
    description:
      'Inflicts 10 + SL Damage (ignoring Armour, but not TB) within WPB yards on a failed Difficult (−10) Endurance Test, plus 2 Deafened Conditions. Each +1 SL may increase range and number of targets by 1.',
  },
  {
    id: 'path-of-falling-water',
    name: 'Path of Falling Water',
    sl: 3,
    order: 9,
    description:
      'Allows a single attack against all Engaged enemies within weapon reach. If any targets have the Swarm Trait, three attacks may be made against them.',
  },
  {
    id: 'final-stroke-of-the-master',
    name: 'Final Stroke of the Master',
    sl: 4,
    order: 10,
    description:
      'Opponent must pass a Very Hard (−30) Dodge Test or suffer +4 Damage. Each +1 SL on the Sword-dancing Test adds an extra +1 Damage.',
  },
];
