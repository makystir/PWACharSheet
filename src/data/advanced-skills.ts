/**
 * WFRP 4e Advanced Skills Database
 * Each entry has a skill name and its linked characteristic.
 */
export interface AdvancedSkillData {
  n: string;
  c: string;
}

export const ADV_SKILL_DB: AdvancedSkillData[] = [
  // Animal skills
  { n: 'Animal Care', c: 'Int' },
  { n: 'Animal Training (Demigryph)', c: 'Int' }, { n: 'Animal Training (Dog)', c: 'Int' },
  { n: 'Animal Training (Horse)', c: 'Int' }, { n: 'Animal Training (Pegasus)', c: 'Int' },
  { n: 'Animal Training (Pigeon)', c: 'Int' },
  // Channelling
  { n: 'Channelling (Aqshy)', c: 'WP' }, { n: 'Channelling (Azyr)', c: 'WP' },
  { n: 'Channelling (Chamon)', c: 'WP' }, { n: 'Channelling (Dhar)', c: 'WP' },
  { n: 'Channelling (Ghur)', c: 'WP' }, { n: 'Channelling (Ghyran)', c: 'WP' },
  { n: 'Channelling (Hysh)', c: 'WP' }, { n: 'Channelling (Shyish)', c: 'WP' },
  { n: 'Channelling (Ulgu)', c: 'WP' },
  // General
  { n: 'Evaluate', c: 'Int' },
  { n: 'Heal', c: 'Int' },
  // Language
  { n: 'Language (Battle Tongue)', c: 'Int' }, { n: 'Language (Bretonnian)', c: 'Int' },
  { n: 'Language (Classical)', c: 'Int' }, { n: 'Language (Guilder)', c: 'Int' },
  { n: 'Language (Khazalid)', c: 'Int' }, { n: 'Language (Magick)', c: 'Int' },
  { n: 'Language (Thief)', c: 'Int' }, { n: 'Language (Tilean)', c: 'Int' },
  // Lore
  { n: 'Lore (Engineering)', c: 'Int' }, { n: 'Lore (Geology)', c: 'Int' },
  { n: 'Lore (Heraldry)', c: 'Int' }, { n: 'Lore (History)', c: 'Int' },
  { n: 'Lore (Law)', c: 'Int' }, { n: 'Lore (Magick)', c: 'Int' },
  { n: 'Lore (Metallurgy)', c: 'Int' }, { n: 'Lore (Science)', c: 'Int' },
  { n: 'Lore (Theology)', c: 'Int' },
  // Perform
  { n: 'Perform (Acrobatics)', c: 'Ag' }, { n: 'Perform (Clowning)', c: 'Ag' },
  { n: 'Perform (Dancing)', c: 'Ag' }, { n: 'Perform (Firebreathing)', c: 'Ag' },
  { n: 'Perform (Juggling)', c: 'Ag' }, { n: 'Perform (Miming)', c: 'Ag' },
  { n: 'Perform (Rope Walking)', c: 'Ag' },
  // Other
  { n: 'Pick Lock', c: 'Dex' },
  { n: 'Play (Any)', c: 'Dex' },
  { n: 'Pray', c: 'Fel' },
  // Ranged
  { n: 'Ranged (Blackpowder)', c: 'BS' }, { n: 'Ranged (Bow)', c: 'BS' },
  { n: 'Ranged (Crossbow)', c: 'BS' }, { n: 'Ranged (Engineering)', c: 'BS' },
  { n: 'Ranged (Entangling)', c: 'BS' }, { n: 'Ranged (Explosives)', c: 'BS' },
  { n: 'Ranged (Sling)', c: 'BS' }, { n: 'Ranged (Throwing)', c: 'BS' },
  // Research, Sail
  { n: 'Research', c: 'Int' },
  { n: 'Sail (Barge)', c: 'Ag' }, { n: 'Sail (Caravel)', c: 'Ag' },
  { n: 'Sail (Cog)', c: 'Ag' }, { n: 'Sail (Frigate)', c: 'Ag' },
  { n: 'Sail (Wolfship)', c: 'Ag' },
  // Secret Signs
  { n: 'Secret Signs (Grey Order)', c: 'Int' }, { n: 'Secret Signs (Guild)', c: 'Int' },
  { n: 'Secret Signs (Ranger)', c: 'Int' }, { n: 'Secret Signs (Scout)', c: 'Int' },
  { n: 'Secret Signs (Thief)', c: 'Int' }, { n: 'Secret Signs (Vagabond)', c: 'Int' },
  // Other
  { n: 'Set Trap', c: 'Dex' },
  { n: 'Sleight of Hand', c: 'Dex' },
  { n: 'Swim', c: 'S' },
  { n: 'Track', c: 'I' },
  // Trade
  { n: 'Trade (Apothecary)', c: 'Dex' }, { n: 'Trade (Calligrapher)', c: 'Dex' },
  { n: 'Trade (Chandler)', c: 'Dex' }, { n: 'Trade (Carpenter)', c: 'Dex' },
  { n: 'Trade (Cook)', c: 'Dex' }, { n: 'Trade (Embalmer)', c: 'Dex' },
  { n: 'Trade (Smith)', c: 'Dex' }, { n: 'Trade (Tanner)', c: 'Dex' },
];
