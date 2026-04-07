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

// ─── Species Data ───────────────────────────────────────────────

describe('Species Data', () => {
  const expectedSpecies = ['Human / Reiklander', 'Dwarf', 'Halfling', 'High Elf', 'Wood Elf'];

  it('contains all 5 species', () => {
    expect(SPECIES_OPTIONS).toHaveLength(5);
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
