import type { WeaponData } from '../types/character';

export const WEAPONS: WeaponData[] = [
  // MELEE — BASIC
  {name:"Hand Weapon",group:"Basic",enc:"1",rangeReach:"Average",damage:"+SB+4",qualities:"—"},
  {name:"Dagger",group:"Basic",enc:"0",rangeReach:"Very Short",damage:"+SB+2",qualities:"—"},
  {name:"Knife",group:"Basic",enc:"0",rangeReach:"Very Short",damage:"+SB+1",qualities:"Undamaging"},
  {name:"Shield (Buckler)",group:"Basic",enc:"0",rangeReach:"Personal",damage:"+SB+1",qualities:"Shield 1, Defensive, Undamaging"},
  {name:"Shield",group:"Basic",enc:"1",rangeReach:"Very Short",damage:"+SB+2",qualities:"Shield 2, Defensive, Undamaging"},
  {name:"Shield (Large)",group:"Basic",enc:"3",rangeReach:"Very Short",damage:"+SB+3",qualities:"Shield 3, Defensive, Undamaging"},
  {name:"Dwarf Axe",group:"Basic",enc:"1",rangeReach:"Average",damage:"+SB+4",qualities:"Hack"},
  {name:"Dwarf Warhammer",group:"Basic",enc:"1",rangeReach:"Average",damage:"+SB+4",qualities:"Pummel"},
  {name:"Elven Sword",group:"Basic",enc:"1",rangeReach:"Average",damage:"+SB+4",qualities:"Fast"},
  {name:"Elven Dagger",group:"Basic",enc:"0",rangeReach:"Very Short",damage:"+SB+2",qualities:"Fast"},
  {name:"Elven Shield",group:"Basic",enc:"1",rangeReach:"Very Short",damage:"+SB+2",qualities:"Shield 2, Defensive, Undamaging"},
  {name:"Axe",group:"Basic",enc:"1",rangeReach:"Average",damage:"+SB+4",qualities:"Hack, Unbalanced"},
  {name:"Ballock Knife",group:"Basic",enc:"0",rangeReach:"Very Short",damage:"+SB+1",qualities:"Impale, Penetrating, Precise"},
  {name:"Club",group:"Basic",enc:"1",rangeReach:"Average",damage:"+SB+4",qualities:"Undamaging, Unbalanced"},
  {name:"Improvised Weapon",group:"Basic",enc:"1",rangeReach:"Short",damage:"+SB+1",qualities:"Undamaging, Unbalanced"},
  {name:"Mace",group:"Basic",enc:"1",rangeReach:"Average",damage:"+SB+4",qualities:"Pummel, Unbalanced"},
  {name:"Military Pick",group:"Basic",enc:"1",rangeReach:"Average",damage:"+SB+4",qualities:"Penetrating, Unbalanced"},
  {name:"Scimitar",group:"Basic",enc:"1",rangeReach:"Short",damage:"+SB+4",qualities:"Slash (1A)"},
  {name:"Sword",group:"Basic",enc:"1",rangeReach:"Average",damage:"+SB+4",qualities:"—"},
  {name:"Warhammer",group:"Basic",enc:"1",rangeReach:"Average",damage:"+SB+4",qualities:"Unbalanced, Pummel or Penetrating"},
  // MELEE — SHIELD (Up in Arms)
  {name:"Pavise",group:"Basic",enc:"4",rangeReach:"Very Short",damage:"+SB+2",qualities:"Shield 5"},
  // MELEE — CAVALRY
  {name:"(2H) Cavalry Hammer",group:"Cavalry",enc:"3",rangeReach:"Long",damage:"+SB+5",qualities:"Pummel"},
  {name:"Lance",group:"Cavalry",enc:"3",rangeReach:"Very Long",damage:"+SB+6",qualities:"Impact, Impale"},
  {name:"Elven Lance",group:"Cavalry",enc:"3",rangeReach:"Very Long",damage:"+SB+6",qualities:"Impact, Impale"},
  {name:"Demi-Lance",group:"Cavalry",enc:"2",rangeReach:"Long",damage:"+SB+5",qualities:"Impact, Impale"},
  {name:"Sabre",group:"Cavalry",enc:"1",rangeReach:"Average",damage:"+SB+4",qualities:"Slash (1A)"},
  // MELEE — FENCING
  {name:"Foil",group:"Fencing",enc:"1",rangeReach:"Medium",damage:"+SB+3",qualities:"Fast, Impale, Precise, Undamaging"},
  {name:"Rapier",group:"Fencing",enc:"1",rangeReach:"Long",damage:"+SB+4",qualities:"Fast, Impale"},
  {name:"Smallsword",group:"Fencing",enc:"1",rangeReach:"Short",damage:"+SB+2",qualities:"Fast, Impale, Precise"},
  // MELEE — BRAWLING
  {name:"Knuckledusters",group:"Brawling",enc:"0",rangeReach:"Personal",damage:"+SB+2",qualities:"—"},
  {name:"Spiked Gauntlet",group:"Brawling",enc:"1",rangeReach:"Personal",damage:"+SB+3",qualities:"Impale, Unbalanced"},
  {name:"Boat Hook",group:"Brawling",enc:"0",rangeReach:"Short",damage:"+SB+4",qualities:"Trip, Undamaging"},
  {name:"(2H) Garrote",group:"Brawling",enc:"0",rangeReach:"Personal",damage:"+SB+2",qualities:"Entangle, Slow, Unbalanced, Undamaging"},
  {name:"Locked Gauntlet",group:"Brawling",enc:"1",rangeReach:"Personal",damage:"+SB+2",qualities:"Undamaging"},
  {name:"Unarmed",group:"Brawling",enc:"0",rangeReach:"Personal",damage:"+SB+0",qualities:"Undamaging"},
  {name:"Sap",group:"Brawling",enc:"0",rangeReach:"Personal",damage:"+SB+1",qualities:"Pummel, Unbalanced, Undamaging"},
  // MELEE — FLAIL
  {name:"Flail",group:"Flail",enc:"1",rangeReach:"Average",damage:"+SB+5",qualities:"Distract, Wrap"},
  {name:"(2H) Military Flail",group:"Flail",enc:"2",rangeReach:"Long",damage:"+SB+6",qualities:"Distract, Impact, Tiring, Wrap"},
  {name:"Whirling Blades of Death",group:"Flail",enc:"3",rangeReach:"Long",damage:"+SB+5",qualities:"Distract, Hack, Impact, Tiring, Wrap"},
  {name:"Grain Flail",group:"Flail",enc:"1",rangeReach:"Average",damage:"+SB+3",qualities:"Distract, Imprecise, Wrap"},
  // MELEE — PARRY
  {name:"Main Gauche",group:"Parry",enc:"0",rangeReach:"Very Short",damage:"+SB+2",qualities:"Defensive"},
  {name:"Swordbreaker",group:"Parry",enc:"1",rangeReach:"Short",damage:"+SB+3",qualities:"Defensive, Trap-blade"},
  {name:"Cloak",group:"Parry",enc:"1",rangeReach:"Short",damage:"+SB+0",qualities:"Entangle, Defensive, Undamaging"},
  {name:"(2H) Weighted Net",group:"Parry",enc:"1",rangeReach:"Short",damage:"+SB+0",qualities:"Entangle, Defensive, Shield 1, Slow, Undamaging, Wrap"},
  // MELEE — POLEARM
  {name:"(2H) Halberd",group:"Polearm",enc:"3",rangeReach:"Long",damage:"+SB+4",qualities:"Defensive, Hack, Impale"},
  {name:"(2H) Spear",group:"Polearm",enc:"2",rangeReach:"Very Long",damage:"+SB+4",qualities:"Impale"},
  {name:"(2H) Quarter Staff",group:"Polearm",enc:"2",rangeReach:"Long",damage:"+SB+4",qualities:"Defensive, Pummel"},
  {name:"Elven Halberd",group:"Polearm",enc:"3",rangeReach:"Long",damage:"+SB+4",qualities:"Defensive, Hack, Impale"},
  {name:"Elven Spear",group:"Polearm",enc:"2",rangeReach:"Very Long",damage:"+SB+4",qualities:"Impale, Fast"},
  {name:"(2H) Ahlspiess",group:"Polearm",enc:"2",rangeReach:"Very Long",damage:"+SB+3",qualities:"Impale, Penetrating"},
  {name:"(2H) Bill",group:"Polearm",enc:"3",rangeReach:"Long",damage:"+SB+4",qualities:"Defensive, Hack or Trip"},
  {name:"(2H) Mancatcher",group:"Polearm",enc:"3",rangeReach:"Long",damage:"+SB+2",qualities:"Defensive, Entangle"},
  {name:"(2H) Partizan/Glaive",group:"Polearm",enc:"3",rangeReach:"Long",damage:"+SB+4",qualities:"Defensive, Impale or Slash (2A)"},
  {name:"(2H) Pollaxe",group:"Polearm",enc:"3",rangeReach:"Long",damage:"+SB+4",qualities:"Defensive, Hack or Impale or Pummel"},
  {name:"(2H) Pike",group:"Polearm",enc:"4",rangeReach:"Massive",damage:"+SB+4",qualities:"Impale"},
  // MELEE — TWO-HANDED
  {name:"(2H) Bastard Sword",group:"Two-Handed",enc:"3",rangeReach:"Long",damage:"+SB+5",qualities:"Damaging, Defensive"},
  {name:"(2H) Great Axe",group:"Two-Handed",enc:"3",rangeReach:"Long",damage:"+SB+6",qualities:"Hack, Impact, Tiring"},
  {name:"(2H) Warhammer",group:"Two-Handed",enc:"3",rangeReach:"Average",damage:"+SB+6",qualities:"Damaging, Pummel, Slow"},
  {name:"(2H) Dwarf Greataxe",group:"Two-Handed",enc:"3",rangeReach:"Long",damage:"+SB+6",qualities:"Hack, Impact, Tiring"},
  {name:"(2H) Dwarf Greathammer",group:"Two-Handed",enc:"3",rangeReach:"Long",damage:"+SB+7",qualities:"Damaging, Pummel"},
  {name:"(2H) Dwarf Pick",group:"Two-Handed",enc:"2",rangeReach:"Average",damage:"+SB+6",qualities:"Damaging, Impale"},
  {name:"(2H) Elven Great Axe",group:"Two-Handed",enc:"3",rangeReach:"Long",damage:"+SB+6",qualities:"Hack, Impact"},
  {name:"(2H) Greatsword of Hoeth",group:"Two-Handed",enc:"3",rangeReach:"Long",damage:"+SB+5",qualities:"Damaging, Defensive, Fast"},
  {name:"(2H) Flamberge Zweihander",group:"Two-Handed",enc:"3",rangeReach:"Long",damage:"+SB+5",qualities:"Damaging, Hack, Slash (2A)"},
  {name:"(2H) Pick",group:"Two-Handed",enc:"3",rangeReach:"Average",damage:"+SB+5",qualities:"Damaging, Impale, Slow"},
  {name:"(2H) Zweihander",group:"Two-Handed",enc:"3",rangeReach:"Long",damage:"+SB+5",qualities:"Damaging, Hack"},
  // MELEE — ENGINEERING
  {name:"(2H) Steam Drill",group:"Engineering",enc:"3",rangeReach:"Short",damage:"+SB+6",qualities:"Impact, Impale"},
  {name:"Cog Axe",group:"Engineering",enc:"2",rangeReach:"Average",damage:"+SB+4",qualities:"Hack, Penetrating, Trap Blade"},
  {name:"Steam Gauntlet",group:"Engineering",enc:"2",rangeReach:"Very Short",damage:"+SB+7",qualities:"Pummel, Shield 1"},
  // MELEE — EONIR (Archives of the Empire)
  {name:"Eonir War Blade",group:"Basic",enc:"0",rangeReach:"Average",damage:"+SB+3",qualities:"Precise"},
  {name:"(2H) Eonir Spear",group:"Polearm",enc:"1",rangeReach:"Long",damage:"+SB+4",qualities:"Penetrating"},
  {name:"Wildwood Sword",group:"Two-Handed",enc:"2",rangeReach:"Long",damage:"+SB+5",qualities:"Hack"},
  // MELEE — DWARF (Archives of the Empire)
  {name:"Bearded Axe",group:"Basic",enc:"2",rangeReach:"Average",damage:"+SB+4",qualities:"Trap Blade"},
  {name:"Dwarf Hammer",group:"Basic",enc:"2",rangeReach:"Average",damage:"+SB+4",qualities:"Pummel"},
  {name:"(2H) Slayer's Axe",group:"Two-Handed",enc:"3",rangeReach:"Long",damage:"+SB+6",qualities:"Hack, Impact"},
  // MELEE — HALFLING (Archives of the Empire)
  {name:"Iron Skillet",group:"Basic",enc:"1",rangeReach:"Average",damage:"+SB+3",qualities:"Defensive"},
  {name:"Nan's Cleaver",group:"Basic",enc:"1",rangeReach:"Average",damage:"+SB+3",qualities:"Hack"},
  // MELEE — OGRE (Archives of the Empire Vol. II)
  {name:"Ogre Club",group:"Basic",enc:"2",rangeReach:"Average",damage:"+SB+4",qualities:"— (non-Ogres treat as Improvised)"},
  {name:"Ironfist",group:"Basic",enc:"2",rangeReach:"Short",damage:"+SB+3",qualities:"Shield 1, Defensive"},
  {name:"(2H) Great Ogre Club",group:"Two-Handed",enc:"4",rangeReach:"Long",damage:"+SB+6",qualities:"Impact, Tiring"},
  // RANGED — SLING
  {name:"Sling",group:"Sling",enc:"0",damage:"+6",maxR:"60",optR:"20",rangeMod:"4",qualities:"—"},
  // RANGED — BOW
  {name:"Short Bow",group:"Bow",enc:"1",damage:"+SB+2",maxR:"60",optR:"20",rangeMod:"4",qualities:"Impale"},
  {name:"Bow",group:"Bow",enc:"2",damage:"+SB+3",maxR:"150",optR:"50",rangeMod:"10",qualities:"Impale"},
  {name:"(2H) Longbow",group:"Bow",enc:"3",damage:"+SB+4",maxR:"300",optR:"100",rangeMod:"20",qualities:"Damaging, Impale"},
  {name:"(2H) Elfbow",group:"Bow",enc:"2",damage:"+SB+4",maxR:"450",optR:"150",rangeMod:"30",qualities:"Damaging, Precise, Impale"},
  // RANGED — CROSSBOW
  {name:"Crossbow Pistol",group:"Crossbow",enc:"0",damage:"+7",maxR:"30",optR:"10",rangeMod:"2",qualities:"Pistol, Impale"},
  {name:"Crossbow",group:"Crossbow",enc:"2",damage:"+9",maxR:"180",optR:"60",rangeMod:"12",reload:"1",qualities:"Impale"},
  {name:"Heavy Crossbow",group:"Crossbow",enc:"3",damage:"+9",maxR:"300",optR:"100",rangeMod:"20",reload:"2",qualities:"Damaging, Impale"},
  // RANGED — BLACKPOWDER
  {name:"Blunderbuss",group:"Blackpowder",enc:"1",damage:"+8",maxR:"60",optR:"20",rangeMod:"4",reload:"2",qualities:"Blast 3, Dangerous, BP, Impale"},
  {name:"Long Rifle",group:"Blackpowder",enc:"3",damage:"+9",maxR:"300",optR:"100",rangeMod:"20",reload:"4",qualities:"Accurate, Precise, BP, Impale, Penetrating"},
  {name:"Handgun",group:"Blackpowder",enc:"2",damage:"+9",maxR:"150",optR:"50",rangeMod:"10",reload:"3",qualities:"Dangerous, BP, Impale, Penetrating"},
  {name:"Pistol",group:"Blackpowder",enc:"0",damage:"+8",maxR:"60",optR:"20",rangeMod:"4",reload:"1",qualities:"Pistol, BP, Impale, Penetrating"},
  // RANGED — BLACKPOWDER (Up in Arms)
  {name:"(2H) Matchlock Handgun",group:"Blackpowder",enc:"2",damage:"+8",maxR:"150",optR:"50",rangeMod:"10",reload:"4",qualities:"Dangerous, BP, Impale, Penetrating"},
  {name:"(2H) Matchlock Blunderbuss",group:"Blackpowder",enc:"1",damage:"+7",maxR:"60",optR:"20",rangeMod:"4",reload:"3",qualities:"Spread 3, Dangerous, BP, Impale"},
  {name:"(2H) Arquebus",group:"Blackpowder",enc:"3",damage:"+9",maxR:"120",optR:"40",rangeMod:"8",reload:"5",qualities:"Dangerous, Imprecise, BP"},
  {name:"(2H) Double-barrelled Handgun",group:"Blackpowder",enc:"3",damage:"+9",maxR:"150",optR:"50",rangeMod:"10",reload:"4",qualities:"Dangerous, Repeater 2, BP, Impale, Penetrating"},
  {name:"Griffonsfoot Pistol",group:"Blackpowder",enc:"1",damage:"+7",maxR:"30",optR:"10",rangeMod:"2",reload:"6",qualities:"Imprecise, Spread 5, Pistol, BP"},
  {name:"(2H) Gun Axe",group:"Blackpowder",enc:"1",damage:"+9",maxR:"90",optR:"30",rangeMod:"6",reload:"4",qualities:"Imprecise, Dangerous, BP"},
  {name:"(2H) Gun Halberd",group:"Blackpowder",enc:"3",damage:"+9",maxR:"90",optR:"30",rangeMod:"6",reload:"4",qualities:"Imprecise, Dangerous, BP"},
  // RANGED — ENGINEERING (Up in Arms)
  {name:"(2H) Repeater Handgun",group:"Engineering",enc:"3",damage:"+9",maxR:"90",optR:"30",rangeMod:"6",reload:"5",qualities:"Dangerous, Repeater 4"},
  {name:"Repeater Pistol",group:"Engineering",enc:"1",damage:"+8",maxR:"30",optR:"10",rangeMod:"2",reload:"4",qualities:"Dangerous, Pistol, Repeater 4"},
  {name:"Pepperbox",group:"Engineering",enc:"1",damage:"+8",maxR:"30",optR:"10",rangeMod:"2",reload:"4",qualities:"Dangerous, Pistol, Repeater 4"},
  {name:"(2H) Hand Mortar",group:"Engineering",enc:"3",damage:"+7",maxR:"90",optR:"30",rangeMod:"6",reload:"2",qualities:"Dangerous, Imprecise"},
  {name:"Cane Pistol",group:"Engineering",enc:"1",damage:"+8",maxR:"30",optR:"10",rangeMod:"2",reload:"6",qualities:"Dangerous, Imprecise"},
  // RANGED — THROWING
  {name:"Dart",group:"Throwing",enc:"0",damage:"+SB+1",maxR:"STR",optR:"1/3 max",rangeMod:"var",qualities:"Impale"},
  {name:"Javelin",group:"Throwing",enc:"1",damage:"+SB+3",maxR:"STRx2",optR:"1/3 max",rangeMod:"var",qualities:"Impale"},
  {name:"Rock",group:"Throwing",enc:"0",damage:"+SB",maxR:"STRx2",optR:"1/3 max",rangeMod:"var",qualities:"Pummel"},
  {name:"Throwing Axe",group:"Throwing",enc:"1",damage:"+SB+3",maxR:"STR",optR:"1/3 max",rangeMod:"var",qualities:"Hack"},
  {name:"Throwing Knife",group:"Throwing",enc:"0",damage:"+SB+2",maxR:"STR",optR:"1/3 max",rangeMod:"var",qualities:"—"},
  // RANGED — EONIR THROWING (Archives of the Empire)
  {name:"Blackbriar Javelin",group:"Throwing",enc:"1",damage:"+SB+3",maxR:"SBx3",optR:"1/3 max",rangeMod:"var",qualities:"Impale, Poisoned"},
  // RANGED — ENTANGLING
  {name:"Net",group:"Entangling",enc:"1",damage:"—",maxR:"4",optR:"—",rangeMod:"—",qualities:"Entangle"},
  {name:"Whip",group:"Entangling",enc:"0",damage:"+SB+2",maxR:"6",optR:"—",rangeMod:"—",qualities:"Entangle"},
  // RANGED — OGRE (Archives of the Empire Vol. II)
  {name:"Great Throwing Spear",group:"Throwing",enc:"2",damage:"+SB+4",maxR:"SBx3",optR:"1/3 max",rangeMod:"var",qualities:"Impale"},
  {name:"Leadbelcher Gun",group:"Blackpowder",enc:"8",damage:"+10",maxR:"50",optR:"16",rangeMod:"10",reload:"5",qualities:"Dangerous, Reload 5"},
  {name:"Ogre Pistol",group:"Blackpowder",enc:"3",damage:"+8",maxR:"20",optR:"6",rangeMod:"4",reload:"3",qualities:"Dangerous, Pistol, Reload 3"},
  {name:"Harpoon Launcher",group:"Engineering",enc:"4",damage:"+SB+5",maxR:"30",optR:"10",rangeMod:"6",reload:"2",qualities:"Impale, Reload 2"},
  {name:"Chain Trap",group:"Entangling",enc:"2",damage:"—",maxR:"SBx2",optR:"—",rangeMod:"—",qualities:"Entangle"},
  // RANGED — SLING (2H)
  {name:"(2H) Staff Sling",group:"Sling",enc:"2",damage:"+7",maxR:"100",optR:"33",rangeMod:"7",qualities:"—"},
  // RANGED — DWARF BLACKPOWDER
  {name:"(2H) Dwarf Handgun",group:"Blackpowder",enc:"2",damage:"+10",maxR:"50",optR:"16",rangeMod:"10",qualities:"Damaging, Impale, Penetrating, Reload 3, BP"},
  {name:"Dwarf Pistol",group:"Blackpowder",enc:"0",damage:"+10",maxR:"20",optR:"6",rangeMod:"4",qualities:"Damaging, Impale, Penetrating, Pistol, Reload 1, BP"},
  {name:"(2H) Repeating Dwarf Handgun",group:"Engineering",enc:"3",damage:"+10",maxR:"50",optR:"16",rangeMod:"10",qualities:"Damaging, Dangerous, Impale, Penetrating, Reload 4, Repeater 3"},
  {name:"(2H) Grudge-raker",group:"Engineering",enc:"2",damage:"+10",maxR:"30",optR:"10",rangeMod:"6",qualities:"Damaging, Dangerous, Impale, Penetrating, Reload 3, Salvo 2, Spread 3"},
  // RANGED — DWARF CROSSBOW
  {name:"(2H) Dwarf Crossbow",group:"Crossbow",enc:"2",damage:"+10",maxR:"80",optR:"26",rangeMod:"16",qualities:"Impale, Precise, Damaging, Reload 1"},
  // RANGED — DWARF THROWING
  {name:"Dwarf Throwing Axe",group:"Throwing",enc:"1",damage:"+SB+4",maxR:"SBx2",qualities:"Hack"},
  // RANGED — DWARF ENGINEERING (ranged)
  {name:"(2H) Drakegun",group:"Engineering",enc:"3",damage:"+12",maxR:"30",optR:"10",rangeMod:"6",qualities:"Blast 6, Damaging, Dangerous, Penetrating, Reload 4, BP"},
  {name:"Drakefire Pistol",group:"Engineering",enc:"1",damage:"+11",maxR:"20",optR:"6",rangeMod:"4",qualities:"Blast 3, Damaging, Dangerous, Penetrating, Pistol, Reload 4, BP"},
  {name:"Trollhammer Torpedo",group:"Engineering",enc:"3",damage:"+14",maxR:"40",optR:"13",rangeMod:"8",qualities:"Dangerous, Impact, Reload 6"},
  // RANGED — EXPLOSIVES
  {name:"Blasting Charge",group:"Explosives",enc:"0",damage:"+12",maxR:"SB",qualities:"Blast 2, Dangerous, Impact, Penetrating"},
  {name:"Cinderblast Bomb",group:"Explosives",enc:"0",damage:"+10",maxR:"SBx2",qualities:"Blast 5, Dangerous, Impact, Penetrating"},
  // AMMUNITION — TRADITIONAL (Up in Arms)
  {name:"Arrow",group:"Ammunition",enc:"0",damage:"-",qualities:"Impale"},
  {name:"Barbed Arrow",group:"Ammunition",enc:"0",damage:"-",qualities:"Impale, Slash (1A)"},
  {name:"Bodkin Arrow",group:"Ammunition",enc:"0",damage:"-",qualities:"Impale, Penetrating"},
  {name:"Elf Arrow",group:"Ammunition",enc:"0",damage:"+1",qualities:"Accurate, Impale, Penetrating"},
  // AMMUNITION — EONIR (Archives of the Empire)
  {name:"Starfire Shafts (12)",group:"Ammunition",enc:"0",damage:"-",qualities:"Accurate, Impale"},
  {name:"Swiftshiver Shafts (12)",group:"Ammunition",enc:"0",damage:"+1",qualities:"Blast 1, Penetrating"},
  // AMMUNITION — DWARF (Archives of the Empire)
  {name:"Drakefire Shot (12)",group:"Ammunition",enc:"0",damage:"+2",qualities:"Damaging"},
  // AMMUNITION — OGRE (Archives of the Empire Vol. II)
  {name:"Leadbelcher Shot (12)",group:"Ammunition",enc:"0",damage:"—",maxR:"Half Weapon",qualities:"Blast 3"},
  {name:"Leadbelcher Ball (1)",group:"Ammunition",enc:"0",damage:"+4",qualities:"Penetrating, Impale, Impact"},
  {name:"Sharp Stick",group:"Ammunition",enc:"0",damage:"-2",qualities:"Dangerous, Imprecise, Undamaging"},
  {name:"Bolt",group:"Ammunition",enc:"0",damage:"-",qualities:"Impale"},
  {name:"Lead Bullet",group:"Ammunition",enc:"0",damage:"+1",qualities:"Pummel"},
  {name:"Pebble",group:"Ammunition",enc:"0",damage:"-2",qualities:"Imprecise, Undamaging"},
  {name:"Stone Bullet",group:"Ammunition",enc:"0",damage:"-",qualities:"Pummel"},
  // AMMUNITION — BLACKPOWDER (Up in Arms)
  {name:"Bullet and Powder",group:"Ammunition",enc:"0",damage:"+1",qualities:"Impale, Penetrating"},
  {name:"Paper Cartridge",group:"Ammunition",enc:"0",damage:"+1",qualities:"Impale, Penetrating"},
  {name:"Aqshy-Infused Powder",group:"Ammunition",enc:"0",damage:"+2",qualities:"Impale, Penetrating"},
  {name:"Precision Shot",group:"Ammunition",enc:"0",damage:"+1",qualities:"Impale, Penetrating, Precise"},
  {name:"Improvised Shot",group:"Ammunition",enc:"0",damage:"-",qualities:"—"},
  {name:"Small Shot",group:"Ammunition",enc:"0",damage:"-",qualities:"Spread +3"},
  {name:"Scrap and Powder",group:"Ammunition",enc:"0",damage:"-1",qualities:"Spread +3, Infected"},
  {name:"Large Bullet",group:"Ammunition",enc:"0",damage:"+2",qualities:"Impale, Impact, Penetrating"},
  {name:"Bomb",group:"Ammunition",enc:"0",damage:"+5",qualities:"Blast 5, Dangerous, Impact"},
  {name:"Incendiary",group:"Ammunition",enc:"0",damage:"Special",qualities:"Blast 4, Dangerous"},
  {name:"Grapple",group:"Ammunition",enc:"1",damage:"+2",qualities:"Penetrating, Reload +2"},
];
