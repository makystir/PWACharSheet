import type { WeaponData } from '../types/character';

export const WEAPONS: WeaponData[] = [
  // MELEE — BASIC
  {name:"Hand Weapon",group:"Basic",enc:"1",rangeReach:"Average",damage:"+SB+4",qualities:"—"},
  {name:"Dagger",group:"Basic",enc:"0",rangeReach:"Very Short",damage:"+SB+2",qualities:"—"},
  {name:"Knife",group:"Basic",enc:"0",rangeReach:"Very Short",damage:"+SB+1",qualities:"Undamaging"},
  {name:"Shield (Buckler)",group:"Basic",enc:"0",rangeReach:"Personal",damage:"+SB+1",qualities:"Shield 1, Defensive, Undamaging"},
  {name:"Shield",group:"Basic",enc:"1",rangeReach:"Very Short",damage:"+SB+2",qualities:"Shield 2, Defensive, Undamaging"},
  {name:"Shield (Large)",group:"Basic",enc:"3",rangeReach:"Very Short",damage:"+SB+3",qualities:"Shield 3, Defensive, Undamaging"},
  // MELEE — CAVALRY
  {name:"(2H) Cavalry Hammer",group:"Cavalry",enc:"3",rangeReach:"Long",damage:"+SB+5",qualities:"Pummel"},
  {name:"Lance",group:"Cavalry",enc:"3",rangeReach:"Very Long",damage:"+SB+6",qualities:"Impact, Impale"},
  // MELEE — FENCING
  {name:"Foil",group:"Fencing",enc:"1",rangeReach:"Medium",damage:"+SB+3",qualities:"Fast, Impale, Precise, Undamaging"},
  {name:"Rapier",group:"Fencing",enc:"1",rangeReach:"Long",damage:"+SB+4",qualities:"Fast, Impale"},
  // MELEE — BRAWLING
  {name:"Knuckledusters",group:"Brawling",enc:"0",rangeReach:"Personal",damage:"+SB+2",qualities:"—"},
  // MELEE — FLAIL
  {name:"Flail",group:"Flail",enc:"1",rangeReach:"Average",damage:"+SB+5",qualities:"Distract, Wrap"},
  {name:"(2H) Military Flail",group:"Flail",enc:"2",rangeReach:"Long",damage:"+SB+6",qualities:"Distract, Impact, Tiring, Wrap"},
  // MELEE — PARRY
  {name:"Main Gauche",group:"Parry",enc:"0",rangeReach:"Very Short",damage:"+SB+2",qualities:"Defensive"},
  {name:"Swordbreaker",group:"Parry",enc:"1",rangeReach:"Short",damage:"+SB+3",qualities:"Defensive, Trap-blade"},
  // MELEE — POLEARM
  {name:"(2H) Halberd",group:"Polearm",enc:"3",rangeReach:"Long",damage:"+SB+4",qualities:"Defensive, Hack, Impale"},
  {name:"(2H) Spear",group:"Polearm",enc:"2",rangeReach:"Very Long",damage:"+SB+4",qualities:"Impale"},
  {name:"(2H) Quarter Staff",group:"Polearm",enc:"2",rangeReach:"Long",damage:"+SB+4",qualities:"Defensive, Pummel"},
  // MELEE — TWO-HANDED
  {name:"(2H) Bastard Sword",group:"Two-Handed",enc:"3",rangeReach:"Long",damage:"+SB+5",qualities:"Damaging, Defensive"},
  {name:"(2H) Great Axe",group:"Two-Handed",enc:"3",rangeReach:"Long",damage:"+SB+6",qualities:"Hack, Impact, Tiring"},
  {name:"(2H) Warhammer",group:"Two-Handed",enc:"3",rangeReach:"Average",damage:"+SB+6",qualities:"Damaging, Pummel, Slow"},
  // RANGED — SLING
  {name:"Sling",group:"Sling",enc:"0",damage:"1/2SB+2",maxR:"60",optR:"20",rangeMod:"4",qualities:"—"},
  // RANGED — BOW
  {name:"Short Bow",group:"Bow",enc:"1",damage:"1/2SB+2",maxR:"60",optR:"20",rangeMod:"4",qualities:"Impale"},
  {name:"Bow",group:"Bow",enc:"1",damage:"1/2SB+3",maxR:"150",optR:"50",rangeMod:"10",qualities:"Impale"},
  {name:"(2H) Longbow",group:"Bow",enc:"2",damage:"1/2SB+4",maxR:"300",optR:"100",rangeMod:"20",qualities:"Damaging, Impale"},
  {name:"(2H) Elfbow",group:"Bow",enc:"1",damage:"1/2SB+4",maxR:"450",optR:"150",rangeMod:"30",qualities:"Damaging, Precise, Impale"},
  // RANGED — CROSSBOW
  {name:"Crossbow Pistol",group:"Crossbow",enc:"0",damage:"+7",maxR:"30",optR:"10",rangeMod:"2",qualities:"Pistol, Impale"},
  {name:"Crossbow",group:"Crossbow",enc:"2",damage:"+9",maxR:"180",optR:"60",rangeMod:"12",reload:"1",qualities:"Impale"},
  {name:"Heavy Crossbow",group:"Crossbow",enc:"3",damage:"+9",maxR:"300",optR:"100",rangeMod:"20",reload:"2",qualities:"Damaging, Impale"},
  // RANGED — BLACKPOWDER
  {name:"Blunderbuss",group:"Blackpowder",enc:"1",damage:"+8",maxR:"60",optR:"20",rangeMod:"4",reload:"2",qualities:"Blast 3, Dangerous, BP, Impale"},
  {name:"Long Rifle",group:"Blackpowder",enc:"3",damage:"+9",maxR:"300",optR:"100",rangeMod:"20",reload:"4",qualities:"Accurate, Precise, BP, Impale, Penetrating"},
  {name:"Handgun",group:"Blackpowder",enc:"2",damage:"+9",maxR:"150",optR:"50",rangeMod:"10",reload:"3",qualities:"Dangerous, BP, Impale, Penetrating"},
  {name:"Pistol",group:"Blackpowder",enc:"0",damage:"+8",maxR:"60",optR:"20",rangeMod:"4",reload:"1",qualities:"Pistol, BP, Impale, Penetrating"},
  // RANGED — THROWING
  {name:"Dart",group:"Throwing",enc:"0",damage:"1/2SB+1",maxR:"STR",optR:"1/3 max",rangeMod:"var",qualities:"Impale"},
  {name:"Javelin",group:"Throwing",enc:"1",damage:"1/2SB+3",maxR:"STRx2",optR:"1/3 max",rangeMod:"var",qualities:"Impale"},
  {name:"Rock",group:"Throwing",enc:"0",damage:"1/2SB",maxR:"STRx2",optR:"1/3 max",rangeMod:"var",qualities:"Pummel"},
  {name:"Throwing Axe",group:"Throwing",enc:"1",damage:"1/2SB+3",maxR:"STR",optR:"1/3 max",rangeMod:"var",qualities:"Hack"},
  {name:"Throwing Knife",group:"Throwing",enc:"0",damage:"1/2SB+2",maxR:"STR",optR:"1/3 max",rangeMod:"var",qualities:"—"},
  // RANGED — ENTANGLING
  {name:"Net",group:"Entangling",enc:"1",damage:"—",maxR:"4",optR:"—",rangeMod:"—",qualities:"Entangle"},
  {name:"Whip",group:"Entangling",enc:"0",damage:"+SB+2",maxR:"6",optR:"—",rangeMod:"—",qualities:"Entangle"},
  // RANGED — SLING (2H)
  {name:"(2H) Staff Sling",group:"Sling",enc:"2",damage:"1/2SB+3",maxR:"100",optR:"33",rangeMod:"7",qualities:"—"},
];
