import { describe, it, expect } from 'vitest';
import { SPECIES_DATA, SPECIES_OPTIONS } from '../species';
import { CONDITIONS } from '../conditions';
import { CAREER_SCHEMES, CAREER_CLASS_LIST } from '../careers';
import { WEAPONS } from '../weapons';
import { ARMOURS } from '../armour';
import { SPELL_LIST } from '../spells';
import { TRAPPING_LIST } from '../trappings';
import { TALENT_DB, TALENT_BONUS_MAP } from '../talents';
import { TALENT_ALIASES } from '../talent-aliases';
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
    expect(human.woundsUseSB).toBe(true);
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
    expect(stackable).toContain('Stunned');
    expect(stackable).toContain('Blinded');
    expect(stackable).toContain('Deafened');
    expect(stackable).toContain('Poisoned');
    expect(stackable).toHaveLength(7);
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
      const levels = [scheme.level1, scheme.level2, scheme.level3, scheme.level4, (scheme as Record<string, unknown>).level5].filter(Boolean);
      for (const lvl of levels) {
        const level = lvl as { title: string; status: string; characteristics: string[]; skills: string[]; talents: string[] };
        expect(level.title, `${name} missing title`).toBeTruthy();
        expect(level.status, `${name} missing status`).toBeTruthy();
        expect(level.characteristics.length, `${name} missing characteristics`).toBeGreaterThan(0);
        expect(level.skills.length, `${name} missing skills`).toBeGreaterThan(0);
        expect(level.talents.length, `${name} missing talents`).toBeGreaterThan(0);
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
      const levels = [scheme.level1, scheme.level2, scheme.level3, scheme.level4].filter(Boolean);
      for (const lvl of levels) {
        expect(lvl!.title, `${name} missing title`).toBeTruthy();
        expect(lvl!.status, `${name} missing status`).toBeTruthy();
        expect(lvl!.characteristics.length, `${name} missing characteristics`).toBeGreaterThan(0);
        expect(lvl!.skills.length, `${name} missing skills`).toBeGreaterThan(0);
        expect(lvl!.talents.length, `${name} missing talents`).toBeGreaterThan(0);
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
    { name: 'Handgunner (Thunderer)', cls: 'Warriors' },
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
      const levels = [scheme.level1, scheme.level2, scheme.level3, scheme.level4].filter(Boolean);
      for (const lvl of levels) {
        expect(lvl!.title, `${name} missing title`).toBeTruthy();
        expect(lvl!.status, `${name} missing status`).toBeTruthy();
        expect(lvl!.characteristics.length, `${name} missing characteristics`).toBeGreaterThan(0);
        expect(lvl!.skills.length, `${name} missing skills`).toBeGreaterThan(0);
        expect(lvl!.talents.length, `${name} missing talents`).toBeGreaterThan(0);
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
    '(2H) Steam Drill',
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
    const engineeringNames = ['(2H) Steam Drill', 'Cog Axe', 'Steam Gauntlet'];
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

// ─── High Elf Players Guide — Melee Weapons ────────────────────

describe('High Elf Players Guide — Melee Weapons', () => {
  const newMeleeWeapons = [
    'Elven Sword',
    'Elven Dagger',
    'Elven Shield',
    'Elven Lance',
    'Elven Halberd',
    'Elven Spear',
    '(2H) Elven Great Axe',
    '(2H) Greatsword of Hoeth',
  ];

  it('all 8 Elven melee weapons exist in WEAPONS array', () => {
    for (const name of newMeleeWeapons) {
      const w = WEAPONS.find(w => w.name === name);
      expect(w, `Missing weapon: ${name}`).toBeDefined();
    }
  });

  it('spot-check: Elven Sword is Basic with +SB+4 and Fast', () => {
    const w = WEAPONS.find(w => w.name === 'Elven Sword');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Basic');
    expect(w!.damage).toBe('+SB+4');
    expect(w!.qualities).toBe('Fast');
  });

  it('spot-check: Elven Lance is Cavalry with +SB+6 and Impact, Impale', () => {
    const w = WEAPONS.find(w => w.name === 'Elven Lance');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Cavalry');
    expect(w!.damage).toBe('+SB+6');
    expect(w!.qualities).toBe('Impact, Impale');
  });

  it('spot-check: (2H) Greatsword of Hoeth is Two-Handed with +SB+5 and Damaging, Defensive, Fast', () => {
    const w = WEAPONS.find(w => w.name === '(2H) Greatsword of Hoeth');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Two-Handed');
    expect(w!.damage).toBe('+SB+5');
    expect(w!.qualities).toBe('Damaging, Defensive, Fast');
  });

  it('spot-check: Elven Shield is Basic with Shield 2, Defensive, Undamaging', () => {
    const w = WEAPONS.find(w => w.name === 'Elven Shield');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Basic');
    expect(w!.damage).toBe('+SB+2');
    expect(w!.qualities).toBe('Shield 2, Defensive, Undamaging');
  });
});

// ─── High Elf Players Guide — Armour ───────────────────────────

describe('High Elf Players Guide — Armour', () => {
  const newArmour = [
    'Ithilmar Breastplate',
    'Ithilmar Open Helm',
    'Ithilmar Bracers',
    'Ithilmar Plate Leggings',
    'Ithilmar Helm',
  ];

  it('all 5 Ithilmar armour entries exist in ARMOURS array', () => {
    for (const name of newArmour) {
      const a = ARMOURS.find(a => a.name === name);
      expect(a, `Missing armour: ${name}`).toBeDefined();
    }
  });

  it('all Ithilmar armour has ap 2', () => {
    for (const name of newArmour) {
      const a = ARMOURS.find(a => a.name === name)!;
      expect(a.ap, `${name} should have ap 2`).toBe(2);
    }
  });

  it('all Ithilmar armour has Impenetrable quality', () => {
    for (const name of newArmour) {
      const a = ARMOURS.find(a => a.name === name)!;
      expect(a.qualities, `${name} should have Impenetrable`).toContain('Impenetrable');
    }
  });

  it('spot-check: Ithilmar Open Helm has Partial quality', () => {
    const a = ARMOURS.find(a => a.name === 'Ithilmar Open Helm');
    expect(a).toBeDefined();
    expect(a!.qualities).toBe('Impenetrable, Partial');
    expect(a!.locations).toBe('Head');
  });

  it('spot-check: Ithilmar Breastplate covers Body', () => {
    const a = ARMOURS.find(a => a.name === 'Ithilmar Breastplate');
    expect(a).toBeDefined();
    expect(a!.locations).toBe('Body');
    expect(a!.qualities).toBe('Impenetrable');
  });
});

// ─── High Elf Players Guide — Talents ──────────────────────────

describe('High Elf Players Guide — Talents', () => {
  const newTalents = [
    { name: 'Blessed by Isha', max: '1' },
    { name: 'Blood of Aenarion', max: '1' },
    { name: 'Eye of the Storm', max: '3' },
    { name: 'High Magic', max: '1' },
    { name: 'Martial Arts', max: 'WS Bonus' },
    { name: 'Mind over Body', max: '3' },
    { name: 'Sanctuary of the Mind', max: '3' },
    { name: 'Sword-dancing', max: '1' },
    { name: 'Uncouth Uranai', max: '1' },
  ];

  it('all 9 High Elf talents exist in TALENT_DB', () => {
    for (const { name } of newTalents) {
      const t = TALENT_DB.find(t => t.name === name);
      expect(t, `Missing talent: ${name}`).toBeDefined();
    }
  });

  it('all High Elf talents have correct max values', () => {
    for (const { name, max } of newTalents) {
      const t = TALENT_DB.find(t => t.name === name)!;
      expect(t.max, `${name} max`).toBe(max);
    }
  });

  it('all High Elf talents have non-empty desc', () => {
    for (const { name } of newTalents) {
      const t = TALENT_DB.find(t => t.name === name)!;
      expect(t.desc, `${name} missing desc`).toBeTruthy();
    }
  });

  it('spot-check: Martial Arts desc mentions unarmed', () => {
    const t = TALENT_DB.find(t => t.name === 'Martial Arts')!;
    expect(t.desc.toLowerCase()).toContain('unarmed');
  });

  it('spot-check: High Magic desc mentions Winds of Magic', () => {
    const t = TALENT_DB.find(t => t.name === 'High Magic')!;
    expect(t.desc.toLowerCase()).toContain('winds of magic');
  });
});

// ─── High Elf Players Guide — Spells ───────────────────────────

describe('High Elf Players Guide — Spells', () => {
  const elvenPettySpells = [
    'Bless Arrow', 'Calm', 'Greenfinger', 'Identify Disease', 'Remove Dirt', 'Reveal Magic',
  ];

  const elvenArcaneSpells = [
    'Enchant Plant', 'Lesser Banishment', 'Magic Alarm', 'Masking the Mind',
    'Purify Body', 'Speak with Animal', 'Voice of Iron', 'Zone of Comfort',
  ];

  const highMagicSpells = [
    'Apotheosis', 'Arcane Unforging', 'Coruscation of Finreir', 'Curse of Arrow Attraction',
    'Deadlock', 'Drain Magic', 'Fiery Convocation', 'Fortune is Fickle',
    'Glamour of Teclis', 'Greater Banishment', 'Hand of Glory', 'Invisible Eye',
    'Shield of Saphery', 'Soul Quench', 'Tempest', 'Walk between Worlds',
  ];

  const magicOfVaulSpells = [
    "Artist's Touch", 'Patience of Vaul', "Vaul's Grace", "Vaul's Rage",
    'Divination of Flames', 'Divination of Stones', 'Fires of Perfection',
    'Wisdom of the Skysteel', 'Fortress of Hotek',
  ];

  const magicOfMathlannSpells = [
    'Fishbonding', 'Stormsense', "Ocean's Fury", 'Spirits of the Waves',
    'Call of the Seas', 'Cloak of Mathlann', 'Mistress of the Deep',
    'Waterlungs', 'Writhing Mists',
  ];

  const magicOfHoethSpells = [
    'Divine Stylus', 'Enlightenment', 'Arcane Insight', 'Greater Spirit Bond',
    'Crucible of Light', 'Mnemonic Control', 'Psychic Sending', 'Sacred Wards',
    'Soulcraft', 'The Primary Words',
  ];

  it('all 6 Elven Petty spells exist in SPELL_LIST', () => {
    for (const name of elvenPettySpells) {
      expect(SPELL_LIST.find(s => s.name === name), `Missing spell: ${name}`).toBeDefined();
    }
  });

  it('all 8 Elven Arcane spells exist in SPELL_LIST', () => {
    for (const name of elvenArcaneSpells) {
      expect(SPELL_LIST.find(s => s.name === name), `Missing spell: ${name}`).toBeDefined();
    }
  });

  it('all 16 High Magic spells exist in SPELL_LIST', () => {
    for (const name of highMagicSpells) {
      expect(SPELL_LIST.find(s => s.name === name), `Missing spell: ${name}`).toBeDefined();
    }
  });

  it('all 9 Magic of Vaul spells exist in SPELL_LIST', () => {
    for (const name of magicOfVaulSpells) {
      expect(SPELL_LIST.find(s => s.name === name), `Missing spell: ${name}`).toBeDefined();
    }
  });

  it('all 9 Magic of Mathlann spells exist in SPELL_LIST', () => {
    for (const name of magicOfMathlannSpells) {
      expect(SPELL_LIST.find(s => s.name === name), `Missing spell: ${name}`).toBeDefined();
    }
  });

  it('all 10 Magic of Hoeth spells exist in SPELL_LIST', () => {
    for (const name of magicOfHoethSpells) {
      expect(SPELL_LIST.find(s => s.name === name), `Missing spell: ${name}`).toBeDefined();
    }
  });

  it('spot-check: Elven Petty spells all have CN 0', () => {
    for (const name of elvenPettySpells) {
      const s = SPELL_LIST.find(s => s.name === name)!;
      expect(s.cn, `${name} CN`).toBe('0');
    }
  });

  it('spot-check: Enchant Plant (Elven Arcane) has CN 4', () => {
    const s = SPELL_LIST.find(s => s.name === 'Enchant Plant')!;
    expect(s.cn).toBe('4');
  });

  it('spot-check: Coruscation of Finreir (High Magic) has CN 11', () => {
    const s = SPELL_LIST.find(s => s.name === 'Coruscation of Finreir')!;
    expect(s.cn).toBe('11');
  });

  it("spot-check: Artist's Touch (Magic of Vaul) has CN 0", () => {
    const s = SPELL_LIST.find(s => s.name === "Artist's Touch")!;
    expect(s.cn).toBe('0');
  });

  it("spot-check: Ocean's Fury (Magic of Mathlann) has CN 8", () => {
    const s = SPELL_LIST.find(s => s.name === "Ocean's Fury")!;
    expect(s.cn).toBe('8');
  });

  it('spot-check: The Primary Words (Magic of Hoeth) has CN 15', () => {
    const s = SPELL_LIST.find(s => s.name === 'The Primary Words')!;
    expect(s.cn).toBe('15');
  });
});

// ─── High Elf Players Guide — Non-Regression ───────────────────

describe('High Elf Players Guide — Non-Regression', () => {
  it('existing (2H) Elfbow entry is unchanged', () => {
    const elfbow = WEAPONS.find(w => w.name === '(2H) Elfbow');
    expect(elfbow).toBeDefined();
    expect(elfbow!.group).toBe('Bow');
    expect(elfbow!.enc).toBe('1');
    expect(elfbow!.damage).toBe('+SB+4');
    expect(elfbow!.maxR).toBe('450');
    expect(elfbow!.optR).toBe('150');
    expect(elfbow!.rangeMod).toBe('30');
    expect(elfbow!.qualities).toBe('Damaging, Precise, Impale');
  });
});

// ─── Winds of Magic — Spell Count ───────────────────────────────

describe('Winds of Magic — Spell Count', () => {
  it('SPELL_LIST contains 300+ spells (core + WoM + other supplements)', () => {
    expect(SPELL_LIST.length).toBeGreaterThanOrEqual(300);
  });

  it('contains representative spells from all 8 College Lores', () => {
    // Lore of Light (Hysh)
    expect(SPELL_LIST.find(s => s.name === 'Blinding Light'), 'Missing Hysh: Blinding Light').toBeDefined();
    expect(SPELL_LIST.find(s => s.name === 'Net of Amyntok'), 'Missing Hysh: Net of Amyntok').toBeDefined();
    expect(SPELL_LIST.find(s => s.name === 'Clarity of Thought'), 'Missing Hysh: Clarity of Thought').toBeDefined();
    expect(SPELL_LIST.find(s => s.name === 'Healing Light'), 'Missing Hysh: Healing Light').toBeDefined();

    // Lore of Metal (Chamon)
    expect(SPELL_LIST.find(s => s.name === 'Armour of Tin'), 'Missing Chamon: Armour of Tin').toBeDefined();
    expect(SPELL_LIST.find(s => s.name === 'Crucible of Chamon'), 'Missing Chamon: Crucible of Chamon').toBeDefined();
    expect(SPELL_LIST.find(s => s.name === 'Curse of Rust'), 'Missing Chamon: Curse of Rust').toBeDefined();
    expect(SPELL_LIST.find(s => s.name === 'Golden Touch'), 'Missing Chamon: Golden Touch').toBeDefined();

    // Lore of Life (Ghyran)
    expect(SPELL_LIST.find(s => s.name === 'Barkskin'), 'Missing Ghyran: Barkskin').toBeDefined();
    expect(SPELL_LIST.find(s => s.name === 'Earthblood'), 'Missing Ghyran: Earthblood').toBeDefined();
    expect(SPELL_LIST.find(s => s.name === 'Lifebloom'), 'Missing Ghyran: Lifebloom').toBeDefined();
    expect(SPELL_LIST.find(s => s.name === 'Regenerate'), 'Missing Ghyran: Regenerate').toBeDefined();

    // Lore of Heavens (Azyr)
    expect(SPELL_LIST.find(s => s.name === 'Curse of Fate'), 'Missing Azyr: Curse of Fate').toBeDefined();
    expect(SPELL_LIST.find(s => s.name === 'Divination'), 'Missing Azyr: Divination').toBeDefined();
    expect(SPELL_LIST.find(s => s.name === 'Fantastic Foresight'), 'Missing Azyr: Fantastic Foresight').toBeDefined();

    // Lore of Shadows (Ulgu)
    expect(SPELL_LIST.find(s => s.name === 'Black Horrors'), 'Missing Ulgu: Black Horrors').toBeDefined();
    expect(SPELL_LIST.find(s => s.name === 'Doppelganger'), 'Missing Ulgu: Doppelganger').toBeDefined();
    expect(SPELL_LIST.find(s => s.name === 'Pit of Tarnus'), 'Missing Ulgu: Pit of Tarnus').toBeDefined();

    // Lore of Death (Shyish)
    expect(SPELL_LIST.find(s => s.name === 'Acceptance of Fate'), 'Missing Shyish: Acceptance of Fate').toBeDefined();
    expect(SPELL_LIST.find(s => s.name === 'Amaranth'), 'Missing Shyish: Amaranth').toBeDefined();
    expect(SPELL_LIST.find(s => s.name === 'Limbwither'), 'Missing Shyish: Limbwither').toBeDefined();

    // Lore of Fire (Aqshy)
    expect(SPELL_LIST.find(s => s.name === 'Body of Fire'), 'Missing Aqshy: Body of Fire').toBeDefined();
    expect(SPELL_LIST.find(s => s.name === 'Burning Head'), 'Missing Aqshy: Burning Head').toBeDefined();
    expect(SPELL_LIST.find(s => s.name === 'Flamestorm'), 'Missing Aqshy: Flamestorm').toBeDefined();

    // Lore of Beasts (Ghur)
    expect(SPELL_LIST.find(s => s.name === 'Amber Trance'), 'Missing Ghur: Amber Trance').toBeDefined();
    expect(SPELL_LIST.find(s => s.name === 'Awakening of the Wood'), 'Missing Ghur: Awakening of the Wood').toBeDefined();
  });

  it('contains WoM arcane utility spells', () => {
    const arcaneUtility = [
      'Disrupt Magic',
      'Silence',
      'Collapse Construct',
      'Succour Magical Servant',
    ];
    for (const name of arcaneUtility) {
      expect(SPELL_LIST.find(s => s.name === name), `Missing arcane utility: ${name}`).toBeDefined();
    }
  });
});

// ─── Winds of Magic — Career Structure ──────────────────────────

describe('Winds of Magic — Career Structure', () => {
  const collegeCareers: Array<{ name: string; cls: string }> = [
    { name: 'Hierophant', cls: 'Academics' },
    { name: 'Alchemist (Gold)', cls: 'Academics' },
    { name: 'Druid', cls: 'Academics' },
    { name: 'Astromancer', cls: 'Academics' },
    { name: 'Shadowmancer', cls: 'Academics' },
    { name: 'Spiriter', cls: 'Academics' },
    { name: 'Pyromancer', cls: 'Academics' },
    { name: 'Shaman (Amber)', cls: 'Academics' },
  ];

  const supportingCareers: Array<{ name: string; cls: string }> = [
    { name: 'Beadle', cls: 'Warriors' },
    { name: 'Mundane Alchemist', cls: 'Academics' },
    { name: 'Magister Vigilant', cls: 'Academics' },
    { name: 'Scryer', cls: 'Academics' },
  ];

  const allWomCareers = [...collegeCareers, ...supportingCareers];

  it('all 8 College Wizard careers exist in CAREER_SCHEMES with correct class', () => {
    for (const { name, cls } of collegeCareers) {
      expect(CAREER_SCHEMES[name], `Missing college career: ${name}`).toBeDefined();
      expect(CAREER_SCHEMES[name].class, `Wrong class for ${name}`).toBe(cls);
    }
  });

  it('all 4 supporting careers exist in CAREER_SCHEMES with correct class', () => {
    for (const { name, cls } of supportingCareers) {
      expect(CAREER_SCHEMES[name], `Missing supporting career: ${name}`).toBeDefined();
      expect(CAREER_SCHEMES[name].class, `Wrong class for ${name}`).toBe(cls);
    }
  });

  it('each WoM career has 4 levels with valid structure', () => {
    for (const { name } of allWomCareers) {
      const scheme = CAREER_SCHEMES[name];
      const levels = [scheme.level1, scheme.level2, scheme.level3, scheme.level4].filter(Boolean);
      expect(levels.length, `${name} should have 4 levels`).toBe(4);
      for (const level of levels) {
        expect(level!.title, `${name} level missing title`).toBeTruthy();
        expect(level!.status, `${name} level missing status`).toBeTruthy();
        expect(level!.characteristics.length, `${name} level missing characteristics`).toBeGreaterThan(0);
        expect(level!.skills.length, `${name} level missing skills`).toBeGreaterThan(0);
        expect(level!.talents.length, `${name} level missing talents`).toBeGreaterThan(0);
      }
    }
  });

  it('each WoM career has skills and talents sorted alphabetically', () => {
    for (const { name } of allWomCareers) {
      const scheme = CAREER_SCHEMES[name];
      const levels = [scheme.level1, scheme.level2, scheme.level3, scheme.level4].filter(Boolean);
      for (const level of levels) {
        const sortedSkills = [...level!.skills].sort((a, b) => a.localeCompare(b));
        expect(level!.skills, `${name} "${level!.title}" skills not sorted`).toEqual(sortedSkills);

        const sortedTalents = [...level!.talents].sort((a, b) => a.localeCompare(b));
        expect(level!.talents, `${name} "${level!.title}" talents not sorted`).toEqual(sortedTalents);
      }
    }
  });

  it('each WoM career has cumulative skills/talents (level N+1 is superset of level N)', () => {
    for (const { name } of allWomCareers) {
      const scheme = CAREER_SCHEMES[name];
      const levels = [scheme.level1, scheme.level2, scheme.level3, scheme.level4].filter(Boolean);
      for (let i = 0; i < levels.length - 1; i++) {
        const current = levels[i]!;
        const next = levels[i + 1]!;

        for (const skill of current.skills) {
          expect(next.skills, `${name} "${next.title}" missing skill "${skill}" from "${current.title}"`).toContain(skill);
        }

        for (const talent of current.talents) {
          expect(next.talents, `${name} "${next.title}" missing talent "${talent}" from "${current.title}"`).toContain(talent);
        }
      }
    }
  });
});

// ─── Winds of Magic — Talents ───────────────────────────────────

describe('Winds of Magic — Talents', () => {
  const suffuseTalents = [
    'Suffuse with Aqshy',
    'Suffuse with Azyr',
    'Suffuse with Chamon',
    'Suffuse with Ghur',
    'Suffuse with Ghyran',
    'Suffuse with Hysh',
    'Suffuse with Shyish',
    'Suffuse with Ulgu',
  ];

  const otherWomTalents = [
    'War Wizard',
    'Magical Assistant',
  ];

  it('all 8 "Suffuse with" talents exist in TALENT_DB', () => {
    for (const name of suffuseTalents) {
      const found = TALENT_DB.find(t => t.name === name);
      expect(found, `Missing talent: ${name}`).toBeDefined();
    }
  });

  it('all "Suffuse with" talents have name, max, and desc', () => {
    for (const name of suffuseTalents) {
      const found = TALENT_DB.find(t => t.name === name)!;
      expect(found.name).toBe(name);
      expect(found.max, `${name} missing max`).toBeTruthy();
      expect(found.desc, `${name} missing desc`).toBeTruthy();
    }
  });

  it('War Wizard and Magical Assistant talents exist in TALENT_DB with valid fields', () => {
    for (const name of otherWomTalents) {
      const found = TALENT_DB.find(t => t.name === name);
      expect(found, `Missing talent: ${name}`).toBeDefined();
      expect(found!.max, `${name} missing max`).toBeTruthy();
      expect(found!.desc, `${name} missing desc`).toBeTruthy();
    }
  });
});

// ─── Winds of Magic — Advanced Skills ───────────────────────────

describe('Winds of Magic — Advanced Skills', () => {
  const womSkills = [
    { n: 'Augury', c: 'Int' },
    { n: 'Psychometry', c: 'Int' },
  ];

  it('Augury and Psychometry exist in ADV_SKILL_DB with characteristic Int', () => {
    for (const { n, c } of womSkills) {
      const found = ADV_SKILL_DB.find(s => s.n === n);
      expect(found, `Missing skill: ${n}`).toBeDefined();
      expect(found!.c, `Wrong characteristic for ${n}`).toBe(c);
    }
  });

  it('WoM advanced skills have valid structure', () => {
    const validChars = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];
    for (const { n } of womSkills) {
      const found = ADV_SKILL_DB.find(s => s.n === n)!;
      expect(found.n.length).toBeGreaterThan(0);
      expect(validChars).toContain(found.c);
    }
  });
});

// ─── Up in Arms — Career Properties ────────────────────────────

describe('Up in Arms — Career Properties', () => {
  /**
   * **Validates: Requirements 1.3, 1.5, 1.6, 2.1, 2.2, 2.3**
   */

  it('Property 1: Career Level Structural Integrity — all levels have non-empty title, status, characteristics, skills, talents', () => {
    for (const [name, scheme] of Object.entries(CAREER_SCHEMES)) {
      const levels = [scheme.level1, scheme.level2, scheme.level3, scheme.level4, scheme.level5].filter(Boolean);
      for (const level of levels) {
        expect(level!.title, `${name} level missing title`).toBeTruthy();
        expect(level!.title.length, `${name} level has empty title`).toBeGreaterThan(0);
        expect(level!.status, `${name} level missing status`).toBeTruthy();
        expect(level!.status.length, `${name} level has empty status`).toBeGreaterThan(0);
        expect(level!.characteristics.length, `${name} level has empty characteristics`).toBeGreaterThan(0);
        expect(level!.skills.length, `${name} level has empty skills`).toBeGreaterThan(0);
        expect(level!.talents.length, `${name} level has empty talents`).toBeGreaterThan(0);
      }
    }
  });

  it('Property 2: Career Level Alphabetical Ordering — skills[] and talents[] sorted alphabetically in every level', () => {
    for (const [name, scheme] of Object.entries(CAREER_SCHEMES)) {
      const levels = [scheme.level1, scheme.level2, scheme.level3, scheme.level4, scheme.level5].filter(Boolean);
      for (const level of levels) {
        const sortedSkills = [...level!.skills].sort((a, b) => a.localeCompare(b));
        expect(level!.skills, `${name} "${level!.title}" skills not alphabetically sorted`).toEqual(sortedSkills);

        const sortedTalents = [...level!.talents].sort((a, b) => a.localeCompare(b));
        expect(level!.talents, `${name} "${level!.title}" talents not alphabetically sorted`).toEqual(sortedTalents);
      }
    }
  });

  it('Property 3: Career Level Cumulative Progression — level N+1 is superset of level N for skills, talents, and characteristics', () => {
    // Note: Some DPG alternate careers use branching progression (each level is a distinct specialization)
    // rather than strict cumulative. These are identified by parenthetical suffixes like "(Guild)", "(Outcast)", etc.
    // We exclude these known branching careers from the cumulative property check.
    const branchingCareers = new Set([
      'Engineer (Guild)', 'Engineer (Outcast)', 'Engineer (Sky Pilot)',
      'Lawyer (Reckoner)', 'Lawyer (Grudgemaster)',
      'Artisan (Stoneshaper)',
      'Miner (Karak)', 'Miner (Lodefinder)',
      'Messenger (Runebearer)',
      'Slayer (Brother of Grimnir)', 'Slayer (Doomseeker)', 'Slayer (War-mourner)',
      'Soldier (Axefighter)', 'Soldier (Quarreller)', 'Soldier (Thunderer)',
      'Handgunner (Thunderer)',
    ]);

    for (const [name, scheme] of Object.entries(CAREER_SCHEMES)) {
      if (branchingCareers.has(name)) continue;

      const levels = [scheme.level1, scheme.level2, scheme.level3, scheme.level4, scheme.level5].filter(Boolean);
      for (let i = 0; i < levels.length - 1; i++) {
        const current = levels[i]!;
        const next = levels[i + 1]!;

        for (const skill of current.skills) {
          expect(next.skills, `${name} "${next.title}" missing skill "${skill}" from previous level "${current.title}"`).toContain(skill);
        }

        for (const talent of current.talents) {
          expect(next.talents, `${name} "${next.title}" missing talent "${talent}" from previous level "${current.title}"`).toContain(talent);
        }

        for (const char of current.characteristics) {
          expect(next.characteristics, `${name} "${next.title}" missing characteristic "${char}" from previous level "${current.title}"`).toContain(char);
        }
      }
    }
  });
});

// ─── Up in Arms — Advance Scheme Properties ────────────────────

/**
 * Property 4: Advance Scheme Value Validity
 * Every characteristic value in careeradvanceschemes.json is null or "T1"–"T5".
 *
 * Validates: Requirements 3.3
 */
describe('Up in Arms — Advance Scheme Properties', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const advanceSchemes = require('../careeradvanceschemes.json') as {
    careers: Record<string, Record<string, { advance_scheme?: Record<string, string | null>; [key: string]: unknown }>>;
    [key: string]: unknown;
  };

  const VALID_VALUES: ReadonlyArray<string | null> = [null, 'T1', 'T2', 'T3', 'T4', 'T5'];
  const CHARACTERISTICS = ['WS', 'BS', 'S', 'T', 'I', 'Agi', 'Dex', 'Int', 'WP', 'Fel'] as const;

  it('every characteristic value in every advance scheme is null or "T1"–"T5"', () => {
    const careers = advanceSchemes.careers;
    for (const [className, classEntries] of Object.entries(careers)) {
      for (const [careerName, careerData] of Object.entries(classEntries)) {
        const scheme = careerData.advance_scheme;
        if (!scheme) continue;
        for (const char of CHARACTERISTICS) {
          const value = scheme[char];
          expect(
            VALID_VALUES.includes(value),
            `${className} > ${careerName}: ${char} has invalid value "${value}" (expected null or "T1"–"T5")`
          ).toBe(true);
        }
      }
    }
  });

  it('every advance scheme has exactly 10 characteristic keys', () => {
    const careers = advanceSchemes.careers;
    for (const [className, classEntries] of Object.entries(careers)) {
      for (const [careerName, careerData] of Object.entries(classEntries)) {
        const scheme = careerData.advance_scheme;
        if (!scheme) continue;
        for (const char of CHARACTERISTICS) {
          expect(
            char in scheme,
            `${className} > ${careerName}: missing characteristic key "${char}"`
          ).toBe(true);
        }
      }
    }
  });
});

// ─── Up in Arms — Talent & Skill Properties ────────────────────

describe('Up in Arms — Talent & Skill Properties', () => {
  /**
   * **Validates: Requirements 4.2, 4.5, 5.2, 5.4, 6.8**
   */

  const VALID_CHARACTERISTICS = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

  it('Property 5: Talent Structural Integrity — all talents have non-empty name, max, desc', () => {
    for (const talent of TALENT_DB) {
      expect(talent.name, `Talent has empty name`).toBeTruthy();
      expect(talent.name.length, `Talent name is empty string`).toBeGreaterThan(0);
      expect(talent.max, `Talent "${talent.name}" has empty max`).toBeTruthy();
      expect(talent.max.length, `Talent "${talent.name}" max is empty string`).toBeGreaterThan(0);
      expect(talent.desc, `Talent "${talent.name}" has empty desc`).toBeTruthy();
      expect(talent.desc.length, `Talent "${talent.name}" desc is empty string`).toBeGreaterThan(0);
    }
  });

  it('Property 6: Advanced Skill Structural Integrity — all skills have non-empty n and valid c characteristic', () => {
    for (const skill of ADV_SKILL_DB) {
      expect(skill.n, `Skill has empty n`).toBeTruthy();
      expect(skill.n.length, `Skill n is empty string`).toBeGreaterThan(0);
      expect(
        VALID_CHARACTERISTICS.includes(skill.c),
        `Skill "${skill.n}" has invalid characteristic "${skill.c}" (expected one of: ${VALID_CHARACTERISTICS.join(', ')})`
      ).toBe(true);
    }
  });

  it('Property 7: Career Cross-Reference Integrity — every talent name in career levels exists in TALENT_DB', () => {
    const talentNames = new Set(TALENT_DB.map(t => t.name));

    // Build a set of base talent names (without parenthetical) for matching parameterized talents
    const baseTalentNames = new Set(
      TALENT_DB.map(t => {
        const parenIdx = t.name.indexOf(' (');
        return parenIdx > 0 ? t.name.substring(0, parenIdx) : t.name;
      })
    );

    // Known naming variants between career references and TALENT_DB entries
    // These are handled by the production TALENT_ALIASES map in src/data/talent-aliases.ts

    // Talents referenced in careers that have no equivalent in TALENT_DB at all
    // (pre-existing data gaps from core rulebook or other source books)
    const knownMissing = new Set([
      'Master Craftsman (Herbalist)',
    ]);

    for (const [careerName, scheme] of Object.entries(CAREER_SCHEMES)) {
      const levels = [scheme.level1, scheme.level2, scheme.level3, scheme.level4, scheme.level5].filter(Boolean);
      for (const level of levels) {
        for (const talent of level!.talents) {
          // Skip known pre-existing data gaps
          if (knownMissing.has(talent)) continue;

          // Exact match first
          if (talentNames.has(talent)) continue;

          // Check known aliases (production alias resolution)
          if (TALENT_ALIASES[talent] && talentNames.has(TALENT_ALIASES[talent])) continue;

          // For parameterized talents like "Fearless (Any)", "Hatred (Any)", "Etiquette (Soldiers)"
          // check that the base talent name exists in TALENT_DB (with any specialization)
          const parenIdx = talent.indexOf(' (');
          if (parenIdx > 0) {
            const baseName = talent.substring(0, parenIdx);
            expect(
              baseTalentNames.has(baseName),
              `Career "${careerName}" level "${level!.title}" references talent "${talent}" but no talent with base name "${baseName}" exists in TALENT_DB`
            ).toBe(true);
          } else {
            // No parenthetical and no exact match — fail
            expect(
              talentNames.has(talent),
              `Career "${careerName}" level "${level!.title}" references talent "${talent}" which does not exist in TALENT_DB`
            ).toBe(true);
          }
        }
      }
    }
  });
});

// ─── Up in Arms — Weapon & Spell Properties ────────────────────

describe('Up in Arms — Weapon & Spell Properties', () => {
  /**
   * **Validates: Requirements 8.14, 8.15, 9.2, 9.4, 10.2, 10.6**
   */

  const MELEE_GROUPS = ['Basic', 'Cavalry', 'Fencing', 'Brawling', 'Flail', 'Parry', 'Polearm', 'Two-Handed'];
  const RANGED_GROUPS = ['Sling', 'Bow', 'Crossbow', 'Blackpowder', 'Throwing', 'Entangling', 'Explosives'];
  const EITHER_GROUPS = ['Engineering', 'Ammunition'];
  const ALL_VALID_GROUPS = [...MELEE_GROUPS, ...RANGED_GROUPS, ...EITHER_GROUPS];

  it('Property 8: Weapon Structural Integrity — all weapons have name, group, enc, damage, qualities; melee have rangeReach, ranged have maxR', () => {
    for (const w of WEAPONS) {
      // Core fields
      expect(w.name, `Weapon missing name`).toBeTruthy();
      expect(w.name.length, `Weapon has empty name`).toBeGreaterThan(0);
      expect(ALL_VALID_GROUPS, `"${w.name}" has invalid group "${w.group}"`).toContain(w.group);
      expect(w.enc, `"${w.name}" missing enc`).toBeDefined();
      expect(w.damage, `"${w.name}" missing damage`).toBeDefined();
      expect(w.qualities, `"${w.name}" missing qualities`).toBeDefined();

      // Melee group weapons must have rangeReach
      if (MELEE_GROUPS.includes(w.group)) {
        expect(w.rangeReach, `"${w.name}" (${w.group}) missing rangeReach`).toBeTruthy();
        expect(w.rangeReach!.length, `"${w.name}" (${w.group}) has empty rangeReach`).toBeGreaterThan(0);
      }

      // Ranged group weapons must have maxR
      if (RANGED_GROUPS.includes(w.group)) {
        expect(w.maxR, `"${w.name}" (${w.group}) missing maxR`).toBeDefined();
        expect(w.maxR!.length, `"${w.name}" (${w.group}) has empty maxR`).toBeGreaterThan(0);
      }

      // Engineering/Ammunition: if rangeReach is defined it's melee, if maxR is defined it's ranged
      // Ammunition entries may have neither
      if (EITHER_GROUPS.includes(w.group)) {
        if (w.rangeReach) {
          expect(w.rangeReach.length, `"${w.name}" (${w.group}) has empty rangeReach`).toBeGreaterThan(0);
        }
        if (w.maxR) {
          expect(w.maxR.length, `"${w.name}" (${w.group}) has empty maxR`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('Property 9: Trapping Structural Integrity — all trappings have non-empty name and defined enc', () => {
    for (const t of TRAPPING_LIST) {
      expect(t.name, `Trapping missing name`).toBeTruthy();
      expect(t.name.length, `Trapping has empty name`).toBeGreaterThan(0);
      expect(typeof t.enc, `"${t.name}" enc should be a string`).toBe('string');
      expect(t.enc, `"${t.name}" has undefined enc`).toBeDefined();
    }
  });

  it('Property 10: Spell Structural Integrity — all spells have name, cn, range, target, duration, effect', () => {
    for (const s of SPELL_LIST) {
      expect(s.name, `Spell missing name`).toBeTruthy();
      expect(s.name.length, `Spell has empty name`).toBeGreaterThan(0);
      expect(s.cn, `"${s.name}" missing cn`).toBeDefined();
      expect(s.cn.length, `"${s.name}" has empty cn`).toBeGreaterThan(0);
      expect(s.range, `"${s.name}" missing range`).toBeTruthy();
      expect(s.range.length, `"${s.name}" has empty range`).toBeGreaterThan(0);
      expect(s.target, `"${s.name}" missing target`).toBeTruthy();
      expect(s.target.length, `"${s.name}" has empty target`).toBeGreaterThan(0);
      expect(s.duration, `"${s.name}" missing duration`).toBeTruthy();
      expect(s.duration.length, `"${s.name}" has empty duration`).toBeGreaterThan(0);
      expect(s.effect, `"${s.name}" missing effect`).toBeTruthy();
      expect(s.effect.length, `"${s.name}" has empty effect`).toBeGreaterThan(0);
    }
  });
});


// ─── Up in Arms — Content Presence ─────────────────────────────

describe('Up in Arms — Content Presence', () => {
  /**
   * **Validates: Requirements 1.1, 1.2, 4.4, 5.3, 8.1, 8.10, 8.11, 9.1, 9.3, 10.1, 10.4**
   */

  // --- Careers ---

  const uiaCareers: Array<{ name: string; cls: string }> = [
    { name: 'Archer', cls: 'Warriors' },
    { name: 'Greatsword', cls: 'Warriors' },
    { name: 'Halberdier', cls: 'Warriors' },
    { name: 'Handgunner', cls: 'Warriors' },
    { name: 'Artillerist', cls: 'Academics' },
    { name: 'Camp Follower', cls: 'Rangers' },
    { name: 'Cartographer', cls: 'Academics' },
    { name: 'Freelance', cls: 'Warriors' },
    { name: 'Knight of the Blazing Sun', cls: 'Warriors' },
    { name: 'Knight of the White Wolf', cls: 'Warriors' },
    { name: 'Knight Panther', cls: 'Warriors' },
    { name: 'Light Cavalry', cls: 'Warriors' },
    { name: 'Siege Specialist', cls: 'Warriors' },
    { name: 'Pikeman', cls: 'Warriors' },
    { name: 'Priest of Myrmidia', cls: 'Warriors' },
  ];

  it('all 15 Up in Arms career names exist in CAREER_SCHEMES with correct class assignment', () => {
    for (const { name, cls } of uiaCareers) {
      expect(CAREER_SCHEMES[name], `Missing career: ${name}`).toBeDefined();
      expect(CAREER_SCHEMES[name].class, `Wrong class for ${name}`).toBe(cls);
    }
  });

  it('spot-check: Archer level1 title is "Bowman"', () => {
    expect(CAREER_SCHEMES['Archer'].level1.title).toBe('Bowman');
  });

  it('spot-check: Priest of Myrmidia class is "Warriors"', () => {
    expect(CAREER_SCHEMES['Priest of Myrmidia'].class).toBe('Warriors');
  });

  // --- Weapons ---

  it('new weapons exist: Sword (Basic), (2H) Arquebus (Blackpowder), (2H) Repeater Handgun (Engineering)', () => {
    const sword = WEAPONS.find(w => w.name === 'Sword');
    expect(sword, 'Missing weapon: Sword').toBeDefined();
    expect(sword!.group).toBe('Basic');

    const arquebus = WEAPONS.find(w => w.name === '(2H) Arquebus');
    expect(arquebus, 'Missing weapon: (2H) Arquebus').toBeDefined();
    expect(arquebus!.group).toBe('Blackpowder');

    const repeaterHandgun = WEAPONS.find(w => w.name === '(2H) Repeater Handgun');
    expect(repeaterHandgun, 'Missing weapon: (2H) Repeater Handgun').toBeDefined();
    expect(repeaterHandgun!.group).toBe('Engineering');
  });

  // --- Trappings ---

  const uiaTrappings: Array<{ name: string; enc: string }> = [
    { name: 'Theodolite', enc: '3' },
    { name: 'Ostrich Feather', enc: '0' },
    { name: 'Compass', enc: '0' },
    { name: 'Bandoleer', enc: '1' },
    { name: 'Slow Match', enc: '1' },
    { name: 'Fuse', enc: '1' },
    { name: 'Bow String', enc: '0' },
    { name: 'Whetstone', enc: '0' },
    { name: 'Sealskin', enc: '1' },
    { name: 'Silk Underwear', enc: '0' },
    { name: "Captain Braun's Multi-Stove", enc: '3' },
    { name: "Captain Braun's Insta-Boiler", enc: '2' },
  ];

  it('all 12 Up in Arms trappings exist in TRAPPING_LIST with correct enc values', () => {
    for (const { name, enc } of uiaTrappings) {
      const t = TRAPPING_LIST.find(t => t.name === name);
      expect(t, `Missing trapping: ${name}`).toBeDefined();
      expect(t!.enc, `Wrong enc for ${name}`).toBe(enc);
    }
  });

  // --- Miracles of Myrmidia ---

  const miraclesOfMyrmidia = [
    'Command the Legion',
    'Dismay Foe',
    'In Good Order',
    'Know Your Enemy',
    'On Deadly Ground',
    'Quick Strike',
    "Shieldmaiden's Devotion",
    'Skill of Combat',
    'Vengeful Wrath',
  ];

  it('all Miracles of Myrmidia exist in SPELL_LIST with cn === "-"', () => {
    for (const name of miraclesOfMyrmidia) {
      const spell = SPELL_LIST.find(s => s.name === name);
      expect(spell, `Missing miracle: ${name}`).toBeDefined();
      expect(spell!.cn, `${name} should have cn "-"`).toBe('-');
    }
  });

  // --- Talents ---

  it('new talents (Crew Commander, Demolisher, Flee!) exist in TALENT_DB', () => {
    const newTalents = ['Crew Commander', 'Demolisher', 'Flee!'];
    for (const name of newTalents) {
      const t = TALENT_DB.find(t => t.name === name);
      expect(t, `Missing talent: ${name}`).toBeDefined();
      expect(t!.max, `${name} missing max`).toBeTruthy();
      expect(t!.desc, `${name} missing desc`).toBeTruthy();
    }
  });

  // --- Advanced Skills ---

  it('new advanced skills (Lore (Warfare), Trade (Cartographer)) exist in ADV_SKILL_DB', () => {
    const newSkills = [
      { n: 'Lore (Warfare)', c: 'Int' },
      { n: 'Trade (Cartographer)', c: 'Dex' },
    ];
    for (const { n, c } of newSkills) {
      const skill = ADV_SKILL_DB.find(s => s.n === n);
      expect(skill, `Missing advanced skill: ${n}`).toBeDefined();
      expect(skill!.c, `Wrong characteristic for ${n}`).toBe(c);
    }
  });
});
