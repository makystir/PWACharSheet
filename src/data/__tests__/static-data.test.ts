import { describe, it, expect } from 'vitest';
import { SPECIES_DATA, SPECIES_OPTIONS } from '../species';
import { CONDITIONS } from '../conditions';
import { CAREER_SCHEMES, CAREER_CLASS_LIST } from '../careers';
import { WEAPONS } from '../weapons';
import { ARMOURS } from '../armour';
import { SPELL_LIST } from '../spells';
import { TRAPPING_LIST } from '../trappings';
import { TALENT_DB, TALENT_BONUS_MAP } from '../talents';
import { ANIMAL_TEMPLATES, TRAINED_SKILLS } from '../animals';
import { ADV_SKILL_DB } from '../advanced-skills';

// ─── Species Data ───────────────────────────────────────────────

describe('Species Data', () => {
  const expectedSpecies = ['Human / Reiklander', 'Dwarf', 'Halfling', 'High Elf', 'Wood Elf'];

  it('contains all expected species', () => {
    expect(SPECIES_OPTIONS.length).toBeGreaterThanOrEqual(5);
    for (const sp of expectedSpecies) {
      expect(SPECIES_DATA).toHaveProperty(sp);
    }
  });

  it('each species has all 10 characteristic keys with non-negative values', () => {
    const charKeys = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];
    for (const sp of expectedSpecies) {
      const data = SPECIES_DATA[sp];
      for (const key of charKeys) {
        expect(data.chars[key as keyof typeof data.chars]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('Human has correct base values', () => {
    const human = SPECIES_DATA['Human / Reiklander'];
    expect(human.move).toBe(4);
    expect(human.fate).toBe(2);
    expect(human.resilience).toBe(1);
    expect(human.extraPoints).toBe(3);
    expect(human.woundsUseSB).toBe(false);
  });

  it('Dwarf has woundsUseSB true', () => {
    expect(SPECIES_DATA['Dwarf'].woundsUseSB).toBe(true);
  });

  it('Elves have move 5', () => {
    expect(SPECIES_DATA['High Elf'].move).toBe(5);
    expect(SPECIES_DATA['Wood Elf'].move).toBe(5);
  });
});

// ─── Conditions Data ────────────────────────────────────────────

describe('Conditions Data', () => {
  const expectedConditions = [
    'Ablaze', 'Bleeding', 'Blinded', 'Broken', 'Deafened', 'Entangled',
    'Fatigued', 'Poisoned', 'Prone', 'Stunned', 'Surprised', 'Unconscious',
  ];

  it('contains all 12 conditions', () => {
    expect(CONDITIONS).toHaveLength(12);
    const names = CONDITIONS.map(c => c.name);
    for (const name of expectedConditions) {
      expect(names).toContain(name);
    }
  });

  it('stackable conditions are correct', () => {
    const stackable = CONDITIONS.filter(c => c.stackable).map(c => c.name);
    expect(stackable).toContain('Ablaze');
    expect(stackable).toContain('Bleeding');
    expect(stackable).toContain('Fatigued');
    expect(stackable).toHaveLength(3);
  });

  it('non-stackable conditions have maxLevel 1', () => {
    const nonStackable = CONDITIONS.filter(c => !c.stackable);
    for (const cond of nonStackable) {
      expect(cond.maxLevel).toBe(1);
    }
  });

  it('each condition has required fields', () => {
    for (const cond of CONDITIONS) {
      expect(cond.name).toBeTruthy();
      expect(cond.description).toBeTruthy();
      expect(cond.effects).toBeTruthy();
      expect(cond.defaultDuration).toBeTruthy();
      expect(cond.removedBy).toBeTruthy();
      expect(typeof cond.stackable).toBe('boolean');
      expect(cond.maxLevel).toBeGreaterThanOrEqual(1);
    }
  });
});

// ─── Career Data ────────────────────────────────────────────────

describe('Career Data', () => {
  it('has all 8 career classes', () => {
    expect(CAREER_CLASS_LIST).toHaveLength(8);
    const expected = ['Academics', 'Burghers', 'Courtiers', 'Peasants', 'Rangers', 'Riverfolk', 'Rogues', 'Warriors'];
    for (const cls of expected) {
      expect(CAREER_CLASS_LIST).toContain(cls);
    }
  });

  it('each class has at least one career', () => {
    for (const cls of CAREER_CLASS_LIST) {
      const careers = Object.values(CAREER_SCHEMES).filter(c => c.class === cls);
      expect(careers.length).toBeGreaterThan(0);
    }
  });

  it('each career has 4 levels with required fields', () => {
    for (const [name, scheme] of Object.entries(CAREER_SCHEMES)) {
      for (const lvl of [scheme.level1, scheme.level2, scheme.level3, scheme.level4]) {
        expect(lvl.title, `${name} missing title`).toBeTruthy();
        expect(lvl.status, `${name} missing status`).toBeTruthy();
        expect(lvl.characteristics.length, `${name} missing characteristics`).toBeGreaterThan(0);
        expect(lvl.skills.length, `${name} missing skills`).toBeGreaterThan(0);
        expect(lvl.talents.length, `${name} missing talents`).toBeGreaterThan(0);
      }
    }
  });

  it('spot-check: Cavalryman is a Warriors career', () => {
    expect(CAREER_SCHEMES['Cavalryman']).toBeDefined();
    expect(CAREER_SCHEMES['Cavalryman'].class).toBe('Warriors');
    expect(CAREER_SCHEMES['Cavalryman'].level1.title).toBe('Horseman');
  });

  it('spot-check: Wizard is an Academics career', () => {
    expect(CAREER_SCHEMES['Wizard']).toBeDefined();
    expect(CAREER_SCHEMES['Wizard'].class).toBe('Academics');
  });
});

// ─── Weapons Data ───────────────────────────────────────────────

describe('Weapons Data', () => {
  it('contains both melee and ranged weapons', () => {
    const meleeGroups = ['Basic', 'Cavalry', 'Fencing', 'Brawling', 'Flail', 'Parry', 'Polearm', 'Two-Handed'];
    const rangedGroups = ['Sling', 'Bow', 'Crossbow', 'Blackpowder', 'Throwing', 'Entangling'];

    for (const group of meleeGroups) {
      const weapons = WEAPONS.filter(w => w.group === group);
      expect(weapons.length, `No weapons in melee group: ${group}`).toBeGreaterThan(0);
    }

    for (const group of rangedGroups) {
      const weapons = WEAPONS.filter(w => w.group === group);
      expect(weapons.length, `No weapons in ranged group: ${group}`).toBeGreaterThan(0);
    }
  });

  it('melee weapons have rangeReach, ranged weapons have maxR', () => {
    const meleeGroups = ['Basic', 'Cavalry', 'Fencing', 'Brawling', 'Flail', 'Parry', 'Polearm', 'Two-Handed'];
    const melee = WEAPONS.filter(w => meleeGroups.includes(w.group));
    for (const w of melee) {
      expect(w.rangeReach, `${w.name} missing rangeReach`).toBeTruthy();
    }

    const rangedGroups = ['Sling', 'Bow', 'Crossbow', 'Blackpowder', 'Throwing', 'Entangling'];
    const ranged = WEAPONS.filter(w => rangedGroups.includes(w.group));
    for (const w of ranged) {
      expect(w.maxR, `${w.name} missing maxR`).toBeDefined();
    }
  });

  it('spot-check: Hand Weapon is Basic with +SB+4 damage', () => {
    const hw = WEAPONS.find(w => w.name === 'Hand Weapon');
    expect(hw).toBeDefined();
    expect(hw!.group).toBe('Basic');
    expect(hw!.damage).toBe('+SB+4');
    expect(hw!.enc).toBe('1');
  });

  it('spot-check: Pistol is Blackpowder with reload', () => {
    const pistol = WEAPONS.find(w => w.name === 'Pistol');
    expect(pistol).toBeDefined();
    expect(pistol!.group).toBe('Blackpowder');
    expect(pistol!.reload).toBe('1');
  });

  it('each weapon has name, group, enc, damage, and qualities', () => {
    for (const w of WEAPONS) {
      expect(w.name).toBeTruthy();
      expect(w.group).toBeTruthy();
      expect(w.enc).toBeDefined();
      expect(w.damage).toBeDefined();
      expect(w.qualities).toBeDefined();
    }
  });
});

// ─── Armour Data ────────────────────────────────────────────────

describe('Armour Data', () => {
  it('contains armour entries', () => {
    expect(ARMOURS.length).toBeGreaterThan(0);
  });

  it('all AP values are non-negative integers', () => {
    for (const a of ARMOURS) {
      expect(a.ap).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(a.ap)).toBe(true);
    }
  });

  it('each armour has required fields', () => {
    for (const a of ARMOURS) {
      expect(a.name).toBeTruthy();
      expect(a.locations).toBeTruthy();
      expect(a.enc).toBeDefined();
      expect(a.qualities).toBeDefined();
    }
  });

  it('spot-check: Leather Jack covers Arms and Body with AP 1', () => {
    const lj = ARMOURS.find(a => a.name === 'Leather Jack');
    expect(lj).toBeDefined();
    expect(lj!.locations).toBe('Arms, Body');
    expect(lj!.ap).toBe(1);
  });

  it('spot-check: Plate Breastplate has Impenetrable quality', () => {
    const pb = ARMOURS.find(a => a.name === 'Plate Breastplate');
    expect(pb).toBeDefined();
    expect(pb!.qualities).toContain('Impenetrable');
    expect(pb!.ap).toBe(2);
  });

  it('covers all body locations', () => {
    const allLocations = ARMOURS.flatMap(a => a.locations.split(', '));
    expect(allLocations).toContain('Head');
    expect(allLocations).toContain('Body');
    expect(allLocations).toContain('Arms');
    expect(allLocations).toContain('Legs');
  });
});

// ─── Spells Data ────────────────────────────────────────────────

describe('Spells Data', () => {
  it('contains 100+ spells', () => {
    expect(SPELL_LIST.length).toBeGreaterThanOrEqual(100);
  });

  it('covers all lore categories', () => {
    // Verify spells exist across all expected categories by spot-checking known spells
    const petty = SPELL_LIST.filter(s => s.cn === '0' && !s.name.startsWith('Blessing') && !s.name.startsWith('Goodwill') && !s.name.startsWith('Mirkride') && !s.name.startsWith('Nepenthe') && !s.name.startsWith('Nostrum') && !s.name.startsWith('Part the Branches') && !s.name.startsWith('Protective Charm'));
    expect(petty.length, 'Petty spells').toBeGreaterThan(0);

    // Arcane
    expect(SPELL_LIST.find(s => s.name === 'Aethyric Armour')).toBeDefined();
    // Lore of Beasts
    expect(SPELL_LIST.find(s => s.name === 'Amber Talons')).toBeDefined();
    // Lore of Death
    expect(SPELL_LIST.find(s => s.name === 'Caress of Laniph')).toBeDefined();
    // Lore of Fire
    expect(SPELL_LIST.find(s => s.name === "Aqshy's Aegis")).toBeDefined();
    // Lore of Heavens
    expect(SPELL_LIST.find(s => s.name === 'Cerulean Shield')).toBeDefined();
    // Lore of Metal
    expect(SPELL_LIST.find(s => s.name === 'Crucible of Chamon')).toBeDefined();
    // Lore of Life
    expect(SPELL_LIST.find(s => s.name === 'Barkskin')).toBeDefined();
    // Lore of Light
    expect(SPELL_LIST.find(s => s.name === 'Banishment')).toBeDefined();
    // Lore of Shadows
    expect(SPELL_LIST.find(s => s.name === 'Choking Shadows')).toBeDefined();
    // Blessings
    expect(SPELL_LIST.find(s => s.name === 'Blessing of Battle')).toBeDefined();
    // Hedgecraft
    expect(SPELL_LIST.find(s => s.name === 'Goodwill')).toBeDefined();
    // Witchcraft
    expect(SPELL_LIST.find(s => s.name === 'Blight')).toBeDefined();
    // Daemonology
    expect(SPELL_LIST.find(s => s.name === 'Detect Daemon')).toBeDefined();
    // Necromancy
    expect(SPELL_LIST.find(s => s.name === 'Raise Dead')).toBeDefined();
    // Chaos
    expect(SPELL_LIST.find(s => s.name === 'Stream of Corruption')).toBeDefined();
  });

  it('each spell has required fields', () => {
    for (const s of SPELL_LIST) {
      expect(s.name).toBeTruthy();
      expect(s.cn).toBeDefined();
      expect(s.range).toBeTruthy();
      expect(s.target).toBeTruthy();
      expect(s.duration).toBeTruthy();
      expect(s.effect).toBeTruthy();
    }
  });

  it('spot-check: Dart is a Petty spell with CN 0', () => {
    const dart = SPELL_LIST.find(s => s.name === 'Dart');
    expect(dart).toBeDefined();
    expect(dart!.cn).toBe('0');
    expect(dart!.effect).toContain('Magic missile');
  });

  it('spot-check: Flight is an Arcane spell with CN 8', () => {
    const flight = SPELL_LIST.find(s => s.name === 'Flight');
    expect(flight).toBeDefined();
    expect(flight!.cn).toBe('8');
  });
});

// ─── Trappings Data ─────────────────────────────────────────────

describe('Trappings Data', () => {
  it('contains trapping entries', () => {
    expect(TRAPPING_LIST.length).toBeGreaterThan(0);
  });

  it('each trapping has name and enc', () => {
    for (const t of TRAPPING_LIST) {
      expect(t.name).toBeTruthy();
      expect(t.enc).toBeDefined();
    }
  });

  it('spot-check: Backpack has enc 2', () => {
    const bp = TRAPPING_LIST.find(t => t.name === 'Backpack');
    expect(bp).toBeDefined();
    expect(bp!.enc).toBe('2');
  });
});

// ─── Talents Data ───────────────────────────────────────────────

describe('Talents Data', () => {
  it('contains talent entries', () => {
    expect(TALENT_DB.length).toBeGreaterThan(0);
  });

  it('each talent has name, max, and desc', () => {
    for (const t of TALENT_DB) {
      expect(t.name).toBeTruthy();
      expect(t.max).toBeTruthy();
      expect(t.desc).toBeTruthy();
    }
  });

  it('TALENT_BONUS_MAP has 10 entries for characteristic-boosting talents', () => {
    expect(Object.keys(TALENT_BONUS_MAP)).toHaveLength(10);
    expect(TALENT_BONUS_MAP['Warrior Born']).toEqual({ char: 'WS', bonus: 5 });
    expect(TALENT_BONUS_MAP['Marksman']).toEqual({ char: 'BS', bonus: 5 });
    expect(TALENT_BONUS_MAP['Suave']).toEqual({ char: 'Fel', bonus: 5 });
  });

  it('all TALENT_BONUS_MAP talents exist in TALENT_DB', () => {
    for (const talentName of Object.keys(TALENT_BONUS_MAP)) {
      expect(TALENT_DB.find(t => t.name === talentName), `${talentName} not in TALENT_DB`).toBeDefined();
    }
  });

  it('spot-check: Hardy talent', () => {
    const hardy = TALENT_DB.find(t => t.name === 'Hardy');
    expect(hardy).toBeDefined();
    expect(hardy!.max).toBe('T Bonus');
    expect(hardy!.desc).toContain('Wounds');
  });
});

// ─── Animals Data ───────────────────────────────────────────────

describe('Animals Data', () => {
  it('contains animal templates', () => {
    expect(ANIMAL_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('each animal has required characteristic fields', () => {
    for (const a of ANIMAL_TEMPLATES) {
      expect(a.name).toBeTruthy();
      expect(a.species).toBeTruthy();
      expect(typeof a.M).toBe('number');
      expect(typeof a.WS).toBe('number');
      expect(typeof a.W).toBe('number');
      expect(a.traits).toBeTruthy();
    }
  });

  it('TRAINED_SKILLS contains expected skills', () => {
    expect(TRAINED_SKILLS).toContain('Broken');
    expect(TRAINED_SKILLS).toContain('War');
    expect(TRAINED_SKILLS).toContain('Mount');
    expect(TRAINED_SKILLS.length).toBe(9);
  });

  it('spot-check: War Dog has trained skills', () => {
    const warDog = ANIMAL_TEMPLATES.find(a => a.name === 'War Dog');
    expect(warDog).toBeDefined();
    expect(warDog!.trained).toContain('Broken');
    expect(warDog!.trained).toContain('War');
  });

  it('spot-check: Destrier is a warhorse', () => {
    const destrier = ANIMAL_TEMPLATES.find(a => a.name === 'Destrier (Warhorse)');
    expect(destrier).toBeDefined();
    expect(destrier!.species).toBe('Horse');
    expect(destrier!.trained).toContain('Mount');
    expect(destrier!.trained).toContain('War');
  });
});

// ─── Advanced Skills Data (Dwarf Players Guide) ────────────────

describe('Advanced Skills — Dwarf Players Guide', () => {
  const newSkills: Array<{ n: string; c: string }> = [
    { n: 'Language (Norse)', c: 'Int' },
    { n: 'Lore (Runes)', c: 'Int' },
    { n: 'Melee (Engineering)', c: 'WS' },
    { n: 'Ranged (Catapult)', c: 'BS' },
    { n: 'Runesmithing', c: 'Dex' },
    { n: 'Sail (Skycraft)', c: 'Ag' },
    { n: 'Secret Signs (Brotherhood of Grimnir)', c: 'Int' },
    { n: 'Secret Signs (Miner)', c: 'Int' },
  ];

  it('all 8 new advanced skills exist in ADV_SKILL_DB with correct characteristic', () => {
    for (const expected of newSkills) {
      const found = ADV_SKILL_DB.find(s => s.n === expected.n);
      expect(found, `Missing skill: ${expected.n}`).toBeDefined();
      expect(found!.c, `Wrong characteristic for ${expected.n}`).toBe(expected.c);
    }
  });

  it('each new skill has a non-empty name and valid characteristic abbreviation', () => {
    const validChars = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];
    for (const expected of newSkills) {
      const found = ADV_SKILL_DB.find(s => s.n === expected.n)!;
      expect(found.n.length).toBeGreaterThan(0);
      expect(validChars).toContain(found.c);
    }
  });

  it('new skills are inserted in correct alphabetical position among their group', () => {
    const names = ADV_SKILL_DB.map(s => s.n);

    // Language (Norse) should be between Language (Magick) and Language (Thief)
    const norseIdx = names.indexOf('Language (Norse)');
    expect(norseIdx).toBeGreaterThan(names.indexOf('Language (Magick)'));
    expect(norseIdx).toBeLessThan(names.indexOf('Language (Thief)'));

    // Lore (Runes) should be between Lore (Metallurgy) and Lore (Science)
    const runesIdx = names.indexOf('Lore (Runes)');
    expect(runesIdx).toBeGreaterThan(names.indexOf('Lore (Metallurgy)'));
    expect(runesIdx).toBeLessThan(names.indexOf('Lore (Science)'));

    // Melee (Engineering) should be after Lore section and before Perform section
    const meleeEngIdx = names.indexOf('Melee (Engineering)');
    expect(meleeEngIdx).toBeGreaterThan(names.indexOf('Lore (Theology)'));
    expect(meleeEngIdx).toBeLessThan(names.indexOf('Perform (Acrobatics)'));

    // Ranged (Catapult) should be between Ranged (Bow) and Ranged (Crossbow)
    const catapultIdx = names.indexOf('Ranged (Catapult)');
    expect(catapultIdx).toBeGreaterThan(names.indexOf('Ranged (Bow)'));
    expect(catapultIdx).toBeLessThan(names.indexOf('Ranged (Crossbow)'));

    // Runesmithing should be between Research and Sail (Barge)
    const runesmithingIdx = names.indexOf('Runesmithing');
    expect(runesmithingIdx).toBeGreaterThan(names.indexOf('Research'));
    expect(runesmithingIdx).toBeLessThan(names.indexOf('Sail (Barge)'));

    // Sail (Skycraft) should be between Sail (Frigate) and Sail (Wolfship)
    const skycraftIdx = names.indexOf('Sail (Skycraft)');
    expect(skycraftIdx).toBeGreaterThan(names.indexOf('Sail (Frigate)'));
    expect(skycraftIdx).toBeLessThan(names.indexOf('Sail (Wolfship)'));

    // Secret Signs (Brotherhood of Grimnir) should be before Secret Signs (Grey Order)
    const brotherhoodIdx = names.indexOf('Secret Signs (Brotherhood of Grimnir)');
    expect(brotherhoodIdx).toBeLessThan(names.indexOf('Secret Signs (Grey Order)'));

    // Secret Signs (Miner) should be between Secret Signs (Guild) and Secret Signs (Ranger)
    const minerIdx = names.indexOf('Secret Signs (Miner)');
    expect(minerIdx).toBeGreaterThan(names.indexOf('Secret Signs (Guild)'));
    expect(minerIdx).toBeLessThan(names.indexOf('Secret Signs (Ranger)'));
  });
});

// ─── Dwarf Players Guide — Species Data ────────────────────────

describe('Dwarf Players Guide — Species', () => {
  const dwarfVariants = [
    'Dwarfs (Karaz-a-Karak)',
    'Dwarfs (Barak Varr)',
    'Dwarfs (Karak Azul)',
    'Dwarfs (Karak Eight Peaks)',
    'Dwarfs (Karak Kadrin)',
    'Dwarfs (Zhufbar)',
    'Dwarfs (Karak Hirn/Black Mountains)',
    'Dwarfs (Karak Izor/The Vaults)',
    'Dwarfs (Karak Norn/Grey Mountains)',
    'Dwarfs (Norse)',
    'Dwarfs (Imperial)',
  ];

  it('all 11 Dwarf variants exist in SPECIES_DATA', () => {
    for (const name of dwarfVariants) {
      expect(SPECIES_DATA, `Missing species: ${name}`).toHaveProperty(name);
    }
  });

  it('all Dwarf variants have correct base characteristics', () => {
    const expectedChars = { WS: 30, BS: 20, S: 20, T: 30, I: 20, Ag: 10, Dex: 30, Int: 20, WP: 40, Fel: 10 };
    for (const name of dwarfVariants) {
      const data = SPECIES_DATA[name];
      for (const [key, val] of Object.entries(expectedChars)) {
        expect(data.chars[key as keyof typeof data.chars], `${name} ${key}`).toBe(val);
      }
    }
  });

  it('all Dwarf variants have move 3, fate 0, resilience 2, extraPoints 2, woundsUseSB true', () => {
    for (const name of dwarfVariants) {
      const data = SPECIES_DATA[name];
      expect(data.move, `${name} move`).toBe(3);
      expect(data.fate, `${name} fate`).toBe(0);
      expect(data.resilience, `${name} resilience`).toBe(2);
      expect(data.extraPoints, `${name} extraPoints`).toBe(2);
      expect(data.woundsUseSB, `${name} woundsUseSB`).toBe(true);
    }
  });

  it('original "Dwarf" entry is unchanged', () => {
    const dwarf = SPECIES_DATA['Dwarf'];
    expect(dwarf).toBeDefined();
    expect(dwarf.chars.WS).toBe(30);
    expect(dwarf.chars.BS).toBe(20);
    expect(dwarf.chars.S).toBe(20);
    expect(dwarf.chars.T).toBe(30);
    expect(dwarf.chars.I).toBe(20);
    expect(dwarf.chars.Ag).toBe(10);
    expect(dwarf.chars.Dex).toBe(30);
    expect(dwarf.chars.Int).toBe(20);
    expect(dwarf.chars.WP).toBe(40);
    expect(dwarf.chars.Fel).toBe(10);
    expect(dwarf.move).toBe(3);
    expect(dwarf.fate).toBe(0);
    expect(dwarf.resilience).toBe(2);
    expect(dwarf.extraPoints).toBe(2);
    expect(dwarf.woundsUseSB).toBe(true);
    // Original Dwarf has specific skills/talents
    expect(dwarf.skills).toContain('Consume Alcohol');
    expect(dwarf.talents).toContain('Magic Resistance');
  });
});

// ─── Dwarf Players Guide — Career Data ─────────────────────────

describe('Dwarf Players Guide — Careers', () => {
  const newCareers: Array<{ name: string; cls: string }> = [
    { name: 'Brewer', cls: 'Burghers' },
    { name: 'Doom Priest', cls: 'Warriors' },
    { name: 'Forge Priest', cls: 'Academics' },
    { name: 'Hearth Priest', cls: 'Academics' },
    { name: 'Hammerer', cls: 'Warriors' },
    { name: 'Ironbreaker (DPG)', cls: 'Warriors' },
    { name: 'Karak Ranger', cls: 'Rangers' },
    { name: 'Runescribe', cls: 'Academics' },
    { name: 'Runesmith', cls: 'Academics' },
    { name: 'Thane', cls: 'Courtiers' },
  ];

  it('all 10 new careers exist with correct class assignments', () => {
    for (const { name, cls } of newCareers) {
      expect(CAREER_SCHEMES[name], `Missing career: ${name}`).toBeDefined();
      expect(CAREER_SCHEMES[name].class, `Wrong class for ${name}`).toBe(cls);
    }
  });

  it('each new career has 4 valid levels', () => {
    for (const { name } of newCareers) {
      const scheme = CAREER_SCHEMES[name];
      for (const lvl of [scheme.level1, scheme.level2, scheme.level3, scheme.level4]) {
        expect(lvl.title, `${name} missing title`).toBeTruthy();
        expect(lvl.status, `${name} missing status`).toBeTruthy();
        expect(lvl.characteristics.length, `${name} missing characteristics`).toBeGreaterThan(0);
        expect(lvl.skills.length, `${name} missing skills`).toBeGreaterThan(0);
        expect(lvl.talents.length, `${name} missing talents`).toBeGreaterThan(0);
      }
    }
  });
});

describe('Dwarf Players Guide — Alternate Careers', () => {
  const alternateCareers: Array<{ name: string; cls: string }> = [
    { name: 'Engineer (Guild)', cls: 'Academics' },
    { name: 'Engineer (Outcast)', cls: 'Academics' },
    { name: 'Engineer (Sky Pilot)', cls: 'Academics' },
    { name: 'Lawyer (Reckoner)', cls: 'Academics' },
    { name: 'Lawyer (Grudgemaster)', cls: 'Academics' },
    { name: 'Artisan (Stoneshaper)', cls: 'Burghers' },
    { name: 'Miner (Karak)', cls: 'Peasants' },
    { name: 'Miner (Lodefinder)', cls: 'Peasants' },
    { name: 'Messenger (Runebearer)', cls: 'Rangers' },
    { name: 'Slayer (Brother of Grimnir)', cls: 'Warriors' },
    { name: 'Slayer (Doomseeker)', cls: 'Warriors' },
    { name: 'Slayer (War-mourner)', cls: 'Warriors' },
    { name: 'Soldier (Axefighter)', cls: 'Warriors' },
    { name: 'Soldier (Quarreller)', cls: 'Warriors' },
    { name: 'Soldier (Thunderer)', cls: 'Warriors' },
  ];

  it('all alternate career entries exist with correct class', () => {
    for (const { name, cls } of alternateCareers) {
      expect(CAREER_SCHEMES[name], `Missing alternate career: ${name}`).toBeDefined();
      expect(CAREER_SCHEMES[name].class, `Wrong class for ${name}`).toBe(cls);
    }
  });

  it('each alternate career has 4 valid levels', () => {
    for (const { name } of alternateCareers) {
      const scheme = CAREER_SCHEMES[name];
      for (const lvl of [scheme.level1, scheme.level2, scheme.level3, scheme.level4]) {
        expect(lvl.title, `${name} missing title`).toBeTruthy();
        expect(lvl.status, `${name} missing status`).toBeTruthy();
        expect(lvl.characteristics.length, `${name} missing characteristics`).toBeGreaterThan(0);
        expect(lvl.skills.length, `${name} missing skills`).toBeGreaterThan(0);
        expect(lvl.talents.length, `${name} missing talents`).toBeGreaterThan(0);
      }
    }
  });
});

// ─── Dwarf Players Guide — Talents ─────────────────────────────

describe('Dwarf Players Guide — Talents', () => {
  const newTalents = [
    'Ancestral Grudge',
    'Bludgeoner',
    'Crew Commander',
    'Demolisher',
    'Dragon Belcher',
    'Entrenchment',
    'Forgefire',
    'Glorious Demise',
    'Harpooner',
    'Kingsguard',
    'Liquid Fortification',
    'Long Memory',
    'Magic Defiance',
    'Maverick',
    'Rune Magic',
    'Master Rune Magic',
    'Short Fuse',
    'Tireless',
    'Underminer',
    'Whirlwind of Death',
  ];

  it('all 20 new talents exist in TALENT_DB with name, max, and desc', () => {
    for (const name of newTalents) {
      const found = TALENT_DB.find(t => t.name === name);
      expect(found, `Missing talent: ${name}`).toBeDefined();
      expect(found!.name).toBe(name);
      expect(found!.max, `${name} missing max`).toBeTruthy();
      expect(found!.desc, `${name} missing desc`).toBeTruthy();
    }
  });
});

// ─── Dwarf Players Guide — Weapons ─────────────────────────────

describe('Dwarf Players Guide — Melee Weapons', () => {
  const newMeleeWeapons = [
    'Dwarf Axe',
    'Dwarf Warhammer',
    'Whirling Blades of Death',
    '(2H) Dwarf Greataxe',
    '(2H) Dwarf Greathammer',
    '(2H) Dwarf Pick',
    'Steam Drill',
    'Cog Axe',
    'Steam Gauntlet',
  ];

  it('all new melee weapons exist with required fields', () => {
    for (const name of newMeleeWeapons) {
      const w = WEAPONS.find(w => w.name === name);
      expect(w, `Missing melee weapon: ${name}`).toBeDefined();
      expect(w!.name).toBeTruthy();
      expect(w!.group).toBeTruthy();
      expect(w!.enc).toBeDefined();
      expect(w!.damage).toBeDefined();
      expect(w!.qualities).toBeDefined();
    }
  });

  it('Engineering group weapons have rangeReach (melee indicator)', () => {
    const engineeringNames = ['Steam Drill', 'Cog Axe', 'Steam Gauntlet'];
    for (const name of engineeringNames) {
      const w = WEAPONS.find(w => w.name === name);
      expect(w, `Missing Engineering weapon: ${name}`).toBeDefined();
      expect(w!.rangeReach, `${name} missing rangeReach`).toBeTruthy();
    }
  });
});

describe('Dwarf Players Guide — Ranged Weapons', () => {
  const newRangedWeapons = [
    '(2H) Dwarf Handgun',
    'Dwarf Pistol',
    '(2H) Dwarf Crossbow',
    'Dwarf Throwing Axe',
    '(2H) Drakegun',
    'Drakefire Pistol',
    '(2H) Repeating Dwarf Handgun',
    '(2H) Grudge-raker',
    'Blasting Charge',
    'Cinderblast Bomb',
    'Trollhammer Torpedo',
  ];

  it('all new ranged weapons exist with required fields', () => {
    for (const name of newRangedWeapons) {
      const w = WEAPONS.find(w => w.name === name);
      expect(w, `Missing ranged weapon: ${name}`).toBeDefined();
      expect(w!.name).toBeTruthy();
      expect(w!.group).toBeTruthy();
      expect(w!.enc).toBeDefined();
      expect(w!.damage).toBeDefined();
      expect(w!.qualities).toBeDefined();
    }
  });

  it('Explosives weapons have maxR (ranged indicator)', () => {
    const explosivesNames = ['Blasting Charge', 'Cinderblast Bomb'];
    for (const name of explosivesNames) {
      const w = WEAPONS.find(w => w.name === name);
      expect(w, `Missing Explosives weapon: ${name}`).toBeDefined();
      expect(w!.maxR, `${name} missing maxR`).toBeDefined();
    }
  });
});

// ─── Dwarf Players Guide — Armour ──────────────────────────────

describe('Dwarf Players Guide — Armour', () => {
  const newArmour = [
    'Gromril Breastplate',
    'Gromril Open Helm',
    'Gromril Bracers',
    'Gromril Plate Leggings',
    'Gromril Helm',
    'Mail Skirt',
    "Miner's Helm",
  ];

  it('all 7 new armour entries exist with valid AP', () => {
    for (const name of newArmour) {
      const a = ARMOURS.find(a => a.name === name);
      expect(a, `Missing armour: ${name}`).toBeDefined();
      expect(a!.ap, `${name} AP should be non-negative`).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(a!.ap), `${name} AP should be integer`).toBe(true);
    }
  });
});

// ─── Dwarf Players Guide — Trappings ───────────────────────────

describe('Dwarf Players Guide — Trappings', () => {
  const newTrappings = [
    'Metal Foil Sheets',
    'Stone Tablet',
    "Reckoner's Log",
    'Battle Standard',
    'Davrich Lamp',
    "Miner's Helm",
    "Pilot's Licence",
    'Runescribing Kit',
    'Toasting Tankard',
    'Ale Keg',
  ];

  it('all 10 new trappings exist with name and enc', () => {
    for (const name of newTrappings) {
      const t = TRAPPING_LIST.find(t => t.name === name);
      expect(t, `Missing trapping: ${name}`).toBeDefined();
      expect(t!.name).toBeTruthy();
      expect(t!.enc, `${name} missing enc`).toBeDefined();
    }
  });
});
