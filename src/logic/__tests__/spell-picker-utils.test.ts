import { describe, it, expect } from 'vitest';
import { deriveCharacterLore, filterByLore, searchSpells } from '../spell-picker-utils';
import type { SpellData } from '../../types/character';

// Test spell fixtures
const testSpells: SpellData[] = [
  { name: 'Fireball', cn: '6', range: '48 yards', target: '1', duration: 'Instant', effect: 'Deals fire damage', lore: 'Lore of Fire' },
  { name: 'Bolt of Aqshy', cn: '4', range: '24 yards', target: '1', duration: 'Instant', effect: 'A bolt of flame', lore: 'Lore of Fire' },
  { name: 'Spirit Leech', cn: '5', range: '24 yards', target: '1', duration: 'Instant', effect: 'Drains life', lore: 'Lore of Death' },
  { name: 'Dart', cn: '0', range: '12 yards', target: '1', duration: 'Instant', effect: 'Magic dart', lore: 'Petty' },
  { name: 'Light', cn: '0', range: 'You', target: 'You', duration: '1 hour', effect: 'Creates light', lore: 'Petty' },
  { name: 'Blessing of Courage', cn: '4', range: '6 yards', target: '1', duration: '6 rounds', effect: 'Grants courage', lore: 'Miracles of Morr' },
];

describe('deriveCharacterLore', () => {
  it('derives "Lore of Fire" from "Arcane Magic (Fire)"', () => {
    const talents = [{ n: 'Arcane Magic (Fire)' }];
    expect(deriveCharacterLore(talents)).toBe('Lore of Fire');
  });

  it('derives "Petty" from "Petty Magic" when no arcane/invoke talent present', () => {
    const talents = [{ n: 'Petty Magic' }];
    expect(deriveCharacterLore(talents)).toBe('Petty');
  });

  it('derives "Miracles of Morr" from "Invoke (Morr)"', () => {
    const talents = [{ n: 'Invoke (Morr)' }];
    expect(deriveCharacterLore(talents)).toBe('Miracles of Morr');
  });

  it('returns null for "Arcane Magic" without parenthetical', () => {
    const talents = [{ n: 'Arcane Magic' }];
    expect(deriveCharacterLore(talents)).toBeNull();
  });

  it('prioritizes Arcane Magic over Petty Magic', () => {
    const talents = [{ n: 'Petty Magic' }, { n: 'Arcane Magic (Shadows)' }];
    expect(deriveCharacterLore(talents)).toBe('Lore of Shadows');
  });

  it('returns null for empty talent list', () => {
    expect(deriveCharacterLore([])).toBeNull();
  });

  it('returns null for unrelated talents', () => {
    const talents = [{ n: 'Warrior Born' }, { n: 'Hardy' }];
    expect(deriveCharacterLore(talents)).toBeNull();
  });
});

describe('filterByLore', () => {
  it('returns all spells when lore is null', () => {
    const result = filterByLore(testSpells, null);
    expect(result).toEqual(testSpells);
  });

  it('returns only spells matching the given lore', () => {
    const result = filterByLore(testSpells, 'Lore of Fire');
    expect(result).toHaveLength(2);
    expect(result.every(s => s.lore === 'Lore of Fire')).toBe(true);
  });

  it('returns empty array when no spells match the lore', () => {
    const result = filterByLore(testSpells, 'Lore of Heavens');
    expect(result).toHaveLength(0);
  });

  it('filters to a single matching spell', () => {
    const result = filterByLore(testSpells, 'Lore of Death');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Spirit Leech');
  });
});

describe('searchSpells', () => {
  it('returns all spells when query is empty string', () => {
    const result = searchSpells(testSpells, '');
    expect(result).toEqual(testSpells);
  });

  it('returns matching spells for partial name match', () => {
    const result = searchSpells(testSpells, 'fire');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Fireball');
  });

  it('is case-insensitive', () => {
    const result = searchSpells(testSpells, 'BOLT');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Bolt of Aqshy');
  });

  it('returns empty array when no spells match', () => {
    const result = searchSpells(testSpells, 'nonexistent');
    expect(result).toHaveLength(0);
  });

  it('matches multiple spells with common substring', () => {
    const result = searchSpells(testSpells, 'l');
    // Fireball, Bolt of Aqshy, Spirit Leech, Light, Blessing of Courage
    expect(result.length).toBeGreaterThan(1);
    expect(result.every(s => s.name.toLowerCase().includes('l'))).toBe(true);
  });
});
