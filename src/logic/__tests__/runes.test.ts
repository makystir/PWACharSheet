import { describe, it, expect } from 'vitest';
import { getRuneById, getRunesByCategory, validateRunePlacement } from '../runes';
import { RUNE_CATALOGUE } from '../../data/runes';

// ─── Catalogue Lookup: getRuneById ──────────────────────────────
// Validates: Requirements 1.4, 1.5

describe('getRuneById', () => {
  it('returns the correct rune for a known weapon rune ID', () => {
    const rune = getRuneById('rune-of-might');
    expect(rune).toBeDefined();
    expect(rune!.name).toBe('Rune of Might');
    expect(rune!.category).toBe('weapon');
  });

  it('returns the correct rune for a known armour rune ID', () => {
    const rune = getRuneById('rune-of-stone');
    expect(rune).toBeDefined();
    expect(rune!.name).toBe('Rune of Stone');
    expect(rune!.category).toBe('armour');
  });

  it('returns the correct rune for a known talisman rune ID', () => {
    const rune = getRuneById('rune-of-luck');
    expect(rune).toBeDefined();
    expect(rune!.name).toBe('Rune of Luck');
    expect(rune!.category).toBe('talisman');
  });

  it('returns the correct rune for a Master Rune ID', () => {
    const rune = getRuneById('master-rune-of-skalf-blackhammer');
    expect(rune).toBeDefined();
    expect(rune!.name).toBe('Master Rune of Skalf Blackhammer');
    expect(rune!.isMaster).toBe(true);
  });

  it('returns undefined for an unknown rune ID', () => {
    expect(getRuneById('nonexistent-rune')).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(getRuneById('')).toBeUndefined();
  });

  it('can retrieve every rune in the catalogue by its ID', () => {
    for (const rune of RUNE_CATALOGUE) {
      const found = getRuneById(rune.id);
      expect(found, `Failed to find rune: ${rune.id}`).toBeDefined();
      expect(found!.id).toBe(rune.id);
    }
  });
});

// ─── Catalogue Lookup: getRunesByCategory ───────────────────────
// Validates: Requirements 1.4, 1.5

describe('getRunesByCategory', () => {
  it('returns all 12 weapon runes', () => {
    const runes = getRunesByCategory('weapon');
    expect(runes).toHaveLength(12);
    for (const rune of runes) {
      expect(rune.category).toBe('weapon');
    }
  });

  it('returns all 8 armour runes', () => {
    const runes = getRunesByCategory('armour');
    expect(runes).toHaveLength(8);
    for (const rune of runes) {
      expect(rune.category).toBe('armour');
    }
  });

  it('returns all 5 talisman runes', () => {
    const runes = getRunesByCategory('talisman');
    expect(runes).toHaveLength(5);
    for (const rune of runes) {
      expect(rune.category).toBe('talisman');
    }
  });

  it('returns runes with all required fields', () => {
    const runes = getRunesByCategory('weapon');
    for (const rune of runes) {
      expect(rune.id).toBeTruthy();
      expect(rune.name).toBeTruthy();
      expect(rune.effects.length).toBeGreaterThan(0);
      expect(rune.xpCost).toBeGreaterThan(0);
    }
  });
});

// ─── Validation: validateRunePlacement ──────────────────────────

// Property 1: Maximum 3 runes per item
// Validates: Requirements 2.3, 3.3, 8.1
describe('validateRunePlacement — Property 1: max 3 runes per item', () => {
  it('allows a rune on an item with 0 runes', () => {
    const result = validateRunePlacement('rune-of-might', [], 'weapon');
    expect(result.valid).toBe(true);
  });

  it('allows a rune on an item with 1 rune', () => {
    const result = validateRunePlacement('rune-of-speed', ['rune-of-might'], 'weapon');
    expect(result.valid).toBe(true);
  });

  it('allows a rune on an item with 2 runes', () => {
    const result = validateRunePlacement('rune-of-fury', ['rune-of-might', 'rune-of-speed'], 'weapon');
    expect(result.valid).toBe(true);
  });

  it('rejects a rune on an item with 3 runes', () => {
    const result = validateRunePlacement(
      'rune-of-fire',
      ['rune-of-might', 'rune-of-speed', 'rune-of-fury'],
      'weapon'
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe('This item already has the maximum of 3 runes.');
  });

  it('rejects on armour with 3 runes too', () => {
    const result = validateRunePlacement(
      'rune-of-stone',
      ['rune-of-iron', 'rune-of-fortitude', 'rune-of-shielding'],
      'armour'
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe('This item already has the maximum of 3 runes.');
  });
});

// Property 2: Maximum 1 Master Rune per item
// Validates: Requirements 2.4, 3.4, 8.2
describe('validateRunePlacement — Property 2: max 1 Master Rune per item', () => {
  it('rejects a second Master Rune on a weapon', () => {
    const result = validateRunePlacement(
      'master-rune-of-alaric-the-mad',
      ['master-rune-of-skalf-blackhammer'],
      'weapon'
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe('This item already has a Master Rune. Only one Master Rune is allowed per item.');
  });

  it('rejects a second Master Rune on armour', () => {
    const result = validateRunePlacement(
      'master-rune-of-adamant',
      ['master-rune-of-gromril'],
      'armour'
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe('This item already has a Master Rune. Only one Master Rune is allowed per item.');
  });

  it('allows a standard rune when a Master Rune is already present', () => {
    const result = validateRunePlacement(
      'rune-of-might',
      ['master-rune-of-skalf-blackhammer'],
      'weapon'
    );
    expect(result.valid).toBe(true);
  });

  it('allows a first Master Rune on an empty item', () => {
    const result = validateRunePlacement('master-rune-of-skalf-blackhammer', [], 'weapon');
    expect(result.valid).toBe(true);
  });

  it('allows a first Master Rune alongside standard runes', () => {
    const result = validateRunePlacement(
      'master-rune-of-skalf-blackhammer',
      ['rune-of-might', 'rune-of-speed'],
      'weapon'
    );
    expect(result.valid).toBe(true);
  });
});

// Property 8: Per-rune maxPerItem enforcement
// Validates: Requirements 8.3
describe('validateRunePlacement — Property 8: per-rune maxPerItem limit', () => {
  it('rejects a rune that has reached its maxPerItem on the item', () => {
    // rune-of-might has maxPerItem=1
    const result = validateRunePlacement('rune-of-might', ['rune-of-might'], 'weapon');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('This rune has already been inscribed the maximum number of times on this item.');
  });

  it('allows a different rune even when another rune is at its limit', () => {
    const result = validateRunePlacement('rune-of-speed', ['rune-of-might'], 'weapon');
    expect(result.valid).toBe(true);
  });
});

// Property 9: Category restriction enforcement
// Validates: Requirements 8.4, 8.5
describe('validateRunePlacement — Property 9: category restrictions', () => {
  it('rejects a weapon rune on armour', () => {
    const result = validateRunePlacement('rune-of-might', [], 'armour');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Weapon runes cannot be placed on armour.');
  });

  it('rejects an armour rune on a weapon', () => {
    const result = validateRunePlacement('rune-of-stone', [], 'weapon');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Armour runes cannot be placed on weapons.');
  });

  it('allows a weapon rune on a weapon', () => {
    const result = validateRunePlacement('rune-of-might', [], 'weapon');
    expect(result.valid).toBe(true);
  });

  it('allows an armour rune on armour', () => {
    const result = validateRunePlacement('rune-of-stone', [], 'armour');
    expect(result.valid).toBe(true);
  });
});

// Property 10: Talismanic runes valid on both item types
// Validates: Requirements 10.3
describe('validateRunePlacement — Property 10: talismanic runes on both types', () => {
  it('allows a talisman rune on a weapon', () => {
    const result = validateRunePlacement('rune-of-luck', [], 'weapon');
    expect(result.valid).toBe(true);
  });

  it('allows a talisman rune on armour', () => {
    const result = validateRunePlacement('rune-of-luck', [], 'armour');
    expect(result.valid).toBe(true);
  });

  it('allows a Master talisman rune on a weapon', () => {
    const result = validateRunePlacement('master-rune-of-spite', [], 'weapon');
    expect(result.valid).toBe(true);
  });

  it('allows a Master talisman rune on armour', () => {
    const result = validateRunePlacement('master-rune-of-spite', [], 'armour');
    expect(result.valid).toBe(true);
  });
});

// Edge case: unknown rune ID
describe('validateRunePlacement — edge cases', () => {
  it('rejects an unknown rune ID', () => {
    const result = validateRunePlacement('nonexistent-rune', [], 'weapon');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Unknown rune.');
  });
});

// ─── Filtering: getAvailableRunesForItem ────────────────────────

import { getAvailableRunesForItem } from '../runes';

// Property 3: Category-aware rune filtering
// Validates: Requirements 2.5, 3.5, 15.1, 15.2
describe('getAvailableRunesForItem — Property 3: category-aware filtering', () => {
  const weaponRuneId = 'rune-of-might';
  const armourRuneId = 'rune-of-stone';
  const talismanRuneId = 'rune-of-luck';

  it('returns only weapon + talisman runes for a weapon item', () => {
    const knownRunes = [weaponRuneId, armourRuneId, talismanRuneId];
    const result = getAvailableRunesForItem('weapon', [], knownRunes);

    const categories = result.map(r => r.category);
    expect(categories).toContain('weapon');
    expect(categories).toContain('talisman');
    expect(categories).not.toContain('armour');
  });

  it('returns only armour + talisman runes for an armour item', () => {
    const knownRunes = [weaponRuneId, armourRuneId, talismanRuneId];
    const result = getAvailableRunesForItem('armour', [], knownRunes);

    const categories = result.map(r => r.category);
    expect(categories).toContain('armour');
    expect(categories).toContain('talisman');
    expect(categories).not.toContain('weapon');
  });

  it('returns empty array when knownRunes is empty', () => {
    const result = getAvailableRunesForItem('weapon', [], []);
    expect(result).toEqual([]);
  });

  it('excludes runes not in knownRunes', () => {
    const result = getAvailableRunesForItem('weapon', [], [weaponRuneId]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(weaponRuneId);
  });

  it('all returned runes are present in knownRunes', () => {
    const knownRunes = [weaponRuneId, 'rune-of-speed', talismanRuneId];
    const result = getAvailableRunesForItem('weapon', [], knownRunes);

    for (const rune of result) {
      expect(knownRunes).toContain(rune.id);
    }
  });

  it('excludes runes that would fail validation (item already full)', () => {
    const knownRunes = [weaponRuneId, 'rune-of-speed', 'rune-of-fury', 'rune-of-fire'];
    const currentRunes = ['rune-of-speed', 'rune-of-fury', 'rune-of-fire'];
    const result = getAvailableRunesForItem('weapon', currentRunes, knownRunes);
    expect(result).toEqual([]);
  });

  it('excludes runes that would fail validation (master rune already present)', () => {
    const knownRunes = ['master-rune-of-skalf-blackhammer', 'master-rune-of-swiftness', weaponRuneId];
    const currentRunes = ['master-rune-of-skalf-blackhammer'];
    const result = getAvailableRunesForItem('weapon', currentRunes, knownRunes);

    // Should include the standard weapon rune but not the second master rune
    expect(result.find(r => r.id === weaponRuneId)).toBeDefined();
    expect(result.find(r => r.id === 'master-rune-of-swiftness')).toBeUndefined();
  });

  it('excludes runes that would fail validation (maxPerItem reached)', () => {
    const knownRunes = [weaponRuneId, 'rune-of-speed'];
    const currentRunes = [weaponRuneId]; // rune-of-might already on item (maxPerItem=1)
    const result = getAvailableRunesForItem('weapon', currentRunes, knownRunes);

    expect(result.find(r => r.id === weaponRuneId)).toBeUndefined();
    expect(result.find(r => r.id === 'rune-of-speed')).toBeDefined();
  });

  it('returns talisman runes for both weapon and armour items', () => {
    const knownRunes = [talismanRuneId];
    const weaponResult = getAvailableRunesForItem('weapon', [], knownRunes);
    const armourResult = getAvailableRunesForItem('armour', [], knownRunes);

    expect(weaponResult).toHaveLength(1);
    expect(weaponResult[0].id).toBe(talismanRuneId);
    expect(armourResult).toHaveLength(1);
    expect(armourResult[0].id).toBe(talismanRuneId);
  });
});


// ─── Effect Calculation ─────────────────────────────────────────

import {
  getRuneDamageBonus,
  getRuneAPBonus,
  getRuneCharacteristicBonuses,
  getRuneQualities,
  aggregateAllRuneEffects,
} from '../runes';
import type { WeaponItem, ArmourItem } from '../../types/character';

// Property 4: Rune damage bonus aggregation
// Validates: Requirements 4.1, 4.2
describe('getRuneDamageBonus — Property 4: damage bonus aggregation', () => {
  it('returns 0 for an empty rune list', () => {
    expect(getRuneDamageBonus([])).toBe(0);
  });

  it('returns the correct bonus for a single damage rune', () => {
    // rune-of-might: +1 damage
    expect(getRuneDamageBonus(['rune-of-might'])).toBe(1);
  });

  it('sums damage bonuses from multiple damage runes', () => {
    // rune-of-might (+1) + rune-of-cleaving (+2) = 3
    expect(getRuneDamageBonus(['rune-of-might', 'rune-of-cleaving'])).toBe(3);
  });

  it('returns the correct bonus for a Master damage rune', () => {
    // master-rune-of-skalf-blackhammer: +3 damage
    expect(getRuneDamageBonus(['master-rune-of-skalf-blackhammer'])).toBe(3);
  });

  it('ignores runes that have no damage effects', () => {
    // rune-of-speed has characteristic effect, not damage
    expect(getRuneDamageBonus(['rune-of-speed'])).toBe(0);
  });

  it('sums only damage effects, ignoring other effect types', () => {
    // rune-of-might (+1 damage) + rune-of-fury (quality, no damage) = 1
    expect(getRuneDamageBonus(['rune-of-might', 'rune-of-fury'])).toBe(1);
  });

  it('gracefully ignores unknown rune IDs', () => {
    expect(getRuneDamageBonus(['nonexistent-rune'])).toBe(0);
  });

  it('gracefully ignores unknown IDs mixed with valid ones', () => {
    expect(getRuneDamageBonus(['nonexistent-rune', 'rune-of-might'])).toBe(1);
  });
});

// Property 5: Rune AP bonus
// Validates: Requirements 5.1, 5.2
describe('getRuneAPBonus — Property 5: AP bonus aggregation', () => {
  it('returns 0 for an empty rune list', () => {
    expect(getRuneAPBonus([])).toBe(0);
  });

  it('returns the correct bonus for a single AP rune', () => {
    // rune-of-stone: +1 AP
    expect(getRuneAPBonus(['rune-of-stone'])).toBe(1);
  });

  it('sums AP bonuses from multiple AP runes', () => {
    // rune-of-stone (+1) + rune-of-iron (+1) = 2
    expect(getRuneAPBonus(['rune-of-stone', 'rune-of-iron'])).toBe(2);
  });

  it('returns the correct bonus for a Master AP rune', () => {
    // master-rune-of-gromril: +2 AP
    expect(getRuneAPBonus(['master-rune-of-gromril'])).toBe(2);
  });

  it('returns the correct bonus for master-rune-of-steel', () => {
    // master-rune-of-steel: +3 AP
    expect(getRuneAPBonus(['master-rune-of-steel'])).toBe(3);
  });

  it('ignores runes that have no AP effects', () => {
    // rune-of-fortitude has characteristic effect, not AP
    expect(getRuneAPBonus(['rune-of-fortitude'])).toBe(0);
  });

  it('gracefully ignores unknown rune IDs', () => {
    expect(getRuneAPBonus(['nonexistent-rune'])).toBe(0);
  });

  it('gracefully ignores unknown IDs mixed with valid ones', () => {
    expect(getRuneAPBonus(['nonexistent-rune', 'rune-of-stone'])).toBe(1);
  });
});

// Property 6: Rune characteristic bonus aggregation
// Validates: Requirements 6.1, 6.2
describe('getRuneCharacteristicBonuses — Property 6: characteristic bonus aggregation', () => {
  it('returns empty object when no items have runes', () => {
    const weapons: WeaponItem[] = [{ name: 'Axe', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '' }];
    const armour: ArmourItem[] = [{ name: 'Mail', locations: 'Body', enc: '3', ap: 3, qualities: '' }];
    expect(getRuneCharacteristicBonuses(weapons, armour)).toEqual({});
  });

  it('returns correct bonus from a single weapon rune', () => {
    const weapons: WeaponItem[] = [{
      name: 'Axe', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '',
      runes: ['rune-of-striking'], // +10 WS
    }];
    const result = getRuneCharacteristicBonuses(weapons, []);
    expect(result).toEqual({ WS: 10 });
  });

  it('returns correct bonus from a single armour rune', () => {
    const armour: ArmourItem[] = [{
      name: 'Mail', locations: 'Body', enc: '3', ap: 3, qualities: '',
      runes: ['rune-of-fortitude'], // +10 T
    }];
    const result = getRuneCharacteristicBonuses([], armour);
    expect(result).toEqual({ T: 10 });
  });

  it('sums bonuses to the same characteristic from multiple items', () => {
    const weapons: WeaponItem[] = [{
      name: 'Axe', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '',
      runes: ['rune-of-speed'], // +10 I
    }];
    const armour: ArmourItem[] = [{
      name: 'Mail', locations: 'Body', enc: '3', ap: 3, qualities: '',
      runes: ['rune-of-fortitude'], // +10 T
    }];
    const result = getRuneCharacteristicBonuses(weapons, armour);
    expect(result).toEqual({ I: 10, T: 10 });
  });

  it('handles items without runes field (backward compatibility)', () => {
    const weapons: WeaponItem[] = [{ name: 'Axe', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '' }];
    const armour: ArmourItem[] = [{ name: 'Mail', locations: 'Body', enc: '3', ap: 3, qualities: '' }];
    expect(getRuneCharacteristicBonuses(weapons, armour)).toEqual({});
  });

  it('ignores unknown rune IDs on items', () => {
    const weapons: WeaponItem[] = [{
      name: 'Axe', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '',
      runes: ['nonexistent-rune'],
    }];
    expect(getRuneCharacteristicBonuses(weapons, [])).toEqual({});
  });
});

// Property 7: Rune quality aggregation
// Validates: Requirements 7.1
describe('getRuneQualities — Property 7: quality aggregation', () => {
  it('returns empty array for an empty rune list', () => {
    expect(getRuneQualities([])).toEqual([]);
  });

  it('returns the correct quality for a single quality rune', () => {
    // rune-of-fury adds Impact
    expect(getRuneQualities(['rune-of-fury'])).toEqual(['Impact']);
  });

  it('returns multiple qualities from multiple runes', () => {
    // rune-of-fury (Impact) + rune-of-fire (Flaming)
    const result = getRuneQualities(['rune-of-fury', 'rune-of-fire']);
    expect(result).toEqual(['Impact', 'Flaming']);
  });

  it('returns quality from a Master quality rune', () => {
    // master-rune-of-alaric-the-mad adds Penetrating
    expect(getRuneQualities(['master-rune-of-alaric-the-mad'])).toEqual(['Penetrating']);
  });

  it('ignores runes that have no quality effects', () => {
    // rune-of-might has damage effect, not quality
    expect(getRuneQualities(['rune-of-might'])).toEqual([]);
  });

  it('returns only quality effects, ignoring other types', () => {
    // rune-of-fury (quality: Impact) + rune-of-might (damage, no quality)
    expect(getRuneQualities(['rune-of-fury', 'rune-of-might'])).toEqual(['Impact']);
  });

  it('gracefully ignores unknown rune IDs', () => {
    expect(getRuneQualities(['nonexistent-rune'])).toEqual([]);
  });
});

// Property 11: Rune effect aggregation across all equipment
// Validates: Requirements 12.1
describe('aggregateAllRuneEffects — Property 11: full aggregation', () => {
  it('returns empty aggregation when no items have runes', () => {
    const weapons: WeaponItem[] = [{ name: 'Axe', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '' }];
    const armour: ArmourItem[] = [{ name: 'Mail', locations: 'Body', enc: '3', ap: 3, qualities: '' }];
    const result = aggregateAllRuneEffects(weapons, armour);
    expect(result.damageByWeapon).toEqual([]);
    expect(result.apByArmour).toEqual([]);
    expect(result.characteristics).toEqual({});
    expect(result.qualities).toEqual([]);
    expect(result.special).toEqual([]);
  });

  it('collects damage bonuses grouped by weapon', () => {
    const weapons: WeaponItem[] = [
      { name: 'Axe', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '', runes: ['rune-of-might', 'rune-of-cleaving'] },
      { name: 'Sword', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '', runes: ['rune-of-might'] },
    ];
    const result = aggregateAllRuneEffects(weapons, []);
    expect(result.damageByWeapon).toEqual([
      { weaponName: 'Axe', bonus: 3 },
      { weaponName: 'Sword', bonus: 1 },
    ]);
  });

  it('collects AP bonuses grouped by armour', () => {
    const armour: ArmourItem[] = [
      { name: 'Mail', locations: 'Body', enc: '3', ap: 3, qualities: '', runes: ['rune-of-stone', 'rune-of-iron'] },
      { name: 'Helm', locations: 'Head', enc: '1', ap: 1, qualities: '', runes: ['master-rune-of-gromril'] },
    ];
    const result = aggregateAllRuneEffects([], armour);
    expect(result.apByArmour).toEqual([
      { armourName: 'Mail', bonus: 2 },
      { armourName: 'Helm', bonus: 2 },
    ]);
  });

  it('collects characteristic bonuses across all items', () => {
    const weapons: WeaponItem[] = [{
      name: 'Axe', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '',
      runes: ['rune-of-striking'], // +10 WS
    }];
    const armour: ArmourItem[] = [{
      name: 'Mail', locations: 'Body', enc: '3', ap: 3, qualities: '',
      runes: ['rune-of-fortitude'], // +10 T
    }];
    const result = aggregateAllRuneEffects(weapons, armour);
    expect(result.characteristics).toEqual({ WS: 10, T: 10 });
  });

  it('collects qualities grouped by weapon', () => {
    const weapons: WeaponItem[] = [{
      name: 'Axe', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '',
      runes: ['rune-of-fury', 'rune-of-fire'], // Impact, Flaming
    }];
    const result = aggregateAllRuneEffects(weapons, []);
    expect(result.qualities).toEqual([
      { weaponName: 'Axe', qualities: ['Impact', 'Flaming'] },
    ]);
  });

  it('collects special effects from weapons and armour', () => {
    const weapons: WeaponItem[] = [{
      name: 'Axe', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '',
      runes: ['rune-of-grudges'], // special: +1 Damage vs Greenskins
    }];
    const armour: ArmourItem[] = [{
      name: 'Mail', locations: 'Body', enc: '3', ap: 3, qualities: '',
      runes: ['rune-of-shielding'], // special: ward save
    }];
    const result = aggregateAllRuneEffects(weapons, armour);
    expect(result.special).toEqual([
      { itemName: 'Axe', description: '+1 Damage vs Greenskins' },
      { itemName: 'Mail', description: 'Provides a ward save against attacks' },
    ]);
  });

  it('handles mixed rune types across weapons and armour', () => {
    const weapons: WeaponItem[] = [{
      name: 'Runic Axe', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '',
      runes: ['rune-of-might', 'rune-of-fury', 'rune-of-speed'], // damage+1, quality:Impact, char:I+10
    }];
    const armour: ArmourItem[] = [{
      name: 'Runic Mail', locations: 'Body', enc: '3', ap: 3, qualities: '',
      runes: ['rune-of-stone', 'rune-of-fortitude', 'rune-of-shielding'], // ap+1, char:T+10, special
    }];
    const result = aggregateAllRuneEffects(weapons, armour);

    expect(result.damageByWeapon).toEqual([{ weaponName: 'Runic Axe', bonus: 1 }]);
    expect(result.apByArmour).toEqual([{ armourName: 'Runic Mail', bonus: 1 }]);
    expect(result.characteristics).toEqual({ I: 10, T: 10 });
    expect(result.qualities).toEqual([{ weaponName: 'Runic Axe', qualities: ['Impact'] }]);
    expect(result.special).toEqual([{ itemName: 'Runic Mail', description: 'Provides a ward save against attacks' }]);
  });

  it('skips items with empty runes arrays', () => {
    const weapons: WeaponItem[] = [
      { name: 'Plain Sword', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '', runes: [] },
      { name: 'Runic Axe', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '', runes: ['rune-of-might'] },
    ];
    const result = aggregateAllRuneEffects(weapons, []);
    expect(result.damageByWeapon).toEqual([{ weaponName: 'Runic Axe', bonus: 1 }]);
  });

  it('handles items without runes field (backward compatibility)', () => {
    const weapons: WeaponItem[] = [{ name: 'Axe', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '' }];
    const armour: ArmourItem[] = [{ name: 'Mail', locations: 'Body', enc: '3', ap: 3, qualities: '' }];
    const result = aggregateAllRuneEffects(weapons, armour);
    expect(result.damageByWeapon).toEqual([]);
    expect(result.apByArmour).toEqual([]);
    expect(result.characteristics).toEqual({});
    expect(result.qualities).toEqual([]);
    expect(result.special).toEqual([]);
  });
});


// ─── Learning: canLearnRune, learnRune ──────────────────────────

import { canLearnRune, learnRune } from '../runes';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character } from '../../types/character';

function makeCharacter(overrides: Partial<Character>): Character {
  return { ...BLANK_CHARACTER, ...overrides };
}

// Property 12: Talent prerequisite validation
// Validates: Requirements 14.1, 14.2
describe('canLearnRune — Property 12: talent prerequisite validation', () => {
  it('returns canLearn: false for a standard rune without Rune Magic talent', () => {
    const char = makeCharacter({ xpCur: 200, talents: [] });
    const result = canLearnRune('rune-of-might', char);
    expect(result.canLearn).toBe(false);
    expect(result.error).toBe('Requires Rune Magic talent.');
  });

  it('returns canLearn: true for a standard rune with Rune Magic talent', () => {
    const char = makeCharacter({
      xpCur: 200,
      talents: [{ n: 'Rune Magic', lvl: 1, desc: '' }],
    });
    const result = canLearnRune('rune-of-might', char);
    expect(result.canLearn).toBe(true);
  });

  it('returns canLearn: false for a Master Rune without Master Rune Magic talent', () => {
    const char = makeCharacter({
      xpCur: 200,
      talents: [{ n: 'Rune Magic', lvl: 1, desc: '' }],
    });
    const result = canLearnRune('master-rune-of-skalf-blackhammer', char);
    expect(result.canLearn).toBe(false);
    expect(result.error).toBe('Requires Master Rune Magic talent.');
  });

  it('returns canLearn: true for a Master Rune with Master Rune Magic talent', () => {
    const char = makeCharacter({
      xpCur: 200,
      talents: [
        { n: 'Rune Magic', lvl: 1, desc: '' },
        { n: 'Master Rune Magic', lvl: 1, desc: '' },
      ],
    });
    const result = canLearnRune('master-rune-of-skalf-blackhammer', char);
    expect(result.canLearn).toBe(true);
  });

  it('recognises talent names that start with "Rune Magic" (e.g. specialisations)', () => {
    const char = makeCharacter({
      xpCur: 200,
      talents: [{ n: 'Rune Magic (Weapon)', lvl: 1, desc: '' }],
    });
    const result = canLearnRune('rune-of-might', char);
    expect(result.canLearn).toBe(true);
  });
});

// Property 13: Rune learning deducts XP and updates knownRunes
// Validates: Requirements 14.4
describe('learnRune — Property 13: XP deduction and knownRunes update', () => {
  it('deducts XP and adds rune to knownRunes for a standard rune', () => {
    const char = makeCharacter({
      xpCur: 200,
      xpSpent: 50,
      talents: [{ n: 'Rune Magic', lvl: 1, desc: '' }],
      knownRunes: [],
    });
    const result = learnRune(char, 'rune-of-might');
    expect(result.xpCur).toBe(150); // 200 - 50
    expect(result.xpSpent).toBe(100); // 50 + 50
    expect(result.knownRunes).toContain('rune-of-might');
  });

  it('deducts XP and adds rune to knownRunes for a Master Rune', () => {
    const char = makeCharacter({
      xpCur: 300,
      xpSpent: 100,
      talents: [
        { n: 'Rune Magic', lvl: 1, desc: '' },
        { n: 'Master Rune Magic', lvl: 1, desc: '' },
      ],
      knownRunes: [],
    });
    const result = learnRune(char, 'master-rune-of-skalf-blackhammer');
    expect(result.xpCur).toBe(200); // 300 - 100
    expect(result.xpSpent).toBe(200); // 100 + 100
    expect(result.knownRunes).toContain('master-rune-of-skalf-blackhammer');
  });

  it('preserves existing knownRunes when learning a new rune', () => {
    const char = makeCharacter({
      xpCur: 200,
      xpSpent: 50,
      talents: [{ n: 'Rune Magic', lvl: 1, desc: '' }],
      knownRunes: ['rune-of-speed'],
    });
    const result = learnRune(char, 'rune-of-might');
    expect(result.knownRunes).toEqual(['rune-of-speed', 'rune-of-might']);
  });

  it('creates an AdvancementEntry with correct fields', () => {
    const char = makeCharacter({
      xpCur: 200,
      xpSpent: 0,
      careerLevel: 'Runesmith',
      talents: [{ n: 'Rune Magic', lvl: 1, desc: '' }],
      knownRunes: [],
      advancementLog: [],
    });
    const result = learnRune(char, 'rune-of-might');
    expect(result.advancementLog).toHaveLength(1);
    const entry = result.advancementLog[0];
    expect(entry.type).toBe('rune');
    expect(entry.name).toBe('Rune of Might');
    expect(entry.xpCost).toBe(50);
    expect(entry.from).toBe(0);
    expect(entry.to).toBe(1);
    expect(entry.careerLevel).toBe('Runesmith');
    expect(entry.inCareer).toBe(true);
    expect(entry.timestamp).toBeGreaterThan(0);
  });

  it('does not mutate the original character', () => {
    const char = makeCharacter({
      xpCur: 200,
      xpSpent: 0,
      talents: [{ n: 'Rune Magic', lvl: 1, desc: '' }],
      knownRunes: [],
      advancementLog: [],
    });
    const result = learnRune(char, 'rune-of-might');
    expect(char.xpCur).toBe(200);
    expect(char.xpSpent).toBe(0);
    expect(char.knownRunes).toEqual([]);
    expect(char.advancementLog).toEqual([]);
    expect(result).not.toBe(char);
  });
});

// Property 14: Insufficient XP prevents rune learning
// Validates: Requirements 14.5
describe('canLearnRune — Property 14: insufficient XP', () => {
  it('returns canLearn: false when xpCur is less than xpCost for a standard rune', () => {
    const char = makeCharacter({
      xpCur: 30,
      talents: [{ n: 'Rune Magic', lvl: 1, desc: '' }],
    });
    const result = canLearnRune('rune-of-might', char);
    expect(result.canLearn).toBe(false);
    expect(result.error).toBe('Insufficient XP. Need 50, have 30.');
  });

  it('returns canLearn: false when xpCur is less than xpCost for a Master Rune', () => {
    const char = makeCharacter({
      xpCur: 75,
      talents: [
        { n: 'Rune Magic', lvl: 1, desc: '' },
        { n: 'Master Rune Magic', lvl: 1, desc: '' },
      ],
    });
    const result = canLearnRune('master-rune-of-skalf-blackhammer', char);
    expect(result.canLearn).toBe(false);
    expect(result.error).toBe('Insufficient XP. Need 100, have 75.');
  });

  it('returns canLearn: true when xpCur exactly equals xpCost', () => {
    const char = makeCharacter({
      xpCur: 50,
      talents: [{ n: 'Rune Magic', lvl: 1, desc: '' }],
    });
    const result = canLearnRune('rune-of-might', char);
    expect(result.canLearn).toBe(true);
  });

  it('returns canLearn: false when xpCur is 0', () => {
    const char = makeCharacter({
      xpCur: 0,
      talents: [{ n: 'Rune Magic', lvl: 1, desc: '' }],
    });
    const result = canLearnRune('rune-of-might', char);
    expect(result.canLearn).toBe(false);
    expect(result.error).toBe('Insufficient XP. Need 50, have 0.');
  });
});

// Property 15: Duplicate rune learning prevention
// Validates: Requirements 14.7
describe('canLearnRune — Property 15: duplicate rune prevention', () => {
  it('returns canLearn: false when rune is already in knownRunes', () => {
    const char = makeCharacter({
      xpCur: 200,
      talents: [{ n: 'Rune Magic', lvl: 1, desc: '' }],
      knownRunes: ['rune-of-might'],
    });
    const result = canLearnRune('rune-of-might', char);
    expect(result.canLearn).toBe(false);
    expect(result.error).toBe('This rune is already known.');
  });

  it('returns canLearn: true when a different rune is in knownRunes', () => {
    const char = makeCharacter({
      xpCur: 200,
      talents: [{ n: 'Rune Magic', lvl: 1, desc: '' }],
      knownRunes: ['rune-of-speed'],
    });
    const result = canLearnRune('rune-of-might', char);
    expect(result.canLearn).toBe(true);
  });

  it('returns canLearn: false for a Master Rune already known', () => {
    const char = makeCharacter({
      xpCur: 200,
      talents: [
        { n: 'Rune Magic', lvl: 1, desc: '' },
        { n: 'Master Rune Magic', lvl: 1, desc: '' },
      ],
      knownRunes: ['master-rune-of-skalf-blackhammer'],
    });
    const result = canLearnRune('master-rune-of-skalf-blackhammer', char);
    expect(result.canLearn).toBe(false);
    expect(result.error).toBe('This rune is already known.');
  });
});
