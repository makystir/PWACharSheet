import type { ArmourData } from '../types/character';

export const ARMOURS: ArmourData[] = [
  // Soft Kit
  {name:"Soft Kit",locations:"Arms, Body, Legs",enc:"0",ap:0,qualities:"—",armourType:"SoftKit"},
  {name:"Reinforced Soft Kit",locations:"Arms, Body, Legs",enc:"1",ap:1,qualities:"Partial, Reinforced",armourType:"SoftKit"},
  {name:"Padding",locations:"Head",enc:"0",ap:0,qualities:"—",armourType:"SoftKit"},
  {name:"Aventail",locations:"Head",enc:"0",ap:1,qualities:"Partial, Reinforced",armourType:"SoftKit"},

  // Boiled Leather
  {name:"Leather Jack",locations:"Arms, Body",enc:"1",ap:1,qualities:"—",armourType:"BoiledLeather"},
  {name:"Leather Jerkin",locations:"Body",enc:"1",ap:1,qualities:"—",armourType:"BoiledLeather"},
  {name:"Leather Leggings",locations:"Legs",enc:"1",ap:1,qualities:"—",armourType:"BoiledLeather"},
  {name:"Leather Skullcap",locations:"Head",enc:"0",ap:1,qualities:"—",armourType:"BoiledLeather"},

  // Chainmail
  {name:"Chainmail Chausses",locations:"Legs",enc:"3",ap:2,qualities:"—",armourType:"Chainmail"},
  {name:"Chainmail Coat",locations:"Arms, Body",enc:"3",ap:2,qualities:"—",armourType:"Chainmail"},
  {name:"Chainmail Coif",locations:"Head",enc:"2",ap:2,qualities:"—",armourType:"Chainmail"},
  {name:"Chainmail Shirt",locations:"Body",enc:"2",ap:2,qualities:"—",armourType:"Chainmail"},

  // Brigandine
  {name:"Brigandine Jack",locations:"Arms, Body",enc:"2",ap:2,qualities:"Overcoat",armourType:"Brigandine"},
  {name:"Brigandine Jerkin",locations:"Body",enc:"2",ap:2,qualities:"Overcoat",armourType:"Brigandine"},

  // Plate
  {name:"Bracers",locations:"Arms",enc:"3",ap:3,qualities:"Impenetrable, Requires Kit, Weakpoints",armourType:"Plate"},
  {name:"Breastplate",locations:"Body",enc:"3",ap:3,qualities:"Impenetrable, Overcoat, Weakpoints",armourType:"Plate"},
  {name:"Open Helm",locations:"Head",enc:"1",ap:3,qualities:"Partial",armourType:"Plate"},
  {name:"Plate Leggings",locations:"Legs",enc:"3",ap:3,qualities:"Impenetrable, Requires Kit, Weakpoints",armourType:"Plate"},
  {name:"Great Helm",locations:"Head",enc:"2",ap:3,qualities:"Impenetrable, Weakpoints",armourType:"Plate"},
  {name:"Bascinet",locations:"Head",enc:"2",ap:3,qualities:"Impenetrable, Visor, Weakpoints",armourType:"Plate"},
  {name:"Armet",locations:"Head",enc:"2",ap:3,qualities:"Impenetrable, Visor, Weakpoints",armourType:"Plate"},
  {name:"Sallet",locations:"Head",enc:"2",ap:3,qualities:"Impenetrable, Visor, Weakpoints",armourType:"Plate"},

  // Special / Other Books
  {name:"Gromril Breastplate",locations:"Body",enc:"2",ap:3,qualities:"Impenetrable",armourType:"Plate"},
  {name:"Gromril Open Helm",locations:"Head",enc:"1",ap:2,qualities:"Impenetrable, Partial",armourType:"Plate"},
  {name:"Gromril Bracers",locations:"Arms",enc:"1",ap:2,qualities:"Impenetrable, Partial",armourType:"Plate"},
  {name:"Gromril Plate Leggings",locations:"Legs",enc:"2",ap:3,qualities:"Impenetrable",armourType:"Plate"},
  {name:"Gromril Helm",locations:"Head",enc:"1",ap:3,qualities:"Impenetrable",armourType:"Plate"},
  {name:"Ithilmar Breastplate",locations:"Body",enc:"1",ap:2,qualities:"Impenetrable",armourType:"Plate"},
  {name:"Ithilmar Open Helm",locations:"Head",enc:"0",ap:2,qualities:"Impenetrable, Partial",armourType:"Plate"},
  {name:"Ithilmar Bracers",locations:"Arms",enc:"1",ap:2,qualities:"Impenetrable",armourType:"Plate"},
  {name:"Ithilmar Plate Leggings",locations:"Legs",enc:"1",ap:2,qualities:"Impenetrable",armourType:"Plate"},
  {name:"Ithilmar Helm",locations:"Head",enc:"1",ap:2,qualities:"Impenetrable",armourType:"Plate"},
  {name:"Mail Skirt",locations:"Legs",enc:"1",ap:1,qualities:"—",armourType:"Chainmail"},
  {name:"Miner's Helm",locations:"Head",enc:"1",ap:1,qualities:"—",armourType:"BoiledLeather"},
  {name:"Ogre Gutplate",locations:"Body",enc:"—",ap:3,qualities:"Impenetrable",armourType:"Plate"},
];
