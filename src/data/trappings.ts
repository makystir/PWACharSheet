import type { TrappingData } from '../types/character';

export const TRAPPING_LIST: TrappingData[] = [
  {name:"Backpack",enc:"2"},{name:"Sack",enc:"2"},{name:"Sling Bag",enc:"1"},
  {name:"Pouch",enc:"0"},{name:"Waterskin",enc:"1"},{name:"Flask",enc:"0"},
  {name:"Boots",enc:"1"},{name:"Cloak",enc:"1"},{name:"Clothing",enc:"1"},
  {name:"Coat",enc:"1"},{name:"Hat",enc:"0"},{name:"Hood or Mask",enc:"0"},
  {name:"Rations (1 day)",enc:"0"},{name:"Animal Trap",enc:"1"},
  {name:"Antitoxin Kit",enc:"0"},{name:"Crowbar",enc:"1"},
  {name:"Lock Picks",enc:"0"},{name:"Trade Tools",enc:"1"},
  {name:"Bandage",enc:"0"},{name:"Bedroll",enc:"1"},{name:"Blanket",enc:"0"},
  {name:"Candle (dozen)",enc:"0"},{name:"Cooking Pot",enc:"1"},
  {name:"Grappling Hook",enc:"1"},{name:"Lantern",enc:"1"},
  {name:"Storm Lantern",enc:"1"},{name:"Rope (10 yards)",enc:"1"},
  {name:"Tent",enc:"2"},{name:"Tinderbox",enc:"0"},{name:"Writing Kit",enc:"0"},
  {name:"Telescope",enc:"0"},{name:"Arrow (12)",enc:"0"},
  {name:"Bolt (12)",enc:"0"},{name:"Stone Bullet (12)",enc:"0"},
  {name:"Bullet and Powder (12)",enc:"0"},{name:"Elf Arrow",enc:"0"},
  {name:"Ale Keg",enc:"3"},{name:"Battle Standard",enc:"2"},
  {name:"Davrich Lamp",enc:"1"},{name:"Metal Foil Sheets",enc:"0"},
  {name:"Miner's Helm",enc:"1"},{name:"Pilot's Licence",enc:"0"},
  {name:"Reckoner's Log",enc:"1"},{name:"Runescribing Kit",enc:"2"},
  {name:"Stone Tablet",enc:"1"},{name:"Toasting Tankard",enc:"0"},
  // UP IN ARMS - A Soldier's Burden
  {name:"Theodolite",enc:"3"},{name:"Ostrich Feather",enc:"0"},
  {name:"Compass",enc:"0"},{name:"Bandoleer",enc:"1"},
  {name:"Slow Match",enc:"1"},{name:"Fuse",enc:"1"},
  {name:"Bow String",enc:"0"},{name:"Whetstone",enc:"0"},
  {name:"Sealskin",enc:"1"},{name:"Silk Underwear",enc:"0"},
  {name:"Captain Braun's Multi-Stove",enc:"3"},{name:"Captain Braun's Insta-Boiler",enc:"2"},
  // WINDS OF MAGIC - Magical Equipment
  {name:"Practical Robes",enc:"1"},{name:"Standard Robes",enc:"2"},{name:"Elaborate Robes",enc:"4"},
  {name:"Enchanted Staff",enc:"2"},
  {name:"Power Stone (True Sapphires, Hysh)",enc:"0"},
  {name:"Power Stone (Endstones, Shyish)",enc:"0"},
  {name:"Power Stone (Ghost Amber, Ghur)",enc:"0"},
  {name:"Power Stone (Lumen Stones, Azyr)",enc:"0"},
  {name:"Power Stone (Fire Rubies, Aqshy)",enc:"0"},
  {name:"Power Stone (Goldstone, Chamon)",enc:"0"},
  {name:"Power Stone (Crystal Mist, Ulgu)",enc:"0"},
  {name:"Power Stone (Vitaellum, Ghyran)",enc:"0"},
  {name:"Scroll",enc:"0"},
  // DEFT STEPS — Tools of the Trade (price/effect recorded in comments; TrappingData has no price/effect field)
  {name:"Bag of Tarrabeth Seed",enc:"0"}, // 6d Scarce (book cell reads "TOOLS 6d" — likely a conversion artefact; see verification.md FLAGGED GAP). Leave in a dog's path; dogs within 5 yds make Average (+20) Cool or spend 1d10 rounds investigating
  {name:"Bag of Soot",enc:"0"}, // 2d Common; stain skin/clothing/gear - creatures suffer -1 SL to sight-based Perception Tests to spot or identify the Character in the dark
  {name:"Caltrops (12)",enc:"0"}, // 2/- Rare; Action to scatter a dozen over a 2-yd area; entering requires Hard (-20) Athletics (Average (+20) if aware and walking) or take a Damage 1d10 leg hit and Stunned
  {name:"Crampons (2)",enc:"1"}, // 1 GC Exotic; +2 SL Climb (rock/wood), +1 SL Climb (rope), -1 SL Athletics / -2 SL Stealth / -2 SL other movement Tests outside climbing
  {name:"Glass Cutter",enc:"0"}, // 1 GC Exotic; bore a hole or cut a panel from glass with an Average (+20) Art (Engraving) Test (see SL table)
  {name:"Periscope",enc:"1"}, // 2 GC Exotic; make sight-based Perception Tests while keeping the body hidden or in cover
  {name:"Smoke Bomb",enc:"0"}, // 1 GC Exotic; thrown as an incendiary; fills a 10-yd area with smoke for 2d10 Rounds (doubled if enclosed); blocks sight and risks Suffocation
  {name:"Steel Mummit",enc:"0"}, // 2 GC Exotic; open a lock-and-key (not padlock) or bolted door with a Hard (-20) Sleight of Hand Test (see SL table)
  {name:"Telescopic Stick",enc:"1"}, // 3 GC Exotic (summary table lists "Telescopic Pole"); extends to 12 ft; Dexterity Tests to manipulate objects up to 4 yds away at -2 SL
];
