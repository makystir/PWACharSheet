import { describe, it, expect } from 'vitest';
import { exportToJSON, importFromJSON } from '../export-import';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character } from '../../types/character';

function makeTestCharacter(overrides: Partial<Character> = {}): Character {
  return {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Test Hero',
    species: 'Human',
    career: 'Soldier',
    careerLevel: 'Level 1',
    ...overrides,
  };
}

// Feature: pwa-character-sheet, Property 18: Export/import round-trip
describe('Property 18: Export/import round-trip', () => {
  it('round-trips a basic character', () => {
    const original = makeTestCharacter();
    const json = exportToJSON(original);
    const result = importFromJSON(json);

    expect(result.success).toBe(true);
    expect(result.character).toEqual(original);
  });

  it('round-trips a character with complex data', () => {
    const original = makeTestCharacter({
      name: 'Brunhilde Ironforge',
      species: 'Dwarf',
      career: 'Ironbreaker',
      xpCur: 250,
      xpSpent: 100,
      xpTotal: 350,
    });
    original.talents.push({ n: 'Hardy', lvl: 2, desc: 'Extra tough' });
    original.weapons.push({ name: 'Warhammer', group: 'Two-Handed', enc: '2', damage: '+SB+1', qualities: 'Pummel' });
    original.conditions.push({ name: 'Fatigued', level: 1 });
    original.estate.name = 'Karak Norn Outpost';
    original.estate.treasury = { d: 50, ss: 20, gc: 5 };

    const json = exportToJSON(original);
    const result = importFromJSON(json);

    expect(result.success).toBe(true);
    expect(result.character).toEqual(original);
  });

  it('round-trips a character with special characters in name', () => {
    const original = makeTestCharacter({ name: 'Günther "The Brave" von Müller' });
    const json = exportToJSON(original);
    const result = importFromJSON(json);

    expect(result.success).toBe(true);
    expect(result.character!.name).toBe('Günther "The Brave" von Müller');
  });

  it('fills missing fields with BLANK_CHARACTER defaults on import', () => {
    // Simulate an older export with fewer fields
    const partial = {
      _v: 6,
      name: 'Partial',
      species: 'Elf',
      chars: structuredClone(BLANK_CHARACTER.chars),
    };
    const json = JSON.stringify(partial);
    const result = importFromJSON(json);

    expect(result.success).toBe(true);
    expect(result.character!.name).toBe('Partial');
    expect(result.character!.estate).toEqual(BLANK_CHARACTER.estate);
    expect(result.character!.conditions).toEqual([]);
    expect(result.character!.weapons).toEqual([]);
  });
});

// Feature: pwa-character-sheet, Property 19: Invalid import preserves existing data
describe('Property 19: Invalid import preserves existing data', () => {
  it('rejects malformed JSON', () => {
    const result = importFromJSON('{ not valid json !!!');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON');
    expect(result.character).toBeUndefined();
  });

  it('rejects empty string', () => {
    const result = importFromJSON('');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects a JSON array', () => {
    const result = importFromJSON('[1, 2, 3]');
    expect(result.success).toBe(false);
    expect(result.error).toContain('expected a JSON object');
  });

  it('rejects JSON missing required _v field', () => {
    const result = importFromJSON(JSON.stringify({ name: 'NoVersion', species: 'Human', chars: {} }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('_v');
  });

  it('rejects JSON missing required name field', () => {
    const result = importFromJSON(JSON.stringify({ _v: 6, species: 'Human', chars: {} }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('name');
  });

  it('rejects JSON missing required species field', () => {
    const result = importFromJSON(JSON.stringify({ _v: 6, name: 'Test', chars: {} }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('species');
  });

  it('rejects JSON missing required chars field', () => {
    const result = importFromJSON(JSON.stringify({ _v: 6, name: 'Test', species: 'Human' }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('chars');
  });

  it('rejects version newer than current (v7)', () => {
    const futureData = {
      _v: 7,
      name: 'Future',
      species: 'Human',
      chars: {},
    };
    const result = importFromJSON(JSON.stringify(futureData));
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unsupported version');
    expect(result.error).toContain('7');
  });

  it('rejects version newer than current (v99)', () => {
    const futureData = {
      _v: 99,
      name: 'Far Future',
      species: 'Human',
      chars: {},
    };
    const result = importFromJSON(JSON.stringify(futureData));
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unsupported version');
  });

  it('accepts version equal to current (v6)', () => {
    const data = {
      _v: 6,
      name: 'Current',
      species: 'Human',
      chars: structuredClone(BLANK_CHARACTER.chars),
    };
    const result = importFromJSON(JSON.stringify(data));
    expect(result.success).toBe(true);
  });

  it('accepts version older than current (v5)', () => {
    const data = {
      _v: 5,
      name: 'Old',
      species: 'Human',
      chars: structuredClone(BLANK_CHARACTER.chars),
    };
    const result = importFromJSON(JSON.stringify(data));
    expect(result.success).toBe(true);
    expect(result.character!._v).toBe(6); // Upgraded to current
  });
});
