import type { CharacteristicKey } from '../types/character';

export interface StarSignEntry {
  name: string;
  type: 'characteristics' | 'talent';
  bonuses?: { char: CharacteristicKey; value: number }[];
  penalty: { char: CharacteristicKey; value: number };
  talent?: string;
}

export const STAR_SIGNS: StarSignEntry[] = [
  {
    name: 'Wymund the Anchorite',
    type: 'characteristics',
    bonuses: [
      { char: 'WP', value: 2 },
      { char: 'T', value: 2 },
    ],
    penalty: { char: 'Fel', value: -3 },
  },
  {
    name: 'The Big Cross',
    type: 'characteristics',
    bonuses: [
      { char: 'S', value: 2 },
      { char: 'T', value: 2 },
    ],
    penalty: { char: 'Ag', value: -3 },
  },
  {
    name: "The Limner's Line",
    type: 'characteristics',
    bonuses: [
      { char: 'Dex', value: 2 },
      { char: 'I', value: 2 },
    ],
    penalty: { char: 'S', value: -3 },
  },
  {
    name: 'Gnuthus the Ox',
    type: 'characteristics',
    bonuses: [
      { char: 'S', value: 2 },
      { char: 'WP', value: 2 },
    ],
    penalty: { char: 'I', value: -3 },
  },
  {
    name: 'Dragomas the Drake',
    type: 'characteristics',
    bonuses: [
      { char: 'WS', value: 2 },
      { char: 'S', value: 2 },
    ],
    penalty: { char: 'Int', value: -3 },
  },
  {
    name: 'The Gloaming',
    type: 'characteristics',
    bonuses: [
      { char: 'I', value: 2 },
      { char: 'Int', value: 2 },
    ],
    penalty: { char: 'S', value: -3 },
  },
  {
    name: "Grungni's Baldric",
    type: 'characteristics',
    bonuses: [
      { char: 'T', value: 2 },
      { char: 'WP', value: 2 },
    ],
    penalty: { char: 'Ag', value: -3 },
  },
  {
    name: 'Mammit the Wise',
    type: 'characteristics',
    bonuses: [
      { char: 'Int', value: 2 },
      { char: 'WP', value: 2 },
    ],
    penalty: { char: 'BS', value: -3 },
  },
  {
    name: 'Mummit the Fool',
    type: 'characteristics',
    bonuses: [
      { char: 'Fel', value: 2 },
      { char: 'Ag', value: 2 },
    ],
    penalty: { char: 'WP', value: -3 },
  },
  {
    name: 'The Two Bullocks',
    type: 'characteristics',
    bonuses: [
      { char: 'S', value: 2 },
      { char: 'T', value: 2 },
    ],
    penalty: { char: 'Int', value: -3 },
  },
  {
    name: 'The Dancer',
    type: 'characteristics',
    bonuses: [
      { char: 'Ag', value: 2 },
      { char: 'Dex', value: 2 },
    ],
    penalty: { char: 'T', value: -3 },
  },
  {
    name: 'The Drummer',
    type: 'characteristics',
    bonuses: [
      { char: 'Fel', value: 2 },
      { char: 'WP', value: 2 },
    ],
    penalty: { char: 'Dex', value: -3 },
  },
  {
    name: 'The Piper',
    type: 'talent',
    talent: 'Perfect Pitch',
    penalty: { char: 'S', value: -3 },
  },
  {
    name: "The Vobist's Ring",
    type: 'characteristics',
    bonuses: [
      { char: 'BS', value: 2 },
      { char: 'I', value: 2 },
    ],
    penalty: { char: 'Fel', value: -3 },
  },
  {
    name: 'The Broken Cart',
    type: 'characteristics',
    bonuses: [
      { char: 'T', value: 2 },
      { char: 'Dex', value: 2 },
    ],
    penalty: { char: 'Fel', value: -3 },
  },
  {
    name: 'The Greased Goat',
    type: 'characteristics',
    bonuses: [
      { char: 'Ag', value: 2 },
      { char: 'Fel', value: 2 },
    ],
    penalty: { char: 'WS', value: -3 },
  },
  {
    name: "Rhya's Cauldron",
    type: 'talent',
    talent: 'Rover',
    penalty: { char: 'Int', value: -3 },
  },
  {
    name: 'Cackelfax the Cockerel',
    type: 'characteristics',
    bonuses: [
      { char: 'BS', value: 2 },
      { char: 'Fel', value: 2 },
    ],
    penalty: { char: 'T', value: -3 },
  },
  {
    name: 'The Bonesaw',
    type: 'talent',
    talent: 'Surgery',
    penalty: { char: 'Fel', value: -3 },
  },
  {
    name: 'The Witchling Star',
    type: 'talent',
    talent: 'Second Sight',
    penalty: { char: 'T', value: -3 },
  },
];
