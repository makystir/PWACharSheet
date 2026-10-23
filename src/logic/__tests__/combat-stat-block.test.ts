import { describe, it, expect } from 'vitest';
import { buildCombatStatBlock } from '../combat-stat-block';
import { deriveSheetTotals } from '../sheet-totals';
import type { Character, CharacteristicKey, CharacteristicValue, WeaponItem, ArmourItem } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';

const CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

function charsFrom(values: Partial<Record<CharacteristicKey, number>>): Record<CharacteristicKey, CharacteristicValue> {
  return Object.fromEntries(
    CHAR_KEYS.map(k => [k, { i: values[k] ?? 0, a: 0, b: 0 }])
  ) as Record<CharacteristicKey, CharacteristicValue>;
}

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Grunwald',
    species: 'Human / Reiklander',
    careerLevel: 'Soldier',
    chars: charsFrom({ WS: 45, BS: 33, S: 38, T: 41, I: 30, Ag: 28, Dex: 29, WP: 35 }),
    move: { m: 4, w: 8, r: 16 },
    ...overrides,
  };
}

describe('buildCombatStatBlock', () => {
  it('emits name, combat characteristics, wounds, movement, and worn-only armour', () => {
    const character = makeCharacter({
      armour: [
        { name: 'Helm', locations: 'Head', enc: '0', ap: 1, qualities: '', worn: true },
        { name: 'Mail', locations: 'Body', enc: '1', ap: 2, qualities: '', worn: false },
      ],
    });
    const t = deriveSheetTotals(character);
    const block = buildCombatStatBlock(character);

    expect(block).toContain('Grunwald');
    expect(block).toContain('Species: Human / Reiklander');
    expect(block).toContain('Career: Soldier');
    expect(block).toContain('WS 45');
    expect(block).toContain('S 38');
    expect(block).toContain('Dex 29');
    // Non-combat characteristics are not on the combat line.
    expect(block).not.toMatch(/\bInt \d/);
    expect(block).not.toMatch(/\bFel \d/);

    expect(block).toContain(`Wounds: ${t.wounds.total}`);
    expect(block).toContain('Move: 4');
    expect(block).toContain('Walk: 8');
    expect(block).toContain('Run: 16');

    // Worn-only: helm (head 1) counts, unworn mail (body) does not.
    expect(t.armourPoints.head).toBe(1);
    expect(t.armourPoints.body).toBe(0);
    expect(block).toContain(`Head ${t.armourPoints.head}`);
    expect(block).toContain(`Body ${t.armourPoints.body}`);
  });

  it('shows weapon damage from calcWeaponDamage and never prints null', () => {
    const weapon: WeaponItem = { name: 'Sword', group: 'Basic', enc: '1', damage: '+SB+4', qualities: 'Fast' };
    const noDmgWeapon: WeaponItem = { name: 'Fists', group: 'Brawling', enc: '0', damage: '—', qualities: '' };
    const character = makeCharacter({ weapons: [weapon, noDmgWeapon] });
    const t = deriveSheetTotals(character);
    const block = buildCombatStatBlock(character);

    const expectedNum = t.SB + 4; // +SB+4 with no relevant talents
    expect(block).toContain('Sword');
    expect(block).toContain(`Dmg ${expectedNum}`);
    expect(block).toContain('Fast');

    // num === null => raw string shown, never the literal 'null'.
    expect(block).toContain('Fists');
    expect(block).not.toContain('null');
    expect(block).toContain('Dmg —');
  });

  it('lists only active conditions and never ammunition', () => {
    const character = makeCharacter({
      conditions: [
        { name: 'Prone', level: 1 },
        { name: 'Fatigued', level: 0 },
      ],
      ammo: [{ name: 'Arrows', quantity: 20, max: 20, enc: '0', qualities: '' }],
    });
    const block = buildCombatStatBlock(character);

    expect(block).toContain('Prone 1');
    expect(block).not.toContain('Fatigued');
    expect(block).not.toContain('Arrows');
    expect(block).not.toContain('Ammunition');
  });

  it('handles an unworn + worn===undefined armour mix identically to the sheet', () => {
    const character = makeCharacter({
      armour: [
        { name: 'Jack', locations: 'Body', enc: '1', ap: 1, qualities: '' } as ArmourItem, // undefined worn = worn
        { name: 'Greaves', locations: 'Legs', enc: '1', ap: 1, qualities: '', worn: false },
      ],
    });
    const t = deriveSheetTotals(character);
    const block = buildCombatStatBlock(character);
    expect(block).toContain(`Body ${t.armourPoints.body}`);
    expect(t.armourPoints.body).toBe(1);
    expect(t.armourPoints.lLeg).toBe(0);
  });
});
