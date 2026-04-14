import { describe, it, expect } from 'vitest';
import { RUNE_CATALOGUE } from '../runes';


// ─── Rune Catalogue — Category Counts ───────────────────────────
// Validates: Requirements 1.1, 1.2, 1.3

describe('Rune Catalogue — Category Counts', () => {
  it('contains exactly 12 weapon runes', () => {
    const weaponRunes = RUNE_CATALOGUE.filter(r => r.category === 'weapon');
    expect(weaponRunes).toHaveLength(12);
  });

  it('contains exactly 8 armour runes', () => {
    const armourRunes = RUNE_CATALOGUE.filter(r => r.category === 'armour');
    expect(armourRunes).toHaveLength(8);
  });

  it('contains exactly 5 talisman runes', () => {
    const talismanRunes = RUNE_CATALOGUE.filter(r => r.category === 'talisman');
    expect(talismanRunes).toHaveLength(5);
  });

  it('contains 25 total runes', () => {
    expect(RUNE_CATALOGUE).toHaveLength(25);
  });
});

// ─── Rune Catalogue — Named Entries ─────────────────────────────
// Validates: Requirements 1.1, 1.2, 1.3

describe('Rune Catalogue — Named Entries', () => {
  const expectedWeaponRunes = [
    'Rune of Might', 'Rune of Speed', 'Rune of Striking', 'Rune of Fury',
    'Rune of Fire', 'Rune of Cleaving', 'Rune of Grudges', 'Rune of Parrying',
    'Master Rune of Skalf Blackhammer', 'Master Rune of Alaric the Mad',
    'Master Rune of Swiftness', 'Master Rune of Snorri Spangelhelm',
  ];

  const expectedArmourRunes = [
    'Rune of Stone', 'Rune of Iron', 'Rune of Fortitude', 'Rune of Shielding',
    'Rune of Resistance', 'Master Rune of Gromril', 'Master Rune of Adamant',
    'Master Rune of Steel',
  ];

  const expectedTalismanRunes = [
    'Rune of Luck', 'Rune of Spellbreaking', 'Rune of Warding',
    'Master Rune of Spite', 'Master Rune of Balance',
  ];

  it('contains all expected weapon runes by name', () => {
    const names = RUNE_CATALOGUE.filter(r => r.category === 'weapon').map(r => r.name);
    for (const name of expectedWeaponRunes) {
      expect(names, `Missing weapon rune: ${name}`).toContain(name);
    }
  });

  it('contains all expected armour runes by name', () => {
    const names = RUNE_CATALOGUE.filter(r => r.category === 'armour').map(r => r.name);
    for (const name of expectedArmourRunes) {
      expect(names, `Missing armour rune: ${name}`).toContain(name);
    }
  });

  it('contains all expected talisman runes by name', () => {
    const names = RUNE_CATALOGUE.filter(r => r.category === 'talisman').map(r => r.name);
    for (const name of expectedTalismanRunes) {
      expect(names, `Missing talisman rune: ${name}`).toContain(name);
    }
  });
});

// ─── Rune Catalogue — Required Fields ───────────────────────────
// Validates: Requirements 1.4

describe('Rune Catalogue — Required Fields', () => {
  it('every rune has a non-empty id', () => {
    for (const rune of RUNE_CATALOGUE) {
      expect(rune.id, `Rune missing id: ${rune.name}`).toBeTruthy();
      expect(typeof rune.id).toBe('string');
    }
  });

  it('every rune has a non-empty name', () => {
    for (const rune of RUNE_CATALOGUE) {
      expect(rune.name).toBeTruthy();
      expect(typeof rune.name).toBe('string');
    }
  });

  it('every rune has a valid category', () => {
    const validCategories = ['weapon', 'armour', 'talisman'];
    for (const rune of RUNE_CATALOGUE) {
      expect(validCategories, `Invalid category for ${rune.name}: ${rune.category}`).toContain(rune.category);
    }
  });

  it('every rune has a boolean isMaster field', () => {
    for (const rune of RUNE_CATALOGUE) {
      expect(typeof rune.isMaster, `isMaster not boolean for ${rune.name}`).toBe('boolean');
    }
  });

  it('every rune has a positive integer maxPerItem', () => {
    for (const rune of RUNE_CATALOGUE) {
      expect(rune.maxPerItem, `${rune.name} maxPerItem`).toBeGreaterThan(0);
      expect(Number.isInteger(rune.maxPerItem), `${rune.name} maxPerItem not integer`).toBe(true);
    }
  });

  it('every rune has a positive xpCost', () => {
    for (const rune of RUNE_CATALOGUE) {
      expect(rune.xpCost, `${rune.name} xpCost`).toBeGreaterThan(0);
    }
  });

  it('every rune has a non-empty effects array', () => {
    for (const rune of RUNE_CATALOGUE) {
      expect(Array.isArray(rune.effects), `${rune.name} effects not array`).toBe(true);
      expect(rune.effects.length, `${rune.name} has no effects`).toBeGreaterThan(0);
    }
  });

  it('every rune has a non-empty description', () => {
    for (const rune of RUNE_CATALOGUE) {
      expect(rune.description, `${rune.name} missing description`).toBeTruthy();
      expect(typeof rune.description).toBe('string');
    }
  });
});

// ─── Rune Catalogue — XP Cost Rules ────────────────────────────
// Validates: Requirements 1.4

describe('Rune Catalogue — XP Cost Rules', () => {
  it('standard runes cost 50 XP', () => {
    const standard = RUNE_CATALOGUE.filter(r => !r.isMaster);
    for (const rune of standard) {
      expect(rune.xpCost, `${rune.name} should cost 50 XP`).toBe(50);
    }
  });

  it('Master Runes cost 100 XP', () => {
    const masters = RUNE_CATALOGUE.filter(r => r.isMaster);
    for (const rune of masters) {
      expect(rune.xpCost, `${rune.name} should cost 100 XP`).toBe(100);
    }
  });
});

// ─── Rune Catalogue — Effect Validity ───────────────────────────
// Validates: Requirements 1.5

describe('Rune Catalogue — Effect Validity', () => {
  const validEffectTypes = ['damage', 'ap', 'characteristic', 'quality', 'special'];

  it('every effect has a valid type', () => {
    for (const rune of RUNE_CATALOGUE) {
      for (const effect of rune.effects) {
        expect(validEffectTypes, `Invalid effect type "${effect.type}" on ${rune.name}`).toContain(effect.type);
      }
    }
  });

  it('every effect has a numeric value field', () => {
    for (const rune of RUNE_CATALOGUE) {
      for (const effect of rune.effects) {
        expect(typeof effect.value, `${rune.name} effect value not number`).toBe('number');
      }
    }
  });

  it('damage effects have a positive value', () => {
    for (const rune of RUNE_CATALOGUE) {
      for (const effect of rune.effects) {
        if (effect.type === 'damage') {
          expect(effect.value, `${rune.name} damage effect should be positive`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('ap effects have a positive value', () => {
    for (const rune of RUNE_CATALOGUE) {
      for (const effect of rune.effects) {
        if (effect.type === 'ap') {
          expect(effect.value, `${rune.name} AP effect should be positive`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('characteristic effects have a valid characteristic key and positive value', () => {
    const validChars = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];
    for (const rune of RUNE_CATALOGUE) {
      for (const effect of rune.effects) {
        if (effect.type === 'characteristic') {
          expect(effect.characteristic, `${rune.name} characteristic effect missing key`).toBeTruthy();
          expect(validChars, `${rune.name} invalid characteristic: ${effect.characteristic}`).toContain(effect.characteristic);
          expect(effect.value, `${rune.name} characteristic value should be positive`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('quality effects have a non-empty quality string', () => {
    for (const rune of RUNE_CATALOGUE) {
      for (const effect of rune.effects) {
        if (effect.type === 'quality') {
          expect(effect.quality, `${rune.name} quality effect missing quality string`).toBeTruthy();
          expect(typeof effect.quality).toBe('string');
        }
      }
    }
  });
});

// ─── Rune Catalogue — No Duplicate IDs ──────────────────────────
// Validates: Requirements 1.4

describe('Rune Catalogue — No Duplicate IDs', () => {
  it('all rune IDs are unique', () => {
    const ids = RUNE_CATALOGUE.map(r => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all rune names are unique', () => {
    const names = RUNE_CATALOGUE.map(r => r.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});
